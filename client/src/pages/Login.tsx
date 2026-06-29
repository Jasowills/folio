import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import api from '../lib/api'

const quotes = [
  { text: 'Your resume is not a list of what you did. It is a story of what you made happen.', author: '— &Folio' },
  { text: 'The best time to fix your resume was before you sent it. The second best time is now.', author: '— &Folio' },
  { text: 'Every career is a work in progress. The & is never finished.', author: '— &Folio' },
  { text: 'Recruiters scan for six seconds. Make every word earn its place.', author: '— &Folio' },
  { text: 'Your career story is not what you have done. It is what you are building toward.', author: '— &Folio' },
]

function ResumeIllustration() {
  return (
    <div className="relative w-full max-w-[240px] mx-auto mt-6">
      <div
        className="absolute top-2 left-2 w-full h-full rounded-lg border border-border/20 bg-white/[0.03]"
      />
      <div className="relative rounded-lg border border-white/10 bg-white/[0.06] p-4">
        <div className="h-2 w-16 rounded bg-white/10 mb-3" />
        <div className="space-y-2">
          {[70, 90, 60, 80, 50].map((w, i) => (
            <div
              key={i}
              className="h-1.5 rounded"
              style={{
                width: `${w}%`,
                background: i === 2 ? '#BA7517' : i === 4 ? '#C84242' : '#0F6E56',
                opacity: i === 2 ? 0.4 : i === 4 ? 0.3 : 0.2,
                animation: `pulse-amber ${2 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.8}s`,
              }}
            />
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="h-1.5 w-20 rounded bg-white/5" />
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, emailLogin } = useAuth()
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [googleClientId, setGoogleClientId] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fromGuestResults = searchParams.get('from') === 'results'
  const errorParam = searchParams.get('error')

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    api.get('/auth/google-client-id').then(({ data }) => {
      setGoogleClientId(data.clientId || data.data?.clientId)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % quotes.length)
    }, 7000)
    return () => clearInterval(interval)
  }, [])

  const handleGoogleLogin = () => {
    if (!googleClientId) return
    const redirectUri = `${window.location.origin}/auth/callback`
    const params = new URLSearchParams({
      response_type: 'id_token',
      client_id: googleClientId,
      redirect_uri: redirectUri,
      scope: 'openid email profile',
      nonce: Math.random().toString(36),
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await emailLogin(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Left panel — ink black */}
      <div className="hidden lg:flex w-1/2 bg-ink flex-col p-12 relative overflow-hidden">
        {/* Ghost & watermark */}
        <span className="font-display text-teal text-[200px] font-bold absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.07] pointer-events-none select-none leading-none">
          &amp;
        </span>

        <div className="flex items-center gap-2 relative z-10">
          <span className="font-display text-white text-lg font-bold">Folio</span>
          <span className="font-display text-teal text-2xl font-bold">&amp;</span>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={quoteIndex}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
            >
              <blockquote className="font-display text-h3 text-white leading-snug">
                {quotes[quoteIndex].text}
              </blockquote>
              <p className="font-body text-xs text-muted-light mt-3">{quotes[quoteIndex].author}</p>
            </motion.div>
          </AnimatePresence>

          <ResumeIllustration />
        </div>

        <div className="flex items-center gap-3">
          {quotes.map((_, i) => (
            <button
              key={i}
              onClick={() => setQuoteIndex(i)}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === quoteIndex ? 'w-6 bg-teal' : 'w-1.5 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>

        <p className="font-body text-xs text-muted-light mt-4">
          {fromGuestResults
            ? 'Your results are saved and waiting.'
            : 'Welcome back to Folio &amp;.'}
        </p>
      </div>

      {/* Right panel — white */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="font-display text-ink text-lg font-bold">Folio</span>
            <span className="font-display text-teal text-2xl font-bold">&amp;</span>
          </div>

          <h1 className="font-display text-h2 text-ink mb-1">
            Welcome back.
          </h1>
          <p className="font-body text-sm text-muted mb-8">
            {fromGuestResults
              ? 'Sign in to see your full resume review and start fixing your resume.'
              : 'Sign in to continue.'}
          </p>

          <div className="space-y-6">
            <Button
              variant="ghost"
              size="lg"
              className="w-full text-base bg-white hover:bg-paper-dark border border-border text-ink"
              onClick={handleGoogleLogin}
              disabled={!googleClientId}
              style={{ height: '52px' }}
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>

            {errorParam && (
              <p className="text-xs text-danger text-center bg-danger-light rounded-md py-2">
                {errorParam === 'auth_failed' ? 'Authentication failed. Please try again.' : errorParam}
              </p>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-surface px-3 text-xs text-muted">or sign in with email</span>
              </div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && (
                <p className="text-xs text-danger text-center bg-danger-light rounded-md py-2">{error}</p>
              )}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full text-base"
                disabled={submitting}
                style={{ height: '52px' }}
              >
                {submitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <p className="text-xs text-muted text-center">
              Don't have an account?{' '}
              <Link to="/signup" className="text-teal hover:underline font-medium">Sign up</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
