-- Keep the initial administrator enabled even when the auth user was created
-- after the earlier bootstrap migration was applied.
create or replace function public.bootstrap_initial_platform_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  initial_workspace_id uuid;
begin
  if lower(coalesce(new.email, '')) <> lower('alejandro@manageopy.com') then
    return new;
  end if;

  insert into public.platform_admins (user_id)
  values (new.id)
  on conflict do nothing;

  select id into initial_workspace_id
  from public.workspaces
  where name = 'Gestión GV'
  order by created_at
  limit 1;

  if initial_workspace_id is null then
    insert into public.workspaces (name)
    values ('Gestión GV')
    returning id into initial_workspace_id;
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (initial_workspace_id, new.id, 'admin')
  on conflict (workspace_id, user_id) do update set role = excluded.role;

  return new;
end;
$$;

drop trigger if exists bootstrap_initial_platform_admin on auth.users;
create trigger bootstrap_initial_platform_admin
  after insert or update of email on auth.users
  for each row execute procedure public.bootstrap_initial_platform_admin();

-- Also repair projects where this auth account already exists.
do $$
declare
  initial_admin_id uuid;
  initial_workspace_id uuid;
begin
  select id into initial_admin_id
  from auth.users
  where lower(email) = lower('alejandro@manageopy.com')
  limit 1;

  if initial_admin_id is null then
    return;
  end if;

  insert into public.platform_admins (user_id)
  values (initial_admin_id)
  on conflict do nothing;

  select id into initial_workspace_id
  from public.workspaces
  where name = 'Gestión GV'
  order by created_at
  limit 1;

  if initial_workspace_id is null then
    insert into public.workspaces (name)
    values ('Gestión GV')
    returning id into initial_workspace_id;
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (initial_workspace_id, initial_admin_id, 'admin')
  on conflict (workspace_id, user_id) do update set role = excluded.role;
end;
$$;

create or replace function public.list_platform_users()
returns table (
  user_id uuid,
  email text,
  display_name text,
  avatar_seed text,
  workspace_id uuid,
  workspace_name text,
  workspace_role public.workspace_role,
  is_platform_admin boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    users.id,
    users.email::text,
    profiles.display_name,
    profiles.avatar_seed,
    membership.workspace_id,
    workspaces.name,
    membership.role,
    exists (
      select 1 from public.platform_admins admins where admins.user_id = users.id
    )
  from auth.users users
  left join public.profiles profiles on profiles.id = users.id
  left join lateral (
    select members.workspace_id, members.role
    from public.workspace_members members
    where members.user_id = users.id
    order by members.created_at
    limit 1
  ) membership on true
  left join public.workspaces workspaces on workspaces.id = membership.workspace_id
  where public.is_platform_admin()
  order by users.created_at desc;
$$;

revoke all on function public.list_platform_users() from public, anon;
grant execute on function public.list_platform_users() to authenticated;
