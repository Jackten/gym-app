alter table public.passkey_credentials
  add column if not exists rp_id text;

update public.passkey_credentials
set rp_id = 'gym-app-navy-nine.vercel.app'
where rp_id is null;

alter table public.passkey_credentials
  alter column rp_id set not null;

create index if not exists idx_passkey_credentials_user_rp_created
  on public.passkey_credentials(user_id, rp_id, created_at desc);

create index if not exists idx_passkey_credentials_rp_id
  on public.passkey_credentials(rp_id);
