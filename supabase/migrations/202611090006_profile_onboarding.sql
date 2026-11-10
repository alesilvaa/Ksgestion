alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    avatar_seed,
    onboarding_completed
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, 'Usuario'), '@', 1)
    ),
    gen_random_uuid()::text,
    false
  )
  on conflict (id) do update
    set display_name = coalesce(
      nullif(profiles.display_name, ''),
      excluded.display_name
    ),
    updated_at = now();

  return new;
end;
$$;
