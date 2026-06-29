export type HeaderStyle = 'center' | 'dark-block' | 'thin-line' | 'left-accent' | 'top-stripe' | 'centered-line' | 'minimal' | 'paper'
export type HeadingStyle = 'underline' | 'uppercase' | 'left-bar' | 'badge' | 'small-caps' | 'dot-accent'
export type BulletStyle = 'dot' | 'dash' | 'arrow' | 'hyphen' | 'check'
export type FontStyle = 'sans' | 'serif' | 'display' | 'mono'
export type SpacingStyle = 'compact' | 'normal' | 'airy'

export interface TemplateStyle {
  header: HeaderStyle
  heading: HeadingStyle
  bullet: BulletStyle
  font: FontStyle
  spacing: SpacingStyle
}

export interface ResumeTemplate {
  id: string
  name: string
  description: string
  layout: 'single-column' | 'two-column' | 'sidebar'
  preview: string
  style: TemplateStyle
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
