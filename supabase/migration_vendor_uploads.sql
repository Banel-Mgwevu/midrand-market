-- Run this in Supabase SQL Editor ONLY if you already ran the original schema.sql
-- before (i.e. your vendor_applications table already exists). This adds the new
-- columns without losing any existing data.
--
-- If you're setting up Supabase for the very first time, skip this file and just
-- run schema.sql instead - it already includes everything below.

alter table vendor_applications
  add column if not exists website text,
  add column if not exists social_link text,
  add column if not exists category text not null default 'Other',
  add column if not exists category_other text,
  add column if not exists photo_urls text[] not null default '{}',
  add column if not exists coa_url text;

-- Storage bucket + policies for vendor photo/certificate uploads.
-- Before running this part: go to Supabase Dashboard > Storage > New bucket,
-- name it exactly "vendor-uploads", and make it a PUBLIC bucket.

drop policy if exists "public can upload vendor files" on storage.objects;
create policy "public can upload vendor files"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'vendor-uploads');

drop policy if exists "anyone can view vendor files" on storage.objects;
create policy "anyone can view vendor files"
  on storage.objects for select
  to public
  using (bucket_id = 'vendor-uploads');
