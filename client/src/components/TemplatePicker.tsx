import { useState } from 'react'
import { TEMPLATES, TEMPLATE_PREVIEWS } from '../templates'
import type { ResumeTemplate } from '../templates/types'
import { cn } from '../lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface TemplatePickerProps {
  selected: string
  onChange: (template: ResumeTemplate) => void
}

const INITIAL_COUNT = 6

export default function TemplatePicker({ selected, onChange }: TemplatePickerProps) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? TEMPLATES : TEMPLATES.slice(0, INITIAL_COUNT)

  return (
    <div className="flex flex-col gap-2 min-w-0">
      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="flex items-center gap-1 text-[11px] text-muted hover:text-teal transition-colors self-start cursor-pointer shrink-0"
        >
          <ChevronUp className="h-3 w-3" /> Show fewer
        </button>
      )}
      <div className={`flex gap-2 flex-wrap ${expanded ? 'overflow-y-auto max-h-[50vh]' : ''}`}>
        {visible.map((tpl) => {
          const isActive = selected === tpl.id
          const svg = TEMPLATE_PREVIEWS[tpl.id]
          return (
            <button
              key={tpl.id}
              onClick={() => onChange(tpl)}
              className={cn(
                'flex-shrink-0 w-[90px] sm:w-[105px] rounded-lg border-2 transition-all hover:shadow-sm',
                isActive
                  ? 'border-teal bg-teal-light/20 shadow-sm'
                  : 'border-border hover:border-muted bg-white',
              )}
            >
              <div className="h-[100px] sm:h-[120px] p-1.5 flex items-center justify-center">
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
              <div className="px-1.5 py-1 border-t border-border text-center">
                <p className="text-[9px] sm:text-[10px] font-semibold text-ink truncate">{tpl.name}</p>
              </div>
            </button>
          )
        })}
      </div>
      {TEMPLATES.length > INITIAL_COUNT && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 text-[11px] text-muted hover:text-teal transition-colors self-start cursor-pointer"
        >
          {expanded ? (
            <>Show fewer <ChevronUp className="h-3 w-3" /></>
          ) : (
            <>See more templates ({TEMPLATES.length - INITIAL_COUNT} more) <ChevronDown className="h-3 w-3" /></>
          )}
        </button>
      )}
    </div>
  )
}
