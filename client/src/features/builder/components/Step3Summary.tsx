import { useState, useCallback, useRef, useEffect } from 'react'
import SKILLS_DICT from '../../../data/skills'

interface Props {
  data: { text: string; accepted: boolean } | null
  targetRole: { role: string; level: string; industry: string; jobDescription?: string } | null
  onAccept: (text: string) => void
  onGenerate: (text: string) => void
}

export default function Step3Summary({ data, targetRole, onAccept, onGenerate }: Props) {
  const [years, setYears] = useState(5)
  const [achievements, setAchievements] = useState('')
  const [toolsStr, setToolsStr] = useState('')
  const [tools, setTools] = useState<string[]>([])
  const [showToolSuggestions, setShowToolSuggestions] = useState(false)
  const [generatedText, setGeneratedText] = useState(data?.text || '')
  const [streaming, setStreaming] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const filteredTools = toolsStr.length > 2
    ? SKILLS_DICT.filter(s => s.toLowerCase().includes(toolsStr.toLowerCase()) && !tools.includes(s)).slice(0, 6)
    : []

  const addTool = (t: string) => {
    if (!tools.includes(t)) setTools(prev => [...prev, t])
    setToolsStr('')
    setShowToolSuggestions(false)
  }

  const stopStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setStreaming(false)
  }, [])

  useEffect(() => {
    return () => stopStream()
  }, [stopStream])

  const handleGenerate = async () => {
    if (!targetRole) return
    stopStream()
    setStreaming(true)
    setEditing(false)
    setGeneratedText('')
    onGenerate('')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/builder/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          resumeId: 'temp',
          targetRole: targetRole.role,
          level: targetRole.level,
          industry: targetRole.industry,
          years: Number(years),
          achievements,
          tools,
          jobDescription: targetRole.jobDescription || undefined,
        }),
        signal: controller.signal,
      })

      if (!response.ok) { setStreaming(false); return }

      const reader = response.body?.getReader()
      if (!reader) { setStreaming(false); return }

      const decoder = new TextDecoder()
      let fullText = ''

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
            setGeneratedText(fullText)
            onGenerate(fullText)
            if (parsed.done) { setStreaming(false) }
          } catch {}
        }
      }
      setStreaming(false)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setStreaming(false)
    }
  }

  const handleAccept = () => {
    if (generatedText) onAccept(generatedText)
  }

  const handleEditSave = () => {
    setGeneratedText(editText)
    setEditing(false)
  }

  const filteredToolSuggestions = toolsStr.length > 0 ? filteredTools : []

  return (
    <div className="p-6 space-y-4">
      <div>
        <label className="text-[12px] text-muted mb-1.5 block">How many years of experience do you have in total?</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYears(Math.max(0, years - 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-paper-dark transition-colors"
          >−</button>
          <input
            type="number"
            value={years}
            onChange={e => setYears(Math.max(0, Number(e.target.value)))}
            className="w-16 text-center px-2 py-1.5 text-[13px] bg-paper border border-border rounded-lg focus:outline-none focus:border-teal"
          />
          <button
            onClick={() => setYears(years + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-paper-dark transition-colors"
          >+</button>
        </div>
      </div>

      <div>
        <label className="text-[12px] text-muted mb-1.5 block">What are the two or three things you are most proud of professionally?</label>
        <textarea
          value={achievements}
          onChange={e => setAchievements(e.target.value)}
          placeholder="e.g. I built a design system used by 40 engineers, I grew organic traffic by 200%, I shipped a product from 0 to 100K users."
          rows={3}
          className="w-full px-3 py-2 text-[13px] bg-paper border border-border rounded-lg focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-colors resize-none"
        />
      </div>

      <div className="relative">
        <label className="text-[12px] text-muted mb-1.5 block">What tools and technologies define your work?</label>
        <div className="flex flex-wrap gap-1 mb-2">
          {tools.map(t => (
            <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-teal/10 text-teal rounded-full">
              {t}
              <button onClick={() => setTools(prev => prev.filter(x => x !== t))} className="hover:text-teal-dark">&times;</button>
            </span>
          ))}
        </div>
        <input
          value={toolsStr}
          onChange={e => { setToolsStr(e.target.value); setShowToolSuggestions(true) }}
          onFocus={() => setShowToolSuggestions(true)}
          onBlur={() => setTimeout(() => setShowToolSuggestions(false), 200)}
          onKeyDown={e => { if (e.key === 'Enter' && filteredToolSuggestions.length > 0) { addTool(filteredToolSuggestions[0]) } }}
          placeholder="e.g. React, Python, Figma"
          className="w-full px-3 py-2 text-[13px] bg-paper border border-border rounded-lg focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-colors"
        />
        {showToolSuggestions && filteredToolSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-10 py-1 max-h-40 overflow-y-auto">
            {filteredToolSuggestions.map(s => (
              <button
                key={s}
                onMouseDown={() => addTool(s)}
                className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-paper-dark transition-colors text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {!streaming && !editing && (
        <button
          onClick={handleGenerate}
          disabled={!targetRole || years < 1 || !achievements}
          className="w-full py-2.5 text-[13px] font-medium text-white bg-teal hover:bg-teal-dark disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          Write my summary →
        </button>
      )}

      {streaming && (
        <div className="p-3 bg-paper rounded-xl border border-teal/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 bg-teal rounded-full animate-pulse" />
            <span className="text-[10px] text-teal/70">Writing your summary...</span>
          </div>
          <p className="text-[12px] text-ink leading-relaxed">
            {generatedText}
            <span className="inline-block w-0.5 h-3.5 bg-teal ml-0.5 animate-pulse" />
          </p>
        </div>
      )}

      {!streaming && generatedText && !editing && (
        <div className="space-y-2">
          <p className="text-[12px] text-ink leading-relaxed bg-paper p-3 rounded-xl border border-border">{generatedText}</p>
          <button onClick={handleAccept} className="w-full py-2 text-[12px] font-medium text-white bg-teal hover:bg-teal-dark rounded-lg transition-colors">
            Looks good — continue →
          </button>
          <button onClick={handleGenerate} className="w-full py-2 text-[12px] text-ink bg-white border border-border rounded-lg hover:bg-paper-dark transition-colors">
            Try again
          </button>
          <button onClick={() => { setEditing(true); setEditText(generatedText) }} className="w-full text-center text-[11px] text-teal hover:underline transition-colors">
            Edit it myself
          </button>
        </div>
      )}

      {editing && (
        <div className="space-y-2">
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 text-[13px] bg-paper border border-border rounded-lg focus:outline-none focus:border-teal resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleEditSave} className="flex-1 py-2 text-[12px] font-medium text-white bg-teal rounded-lg transition-colors">
              Save
            </button>
            <button onClick={() => setEditing(false)} className="py-2 text-[12px] text-muted hover:text-ink transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
