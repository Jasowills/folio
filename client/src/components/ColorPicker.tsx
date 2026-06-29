import { COLOR_THEMES } from '../templates'

interface ColorPickerProps {
  selected: string
  onChange: (color: string) => void
}

export default function ColorPicker({ selected, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-1 max-w-[180px]">
      {COLOR_THEMES.map((theme) => (
        <button
          key={theme.id}
          onClick={() => onChange(theme.primary)}
          className={`h-4 w-4 rounded-full border-2 transition-all hover:scale-110 shrink-0 ${
            selected === theme.primary
              ? 'border-ink scale-110 shadow-sm'
              : 'border-transparent'
          }`}
          style={{ backgroundColor: theme.primary }}
          title={theme.name}
        />
      ))}
      <label className="relative cursor-pointer flex items-center justify-center shrink-0">
        <div
          className="h-4 w-4 rounded-full border-2 border-dashed border-border hover:border-muted transition-colors flex items-center justify-center"
          title="Custom color"
        >
          <span className="text-[9px] text-muted leading-none">+</span>
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
