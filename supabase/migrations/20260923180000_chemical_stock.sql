-- Warehouse stock ledger. chemicals.qty_available stays the on-hand cache.
-- Movements are the history. apply_stock_movement updates both in one call.

alter table public.chemicals
  add column if not exists reorder_kg numeric
    check (reorder_kg is null or reorder_kg >= 0);

create table if not exists public.chemical_stock_movements (
  id uuid primary key default gen_random_uuid(),
  chemical_id uuid not null references public.chemicals (id) on delete restrict,
  type text not null check (type in ('receive', 'issue', 'waste', 'count', 'pour')),
  quantity numeric not null,
  balance_after numeric not null,
  note text,
  tank_log_entry_id uuid references public.tank_log_entries (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists chemical_stock_movements_chemical_created_idx
  on public.chemical_stock_movements (chemical_id, created_at desc, id desc);

create index if not exists chemical_stock_movements_log_entry_idx
  on public.chemical_stock_movements (tank_log_entry_id)
  where tank_log_entry_id is not null;

alter table public.chemical_stock_movements enable row level security;

drop policy if exists chemical_stock_movements_authenticated_all on public.chemical_stock_movements;
create policy chemical_stock_movements_authenticated_all
  on public.chemical_stock_movements
  for all
  to authenticated
  using (true)
  with check (true);

grant select, insert, update on table public.chemical_stock_movements to authenticated;

-- quantity is kilograms moved (positive) for receive, issue, waste, and pour.
-- For count it is the kilograms just counted. The stored row quantity is the signed change.
-- A pour against untracked stock (qty_available is null) changes nothing.
create or replace function public.apply_stock_movement(
  p_chemical_id uuid,
  p_type text,
  p_quantity numeric,
  p_note text default null,
  p_tank_log_entry_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current numeric;
  v_signed numeric;
  v_balance numeric;
  v_row public.chemical_stock_movements;
begin
  if p_type not in ('receive', 'issue', 'waste', 'count', 'pour') then
    raise exception 'Unknown stock movement type';
  end if;
  if p_quantity is null then
    raise exception 'Quantity must be a number.';
  end if;

  select qty_available into v_current
  from public.chemicals
  where id = p_chemical_id
  for update;

  if not found then
    raise exception 'Chemical not found.';
  end if;

  if p_type = 'pour' and v_current is null then
    return null;
  end if;

  if p_type = 'count' then
    if p_quantity < 0 then
      raise exception 'Counted stock cannot be negative.';
    end if;
    v_signed := p_quantity - coalesce(v_current, 0);
  elsif p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero.';
  elsif p_type = 'receive' then
    v_signed := p_quantity;
  else
    v_signed := -p_quantity;
  end if;

  v_balance := coalesce(v_current, 0) + v_signed;

  update public.chemicals
  set qty_available = v_balance
  where id = p_chemical_id;

  insert into public.chemical_stock_movements (
    chemical_id,
    type,
    quantity,
    balance_after,
    note,
    tank_log_entry_id
  ) values (
    p_chemical_id,
    p_type,
    v_signed,
    v_balance,
    nullif(btrim(coalesce(p_note, '')), ''),
    p_tank_log_entry_id
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

-- Puts poured kilograms back and detaches the movement so a second delete cannot reverse it again.
create or replace function public.reverse_stock_for_log_entry(p_entry_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_movement public.chemical_stock_movements;
  v_current numeric;
  v_balance numeric;
begin
  for v_movement in
    select *
    from public.chemical_stock_movements
    where tank_log_entry_id = p_entry_id
    for update
  loop
    select qty_available into v_current
    from public.chemicals
    where id = v_movement.chemical_id
    for update;

    if not found or v_current is null then
      update public.chemical_stock_movements
      set tank_log_entry_id = null
      where id = v_movement.id;
      continue;
    end if;

    v_balance := v_current - v_movement.quantity;

    update public.chemicals
    set qty_available = v_balance
    where id = v_movement.chemical_id;

    update public.chemical_stock_movements
    set tank_log_entry_id = null
    where id = v_movement.id;

    insert into public.chemical_stock_movements (
      chemical_id,
      type,
      quantity,
      balance_after,
      note,
      tank_log_entry_id
    ) values (
      v_movement.chemical_id,
      'pour',
      -v_movement.quantity,
      v_balance,
      'Tank log row removed',
      null
    );
  end loop;
end;
$$;

revoke all on function public.apply_stock_movement(uuid, text, numeric, text, uuid) from public;
grant execute on function public.apply_stock_movement(uuid, text, numeric, text, uuid) to authenticated;

revoke all on function public.reverse_stock_for_log_entry(uuid) from public;
grant execute on function public.reverse_stock_for_log_entry(uuid) to authenticated;
