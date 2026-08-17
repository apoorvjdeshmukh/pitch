import { createClient } from './supabase'

// Private bucket - files are only ever addressed via short-lived signed URLs,
// scoped by RLS policy to paths starting with the requesting user's own uid.
// See supabase/storage-setup.sql for the one-time bucket + policy setup.
const BUCKET = 'campaign-files'

// The browser's File.type is what Supabase stores as Content-Type if not
// overridden - and it's not reliable for every OS/browser combination (some
// leave it blank for less common extensions like .html, which then falls
// back to a generic type and gets served/rendered as plain text instead of
// markup). Setting it explicitly from the extension avoids depending on that.
const EXT_MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  html: 'text/html',
  htm: 'text/html',
}

export async function uploadCampaignFile(
  userId: string,
  campaignId: string,
  fileId: string,
  file: File,
): Promise<string> {
  const sb = createClient()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `${userId}/${campaignId}/${fileId}.${ext}`
  const contentType = EXT_MIME_MAP[ext] ?? file.type ?? 'application/octet-stream'
  // Passing the contentType *option* alone isn't enough - the browser's own
  // multipart upload machinery reads a File's intrinsic .type for that part's
  // Content-Type and wins regardless of what's specified in fileOptions. This
  // matters most for .html, where an inconsistently-detected browser MIME
  // type (often empty) was silently downgrading it to text/plain, causing it
  // to render as raw source in the in-app viewer instead of as markup.
  // Re-wrapping in a fresh File with the type set explicitly fixes it.
  const typedFile = new File([file], file.name, { type: contentType })
  const { error } = await sb.storage.from(BUCKET).upload(path, typedFile, { upsert: false, contentType })
  if (error) throw error
  return path
}

// Default 60s is plenty for a click that opens a new tab (the browser fetches
// immediately). The in-app HTML viewer instead keeps the URL live as an
// <iframe src> for as long as someone's actually reading it, so it asks for
// a longer-lived one explicitly.
export async function getFileSignedUrl(storagePath: string, expiresInSeconds = 60): Promise<string> {
  const sb = createClient()
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(storagePath, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}

// For the in-app HTML viewer: signed URLs (see getFileSignedUrl above) are
// deliberately served by Supabase with Content-Type forced to text/plain
// regardless of what's actually stored - a security measure so a signed
// "download" link can never trigger stored HTML to execute. That's correct
// for a link you might share, but breaks in-app rendering. Downloading the
// bytes directly through the authenticated client (RLS-checked, same as any
// other request) sidesteps that entirely - the browser never sees a
// text/plain header because there isn't a network response to read one
// from; the content is handed to the iframe directly via srcDoc.
export async function getFileText(storagePath: string): Promise<string> {
  const sb = createClient()
  const { data, error } = await sb.storage.from(BUCKET).download(storagePath)
  if (error) throw error
  return data.text()
}

export async function deleteCampaignFile(storagePath: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.storage.from(BUCKET).remove([storagePath])
  if (error) throw error
}
