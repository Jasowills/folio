import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useResume } from '../lib/queries'
import { Button } from '../components/ui/button'
import {
  FileText,
  FileDown,
  Download,
  Share2,
  ExternalLink,
  ArrowLeft,
  CheckCircle,
  Loader2,
} from 'lucide-react'

type Format = 'pdf'
type Template = 'minimal' | 'modern' | 'executive'

const FORMATS: { value: Format; label: string; icon: typeof FileText; desc: string }[] = [
  { value: 'pdf', label: 'PDF', icon: FileText, desc: 'Best for sharing, printing, and submitting applications' },
]

const TEMPLATES: { value: Template; label: string }[] = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'modern', label: 'Modern' },
  { value: 'executive', label: 'Executive' },
]

function TemplatePreview({ template }: { template: Template }) {
  if (template === 'minimal') {
    return (
      <div className="h-40 bg-surface p-4 flex flex-col gap-2">
        <div className="h-6 bg-teal rounded w-full" />
        <div className="flex-1 flex flex-col gap-1.5 pt-2">
          <div className="h-1.5 bg-border rounded w-3/4" />
          <div className="h-1.5 bg-border rounded w-full" />
          <div className="h-1.5 bg-border rounded w-5/6" />
          <div className="h-1.5 bg-border rounded w-1/2" />
          <div className="h-1.5 bg-border rounded w-2/3" />
        </div>
      </div>
    )
  }

  if (template === 'modern') {
    return (
      <div className="h-40 bg-surface flex overflow-hidden">
        <div className="w-1/3 bg-teal p-3 flex flex-col gap-1.5 pt-6">
          <div className="h-1.5 bg-white/30 rounded w-3/4" />
          <div className="h-1.5 bg-white/30 rounded w-1/2" />
          <div className="h-1.5 bg-white/30 rounded w-2/3" />
        </div>
        <div className="flex-1 p-3 flex flex-col gap-1.5 pt-4">
          <div className="h-2 bg-border rounded w-2/3" />
          <div className="h-1.5 bg-border rounded w-full" />
          <div className="h-1.5 bg-border rounded w-5/6" />
          <div className="h-1.5 bg-border rounded w-3/4" />
          <div className="h-1.5 bg-border rounded w-1/2" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-40 bg-surface p-4 flex flex-col gap-2">
      <div className="h-8 bg-ink rounded w-full" />
      <div className="flex-1 flex flex-col gap-1.5 pt-2">
        <div className="h-1.5 bg-teal rounded w-16" />
        <div className="h-1.5 bg-border rounded w-full" />
        <div className="h-1.5 bg-border rounded w-5/6" />
        <div className="h-1.5 bg-teal rounded w-16 mt-1" />
        <div className="h-1.5 bg-border rounded w-3/4" />
        <div className="h-1.5 bg-border rounded w-2/3" />
      </div>
    </div>
  )
}

export default function ExportResume() {
  const { resumeId } = useParams<{ resumeId: string }>()
  const { data: resume, isLoading } = useResume(resumeId!)
  const [selectedTemplate, setSelectedTemplate] = useState<Template>('minimal')
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  async function handleDownload() {
    if (!resumeId) return
    setDownloading(true)
    setDownloadError('')

    try {
      const token = localStorage.getItem('accessToken')
      const params = new URLSearchParams({ template: selectedTemplate })
      const res = await fetch(`/api/export/${resumeId}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error(`Export failed: ${res.status}`)

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${resume?.name || 'resume'}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setDownloadError((err as Error).message)
    } finally {
      setDownloading(false)
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert('Export link copied to clipboard!')
    })
  }

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="space-y-6">
          <div className="h-10 w-48 bg-border/60 rounded animate-pulse" />
          <div className="h-5 w-32 bg-border/40 rounded animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-border/30 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="h-5 w-32 bg-border/40 rounded animate-pulse mt-8" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 bg-border/30 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!resume) {
    return (
      <div className="page-container">
        <div className="text-center py-20">
          <span className="font-display text-6xl text-border block mb-4">&amp;</span>
          <p className="text-muted">Resume not found</p>
          <Link to="/resumes">
            <Button variant="ghost" size="sm" className="mt-4">Back to resumes</Button>
          </Link>
        </div>
      </div>
    )
  }

  const templateLabel = TEMPLATES.find((t) => t.value === selectedTemplate)?.label || 'Minimal'

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h1 font-display font-bold text-ink tracking-tight">Export Resume</h1>
            <p className="text-body text-muted mt-1">Download a PDF of your resume</p>
          </div>
          <Link to={`/resume/${resumeId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
          </Link>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-3">Choose template</p>
          <div className="grid grid-cols-3 gap-4">
            {TEMPLATES.map((tmpl) => {
              const isSelected = selectedTemplate === tmpl.value
              return (
                <div
                  key={tmpl.value}
                  onClick={() => !downloading && setSelectedTemplate(tmpl.value)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      if (!downloading) setSelectedTemplate(tmpl.value)
                    }
                  }}
                  className={`rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-2 border-teal'
                      : 'border border-border hover:border-teal/30'
                  }`}
                >
                  <TemplatePreview template={tmpl.value} />
                  <div className="flex items-center justify-between px-3 py-2.5 border-t border-border bg-paper">
                    <span className="text-xs font-semibold text-ink">{tmpl.label}</span>
                    {isSelected && <CheckCircle className="h-4 w-4 text-teal" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-6 space-y-3">
          <p className="text-[13px] font-semibold text-ink">Ready to export</p>
          <p className="text-xs text-muted">
            &quot;{resume.name || 'Untitled Resume'}&quot; &middot; {templateLabel} template &middot; PDF
          </p>
          {downloadError && (
            <p className="text-xs text-danger">{downloadError}</p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating PDF...
                </span>
              ) : (
                <>
                  Download PDF
                  <Download className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
            <button
              onClick={handleShare}
              disabled={downloading}
              className="h-12 w-12 rounded-lg border border-border flex items-center justify-center text-muted hover:text-ink hover:bg-paper-dark/50 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
