export interface SkillEntry {
  name: string
  category?: string
  proficiency?: 'learning' | 'proficient' | 'expert'
}

export interface DesignSettings {
  headingFont: string
  bodyFont: string
  bodyFontSize: number
  lineSpacing: number
  primaryColor: string
  secondaryColor: string
  columnLayout: 'single-column' | 'two-column'
  margins: number
  sectionSpacing: number
}

export const DEFAULT_DESIGN: DesignSettings = {
  headingFont: 'DM Serif Display',
  bodyFont: 'Plus Jakarta Sans',
  bodyFontSize: 10,
  lineSpacing: 1.5,
  primaryColor: '#0F6E56',
  secondaryColor: '#475569',
  columnLayout: 'single-column',
  margins: 3,
  sectionSpacing: 3,
}

export interface ExperienceEntry {
  company: string
  title: string
  startDate?: string
  endDate?: string
  current?: boolean
  bullets: string[]
}

export interface EducationEntry {
  institution: string
  degree: string
  field: string
  startDate?: string
  endDate?: string
  gpa?: string
}

export interface CertificationEntry {
  name: string
  issuer: string
  date?: string
}

export interface LinkEntry {
  title: string
  url: string
}

export interface CustomSection {
  id: string
  title: string
  content: string[]
  type: 'text' | 'bullets'
}

export interface LocalData {
  title: string
  name: string
  summary: string
  contact: { email: string; phone: string; location: string; linkedin?: string; website?: string; github?: string; photoUrl?: string }
  experience: ExperienceEntry[]
  education: EducationEntry[]
  skills: SkillEntry[]
  certifications: CertificationEntry[]
  languages: string[]
  links: LinkEntry[]
  customSections: CustomSection[]
  sectionOrder: string[]
  design: DesignSettings
  editMode: 'guided' | 'direct'
}

export type SectionName = 'summary' | 'experience' | 'education' | 'skills' | 'certifications' | 'languages' | 'links'

export const BUILTIN_SECTIONS: SectionName[] = [
  'summary', 'experience', 'education', 'skills', 'certifications', 'languages', 'links',
]

export const ALL_SECTION_NAMES: { key: string; label: string; builtin: boolean }[] = [
  { key: 'summary', label: 'Summary', builtin: true },
  { key: 'experience', label: 'Experience', builtin: true },
  { key: 'education', label: 'Education', builtin: true },
  { key: 'skills', label: 'Skills', builtin: true },
  { key: 'certifications', label: 'Certifications', builtin: true },
  { key: 'languages', label: 'Languages', builtin: true },
  { key: 'links', label: 'Links', builtin: true },
  { key: 'projects', label: 'Projects', builtin: false },
  { key: 'volunteer', label: 'Volunteer', builtin: false },
  { key: 'awards', label: 'Awards', builtin: false },
  { key: 'publications', label: 'Publications', builtin: false },
  { key: 'references', label: 'References', builtin: false },
]

export interface ResumeShim {
  _id: string
  title: string
  name?: string
  rawText?: string
  fileUrl?: string
  cloudinaryPublicId?: string
  summary?: string
  contact?: { email?: string; phone?: string; location?: string; linkedin?: string; website?: string; github?: string; photoUrl?: string }
  experience?: ExperienceEntry[]
  education?: EducationEntry[]
  skills?: string[]
  certifications?: CertificationEntry[]
  languages?: string[]
  links?: LinkEntry[]
  redFlags?: Array<{ message: string; severity: 'low' | 'medium' | 'high'; section?: string }>
  quality?: { overallQuality: number; strengths: string[]; issues: string[]; suggestions: string[] }
  editMode?: 'guided' | 'direct'
  design?: DesignSettings
  sectionOrder?: string[]
}

export const SECTION_TIPS: Record<string, string[]> = {
  summary: [
    'Lead with your years of experience and your specialty.',
    'Name at least 2 specific skills that define your expertise.',
    'Mention your most impressive quantified achievement.',
  ],
  experience: [
    'Each bullet should follow: Action verb → what you did → measured result.',
    'Aim for 3-5 bullets per role. Quality over quantity.',
    'Use present tense for current role, past tense for previous roles.',
  ],
  education: [
    'List your most recent degree first. Include GPA if 3.5+.',
    'Add relevant coursework if you have less than 3 years of experience.',
    'Include study abroad, honors, and academic awards.',
  ],
  skills: [
    'List technical skills first, then soft skills.',
    'Include specific tools and versions where relevant.',
    'Aim for 8-12 skills for a senior role, 6-8 for entry level.',
  ],
  certifications: [
    'List the most relevant or recent certifications first.',
    'Include the issuing organization and date obtained.',
    'Only list active certifications that are still valid.',
  ],
  languages: [
    'Include your proficiency level (e.g., "Spanish — Native", "French — Professional").',
    'Only list languages where you can hold a conversation.',
  ],
  links: [
    'Include your LinkedIn, portfolio, GitHub, and personal website.',
    'Make sure all URLs are clickable and current.',
  ],
}
