import { useState, useRef, useEffect, useCallback } from 'react'
import { IconSend, IconRobot, IconUser, IconCheck, IconX } from '@tabler/icons-react'
import type { BuilderStepData } from '../types'

interface Action {
  fn: string
  params: Record<string, unknown>
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions: Action[]
  streaming?: boolean
}

interface Props {
  resumeId: string
  stepData: BuilderStepData
  onAction: (fn: string, params: Record<string, unknown>) => void
}

let msgId = 0
const nextId = () => `m_${++msgId}`

function buildSnapshot(sd: BuilderStepData): Record<string, unknown> {
  return {
    basics: sd.basics,
    targetRole: sd.targetRole,
    summary: sd.summary,
    experience: sd.experience,
    education: sd.education,
    skills: sd.skills,
    optional: sd.optional,
  }
}

const WELCOME =
  "Hi! I can help you build your resume. Try things like:\n\n" +
  "• \"Add React to my skills\"\n" +
  "• \"Write a summary for a senior product designer role\"\n" +
  "• \"Add a software engineer experience at Google\"\n" +
  "• \"Review my resume for ATS issues\""

function stripActions(text: string): string {
  const cleaned = text.replace(/\[ACTION\].*?\[\/ACTION\]/g, '')
  const openIdx = cleaned.indexOf('[ACTION]')
  return openIdx === -1 ? cleaned : cleaned.slice(0, openIdx)
}

function parseCompleteActions(text: string): Action[] {
  const actions: Action[] = []
  const re = /\[ACTION\](.*?)\[\/ACTION\]/g
  let match
  while ((match = re.exec(text)) !== null) {
    try { actions.push(JSON.parse(match[1])) } catch { /* skip malformed */ }
  }
  return actions
}

export default function ChatInterface({ resumeId, stepData, onAction }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId(), role: 'assistant', content: WELCOME, actions: [] },
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const streamRef = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const execCountRef = useRef(0)

  const stopStream = useCallback(() => {
    if (streamRef.current) { streamRef.current.abort(); streamRef.current = null }
    setStreaming(false)
  }, [])

  useEffect(() => () => stopStream(), [stopStream])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const addMessage = (msg: ChatMessage) => setMessages(prev => [...prev, msg])
  const updateLastAssistant = (updater: (m: ChatMessage) => ChatMessage) =>
    setMessages(prev => prev.map((m, i) => i === prev.length - 1 && m.role === 'assistant' ? updater(m) : m))

  const handleSend = async () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    stopStream()

    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: text, actions: [] }
    addMessage(userMsg)

    const assistantMsg: ChatMessage = { id: nextId(), role: 'assistant', content: '', actions: [], streaming: true }
    addMessage(assistantMsg)

    setStreaming(true)
    execCountRef.current = 0
    const controller = new AbortController()
    streamRef.current = controller

    const history = messages
      .filter(m => m.role !== 'assistant' || m.id !== assistantMsg.id)
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content }))

    let fullText = ''
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/builder/${resumeId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          message: text,
          history,
          resumeSnapshot: buildSnapshot(stepData),
        }),
        signal: controller.signal,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const json = line.slice(6).trim()
          if (json === '[DONE]') continue
          try {
            const parsed = JSON.parse(json)
            if (parsed.error) { setStreaming(false); return }
            if (parsed.text) fullText += parsed.text
            if (parsed.text || parsed.done) {
              const allActions = parseCompleteActions(fullText)
              const newActions = allActions.slice(execCountRef.current)
              execCountRef.current = allActions.length
              for (const a of newActions) {
                console.log('[chat] parsed action', a.fn, a.params)
                onAction(a.fn, a.params)
              }
              if (newActions.length > 0) {
                updateLastAssistant(m => ({
                  ...m,
                  actions: [...m.actions, ...newActions],
                }))
              }
              updateLastAssistant(m => ({ ...m, content: stripActions(fullText) }))
            }
            if (parsed.done) { setStreaming(false); return }
          } catch {}
        }
      }
      setStreaming(false)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      updateLastAssistant(m => ({ ...m, content: m.content || 'Sorry, something went wrong. Please try again.' }))
      setStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const actionLabel = (fn: string): string => {
    const labels: Record<string, string> = {
      set_basics: 'Updated personal info',
      set_summary: 'Wrote summary',
      add_experience: 'Added experience',
      update_experience_bullets: 'Updated bullet points',
      remove_experience: 'Removed experience',
      add_education: 'Added education',
      remove_education: 'Removed education',
      add_skill: 'Added skill',
      remove_skill: 'Removed skill',
      set_skills: 'Updated skills',
      review_resume: 'Reviewed resume',
      set_target_role: 'Set target role',
      remove_experience: 'Removed experience',
      update_experience_bullets: 'Updated bullet points',
      add_education: 'Added education',
      remove_education: 'Removed education',
      set_optional: 'Updated optional sections',
    }
    return labels[fn] || `Executed: ${fn}`
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
                {m.streaming && (
                  <span className="inline-block w-1.5 h-4 bg-teal ml-0.5 animate-pulse align-text-bottom" />
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
            placeholder="Ask the AI to build or edit your resume..."
            rows={1}
            disabled={streaming}
            className="flex-1 text-[13px] bg-transparent outline-none resize-none text-ink placeholder:text-muted/40 max-h-32 disabled:opacity-50"
            style={{ minHeight: 20 }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 128) + 'px'
            }}
          />
          <button
            onClick={streaming ? stopStream : handleSend}
            disabled={!streaming && !input.trim()}
            className={`p-2 rounded-lg transition-colors shrink-0 ${
              streaming
                ? 'bg-danger/10 text-danger hover:bg-danger/20'
                : 'bg-teal text-white hover:bg-teal-dark disabled:opacity-30 disabled:cursor-not-allowed'
            }`}
          >
            {streaming ? <IconX size={16} /> : <IconSend size={16} />}
          </button>
        </div>
        <p className="text-[9px] text-muted/40 mt-1.5 text-center">
          The AI can read, write, and modify any part of your resume
        </p>
      </div>
    </div>
  )
}
