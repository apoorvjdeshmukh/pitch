import { createClient } from './supabase'

// Private bucket - files are only ever addressed via short-lived signed URLs,
// scoped by RLS policy to paths starting with the requesting user's own uid.
// See supabase/storage-setup.sql for the one-time bucket + policy setup.
const BUCKET = 'campaign-files'

export async function uploadCampaignFile(
  userId: string,
  campaignId: string,
  fileId: string,
  file: File,
): Promise<string> {
  const sb = createClient()
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${userId}/${campaignId}/${fileId}.${ext}`
  const { error } = await sb.storage.from(BUCKET).upload(path, file, { upsert: false })
  if (error) throw error
  return path
}

export async function getFileSignedUrl(storagePath: string): Promise<string> {
  const sb = createClient()
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(storagePath, 60)
  if (error) throw error
  return data.signedUrl
}

export async function deleteCampaignFile(storagePath: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.storage.from(BUCKET).remove([storagePath])
  if (error) throw error
}
