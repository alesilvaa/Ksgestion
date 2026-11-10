alter table public.profiles
  add column if not exists avatar_seed text not null default gen_random_uuid()::text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_seed)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, 'Usuario'), '@', 1)
    ),
    gen_random_uuid()::text
  )
  on conflict (id) do update
    set display_name = coalesce(nullif(profiles.display_name, ''), excluded.display_name),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of raw_user_meta_data on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, display_name, avatar_seed)
select
  id,
  coalesce(
    nullif(raw_user_meta_data ->> 'full_name', ''),
    nullif(raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(email, 'Usuario'), '@', 1)
  ),
  gen_random_uuid()::text
from auth.users
on conflict (id) do nothing;

create policy "users update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "platform admins read profiles"
on public.profiles
for select
to authenticated
using (public.is_platform_admin());

create policy "platform admins read workspaces"
on public.workspaces
for select
to authenticated
using (public.is_platform_admin());

create policy "platform admins manage workspaces"
on public.workspaces
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "platform admins manage memberships"
on public.workspace_members
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.records to authenticated;
grant select, insert, update on public.import_batches to authenticated;
grant select, insert, update on public.import_rows to authenticated;
grant select on public.platform_admins to authenticated;

do $$
declare
  admin_id uuid;
  initial_workspace_id uuid;
begin
  select id into admin_id
  from auth.users
  where lower(email) = lower('alejandro@manageopy.com')
  limit 1;

  if admin_id is not null then
    insert into public.platform_admins (user_id)
    values (admin_id)
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
    values (initial_workspace_id, admin_id, 'admin')
    on conflict (workspace_id, user_id) do update set role = excluded.role;
  end if;
end;
$$;
