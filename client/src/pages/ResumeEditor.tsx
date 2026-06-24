import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useResume, useRewriteBullet } from '../lib/queries'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'
import TemplatePicker from '../components/TemplatePicker'
import ColorPicker from '../components/ColorPicker'
import { TEMPLATES } from '../templates'
import type { ResumeTemplate } from '../templates/types'
import {
  Save,
  Wand2,
  ChevronLeft,
  Download,
  Plus,
  X,
  AlertTriangle,
  Eye,
  ZoomIn,
  ZoomOut,
  CheckCircle,
  RefreshCw,
  Edit3,
  Loader2,
} from 'lucide-react'

type Tab = 'Summary' | 'Experience' | 'Education' | 'Skills' | 'Certifications' | 'Languages'

const TABS: Tab[] = ['Summary', 'Experience', 'Education', 'Skills', 'Certifications', 'Languages']

function getSectionKey(tab: Tab): string {
  return tab === 'Certifications' ? 'certifications' : tab === 'Languages' ? 'languages' : tab.toLowerCase()
}

function hasRedFlagsForSection(redFlags: Resume['redFlags'], tab: Tab): boolean {
  const key = getSectionKey(tab)
  return (redFlags || []).some((rf) => rf.section?.toLowerCase() === key)
}

function getRedFlagsForSection(redFlags: Resume['redFlags'], tab: Tab) {
  const key = getSectionKey(tab)
  return (redFlags || []).filter((rf) => rf.section?.toLowerCase() === key)
}

function hasBulletFlag(redFlags: Resume['redFlags'], text: string): boolean {
  return (redFlags || []).some(
    (rf) => rf.section?.toLowerCase() === 'experience' && text.length > 0 && rf.message.toLowerCase().includes(text.toLowerCase().slice(0, 20)),
  )
}

function ResumeSectionSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="flex gap-2 border-b border-border pb-3">
        {TABS.map((t) => (
          <div key={t} className="h-8 w-20 bg-border/40 rounded" />
        ))}
      </div>
      <div className="h-4 w-24 bg-border/30 rounded" />
      <div className="h-32 bg-border/20 rounded-lg" />
      <div className="h-24 bg-border/20 rounded-lg" />
    </div>
  )
}

function PreviewSkeleton() {
  return (
    <div className="animate-pulse flex-1 bg-paper/50 p-8 flex justify-center">
      <div className="w-[210mm] min-h-[297mm] bg-white shadow-lg rounded-sm p-10 space-y-5">
        <div className="text-center space-y-2">
          <div className="h-7 w-48 bg-border/30 rounded mx-auto" />
          <div className="h-3 w-32 bg-border/20 rounded mx-auto" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-16 bg-border/30 rounded" />
          <div className="h-3 w-full bg-border/20 rounded" />
          <div className="h-3 w-5/6 bg-border/20 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-20 bg-border/30 rounded" />
          <div className="h-3 w-full bg-border/20 rounded" />
          <div className="h-3 w-3/4 bg-border/20 rounded" />
          <div className="h-3 w-2/3 bg-border/20 rounded" />
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col h-screen bg-paper">
      <div className="h-14 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0">
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-4 w-4 bg-border/40 rounded" />
          <div>
            <div className="h-3 w-36 bg-border/40 rounded mb-1" />
            <div className="h-4 w-24 bg-border/30 rounded" />
          </div>
        </div>
        <div className="animate-pulse flex items-center gap-2">
          <div className="h-8 w-16 bg-border/30 rounded-lg" />
          <div className="h-8 w-16 bg-border/30 rounded-lg" />
          <div className="h-8 w-20 bg-border/40 rounded-lg" />
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[380px] shrink-0 border-r border-border/50 flex flex-col">
          <ResumeSectionSkeleton />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-12 bg-surface border-b border-border shrink-0 animate-pulse flex items-center px-6 gap-2">
            <div className="h-6 w-20 bg-border/30 rounded" />
            <div className="h-6 w-20 bg-border/30 rounded" />
            <div className="h-6 w-24 bg-border/30 rounded" />
          </div>
          <PreviewSkeleton />
        </div>
      </div>
    </div>
  )
}

interface Resume {
  _id: string
  title: string
  name?: string
  summary?: string
  contact?: { email?: string; phone?: string; location?: string }
  experience?: Array<{
    company: string
    title: string
    startDate?: string
    endDate?: string
    current?: boolean
    bullets: string[]
  }>
  education?: Array<{
    institution: string
    degree: string
    field?: string
  }>
  skills?: string[]
  certifications?: Array<{ name: string; issuer?: string }>
  languages?: string[]
  redFlags?: Array<{ message: string; severity: 'low' | 'medium' | 'high'; section: string }>
  quality?: { overallQuality: number; strengths: string[]; issues: string[]; suggestions: string[] }
}

function MinimalTemplate({ resume, localData, primaryColor }: { resume: Resume; localData: LocalData; redFlags: Resume['redFlags']; primaryColor?: string }) {
  const hasIssue = (text?: string) => text && (resume.redFlags || []).some((rf) => rf.message.includes(text || ''))
  return (
    <div className="font-sans text-[11px] leading-relaxed text-ink">
      <div className="text-center mb-6">
        <h1 className="font-display text-[22px] font-bold text-ink mb-1">
          {localData.name || resume.name || 'Your Name'}
        </h1>
        <p className="text-[10px] text-muted">
          {localData.contact?.email || resume.contact?.email || ''}
          {localData.contact?.phone || resume.contact?.phone ? ` | ${localData.contact?.phone || resume.contact?.phone || ''}` : ''}
          {localData.contact?.location || resume.contact?.location ? ` | ${localData.contact?.location || resume.contact?.location || ''}` : ''}
        </p>
      </div>

      {(localData.summary || resume.summary) && (
        <div className={cn('mb-5', hasIssue('summary') && 'border-l-2 border-amber pl-3 bg-amber/5')}>
          <h2 className="font-display text-[13px] font-semibold text-ink uppercase tracking-wider mb-1.5">Summary</h2>
          <p className="text-[11px] text-muted leading-relaxed">{localData.summary || resume.summary}</p>
        </div>
      )}

      {(localData.experience && localData.experience.length > 0 ? localData.experience : resume.experience || []).length > 0 && (
        <div className="mb-5">
          <h2 className="font-display text-[13px] font-semibold text-ink uppercase tracking-wider mb-2">Experience</h2>
          <div className="space-y-3">
            {((localData.experience && localData.experience.length > 0 ? localData.experience : resume.experience || [])).map((exp, i) => (
              <div key={i} className={cn(exp.bullets?.some((b: string) => hasBulletFlag(resume.redFlags, b)) && 'border-l-2 border-amber pl-3 bg-amber/5')}>
                <div className="flex items-start justify-between mb-0.5">
                  <div>
                    <p className="text-[12px] font-semibold text-ink">{exp.title}</p>
                    <p className="text-[10px] text-muted">{exp.company}</p>
                  </div>
                  <p className="text-[9px] text-muted whitespace-nowrap ml-2">
                    {exp.startDate || ''}{exp.startDate && exp.endDate ? ' — ' : ''}{exp.current ? 'Present' : exp.endDate || ''}
                  </p>
                </div>
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {exp.bullets.filter((b: any) => typeof b === 'string').map((b: string, j: number) => (
                      <li key={j} className="flex items-start gap-1.5 text-[11px] text-muted">
                        <span className="text-muted mt-0.5">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(localData.education && localData.education.length > 0 ? localData.education : resume.education || []).length > 0 && (
        <div className="mb-5">
          <h2 className="font-display text-[13px] font-semibold text-ink uppercase tracking-wider mb-2">Education</h2>
          <div className="space-y-2">
            {((localData.education && localData.education.length > 0 ? localData.education : resume.education || [])).map((edu, i) => (
              <div key={i}>
                <p className="text-[12px] font-semibold text-ink">{edu.institution}</p>
                <p className="text-[10px] text-muted">{edu.degree}{edu.field ? ` — ${edu.field}` : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(localData.skills && localData.skills.length > 0 ? localData.skills : resume.skills || []).length > 0 && (
        <div className="mb-5">
          <h2 className="font-display text-[13px] font-semibold text-ink uppercase tracking-wider mb-1.5">Skills</h2>
          <div className="flex flex-wrap gap-1">
            {(localData.skills && localData.skills.length > 0 ? localData.skills : resume.skills || []).filter(Boolean).map((s, i) => (
              <span key={i} className="text-[10px] bg-paper px-2 py-0.5 rounded text-muted">{s}</span>
            ))}
          </div>
        </div>
      )}

      {(localData.certifications && localData.certifications.length > 0 ? localData.certifications : resume.certifications || []).length > 0 && (
        <div className="mb-5">
          <h2 className="font-display text-[13px] font-semibold text-ink uppercase tracking-wider mb-1.5">Certifications</h2>
          <div className="space-y-1">
            {((localData.certifications && localData.certifications.length > 0 ? localData.certifications : resume.certifications || [])).map((c, i) => (
              <p key={i} className="text-[11px]">
                <span className="font-medium text-ink">{c.name}</span>
                {c.issuer ? <span className="text-muted"> — {c.issuer}</span> : null}
              </p>
            ))}
          </div>
        </div>
      )}

      {(localData.languages && localData.languages.length > 0 ? localData.languages : resume.languages || []).length > 0 && (
        <div>
          <h2 className="font-display text-[13px] font-semibold text-ink uppercase tracking-wider mb-1.5">Languages</h2>
          <div className="flex flex-wrap gap-1.5">
            {(localData.languages && localData.languages.length > 0 ? localData.languages : resume.languages || []).filter(Boolean).map((l, i) => (
              <span key={i} className="text-[11px] text-muted">{l}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ModernTemplate({ resume, localData, primaryColor }: { resume: Resume; localData: LocalData; redFlags: Resume['redFlags']; primaryColor?: string }) {
  return (
    <div className="flex text-[11px] leading-relaxed h-full">
      <div className="w-[90px] min-h-full p-4 shrink-0" style={{ backgroundColor: primaryColor || '#0F6E56' }}>
        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-full bg-white/20 mx-auto mb-2" />
          <h1 className="font-display text-[14px] font-bold text-white leading-tight">
            {localData.name || resume.name || 'Your Name'}
          </h1>
        </div>
        <div className="space-y-3 text-white/80 text-[9px]">
          {localData.contact?.email || resume.contact?.email ? (
            <p className="break-words">{localData.contact?.email || resume.contact?.email}</p>
          ) : null}
          {localData.contact?.phone || resume.contact?.phone ? (
            <p>{localData.contact?.phone || resume.contact?.phone}</p>
          ) : null}
          {localData.contact?.location || resume.contact?.location ? (
            <p>{localData.contact?.location || resume.contact?.location}</p>
          ) : null}
        </div>
        {(localData.skills && localData.skills.length > 0 ? localData.skills : resume.skills || []).length > 0 && (
          <div className="mt-4">
            <h2 className="text-[9px] font-semibold uppercase tracking-wider text-white/60 mb-1.5">Skills</h2>
            <div className="flex flex-wrap gap-1">
              {(localData.skills && localData.skills.length > 0 ? localData.skills : resume.skills || []).filter(Boolean).map((s, i) => (
                <span key={i} className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded text-white/80">{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 p-5 space-y-4">
        {(localData.summary || resume.summary) && (
          <div>
            <h2 className="font-display text-[12px] font-semibold uppercase tracking-wider mb-1" style={{ color: primaryColor || '#0F6E56' }}>Summary</h2>
            <p className="text-[10px] text-muted leading-relaxed">{localData.summary || resume.summary}</p>
          </div>
        )}
        {(localData.experience && localData.experience.length > 0 ? localData.experience : resume.experience || []).length > 0 && (
          <div>
            <h2 className="font-display text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: primaryColor || '#0F6E56' }}>Experience</h2>
            {((localData.experience && localData.experience.length > 0 ? localData.experience : resume.experience || [])).map((exp, i) => (
              <div key={i} className="mb-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-ink">{exp.title}</p>
                    <p className="text-[9px] text-muted">{exp.company}</p>
                  </div>
                  <p className="text-[8px] text-muted whitespace-nowrap">
                    {exp.startDate || ''}{exp.startDate && exp.endDate ? ' — ' : ''}{exp.current ? 'Present' : exp.endDate || ''}
                  </p>
                </div>
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {exp.bullets.filter((b: any) => typeof b === 'string').map((b: string, j: number) => (
                      <li key={j} className="flex items-start gap-1 text-[9px] text-muted">
                        <span className="mt-0.5">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
        {(localData.education && localData.education.length > 0 ? localData.education : resume.education || []).length > 0 && (
          <div>
            <h2 className="font-display text-[12px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: primaryColor || '#0F6E56' }}>Education</h2>
            {((localData.education && localData.education.length > 0 ? localData.education : resume.education || [])).map((edu, i) => (
              <div key={i}>
                <p className="text-[11px] font-semibold text-ink">{edu.institution}</p>
                <p className="text-[9px] text-muted">{edu.degree}{edu.field ? ` — ${edu.field}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ExecutiveTemplate({ resume, localData, primaryColor }: { resume: Resume; localData: LocalData; redFlags: Resume['redFlags']; primaryColor?: string }) {
  return (
    <div className="font-serif text-[11px] leading-relaxed">
      <div className="bg-ink text-white text-center py-6 px-8 -mx-10 -mt-10 mb-6">
        <h1 className="font-serif text-[24px] font-bold tracking-wide mb-1">
          {localData.name || resume.name || 'Your Name'}
        </h1>
        <p className="text-[10px] text-white/70">
          {localData.contact?.email || resume.contact?.email || ''}
          {localData.contact?.phone || resume.contact?.phone ? ` | ${localData.contact?.phone || resume.contact?.phone || ''}` : ''}
          {localData.contact?.location || resume.contact?.location ? ` | ${localData.contact?.location || resume.contact?.location || ''}` : ''}
        </p>
      </div>

      {(localData.summary || resume.summary) && (
        <div className="mb-5">
          <h2 className="font-serif text-[14px] font-bold text-ink uppercase tracking-wider mb-1.5 border-b border-border pb-1">Summary</h2>
          <p className="text-[11px] text-muted leading-relaxed mt-2">{localData.summary || resume.summary}</p>
        </div>
      )}

      {(localData.experience && localData.experience.length > 0 ? localData.experience : resume.experience || []).length > 0 && (
        <div className="mb-5">
          <h2 className="font-serif text-[14px] font-bold text-ink uppercase tracking-wider mb-2 border-b border-border pb-1">Professional Experience</h2>
          {((localData.experience && localData.experience.length > 0 ? localData.experience : resume.experience || [])).map((exp, i) => (
            <div key={i} className="mt-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-bold text-ink">{exp.title}</p>
                  <p className="text-[10px] text-muted italic">{exp.company}</p>
                </div>
                <p className="text-[9px] text-muted whitespace-nowrap">
                  {exp.startDate || ''}{exp.startDate && exp.endDate ? ' — ' : ''}{exp.current ? 'Present' : exp.endDate || ''}
                </p>
              </div>
              {exp.bullets && exp.bullets.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {exp.bullets.filter((b: any) => typeof b === 'string').map((b: string, j: number) => (
                    <li key={j} className="flex items-start gap-1.5 text-[11px] text-muted">
                      <span className="text-ink mt-0.5">—</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {(localData.education && localData.education.length > 0 ? localData.education : resume.education || []).length > 0 && (
        <div className="mb-5">
          <h2 className="font-serif text-[14px] font-bold text-ink uppercase tracking-wider mb-2 border-b border-border pb-1">Education</h2>
          {((localData.education && localData.education.length > 0 ? localData.education : resume.education || [])).map((edu, i) => (
            <div key={i} className="mt-2">
              <p className="text-[12px] font-bold text-ink">{edu.institution}</p>
              <p className="text-[10px] text-muted">{edu.degree}{edu.field ? ` — ${edu.field}` : ''}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mt-4">
        {(localData.skills && localData.skills.length > 0 ? localData.skills : resume.skills || []).length > 0 && (
          <div>
            <h2 className="font-serif text-[12px] font-bold text-ink uppercase tracking-wider mb-1.5">Skills</h2>
            <div className="flex flex-wrap gap-1">
              {(localData.skills && localData.skills.length > 0 ? localData.skills : resume.skills || []).filter(Boolean).map((s, i) => (
                <span key={i} className="text-[10px] bg-paper px-1.5 py-0.5 rounded text-muted">{s}</span>
              ))}
            </div>
          </div>
        )}
        {(localData.certifications && localData.certifications.length > 0 ? localData.certifications : resume.certifications || []).length > 0 && (
          <div>
            <h2 className="font-serif text-[12px] font-bold text-ink uppercase tracking-wider mb-1.5">Certifications</h2>
            {((localData.certifications && localData.certifications.length > 0 ? localData.certifications : resume.certifications || [])).map((c, i) => (
              <p key={i} className="text-[10px] text-muted">{c.name}{c.issuer ? ` — ${c.issuer}` : ''}</p>
            ))}
          </div>
        )}
      </div>

      {(localData.languages && localData.languages.length > 0 ? localData.languages : resume.languages || []).length > 0 && (
        <div className="mt-4">
          <h2 className="font-serif text-[12px] font-bold text-ink uppercase tracking-wider mb-1.5">Languages</h2>
          <p className="text-[11px] text-muted">
            {(localData.languages && localData.languages.length > 0 ? localData.languages : resume.languages || []).filter(Boolean).join('  ·  ')}
          </p>
        </div>
      )}
    </div>
  )
}

interface LocalData {
  title: string
  name: string
  summary: string
  contact: { email: string; phone: string; location: string }
  experience: Array<{
    company: string
    title: string
    startDate: string
    endDate: string
    current: boolean
    bullets: string[]
  }>
  education: Array<{
    institution: string
    degree: string
    field: string
  }>
  skills: string[]
  certifications: Array<{ name: string; issuer: string }>
  languages: string[]
}

function makeLocalData(resume?: Resume): LocalData {
  return {
    title: resume?.title || '',
    name: resume?.name || '',
    summary: resume?.summary || '',
    contact: {
      email: resume?.contact?.email || '',
      phone: resume?.contact?.phone || '',
      location: resume?.contact?.location || '',
    },
    experience: (resume?.experience || []).map((e) => ({
      company: e.company || '',
      title: e.title || '',
      startDate: e.startDate || '',
      endDate: e.endDate || '',
      current: e.current || false,
      bullets: e.bullets || [''],
    })),
    education: (resume?.education || []).map((e) => ({
      institution: e.institution || '',
      degree: e.degree || '',
      field: e.field || '',
    })),
    skills: resume?.skills || [],
    certifications: (resume?.certifications || []).map((c) => ({
      name: c.name || '',
      issuer: c.issuer || '',
    })),
    languages: resume?.languages || [],
  }
}

export default function ResumeEditor() {
  const { id } = useParams<{ id: string }>()
  const { data: resume, isLoading } = useResume(id!)
  const [activeTab, setActiveTab] = useState<Tab>('Summary')
  const [saved, setSaved] = useState(true)
  const [template, setTemplate] = useState<ResumeTemplate>(TEMPLATES[0])
  const [colorTheme, setColorTheme] = useState('#0F6E56')
  const [zoom, setZoom] = useState(1)
  const [expandedJobs, setExpandedJobs] = useState<Set<number>>(new Set([0]))
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [aiDrawerBullet, setAiDrawerBullet] = useState<{ jobIdx: number; bulletIdx: number } | null>(null)
  const [aiRewrites, setAiRewrites] = useState<string[]>([])
  const [aiRewritesLoading, setAiRewritesLoading] = useState(false)
  const rewriteBullet = useRewriteBullet()
  const [mobilePanel, setMobilePanel] = useState<'edit' | 'preview'>('edit')
  const [localData, setLocalData] = useState<LocalData>(makeLocalData())

  const localRef = useRef(localData)
  localRef.current = localData

  useEffect(() => {
    if (resume) {
      setLocalData(makeLocalData(resume))
      setExpandedJobs(new Set(resume.experience ? [0] : []))
    }
  }, [resume])

  const redFlags: Array<{ message: string; severity: 'low' | 'medium' | 'high'; section?: string }> = resume?.redFlags || []
  const sectionRedFlags = getRedFlagsForSection(redFlags, activeTab)

  useEffect(() => {
    if (!saved) {
      const timer = setTimeout(() => {
        setSaved(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [localData, saved])

  function updateLocal<K extends keyof LocalData>(key: K, value: LocalData[K]) {
    setLocalData((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function updateContact(field: keyof LocalData['contact'], value: string) {
    setLocalData((prev) => ({
      ...prev,
      contact: { ...prev.contact, [field]: value },
    }))
    setSaved(false)
  }

  function updateExperience(index: number, field: string, value: string) {
    setLocalData((prev) => {
      const exp = [...prev.experience]
      exp[index] = { ...exp[index], [field]: value }
      return { ...prev, experience: exp }
    })
    setSaved(false)
  }

  function updateBullet(jobIdx: number, bulletIdx: number, value: string) {
    setLocalData((prev) => {
      const exp = [...prev.experience]
      const bullets = [...exp[jobIdx].bullets]
      bullets[bulletIdx] = value
      exp[jobIdx] = { ...exp[jobIdx], bullets }
      return { ...prev, experience: exp }
    })
    setSaved(false)
  }

  function addBullet(jobIdx: number) {
    setLocalData((prev) => {
      const exp = [...prev.experience]
      exp[jobIdx] = { ...exp[jobIdx], bullets: [...exp[jobIdx].bullets, ''] }
      return { ...prev, experience: exp }
    })
    setSaved(false)
  }

  function addExperience() {
    setLocalData((prev) => {
      const newExp = [
        ...(prev.experience || []),
        { company: '', title: '', startDate: '', endDate: '', current: false, bullets: [''] },
      ]
      return { ...prev, experience: newExp }
    })
    setExpandedJobs((prev) => new Set(prev).add(prev.size))
    setSaved(false)
  }

  function addEducation() {
    setLocalData((prev) => ({
      ...prev,
      education: [...prev.education, { institution: '', degree: '', field: '' }],
    }))
    setSaved(false)
  }

  function updateEducation(index: number, field: string, value: string) {
    setLocalData((prev) => {
      const edu = [...prev.education]
      edu[index] = { ...edu[index], [field]: value }
      return { ...prev, education: edu }
    })
    setSaved(false)
  }

  function addCertification() {
    setLocalData((prev) => ({
      ...prev,
      certifications: [...prev.certifications, { name: '', issuer: '' }],
    }))
    setSaved(false)
  }

  function updateCertification(index: number, field: string, value: string) {
    setLocalData((prev) => {
      const certs = [...prev.certifications]
      certs[index] = { ...certs[index], [field]: value }
      return { ...prev, certifications: certs }
    })
    setSaved(false)
  }

  function removeCertification(index: number) {
    setLocalData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }))
    setSaved(false)
  }

  function addLanguage() {
    setLocalData((prev) => ({
      ...prev,
      languages: [...prev.languages, ''],
    }))
    setSaved(false)
  }

  function updateLanguage(index: number, value: string) {
    setLocalData((prev) => {
      const langs = [...prev.languages]
      langs[index] = value
      return { ...prev, languages: langs }
    })
    setSaved(false)
  }

  function removeLanguage(index: number) {
    setLocalData((prev) => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== index),
    }))
    setSaved(false)
  }

  function handleSkillsChange(value: string) {
    const skills = value.split(',').map((s) => s.trim()).filter(Boolean)
    updateLocal('skills', skills)
  }

  async function openAiDrawer(jobIdx: number, bulletIdx: number) {
    setAiDrawerBullet({ jobIdx, bulletIdx })
    setAiDrawerOpen(true)
    setAiRewritesLoading(true)
    setAiRewrites([])
    const bullet = localData.experience[jobIdx]?.bullets[bulletIdx]
    if (!bullet || !id) return
    try {
      const result = await rewriteBullet.mutateAsync({ resumeId: id, bullet })
      setAiRewrites(result.variations)
    } catch {
      setAiRewrites([
        'AI rewrite unavailable. Please try again later.',
      ])
    } finally {
      setAiRewritesLoading(false)
    }
  }

  function replaceWithAiRewrite(text: string) {
    if (!aiDrawerBullet) return
    updateBullet(aiDrawerBullet.jobIdx, aiDrawerBullet.bulletIdx, text)
    setAiDrawerOpen(false)
    setAiDrawerBullet(null)
  }

  function toggleJobExpanded(index: number) {
    setExpandedJobs((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function hasFlaggedBullets(jobIdx: number): boolean {
    const exp = localData.experience[jobIdx]
    if (!exp) return false
    return exp.bullets.some((b) => b.length > 0 && redFlags.some((rf: { section?: string }) => rf.section?.toLowerCase() === 'experience'))
  }

  const previewData = localData

  function renderPreview() {
    const commonProps = { resume: resume || { _id: id || '', title: '' }, localData: previewData, redFlags, primaryColor: colorTheme }
    switch (template.id) {
      case 'executive':
        return <ExecutiveTemplate {...commonProps} />
      case 'modern':
        return <ModernTemplate {...commonProps} />
      default:
        return <MinimalTemplate {...commonProps} />
    }
  }

  if (isLoading) return <LoadingState />

  return (
    <div className="flex flex-col h-screen bg-paper">
      <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0">
        <div className="min-w-0">
          <nav className="text-[11px] text-muted flex items-center gap-1.5">
            <Link to="/resumes" className="hover:text-ink transition-colors">Resumes</Link>
            <span className="text-muted-light">/</span>
            <span className="text-ink truncate">{resume?.title || 'Untitled'}</span>
          </nav>
          <h1 className="font-display text-[16px] text-ink leading-tight mt-0.5 truncate">Resume Editor</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 mr-2">
            {saved ? (
              <>
                <CheckCircle className="h-3 w-3 text-success" />
                <span className="text-[11px] text-success font-medium">Saved</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 text-muted animate-spin" />
                <span className="text-[11px] text-muted">Saving...</span>
              </>
            )}
          </div>
          <Link to={`/resume/${id}/review`}>
            <Button variant="ghost" size="sm">Review</Button>
          </Link>
          <Link to="/ats">
            <Button variant="ghost" size="sm">ATS Check</Button>
          </Link>
          <Link to={`/export/${id}`}>
            <Button variant="primary" size="sm">
              <Download className="h-3.5 w-3.5 mr-1" />
              Export
            </Button>
          </Link>
        </div>
      </header>

      <div className="lg:hidden flex items-center border-b border-border bg-surface shrink-0">
        <button
          onClick={() => setMobilePanel('edit')}
          className={cn(
            'flex-1 py-2.5 text-sm font-medium text-center border-b-2 transition-colors cursor-pointer',
            mobilePanel === 'edit' ? 'border-teal text-teal' : 'border-transparent text-muted',
          )}
        >
          <Edit3 className="h-3.5 w-3.5 inline mr-1.5" />
          Edit
        </button>
        <button
          onClick={() => setMobilePanel('preview')}
          className={cn(
            'flex-1 py-2.5 text-sm font-medium text-center border-b-2 transition-colors cursor-pointer',
            mobilePanel === 'preview' ? 'border-teal text-teal' : 'border-transparent text-muted',
          )}
        >
          <Eye className="h-3.5 w-3.5 inline mr-1.5" />
          Preview
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={cn(
          'w-[380px] shrink-0 border-r border-border/50 flex flex-col bg-surface',
          mobilePanel === 'preview' && 'hidden lg:flex',
        )}>
          <div className="bg-paper border-b border-border px-4 py-3">
            <div className="pill-group">
              {TABS.map((tab) => {
                const hasFlag = hasRedFlagsForSection(redFlags, tab)
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'pill relative',
                      activeTab === tab ? 'pill-active' : 'pill-inactive',
                    )}
                  >
                    {tab}
                    {hasFlag && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red ring-2 ring-paper" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {sectionRedFlags.length > 0 && (
            <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber/5 border border-amber/20 text-[11px] text-ink">
              <AlertTriangle className="h-3.5 w-3.5 text-amber shrink-0" />
              <span>
                {sectionRedFlags.length} red flag{sectionRedFlags.length > 1 ? 's' : ''} in this section —
              </span>
              <Link to={`/resume/${id}/review`} className="font-bold text-danger hover:underline shrink-0">
                view & fix
              </Link>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'Summary' && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="label-uppercase text-muted block mb-1.5">Professional Summary</label>
                  <textarea
                    className="input-editorial resize-none min-h-[120px]"
                    placeholder="Write a brief summary of your professional background..."
                    value={localData.summary}
                    onChange={(e) => updateLocal('summary', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-uppercase text-muted block mb-1.5">Name</label>
                  <input
                    className="input-editorial"
                    placeholder="Your full name"
                    value={localData.name}
                    onChange={(e) => updateLocal('name', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label-uppercase text-muted block mb-1">Email</label>
                    <input
                      className="input-editorial"
                      type="email"
                      placeholder="email@example.com"
                      value={localData.contact.email}
                      onChange={(e) => updateContact('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label-uppercase text-muted block mb-1">Phone</label>
                    <input
                      className="input-editorial"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={localData.contact.phone}
                      onChange={(e) => updateContact('phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label-uppercase text-muted block mb-1">Location</label>
                    <input
                      className="input-editorial"
                      placeholder="City, State"
                      value={localData.contact.location}
                      onChange={(e) => updateContact('location', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Experience' && (
              <div className="p-4 space-y-3">
                {localData.experience.map((exp, i) => {
                  const isOpen = expandedJobs.has(i)
                  const hasFlagged = hasFlaggedBullets(i)
                  return (
                    <div
                      key={i}
                      className={cn(
                        'rounded-lg border border-border bg-paper overflow-hidden transition-shadow',
                        hasFlagged && 'border-amber/40',
                      )}
                    >
                      <button
                        onClick={() => toggleJobExpanded(i)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-paper-dark/30 transition-colors cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-ink truncate">
                            {exp.title || 'Job Title'}
                          </p>
                          <p className="text-[11px] text-muted truncate">
                            {exp.company || 'Company'}{exp.startDate || exp.endDate ? ` · ${exp.startDate || ''}${exp.startDate && exp.endDate ? ' — ' : ''}${exp.current ? 'Present' : exp.endDate || ''}` : ''}
                          </p>
                        </div>
                        <motion.div
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronLeft className="h-3.5 w-3.5 text-muted shrink-0" />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="label-uppercase text-muted block mb-1">Company</label>
                                  <input
                                    className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
                                    placeholder="Company name"
                                    value={exp.company}
                                    onChange={(e) => updateExperience(i, 'company', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="label-uppercase text-muted block mb-1">Title</label>
                                  <input
                                    className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
                                    placeholder="Job title"
                                    value={exp.title}
                                    onChange={(e) => updateExperience(i, 'title', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="label-uppercase text-muted block mb-1">Start Date</label>
                                  <input
                                    className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
                                    placeholder="e.g. Jan 2020"
                                    value={exp.startDate}
                                    onChange={(e) => updateExperience(i, 'startDate', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="label-uppercase text-muted block mb-1">End Date</label>
                                  <input
                                    className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
                                    placeholder="e.g. Dec 2022"
                                    value={exp.current ? '' : exp.endDate}
                                    onChange={(e) => updateExperience(i, 'endDate', e.target.value)}
                                  />
                                </div>
                              </div>
                              <label className="flex items-center gap-2 text-xs text-muted">
                                <input
                                  type="checkbox"
                                  checked={exp.current}
                                  onChange={(e) => updateExperience(i, 'current', e.target.checked)}
                                  className="rounded border-border"
                                />
                                I currently work here
                              </label>
                              <div>
                                <label className="label-uppercase text-muted block mb-1">Bullets</label>
                                <div className="space-y-1.5">
                                  {exp.bullets.filter((bt: any) => typeof bt === 'string').map((bullet: string, j: number) => {
                                    const isWeak = bullet.length > 0 && redFlags.some(
                                      (rf: { section?: string }) => rf.section?.toLowerCase() === 'experience',
                                    )
                                    return (
                                      <div
                                        key={j}
                                        className={cn(
                                          'flex items-center gap-2 px-2 py-1 rounded group',
                                          isWeak && 'bg-amber/5 border-l-2 border-amber',
                                        )}
                                      >
                                        <span className="text-muted text-xs shrink-0">•</span>
                                        <input
                                          className="flex-1 bg-transparent border-0 border-b border-border py-1 text-[12px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
                                          placeholder="Describe your responsibility or achievement..."
                                          value={bullet}
                                          onChange={(e) => updateBullet(i, j, e.target.value)}
                                        />
                                        <button
                                          title="Rewrite with AI"
                                          onClick={() => openAiDrawer(i, j)}
                                          className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-teal transition-all shrink-0 cursor-pointer"
                                        >
                                          <Wand2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    )
                                  })}
                                </div>
                                <button
                                  onClick={() => addBullet(i)}
                                  className="mt-2 text-[11px] text-muted hover:text-ink transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="h-3 w-3" />
                                  Add bullet
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
                <button
                  onClick={addExperience}
                  className="w-full py-2.5 border border-dashed border-border rounded-lg text-[12px] text-muted hover:text-teal hover:border-teal/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add experience
                </button>
              </div>
            )}

            {activeTab === 'Education' && (
              <div className="p-4 space-y-3">
                {localData.education.map((edu, i) => (
                  <div key={i} className="rounded-lg border border-border bg-paper p-4 space-y-3">
                    <div>
                      <label className="label-uppercase text-muted block mb-1">Institution</label>
                      <input
                        className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
                        placeholder="University or school name"
                        value={edu.institution}
                        onChange={(e) => updateEducation(i, 'institution', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-uppercase text-muted block mb-1">Degree</label>
                        <input
                          className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
                          placeholder="e.g. Bachelor of Science"
                          value={edu.degree}
                          onChange={(e) => updateEducation(i, 'degree', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label-uppercase text-muted block mb-1">Field</label>
                        <input
                          className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
                          placeholder="e.g. Computer Science"
                          value={edu.field}
                          onChange={(e) => updateEducation(i, 'field', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addEducation}
                  className="w-full py-2.5 border border-dashed border-border rounded-lg text-[12px] text-muted hover:text-teal hover:border-teal/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add education
                </button>
              </div>
            )}

            {activeTab === 'Skills' && (
              <div className="p-5">
                <label className="label-uppercase text-muted block mb-1.5">Skills (comma-separated)</label>
                <input
                  className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
                  placeholder="React, TypeScript, Node.js, Python"
                  value={localData.skills.join(', ')}
                  onChange={(e) => handleSkillsChange(e.target.value)}
                />
                {localData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {localData.skills.map((s, i) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: colorTheme + '1A', color: colorTheme }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Certifications' && (
              <div className="p-4 space-y-3">
                {localData.certifications.map((cert, i) => (
                  <div key={i} className="rounded-lg border border-border bg-paper p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted">Certification {i + 1}</p>
                      <button
                        onClick={() => removeCertification(i)}
                        className="p-1 text-muted hover:text-danger transition-colors cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div>
                      <label className="label-uppercase text-muted block mb-1">Name</label>
                      <input
                        className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
                        placeholder="Certification name"
                        value={cert.name}
                        onChange={(e) => updateCertification(i, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label-uppercase text-muted block mb-1">Issuer</label>
                      <input
                        className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
                        placeholder="Issuing organization"
                        value={cert.issuer}
                        onChange={(e) => updateCertification(i, 'issuer', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={addCertification}
                  className="w-full py-2.5 border border-dashed border-border rounded-lg text-[12px] text-muted hover:text-teal hover:border-teal/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add certification
                </button>
              </div>
            )}

            {activeTab === 'Languages' && (
              <div className="p-4 space-y-3">
                {localData.languages.map((lang, i) => (
                  <div key={i} className="flex items-center gap-2 group">
                    <span className="text-muted text-xs">•</span>
                    <input
                      className="flex-1 bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
                      placeholder="Language"
                      value={lang}
                      onChange={(e) => updateLanguage(i, e.target.value)}
                    />
                    <button
                      onClick={() => removeLanguage(i)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-danger transition-all cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addLanguage}
                  className="w-full py-2.5 border border-dashed border-border rounded-lg text-[12px] text-muted hover:text-teal hover:border-teal/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add language
                </button>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-surface border-t border-border px-4 py-3 flex items-center gap-2">
            <Button variant="ghost" size="sm" className="flex-1">
              <Eye className="h-3.5 w-3.5 mr-1" />
              AI Review
            </Button>
            <Button variant="primary" size="sm" className="flex-1">
              <Wand2 className="h-3.5 w-3.5 mr-1" />
              Rewrite all
            </Button>
          </div>

          <AnimatePresence>
            {aiDrawerOpen && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="border-t border-border bg-surface"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="text-[12px] font-medium text-ink">{aiRewritesLoading ? 'Rewriting...' : `${aiRewrites.length} AI rewrites — choose one`}</p>
                  <button
                    onClick={() => { setAiDrawerOpen(false); setAiDrawerBullet(null) }}
                    className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="p-3 space-y-2">
                  {aiRewritesLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 text-muted animate-spin" />
                    </div>
                  ) : (
                    aiRewrites.map((text, i) => (
                      <button
                        key={i}
                        onClick={() => replaceWithAiRewrite(text)}
                        className="w-full text-left p-3 rounded-lg border border-border bg-paper text-[12px] text-ink leading-relaxed hover:border-teal hover:bg-paper-light transition-colors cursor-pointer"
                      >
                        {text}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={cn(
          'flex-1 flex flex-col min-w-0',
          mobilePanel === 'edit' && 'hidden lg:flex',
        )}>
          <div className="bg-surface border-b border-border px-5 py-2.5 shrink-0 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <TemplatePicker selected={template.id} onChange={setTemplate} />
              <span className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-medium text-muted shrink-0">Color</p>
                <ColorPicker selected={colorTheme} onChange={setColorTheme} />
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                className="p-1.5 rounded text-muted hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-[11px] text-muted w-8 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
                className="p-1.5 rounded text-muted hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-paper/50 overflow-y-auto flex justify-center p-8">
            <div
              className="w-[210mm] min-h-[297mm] bg-white shadow-lg rounded-sm p-10 transition-all duration-200"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
            >
              {renderPreview()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
