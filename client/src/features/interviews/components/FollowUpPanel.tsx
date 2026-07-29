import { useState } from 'react'
import { useFollowUps, useGenerateFollowUp, useUpdateFollowUp } from '../../../lib/queries'
import type { FollowUp } from '../../../lib/queries'

interface Props {
  sessionId: string
}

export default function FollowUpPanel({ sessionId }: Props) {
  const { data: followUps, isLoading } = useFollowUps(sessionId)
  const generateDraft = useGenerateFollowUp()
  const updateFollowUp = useUpdateFollowUp()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const active = followUps?.[0]

  const handleGenerate = async () => {
    await generateDraft.mutateAsync(sessionId)
  }

  const handleMarkSent = async (f: FollowUp) => {
    await updateFollowUp.mutateAsync({
      id: f._id,
      status: 'sent',
      sentContent: f.draftContent,
    })
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    await updateFollowUp.mutateAsync({ id: editingId, draftContent: editContent })
    setEditingId(null)
  }

  if (isLoading) {
    return <div className="text-xs text-muted">Loading follow-up...</div>
  }

  if (!active || active.status === 'sent' || active.status === 'replied') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Follow-Up</h3>
          <button
            onClick={handleGenerate}
            className="text-xs bg-ink text-paper px-3 py-1.5 rounded-lg hover:opacity-80"
          >
            Generate Draft
          </button>
        </div>
        {active?.status === 'sent' && (
          <p className="text-xs text-success">Sent {active.sentAt ? new Date(active.sentAt).toLocaleDateString() : ''}</p>
        )}
        {active?.status === 'replied' && (
          <p className="text-xs text-success">Replied {active.repliedAt ? new Date(active.repliedAt).toLocaleDateString() : ''}</p>
        )}
        {(!active || active.status === 'draft') && (
          <p className="text-xs text-muted italic">No follow-up generated yet.</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Follow-Up</h3>
        <span className={`text-[11px] px-2 py-0.5 rounded-full ${active.status === 'sent' ? 'bg-success-light text-success' : active.status === 'edited' ? 'bg-warning-light text-warning' : 'bg-muted/10 text-muted'}`}>
          {active.status}
        </span>
      </div>

      {active.recipientName && (
        <p className="text-xs text-muted">To: {active.recipientName}{active.companyName ? `, ${active.companyName}` : ''}</p>
      )}

      <div className="text-xs text-ink whitespace-pre-wrap bg-muted/5 p-3 rounded-lg max-h-48 overflow-y-auto">
        {editingId === active._id ? (
          <textarea
            className="w-full bg-paper border border-muted/20 rounded p-2 text-xs resize-none min-h-[120px]"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
          />
        ) : (
          active.draftContent
        )}
      </div>

      <div className="flex gap-2">
        {editingId === active._id ? (
          <>
            <button
              onClick={handleSaveEdit}
              className="text-xs bg-ink text-paper px-3 py-1.5 rounded-lg hover:opacity-80"
            >
              Save
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="text-xs border border-muted/20 px-3 py-1.5 rounded-lg hover:bg-muted/5"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => { setEditingId(active._id); setEditContent(active.draftContent || '') }}
              className="text-xs border border-muted/20 px-3 py-1.5 rounded-lg hover:bg-muted/5"
            >
              Edit
            </button>
            <button
              onClick={() => handleMarkSent(active)}
              className="text-xs bg-success text-paper px-3 py-1.5 rounded-lg hover:opacity-80"
            >
              Mark Sent
            </button>
          </>
        )}
      </div>
    </div>
  )
}
