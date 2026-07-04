import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useResume, useRewriteBullet, useUpdateResume, useReExtractResume } from '../lib/queries'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'
import { MultiPagePreview } from '../components/editor/MultiPagePreview'
import TemplatePicker from '../components/TemplatePicker'
import ColorPicker from '../components/ColorPicker'
import PdfViewer from '../components/PdfViewer'
import DesignPanel from './editor/DesignPanel'
import { TEMPLATES } from '../templates'
import type { ResumeTemplate } from '../templates/types'
import { MinimalTemplate } from './editor/MinimalTemplate'
import { ModernTemplate } from './editor/ModernTemplate'
import { ExecutiveTemplate } from './editor/ExecutiveTemplate'
import type { LocalData, ResumeShim, DesignSettings, SkillEntry, CustomSection } from './editor/types'
import { DEFAULT_DESIGN, BUILTIN_SECTIONS, ALL_SECTION_NAMES } from './editor/types'
import { SummarySection, ExperienceSection, EducationSection, SkillsSection, CertificationsSection, LanguagesSection, LinksSection } from './editor/GuidedFormSections'
import { DirectEditPreview } from './editor/DirectEditPreview'
import { IconWand, IconChevronLeft, IconDownload, IconPlus, IconX, IconAlertTriangle, IconEye, IconZoomIn, IconZoomOut, IconCircleCheck, IconRefresh, IconEdit, IconLoader2, IconFileText, IconLayout, IconTemplate, IconDeviceFloppy, IconCommand, IconHelpCircle, IconDots, IconLayoutGrid, IconPencil } from '@tabler/icons-react'
import { useFontLoader, designPreviewStyle } from './editor/DesignPreviewWrapper'

type Tab = 'Summary' | 'Experience' | 'Education' | 'Skills' | 'Certifications' | 'Languages' | 'Links'

const TABS: Tab[] = ['Summary', 'Experience', 'Education', 'Skills', 'Certifications', 'Languages', 'Links']

function getSectionKey(tab: Tab): string {
  return tab === 'Certifications' ? 'certifications' : tab === 'Languages' ? 'languages' : tab === 'Links' ? 'links' : tab.toLowerCase()
}

function hasRedFlagsForSection(redFlags: ResumeShim['redFlags'], tab: Tab): boolean {
  const key = getSectionKey(tab)
  return (redFlags || []).some((rf) => rf.section?.toLowerCase() === key)
}

function getRedFlagsForSection(redFlags: ResumeShim['redFlags'], tab: Tab) {
  const key = getSectionKey(tab)
  return (redFlags || []).filter((rf) => rf.section?.toLowerCase() === key)
}

function ResumeSectionSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="flex gap-2 border-b border-border pb-3">
        {TABS.map((t) => <div key={t} className="h-8 w-20 bg-border/40 rounded" />)}
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
        <ResumeSectionSkeleton />
        <PreviewSkeleton />
      </div>
    </div>
  )
}

function makeLocalData(resume?: ResumeShim): LocalData {
  let name = resume?.name || ''
  if (!name && resume?.rawText) {
    const firstLine = resume.rawText.split('\n').find(l => l.trim().length > 0)
    if (firstLine) name = firstLine.trim().slice(0, 64)
  }
  const skills: SkillEntry[] = (resume?.skills || []).map(s => typeof s === 'string' ? { name: s } : s)
  return {
    title: resume?.title || '',
    name,
    summary: resume?.summary || '',
    contact: { email: resume?.contact?.email || '', phone: resume?.contact?.phone || '', location: resume?.contact?.location || '', linkedin: resume?.contact?.linkedin || '', website: resume?.contact?.website || '', github: resume?.contact?.github || '' },
    experience: (resume?.experience || []).map((e: any) => ({
      company: e.company || '', title: e.title || '', startDate: e.startDate || '', endDate: e.endDate || '', current: e.current || false, bullets: e.bullets || [''],
    })),
    education: (resume?.education || []).map((e: any) => ({
      institution: e.institution || '', degree: e.degree || '', field: e.field || '',
    })),
    skills,
    certifications: (resume?.certifications || []).map((c: any) => ({ name: c.name || '', issuer: c.issuer || '' })),
    languages: resume?.languages || [],
    links: (resume?.links || []).map((l: any) => ({ title: l.title || '', url: l.url || '' })),
    customSections: [],
    sectionOrder: BUILTIN_SECTIONS,
    design: { ...DEFAULT_DESIGN, ...(resume as any)?.design },
    editMode: (resume as any)?.editMode || 'guided',
  }
}

export default function ResumeEditor() {
  const { id } = useParams<{ id: string }>()
  return <ResumeEditorInner key={id} />
}

function ResumeEditorInner() {
  const { id } = useParams<{ id: string }>()
  const { data: resume, isLoading } = useResume(id!)
  const updateResume = useUpdateResume()
  const [activeTab, setActiveTab] = useState<Tab>('Summary')
  const [saved, setSaved] = useState(true)
  const [template, setTemplate] = useState<ResumeTemplate>(TEMPLATES[0])
  const [zoom, setZoom] = useState(1)
  const [expandedJobs, setExpandedJobs] = useState<Set<number>>(new Set([0]))
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [aiDrawerBullet, setAiDrawerBullet] = useState<{ jobIdx: number; bulletIdx: number } | null>(null)
  const [aiRewrites, setAiRewrites] = useState<string[]>([])
  const [aiRewritesLoading, setAiRewritesLoading] = useState(false)
  const rewriteBullet = useRewriteBullet()
  const reExtractResume = useReExtractResume()
  const [mobilePanel, setMobilePanel] = useState<'edit' | 'preview'>('edit')
  const [localData, setLocalData] = useState<LocalData>(makeLocalData())
  const saveAttemptRef = useRef(0)
  const [previewMode, setPreviewMode] = useState<'template' | 'original'>('template')
  const autoSwitchedRef = useRef(false)
  const userToggledPreview = useRef(false)
  const [designOpen, setDesignOpen] = useState(false)
  const [editMode, setEditMode] = useState<'guided' | 'direct'>('guided')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showAddSection, setShowAddSection] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [cmdSearch, setCmdSearch] = useState('')
  const cmdInputRef = useRef<HTMLInputElement>(null)
  const [undoStack, setUndoStack] = useState<LocalData[]>([])
  const [redoStack, setRedoStack] = useState<LocalData[]>([])

  useFontLoader(localData.design.headingFont, localData.design.bodyFont)

  const localRef = useRef(localData)
  localRef.current = localData

  const hasStructuredData = !!(localData.summary || localData.experience?.some(e => e.company || e.title) || localData.education?.some(e => e.institution))

  useEffect(() => {
    if (resume) {
      const ld = makeLocalData(resume)
      setLocalData(ld)
      setExpandedJobs(new Set(resume.experience ? [0] : []))
      const resumeEditMode = (resume as any)?.editMode
      if (resumeEditMode === 'direct' || resumeEditMode === 'guided') {
        setEditMode(resumeEditMode)
      } else if (resume?.fileUrl && !hasStructuredData) {
        setEditMode('direct')
      }
    }
  }, [resume])

  useEffect(() => {
    if (resume?.fileUrl && !hasStructuredData && !autoSwitchedRef.current) {
      setPreviewMode('original')
    }
  }, [resume, hasStructuredData])

  useEffect(() => {
    if (hasStructuredData && previewMode === 'original' && !autoSwitchedRef.current && !userToggledPreview.current) {
      autoSwitchedRef.current = true
      setPreviewMode('template')
    }
  }, [hasStructuredData, previewMode])

  const analysingRef = useRef(false)
  useEffect(() => {
    if (resume?.rawText && !hasStructuredData && !analysingRef.current && !isLoading) {
      analysingRef.current = true
      reExtractResume.mutate(resume._id!)
    }
  }, [resume?.rawText, hasStructuredData, isLoading, reExtractResume])

  const redFlags: Array<{ message: string; severity: 'low' | 'medium' | 'high'; section?: string }> = resume?.redFlags || []
  const sectionRedFlags = getRedFlagsForSection(redFlags, activeTab)

  useEffect(() => {
    if (!saved && id) {
      const attempt = ++saveAttemptRef.current
      const timer = setTimeout(async () => {
        const data: Record<string, unknown> = {
          title: localData.title,
          name: localData.name,
          summary: localData.summary,
          contact: localData.contact,
          experience: localData.experience,
          education: localData.education,
          skills: localData.skills.map(s => s.name),
          certifications: localData.certifications,
          languages: localData.languages,
          links: localData.links,
          editMode: localData.editMode,
          design: localData.design,
          sectionOrder: localData.sectionOrder,
        }
        try {
          await updateResume.mutateAsync({ id, data })
          if (saveAttemptRef.current === attempt) setSaved(true)
        } catch {
          if (saveAttemptRef.current === attempt) setSaved(false)
        }
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [localData, saved, id, updateResume])

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!saved) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saved])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 's') { e.preventDefault(); forceSave() }
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo() }
      if (mod && e.key === 'z' && e.shiftKey) { e.preventDefault(); handleRedo() }
      if (mod && e.key === 'd') { e.preventDefault(); setDesignOpen(o => !o) }
      if (mod && e.key === 'e') { e.preventDefault(); toggleEditMode() }
      if (mod && e.key === '/') { e.preventDefault(); setShowShortcuts(true) }
      if (mod && e.key === 'k') { e.preventDefault(); setShowCommandPalette(true); setCmdSearch('') }
      if (e.key === 'Escape') { setShowShortcuts(false); setShowCommandPalette(false); setShowAddSection(false) }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [localData, editMode])

  useEffect(() => {
    if (showCommandPalette && cmdInputRef.current) cmdInputRef.current.focus()
  }, [showCommandPalette])

  function updateLocal<K extends keyof LocalData>(key: K, value: LocalData[K]) {
    setUndoStack(prev => [...prev.slice(-20), localData])
    setRedoStack([])
    setLocalData((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function updateLocalFull(data: LocalData) {
    setUndoStack(prev => [...prev.slice(-20), localData])
    setRedoStack([])
    setLocalData(data)
    setSaved(false)
  }

  function forceSave() {
    if (!id) return
    const data: Record<string, unknown> = {
      title: localData.title, name: localData.name, summary: localData.summary,
      contact: localData.contact, experience: localData.experience, education: localData.education,
      skills: localData.skills.map(s => s.name), certifications: localData.certifications,
      languages: localData.languages, links: localData.links,
      editMode: localData.editMode, design: localData.design, sectionOrder: localData.sectionOrder,
    }
    updateResume.mutate({ id, data })
    setSaved(true)
  }

  function handleUndo() {
    if (undoStack.length === 0) return
    setRedoStack(prev => [...prev, localData])
    setLocalData(undoStack[undoStack.length - 1])
    setUndoStack(prev => prev.slice(0, -1))
  }

  function handleRedo() {
    if (redoStack.length === 0) return
    setUndoStack(prev => [...prev, localData])
    setLocalData(redoStack[redoStack.length - 1])
    setRedoStack(prev => prev.slice(0, -1))
  }

  function updateContact(field: keyof LocalData['contact'], value: string) {
    setLocalData((prev) => ({ ...prev, contact: { ...prev.contact, [field]: value } }))
    setSaved(false)
  }

  function updateExperience(index: number, field: string, value: string | boolean) {
    setLocalData((prev) => {
      const exp = [...prev.experience]
      ;(exp[index] as any)[field] = value
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

  function addBulletText(jobIdx: number, text: string) {
    setLocalData((prev) => {
      const exp = [...prev.experience]
      exp[jobIdx] = { ...exp[jobIdx], bullets: [...exp[jobIdx].bullets, text] }
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
    setLocalData((prev) => ({
      ...prev,
      experience: [...(prev.experience || []), { company: '', title: '', startDate: '', endDate: '', current: false, bullets: [''] }],
    }))
    setExpandedJobs((prev) => new Set(prev).add(prev.size))
    setSaved(false)
  }

  function removeExperience(index: number) {
    setLocalData((prev) => ({ ...prev, experience: prev.experience.filter((_, i) => i !== index) }))
    setExpandedJobs((prev) => { const next = new Set(prev); next.delete(index); return next })
    setSaved(false)
  }

  function addEducation() {
    setLocalData((prev) => ({ ...prev, education: [...prev.education, { institution: '', degree: '', field: '' }] }))
    setSaved(false)
  }

  function removeEducation(index: number) {
    setLocalData((prev) => ({ ...prev, education: prev.education.filter((_, i) => i !== index) }))
    setSaved(false)
  }

  function updateEducation(index: number, field: string, value: string) {
    setLocalData((prev) => {
      const edu = [...prev.education]
      ;(edu[index] as any)[field] = value
      return { ...prev, education: edu }
    })
    setSaved(false)
  }

  function addCertification() {
    setLocalData((prev) => ({ ...prev, certifications: [...prev.certifications, { name: '', issuer: '' }] }))
    setSaved(false)
  }

  function removeCertification(index: number) {
    setLocalData((prev) => ({ ...prev, certifications: prev.certifications.filter((_, i) => i !== index) }))
    setSaved(false)
  }

  function updateCertification(index: number, field: string, value: string) {
    setLocalData((prev) => {
      const certs = [...prev.certifications]
      ;(certs[index] as any)[field] = value
      return { ...prev, certifications: certs }
    })
    setSaved(false)
  }

  function addLanguage() {
    setLocalData((prev) => ({ ...prev, languages: [...prev.languages, ''] }))
    setSaved(false)
  }

  function removeLanguage(index: number) {
    setLocalData((prev) => ({ ...prev, languages: prev.languages.filter((_, i) => i !== index) }))
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

  function addLink() {
    setLocalData((prev) => ({ ...prev, links: [...prev.links, { title: '', url: '' }] }))
    setSaved(false)
  }

  function removeLink(index: number) {
    setLocalData((prev) => ({ ...prev, links: prev.links.filter((_, i) => i !== index) }))
    setSaved(false)
  }

  function updateLink(index: number, field: string, value: string) {
    setLocalData((prev) => {
      const links = [...prev.links]
      ;(links[index] as any)[field] = value
      return { ...prev, links }
    })
    setSaved(false)
  }

  function toggleEditMode() {
    setEditMode(prev => {
      const next = prev === 'guided' ? 'direct' : 'guided'
      updateLocal('editMode', next)
      return next
    })
  }

  function handleSkillsChange(skills: SkillEntry[]) {
    updateLocal('skills', skills)
  }

  function handleDesignChange(design: DesignSettings) {
    updateLocal('design', design)
  }

  function handleTemplateChange(tpl: ResumeTemplate) {
    setTemplate(tpl)
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
      setAiRewrites(['AI rewrite unavailable. Please try again later.'])
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

  const sectionPresent: Record<string, boolean> = {
    summary: !!localData.summary,
    experience: localData.experience.length > 0,
    education: localData.education.length > 0,
    skills: localData.skills.length > 0,
    certifications: localData.certifications.length > 0,
    languages: localData.languages.length > 0,
    links: localData.links.length > 0,
  }

  function addSection(key: string) {
    if (key === 'projects') {
      updateLocal('customSections', [...localData.customSections, { id: `custom-${Date.now()}`, title: 'Projects', content: [''], type: 'bullets' }])
    } else if (key === 'volunteer') {
      updateLocal('customSections', [...localData.customSections, { id: `custom-${Date.now()}`, title: 'Volunteer', content: [''], type: 'bullets' }])
    } else if (key === 'awards') {
      updateLocal('customSections', [...localData.customSections, { id: `custom-${Date.now()}`, title: 'Awards', content: [''], type: 'bullets' }])
    } else if (key === 'publications') {
      updateLocal('customSections', [...localData.customSections, { id: `custom-${Date.now()}`, title: 'Publications', content: [''], type: 'bullets' }])
    } else if (key === 'references') {
      updateLocal('customSections', [...localData.customSections, { id: `custom-${Date.now()}`, title: 'References', content: ['Available upon request.'], type: 'text' }])
    } else {
      const sec = ALL_SECTION_NAMES.find(s => s.key === key)
      if (sec) updateLocal('sectionOrder', [...localData.sectionOrder, key])
    }
    setShowAddSection(false)
  }

  function removeSection(key: string) {
    updateLocal('sectionOrder', localData.sectionOrder.filter(s => s !== key))
  }

  function renderTemplate() {
    const commonProps = {
      resume: resume || { _id: id || '', title: '' },
      localData,
      redFlags,
      primaryColor: localData.design.primaryColor,
      templateStyle: template.style,
    }
    if (template.layout === 'sidebar' || template.layout === 'two-column') {
      return <ModernTemplate {...commonProps} showSections={undefined} pageIndex={undefined} />
    }
    if (template.style.header === 'dark-block' && template.style.font === 'serif') {
      return <ExecutiveTemplate {...commonProps} showSections={undefined} pageIndex={undefined} />
    }
    return <MinimalTemplate {...commonProps} showSections={undefined} pageIndex={undefined} />
  }

  const cmdActions = [
    { id: 'rewrite', label: 'Rewrite bullet with AI', icon: IconWand, action: () => {} },
    { id: 'template', label: 'Change template', icon: IconTemplate, action: () => { setDesignOpen(true); setShowCommandPalette(false) } },
    { id: 'experience', label: 'Add experience', icon: IconPlus, action: () => { addExperience(); setShowCommandPalette(false) } },
    { id: 'export', label: 'Export PDF', icon: IconDownload, action: () => { window.location.href = `/export/${id}`; setShowCommandPalette(false) } },
    { id: 'review', label: 'Run AI review', icon: IconEye, action: () => { window.location.href = `/resume/${id}/review`; setShowCommandPalette(false) } },
    { id: 'font', label: 'Change font', icon: IconLayout, action: () => { setDesignOpen(true); setShowCommandPalette(false) } },
    { id: 'undo', label: 'Undo', icon: IconRefresh, action: () => { handleUndo(); setShowCommandPalette(false) } },
    { id: 'add-skill', label: 'Add skill', icon: IconPlus, action: () => { setActiveTab('Skills'); setShowCommandPalette(false) } },
    { id: 'mode', label: 'Toggle edit mode', icon: IconPencil, action: () => { toggleEditMode(); setShowCommandPalette(false) } },
    { id: 'design', label: 'Open design panel', icon: IconLayoutGrid, action: () => { setDesignOpen(true); setShowCommandPalette(false) } },
    { id: 'shortcuts', label: 'Keyboard shortcuts', icon: IconHelpCircle, action: () => { setShowShortcuts(true); setShowCommandPalette(false) } },
  ]

  const filteredCmds = cmdActions.filter(c => c.label.toLowerCase().includes(cmdSearch.toLowerCase()))

  if (isLoading) return <LoadingState />

  const previewData = localData
  const canShowOriginal = resume?.fileUrl || resume?.rawText

  return (
    <div className="flex flex-col h-screen bg-paper">
      <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-3 sm:px-6 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/resumes" className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-paper-dark transition-colors shrink-0 cursor-pointer" title="Back to resumes">
            <IconChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <nav className="text-[11px] text-muted flex items-center gap-1.5">
              <Link to="/resumes" className="hover:text-ink transition-colors">Resumes</Link>
              <span className="text-muted-light">/</span>
              <span className="text-ink truncate">{resume?.title || 'Untitled'}</span>
            </nav>
            <h1 className="font-display text-[16px] text-ink leading-tight mt-0.5 truncate">Resume Editor</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 mr-2">
            {saved ? (
              <><IconCircleCheck className="h-3 w-3 text-success" /><span className="text-[11px] text-success font-medium hidden sm:inline">Saved</span></>
            ) : (
              <><IconRefresh className="h-3 w-3 text-muted animate-spin" /><span className="text-[11px] text-muted hidden sm:inline">Saving...</span></>
            )}
          </div>

          <div className="flex items-center gap-0.5 bg-paper border border-border rounded-lg p-0.5 mr-1">
            <button
              onClick={() => { const m = 'guided'; setEditMode(m); updateLocal('editMode', m) }}
              className={cn('flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap',
                editMode === 'guided' ? 'text-teal bg-white shadow-sm' : 'text-muted hover:text-ink')}
            >
              <IconEdit className="h-3 w-3" />
              <span className="hidden sm:inline">Guided</span>
            </button>
            <button
              onClick={() => { const m = 'direct'; setEditMode(m); updateLocal('editMode', m) }}
              className={cn('flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap',
                editMode === 'direct' ? 'text-teal bg-white shadow-sm' : 'text-muted hover:text-ink')}
            >
              <IconPencil className="h-3 w-3" />
              <span className="hidden sm:inline">Direct edit</span>
            </button>
          </div>

          <Link to={`/resume/${id}/review`}>
            <Button variant="ghost" size="sm"><span className="hidden sm:inline">Review</span><span className="sm:hidden"><IconEye className="h-4 w-4" /></span></Button>
          </Link>
          <Link to="/ats">
            <Button variant="ghost" size="sm"><span className="hidden sm:inline">ATS Check</span><span className="sm:hidden"><IconAlertTriangle className="h-4 w-4" /></span></Button>
          </Link>
          <Link to={`/export/${id}`}>
            <Button variant="primary" size="sm"><IconDownload className="h-4 w-4 sm:h-3.5 sm:w-3.5" /><span className="hidden sm:inline ml-1">Export</span></Button>
          </Link>
        </div>
      </header>

      <div className="lg:hidden flex items-center border-b border-border bg-surface shrink-0">
        <button onClick={() => setMobilePanel('edit')} className={cn('flex-1 py-2.5 text-sm font-medium text-center border-b-2 transition-colors cursor-pointer', mobilePanel === 'edit' ? 'border-teal text-teal' : 'border-transparent text-muted')}>
          <IconEdit className="h-3.5 w-3.5 inline mr-1.5" />Edit
        </button>
        <button onClick={() => setMobilePanel('preview')} className={cn('flex-1 py-2.5 text-sm font-medium text-center border-b-2 transition-colors cursor-pointer', mobilePanel === 'preview' ? 'border-teal text-teal' : 'border-transparent text-muted')}>
          <IconEye className="h-3.5 w-3.5 inline mr-1.5" />Preview
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {editMode === 'guided' && (
          <div className={cn('w-full lg:w-[420px] shrink-0 border-r border-border/50 flex flex-col bg-surface min-w-0 overflow-hidden', mobilePanel === 'preview' && 'hidden lg:flex')}>
            <div className="bg-paper border-b border-border px-4 py-3">
              <div className="pill-group">
                {TABS.map((tab) => {
                  const hasFlag = hasRedFlagsForSection(redFlags, tab)
                  return (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={cn('pill relative', activeTab === tab ? 'pill-active' : 'pill-inactive')}>
                      {tab}
                      {hasFlag && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red ring-2 ring-paper" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {sectionRedFlags.length > 0 && (
              <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber/5 border border-amber/20 text-[11px] text-ink">
                <IconAlertTriangle className="h-3.5 w-3.5 text-amber shrink-0" />
                <span>{sectionRedFlags.length} red flag{sectionRedFlags.length > 1 ? 's' : ''} in this section — </span>
                <Link to={`/resume/${id}/review`} className="font-bold text-danger hover:underline shrink-0">view & fix</Link>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {activeTab === 'Summary' && <SummarySection localData={localData} onUpdateLocal={updateLocal} onUpdateContact={updateContact} />}
              {activeTab === 'Experience' && (
                <ExperienceSection
                  localData={localData} onUpdate={updateLocalFull} onUpdateLocal={updateLocal}
                  onUpdateContact={updateContact} onUpdateExperience={updateExperience}
                  onUpdateBullet={updateBullet} onAddBullet={addBullet} onAddBulletText={addBulletText}
                  onAddExperience={addExperience} onRemoveExperience={removeExperience}
                  onUpdateEducation={updateEducation} onAddEducation={addEducation} onRemoveEducation={removeEducation}
                  onOpenAiDrawer={openAiDrawer}
                  expandedJobs={expandedJobs} onToggleJobExpanded={toggleJobExpanded}
                  onSkillChange={handleSkillsChange} onAddCertification={addCertification}
                  onUpdateCertification={updateCertification} onRemoveCertification={removeCertification}
                  onAddLanguage={addLanguage} onUpdateLanguage={updateLanguage} onRemoveLanguage={removeLanguage}
                  onAddLink={addLink} onUpdateLink={updateLink} onRemoveLink={removeLink}
                  redFlags={redFlags} activeTab={activeTab}
                />
              )}
              {activeTab === 'Education' && (
                <EducationSection localData={localData} onUpdate={updateLocalFull} onUpdateLocal={updateLocal}
                  onUpdateContact={updateContact} onUpdateExperience={updateExperience}
                  onUpdateBullet={updateBullet} onAddBullet={addBullet} onAddBulletText={addBulletText}
                  onAddExperience={addExperience} onRemoveExperience={removeExperience}
                  onUpdateEducation={updateEducation} onAddEducation={addEducation} onRemoveEducation={removeEducation}
                  onOpenAiDrawer={openAiDrawer}
                  expandedJobs={expandedJobs} onToggleJobExpanded={toggleJobExpanded}
                  onSkillChange={handleSkillsChange} onAddCertification={addCertification}
                  onUpdateCertification={updateCertification} onRemoveCertification={removeCertification}
                  onAddLanguage={addLanguage} onUpdateLanguage={updateLanguage} onRemoveLanguage={removeLanguage}
                  onAddLink={addLink} onUpdateLink={updateLink} onRemoveLink={removeLink}
                  redFlags={redFlags} activeTab={activeTab}
                />
              )}
              {activeTab === 'Skills' && <SkillsSection localData={localData} onSkillChange={handleSkillsChange} />}
              {activeTab === 'Certifications' && (
                <CertificationsSection localData={localData} onUpdate={updateLocalFull} onUpdateLocal={updateLocal}
                  onUpdateContact={updateContact} onUpdateExperience={updateExperience}
                  onUpdateBullet={updateBullet} onAddBullet={addBullet} onAddBulletText={addBulletText}
                  onAddExperience={addExperience} onRemoveExperience={removeExperience}
                  onUpdateEducation={updateEducation} onAddEducation={addEducation} onRemoveEducation={removeEducation}
                  onOpenAiDrawer={openAiDrawer}
                  expandedJobs={expandedJobs} onToggleJobExpanded={toggleJobExpanded}
                  onSkillChange={handleSkillsChange} onAddCertification={addCertification}
                  onUpdateCertification={updateCertification} onRemoveCertification={removeCertification}
                  onAddLanguage={addLanguage} onUpdateLanguage={updateLanguage} onRemoveLanguage={removeLanguage}
                  onAddLink={addLink} onUpdateLink={updateLink} onRemoveLink={removeLink}
                  redFlags={redFlags} activeTab={activeTab}
                />
              )}
              {activeTab === 'Languages' && (
                <LanguagesSection localData={localData} onUpdate={updateLocalFull} onUpdateLocal={updateLocal}
                  onUpdateContact={updateContact} onUpdateExperience={updateExperience}
                  onUpdateBullet={updateBullet} onAddBullet={addBullet} onAddBulletText={addBulletText}
                  onAddExperience={addExperience} onRemoveExperience={removeExperience}
                  onUpdateEducation={updateEducation} onAddEducation={addEducation} onRemoveEducation={removeEducation}
                  onOpenAiDrawer={openAiDrawer}
                  expandedJobs={expandedJobs} onToggleJobExpanded={toggleJobExpanded}
                  onSkillChange={handleSkillsChange} onAddCertification={addCertification}
                  onUpdateCertification={updateCertification} onRemoveCertification={removeCertification}
                  onAddLanguage={addLanguage} onUpdateLanguage={updateLanguage} onRemoveLanguage={removeLanguage}
                  onAddLink={addLink} onUpdateLink={updateLink} onRemoveLink={removeLink}
                  redFlags={redFlags} activeTab={activeTab}
                />
              )}
              {activeTab === 'Links' && (
                <LinksSection localData={localData} onUpdate={updateLocalFull} onUpdateLocal={updateLocal}
                  onUpdateContact={updateContact} onUpdateExperience={updateExperience}
                  onUpdateBullet={updateBullet} onAddBullet={addBullet} onAddBulletText={addBulletText}
                  onAddExperience={addExperience} onRemoveExperience={removeExperience}
                  onUpdateEducation={updateEducation} onAddEducation={addEducation} onRemoveEducation={removeEducation}
                  onOpenAiDrawer={openAiDrawer}
                  expandedJobs={expandedJobs} onToggleJobExpanded={toggleJobExpanded}
                  onSkillChange={handleSkillsChange} onAddCertification={addCertification}
                  onUpdateCertification={updateCertification} onRemoveCertification={removeCertification}
                  onAddLanguage={addLanguage} onUpdateLanguage={updateLanguage} onRemoveLanguage={removeLanguage}
                  onAddLink={addLink} onUpdateLink={updateLink} onRemoveLink={removeLink}
                  redFlags={redFlags} activeTab={activeTab}
                />
              )}
            </div>

            <div className="sticky bottom-0 bg-surface border-t border-border px-4 py-3 flex items-center gap-2">
              <Link to={`/resume/${id}/review`} className="flex-1">
                <Button variant="ghost" size="sm" className="w-full cursor-pointer"><IconEye className="h-3.5 w-3.5 mr-1" />AI Review</Button>
              </Link>
              <Button variant="primary" size="sm" className="flex-1 cursor-pointer"
                onClick={() => { const firstExp = localData.experience.find(e => e.bullets.length > 0); if (firstExp) openAiDrawer(localData.experience.indexOf(firstExp), 0) }}
                disabled={!localData.experience.some(e => e.bullets.length > 0)}
              ><IconWand className="h-3.5 w-3.5 mr-1" />Rewrite</Button>
            </div>

            <AnimatePresence>
              {aiDrawerOpen && (
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="border-t border-border bg-surface">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <p className="text-[12px] font-medium text-ink">{aiRewritesLoading ? 'Rewriting...' : `${aiRewrites.length} AI rewrites — choose one`}</p>
                    <button onClick={() => { setAiDrawerOpen(false); setAiDrawerBullet(null) }} className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer">
                      <IconX className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="p-3 space-y-2">
                    {aiRewritesLoading ? (
                      <div className="flex items-center justify-center py-6"><IconLoader2 className="h-5 w-5 text-muted animate-spin" /></div>
                    ) : (
                      aiRewrites.map((text, i) => (
                        <button key={i} onClick={() => replaceWithAiRewrite(text)} className="w-full text-left p-3 rounded-lg border border-border bg-paper text-[12px] text-ink leading-relaxed hover:border-teal hover:bg-paper-light transition-colors cursor-pointer">{text}</button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className={cn('flex-1 flex flex-col min-w-0', editMode === 'guided' && (mobilePanel === 'edit' ? 'hidden lg:flex' : ''))}>
          <div className="bg-surface border-b border-border px-3 sm:px-5 py-2.5 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <TemplatePicker selected={template.id} onChange={handleTemplateChange} />
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
                <button
                  onClick={() => setDesignOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-medium text-muted hover:text-teal hover:border-teal/30 transition-colors bg-white cursor-pointer"
                >
                  <IconLayoutGrid className="h-3.5 w-3.5" />
                  Design
                </button>
                <div className="flex items-center gap-0.5 bg-paper border border-border rounded-lg p-0.5">
                  <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="p-1 rounded text-muted hover:text-ink hover:bg-white transition-colors cursor-pointer"><IconZoomOut className="h-3 w-3" /></button>
                  <span className="text-[11px] text-muted w-7 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom((z) => Math.min(2, z + 0.1))} className="p-1 rounded text-muted hover:text-ink hover:bg-white transition-colors cursor-pointer"><IconZoomIn className="h-3 w-3" /></button>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber/10 border border-amber/20 text-[10px] font-medium text-amber-700 whitespace-nowrap">
                  <IconAlertTriangle className="h-3 w-3" />
                  <span>1 page</span>
                </div>
                <span className="h-5 w-px bg-border shrink-0 hidden sm:block" />
                <ColorPicker selected={localData.design.primaryColor} onChange={(c) => handleDesignChange({ ...localData.design, primaryColor: c })} />
                <span className="h-5 w-px bg-border shrink-0" />
                <div className="flex items-center gap-0.5 bg-paper border border-border rounded-lg p-0.5">
                  <button onClick={() => { setPreviewMode('template'); userToggledPreview.current = true }}
                    className={cn('flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap',
                      previewMode === 'template' ? 'text-teal bg-white shadow-sm' : 'text-muted hover:text-ink')}
                  ><IconLayout className="h-3.5 w-3.5" /><span className="hidden sm:inline">Template</span></button>
                  {canShowOriginal && (
                    <button onClick={() => { setPreviewMode('original'); userToggledPreview.current = true }}
                      className={cn('flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap',
                        previewMode === 'original' ? 'text-teal bg-white shadow-sm' : 'text-muted hover:text-ink')}
                    ><IconFileText className="h-3.5 w-3.5" /><span className="hidden sm:inline">Original</span></button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className={cn('flex-1 bg-paper/50 overflow-y-auto overflow-x-hidden flex justify-center p-2 sm:p-4 lg:p-8', editMode === 'direct' && 'bg-[#e8e6e1]')}>
            {previewMode === 'original' && resume?.fileUrl ? (
              <div className="w-full max-w-[210mm]"><PdfViewer fileUrl={resume.fileUrl} className="w-full" /></div>
            ) : previewMode === 'original' && resume?.rawText ? (
              <div className="w-full max-w-[210mm] bg-white shadow-lg rounded-sm p-6 sm:p-8 lg:p-10">
                <pre className="text-[11px] text-ink leading-relaxed whitespace-pre-wrap font-sans">{resume.rawText}</pre>
              </div>
            ) : editMode === 'direct' ? (
              <div className="w-full max-w-[210mm]">
                <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
                  <DirectEditPreview localData={localData} onUpdate={updateLocalFull} />
                </div>
                <div className="flex justify-center py-3">
                  <button
                    onClick={() => setShowAddSection(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-[11px] text-muted hover:text-ink hover:bg-paper-dark rounded-lg transition-colors cursor-pointer"
                  >
                    <IconPlus className="h-3.5 w-3.5" />
                    Add section
                  </button>
                </div>
              </div>
            ) : (
              <>
                <MultiPagePreview zoom={zoom} singlePage={template.id === 'modern'} contentKey={template.id + '-' + (resume?._id || '')}>
                  {({ showSections, pageIndex }) => {
                    const commonProps = {
                      resume: resume || { _id: id || '', title: '' },
                      localData: previewData,
                      redFlags,
                      primaryColor: localData.design.primaryColor,
                      showSections,
                      pageIndex,
                      templateStyle: template.style,
                    }
                    const tpl = template.layout === 'sidebar' || template.layout === 'two-column'
                      ? <ModernTemplate {...commonProps} />
                      : template.style.header === 'dark-block' && template.style.font === 'serif'
                      ? <ExecutiveTemplate {...commonProps} />
                      : <MinimalTemplate {...commonProps} />
                    return <div style={designPreviewStyle(localData.design)}>{tpl}</div>
                  }}
                </MultiPagePreview>
                <div className="flex justify-center pb-4">
                  <button
                    onClick={() => setShowAddSection(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-[11px] text-muted hover:text-ink hover:bg-paper-dark rounded-lg transition-colors cursor-pointer"
                  >
                    <IconPlus className="h-3.5 w-3.5" />
                    Add section
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <DesignPanel
        open={designOpen}
        onClose={() => setDesignOpen(false)}
        selectedTemplate={template}
        design={localData.design}
        onDesignChange={handleDesignChange}
        onTemplateChange={handleTemplateChange}
      />

      <AnimatePresence>
        {showCommandPalette && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setShowCommandPalette(false)}>
            <div className="fixed inset-0 bg-black/30" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-[500px] bg-white rounded-xl shadow-2xl border border-border overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <IconCommand className="h-4 w-4 text-muted shrink-0" />
                <input
                  ref={cmdInputRef}
                  className="flex-1 bg-transparent border-0 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none"
                  placeholder="Type a command..."
                  value={cmdSearch}
                  onChange={e => setCmdSearch(e.target.value)}
                />
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-paper text-muted border border-border font-mono">ESC</kbd>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2">
                {filteredCmds.length === 0 ? (
                  <p className="text-center text-[12px] text-muted py-6">No matching commands</p>
                ) : (
                  filteredCmds.map(cmd => {
                    const Icon = cmd.icon
                    return (
                      <button key={cmd.id} onClick={cmd.action} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] text-ink hover:bg-paper-dark transition-colors text-left cursor-pointer">
                        <Icon className="h-4 w-4 text-muted shrink-0" />
                        {cmd.label}
                      </button>
                    )
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {showShortcuts && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
            <div className="fixed inset-0 bg-black/30" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-[400px] bg-white rounded-xl shadow-2xl border border-border p-6" onClick={e => e.stopPropagation()}>
              <h2 className="text-[15px] font-display font-semibold text-ink mb-4">Keyboard Shortcuts</h2>
              <div className="space-y-2.5">
                {[
                  { keys: '⌘S', desc: 'Force save' },
                  { keys: '⌘Z', desc: 'Undo' },
                  { keys: '⌘⇧Z', desc: 'Redo' },
                  { keys: '⌘D', desc: 'Open Design panel' },
                  { keys: '⌘E', desc: 'Toggle Guided / Direct edit' },
                  { keys: '⌘K', desc: 'Command palette' },
                  { keys: '⌘/', desc: 'Keyboard shortcuts' },
                  { keys: 'Esc', desc: 'Close panel or drawer' },
                  { keys: 'Tab', desc: 'Next field (Guided mode)' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[12px] text-muted">{s.desc}</span>
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-paper text-ink border border-border font-mono">{s.keys}</kbd>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowShortcuts(false)} className="mt-4 w-full py-2 text-[11px] text-muted hover:text-ink transition-colors cursor-pointer">Close</button>
            </motion.div>
          </motion.div>
        )}

        {showAddSection && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setShowAddSection(false)}>
            <div className="fixed inset-0 bg-black/30" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-[320px] bg-white rounded-xl shadow-2xl border border-border p-5" onClick={e => e.stopPropagation()}>
              <h2 className="text-[14px] font-display font-semibold text-ink mb-3">Add Section</h2>
              <div className="space-y-1">
                {ALL_SECTION_NAMES.filter(s => !localData.sectionOrder.includes(s.key) && !sectionPresent[s.key]).map(s => (
                  <button key={s.key} onClick={() => addSection(s.key)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-ink hover:bg-paper-dark transition-colors text-left cursor-pointer">
                    <IconPlus className="h-3.5 w-3.5 text-muted" />
                    {s.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
