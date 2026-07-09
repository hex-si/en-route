-- Add house ownership type
alter table users add column if not exists house_type text;
