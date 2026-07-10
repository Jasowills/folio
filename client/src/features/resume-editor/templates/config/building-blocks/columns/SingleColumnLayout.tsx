import type { ColumnLayoutProps } from './types'

export default function SingleColumnLayout({ header, children, className = '' }: ColumnLayoutProps) {
  return (
    <div className={className}>
      {header}
      {children}
    </div>
  )
}
