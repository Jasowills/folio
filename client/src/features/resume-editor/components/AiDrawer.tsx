import { motion } from 'framer-motion'
import { IconX, IconLoader2, IconWand } from '@tabler/icons-react'

interface AiDrawerProps {
  open: boolean
  loading: boolean
  variations: string[]
  onSelect: (text: string) => void
  onRegenerate: () => void
  onClose: () => void
}

export default function AiDrawer({ open, loading, variations, onSelect, onRegenerate, onClose }: AiDrawerProps) {
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: open ? 0 : '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="absolute bottom-0 left-0 right-0 z-30 bg-white border-t border-border shadow-xl"
      style={{ maxHeight: '240px' }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <IconWand className="h-3.5 w-3.5 text-teal" />
          <span className="text-[12px] font-medium text-ink">
            {loading ? 'Rewriting...' : `${variations.length} AI rewrites`}
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded text-muted hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer">
          <IconX className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="overflow-y-auto p-3 space-y-2" style={{ maxHeight: '160px' }}>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <IconLoader2 className="h-5 w-5 text-muted animate-spin" />
          </div>
        ) : variations.length === 0 ? (
          <p className="text-center text-[11px] text-muted py-4">No variations available</p>
        ) : (
          variations.map((text, i) => (
            <button
              key={i}
              onClick={() => onSelect(text)}
              className="w-full text-left p-2.5 rounded-lg border border-border bg-paper text-[11px] text-ink leading-relaxed hover:border-teal hover:bg-teal-light/10 transition-colors cursor-pointer"
            >
              {text}
            </button>
          ))
        )}
      </div>

      {!loading && variations.length > 0 && (
        <div className="px-3 pb-3">
          <button
            onClick={onRegenerate}
            className="w-full py-1.5 text-[10px] font-medium text-teal hover:text-teal-dark transition-colors cursor-pointer"
          >
            Regenerate
          </button>
        </div>
      )}
    </motion.div>
  )
}
