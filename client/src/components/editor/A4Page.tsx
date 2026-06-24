import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

export function A4Page({ children, className = '' }: Props) {
  return (
    <div className={`w-[210mm] h-[297mm] bg-white shadow-lg rounded-sm p-10 overflow-hidden ${className}`}>
      {children}
    </div>
  )
}
