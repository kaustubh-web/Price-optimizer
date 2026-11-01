import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { TooltipProvider } from './components/ui/Tooltip'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The free-tier backend can take a while to wake up; retry before showing an error.
      retry: 2,
      retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <App />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
)
