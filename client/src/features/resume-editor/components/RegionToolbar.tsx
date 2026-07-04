import { IconX } from '@tabler/icons-react'
import type { TextRegion } from '../types/pdf'

interface RegionToolbarProps {
  region: TextRegion
  onStyleChange: (regionId: string, style: Partial<Pick<TextRegion, 'fontName' | 'fontSize' | 'fontColor' | 'textAlign'>>) => void
  onClose: () => void
}

const FONTS = [
  'Helvetica', 'Times New Roman', 'Arial', 'Georgia',
  'Courier New', 'Verdana', 'Trebuchet MS', 'Palatino',
]

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48]

const COLORS = [
  '#000000', '#333333', '#555555', '#999999',
  '#2563eb', '#dc2626', '#16a34a', '#ca8a04',
  '#7c3aed', '#db2777', '#0891b2', '#ea580c',
]

export default function RegionToolbar({ region, onStyleChange, onClose }: RegionToolbarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-border rounded-xl shadow-xl px-3 py-2 flex items-center gap-2">
      <select
        value={region.fontName}
        onChange={e => onStyleChange(region.id, { fontName: e.target.value })}
        className="text-[11px] bg-paper border border-border rounded px-2 py-1 text-ink focus:outline-none focus:border-teal"
      >
        {FONTS.map(f => (
          <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
        ))}
      </select>

      <select
        value={region.fontSize}
        onChange={e => onStyleChange(region.id, { fontSize: Number(e.target.value) })}
        className="text-[11px] bg-paper border border-border rounded px-2 py-1 text-ink w-16 focus:outline-none focus:border-teal"
      >
        {FONT_SIZES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <div className="flex items-center gap-0.5">
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => onStyleChange(region.id, { fontColor: c })}
            className={`h-5 w-5 rounded-full border-2 transition-all cursor-pointer ${
              region.fontColor === c ? 'border-teal scale-110' : 'border-transparent hover:scale-110'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        <input
          type="color"
          value={region.fontColor}
          onChange={e => onStyleChange(region.id, { fontColor: e.target.value })}
          className="h-5 w-5 rounded cursor-pointer border-0 p-0"
        />
      </div>

      <div className="w-px h-5 bg-border" />

      <button
        onClick={() => onStyleChange(region.id, { textAlign: 'left' })}
        className={`px-1.5 py-1 rounded text-[10px] font-medium cursor-pointer ${
          region.textAlign === 'left' ? 'bg-teal-light text-teal' : 'text-muted hover:text-ink'
        }`}
        title="Align left"
      >
        ═══
      </button>
      <button
        onClick={() => onStyleChange(region.id, { textAlign: 'center' })}
        className={`px-1.5 py-1 rounded text-[10px] font-medium cursor-pointer ${
          region.textAlign === 'center' ? 'bg-teal-light text-teal' : 'text-muted hover:text-ink'
        }`}
        title="Center"
      >
        ───
      </button>
      <button
        onClick={() => onStyleChange(region.id, { textAlign: 'right' })}
        className={`px-1.5 py-1 rounded text-[10px] font-medium cursor-pointer ${
          region.textAlign === 'right' ? 'bg-teal-light text-teal' : 'text-muted hover:text-ink'
        }`}
        title="Align right"
      >
        ───
      </button>

      <div className="w-px h-5 bg-border" />

      <button onClick={onClose} className="p-1 rounded text-muted hover:text-ink cursor-pointer">
        <IconX className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
