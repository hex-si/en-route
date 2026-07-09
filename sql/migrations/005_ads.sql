-- ADS TABLE
create table if not exists ads (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  image_url text,
  link_url text not null,
  is_active boolean default true,
  position text default 'both',
  created_at timestamptz default now()
);

-- RLS
alter table ads enable row level security;

-- Anyone can read active ads (for public display)
create policy "Anyone can read active ads" on ads for select using (is_active = true);

-- Indexes
create index if not exists idx_ads_active on ads(is_active);
create index if not exists idx_ads_position on ads(position);
