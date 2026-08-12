import type { CampaignFileType } from './types'

export const MAX_CAMPAIGN_FILES = 10
export const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024 // 3MB

const EXT_TYPE_MAP: Record<string, CampaignFileType> = {
  pdf: 'pdf',
  docx: 'docx',
  xlsx: 'xlsx',
  xls: 'xlsx',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  webp: 'image',
  gif: 'image',
}

export const ACCEPT_ATTR = '.pdf,.docx,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.gif'

export function detectFileType(file: File): CampaignFileType | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_TYPE_MAP[ext] ?? null
}

export function fileTypeIcon(type: CampaignFileType): string {
  return { pdf: '📄', docx: '📝', xlsx: '📊', image: '🖼️', link: '🔗' }[type]
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
