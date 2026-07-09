-- Add file upload columns to ads
alter table ads add column if not exists image_data text;
alter table ads add column if not exists video_data text;
