import type { LocalData, DesignSettings } from '../../../../pages/editor/types'
import type { TemplateId } from '../../templates/types'
import type { PdfBlockFormat, PdfTextEdit } from '../../../pdf-editor/PdfDocumentEditor'

export interface Action {
  fn: string
  params: Record<string, unknown>
}

export interface ParsedChatResponse {
  text: string
  actions: Action[]
  confirmation?: string
  highlights?: CanvasHighlight[]
}

export interface CanvasHighlight {
  sectionKey?: string
  type: 'pulse' | 'flash' | 'glow'
  duration?: number
}

export interface ActionHandlers {
  onUpdate: (data: LocalData) => void
  onDesignUpdate: (design: DesignSettings) => void
  onTemplateChange: (id: TemplateId) => void
  onShowTemplate: () => void
  onFormatPdf: (format: PdfBlockFormat) => void
  onEditText: (edit: PdfTextEdit) => void
  onHighlight: (highlights: CanvasHighlight[]) => void
}

const NAME_PATTERNS = [
  /(?:my name is|name(?:'s)? to|rename (?:me|it|the name) to|call (?:me|it))\s+(.+?)(?:\.|,| and | with | for |$)/i,
  /(?:name)\s*[:=]\s*(.+?)(?:\.|,|$)/i,
]

const EMAIL_PATTERN = /email\s*(?:is|to|:)?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
const PHONE_PATTERN = /phone\s*(?:is|to|:)?\s*([\d\s\-().+]{7,})/i
const LOCATION_PATTERN = /(?:location|based|city)\s*(?:is|in|:)?\s*([A-Za-z\s,]+?)(?:\.|,| and |$)/i
const TITLE_PATTERN = /(?:title|headline|role|position)\s*(?:is|to|:)?\s*(.+?)(?:\.|,| and | at | with | for |$)/i

const SECTION_MAP: Record<string, string> = {
  summary: 'summary',
  objective: 'summary',
  about: 'summary',
  profile: 'summary',
  experience: 'experience',
  work: 'experience',
  employment: 'experience',
  education: 'education',
  skills: 'skills',
  technical: 'skills',
  technologies: 'skills',
  certifications: 'certifications',
  certificates: 'certifications',
  languages: 'languages',
  links: 'links',
  projects: 'projects',
}

const DESIGN_COLOR_MAP: Record<string, string> = {
  blue: '#2563EB',
  navy: '#1E3A5F',
  darkblue: '#1E3A5F',
  red: '#DC2626',
  green: '#16A34A',
  purple: '#7C3AED',
  orange: '#EA580C',
  pink: '#DB2777',
  teal: '#0F6E56',
  slate: '#475569',
  burgundy: '#722F37',
  forest: '#2D5A27',
  cobalt: '#1E40AF',
  plum: '#5B21B6',
  amber: '#92400E',
  black: '#1A1A1A',
  white: '#FFFFFF',
  gray: '#6B7280',
  grey: '#6B7280',
}

const HEX_COLOR = /#(?:[0-9a-fA-F]{3}){1,2}\b/g
const COLORWORD = /\b(blue|navy|darkblue|red|green|purple|orange|pink|teal|slate|burgundy|forest|cobalt|plum|amber|black|white|gray|grey)\b/gi

export function parseHexColor(input: string): string | undefined {
  const hex = input.match(HEX_COLOR)?.[0]
  if (hex) return hex
  return undefined
}

function parseColorFromContext(text: string): string | undefined {
  const hex = text.match(HEX_COLOR)?.[0]
  if (hex) return hex
  const lower = text.toLowerCase()
  const colorContext = /\b(?:color|colour|background|accent|theme|highlight)\s*(?:to|:|=)\s*(\w+)/i
  const ctxMatch = lower.match(colorContext)
  if (ctxMatch) {
    const word = ctxMatch[1].toLowerCase()
    if (DESIGN_COLOR_MAP[word]) return DESIGN_COLOR_MAP[word]
  }
  const directColor = /\b(?:to|:|=)\s*(\w+)\s*(?:\.|,|$)/i
  const dirMatch = lower.match(directColor)
  if (dirMatch) {
    const word = dirMatch[1].toLowerCase()
    if (DESIGN_COLOR_MAP[word]) return DESIGN_COLOR_MAP[word]
  }
  return undefined
}

export function classifyIntent(text: string): 'deterministic' | 'streaming' {
  const lower = text.toLowerCase().trim()

  const deterministicPatterns = [
    /^change\s+(?:my\s+)?(?:name|title|headline|role|email|phone|location|company)\s+(?:to|:)/i,
    /^set\s+(?:my\s+)?(?:name|title|headline|email|phone|location)\s+(?:to|:)/i,
    /^rename\s+(?:me|my name|the name)/i,
    /^update\s+(?:my\s+)?(?:name|title|headline|email|phone|location)/i,
    /^add\s+(?:a\s+)?(?:skill|language|certification|education|experience|link|project)/i,
    /^remove\s+(?:the\s+)?(?:skill|language|certification|education|experience|link|project)/i,
    /^delete\s+(?:the\s+)?(?:skill|language|certification|education|experience|link|project)/i,
    /^switch\s+(?:to\s+)?(?:the\s+)?(?:template|layout|design)/i,
    /^use\s+(?:the\s+)?(?:template|layout)\s+/i,
    /^make\s+(?:it\s+)?(?:professional|modern|classic|executive|creative|minimal|compact)/i,
    /^change\s+(?:the\s+)?(?:color|colour|font|heading|background)/i,
    /^set\s+(?:the\s+)?(?:color|colour|font|heading)/i,
    /^what\s+(?:do|can)\s+you\s+(?:do|help)/i,
    /^help$/i,
    /^undo$/i,
  ]

  for (const pattern of deterministicPatterns) {
    if (pattern.test(lower)) return 'deterministic'
  }

  const lowerWords = lower.split(/\s+/)
  if (lowerWords.length <= 3 && /^(?:add|remove|delete|set|change|update|switch|undo|help|what)/.test(lower)) {
    return 'deterministic'
  }

  return 'streaming'
}

export function parseActionFromText(text: string, currentData: LocalData): Action[] {
  const lower = text.toLowerCase().trim()
  const actions: Action[] = []

  for (const pattern of NAME_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const name = match[1].trim()
      if (name && name.length > 1 && name.length < 60) {
        actions.push({ fn: 'set_basics', params: { name } })
        break
      }
    }
  }

  const emailMatch = text.match(EMAIL_PATTERN)
  if (emailMatch) {
    const existing = actions.find(a => a.fn === 'set_basics')
    if (existing) {
      existing.params.email = emailMatch[1]
    } else {
      actions.push({ fn: 'set_basics', params: { email: emailMatch[1] } })
    }
  }

  const phoneMatch = text.match(PHONE_PATTERN)
  if (phoneMatch) {
    const phone = phoneMatch[1].trim()
    const existing = actions.find(a => a.fn === 'set_basics')
    if (existing) {
      existing.params.phone = phone
    } else {
      actions.push({ fn: 'set_basics', params: { phone } })
    }
  }

  const locMatch = text.match(LOCATION_PATTERN)
  if (locMatch) {
    const location = locMatch[1].trim()
    const existing = actions.find(a => a.fn === 'set_basics')
    if (existing) {
      existing.params.location = location
    } else {
      actions.push({ fn: 'set_basics', params: { location } })
    }
  }

  const titleMatch = text.match(TITLE_PATTERN)
  if (titleMatch) {
    const headline = titleMatch[1].trim()
    const existing = actions.find(a => a.fn === 'set_basics')
    if (existing) {
      existing.params.headline = headline
    } else {
      actions.push({ fn: 'set_basics', params: { headline } })
    }
  }

  const addSkillMatch = text.match(/add\s+(.+?)(?:\s+to\s+(?:my\s+)?skills?|\s+skill|\s*$)/i)
  if (addSkillMatch && !actions.some(a => a.fn === 'set_skills')) {
    const raw = addSkillMatch[1].trim()
    const skills = raw.split(/,| and | & /).map(s => s.trim()).filter(s => s.length > 1)
    if (skills.length > 0) {
      actions.push({ fn: 'set_skills', params: { skills, append: true } })
    }
  }

  const removeSkillMatch = text.match(/remove\s+(.+?)(?:\s+from\s+(?:my\s+)?skills?|\s+skill|\s*$)/i)
  if (removeSkillMatch) {
    const skill = removeSkillMatch[1].trim()
    if (skill.length > 1) {
      actions.push({ fn: 'remove_skill', params: { skill } })
    }
  }

  const addLanguageMatch = text.match(/add\s+(.+?)(?:\s+to\s+(?:my\s+)?languages?|\s*$)/i)
  if (addLanguageMatch) {
    const language = addLanguageMatch[1].trim()
    if (language.length > 1) {
      actions.push({ fn: 'add_language', params: { language } })
    }
  }

  const removeLanguageMatch = text.match(/remove\s+(.+?)(?:\s+from\s+(?:my\s+)?languages?|\s*$)/i)
  if (removeLanguageMatch) {
    const language = removeLanguageMatch[1].trim()
    if (language.length > 1) {
      actions.push({ fn: 'remove_language', params: { language } })
    }
  }

  const addCertMatch = text.match(/add\s+(?:a\s+)?(?:certification|certificate)\s+(.+?)(?:\s*$)/i)
  if (addCertMatch) {
    const parts = addCertMatch[1].split(/\s+(?:from|issued by|at)\s+/i)
    const certName = parts[0]?.trim() || ''
    if (certName.length > 1) {
      actions.push({
        fn: 'add_certification',
        params: { name: certName, issuer: parts[1]?.trim() || '' },
      })
    }
  }

  const templateMatch = lower.match(/(?:switch|change|use)\s+(?:to\s+)?(?:the\s+)?(?:template\s+)?(\w[\w-]*)/i)
  if (templateMatch) {
    const tid = templateMatch[1].toLowerCase().replace(/\s+/g, '-')
    const validTemplates = [
      'minimal', 'modern', 'executive', 'compact', 'classic', 'sidebar', 'bold',
      'creative', 'tech', 'academic', 'charter', 'prestige', 'engineer', 'contemporary', 'folio',
      'ledger', 'meridian', 'foundry', 'almanac', 'bureau', 'ironclad', 'northline', 'plainscript',
      'halcyon', 'driftwood', 'paperwhite', 'fieldnote', 'vellum',
      'meridian-split', 'compass', 'skyline', 'atlas', 'harbor',
      'boardroom', 'summit', 'chairman', 'monarch', 'statesman',
      'prism', 'canvas-bold', 'studio', 'palette', 'kinetic',
      'terminal', 'commit', 'syntax', 'kernel', 'stack',
      'thesis', 'faculty', 'curriculum', 'archive',
      'portrait', 'frame', 'profile-card',
    ]
    if (validTemplates.includes(tid)) {
      actions.push({ fn: 'set_template', params: { templateId: tid } })
    }
  }

  const makeMatch = lower.match(/make\s+(?:it\s+)?(professional|modern|classic|executive|creative|minimal|compact)/i)
  if (makeMatch && !actions.some(a => a.fn === 'set_template')) {
    const styleMap: Record<string, string> = {
      professional: 'executive',
      modern: 'modern',
      classic: 'classic',
      executive: 'executive',
      creative: 'creative',
      minimal: 'minimal',
      compact: 'compact',
    }
    const tid = styleMap[makeMatch[1].toLowerCase()]
    if (tid) actions.push({ fn: 'set_template', params: { templateId: tid } })
  }

  const color = parseColorFromContext(text)
  const hasColorContext = /\b(?:color|colour|background|accent|theme|highlight|tint)\b/i.test(lower)
  const isColorRequest = hasColorContext && color
  if (isColorRequest) {
    const isGlobal = /\b(all|every|entire|overall|theme|global)\b/i.test(lower)
    const isHeading = /\b(heading|header|title|section|headings)\b/i.test(lower)
    const isBody = /\b(body|text|paragraph|content)\b/i.test(lower)

    if (isGlobal || (!isHeading && !isBody)) {
      actions.push({ fn: 'set_design', params: { primaryColor: color } })
    } else if (isHeading) {
      actions.push({ fn: 'format_pdf', params: { target: 'headings', color } })
    } else if (isBody) {
      actions.push({ fn: 'format_pdf', params: { target: 'body', color } })
    }
  }

  const fontMatch = lower.match(/(?:change|set|use)\s+(?:the\s+)?(?:font|typeface|heading font|body font)\s+(?:to\s+)?([A-Za-z][\w\s]*?)(?:\s+(?:size|to\s+\d)|\s+for\s+(?:headings?|body)|\s*$)/i)
  if (fontMatch && !actions.some(a => a.fn === 'format_pdf' && a.params.fontFamily)) {
    const fontName = fontMatch[1].trim()
    if (fontName.toLowerCase() === 'size' || /^\d/.test(fontName)) {
      // skip — this is a font size change, not a font family change
    } else {
      const isHeading = /\b(heading|header|title|section)\b/i.test(text)
      const isBody = /\b(body|text|paragraph)\b/i.test(text)
      if (isHeading) {
        actions.push({ fn: 'format_pdf', params: { target: 'headings', fontFamily: fontName } })
      } else if (isBody) {
        actions.push({ fn: 'format_pdf', params: { target: 'body', fontFamily: fontName } })
      } else {
        actions.push({ fn: 'set_design', params: { headingFont: fontName } })
      }
    }
  }

  const summaryMatch = lower.match(/(?:write|draft|create|generate|update|rewrite|improve)\s+(?:a\s+)?(?:new\s+)?(?:summary|objective|about|profile)(?:\s+(?:for|about|that)\s+(.+?))?\s*$/i)
  if (summaryMatch) {
    actions.push({ fn: 'set_summary', params: { text: '[GENERATE]' } })
  }

  return actions
}

export function applyActionToData(action: Action, d: LocalData): LocalData {
  const { fn, params } = action
  switch (fn) {
    case 'set_summary':
      if (typeof params.text === 'string' && params.text !== '[GENERATE]') {
        return { ...d, summary: params.text }
      }
      return d

    case 'set_basics':
      return {
        ...d,
        name: (params.name as string) ?? d.name,
        contact: {
          ...d.contact,
          email: (params.email as string) ?? d.contact.email,
          phone: (params.phone as string) ?? d.contact.phone,
          location: (params.location as string) ?? d.contact.location,
        },
        ...(params.headline ? { title: params.headline as string } : {}),
      }

    case 'add_experience': {
      const exp = {
        company: (params.company as string) || '',
        title: (params.title as string) || '',
        startDate: params.startDate as string | undefined,
        endDate: params.endDate as string | undefined,
        current: !!params.current,
        bullets: (params.bullets as string[]) || [],
      }
      return { ...d, experience: [...d.experience, exp] }
    }

    case 'remove_experience': {
      const idx = params.index as number
      if (typeof idx !== 'number' || idx < 0 || idx >= d.experience.length) return d
      return { ...d, experience: d.experience.filter((_, i) => i !== idx) }
    }

    case 'update_experience': {
      const uidx = params.index as number
      if (typeof uidx !== 'number' || uidx < 0 || uidx >= d.experience.length) return d
      return {
        ...d,
        experience: d.experience.map((e, i) => i === uidx ? {
          ...e,
          title: (params.title as string) ?? e.title,
          company: (params.company as string) ?? e.company,
          startDate: (params.startDate as string) ?? e.startDate,
          endDate: (params.endDate as string) ?? e.endDate,
          current: (params.current as boolean) ?? e.current,
          bullets: Array.isArray(params.bullets) ? (params.bullets as string[]) : e.bullets,
        } : e),
      }
    }

    case 'add_skill': {
      if (typeof params.skill === 'string' && !d.skills.some(s => s.name === params.skill)) {
        return { ...d, skills: [...d.skills, { name: params.skill, category: params.category as string | undefined }] }
      }
      return d
    }

    case 'remove_skill':
      return { ...d, skills: d.skills.filter(s => s.name !== params.skill) }

    case 'set_skills': {
      if (Array.isArray(params.skills)) {
        const newSkills = params.skills.map((s: any) => typeof s === 'string' ? { name: s } : s)
        if (params.append) {
          const existing = d.skills.map(s => s.name)
          const toAdd = newSkills.filter((s: { name: string }) => !existing.includes(s.name))
          return { ...d, skills: [...d.skills, ...toAdd] }
        }
        return { ...d, skills: newSkills }
      }
      return d
    }

    case 'add_education': {
      const edu = {
        institution: (params.institution as string) || '',
        degree: (params.degree as string) || '',
        field: (params.field as string) || '',
        startDate: params.startDate as string | undefined,
        endDate: params.endDate as string | undefined,
        gpa: params.gpa as string | undefined,
      }
      return { ...d, education: [...d.education, edu] }
    }

    case 'remove_education': {
      const eidx = params.index as number
      if (typeof eidx !== 'number' || eidx < 0 || eidx >= d.education.length) return d
      return { ...d, education: d.education.filter((_, i) => i !== eidx) }
    }

    case 'add_certification': {
      const cert = {
        name: (params.name as string) || '',
        issuer: (params.issuer as string) || '',
        date: params.date as string | undefined,
      }
      return { ...d, certifications: [...(d.certifications || []), cert] }
    }

    case 'remove_certification': {
      const cidx = params.index as number
      if (typeof cidx !== 'number' || cidx < 0 || cidx >= (d.certifications || []).length) return d
      return { ...d, certifications: (d.certifications || []).filter((_, i) => i !== cidx) }
    }

    case 'add_language':
      if (typeof params.language === 'string' && !d.languages.includes(params.language)) {
        return { ...d, languages: [...d.languages, params.language] }
      }
      return d

    case 'remove_language':
      return { ...d, languages: d.languages.filter(l => l !== params.language) }

    case 'add_link':
      if (params.url) {
        return { ...d, links: [...(d.links || []), { title: (params.title as string) || '', url: params.url as string }] }
      }
      return d

    case 'remove_link': {
      const lidx = params.index as number
      if (typeof lidx !== 'number' || lidx < 0 || lidx >= (d.links || []).length) return d
      return { ...d, links: (d.links || []).filter((_, i) => i !== lidx) }
    }

    case 'set_design':
    case 'set_template':
    case 'format_pdf':
    case 'edit_pdf_text':
      return d

    default:
      return d
  }
}

function inferSectionHighlights(actions: Action[]): CanvasHighlight[] {
  const highlights: CanvasHighlight[] = []

  for (const action of actions) {
    const { fn, params } = action

    if (fn === 'set_basics' || fn === 'set_summary') {
      const sectionKey = fn === 'set_summary' ? 'summary' : undefined
      highlights.push({ sectionKey, type: 'flash', duration: 600 })
    }

    if (fn.startsWith('add_') || fn.startsWith('remove_') || fn.startsWith('update_')) {
      const sectionMatch = fn.match(/(?:add|remove|update)_(\w+)/)
      if (sectionMatch) {
        const sectionKey = sectionMatch[1] === 'experience' ? 'experience'
          : sectionMatch[1] === 'education' ? 'education'
          : sectionMatch[1] === 'skill' || sectionMatch[1] === 'skills' ? 'skills'
          : sectionMatch[1] === 'language' || sectionMatch[1] === 'languages' ? 'languages'
          : sectionMatch[1] === 'certification' || sectionMatch[1] === 'certifications' ? 'certifications'
          : sectionMatch[1] === 'link' || sectionMatch[1] === 'links' ? 'links'
          : undefined
        highlights.push({ sectionKey, type: fn.startsWith('remove_') ? 'flash' : 'pulse', duration: fn.startsWith('remove_') ? 400 : 1500 })
      }
    }

    if (fn === 'set_skills') {
      highlights.push({ sectionKey: 'skills', type: 'pulse', duration: 1500 })
    }

    if (fn === 'set_design') {
      highlights.push({ type: 'glow', duration: 1500 })
    }

    if (fn === 'format_pdf') {
      highlights.push({ type: 'glow', duration: 1500 })
    }
  }

  return highlights
}

function buildConfirmation(actions: Action[], data: LocalData): string | undefined {
  if (actions.length === 0) return undefined
  if (actions.length > 1) {
    return `Applied ${actions.length} changes.`
  }

  const { fn, params } = actions[0]
  switch (fn) {
    case 'set_basics': {
      const changes: string[] = []
      if (params.name) changes.push(`name to "${params.name}"`)
      if (params.email) changes.push(`email to "${params.email}"`)
      if (params.phone) changes.push(`phone to "${params.phone}"`)
      if (params.location) changes.push(`location to "${params.location}"`)
      if (params.headline) changes.push(`title to "${params.headline}"`)
      return changes.length > 0 ? `Updated ${changes.join(', ')}.` : undefined
    }
    case 'set_summary':
      return params.text === '[GENERATE]' ? undefined : 'Summary updated.'
    case 'add_skill':
      return `Added "${params.skill}" to skills.`
    case 'remove_skill':
      return `Removed "${params.skill}" from skills.`
    case 'set_skills':
      return 'Skills updated.'
    case 'add_experience':
      return `Added experience at "${params.company || 'new company'}".`
    case 'remove_experience':
      return 'Removed experience entry.'
    case 'update_experience':
      return 'Updated experience entry.'
    case 'add_education':
      return `Added education at "${params.institution || 'new institution'}".`
    case 'remove_education':
      return 'Removed education entry.'
    case 'add_certification':
      return `Added certification "${params.name || 'new cert'}".`
    case 'remove_certification':
      return 'Removed certification.'
    case 'add_language':
      return `Added "${params.language}" to languages.`
    case 'remove_language':
      return `Removed "${params.language}" from languages.`
    case 'set_template':
      return `Switched to ${params.templateId} template.`
    case 'set_design': {
      const parts: string[] = []
      if (params.primaryColor) parts.push(`primary color`)
      if (params.headingFont) parts.push(`heading font`)
      if (params.bodyFont) parts.push(`body font`)
      return parts.length > 0 ? `Updated ${parts.join(' and ')}.` : 'Design updated.'
    }
    case 'format_pdf': {
      const parts: string[] = []
      if (params.color) parts.push('color')
      if (params.fontFamily) parts.push('font')
      if (params.fontSize) parts.push('size')
      return parts.length > 0 ? `Formatted ${params.target || 'document'} ${parts.join(' and ')}.` : 'Formatting applied.'
    }
    case 'edit_pdf_text':
      return 'Text replaced in PDF.'
    default:
      return undefined
  }
}

function buildActionLabels(actions: Action[]): string[] {
  return actions.map(({ fn, params }) => {
    switch (fn) {
      case 'set_basics': {
        const parts: string[] = []
        if (params.name) parts.push(`name → "${params.name}"`)
        if (params.email) parts.push(`email → "${params.email}"`)
        if (params.phone) parts.push(`phone`)
        if (params.location) parts.push(`location → "${params.location}"`)
        if (params.headline) parts.push(`title → "${params.headline}"`)
        return parts.join(', ') || 'Updated personal info'
      }
      case 'set_summary': return params.text === '[GENERATE]' ? 'Generating summary...' : 'Updated summary'
      case 'add_skill': return `+ skill "${params.skill}"`
      case 'remove_skill': return `- skill "${params.skill}"`
      case 'set_skills': return 'Updated skills'
      case 'add_experience': return `+ experience at "${params.company || '...'}"`
      case 'remove_experience': return '- experience entry'
      case 'update_experience': return 'Updated experience'
      case 'add_education': return `+ education at "${params.institution || '...'}"`
      case 'remove_education': return '- education entry'
      case 'add_certification': return `+ cert "${params.name || '...'}"`
      case 'remove_certification': return '- certification'
      case 'add_language': return `+ language "${params.language}"`
      case 'remove_language': return `- language "${params.language}"`
      case 'add_link': return `+ link`
      case 'remove_link': return '- link'
      case 'set_template': return `Switched to ${params.templateId}`
      case 'set_design': {
        const parts: string[] = []
        if (params.primaryColor) parts.push(`color ${params.primaryColor}`)
        if (params.headingFont) parts.push(`heading font`)
        if (params.bodyFont) parts.push(`body font`)
        return parts.join(', ') || 'Design updated'
      }
      case 'format_pdf': return `Formatted ${(params.target || 'all')} in PDF`
      case 'edit_pdf_text': return `Replaced text in PDF`
      default: return fn
    }
  })
}

export function executeActions(
  actions: Action[],
  data: LocalData,
  design: DesignSettings,
  handlers: ActionHandlers,
): { text: string; confirmation: string; actionLabels: string[]; highlights: CanvasHighlight[] } {
  let merged = { ...data }
  let designMerged = { ...design }

  for (const a of actions) {
    const p = a.params || {}
    if (a.fn === 'set_design') {
      const changes = (p.design as Partial<DesignSettings>) || {}
      const topLevel: Record<string, unknown> = {}
      for (const key of ['primaryColor', 'secondaryColor', 'headingFont', 'bodyFont', 'columnLayout', 'sectionSpacing', 'margins', 'lineSpacing', 'bodyFontSize'] as const) {
        if (key in p) topLevel[key] = p[key]
      }
      designMerged = { ...designMerged, ...changes, ...topLevel }
    } else {
      merged = applyActionToData(a, merged)
    }
  }

  const hasContentChanges = actions.some(a => !['set_design', 'set_template', 'format_pdf', 'edit_pdf_text'].includes(a.fn))
  if (hasContentChanges) handlers.onUpdate(merged)

  if (actions.some(a => a.fn === 'set_design')) handlers.onDesignUpdate(designMerged)

  const templateAction = actions.find(a => a.fn === 'set_template')
  if (templateAction) {
    const tid = templateAction.params.templateId as TemplateId
    handlers.onTemplateChange(tid)
    handlers.onShowTemplate()
  } else if (actions.some(a => a.fn === 'set_design')) {
    handlers.onShowTemplate()
  }

  const formatAction = actions.find(a => a.fn === 'format_pdf')
  if (formatAction) {
    const p = formatAction.params || {}
    const target = (p.target as 'all' | 'headings' | 'body') || 'all'
    const updates: Record<string, unknown> = {}
    if (p.color) updates.color = p.color
    if (p.fontFamily) updates.fontFamily = p.fontFamily
    if (p.fontSize) updates.fontSize = p.fontSize
    if (Object.keys(updates).length > 0) {
      handlers.onFormatPdf({ target, matchText: p.matchText as string | undefined, updates: updates as PdfBlockFormat['updates'] })
    }
  }

  const editTextAction = actions.find(a => a.fn === 'edit_pdf_text')
  if (editTextAction) {
    const p = editTextAction.params || {}
    if (p.find && p.replace) {
      handlers.onEditText({ find: p.find as string, replace: p.replace as string })
    }
  }

  const highlights = inferSectionHighlights(actions)
  if (highlights.length > 0) handlers.onHighlight(highlights)

  const confirmation = buildConfirmation(actions, data) || 'Done.'
  const actionLabels = buildActionLabels(actions)

  return { text: '', confirmation, actionLabels, highlights }
}

export function generateFallbackActions(text: string, currentData: LocalData): Action[] {
  const actions: Action[] = []
  const lower = text.toLowerCase()

  const nameMatch = text.match(/(?:my name is|name(?:'s)?\s+to|rename\s+(?:me|it|the name)\s+to|called)\s+([A-Za-z\s\-']+?)(?:\.|,|\s+and\b|\s+with\b|$)/i)
  if (nameMatch) {
    const name = nameMatch[1].trim()
    const basics: Record<string, any> = {}
    if (name && name.length > 1 && currentData.name !== name) basics.name = name
    const emailMatch = lower.match(/email(?:\s+is|\s+to|\s*:|)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
    if (emailMatch) basics.email = emailMatch[1]
    const phoneMatch = lower.match(/phone(?:\s+is|\s+to|\s*:|)\s+([\d\s\-().+]{7,})(?:\.|,|\s+and\b|$)/)
    if (phoneMatch) basics.phone = phoneMatch[1].trim()
    const locMatch = text.match(/(?:location|based|city)(?:\s+is|\s+in|\s*:|)\s+([A-Za-z\s,]+?)(?:\.|,|\s+and\b|$)/i)
    if (locMatch) basics.location = locMatch[1].trim()
    const titleMatch = text.match(/(?:title|headline|role|position)(?:\s+is|\s+to|\s*:|)\s+([A-Za-z\s\-]+?)(?:\.|,|\s+and\b|\s+with\b|\s+at\b|$)/i)
    if (titleMatch) basics.headline = titleMatch[1].trim()
    if (Object.keys(basics).length > 0) {
      actions.push({ fn: 'set_basics', params: basics })
    }
  } else {
    const basics: Record<string, any> = {}
    const emailMatch = lower.match(/email(?:\s+is|\s+to|\s*:|)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
    if (emailMatch) basics.email = emailMatch[1]
    const phoneMatch = lower.match(/phone(?:\s+is|\s+to|\s*:|)\s+([\d\s\-().+]{7,})(?:\.|,|\s+and\b|$)/)
    if (phoneMatch) basics.phone = phoneMatch[1].trim()
    const locMatch = text.match(/(?:location|based|city)(?:\s+is|\s+in|\s*:|)\s+([A-Za-z\s,]+?)(?:\.|,|\s+and\b|$)/i)
    if (locMatch) basics.location = locMatch[1].trim()
    const titleMatch = text.match(/(?:title|headline|role|position)(?:\s+is|\s+to|\s*:|)\s+([A-Za-z\s\-]+?)(?:\.|,|\s+and\b|\s+with\b|\s+at\b|$)/i)
    if (titleMatch) basics.headline = titleMatch[1].trim()
    if (Object.keys(basics).length > 0) {
      actions.push({ fn: 'set_basics', params: basics })
    }
  }

  const summaryMatch = lower.match(/summary(?:\s*:|is)\s*(.+?)(?:experience|education|skills|\.\s*$)/s)
  if (summaryMatch) {
    const text = summaryMatch[1].trim()
    if (text.length > 10) {
      actions.push({ fn: 'set_summary', params: { text } })
    }
  }

  const skillsMatch = lower.match(/(?:skills|technologies)(?:\s*:|(?: i added| i'?ve added| include| are)\s+)(.+?)(?:\.|experience|education|summary|$)/)
  if (skillsMatch) {
    const skillsText = skillsMatch[1]
    const skills = skillsText.split(/,|;| and | & /).map(s => s.trim().replace(/^my /, '')).filter(s => s.length > 1 && !['to', 'the', 'your', 'with', 'for', 'you', 'a'].includes(s.toLowerCase()))
    if (skills.length > 0) {
      const existing = (currentData.skills || []).map((s: any) => typeof s === 'string' ? s : s.name)
      const all = [...new Set([...existing, ...skills])]
      actions.push({ fn: 'set_skills', params: { skills: all } })
    }
  }

  const skillAddMatch = lower.match(/add(?:ed|ing)?\s+([A-Za-z#+.]+)(?:\s+to\s+(?:my\s+)?skills?|\s+skill)/i)
  if (skillAddMatch && !actions.some(a => a.fn === 'set_skills')) {
    const skill = skillAddMatch[1].trim()
    const existing = (currentData.skills || []).map((s: any) => typeof s === 'string' ? s : s.name)
    if (!existing.includes(skill)) {
      actions.push({ fn: 'add_skill', params: { skill } })
    }
  }

  return actions
}

export const ACTION_LABELS: Record<string, string> = {
  set_summary: 'Updated summary',
  set_basics: 'Updated personal info',
  add_experience: 'Added experience',
  remove_experience: 'Removed experience',
  update_experience: 'Updated experience',
  add_skill: 'Added skill',
  remove_skill: 'Removed skill',
  set_skills: 'Updated skills',
  add_education: 'Added education',
  remove_education: 'Removed education',
  add_certification: 'Added certification',
  remove_certification: 'Removed certification',
  add_language: 'Added language',
  remove_language: 'Removed language',
  add_link: 'Added link',
  remove_link: 'Removed link',
  set_design: 'Updated design',
  set_template: 'Changed template',
  format_pdf: 'Formatted PDF',
  edit_pdf_text: 'Edited text',
}
