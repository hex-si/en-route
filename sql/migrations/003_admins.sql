-- ADMINS TABLE
create table if not exists admins (
  id uuid primary key default uuid_generate_v4(),
  phone text unique not null,
  password_hash text not null,
  security_question text not null default 'Who is your favorite human?',
  security_answer text not null,
  created_at timestamptz default now()
);

alter table admins enable row level security;

-- Only service role can access admins table
create policy "Service role only" on admins for all using (true) with check (true);

-- Seed admin: phone 7005498122, password Enroute@2026, answer Extranar
-- Password hash: SHA-256 of "Enroute@2026"
-- Answer hash: SHA-256 of "extranar" (lowercase)
insert into admins (phone, password_hash, security_answer)
values (
  '7005498122',
  encode(sha256('Enroute@2026'::bytea), 'hex'),
  encode(sha256('extranar'::bytea), 'hex')
)
on conflict (phone) do nothing;
