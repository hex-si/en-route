create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table areas enable row level security;

create policy "Anyone can view active areas" on areas
  for select using (is_active = true);

create policy "Service role can manage areas" on areas
  for all using (true) with check (true);

create index if not exists idx_areas_is_active on areas(is_active);
