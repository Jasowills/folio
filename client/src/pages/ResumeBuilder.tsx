import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useResumes, useUploadResume, useDeleteResume, useAnalyzeResume, useCreateResume } from '../lib/queries'
import { Button } from '../components/ui/button'
import { UploadZone } from '../components/UploadZone'
import { ErrorBoundary } from '../components/ErrorBoundary'
import PdfViewer from '../components/PdfViewer'
import TemplatePicker from '../components/TemplatePicker'
import ColorPicker from '../components/ColorPicker'
import { TEMPLATES, COLOR_THEMES } from '../templates'
import type { ResumeTemplate } from '../templates/types'
import {
  FileText, Trash2, Sparkles, Download, Search, LayoutGrid,
  Loader2, Plus, X, FileUp, FilePlus,
} from 'lucide-react'

function resumeDisplayName(r: any): string {
  if (r?.name) return r.name
  if (r?.rawText) {
    const line = r.rawText.split('\n').find((l: string) => l.trim().length > 0)
    if (line) return line.trim()
  }
  return 'Uploaded Resume'
}

export default function ResumeBuilder() {
  const navigate = useNavigate()
  const { data: resumes, isLoading } = useResumes()
  const uploadResume = useUploadResume()
  const deleteResume = useDeleteResume()
  const analyzeResume = useAnalyzeResume()
  const createResume = useCreateResume()
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedResume, setSelectedResume] = useState<any>(null)
  const [template, setTemplate] = useState<ResumeTemplate>(TEMPLATES[0])
  const [color, setColor] = useState(COLOR_THEMES[0].primary)

  const analyzedCount = resumes?.filter((r: any) => r.quality?.overallQuality > 0).length ?? 0
  const pendingCount = resumes?.filter((r: any) => !r.quality?.overallQuality).length ?? 0

  const handleCreate = useCallback(async () => {
    try {
      const result = await createResume.mutateAsync()
      navigate(`/resume/${result._id}`)
    } catch {}
  }, [createResume, navigate])

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true)
      try {
        const result = await uploadResume.mutateAsync(file)
        setSelectedResume(result)
      } finally {
        setUploading(false)
      }
    },
    [uploadResume],
  )

  const handleAnalyze = useCallback(async () => {
    if (!selectedResume?._id) return
    setAnalyzing(true)
    try {
      const result = await analyzeResume.mutateAsync(selectedResume._id)
      setSelectedResume(result)
    } finally {
      setAnalyzing(false)
    }
  }, [selectedResume, analyzeResume])

  const hasResumes = resumes && resumes.length > 0

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-h1 font-display font-bold text-ink tracking-tight">Resumes</h1>
            <p className="text-body text-muted mt-1">
              {hasResumes ? `${resumes.length} resume${resumes.length > 1 ? 's' : ''} on file` : 'Upload or build a resume'}
            </p>
          </div>
          <Button variant="primary" onClick={handleCreate}>
            <FilePlus className="h-4 w-4 mr-2" />
            New resume
          </Button>
        </div>

        {/* Upload zone */}
        <div className="mb-8">
          <UploadZone onFile={handleFile} disabled={uploading} />
        </div>

        {/* Stats row */}
        {hasResumes && (
          <div className="flex items-center gap-6 mb-8 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-h4 font-bold text-ink tabular-nums">{resumes.length}</span>
              <span className="text-muted">total</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-h4 font-bold text-teal tabular-nums">{analyzedCount}</span>
              <span className="text-muted">analyzed</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-h4 font-bold text-amber tabular-nums">{pendingCount}</span>
              <span className="text-muted">pending</span>
            </div>
          </div>
        )}

        {/* Main area */}
        <div className="flex gap-8 items-start">
          {/* Resume list */}
          <div className={selectedResume ? 'flex-1 min-w-0' : 'w-full'}>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-[72px] bg-border/40 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : hasResumes ? (
              <div className="space-y-2">
                {resumes.map((resume: any) => {
                  const isSelected = selectedResume?._id === resume._id
                  const isAnalyzed = resume.quality?.overallQuality > 0
                  return (
                    <div
                      key={resume._id}
                      onClick={() => setSelectedResume(resume)}
                      className={[
                        'flex items-center justify-between gap-4 px-5 py-4 rounded-xl border transition-all duration-150 cursor-pointer',
                        isSelected
                          ? 'bg-white border-teal/40 shadow-sm'
                          : 'bg-white/60 border-transparent hover:bg-white hover:border-border hover:shadow-sm',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className={[
                          'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                          isAnalyzed ? 'bg-teal-light' : 'bg-paper-dark',
                        ].join(' ')}>
                          <FileText className={isAnalyzed ? 'h-5 w-5 text-teal' : 'h-5 w-5 text-muted'} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{resumeDisplayName(resume)}</p>
                          <p className="text-xs text-muted mt-0.5">
                            {new Date(resume.updatedAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {isAnalyzed ? (
                          <span className="badge badge-teal">{resume.quality.overallQuality}</span>
                        ) : (
                          <span className="badge badge-amber">Pending</span>
                        )}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Link to={`/resume/${resume._id}`}>
                            <Button variant="ghost" size="sm" className="text-xs">Edit</Button>
                          </Link>
                          <button
                            onClick={() => deleteResume.mutate(resume._id)}
                            className="p-2 rounded-lg text-muted hover:text-danger hover:bg-danger-light transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-24">
                <div className="empty-state-icon">&amp;</div>
                <p className="text-h3 font-display font-bold text-ink mb-2">No resumes yet</p>
                <p className="text-body text-muted mb-6 max-w-xs mx-auto">
                  Upload a PDF or build one from scratch with AI.
                </p>
                <Button variant="ghost" onClick={handleCreate}>
                  <FilePlus className="h-4 w-4 mr-2" />
                  Build from scratch
                </Button>
              </div>
            )}
          </div>

          {/* Preview drawer */}
          <AnimatePresence>
            {selectedResume && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 640, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="hidden xl:block overflow-hidden shrink-0"
              >
                <div className="w-[640px] pl-8 border-l border-border min-h-[500px]">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-ink truncate">
                      {resumeDisplayName(selectedResume)}
                    </p>
                    <button
                      onClick={() => setSelectedResume(null)}
                      className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* PDF or text preview */}
                    <div className="bg-white rounded-xl border border-border overflow-hidden" style={{ height: '55vh' }}>
                      {(() => {
                        const hasUrl = selectedResume.fileUrl && selectedResume.fileUrl.length > 0
                        console.log('[ResumeBuilder] selected resume preview:', {
                          id: selectedResume._id,
                          hasUrl,
                          fileUrl: selectedResume.fileUrl,
                          rawTextLength: selectedResume.rawText?.length ?? 0,
                        })
                        return hasUrl ? (
                          <PdfViewer resumeId={selectedResume._id} className="w-full h-full" />
                        ) : (
                          <div className="p-6 overflow-y-auto h-full">
                            <p className="text-xs text-muted mb-2">Raw text</p>
                            <pre className="text-[11px] text-ink/70 leading-relaxed whitespace-pre-wrap font-sans">
                              {selectedResume.rawText || 'No content'}
                            </pre>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link to={`/resume/${selectedResume._id}`} className="flex-1">
                        <Button variant="primary" className="w-full">
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        className="flex-1"
                        onClick={handleAnalyze}
                        disabled={analyzing}
                      >
                        {analyzing ? (
                          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Analyzing</>
                        ) : (
                          <><Search className="h-3.5 w-3.5 mr-1.5" />Analyze</>
                        )}
                      </Button>
                      <Link to={`/export/${selectedResume._id}`} className="flex-1">
                        <Button variant="ghost" className="w-full">
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          Export
                        </Button>
                      </Link>
                    </div>

                    {/* Template + Color */}
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                          <LayoutGrid className="h-3 w-3 inline mr-1" />
                          Template
                        </p>
                        <TemplatePicker selected={template.id} onChange={setTemplate} />
                      </div>
                      <div className="shrink-0">
                        <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          Color
                          <span className="inline-block h-2.5 w-2.5 rounded-full border border-border" style={{ backgroundColor: color }} />
                        </p>
                        <ColorPicker selected={color} onChange={setColor} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
