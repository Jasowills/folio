import { useState, useMemo } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { IconLoader2, IconAlertTriangle } from '@tabler/icons-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'

// CDN worker — Vite's new URL resolution can't handle bare specifiers for node_modules files
pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs'

interface PdfViewerProps {
  resumeId?: string
  fileUrl?: string
  className?: string
}

export default function PdfViewer({ resumeId, fileUrl, className = '' }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [, setPageNumber] = useState(1)

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  const file = useMemo(() => resumeId
    ? { url: `/api/resumes/${resumeId}/pdf`, httpHeaders: token ? { Authorization: `Bearer ${token}` } : undefined }
    : fileUrl
      ? { url: fileUrl }
      : null, [resumeId, fileUrl, token])

  function onLoadSuccess({ numPages }: { numPages: number }) {
    console.log(`[PdfViewer] loaded PDF — ${numPages} page(s)${resumeId ? `, resumeId=${resumeId}` : ''}${fileUrl ? `, fileUrl=${fileUrl.slice(0, 60)}...` : ''}`)
    setNumPages(numPages)
    setPageNumber(1)
  }

  function onLoadError(error: Error) {
    console.error(`[PdfViewer] failed to load PDF — ${error.message}${resumeId ? `, resumeId=${resumeId}` : ''}${fileUrl ? `, fileUrl=${fileUrl.slice(0, 60)}...` : ''}`, { file })
  }

  if (!file) {
    return (
      <div className="flex items-center justify-center py-16 text-muted text-xs">
        No PDF available
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center overflow-y-auto ${className}`}>
      <Document
        file={file}
        onLoadSuccess={onLoadSuccess}
        onLoadError={onLoadError}
        loading={
          <div className="flex items-center justify-center py-16">
            <IconLoader2 className="h-6 w-6 text-muted animate-spin" />
          </div>
        }
        error={
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <IconAlertTriangle className="h-8 w-8 text-danger mb-3" />
            <p className="text-sm text-muted">Failed to load PDF preview</p>
          </div>
        }
        className="flex flex-col items-center"
      >
        {numPages && Array.from({ length: numPages }, (_, i) => (
          <Page
            key={i + 1}
            pageNumber={i + 1}
            width={Math.max(200, Math.min(580, typeof window !== 'undefined' ? window.innerWidth - 80 : 580))}
            renderTextLayer={false}
            renderAnnotationLayer={true}
            className="mb-4 last:mb-0 shadow-sm"
          />
        ))}
      </Document>
    </div>
  )
}
