-- Designer OS / Supabase schema
-- Run this once in Supabase SQL Editor.
-- Never put a service_role key in the browser.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role text not null default 'employee' check (role in ('admin','designer','employee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Never trust a role supplied by a public signup request.
  insert into public.profiles(id,email,full_name,role)
  values (
    new.id,
    coalesce(new.email,''),
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(coalesce(new.email,''),'@',1)),
    'employee'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  whatsapp text,
  facebook text,
  email text,
  subject text,
  school text,
  location text,
  rating integer not null default 5 check (rating between 1 and 5),
  tags text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  type text not null,
  price numeric(12,2) not null default 0 check (price >= 0),
  deadline date,
  status text not null default 'New' check (status in ('New','Pending','In Progress','Review','Waiting for Client','Completed','Cancelled')),
  priority text not null default 'Medium' check (priority in ('Low','Medium','High','Urgent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  payment_date date not null default current_date,
  method text not null default 'Cash',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  date date not null default current_date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  currency text not null default 'EGP',
  updated_at timestamptz not null default now()
);

insert into public.settings(id,currency) values (1,'EGP')
on conflict (id) do nothing;

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_touch_updated_at on public.clients;
create trigger clients_touch_updated_at before update on public.clients
for each row execute function public.touch_updated_at();

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at before update on public.projects
for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch_updated_at on public.settings;
create trigger settings_touch_updated_at before update on public.settings
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.settings enable row level security;

-- Recreate app policies so the script can be safely re-run.
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_admin_update on public.profiles;
drop policy if exists clients_select on public.clients;
drop policy if exists clients_manage on public.clients;
drop policy if exists projects_select on public.projects;
drop policy if exists projects_manage on public.projects;
drop policy if exists payments_select on public.payments;
drop policy if exists payments_manage on public.payments;
drop policy if exists expenses_select on public.expenses;
drop policy if exists expenses_manage on public.expenses;
drop policy if exists settings_select on public.settings;
drop policy if exists settings_manage on public.settings;

create policy profiles_select on public.profiles
for select to authenticated
using (id = auth.uid() or public.get_my_role() = 'admin');

create policy profiles_admin_update on public.profiles
for update to authenticated
using (public.get_my_role() = 'admin')
with check (public.get_my_role() = 'admin');

create policy clients_select on public.clients
for select to authenticated using (true);

create policy clients_manage on public.clients
for all to authenticated
using (public.get_my_role() in ('admin','designer'))
with check (public.get_my_role() in ('admin','designer'));

create policy projects_select on public.projects
for select to authenticated using (true);

create policy projects_manage on public.projects
for all to authenticated
using (public.get_my_role() in ('admin','designer'))
with check (public.get_my_role() in ('admin','designer'));

create policy payments_select on public.payments
for select to authenticated using (true);

create policy payments_manage on public.payments
for all to authenticated
using (public.get_my_role() in ('admin','designer'))
with check (public.get_my_role() in ('admin','designer'));

create policy expenses_select on public.expenses
for select to authenticated using (true);

create policy expenses_manage on public.expenses
for all to authenticated
using (public.get_my_role() in ('admin','designer'))
with check (public.get_my_role() in ('admin','designer'));

create policy settings_select on public.settings
for select to authenticated using (true);

create policy settings_manage on public.settings
for all to authenticated
using (public.get_my_role() = 'admin')
with check (public.get_my_role() = 'admin');

-- Least-privilege Data API grants.
grant select on public.profiles, public.clients, public.projects, public.payments, public.expenses, public.settings to authenticated;
grant insert, update, delete on public.clients, public.projects, public.payments, public.expenses to authenticated;
grant update on public.profiles, public.settings to authenticated;

-- Realtime: add only the tables used by this application.
do $$
declare
  t text;
begin
  foreach t in array array['clients','projects','payments','expenses','settings'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

alter table public.clients replica identity full;
alter table public.projects replica identity full;
alter table public.payments replica identity full;
alter table public.expenses replica identity full;
alter table public.settings replica identity full;

create index if not exists projects_client_id_idx on public.projects(client_id);
create index if not exists payments_project_id_idx on public.payments(project_id);
create index if not exists projects_deadline_idx on public.projects(deadline);

-- IMPORTANT:
-- After creating your first Auth user, promote it once in SQL:
-- update public.profiles set role='admin' where email='YOUR_EMAIL_HERE';
