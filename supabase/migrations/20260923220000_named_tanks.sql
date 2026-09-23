-- Named tanks share the chemical catalog and warehouse stock.
-- The previous singleton settings row and log become one tank named Tank.
-- A factory with no settings and no log gets no tank until someone names one.

create table if not exists public.tanks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  capacity numeric,
  heel numeric not null default 0 check (heel >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tanks_name_active_lower_idx
  on public.tanks (lower(name))
  where archived_at is null;

drop trigger if exists tanks_set_updated_at on public.tanks;
create trigger tanks_set_updated_at
  before update on public.tanks
  for each row execute function public.set_updated_at();

insert into public.tanks (name, capacity, heel)
select 'Tank', capacity, heel
from public.tank_settings
where not exists (
  select 1 from public.tanks
  where archived_at is null and lower(name) = 'tank'
);

insert into public.tanks (name, capacity, heel)
select 'Tank', null, 0
where exists (select 1 from public.tank_log_entries)
  and not exists (
    select 1 from public.tanks
    where archived_at is null
  );

alter table public.tank_log_entries
  add column if not exists tank_id uuid references public.tanks (id) on delete restrict;

update public.tank_log_entries
set tank_id = (
  select id from public.tanks
  where archived_at is null
  order by created_at, id
  limit 1
)
where tank_id is null;

alter table public.tank_log_entries
  alter column tank_id set not null;

create index if not exists tank_log_entries_tank_created_idx
  on public.tank_log_entries (tank_id, created_at, id);

alter table public.last_calculation
  add column if not exists tank_id uuid references public.tanks (id) on delete cascade;

update public.last_calculation
set tank_id = (
  select id from public.tanks
  where archived_at is null
  order by created_at, id
  limit 1
)
where tank_id is null;

delete from public.last_calculation
where tank_id is null;

alter table public.last_calculation
  drop constraint if exists last_calculation_pkey;

alter table public.last_calculation
  alter column tank_id set not null;

alter table public.last_calculation
  add primary key (tank_id, calculator);

drop trigger if exists tank_settings_set_updated_at on public.tank_settings;
drop table if exists public.tank_settings;

alter table public.tanks enable row level security;

drop policy if exists tanks_authenticated_all on public.tanks;
create policy tanks_authenticated_all
  on public.tanks
  for all
  to authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on table public.tanks to authenticated;
