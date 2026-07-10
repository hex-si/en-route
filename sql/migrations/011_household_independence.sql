-- Link household members who register on their own to their original head,
-- and support "request independent household".

-- On a users row, points to the head household this person originally belonged to.
alter table users add column if not exists head_user_id uuid references users(id) on delete set null;

-- On a household_members row, points to the users account created when the
-- member registered independently (i.e. was "promoted" out of the household).
alter table household_members add column if not exists promoted_user_id uuid references users(id) on delete set null;

create index if not exists idx_users_head_user_id on users(head_user_id);
create index if not exists idx_household_members_promoted_user_id on household_members(promoted_user_id);

-- Allow the registration flow (anon client) to set promoted_user_id when a
-- member registers on their own.
drop policy if exists "Anyone can update household members" on household_members;
create policy "Anyone can update household members" on household_members for update using (true) with check (true);
