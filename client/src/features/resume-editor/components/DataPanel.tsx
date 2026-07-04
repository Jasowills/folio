import { useState } from 'react'
import { IconCheck, IconX, IconAlertTriangle, IconLoader2 } from '@tabler/icons-react'

interface StructuredField {
  label: string
  value: string
  confidence: 'high' | 'medium' | 'low'
  edited?: boolean
}

interface DataPanelProps {
  resume: any
  onUpdateField: (field: string, value: string) => void
}

const CONFIDENCE_ICONS = {
  high: <IconCheck className="h-3 w-3 text-success" />,
  medium: <IconAlertTriangle className="h-3 w-3 text-amber" />,
  low: <IconX className="h-3 w-3 text-danger" />,
}

const CONFIDENCE_LABELS = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
}

export default function DataPanel({ resume, onUpdateField }: DataPanelProps) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  function startEdit(field: string, currentValue: string) {
    setEditingField(field)
    setEditValue(currentValue)
  }

  function saveEdit(field: string) {
    if (editValue.trim()) {
      onUpdateField(field, editValue.trim())
    }
    setEditingField(null)
  }

  const fields: StructuredField[] = []

  if (resume?.name) fields.push({ label: 'Name', value: resume.name, confidence: resume.detectedRole?.confidence > 0.8 ? 'high' : 'medium' })
  if (resume?.contact?.email) fields.push({ label: 'Email', value: resume.contact.email, confidence: 'high' })
  if (resume?.contact?.phone) fields.push({ label: 'Phone', value: resume.contact.phone, confidence: 'high' })
  if (resume?.contact?.location) fields.push({ label: 'Location', value: resume.contact.location, confidence: 'medium' })
  if (resume?.summary) fields.push({ label: 'Summary', value: resume.summary, confidence: resume.detectedRole?.confidence > 0.7 ? 'high' : 'medium' })

  const expCount = resume?.experience?.length || 0
  const eduCount = resume?.education?.length || 0
  const skillCount = resume?.skills?.length || 0

  return (
    <div className="p-4 space-y-4 text-[12px]">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Extracted Fields</p>
        {(resume as any)?._extracting ? (
          <IconLoader2 className="h-3 w-3 text-muted animate-spin" />
        ) : null}
      </div>

      {fields.length === 0 ? (
        <p className="text-[11px] text-muted">No structured data extracted yet.</p>
      ) : (
        <div className="space-y-1">
          {fields.map(f => (
            <div key={f.label} className="flex items-start gap-2 bg-paper rounded-lg px-2.5 py-2">
              <div className="mt-0.5 shrink-0" title={CONFIDENCE_LABELS[f.confidence]}>
                {CONFIDENCE_ICONS[f.confidence]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-muted uppercase tracking-wider">{f.label}</p>
                {editingField === f.label ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <input
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      className="flex-1 text-[11px] bg-white border border-teal rounded px-1.5 py-0.5 text-ink focus:outline-none"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(f.label); if (e.key === 'Escape') setEditingField(null) }}
                    />
                    <button onClick={() => saveEdit(f.label)} className="text-teal hover:text-teal-dark text-[10px] cursor-pointer">Save</button>
                    <button onClick={() => setEditingField(null)} className="text-muted hover:text-ink text-[10px] cursor-pointer">Cancel</button>
                  </div>
                ) : (
                  <p
                    className="text-[11px] text-ink cursor-pointer hover:text-teal transition-colors"
                    onClick={() => startEdit(f.label, f.value)}
                    title="Click to edit"
                  >
                    {f.value}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">Detected Sections</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between bg-paper rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] text-ink">Experience</span>
            <span className="text-[10px] text-muted">{expCount} entries</span>
          </div>
          <div className="flex items-center justify-between bg-paper rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] text-ink">Education</span>
            <span className="text-[10px] text-muted">{eduCount} entries</span>
          </div>
          <div className="flex items-center justify-between bg-paper rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] text-ink">Skills</span>
            <span className="text-[10px] text-muted">{skillCount} skills</span>
          </div>
        </div>
      </div>

      {resume?.detectedRole && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">Detected Role</p>
          <div className="bg-paper rounded-lg px-2.5 py-2 space-y-1">
            <p className="text-[11px] text-ink">{resume.detectedRole.role}</p>
            <p className="text-[10px] text-muted">{resume.detectedRole.seniority} · {(resume.detectedRole.confidence * 100).toFixed(0)}% confidence</p>
            {resume.detectedRole.industries?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {resume.detectedRole.industries.map((ind: string) => (
                  <span key={ind} className="text-[9px] bg-border/30 rounded-full px-1.5 py-0.5 text-muted">{ind}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
