import { IconBulb, IconX } from '@tabler/icons-react'

interface SuggestionTrayProps {
  suggestions: string[]
  onApply: (text: string) => void
  onDismiss: () => void
}

export default function SuggestionTray({ suggestions, onApply, onDismiss }: SuggestionTrayProps) {
  if (suggestions.length === 0) return null

  return (
    <div className="bg-teal-light/10 border border-teal/20 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <IconBulb className="h-3.5 w-3.5 text-teal" />
          <span className="text-[11px] font-medium text-teal">Suggestions</span>
        </div>
        <button onClick={onDismiss} className="p-0.5 rounded text-muted hover:text-ink transition-colors cursor-pointer">
          <IconX className="h-3 w-3" />
        </button>
      </div>
      <div className="space-y-1.5">
        {suggestions.map((text, i) => (
          <button
            key={i}
            onClick={() => onApply(text)}
            className="w-full text-left p-2 rounded border border-teal/15 bg-white text-[11px] text-ink hover:border-teal/40 transition-colors cursor-pointer"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}
