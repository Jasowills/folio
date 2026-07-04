import { IconInfoCircle, IconX } from '@tabler/icons-react'

interface ExtractionNotificationProps {
  visible: boolean
  onDismiss: () => void
}

export default function ExtractionNotification({ visible, onDismiss }: ExtractionNotificationProps) {
  if (!visible) return null

  return (
    <div className="bg-amber/10 border-b border-amber/20 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <IconInfoCircle className="h-3.5 w-3.5 text-amber shrink-0" />
        <span className="text-[11px] text-ink">
          This resume was extracted from a PDF. Some fields may have low confidence — review highlighted sections.
        </span>
      </div>
      <button onClick={onDismiss} className="p-0.5 rounded text-muted hover:text-ink transition-colors cursor-pointer ml-2 shrink-0">
        <IconX className="h-3 w-3" />
      </button>
    </div>
  )
}
