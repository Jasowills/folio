import { useState, useEffect, useRef } from 'react'
import { useBuilderStore } from '../hooks/useBuilderStore'
import type { DesignSettings } from '../../../pages/editor/types'

interface LogEntry {
  time: string
  msg: string
}

export default function DebugPanel() {
  const store = useBuilderStore()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState('')
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const origLog = console.log
    const interceptor = (...args: unknown[]) => {
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a).slice(0, 200) : String(a)).join(' ')
      if (msg.includes('[builder]') || msg.includes('[chat]')) {
        setLogs(prev => [...prev.slice(-99), { time: new Date().toLocaleTimeString(), msg }])
      }
      origLog.apply(console, args)
    }
    console.log = interceptor
    return () => { console.log = origLog }
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  const designFields: (keyof DesignSettings)[] = ['primaryColor', 'headingFont', 'bodyFont', 'bodyFontSize', 'lineSpacing', 'columnLayout']

  const filteredLogs = filter ? logs.filter(l => l.msg.toLowerCase().includes(filter.toLowerCase())) : logs

  return (
    <div className="absolute right-0 top-12 bottom-0 w-[400px] bg-white border-l border-border shadow-xl z-50 flex flex-col text-[11px] font-mono overflow-hidden">
      <div className="flex items-center justify-between px-3 h-9 border-b border-border shrink-0 bg-ink text-white">
        <span className="font-semibold">Debug</span>
        <span className="text-[9px] text-white/60">Ctrl+Shift+D</span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-border/30">
        {/* Store state */}
        <section className="p-3 space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted/60">Store</div>
          <div className="space-y-0.5">
            <InfoRow label="template" value={store.selectedTemplate || 'null'} />
            <InfoRow label="resumeId" value={store.resumeId || 'null'} />
            <InfoRow label="currentStep" value={String(store.currentStep)} />
            <InfoRow label="completedSteps" value={`[${store.completedSteps.join(',')}]`} />
            <InfoRow label="history" value={`${store._history.length} / redo: ${store._future.length}`} />
          </div>
        </section>

        {/* stepData summary */}
        <section className="p-3 space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted/60">Step Data</div>
          <div className="space-y-0.5">
            <InfoRow label="basics" value={store.stepData.basics ? `${store.stepData.basics.name} | ${store.stepData.basics.headline}` : 'null'} />
            <InfoRow label="targetRole" value={store.stepData.targetRole?.role || 'null'} />
            <InfoRow label="summary" value={store.stepData.summary ? `${store.stepData.summary.text.slice(0, 40)}...` : 'null'} />
            <InfoRow label="experience" value={String(store.stepData.experience.length)} />
            <InfoRow label="education" value={String(store.stepData.education.length)} />
            <InfoRow label="skills" value={`[${store.stepData.skills.join(', ')}]`} />
          </div>
        </section>

        {/* Design */}
        <section className="p-3 space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted/60">Design</div>
          <div className="space-y-0.5">
            {designFields.map(f => (
              <InfoRow key={f} label={f} value={String(store.design[f])} />
            ))}
            <InfoRow label="sectionOrder stub" value={`[${['summary','experience','education','skills','certifications','languages','links'].join(', ')}]`} />
          </div>
        </section>

        {/* Action Log */}
        <section className="p-3 space-y-1.5 flex flex-col min-h-0">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted/60">Action Log</div>
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter..."
              className="w-24 px-1.5 py-0.5 text-[9px] border border-border rounded bg-paper outline-none focus:border-teal"
            />
          </div>
          <div ref={logRef} className="flex-1 overflow-y-auto max-h-[260px] space-y-0.5 mt-1">
            {filteredLogs.length === 0 && (
              <div className="text-[10px] text-muted/40 italic">Waiting for [builder] or [chat] logs...</div>
            )}
            {filteredLogs.map((entry, i) => (
              <div key={i} className="text-[9px] leading-relaxed">
                <span className="text-muted/40">{entry.time}</span>{' '}
                <span className={entry.msg.includes('[chat]') ? 'text-teal' : 'text-ink'}>{entry.msg}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Force actions */}
      <div className="border-t border-border p-2 flex gap-1.5 shrink-0">
        <button
          onClick={() => {
            console.log('[builder] FORCE: setting primaryColor to red')
            store.setDesign({ primaryColor: '#FF0000' } as any)
          }}
          className="flex-1 px-2 py-1 text-[10px] bg-danger/10 text-danger rounded hover:bg-danger/20 transition-colors"
        >
          Force Red
        </button>
        <button
          onClick={() => {
            console.log('[builder] FORCE: setting name')
            store.setBasics({ name: 'Debug User', headline: 'Debug Title', email: 'debug@test.com', phone: '', location: '' })
          }}
          className="flex-1 px-2 py-1 text-[10px] bg-teal/10 text-teal rounded hover:bg-teal/20 transition-colors"
        >
          Force Name
        </button>
        <button
          onClick={() => {
            console.log('[builder] FORCE: adding experience')
            store.addExperience({ title: 'Debug Engineer', company: 'Debug Corp', startDate: '2020', endDate: '', current: true, location: '', rawNotes: '', bullets: ['Built debug tools'] })
          }}
          className="flex-1 px-2 py-1 text-[10px] bg-amber/10 text-amber rounded hover:bg-amber/20 transition-colors"
        >
          Force Exp
        </button>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted/60 w-24 shrink-0">{label}</span>
      <span className="text-ink truncate">{value}</span>
    </div>
  )
}
