create extension if not exists "pgcrypto";

create type public.workspace_role as enum ('admin', 'operator');
create type public.record_group as enum ('monthly_transfer', 'other_payment');
create type public.import_status as enum ('pending', 'processing', 'completed', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  timezone text not null default 'America/Asuncion',
  default_currency char(3) not null default 'PYG',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'operator',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  parent_id uuid references public.categories(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 80),
  color text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  original_filename text not null,
  file_fingerprint text not null,
  status public.import_status not null default 'pending',
  row_count integer not null default 0 check (row_count >= 0),
  warning_count integer not null default 0 check (warning_count >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (workspace_id, file_fingerprint)
);

create table public.records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  parent_record_id uuid references public.records(id) on delete restrict,
  record_date date not null,
  description text not null check (char_length(description) between 1 and 500),
  record_group public.record_group not null,
  amount_pyg bigint check (amount_pyg is null or amount_pyg >= 0),
  original_currency char(3),
  original_amount numeric(20, 4),
  exchange_rate numeric(20, 8),
  payment_method text,
  reference text,
  notes text,
  is_breakdown boolean not null default false,
  import_batch_id uuid references public.import_batches(id) on delete set null,
  source_sheet text,
  source_row integer check (source_row is null or source_row > 0),
  source_raw jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((amount_pyg is not null) or (original_currency is not null and original_amount is not null)),
  check ((not is_breakdown) or parent_record_id is not null)
);

create index records_workspace_date_idx on public.records (workspace_id, record_date desc);
create index records_workspace_group_idx on public.records (workspace_id, record_group);
create index records_category_idx on public.records (category_id) where category_id is not null;
create index records_parent_idx on public.records (parent_record_id) where parent_record_id is not null;

create table public.import_rows (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  sheet_name text not null,
  row_number integer not null check (row_number > 0),
  status text not null check (status in ('valid', 'warning', 'error', 'excluded', 'imported')),
  raw_data jsonb not null,
  normalized_data jsonb,
  warnings jsonb not null default '[]'::jsonb,
  record_id uuid references public.records(id) on delete set null,
  unique (import_batch_id, sheet_name, row_number)
);

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.workspace_members wm where wm.workspace_id = target_workspace_id and wm.user_id = auth.uid()) $$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.categories enable row level security;
alter table public.records enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_rows enable row level security;

create policy "users read own profile" on public.profiles for select using (id = auth.uid());
create policy "members read workspaces" on public.workspaces for select using (public.is_workspace_member(id));
create policy "members read memberships" on public.workspace_members for select using (public.is_workspace_member(workspace_id));
create policy "members read categories" on public.categories for select using (public.is_workspace_member(workspace_id));
create policy "members manage categories" on public.categories for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "members read records" on public.records for select using (public.is_workspace_member(workspace_id));
create policy "members create records" on public.records for insert with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());
create policy "members update records" on public.records for update using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "admins delete records" on public.records for delete using (exists (select 1 from public.workspace_members wm where wm.workspace_id = records.workspace_id and wm.user_id = auth.uid() and wm.role = 'admin'));
create policy "members read imports" on public.import_batches for select using (public.is_workspace_member(workspace_id));
create policy "members create imports" on public.import_batches for insert with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());
create policy "members read import rows" on public.import_rows for select using (exists (select 1 from public.import_batches b where b.id = import_rows.import_batch_id and public.is_workspace_member(b.workspace_id)));
