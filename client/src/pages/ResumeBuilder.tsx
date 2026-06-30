import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { useResumes, useUploadResume, useDeleteResume, useAnalyzeResume, useCreateResume } from '../lib/queries'
import api from '../lib/api'
import type { Resume } from '../lib/queries'
import { getScoreRingColor } from '../lib/utils'
import { IconFileText, IconTrash, IconDownload, IconSearch, IconUpload, IconPlus, IconX, IconFilePlus, IconDots, IconAlertTriangle, IconCircleCheck, IconEye, IconChartBar, IconFilePencil, IconCopy, IconRefresh } from '@tabler/icons-react'

const MAX_FILE_SIZE = 15 * 1024 * 1024

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function resumeTitle(r: Resume): string {
  if (r.name) return r.name
  if (r.title) return r.title
  if (r.rawText) {
    const line = r.rawText.split('\n').find(l => l.trim().length > 0)
    if (line) return line.trim().slice(0, 48)
  }
  return r.filename || 'Untitled'
}

function resumeSubtitle(r: Resume): string {
  const role = r.detectedRole?.role
  const time = timeAgo(r.updatedAt)
  if (role) return `${role} · Edited ${time}`
  return `Edited ${time}`
}

function getStatus(r: Resume): { label: string; dot: string; bg: string; text: string; key: 'analysed' | 'pending' | 'attention' | 'draft' } {
  const isAnalysed = r.quality?.overallQuality != null && r.quality.overallQuality > 0
  if (!isAnalysed && r.rawText) return { label: 'Pending', dot: 'bg-amber', bg: 'bg-amber-light', text: 'text-amber', key: 'pending' }
  if (isAnalysed && r.quality!.overallQuality < 50) return { label: 'Needs attention', dot: 'bg-danger', bg: 'bg-danger-light', text: 'text-danger', key: 'attention' }
  if (r.redFlags && r.redFlags.length > 0) return { label: 'Needs attention', dot: 'bg-danger', bg: 'bg-danger-light', text: 'text-danger', key: 'attention' }
  if (isAnalysed) return { label: 'Analysed', dot: 'bg-teal', bg: 'bg-teal-light', text: 'text-teal', key: 'analysed' }
  return { label: 'Draft', dot: 'bg-muted-light', bg: 'bg-paper', text: 'text-muted', key: 'draft' }
}

function CardThumbnail({ statusKey }: { statusKey: string }) {
  const isPending = statusKey === 'pending'
  return (
    <div className={`w-[72px] bg-white rounded-[2px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-2 flex flex-col gap-1.5 ${isPending ? 'opacity-50' : ''}`}>
      <div className="h-[3px] w-3/4 rounded-full bg-teal/60" />
      <div className="h-[2px] w-full rounded-full bg-border" />
      <div className="h-[2px] w-5/6 rounded-full bg-border" />
      <div className="h-[2px] w-4/6 rounded-full bg-border" />
      <div className="h-[3px] w-3/5 rounded-full bg-border/60 mt-0.5" />
      <div className="h-[2px] w-full rounded-full bg-border/60" />
      <div className="h-[2px] w-3/4 rounded-full bg-border/60" />
      <div className="h-[2px] w-5/6 rounded-full bg-border/60" />
      {isPending && (
        <div className="absolute inset-0 overflow-hidden rounded-[2px]">
          <div className="w-full h-full" style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s ease-in-out infinite',
          }} />
        </div>
      )}
    </div>
  )
}

type SortKey = 'updatedAt' | 'score-desc' | 'score-asc' | 'createdAt' | 'alpha'
type FilterKey = 'all' | 'attention' | 'strong'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'updatedAt', label: 'Last edited' },
  { value: 'score-desc', label: 'Highest score' },
  { value: 'score-asc', label: 'Lowest score' },
  { value: 'createdAt', label: 'Newest first' },
  { value: 'alpha', label: 'Alphabetical' },
]

const FILTER_PILLS: { value: FilterKey; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'strong', label: 'Strong' },
]

function useResumeOperations() {
  const qc = useQueryClient()
  const deleteResume = useDeleteResume()
  const analyzeResume = useAnalyzeResume()
  const uploadResume = useUploadResume()
  const createResume = useCreateResume()

  return { deleteResume, analyzeResume, uploadResume, createResume, qc }
}

// ---- Context Menu Component ----

interface ContextMenuProps {
  x: number
  y: number
  resume: Resume
  onClose: () => void
  onNavigate: (path: string) => void
  onDelete: (id: string) => void
  onAnalyze: (id: string) => void
  onDuplicate: (id: string) => void
}

function ContextMenu({ x, y, resume, onClose, onNavigate, onDelete, onAnalyze, onDuplicate }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [deleting, setDeleting] = useState(false)
  const isAnalysed = (resume.quality?.overallQuality ?? 0) > 0

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const menuX = Math.min(x, window.innerWidth - 220)
  const menuY = Math.min(y, window.innerHeight - 360)

  const items: { icon: typeof IconFileText; label: string; action: () => void; disabled?: boolean }[] = [
    { icon: IconFilePencil, label: 'Edit', action: () => onNavigate(`/resume/${resume._id}`) },
    ...(isAnalysed ? [{ icon: IconEye as typeof IconFileText, label: 'View review', action: () => onNavigate(`/resume/${resume._id}/review`) }] : []),
    { icon: IconChartBar, label: 'Run ATS check', action: () => onNavigate(`/ats?resume=${resume._id}`) },
    { icon: IconFileText, label: 'Generate cover letter', action: () => onNavigate(`/cover-letter/new?resume=${resume._id}`) },
    { icon: IconDownload, label: 'Export PDF', action: () => onNavigate(`/export/${resume._id}`) },
    { icon: IconCopy, label: 'Duplicate', action: () => onDuplicate(resume._id) },
    ...(isAnalysed ? [{ icon: IconRefresh as typeof IconFileText, label: 'Re-analyse', action: () => onAnalyze(resume._id) }] : []),
  ]

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-border rounded-lg shadow-modal py-1 min-w-[200px]"
      style={{ left: menuX, top: menuY }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => { item.action(); onClose() }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink hover:bg-paper transition-colors cursor-pointer text-left"
        >
          <item.icon className="h-3.5 w-3.5 text-muted shrink-0" />
          {item.label}
        </button>
      ))}
      <div className="h-px bg-border my-1" />
      {deleting ? (
        <div className="px-3 py-2 space-y-2">
          <p className="text-xs text-muted">Are you sure? This cannot be undone.</p>
          <div className="flex gap-2">
            <button
              onClick={() => { onDelete(resume._id); onClose() }}
              className="flex-1 px-2 py-1 text-[10px] font-medium text-white bg-danger rounded-md hover:bg-danger transition-colors cursor-pointer"
            >
              Confirm
            </button>
            <button
              onClick={() => setDeleting(false)}
              className="flex-1 px-2 py-1 text-[10px] font-medium text-muted bg-paper rounded-md hover:text-ink transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setDeleting(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-danger hover:bg-danger-light transition-colors cursor-pointer"
        >
          <IconTrash className="h-3.5 w-3.5 shrink-0" />
          Delete
        </button>
      )}
    </div>
  )
}

// ---- Mobile Context Sheet ----

function MobileContextSheet({ resume, onClose, onNavigate, onDelete, onAnalyze, onDuplicate }: {
  resume: Resume
  onClose: () => void
  onNavigate: (path: string) => void
  onDelete: (id: string) => void
  onAnalyze: (id: string) => void
  onDuplicate: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const isAnalysed = (resume.quality?.overallQuality ?? 0) > 0

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const items: { icon: typeof IconFileText; label: string; action: () => void }[] = [
    { icon: IconFilePencil, label: 'Edit', action: () => onNavigate(`/resume/${resume._id}`) },
    ...(isAnalysed ? [{ icon: IconEye as typeof IconFileText, label: 'View review', action: () => onNavigate(`/resume/${resume._id}/review`) }] : []),
    { icon: IconChartBar, label: 'Run ATS check', action: () => onNavigate(`/ats?resume=${resume._id}`) },
    { icon: IconFileText, label: 'Generate cover letter', action: () => onNavigate(`/cover-letter/new?resume=${resume._id}`) },
    { icon: IconDownload, label: 'Export PDF', action: () => onNavigate(`/export/${resume._id}`) },
    { icon: IconCopy, label: 'Duplicate', action: () => onDuplicate(resume._id) },
    ...(isAnalysed ? [{ icon: IconRefresh as typeof IconFileText, label: 'Re-analyse', action: () => onAnalyze(resume._id) }] : []),
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/20" />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full bg-white rounded-t-xl border border-border shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center pt-3 pb-1">
          <div className="w-8 h-1 rounded-full bg-border" />
        </div>
        <div className="px-4 pb-2 pt-1">
          <p className="text-sm font-medium text-ink truncate">{resumeTitle(resume)}</p>
          <p className="text-xs text-muted mt-0.5">{resumeSubtitle(resume)}</p>
        </div>
        <div className="h-px bg-border mx-4" />
        <div className="py-1">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => { item.action(); onClose() }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ink hover:bg-paper transition-colors cursor-pointer"
            >
              <item.icon className="h-4 w-4 text-muted shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
        <div className="h-px bg-border mx-4" />
        <div className="py-1 px-4">
          {deleting ? (
            <div className="py-3 space-y-2">
              <p className="text-xs text-muted">Are you sure? This cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { onDelete(resume._id); onClose() }}
                  className="flex-1 py-2 text-xs font-medium text-white bg-danger rounded-md cursor-pointer"
                >
                  Confirm delete
                </button>
                <button
                  onClick={() => setDeleting(false)}
                  className="flex-1 py-2 text-xs font-medium text-muted bg-paper rounded-md cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setDeleting(true)}
              className="w-full flex items-center gap-3 py-3 text-sm text-danger hover:bg-danger-light transition-colors cursor-pointer"
            >
              <IconTrash className="h-4 w-4 shrink-0" />
              Delete
            </button>
          )}
        </div>
        <div className="px-4 pb-6 pt-1">
          <button
            onClick={onClose}
            className="w-full py-3 text-sm font-medium text-muted bg-paper rounded-lg hover:text-ink transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ---- Resume Card ----

function ResumeCard({
  resume,
  onContextMenu,
  onAnalyze,
  onDelete,
  onNavigate,
  isNew,
  isAnalysing,
}: {
  resume: Resume
  onContextMenu: (e: React.MouseEvent, resume: Resume) => void
  onAnalyze: (id: string) => void
  onDelete: (id: string) => void
  onNavigate: (path: string) => void
  isNew: boolean
  isAnalysing: boolean
}) {
  const status = isAnalysing
    ? { label: 'Analysing...', dot: 'bg-amber', bg: 'bg-amber-light', text: 'text-amber', key: 'pending' as const }
    : getStatus(resume)
  const score = resume.quality?.overallQuality ?? 0
  const isAnalysed = score > 0
  const redFlagCount = resume.redFlags?.length ?? 0
  const weakBullets = resume.experience?.filter(e => e.bullets.length < 2).length ?? 0
  const hasFlags = redFlagCount > 0 || weakBullets > 0

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, scale: 0.95 } : { opacity: 0, y: 12 }}
      animate={isNew ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0 }}
      transition={isNew ? { duration: 0.3 } : { duration: 0.3, ease: 'easeOut' }}
      className={`bg-white border border-border rounded-xl cursor-pointer hover:border-teal hover:shadow-[0_2px_12px_rgba(15,110,86,0.08)] transition-all duration-150 hover:-translate-y-0.5 overflow-hidden ${isNew ? 'ring-1 ring-teal/30' : ''}`}
      onClick={() => onNavigate(`/resume/${resume._id}`)}
    >
      {/* Preview zone */}
      <div className="relative h-[140px] bg-paper flex items-center justify-center overflow-hidden group">
        <CardThumbnail statusKey={status.key} />

        {/* Status pill */}
        <div className={`absolute top-2 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full ${status.bg}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot} ${status.key === 'pending' ? 'animate-pulse' : ''}`} />
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${status.text}`}>{status.label}</span>
        </div>

        {/* Score ring for analysed */}
        {isAnalysed && (
          <div className="absolute top-2 right-2.5">
            <svg width={44} height={44} className="-rotate-90">
              <circle cx={22} cy={22} r={18} fill="none" stroke="#E8E4DC" strokeWidth={2.5} />
              <circle
                cx={22} cy={22} r={18}
                fill="none"
                stroke={getScoreRingColor(score)}
                strokeWidth={2.5}
                strokeDasharray={113.1}
                strokeDashoffset={113.1 - (score / 100) * 113.1}
                strokeLinecap="round"
              />
              <text
                x="50%" y="50%"
                textAnchor="middle"
                dominantBaseline="central"
                className="font-display font-bold"
                style={{ fill: getScoreRingColor(score), fontSize: 13 }}
                transform="rotate(90, 22, 22)"
              >
                {Math.round(score)}
              </text>
            </svg>
          </div>
        )}

        {/* Three-dot menu button */}
        <button
          onClick={(e) => { e.stopPropagation(); onContextMenu(e, resume) }}
          className="absolute bottom-2 right-2.5 h-7 w-7 rounded-full bg-white border border-border flex items-center justify-center opacity-100 transition-opacity duration-150 hover:border-teal cursor-pointer"
        >
          <IconDots className="h-3.5 w-3.5 text-muted" />
        </button>
      </div>

      {/* Info zone */}
      <div className="p-3 space-y-2">
        <div>
          <p className="text-[13px] font-semibold text-ink truncate leading-tight">{resumeTitle(resume)}</p>
          <p className="text-[11px] text-muted mt-0.5">{resumeSubtitle(resume)}</p>
        </div>

        {/* Flag pills */}
        {hasFlags && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {redFlagCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-danger-light text-danger text-[10px] font-medium leading-none">
                <IconAlertTriangle className="h-2.5 w-2.5" />
                {redFlagCount} {redFlagCount === 1 ? 'red flag' : 'red flags'}
              </span>
            )}
            {weakBullets > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-light text-amber text-[10px] font-medium leading-none">
                <IconAlertTriangle className="h-2.5 w-2.5" />
                {weakBullets} weak {weakBullets === 1 ? 'bullet' : 'bullets'}
              </span>
            )}
          </div>
        )}

        {!hasFlags && isAnalysed && (
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success-light text-success text-[10px] font-medium leading-none">
              <IconCircleCheck className="h-2.5 w-2.5" />
              Strong
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-0.5">
          {isAnalysed ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onNavigate(`/resume/${resume._id}`) }}
                className="flex-1 px-2 py-1 text-[10px] font-medium text-teal bg-teal-light rounded-md hover:bg-teal transition-colors hover:text-white cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onNavigate(`/resume/${resume._id}/review`) }}
                className="flex-1 px-2 py-1 text-[10px] font-medium text-muted bg-transparent border border-border rounded-md hover:border-teal hover:text-teal transition-colors cursor-pointer"
              >
                Review
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onNavigate(`/ats?resume=${resume._id}`) }}
                className="flex-1 px-2 py-1 text-[10px] font-medium text-muted bg-transparent border border-border rounded-md hover:border-teal hover:text-teal transition-colors cursor-pointer"
              >
                ATS
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onNavigate(`/export/${resume._id}`) }}
                className="flex-1 px-2 py-1 text-[10px] font-medium text-muted bg-transparent border border-border rounded-md hover:border-teal hover:text-teal transition-colors cursor-pointer"
              >
                Export
              </button>
            </>
          ) : resume.rawText ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onAnalyze(resume._id) }}
                className="flex-[2] px-2 py-1 text-[10px] font-medium text-teal bg-teal-light rounded-md hover:bg-teal hover:text-white transition-colors cursor-pointer"
              >
                Analyse now
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onNavigate(`/resume/${resume._id}`) }}
                className="flex-1 px-2 py-1 text-[10px] font-medium text-muted bg-transparent border border-border rounded-md hover:border-teal hover:text-teal transition-colors cursor-pointer"
              >
                Edit
              </button>
            </>
          ) : (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onNavigate(`/resume/${resume._id}`) }}
                className="flex-1 px-2 py-1 text-[10px] font-medium text-teal bg-teal-light rounded-md hover:bg-teal hover:text-white transition-colors cursor-pointer"
              >
                Continue editing
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(resume._id) }}
                className="flex-1 px-2 py-1 text-[10px] font-medium text-muted bg-transparent border border-border rounded-md hover:border-danger hover:text-danger transition-colors cursor-pointer"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ---- Collapsible Upload Zone ----

function CollapsibleUpload({ onFile, onClose }: { onFile: (file: File) => void; onClose: () => void }) {
  const [dragOver, setDragOver] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [step, setStep] = useState(0)
  const steps = ['File received', 'Parsing content', 'Almost done']

  const handleFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) return
    setProcessing(true)
    const stepInterval = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 600)
    try {
      await onFile(file)
    } finally {
      clearInterval(stepInterval)
      setProcessing(false)
    }
  }

  if (processing) {
    return (
      <div className="w-full bg-white border border-teal/40 rounded-xl p-8 flex flex-col items-center justify-center gap-4">
        <span className="font-display text-teal text-5xl" style={{ animation: 'blink 1.5s ease-in-out infinite' }}>&amp;</span>
        <div className="space-y-2 text-center">
          {steps.map((s, i) => (
            <p key={s} className={`text-sm transition-colors ${i === step ? 'text-teal font-medium' : i < step ? 'text-muted' : 'text-muted/40'}`}>
              {i < step ? '✓' : i === step ? '●' : '○'} {s}
            </p>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="overflow-hidden"
    >
      <div
        className={`w-full border-2 border-dashed rounded-xl p-8 transition-all duration-150 relative ${dragOver ? 'border-teal bg-teal-light/30' : 'border-border bg-white'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          className="absolute top-3 right-3 h-6 w-6 rounded-full bg-paper flex items-center justify-center text-muted hover:text-ink hover:bg-border transition-colors cursor-pointer"
        >
          <IconX className="h-3.5 w-3.5" />
        </button>

        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-teal-light flex items-center justify-center">
            <IconUpload className="h-5 w-5 text-teal" />
          </div>
          <div className="text-center">
            <p className="text-[15px] font-semibold text-ink">Drop your PDF or DOCX here</p>
            <p className="text-[13px] text-muted mt-0.5">or click to browse</p>
          </div>
          <label className="px-4 py-1.5 text-xs font-medium text-white bg-teal rounded-md hover:bg-teal-dark transition-colors cursor-pointer">
            Choose file
            <input
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
          </label>
          <p className="text-[11px] text-muted-light">PDF or DOCX · Max 15MB</p>
        </div>
      </div>
    </motion.div>
  )
}

// ---- Skeleton Card ----

function SkeletonCard() {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="h-[140px] bg-paper/80 flex items-center justify-center">
        <div className="w-[72px] h-[52px] bg-border/40 rounded" />
      </div>
      <div className="p-3 space-y-2">
        <div className="h-3.5 w-3/4 bg-border/50 rounded" />
        <div className="h-2.5 w-1/2 bg-border/40 rounded" />
        <div className="flex gap-2 pt-1">
          <div className="h-6 flex-1 bg-border/40 rounded-md" />
          <div className="h-6 flex-1 bg-border/40 rounded-md" />
          <div className="h-6 flex-1 bg-border/40 rounded-md" />
        </div>
      </div>
    </div>
  )
}

// ---- Main Page ----

export default function ResumeBuilder() {
  const navigate = useNavigate()
  const { data: resumes, isLoading } = useResumes()
  const { deleteResume, analyzeResume, uploadResume, createResume, qc } = useResumeOperations()

  const [uploadOpen, setUploadOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [sortBy, setSortBy] = useState<SortKey>('updatedAt')
  const [contextMenu, setContextMenu] = useState<{ resume: Resume; x: number; y: number } | null>(null)
  const [mobileSheet, setMobileSheet] = useState<Resume | null>(null)
  const [, setDeletingIds] = useState<Set<string>>(new Set())
  const [analysingIds, setAnalysingIds] = useState<Set<string>>(new Set())
  const [newResumeId, setNewResumeId] = useState<string | null>(null)

  const hasResumes = resumes && resumes.length > 0

  // Collapse upload zone when user has resumes and it's first load
  useEffect(() => {
    if (hasResumes) setUploadOpen(false)
  }, [hasResumes])

  // Filter and sort resumes
  const filteredResumes = useMemo(() => {
    if (!resumes) return []
    let list = [...resumes]

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((r) => resumeTitle(r).toLowerCase().includes(q))
    }

    // Filter pills
    if (activeFilter === 'attention') {
      list = list.filter((r) => {
        const score = r.quality?.overallQuality ?? 0
        return score < 50 || (r.redFlags?.length ?? 0) > 0
      })
    } else if (activeFilter === 'strong') {
      list = list.filter((r) => (r.quality?.overallQuality ?? 0) >= 75)
    }

    // Sort
    list.sort((a, b) => {
      switch (sortBy) {
        case 'updatedAt': return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'createdAt': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'score-desc': return (b.quality?.overallQuality ?? 0) - (a.quality?.overallQuality ?? 0)
        case 'score-asc': return (a.quality?.overallQuality ?? 0) - (b.quality?.overallQuality ?? 0)
        case 'alpha': return resumeTitle(a).localeCompare(resumeTitle(b))
        default: return 0
      }
    })

    return list
  }, [resumes, searchQuery, activeFilter, sortBy])

  // Stats
  const stats = useMemo(() => {
    if (!resumes) return { total: 0, analysed: 0, pending: 0, attention: 0 }
    const total = resumes.length
    const analysed = resumes.filter((r) => (r.quality?.overallQuality ?? 0) > 0).length
    const pending = resumes.filter((r) => !r.quality?.overallQuality && r.rawText).length
    const attention = resumes.filter((r) => {
      const score = r.quality?.overallQuality ?? 0
      return (score < 50 || (r.redFlags?.length ?? 0) > 0) && score > 0
    }).length
    return { total, analysed, pending, attention }
  }, [resumes])

  const handleUpload = useCallback(async (file: File) => {
    try {
      const result = await uploadResume.mutateAsync(file)
      navigate(`/resume/${result._id}`)
    } catch (err) {
      console.error('Upload failed', err)
    }
  }, [uploadResume, navigate])

  const handleAnalyze = useCallback(async (id: string) => {
    setAnalysingIds((prev) => new Set(prev).add(id))
    try {
      await analyzeResume.mutateAsync(id)
    } catch (err) {
      console.error('Analysis failed', err)
    } finally {
      setAnalysingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [analyzeResume])

  const handleDelete = useCallback(async (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id))
    setContextMenu(null)
    setMobileSheet(null)
    try {
      await deleteResume.mutateAsync(id)
    } catch (err) {
      console.error('Delete failed', err)
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [deleteResume])

  const handleDuplicate = useCallback(async (id: string) => {
    try {
      const { data } = await api.post(`/resumes/${id}/duplicate`)
      const result = data.data || data
      if (result._id) {
        qc.invalidateQueries({ queryKey: ['resumes'] })
        setNewResumeId(result._id)
        setTimeout(() => setNewResumeId(null), 2500)
      }
    } catch {
      const result = await createResume.mutateAsync()
      navigate(`/resume/${result._id}`)
    }
  }, [createResume, navigate, qc])

  const handleNavigate = useCallback((path: string) => {
    navigate(path)
  }, [navigate])

  const handleContextMenu = useCallback((e: React.MouseEvent, resume: Resume) => {
    e.stopPropagation()
    if (window.innerWidth < 640) {
      setMobileSheet(resume)
      return
    }
    setContextMenu({ resume, x: e.clientX, y: e.clientY })
  }, [])

  const handleClearSearch = () => setSearchQuery('')
  const handleClearFilter = () => setActiveFilter('all')

  const showNoResumesEmpty = !isLoading && !hasResumes
  const showFilteredEmpty = hasResumes && filteredResumes.length === 0

  return (
    <div className="page-container">
      {/* ---- Page Header ---- */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-h3 font-bold text-ink tracking-tight leading-none">Resumes</h1>
          {hasResumes && (
            <span className="text-sm text-muted font-normal">({resumes.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setUploadOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted bg-transparent border border-border rounded-md hover:border-teal hover:text-teal transition-colors cursor-pointer"
          >
            <IconUpload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </button>
          <button
            onClick={() => createResume.mutateAsync().then((r) => navigate(`/resume/${r._id}`))}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal rounded-md hover:bg-teal-dark transition-colors cursor-pointer"
          >
            <IconPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </div>

      {/* ---- Stats Bar ---- */}
      {hasResumes && (
        <div className="text-[13px] text-muted leading-none mb-4 pb-4 border-b border-border">
          <span>{stats.total} total</span>
          <span className="mx-2 text-border">·</span>
          <span>{stats.analysed} analysed</span>
          <span className="mx-2 text-border">·</span>
          <span className={stats.pending > 0 ? 'text-amber' : ''}>{stats.pending} pending</span>
          {stats.attention > 0 && (
            <>
              <span className="mx-2 text-border">·</span>
              <span className="text-amber">{stats.attention} need{stats.attention === 1 ? 's' : ''} attention</span>
            </>
          )}
          {stats.pending === 0 && stats.analysed === stats.total && stats.total > 0 && stats.attention === 0 && (
            <>
              <span className="mx-2 text-border">·</span>
              <span className="text-teal font-medium">all clear</span>
            </>
          )}
        </div>
      )}

      {/* ---- Filter/Sort Toolbar ---- */}
      {hasResumes && (
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-[240px]">
            <IconSearch className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-light pointer-events-none" />
            <input
              type="text"
              placeholder="Search resumes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-5 pr-6 py-1.5 text-xs text-ink bg-transparent border-b border-border focus:border-teal outline-none transition-colors placeholder:text-muted-light"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
              >
                <IconX className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1">
            {FILTER_PILLS.map((pill) => (
              <button
                key={pill.value}
                onClick={() => setActiveFilter(pill.value)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                  activeFilter === pill.value
                    ? 'bg-ink text-white'
                    : 'bg-surface text-muted border border-border hover:text-ink'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="text-[11px] text-muted bg-transparent border border-border rounded-md px-2 py-1 outline-none focus:border-teal cursor-pointer appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%237A7A7A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 6px center',
              paddingRight: '22px',
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* ---- Collapsible Upload Zone ---- */}
      <AnimatePresence>
        {(uploadOpen || showNoResumesEmpty) && (
          <div className="mb-6">
            <CollapsibleUpload
              onFile={handleUpload}
              onClose={() => setUploadOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* ---- No Resumes Empty State ---- */}
      {showNoResumesEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="empty-state-icon">&amp;</div>
          <h2 className="font-display text-h4 text-ink mb-2">Your story starts here.</h2>
          <p className="text-sm text-muted mb-6 max-w-xs">
            Upload your resume or build one from scratch to get started.
          </p>
          <button
            onClick={() => createResume.mutateAsync().then((r) => navigate(`/resume/${r._id}`))}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted bg-transparent border border-border rounded-md hover:border-teal hover:text-teal transition-colors cursor-pointer"
          >
            <IconFilePlus className="h-3.5 w-3.5" />
            Build from scratch
          </button>
        </div>
      )}

      {/* ---- Filtered Empty State ---- */}
      {showFilteredEmpty && !showNoResumesEmpty && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <IconSearch className="h-8 w-8 text-border mb-3" />
          {searchQuery ? (
            <>
              <p className="text-sm text-muted">No resumes matching <span className="text-ink font-medium">"{searchQuery}"</span></p>
              <button onClick={handleClearSearch} className="mt-2 text-xs text-teal hover:underline cursor-pointer">Clear search</button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">No resumes match this filter.</p>
              <button onClick={handleClearFilter} className="mt-2 text-xs text-teal hover:underline cursor-pointer">Clear filter</button>
            </>
          )}
        </div>
      )}

      {/* ---- Card Grid ---- */}
      {hasResumes && (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px]"
        >
          {isLoading ? (
            <>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </>
          ) : (
            filteredResumes.map((resume, i) => (
              <motion.div
                key={resume._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.06, 0.5), ease: 'easeOut' }}
              >
                <ResumeCard
                  resume={resume}
                  onContextMenu={handleContextMenu}
                  onAnalyze={handleAnalyze}
                  onDelete={handleDelete}
                  onNavigate={handleNavigate}
                  isNew={newResumeId === resume._id}
                  isAnalysing={analysingIds.has(resume._id)}
                />
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      {/* ---- Context Menu (desktop) ---- */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          resume={contextMenu.resume}
          onClose={() => setContextMenu(null)}
          onNavigate={handleNavigate}
          onDelete={handleDelete}
          onAnalyze={handleAnalyze}
          onDuplicate={handleDuplicate}
        />
      )}

      {/* ---- Context Sheet (mobile) ---- */}
      <AnimatePresence>
        {mobileSheet && (
          <MobileContextSheet
            resume={mobileSheet}
            onClose={() => setMobileSheet(null)}
            onNavigate={handleNavigate}
            onDelete={handleDelete}
            onAnalyze={handleAnalyze}
            onDuplicate={handleDuplicate}
          />
        )}
      </AnimatePresence>
    </div>
  )
}