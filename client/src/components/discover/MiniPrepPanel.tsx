import { ScoreRing } from '../ScoreRing'
import { IconX } from '@tabler/icons-react'

interface MiniPrepPanelProps {
  job: any
  match: any
  onClose: () => void
}

export default function MiniPrepPanel({ job, match, onClose }: MiniPrepPanelProps) {
  const matchedKeywords = match?.matchedKeywords || []
  const missingKeywords = match?.missingKeywords || []
  const sectionScores = match?.sectionScores || {}

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-lg bg-surface rounded-t-xl sm:rounded-xl shadow-modal max-h-[80vh] overflow-y-auto animate-float-up">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-medium text-ink">{job.roleTitle}</h3>
            <p className="text-xs text-muted">{job.companyName}</p>
          </div>
          <button onClick={onClose} className="p-1 text-muted hover:text-ink transition-colors">
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* ATS Score detail */}
          {match && (
            <div>
              <h4 className="label-uppercase text-muted mb-2">ATS Score Breakdown</h4>
              <div className="flex items-center gap-4 mb-3">
                <ScoreRing score={match.atsScore} size={64} strokeWidth={5} scoreClassName="font-display font-bold text-sm" />
                <div className="flex-1 space-y-1.5">
                  {Object.entries(sectionScores).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-muted w-20 capitalize">{key}</span>
                      <div className="flex-1 h-1.5 bg-border-light rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal transition-all"
                          style={{ width: `${val}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-ink w-6 text-right">{Math.round(val as number)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {matchedKeywords.slice(0, 10).map((kw: string) => (
                  <span key={kw} className="badge badge-success text-[10px]">{kw}</span>
                ))}
                {missingKeywords.slice(0, 10).map((kw: string) => (
                  <span key={kw} className="badge badge-danger text-[10px]">{kw}</span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            <p className="label-uppercase text-muted mb-1">Preparation</p>
            <button className="w-full px-4 py-2.5 text-sm font-medium bg-teal-light text-teal rounded-lg hover:bg-teal hover:text-white transition-colors text-left">
              Generate cover letter for {job.companyName}
            </button>
            <button className="w-full px-4 py-2.5 text-sm font-medium text-ink border border-border rounded-lg hover:bg-paper-dark transition-colors text-left">
              Practice interview for this role
            </button>
            <button className="w-full px-4 py-2.5 text-sm font-medium text-ink border border-border rounded-lg hover:bg-paper-dark transition-colors text-left">
              Research {job.companyName}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
