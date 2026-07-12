import { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconEdit, IconEye, IconX } from '@tabler/icons-react'
import type { TemplateId } from '../../resume-editor/templates/types'
import type { DesignSettings } from '../../../pages/editor/types'
import { getDefaultLocalData, getSampleLocalData } from '../../resume-editor/utils/resumeBridge'
import PreviewPane from '../../resume-editor/components/PreviewPane'
import ProgressIndicator from './ProgressIndicator'
import ContextCard from './ContextCard'
import Step1Basics from './Step1Basics'
import Step2TargetRole from './Step2TargetRole'
import Step3Summary from './Step3Summary'
import Step4Experience from './Step4Experience'
import Step5Education from './Step5Education'
import Step6Skills from './Step6Skills'
import Step7Optional from './Step7Optional'
import Step8Review from './Step8Review'
import type { BuilderStepData, BasicsData, TargetRoleData, EducationEntry, OptionalData, ExperienceRole } from '../types'
import { STEP_LABELS, buildSectionOrder } from '../types'

interface Props {
  stepData: BuilderStepData
  currentStep: number
  completedSteps: number[]
  staleSteps: number[]
  selectedTemplate: TemplateId | null
  design: DesignSettings
  zoom: number
  streamingSection: 'summary' | 'experience' | null
  streamingText: string
  streamingBullets: string[]
  onSetTemplate: (id: TemplateId) => void
  onGoToStep: (n: number) => void
  onCompleteStep: (n: number) => void
  onSetBasics: (data: BasicsData) => void
  onSetTargetRole: (data: TargetRoleData) => void
  onSetSummary: (text: string, accepted: boolean) => void
  onAddExperience: (role: ExperienceRole & { bullets: string[] }) => void
  onUpdateExperienceBullets: (index: number, bullets: string[]) => void
  onRemoveExperience: (index: number) => void
  onSetEducation: (data: EducationEntry[]) => void
  onSetSkills: (skills: string[]) => void
  onSetOptional: (data: OptionalData) => void
  onMarkComplete: () => void
  onSetStreamingText: (text: string) => void
  onSetStreamingSection: (section: 'summary' | 'experience' | null) => void
  onSetStreamingBullets: (bullets: string[]) => void
  onAcceptStream: () => void
}

export default function WizardLayout(props: Props) {
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)
  const [mobilePreviewVisible, setMobilePreviewVisible] = useState(false)

  useEffect(() => {
    const check = () => setMobilePreviewVisible(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const {
    stepData, currentStep, completedSteps, selectedTemplate, design, zoom,
    streamingSection, streamingText, streamingBullets,
    staleSteps,
    onGoToStep, onCompleteStep,
    onSetBasics, onSetTargetRole, onSetSummary, onAddExperience,
    onUpdateExperienceBullets, onRemoveExperience,
    onSetEducation, onSetSkills, onSetOptional, onMarkComplete,
    onSetStreamingText,
  } = props

  const hasStreamingExp = streamingSection === 'experience' && streamingBullets.length > 0

  // Build LocalData for canvas from accumulated step data
  const localData = useMemo(() => {
    const empty = getDefaultLocalData()
    const hasData = stepData.basics !== null || stepData.summary !== null || stepData.experience.length > 0 || stepData.education.length > 0 || stepData.skills.length > 0 || stepData.optional !== null
    const defaults = hasData ? empty : getSampleLocalData()
    const basics = stepData.basics
    const summary = stepData.summary
    const education = stepData.education
    const optional = stepData.optional

    return {
      ...defaults,
      name: basics?.name || defaults.name,
      title: basics?.headline || defaults.title,
      contact: {
        email: basics?.email || defaults.contact.email,
        phone: basics?.phone || defaults.contact.phone,
        location: basics?.location || defaults.contact.location,
        linkedin: basics?.linkedin || defaults.contact.linkedin,
        website: basics?.website || defaults.contact.website,
        github: basics?.github || defaults.contact.github,
      },
      summary: streamingSection === 'summary' ? streamingText : (summary?.text || defaults.summary),
      experience: hasStreamingExp
        ? [...stepData.experience.map(e => ({
            company: e.company,
            title: e.title,
            startDate: e.startDate,
            endDate: e.endDate,
            current: e.current,
            bullets: e.bullets,
          })), { company: '', title: 'Generating bullets...', startDate: '', endDate: '', current: false, bullets: streamingBullets }]
        : stepData.experience.length > 0 ? stepData.experience.map(e => ({
        company: e.company,
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate,
        current: e.current,
        bullets: e.bullets,
      })) : defaults.experience,
      education: education.length > 0 ? education.map(e => ({
        institution: e.institution,
        degree: e.degree,
        field: e.field,
        startDate: e.startYear,
        endDate: e.inProgress ? undefined : e.endYear,
        gpa: e.gpa || undefined,
      })) : defaults.education,
      skills: stepData.skills.length > 0 ? stepData.skills.map(s => ({ name: s })) : defaults.skills,
      certifications: optional?.certifications ? (optional.certificationsData.map(c => ({ name: c.name, issuer: c.issuer, date: c.date }))) : defaults.certifications,
      languages: optional?.languages ? optional.languagesData : defaults.languages,
      links: defaults.links,
      sectionOrder: buildSectionOrder(stepData, streamingSection !== null),
      design: { ...design },
      editMode: 'guided' as const,
      customSections: [],
    }
  }, [stepData, design, streamingSection, streamingText, streamingBullets])

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left panel — wizard */}
      <div className="w-[400px] shrink-0 border-r border-border flex flex-col bg-white">
        <ProgressIndicator currentStep={currentStep} completedSteps={completedSteps} />

        <div className="flex-1 overflow-y-auto">
          {/* Completed steps (collapsed) */}
          {completedSteps.filter(s => s < currentStep && s > 0).map(step => (
            <CompletedStepCard
              key={step}
              step={step}
              stepData={stepData}
              isStale={staleSteps.includes(step)}
              onEdit={() => onGoToStep(step)}
            />
          ))}

          {/* Active step */}
          <div className="border-b border-border">
            <div className="px-6 pt-4 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-teal">
                Step {currentStep} of 8
              </span>
              <h3 className="text-[15px] font-semibold text-ink mt-0.5">
                {STEP_LABELS[currentStep] || ''}
              </h3>
            </div>
            {renderStep(currentStep)}
          </div>
        </div>
      </div>

      {/* Right panel — canvas */}
      <div className="hidden md:flex flex-1 bg-[#D4CFC6] overflow-y-auto">
        <div
          className="flex flex-col items-center justify-start py-8 min-h-full px-8"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        >
          <PreviewPane
            data={localData}
            design={design}
            templateId={selectedTemplate || 'minimal'}
          />
          <ContextCard targetRole={stepData.targetRole} />
        </div>
      </div>

      {/* Mobile canvas preview FAB */}
      {mobilePreviewVisible && (
        <button
          onClick={() => setMobilePreviewOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-teal text-white shadow-xl flex items-center justify-center hover:bg-teal-dark active:scale-95 transition-all"
          aria-label="Preview resume"
        >
          <IconEye size={22} />
        </button>
      )}

      {/* Mobile canvas fullscreen modal */}
      {mobilePreviewOpen && createPortal(
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-[13px] font-medium text-ink">Preview</span>
            <button
              onClick={() => setMobilePreviewOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-paper-dark transition-colors"
            >
              <IconX size={18} />
            </button>
          </div>
          <div className="flex-1 bg-[#D4CFC6] overflow-y-auto">
            <div className="flex flex-col items-center py-8 px-4 min-h-full">
              <PreviewPane
                data={localData}
                design={design}
                templateId={selectedTemplate || 'minimal'}
              />
              <ContextCard targetRole={stepData.targetRole} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )

  function renderStep(step: number) {
    const targetRole = stepData.targetRole

    switch (step) {
      case 1:
        return (
          <Step1Basics
            data={stepData.basics}
            onChange={(partial) => {
              const cur = stepData.basics || { name: '', headline: '', email: '', phone: '', location: '' }
              onSetBasics({ ...cur, ...partial } as BasicsData)
            }}
            onSave={(data) => { onSetBasics(data); onCompleteStep(1) }}
          />
        )
      case 2:
        return (
          <Step2TargetRole
            data={stepData.targetRole}
            onChange={(partial) => {
              // update via onSetTargetRole with merge (saves to store without completeStep)
              const cur = stepData.targetRole || { role: '', level: '', industry: '' }
              onSetTargetRole({ ...cur, ...partial } as TargetRoleData)
            }}
            onSave={(data) => { onSetTargetRole(data); onCompleteStep(2) }}
          />
        )
      case 3:
        return (
          <Step3Summary
            data={stepData.summary}
            targetRole={targetRole}
            onAccept={(text) => { onSetSummary(text, true); onCompleteStep(3) }}
            onGenerate={(text) => onSetStreamingText(text)}
          />
        )
      case 4:
        return (
          <Step4Experience
            data={stepData.experience}
            targetRole={targetRole}
            onAdd={(entry) => onAddExperience(entry)}
            onUpdateBullets={onUpdateExperienceBullets}
            onRemove={onRemoveExperience}
            onDone={() => onCompleteStep(4)}
          />
        )
      case 5:
        return (
          <Step5Education
            data={stepData.education}
            onChange={(entries) => onSetEducation(entries)}
            onSave={(data) => { onSetEducation(data); onCompleteStep(5) }}
          />
        )
      case 6:
        return (
          <Step6Skills
            skills={stepData.skills}
            targetRole={targetRole}
            onSkillsChange={onSetSkills}
            onDone={() => onCompleteStep(6)}
          />
        )
      case 7:
        return (
          <Step7Optional
            data={stepData.optional}
            onChange={(partial) => {
              const cur = stepData.optional || { certifications: false, certificationsData: [], languages: false, languagesData: [], projects: false, projectsData: [], volunteer: false, volunteerData: [], awards: false, awardsData: [] }
              onSetOptional({ ...cur, ...partial })
            }}
            onSave={(data) => { onSetOptional(data); onCompleteStep(7) }}
          />
        )
      case 8:
        return (
          <Step8Review
            stepData={stepData}
            onFinish={onMarkComplete}
          />
        )
      default:
        return null
    }
  }
}

function CompletedStepCard({ step, stepData, isStale, onEdit }: { step: number; stepData: BuilderStepData; isStale?: boolean; onEdit: () => void }) {
  const getSummary = () => {
    if (step === 1 && stepData.basics) return `${stepData.basics.name} — ${stepData.basics.headline || 'No title'}`
    if (step === 2 && stepData.targetRole) return stepData.targetRole.role
    if (step === 3 && stepData.summary) return stepData.summary.text.slice(0, 60) + '...'
    if (step === 4) return `${stepData.experience.length} role${stepData.experience.length !== 1 ? 's' : ''} added`
    if (step === 5) return `${stepData.education.length} entr${stepData.education.length !== 1 ? 'ies' : 'y'}`
    if (step === 6) return `${stepData.skills.length} skills`
    if (step === 7 && stepData.optional) return 'Optional sections added'
    return STEP_LABELS[step] || ''
  }

  return (
    <button
      onClick={onEdit}
      className={`w-full flex items-center justify-between px-6 py-3 border-b border-border/40 hover:bg-paper-dark/30 transition-colors group ${isStale ? 'bg-amber-50/60' : ''}`}
    >
      <div className="text-left">
        <span className={`text-[10px] uppercase tracking-wider ${isStale ? 'text-amber-600' : 'text-muted/60'}`}>
          {STEP_LABELS[step]}
          {isStale && ' \u2014 needs review'}
        </span>
        <p className="text-[12px] text-ink truncate max-w-[280px]">{getSummary()}</p>
      </div>
      <div className="flex items-center gap-2">
        {isStale && (
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Stale - may need regeneration" />
        )}
        <IconEdit size={14} className="text-muted/30 group-hover:text-teal transition-colors shrink-0" />
      </div>
    </button>
  )
}


