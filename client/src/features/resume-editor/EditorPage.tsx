import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useResume, useUpdateResume } from '../../lib/queries'
import { useFontLoader } from '../../pages/editor/DesignPreviewWrapper'
import EditorToolbar from './components/EditorToolbar'
import EditorCanvas from './components/EditorCanvas'
import ResumePaper from './components/ResumePaper'
import FloatingPanel from './components/FloatingPanel'
import EditableResumeView from './components/EditableResumeView'
import StylesPanel from './components/StylesPanel'
import SectionsPanel from './components/SectionsPanel'
import type { LocalData, SkillEntry } from '../../pages/editor/types'
import { DEFAULT_DESIGN, BUILTIN_SECTIONS } from '../../pages/editor/types'
import { TEMPLATE_DEFS, getTemplateLayout, getTemplateStyle } from './templates'
import type { TemplateId } from './templates'

function makeLocalData(resume: any): LocalData {
  const name = resume?.name || resume?.rawText?.split('\n').find((l: string) => l.trim().length > 0)?.trim().slice(0, 64) || ''
  const skills: SkillEntry[] = (resume?.skills || []).map((s: any) => typeof s === 'string' ? { name: s } : s)
  return {
    title: resume?.title || '',
    name,
    summary: resume?.summary || '',
    contact: {
      email: resume?.contact?.email || '',
      phone: resume?.contact?.phone || '',
      location: resume?.contact?.location || '',
      linkedin: resume?.contact?.linkedin || '',
      website: resume?.contact?.website || '',
      github: resume?.contact?.github || '',
    },
    experience: (resume?.experience || []).map((e: any) => ({
      company: e.company || '',
      title: e.title || '',
      startDate: e.startDate || '',
      endDate: e.endDate || '',
      current: e.current || false,
      bullets: e.bullets || [''],
    })),
    education: (resume?.education || []).map((e: any) => ({
      institution: e.institution || '',
      degree: e.degree || '',
      field: e.field || '',
      startDate: e.startDate || '',
      endDate: e.endDate || '',
      gpa: e.gpa || '',
    })),
    skills,
    certifications: (resume?.certifications || []).map((c: any) => ({ name: c.name || '', issuer: c.issuer || '', date: c.date || '' })),
    languages: resume?.languages || [],
    links: (resume?.links || []).map((l: any) => ({ title: l.title || '', url: l.url || '' })),
    customSections: [],
    sectionOrder: BUILTIN_SECTIONS,
    design: { ...DEFAULT_DESIGN, ...(resume as any)?.design },
    editMode: 'direct' as const,
  }
}

function LoadingState() {
  return (
    <div className="flex flex-col h-screen bg-[#D4CFC6]">
      <div className="h-12 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-4 w-4 bg-border/40 rounded" />
          <div className="h-4 w-32 bg-border/40 rounded" />
        </div>
        <div className="animate-pulse flex items-center gap-2">
          <div className="h-6 w-16 bg-border/30 rounded" />
          <div className="h-6 w-16 bg-border/30 rounded" />
          <div className="h-6 w-20 bg-border/30 rounded" />
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-[210mm] h-[297mm] bg-white shadow-xl rounded-sm" />
      </div>
    </div>
  )
}

export default function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: resume, isLoading } = useResume(id!)
  const updateResume = useUpdateResume()
  const [localData, setLocalData] = useState<LocalData>(makeLocalData())
  const [saved, setSaved] = useState(true)
  const [templateId, setTemplateId] = useState<TemplateId>('minimal')
  const [zoom, setZoom] = useState(0.75)
  const [editMode, setEditMode] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<'styles' | 'sections' | 'ai'>('styles')
  const [undoStack, setUndoStack] = useState<LocalData[]>([])
  const [redoStack, setRedoStack] = useState<LocalData[]>([])
  const saveAttemptRef = useRef(0)

  useFontLoader(localData.design.headingFont, localData.design.bodyFont)

  useEffect(() => {
    if (resume) {
      setLocalData(makeLocalData(resume))
    }
  }, [resume])

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
      }, 1000)
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

  function pushUndo(data: LocalData) {
    setUndoStack(prev => [...prev.slice(-20), data])
    setRedoStack([])
  }

  function updateLocal<K extends keyof LocalData>(key: K, value: LocalData[K]) {
    pushUndo(localData)
    setLocalData(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function updateLocalFull(data: LocalData) {
    pushUndo(localData)
    setLocalData(data)
    setSaved(false)
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

  function openPanel(tab: 'styles' | 'sections' | 'ai') {
    setPanelTab(tab)
    setPanelOpen(true)
  }

  if (isLoading) return <LoadingState />
  if (!id) { navigate('/resumes', { replace: true }); return null }

  const Layout = getTemplateLayout(templateId)
  const style = getTemplateStyle(templateId)
  const marginPx = (6 + localData.design.margins * 3) * 3.78

  const sheetStyle = {
    fontFamily: `"${localData.design.bodyFont}", -apple-system, BlinkMacSystemFont, sans-serif`,
    fontSize: `${localData.design.bodyFontSize}px`,
    lineHeight: localData.design.lineSpacing,
    padding: `${marginPx}px`,
  } as React.CSSProperties

  return (
    <div className="flex flex-col h-screen bg-[#D4CFC6]">
      <EditorToolbar
        resumeTitle={resume?.title || 'Untitled'}
        saved={saved}
        onSave={forceSave}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        editMode={editMode}
        onEditModeToggle={() => setEditMode(e => !e)}
        zoom={zoom}
        onZoomIn={() => setZoom(z => Math.min(2, z + 0.1))}
        onZoomOut={() => setZoom(z => Math.max(0.3, z - 0.1))}
        onZoomReset={() => setZoom(0.75)}
        onOpenPanel={openPanel}
        activePanel={panelOpen ? panelTab : null}
        onExport={() => window.location.href = `/export/${id}`}
        onBack={() => navigate('/resumes')}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <EditorCanvas zoom={zoom}>
          <ResumePaper>
            {editMode ? (
              <div className="p-8">
                <EditableResumeView data={localData} onUpdate={updateLocalFull} redFlags={resume?.redFlags as any} />
              </div>
            ) : (
              <div style={sheetStyle}>
                <Layout data={localData} design={localData.design} style={style} />
              </div>
            )}
          </ResumePaper>
        </EditorCanvas>

        <AnimatePresence>
          {panelOpen && (
            <FloatingPanel
              tab={panelTab}
              onClose={() => setPanelOpen(false)}
            >
              {panelTab === 'styles' && (
                <StylesPanel
                  templateId={templateId}
                  design={localData.design}
                  onTemplateChange={setTemplateId}
                  onDesignChange={d => updateLocal('design', d)}
                />
              )}
              {panelTab === 'sections' && (
                <SectionsPanel data={localData} onUpdate={updateLocalFull} />
              )}
              {panelTab === 'ai' && (
                <div className="p-4 text-sm text-muted">AI panel — coming in Phase 9</div>
              )}
            </FloatingPanel>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
