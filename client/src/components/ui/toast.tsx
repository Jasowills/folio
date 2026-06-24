import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import * as RadixToast from '@radix-ui/react-toast'
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-teal" />,
  error: <AlertCircle className="h-4 w-4 text-danger" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber" />,
  info: <Info className="h-4 w-4 text-sky" />,
}

let toastId = 0

let globalAddToast: ((t: Omit<Toast, 'id'>) => void) | null = null

export function showToast(type: ToastType, title: string, description?: string) {
  globalAddToast?.({ type, title, description })
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = String(++toastId)
    setToasts((prev) => [...prev, { ...t, id }])
  }, [])

  useEffect(() => {
    globalAddToast = addToast
    return () => { globalAddToast = null }
  }, [addToast])

  const value: ToastContextValue = {
    toast: addToast,
    success: (title, description) => addToast({ type: 'success', title, description }),
    error: (title, description) => addToast({ type: 'error', title, description }),
    info: (title, description) => addToast({ type: 'info', title, description }),
  }

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider swipeDirection="right" duration={5000}>
        {children}

        {toasts.map((t) => (
          <RadixToast.Root
            key={t.id}
            open
            onOpenChange={(open) => { if (!open) removeToast(t.id) }}
            duration={t.duration ?? 5000}
            className={cn(
              'fixed bottom-4 right-4 z-[999] w-[360px] rounded-lg border bg-white p-4 shadow-lg',
              'radix-state-open:animate-slide-in-right',
              'radix-state-closed:animate-slide-out-right',
              'radix-swipe-end:animate-swipe-out',
              t.type === 'error' && 'border-danger/20',
              t.type === 'success' && 'border-teal/20',
              t.type === 'warning' && 'border-amber/20',
              t.type === 'info' && 'border-sky/20',
            )}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0">{icons[t.type]}</span>
              <div className="flex-1 min-w-0">
                <RadixToast.Title className="text-[13px] font-semibold text-ink">
                  {t.title}
                </RadixToast.Title>
                {t.description && (
                  <RadixToast.Description className="text-[12px] text-muted mt-1 leading-relaxed">
                    {t.description}
                  </RadixToast.Description>
                )}
              </div>
              <RadixToast.Close className="shrink-0 p-0.5 text-muted hover:text-ink transition-colors">
                <X className="h-3.5 w-3.5" />
              </RadixToast.Close>
            </div>
          </RadixToast.Root>
        ))}

        <RadixToast.Viewport className="fixed bottom-0 right-0 z-[999] flex flex-col gap-2 p-4 w-[390px] max-w-full outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
