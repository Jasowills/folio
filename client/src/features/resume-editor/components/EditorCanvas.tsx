import { useRef, useEffect, type ReactNode } from 'react'

interface EditorCanvasProps {
  children: ReactNode
  zoom: number
}

export default function EditorCanvas({ children, zoom }: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    function handleWheel(e: globalThis.WheelEvent) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    }
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [])

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-[#D4CFC6]"
      style={{
        backgroundImage: `
          radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
      }}
    >
      <div
        className="flex justify-center py-12 min-h-full"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
      >
        {children}
      </div>
    </div>
  )
}
