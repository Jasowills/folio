import { useState } from 'react'
import { useTracker, useTrackerStats } from '../../lib/queries'
import TrackerAnalyticsStrip from './TrackerAnalyticsStrip'
import TrackerPipeline from './TrackerPipeline'
import JobDetailDrawer from './JobDetailDrawer'
import AddJobModal from './AddJobModal'
import { IconPlus } from '@tabler/icons-react'

const PIPELINE_STAGES = [
  { key: 'saved', label: 'Saved' },
  { key: 'tailoring', label: 'Tailoring' },
  { key: 'approved', label: 'Approved' },
  { key: 'filling', label: 'Filling' },
  { key: 'ready_for_review', label: 'Ready' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'failed', label: 'Failed' },
  { key: 'applied', label: 'Applied' },
  { key: 'phone_screen', label: 'Phone Screen' },
  { key: 'technical', label: 'Technical' },
  { key: 'final_round', label: 'Final Round' },
  { key: 'offer', label: 'Offer' },
  { key: 'accepted', label: 'Accepted' },
]

const TERMINAL_STAGES = [
  { key: 'rejected', label: 'Rejected' },
  { key: 'ghosted', label: 'Ghosted' },
]

export default function DiscoverTracker() {
  const { data: apps, isLoading } = useTracker()
  const { data: stats } = useTrackerStats()
  const [selectedApp, setSelectedApp] = useState<any>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const groupedByStage: Record<string, any[]> = {}
  for (const app of apps || []) {
    const stage = app.stage || 'saved'
    if (!groupedByStage[stage]) groupedByStage[stage] = []
    groupedByStage[stage].push(app)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-h2 text-ink">Tracker</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 text-sm font-medium bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors flex items-center gap-1.5"
        >
          <IconPlus className="h-4 w-4" />
          Add job
        </button>
      </div>

      <TrackerAnalyticsStrip stats={stats} />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted animate-pulse">Loading tracker...</p>
        </div>
      ) : !apps || apps.length === 0 ? (
        <div className="text-center py-16">
          <div className="empty-state-icon">∅</div>
          <h3 className="font-display text-h4 text-ink mb-2">No tracked jobs yet</h3>
          <p className="text-sm text-muted">
            Track jobs from the feed or add one manually to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <TrackerPipeline
            stages={PIPELINE_STAGES}
            groupedByStage={groupedByStage}
            onSelectApp={setSelectedApp}
          />

          {/* Terminal stages */}
          <div>
            <h3 className="label-uppercase text-muted mb-3">Other</h3>
            <TrackerPipeline
              stages={TERMINAL_STAGES}
              groupedByStage={groupedByStage}
              onSelectApp={setSelectedApp}
            />
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {selectedApp && (
        <JobDetailDrawer
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
        />
      )}

      {/* Add modal */}
      {showAddModal && (
        <AddJobModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  )
}
