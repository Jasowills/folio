import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { Document, Page } from 'react-pdf'
import { IconLoader2, IconAlertTriangle, IconMoodSad } from '@tabler/icons-react'
import { usePdfTextRegions } from '../hooks/usePdfTextRegions'
import PdfTextOverlay from './PdfTextOverlay'
import RegionToolbar from './RegionToolbar'
import type { TextRegion, DocumentFontDefaults, PdfDocumentData } from '../types/pdf'

interface PdfEditorProps {
  resumeId: string
  fileUrl?: string
  fontDefaults: DocumentFontDefaults
  onFontDefaultsChange: (defaults: DocumentFontDefaults) => void
  onRegionsChange: (data: PdfDocumentData | null) => void
  initialRegionData?: PdfDocumentData | null
}

interface PageSize {
  width: number
  height: number
}

export default function PdfEditor({
  resumeId,
  fileUrl,
  fontDefaults,
  onFontDefaultsChange,
  onRegionsChange,
  initialRegionData,
}: PdfEditorProps) {
  const {
    docData,
    loading,
    error,
    extractRegions,
    updateRegionText,
    updateRegionStyle,
    applyFontDefaults,
    loadRegionData,
  } = usePdfTextRegions()
  const [pageSizes, setPageSizes] = useState<Record<number, PageSize>>({})
  const [selectedRegion, setSelectedRegion] = useState<{ page: number; region: TextRegion } | null>(null)
  const [docError, setDocError] = useState<string | null>(null)
  const notifyParent = useRef(onRegionsChange)
  notifyParent.current = onRegionsChange

  useEffect(() => {
    if (docData) notifyParent.current(docData)
  }, [docData])

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  const file = useMemo(() => resumeId
    ? { url: `/api/resumes/${resumeId}/pdf`, httpHeaders: token ? { Authorization: `Bearer ${token}` } : undefined }
    : fileUrl
      ? { url: fileUrl }
      : null,
  [resumeId, fileUrl, token])

  function handleDocLoad(doc: any) {
    setDocError(null)
    if (initialRegionData) {
      loadRegionData(initialRegionData)
    } else {
      extractRegions(doc)
    }
  }

  function handleDocError(err: Error) {
    console.error('PdfEditor: failed to load document', err.message)
    setDocError(err.message || 'Failed to load PDF')
  }

  function handlePageRender(pageNum: number, { width, height }: { width: number; height: number }) {
    setPageSizes(prev => {
      if (prev[pageNum]?.width === width && prev[pageNum]?.height === height) return prev
      return { ...prev, [pageNum]: { width, height } }
    })
  }

  function handleSelectRegion(pageNum: number, region: TextRegion) {
    setSelectedRegion({ page: pageNum, region })
  }

  function handleUpdateText(pageNum: number, regionId: string, text: string) {
    updateRegionText(pageNum, regionId, text)
  }

  function handleUpdateStyle(regionId: string, style: Partial<Pick<TextRegion, 'fontName' | 'fontSize' | 'fontColor' | 'textAlign'>>) {
    if (!selectedRegion) return
    updateRegionStyle(selectedRegion.page, regionId, style)
    setSelectedRegion(prev => prev ? { ...prev, region: { ...prev.region, ...style } } : null)
  }

  function handleApplyDefaults(defaults: DocumentFontDefaults) {
    applyFontDefaults(defaults)
    onFontDefaultsChange(defaults)
  }

  const overlaysReady = docData && docData.pages.length > 0 && pageSizes[1]

  if (!file) {
    return (
      <div className="flex items-center justify-center py-16 text-muted text-xs">
        No PDF available
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <Document
        file={file}
        onLoadSuccess={handleDocLoad}
        onLoadError={handleDocError}
        loading={
          <div className="flex items-center justify-center py-16">
            <IconLoader2 className="h-6 w-6 text-muted animate-spin" />
          </div>
        }
        error={
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <IconAlertTriangle className="h-8 w-8 text-danger mb-3" />
            <p className="text-sm text-muted">Failed to load PDF</p>
            {docError && <p className="text-xs text-muted mt-1">{docError}</p>}
          </div>
        }
        className="flex flex-col items-center"
      >
        {docData?.pages.map(page => {
          const size = pageSizes[page.pageNumber]
          const scale = size ? size.width / page.width : 1
          return (
            <div
              key={page.pageNumber}
              className="relative mb-4 last:mb-0 shadow-sm bg-white"
              style={size ? { width: size.width } : { minWidth: 300 }}
            >
              <Page
                pageNumber={page.pageNumber}
                width={600}
                onRenderSuccess={(dims) => handlePageRender(page.pageNumber, dims)}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
              {overlaysReady && (
                <PdfTextOverlay
                  pageNumber={page.pageNumber}
                  regions={page.regions}
                  pageHeight={page.height}
                  scale={scale}
                  fontDefaults={fontDefaults}
                  selectedRegionId={selectedRegion?.region.id ?? null}
                  onSelectRegion={(region) => handleSelectRegion(page.pageNumber, region)}
                  onUpdateText={handleUpdateText}
                />
              )}
            </div>
          )
        })}
      </Document>

      {selectedRegion && (
        <RegionToolbar
          region={selectedRegion.region}
          onStyleChange={handleUpdateStyle}
          onClose={() => setSelectedRegion(null)}
        />
      )}

      {loading && (
        <div className="flex items-center gap-2 py-4">
          <IconLoader2 className="h-4 w-4 text-muted animate-spin" />
          <span className="text-xs text-muted">Extracting text regions...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 py-4 text-danger">
          <IconMoodSad className="h-4 w-4" />
          <span className="text-xs">{error}</span>
        </div>
      )}

      {overlaysReady && docData && docData.pages.every(p => p.regions.length === 0) && (
        <div className="py-4 text-xs text-muted">
          No selectable text found in this PDF. It may be a scanned document.
        </div>
      )}
    </div>
  )
}
