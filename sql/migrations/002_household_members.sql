-- New table for unlimited household members
create table if not exists household_members (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  phone text not null,
  created_at timestamptz default now()
);

create index if not exists idx_household_members_user_id on household_members(user_id);

alter table household_members enable row level security;

create policy "Anyone can read household members" on household_members for select using (true);
create policy "Anyone can insert household members" on household_members for insert with check (true);
create policy "Users can delete household members" on household_members for delete using (true);

-- Remove fixed spouse/family columns from users
alter table users drop column if exists spouse_name;
alter table users drop column if exists spouse_phone;
alter table users drop column if exists family_name;
alter table users drop column if exists family_phone;
