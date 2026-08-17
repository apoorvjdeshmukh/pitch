'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { uploadCampaignFile, getFileSignedUrl, deleteCampaignFile } from '@/lib/storage'
import { showToast } from '@/lib/toastStore'
import {
  ACCEPT_ATTR, MAX_CAMPAIGN_FILES, MAX_FILE_SIZE_BYTES,
  detectFileType, fileTypeIcon, formatFileSize,
} from '@/lib/fileUpload'
import Hint from '@/components/Hint'
import type { Campaign, CampaignFile } from '@/lib/types'

export default function CampaignFiles({ campaign }: { campaign: Campaign }) {
  const { user, mutateCamp, uid } = useApp()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  const files = campaign.files ?? []
  const atCap = files.length >= MAX_CAMPAIGN_FILES

  async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    if (atCap) { showToast(`This campaign already has ${MAX_CAMPAIGN_FILES} files — delete one to add another.`); return }
    const type = detectFileType(file)
    if (!type) { showToast('Only PDF, DOCX, XLSX, image, and HTML files are allowed.'); return }
    if (file.size > MAX_FILE_SIZE_BYTES) { showToast(`File is too large — max ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB per file.`); return }

    setUploading(true)
    const fileId = uid()
    try {
      const storagePath = await uploadCampaignFile(user.id, campaign.id, fileId, file)
      const entry: CampaignFile = {
        id: fileId, type, name: file.name, storagePath,
        sizeBytes: file.size, createdAt: new Date().toISOString(),
      }
      await mutateCamp(campaign.id, c => { c.files = [...(c.files ?? []), entry] })
      showToast(`${file.name} uploaded`, 'info', 2500)
    } catch (err) {
      showToast('Upload failed: ' + (err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  async function addLink() {
    if (!linkName.trim() || !linkUrl.trim()) { showToast('Add a label and a URL.'); return }
    if (atCap) { showToast(`This campaign already has ${MAX_CAMPAIGN_FILES} files — delete one to add another.`); return }
    let url = linkUrl.trim()
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url
    const entry: CampaignFile = { id: uid(), type: 'link', name: linkName.trim(), url, createdAt: new Date().toISOString() }
    await mutateCamp(campaign.id, c => { c.files = [...(c.files ?? []), entry] })
    setLinkName('')
    setLinkUrl('')
    setShowLinkForm(false)
  }

  async function openFile(f: CampaignFile) {
    if (f.type === 'link') { window.open(f.url, '_blank'); return }
    if (!f.storagePath) return
    // HTML docs get their own page within the app - full navigation with a
    // breadcrumb back to this campaign, not a modal - so they read as a real
    // continuous document instead of an overlay bolted onto this screen.
    if (f.type === 'html') { router.push(`/campaign/${campaign.id}/files/${f.id}`); return }
    try {
      const url = await getFileSignedUrl(f.storagePath)
      window.open(url, '_blank')
    } catch (err) {
      showToast('Failed to open file: ' + (err as Error).message)
    }
  }

  async function removeFile(f: CampaignFile) {
    if (!confirm(`Delete "${f.name}"?`)) return
    try {
      if (f.storagePath) await deleteCampaignFile(f.storagePath)
      await mutateCamp(campaign.id, c => { c.files = (c.files ?? []).filter(x => x.id !== f.id) })
    } catch (err) {
      showToast('Failed to delete file: ' + (err as Error).message)
    }
  }

  return (
    <Hint id="campaign-files" text="Upload a resume, offer letter, or reference doc here — isolated to this campaign only, nothing crosses over to another one.">
    <div className="sec">
      <div className="sec-title">Your files ({files.length}/{MAX_CAMPAIGN_FILES})</div>

      {files.length === 0 && (
        <p style={{ fontSize: '0.83rem', color: 'var(--muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
          Upload a resume, offer letter, or reference doc for this campaign only — nothing here is shared with any other campaign.
        </p>
      )}

      {files.map(f => (
        <div key={f.id} className="file-row">
          <span className="file-row-icon">{fileTypeIcon(f.type)}</span>
          <div className="file-row-info" onClick={() => openFile(f)}>
            <div className="file-row-name">{f.name}</div>
            <div className="file-row-meta">{f.type === 'link' ? 'Link' : formatFileSize(f.sizeBytes)}</div>
          </div>
          <button className="file-row-del" onClick={() => removeFile(f)}>✕</button>
        </div>
      ))}

      {!atCap ? (
        <div className="file-actions">
          <input ref={inputRef} type="file" accept={ACCEPT_ATTR} style={{ display: 'none' }} onChange={handleFilePick} />
          <button className="btn-outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? 'Uploading…' : '+ Upload file'}
          </button>
          <button className="btn-outline" onClick={() => setShowLinkForm(v => !v)}>+ Add link</button>
        </div>
      ) : (
        <p className="source-note">Max {MAX_CAMPAIGN_FILES} files reached — delete one to add another.</p>
      )}

      {showLinkForm && (
        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label>Link label</label>
          <input type="text" value={linkName} onChange={e => setLinkName(e.target.value)} placeholder="e.g. Offer letter draft" />
          <label style={{ marginTop: '0.5rem' }}>URL</label>
          <input type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." />
          <button className="btn" style={{ marginTop: '0.5rem' }} onClick={addLink}>Add link</button>
        </div>
      )}

      <p className="source-note">PDF, DOCX, XLSX, images, HTML, and links — max 3MB per file, isolated to this campaign only.</p>
    </div>
    </Hint>
  )
}
