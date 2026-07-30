import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAutoApplyProfile, useUpdateLogistics, useUpdateStyle, useCreateCustomQa, useUpdateWizardStep } from '../../../lib/queries'
import type { AutoApplyProfile, CustomQAEntry } from '../../../lib/queries'

type LogisticsAnswers = AutoApplyProfile['logisticsAnswers']
type ApplicationStyle = AutoApplyProfile['applicationStyle']

const SECTIONS = [
  { key: 'logistics', label: 'Logistics', required: true },
  { key: 'style', label: 'Style', required: true },
  { key: 'common', label: 'Common Questions', required: false },
]

const TOTAL_QUESTIONS = 14

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06 0L2.22 9.78a.75.75 0 011.06-1.06L5.5 11.44l6.72-6.72a.75.75 0 011.06 0z" />
    </svg>
  )
}

function SectionIndicator({ current }: { current: number }) {
  const idx = current <= 0 ? 0 : current <= 6 ? 0 : current <= 10 ? 1 : current < TOTAL_QUESTIONS ? 2 : 2
  return (
    <div className="flex items-center justify-center gap-3 mb-2">
      {SECTIONS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1.5">
          <div className={`h-1.5 w-1.5 rounded-full ${i <= idx ? 'bg-teal' : 'bg-border'}`} />
          <span className={`text-[11px] font-medium tracking-wide ${i <= idx ? 'text-ink' : 'text-muted'}`}>
            {s.label}{s.required ? <span className="text-muted-light ml-0.5">*</span> : null}
          </span>
        </div>
      ))}
    </div>
  )
}

function ProgressBar({ current }: { current: number }) {
  const pct = current === TOTAL_QUESTIONS ? 100 : (current / TOTAL_QUESTIONS) * 100
  return (
    <div className="mb-8">
      <SectionIndicator current={current} />
      <div className="h-1 bg-border rounded-full overflow-hidden">
        <div className="h-full bg-teal rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-muted text-center mt-1.5 tracking-wide">
        Auto-apply activates once Logistics and Style are complete
      </p>
    </div>
  )
}

function StepCount({ current }: { current: number }) {
  return <span className="text-[11px] font-medium text-muted tracking-wide">{current + 1} of {TOTAL_QUESTIONS}</span>
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-5 py-3 text-sm font-medium rounded-xl border transition-all ${selected ? 'bg-teal text-white border-teal shadow-sm' : 'bg-surface text-ink border-border hover:border-teal/30 hover:bg-teal-light/30'}`}>
      {selected && <CheckIcon className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />}
      {label}
    </button>
  )
}

function BinaryButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex-1 py-4 px-6 text-base font-medium rounded-xl border-2 transition-all ${selected ? 'bg-teal text-white border-teal shadow-md' : 'bg-surface text-ink border-border hover:border-teal/30 hover:bg-teal-light/30'}`}>
      {selected && <CheckIcon className="inline h-4 w-4 mr-2 -mt-0.5" />}
      {label}
    </button>
  )
}

function ToneCard({ label, example, selected, onClick }: { label: string; example: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`text-left px-4 py-3.5 rounded-xl border-2 transition-all ${selected ? 'bg-teal text-white border-teal shadow-sm' : 'bg-surface text-ink border-border hover:border-teal/30'}`}>
      <span className="block text-sm font-semibold mb-0.5">
        {selected && <CheckIcon className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />}
        {label}
      </span>
      <span className={`block text-[11px] ${selected ? 'text-white/70' : 'text-muted'}`}>{example}</span>
    </button>
  )
}

function TagInput({ tags, onAdd, onRemove, placeholder }: { tags: string[]; onAdd: (t: string) => void; onRemove: (t: string) => void; placeholder: string }) {
  const [val, setVal] = useState('')
  const add = () => { const t = val.trim(); if (t && !tags.includes(t)) { onAdd(t); setVal('') } }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input type="text" value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder={placeholder} className="flex-1 px-4 py-2.5 text-sm bg-surface border border-border rounded-xl text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30" />
        <button onClick={add} disabled={!val.trim()} className="px-4 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 disabled:opacity-40 transition-opacity">Add</button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-surface border border-border rounded-full text-ink">
              {t}
              <button onClick={() => onRemove(t)} className="text-muted hover:text-danger leading-none">&times;</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AutoApplySetupWizard() {
  const navigate = useNavigate()
  const { data: profile, isLoading } = useAutoApplyProfile()
  const updateLogistics = useUpdateLogistics()
  const updateStyle = useUpdateStyle()
  const createQa = useCreateCustomQa()
  const updateStep = useUpdateWizardStep()
  const savingRef = useRef(false)

  const [logistics, setLogistics] = useState<LogisticsAnswers | null>(null)
  const [style, setStyle] = useState<ApplicationStyle | null>(null)
  const [customQaList, setCustomQaList] = useState<CustomQAEntry[]>([])
  const [step, setStep] = useState(0)
  const initDone = useRef(false)

  useEffect(() => {
    if (!profile || initDone.current) return
    initDone.current = true
    setLogistics(profile.logisticsAnswers)
    setStyle(profile.applicationStyle)
    setCustomQaList(profile.customQA || [])
    void Promise.resolve().then(() => {
      const s = profile.wizardStep ?? 0
      if (s >= 0 && s < TOTAL_QUESTIONS) setStep(s)
      else setStep(0)
    })
  }, [profile])

  const saveLogistics = useCallback((patch: Partial<LogisticsAnswers>) => {
    if (!logistics) return
    const merged = { ...logistics, ...patch }
    setLogistics(merged)
    savingRef.current = true
    updateLogistics.mutate(merged, { onSettled: () => { savingRef.current = false } })
  }, [logistics, updateLogistics])

  const saveStyle = useCallback((patch: Partial<ApplicationStyle>) => {
    if (!style) return
    const merged = { ...style, ...patch }
    setStyle(merged)
    savingRef.current = true
    updateStyle.mutate(merged, { onSettled: () => { savingRef.current = false } })
  }, [style, updateStyle])

  const goNext = useCallback(() => {
    const next = step + 1
    if (next <= TOTAL_QUESTIONS) {
      setStep(next)
      if (next < TOTAL_QUESTIONS) updateStep.mutate(next)
    }
  }, [step, updateStep])

  const goBack = useCallback(() => {
    if (step > 0) setStep((p) => p - 1)
  }, [step])

  if (isLoading) return <div className="page-container"><p className="text-sm text-muted text-center pt-12">Loading...</p></div>
  if (!logistics || !style) return <div className="page-container"><p className="text-sm text-muted text-center pt-12">Loading...</p></div>

  const l = logistics
  const s = style
  const logisticsComplete = !!l.availabilityToStart && l.visaSponsorshipNeeded !== undefined && !!l.workAuthorizationStatus && l.willingToRelocate !== undefined && !!l.remotePreference
  const styleComplete = !!s.tone && !!s.lengthPreference
  const canEnable = logisticsComplete && styleComplete

  const handleAddQa = (q: string, a: string) => {
    if (!q.trim() || !a.trim()) return
    createQa.mutate({ questionPattern: q, answerTemplate: a })
    setCustomQaList((prev) => [...prev, { _id: 'temp', questionPattern: q, answerTemplate: a, isSensitive: false, createdAt: new Date().toISOString() }])
  }

  // ── Final confirmation screen ──
  if (step >= TOTAL_QUESTIONS) {
    return (
      <div className="page-container">
        <div className="max-w-lg mx-auto pt-8">
          <ProgressBar current={TOTAL_QUESTIONS} />
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
            <div className="text-center">
              <div className="h-12 w-12 bg-teal-light rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckIcon className="h-6 w-6 text-teal" />
              </div>
              <h2 className="font-display text-h4 text-ink">Almost there</h2>
              <p className="text-sm text-muted mt-1">Review what you&rsquo;ve set up before enabling auto-apply.</p>
            </div>
            <div className="space-y-3">
              <SectionSummary label="Logistics" complete={logisticsComplete}>
                <p className="text-xs text-muted">
                  {l.availabilityToStart === 'custom' ? l.availabilityCustomNote : { immediately: 'Available immediately', two_weeks: 'Two weeks notice', one_month: 'One month notice' }[l.availabilityToStart]}
                  &nbsp;&middot; {l.visaSponsorshipNeeded ? 'Needs visa sponsorship' : 'No visa sponsorship needed'}
                  &nbsp;&middot; {l.workAuthorizationStatus}
                  &nbsp;&middot; {l.willingToRelocate ? 'Willing to relocate' : 'Not willing to relocate'}
                  &nbsp;&middot; {l.remotePreference.replace(/_/g, ' ')}
                  {l.desiredSalaryMin ? ` &middot; ${l.salaryCurrency}${l.desiredSalaryMin}${l.desiredSalaryMax ? `-${l.desiredSalaryMax}` : ''}` : ''}
                </p>
              </SectionSummary>
              <SectionSummary label="Style" complete={styleComplete}>
                <p className="text-xs text-muted">
                  {s.tone.replace(/_/g, ' ')} &middot; {s.lengthPreference}
                  {s.avoidPhrases?.length ? ` &middot; avoiding: ${s.avoidPhrases.join(', ')}` : ''}
                </p>
              </SectionSummary>
              <SectionSummary label="Common Questions" complete={customQaList.length > 0}>
                <p className="text-xs text-muted">
                  {customQaList.length > 0 ? `${customQaList.length} saved answer${customQaList.length > 1 ? 's' : ''}` : 'No saved answers (optional)'}
                </p>
              </SectionSummary>
            </div>
            {!canEnable && (
              <div className="bg-amber-light/40 border border-amber/20 rounded-xl px-4 py-3 text-xs text-amber-dark">
                {!logisticsComplete ? 'Finish the Logistics section to enable auto-apply.' : 'Finish the Style section to enable auto-apply.'}
              </div>
            )}
            <div className="flex flex-col gap-2 pt-1">
              <button onClick={() => navigate('/auto-apply')} disabled={!canEnable} className="w-full py-3 text-sm font-semibold bg-teal text-white rounded-xl hover:bg-teal-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                {canEnable ? 'Enable auto-apply' : 'Complete required sections first'}
              </button>
              <button onClick={() => { setStep(0); updateStep.mutate(0) }} className="w-full py-2 text-sm font-medium text-muted hover:text-ink transition-colors">
                Review my answers
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="max-w-lg mx-auto pt-8">
        <ProgressBar current={step} />
        <div className="bg-surface border border-border rounded-2xl p-6 min-h-[320px]">
          <StepCount current={step} />
          {step === 0 && (
            <div className="space-y-5 mt-4">
              <h2 className="font-display text-[22px] text-ink leading-snug">When can you start a new role?</h2>
              <div className="flex flex-wrap gap-2.5">
                {(['immediately', 'two_weeks', 'one_month', 'custom'] as const).map((opt) => (
                  <Chip key={opt} label={{ immediately: 'Immediately', two_weeks: 'Two weeks', one_month: 'One month', custom: 'Custom date' }[opt]} selected={l.availabilityToStart === opt} onClick={() => { saveLogistics({ availabilityToStart: opt }); if (opt !== 'custom') goNext() }} />
                ))}
              </div>
              {l.availabilityToStart === 'custom' && (
                <input type="text" placeholder="e.g. December 15, after giving notice" value={l.availabilityCustomNote || ''} onChange={(e) => saveLogistics({ availabilityCustomNote: e.target.value })} className="w-full px-4 py-2.5 text-sm bg-surface border border-border rounded-xl text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30" autoFocus />
              )}
              <div className="flex justify-between pt-2">
                <div />
                {l.availabilityToStart !== 'custom' && <button onClick={goNext} className="px-5 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Skip</button>}
                {l.availabilityToStart === 'custom' && <button onClick={goNext} disabled={!l.availabilityCustomNote?.trim()} className="px-5 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 disabled:opacity-40 transition-opacity">Continue</button>}
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-5 mt-4">
              <div className="bg-amber-light/40 border border-amber/20 rounded-xl px-4 py-2">
                <p className="text-xs text-amber-dark font-medium">This answer will be used on every application &mdash; please be accurate.</p>
              </div>
              <h2 className="font-display text-[22px] text-ink leading-snug">Do you need visa sponsorship to work in your target locations?</h2>
              <div className="flex gap-3 pt-2">
                <BinaryButton label="Yes" selected={l.visaSponsorshipNeeded === true} onClick={() => { saveLogistics({ visaSponsorshipNeeded: true }); goNext() }} />
                <BinaryButton label="No" selected={l.visaSponsorshipNeeded === false} onClick={() => { saveLogistics({ visaSponsorshipNeeded: false }); goNext() }} />
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-5 mt-4">
              <h2 className="font-display text-[22px] text-ink leading-snug">What&rsquo;s your current work authorization status?</h2>
              <p className="text-sm text-muted">This helps us answer &ldquo;are you authorized to work?&rdquo; questions correctly.</p>
              <input type="text" placeholder="e.g. US citizen, EU work permit, H1B transfer needed" value={l.workAuthorizationStatus} onChange={(e) => saveLogistics({ workAuthorizationStatus: e.target.value })} className="w-full px-4 py-2.5 text-sm bg-surface border border-border rounded-xl text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30" autoFocus />
              <div className="flex justify-between pt-2">
                <button onClick={goBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
                <button onClick={goNext} disabled={!l.workAuthorizationStatus.trim()} className="px-5 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 disabled:opacity-40 transition-opacity">Continue</button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-5 mt-4">
              <h2 className="font-display text-[22px] text-ink leading-snug">Are you open to relocating for the right role?</h2>
              <div className="flex flex-wrap gap-2.5">
                <Chip label="Yes" selected={l.willingToRelocate === true && l.relocationNotes !== 'Depends on the location'} onClick={() => { saveLogistics({ willingToRelocate: true, relocationNotes: undefined }); goNext() }} />
                <Chip label="No" selected={l.willingToRelocate === false} onClick={() => { saveLogistics({ willingToRelocate: false, relocationNotes: undefined }); goNext() }} />
                <Chip label="Depends on location" selected={l.relocationNotes === 'Depends on the location'} onClick={() => { saveLogistics({ willingToRelocate: true, relocationNotes: 'Depends on the location' }) }} />
              </div>
              {l.relocationNotes === 'Depends on the location' && (
                <input type="text" placeholder="Any locations in particular? (optional)" value={l.relocationNotes || ''} onChange={(e) => saveLogistics({ relocationNotes: e.target.value })} className="w-full px-4 py-2.5 text-sm bg-surface border border-border rounded-xl text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30" autoFocus />
              )}
              <div className="flex justify-between pt-2">
                <button onClick={goBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
                {l.relocationNotes === 'Depends on the location' && <button onClick={goNext} className="px-5 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 transition-opacity">Continue</button>}
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-5 mt-4">
              <h2 className="font-display text-[22px] text-ink leading-snug">What&rsquo;s your target salary range?</h2>
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted font-medium">Min</label>
                  <input type="number" min={0} placeholder="100000" value={l.desiredSalaryMin || ''} onChange={(e) => saveLogistics({ desiredSalaryMin: e.target.value ? Number(e.target.value) : undefined })} className="w-full px-4 py-2.5 text-sm bg-surface border border-border rounded-xl text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
                <span className="text-muted pb-2.5">&ndash;</span>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted font-medium">Max</label>
                  <input type="number" min={0} placeholder="150000" value={l.desiredSalaryMax || ''} onChange={(e) => saveLogistics({ desiredSalaryMax: e.target.value ? Number(e.target.value) : undefined })} className="w-full px-4 py-2.5 text-sm bg-surface border border-border rounded-xl text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
                <div className="w-20 space-y-1">
                  <label className="text-xs text-muted font-medium">Currency</label>
                  <select value={l.salaryCurrency || 'USD'} onChange={(e) => saveLogistics({ salaryCurrency: e.target.value })} className="w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 appearance-none">
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={goBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
                <button onClick={goNext} className="px-5 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 transition-opacity">Continue</button>
              </div>
            </div>
          )}
          {step === 5 && (
            <div className="space-y-5 mt-4">
              <h2 className="font-display text-[22px] text-ink leading-snug">What&rsquo;s your remote work preference?</h2>
              <div className="flex flex-wrap gap-2.5">
                {(['remote_only', 'hybrid_ok', 'onsite_ok', 'flexible'] as const).map((opt) => (
                  <Chip key={opt} label={{ remote_only: 'Remote only', hybrid_ok: 'Hybrid ok', onsite_ok: 'On-site ok', flexible: 'Flexible' }[opt]} selected={l.remotePreference === opt} onClick={() => { saveLogistics({ remotePreference: opt }); goNext() }} />
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={goBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
              </div>
            </div>
          )}
          {step === 6 && (
            <div className="space-y-5 mt-4">
              <h2 className="font-display text-[22px] text-ink leading-snug">Any notice period or non-compete we should know about?</h2>
              <p className="text-sm text-muted">Optional &mdash; skip if not applicable.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted block mb-1">Notice period</label>
                  <input type="text" placeholder="e.g. 2 weeks" value={l.noticePeriod || ''} onChange={(e) => saveLogistics({ noticePeriod: e.target.value })} className="w-full px-4 py-2.5 text-sm bg-surface border border-border rounded-xl text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted block mb-1">Non-compete notes</label>
                  <input type="text" placeholder="e.g. Signed a 6-month non-compete with previous employer" value={l.nonCompeteNotes || ''} onChange={(e) => saveLogistics({ nonCompeteNotes: e.target.value })} className="w-full px-4 py-2.5 text-sm bg-surface border border-border rounded-xl text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={goBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
                <button onClick={goNext} className="px-5 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 transition-opacity">Skip</button>
              </div>
            </div>
          )}
          {step === 7 && (
            <div className="space-y-5 mt-4">
              <h2 className="font-display text-[22px] text-ink leading-snug">How should your application answers sound?</h2>
              <div className="grid gap-2.5">
                {([
                  { value: 'formal' as const, label: 'Formal', example: '"I have 5 years of experience developing scalable backend systems."' },
                  { value: 'professional_warm' as const, label: 'Professional and warm', example: '"I love building systems that make other people\'s work easier."' },
                  { value: 'concise_direct' as const, label: 'Concise and direct', example: '"5 years of backend experience. Built systems serving 1M+ users."' },
                  { value: 'enthusiastic' as const, label: 'Enthusiastic', example: '"I\'m genuinely excited about building systems that solve real problems at scale!"' },
                ]).map((opt) => (
                  <ToneCard key={opt.value} label={opt.label} example={opt.example} selected={s.tone === opt.value} onClick={() => { saveStyle({ tone: opt.value }); goNext() }} />
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={goBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
              </div>
            </div>
          )}
          {step === 8 && (
            <div className="space-y-5 mt-4">
              <h2 className="font-display text-[22px] text-ink leading-snug">How long should generated answers be?</h2>
              <div className="flex flex-wrap gap-2.5">
                {([
                  { value: 'brief' as const, label: 'Brief', desc: '1-2 sentences' },
                  { value: 'standard' as const, label: 'Standard', desc: '2-4 sentences' },
                  { value: 'detailed' as const, label: 'Detailed', desc: 'Thorough paragraphs' },
                ]).map((opt) => (
                  <button key={opt.value} onClick={() => { saveStyle({ lengthPreference: opt.value }); goNext() }} className={`px-5 py-3 text-sm font-medium rounded-xl border transition-all ${s.lengthPreference === opt.value ? 'bg-teal text-white border-teal shadow-sm' : 'bg-surface text-ink border-border hover:border-teal/30'}`}>
                    {s.lengthPreference === opt.value && <CheckIcon className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />}
                    <span className="block">{opt.label}</span>
                    <span className={`block text-[10px] mt-0.5 ${s.lengthPreference === opt.value ? 'text-white/70' : 'text-muted'}`}>{opt.desc}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={goBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
              </div>
            </div>
          )}
          {step === 9 && (
            <div className="space-y-5 mt-4">
              <h2 className="font-display text-[22px] text-ink leading-snug">Any phrases you never want us to use?</h2>
              <p className="text-sm text-muted">Optional &mdash; skip if nothing comes to mind. Common ones: &ldquo;passionate about,&rdquo; &ldquo;team player.&rdquo;</p>
              <TagInput tags={s.avoidPhrases || []} onAdd={(tag) => saveStyle({ avoidPhrases: [...(s.avoidPhrases || []), tag] })} onRemove={(tag) => saveStyle({ avoidPhrases: (s.avoidPhrases || []).filter((t) => t !== tag) })} placeholder="Type a phrase and press enter" />
              <div className="flex justify-between pt-2">
                <button onClick={goBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
                <button onClick={goNext} className="px-5 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 transition-opacity">Skip</button>
              </div>
            </div>
          )}
          {step === 10 && (
            <div className="space-y-5 mt-4">
              <h2 className="font-display text-[22px] text-ink leading-snug">Want to paste an answer you&rsquo;ve written before?</h2>
              <p className="text-sm text-muted">Optional. We&rsquo;ll use it as a style reference to match your voice &mdash; never reproduced verbatim.</p>
              <textarea placeholder="Paste a cover letter paragraph, a screening answer, or anything you've written for a previous application..." value={s.sampleAnswer || ''} onChange={(e) => saveStyle({ sampleAnswer: e.target.value })} className="w-full px-4 py-3 text-sm bg-surface border border-border rounded-xl text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30 min-h-[120px] resize-y" autoFocus />
              <div className="flex justify-between pt-2">
                <button onClick={goBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
                <button onClick={goNext} className="px-5 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 transition-opacity">Skip</button>
              </div>
            </div>
          )}
          {step === 11 && (
            <CommonQuestionScreen
              question="Why are you interested in opportunities like this?"
              helper="A short answer works well &mdash; we&rsquo;ll tailor small details per job automatically."
              onSave={(a) => { handleAddQa('Why are you interested in opportunities like this?', a); goNext() }}
              onSkip={goNext}
              onBack={goBack}
            />
          )}
          {step === 12 && (
            <CommonQuestionScreen
              question="Describe a challenge you&rsquo;ve overcome professionally."
              helper="This is a common screening question &mdash; having a saved answer saves you time."
              onSave={(a) => { handleAddQa('Describe a challenge you have overcome professionally.', a); goNext() }}
              onSkip={goNext}
              onBack={goBack}
            />
          )}
          {step === 13 && (
            <CustomAddMoreScreen
              onAdd={(q, a) => handleAddQa(q, a)}
              onSkip={() => { setStep(TOTAL_QUESTIONS); updateStep.mutate(TOTAL_QUESTIONS) }}
              onBack={goBack}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function SectionSummary({ label, complete, children }: { label: string; complete: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${complete ? 'bg-teal' : 'bg-border'}`}>
        {complete ? <CheckIcon className="h-3 w-3 text-white" /> : <span className="h-2 w-2 rounded-full bg-muted-light" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        {children}
      </div>
    </div>
  )
}

function CommonQuestionScreen({ question, helper, onSave, onSkip, onBack }: { question: string; helper: string; onSave: (a: string) => void; onSkip: () => void; onBack: () => void }) {
  const [val, setVal] = useState('')
  return (
    <div className="space-y-5 mt-4">
      <h2 className="font-display text-[22px] text-ink leading-snug">{question}</h2>
      <p className="text-sm text-muted">{helper}</p>
      <textarea value={val} onChange={(e) => setVal(e.target.value)} className="w-full px-4 py-3 text-sm bg-surface border border-border rounded-xl text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30 min-h-[100px] resize-y" autoFocus />
      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
        <div className="flex gap-2">
          <button onClick={onSkip} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Skip</button>
          <button onClick={() => onSave(val)} disabled={!val.trim()} className="px-5 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 disabled:opacity-40 transition-opacity">Save answer</button>
        </div>
      </div>
    </div>
  )
}

function CustomAddMoreScreen({ onAdd, onSkip, onBack }: { onAdd: (q: string, a: string) => void; onSkip: () => void; onBack: () => void }) {
  const [rows, setRows] = useState<{ q: string; a: string }[]>([{ q: '', a: '' }])
  const addRow = () => setRows((prev) => [...prev, { q: '', a: '' }])
  const saveAll = () => {
    rows.filter((r) => r.q.trim() && r.a.trim()).forEach((r) => onAdd(r.q, r.a))
    onSkip()
  }
  return (
    <div className="space-y-5 mt-4">
      <h2 className="font-display text-[22px] text-ink leading-snug">Anything else you get asked a lot?</h2>
      <p className="text-sm text-muted">Optional. Add question-and-answer pairs you encounter frequently.</p>
      <div className="space-y-4">
        {rows.map((row, i) => (
          <div key={i} className="bg-paper border border-border rounded-xl p-4 space-y-2">
            <input type="text" placeholder="Question" value={row.q} onChange={(e) => { const next = [...rows]; next[i] = { ...next[i], q: e.target.value }; setRows(next) }} className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30" />
            <textarea placeholder="Your answer" value={row.a} onChange={(e) => { const next = [...rows]; next[i] = { ...next[i], a: e.target.value }; setRows(next) }} className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30 min-h-[60px] resize-y" />
          </div>
        ))}
        <button onClick={addRow} className="text-sm font-medium text-teal hover:text-teal-dark transition-colors">+ Add another</button>
      </div>
      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
        <div className="flex gap-2">
          <button onClick={onSkip} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Skip</button>
          <button onClick={saveAll} disabled={!rows.some((r) => r.q.trim() && r.a.trim())} className="px-5 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 disabled:opacity-40 transition-opacity">Save answers</button>
        </div>
      </div>
    </div>
  )
}
