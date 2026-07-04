import type { DocumentFontDefaults, PdfDocumentData, TextRegion } from '../types/pdf'

interface FontsPanelProps {
  fontDefaults: DocumentFontDefaults
  docData: PdfDocumentData | null
  onApplyDefaults: (defaults: DocumentFontDefaults) => void
  onResetRegion: (pageNum: number, regionId: string) => void
}

const FONTS = [
  'Helvetica', 'Arial', 'Times New Roman', 'Georgia',
  'Courier New', 'Verdana', 'Trebuchet MS', 'Palatino',
  'Calibri', 'Tahoma',
]

const COLORS = [
  '#000000', '#1a1a1a', '#333333', '#555555', '#888888',
  '#2563eb', '#dc2626', '#16a34a', '#ca8a04',
  '#7c3aed', '#db2777', '#0891b2', '#ea580c',
]

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48]

export default function FontsPanel({ fontDefaults, docData, onApplyDefaults, onResetRegion }: FontsPanelProps) {
  const editedRegions: { page: number; region: TextRegion }[] = []
  if (docData) {
    for (const page of docData.pages) {
      for (const r of page.regions) {
        if (r.edited) editedRegions.push({ page: page.pageNumber, region: r })
      }
    }
  }

  return (
    <div className="p-4 space-y-5 text-[12px]">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-3">Document Defaults</p>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-muted mb-1 block">Font Family</label>
            <select
              value={fontDefaults.fontName}
              onChange={e => onApplyDefaults({ ...fontDefaults, fontName: e.target.value })}
              className="w-full text-[11px] bg-paper border border-border rounded-lg px-2.5 py-1.5 text-ink focus:outline-none focus:border-teal"
            >
              {FONTS.map(f => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted mb-1 block">Font Size</label>
            <select
              value={fontDefaults.fontSize}
              onChange={e => onApplyDefaults({ ...fontDefaults, fontSize: Number(e.target.value) })}
              className="w-full text-[11px] bg-paper border border-border rounded-lg px-2.5 py-1.5 text-ink focus:outline-none focus:border-teal"
            >
              {FONT_SIZES.map(s => (
                <option key={s} value={s}>{s}px</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted mb-1 block">Default Color</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => onApplyDefaults({ ...fontDefaults, fontColor: c })}
                  className={`h-6 w-6 rounded-full border-2 transition-all cursor-pointer ${
                    fontDefaults.fontColor === c ? 'border-teal scale-110' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={fontDefaults.fontColor}
                onChange={e => onApplyDefaults({ ...fontDefaults, fontColor: e.target.value })}
                className="h-6 w-6 rounded cursor-pointer border-0 p-0"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted mb-1 block">Line Spacing</label>
            <input
              type="range"
              min="1"
              max="2"
              step="0.1"
              value={fontDefaults.lineSpacing}
              onChange={e => onApplyDefaults({ ...fontDefaults, lineSpacing: Number(e.target.value) })}
              className="w-full accent-teal"
            />
            <span className="text-[10px] text-muted">{fontDefaults.lineSpacing.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {editedRegions.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
            Per-Region Overrides ({editedRegions.length})
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {editedRegions.map(({ page, region }) => (
              <div key={`${page}-${region.id}`} className="flex items-center justify-between bg-paper rounded-lg px-2.5 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-ink truncate">{region.text.slice(0, 40)}</p>
                  <p className="text-[9px] text-muted">
                    {region.fontName} · {region.fontSize}px
                    {region.fontColor !== '#000000' && <span> · <span style={{ color: region.fontColor }}>●</span></span>}
                  </p>
                </div>
                <button
                  onClick={() => onResetRegion(page, region.id)}
                  className="text-[10px] text-muted hover:text-ink shrink-0 ml-2 cursor-pointer"
                >
                  Reset
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted leading-relaxed">
        Document defaults apply to all unedited regions. Per-region overrides (from the style toolbar) take precedence.
      </p>
    </div>
  )
}
