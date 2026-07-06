import { cn } from '../../../lib/utils'
import { IconChevronLeft, IconLayoutGrid, IconList, IconWand, IconDownload, IconZoomIn, IconZoomOut, IconCode } from '@tabler/icons-react'

interface ZoomProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
}

interface EditorToolbarProps {
  resumeTitle: string
  saved: boolean
  onSave: () => void
  onOpenPanel: (tab: 'styles' | 'sections' | 'ai') => void
  activePanel: 'styles' | 'sections' | 'ai' | null
  onExport: () => void
  onBack: () => void
  zoom?: ZoomProps
  debugMode?: boolean
  onDebugToggle?: () => void
}

export default function EditorToolbar({
  resumeTitle,
  saved,
  onBack,
  onOpenPanel,
  activePanel,
  onExport,
  zoom,
  debugMode,
  onDebugToggle,
}: EditorToolbarProps) {
  return (
    <header className="h-12 bg-white border-b border-border flex items-center justify-between px-3 shrink-0 z-20">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer"
          title="Back to resumes"
        >
          <IconChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-medium text-ink truncate max-w-[200px]">
          {resumeTitle}
        </span>
        <div className="flex items-center gap-1 ml-2">
          <div className={cn(
            'h-1.5 w-1.5 rounded-full',
            saved ? 'bg-success' : 'bg-amber',
          )} />
          <span className={cn(
            'text-[10px] font-medium',
            saved ? 'text-success' : 'text-amber',
          )}>
            {saved ? 'Saved' : 'Unsaved'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        {zoom && (
          <>
            <ToolbarButton icon={IconZoomOut} label="" onClick={zoom.onZoomOut} />
            <button
              onClick={zoom.onZoomReset}
              className="text-[11px] font-medium text-muted hover:text-ink transition-colors w-8 text-center cursor-pointer"
            >
              {Math.round(zoom.zoom * 100)}%
            </button>
            <ToolbarButton icon={IconZoomIn} label="" onClick={zoom.onZoomIn} />
            <div className="w-px h-5 bg-border mx-1" />
          </>
        )}

        {onDebugToggle && (
          <>
            <ToolbarButton
              icon={IconCode}
              label="Debug"
              active={debugMode}
              onClick={onDebugToggle}
            />
            <div className="w-px h-5 bg-border mx-1" />
          </>
        )}

        <ToolbarButton
          icon={IconList}
          label="Sections"
          active={activePanel === 'sections'}
            onClick={() => onOpenPanel('sections')}
        />
        <ToolbarButton
          icon={IconLayoutGrid}
          label="Styles"
          active={activePanel === 'styles'}
          onClick={() => onOpenPanel('styles')}
        />
        <ToolbarButton
          icon={IconWand}
          label="AI"
          active={activePanel === 'ai'}
          onClick={() => onOpenPanel('ai')}
        />

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton
          icon={IconDownload}
          label="Export"
          onClick={onExport}
        />
      </div>
    </header>
  )
}

function ToolbarButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-[11px] font-medium transition-colors cursor-pointer',
        active
          ? 'bg-teal-light text-teal'
          : 'text-muted hover:text-ink hover:bg-paper-dark',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
