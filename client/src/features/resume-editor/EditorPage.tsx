import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useResume, useUpdateResume } from '../../lib/queries'
import { AiService } from '../../lib/ai'
import EditorToolbar from './components/EditorToolbar'
import EditorCanvas from './components/EditorCanvas'
import FloatingPanel from './components/FloatingPanel'
import SelectionToolbar from './components/SelectionToolbar'
import AiDrawer from './components/AiDrawer'
import CommandPalette from './components/CommandPalette'
import ExportPopover from './components/ExportPopover'
import ExtractionNotification from './components/ExtractionNotification'
import AiPanel from './components/AiPanel'
import SuggestionTray from './components/SuggestionTray'
import PdfEditor from './components/PdfEditor'
import FontsPanel from './components/FontsPanel'
import DataPanel from './components/DataPanel'
import useEditorKeyboard from './hooks/useEditorKeyboard'
import type { DocumentFontDefaults, PdfDocumentData } from './types/pdf'

const DEFAULT_FONTS: DocumentFontDefaults = {
  fontName: 'Helvetica',
  fontSize: 11,
  fontColor: '#000000',
  lineSpacing: 1.2,
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
  const [saved, setSaved] = useState(true)
  const [zoom, setZoom] = useState(0.75)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<'styles' | 'sections' | 'ai'>('styles')
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [exportPopoverOpen, setExportPopoverOpen] = useState(false)
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiVariations, setAiVariations] = useState<string[]>([])
  const [showExtractionNote, setShowExtractionNote] = useState(true)
  const [fontDefaults, setFontDefaults] = useState<DocumentFontDefaults>(DEFAULT_FONTS)
  const [regionData, setRegionData] = useState<PdfDocumentData | null>(null)
  const saveAttemptRef = useRef(0)

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
    onZoomIn: () => setZoom(z => Math.min(2, z + 0.1)),
    onZoomOut: () => setZoom(z => Math.max(0.3, z - 0.1)),
    onZoomReset: () => setZoom(0.75),
  })

  const hasEdits = regionData?.pages.some(p => p.regions.some(r => r.edited))

  useEffect(() => {
    if (!saved && id && hasEdits && regionData) {
      const attempt = ++saveAttemptRef.current
      const timer = setTimeout(async () => {
        try {
          await updateResume.mutateAsync({
            id,
            data: { pdfRegions: JSON.stringify(regionData) },
          })
          if (saveAttemptRef.current === attempt) setSaved(true)
        } catch {
          if (saveAttemptRef.current === attempt) setSaved(false)
        }
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [saved, id, regionData, hasEdits, updateResume])

  useEffect(() => {
    if (resume && (resume as any).pdfRegions) {
      try {
        const parsed = JSON.parse((resume as any).pdfRegions)
        setRegionData(parsed)
        if (parsed.fontDefaults) setFontDefaults(parsed.fontDefaults)
      } catch { /* ignore parse errors */ }
    }
  }, [resume])

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!saved) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saved])

  function forceSave() {
    if (!id) return
    const data: Record<string, unknown> = {}
    if (regionData) data.pdfRegions = JSON.stringify(regionData)
    updateResume.mutate({ id, data })
    setSaved(true)
  }

  function openPanel(tab: 'styles' | 'sections' | 'ai') {
    if (panelOpen && panelTab === tab) {
      setPanelOpen(false)
    } else {
      setPanelTab(tab)
      setPanelOpen(true)
    }
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
      'improve-summary': `Improve this resume summary: "${resume?.summary || ''}"`,
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

  function handleRegionDataChange(data: PdfDocumentData | null) {
    setRegionData(data)
    setSaved(false)
  }

  function handleUpdateStructuredField(field: string, value: string) {
    console.log('Update field:', field, value)
  }

  const commands = [
    { id: 'save', label: 'Save changes', action: forceSave },
    { id: 'open-styles', label: 'Open Fonts panel', action: () => openPanel('styles') },
    { id: 'open-sections', label: 'Open Data panel', action: () => openPanel('sections') },
    { id: 'open-ai', label: 'Open AI panel', action: () => openPanel('ai') },
    { id: 'export-pdf', label: 'Export as PDF', action: () => { setExportPopoverOpen(true) } },
    { id: 'zoom-in', label: 'Zoom in', action: () => setZoom(z => Math.min(2, z + 0.1)) },
    { id: 'zoom-out', label: 'Zoom out', action: () => setZoom(z => Math.max(0.3, z - 0.1)) },
    { id: 'go-back', label: 'Back to resumes', action: () => navigate('/resumes') },
  ]

  if (isLoading) return <LoadingState />
  if (!id) { navigate('/resumes', { replace: true }); return null }

  const hasPdf = !!(resume?.fileUrl || resume?.filename)

  return (
    <div className="flex flex-col h-screen bg-[#D4CFC6]">
      <EditorToolbar
        resumeTitle={resume?.title || 'Untitled'}
        saved={saved}
        onSave={forceSave}
        zoom={zoom}
        onZoomIn={() => setZoom(z => Math.min(2, z + 0.1))}
        onZoomOut={() => setZoom(z => Math.max(0.3, z - 0.1))}
        onZoomReset={() => setZoom(0.75)}
        onOpenPanel={openPanel}
        activePanel={panelOpen ? panelTab : null}
        onExport={() => setExportPopoverOpen(o => !o)}
        onBack={() => navigate('/resumes')}
      />

      <ExtractionNotification
        visible={showExtractionNote && !!resume?.rawText}
        onDismiss={() => setShowExtractionNote(false)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <EditorCanvas zoom={zoom}>
          {hasPdf ? (
            <PdfEditor
              resumeId={id}
              fileUrl={resume?.fileUrl}
              fontDefaults={fontDefaults}
              onFontDefaultsChange={setFontDefaults}
              onRegionsChange={handleRegionDataChange}
              initialRegionData={regionData}
            />
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8">
              <p className="text-sm text-muted mb-3">No PDF uploaded yet</p>
              <SuggestionTray suggestions={[]} onApply={() => {}} onDismiss={() => {}} />
            </div>
          )}
        </EditorCanvas>

        <SelectionToolbar
          onRewrite={handleAiRewrite}
          onImprove={handleAiImprove}
        />

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
            >
              {panelTab === 'styles' && (
                <FontsPanel
                  fontDefaults={fontDefaults}
                  docData={regionData}
                  onApplyDefaults={setFontDefaults}
                  onResetRegion={(page, regionId) => {
                    setRegionData(prev => {
                      if (!prev) return prev
                      return {
                        ...prev,
                        pages: prev.pages.map(p =>
                          p.pageNumber !== page ? p : {
                            ...p,
                            regions: p.regions.map(r =>
                              r.id !== regionId ? r : {
                                ...r,
                                edited: false,
                                fontName: r.originalFontName,
                                fontSize: r.originalFontSize,
                                fontColor: r.originalFontColor,
                              }
                            ),
                          }
                        ),
                      }
                    })
                  }}
                />
              )}
              {panelTab === 'sections' && (
                <DataPanel
                  resume={resume}
                  onUpdateField={handleUpdateStructuredField}
                />
              )}
              {panelTab === 'ai' && (
                <AiPanel
                  score={resume?.overallScore}
                  strengths={resume?.strengths}
                  issues={resume?.redFlags?.map((f: any) => f.message)}
                  onQuickAction={handleQuickAction}
                />
              )}
            </FloatingPanel>
          )}
        </AnimatePresence>
      </div>

      <ExportPopover
        open={exportPopoverOpen}
        onClose={() => setExportPopoverOpen(false)}
        onExportPdf={() => window.open(`/export/${id}`, '_blank')}
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
