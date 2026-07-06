import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconFileTypePdf, IconFileTypeDocx, IconBrandGoogleDrive } from '@tabler/icons-react'

interface ExportPopoverProps {
  open: boolean
  onClose: () => void
  onExportPdf: () => void
  onExportDocx: () => void
  onExportDrive: () => void
}

export default function ExportPopover({ open, onClose, onExportPdf, onExportDocx, onExportDrive }: ExportPopoverProps) {
  const [loading, setLoading] = useState<string | null>(null)

  if (!open) return null

  async function handleExport(label: string, fn: () => Promise<void> | void) {
    setLoading(label)
    try { await fn() } finally { setLoading(null); onClose() }
  }

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="absolute right-3 top-12 bg-white border border-border rounded-xl shadow-xl overflow-hidden w-48 z-50"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => handleExport('pdf', onExportPdf)}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-[12px] text-ink hover:bg-paper-dark transition-colors cursor-pointer"
          disabled={loading !== null}
        >
          {loading === 'pdf' ? (
            <svg className="h-4 w-4 text-muted animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="8" /></svg>
          ) : <IconFileTypePdf className="h-4 w-4 text-danger" />}
          Export as PDF
        </button>
        <button
          onClick={() => handleExport('docx', onExportDocx)}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-[12px] text-ink hover:bg-paper-dark transition-colors cursor-pointer"
          disabled={loading !== null}
        >
          {loading === 'docx' ? (
            <svg className="h-4 w-4 text-muted animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="8" /></svg>
          ) : <IconFileTypeDocx className="h-4 w-4 text-primary" />}
          Export as DOCX
        </button>
        <button
          onClick={() => handleExport('drive', onExportDrive)}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-[12px] text-ink hover:bg-paper-dark transition-colors cursor-pointer"
          disabled={loading !== null}
        >
          {loading === 'drive' ? (
            <svg className="h-4 w-4 text-muted animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="8" /></svg>
          ) : <IconBrandGoogleDrive className="h-4 w-4 text-teal" />}
          Save to Google Drive
        </button>
      </motion.div>
    </div>
  )
}
