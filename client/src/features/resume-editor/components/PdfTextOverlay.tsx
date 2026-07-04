import type { TextRegion, DocumentFontDefaults } from '../types/pdf'
import TextRegionBlock from './TextRegionBlock'

interface PdfTextOverlayProps {
  pageNumber: number
  regions: TextRegion[]
  pageHeight: number
  scale: number
  fontDefaults: DocumentFontDefaults
  selectedRegionId: string | null
  onSelectRegion: (region: TextRegion) => void
  onUpdateText: (pageNum: number, regionId: string, text: string) => void
}

export default function PdfTextOverlay({
  pageNumber,
  regions,
  pageHeight,
  scale,
  fontDefaults,
  selectedRegionId,
  onSelectRegion,
  onUpdateText,
}: PdfTextOverlayProps) {
  function toScreen(pdfCoord: number, isY: boolean): number {
    if (isY) return (pageHeight - pdfCoord) * scale
    return pdfCoord * scale
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {regions.map(region => (
        <div
          key={region.id}
          className="pointer-events-auto"
          style={{
            position: 'absolute',
            left: toScreen(region.x, false),
            top: toScreen(region.y + region.height, true),
            width: Math.max(region.width * scale, 20),
            height: Math.max(region.height * scale, 14),
          }}
        >
          <TextRegionBlock
            region={region}
            pageNumber={pageNumber}
            fontDefaults={fontDefaults}
            isSelected={selectedRegionId === region.id}
            onSelect={() => onSelectRegion(region)}
            onUpdateText={onUpdateText}
          />
        </div>
      ))}
    </div>
  )
}
