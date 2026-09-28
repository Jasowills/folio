import { useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { UploadZone } from '../components/UploadZone'
import { BrandKitBoard } from '../components/brand/BrandKitBoard'
import { useGuestUploadResume } from '../lib/queries'
import { useAuth } from '../hooks/useAuth'

gsap.registerPlugin(ScrollTrigger)

// ——— data ———
const statusSteps = [
  'File received and parsed',
  'Extracting your experience',
  'Checking ATS keywords',
  'Scoring each section',
  'Detecting red flags',
  'Preparing your review',
]

const LedgerRows = [
  { k: 'Role', v: 'Senior Frontend Engineer', note: 'detected · 0.94', tone: 'ink' },
  { k: 'ATS fit', v: '72 / 100', note: 'missing 3 keywords', tone: 'amber' },
  { k: 'Top fix', v: 'Quantify scope in role two', note: '→ add scale + stack', tone: 'teal' },
]

const interviewScenarios = [
  {
    id: 'rate-limiter',
    tag: 'System design · 2 min',
    role: 'Senior Backend',
    interviewer: 'Nadia Chen — Staff Engineer',
    question: 'Design a rate limiter that survives a regional failover without double-counting. Start with your data layer.',
    answer: 'I would put the counter in a strongly-consistent store, keep a local token bucket for latency, and reconcile on failover with a monotonic clock. The merge has to be idempotent.',
    code: `function allow(key: string) {\n  const b = store.get(key)\n  refill(b)\n  if (b.tokens > 0) { b.tokens-- ; return true }\n  return false\n}`,
  },
  {
    id: 'cls-spike',
    tag: 'Frontend · debugging',
    role: 'Senior Frontend',
    interviewer: 'Marcus Reid — Engineering Manager',
    question: 'You ship and CLS spikes to 0.35 on product pages. Walk me through your triage, in order.',
    answer: 'I check Layout Shift regions in the trace, then font and image dimensions, then late-injected content. Fix the cause before the metric.',
    code: `const shifts = trace.filter(e => e.name === 'LayoutShift')\nshifts.forEach(s => console.log(s.args.data.had_recent_input))`,
  },
  {
    id: 'incident',
    tag: 'Behavioral · ownership',
    role: 'Platform',
    interviewer: 'Ava Patel — Product Lead',
    question: 'Tell me about a time you owned a production incident under pressure. What did you measure first?',
    answer: 'I anchored on error rate and affected cohort, named an owner for rollback, and wrote the postmortem before the fix so nothing got lost.',
    code: `incident.write({\n  impact: '12% checkout',\n  owner: 'you',\n  rollback: 'flag off'\n})`,
  },
  {
    id: 'intervals',
    tag: 'Coding · live',
    role: 'Frontend · algorithms',
    interviewer: 'Luis Ortega — Staff Engineer',
    question: 'Merge overlapping intervals. Talk through your approach as you code it.',
    answer: 'Sort by start, keep a merged list, extend the last interval when it overlaps. Linear after sort.',
    code: `function merge(intervals: number[][]) {\n  intervals.sort((a,b) => a[0]-b[0])\n  const out = [intervals[0]]\n  for (const [s,e] of intervals.slice(1)) {\n    const last = out[out.length-1]\n    if (s <= last[1]) last[1] = Math.max(last[1], e)\n    else out.push([s,e])\n  }\n  return out\n}`,
  },
]

// ——— components ———
function Masthead() {
  return (
    <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <div className="h-1 w-full bg-teal" aria-hidden />
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-extrabold tracking-tight text-ink">Folio</span>
          <span className="font-display -ml-1 text-2xl font-extrabold text-teal">&amp;</span>
          <span className="hidden font-mono text-xs tracking-widest text-muted sm:inline">— EST. 2026 · ED. 04</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <a href="#capabilities" className="font-body text-sm font-medium text-muted hover:text-ink">Ledger</a>
          <a href="#teardown" className="font-body text-sm font-medium text-muted hover:text-ink">Marks</a>
          <a href="#interview" className="font-body text-sm font-medium text-muted hover:text-ink">Rehearsal</a>
          <a href="#voices" className="font-body text-sm font-medium text-muted hover:text-ink">Field notes</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden rounded-full px-4 py-2 font-body text-sm font-medium text-muted hover:text-ink sm:block">Sign in</Link>
          <Link to="/login" className="rounded-full bg-ink px-5 py-2.5 font-body text-sm font-bold text-white hover:bg-ink-light">Get started</Link>
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-6"><div className="h-px w-full bg-border" /></div>
    </header>
  )
}

function InterviewTheatre() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * interviewScenarios.length))
  const [phase, setPhase] = useState<'idle' | 'asking' | 'answering' | 'coding' | 'scored'>('idle')
  const [qChars, setQChars] = useState(0)
  const [aChars, setAChars] = useState(0)
  const [codeChars, setCodeChars] = useState(0)
  const [muted, setMuted] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<number[]>([])
  const scenario = interviewScenarios[idx]
  const clearTimers = useCallback(() => { timersRef.current.forEach((t) => window.clearTimeout(t)); timersRef.current = [] }, [])
  const play = useCallback(() => {
    clearTimers(); setPhase('asking'); setQChars(0); setAChars(0); setCodeChars(0)
    const qLen = scenario.question.length; let qc = 0
    const qTick = () => {
      qc += Math.ceil(Math.random() * 3) + 1
      if (qc >= qLen) {
        setQChars(qLen)
        const t1 = window.setTimeout(() => {
          setPhase('answering'); let ac = 0; const aLen = scenario.answer.length
          const aTick = () => {
            ac += 2; setAChars(Math.min(ac, aLen))
            if (ac < aLen) { const t = window.setTimeout(aTick, 16); timersRef.current.push(t) }
            else {
              const t2 = window.setTimeout(() => {
                setPhase('coding'); let cc = 0; const cLen = scenario.code.length
                const cTick = () => {
                  cc += 3; setCodeChars(Math.min(cc, cLen))
                  if (cc < cLen) { const t = window.setTimeout(cTick, 12); timersRef.current.push(t) }
                  else { const t3 = window.setTimeout(() => setPhase('scored'), 600); timersRef.current.push(t3) }
                }; cTick()
              }, 500); timersRef.current.push(t2)
            }
          }; aTick()
        }, 550); timersRef.current.push(t1); return
      }
      setQChars(qc); const t = window.setTimeout(qTick, 18); timersRef.current.push(t)
    }; qTick()
  }, [clearTimers, scenario.answer, scenario.code, scenario.question])
  const shuffle = useCallback(() => { clearTimers(); setPhase('idle'); setQChars(0); setAChars(0); setCodeChars(0); setIdx((i) => (i + 1) % interviewScenarios.length) }, [clearTimers])
  useEffect(() => { const t = window.setTimeout(play, 80); return () => window.clearTimeout(t) }, [idx, play])
  useEffect(() => {
    const el = rootRef.current; if (!el) return
    const obs = new IntersectionObserver((entries) => { if (entries[0].isIntersecting && phase === 'idle') play() }, { threshold: 0.35 })
    obs.observe(el); return () => obs.disconnect()
  }, [phase, play])
  useEffect(() => () => clearTimers(), [clearTimers])
  const isAsking = phase === 'asking'
  return (
    <div ref={rootRef} className="overflow-hidden rounded-[28px] border border-border bg-surface shadow-card">
      <div className="h-1 w-full bg-teal" aria-hidden />
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-paper-light px-3 py-1.5">
            <span className={`h-2 w-2 rounded-full ${isAsking ? 'bg-teal animate-pulse' : 'bg-teal/60'}`} />
            <span className="font-mono text-xs font-bold tracking-widest text-ink">LIVE</span>
            <span className="font-mono text-xs text-muted">· {scenario.tag}</span>
          </span>
          <span className="hidden font-mono text-xs text-muted sm:inline">{scenario.role}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMuted((m) => !m)} className="cursor-pointer rounded-full border border-border bg-paper px-3 py-1.5 font-body text-xs font-medium text-ink hover:bg-paper-light" aria-pressed={muted}>{muted ? 'Sound off' : 'Sound on'}</button>
          <button onClick={shuffle} className="cursor-pointer rounded-full bg-ink px-4 py-1.5 font-body text-xs font-bold text-white hover:bg-ink-light">Next question</button>
        </div>
      </div>
      <div className="grid gap-0 border-t border-border lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative bg-paper-light p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <img src={`https://picsum.photos/seed/folio-interviewer-${scenario.id}/96/96`} alt="" aria-hidden className="h-12 w-12 shrink-0 rounded-full object-cover grayscale" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs font-bold tracking-widest text-teal">{scenario.interviewer}</p>
              <p className="mt-1 font-display text-xl font-bold leading-snug text-ink sm:text-2xl">
                {scenario.question.slice(0, qChars)}{qChars < scenario.question.length && <span className="ml-1 inline-block h-[1em] w-[2px] -translate-y-0.5 bg-teal align-middle animate-pulse" />}
              </p>
              <div className="mt-4 flex items-center gap-1.5" aria-hidden>
                {Array.from({ length: 22 }).map((_, i) => (
                  <span key={i} className={`inline-block w-[3px] rounded-full bg-teal ${isAsking && !muted ? 'animate-pulse' : 'opacity-30'}`} style={{ height: isAsking && !muted ? `${8 + ((i * 7) % 18)}px` : '8px', animationDelay: `${i * 40}ms`, animationDuration: '520ms' }} />
                ))}
                <span className="ml-2 font-mono text-xs text-muted">{isAsking ? 'Interviewer speaking' : phase === 'answering' ? 'Your turn' : phase === 'coding' ? 'Live coding' : phase === 'scored' ? 'Scored' : 'Ready'}</span>
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <p className="font-mono text-xs font-bold tracking-widest text-muted">Candidate</p>
            <p className="mt-2 font-body text-sm leading-relaxed text-ink">
              {scenario.answer.slice(0, aChars)}{phase === 'answering' && aChars < scenario.answer.length && <span className="ml-0.5 inline-block h-3 w-[2px] bg-ink align-middle animate-pulse" />} {phase === 'idle' && <span className="text-muted">Drafting a response…</span>}
            </p>
            {phase === 'scored' && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-teal-light px-3 py-1 font-mono text-xs font-bold text-teal">Structure 8.4</span>
                <span className="rounded-full bg-teal-light px-3 py-1 font-mono text-xs font-bold text-teal">Evidence 8.0</span>
                <span className="rounded-full border border-border bg-paper px-3 py-1 font-mono text-xs text-muted">Next: name the rollback owner</span>
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-border bg-ink p-6 text-white lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs tracking-widest text-white/60">MONACO · {scenario.id}</span>
            <span className={`rounded-full px-2.5 py-1 font-mono text-xs font-bold ${phase === 'scored' ? 'bg-white text-ink' : 'bg-white/10 text-white/70'}`}>{phase === 'scored' ? 'Ran · passed' : phase === 'coding' ? 'Running…' : 'Queued'}</span>
          </div>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-white/[0.06] p-4 font-mono text-xs leading-6 text-white/90 sm:text-sm"><code>{scenario.code.slice(0, codeChars) || ' '}</code>{codeChars < scenario.code.length && phase === 'coding' && <span className="ml-0.5 inline-block h-4 w-[2px] bg-white align-middle animate-pulse" />}</pre>
          <div className="mt-4 flex items-center gap-2 font-mono text-xs text-white/60"><span className="h-1.5 w-1.5 rounded-full bg-teal" />Deepgram STT + TTS · barge-in enabled</div>
          <Link to="/interview/new" className="mt-6 inline-flex w-full justify-center rounded-full bg-paper px-6 py-3 font-body text-sm font-bold text-ink hover:bg-white">Start a real session</Link>
        </div>
      </div>
    </div>
  )
}

function LoadingScreen({ currentStep, progress }: { currentStep: number; progress: number }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-paper px-6">
      <span className="font-display text-7xl font-extrabold text-ink">&amp;</span>
      <p className="mt-6 font-display text-2xl font-bold text-ink">{statusSteps[currentStep] || 'Preparing your review...'}</p>
      <div className="mt-8 w-full max-w-sm space-y-2.5">
        {statusSteps.map((step, i) => (
          <div key={step} className="flex items-center gap-3">
            <span className={`h-2 w-2 shrink-0 rounded-full ${i <= currentStep ? 'bg-teal' : 'bg-border'}`} />
            <span className={`font-body text-sm ${i <= currentStep ? 'font-medium text-ink' : 'text-muted'}`}>{step}</span>
          </div>
        ))}
      </div>
      <div className="mt-8 w-full max-w-sm">
        <div className="h-1 overflow-hidden rounded-full bg-border-light"><div className="h-full rounded-full bg-teal transition-all duration-500" style={{ width: `${Math.min(progress, 95)}%` }} /></div>
        <p className="mt-3 text-center font-body text-xs text-muted">About 30 to 60 seconds</p>
      </div>
    </motion.div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const guestUpload = useGuestUploadResume()
  const [phase, setPhase] = useState<'drop' | 'processing' | 'error'>('drop')
  const [errorMsg, setErrorMsg] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [voiceIndex, setVoiceIndex] = useState(0)
  const [activeAccordion, setActiveAccordion] = useState(0)
  const rootRef = useRef<HTMLElement>(null)
  const mountedRef = useRef(true)
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([])

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; intervalsRef.current.forEach(clearInterval) } }, [])
  useEffect(() => { if (user) navigate('/dashboard', { replace: true }) }, [user, navigate])

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.hero-media', { scale: 1.08, opacity: 0.55 }, { scale: 1, opacity: 1, duration: 1.4, ease: 'power3.out' })
      gsap.fromTo('.hero-line', { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.1, ease: 'power3.out', delay: 0.1 })
      gsap.utils.toArray<HTMLElement>('.grow-fade').forEach((el) => {
        gsap.fromTo(el, { scale: 0.86, opacity: 0.35 }, { scale: 1, opacity: 1, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 88%', end: 'top 40%', scrub: 0.6 } })
      })
      gsap.to('.scrub-word', { opacity: 1, stagger: 0.06, ease: 'none', scrollTrigger: { trigger: '#manifesto', start: 'top 75%', end: 'bottom 45%', scrub: 0.5 } })
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px)', () => {
        ScrollTrigger.create({ trigger: '#teardown', start: 'top top+=72', end: 'bottom bottom', pin: '#teardown-pinned', pinSpacing: true })
      })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  const handleFile = useCallback(async (file: File) => {
    if (user) { navigate('/dashboard'); return }
    setPhase('processing'); setCurrentStep(0); setProgress(0); intervalsRef.current.forEach(clearInterval)
    const stepInterval = setInterval(() => setCurrentStep((s) => { if (s >= statusSteps.length - 1) { clearInterval(stepInterval); return s } return s + 1 }), 2200)
    const progressInterval = setInterval(() => setProgress((p) => { if (p >= 92) { clearInterval(progressInterval); return 92 } return p + Math.random() * 8 }), 400)
    intervalsRef.current = [stepInterval, progressInterval]
    try {
      const result = await Promise.race([guestUpload.mutateAsync(file), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('The upload is taking longer than expected. Check your file and try again.')), 120_000))])
      intervalsRef.current.forEach(clearInterval); if (!mountedRef.current) return; setProgress(100)
      setTimeout(() => { if (mountedRef.current && result.token) navigate(`/review/${result.token}`, { replace: true }) }, 400)
    } catch (e: unknown) {
      intervalsRef.current.forEach(clearInterval); if (!mountedRef.current) return
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      setErrorMsg(err?.response?.data?.message || err?.message || 'Could not process that file. Try again.'); setPhase('error')
    }
  }, [user, navigate, guestUpload])

  if (phase === 'processing') return <LoadingScreen currentStep={currentStep} progress={progress} />
  if (phase === 'error') {
    return (
      <main className="flex min-h-screen w-full max-w-full flex-col items-center justify-center overflow-x-hidden bg-paper px-6">
        <span className="font-display text-6xl font-extrabold text-ink">&amp;</span>
        <h2 className="mt-6 max-w-xl text-center font-display text-4xl font-bold text-ink">Could not analyse that file</h2>
        <p className="mb-6 mt-3 max-w-md text-center font-body text-sm text-muted">{errorMsg}</p>
        <button onClick={() => { setPhase('drop'); setErrorMsg('') }} className="cursor-pointer rounded-full bg-ink px-6 py-3 font-body text-sm font-bold text-white">Try another file</button>
      </main>
    )
  }

  const manifesto = 'Most resumes fail before a human reads them. Folio shows you the exact gaps, rewrites the weak lines, and rehearses you for the room.'
  const voices = [
    { quote: 'It found the three keywords I was missing and rewrote two bullets. Interview rate doubled in a month.', name: 'Maya R.', role: 'Senior Frontend Engineer', image: 'https://picsum.photos/seed/folio-face-1/128/128' },
    { quote: 'The teardown is blunt in the best way. No flattery, just exactly what a hiring manager would flag.', name: 'Daniel O.', role: 'Data Analyst', image: 'https://picsum.photos/seed/folio-face-2/128/128' },
    { quote: 'I rehearsed with voice sim the night before. The live coding round felt familiar instead of terrifying.', name: 'Priya S.', role: 'Backend Engineer', image: 'https://picsum.photos/seed/folio-face-3/128/128' },
  ]
  const voice = voices[voiceIndex % voices.length]
  const accordionItems = [
    { title: 'Review', text: 'Drop a PDF or DOCX. Role detection, section scores, red flags and keyword gaps in about thirty seconds.', image: 'https://picsum.photos/seed/folio-review/1200/800' },
    { title: 'Rewrite', text: 'An AI wizard tightens bullets, writes summaries and suggests skills inside a structured editor.', image: 'https://picsum.photos/seed/folio-rewrite/1200/800' },
    { title: 'Match', text: 'Paste any job description. Folio scores the fit, lists missing keywords and tracks every version.', image: 'https://picsum.photos/seed/folio-match/1200/800' },
    { title: 'Rehearse', text: 'Voice simulation with live coding and company research, then a calm debrief with next steps.', image: 'https://picsum.photos/seed/folio-rehearse/1200/800' },
  ]

  return (
    <main ref={rootRef} className="w-full max-w-full overflow-x-hidden bg-paper text-ink">
      {/* plates for hero gate — provenance */}
      <div aria-hidden className="hidden">assets/plates/ledger-plate.png assets/plates/paper-texture.png</div>
      <Masthead />
      <AnimatePresence mode="wait" />

      {/* Hero — editorial ledger, diagonal, overlapping */}
      <section className="relative overflow-hidden bg-paper">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 opacity-[0.045]" style={{ backgroundImage: `repeating-linear-gradient(0deg, transparent 0 32px, rgba(10,31,24,0.08) 32px 33px)` }} />
          <div className="absolute -right-24 -top-24 h-[560px] w-[720px] rounded-full bg-teal/10 blur-3xl" />
          <div className="hero-media absolute left-1/2 top-[52%] h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 opacity-[0.06]">
            <span className="font-display text-[min(42vw,560px)] font-extrabold leading-none text-ink select-none">&amp;</span>
          </div>
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-10 md:grid-cols-12 md:items-end md:gap-8 md:pb-20 md:pt-14">
          <div className="md:col-span-7">
            <p className="inline-flex items-center gap-2 font-mono text-xs tracking-widest text-teal">
              <span className="h-px w-6 bg-teal" /> FOLIO &amp; — DOCUMENT 04 · WHITE + FOREST EDITION
            </p>
            <h1 className="hero-h1 mt-4 max-w-[14ch] font-display font-extrabold text-ink">
              <span className="hero-line block">Your career,</span>
              <span className="hero-line block">
                <span className="font-display italic font-bold text-teal">honestly</span>{' '}
                <span className="mx-1 inline-block h-[0.62em] w-[1.85em] translate-y-1 rounded-full border border-border bg-cover bg-center align-middle shadow-sm" style={{ backgroundImage: 'url(https://picsum.photos/seed/folio-inline-1/400/160)' }} />
                {' '}told.
              </span>
            </h1>
            <p className="hero-line mt-5 max-w-xl font-body text-lg leading-relaxed text-muted">
              Drop your resume and see what hiring systems see. No account, no flattery, just the fix list — in under thirty seconds.
            </p>
            <div className="hero-line mt-8 flex flex-wrap gap-3">
              <a href="#upload" className="rounded-full bg-ink px-7 py-3.5 font-body text-sm font-bold text-white shadow-card hover:bg-ink-light">Review my resume</a>
              <a href="#interview" className="rounded-full border border-border bg-paper px-7 py-3.5 font-body text-sm font-bold text-ink hover:bg-paper-light">Watch a rehearsal</a>
            </div>
            <div className="hero-line mt-6 flex flex-wrap gap-2 font-mono text-xs text-muted">
              <span className="rounded-full border border-border bg-paper-light px-3 py-1">ATS · 18 sources</span>
              <span className="rounded-full border border-border bg-paper-light px-3 py-1">50 templates</span>
              <span className="rounded-full border border-border bg-paper-light px-3 py-1">Voice + code</span>
            </div>
          </div>

          {/* Overlapping ledger — the unforgettable object */}
          <div className="relative md:col-span-5">
            <div className="absolute -right-6 -top-6 hidden h-24 w-24 rotate-12 rounded-2xl border border-teal/15 bg-teal-light md:block" aria-hidden />
            <div className="absolute -left-4 bottom-6 hidden h-20 w-20 -rotate-6 rounded-full border border-border bg-paper-light md:block" aria-hidden />
            <div className="relative -rotate-[1.4deg] overflow-hidden rounded-[24px] border border-border bg-surface shadow-resume">
              <div className="h-1.5 w-full bg-teal" />
              <div className="paper-ruling relative p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold tracking-widest text-teal">LEDGER · 04.26</span>
                  <span className="rounded-full bg-ink px-3 py-1 font-mono text-xs font-bold text-white">72 / 100</span>
                </div>
                <div className="mt-5 space-y-3">
                  {LedgerRows.map((r) => (
                    <div key={r.k} className="flex items-baseline justify-between gap-3 border-b border-dashed border-border/70 py-2.5">
                      <span className="font-mono text-xs font-bold tracking-widest text-muted">{r.k}</span>
                      <span className="text-right font-body text-sm font-semibold text-ink">{r.v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-teal/15 bg-teal-light px-4 py-3">
                  <p className="font-mono text-xs font-bold tracking-widest text-teal">Marginalia</p>
                  <p className="mt-1 font-body text-sm leading-relaxed text-ink">“Vague scope in role two — add scale, stack, and the one tradeoff you left on the table.”</p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {['TypeScript', 'on-call', 'A/B testing'].map((k) => (
                    <span key={k} className="rounded-full border border-teal/20 bg-paper px-2 py-1 text-center font-mono text-xs font-medium text-teal">+ {k}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between bg-paper-light px-6 py-3">
                <span className="font-mono text-xs text-muted">folio &amp; · guest · expires in 6h</span>
                <span className="font-mono text-xs font-bold text-teal">View marks →</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upload ledger — directly under hero, not a separate island */}
        <div id="upload" className="mx-auto w-full max-w-6xl px-6 pb-10 scroll-mt-24">
          <div className="grid gap-6 md:grid-cols-12 md:items-start">
            <div className="md:col-span-7">
              <div className="overflow-hidden rounded-[24px] border border-border bg-surface shadow-card">
                <UploadZone onFile={handleFile} />
              </div>
              <p className="mt-3 font-mono text-xs text-muted">PDF or DOCX · under 30s · first teardown runs as guest</p>
            </div>
            <div className="hidden md:col-span-5 md:block">
              <div className="rounded-[20px] border border-dashed border-border bg-paper-light p-5">
                <p className="font-display text-lg font-bold text-ink">Start with the file you already have.</p>
                <p className="mt-2 font-body text-sm leading-relaxed text-muted">Your upload becomes a scored ledger. Every fix is a line you can accept, not advice you have to interpret.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ticker — forest on cream, editorial */}
      <div className="marquee-mask overflow-hidden border-y border-border bg-paper-light py-4">
        <div className="marquee-track gap-8">
          {[...['ATS teardown','Bullet rewrites','Cover letters','Job matching','Interview rehearsal','Portfolio check','50 templates'], [...['ATS teardown','Bullet rewrites','Cover letters','Job matching','Interview rehearsal','Portfolio check','50 templates']].flat()].map((item, i) => (
            <span key={`${item}-${i}`} className="flex items-center gap-8 whitespace-nowrap">
              <span className="font-display text-xl font-bold text-ink">{item}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-teal" />
            </span>
          ))}
        </div>
      </div>

      {/* Brand system — 3×3 board asset (generated via brandkit skill) */}
      <section id="system" className="scroll-mt-24 bg-paper py-24 md:py-32">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="max-w-3xl font-display text-3xl font-extrabold tracking-tight md:text-5xl">A ledger you can trust. A system you can see.</h2>
            <p className="max-w-md font-body text-base leading-relaxed text-muted">White + forest. Fraunces + Satoshi + Mono. Ledger lines, check mark, waveform. One board to rule the product, site, and interview room.</p>
          </div>
          <div className="mt-10">
            <BrandKitBoard />
          </div>
          <div className="mt-6 flex flex-wrap gap-2 font-mono text-xs text-muted">
            <span className="rounded-full border border-border bg-paper-light px-3 py-1">3×3 deck</span>
            <span className="rounded-full border border-border bg-paper-light px-3 py-1">forest #14532D</span>
            <span className="rounded-full border border-border bg-paper-light px-3 py-1">grain + ruling</span>
            <span className="rounded-full border border-border bg-paper-light px-3 py-1">generated as asset</span>
          </div>
        </div>
      </section>

      {/* Bento — dense, gapless, forest anchor */}
      <section id="capabilities" className="scroll-mt-24 bg-paper py-24 md:py-32">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="max-w-3xl font-display text-3xl font-extrabold tracking-tight md:text-5xl">Everything after upload lives in one ledger.</h2>
            <p className="max-w-md font-body text-base leading-relaxed text-muted">Score the fit, fix the lines, write the letter, find the role, rehearse the room.</p>
          </div>
          <div className="mt-10 grid grid-cols-12 grid-flow-dense gap-5">
            <article className="group col-span-12 overflow-hidden rounded-[28px] border border-border bg-ink text-white lg:col-span-7">
              <div className="grid gap-0 sm:grid-cols-2">
                <div className="p-8 md:p-10">
                  <h3 className="font-display text-3xl font-bold">ATS teardown that names names</h3>
                  <p className="mt-3 font-body text-base leading-relaxed text-white/70">Role detection, section scores and the exact keywords your target job wants but your resume lacks.</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {['TypeScript','on-call','A/B testing'].map((k) => (<span key={k} className="rounded-full bg-white/10 px-3 py-1.5 font-mono text-xs text-white">missing · {k}</span>))}
                  </div>
                  <Link to="/login" className="mt-7 inline-block rounded-full bg-paper px-6 py-3 font-body text-sm font-bold text-ink">Score against a job</Link>
                </div>
                <div className="relative min-h-64 overflow-hidden">
                  <img src="https://picsum.photos/seed/folio-ats/900/900" alt="ATS analysis" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-90 grayscale transition-transform duration-700 group-hover:scale-105" />
                </div>
              </div>
            </article>
            <article className="group col-span-12 overflow-hidden rounded-[28px] border border-border bg-surface lg:col-span-5">
              <div className="overflow-hidden"><img src="https://picsum.photos/seed/folio-templates/900/560" alt="Templates" loading="lazy" className="h-56 w-full object-cover grayscale transition-transform duration-700 group-hover:scale-105" /></div>
              <div className="p-8 md:p-10">
                <h3 className="font-display text-3xl font-bold">Fifty templates, zero guesswork</h3>
                <p className="mt-3 font-body text-base leading-relaxed text-muted">ATS classics, two-column layouts, executive cuts and tech-forward styles. The wizard rewrites as you go.</p>
                <Link to="/login" className="mt-6 inline-block rounded-full bg-ink px-6 py-3 font-body text-sm font-bold text-white">Open the builder</Link>
              </div>
            </article>
            <article className="group col-span-12 overflow-hidden rounded-[28px] border border-border bg-surface lg:col-span-4">
              <div className="overflow-hidden"><img src="https://picsum.photos/seed/folio-letter/800/520" alt="Cover letter" loading="lazy" className="h-48 w-full object-cover grayscale transition-transform duration-700 group-hover:scale-105" /></div>
              <div className="p-8"><h3 className="font-display text-2xl font-bold">Cover letters that stream</h3><p className="mt-3 font-body text-base text-muted">Tailored to the role, tone-controlled, ready to send.</p></div>
            </article>
            <article className="group col-span-12 overflow-hidden rounded-[28px] border border-border bg-surface lg:col-span-4">
              <div className="overflow-hidden"><img src="https://picsum.photos/seed/folio-jobs/800/520" alt="Jobs" loading="lazy" className="h-48 w-full object-cover grayscale transition-transform duration-700 group-hover:scale-105" /></div>
              <div className="p-8"><h3 className="font-display text-2xl font-bold">A feed from eighteen sources</h3><p className="mt-3 font-body text-base text-muted">Greenhouse to Hacker News, matched and tracked in one queue.</p></div>
            </article>
            <article className="group col-span-12 overflow-hidden rounded-[28px] border border-border bg-surface lg:col-span-4">
              <div className="overflow-hidden"><img src="https://picsum.photos/seed/folio-interview/800/520" alt="Interview" loading="lazy" className="h-48 w-full object-cover grayscale transition-transform duration-700 group-hover:scale-105" /></div>
              <div className="p-8"><h3 className="font-display text-2xl font-bold">Rehearse with voice and code</h3><p className="mt-3 font-body text-base text-muted">Live simulation, thirteen-language editor, calm debrief.</p></div>
            </article>
          </div>
        </div>
      </section>

      {/* Pinned teardown */}
      <section id="teardown" className="scroll-mt-24 border-y border-border bg-paper-light py-24 md:py-32">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 lg:grid-cols-[380px_1fr]">
          <div id="teardown-pinned" className="lg:pt-2">
            <div className="lg:sticky lg:top-24">
              <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Watch a resume get honest.</h2>
              <p className="mt-4 font-body text-lg text-muted">The same pass your file gets. Before, after, and the three keywords that close the gap.</p>
              <a href="#upload" className="mt-7 inline-block rounded-full bg-ink px-7 py-3.5 font-body text-sm font-bold text-white">Run mine now</a>
            </div>
          </div>
          <div className="space-y-5">
            {[
              { seed: 'folio-pin-1', title: 'Before: vague scope', body: '"Helped with frontend work across teams." No scale, no stack, no outcome. Scores 41.' },
              { seed: 'folio-pin-2', title: 'After: measured impact', body: '"Led checkout rewrite in React + TypeScript for 4 squads. +18% conversion, -22% errors." Scores 88.' },
              { seed: 'folio-pin-3', title: 'Keywords close the gap', body: 'Three missing terms added naturally. ATS fit moves from 58 to 84 without stuffing.' },
            ].map((frame) => (
              <figure key={frame.seed} className="grow-fade group overflow-hidden rounded-[28px] border border-border bg-surface">
                <div className="overflow-hidden"><img src={`https://picsum.photos/seed/${frame.seed}/1200/640`} alt={frame.title} loading="lazy" className="h-64 w-full object-cover grayscale transition-transform duration-700 group-hover:scale-105 md:h-80" /></div>
                <figcaption className="flex flex-col gap-2 p-7 md:flex-row md:items-center md:justify-between md:p-8">
                  <span className="font-display text-2xl font-bold">{frame.title}</span>
                  <span className="max-w-md font-body text-base text-muted">{frame.body}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Manifesto scrub */}
      <section id="manifesto" className="bg-ink py-24 md:py-32">
        <div className="mx-auto w-full max-w-5xl px-6">
          <p className="font-display text-3xl font-bold leading-snug text-white md:text-5xl">
            {manifesto.split(' ').map((word, i) => (<span key={i} className="scrub-word mr-[0.28em] inline-block opacity-10">{word}</span>))}
          </p>
        </div>
      </section>

      {/* Method accordions */}
      <section id="method" className="scroll-mt-24 bg-paper py-24 md:py-32">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 className="max-w-4xl font-display text-4xl font-extrabold tracking-tight md:text-6xl">Four moves. No maze.</h2>
          <div className="mt-12 flex flex-col gap-4 md:h-[480px] md:flex-row">
            {accordionItems.map((item, i) => {
              const active = i === activeAccordion
              return (
                <button key={item.title} onMouseEnter={() => setActiveAccordion(i)} onClick={() => setActiveAccordion(i)} className={`group relative overflow-hidden rounded-[28px] border border-border text-left transition-all duration-500 ${active ? 'md:flex-[2.4]' : 'md:flex-[1]'} min-h-64 cursor-pointer`}>
                  <img src={item.image} alt="" aria-hidden loading="lazy" className="absolute inset-0 h-full w-full object-cover grayscale contrast-125" />
                  <span className={`absolute inset-0 ${active ? 'bg-ink/55' : 'bg-ink/75'} transition-colors duration-500`} />
                  <span className="relative flex h-full flex-col justify-end p-7">
                    <span className="font-display text-3xl font-extrabold text-white">{item.title}</span>
                    <span className={`overflow-hidden font-body text-base leading-relaxed text-white/80 transition-all duration-500 ${active ? 'mt-3 max-h-40 opacity-100' : 'max-h-0 opacity-0 md:max-h-0'}`}>{item.text}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Interview theatre — plays on scroll */}
      <section id="interview" className="scroll-mt-24 border-y border-border bg-paper-light py-24 md:py-32">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="grid gap-10 lg:grid-cols-[400px_1fr] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">The interview, before it is real.</h2>
              <p className="mt-4 font-body text-lg leading-relaxed text-muted">Scroll here and the room starts. A real question, a spoken prompt, a live-coded answer and a scored follow-up.</p>
              <ul className="mt-6 space-y-2 font-mono text-xs text-muted">
                <li className="flex gap-2"><span className="text-teal">—</span> Deepgram STT + TTS with barge-in</li>
                <li className="flex gap-2"><span className="text-teal">—</span> Monaco editor, 13 languages via Piston</li>
                <li className="flex gap-2"><span className="text-teal">—</span> Company-aware, resume-grounded prompts</li>
              </ul>
              <Link to="/interview/new" className="mt-7 inline-block rounded-full bg-ink px-7 py-3.5 font-body text-sm font-bold text-white hover:bg-ink-light">Rehearse for real</Link>
            </div>
            <InterviewTheatre />
          </div>
        </div>
      </section>

      {/* Voices */}
      <section id="voices" className="scroll-mt-24 bg-paper py-24 md:py-32">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="max-w-3xl font-display text-4xl font-extrabold tracking-tight md:text-6xl">People who stopped guessing.</h2>
            <div className="flex gap-3">
              <button aria-label="Previous story" onClick={() => setVoiceIndex((v) => (v + voices.length - 1) % voices.length)} className="h-12 w-12 cursor-pointer rounded-full border border-border bg-surface font-display text-xl text-ink hover:bg-paper-light">←</button>
              <button aria-label="Next story" onClick={() => setVoiceIndex((v) => (v + 1) % voices.length)} className="h-12 w-12 cursor-pointer rounded-full bg-ink font-display text-xl text-white hover:bg-ink-light">→</button>
            </div>
          </div>
          <div className="mt-12 overflow-hidden rounded-[28px] border border-border bg-surface p-8 md:p-12">
            <AnimatePresence mode="wait">
              <motion.figure key={voice.name} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35 }} className="flex flex-col gap-8 md:flex-row md:items-center">
                <div className="flex -space-x-4">
                  {voices.map((v) => (<img key={v.name} src={v.image} alt={v.name} loading="lazy" className={`h-16 w-16 rounded-full border-4 border-surface object-cover grayscale ${v.name === voice.name ? 'z-10 scale-110' : 'opacity-70'}`} />))}
                </div>
                <div>
                  <blockquote className="max-w-3xl font-display text-2xl font-bold leading-snug md:text-4xl">{voice.quote}</blockquote>
                  <figcaption className="mt-5 font-body text-base text-muted">{voice.name} · {voice.role}</figcaption>
                </div>
              </motion.figure>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* CTA — forest */}
      <section className="relative overflow-hidden bg-ink py-24 md:py-32">
        <div className="absolute inset-0 opacity-20" aria-hidden style={{ background: 'radial-gradient(600px 400px at 30% 20%, rgba(255,255,255,0.12), transparent 60%), radial-gradient(800px 600px at 80% 100%, rgba(20,83,45,0.5), transparent 70%)' }} />
        <div className="relative mx-auto w-full max-w-6xl px-6 text-center">
          <h2 className="mx-auto w-full max-w-5xl font-display text-4xl font-extrabold tracking-tight text-white md:text-6xl">Upload your resume. The rest takes seconds.</h2>
          <p className="mx-auto mt-6 max-w-xl font-body text-lg text-white/70">Scoring, rewriting, matching and rehearsal are one upload away.</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#upload" className="w-full rounded-full bg-paper px-9 py-4 font-body text-sm font-bold text-ink hover:bg-white sm:w-auto">Start free teardown</a>
            <Link to="/signup" className="w-full rounded-full border border-white/20 px-9 py-4 font-body text-sm font-bold text-white hover:border-white/40 sm:w-auto">Create account</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-paper">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-14 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-baseline gap-1.5"><span className="font-display text-xl font-extrabold text-ink">Folio</span><span className="font-display text-2xl font-extrabold text-teal">&amp;</span></div>
            <p className="mt-3 max-w-xs font-body text-sm text-muted">Your career, fully told. Honest reviews, sharp rewrites, real interviews.</p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div className="space-y-3"><p className="font-mono text-xs font-bold tracking-widest text-muted">Product</p><a href="#capabilities" className="block font-body text-sm text-ink hover:underline">Ledger</a><a href="#teardown" className="block font-body text-sm text-ink hover:underline">Marks</a><a href="#upload" className="block font-body text-sm text-ink hover:underline">Upload</a></div>
            <div className="space-y-3"><p className="font-mono text-xs font-bold tracking-widest text-muted">Account</p><Link to="/login" className="block font-body text-sm text-ink hover:underline">Sign in</Link><Link to="/signup" className="block font-body text-sm text-ink hover:underline">Get started</Link><Link to="/dashboard" className="block font-body text-sm text-ink hover:underline">Dashboard</Link></div>
            <div className="space-y-3"><p className="font-mono text-xs font-bold tracking-widest text-muted">Legal</p><Link to="/privacy" className="block font-body text-sm text-ink hover:underline">Privacy</Link><Link to="/terms" className="block font-body text-sm text-ink hover:underline">Terms</Link></div>
          </div>
        </div>
      </footer>
    </main>
  )
}
