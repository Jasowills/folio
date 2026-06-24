import { TEMPLATES, TEMPLATE_PREVIEWS } from '../templates'
import type { ResumeTemplate } from '../templates/types'
import { cn } from '../lib/utils'

interface TemplatePickerProps {
  selected: string
  onChange: (template: ResumeTemplate) => void
}

export default function TemplatePicker({ selected, onChange }: TemplatePickerProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {TEMPLATES.map((tpl) => {
        const isActive = selected === tpl.id
        const svg = TEMPLATE_PREVIEWS[tpl.id]
        return (
          <button
            key={tpl.id}
            onClick={() => onChange(tpl)}
            className={cn(
              'flex-shrink-0 w-[120px] rounded-lg border-2 transition-all hover:shadow-sm',
              isActive
                ? 'border-teal bg-teal-light/20 shadow-sm'
                : 'border-border hover:border-muted bg-white',
            )}
          >
            <div className="h-[140px] p-2 flex items-center justify-center">
              {svg && (
                <div
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{
                    __html: svg.replace('currentColor', 'var(--tpl-color, #0F6E56)'),
                  }}
                  style={{ '--tpl-color': isActive ? '#0F6E56' : '#8E8E9A' } as React.CSSProperties}
                />
              )}
            </div>
            <div className="px-2 py-1.5 border-t border-border text-center">
              <p className="text-[10px] font-semibold text-ink truncate">{tpl.name}</p>
              <p className="text-[8px] text-muted truncate">{tpl.description.slice(0, 40)}...</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
