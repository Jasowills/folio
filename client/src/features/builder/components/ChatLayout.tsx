import { useMemo, useRef, useState, useCallback } from 'react'
import { IconMessage, IconArrowBackUp } from '@tabler/icons-react'
import type { TemplateId } from '../../resume-editor/templates/types'
import type { DesignSettings } from '../../../pages/editor/types'
import { getDefaultLocalData, getSampleLocalData } from '../../resume-editor/utils/resumeBridge'
import PreviewPane from '../../resume-editor/components/PreviewPane'
import ContextCard from './ContextCard'
import ChatInterface from './ChatInterface'
import type { BuilderStepData, BasicsData, TargetRoleData, EducationEntry, OptionalData, ExperienceRole, BuilderSnapshot } from '../types'
import { buildSectionOrder } from '../types'

interface Props {
  stepData: BuilderStepData
  selectedTemplate: TemplateId | null
  design: DesignSettings
  resumeId: string | null
  zoom: number
  onSetTemplate: (id: TemplateId) => void
  onDesignChange: (design: DesignSettings) => void
  onSetBasics: (data: BasicsData) => void
  onSetTargetRole: (data: TargetRoleData) => void
  onSetSummary: (text: string, accepted: boolean) => void
  onAddExperience: (role: ExperienceRole) => void
  onUpdateExperienceBullets: (index: number, bullets: string[]) => void
  onRemoveExperience: (index: number) => void
  onSetEducation: (data: EducationEntry[]) => void
  onSetExperience: (exp: ExperienceRole[]) => void
  onSetSkills: (skills: string[]) => void
  onSetOptional: (data: OptionalData) => void
  onMarkComplete: () => void
}

export default function ChatLayout(props: Props) {
  const {
    stepData, selectedTemplate, design, resumeId, zoom,
    onSetTemplate, onDesignChange, onSetBasics, onSetTargetRole, onSetSummary,
    onAddExperience, onUpdateExperienceBullets, onRemoveExperience,
    onSetEducation, onSetExperience, onSetSkills, onSetOptional,
    onMarkComplete,
  } = props

  const undoRef = useRef<{ snapshot: BuilderSnapshot; message: string } | null>(null)
  const [lastUndoable, setLastUndoable] = useState<{ message: string } | null>(null)

  const captureUndo = (actionMessage: string) => {
    undoRef.current = {
      snapshot: { stepData: structuredClone(stepData), design: { ...design }, selectedTemplate },
      message: actionMessage,
    }
    setLastUndoable({ message: actionMessage })
  }

  const applyUndo = useCallback(() => {
    const u = undoRef.current
    if (!u) return
    const { stepData: sd, design: d, selectedTemplate: st } = u.snapshot
    if (sd.basics) onSetBasics(sd.basics)
    if (sd.targetRole) onSetTargetRole(sd.targetRole)
    if (sd.summary) onSetSummary(sd.summary.text, sd.summary.accepted)
    onSetExperience(sd.experience)
    onSetEducation(sd.education)
    onSetSkills(sd.skills)
    if (sd.optional) onSetOptional(sd.optional)
    if (st) onSetTemplate(st)
    if (d) onDesignChange(d)
    undoRef.current = null
    setLastUndoable(null)
  }, [onSetBasics, onSetTargetRole, onSetSummary, onSetExperience, onSetEducation, onSetSkills, onSetOptional, onSetTemplate, onDesignChange])

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
      summary: summary?.text || defaults.summary,
      experience: stepData.experience.length > 0 ? stepData.experience.map(e => ({
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
      sectionOrder: buildSectionOrder(stepData, false),
      design: { ...design },
      editMode: 'guided' as const,
      customSections: [],
    }
  }, [stepData, design])

  const completedCount = Object.values(stepData).filter(v => {
    if (Array.isArray(v)) return v.length > 0
    if (v && typeof v === 'object' && 'text' in v) return !!(v as { text: string }).text
    return v !== null
  }).length

  const handleAction = (fn: string, params: Record<string, unknown>): string | void => {
    if (!params) { console.warn('[builder] handleAction called with no params for', fn); return }
    console.log('[builder] chat action', fn, params)

    const noopActions = ['generate_summary', 'generate_bullets']
    if (!noopActions.includes(fn)) {
      captureUndo(`I've applied the ${fn.replace(/_/g, ' ')} change. Undo?`)
    }

    switch (fn) {
      case 'set_basics':
        onSetBasics({
          name: (params.name as string) || '',
          headline: (params.headline as string) || '',
          email: (params.email as string) || '',
          phone: (params.phone as string) || '',
          location: (params.location as string) || '',
          linkedin: params.linkedin as string | undefined,
          github: params.github as string | undefined,
          website: params.website as string | undefined,
        })
        break
      case 'set_summary':
        onSetSummary((params.text as string) || '', true)
        break
      case 'add_experience':
        onAddExperience({
          company: (params.company as string) || '',
          title: (params.title as string) || '',
          startDate: (params.startDate as string) || '',
          endDate: (params.endDate as string) || '',
          current: (params.current as boolean) || false,
          location: (params.location as string) || '',
          bullets: (params.bullets as string[]) || [],
          rawNotes: (params.rawNotes as string) || '',
        })
        break
      case 'set_skills':
        onSetSkills((params.skills as string[]) || [])
        break
      case 'add_skill':
        if (params.skill && !stepData.skills.includes(params.skill as string)) {
          onSetSkills([...stepData.skills, params.skill as string])
        }
        break
      case 'remove_skill':
        if (params.skill) {
          onSetSkills(stepData.skills.filter(s => s !== params.skill))
        }
        break
      case 'set_target_role':
        onSetTargetRole({
          role: (params.role as string) || '',
          level: (params.level as string) || '',
          industry: (params.industry as string) || '',
          company: params.company as string | undefined,
          companyUrl: params.companyUrl as string | undefined,
          jobDescription: params.jobDescription as string | undefined,
        })
        break
      case 'remove_experience':
        if (typeof params.index === 'number') {
          onRemoveExperience(params.index as number)
        } else if (params.company) {
          const idx = stepData.experience.findIndex(e => e.company === params.company)
          if (idx !== -1) onRemoveExperience(idx)
        }
        break
      case 'update_experience_bullets':
        if (typeof params.index === 'number' && Array.isArray(params.bullets)) {
          onUpdateExperienceBullets(params.index as number, params.bullets as string[])
        }
        break
      case 'add_education':
        onSetEducation([
          ...stepData.education,
          {
            degree: (params.degree as string) || '',
            field: (params.field as string) || '',
            institution: (params.institution as string) || '',
            startYear: (params.startYear as string) || '',
            endYear: (params.endYear as string) || '',
            inProgress: (params.inProgress as boolean) || false,
            gpa: (params.gpa as string) || '',
          },
        ])
        break
      case 'remove_education':
        if (typeof params.index === 'number') {
          onSetEducation(stepData.education.filter((_, i) => i !== (params.index as number)))
        } else if (params.institution) {
          onSetEducation(stepData.education.filter(e => e.institution !== params.institution))
        }
        break
      case 'set_template':
        if (params.templateId) onSetTemplate(params.templateId as TemplateId)
        break
      case 'set_design': {
        const designChanges = (params.design as Partial<DesignSettings>) || {}
        const topLevelChanges: Record<string, unknown> = {}
        for (const key of ['primaryColor', 'headingFont', 'bodyFont', 'columnLayout', 'sectionSpacing', 'margins', 'lineSpacing', 'bodyFontSize'] as const) {
          if (key in params) topLevelChanges[key] = params[key]
        }
        const merged = { ...design, ...designChanges, ...topLevelChanges }
        if (Object.keys(designChanges).length > 0 || Object.keys(topLevelChanges).length > 0) {
          onDesignChange(merged)
        }
        break
      }
      case 'generate_summary':
        if (stepData.targetRole) {
          console.log('[builder] generate_summary triggered')
        }
        break
      case 'generate_bullets':
        if (typeof params.index === 'number' && stepData.experience[params.index as number]) {
          console.log('[builder] generate_bullets triggered for index', params.index)
        }
        break
      case 'set_optional':
        onSetOptional({
          certifications: (params.certifications as boolean) || false,
          certificationsData: (params.certificationsData as Array<{ name: string; issuer: string; date: string }>) || [],
          languages: (params.languages as boolean) || false,
          languagesData: (params.languagesData as string[]) || [],
          projects: (params.projects as boolean) || false,
          projectsData: (params.projectsData as Array<{ name: string; description: string; url: string; rawNotes: string }>) || [],
          volunteer: (params.volunteer as boolean) || false,
          volunteerData: (params.volunteerData as Array<{ organization: string; role: string; description: string }>) || [],
          awards: (params.awards as boolean) || false,
          awardsData: (params.awardsData as Array<{ title: string; issuer: string; date: string }>) || [],
        })
        break
      default:
        console.warn('[builder] unhandled action', fn, params)
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left panel — chat */}
      <div className="w-[400px] shrink-0 border-r border-border flex flex-col bg-white">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-teal/10 flex items-center justify-center">
            <IconMessage size={14} className="text-teal" />
          </div>
          <div>
            <span className="text-[13px] font-medium text-ink">AI Resume Builder</span>
            {selectedTemplate && (
              <span className="text-[10px] text-muted/60 ml-2">
                using {selectedTemplate.charAt(0).toUpperCase() + selectedTemplate.slice(1)} template
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {resumeId ? (
            <ChatInterface
              resumeId={resumeId}
              stepData={stepData}
              onAction={handleAction}
              onUndo={lastUndoable ? applyUndo : undefined}
              undoMessage={lastUndoable?.message || null}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[12px] text-muted/50">
              Start a builder session to chat
            </div>
          )}
        </div>
      </div>

      {/* Right panel — canvas */}
      <div className="flex-1 bg-[#D4CFC6] overflow-y-auto">
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
    </div>
  )
}
