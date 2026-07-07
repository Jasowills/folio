import { useState, useRef, useEffect } from 'react'
import { IconSend, IconRobot, IconUser, IconCheck } from '@tabler/icons-react'
import { AiService } from '../../../lib/ai'
import type { LocalData } from '../../../pages/editor/types'

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
  return text.replace(/\[ACTION\].*?\[\/ACTION\]/g, '')
}

function parseActions(text: string): Action[] {
  const actions: Action[] = []
  const re = /\[ACTION\](.*?)\[\/ACTION\]/g
  let match
  while ((match = re.exec(text)) !== null) {
    try { actions.push(JSON.parse(match[1])) } catch { /* skip malformed */ }
  }
  return actions
}

export default function AiChatPanel({ data, onUpdate }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId(), role: 'assistant', content: WELCOME, actions: [] },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const addMessage = (msg: ChatMessage) => setMessages(prev => [...prev, msg])
  const updateLast = (updater: (m: ChatMessage) => ChatMessage) =>
    setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? updater(m) : m))

  const applyAction = (action: Action) => {
    const { fn, params } = action
    switch (fn) {
      case 'set_summary':
        if (typeof params.text === 'string') {
          onUpdate({ ...data, summary: params.text })
        }
        break
      case 'set_basics':
        onUpdate({
          ...data,
          name: (params.name as string) ?? data.name,
          contact: {
            ...data.contact,
            email: (params.email as string) ?? data.contact.email,
            phone: (params.phone as string) ?? data.contact.phone,
            location: (params.location as string) ?? data.contact.location,
          },
        })
        break
      case 'add_experience': {
        const exp = {
          company: (params.company as string) || '',
          title: (params.title as string) || '',
          startDate: params.startDate as string | undefined,
          endDate: params.endDate as string | undefined,
          current: !!params.current,
          bullets: (params.bullets as string[]) || [],
        }
        onUpdate({ ...data, experience: [...data.experience, exp] })
        break
      }
      case 'remove_experience': {
        const idx = params.index as number
        onUpdate({ ...data, experience: data.experience.filter((_, i) => i !== idx) })
        break
      }
      case 'add_skill':
        if (typeof params.skill === 'string' && !data.skills.some(s => s.name === params.skill)) {
          onUpdate({ ...data, skills: [...data.skills, { name: params.skill, category: params.category as string | undefined }] })
        }
        break
      case 'remove_skill':
        onUpdate({ ...data, skills: data.skills.filter(s => s.name !== params.skill) })
        break
      case 'set_skills':
        if (Array.isArray(params.skills)) {
          onUpdate({ ...data, skills: params.skills.map((s: any) => typeof s === 'string' ? { name: s } : s) })
        }
        break
      case 'add_education': {
        const edu = {
          institution: (params.institution as string) || '',
          degree: (params.degree as string) || '',
          field: (params.field as string) || '',
          startDate: params.startDate as string | undefined,
          endDate: params.endDate as string | undefined,
          gpa: params.gpa as string | undefined,
        }
        onUpdate({ ...data, education: [...data.education, edu] })
        break
      }
      case 'add_certification': {
        const cert = {
          name: (params.name as string) || '',
          issuer: (params.issuer as string) || '',
          date: params.date as string | undefined,
        }
        onUpdate({ ...data, certifications: [...(data.certifications || []), cert] })
        break
      }
      case 'add_language':
        if (typeof params.language === 'string' && !data.languages.includes(params.language)) {
          onUpdate({ ...data, languages: [...data.languages, params.language] })
        }
        break
      case 'remove_language':
        onUpdate({ ...data, languages: data.languages.filter(l => l !== params.language) })
        break
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: text, actions: [] }
    addMessage(userMsg)

    const assistantMsg: ChatMessage = { id: nextId(), role: 'assistant', content: '', actions: [] }
    addMessage(assistantMsg)
    setLoading(true)

    try {
      const systemPrompt =
        'You are an AI resume editor. You can modify the user\'s resume by emitting [ACTION] tags in your response.\n\n' +
        'Available actions (include AFTER your text explanation):\n' +
        '• [ACTION]{"fn":"set_summary","text":"new summary text"}[/ACTION]\n' +
        '• [ACTION]{"fn":"set_basics","name":"...","email":"...","phone":"...","location":"..."}[/ACTION]\n' +
        '• [ACTION]{"fn":"add_experience","title":"...","company":"...","startDate":"...","endDate":"...","current":false,"bullets":["..."]}[/ACTION]\n' +
        '• [ACTION]{"fn":"remove_experience","index":0}[/ACTION]\n' +
        '• [ACTION]{"fn":"add_skill","skill":"React","category":"Frontend"}[/ACTION]\n' +
        '• [ACTION]{"fn":"remove_skill","skill":"SomeSkill"}[/ACTION]\n' +
        '• [ACTION]{"fn":"set_skills","skills":["React","TypeScript"]}[/ACTION]\n' +
        '• [ACTION]{"fn":"add_education","institution":"MIT","degree":"BS","field":"CS","startDate":"2020","endDate":"2024"}[/ACTION]\n' +
        '• [ACTION]{"fn":"add_certification","name":"AWS Developer","issuer":"Amazon","date":"2024"}[/ACTION]\n' +
        '• [ACTION]{"fn":"add_language","language":"Spanish"}[/ACTION]\n' +
        '• [ACTION]{"fn":"remove_language","language":"Spanish"}[/ACTION]\n\n' +
        'Always explain what you changed and why. Include action tags so the UI can apply the changes.\n\n' +
        `Current resume data: ${JSON.stringify({
          name: data.name,
          summary: data.summary,
          experience: data.experience.map(e => ({ title: e.title, company: e.company })),
          education: data.education.map(e => ({ degree: e.degree, institution: e.institution })),
          skills: data.skills.map(s => s.name),
          certifications: data.certifications?.map(c => c.name) || [],
          languages: data.languages,
        }, null, 2)}`

      const result = await AiService.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ])

      const fullText = result.message?.content || ''
      const actions = parseActions(fullText)
      const cleanText = stripActions(fullText)

      updateLast(m => ({ ...m, content: cleanText, actions }))

      for (const a of actions) {
        console.log('[editor-ai] applying action', a.fn, a.params)
        applyAction(a)
      }
    } catch {
      updateLast(m => ({ ...m, content: m.content || 'Sorry, something went wrong. Please try again.' }))
    } finally {
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
    }
    return labels[fn] || `Applied: ${fn}`
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-teal/10 flex items-center justify-center shrink-0 mt-0.5">
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
                    <div key={i} className="flex items-center gap-1 text-[10px] text-teal">
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
        <div className="flex items-end gap-2 bg-paper rounded-xl border border-border focus-within:border-teal/50 transition-colors px-3 py-2">
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
