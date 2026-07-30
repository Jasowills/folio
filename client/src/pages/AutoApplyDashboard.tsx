import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import {
  useAutoApplySubmissions, useFillApplication, useRetrySubmission,
  useAnswersBank, useAutoApplyConfig, useUpdateAutoApplyConfig,
  useCompletionStatus, useAutoApplyProfile, useUpdateLogistics,
  useUpdateStyle, useCreateCustomQa, useUpdateWizardStep,
  useResumes, useUploadResume, useDiscoverFeed,
  useApproveJobs, type AutoApplyProfile, type CustomQAEntry,
  type ApplySubmission, type DiscoverFeedJob,
  type DiscoverFeedResponse,
} from '../lib/queries'
import { IconUpload, IconCheck, IconArrowRight, IconSend, IconBriefcase, IconDatabase, IconSettings, IconLoader2, IconCircleCheck, IconMapPin, IconClock, IconX, IconExternalLink } from '@tabler/icons-react'

type LogisticsAnswers = AutoApplyProfile['logisticsAnswers']
type ApplicationStyle = AutoApplyProfile['applicationStyle']

const TOTAL_QUESTIONS = 14

const statusColors: Record<string, string> = {
  approved: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  filling: 'text-blue-600 bg-blue-50 border-blue-200',
  ready_for_review: 'text-violet-600 bg-violet-50 border-violet-200',
  submitted: 'text-green-600 bg-green-50 border-green-200',
  failed: 'text-red-600 bg-red-50 border-red-200',
}

const statusLabels: Record<string, string> = {
  approved: 'Approved',
  filling: 'Filling',
  ready_for_review: 'Ready to Submit',
  submitted: 'Submitted',
  failed: 'Failed',
}

// ── Resume Upload Modal ──

function ResumeUploadModal({ onComplete }: { onComplete: () => void }) {
  const uploadResume = useUploadResume()
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      await uploadResume.mutateAsync(file)
      onComplete()
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-modal max-w-md w-full p-8 animate-[fadeIn_0.3s_ease-out]">
        <div className="text-center mb-6">
          <div className="h-14 w-14 bg-teal-light rounded-2xl flex items-center justify-center mx-auto mb-4">
            <IconBriefcase className="h-7 w-7 text-teal" />
          </div>
          <h2 className="font-display text-h4 text-ink">Upload your resume</h2>
          <p className="text-sm text-muted mt-1.5">We need your resume to tailor answers and match you with the right jobs.</p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); if (!uploading) setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          className={`relative rounded-xl border-2 border-dashed transition-all duration-200 p-8 text-center cursor-pointer ${uploading ? 'border-teal/50 bg-teal-light/50' : isDragging ? 'border-teal bg-teal-light' : 'border-border hover:border-teal/50 bg-surface'}`}
          onClick={() => !uploading && document.getElementById('aa-resume-upload')?.click()}
        >
          <input id="aa-resume-upload" type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} disabled={uploading} />
          {uploading ? (
            <div className="space-y-3">
              <IconLoader2 className="mx-auto h-8 w-8 text-teal animate-spin" />
              <p className="font-medium text-sm text-ink">Uploading resume...</p>
            </div>
          ) : (
            <>
              <IconUpload className={`mx-auto h-8 w-8 mb-3 transition-colors ${isDragging ? 'text-teal' : 'text-muted'}`} />
              <p className="font-semibold text-sm text-ink">Drop your resume here</p>
              <p className="text-xs text-muted mt-1">or click to browse</p>
              <p className="text-[10px] text-muted-light mt-2">PDF or DOCX</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Setup Wizard Modal ──

function SetupWizardModal({ onComplete }: { onComplete: () => void }) {
  const { data: profile, isLoading } = useAutoApplyProfile()
  const updateLogistics = useUpdateLogistics()
  const updateStyle = useUpdateStyle()
  const createQa = useCreateCustomQa()
  const updateStep = useUpdateWizardStep()

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
    const s = profile.wizardStep ?? 0
    if (s >= 0 && s < TOTAL_QUESTIONS) setStep(s)
  }, [profile])

  const saveLogistics = useCallback((patch: Partial<LogisticsAnswers>) => {
    if (!logistics) return
    const merged = { ...logistics, ...patch }
    setLogistics(merged)
    updateLogistics.mutate(merged)
  }, [logistics, updateLogistics])

  const saveStyle = useCallback((patch: Partial<ApplicationStyle>) => {
    if (!style) return
    const merged = { ...style, ...patch }
    setStyle(merged)
    updateStyle.mutate(merged)
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
  }, [])

  const handleAddQa = (q: string, a: string) => {
    if (!q.trim() || !a.trim()) return
    createQa.mutate({ questionPattern: q, answerTemplate: a })
    setCustomQaList((prev) => [...prev, { _id: 'temp', questionPattern: q, answerTemplate: a, isSensitive: false, createdAt: new Date().toISOString() }])
  }

  if (isLoading || !logistics || !style) return null

  const l = logistics
  const s = style
  const isLastStep = step >= TOTAL_QUESTIONS
  const logisticsComplete = !!l.availabilityToStart && l.visaSponsorshipNeeded !== undefined && !!l.workAuthorizationStatus && l.willingToRelocate !== undefined && !!l.remotePreference
  const styleComplete = !!s.tone && !!s.lengthPreference
  const canEnable = logisticsComplete && styleComplete

  const stepKey = isLastStep ? 'done' : step

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto animate-[fadeIn_0.3s_ease-out]">
        <div className="p-6">
          {!isLastStep && (
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-muted tracking-wide">Setup</span>
                <span className="text-[11px] font-medium text-muted-light">·</span>
                <span className="text-[11px] font-medium text-muted">{logisticsComplete && styleComplete ? 'Review' : logisticsComplete ? 'Style' : 'Logistics'}</span>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${step > i * 5 ? 'bg-teal' : 'bg-border'}`} />
                ))}
              </div>
            </div>
          )}

          <div key={stepKey} className="min-h-[300px] animate-[fadeIn_0.35s_ease-out]">
            {isLastStep ? (
              <div className="space-y-5 text-center pt-4">
                <div className="h-14 w-14 bg-teal-light rounded-2xl flex items-center justify-center mx-auto">
                  <IconCheck className="h-7 w-7 text-teal" />
                </div>
                <h2 className="font-display text-h4 text-ink">Ready to go</h2>
                <p className="text-sm text-muted">You&rsquo;ve set up your preferences. Enable auto-apply to start matching with jobs.</p>
                <div className="text-left bg-paper rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${logisticsComplete ? 'bg-teal' : 'bg-border'}`}>
                      {logisticsComplete ? <IconCheck className="h-3 w-3 text-white" /> : <div className="h-2 w-2 rounded-full bg-muted-light" />}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-ink">Logistics</p>
                      <p className="text-xs text-muted">Availability, work auth, salary, location</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${styleComplete ? 'bg-teal' : 'bg-border'}`}>
                      {styleComplete ? <IconCheck className="h-3 w-3 text-white" /> : <div className="h-2 w-2 rounded-full bg-muted-light" />}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-ink">Style</p>
                      <p className="text-xs text-muted">Tone, length, phrases to avoid</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${customQaList.length > 0 ? 'bg-teal' : 'bg-border'}`}>
                      {customQaList.length > 0 ? <IconCheck className="h-3 w-3 text-white" /> : <div className="h-2 w-2 rounded-full bg-muted-light" />}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-ink">Common Questions</p>
                      <p className="text-xs text-muted">{customQaList.length > 0 ? `${customQaList.length} saved` : 'Optional'}</p>
                    </div>
                  </div>
                </div>
                <button onClick={onComplete} disabled={!canEnable} className="w-full py-3 text-sm font-semibold bg-teal text-white rounded-xl hover:bg-teal-dark disabled:opacity-40 transition-all">
                  {canEnable ? 'Enable auto-apply' : 'Complete required sections first'}
                </button>
              </div>
            ) : (
              <>
                {step === 0 && (
                  <div className="space-y-5">
                    <h2 className="font-display text-[22px] text-ink leading-snug">When can you start a new role?</h2>
                    <div className="flex flex-wrap gap-2.5">
                      {(['immediately', 'two_weeks', 'one_month', 'custom'] as const).map((opt) => (
                        <button key={opt} onClick={() => { saveLogistics({ availabilityToStart: opt }); if (opt !== 'custom') goNext() }} className={`px-5 py-3 text-sm font-medium rounded-xl border transition-all ${l.availabilityToStart === opt ? 'bg-teal text-white border-teal shadow-sm' : 'bg-surface text-ink border-border hover:border-teal/30'}`}>
                          {l.availabilityToStart === opt && <IconCheck className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />}
                          {{ immediately: 'Immediately', two_weeks: 'Two weeks', one_month: 'One month', custom: 'Custom date' }[opt]}
                        </button>
                      ))}
                    </div>
                    {l.availabilityToStart === 'custom' && (
                      <input type="text" placeholder="e.g. December 15, after giving notice" value={l.availabilityCustomNote || ''} onChange={(e) => saveLogistics({ availabilityCustomNote: e.target.value })} className="w-full px-4 py-2.5 text-sm bg-surface border border-border rounded-xl text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30" autoFocus />
                    )}
                    <div className="flex justify-between pt-2">
                      <div />
                      {l.availabilityToStart === 'custom' ? (
                        <button onClick={goNext} disabled={!l.availabilityCustomNote?.trim()} className="px-5 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 disabled:opacity-40 transition-all">Continue <IconArrowRight className="inline h-3.5 w-3.5 ml-1 -mt-0.5" /></button>
                      ) : (
                        <button onClick={goNext} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Skip</button>
                      )}
                    </div>
                  </div>
                )}
                {step === 1 && (
                  <div className="space-y-5">
                    <div className="bg-amber-light/40 border border-amber/20 rounded-xl px-4 py-2.5">
                      <p className="text-xs text-amber-dark font-medium">This answer applies to every application &mdash; please be accurate.</p>
                    </div>
                    <h2 className="font-display text-[22px] text-ink leading-snug">Do you need visa sponsorship?</h2>
                    <div className="flex gap-3 pt-1">
                      <button onClick={() => { saveLogistics({ visaSponsorshipNeeded: true }); goNext() }} className={`flex-1 py-4 px-6 text-base font-medium rounded-xl border-2 transition-all ${l.visaSponsorshipNeeded === true ? 'bg-teal text-white border-teal shadow-md' : 'bg-surface text-ink border-border hover:border-teal/30'}`}>
                        {l.visaSponsorshipNeeded === true && <IconCheck className="inline h-4 w-4 mr-2 -mt-0.5" />}
                        Yes
                      </button>
                      <button onClick={() => { saveLogistics({ visaSponsorshipNeeded: false }); goNext() }} className={`flex-1 py-4 px-6 text-base font-medium rounded-xl border-2 transition-all ${l.visaSponsorshipNeeded === false ? 'bg-teal text-white border-teal shadow-md' : 'bg-surface text-ink border-border hover:border-teal/30'}`}>
                        {l.visaSponsorshipNeeded === false && <IconCheck className="inline h-4 w-4 mr-2 -mt-0.5" />}
                        No
                      </button>
                    </div>
                    <div className="flex justify-between pt-1">
                      <button onClick={goBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
                    </div>
                  </div>
                )}
                {step === 2 && (
                  <div className="space-y-5">
                    <h2 className="font-display text-[22px] text-ink leading-snug">What&rsquo;s your work authorization status?</h2>
                    <p className="text-sm text-muted">This helps us answer &ldquo;are you authorized to work?&rdquo; correctly.</p>
                    <input type="text" placeholder="e.g. US citizen, EU work permit, H1B transfer needed" value={l.workAuthorizationStatus} onChange={(e) => saveLogistics({ workAuthorizationStatus: e.target.value })} className="w-full px-4 py-2.5 text-sm bg-surface border border-border rounded-xl text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30" autoFocus />
                    <div className="flex justify-between pt-2">
                      <button onClick={goBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
                      <button onClick={goNext} disabled={!l.workAuthorizationStatus.trim()} className="px-5 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 disabled:opacity-40 transition-all">Continue <IconArrowRight className="inline h-3.5 w-3.5 ml-1 -mt-0.5" /></button>
                    </div>
                  </div>
                )}
                {step === 3 && (
                  <div className="space-y-5">
                    <h2 className="font-display text-[22px] text-ink leading-snug">Open to relocating for the right role?</h2>
                    <div className="flex flex-wrap gap-2.5">
                      <button onClick={() => { saveLogistics({ willingToRelocate: true, relocationNotes: undefined }); goNext() }} className={`px-5 py-3 text-sm font-medium rounded-xl border transition-all ${l.willingToRelocate === true && l.relocationNotes !== 'Depends on the location' ? 'bg-teal text-white border-teal shadow-sm' : 'bg-surface text-ink border-border hover:border-teal/30'}`}>
                        {l.willingToRelocate === true && l.relocationNotes !== 'Depends on the location' && <IconCheck className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />}
                        Yes
                      </button>
                      <button onClick={() => { saveLogistics({ willingToRelocate: false, relocationNotes: undefined }); goNext() }} className={`px-5 py-3 text-sm font-medium rounded-xl border transition-all ${l.willingToRelocate === false ? 'bg-teal text-white border-teal shadow-sm' : 'bg-surface text-ink border-border hover:border-teal/30'}`}>
                        {l.willingToRelocate === false && <IconCheck className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />}
                        No
                      </button>
                      <button onClick={() => saveLogistics({ willingToRelocate: true, relocationNotes: 'Depends on the location' })} className={`px-5 py-3 text-sm font-medium rounded-xl border transition-all ${l.relocationNotes === 'Depends on the location' ? 'bg-teal text-white border-teal shadow-sm' : 'bg-surface text-ink border-border hover:border-teal/30'}`}>
                        {l.relocationNotes === 'Depends on the location' && <IconCheck className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />}
                        Depends on location
                      </button>
                    </div>
                    {l.relocationNotes === 'Depends on the location' && (
                      <input type="text" placeholder="Any locations in particular? (optional)" value={l.relocationNotes === 'Depends on the location' ? l.relocationNotes || '' : ''} onChange={(e) => saveLogistics({ relocationNotes: e.target.value })} className="w-full px-4 py-2.5 text-sm bg-surface border border-border rounded-xl text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30" autoFocus />
                    )}
                    <div className="flex justify-between pt-2">
                      <button onClick={goBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
                      {l.relocationNotes === 'Depends on the location' && <button onClick={goNext} className="px-5 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 transition-all">Continue <IconArrowRight className="inline h-3.5 w-3.5 ml-1 -mt-0.5" /></button>}
                    </div>
                  </div>
                )}
                {step === 4 && (
                  <div className="space-y-5">
                    <h2 className="font-display text-[22px] text-ink leading-snug">Target salary range?</h2>
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
                          <option value="USD">$</option>
                          <option value="EUR">€</option>
                          <option value="GBP">£</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-between pt-2">
                      <button onClick={goBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
                      <button onClick={goNext} className="px-5 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 transition-all">Continue <IconArrowRight className="inline h-3.5 w-3.5 ml-1 -mt-0.5" /></button>
                    </div>
                  </div>
                )}
                {step === 5 && (
                  <div className="space-y-5">
                    <h2 className="font-display text-[22px] text-ink leading-snug">Remote work preference?</h2>
                    <div className="flex flex-wrap gap-2.5">
                      {(['remote_only', 'hybrid_ok', 'onsite_ok', 'flexible'] as const).map((opt) => (
                        <button key={opt} onClick={() => { saveLogistics({ remotePreference: opt }); goNext() }} className={`px-5 py-3 text-sm font-medium rounded-xl border transition-all ${l.remotePreference === opt ? 'bg-teal text-white border-teal shadow-sm' : 'bg-surface text-ink border-border hover:border-teal/30'}`}>
                          {l.remotePreference === opt && <IconCheck className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />}
                          {{ remote_only: 'Remote only', hybrid_ok: 'Hybrid ok', onsite_ok: 'On-site ok', flexible: 'Flexible' }[opt]}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between pt-2">
                      <button onClick={goBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
                    </div>
                  </div>
                )}
                {step === 6 && (
                  <div className="space-y-5">
                    <h2 className="font-display text-[22px] text-ink leading-snug">Notice period or non-compete?</h2>
                    <p className="text-sm text-muted">Optional &mdash; skip if not applicable.</p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-muted block mb-1">Notice period</label>
                        <input type="text" placeholder="e.g. 2 weeks" value={l.noticePeriod || ''} onChange={(e) => saveLogistics({ noticePeriod: e.target.value })} className="w-full px-4 py-2.5 text-sm bg-surface border border-border rounded-xl text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted block mb-1">Non-compete notes</label>
                        <input type="text" placeholder="e.g. 6-month non-compete with previous employer" value={l.nonCompeteNotes || ''} onChange={(e) => saveLogistics({ nonCompeteNotes: e.target.value })} className="w-full px-4 py-2.5 text-sm bg-surface border border-border rounded-xl text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30" />
                      </div>
                    </div>
                    <div className="flex justify-between pt-2">
                      <button onClick={goBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
                      <button onClick={goNext} className="px-5 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 transition-all">Skip <IconArrowRight className="inline h-3.5 w-3.5 ml-1 -mt-0.5" /></button>
                    </div>
                  </div>
                )}
                {step === 7 && (
                  <div className="space-y-5">
                    <h2 className="font-display text-[22px] text-ink leading-snug">How should your answers sound?</h2>
                    <div className="grid gap-2.5">
                      {([
                        { value: 'formal', label: 'Formal', example: '"I have 5 years of experience developing scalable backend systems."' },
                        { value: 'professional_warm', label: 'Professional & warm', example: '"I love building systems that make people\'s work easier."' },
                        { value: 'concise_direct', label: 'Concise & direct', example: '"5 years of backend experience. Built systems serving 1M+ users."' },
                        { value: 'enthusiastic', label: 'Enthusiastic', example: '"I\'m genuinely excited about building systems that solve real problems!"' },
                      ]).map((opt) => (
                        <button key={opt.value} onClick={() => { saveStyle({ tone: opt.value as ApplicationStyle['tone'] }); goNext() }} className={`text-left px-4 py-3.5 rounded-xl border-2 transition-all ${s.tone === opt.value ? 'bg-teal text-white border-teal shadow-sm' : 'bg-surface text-ink border-border hover:border-teal/30'}`}>
                          {s.tone === opt.value && <IconCheck className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />}
                          <span className="block text-sm font-semibold">{opt.label}</span>
                          <span className={`block text-[11px] mt-0.5 ${s.tone === opt.value ? 'text-white/70' : 'text-muted'}`}>{opt.example}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between pt-1">
                      <button onClick={goBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
                    </div>
                  </div>
                )}
                {step === 8 && (
                  <div className="space-y-5">
                    <h2 className="font-display text-[22px] text-ink leading-snug">How long should answers be?</h2>
                    <div className="flex flex-wrap gap-2.5">
                      {([
                        { value: 'brief', label: 'Brief', desc: '1-2 sentences' },
                        { value: 'standard', label: 'Standard', desc: '2-4 sentences' },
                        { value: 'detailed', label: 'Detailed', desc: 'Thorough paragraphs' },
                      ]).map((opt) => (
                        <button key={opt.value} onClick={() => { saveStyle({ lengthPreference: opt.value as ApplicationStyle['lengthPreference'] }); goNext() }} className={`px-5 py-3 text-sm font-medium rounded-xl border transition-all ${s.lengthPreference === opt.value ? 'bg-teal text-white border-teal shadow-sm' : 'bg-surface text-ink border-border hover:border-teal/30'}`}>
                          {s.lengthPreference === opt.value && <IconCheck className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />}
                          <span className="block">{opt.label}</span>
                          <span className={`block text-[10px] mt-0.5 ${s.lengthPreference === opt.value ? 'text-white/70' : 'text-muted'}`}>{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between pt-1">
                      <button onClick={goBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
                    </div>
                  </div>
                )}
                {step === 9 && (
                  <div className="space-y-5">
                    <h2 className="font-display text-[22px] text-ink leading-snug">Any phrases to avoid?</h2>
                    <p className="text-sm text-muted">Common ones: &ldquo;passionate about,&rdquo; &ldquo;team player.&rdquo; Press Enter to add.</p>
                    <TagInput tags={s.avoidPhrases || []} onAdd={(tag) => saveStyle({ avoidPhrases: [...(s.avoidPhrases || []), tag] })} onRemove={(tag) => saveStyle({ avoidPhrases: (s.avoidPhrases || []).filter((t) => t !== tag) })} placeholder="Type a phrase and press Enter" />
                    <div className="flex justify-between pt-2">
                      <button onClick={goBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
                      <button onClick={goNext} className="px-5 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 transition-all">Skip <IconArrowRight className="inline h-3.5 w-3.5 ml-1 -mt-0.5" /></button>
                    </div>
                  </div>
                )}
                {step === 10 && (
                  <div className="space-y-5">
                    <h2 className="font-display text-[22px] text-ink leading-snug">Want to paste a sample of your writing?</h2>
                    <p className="text-sm text-muted">Optional. We&rsquo;ll use it to match your voice &mdash; never reproduced verbatim.</p>
                    <textarea placeholder="Paste a cover letter paragraph, a screening answer, or anything you've written for a previous application..." value={s.sampleAnswer || ''} onChange={(e) => saveStyle({ sampleAnswer: e.target.value })} className="w-full px-4 py-3 text-sm bg-surface border border-border rounded-xl text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30 min-h-[100px] resize-y" autoFocus />
                    <div className="flex justify-between pt-2">
                      <button onClick={goBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
                      <button onClick={goNext} className="px-5 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 transition-all">Skip <IconArrowRight className="inline h-3.5 w-3.5 ml-1 -mt-0.5" /></button>
                    </div>
                  </div>
                )}
                {step === 11 && (
                  <CommonQuestionScreen
                    question="Why are you interested in opportunities like this?"
                    helper="A short answer works well &mdash; we&rsquo;ll tailor details per job."
                    onSave={(a) => { handleAddQa('Why are you interested in opportunities like this?', a); goNext() }}
                    onSkip={goNext}
                    onBack={goBack}
                  />
                )}
                {step === 12 && (
                  <CommonQuestionScreen
                    question="Describe a challenge you&rsquo;ve overcome professionally."
                    helper="Common screening question &mdash; saves time later."
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TagInput({ tags, onAdd, onRemove, placeholder }: { tags: string[]; onAdd: (t: string) => void; onRemove: (t: string) => void; placeholder: string }) {
  const [val, setVal] = useState('')
  const add = () => { const t = val.trim(); if (t && !tags.includes(t)) { onAdd(t); setVal('') } }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input type="text" value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder={placeholder} className="flex-1 px-4 py-2.5 text-sm bg-surface border border-border rounded-xl text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30" />
        <button onClick={add} disabled={!val.trim()} className="px-4 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 disabled:opacity-40 transition-all">Add</button>
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

function CommonQuestionScreen({ question, helper, onSave, onSkip, onBack }: { question: string; helper: string; onSave: (a: string) => void; onSkip: () => void; onBack: () => void }) {
  const [val, setVal] = useState('')
  return (
    <div className="space-y-5">
      <h2 className="font-display text-[22px] text-ink leading-snug">{question}</h2>
      <p className="text-sm text-muted">{helper}</p>
      <textarea value={val} onChange={(e) => setVal(e.target.value)} className="w-full px-4 py-3 text-sm bg-surface border border-border rounded-xl text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-teal/30 min-h-[100px] resize-y" autoFocus />
      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Back</button>
        <div className="flex gap-2">
          <button onClick={onSkip} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Skip</button>
          <button onClick={() => onSave(val)} disabled={!val.trim()} className="px-5 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 disabled:opacity-40 transition-all">Save answer <IconArrowRight className="inline h-3.5 w-3.5 ml-1 -mt-0.5" /></button>
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
    <div className="space-y-5">
      <h2 className="font-display text-[22px] text-ink leading-snug">Any other common questions?</h2>
      <p className="text-sm text-muted">Optional. Add question-and-answer pairs you encounter frequently.</p>
      <div className="space-y-3">
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
          <button onClick={saveAll} disabled={!rows.some((r) => r.q.trim() && r.a.trim())} className="px-5 py-2 text-sm font-medium bg-ink text-paper rounded-xl hover:opacity-80 disabled:opacity-40 transition-all">Save answers <IconArrowRight className="inline h-3.5 w-3.5 ml-1 -mt-0.5" /></button>
        </div>
      </div>
    </div>
  )
}

// ── Discover Job Card ──

function DiscoverJobCard({ job, resumeId, onSelect }: { job: DiscoverFeedJob; resumeId: string; onSelect?: () => void }) {
  const approveJobs = useApproveJobs()
  const [approving, setApproving] = useState(false)

  const ef = job.extractedFields || {}
  const score = job.match?.atsScore ?? 0
  const postedDate = job.postedAt ? new Date(job.postedAt) : null
  const timeAgo = postedDate ? getTimeSince(postedDate) : ''
  const logoFallback = job.companyName?.charAt(0)?.toUpperCase() || '?'
  const domain = job.companyName?.toLowerCase().replace(/\s+/g, '') || ''
  const logoUrl = `https://logo.clearbit.com/${domain}.com`

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setApproving(true)
    approveJobs.mutate({ jobIds: [job._id], resumeId, coverLetter: false }, {
      onSettled: () => setApproving(false)
    })
  }

  return (
    <div onClick={onSelect} className="bg-surface border border-border rounded-xl p-4 hover:border-teal/30 hover:shadow-sm cursor-pointer transition-all duration-200">
      <div className="flex items-start gap-3 mb-2">
        <div className="h-9 w-9 rounded-lg bg-paper-dark flex items-center justify-center text-sm font-semibold text-ink shrink-0 overflow-hidden">
          <img src={logoUrl} alt={job.companyName} className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.textContent = logoFallback }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink truncate">{job.roleTitle}</p>
            {score > 0 && (
              <span className={`text-[11px] font-bold shrink-0 ${score >= 70 ? 'text-teal' : score >= 40 ? 'text-amber' : 'text-muted'}`}>
                {score}%
              </span>
            )}
          </div>
          <p className="text-xs text-muted">{job.companyName}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {(job.isRemote || job.location) && (
          <span className="text-[11px] text-muted flex items-center gap-0.5 bg-paper-dark px-1.5 py-0.5 rounded">
            <IconMapPin className="h-2.5 w-2.5" />
            {job.isRemote ? 'Remote' : job.location}
          </span>
        )}
        {ef.experienceLevel && (
          <span className="text-[11px] text-muted bg-paper-dark px-1.5 py-0.5 rounded">{ef.experienceLevel}</span>
        )}
        <span className="text-[10px] text-muted ml-auto flex items-center gap-0.5">
          <IconClock className="h-2.5 w-2.5" />
          {timeAgo}
        </span>
      </div>
      {job.match?.matchIntelligenceLine && (
        <p className="text-xs text-muted mb-3 leading-relaxed line-clamp-1">{job.match.matchIntelligenceLine}</p>
      )}
      <button
        onClick={handleApprove}
        disabled={approving || approveJobs.isPending}
        className="w-full py-2 text-xs font-semibold bg-teal text-white rounded-lg hover:bg-teal-dark disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
      >
        {approving ? <IconLoader2 className="h-3.5 w-3.5 animate-spin" /> : <IconSend className="h-3.5 w-3.5" />}
        {approving ? 'Approving...' : 'Approve for auto-apply'}
      </button>
    </div>
  )
}

// ── Discover Content with infinite scroll + detail panel ──

function DiscoverContent({ feed, feedLoading, feedError, resumeId, onRefresh }: { feed: any; feedLoading: boolean; feedError: any; resumeId: string; onRefresh: () => void }) {
  const [selectedJob, setSelectedJob] = useState<DiscoverFeedJob | null>(null)
  const [allJobs, setAllJobs] = useState<DiscoverFeedJob[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (feed?.jobs) {
      setAllJobs(feed.jobs)
      setNextCursor(feed.cursor ?? null)
      setHasMore(feed.hasMore ?? false)
    }
  }, [feed])

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    setFetchError(null)
    try {
      const { data } = await api.get(`/discover/feed?cursor=${nextCursor}&minScore=50&sort=relevance`)
      const res = (data.data || data) as DiscoverFeedResponse
      setAllJobs(prev => [...prev, ...res.jobs])
      setNextCursor(res.cursor ?? null)
      setHasMore(res.hasMore ?? false)
    } catch (err) {
      setFetchError('Failed to load more jobs')
    } finally {
      setLoadingMore(false)
    }
  }, [nextCursor, loadingMore])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loadingMore && nextCursor) loadMore()
    }, { rootMargin: '400px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, nextCursor, loadingMore, loadMore])

  if (feedLoading && allJobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <IconLoader2 className="h-6 w-6 text-teal animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex gap-6 h-full">
      <div className={`flex flex-col min-h-0 ${selectedJob ? 'w-[480px] shrink-0' : 'flex-1'}`}>
        <div className="flex items-center justify-between shrink-0 mb-4">
          <p className="text-sm text-muted">High-match jobs from your feed. Approve the ones you want us to fill.</p>
          {onRefresh && (
            <button onClick={onRefresh} className="text-xs font-medium text-teal hover:text-teal-dark transition-colors shrink-0 ml-3">
              Refresh
            </button>
          )}
        </div>

        {(feedError || fetchError) && (
          <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{feedError ? `Failed to load jobs: ${(feedError as Error).message}` : fetchError}</div>
        )}

        {allJobs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12 bg-surface border border-border rounded-2xl max-w-md w-full">
              <IconBriefcase className="h-10 w-10 text-muted-light mx-auto mb-3" />
              <p className="text-sm text-muted">No matching jobs found yet. We&rsquo;re continuously searching.</p>
              {feedError && (
                <button onClick={onRefresh} className="mt-4 px-4 py-2 text-sm font-medium bg-teal text-white rounded-xl hover:bg-teal-dark transition-colors">
                  Retry
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0 pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allJobs.map((job) => (
                <DiscoverJobCard key={job._id} job={job} resumeId={resumeId} onSelect={() => setSelectedJob(job)} />
              ))}
            </div>
            {hasMore && (
              <div ref={sentinelRef} className="flex items-center justify-center py-6">
                {loadingMore ? (
                  <IconLoader2 className="h-5 w-5 text-teal animate-spin" />
                ) : (
                  <p className="text-xs text-muted">Scroll for more</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedJob && (
        <div className="flex-1 min-w-0 border-l border-border pl-6 animate-[fadeIn_0.2s_ease-out]">
          <JobDetailPanel job={selectedJob} resumeId={resumeId} onClose={() => setSelectedJob(null)} />
        </div>
      )}
    </div>
  )
}

// ── Job Detail Panel ──

function JobDetailPanel({ job, resumeId, onClose }: { job: DiscoverFeedJob; resumeId: string; onClose: () => void }) {
  const approveJobs = useApproveJobs()
  const [approving, setApproving] = useState(false)

  const ef = job.extractedFields || {}
  const score = job.match?.atsScore ?? 0
  const postedDate = job.postedAt ? new Date(job.postedAt) : null
  const timeAgo = postedDate ? getTimeSince(postedDate) : ''
  const applyUrl = job.applicationUrl || extractApplyUrl(job.descriptionRaw || '')

  const handleApprove = () => {
    setApproving(true)
    approveJobs.mutate({ jobIds: [job._id], resumeId, coverLetter: false }, {
      onSettled: () => setApproving(false)
    })
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between shrink-0 mb-4">
        <h3 className="font-display text-h4 text-ink truncate">Job Details</h3>
        <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-paper-dark transition-colors">
          <IconX className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-paper-dark flex items-center justify-center text-sm font-semibold text-ink shrink-0 overflow-hidden">
              {job.companyName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-ink">{job.roleTitle}</p>
              <p className="text-sm text-muted">{job.companyName}</p>
              <div className="flex items-center gap-2 mt-1">
                {(job.isRemote || job.location) && (
                  <span className="text-xs text-muted flex items-center gap-0.5">
                    <IconMapPin className="h-3 w-3" />
                    {job.isRemote ? 'Remote' : job.location}
                  </span>
                )}
                <span className="text-xs text-muted flex items-center gap-0.5">
                  <IconClock className="h-3 w-3" />
                  {timeAgo}
                </span>
              </div>
            </div>
            {score > 0 && (
              <div className="h-12 w-12 rounded-full bg-paper-dark flex items-center justify-center shrink-0">
                <span className={`text-sm font-bold ${score >= 70 ? 'text-teal' : score >= 40 ? 'text-amber' : 'text-muted'}`}>{score}%</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApprove}
              disabled={approving || approveJobs.isPending}
              className="flex-1 py-2 text-xs font-semibold bg-teal text-white rounded-lg hover:bg-teal-dark disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
            >
              {approving ? <IconLoader2 className="h-3.5 w-3.5 animate-spin" /> : <IconSend className="h-3.5 w-3.5" />}
              {approving ? 'Approving...' : 'Approve for auto-apply'}
            </button>
            {applyUrl && (
              <a href={applyUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-xs font-medium border border-border rounded-lg text-muted hover:text-ink hover:bg-paper-dark transition-colors flex items-center gap-1">
                <IconExternalLink className="h-3.5 w-3.5" />
                Apply
              </a>
            )}
          </div>
        </div>

        {job.match && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <h4 className="text-sm font-semibold text-ink mb-2">Match Analysis</h4>
            <p className="text-sm text-muted leading-relaxed mb-3">{job.match.matchIntelligenceLine}</p>
            {job.match.matchedKeywords.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-medium text-muted mb-1.5">Matched</p>
                <div className="flex flex-wrap gap-1">
                  {job.match.matchedKeywords.map((kw, i) => (
                    <span key={i} className="text-[11px] text-teal-dark bg-teal-light px-2 py-0.5 rounded-full">{kw}</span>
                  ))}
                </div>
              </div>
            )}
            {job.match.missingKeywords.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted mb-1.5">Missing</p>
                <div className="flex flex-wrap gap-1">
                  {job.match.missingKeywords.map((kw, i) => (
                    <span key={i} className="text-[11px] text-amber-dark bg-amber-light px-2 py-0.5 rounded-full">{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {((ef.salaryMin ?? ef.salaryMax) || ef.experienceLevel) && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <h4 className="text-sm font-semibold text-ink mb-2">Compensation & Level</h4>
            <div className="space-y-1.5">
              {(ef.salaryMin ?? ef.salaryMax) && (
                <p className="text-sm text-ink">
                  {ef.salaryMin ? `$${ef.salaryMin.toLocaleString()}` : ''}{ef.salaryMin && ef.salaryMax ? ' - ' : ''}{ef.salaryMax ? `$${ef.salaryMax.toLocaleString()}` : ''}
                  {ef.salaryCurrency ? ` ${ef.salaryCurrency}` : ''}
                </p>
              )}
              {ef.experienceLevel && <p className="text-sm text-muted">{ef.experienceLevel}</p>}
            </div>
          </div>
        )}

        <div className="bg-surface border border-border rounded-xl p-4">
          <h4 className="text-sm font-semibold text-ink mb-2">Description</h4>
          <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{job.descriptionRaw || 'No description available.'}</p>
        </div>
      </div>
    </div>
  )
}

function extractApplyUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s"'<>]+/g)
  return match ? match[0] : null
}

function getTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Submission Row ──

function SubmissionRow({ submission }: { submission: ApplySubmission }) {
  const navigate = useNavigate()
  const fillApp = useFillApplication()
  const retry = useRetrySubmission()
  const job = typeof submission.jobListingId === 'object' ? submission.jobListingId : null

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-surface border border-border rounded-lg hover:shadow-sm transition-shadow">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{job?.roleTitle || 'Unknown role'}</p>
        <p className="text-xs text-muted truncate">{job?.companyName || 'Unknown company'}</p>
      </div>
      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusColors[submission.status] || 'text-muted bg-paper border-border'}`}>
        {statusLabels[submission.status] || submission.status}
      </span>
      <span className="text-[11px] text-muted capitalize">{submission.atsPlatform}</span>
      {submission.status === 'approved' && (
        <button onClick={() => fillApp.mutate(submission._id)} disabled={fillApp.isPending} className="text-xs font-medium text-teal hover:text-teal-dark disabled:opacity-50 transition-colors whitespace-nowrap">
          {fillApp.isPending ? 'Filling...' : 'Fill & Preview'}
        </button>
      )}
      {submission.status === 'ready_for_review' && (
        <button onClick={() => navigate(`/apply/${submission._id}/review`)} className="text-xs font-medium text-teal hover:text-teal-dark transition-colors whitespace-nowrap">
          Review & Submit
        </button>
      )}
      {submission.status === 'failed' && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted truncate max-w-[180px]" title={submission.failureReason}>{submission.failureReason}</span>
          <button onClick={() => retry.mutate(submission._id)} disabled={retry.isPending} className="text-xs font-medium text-teal hover:text-teal-dark disabled:opacity-50 transition-colors whitespace-nowrap">
            {retry.isPending ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Tabs ──

function SubmissionsTab() {
  const { data: submissions, isLoading, error } = useAutoApplySubmissions()
  const [filter, setFilter] = useState<string>('all')
  const filtered = submissions?.filter((s) => filter === 'all' || s.status === filter) || []

  return (
    <div>
      {error && (
        <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">Failed to load submissions: {(error as Error).message}</div>
      )}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
        {['all', 'approved', 'ready_for_review', 'submitted', 'failed'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${filter === f ? 'bg-teal text-white' : 'bg-paper text-muted hover:text-ink border border-border'}`}>
            {f === 'all' ? 'All' : statusLabels[f] || f}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {isLoading && <p className="text-sm text-muted">Loading submissions...</p>}
        {!isLoading && filtered.length === 0 && <p className="text-sm text-muted">No submissions yet. Approve jobs from the Discover tab to get started.</p>}
        {filtered.map((s) => <SubmissionRow key={s._id} submission={s} />)}
      </div>
    </div>
  )
}

function AnswersBankTab() {
  const { data: answers, isLoading } = useAnswersBank()
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div>
      <p className="text-xs text-muted mb-4">Saved answers are automatically applied to matching screening questions during auto-fill.</p>
      {isLoading && <p className="text-sm text-muted">Loading answers...</p>}
      {!isLoading && (!answers || answers.length === 0) && <p className="text-sm text-muted">No saved answers yet. Answers are saved when you fill applications.</p>}
      <div className="flex flex-col gap-2">
        {(answers || []).map((a) => (
          <div key={a._id} className="bg-surface border border-border rounded-lg overflow-hidden">
            <button onClick={() => setExpanded(expanded === a._id ? null : a._id)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-paper-dark/30 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{a.originalQuestion}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-medium text-muted bg-paper px-1.5 py-0.5 rounded capitalize">{a.category}</span>
                  <span className="text-[10px] text-muted">Used {a.hitCount} times</span>
                </div>
              </div>
              <svg className={`h-4 w-4 text-muted transition-transform ${expanded === a._id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expanded === a._id && (
              <div className="px-4 pb-3 pt-0 border-t border-border">
                <p className="text-sm text-ink mt-2 whitespace-pre-wrap">{a.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ConfigTab() {
  const { data: config, isLoading, error } = useAutoApplyConfig()
  const updateConfig = useUpdateAutoApplyConfig()
  const [localConfig, setLocalConfig] = useState<{ autoAttachCoverLetter: boolean; maxConcurrentSubmissions: number } | null>(null)

  if (isLoading) return <p className="text-sm text-muted">Loading settings...</p>

  const display = localConfig ?? { autoAttachCoverLetter: config?.autoAttachCoverLetter ?? true, maxConcurrentSubmissions: config?.maxConcurrentSubmissions ?? 3 }

  const save = (patch: Record<string, unknown>) => {
    setLocalConfig((prev) => prev ? { ...prev, ...patch } as any : null)
    updateConfig.mutate(patch)
  }

  return (
    <div className="max-w-md">
      {error && <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">Failed to load settings: {(error as Error).message}</div>}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={display.autoAttachCoverLetter} onChange={(e) => save({ autoAttachCoverLetter: e.target.checked })} className="rounded border-border text-teal focus:ring-teal" />
          <span className="text-sm text-ink">Auto-attach cover letter</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={config?.requirePreviewApproval ?? true} disabled className="rounded border-border text-teal/50 focus:ring-teal" />
          <span className="text-sm text-ink">Require preview approval</span>
          <span className="text-[10px] text-muted">(always required)</span>
        </label>
        <div>
          <label className="text-sm text-ink block mb-1">Max concurrent submissions</label>
          <input type="number" min={1} max={10} value={display.maxConcurrentSubmissions} onChange={(e) => save({ maxConcurrentSubmissions: parseInt(e.target.value, 10) })} className="w-20 px-3 py-1.5 text-sm border border-border rounded-lg bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-teal/30" />
        </div>
      </div>
    </div>
  )
}

// ── Tabs config ──

const TABS = [
  { key: 'discover', label: 'Discover', icon: IconBriefcase },
  { key: 'submissions', label: 'Submissions', icon: IconSend },
  { key: 'answers', label: 'Answers', icon: IconDatabase },
  { key: 'settings', label: 'Settings', icon: IconSettings },
] as const

type TabKey = typeof TABS[number]['key']

// ── Main Dashboard ──

export default function AutoApplyDashboard() {
  const { data: resumes, isLoading: resumesLoading } = useResumes()
  const { data: completion, isLoading: completionLoading } = useCompletionStatus()
  const feedQuery = useDiscoverFeed({ minScore: 50, sort: 'relevance' })
  const { data: feed, error: feedError, isLoading: feedLoading } = feedQuery
  console.log('[AutoApplyDashboard] discover feed:', { jobs: feed?.jobs?.length, error: feedError ? (feedError as Error).message : null, loading: feedLoading })
  const qc = useQueryClient()

  const [tab, setTab] = useState<TabKey>('discover')
  const [showResumeUpload, setShowResumeUpload] = useState(false)
  const [showWizard, setShowWizard] = useState(false)

  const hasResume = !resumesLoading && resumes && resumes.length > 0
  const resumeId = resumes?.[0]?._id || ''
  const isComplete = completion?.complete ?? false
  const isLoading = resumesLoading || completionLoading

  const startSetup = () => {
    if (!hasResume) {
      setShowResumeUpload(true)
    } else {
      setShowWizard(true)
    }
  }

  const handleResumeUploaded = () => {
    setShowResumeUpload(false)
    qc.invalidateQueries({ queryKey: ['resumes'] })
    setShowWizard(true)
  }

  const handleWizardComplete = () => {
    setShowWizard(false)
    qc.invalidateQueries({ queryKey: ['auto-apply-profile'] })
    qc.invalidateQueries({ queryKey: ['auto-apply-profile', 'completion-status'] })
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <IconLoader2 className="h-8 w-8 text-teal animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {showResumeUpload && <ResumeUploadModal onComplete={handleResumeUploaded} />}
      {showWizard && <SetupWizardModal onComplete={handleWizardComplete} />}

      {isComplete ? (
        <div className="flex flex-col flex-1 min-h-0 max-w-[95rem] w-full mx-auto px-4 sm:px-8">
          <div className="shrink-0 pt-5 pb-0">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="font-display text-h3 text-ink">Auto-Apply</h1>
                <p className="text-sm text-muted mt-0.5">Approve matching jobs and we&rsquo;ll fill them for you.</p>
              </div>
              <button onClick={startSetup} className="px-4 py-2 text-sm font-medium border border-border rounded-xl text-ink hover:bg-paper-dark transition-colors shrink-0">
                Update preferences
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
              <StatCard icon={IconBriefcase} label="Discovered" value={feed?.jobs?.length ?? 0} color="teal" />
              <StatCard icon={IconSend} label="Pending" value={feed?.jobs?.filter(j => j.isTracked)?.length ?? 0} color="amber" />
              <StatCard icon={IconCircleCheck} label="Submitted" value={0} color="green" />
            </div>

            <div className="flex items-center gap-1 bg-paper border border-border rounded-xl p-1 mb-5 overflow-x-auto shrink-0">
              {TABS.map((t) => {
                const Icon = t.icon
                return (
                  <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${tab === t.key ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 pb-6">
            {tab === 'discover' && (
              <DiscoverContent
                feed={feed}
                feedLoading={feedLoading}
                feedError={feedError}
                resumeId={resumeId}
                onRefresh={() => qc.invalidateQueries({ queryKey: ['discover-feed'] })}
              />
            )}
            {tab === 'submissions' && <SubmissionsTab />}
            {tab === 'answers' && <AnswersBankTab />}
            {tab === 'settings' && <ConfigTab />}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8">
          <div className="max-w-2xl w-full pt-8">
            <div className="bg-surface border border-border rounded-2xl p-10 text-center animate-[fadeIn_0.4s_ease-out]">
              <div className="h-16 w-16 bg-teal-light rounded-2xl flex items-center justify-center mx-auto mb-5">
                <IconBriefcase className="h-8 w-8 text-teal" />
              </div>
              <h2 className="font-display text-h2 text-ink mb-3">Automate your job applications</h2>
              <p className="text-base text-muted max-w-md mx-auto mb-8 leading-relaxed">
                We&rsquo;ll find matching jobs, fill out applications, and screen you in &mdash; so you only review the ones worth your time.
              </p>
              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8 text-left">
                <FeatureStep number="1" text="Upload your resume" />
                <FeatureStep number="2" text="Set your preferences" />
                <FeatureStep number="3" text="Approve jobs to apply" />
              </div>
              <button onClick={startSetup} className="px-8 py-3 text-base font-semibold bg-ink text-paper rounded-xl hover:opacity-80 transition-all">
                Set up auto-apply
              </button>
              {!hasResume && (
                <p className="text-xs text-muted mt-3">You&rsquo;ll be prompted to upload your resume first.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>)
}

function FeatureStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="text-center">
      <div className="h-8 w-8 bg-paper-dark rounded-lg flex items-center justify-center mx-auto mb-2">
        <span className="text-xs font-bold text-ink">{number}</span>
      </div>
      <p className="text-xs text-muted leading-snug">{text}</p>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = { teal: 'text-teal bg-teal-light', amber: 'text-amber bg-amber-light', green: 'text-success bg-success-light' }
  return (
    <div className="bg-surface border border-border rounded-xl p-5 animate-[fadeIn_0.4s_ease-out]">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${colorMap[color] || colorMap.teal}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-display text-h4 text-ink">{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </div>
  )
}
