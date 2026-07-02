import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, Component } from 'react'
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
import Discover from './pages/Discover'
import Research from './pages/Research'
import Settings from './pages/Settings'
import Legal from './pages/Legal'
import InterviewNew from './pages/InterviewNew'
import InterviewPrep from './pages/InterviewPrep'
import InterviewLive from './pages/InterviewLive'
import InterviewResults from './pages/InterviewResults'

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

function AppRoutes() {
  const { fetchUser } = useAuth()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/review/:token" element={<GuestReview />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/privacy" element={<Legal />} />
        <Route path="/terms" element={<Legal />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/resumes" element={<ProtectedRoute><ResumeBuilder /></ProtectedRoute>} />
        <Route path="/resume/:id" element={<ProtectedRoute><ResumeEditor /></ProtectedRoute>} />
        <Route path="/resume/:id/review" element={<ProtectedRoute><ResumeReview /></ProtectedRoute>} />
        <Route path="/ats" element={<ProtectedRoute><AtsScorer /></ProtectedRoute>} />
        <Route path="/cover-letters" element={<ProtectedRoute><CoverLetter /></ProtectedRoute>} />
        <Route path="/cover-letter/new" element={<ProtectedRoute><CoverLetter /></ProtectedRoute>} />
        <Route path="/portfolio" element={<ProtectedRoute><PortfolioAnalysis /></ProtectedRoute>} />
        <Route path="/discover/feed" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
        <Route path="/discover/tracker" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
        <Route path="/discover" element={<Navigate to="/discover/feed" replace />} />
        <Route path="/research" element={<ProtectedRoute><Research /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/interview/new" element={<ProtectedRoute><InterviewNew /></ProtectedRoute>} />
        <Route path="/interview/new/prep" element={<ProtectedRoute><InterviewPrep /></ProtectedRoute>} />
        <Route path="/interview/:sessionId/live" element={<ProtectedRoute><InterviewLive /></ProtectedRoute>} />
        <Route path="/interview/:sessionId/results" element={<ProtectedRoute><InterviewResults /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
