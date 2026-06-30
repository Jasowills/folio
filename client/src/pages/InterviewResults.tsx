import { motion } from 'framer-motion'
import { IconChartBar, IconCheck, IconArrowRight, IconBrain, IconTarget, IconStar } from '@tabler/icons-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useInterviewResults } from '../lib/queries'
import { Button } from '../components/ui/button'

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = size * 0.4
  const circumference = 2 * Math.PI * r
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? 'stroke-teal' : score >= 60 ? 'stroke-amber-400' : 'stroke-danger'

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={size * 0.08} className="stroke-paper-dark" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={size * 0.08} className={color} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" className="fill-ink font-semibold text-2xl" transform="rotate(90, 12, 12)">{score}</text>
    </svg>
  )
}

export default function InterviewResults() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useInterviewResults(sessionId)

  if (isLoading || !data) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <span className="font-display text-teal text-4xl animate-pulse">&amp;</span>
      </div>
    )
  }

  const { session, transcript, proctoring, results } = data

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto space-y-8"
      >
        <div className="page-header">
          <h1 className="page-title">Interview Complete</h1>
          <p className="page-subtitle">{session.role} — {Math.round((session.actualDuration || 0) / 60)} min</p>
        </div>

        {results && (
          <>
            {/* Overall Score */}
            <div className="flex flex-col items-center py-8">
              <ScoreRing score={results.overallScore} />
              {results.headline && (
                <p className="text-lg text-ink mt-4 text-center font-medium">{results.headline}</p>
              )}
            </div>

            {/* Dimension Scores */}
            {results.dimensionScores && results.dimensionScores.length > 0 && (
              <div className="bg-paper-dark rounded-lg p-6 space-y-4">
                <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                  <IconChartBar className="w-4 h-4 text-teal" />
                  Dimension Scores
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {results.dimensionScores.map((d) => (
                    <div key={d.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted capitalize">{d.name.replace(/_/g, ' ')}</span>
                        <span className="text-ink font-medium">{d.score}</span>
                      </div>
                      <div className="h-1.5 bg-white rounded-full overflow-hidden">
                        <div className="h-full bg-teal rounded-full transition-all duration-500"
                          style={{ width: `${d.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confidence Level */}
            {results.confidenceLevel && (
              <div className="bg-paper-dark rounded-lg p-6 space-y-2">
                <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                  <IconTarget className="w-4 h-4 text-teal" />
                  Confidence Level
                </h2>
                <p className="text-lg text-ink capitalize">{results.confidenceLevel}</p>
              </div>
            )}

            {/* Next Steps */}
            {results.nextSteps && results.nextSteps.length > 0 && (
              <div className="bg-paper-dark rounded-lg p-6 space-y-3">
                <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                  <IconStar className="w-4 h-4 text-teal" />
                  Next Steps
                </h2>
                <ul className="space-y-2">
                  {results.nextSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink">
                      <IconCheck className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* Transcript */}
        {transcript && transcript.turns && transcript.turns.length > 0 && (
          <div className="bg-paper-dark rounded-lg p-6 space-y-4">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <IconBrain className="w-4 h-4 text-teal" />
              Transcript
            </h2>
            <div className="max-h-80 overflow-y-auto space-y-3">
              {transcript.turns.map((t, i) => (
                <div key={i} className={`flex ${t.speaker === 'interviewer' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                    t.speaker === 'interviewer'
                      ? 'bg-teal-light/10 text-ink'
                      : 'bg-teal text-white'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs opacity-60">
                        {t.speaker === 'interviewer' ? 'Interviewer' : 'You'}
                      </span>
                      {t.duration > 0 && <span className="text-xs opacity-40">{t.duration}s</span>}
                    </div>
                    {t.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Proctoring */}
        {proctoring && proctoring.integrityScore !== undefined && (
          <div className="bg-paper-dark rounded-lg p-6 space-y-3">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <IconTarget className="w-4 h-4 text-teal" />
              Session Integrity
            </h2>
            <div className="flex items-center gap-4">
              <div className="text-2xl font-semibold text-ink">{proctoring.integrityScore}</div>
              <div className="text-sm text-muted">{proctoring.summary || 'No issues detected.'}</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-4 pt-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
          <Button onClick={() => navigate('/interview/new')}>
            Take Another Interview
            <IconArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
