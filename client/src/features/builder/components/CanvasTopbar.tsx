import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconCheck } from '@tabler/icons-react'
import { TEMPLATE_DEFS } from '../../resume-editor/templates/types'
import type { TemplateId } from '../../resume-editor/templates/types'

interface Props {
  resumeTitle: string
  templateId: TemplateId | null
  onTemplateChange: (id: TemplateId) => void
  completedCount: number
  isSaving: boolean
  onExport: () => void
}

export default function CanvasTopbar({
  resumeTitle,
  templateId,
  onTemplateChange,
  completedCount,
  isSaving,
  onExport,
}: Props) {
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <div className="h-12 bg-white border-b border-border flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/resumes')}
          className="p-1.5 -ml-1.5 rounded-md hover:bg-paper-dark transition-colors text-muted hover:text-ink"
        >
          <IconArrowLeft size={18} />
        </button>
        <span className="text-[13px] font-medium text-ink truncate max-w-[200px]">
          {resumeTitle || 'New Resume'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="text-[11px] text-muted hover:text-ink bg-paper rounded-md px-2.5 py-1.5 transition-colors"
          >
            {templateId ? TEMPLATE_DEFS.find(t => t.id === templateId)?.name || 'Template' : 'Template'}
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                {TEMPLATE_DEFS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { onTemplateChange(t.id as TemplateId); setDropdownOpen(false) }}
                    className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-paper-dark transition-colors ${
                      t.id === templateId ? 'text-teal font-medium' : 'text-ink'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {isSaving && (
          <span className="flex items-center gap-1 text-[10px] text-muted/60">
            <IconCheck size={12} />
            Saving...
          </span>
        )}

        <button
          onClick={onExport}
          disabled={completedCount < 3}
          className="text-[11px] font-medium text-white bg-teal hover:bg-teal-dark disabled:opacity-40 disabled:cursor-not-allowed rounded-md px-3 py-1.5 transition-colors"
        >
          Export
        </button>
      </div>
    </div>
  )
}
