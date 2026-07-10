import type { ColumnLayoutProps } from './types'

export default function AsymmetricGridLayout({ header, children, sidebarContent, className = '' }: ColumnLayoutProps) {
  return (
    <div className={className}>
      {header}
      {sidebarContent ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">{children}</div>
          <div className="col-span-1">{sidebarContent}</div>
        </div>
      ) : (
        children
      )}
    </div>
  )
}
