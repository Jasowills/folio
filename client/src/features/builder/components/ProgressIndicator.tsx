import { STEP_LABELS, STEP_ESTIMATED_MINUTES } from '../types'

interface Props {
  currentStep: number
  completedSteps: number[]
}

export default function ProgressIndicator({ currentStep, completedSteps }: Props) {
  const total = 8
  const progress = (completedSteps.length / total) * 100

  const remainingMinutes = Object.entries(STEP_ESTIMATED_MINUTES)
    .filter(([step]) => {
      const n = Number(step)
      return n > currentStep || (n === currentStep && !completedSteps.includes(n))
    })
    .reduce((sum, [, mins]) => sum + mins, 0)

  return (
    <div className="px-6 py-4 border-b border-border">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-display text-teal text-lg">&amp;</span>
        <span className="text-[13px] font-medium text-ink">Folio</span>
      </div>
      <div className="w-full h-[3px] bg-border/40 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-teal rounded-full"
          style={{ transition: 'width 400ms ease-out' }}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted">
          Step {currentStep} of {total}
          {currentStep <= total && ` \u2014 ${STEP_LABELS[currentStep] || ''}`}
        </span>
        <span className="text-[10px] text-muted/60">
          About {remainingMinutes}m remaining
        </span>
      </div>
    </div>
  )
}
