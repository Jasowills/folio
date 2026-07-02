import { useState } from 'react'
import { useTrackJob } from '../../lib/queries'
import { IconX } from '@tabler/icons-react'

interface AddJobModalProps {
  onClose: () => void
}

export default function AddJobModal({ onClose }: AddJobModalProps) {
  const trackJob = useTrackJob()
  const [mode, setMode] = useState<'url' | 'description'>('url')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async () => {
    const body: any = {}
    if (mode === 'url' && url) {
      body.url = url
    } else if (mode === 'description' && description) {
      body.description = description
    } else {
      return
    }
    await trackJob.mutateAsync(body)
    onClose()
  }

  const isValid = mode === 'url' ? url.trim().length > 0 : description.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl shadow-modal max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-h4 text-ink">Add job manually</h2>
          <button onClick={onClose} className="p-1 text-muted hover:text-ink transition-colors">
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-paper rounded-lg p-1 mb-4">
          <button
            onClick={() => setMode('url')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'url' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            Job URL
          </button>
          <button
            onClick={() => setMode('description')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'description' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            Job description
          </button>
        </div>

        {mode === 'url' ? (
          <div>
            <label className="label-uppercase text-muted mb-1.5 block">Paste job URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://boards.greenhouse.io/company/jobs/123"
              className="input-field"
            />
            <p className="text-[11px] text-muted mt-1">
              We'll automatically extract the job details.
            </p>
          </div>
        ) : (
          <div>
            <label className="label-uppercase text-muted mb-1.5 block">Paste job description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              className="input-field"
              rows={8}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted hover:text-ink transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || trackJob.isPending}
            className="px-5 py-2 text-sm font-medium bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors disabled:opacity-50"
          >
            {trackJob.isPending ? 'Extracting...' : 'Add to tracker'}
          </button>
        </div>
      </div>
    </div>
  )
}
