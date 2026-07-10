import type { ColumnLayoutProps } from './types'

export default function HeaderBandLayout({ header, children, className = '' }: ColumnLayoutProps) {
  return (
    <div className={className}>
      {header}
      {children}
    </div>
  )
}
