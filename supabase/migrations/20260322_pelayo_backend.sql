-- Pelayo Wellness Supabase backend v1
-- Run in Supabase SQL Editor or via Supabase CLI migration flow.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  wallet_address text,
  auth_methods text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);

create table if not exists public.recurring_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pattern text not null default 'time-series',
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly')),
  weekdays smallint[] not null default '{}',
  end_date date,
  skip_dates date[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null check (duration_minutes > 0),
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  equipment_categories text[] not null default '{}',
  equipment_items text[] not null default '{}',
  notes text,
  recurring_group_id uuid references public.recurring_groups(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment (
  id text primary key,
  name text not null,
  category text not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment_reservations (
  id uuid primary key default gen_random_uuid(),
  equipment_id text not null references public.equipment(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(equipment_id, booking_id)
);

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_bookings_user_date on public.bookings(user_id, slot_date);
create index if not exists idx_bookings_date_time on public.bookings(slot_date, start_time, end_time);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_bookings_recurring_group on public.bookings(recurring_group_id);
create index if not exists idx_recurring_groups_user on public.recurring_groups(user_id);
create index if not exists idx_equipment_category_available on public.equipment(category, is_available);
create index if not exists idx_equipment_res_date_time on public.equipment_reservations(slot_date, start_time, end_time);
create index if not exists idx_equipment_res_booking on public.equipment_reservations(booking_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, auth_methods, created_at, updated_at, last_sign_in_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    case
      when jsonb_typeof(new.raw_app_meta_data -> 'providers') = 'array'
        then array(select jsonb_array_elements_text(new.raw_app_meta_data -> 'providers'))
      else '{}'
    end,
    now(),
    now(),
    now()
  )
  on conflict (id)
  do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    auth_methods = case when array_length(excluded.auth_methods, 1) is null then public.profiles.auth_methods else excluded.auth_methods end,
    updated_at = now(),
    last_sign_in_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists recurring_groups_set_updated_at on public.recurring_groups;
create trigger recurring_groups_set_updated_at
  before update on public.recurring_groups
  for each row execute function public.set_updated_at();

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

drop trigger if exists equipment_set_updated_at on public.equipment;
create trigger equipment_set_updated_at
  before update on public.equipment
  for each row execute function public.set_updated_at();

drop trigger if exists equipment_reservations_set_updated_at on public.equipment_reservations;
create trigger equipment_reservations_set_updated_at
  before update on public.equipment_reservations
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.recurring_groups enable row level security;
alter table public.bookings enable row level security;
alter table public.equipment enable row level security;
alter table public.equipment_reservations enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "recurring_groups_select_own" on public.recurring_groups;
create policy "recurring_groups_select_own"
  on public.recurring_groups for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "recurring_groups_insert_own" on public.recurring_groups;
create policy "recurring_groups_insert_own"
  on public.recurring_groups for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "recurring_groups_update_own" on public.recurring_groups;
create policy "recurring_groups_update_own"
  on public.recurring_groups for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "recurring_groups_delete_own" on public.recurring_groups;
create policy "recurring_groups_delete_own"
  on public.recurring_groups for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "bookings_select_confirmed_or_own" on public.bookings;
create policy "bookings_select_confirmed_or_own"
  on public.bookings for select
  to authenticated
  using (status = 'confirmed' or user_id = auth.uid());

drop policy if exists "bookings_insert_own" on public.bookings;
create policy "bookings_insert_own"
  on public.bookings for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "bookings_update_own" on public.bookings;
create policy "bookings_update_own"
  on public.bookings for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "bookings_delete_own" on public.bookings;
create policy "bookings_delete_own"
  on public.bookings for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "equipment_select_all" on public.equipment;
create policy "equipment_select_all"
  on public.equipment for select
  to authenticated
  using (true);

drop policy if exists "equipment_reservations_select_authenticated" on public.equipment_reservations;
create policy "equipment_reservations_select_authenticated"
  on public.equipment_reservations for select
  to authenticated
  using (true);

drop policy if exists "equipment_reservations_insert_own_booking" on public.equipment_reservations;
create policy "equipment_reservations_insert_own_booking"
  on public.equipment_reservations for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_id
        and b.user_id = auth.uid()
    )
  );

drop policy if exists "equipment_reservations_update_own_booking" on public.equipment_reservations;
create policy "equipment_reservations_update_own_booking"
  on public.equipment_reservations for update
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_id
        and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_id
        and b.user_id = auth.uid()
    )
  );

drop policy if exists "equipment_reservations_delete_own_booking" on public.equipment_reservations;
create policy "equipment_reservations_delete_own_booking"
  on public.equipment_reservations for delete
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_id
        and b.user_id = auth.uid()
    )
  );

insert into public.equipment (id, name, category, is_available)
values
  ('treadmill', 'Treadmill', 'cardio', true),
  ('assault-bike', 'Assault Bike', 'cardio', true),
  ('row-machine', 'Row Machine', 'cardio', true),
  ('ski-erg', 'Ski Erg', 'cardio', true),
  ('barbell', 'Barbell', 'weights', true),
  ('dumbbell', 'Dumbbells', 'weights', true),
  ('bench', 'Bench', 'weights', true),
  ('kettlebell', 'Kettlebell', 'weights', true),
  ('cable-machine', 'Cable Machine', 'weights', true),
  ('pull-up-bar', 'Pull-up Bar', 'bodyweight', true),
  ('rings', 'Rings', 'bodyweight', true),
  ('dip-station', 'Dip Station', 'bodyweight', true),
  ('mat', 'Mat Area', 'bodyweight', true),
  ('sled', 'Sled', 'functional', true),
  ('battle-ropes', 'Battle Ropes', 'functional', true),
  ('sandbags', 'Sandbags', 'functional', true),
  ('med-ball', 'Medicine Ball', 'functional', true)
on conflict (id) do update
set
  name = excluded.name,
  category = excluded.category,
  is_available = excluded.is_available,
  updated_at = now();
