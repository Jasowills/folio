import { useCallback } from 'react'
import type { PdfLayoutPage } from '../../lib/queries'
import PdfBlock from './PdfBlock'

interface PdfPageRendererProps {
  page: PdfLayoutPage
  focusedBlockId: string | null
  onBlockFocus: (blockId: string) => void
  onBlockBlur: (blockId: string, newText: string) => void
  onReflowRef: (blockId: string, el: HTMLDivElement | null) => void
  issueMap?: Map<string, { severity: 'amber' | 'danger'; message: string }>
  zoom: number
  onDeleteBlock: (pageNumber: number, blockId: string) => void
  onMoveBlock: (pageNumber: number, blockId: string, x: number, y: number) => void
  onResizeBlock: (pageNumber: number, blockId: string, width: number, height: number) => void
  onAddBlock: (pageNumber: number) => void
}

export default function PdfPageRenderer({
  page,
  focusedBlockId,
  onBlockFocus,
  onBlockBlur,
  onReflowRef,
  issueMap,
  zoom,
  onDeleteBlock,
  onMoveBlock,
  onResizeBlock,
  onAddBlock,
}: PdfPageRendererProps) {
  const handleDelete = useCallback((blockId: string) => onDeleteBlock(page.pageNumber, blockId), [page.pageNumber, onDeleteBlock])
  const handleMove = useCallback((blockId: string, x: number, y: number) => onMoveBlock(page.pageNumber, blockId, x, y), [page.pageNumber, onMoveBlock])
  const handleResize = useCallback((blockId: string, w: number, h: number) => onResizeBlock(page.pageNumber, blockId, w, h), [page.pageNumber, onResizeBlock])

  return (
    <div
      className="bg-white shadow-sm overflow-hidden"
      style={{
        position: 'relative',
        width: `${page.width}pt`,
        height: `${page.height}pt`,
        margin: '0 auto 32px auto',
      }}
    >
      {(page.blocks || []).map((block) => {
        const issue = issueMap?.get(block.id)
        return (
          <PdfBlock
            key={block.id}
            block={block}
            isFocused={focusedBlockId === block.id}
            onFocus={() => onBlockFocus(block.id)}
            onBlur={(newText) => onBlockBlur(block.id, newText)}
            onReflowRef={onReflowRef}
            issueSeverity={issue?.severity ?? null}
            issueMessage={issue?.message ?? null}
            zoom={zoom}
            onDelete={handleDelete}
            onMove={handleMove}
            onResize={handleResize}
          />
        )
      })}

      <button
        onClick={() => onAddBlock(page.pageNumber)}
        className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-muted hover:text-teal bg-white/80 hover:bg-white rounded-md px-3 py-1 border border-border/50 transition-colors cursor-pointer whitespace-nowrap"
        style={{ zIndex: 5 }}
      >
        + Add block
      </button>
    </div>
  )
}
