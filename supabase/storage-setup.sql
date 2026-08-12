-- One-time setup for the per-campaign file upload feature.
-- Run the steps below in your Supabase project. Nothing here runs automatically.

-- STEP 1 — create the bucket (Dashboard, not SQL):
--   Supabase Dashboard → Storage → New bucket
--     Name: campaign-files
--     Public: OFF (must stay private — access is only ever via short-lived signed URLs)
--
-- Alternatively, via SQL (run in the SQL Editor):
insert into storage.buckets (id, name, public)
values ('campaign-files', 'campaign-files', false)
on conflict (id) do nothing;

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
