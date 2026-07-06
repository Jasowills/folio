import { useState, useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { IconShieldLock, IconFileDescription } from '@tabler/icons-react'
import { UploadZone } from '../components/UploadZone'
import ThreeBackground from '../components/ThreeBackground'
import FloatingElements from '../components/FloatingElements'
import { useGuestUploadResume } from '../lib/queries'
import { useAuth } from '../hooks/useAuth'
import SocialProofStrip from '../components/landing/SocialProofStrip'
import AtsScorerSection from '../components/landing/AtsScorerSection'
import ResumeEditorSection from '../components/landing/ResumeEditorSection'
import CoverLetterSection from '../components/landing/CoverLetterSection'
import JobDiscoverSection from '../components/landing/JobDiscoverSection'
import InterviewPrepSection from '../components/landing/InterviewPrepSection'
import PortfolioSection from '../components/landing/PortfolioSection'
import HowItWorksSection from '../components/landing/HowItWorksSection'
import ComparisonTable from '../components/landing/ComparisonTable'
import FinalCtaSection from '../components/landing/FinalCtaSection'
import Footer from '../components/landing/Footer'

const statusSteps = [
  'File received and parsed',
  'Extracting your experience',
  'Checking ATS keywords',
  'Scoring each section',
  'Detecting red flags',
  'Preparing your review',
]

const headlines = [
  { stable: 'Your resume,\nhonestly ', typewriter: 'reviewed.' },
  { stable: 'Your resume,\nbrutally ', typewriter: 'honest.' },
  { stable: 'Your resume.\nNo ', typewriter: 'filter.' },
  { stable: 'Your resume,\n', typewriter: 'dissected.' },
]

function HeroHeadline() {
  const [selected] = useState(() => headlines[Math.floor(Math.random() * headlines.length)])
  const [typedChars, setTypedChars] = useState(0)

  useEffect(() => {
    if (typedChars < selected.typewriter.length) {
      const timer = setTimeout(() => setTypedChars((c) => c + 1), 40)
      return () => clearTimeout(timer)
    }
  }, [typedChars, selected.typewriter.length])

  const parts = selected.stable.split('\n')

  return (
    <h1 className="font-display text-display text-ink leading-[1.05] tracking-[-0.02em] text-[clamp(2.5rem,8vw,88px)] sm:text-display">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <br />}
        </span>
      ))}
      <span>{selected.typewriter.slice(0, typedChars)}</span>
      {typedChars < selected.typewriter.length && (
        <span className="inline-block w-[3px] h-[0.9em] bg-amber ml-[2px] animate-pulse align-middle" />
      )}
    </h1>
  )
}

function LoadingScreen({
  currentStep,
  progress,
}: {
  currentStep: number
  progress: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-paper"
    >
      <ThreeBackground />
      <FloatingElements />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6">
        <span
          className="font-display text-teal text-[100px] leading-none block text-center"
          style={{ animation: 'blink 1.5s ease-in-out infinite' }}
        >
          &amp;
        </span>

        <p className="font-display text-h4 text-ink mt-6 mb-8 text-center">
          {statusSteps[currentStep] || 'Preparing your review...'}
        </p>

        <div className="w-full space-y-3">
          {statusSteps.map((step, i) => {
            const isDone = i < currentStep
            const isCurrent = i === currentStep
            return (
              <div key={step} className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full shrink-0 ${
                  isDone ? 'bg-teal' : isCurrent ? 'bg-teal' : 'bg-border'
                }`}
                  style={isCurrent ? { animation: 'pulse-soft 1s ease-in-out infinite' } : {}}
                />
                <span className={`text-sm transition-colors ${
                  isDone ? 'text-teal' : isCurrent ? 'text-ink font-medium' : 'text-muted'
                }`}>
                  {step}
                </span>
              </div>
            )
          })}
        </div>

        <div className="w-full mt-8">
          <div className="h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-teal rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(progress, 95)}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-muted mt-3">This takes about 30–60 seconds</p>
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
  const mountedRef = useRef(true)
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  const handleFile = useCallback(async (file: File) => {
    if (user) {
      navigate('/dashboard')
      return
    }

    setPhase('processing')
    setCurrentStep(0)
    setProgress(0)

    intervalsRef.current.forEach(clearInterval)
    intervalsRef.current = []

    const stepInterval = setInterval(() => {
      setCurrentStep((s) => {
        if (s >= statusSteps.length - 1) {
          clearInterval(stepInterval)
          return s
        }
        return s + 1
      })
    }, 2200)

    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 92) {
          clearInterval(progressInterval)
          return 92
        }
        return p + Math.random() * 8
      })
    }, 400)

    intervalsRef.current = [stepInterval, progressInterval]

    try {
      const result = await Promise.race([
        guestUpload.mutateAsync(file),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('The upload is taking longer than expected. Check your file and try again.')), 120_000)
        ),
      ])
      intervalsRef.current.forEach(clearInterval)
      intervalsRef.current = []

      if (!mountedRef.current) return
      setProgress(100)

      const navTimeout = setTimeout(() => {
        if (mountedRef.current && result.token) {
          navigate(`/review/${result.token}`, { replace: true })
        }
      }, 400)
      return () => clearTimeout(navTimeout)
    } catch (e: any) {
      intervalsRef.current.forEach(clearInterval)
      intervalsRef.current = []
      if (!mountedRef.current) return
      const msg = e?.response?.data?.message || e?.message || 'Could not process that file. Try again.'
      setErrorMsg(msg)
      setPhase('error')
    }
  }, [user, navigate, guestUpload])

  return (
    <>
      <AnimatePresence mode="wait">
      {phase === 'processing' ? (
        <LoadingScreen key="loading" currentStep={currentStep} progress={progress} />
      ) : phase === 'error' ? (
        <motion.div
          key="error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen bg-paper flex flex-col items-center justify-center px-6"
        >
          <span className="font-display text-teal text-6xl mb-6">&amp;</span>
          <h2 className="font-display text-h3 text-ink text-center mb-2">Could not analyse that file</h2>
          <p className="text-sm text-muted text-center max-w-md mb-6">{errorMsg}</p>
          <button
            onClick={() => { setPhase('drop'); setErrorMsg('') }}
            className="text-xs font-medium text-white bg-teal px-5 py-2 rounded-md hover:bg-teal-dark transition-colors cursor-pointer"
          >
            Try another file
          </button>
        </motion.div>
      ) : phase === 'drop' && !user ? (
        <motion.div
          key="home"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen bg-paper relative overflow-hidden"
        >
          <ThreeBackground />
          <FloatingElements />

          {/* Top bar */}
          <header className="fixed top-0 left-0 right-0 z-20 bg-paper/90 backdrop-blur-sm border-b border-border">
            <div className="max-w-5xl mx-auto flex items-center justify-between px-8 h-14">
              <div className="flex items-center gap-2">
                <span className="font-display text-ink text-lg font-bold">Folio</span>
                <span className="font-display text-teal text-2xl font-bold">&amp;</span>
              </div>
              <div className="flex items-center gap-3 sm:gap-6">
                <Link to="/login" className="text-xs text-muted hover:text-ink transition-colors">Sign in</Link>
                <Link to="/login">
                  <button className="text-xs font-medium text-white bg-teal px-4 py-2 rounded-md hover:bg-teal-dark transition-colors">
                    Get started
                  </button>
                </Link>
              </div>
            </div>
          </header>

          {/* Ghost & watermark */}
          <span className="font-display text-ink text-[400px] font-bold absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none select-none leading-none z-0">
            &amp;
          </span>

          {/* Hero */}
          <div className="min-h-screen flex flex-col items-center justify-center px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-center max-w-2xl"
            >
              <span className="label-uppercase text-teal mb-5 block tracking-[0.15em]">
                ATS scores, AI rewrites, job matches
              </span>
              <HeroHeadline />
              <p className="font-body text-body-lg text-muted mt-4 max-w-lg mx-auto leading-relaxed">
                Drop your resume. See what recruiters and ATS systems see in under 30 seconds. No account needed.
              </p>
            </motion.div>

            <motion.div
              id="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mt-8 w-full max-w-lg scroll-mt-24"
            >
              <UploadZone onFile={handleFile} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 mt-8"
            >
              {['ATS Score', null, 'Bullet Rewriter', null, 'Cover Letter', null, 'Portfolio Check'].map((item, i) =>
                item === null ? (
                  <span key={`sep-${i}`} className="font-display text-border text-sm hidden sm:inline">&amp;</span>
                ) : (
                  <span key={item} className="label-uppercase text-muted-light text-[10px]">{item}</span>
                )
              )}
            </motion.div>
          </div>

          {/* Landing page sections (visible when hero is shown) */}
          <SocialProofStrip />
          <AtsScorerSection />
          <ResumeEditorSection />
          <CoverLetterSection />
          <JobDiscoverSection />
          <InterviewPrepSection />
          <PortfolioSection />
          <HowItWorksSection />
          <ComparisonTable />
          <FinalCtaSection />
          <Footer />
        </motion.div>
      ) : null}
    </AnimatePresence>
  </>
  )
}
