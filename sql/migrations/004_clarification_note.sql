-- Add clarification note column for needs_info status
alter table users add column if not exists clarification_note text;
