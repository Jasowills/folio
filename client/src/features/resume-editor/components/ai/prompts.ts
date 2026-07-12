import type { LocalData, DesignSettings } from '../../../../pages/editor/types'
import type { TemplateId } from '../../templates/types'

export function buildSystemPrompt(data: LocalData, design: DesignSettings, templateId: TemplateId): string {
  const resumeContext = buildResumeContext(data)
  const designContext = buildDesignContext(design)
  const templateContext = buildTemplateContext(templateId)

  return `You are a resume editor AI. Edit the user's resume using [ACTION] tags. Be concise and direct.

RESUME:
${resumeContext}

${designContext}
${templateContext}

## Available Actions

PDF EDITING (for uploaded PDFs):
- edit_pdf_text: Find and replace text
  {"fn":"edit_pdf_text","find":"exact text","replace":"new text"}
- format_pdf: Change formatting on PDF blocks
  {"fn":"format_pdf","target":"headings|body|all","color":"#hex","fontFamily":"Name","fontSize":11,"matchText":"optional"}

TEMPLATE (when user asks to switch or style):
- set_template: Switch template
  {"fn":"set_template","templateId":"template-name"}
- set_design: Global color/font changes
  {"fn":"set_design","primaryColor":"#hex","headingFont":"Name","bodyFont":"Name","secondaryColor":"#hex"}

CONTENT (for template view):
- set_summary: {"fn":"set_summary","text":"new summary"}
- set_basics: {"fn":"set_basics","name":"Name","email":"e@e.com","phone":"123","location":"City","headline":"Title"}
- add/remove/update_experience: {"fn":"add_experience","company":"Co","title":"Role","bullets":["..."]}
- add/remove_skill, set_skills: {"fn":"add_skill","name":"React"} or {"fn":"set_skills","skills":["React","TypeScript"]}
- add/remove_education: {"fn":"add_education","institution":"Uni","degree":"BS","field":"CS"}
- add/remove_certification: {"fn":"add_certification","name":"AWS","issuer":"Amazon"}
- add/remove_language: {"fn":"add_language","language":"Spanish"}
- add/remove_link: {"fn":"add_link","title":"GitHub","url":"https://..."}

## Rules

1. Text changes on uploaded PDF → use edit_pdf_text, not set_summary
2. Color/font on specific section → use format_pdf with matchText
3. Only use set_design for overall theme changes
4. Only use set_template when user asks to switch
5. For summary generation requests, use set_summary with a well-crafted summary
6. Always include at least one action when user asks for a change
7. Be concise in your text response

## Examples

User: "Change role to Full Stack Engineer"
Action: [ACTION]{"fn":"edit_pdf_text","find":"Software Engineer","replace":"Full Stack Engineer"}[/ACTION]

User: "Change heading color to blue"
Action: [ACTION]{"fn":"format_pdf","target":"headings","color":"#2563EB"}[/ACTION]

User: "Add React to skills"
Action: [ACTION]{"fn":"add_skill","name":"React"}[/ACTION]

User: "Switch to modern template"
Action: [ACTION]{"fn":"set_template","templateId":"modern"}[/ACTION]

User: "Make it professional"
Action: [ACTION]{"fn":"set_template","templateId":"executive"}[/ACTION]

User: "Write a new summary for a software engineer with 5 years experience"
Action: [ACTION]{"fn":"set_summary","text":"Software engineer with 5+ years of experience building scalable web applications. Proficient in React, Node.js, and cloud technologies. Delivered high-impact features that improved user engagement by 40%."}[/ACTION]

User: "Change body font to Arial"
Action: [ACTION]{"fn":"format_pdf","target":"body","fontFamily":"Arial"}[/ACTION]

User: "Change my name to Sarah"
Action: [ACTION]{"fn":"set_basics","name":"Sarah"}[/ACTION]

User: "Add a certification: AWS Solutions Architect from Amazon"
Action: [ACTION]{"fn":"add_certification","name":"AWS Solutions Architect","issuer":"Amazon"}[/ACTION]`
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

function buildResumeContext(data: LocalData): string {
  const parts: string[] = []

  if (data.name) parts.push(`Name: ${data.name}`)
  if (data.contact?.email) parts.push(`Email: ${data.contact.email}`)
  if (data.contact?.phone) parts.push(`Phone: ${data.contact.phone}`)
  if (data.contact?.location) parts.push(`Location: ${data.contact.location}`)
  if (data.title) parts.push(`Headline: ${data.title}`)
  if (data.summary) parts.push(`Summary: ${data.summary.slice(0, 400)}`)

  if (data.experience.length > 0) {
    const expStr = data.experience.map(e =>
      `${e.title} at ${e.company} (${e.startDate || '?'} - ${e.endDate || 'Present'})` +
      (e.bullets?.length ? '\n  ' + e.bullets.slice(0, 3).map(b => `• ${b}`).join('\n  ') : '')
    ).join('\n')
    parts.push(`Experience:\n${expStr}`)
  }

  if (data.education.length > 0) {
    parts.push(`Education: ${data.education.map(e => `${e.degree} in ${e.field} — ${e.institution}`).join('; ')}`)
  }

  if (data.skills.length > 0) {
    parts.push(`Skills: ${data.skills.map(s => s.name).join(', ')}`)
  }

  if (data.certifications?.length > 0) {
    parts.push(`Certifications: ${data.certifications.map(c => `${c.name}${c.issuer ? ` (${c.issuer})` : ''}`).join(', ')}`)
  }

  if (data.languages.length > 0) {
    parts.push(`Languages: ${data.languages.join(', ')}`)
  }

  return parts.join('\n') || '(No resume data loaded yet)'
}

function buildDesignContext(design: DesignSettings): string {
  return `DESIGN: headingFont="${design.headingFont}", bodyFont="${design.bodyFont}", fontSize=${design.bodyFontSize}px, lineSpacing=${design.lineSpacing}, primaryColor="${design.primaryColor}", secondaryColor="${design.secondaryColor}", layout="${design.columnLayout}", margins=${design.margins}, sectionSpacing=${design.sectionSpacing}`
}

function buildTemplateContext(templateId: TemplateId): string {
  return `TEMPLATE: Current template is "${templateId}". Available: minimal, modern, executive, compact, classic, sidebar, bold, creative, tech, academic, charter, prestige, engineer, contemporary, folio, ledger, meridian, foundry, almanac, bureau, ironclad, northline, plainscript, halcyon, driftwood, paperwhite, fieldnote, vellum, meridian-split, compass, skyline, atlas, harbor, boardroom, summit, chairman, monarch, statesman, prism, canvas-bold, studio, palette, kinetic, terminal, commit, syntax, kernel, stack, thesis, faculty, curriculum, archive, portrait, frame, profile-card.`
}
