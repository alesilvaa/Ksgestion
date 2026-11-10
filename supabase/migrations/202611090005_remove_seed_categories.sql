-- The first workspace starts empty; remove only the six initial template
-- categories, and preserve any category already referenced by a real record.
delete from public.categories as category
where category.name in (
    'Transferencias',
    'Servicios',
    'Mantenimiento',
    'Transporte',
    'Alimentación',
    'Otros'
  )
  and not exists (
    select 1
    from public.records as record
    where record.category_id = category.id
  );
