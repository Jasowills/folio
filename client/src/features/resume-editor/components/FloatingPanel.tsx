import { motion } from 'framer-motion'
import { IconX } from '@tabler/icons-react'
import type { ReactNode } from 'react'

interface FloatingPanelProps {
  children: ReactNode
  tab: string
  onClose: () => void
  side?: 'left' | 'right'
}

const tabLabels: Record<string, string> = {
  styles: 'Styles',
  sections: 'Sections',
  ai: 'AI Assistant',
}

export default function FloatingPanel({ children, tab, onClose, side = 'right' }: FloatingPanelProps) {
  const isLeft = side === 'left'

  return (
    <motion.aside
      initial={{ x: isLeft ? -320 : 320 }}
      animate={{ x: 0 }}
      exit={{ x: isLeft ? -320 : 320 }}
      transition={{ type: 'spring', damping: 25, stiffness: 250 }}
      className={`absolute top-0 bottom-0 w-[320px] bg-white shadow-xl z-10 flex flex-col ${
        isLeft ? 'left-0 border-r border-border' : 'right-0 border-l border-border'
      }`}
    >
      <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
        <h2 className="text-[13px] font-semibold text-ink">{tabLabels[tab] || tab}</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer"
        >
          <IconX className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </motion.aside>
  )
}
