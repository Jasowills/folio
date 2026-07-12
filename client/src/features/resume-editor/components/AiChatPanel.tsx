import { useState, useRef, useEffect, useCallback } from 'react'
import { IconSend, IconRobot, IconUser, IconPalette, IconSparkles } from '@tabler/icons-react'
import { AiService } from '../../../lib/ai'
import type { LocalData, DesignSettings } from '../../../pages/editor/types'
import type { TemplateId } from '../templates/types'
import type { PdfBlockFormat, PdfTextEdit } from '../../pdf-editor/PdfDocumentEditor'
import {
  type Action,
  type CanvasHighlight,
  type ActionHandlers,
  classifyIntent,
  parseActionFromText,
  generateFallbackActions,
  executeActions,
} from './ai/actions'
import { buildSystemPrompt } from './ai/prompts'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions: Action[]
  actionLabels: string[]
  highlights: CanvasHighlight[]
  pending?: boolean
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
  onHighlight?: (highlights: CanvasHighlight[]) => void
}

let msgId = 0
const nextId = () => `m_${++msgId}`

const WELCOME = {
  text:
    "I can help you edit your resume. Try:\n\n" +
    "• \"Change my name to Sarah\"\n" +
    "• \"Add React and TypeScript to skills\"\n" +
    "• \"Change heading color to navy\"\n" +
    "• \"Switch to modern template\"\n" +
    "• \"Make it professional\"",
  suggestions: [
    'Change my name',
    'Add a skill',
    'Change color',
    'Switch template',
  ],
}

const QUICK_ACTIONS = [
  { label: 'Improve summary', icon: IconSparkles, message: 'Improve my summary to be more impactful' },
  { label: 'Add skills', icon: IconSparkles, message: 'Add my top technical skills' },
  { label: 'Fix grammar', icon: IconSparkles, message: 'Fix grammar throughout my resume' },
  { label: 'Make professional', icon: IconPalette, message: 'Make it look professional' },
]

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

function parseStreamedActions(text: string): Action[] {
  const actions: Action[] = []
  const re = /\[ACTION\]([\s\S]*?)\[\/[%\s]*ACTION\]/g
  let match
  while ((match = re.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      actions.push({ fn: parsed.fn, params: parsed.params || parsed })
    } catch (e) {
      console.warn('[ai-chat] malformed action tag:', match[1].slice(0, 100), e)
    }
  }
  return actions
}

export default function AiChatPanel({
  data, onUpdate, design, onDesignUpdate, templateId,
  onTemplateChange, onShowTemplate, onFormatPdf, onEditText, onHighlight,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId(), role: 'assistant', content: WELCOME.text, actions: [], actionLabels: [], highlights: [] },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)
  const listRef = useRef<HTMLDivElement>(null)
  const dataRef = useRef(data)
  dataRef.current = data
  const designRef = useRef(design)
  designRef.current = design
  const templateIdRef = useRef(templateId)
  templateIdRef.current = templateId

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages])

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => [...prev, msg])
  }, [])

  const updateLast = useCallback((updater: (m: ChatMessage) => ChatMessage) => {
    setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? updater(m) : m))
  }, [])

  const handlers: ActionHandlers = {
    onUpdate,
    onDesignUpdate,
    onTemplateChange,
    onShowTemplate,
    onFormatPdf,
    onEditText,
    onHighlight: (highlights) => onHighlight?.(highlights),
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loadingRef.current) return
    loadingRef.current = true
    setInput('')

    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: text, actions: [], actionLabels: [], highlights: [] }
    addMessage(userMsg)

    const assistantId = nextId()
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', actions: [], actionLabels: [], highlights: [], pending: true }
    addMessage(assistantMsg)
    setLoading(true)

    const intent = classifyIntent(text)

    if (intent === 'deterministic') {
      const actions = parseActionFromText(text, dataRef.current)

      if (actions.length > 0) {
        const result = executeActions(actions, dataRef.current, designRef.current, handlers)
        updateLast(m => ({
          ...m,
          content: result.confirmation,
          actions,
          actionLabels: result.actionLabels,
          highlights: result.highlights,
          pending: false,
        }))
        setLoading(false)
        loadingRef.current = false
        return
      }

      await streamWithAI(text, assistantId)
    } else {
      await streamWithAI(text, assistantId)
    }
  }

  const streamWithAI = async (userText: string, _assistantId: string) => {
    let fullText = ''

    try {
      const systemPrompt = buildSystemPrompt(dataRef.current, designRef.current, templateIdRef.current)

      await AiService.chatStream(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText },
        ],
        (token) => {
          fullText += token
          const clean = stripActions(fullText)
          updateLast(m => ({ ...m, content: clean || '' }))
        },
        () => {
          let actions = parseStreamedActions(fullText)
          const cleanText = stripActions(fullText)

          if (actions.length === 0) {
            const fallback = generateFallbackActions(fullText, dataRef.current)
            if (fallback.length > 0) {
              console.log('[ai-chat] fallback actions', fallback)
              actions = fallback
            }
          }

          if (actions.length > 0) {
            const result = executeActions(actions, dataRef.current, designRef.current, handlers)
            updateLast(m => ({
              ...m,
              content: cleanText || result.confirmation,
              actions,
              actionLabels: result.actionLabels,
              highlights: result.highlights,
              pending: false,
            }))
          } else {
            updateLast(m => ({
              ...m,
              content: cleanText || "I'm not sure what change you'd like. Could you be more specific?",
              pending: false,
            }))
          }
          setLoading(false)
          loadingRef.current = false
        },
        (err) => {
          console.error('[ai-chat] stream error', err)
          updateLast(m => ({
            ...m,
            content: m.content || 'Sorry, something went wrong. Please try again.',
            actions: [],
            actionLabels: [],
            pending: false,
          }))
          setLoading(false)
          loadingRef.current = false
        },
      )
    } catch {
      updateLast(m => ({
        ...m,
        content: m.content || 'Sorry, something went wrong. Please try again.',
        actions: [],
        actionLabels: [],
        pending: false,
      }))
      setLoading(false)
      loadingRef.current = false
    }
  }

  const handleQuickAction = (message: string) => {
    setInput(message)
    requestAnimationFrame(() => {
      handleSendWithText(message)
    })
  }

  const handleSendWithText = async (text: string) => {
    if (!text || loadingRef.current) return
    loadingRef.current = true
    setInput('')

    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: text, actions: [], actionLabels: [], highlights: [] }
    addMessage(userMsg)

    const assistantId = nextId()
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', actions: [], actionLabels: [], highlights: [], pending: true }
    addMessage(assistantMsg)
    setLoading(true)

    const intent = classifyIntent(text)

    if (intent === 'deterministic') {
      const actions = parseActionFromText(text, dataRef.current)

      if (actions.length > 0) {
        const result = executeActions(actions, dataRef.current, designRef.current, handlers)
        updateLast(m => ({
          ...m,
          content: result.confirmation,
          actions,
          actionLabels: result.actionLabels,
          highlights: result.highlights,
          pending: false,
        }))
        setLoading(false)
        loadingRef.current = false
        return
      }

      await streamWithAI(text, assistantId)
    } else {
      await streamWithAI(text, assistantId)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-teal flex items-center justify-center">
            <IconRobot size={14} className="text-white" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-ink leading-tight">Resume Assistant</h3>
            <p className="text-[10px] text-muted leading-tight">Edits your resume directly</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m, idx) => (
          <div
            key={m.id}
            className={`animate-message-in ${m.role === 'user' ? 'flex justify-end' : ''}`}
            style={{ animationDelay: `${Math.min(idx * 30, 150)}ms` }}
          >
            {m.role === 'assistant' && (
              <div className={`w-7 h-7 rounded-full bg-teal/10 flex items-center justify-center shrink-0 mt-0.5 mr-2 transition-all duration-300 ${m.pending ? 'bg-teal/20 scale-110' : ''}`}>
                {m.pending ? (
                  <span className="flex items-center gap-0.5">
                    <span className="w-1 h-1 bg-teal rounded-full animate-thinking-dot" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-teal rounded-full animate-thinking-dot" style={{ animationDelay: '200ms' }} />
                    <span className="w-1 h-1 bg-teal rounded-full animate-thinking-dot" style={{ animationDelay: '400ms' }} />
                  </span>
                ) : (
                  <IconRobot size={14} className="text-teal" />
                )}
              </div>
            )}
            <div className={`max-w-[88%] ${m.role === 'user' ? 'order-1' : ''}`}>
              {m.role === 'user' && (
                <div className="flex items-center gap-1.5 mb-1 justify-end">
                  <span className="text-[10px] text-muted/60">You</span>
                  <div className="w-5 h-5 rounded-full bg-ink/10 flex items-center justify-center">
                    <IconUser size={12} className="text-ink/60" />
                  </div>
                </div>
              )}
              {m.content && (
                <div
                  className={`text-[13px] leading-relaxed whitespace-pre-wrap rounded-xl px-4 py-2.5 transition-all duration-200 ${
                    m.role === 'user'
                      ? 'bg-teal text-white rounded-tr-sm'
                      : 'bg-paper text-ink border border-border rounded-tl-sm'
                  }`}
                >
                  {m.content}
                </div>
              )}

              {/* Action labels with slide-in animation */}
              {m.actionLabels.length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {m.actionLabels.map((label, i) => (
                    <div
                      key={i}
                      className="animate-action-slide flex items-center gap-1.5 text-[10px] font-medium text-teal bg-teal/5 rounded-md px-2 py-0.5"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Quick action chips (show only when loading or first message) */}
        {!loading && messages.length === 1 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {QUICK_ACTIONS.map((qa, i) => (
              <button
                key={i}
                onClick={() => handleQuickAction(qa.message)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-teal bg-teal/5 hover:bg-teal/10 border border-teal/20 rounded-lg transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
              >
                <qa.icon size={12} />
                {qa.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3 shrink-0">
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
