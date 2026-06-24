import { COLOR_THEMES } from '../templates'
import type { ResumeColorTheme } from '../templates/types'

interface ColorPickerProps {
  selected: string
  onChange: (color: string) => void
}

export default function ColorPicker({ selected, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {COLOR_THEMES.map((theme) => (
        <button
          key={theme.id}
          onClick={() => onChange(theme.primary)}
          className={`h-7 w-7 rounded-full border-2 transition-all hover:scale-110 ${
            selected === theme.primary
              ? 'border-ink scale-110 shadow-sm'
              : 'border-transparent'
          }`}
          style={{ backgroundColor: theme.primary }}
          title={theme.name}
        />
      ))}
      <label className="relative cursor-pointer">
        <div
          className="h-7 w-7 rounded-full border-2 border-dashed border-border hover:border-muted transition-colors flex items-center justify-center"
          title="Custom color"
        >
          <span className="text-xs text-muted">+</span>
        </div>
        <input
          type="color"
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>
    </div>
  )
}
