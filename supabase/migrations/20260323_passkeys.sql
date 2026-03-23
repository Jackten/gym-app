-- Custom WebAuthn passkey support (independent from Supabase MFA)

create extension if not exists pgcrypto;

create table if not exists public.passkey_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  device_type text not null default 'single_device' check (device_type in ('single_device', 'multi_device')),
  backed_up boolean not null default false,
  transports text[] not null default '{}',
  friendly_name text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index if not exists idx_passkey_credentials_user_id
  on public.passkey_credentials(user_id);

create index if not exists idx_passkey_credentials_last_used_at
  on public.passkey_credentials(last_used_at desc);

alter table public.passkey_credentials enable row level security;

drop policy if exists "passkey_credentials_select_own" on public.passkey_credentials;
create policy "passkey_credentials_select_own"
  on public.passkey_credentials for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "passkey_credentials_delete_own" on public.passkey_credentials;
create policy "passkey_credentials_delete_own"
  on public.passkey_credentials for delete
  to authenticated
  using (user_id = auth.uid());

-- Challenge state (server-managed only; no client policies)
create table if not exists public.passkey_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge text not null,
  ceremony text not null check (ceremony in ('registration', 'authentication')),
  user_id uuid references auth.users(id) on delete cascade,
  rp_id text not null,
  friendly_name text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists idx_passkey_challenges_lookup
  on public.passkey_challenges(ceremony, rp_id, user_id, created_at desc)
  where used_at is null;

create index if not exists idx_passkey_challenges_expires_at
  on public.passkey_challenges(expires_at);

alter table public.passkey_challenges enable row level security;
