insert into public.categories (workspace_id, name, color)
select workspace.id, category.name, category.color
from public.workspaces as workspace
cross join (
  values
    ('Transferencias', '#176b4d'),
    ('Servicios', '#2878b5'),
    ('Mantenimiento', '#b56a28'),
    ('Transporte', '#7256b5'),
    ('Alimentación', '#b5475f'),
    ('Otros', '#69746e')
) as category(name, color)
where workspace.name = 'Gestión GV'
on conflict (workspace_id, name) do update
set color = excluded.color,
    is_active = true,
    updated_at = now();
