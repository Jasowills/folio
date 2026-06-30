import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconArrowLeft, IconArrowRight, IconDeviceLaptop, IconCode, IconClock, IconBrain } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useResumes } from '../lib/queries'
import { useCreateInterviewSession, useGeneratePersona } from '../lib/queries'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { showToast } from '../components/ui/toast'

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
  const { user } = useAuth()
  const { data: resumes } = useResumes()
  const createSession = useCreateInterviewSession()
  const generatePersona = useGeneratePersona()

  const [step, setStep] = useState(0)
  const [role, setRole] = useState('')
  const [level, setLevel] = useState('mid')
  const [interviewTypes, setInterviewTypes] = useState<string[]>([])
  const [companyName, setCompanyName] = useState('')
  const [companyUrl, setCompanyUrl] = useState('')
  const [techStack, setTechStack] = useState('')
  const [includesCoding, setIncludesCoding] = useState(false)
  const [difficulty, setDifficulty] = useState('mixed')
  const [plannedDuration, setPlannedDuration] = useState('30')
  const [resumeId, setResumeId] = useState('')
  const [loading, setLoading] = useState(false)

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

  const handleCreate = async () => {
    setLoading(true)
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

      await generatePersona.mutateAsync(session._id)
      navigate(`/interview/new/prep?sessionId=${session._id}`)
    } catch {
      showToast('error', 'Failed to create interview session')
    } finally {
      setLoading(false)
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
                      options={(resumes || []).map((r: { _id: string; title: string }) => ({
                        value: r._id,
                        label: r.title,
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
          <Button variant="ghost" onClick={() => step > 0 ? setStep((s) => s - 1) : navigate(-1)} disabled={loading}>
            <IconArrowLeft className="w-4 h-4 mr-1" />
            {step === 0 ? 'Back' : 'Previous'}
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
              Next
              <IconArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleCreate} loading={loading}>
              Generate Interview
              <IconBrain className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
