import { useEffect, useRef, useState } from 'react'

const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.js'
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.js'

let loadingPromise: Promise<void> | null = null

function loadPdfJs(): Promise<void> {
  if ((window as any).pdfjsLib?.GlobalWorkerOptions) return Promise.resolve()
  if (!loadingPromise) {
    loadingPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = PDFJS_URL
      s.onload = () => {
        ;(window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL
        resolve()
      }
      s.onerror = () => { loadingPromise = null; reject(new Error('Failed to load PDF.js')) }
      document.head.appendChild(s)
    })
  }
  return loadingPromise
}

export function usePdfPageRenderer(
  fileUrl: string | undefined,
  pageCount: number,
  active: boolean,
) {
  const [pageImages, setPageImages] = useState<(string | null)[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!active || !fileUrl || pageCount === 0) {
      setPageImages([])
      setError(null)
      return
    }

    cancelledRef.current = false
    let c = false

    async function run() {
      setLoading(true)
      setError(null)
      try {
        await loadPdfJs()
        const pdfjsLib = (window as any).pdfjsLib as any
        const pdf = await pdfjsLib.getDocument({ url: fileUrl, useSystemFonts: true }).promise
        const actualPages = Math.min(pdf.numPages, pageCount)
        const images: (string | null)[] = []

        for (let i = 1; i <= actualPages; i++) {
          if (c || cancelledRef.current) return
          const page = await pdf.getPage(i)
          const scale = 96 / 72
          const viewport = page.getViewport({ scale })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          const ctx = canvas.getContext('2d')!
          await page.render({ canvasContext: ctx, viewport }).promise
          images.push(canvas.toDataURL('image/png'))
        }

        if (!c && !cancelledRef.current) setPageImages(images)
      } catch (err: any) {
        if (!c && !cancelledRef.current) setError(err?.message || 'Failed to render PDF')
      } finally {
        if (!c && !cancelledRef.current) setLoading(false)
      }
    }

    run()
    return () => { c = true; cancelledRef.current = true }
  }, [fileUrl, pageCount, active])

  return { pageImages, loading, error }
}
