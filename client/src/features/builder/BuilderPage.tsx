import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { IconLoader2, IconBug } from '@tabler/icons-react'
import { useAuth } from '../../hooks/useAuth'
import { useBuilderStore } from './hooks/useBuilderStore'
import { showToast } from '../../components/ui/toast'
import type { TemplateId } from '../resume-editor/templates/types'
import type { DesignSettings } from '../../pages/editor/types'
import type { BasicsData, TargetRoleData, EducationEntry, OptionalData, ExperienceRole } from './types'
import Step0TemplateSelection from './components/Step0TemplateSelection'
import WizardLayout from './components/WizardLayout'
import ChatLayout from './components/ChatLayout'
import DebugPanel from './components/DebugPanel'
import EditorToolbar from '../resume-editor/components/EditorToolbar'
import FloatingPanel from '../resume-editor/components/FloatingPanel'
import StylesPanel from '../resume-editor/components/StylesPanel'
import ExportPopover from '../resume-editor/components/ExportPopover'
import api from '../../lib/api'

type BuilderMode = 'wizard' | 'chat' | null

export default function BuilderPage() {
  const { resumeId } = useParams<{ resumeId: string }>()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [mode, setMode] = useState<BuilderMode>(null)
  const [ready, setReady] = useState(false)
  const [hydrating, setHydrating] = useState(false)
  const [hydrationFailed, setHydrationFailed] = useState(false)
  const [creating, setCreating] = useState(false)
  const [pdfZoom, setPdfZoom] = useState(1)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<'styles' | 'sections' | 'ai'>('styles')
  const [exportPopoverOpen, setExportPopoverOpen] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)

  const store = useBuilderStore()
  const hydrateStore = store.hydrate
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (useBuilderStore.persist.hasHydrated()) setHydrated(true)
    const unsub = useBuilderStore.persist.onFinishHydration(() => {
      setHydrated(true)
      console.log('[builder] persist hydrated', useBuilderStore.getState())
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true })
  }, [user, loading, navigate])

  useEffect(() => {
    if (!loading && user && hydrated) {
      setReady(true)
    }
  }, [loading, user, hydrated])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setDebugOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (resumeId && user) {
      setHydrating(true)
      api.get(`/builder/${resumeId}`).then(({ data }) => {
        const resume = data.data
        if (resume?.wizardState) {
          hydrateStore({
            resumeId: resume._id,
            selectedTemplate: resume.wizardState.selectedTemplate || null,
            currentStep: resume.wizardState.currentStep || 0,
            completedSteps: resume.wizardState.completedSteps || [],
            stepData: {
              basics: resume.wizardState.stepData?.basics || null,
              targetRole: resume.wizardState.stepData?.targetRole || null,
              summary: resume.wizardState.stepData?.summary || null,
              experience: resume.wizardState.stepData?.experience || [],
              education: resume.wizardState.stepData?.education || [],
              skills: resume.wizardState.stepData?.skills || [],
              optional: resume.wizardState.stepData?.optional || null,
            },
            isComplete: resume.wizardState.isComplete || false,
          })
          if (resume.wizardState.currentStep > 0) setMode('wizard')
        }
      }).catch(() => {
        showToast('error', 'Failed to load resume', 'Please try again.')
        setHydrationFailed(true)
      }).finally(() => setHydrating(false))
    }
  }, [resumeId, user])

  const handleOpenPanel = (tab: 'styles' | 'sections' | 'ai') => {
    if (panelOpen && panelTab === tab) { setPanelOpen(false); return }
    setPanelTab(tab)
    setPanelOpen(true)
  }

  const saveState = () => {
    const s = useBuilderStore.getState()
    if (!s.resumeId || !user) return
      api.patch(`/builder/${s.resumeId}/state`, {
        wizardState: {
          currentStep: s.currentStep,
          completedSteps: s.completedSteps,
          stepData: s.stepData,
          isComplete: s.isComplete,
          selectedTemplate: s.selectedTemplate,
          design: s.design,
        },
      }).catch(() => showToast('error', 'Failed to save', 'Your changes may not be persisted.'))
  }

  const handleMarkComplete = async () => {
    store.markComplete()
    saveState()
    const sid = useBuilderStore.getState().resumeId
    try { await api.post(`/builder/${sid}/finish`) } catch {
      showToast('error', 'Failed to finalize resume', 'Try finishing again.')
    }
    navigate(`/resume/${sid}`, { replace: true })
  }

  const handleDesignChange = (d: DesignSettings) => {
    store.setDesign(d)
    saveState()
  }

  if (loading || !user) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <IconLoader2 size={28} className="text-teal animate-spin" />
          <span className="text-[13px] text-muted">Loading...</span>
        </div>
      </div>
    )
  }

  if (!ready || hydrating) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <IconLoader2 size={28} className="text-teal animate-spin" />
          <span className="text-[13px] text-muted">{hydrating ? 'Loading your session...' : 'Preparing...'}</span>
        </div>
      </div>
    )
  }

  if ((!resumeId || hydrationFailed) && !store.selectedTemplate) {
    return (
      <Step0TemplateSelection
        selected={store.selectedTemplate}
        onSelect={async (id: TemplateId) => {
          if (!resumeId || hydrationFailed) {
            setCreating(true)
            setHydrationFailed(false)
            try {
              const { data } = await api.post('/builder/start')
              const newId = data.data.resumeId
              // Save template to server first so hydration picks it up
              await api.patch(`/builder/${newId}/state`, {
                wizardState: {
                  selectedTemplate: id,
                  currentStep: store.currentStep,
                  completedSteps: store.completedSteps,
                  stepData: store.stepData,
                  isComplete: store.isComplete,
                },
              })
              // Only set local state after server confirms everything
              store.setTemplate(id)
              store.setResumeId(newId)
              navigate(`/resumes/builder/${newId}`, { replace: true })
            } catch {
              showToast('error', 'Failed to start session', 'Please try again.')
            } finally {
              setCreating(false)
            }
          }
        }}
        creating={creating}
      />
    )
  }

  if (store.isComplete && store.resumeId) {
    navigate(`/resume/${store.resumeId}`, { replace: true })
    return null
  }

  // Mode selection screen
  if (!mode) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="max-w-[600px] w-full text-center mb-10">
          <h1 className="font-display text-[28px] text-ink mb-2">
            How do you want to build your resume?
          </h1>
          <p className="text-[14px] text-muted">
            You picked the {store.selectedTemplate} template. Now choose your approach.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-5 max-w-[600px] w-full">
          <button
            onClick={() => { setMode('wizard'); store.goToStep(1) }}
            className="group text-left p-6 bg-white rounded-xl border-2 border-border hover:border-teal/40 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center mb-4 group-hover:bg-teal/20 transition-colors">
              <span className="text-[18px]">📋</span>
            </div>
            <h3 className="text-[15px] font-semibold text-ink mb-1">Step-by-step wizard</h3>
            <p className="text-[12px] text-muted leading-relaxed">
              Answer a few questions about your background, skills, and experience. We&apos;ll guide you through every section.
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              {['8 steps', '~15 min', 'AI-assisted'].map(tag => (
                <span key={tag} className="text-[9px] px-2 py-0.5 bg-paper text-muted rounded-full border border-border">
                  {tag}
                </span>
              ))}
            </div>
          </button>
          <button
            onClick={() => setMode('chat')}
            className="group text-left p-6 bg-white rounded-xl border-2 border-border hover:border-teal/40 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-teal flex items-center justify-center mb-4 group-hover:bg-teal-dark transition-colors">
              <span className="text-[18px]">💬</span>
            </div>
            <h3 className="text-[15px] font-semibold text-ink mb-1">Chat with AI</h3>
            <p className="text-[12px] text-muted leading-relaxed">
              Just tell the AI what to do in plain English. Add experience, write a summary, fix typos — anything.
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              {['Free-form', 'Real-time preview', 'Edit anything'].map(tag => (
                <span key={tag} className="text-[9px] px-2 py-0.5 bg-teal/5 text-teal rounded-full border border-teal/20">
                  {tag}
                </span>
              ))}
            </div>
          </button>
        </div>
      </div>
    )
  }

  const commonCallbacks = {
    onSetTemplate: store.setTemplate,
    onDesignChange: handleDesignChange,
    onSetBasics: (data: BasicsData) => { store.setBasics(data); saveState() },
    onSetTargetRole: (data: TargetRoleData) => { store.setTargetRole(data); saveState() },
    onSetSummary: (text: string, accepted: boolean) => { store.setSummary(text, accepted); saveState() },
    onAddExperience: (role: ExperienceRole) => { store.addExperience(role); saveState() },
    onUpdateExperienceBullets: (index: number, bullets: string[]) => { store.updateExperienceBullets(index, bullets); saveState() },
    onRemoveExperience: (index: number) => { store.removeExperience(index); saveState() },
    onSetExperience: (exp: ExperienceRole[]) => { store.setExperience(exp); saveState() },
    onSetEducation: (data: EducationEntry[]) => { store.setEducation(data); saveState() },
    onSetSkills: (skills: string[]) => { store.setSkills(skills); saveState() },
    onSetOptional: (data: OptionalData) => { store.setOptional(data); saveState() },
  }

  const toolbarTitle = store.stepData.basics?.name || store.selectedTemplate || 'Builder'

  const canUndo = store._history.length > 0
  const canRedo = store._future.length > 0

  const innerContent = mode === 'chat' ? (
    <ChatLayout
      stepData={store.stepData}
      selectedTemplate={store.selectedTemplate}
      design={store.design}
      resumeId={store.resumeId}
      zoom={pdfZoom}
      onMarkComplete={handleMarkComplete}
      {...commonCallbacks}
    />
  ) : (
    <WizardLayout
      stepData={store.stepData}
      currentStep={store.currentStep}
      completedSteps={store.completedSteps}
      staleSteps={store.staleSteps}
      selectedTemplate={store.selectedTemplate}
      design={store.design}
      zoom={pdfZoom}
      streamingSection={store.streamingSection}
      streamingText={store.streamingText}
      streamingBullets={store.streamingBullets}
      onGoToStep={store.goToStep}
      onCompleteStep={(n) => { store.completeStep(n); saveState() }}
      onMarkComplete={handleMarkComplete}
      onSetStreamingText={store.setStreamingText}
      onSetStreamingSection={store.setStreamingSection}
      onSetStreamingBullets={store.setStreamingBullets}
      onAcceptStream={store.acceptStream}
      {...commonCallbacks}
    />
  )

  return (
    <div className="h-screen flex flex-col bg-white">
      <EditorToolbar
        resumeTitle={toolbarTitle}
        saved={true}
        onSave={() => saveState()}
        onBack={() => navigate('/resumes')}
        onOpenPanel={handleOpenPanel}
        activePanel={panelOpen ? panelTab : null}
        onExport={() => setExportPopoverOpen(true)}
        undoRedo={{
          onUndo: store.undo,
          onRedo: store.redo,
          canUndo,
          canRedo,
        }}
        zoom={{
          zoom: pdfZoom,
          onZoomIn: () => setPdfZoom(z => Math.min(2, z + 0.1)),
          onZoomOut: () => setPdfZoom(z => Math.max(0.25, z - 0.1)),
          onZoomReset: () => setPdfZoom(1),
        }}
      />
      <div className="flex-1 flex overflow-hidden relative">
        {innerContent}
        <AnimatePresence>
          {panelOpen && (
            <FloatingPanel tab={panelTab} onClose={() => setPanelOpen(false)}>
              {panelTab === 'styles' && (
                <StylesPanel
                  templateId={store.selectedTemplate || 'minimal'}
                  design={store.design}
                  onTemplateChange={store.setTemplate}
                  onDesignChange={handleDesignChange}
                />
              )}
            </FloatingPanel>
          )}
        </AnimatePresence>
      </div>
      <ExportPopover
        open={exportPopoverOpen}
        onClose={() => setExportPopoverOpen(false)}
        onExportPdf={() => store.resumeId && window.open(`/export/${store.resumeId}`, '_blank')}
        onExportDocx={async () => {}}
        onExportDrive={async () => {}}
      />

      {debugOpen && <DebugPanel />}

      {!debugOpen && (
        <button
          onClick={() => setDebugOpen(true)}
          className="fixed bottom-4 right-4 z-50 w-8 h-8 rounded-full bg-ink/80 text-white flex items-center justify-center hover:bg-ink transition-colors shadow-lg"
          title="Toggle debug panel (Ctrl+Shift+D)"
        >
          <IconBug size={14} />
        </button>
      )}
    </div>
  )
}
