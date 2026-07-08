import type { TemplateId } from '../resume-editor/templates/types'
import type { DesignSettings } from '../../pages/editor/types'

export interface BasicsData {
  name: string
  headline: string
  email: string
  phone: string
  location: string
  linkedin?: string
  website?: string
  github?: string
}

export interface TargetRoleData {
  role: string
  level: string
  industry: string
  company?: string
  companyUrl?: string
  jobDescription?: string
}

export interface SummaryData {
  text: string
  accepted: boolean
}

export interface ExperienceRole {
  title: string
  company: string
  startDate: string
  endDate: string
  current: boolean
  location: string
  rawNotes: string
  bullets: string[]
}

export interface EducationEntry {
  degree: string
  field: string
  institution: string
  startYear: string
  endYear: string
  inProgress: boolean
  gpa: string
}

export interface OptionalData {
  certifications: boolean
  certificationsData: Array<{ name: string; issuer: string; date: string }>
  languages: boolean
  languagesData: string[]
  projects: boolean
  projectsData: Array<{ name: string; description: string; url: string; rawNotes: string }>
  volunteer: boolean
  volunteerData: Array<{ organization: string; role: string; description: string }>
  awards: boolean
  awardsData: Array<{ title: string; issuer: string; date: string }>
}

export interface BuilderStepData {
  basics: BasicsData | null
  targetRole: TargetRoleData | null
  summary: SummaryData | null
  experience: ExperienceRole[]
  education: EducationEntry[]
  skills: string[]
  optional: OptionalData | null
}

export interface BuilderSnapshot {
  stepData: BuilderStepData
  design: DesignSettings
  selectedTemplate: TemplateId | null
}

export interface BuilderState {
  resumeId: string | null
  selectedTemplate: TemplateId | null
  design: DesignSettings
  currentStep: number
  completedSteps: number[]
  stepDependencies: Record<number, number[]>  // step -> steps that depend on it
  staleSteps: number[]                         // steps whose data is stale due to upstream changes
  stepData: BuilderStepData
  isComplete: boolean
  streamingSection: 'summary' | 'experience' | null
  streamingText: string
  streamingBullets: string[]
  summaryStreaming: boolean
  summaryDraft: string
  dirtyAfterEdit: boolean
  _history: BuilderSnapshot[]
  _future: BuilderSnapshot[]
}

export const STEP_DEPENDENCIES: Record<number, number[]> = {
  1: [],
  2: [1],
  3: [2],
  4: [2],
  5: [],
  6: [2],
  7: [],
  8: [1, 2, 3, 4, 5, 6, 7],
}

export const STEP_LABELS: Record<number, string> = {
  0: 'Template',
  1: 'The basics',
  2: 'What you\'re going for',
  3: 'Your summary',
  4: 'Your experience',
  5: 'Education',
  6: 'Your skills',
  7: 'Anything else to add?',
  8: 'You\'re almost done',
}

export const STEP_ESTIMATED_MINUTES: Record<number, number> = {
  0: 1,
  1: 2,
  2: 1,
  3: 2,
  4: 5,
  5: 2,
  6: 2,
  7: 1,
  8: 1,
}

export function buildSectionOrder(stepData: BuilderStepData, hasStreaming: boolean): string[] {
  const order: string[] = []
  if (stepData.summary?.text || hasStreaming) order.push('summary')
  if (stepData.experience.length > 0) order.push('experience')
  if (stepData.education.length > 0) order.push('education')
  if (stepData.skills.length > 0) order.push('skills')
  if (stepData.optional?.certifications && stepData.optional.certificationsData.length > 0) order.push('certifications')
  if (stepData.optional?.languages && stepData.optional.languagesData.length > 0) order.push('languages')
  return order.length > 0 ? order : ['summary', 'experience', 'education', 'skills', 'certifications', 'languages', 'links']
}
