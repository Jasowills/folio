import { useState, useCallback, type DragEvent, type ChangeEvent } from 'react'
import { IconLoader2 } from '@tabler/icons-react'
import { cn } from '../lib/utils'

interface UploadZoneProps {
  onFile: (file: File) => void
  disabled?: boolean
  className?: string
}

export function UploadZone({ onFile, disabled, className }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) return
      const file = e.dataTransfer.files[0]
      if (file) onFile(file)
    },
    [disabled, onFile],
  )

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  if (disabled) {
    return (
      <div className={cn(
        'rounded-xl border-2 border-dashed border-teal/50 bg-teal-light/50 p-8 text-center',
        className,
      )}>
        <IconLoader2 className="mx-auto mb-3 h-7 w-7 text-teal animate-spin" />
        <p className="font-body text-body-lg font-semibold text-ink">
          Uploading resume...
        </p>
        <p className="text-xs text-muted mt-1">
          Processing your file
        </p>
      </div>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative rounded-xl border-2 border-dashed transition-all duration-200 p-8 text-center cursor-pointer bg-surface',
        isDragging
          ? 'border-teal bg-teal-light'
          : 'border-border hover:border-teal/50',
        className,
      )}
      onClick={() => document.getElementById('file-upload')?.click()}
    >
      <div className={cn(
        'transition-transform duration-200',
        isDragging && '-translate-y-1',
      )}>
        <input
          id="file-upload"
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={handleChange}
        />
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`mx-auto mb-3 transition-colors ${isDragging ? 'text-teal' : 'text-muted'}`}
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="12" y2="12" />
          <line x1="15" y1="15" x2="12" y2="12" />
        </svg>
        <p className="font-body text-body-lg font-semibold text-ink">
          Drop your resume here
        </p>
        <p className="text-xs text-muted mt-1">
          We'll analyse it. No account needed.
        </p>
        <div className="mt-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-teal px-4 py-2 rounded-md hover:bg-teal-dark transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Choose file
          </span>
        </div>
        <p className="text-[10px] text-muted-light mt-3">PDF or DOCX · Max 5MB</p>
      </div>
    </div>
  )
}
