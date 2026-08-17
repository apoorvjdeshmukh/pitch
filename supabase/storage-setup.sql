-- One-time setup for the per-campaign file upload feature.
-- Run the steps below in your Supabase project. Nothing here runs automatically.

-- STEP 1 — create the bucket (Dashboard, not SQL):
--   Supabase Dashboard → Storage → New bucket
--     Name: campaign-files
--     Public: OFF (must stay private — access is only ever via short-lived signed URLs)
--     Allowed MIME types: leave blank/unrestricted, or explicitly include every
--     type this feature supports (see the list below) — the Dashboard's bucket
--     creation UI defaults to a narrower preset that does NOT include text/html,
--     so uploading an .html file will fail with "mime type not supported" unless
--     this is set correctly.
--
-- Alternatively, via SQL (run in the SQL Editor):
insert into storage.buckets (id, name, public, allowed_mime_types)
values (
  'campaign-files', 'campaign-files', false,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'text/html'
  ]
)
on conflict (id) do nothing;

-- If the bucket already exists (e.g. you set it up before HTML uploads were
-- supported), the insert above is a no-op - fix the existing bucket instead:
-- update storage.buckets
-- set allowed_mime_types = array[
--   'application/pdf',
--   'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
--   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
--   'application/vnd.ms-excel',
--   'image/png', 'image/jpeg', 'image/webp', 'image/gif',
--   'text/html'
-- ]
-- where id = 'campaign-files';

-- STEP 2 — RLS policy scoping access to each user's own files.
-- Files are stored at paths shaped: {user_id}/{campaign_id}/{file_id}.{ext}
-- This policy only allows a user to read/write/delete objects whose first
-- path segment matches their own auth uid — so one user's uploads are never
-- reachable by another user, regardless of campaign.
create policy "Users manage their own campaign files"
on storage.objects
for all
using (
  bucket_id = 'campaign-files'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'campaign-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);
