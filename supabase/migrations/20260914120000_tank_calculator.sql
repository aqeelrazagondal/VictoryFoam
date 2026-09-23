-- Foam chemical calculator schema (single-user factory tool).
-- Apply in the Supabase SQL editor or via the CLI. RLS allows the
-- authenticated role only; the anon role has no table grants.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.chemicals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  solid_content_pct numeric(5, 2) not null
    check (solid_content_pct >= 0 and solid_content_pct <= 100),
  qty_available numeric,
  unit text not null default 'kg',
  oh_value numeric,
  viscosity numeric,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists chemicals_name_active_lower_idx
  on public.chemicals (lower(name))
  where archived_at is null;

create table if not exists public.tank_settings (
  id boolean primary key default true check (id),
  capacity numeric,
  heel numeric not null default 0 check (heel >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.tank_log_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  type text not null check (type in ('opening_balance', 'add_batch', 'consume_usage')),
  chemical_id uuid references public.chemicals (id),
  quantity numeric not null check (quantity >= 0),
  solid_content_pct numeric(5, 2)
    check (
      solid_content_pct is null
      or (solid_content_pct >= 0 and solid_content_pct <= 100)
    ),
  note text,
  created_at timestamptz not null default now(),
  constraint tank_log_solid_pct_by_type check (
    (type in ('opening_balance', 'add_batch') and solid_content_pct is not null)
    or (type = 'consume_usage' and solid_content_pct is null)
  )
);

create index if not exists tank_log_entries_created_at_idx
  on public.tank_log_entries (created_at, id);

create table if not exists public.last_calculation (
  calculator text primary key check (calculator in ('blend', 'fill')),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists chemicals_set_updated_at on public.chemicals;
create trigger chemicals_set_updated_at
  before update on public.chemicals
  for each row execute function public.set_updated_at();

drop trigger if exists tank_settings_set_updated_at on public.tank_settings;
create trigger tank_settings_set_updated_at
  before update on public.tank_settings
  for each row execute function public.set_updated_at();

drop trigger if exists last_calculation_set_updated_at on public.last_calculation;
create trigger last_calculation_set_updated_at
  before update on public.last_calculation
  for each row execute function public.set_updated_at();

alter table public.chemicals enable row level security;
alter table public.tank_settings enable row level security;
alter table public.tank_log_entries enable row level security;
alter table public.last_calculation enable row level security;

drop policy if exists chemicals_authenticated_all on public.chemicals;
create policy chemicals_authenticated_all
  on public.chemicals
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists tank_settings_authenticated_all on public.tank_settings;
create policy tank_settings_authenticated_all
  on public.tank_settings
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists tank_log_entries_authenticated_all on public.tank_log_entries;
create policy tank_log_entries_authenticated_all
  on public.tank_log_entries
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists last_calculation_authenticated_all on public.last_calculation;
create policy last_calculation_authenticated_all
  on public.last_calculation
  for all
  to authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on table public.chemicals to authenticated;
grant select, insert, update, delete on table public.tank_settings to authenticated;
grant select, insert, update, delete on table public.tank_log_entries to authenticated;
grant select, insert, update, delete on table public.last_calculation to authenticated;
