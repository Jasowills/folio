export interface LocalData {
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
  links: Array<{ title: string; url: string }>
}

export type SectionName = 'summary' | 'experience' | 'education' | 'skills' | 'certifications' | 'languages' | 'links'

export const ALL_SECTIONS: SectionName[] = [
  'summary', 'experience', 'education', 'skills', 'certifications', 'languages', 'links',
]

export interface ResumeShim {
  _id: string
  title: string
  name?: string
  rawText?: string
  fileUrl?: string
  cloudinaryPublicId?: string
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
  links?: Array<{ title: string; url: string }>
  redFlags?: Array<{ message: string; severity: 'low' | 'medium' | 'high'; section?: string }>
  quality?: { overallQuality: number; strengths: string[]; issues: string[]; suggestions: string[] }
}
