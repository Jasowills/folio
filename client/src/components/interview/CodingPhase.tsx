import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconCode, IconX, IconPlayerPlay, IconBraces, IconBrandPython, IconFileTypeJs } from '@tabler/icons-react'
import Editor from '@monaco-editor/react'
import { Button } from '../ui/button'

interface CodingPhaseProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCodeSubmit?: (code: string, language: string) => void
}

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', icon: IconFileTypeJs },
  { id: 'python', label: 'Python', icon: IconBrandPython },
  { id: 'typescript', label: 'TypeScript', icon: IconBraces },
  { id: 'java', label: 'Java', icon: IconBraces },
  { id: 'go', label: 'Go', icon: IconBraces },
  { id: 'rust', label: 'Rust', icon: IconBraces },
  { id: 'cpp', label: 'C++', icon: IconBraces },
]

const DEFAULT_CODE = `// Write your solution here
function solution(input) {
  // TODO: implement
  return input;
}
`

export function CodingPhase({ isOpen, onOpenChange, onCodeSubmit }: CodingPhaseProps) {
  const [code, setCode] = useState(DEFAULT_CODE)
  const [language, setLanguage] = useState('javascript')

  const handleSubmit = useCallback(() => {
    onCodeSubmit?.(code, language)
    onOpenChange(false)
  }, [code, language, onCodeSubmit, onOpenChange])

  return (
    <>
      {/* Floating button to open editor */}
      {!isOpen && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange(true)}
          className="fixed bottom-6 right-6 shadow-lg z-40"
        >
          <IconCode className="w-4 h-4 mr-1" />
          Open Editor
        </Button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <IconCode className="w-5 h-5 text-teal" />
                  <h2 className="text-sm font-semibold text-ink">Code Editor</h2>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="text-xs border border-border rounded px-2 py-1 bg-white text-ink"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-1 text-muted hover:text-ink transition-colors cursor-pointer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Editor */}
              <div className="flex-1 min-h-[50vh]">
                <Editor
                  height="100%"
                  language={language}
                  value={code}
                  onChange={(val) => setCode(val || '')}
                  theme="vs-light"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                  }}
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted">Your code will be saved with the interview transcript.</p>
                <Button size="sm" onClick={handleSubmit}>
                  <IconPlayerPlay className="w-4 h-4 mr-1" />
                  Submit Solution
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
