-- Atomic tank log writes: insert/update/delete and matching pour stock in one transaction.
-- Callers must not retry automatically after a timeout; reload the log and match the row first.

create or replace function public.logged_chemical_ids()
returns uuid[]
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(array_agg(distinct chemical_id), '{}'::uuid[])
  from public.tank_log_entries
  where chemical_id is not null;
$$;

create or replace function public.insert_tank_log_entries(
  p_tank_id uuid,
  p_entries jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_row public.tank_log_entries;
  v_rows jsonb := '[]'::jsonb;
begin
  if p_tank_id is null then
    raise exception 'Choose a tank first.';
  end if;
  if p_entries is null or jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) = 0 then
    raise exception 'Nothing to save.';
  end if;
  if not exists (select 1 from public.tanks where id = p_tank_id) then
    raise exception 'Tank not found.';
  end if;

  for v_item in select value from jsonb_array_elements(p_entries)
  loop
    if v_item->>'type' not in ('opening_balance', 'add_batch', 'consume_usage', 'adjust_composition') then
      raise exception 'Unknown log entry type';
    end if;

    insert into public.tank_log_entries (
      tank_id,
      entry_date,
      type,
      chemical_id,
      quantity,
      solid_content_pct,
      note,
      created_at
    ) values (
      p_tank_id,
      coalesce((v_item->>'entry_date')::date, (timezone('utc', now()))::date),
      v_item->>'type',
      nullif(v_item->>'chemical_id', '')::uuid,
      (v_item->>'quantity')::numeric,
      nullif(v_item->>'solid_content_pct', '')::numeric,
      nullif(btrim(coalesce(v_item->>'note', '')), ''),
      coalesce((v_item->>'created_at')::timestamptz, now())
    )
    returning * into v_row;

    if v_row.type = 'add_batch' and v_row.chemical_id is not null and v_row.quantity > 0 then
      perform public.apply_stock_movement(
        v_row.chemical_id,
        'pour',
        v_row.quantity,
        'Poured into the tank',
        v_row.id
      );
    end if;

    v_rows := v_rows || jsonb_build_array(to_jsonb(v_row));
  end loop;

  return v_rows;
end;
$$;

create or replace function public.replace_tank_log_entry(
  p_id uuid,
  p_entry jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.tank_log_entries;
  v_type text;
begin
  if p_id is null then
    raise exception 'Missing log row.';
  end if;
  v_type := p_entry->>'type';
  if v_type not in ('opening_balance', 'add_batch', 'consume_usage', 'adjust_composition') then
    raise exception 'Unknown log entry type';
  end if;

  perform public.reverse_stock_for_log_entry(p_id);

  update public.tank_log_entries
  set
    entry_date = coalesce((p_entry->>'entry_date')::date, entry_date),
    type = v_type,
    chemical_id = nullif(p_entry->>'chemical_id', '')::uuid,
    quantity = (p_entry->>'quantity')::numeric,
    solid_content_pct = nullif(p_entry->>'solid_content_pct', '')::numeric,
    note = nullif(btrim(coalesce(p_entry->>'note', '')), ''),
    created_at = coalesce((p_entry->>'created_at')::timestamptz, created_at)
  where id = p_id
  returning * into v_row;

  if not found then
    raise exception 'Log row not found.';
  end if;

  if v_row.type = 'add_batch' and v_row.chemical_id is not null and v_row.quantity > 0 then
    perform public.apply_stock_movement(
      v_row.chemical_id,
      'pour',
      v_row.quantity,
      'Poured into the tank',
      v_row.id
    );
  end if;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.delete_tank_log_entry(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_id is null then
    raise exception 'Missing log row.';
  end if;
  perform public.reverse_stock_for_log_entry(p_id);
  delete from public.tank_log_entries where id = p_id;
end;
$$;

revoke all on function public.logged_chemical_ids() from public;
grant execute on function public.logged_chemical_ids() to authenticated;

revoke all on function public.insert_tank_log_entries(uuid, jsonb) from public;
grant execute on function public.insert_tank_log_entries(uuid, jsonb) to authenticated;

revoke all on function public.replace_tank_log_entry(uuid, jsonb) from public;
grant execute on function public.replace_tank_log_entry(uuid, jsonb) to authenticated;

revoke all on function public.delete_tank_log_entry(uuid) from public;
grant execute on function public.delete_tank_log_entry(uuid) to authenticated;
