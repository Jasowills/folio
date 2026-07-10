import { useState, useRef, useEffect } from 'react'
import { IconSend, IconRobot, IconUser, IconCheck } from '@tabler/icons-react'
import { AiService } from '../../../lib/ai'
import type { LocalData, DesignSettings } from '../../../pages/editor/types'
import type { TemplateId } from '../templates/types'
import { getTemplateName } from '../templates/registry'
import type { PdfBlockFormat, PdfTextEdit } from '../../pdf-editor/PdfDocumentEditor'

interface Action {
  fn: string
  params: Record<string, unknown>
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions: Action[]
}

interface Props {
  data: LocalData
  onUpdate: (data: LocalData) => void
  design: DesignSettings
  onDesignUpdate: (design: DesignSettings) => void
  templateId: TemplateId
  onTemplateChange: (id: TemplateId) => void
  onShowTemplate: () => void
  onFormatPdf: (format: PdfBlockFormat) => void
  onEditText: (edit: PdfTextEdit) => void
}

let msgId = 0
const nextId = () => `m_${++msgId}`

const WELCOME =
  "I can help you edit your resume. Try:\n\n" +
  "• \"Improve the summary to be more impactful\"\n" +
  "• \"Add React and TypeScript to skills\"\n" +
  "• \"Fix the grammar in my experience section\"\n" +
  "• \"Suggest a better headline\""

function stripActions(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/[\t ]*\[ACTION\][\s\S]*?\[\/[%\s]*ACTION\][\t ]*/g, '')
    .split('\n')
    .filter((line, i, arr) => {
      if (line.trim() === '' && i > 0 && arr[i - 1]?.trim() === '') return false
      return true
    })
    .join('\n')
    .trim()
}

function parseActions(text: string): Action[] {
  const actions: Action[] = []
  const re = /\[ACTION\](.*?)\[\/[%\s]*ACTION\]/g
  let match
  while ((match = re.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      actions.push({ fn: parsed.fn, params: parsed.params || parsed })
    } catch { /* skip malformed */ }
  }
  return actions
}

function generateFallbackActions(text: string, currentData: Record<string, any>): Action[] {
  const actions: Action[] = []
  const lower = text.toLowerCase()

  // Name
  const nameMatch = lower.match(/(?:name is|name to|name:|called)\s+([A-Za-z\s\-']+?)(?:\.|,|and|with)/)
  if (nameMatch) {
    const name = nameMatch[1].trim()
    const basics: Record<string, any> = { ...currentData }
    if (name && currentData.name !== name) basics.name = name
    const emailMatch = lower.match(/email(?:\s+is|\s+to|\s*:|)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
    if (emailMatch) basics.email = emailMatch[1]
    const phoneMatch = lower.match(/phone(?:\s+is|\s+to|\s*:|)\s+([\d\s\-\(\)]+?)(?:\.|,|and|$)/)
    if (phoneMatch) basics.phone = phoneMatch[1].trim()
    const locMatch = lower.match(/(?:location|based)(?:\s+is|\s+in|\s*:|)\s+([A-Za-z\s,]+?)(?:\.|,|and|$)/)
    if (locMatch) basics.location = locMatch[1].trim()
    const titleMatch = lower.match(/(?:title|headline)(?:\s+is|\s+to|\s*:|)\s+([A-Za-z\s\-]+?)(?:\.|,|and|with|at|$)/)
    if (titleMatch) basics.headline = titleMatch[1].trim()
    if (basics.name || basics.headline || basics.email) {
      actions.push({ fn: 'set_basics', params: basics })
    }
  }

  // Summary
  const summaryMatch = lower.match(/summary(?:\s*:|is)\s*(.+?)(?:experience|education|skills|\.\s*$)/s)
  if (summaryMatch) {
    const text = summaryMatch[1].trim()
    if (text.length > 10) {
      actions.push({ fn: 'set_summary', params: { text } })
    }
  }

  // Skills
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

  // Single skill addition
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

export default function AiChatPanel({ data, onUpdate, design, onDesignUpdate, templateId, onTemplateChange, onShowTemplate, onFormatPdf, onEditText }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId(), role: 'assistant', content: WELCOME, actions: [] },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const dataRef = useRef(data)
  dataRef.current = data
  const designRef = useRef(design)
  designRef.current = design

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const addMessage = (msg: ChatMessage) => setMessages(prev => [...prev, msg])
  const updateLast = (updater: (m: ChatMessage) => ChatMessage) =>
    setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? updater(m) : m))

  const applyActionToData = (action: Action, d: LocalData): LocalData => {
    const { fn, params } = action
    switch (fn) {
      case 'set_summary':
        if (typeof params.text === 'string') return { ...d, summary: params.text }
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
        return { ...d, experience: d.experience.filter((_, i) => i !== idx) }
      }
      case 'add_skill':
        if (typeof params.skill === 'string' && !d.skills.some(s => s.name === params.skill)) {
          return { ...d, skills: [...d.skills, { name: params.skill, category: params.category as string | undefined }] }
        }
        return d
      case 'remove_skill':
        return { ...d, skills: d.skills.filter(s => s.name !== params.skill) }
      case 'set_skills':
        if (Array.isArray(params.skills)) {
          return { ...d, skills: params.skills.map((s: any) => typeof s === 'string' ? { name: s } : s) }
        }
        return d
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
      case 'add_certification': {
        const cert = {
          name: (params.name as string) || '',
          issuer: (params.issuer as string) || '',
          date: params.date as string | undefined,
        }
        return { ...d, certifications: [...(d.certifications || []), cert] }
      }
      case 'add_language':
        if (typeof params.language === 'string' && !d.languages.includes(params.language)) {
          return { ...d, languages: [...d.languages, params.language] }
        }
        return d
      case 'remove_language':
        return { ...d, languages: d.languages.filter(l => l !== params.language) }
      case 'set_design':
        return d
      case 'set_template':
        return d
      case 'format_pdf':
        return d
      case 'edit_pdf_text':
        return d
      case 'remove_education': {
        const eidx = params.index as number
        return { ...d, education: d.education.filter((_, i) => i !== eidx) }
      }
      case 'remove_certification': {
        const cidx = params.index as number
        return { ...d, certifications: (d.certifications || []).filter((_, i) => i !== cidx) }
      }
      case 'add_link':
        if (params.url) {
          return { ...d, links: [...(d.links || []), { title: (params.title as string) || '', url: params.url as string }] }
        }
        return d
      case 'remove_link': {
        const lidx = params.index as number
        return { ...d, links: (d.links || []).filter((_, i) => i !== lidx) }
      }
      case 'update_experience': {
        const uidx = params.index as number
        if (typeof uidx !== 'number' || uidx < 0 || uidx >= d.experience.length) return d
        const existing = d.experience[uidx]
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
      default:
        return d
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: text, actions: [] }
    addMessage(userMsg)

    const assistantId = nextId()
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', actions: [] }
    addMessage(assistantMsg)
    setLoading(true)

    let fullText = ''

    try {
      const resumeContext = [
        data.name && `Name: ${data.name}`,
        data.summary && `Summary: ${data.summary.slice(0, 300)}`,
        data.experience.length > 0 && `Experience: ${data.experience.map(e => `${e.title} at ${e.company} (${e.startDate || '?'} - ${e.endDate || 'Present'})${e.bullets?.length ? ': ' + e.bullets.slice(0, 2).join('; ') : ''}`).join('\n  ')}`,
        data.education.length > 0 && `Education: ${data.education.map(e => `${e.degree} in ${e.field} — ${e.institution}`).join('; ')}`,
        data.skills.length > 0 && `Skills: ${data.skills.map(s => s.name).join(', ')}`,
        data.certifications?.length > 0 && `Certifications: ${data.certifications.map(c => c.name).join(', ')}`,
        data.languages.length > 0 && `Languages: ${data.languages.join(', ')}`,
      ].filter(Boolean).join('\n')

      const designContext =
        `Current design: headingFont="${design.headingFont}", bodyFont="${design.bodyFont}", ` +
        `bodyFontSize=${design.bodyFontSize}px, lineSpacing=${design.lineSpacing}, ` +
        `primaryColor="${design.primaryColor}", secondaryColor="${design.secondaryColor}", ` +
        `columnLayout="${design.columnLayout}", margins=${design.margins}, sectionSpacing=${design.sectionSpacing}`

      const templateContext =
        `Templates: minimal, modern(two-col), executive, compact, classic, sidebar, bold, creative(two-col), tech(two-col), academic, charter, prestige, engineer, contemporary, folio.\n` +
        `Current: ${templateId}`

      const systemPrompt =
        `You are a resume editor. Edit the user's resume using [ACTION] tags. Be concise.\n\n` +
        `RESUME:\n${resumeContext}\n\n` +
        `${designContext}\n${templateContext}\n\n` +
        `ACTIONS (always include at least one when user asks for a change):\n\n` +
        `PDF EDITING:\n` +
        `edit_pdf_text — find and replace text: {"fn":"edit_pdf_text","find":"old text","replace":"new text"}\n` +
        `format_pdf — change color/font/size: {"fn":"format_pdf","target":"headings|body|all","color":"#hex","fontFamily":"Arial","fontSize":11,"matchText":"optional section"}\n\n` +
        `TEMPLATE:\n` +
        `set_template — {"fn":"set_template","templateId":"minimal|modern|executive|compact|classic|sidebar|bold|creative|tech|academic|charter|prestige|engineer|contemporary|folio"}\n` +
        `set_design — GLOBAL color/font: {"fn":"set_design","primaryColor":"#hex","headingFont":"Name","bodyFont":"Name"}\n\n` +
        `CONTENT (template view only):\n` +
        `set_summary, set_basics, add/remove/update_experience, add/remove_skill, set_skills, add/remove_education, add/remove_certification, add/remove_language, add/remove_link\n\n` +
        `RULES:\n` +
        `- Text changes → edit_pdf_text (not set_summary)\n` +
        `- Color/font on specific section → format_pdf with matchText (not set_design)\n` +
        `- Only use set_design for overall theme changes\n` +
        `- Only use set_template when user asks to switch template\n\n` +
        `EXAMPLES:\n` +
        `"Change role to Full Stack Engineer"\n→ [ACTION]{"fn":"edit_pdf_text","find":"Software Engineer","replace":"Full Stack Engineer"}[/ACTION]\n` +
        `"Change heading color to blue"\n→ [ACTION]{"fn":"format_pdf","target":"headings","color":"#2563EB"}[/ACTION]\n` +
        `"Change body font to Arial"\n→ [ACTION]{"fn":"format_pdf","target":"body","fontFamily":"Arial"}[/ACTION]\n` +
        `"Make it professional"\n→ [ACTION]{"fn":"set_template","templateId":"executive"}[/ACTION]`

      await AiService.chatStream(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        (token) => {
          fullText += token
          const clean = stripActions(fullText)
          updateLast(m => ({ ...m, content: clean }))
        },
        () => {
          let actions = parseActions(fullText)
          const cleanText = stripActions(fullText)

          if (actions.length === 0) {
            const fallback = generateFallbackActions(fullText, dataRef.current)
            if (fallback.length > 0) {
              console.log('[editor-ai] generated fallback actions', fallback)
              actions = fallback
            }
          }

          const hasActions = actions.length > 0

          const defaultReply = (() => {
            if (!hasActions) return cleanText
            const fns = actions.map(a => a.fn)
            if (fns.includes('edit_pdf_text')) return 'Text updated.'
            if (fns.includes('format_pdf')) return 'Formatting applied.'
            if (fns.includes('set_design')) return 'Design updated. Check the preview.'
            if (fns.includes('set_template')) return 'Template changed. Check the preview.'
            if (fns.some(f => f.startsWith('add_'))) return 'Added.'
            if (fns.some(f => f.startsWith('remove_'))) return 'Removed.'
            if (fns.some(f => f.startsWith('set_'))) return 'Updated.'
            return 'Done.'
          })()

          updateLast(m => ({ ...m, content: cleanText || defaultReply, actions }))

          let merged = { ...dataRef.current }
          let designMerged = { ...designRef.current }
          for (const a of actions) {
            const p = a.params || {}
            console.log('[editor-ai] applying action', a.fn, p)
            if (a.fn === 'set_design') {
              const changes = (p.design as Partial<DesignSettings>) || {}
              const topLevel: Record<string, unknown> = {}
              for (const key of ['primaryColor', 'headingFont', 'bodyFont', 'columnLayout', 'sectionSpacing', 'margins', 'lineSpacing', 'bodyFontSize'] as const) {
                if (key in p) topLevel[key] = p[key]
              }
              designMerged = { ...designMerged, ...changes, ...topLevel }
            } else {
              merged = applyActionToData(a, merged)
            }
          }
          if (actions.some(a => a.fn !== 'set_design' && a.fn !== 'set_template')) {
            onUpdate(merged)
          }
          if (actions.some(a => a.fn === 'set_design')) {
            onDesignUpdate(designMerged)
          }
          if (actions.some(a => a.fn === 'set_design' || a.fn === 'set_template')) {
            onShowTemplate()
          }
          const templateAction = actions.find(a => a.fn === 'set_template')
          if (templateAction && templateAction.params.templateId) {
            onTemplateChange(templateAction.params.templateId as TemplateId)
            onShowTemplate()
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
              onFormatPdf({ target, matchText: p.matchText as string | undefined, updates: updates as PdfBlockFormat['updates'] })
            }
          }
          const editTextAction = actions.find(a => a.fn === 'edit_pdf_text')
          if (editTextAction) {
            const p = editTextAction.params || {}
            if (p.find && p.replace) {
              onEditText({ find: p.find as string, replace: p.replace as string })
            }
          }
          setLoading(false)
        },
        (err) => {
          console.error('[editor-ai] stream error', err)
          updateLast(m => ({ ...m, content: m.content || 'Sorry, something went wrong. Please try again.', actions: [] }))
          setLoading(false)
        },
      )
    } catch {
      updateLast(m => ({ ...m, content: m.content || 'Sorry, something went wrong. Please try again.', actions: [] }))
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const actionLabel = (fn: string): string => {
    const labels: Record<string, string> = {
      set_summary: 'Updated summary',
      set_basics: 'Updated personal info',
      add_experience: 'Added experience',
      remove_experience: 'Removed experience',
      add_skill: 'Added skill',
      remove_skill: 'Removed skill',
      set_skills: 'Updated skills',
      add_education: 'Added education',
      add_certification: 'Added certification',
      add_language: 'Added language',
      remove_language: 'Removed language',
      set_design: 'Updated design',
      set_template: 'Changed template',
      remove_education: 'Removed education',
      remove_certification: 'Removed certification',
      add_link: 'Added link',
      remove_link: 'Removed link',
      update_experience: 'Updated experience',
      format_pdf: 'Formatted PDF',
      edit_pdf_text: 'Edited text',
    }
    return labels[fn] || `Applied: ${fn}`
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'assistant' && (
              <div className={`w-7 h-7 rounded-full bg-teal/10 flex items-center justify-center shrink-0 mt-0.5 ${loading && m.content === '' ? 'animate-pulse' : ''}`}>
                <IconRobot size={14} className="text-teal" />
              </div>
            )}
            <div className={`max-w-[85%] ${m.role === 'user' ? 'order-1' : ''}`}>
              {m.role === 'user' && (
                <div className="flex items-center gap-1.5 mb-1 justify-end">
                  <span className="text-[10px] text-muted/60">You</span>
                  <div className="w-5 h-5 rounded-full bg-ink/10 flex items-center justify-center">
                    <IconUser size={12} className="text-ink/60" />
                  </div>
                </div>
              )}
              <div
                className={`text-[13px] leading-relaxed whitespace-pre-wrap rounded-xl px-4 py-2.5 ${
                  m.role === 'user'
                    ? 'bg-teal text-white rounded-tr-sm'
                    : 'bg-paper text-ink border border-border rounded-tl-sm'
                }`}
              >
                {m.content}
                {loading && m.content === '' && (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </div>
              {m.actions.length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {m.actions.map((a, i) => (
                    <div key={i} className="flex items-center gap-1 text-[10px] text-teal font-medium animate-[fadeIn_0.3s_ease-in]">
                      <IconCheck size={10} className="shrink-0" />
                      <span>{actionLabel(a.fn)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border px-4 py-3">
        <div className="flex items-end gap-2 bg-paper rounded-xl border border-border focus-within:border-teal/50 transition-colors px-4 py-2.5">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the AI to edit your resume..."
            rows={1}
            disabled={loading}
            className="flex-1 text-[13px] bg-transparent outline-none resize-none text-ink placeholder:text-muted/40 max-h-32 disabled:opacity-50"
            style={{ minHeight: 20 }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 128) + 'px'
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-2 rounded-lg bg-teal text-white hover:bg-teal-dark transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <IconSend size={16} />
          </button>
        </div>
        <p className="text-[9px] text-muted/40 mt-1.5 text-center">
          The AI can read and edit every part of your resume
        </p>
      </div>
    </div>
  )
}
