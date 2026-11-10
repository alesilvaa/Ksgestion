create or replace function public.clear_workspace_records(target_workspace_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if auth.uid() is null or not (
    public.is_platform_admin()
    or exists (
      select 1
      from public.workspace_members members
      where members.workspace_id = target_workspace_id
        and members.user_id = auth.uid()
        and members.role = 'admin'::public.workspace_role
    )
  ) then
    raise exception 'Only workspace admins can clear workspace records'
      using errcode = '42501';
  end if;

  -- Break self-references first so parent and breakdown records can be removed
  -- together despite the immediate ON DELETE RESTRICT foreign key.
  update public.records
  set parent_record_id = null,
      is_breakdown = false
  where workspace_id = target_workspace_id
    and (parent_record_id is not null or is_breakdown);

  delete from public.records
  where workspace_id = target_workspace_id;
  get diagnostics deleted_count = row_count;

  -- Remove import fingerprints/history too, allowing the same workbook to be
  -- imported again. import_rows are removed by their cascading foreign key.
  delete from public.import_batches
  where workspace_id = target_workspace_id;

  return deleted_count;
end;
$$;

revoke all on function public.clear_workspace_records(uuid) from public, anon;
grant execute on function public.clear_workspace_records(uuid) to authenticated;
