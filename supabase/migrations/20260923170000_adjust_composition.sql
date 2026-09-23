-- Allow Home composition edits as reversible log rows.
alter table public.tank_log_entries
  drop constraint if exists tank_log_entries_type_check;

alter table public.tank_log_entries
  add constraint tank_log_entries_type_check
  check (type in ('opening_balance', 'add_batch', 'consume_usage', 'adjust_composition'));

alter table public.tank_log_entries
  drop constraint if exists tank_log_solid_pct_by_type;

alter table public.tank_log_entries
  add constraint tank_log_solid_pct_by_type check (
    (type in ('opening_balance', 'add_batch', 'adjust_composition') and solid_content_pct is not null)
    or (type = 'consume_usage' and solid_content_pct is null)
  );
