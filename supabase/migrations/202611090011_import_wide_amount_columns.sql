-- Keep one audit row per original Excel row even when its two amount columns
-- create two separate records (monthly transfer and other payment).
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
    raise exception 'El archivo debe contener entre 1 y 2000 movimientos válidos.' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.import_batches batch
    where batch.workspace_id = target_workspace_id
      and (
        batch.file_fingerprint = target_fingerprint
        or batch.file_fingerprint like target_fingerprint || ':%'
      )
  ) then
    raise exception 'Este archivo ya fue importado en este espacio.' using errcode = '23505';
  end if;

  insert into public.import_batches (
    workspace_id, created_by, original_filename, file_fingerprint,
    status, row_count, warning_count
  ) values (
    target_workspace_id, auth.uid(), original_filename, target_fingerprint,
    'processing', rows_count, 0
  ) returning id into batch_id;

  if exists (
    select 1
    from jsonb_to_recordset(rows) as item(category_id uuid)
    where item.category_id is not null
      and not exists (
        select 1 from public.categories category
        where category.id = item.category_id
          and category.workspace_id = target_workspace_id
      )
  ) then
    raise exception 'Una categoría seleccionada no pertenece a este espacio.' using errcode = '22023';
  end if;

  with imported as (
    insert into public.records (
      workspace_id, category_id, record_date, description, record_group,
      amount_pyg, payment_method, reference, notes, import_batch_id,
      source_sheet, source_row, source_raw, created_by
    )
    select
      target_workspace_id,
      item.category_id,
      item.record_date::date,
      item.description,
      item.record_group::public.record_group,
      item.amount_pyg::bigint,
      nullif(item.payment_method, ''),
      nullif(item.reference, ''),
      nullif(item.notes, ''),
      batch_id,
      coalesce(nullif(item.source_sheet, ''), sheet_name),
      item.source_row,
      coalesce(item.source_raw, '{}'::jsonb),
      auth.uid()
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
  set status = 'completed', completed_at = now()
  where id = batch_id;

  return jsonb_build_object('batch_id', batch_id, 'imported_count', rows_count);
exception
  when unique_violation then
    raise exception 'Este archivo ya fue importado en este espacio.'
      using errcode = '23505';
end;
$$;

revoke all on function public.import_records_batch(uuid, text, text, text, jsonb)
  from public, anon;
grant execute on function public.import_records_batch(uuid, text, text, text, jsonb)
  to authenticated;
