import { useState } from 'react'
import { ScoreRing } from '../ScoreRing'
import { useUpdateTrackerJob, useTrackerStats } from '../../lib/queries'
import { IconX, IconExternalLink } from '@tabler/icons-react'

interface JobDetailDrawerProps {
  app: any
  onClose: () => void
}

const STAGE_OPTIONS = [
  'saved', 'tailoring', 'applied', 'phone_screen',
  'technical', 'final_round', 'offer', 'accepted',
  'rejected', 'ghosted',
]

export default function JobDetailDrawer({ app, onClose }: JobDetailDrawerProps) {
  const job = app.jobListing || {}
  const match = app.match
  const updateJob = useUpdateTrackerJob()
  const { data: stats } = useTrackerStats()
  const [stage, setStage] = useState(app.stage || 'saved')
  const [notes, setNotes] = useState(app.notes || '')
  const [checklist, setChecklist] = useState(app.checklistState || {})
  const [showAtsDetail, setShowAtsDetail] = useState(false)

  const score = match?.atsScore ?? 0
  const checklistItems = Object.entries(checklist) as [string, boolean][]
  const doneCount = checklistItems.filter(([_, v]) => v).length
  const totalItems = checklistItems.length

  const handleStageChange = (newStage: string) => {
    setStage(newStage)
    updateJob.mutate({ id: app._id, stage: newStage })
  }

  const handleChecklistToggle = (key: string, value: boolean) => {
    const updated = { ...checklist, [key]: value }
    setChecklist(updated)
    updateJob.mutate({ id: app._id, checklistState: updated })
  }

  const handleNotesSave = () => {
    updateJob.mutate({ id: app._id, notes })
  }

  const activityLog = app.activityLog || []

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex justify-end">
      <div className="w-full max-w-[480px] bg-surface h-full shadow-modal overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border z-10">
          <div className="flex items-center justify-between p-4">
            <button onClick={onClose} className="p-1 text-muted hover:text-ink transition-colors">
              <IconX className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <select
                value={stage}
                onChange={(e) => handleStageChange(e.target.value)}
                className="text-xs font-medium bg-paper rounded-lg px-2 py-1 border border-border"
              >
                {STAGE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="px-4 pb-4 flex items-start gap-3">
            <ScoreRing score={score} size={56} strokeWidth={5} scoreClassName="font-display font-bold" />
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-h4 text-ink truncate">{job.roleTitle || 'Unknown'}</h2>
              <p className="text-sm text-muted">{job.companyName || 'Unknown'}</p>
              <div className="flex items-center gap-2 mt-1">
                {job.applicationUrl && (
                  <a
                    href={job.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal hover:underline flex items-center gap-1"
                  >
                    <IconExternalLink className="h-3 w-3" />
                    View original posting
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* Apply button */}
          {stage === 'saved' || stage === 'tailoring' ? (
            <button className="w-full py-2.5 text-sm font-medium bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors">
              Apply now
            </button>
          ) : stage === 'applied' && (
            <span className="block text-xs text-success font-medium">Applied {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : ''}</span>
          )}

          {/* Preparation checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="label-uppercase text-muted">Preparation Checklist</h3>
              <span className="text-xs text-muted">{doneCount}/{totalItems}</span>
            </div>
            <div className="h-1.5 bg-border-light rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-teal transition-all"
                style={{ width: `${totalItems > 0 ? (doneCount / totalItems) * 100 : 0}%` }}
              />
            </div>
            <div className="space-y-1.5">
              <ChecklistItem
                label="Rewrite your resume for this role"
                checked={checklist.resumeTailored}
                onToggle={(v) => handleChecklistToggle('resumeTailored', v)}
              />
              {match?.missingKeywords?.slice(0, 3).map((kw: string) => (
                <ChecklistItem
                  key={kw}
                  label={`Add "${kw}" to your skills section`}
                  checked={false}
                  onToggle={() => {}}
                />
              ))}
              <ChecklistItem
                label={`Write a cover letter for ${job.companyName || 'this company'}`}
                checked={checklist.coverLetterGenerated}
                onToggle={(v) => handleChecklistToggle('coverLetterGenerated', v)}
              />
              <ChecklistItem
                label={`Research ${job.companyName || 'this company'}`}
                checked={checklist.companyResearched}
                onToggle={(v) => handleChecklistToggle('companyResearched', v)}
              />
              <ChecklistItem
                label={`Practice interview for this role`}
                checked={checklist.interviewPracticed}
                onToggle={(v) => handleChecklistToggle('interviewPracticed', v)}
              />
              {stage === 'applied' && (
                <ChecklistItem
                  label={`Follow up on your application`}
                  checked={checklist.followUpSent}
                  onToggle={(v) => handleChecklistToggle('followUpSent', v)}
                />
              )}
            </div>
          </div>

          {/* ATS Breakdown */}
          {match && (
            <div>
              <button
                onClick={() => setShowAtsDetail(!showAtsDetail)}
                className="flex items-center justify-between w-full"
              >
                <h3 className="label-uppercase text-muted">ATS Breakdown</h3>
                <span className="text-xs text-muted">{showAtsDetail ? '▲' : '▼'}</span>
              </button>
              {showAtsDetail && (
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(match.matchedKeywords || []).slice(0, 15).map((kw: string) => (
                      <span key={kw} className="badge badge-success text-[10px]">{kw}</span>
                    ))}
                    {(match.missingKeywords || []).slice(0, 15).map((kw: string) => (
                      <span key={kw} className="badge badge-danger text-[10px]">{kw}</span>
                    ))}
                  </div>
                  <button className="text-xs text-teal hover:underline">Re-run ATS check</button>
                </div>
              )}
            </div>
          )}

          {/* Activity log */}
          {activityLog.length > 0 && (
            <div>
              <h3 className="label-uppercase text-muted mb-2">Activity</h3>
              <div className="space-y-2">
                {activityLog.slice().reverse().map((entry: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <div className="h-1.5 w-1.5 rounded-full bg-teal mt-1.5 shrink-0" />
                    <div>
                      <p className="text-ink">{entry.action}</p>
                      <p className="text-muted">{new Date(entry.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <h3 className="label-uppercase text-muted mb-2">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesSave}
              placeholder="Recruiter name, things to mention, compensation notes..."
              className="input-field text-sm"
              rows={4}
            />
          </div>

          {/* Salary intelligence */}
          {job.extractedFields?.salaryMin && (
            <div>
              <h3 className="label-uppercase text-muted mb-2">Salary</h3>
              <p className="text-sm font-semibold text-amber">
                {formatSalary(job.extractedFields.salaryMin, job.extractedFields.salaryMax, job.extractedFields.salaryCurrency)}
              </p>
              {stats && stats.averageMatchScore > 0 && (
                <p className="text-xs text-muted mt-1">
                  Across your tracked roles, the average match score is {stats.averageMatchScore}%.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ChecklistItem({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-0.5 accent-teal"
      />
      <span className={`text-xs ${checked ? 'text-muted line-through' : 'text-ink'}`}>
        {label}
      </span>
    </label>
  )
}

function formatSalary(min: number, max: number | null, _currency: string | null): string {
  const fmt = (n: number) => {
    if (n >= 1000) return `$${Math.round(n / 1000)}K`
    return `$${n}`
  }
  if (max) return `${fmt(min)}–${fmt(max)}`
  return `${fmt(min)}+`
}
