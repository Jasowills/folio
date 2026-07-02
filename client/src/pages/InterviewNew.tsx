import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconArrowLeft, IconArrowRight, IconBrain, IconWorld, IconLoader, IconCircleCheck } from '@tabler/icons-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useResumes } from '../lib/queries'
import { useCreateInterviewSession, useGeneratePersona } from '../lib/queries'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { showToast } from '../components/ui/toast'

type ProgressStep = 'idle' | 'creating' | 'researching' | 'generating' | 'done'

const progressSteps: { key: ProgressStep; label: string; icon: typeof IconBrain }[] = [
  { key: 'creating', label: 'Creating session...', icon: IconLoader },
  { key: 'researching', label: 'Researching company website...', icon: IconWorld },
  { key: 'generating', label: 'Generating interviewer persona...', icon: IconBrain },
  { key: 'done', label: 'Ready', icon: IconCircleCheck },
]

const steps = ['Role', 'Company', 'Stack', 'Duration', 'Review']

const LEVELS = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead / Staff' },
  { value: 'executive', label: 'Executive' },
]

const INTERVIEW_TYPES = [
  { value: 'behavioural', label: 'Behavioural' },
  { value: 'technical', label: 'Technical' },
  { value: 'system_design', label: 'System Design' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'coding', label: 'Coding' },
]

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'hard', label: 'Hard' },
]

const DURATIONS = [
  { value: '15', label: '15 min (quick)' },
  { value: '30', label: '30 min (standard)' },
  { value: '45', label: '45 min (extended)' },
  { value: '60', label: '60 min (full)' },
]

export default function InterviewNew() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data: resumes } = useResumes()
  const createSession = useCreateInterviewSession()
  const generatePersona = useGeneratePersona()

  const [step, setStep] = useState(0)
  const [role, setRole] = useState(searchParams.get('role') || '')
  const [level, setLevel] = useState('mid')
  const [interviewTypes, setInterviewTypes] = useState<string[]>([])
  const [companyName, setCompanyName] = useState(searchParams.get('company') || '')
  const [companyUrl, setCompanyUrl] = useState(searchParams.get('url') || '')
  const [techStack, setTechStack] = useState('')
  const [includesCoding, setIncludesCoding] = useState(false)
  const [difficulty, setDifficulty] = useState('mixed')
  const [plannedDuration, setPlannedDuration] = useState('30')
  const [resumeId, setResumeId] = useState('')
  const [progress, setProgress] = useState<ProgressStep>('idle')

  const toggleType = (t: string) => {
    setInterviewTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    )
  }

  const canProceed = () => {
    switch (step) {
      case 0: return role.trim().length > 0 && level.length > 0 && resumeId.length > 0
      case 1: return interviewTypes.length > 0
      case 2: return true
      case 3: return plannedDuration.length > 0
      default: return true
    }
  }

  const isCreating = progress !== 'idle'

  const handleCreate = async () => {
    setProgress('creating')
    try {
      const session = await createSession.mutateAsync({
        resumeId,
        role: role.trim(),
        level,
        interviewTypes,
        company: companyName ? { name: companyName, url: companyUrl || undefined } : undefined,
        techStack: techStack ? techStack.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        includesCoding,
        difficulty,
        plannedDuration: parseInt(plannedDuration, 10),
      })

      if (companyUrl) {
        setProgress('researching')
      }

      setProgress('generating')
      await generatePersona.mutateAsync(session._id)

      setProgress('done')
      setTimeout(() => navigate(`/interview/new/prep?sessionId=${session._id}`), 600)
    } catch {
      showToast('error', 'Failed to create interview session')
      setProgress('idle')
    }
  }

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="page-header">
          <h1 className="page-title">New Interview</h1>
          <p className="page-subtitle">Set up a realistic mock interview</p>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i <= step ? 'bg-teal text-white' : 'bg-paper-dark text-muted'
              }`}>
                {i + 1}
              </div>
              <span className={`text-xs ${i <= step ? 'text-ink' : 'text-muted'}`}>{s}</span>
              {i < steps.length - 1 && <div className={`w-6 h-px ${i < step ? 'bg-teal' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {step === 0 && (
              <>
                <h2 className="text-lg font-semibold text-ink">Target Role</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted mb-1 block">Resume</label>
                    <Select
                      value={resumeId}
                      onChange={setResumeId}
                      options={(resumes || []).map((r) => ({
                        value: r._id,
                        label: r.name || r.title || 'Untitled',
                      }))}
                      placeholder="Select a resume"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">Role Title</label>
                    <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Senior Frontend Engineer" />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">Level</label>
                    <Select value={level} onChange={setLevel} options={LEVELS} />
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="text-lg font-semibold text-ink">Company Context</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {INTERVIEW_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => toggleType(t.value)}
                        className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                          interviewTypes.includes(t.value)
                            ? 'border-teal bg-teal-light/10 text-teal'
                            : 'border-border text-ink hover:border-teal/40'
                        }`}
                      >
                        <p className="text-sm font-medium">{t.label}</p>
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">Company Name (optional)</label>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Google" />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">Company URL (optional)</label>
                    <Input value={companyUrl} onChange={(e) => setCompanyUrl(e.target.value)} placeholder="e.g. https://careers.google.com" />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-lg font-semibold text-ink">Technical Configuration</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted mb-1 block">Tech Stack (comma-separated, optional)</label>
                    <Input value={techStack} onChange={(e) => setTechStack(e.target.value)} placeholder="e.g. React, Node.js, PostgreSQL" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includesCoding}
                        onChange={(e) => setIncludesCoding(e.target.checked)}
                        className="rounded border-border"
                      />
                      <span className="text-sm text-ink">Include coding exercises</span>
                    </label>
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">Difficulty</label>
                    <Select value={difficulty} onChange={setDifficulty} options={DIFFICULTIES} />
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="text-lg font-semibold text-ink">Duration</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted mb-1 block">Planned Duration</label>
                    <Select value={plannedDuration} onChange={setPlannedDuration} options={DURATIONS} />
                  </div>
                  <p className="text-xs text-muted">You can pause up to 2 times (2 minutes total). Unused pause time rolls over.</p>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h2 className="text-lg font-semibold text-ink">Review</h2>
                <div className="bg-paper-dark rounded-lg p-4 space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted">Role</span><span className="text-ink font-medium">{role}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Level</span><span className="text-ink">{LEVELS.find((l) => l.value === level)?.label}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Types</span><span className="text-ink">{interviewTypes.map((t) => INTERVIEW_TYPES.find((x) => x.value === t)?.label).join(', ')}</span></div>
                  {companyName && <div className="flex justify-between"><span className="text-muted">Company</span><span className="text-ink">{companyName}</span></div>}
                  {techStack && <div className="flex justify-between"><span className="text-muted">Stack</span><span className="text-ink">{techStack}</span></div>}
                  <div className="flex justify-between"><span className="text-muted">Duration</span><span className="text-ink">{plannedDuration} min</span></div>
                  <div className="flex justify-between"><span className="text-muted">Coding</span><span className="text-ink">{includesCoding ? 'Yes' : 'No'}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Difficulty</span><span className="text-ink">{DIFFICULTIES.find((d) => d.value === difficulty)?.label}</span></div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-8">
          <Button variant="ghost" onClick={() => step > 0 ? setStep((s) => s - 1) : navigate(-1)} disabled={isCreating}>
            <IconArrowLeft className="w-4 h-4 mr-1" />
            {step === 0 ? 'Back' : 'Previous'}
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
              Next
              <IconArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleCreate} loading={isCreating}>
              Generate Interview
              <IconBrain className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </motion.div>

      {/* Progress overlay */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-ink rounded-xl p-10 max-w-sm w-full mx-4 space-y-8"
            >
              <div className="text-center space-y-2">
                <span className="font-display text-teal text-4xl animate-pulse block">&amp;</span>
                <h3 className="font-display text-h4 text-white">Preparing your interview</h3>
              </div>

              <div className="space-y-4">
                {progressSteps
                  .filter((s) => s.key !== 'researching' || !!companyUrl)
                  .map((s) => {
                    const stepOrder = progressSteps.filter((ps) => ps.key !== 'researching' || !!companyUrl)
                    const idx = stepOrder.indexOf(s)
                    const currentIdx = stepOrder.findIndex((ps) => ps.key === progress)
                    const state = currentIdx === -1 ? 'waiting' : idx < currentIdx ? 'done' : idx === currentIdx ? 'active' : 'waiting'
                    const Icon = s.icon
                    return (
                      <div key={s.key} className="flex items-center gap-3">
                        {state === 'done' ? (
                          <span className="h-6 w-6 rounded-full bg-teal flex items-center justify-center shrink-0">
                            <IconCircleCheck className="h-3.5 w-3.5 text-white" />
                          </span>
                        ) : state === 'active' ? (
                          <span className="h-6 w-6 rounded-full border-2 border-teal flex items-center justify-center shrink-0">
                            <Icon className="h-3 w-3 text-teal animate-spin" />
                          </span>
                        ) : (
                          <span className="h-6 w-6 rounded-full border-2 border-[#3A3A3A] flex items-center justify-center shrink-0">
                            <Icon className="h-3 w-3 text-[#3A3A3A]" />
                          </span>
                        )}
                        <span className={`text-sm ${
                          state === 'done' ? 'text-white' : state === 'active' ? 'text-teal' : 'text-white/30'
                        }`}>{s.label}</span>
                      </div>
                    )
                  })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
