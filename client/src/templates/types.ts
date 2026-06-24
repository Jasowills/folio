export interface ResumeTemplate {
  id: string
  name: string
  description: string
  layout: 'single-column' | 'two-column' | 'sidebar'
  preview: string
}

export interface ResumeColorTheme {
  id: string
  name: string
  primary: string
}

export interface TemplateRenderProps {
  template: ResumeTemplate
  primaryColor: string
  data: {
    name?: string | null
    contact?: {
      email?: string | null
      phone?: string | null
      location?: string | null
      linkedin?: string | null
      website?: string | null
      github?: string | null
    }
    summary?: string | null
    experience?: Array<{
      company: string
      title: string
      startDate?: string | null
      endDate?: string | null
      current?: boolean
      bullets: string[]
    }>
    education?: Array<{
      institution: string
      degree: string
      field?: string | null
      startDate?: string | null
      endDate?: string | null
      gpa?: string | null
    }>
    skills?: string[]
    certifications?: Array<{
      name: string
      issuer?: string | null
      date?: string | null
    }>
    languages?: string[]
  }
}
