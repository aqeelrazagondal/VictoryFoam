-- Batch stock issues (Blend "record used") and compact tank-home overviews.
-- Callers must not retry automatically after a timeout; reload stock and match the movement first.

create or replace function public.apply_stock_movements(p_moves jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_row jsonb;
  v_rows jsonb := '[]'::jsonb;
begin
  if p_moves is null or jsonb_typeof(p_moves) <> 'array' or jsonb_array_length(p_moves) = 0 then
    raise exception 'Nothing to save.';
  end if;

  for v_item in select value from jsonb_array_elements(p_moves)
  loop
    v_row := public.apply_stock_movement(
      (v_item->>'chemical_id')::uuid,
      v_item->>'type',
      (v_item->>'quantity')::numeric,
      nullif(v_item->>'note', ''),
      nullif(v_item->>'tank_log_entry_id', '')::uuid
    );
    v_rows := v_rows || jsonb_build_array(v_row);
  end loop;

  return v_rows;
end;
$$;

create or replace function public.tank_log_overviews(p_tank_ids uuid[])
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with first_row as (
    select distinct on (e.tank_id)
      e.tank_id,
      e.type as first_type
    from public.tank_log_entries e
    where e.tank_id = any(p_tank_ids)
    order by e.tank_id, e.created_at, e.id
  ),
  last_row as (
    select distinct on (e.tank_id)
      e.tank_id,
      e.created_at as last_created_at,
      e.entry_date as last_entry_date
    from public.tank_log_entries e
    where e.tank_id = any(p_tank_ids)
    order by e.tank_id, e.created_at desc, e.id desc
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'tank_id', t.id,
        'ready', coalesce(f.first_type = 'opening_balance', false),
        'last_created_at', l.last_created_at,
        'last_entry_date', l.last_entry_date
      )
      order by t.id
    ),
    '[]'::jsonb
  )
  from unnest(p_tank_ids) as t(id)
  left join first_row f on f.tank_id = t.id
  left join last_row l on l.tank_id = t.id;
$$;

revoke all on function public.apply_stock_movements(jsonb) from public;
grant execute on function public.apply_stock_movements(jsonb) to authenticated;

revoke all on function public.tank_log_overviews(uuid[]) from public;
grant execute on function public.tank_log_overviews(uuid[]) to authenticated;
