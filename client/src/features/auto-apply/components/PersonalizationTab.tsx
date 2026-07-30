import { useState } from 'react'
import { useAutoApplyConfig, useUpdateAutoApplyConfig, useAnswersBank, useStoreAnswer, useDeleteAnswer } from '../../../lib/queries'
import type { AnswersBankEntry } from '../../../lib/queries'

const STYLE_OPTIONS = [
  { value: 'professional', label: 'Professional', desc: 'Formal and polished' },
  { value: 'enthusiastic', label: 'Enthusiastic', desc: 'Energetic and passionate' },
  { value: 'concise', label: 'Concise', desc: 'Short and direct' },
  { value: 'detailed', label: 'Detailed', desc: 'Thorough and comprehensive' },
  { value: 'technical', label: 'Technical', desc: 'Focused on technical depth' },
]

const CATEGORY_OPTIONS = ['visa', 'salary', 'notice_period', 'location', 'sponsorship', 'generic'] as const

const CATEGORY_LABELS: Record<string, string> = {
  visa: 'Visa / Work Auth',
  salary: 'Salary / Compensation',
  notice_period: 'Notice / Start Date',
  location: 'Location / Remote',
  sponsorship: 'Sponsorship',
  generic: 'General',
}

function PersonalDetails({ config, onUpdate }: { config: any; onUpdate: (patch: any) => void }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
      <h3 className="font-medium text-ink text-sm">Personal Details</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted">Available from</label>
          <input
            type="text"
            placeholder="e.g. Immediately, 2 weeks notice"
            value={config?.availableFrom || ''}
            onChange={(e) => onUpdate({ availableFrom: e.target.value })}
            className="input-field text-sm w-full"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted">Salary expectations</label>
          <input
            type="text"
            placeholder="e.g. $120K–$150K"
            value={config?.salaryExpectations || ''}
            onChange={(e) => onUpdate({ salaryExpectations: e.target.value })}
            className="input-field text-sm w-full"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted">Preferred location</label>
          <input
            type="text"
            placeholder="e.g. San Francisco, CA"
            value={config?.preferredLocation || ''}
            onChange={(e) => onUpdate({ preferredLocation: e.target.value })}
            className="input-field text-sm w-full"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-ink cursor-pointer select-none">
          <input type="checkbox" checked={!!config?.needsVisaSponsorship} onChange={(e) => onUpdate({ needsVisaSponsorship: e.target.checked })} className="accent-teal h-4 w-4 rounded border-border" />
          Need visa sponsorship
        </label>
        <label className="flex items-center gap-2 text-sm text-ink cursor-pointer select-none">
          <input type="checkbox" checked={!!config?.willingToRelocate} onChange={(e) => onUpdate({ willingToRelocate: e.target.checked })} className="accent-teal h-4 w-4 rounded border-border" />
          Willing to relocate
        </label>
        <label className="flex items-center gap-2 text-sm text-ink cursor-pointer select-none">
          <input type="checkbox" checked={!!config?.willingToTravel} onChange={(e) => onUpdate({ willingToTravel: e.target.checked })} className="accent-teal h-4 w-4 rounded border-border" />
          Willing to travel
        </label>
      </div>
    </div>
  )
}

function LinksSection({ config, onUpdate }: { config: any; onUpdate: (patch: any) => void }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
      <h3 className="font-medium text-ink text-sm">Links</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(['linkedInUrl', 'githubUrl', 'portfolioUrl', 'websiteUrl'] as const).map((field) => (
          <div key={field} className="space-y-1.5">
            <label className="text-xs font-medium text-muted capitalize">{field.replace('Url', ' URL').replace(/([A-Z])/g, ' $1')}</label>
            <input
              type="url"
              placeholder={`https://${field.includes('linkedIn') ? 'linkedin.com/in/' : field.includes('github') ? 'github.com/' : 'your-site.com'}`}
              value={config?.[field] || ''}
              onChange={(e) => onUpdate({ [field]: e.target.value })}
              className="input-field text-sm w-full"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function ApplicationStyle({ config, onUpdate }: { config: any; onUpdate: (patch: any) => void }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
      <h3 className="font-medium text-ink text-sm">Application Style</h3>
      <p className="text-xs text-muted">This controls the tone of AI-generated cover letters and screening answers.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {STYLE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onUpdate({ applicationStyle: opt.value })}
            className={`px-3 py-2.5 text-xs font-medium rounded-lg border text-left transition-colors ${
              (config?.applicationStyle || 'professional') === opt.value
                ? 'bg-teal-light border-teal text-teal'
                : 'bg-paper border-border text-ink hover:border-muted'
            }`}
          >
            <span className="block font-semibold">{opt.label}</span>
            <span className="block text-[10px] text-muted mt-0.5">{opt.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function PersonalSummary({ config, onUpdate }: { config: any; onUpdate: (patch: any) => void }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
      <h3 className="font-medium text-ink text-sm">Personal Summary</h3>
      <p className="text-xs text-muted">A short blurb about yourself. Used in cover letter opening and screening questions about your background.</p>
      <textarea
        placeholder="e.g. Senior full-stack engineer with 5+ years building SaaS platforms in React, Node, and Python..."
        value={config?.personalSummary || ''}
        onChange={(e) => onUpdate({ personalSummary: e.target.value })}
        className="input-field text-sm w-full min-h-[80px] resize-y"
      />
    </div>
  )
}

function AnswersBankSection() {
  const { data: answers, isLoading } = useAnswersBank()
  const storeAnswer = useStoreAnswer()
  const deleteAnswer = useDeleteAnswer()
  const [showForm, setShowForm] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [newCategory, setNewCategory] = useState<string>('generic')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQuestion, setEditQuestion] = useState('')
  const [editAnswer, setEditAnswer] = useState('')
  const [editCategory, setEditCategory] = useState('')

  const handleAdd = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return
    storeAnswer.mutate(
      { question: newQuestion, answer: newAnswer, category: newCategory },
      {
        onSuccess: () => {
          setNewQuestion('')
          setNewAnswer('')
          setNewCategory('generic')
          setShowForm(false)
        },
      },
    )
  }

  const handleDelete = (id: string) => {
    deleteAnswer.mutate(id)
  }

  const handleStartEdit = (entry: AnswersBankEntry) => {
    setEditingId(entry._id)
    setEditQuestion(entry.originalQuestion)
    setEditAnswer(entry.answer)
    setEditCategory(entry.category)
  }

  const handleSaveEdit = (id: string) => {
    storeAnswer.mutate(
      { question: editQuestion, answer: editAnswer, category: editCategory },
      { onSuccess: () => setEditingId(null) },
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-ink text-sm">Answers Bank</h3>
          <p className="text-xs text-muted mt-0.5">Saved answers are automatically applied to matching screening questions during auto-fill.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 text-xs font-medium bg-ink text-paper rounded-lg hover:opacity-80"
        >
          {showForm ? 'Cancel' : 'Add Answer'}
        </button>
      </div>

      {showForm && (
        <div className="bg-paper border border-border rounded-lg p-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">Question</label>
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="e.g. Are you legally authorized to work in the US?"
              className="input-field text-sm w-full"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">Answer</label>
            <textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Your answer..."
              className="input-field text-sm w-full min-h-[60px] resize-y"
            />
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">Category</label>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="input-field text-sm">
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAdd}
              disabled={storeAnswer.isPending || !newQuestion.trim() || !newAnswer.trim()}
              className="px-4 py-1.5 text-xs font-medium bg-teal text-white rounded-lg hover:bg-teal-dark disabled:opacity-50"
            >
              {storeAnswer.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-muted">Loading answers...</p>}
      {!isLoading && (!answers || answers.length === 0) && (
        <p className="text-sm text-muted italic">No saved answers yet. They are saved automatically when AI answers screening questions, or you can add them manually.</p>
      )}
      <div className="flex flex-col gap-2">
        {(answers || []).map((entry) => (
          <div key={entry._id} className="bg-surface border border-border rounded-lg overflow-hidden">
            {editingId === entry._id ? (
              <div className="p-4 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">Question</label>
                  <input type="text" value={editQuestion} onChange={(e) => setEditQuestion(e.target.value)} className="input-field text-sm w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">Answer</label>
                  <textarea value={editAnswer} onChange={(e) => setEditAnswer(e.target.value)} className="input-field text-sm w-full min-h-[60px] resize-y" />
                </div>
                <div className="flex items-center gap-2">
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="input-field text-sm">
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                  <button onClick={() => handleSaveEdit(entry._id)} className="px-3 py-1.5 text-xs font-medium bg-teal text-white rounded-lg">Save</button>
                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs font-medium text-ink border border-border rounded-lg">Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{entry.originalQuestion}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-medium text-muted bg-paper px-1.5 py-0.5 rounded capitalize">{CATEGORY_LABELS[entry.category] || entry.category}</span>
                      <span className="text-[10px] text-muted">Used {entry.hitCount} times</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => handleStartEdit(entry)} className="p-1 text-muted hover:text-ink transition-colors" title="Edit">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(entry._id)} className="p-1 text-muted hover:text-danger transition-colors" title="Delete">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
                <div className="px-4 pb-3 pt-0 border-t border-border">
                  <p className="text-sm text-ink mt-2 whitespace-pre-wrap">{entry.answer}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PersonalizationTab() {
  const { data: config, isLoading } = useAutoApplyConfig()
  const updateConfig = useUpdateAutoApplyConfig()

  const handleUpdate = (patch: Record<string, unknown>) => {
    updateConfig.mutate(patch)
  }

  if (isLoading) return <p className="text-sm text-muted">Loading...</p>

  return (
    <div className="max-w-2xl space-y-6">
      {updateConfig.isError && (
        <div className="px-4 py-2 bg-danger-light/30 border border-danger/20 rounded-lg text-sm text-danger">
          Failed to save: {(updateConfig.error as Error).message}
        </div>
      )}

      <PersonalDetails config={config} onUpdate={handleUpdate} />
      <LinksSection config={config} onUpdate={handleUpdate} />
      <ApplicationStyle config={config} onUpdate={handleUpdate} />
      <PersonalSummary config={config} onUpdate={handleUpdate} />
      <AnswersBankSection />
    </div>
  )
}
