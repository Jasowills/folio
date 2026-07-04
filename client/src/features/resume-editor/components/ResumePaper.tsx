import type { ReactNode } from 'react'

interface ResumePaperProps {
  children: ReactNode
}

export default function ResumePaper({ children }: ResumePaperProps) {
  return (
    <div className="w-[210mm] min-h-[297mm] bg-white shadow-[0_2px_20px_rgba(0,0,0,0.12)] rounded-sm flex-shrink-0">
      {children}
    </div>
  )
}
