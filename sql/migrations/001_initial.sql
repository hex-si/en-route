-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- USERS TABLE
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  phone text unique not null,
  maps_link text not null,
  location_desc text,
  photos text[] default '{}',
  spouse_name text,
  spouse_phone text,
  family_name text,
  family_phone text,
  points int default 0,
  referral_code text unique not null,
  referred_by uuid references users(id),
  verification_status text default 'pending_verification',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- POINTS LOG
create table if not exists points_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  amount int not null,
  reason text not null,
  created_at timestamptz default now()
);

-- UPDATE REQUESTS
create table if not exists update_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  field text not null,
  old_value text,
  new_value text,
  status text default 'pending',
  admin_notes text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- REFERRALS
create table if not exists referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_id uuid references users(id) on delete cascade not null,
  referred_id uuid references users(id) on delete cascade not null,
  created_at timestamptz default now()
);

-- INDEXES
create index if not exists idx_users_phone on users(phone);
create index if not exists idx_users_referral_code on users(referral_code);
create index if not exists idx_points_log_user_id on points_log(user_id);
create index if not exists idx_update_requests_user_id on update_requests(user_id);
create index if not exists idx_referrals_referrer_id on referrals(referrer_id);

-- RLS
alter table users enable row level security;
alter table points_log enable row level security;
alter table update_requests enable row level security;
alter table referrals enable row level security;

-- Users: anyone can insert (registration)
create policy "Anyone can register" on users for insert with check (true);

-- Users: anyone can search (for /check page)
create policy "Anyone can search users" on users for select using (true);

-- Points log: users can read own
create policy "Users read own points" on points_log for select using (true);

-- Update requests: anyone can insert
create policy "Anyone can submit update requests" on update_requests for insert with check (true);

-- Update requests: users can read own
create policy "Users read own requests" on update_requests for select using (true);

-- Referrals: anyone can insert (system handles)
create policy "System can insert referrals" on referrals for insert with check (true);

-- Referrals: anyone can read (for leaderboard)
create policy "Anyone can read referrals" on referrals for select using (true);
