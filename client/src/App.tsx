import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef, Component } from 'react'
import { useAuth } from './hooks/useAuth'
import AppShell from './components/layout/AppShell'
import Home from './pages/Home'
import GuestReview from './pages/GuestReview'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import ResumeBuilder from './pages/ResumeBuilder'
import ResumeEditor from './pages/ResumeEditor'
import ResumeReview from './pages/ResumeReview'
import AtsScorer from './pages/AtsScorer'
import CoverLetter from './pages/CoverLetter'
import PortfolioAnalysis from './pages/PortfolioAnalysis'
import ExportResume from './pages/ExportResume'

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <span className="font-display text-teal text-6xl block">&amp;</span>
            <h2 className="font-display text-h3 text-ink mt-4">Unexpected error</h2>
            <p className="text-sm text-muted mt-2 mb-4">This page hit an unexpected error. Try refreshing — your work is saved.</p>
            <button onClick={() => { this.setState({ hasError: false }); window.location.href = '/dashboard' }}
              className="text-sm text-teal hover:underline">Reload</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <span className="font-display text-teal text-6xl" style={{ animation: 'blink 1.5s ease-in-out infinite' }}>&amp;</span>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingFallback />
  if (!user) return <Navigate to="/login" replace />
  return <AppShell>{children}</AppShell>
}

function RouteTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [transitioning, setTransitioning] = useState(false)
  const pathnameRef = useRef(location.pathname)

  if (location.pathname !== pathnameRef.current && !transitioning) {
    pathnameRef.current = location.pathname
    setTransitioning(true)
  }

  useEffect(() => {
    if (transitioning) {
      const timer = setTimeout(() => setTransitioning(false), 400)
      return () => clearTimeout(timer)
    }
  }, [transitioning])

  if (transitioning) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper">
        <span
          className="font-display text-teal text-4xl"
          style={{ animation: 'blink 1.5s ease-in-out infinite' }}
        >
          &amp;
        </span>
      </div>
    )
  }

  return <>{children}</>
}

function AppRoutes() {
  const { fetchUser } = useAuth()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return (
    <ErrorBoundary>
      <RouteTransition>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/review/:token" element={<GuestReview />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/resumes" element={<ProtectedRoute><ResumeBuilder /></ProtectedRoute>} />
          <Route path="/resume/:id" element={<ProtectedRoute><ResumeEditor /></ProtectedRoute>} />
          <Route path="/resume/:id/review" element={<ProtectedRoute><ResumeReview /></ProtectedRoute>} />
          <Route path="/ats" element={<ProtectedRoute><AtsScorer /></ProtectedRoute>} />
          <Route path="/cover-letters" element={<ProtectedRoute><CoverLetter /></ProtectedRoute>} />
          <Route path="/cover-letter/new" element={<ProtectedRoute><CoverLetter /></ProtectedRoute>} />
          <Route path="/portfolio" element={<ProtectedRoute><PortfolioAnalysis /></ProtectedRoute>} />
          <Route path="/export/:resumeId" element={<ProtectedRoute><ExportResume /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RouteTransition>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
