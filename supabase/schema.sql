-- Run this once in Supabase: Project > SQL Editor > New query > paste this whole file > Run

-- ============ TABLES ============

create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists vendor_applications (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null,
  website text,
  social_link text,
  category text not null,
  category_other text,
  product_description text not null,
  photo_urls text[] not null default '{}',
  coa_url text,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- ============ ROW LEVEL SECURITY ============
-- Public visitors may only INSERT (submit the newsletter form / vendor application).
-- Only a logged-in admin (any authenticated user) may READ or UPDATE.

alter table subscribers enable row level security;
alter table vendor_applications enable row level security;

create policy "public can subscribe"
  on subscribers for insert
  to anon
  with check (true);

create policy "admin can read subscribers"
  on subscribers for select
  to authenticated
  using (true);

create policy "admin can delete subscribers"
  on subscribers for delete
  to authenticated
  using (true);

create policy "public can apply as vendor"
  on vendor_applications for insert
  to anon
  with check (true);

create policy "admin can read applications"
  on vendor_applications for select
  to authenticated
  using (true);

create policy "admin can update applications"
  on vendor_applications for update
  to authenticated
  using (true);

-- ============ STORAGE (vendor photo & certificate uploads) ============
-- Before running this section: go to Supabase Dashboard > Storage > New bucket,
-- name it exactly "vendor-uploads", and make it a PUBLIC bucket. Then run this
-- part of the script to set the upload/read permissions on it.

create policy "public can upload vendor files"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'vendor-uploads');

create policy "anyone can view vendor files"
  on storage.objects for select
  to public
  using (bucket_id = 'vendor-uploads');
