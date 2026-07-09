-- Add missing indexes for performance
create index if not exists idx_users_verification_status on users(verification_status);
create index if not exists idx_users_created_at on users(created_at);
create index if not exists idx_ads_active_position on ads(is_active, position);
create index if not exists idx_update_requests_user_created on update_requests(user_id, created_at);
