import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { IconCommand } from '@tabler/icons-react'

interface Command {
  id: string
  label: string
  action: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  commands: Command[]
}

export default function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
      setSearch('')
    }
  }, [open])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const filtered = commands.filter(c => c.label.toLowerCase().includes(search.toLowerCase()))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/30" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-[480px] bg-white rounded-xl shadow-2xl border border-border overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <IconCommand className="h-4 w-4 text-muted shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent border-0 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none"
            placeholder="Type a command..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-paper text-muted border border-border font-mono">ESC</kbd>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-center text-[12px] text-muted py-6">No matching commands</p>
          ) : (
            filtered.map(cmd => (
              <button
                key={cmd.id}
                onClick={() => { cmd.action(); onClose() }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] text-ink hover:bg-paper-dark transition-colors text-left cursor-pointer"
              >
                {cmd.label}
              </button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
