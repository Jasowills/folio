import type { BuilderStepData } from '../types'

interface Props {
  stepData: BuilderStepData
  onFinish: () => void
}

function computeATSScore(sd: BuilderStepData): number {
  let score = 0
  const b = sd.basics
  if (b?.name) score += 5
  if (b?.headline) score += 5
  if (b?.email) score += 5
  if (b?.phone) score += 5

  const tr = sd.targetRole
  if (tr?.role) score += 8
  if (tr?.level) score += 4
  if (tr?.industry) score += 4
  if (tr?.jobDescription) score += 4

  if (sd.summary?.text) {
    const words = sd.summary.text.split(/\s+/).length
    score += Math.min(words / 5, 15)
  }

  score += Math.min(sd.experience.length * 5, 15)
  if (sd.experience.some(e => e.bullets.length >= 3)) score += 5

  score += Math.min(sd.education.length * 5, 10)

  score += Math.min(sd.skills.length * 2, 15)

  if (sd.optional?.certifications && sd.optional.certificationsData.length > 0) score += 3
  if (sd.optional?.languages && sd.optional.languagesData.length > 0) score += 3
  if (sd.optional?.projects) score += 2
  if (sd.optional?.volunteer) score += 2

  return Math.min(Math.round(score), 100)
}

export default function Step8Review({ stepData, onFinish }: Props) {
  const basics = stepData.basics
  const summary = stepData.summary
  const expCount = stepData.experience.length
  const eduCount = stepData.education.length
  const skillCount = stepData.skills.length
  const optional = stepData.optional
  const atsScore = computeATSScore(stepData)

  const optionalCount = [
    optional?.certifications ? 'Certifications' : null,
    optional?.languages ? 'Languages' : null,
    optional?.projects ? 'Projects' : null,
    optional?.volunteer ? 'Volunteer' : null,
    optional?.awards ? 'Awards' : null,
  ].filter(Boolean).length

  return (
    <div className="p-6 space-y-5">
      <div className="text-center mb-2">
        <span className="font-display text-[22px] text-ink">{basics?.name || 'Your Name'}</span>
        {basics?.headline && <p className="text-[12px] text-muted mt-0.5">{basics.headline}</p>}
      </div>

      <div className="space-y-3">
        <SummaryRow label="Summary" value={summary ? summary.text.slice(0, 100) + '...' : 'Not written yet'} />
        <SummaryRow label="Experience" value={`${expCount} role${expCount !== 1 ? 's' : ''}`} />
        <SummaryRow label="Education" value={`${eduCount} entr${eduCount !== 1 ? 'ies' : 'y'}`} />
        <SummaryRow label="Skills" value={`${skillCount} skill${skillCount !== 1 ? 's' : ''}`} />
        {optionalCount > 0 && <SummaryRow label="Optional sections" value={`${optionalCount} added`} />}
      </div>

      {stepData.targetRole?.jobDescription && (
        <div className="p-3 bg-amber/5 border border-amber/20 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center">
              <span className="text-[11px] font-bold text-teal">{atsScore}%</span>
            </div>
            <span className="text-[12px] font-medium text-ink">ATS Match Score</span>
          </div>
          <p className="text-[11px] text-muted">Your resume scores {atsScore}% for {stepData.targetRole.role}.</p>
        </div>
      )}

      <div className="space-y-2 pt-2">
        <button
          onClick={onFinish}
          className="w-full py-2.5 text-[13px] font-medium text-white bg-teal hover:bg-teal-dark rounded-lg transition-colors"
        >
          I&apos;m done — take me to my resume
        </button>
        <button className="w-full py-2 text-[12px] text-ink bg-white border border-border rounded-lg hover:bg-paper-dark transition-colors">
          Download PDF now
        </button>
        <button className="w-full text-center text-[11px] text-teal hover:underline transition-colors">
          Run ATS check for a specific job
        </button>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[11px] text-muted">{label}</span>
      <span className="text-[11px] text-ink font-medium">{value}</span>
    </div>
  )
}
