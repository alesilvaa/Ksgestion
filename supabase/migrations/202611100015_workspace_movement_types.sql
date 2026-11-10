-- Allow each workspace to define movement columns and preserve the current
-- spreadsheet types as the first two defaults.
create table public.movement_types (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  code text not null,
  color text not null default '#315b3c'
    check (color ~ '^#[0-9a-fA-F]{6}$'),
  position integer not null default 0 check (position >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, code),
  unique (workspace_id, name)
);

insert into public.movement_types (workspace_id, name, code, color, position)
select workspace.id, defaults.name, defaults.code, defaults.color, defaults.position
from public.workspaces workspace
cross join (values
  ('Transferencias mensuales', 'monthly_transfer', '#315b3c', 0),
  ('Pagos varios', 'other_payment', '#ac8a3e', 1)
) as defaults(name, code, color, position)
on conflict (workspace_id, code) do nothing;

create or replace function public.seed_workspace_movement_types()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.movement_types (workspace_id, name, code, color, position)
  values
    (new.id, 'Transferencias mensuales', 'monthly_transfer', '#315b3c', 0),
    (new.id, 'Pagos varios', 'other_payment', '#ac8a3e', 1)
  on conflict (workspace_id, code) do nothing;
  return new;
end;
$$;

create trigger seed_default_movement_types
  after insert on public.workspaces
  for each row execute function public.seed_workspace_movement_types();

alter table public.movement_types enable row level security;
create policy "members read movement types"
  on public.movement_types for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "members manage movement types"
  on public.movement_types for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
grant select, insert, update, delete on public.movement_types to authenticated;

alter table public.records add column movement_type_id uuid;
update public.records record
set movement_type_id = movement_type.id
from public.movement_types movement_type
where movement_type.workspace_id = record.workspace_id
  and movement_type.code = case record.record_group
    when 'monthly_transfer' then 'monthly_transfer'
    else 'other_payment'
  end;
alter table public.records alter column movement_type_id set not null;
alter table public.records
  add constraint records_movement_type_workspace_fk
  foreign key (workspace_id, movement_type_id)
  references public.movement_types(workspace_id, id)
  on delete no action;
create index records_movement_type_idx
  on public.records (workspace_id, movement_type_id);

drop function if exists public.import_records_batch(uuid, text, text, text, jsonb);

create function public.import_records_batch(
  target_workspace_id uuid,
  original_filename text,
  file_fingerprint text,
  sheet_name text,
  rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  batch_id uuid;
  rows_count integer;
  new_count integer;
  target_fingerprint text;
begin
  target_fingerprint := file_fingerprint;
  if auth.uid() is null then
    raise exception 'Debés iniciar sesión para importar.' using errcode = '42501';
  end if;

  if not public.is_workspace_member(target_workspace_id) then
    raise exception 'No tenés acceso a este espacio.' using errcode = '42501';
  end if;

  if jsonb_typeof(rows) <> 'array' then
    raise exception 'El contenido de la importación no es válido.' using errcode = '22023';
  end if;

  rows_count := jsonb_array_length(rows);
  if rows_count < 1 or rows_count > 2000 then
    raise exception 'El archivo debe contener entre 1 y 2000 movimientos.' using errcode = '22023';
  end if;

  select batch.id into batch_id
  from public.import_batches batch
  where batch.workspace_id = target_workspace_id
    and (
      batch.file_fingerprint = target_fingerprint
      or batch.file_fingerprint like target_fingerprint || ':%'
    )
  order by batch.created_at
  limit 1;

  if batch_id is null then
    insert into public.import_batches (
      workspace_id, created_by, original_filename, file_fingerprint,
      status, row_count, warning_count
    ) values (
      target_workspace_id, auth.uid(), original_filename, target_fingerprint,
      'processing', 0, 0
    ) returning id into batch_id;
  else
    update public.import_batches
    set status = 'processing'
    where id = batch_id;
  end if;

  select count(*) into new_count
  from jsonb_to_recordset(rows) as item(source_sheet text, source_row integer)
  where not exists (
    select 1 from public.import_rows imported_row
    where imported_row.import_batch_id = batch_id
      and imported_row.sheet_name = coalesce(nullif(item.source_sheet, ''), $4)
      and imported_row.row_number = item.source_row
  );

  if new_count = 0 then
    update public.import_batches
    set status = 'completed', completed_at = coalesce(completed_at, now())
    where id = batch_id;
    return jsonb_build_object('batch_id', batch_id, 'imported_count', 0);
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(rows) as item(
      source_sheet text, source_row integer, category_id uuid
    )
    where item.category_id is not null
      and not exists (
        select 1 from public.import_rows imported_row
        where imported_row.import_batch_id = batch_id
          and imported_row.sheet_name = coalesce(nullif(item.source_sheet, ''), $4)
          and imported_row.row_number = item.source_row
      )
      and not exists (
        select 1 from public.categories category
        where category.id = item.category_id
          and category.workspace_id = target_workspace_id
      )
  ) then
    raise exception 'Una categoría seleccionada no pertenece a este espacio.' using errcode = '22023';
  end if;

  with input_rows as (
    select
      item.*,
      coalesce(nullif(item.source_sheet, ''), $4) as resolved_sheet
    from jsonb_to_recordset(rows) as item(
      record_date text,
      description text,
      record_group text,
      amount_pyg text,
      category_id uuid,
      payment_method text,
      reference text,
      notes text,
      source_sheet text,
      source_row integer,
      source_raw jsonb
    )
  ), new_rows as (
    select input_rows.*
    from input_rows
    where not exists (
      select 1 from public.import_rows imported_row
      where imported_row.import_batch_id = batch_id
        and imported_row.sheet_name = input_rows.resolved_sheet
        and imported_row.row_number = input_rows.source_row
    )
  ), imported as (
    insert into public.records (
      workspace_id, movement_type_id, category_id, record_date, description, record_group,
      amount_pyg, payment_method, reference, notes, import_batch_id,
      source_sheet, source_row, source_raw, created_by
    )
    select
      target_workspace_id,
      (
        select movement_type.id
        from public.movement_types movement_type
        where movement_type.workspace_id = target_workspace_id
          and movement_type.code = case new_rows.record_group
            when 'monthly_transfer' then 'monthly_transfer'
            else 'other_payment'
          end
      ),
      new_rows.category_id,
      nullif(new_rows.record_date, '')::date,
      new_rows.description,
      new_rows.record_group::public.record_group,
      new_rows.amount_pyg::bigint,
      nullif(new_rows.payment_method, ''),
      nullif(new_rows.reference, ''),
      nullif(new_rows.notes, ''),
      batch_id,
      new_rows.resolved_sheet,
      new_rows.source_row,
      coalesce(new_rows.source_raw, '{}'::jsonb),
      auth.uid()
    from new_rows
    returning id, record_date, description, record_group, amount_pyg,
      category_id, payment_method, reference, notes, source_sheet, source_row,
      source_raw
  ), source_groups as (
    select
      imported.source_sheet,
      imported.source_row,
      (array_agg(imported.source_raw))[1] as raw_data,
      case when count(*) = 1 then (array_agg(imported.id))[1] else null end as record_id,
      jsonb_agg(jsonb_build_object(
        'record_id', imported.id,
        'record_date', imported.record_date,
        'description', imported.description,
        'record_group', imported.record_group,
        'amount_pyg', imported.amount_pyg,
        'category_id', imported.category_id,
        'payment_method', imported.payment_method,
        'reference', imported.reference,
        'notes', imported.notes
      )) as normalized_records
    from imported
    group by imported.source_sheet, imported.source_row
  )
  insert into public.import_rows (
    import_batch_id, sheet_name, row_number, status, raw_data,
    normalized_data, record_id
  )
  select
    batch_id,
    source_groups.source_sheet,
    source_groups.source_row,
    'imported',
    source_groups.raw_data,
    jsonb_build_object('records', source_groups.normalized_records),
    source_groups.record_id
  from source_groups;

  update public.import_batches
  set status = 'completed', completed_at = now(), row_count = row_count + new_count
  where id = batch_id;

  return jsonb_build_object('batch_id', batch_id, 'imported_count', new_count);
exception
  when unique_violation then
    raise exception 'El archivo ya se está importando. Volvé a intentar.'
      using errcode = '23505';
end;
$$;

revoke all on function public.import_records_batch(uuid, text, text, text, jsonb)
  from public, anon;
grant execute on function public.import_records_batch(uuid, text, text, text, jsonb)
  to authenticated;
