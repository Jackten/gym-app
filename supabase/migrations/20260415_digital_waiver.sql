create table if not exists public.waiver_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  waiver_version text not null,
  legal_name text not null,
  emergency_contact_name text,
  emergency_contact_phone text,
  signature_name text not null,
  user_agent text,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_waiver_acceptances_user_id
  on public.waiver_acceptances(user_id);

drop trigger if exists waiver_acceptances_set_updated_at on public.waiver_acceptances;
create trigger waiver_acceptances_set_updated_at
  before update on public.waiver_acceptances
  for each row execute function public.set_updated_at();

alter table public.waiver_acceptances enable row level security;

drop policy if exists "waiver_acceptances_select_own" on public.waiver_acceptances;
create policy "waiver_acceptances_select_own"
  on public.waiver_acceptances for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "waiver_acceptances_insert_own" on public.waiver_acceptances;
create policy "waiver_acceptances_insert_own"
  on public.waiver_acceptances for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "waiver_acceptances_update_own" on public.waiver_acceptances;
create policy "waiver_acceptances_update_own"
  on public.waiver_acceptances for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
