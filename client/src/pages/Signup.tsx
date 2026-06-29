import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

const quotes = [
  { text: 'Your next role starts with one document.', author: '— &Folio' },
  { text: 'Great resumes don\'t happen by accident.', author: '— &Folio' },
  { text: 'The resume that gets the interview tells the truth — strategically.', author: '— &Folio' },
  { text: 'Every career is a story. Make yours readable.', author: '— &Folio' },
  { text: 'The best time to polish your resume was yesterday. The second best time is now.', author: '— &Folio' },
]

function ResumeIllustration() {
  return (
    <div className="relative w-full max-w-[240px] mx-auto mt-6">
      <div className="absolute top-2 left-2 w-full h-full rounded-lg border border-border/20 bg-white/[0.03]" />
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

export default function Signup() {
  const navigate = useNavigate()
  const { user, signup } = useAuth()
  const [quoteIndex, setQuoteIndex] = useState(0)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % quotes.length)
    }, 7000)
    return () => clearInterval(interval)
  }, [])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setSubmitting(true)
    try {
      await signup(email, password, name)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not create your account. Try again in a moment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Left panel — ink black */}
      <div className="hidden lg:flex w-1/2 bg-ink flex-col p-12 relative overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="font-display text-white text-lg font-bold">Folio</span>
          <span className="font-display text-teal text-2xl font-bold">&amp;</span>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto">
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
          Start building your perfect resume.
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
            Create your account.
          </h1>
          <p className="font-body text-sm text-muted mb-8">
            Get started with your resume in minutes.
          </p>

          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              label="Name"
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
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
              placeholder="At least 6 characters"
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
              {submitting ? 'Creating account...' : 'Create account'}
            </Button>
            <p className="text-xs text-muted text-center">
              Already have an account?{' '}
              <Link to="/login" className="text-teal hover:underline">Sign in</Link>
            </p>
            <p className="text-[10px] text-muted/60 text-center leading-relaxed">
              By creating an account, you agree to our{' '}
              <Link to="/privacy" className="text-teal hover:underline">Privacy Policy</Link>
              {' '}and{' '}
              <Link to="/terms" className="text-teal hover:underline">Terms &amp; Conditions</Link>.
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  )
}