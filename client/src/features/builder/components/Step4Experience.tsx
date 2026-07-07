import { useState, useRef, useEffect, useCallback } from 'react'
import { IconCheck, IconRefresh, IconPencil, IconTrash } from '@tabler/icons-react'

interface ExperienceForm {
  title: string
  company: string
  startDate: string
  endDate: string
  current: boolean
  location: string
  rawNotes: string
}

interface BulletEntry {
  text: string
  accepted: boolean
}

interface Props {
  data: Array<{ title: string; company: string; startDate: string; endDate: string; current: boolean; location: string; rawNotes: string; bullets: string[] }>
  targetRole: { role: string; level: string; jobDescription?: string } | null
  onAdd: (entry: ExperienceForm & { bullets: string[] }) => void
  onUpdateBullets: (index: number, bullets: string[]) => void
  onRemove: (index: number) => void
  onDone: () => void
}

const COMMON_TITLES = [
  'Software Engineer', 'Senior Software Engineer', 'Staff Software Engineer',
  'Product Designer', 'Senior Product Designer', 'UX Designer', 'UI Designer',
  'Product Manager', 'Senior Product Manager', 'Engineering Manager',
  'Data Scientist', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'DevOps Engineer', 'Marketing Manager', 'Sales Executive',
]

function emptyForm(): ExperienceForm {
  return { title: '', company: '', startDate: '', endDate: '', current: false, location: '', rawNotes: '' }
}

export default function Step4Experience({ data, targetRole, onAdd, onUpdateBullets: _oub, onRemove, onDone }: Props) {
  void _oub
  const [form, setForm] = useState<ExperienceForm>(emptyForm())
  const [showTitleSugg, setShowTitleSugg] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [bullets, setBullets] = useState<BulletEntry[]>([])
  const [editingBulletIdx, setEditingBulletIdx] = useState<number | null>(null)
  const [editBulletText, setEditBulletText] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const stopStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setStreaming(false)
  }, [])

  useEffect(() => () => stopStream(), [stopStream])

  const filteredTitles = COMMON_TITLES.filter(
    t => form.title && t.toLowerCase().includes(form.title.toLowerCase()) && t !== form.title
  ).slice(0, 6)

  const handleGenerate = async () => {
    if (!targetRole) return
    stopStream()
    setStreaming(true)
    setBullets([])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/builder/generate-bullets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          resumeId: 'temp',
          jobTitle: form.title,
          company: form.company,
          rawNotes: form.rawNotes,
          targetRole: targetRole.role,
          level: targetRole.level,
          jobDescription: targetRole.jobDescription,
        }),
        signal: controller.signal,
      })

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
            if (parsed.done) {
              // Parse JSON array from accumulated text
              try {
                const parsedBullets = JSON.parse(fullText)
                if (Array.isArray(parsedBullets)) {
                  setBullets(parsedBullets.map((b: string) => ({ text: b, accepted: true })))
                }
              } catch {
                // Try splitting by newlines
                const lines = fullText.split('\n').filter(l => l.trim())
                setBullets(lines.map(l => ({ text: l.replace(/^[-•*"\s]+|["\s,]+$/g, ''), accepted: true })))
              }
              setStreaming(false)
            }
          } catch {}
        }
      }
      setStreaming(false)
    } catch {
      setStreaming(false)
    }
  }

  const handleAcceptRole = () => {
    if (!form.title || !form.company) return
    onAdd({ ...form, bullets: bullets.map(b => b.text) })
    setForm(emptyForm())
    setBullets([])
  }

  const toggleBulletAccept = (idx: number) => {
    setBullets(prev => prev.map((b, i) => i === idx ? { ...b, accepted: !b.accepted } : b))
  }

  const regenerateBullet = (idx: number) => {
    // For simplicity, just toggle — full regeneration would need another AI call
    setBullets(prev => prev.map((b, i) => i === idx && !b.accepted ? { ...b, accepted: true } : b))
  }

  const editBullet = (idx: number) => {
    setEditingBulletIdx(idx)
    setEditBulletText(bullets[idx].text)
  }

  const saveEditBullet = () => {
    if (editingBulletIdx !== null) {
      setBullets(prev => prev.map((b, i) => i === editingBulletIdx ? { ...b, text: editBulletText } : b))
      setEditingBulletIdx(null)
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Existing entries */}
      {data.map((entry, i) => (
        <div key={i} className="p-4 bg-paper rounded-xl border border-border">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span className="text-[12px] font-medium text-ink">{entry.title}</span>
              <span className="text-[11px] text-muted ml-2">@ {entry.company}</span>
            </div>
            <button onClick={() => onRemove(i)} className="text-danger/60 hover:text-danger transition-colors">
              <IconTrash size={14} />
            </button>
          </div>
          {entry.bullets.length > 0 && (
            <ul className="mt-2 space-y-1">
              {entry.bullets.map((b, j) => (
                <li key={j} className="text-[11px] text-muted flex items-start gap-1.5">
                  <span className="text-teal shrink-0 mt-0.5">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {/* New entry form */}
      <div className="p-4 bg-paper rounded-xl border border-dashed border-teal/30 space-y-3">
        <span className="text-[11px] font-medium text-teal">
          {data.length === 0 ? 'Start with your most recent role' : 'Add another role'}
        </span>

        <div className="relative">
          <label className="text-[10px] text-muted mb-1 block">Job title</label>
          <input
            value={form.title}
            onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setShowTitleSugg(true) }}
            onFocus={() => setShowTitleSugg(true)}
            onBlur={() => setTimeout(() => setShowTitleSugg(false), 200)}
            placeholder="Senior Product Designer"
            className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal transition-colors"
          />
          {showTitleSugg && filteredTitles.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-10 py-1">
              {filteredTitles.map(t => (
                <button key={t} onMouseDown={() => { setForm(f => ({ ...f, title: t })); setShowTitleSugg(false) }} className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-paper-dark text-ink">{t}</button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] text-muted mb-1 block">Company</label>
          <input
            value={form.company}
            onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
            placeholder="Acme Inc."
            className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted mb-1 block">Start date</label>
            <input
              value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              placeholder="MM/YYYY"
              className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted mb-1 block">End date</label>
            <div className="flex items-center gap-2">
              <input
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                disabled={form.current}
                placeholder="MM/YYYY"
                className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal transition-colors disabled:opacity-40"
              />
              <label className="flex items-center gap-1 text-[10px] text-muted whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={form.current}
                  onChange={e => setForm(f => ({ ...f, current: e.target.checked }))}
                  className="rounded border-border"
                />
                Current
              </label>
            </div>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-muted mb-1 block">Location <span className="text-muted/50">(optional)</span></label>
          <input
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            placeholder="San Francisco, CA"
            className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal transition-colors"
          />
        </div>

        <div>
          <label className="text-[10px] text-muted mb-1 block">What did you actually do in this role?</label>
          <textarea
            value={form.rawNotes}
            onChange={e => setForm(f => ({ ...f, rawNotes: e.target.value }))}
            placeholder="e.g. Led redesign of checkout flow, worked with 5 engineers, cut load time by 2 seconds, increased conversion by 18%, owned the design system, presented to C-suite quarterly."
            rows={3}
            className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal transition-colors resize-none"
          />
          <p className="text-[9px] text-muted/50 mt-1">Write messy notes — the AI turns them into professional bullet points.</p>
        </div>

        {!streaming && bullets.length === 0 && (
          <button
            onClick={handleGenerate}
            disabled={!form.title || !form.company || !form.rawNotes || !targetRole}
            className="w-full py-2 text-[12px] font-medium text-white bg-teal hover:bg-teal-dark disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Write my bullets →
          </button>
        )}

        {streaming && (
          <div className="p-3 bg-white rounded-lg border border-teal/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 bg-teal rounded-full animate-pulse" />
              <span className="text-[10px] text-teal/70">Writing your bullet points...</span>
            </div>
          </div>
        )}

        {bullets.length > 0 && !streaming && (
          <div className="space-y-1.5">
            {bullets.map((b, i) => (
              <div key={i} className="flex items-start gap-2 group">
                <span className="text-teal shrink-0 mt-0.5">•</span>
                {editingBulletIdx === i ? (
                  <div className="flex-1 space-y-1">
                    <textarea
                      value={editBulletText}
                      onChange={e => setEditBulletText(e.target.value)}
                      rows={2}
                      className="w-full px-2 py-1 text-[11px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal resize-none"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <button onClick={saveEditBullet} className="text-[10px] text-teal font-medium">Save</button>
                      <button onClick={() => setEditingBulletIdx(null)} className="text-[10px] text-muted">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className={`flex-1 text-[11px] ${b.accepted ? 'text-ink' : 'text-muted/50 line-through'}`}>{b.text}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => toggleBulletAccept(i)} className={`p-0.5 rounded transition-colors ${b.accepted ? 'text-teal' : 'text-muted/30 hover:text-muted'}`}>
                        <IconCheck size={13} />
                      </button>
                      <button onClick={() => regenerateBullet(i)} className="p-0.5 rounded text-muted/30 hover:text-teal transition-colors">
                        <IconRefresh size={13} />
                      </button>
                      <button onClick={() => editBullet(i)} className="p-0.5 rounded text-muted/30 hover:text-ink transition-colors">
                        <IconPencil size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {bullets.length > 0 && !streaming && (
          <button
            onClick={handleAcceptRole}
            className="w-full mt-2 py-2 text-[12px] font-medium text-white bg-teal hover:bg-teal-dark rounded-lg transition-colors"
          >
            Add this role & continue
          </button>
        )}
      </div>

      {data.length > 0 && (
        <button
          onClick={onDone}
          className="w-full py-2.5 text-[13px] font-medium text-white bg-teal hover:bg-teal-dark rounded-lg transition-colors"
        >
          Done with experience →
        </button>
      )}
    </div>
  )
}
