-- Factory allowlist, write budget, idempotent occupancy writes, and bound tank snapshots.
-- Shared dataset: several factory logins, one factory. Not per-user row isolation.

create table if not exists public.factory_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.factory_users enable row level security;

drop policy if exists factory_users_select_own on public.factory_users;
create policy factory_users_select_own
  on public.factory_users
  for select
  to authenticated
  using (user_id = (select auth.uid()));

grant select on table public.factory_users to authenticated;

insert into public.factory_users (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.is_factory_member()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.factory_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_factory_member() from public;
grant execute on function public.is_factory_member() to authenticated;

create table if not exists public.tank_write_budget (
  user_id uuid not null,
  window_start timestamptz not null,
  write_count integer not null default 0,
  primary key (user_id, window_start)
);

alter table public.tank_write_budget enable row level security;

drop policy if exists tank_write_budget_own on public.tank_write_budget;
create policy tank_write_budget_own
  on public.tank_write_budget
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on table public.tank_write_budget to authenticated;

create table if not exists public.tank_write_receipts (
  write_key uuid primary key,
  result jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.tank_write_receipts enable row level security;

drop policy if exists tank_write_receipts_factory on public.tank_write_receipts;
create policy tank_write_receipts_factory
  on public.tank_write_receipts
  for all
  to authenticated
  using (public.is_factory_member())
  with check (public.is_factory_member());

grant select, insert on table public.tank_write_receipts to authenticated;

create or replace function public.assert_factory_write()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_window timestamptz := date_trunc('minute', timezone('utc', now()));
  v_count integer;
begin
  if v_uid is null then
    raise exception 'Sign in first.';
  end if;
  if not public.is_factory_member() then
    raise exception 'This login is not on the factory list.';
  end if;

  insert into public.tank_write_budget (user_id, window_start, write_count)
  values (v_uid, v_window, 1)
  on conflict (user_id, window_start)
  do update set write_count = public.tank_write_budget.write_count + 1
  returning write_count into v_count;

  if v_count > 30 then
    raise exception 'Too many saves. Wait a minute and try again.';
  end if;
end;
$$;

revoke all on function public.assert_factory_write() from public;
grant execute on function public.assert_factory_write() to authenticated;

alter table public.tank_log_entries
  add column if not exists write_key uuid;

create unique index if not exists tank_log_entries_write_key_key
  on public.tank_log_entries (write_key)
  where write_key is not null;

alter table public.tanks
  add column if not exists row_version integer not null default 1;

alter table public.tanks
  add column if not exists snapshot jsonb not null default jsonb_build_object(
    'volume', 0,
    'solidPct', 0,
    'remainingByChemical', '{}'::jsonb,
    'unattributed', 0,
    'hasOpening', false
  );

drop policy if exists chemicals_authenticated_all on public.chemicals;
drop policy if exists tanks_authenticated_all on public.tanks;
drop policy if exists tank_log_entries_authenticated_all on public.tank_log_entries;
drop policy if exists last_calculation_authenticated_all on public.last_calculation;
drop policy if exists chemical_stock_movements_authenticated_all on public.chemical_stock_movements;

create policy chemicals_factory_all
  on public.chemicals for all to authenticated
  using (public.is_factory_member())
  with check (public.is_factory_member());

create policy tanks_factory_all
  on public.tanks for all to authenticated
  using (public.is_factory_member())
  with check (public.is_factory_member());

create policy tank_log_entries_factory_all
  on public.tank_log_entries for all to authenticated
  using (public.is_factory_member())
  with check (public.is_factory_member());

create policy last_calculation_factory_all
  on public.last_calculation for all to authenticated
  using (public.is_factory_member())
  with check (public.is_factory_member());

create policy chemical_stock_movements_factory_all
  on public.chemical_stock_movements for all to authenticated
  using (public.is_factory_member())
  with check (public.is_factory_member());

create or replace function public.replay_tank_snapshot(p_tank_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_volume numeric := 0;
  v_pct numeric := 0;
  v_remaining jsonb := '{}'::jsonb;
  v_unattributed numeric := 0;
  v_has_opening boolean := false;
  v_first boolean := true;
  v_entry record;
  v_payload jsonb;
  v_key text;
  v_val jsonb;
  v_amount numeric;
  v_new_volume numeric;
  v_factor numeric;
  v_next jsonb;
begin
  for v_entry in
    select *
    from public.tank_log_entries
    where tank_id = p_tank_id
    order by created_at, id
  loop
    if v_first then
      v_has_opening := v_entry.type = 'opening_balance';
      v_first := false;
    end if;

    if v_entry.type in ('opening_balance', 'add_batch') then
      v_new_volume := v_volume + v_entry.quantity;
      v_pct := case
        when v_new_volume = 0 then 0
        else (v_volume * v_pct + v_entry.quantity * coalesce(v_entry.solid_content_pct, 0)) / v_new_volume
      end;
      v_volume := v_new_volume;
      if v_entry.chemical_id is not null then
        v_key := v_entry.chemical_id::text;
        v_amount := coalesce((v_remaining ->> v_key)::numeric, 0) + v_entry.quantity;
        v_remaining := v_remaining || jsonb_build_object(v_key, v_amount);
      else
        v_unattributed := v_unattributed + v_entry.quantity;
      end if;
    elsif v_entry.type = 'adjust_composition' then
      begin
        v_payload := v_entry.note::jsonb;
      exception when others then
        v_payload := null;
      end;
      if v_payload is not null and coalesce(v_payload ->> 'v', '') = '1' then
        v_remaining := coalesce(v_payload -> 'remainingByChemical', '{}'::jsonb);
        v_unattributed := coalesce((v_payload ->> 'unattributed')::numeric, 0);
        v_volume := v_entry.quantity;
        v_pct := coalesce(v_entry.solid_content_pct, 0);
      end if;
    elsif v_volume > 1e-9 and v_entry.quantity <= v_volume + 1e-9 then
      v_factor := 1 - v_entry.quantity / v_volume;
      v_next := '{}'::jsonb;
      for v_key, v_val in select key, value from jsonb_each(v_remaining)
      loop
        v_next := v_next || jsonb_build_object(v_key, (v_val #>> '{}')::numeric * v_factor);
      end loop;
      v_remaining := v_next;
      v_unattributed := v_unattributed * v_factor;
      v_volume := v_volume - v_entry.quantity;
    end if;
  end loop;

  return jsonb_build_object(
    'volume', v_volume,
    'solidPct', v_pct,
    'remainingByChemical', v_remaining,
    'unattributed', v_unattributed,
    'hasOpening', v_has_opening
  );
end;
$$;

revoke all on function public.replay_tank_snapshot(uuid) from public;
grant execute on function public.replay_tank_snapshot(uuid) to authenticated;

create or replace function public.commit_tank_snapshot(p_tank_id uuid, p_expected_version integer)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_version integer;
  v_snapshot jsonb;
begin
  select row_version into v_version
  from public.tanks
  where id = p_tank_id
  for update;

  if not found then
    raise exception 'Tank not found.';
  end if;
  if v_version <> p_expected_version then
    raise exception 'This tank was updated on another tablet. Reload and try again.';
  end if;

  v_snapshot := public.replay_tank_snapshot(p_tank_id);

  update public.tanks
  set
    snapshot = v_snapshot,
    row_version = v_version + 1,
    updated_at = timezone('utc', now())
  where id = p_tank_id;

  return jsonb_build_object(
    'row_version', v_version + 1,
    'snapshot', v_snapshot
  );
end;
$$;

revoke all on function public.commit_tank_snapshot(uuid, integer) from public;
grant execute on function public.commit_tank_snapshot(uuid, integer) to authenticated;

update public.tanks t
set snapshot = public.replay_tank_snapshot(t.id)
where true;

drop function if exists public.insert_tank_log_entries(uuid, jsonb);
drop function if exists public.replace_tank_log_entry(uuid, jsonb);
drop function if exists public.delete_tank_log_entry(uuid);
drop function if exists public.apply_stock_movements(jsonb);

create or replace function public.insert_tank_log_entries(
  p_tank_id uuid,
  p_entries jsonb,
  p_write_key uuid,
  p_expected_version integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_existing jsonb;
  v_item jsonb;
  v_row public.tank_log_entries;
  v_rows jsonb := '[]'::jsonb;
  v_first boolean := true;
  v_commit jsonb;
begin
  perform public.assert_factory_write();

  if p_write_key is null then
    raise exception 'Missing write key.';
  end if;
  if p_tank_id is null then
    raise exception 'Choose a tank first.';
  end if;
  if p_entries is null or jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) = 0 then
    raise exception 'Nothing to save.';
  end if;

  select result into v_existing
  from public.tank_write_receipts
  where write_key = p_write_key;
  if found then
    return v_existing;
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
      created_at,
      write_key
    ) values (
      p_tank_id,
      coalesce((v_item->>'entry_date')::date, (timezone('utc', now()))::date),
      v_item->>'type',
      nullif(v_item->>'chemical_id', '')::uuid,
      (v_item->>'quantity')::numeric,
      nullif(v_item->>'solid_content_pct', '')::numeric,
      nullif(btrim(coalesce(v_item->>'note', '')), ''),
      coalesce((v_item->>'created_at')::timestamptz, now()),
      case when v_first then p_write_key else null end
    )
    returning * into v_row;

    v_first := false;

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

  v_commit := public.commit_tank_snapshot(p_tank_id, p_expected_version);
  v_commit := v_commit || jsonb_build_object('entries', v_rows);

  insert into public.tank_write_receipts (write_key, result)
  values (p_write_key, v_commit);

  return v_commit;
end;
$$;

create or replace function public.replace_tank_log_entry(
  p_id uuid,
  p_entry jsonb,
  p_write_key uuid,
  p_expected_version integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_existing jsonb;
  v_row public.tank_log_entries;
  v_type text;
  v_commit jsonb;
begin
  perform public.assert_factory_write();

  if p_write_key is null then
    raise exception 'Missing write key.';
  end if;
  if p_id is null then
    raise exception 'Missing log row.';
  end if;

  select result into v_existing
  from public.tank_write_receipts
  where write_key = p_write_key;
  if found then
    return v_existing;
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
    created_at = coalesce((p_entry->>'created_at')::timestamptz, created_at),
    write_key = coalesce(write_key, p_write_key)
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

  v_commit := public.commit_tank_snapshot(v_row.tank_id, p_expected_version);
  v_commit := v_commit || jsonb_build_object('entry', to_jsonb(v_row));

  insert into public.tank_write_receipts (write_key, result)
  values (p_write_key, v_commit);

  return v_commit;
end;
$$;

create or replace function public.delete_tank_log_entry(
  p_id uuid,
  p_write_key uuid,
  p_expected_version integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_existing jsonb;
  v_tank_id uuid;
  v_commit jsonb;
begin
  perform public.assert_factory_write();

  if p_write_key is null then
    raise exception 'Missing write key.';
  end if;
  if p_id is null then
    raise exception 'Missing log row.';
  end if;

  select result into v_existing
  from public.tank_write_receipts
  where write_key = p_write_key;
  if found then
    return v_existing;
  end if;

  select tank_id into v_tank_id from public.tank_log_entries where id = p_id;
  if not found then
    raise exception 'Log row not found.';
  end if;

  perform public.reverse_stock_for_log_entry(p_id);
  delete from public.tank_log_entries where id = p_id;

  v_commit := public.commit_tank_snapshot(v_tank_id, p_expected_version);
  v_commit := v_commit || jsonb_build_object('deleted', p_id);

  insert into public.tank_write_receipts (write_key, result)
  values (p_write_key, v_commit);

  return v_commit;
end;
$$;

create or replace function public.apply_stock_movements(p_moves jsonb, p_write_key uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_existing jsonb;
  v_item jsonb;
  v_row jsonb;
  v_rows jsonb := '[]'::jsonb;
  v_result jsonb;
begin
  perform public.assert_factory_write();

  if p_write_key is null then
    raise exception 'Missing write key.';
  end if;

  select result into v_existing
  from public.tank_write_receipts
  where write_key = p_write_key;
  if found then
    return v_existing;
  end if;

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

  v_result := jsonb_build_object('movements', v_rows);
  insert into public.tank_write_receipts (write_key, result)
  values (p_write_key, v_result);
  return v_result;
end;
$$;

revoke all on function public.insert_tank_log_entries(uuid, jsonb, uuid, integer) from public;
grant execute on function public.insert_tank_log_entries(uuid, jsonb, uuid, integer) to authenticated;

revoke all on function public.replace_tank_log_entry(uuid, jsonb, uuid, integer) from public;
grant execute on function public.replace_tank_log_entry(uuid, jsonb, uuid, integer) to authenticated;

revoke all on function public.delete_tank_log_entry(uuid, uuid, integer) from public;
grant execute on function public.delete_tank_log_entry(uuid, uuid, integer) to authenticated;

revoke all on function public.apply_stock_movements(jsonb, uuid) from public;
grant execute on function public.apply_stock_movements(jsonb, uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.tanks;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.chemicals;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.tank_log_entries;
exception when duplicate_object then null;
end $$;
