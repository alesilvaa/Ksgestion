create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

create policy "platform admins read their role"
on public.platform_admins
for select
to authenticated
using (user_id = auth.uid());

-- Bootstrap the first platform administrator manually from the Supabase SQL editor:
-- insert into public.platform_admins (user_id)
-- select id from auth.users where email = 'your-admin@example.com';
