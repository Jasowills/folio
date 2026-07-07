import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useResume, useUpdateResume, useAnalyzeResume, useExtractLayout, useSaveLayoutDocument } from '../../lib/queries'
import type { PdfLayoutDocument } from '../../lib/queries'
import { AiService } from '../../lib/ai'
import type { LocalData, DesignSettings } from '../../pages/editor/types'
import { DEFAULT_DESIGN } from '../../pages/editor/types'
import type { TemplateId } from './templates/types'
import { resumeToLocalData, localDataToResumeUpdates, getDefaultLocalData } from './utils/resumeBridge'
import PdfDocumentEditor from '../pdf-editor/PdfDocumentEditor'
import EditorToolbar from './components/EditorToolbar'
import EditableResumeView from './components/EditableResumeView'
import PreviewPane from './components/PreviewPane'
import FloatingPanel from './components/FloatingPanel'
import AiDrawer from './components/AiDrawer'
import CommandPalette from './components/CommandPalette'
import ExportPopover from './components/ExportPopover'
import ExtractionNotification from './components/ExtractionNotification'
import AiChatPanel from './components/AiChatPanel'
import StylesPanel from './components/StylesPanel'
import SectionsPanel from './components/SectionsPanel'
import useEditorKeyboard from './hooks/useEditorKeyboard'

function LoadingState() {
  return (
    <div className="flex flex-col h-screen bg-surface">
      <div className="h-12 bg-white border-b border-border flex items-center justify-between px-4 shrink-0">
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
  const extractLayout = useExtractLayout()
  const saveLayoutDoc = useSaveLayoutDocument()

  const [localData, setLocalData] = useState<LocalData | null>(null)
  const [templateId, setTemplateId] = useState<TemplateId>('minimal')
  const [design, setDesign] = useState<DesignSettings>(DEFAULT_DESIGN)
  const [saved, setSaved] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<'styles' | 'sections' | 'ai'>('styles')
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [exportPopoverOpen, setExportPopoverOpen] = useState(false)
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiVariations, setAiVariations] = useState<string[]>([])
  const [showExtractionNote, setShowExtractionNote] = useState(true)
  const [parsing, setParsing] = useState(false)
  const [extractingLayout, setExtractingLayout] = useState(false)
  const [layoutDoc, setLayoutDoc] = useState<PdfLayoutDocument | null>(null)
  const [pdfZoom, setPdfZoom] = useState(1)
  const [debugMode, setDebugMode] = useState(false)

  const analyzeResume = useAnalyzeResume()
  const saveAttemptRef = useRef(0)

  const isUploadSource = resume?.source === 'upload'

  useEditorKeyboard({
    onSave: forceSave,
    onUndo: () => {},
    onRedo: () => {},
    onToggleCommandPalette: () => setCommandPaletteOpen(o => !o),
    onToggleEditMode: () => {},
    onToggleStyles: () => openPanel('styles'),
    onToggleSections: () => openPanel('sections'),
    onToggleAi: () => openPanel('ai'),
    onClosePanels: () => { setPanelOpen(false); setExportPopoverOpen(false); setCommandPaletteOpen(false) },
    onZoomIn: () => {},
    onZoomOut: () => {},
    onZoomReset: () => {},
  })

  useEffect(() => {
    if (resume) {
      const savedLayout = resume.layoutDocument as PdfLayoutDocument | undefined
      if (savedLayout) setLayoutDoc(savedLayout)

      const savedDesign = (resume as any).design as DesignSettings | undefined
      const savedTemplate = (resume as any).templateId as string | undefined
      const savedSectionOrder = (resume as any).sectionOrder as string[] | undefined
      setLocalData(resumeToLocalData(resume, savedDesign, savedSectionOrder))
      if (savedTemplate && isTemplateId(savedTemplate)) setTemplateId(savedTemplate)
      if (savedDesign) setDesign(savedDesign)
    }
  }, [resume])

  useEffect(() => {
    if (resume?.rawText && !resume.experience?.length && !parsing) {
      setParsing(true)
      analyzeResume.mutate(id!, {
        onSettled: () => {
          setParsing(false)
          setShowExtractionNote(true)
        },
      })
    }
  }, [resume?.rawText, resume?.experience?.length])

  useEffect(() => {
    if (isUploadSource && resume && !resume.layoutDocument && !extractingLayout) {
      setExtractingLayout(true)
      extractLayout.mutate(id!, {
        onSuccess: (doc) => setLayoutDoc(doc),
        onSettled: () => setExtractingLayout(false),
      })
    }
  }, [isUploadSource, resume, extractingLayout, id])

  useEffect(() => {
    if (!saved && id && localData) {
      const attempt = ++saveAttemptRef.current
      const timer = setTimeout(async () => {
        try {
          const updates = localDataToResumeUpdates(localData)
          await updateResume.mutateAsync({ id, data: { ...updates, templateId, design } })
          if (saveAttemptRef.current === attempt) setSaved(true)
        } catch {
          if (saveAttemptRef.current === attempt) setSaved(false)
        }
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [saved, id, localData, templateId, design, updateResume])

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!saved) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saved])

  async function forceSave() {
    if (!id || !localData) return
    const updates = localDataToResumeUpdates(localData)
    try {
      await updateResume.mutateAsync({ id, data: { ...updates, templateId, design } })
      setSaved(true)
    } catch {
      setSaved(false)
    }
  }

  function openPanel(tab: 'styles' | 'sections' | 'ai') {
    if (panelOpen && panelTab === tab) setPanelOpen(false)
    else { setPanelTab(tab); setPanelOpen(true) }
  }

  function handleLocalDataChange(data: LocalData) {
    setLocalData(data)
    setSaved(false)
  }

  function handleLayoutDocSave(updatedDoc: PdfLayoutDocument) {
    setLayoutDoc(updatedDoc)
    saveLayoutDoc.mutate({ id: id!, layoutDocument: updatedDoc })
  }

  async function handleAiRewrite(text: string) {
    setAiLoading(true)
    setAiVariations([])
    setAiDrawerOpen(true)
    try {
      const variations = await AiService.rewrite(text)
      setAiVariations(variations)
    } catch {
      setAiVariations(['An error occurred. Please try again.'])
    } finally {
      setAiLoading(false)
    }
  }

  async function handleAiImprove(text: string) {
    setAiLoading(true)
    setAiVariations([])
    setAiDrawerOpen(true)
    try {
      const variations = await AiService.improve(text)
      setAiVariations(variations)
    } catch {
      setAiVariations(['An error occurred.'])
    } finally {
      setAiLoading(false)
    }
  }

  async function handleQuickAction(action: string) {
    const prompts: Record<string, string> = {
      'improve-summary': `Improve this resume summary: "${localData?.summary || ''}"`,
      'rewrite-weak': 'List 3 improvements for weak bullet points.',
      'suggest-skills': 'Suggest 5 relevant skills to add.',
      'ats-score': 'List 3 ATS optimization tips.',
    }
    const prompt = prompts[action]
    if (!prompt) return
    setAiDrawerOpen(true)
    setAiLoading(true)
    setAiVariations([])
    try {
      const result = await AiService.chat([
        { role: 'system', content: 'You are a resume expert. Provide concise, actionable advice.' },
        { role: 'user', content: prompt },
      ])
      const content = result.message?.content || ''
      setAiVariations(content.split('\n').filter((l: string) => l.trim().length > 5).slice(0, 5))
    } catch {
      setAiVariations(['An error occurred.'])
    } finally {
      setAiLoading(false)
    }
  }

  const commands = [
    { id: 'save', label: 'Save changes', action: forceSave },
    { id: 'open-styles', label: 'Open Styles panel', action: () => openPanel('styles') },
    { id: 'open-sections', label: 'Open Sections panel', action: () => openPanel('sections') },
    { id: 'open-ai', label: 'Open AI panel', action: () => openPanel('ai') },
    { id: 'export-pdf', label: 'Export as PDF', action: () => { setExportPopoverOpen(true) } },
    { id: 'go-back', label: 'Back to resumes', action: () => navigate('/resumes') },
  ]

  if (isLoading) return <LoadingState />
  if (!id) { navigate('/resumes', { replace: true }); return null }

  const currentData = localData || getDefaultLocalData()

  if (isUploadSource) {
    return (
      <div className="flex flex-col h-screen bg-surface">
        <EditorToolbar
          resumeTitle={resume?.title || 'Untitled'}
          saved={saved}
          onSave={forceSave}
          onOpenPanel={openPanel}
          activePanel={panelOpen ? panelTab : null}
          onExport={() => setExportPopoverOpen(o => !o)}
          onBack={() => navigate('/resumes')}
          zoom={{
            zoom: pdfZoom,
            onZoomIn: () => setPdfZoom(z => Math.min(2, z + 0.1)),
            onZoomOut: () => setPdfZoom(z => Math.max(0.25, z - 0.1)),
            onZoomReset: () => setPdfZoom(1),
          }}
          debugMode={debugMode}
          onDebugToggle={() => setDebugMode(d => !d)}
        />

        <ExtractionNotification
          visible={showExtractionNote && !!resume?.rawText}
          onDismiss={() => setShowExtractionNote(false)}
        />

        {extractingLayout && (
          <div className="flex items-center justify-center py-4 bg-amber/5 border-b border-amber/20 shrink-0">
            <div className="flex items-center gap-2 text-[12px] text-amber">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Extracting layout from PDF...
            </div>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden relative">
          {layoutDoc && (
            <PdfDocumentEditor
              layoutDocument={layoutDoc}
              onSave={handleLayoutDocSave}
              onAiRewrite={handleAiRewrite}
              onAiImprove={handleAiImprove}
              zoom={pdfZoom}
              onZoomChange={setPdfZoom}
              fileUrl={resume?.fileUrl}
              debugMode={debugMode}
            />
          )}

          {!layoutDoc && !extractingLayout && (
            <div className="flex-1 flex items-center justify-center text-sm text-muted">
              <p>No layout data available. This PDF may be a scanned image.</p>
            </div>
          )}

          <AnimatePresence>
            {panelOpen && (
              <FloatingPanel
                tab={panelTab}
                onClose={() => setPanelOpen(false)}
                side={panelTab === 'ai' ? 'left' : 'right'}
              >
                {panelTab === 'styles' && (
                  <StylesPanel
                    templateId={templateId}
                    design={design}
                    onTemplateChange={setTemplateId}
                    onDesignChange={d => { setDesign(d); setSaved(false) }}
                  />
                )}
                {panelTab === 'sections' && (
                  <SectionsPanel
                    data={currentData}
                    onUpdate={handleLocalDataChange}
                  />
                )}
                {panelTab === 'ai' && (
                  <AiChatPanel
                    data={currentData}
                    onUpdate={handleLocalDataChange}
                  />
                )}
              </FloatingPanel>
            )}
          </AnimatePresence>
        </div>

        <AiDrawer
          open={aiDrawerOpen}
          loading={aiLoading}
          variations={aiVariations}
          onSelect={() => setAiDrawerOpen(false)}
          onRegenerate={() => {}}
          onClose={() => setAiDrawerOpen(false)}
        />

        <ExportPopover
          open={exportPopoverOpen}
          onClose={() => setExportPopoverOpen(false)}
          onExportPdf={() => window.open(`/api/export/${id}`, '_blank')}
          onExportDocx={async () => {}}
          onExportDrive={async () => {}}
        />

        <CommandPalette
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          commands={commands}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-surface">
      <EditorToolbar
        resumeTitle={resume?.title || 'Untitled'}
        saved={saved}
        onSave={forceSave}
        onOpenPanel={openPanel}
        activePanel={panelOpen ? panelTab : null}
        onExport={() => setExportPopoverOpen(o => !o)}
        onBack={() => navigate('/resumes')}
      />

      <ExtractionNotification
        visible={showExtractionNote && !!resume?.rawText}
        onDismiss={() => setShowExtractionNote(false)}
      />

      {parsing && (
        <div className="flex items-center justify-center py-4 bg-amber/5 border-b border-amber/20 shrink-0">
          <div className="flex items-center gap-2 text-[12px] text-amber">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Parsing resume content...
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[480px] min-w-[320px] overflow-y-auto border-r border-border bg-white">
            <div className="px-6 py-8">
              <EditableResumeView
                data={currentData}
                onUpdate={handleLocalDataChange}
                redFlags={resume?.redFlags || []}
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-[#D4CFC6]">
            <PreviewPane
              data={currentData}
              design={design}
              templateId={templateId}
            />
          </div>
        </div>

        <AiDrawer
          open={aiDrawerOpen}
          loading={aiLoading}
          variations={aiVariations}
          onSelect={() => setAiDrawerOpen(false)}
          onRegenerate={() => {}}
          onClose={() => setAiDrawerOpen(false)}
        />

        <AnimatePresence>
          {panelOpen && (
            <FloatingPanel
              tab={panelTab}
              onClose={() => setPanelOpen(false)}
              side={panelTab === 'ai' ? 'left' : 'right'}
            >
              {panelTab === 'styles' && (
                <StylesPanel
                  templateId={templateId}
                  design={design}
                  onTemplateChange={setTemplateId}
                  onDesignChange={d => { setDesign(d); setSaved(false) }}
                />
              )}
              {panelTab === 'sections' && (
                <SectionsPanel
                  data={currentData}
                  onUpdate={handleLocalDataChange}
                />
              )}
              {panelTab === 'ai' && (
                <AiChatPanel
                  data={currentData}
                  onUpdate={handleLocalDataChange}
                />
              )}
            </FloatingPanel>
          )}
        </AnimatePresence>
      </div>

      <ExportPopover
        open={exportPopoverOpen}
        onClose={() => setExportPopoverOpen(false)}
        onExportPdf={() => window.open(`/api/export/${id}`, '_blank')}
        onExportDocx={async () => {}}
        onExportDrive={async () => {}}
      />

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={commands}
      />
    </div>
  )
}

const TEMPLATE_IDS: TemplateId[] = ['minimal', 'modern', 'executive', 'compact', 'classic', 'sidebar', 'bold', 'creative', 'tech', 'academic', 'charter', 'prestige', 'engineer', 'contemporary', 'folio']

function isTemplateId(v: string): v is TemplateId {
  return (TEMPLATE_IDS as string[]).includes(v)
}
