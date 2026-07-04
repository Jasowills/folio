import { useRef, useEffect, useState } from 'react'
import { cn } from '../../../lib/utils'
import { IconAlertTriangle } from '@tabler/icons-react'

interface PageCountIndicatorProps {
  className?: string
}

export default function PageCountIndicator({ className }: PageCountIndicatorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState(1)
  const [overLimit, setOverLimit] = useState(false)

  useEffect(() => {
    function measure() {
      if (!ref.current) return
      const paperEl = ref.current.closest('[data-paper]') || ref.current
      const height = paperEl.scrollHeight
      const pageHeight = 297 * 3.78
      const count = Math.max(1, Math.ceil(height / pageHeight))
      setPages(count)
      setOverLimit(count > 1)
    }

    measure()
    const observer = new ResizeObserver(measure)
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={cn('flex items-center gap-1', className)}>
      {overLimit && <IconAlertTriangle className="h-3 w-3 text-amber" />}
      <span className={cn(
        'text-[10px] font-medium tabular-nums',
        overLimit ? 'text-amber' : 'text-muted',
      )}>
        {pages} {pages === 1 ? 'page' : 'pages'}
      </span>
    </div>
  )
}
