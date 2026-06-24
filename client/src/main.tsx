import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import App from './App'
import { ToastProvider, showToast } from './components/ui/toast'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
  mutationCache: new MutationCache({
    onError: (error) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || (error as Error).message
      const isAiError =
        msg?.toLowerCase().includes('ai') ||
        msg?.toLowerCase().includes('rate limit') ||
        msg?.toLowerCase().includes('unavailable') ||
        msg?.toLowerCase().includes('429') ||
        msg?.toLowerCase().includes('503') ||
        msg?.toLowerCase().includes('retry')

      if (isAiError) {
        showToast(
          'error',
          'AI temporarily unavailable',
          'All AI models are currently at capacity. Please try again in a few minutes.',
        )
      }
    },
  }),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
)
