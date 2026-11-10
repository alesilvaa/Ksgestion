-- Historical imports may contain movements with an unknown date. Keep them
-- visible and editable instead of dropping valid amounts and descriptions.
alter table public.records
  alter column record_date drop not null;
