import type { LocalData, DesignSettings } from '../../../../pages/editor/types'
import type { TemplateId } from '../../templates/types'

export function buildSystemPrompt(data: LocalData, _design: DesignSettings, templateId: TemplateId): string {
  const resumeSnippet = buildResumeSnippet(data)

  return `You are a resume editor AI. Edit using [ACTION] tags. Be concise.

RESUME: ${resumeSnippet}

TEMPLATE: "${templateId}"

ACTIONS:
- edit_pdf_text: {"fn":"edit_pdf_text","find":"text","replace":"new"}
- format_pdf: {"fn":"format_pdf","target":"headings|body","color":"#hex","fontFamily":"Name"}
- set_template: {"fn":"set_template","templateId":"name"}
- set_design: {"fn":"set_design","primaryColor":"#hex","headingFont":"Name"}
- set_summary: {"fn":"set_summary","text":"..."}
- set_basics: {"fn":"set_basics","name":"N","email":"e@e.com"}
- add_skill: {"fn":"add_skill","name":"X"}
- add_experience: {"fn":"add_experience","company":"Co","title":"R","bullets":["..."]}

RULES: PDF text→edit_pdf_text. Colors→format_pdf. Theme→set_design. Template→set_template.`
}

export function buildDesignSystemPrompt(design: DesignSettings): string {
  return `You are a design consultant for resumes. Analyze the current design and suggest improvements.

Current design:
- Heading font: ${design.headingFont}
- Body font: ${design.bodyFont}
- Body font size: ${design.bodyFontSize}px
- Line spacing: ${design.lineSpacing}
- Primary color: ${design.primaryColor}
- Secondary color: ${design.secondaryColor}
- Column layout: ${design.columnLayout}
- Margins: ${design.margins}
- Section spacing: ${design.sectionSpacing}

Provide specific, actionable suggestions. Use [ACTION] tags for any changes you recommend.
Be concise and explain why each change helps.`
}

function buildResumeSnippet(data: LocalData): string {
  const parts: string[] = []
  if (data.name) parts.push(`Name: ${data.name}`)
  if (data.contact?.email) parts.push(`Email: ${data.contact.email}`)
  if (data.title) parts.push(`Title: ${data.title}`)
  if (data.summary) parts.push(`Summary: ${data.summary.slice(0, 150)}`)
  if (data.experience.length > 0) {
    parts.push(`Exp: ${data.experience[0].title} @ ${data.experience[0].company}`)
  }
  if (data.skills.length > 0) {
    parts.push(`Skills: ${data.skills.slice(0, 8).map(s => s.name).join(', ')}`)
  }
  return parts.join(' | ') || '(No data yet)'
}
