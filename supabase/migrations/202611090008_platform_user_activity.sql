-- PostgreSQL does not allow CREATE OR REPLACE to change a function's return
-- type, so replace the RPC explicitly to add account activity fields.
drop function if exists public.list_platform_users();

create function public.list_platform_users()
returns table (
  user_id uuid,
  email text,
  display_name text,
  avatar_seed text,
  workspace_id uuid,
  workspace_name text,
  workspace_role public.workspace_role,
  is_platform_admin boolean,
  last_sign_in_at timestamptz,
  is_suspended boolean
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
    ),
    users.last_sign_in_at,
    coalesce(users.banned_until > now(), false)
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
