import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAutoApplySubmission, useConfirmSubmission } from '../lib/queries'

export default function ApplyReview() {
  const { submissionId } = useParams<{ submissionId: string }>()
  const navigate = useNavigate()
  const { data: submission, isLoading } = useAutoApplySubmission(submissionId)
  const confirm = useConfirmSubmission()
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-sm text-muted">Loading preview...</p>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted">Submission not found</p>
          <button onClick={() => navigate('/auto-apply')} className="text-sm text-teal hover:underline mt-2">
            Back to Auto-Apply
          </button>
        </div>
      </div>
    )
  }

  const job = typeof submission.jobListingId === 'object' ? submission.jobListingId : null
  const fields = submission.filledFields || []

  const handleSubmit = () => {
    const updatedFields = Object.entries(edits)
      .filter(([, value]) => value)
      .map(([fieldName, fieldValue]) => ({ fieldName, fieldValue }))

    confirm.mutate(
      { submissionId: submission._id, updatedFields: updatedFields.length > 0 ? updatedFields : undefined },
      {
        onSuccess: () => {
          navigate('/auto-apply')
        },
      },
    )
  }

  const getValue = (field: { fieldName: string; fieldValue: string }) => {
    if (field.fieldName in edits) return edits[field.fieldName]
    return field.fieldValue
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/auto-apply')}
          className="text-sm text-muted hover:text-ink transition-colors mb-6 flex items-center gap-1"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Auto-Apply
        </button>

        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-display text-h3 text-ink">{job?.roleTitle || 'Role'}</h1>
              <p className="text-sm text-muted">{job?.companyName || 'Company'}</p>
            </div>
            <span className="text-[11px] font-medium text-muted bg-paper px-2 py-1 rounded-full capitalize border border-border">
              {submission.atsPlatform}
            </span>
          </div>

          <div className="space-y-0 divide-y divide-border">
            {fields.map((field) => {
              const isEditing = editing === field.fieldName
              const value = getValue(field)
              return (
                <div key={field.fieldName} className="py-3 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
                      {field.fieldName.replace(/_/g, ' ')}
                    </p>
                    {isEditing ? (
                      <textarea
                        value={value}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [field.fieldName]: e.target.value }))}
                        onBlur={() => setEditing(null)}
                        autoFocus
                        className="w-full text-sm text-ink bg-paper border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 resize-y min-h-[60px]"
                      />
                    ) : (
                      <p
                        className="text-sm text-ink break-words cursor-pointer hover:bg-paper-dark/30 rounded px-1 -mx-1 transition-colors"
                        onClick={() => { setEditing(field.fieldName); setEdits((prev) => ({ ...prev, [field.fieldName]: prev[field.fieldName] ?? field.fieldValue })) }}
                      >
                        {value || <span className="text-muted italic">Empty</span>}
                      </p>
                    )}
                  </div>
                  {field.autoFilled && !isEditing && (
                    <span className="text-[10px] text-teal font-medium whitespace-nowrap mt-1">Auto-filled</span>
                  )}
                  {isEditing && (
                    <button
                      onClick={() => setEditing(null)}
                      className="text-[10px] text-teal font-medium whitespace-nowrap mt-1 hover:underline"
                    >
                      Done
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {fields.length === 0 && (
            <p className="text-sm text-muted text-center py-8">No fields were auto-filled for this application.</p>
          )}
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="font-display text-h4 text-ink mb-3">Activity Log</h2>
          <div className="space-y-2">
            {(submission.activityLog || []).map((entry, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-[11px] text-muted whitespace-nowrap mt-0.5">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-ink">{entry.action}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-8">
          <button
            onClick={handleSubmit}
            disabled={confirm.isPending}
            className="flex-1 px-6 py-3 bg-teal text-white text-sm font-semibold rounded-xl hover:bg-teal-dark disabled:opacity-50 transition-all"
          >
            {confirm.isPending ? 'Submitting...' : 'Confirm & Submit Application'}
          </button>
          <button
            onClick={() => navigate('/auto-apply')}
            className="px-6 py-3 border border-border text-muted text-sm font-medium rounded-xl hover:bg-paper-dark/50 transition-all"
          >
            Cancel
          </button>
        </div>

        {confirm.isError && (
          <p className="text-sm text-danger mt-3">{(confirm.error as Error).message}</p>
        )}
      </div>
    </div>
  )
}
