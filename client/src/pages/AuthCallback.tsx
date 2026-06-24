import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { googleLogin } = useAuth()

  useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace('#', ''))
    const idToken = params.get('id_token')

    if (idToken) {
      googleLogin(idToken)
        .then(() => navigate('/dashboard', { replace: true }))
        .catch(() => navigate('/login?error=auth_failed', { replace: true }))
    } else {
      const error = searchParams.get('error')
      navigate(error ? `/login?error=${error}` : '/login', { replace: true })
    }
  }, [navigate, googleLogin, searchParams])

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center relative">
      <div className="flex flex-col items-center gap-4">
        <span className="font-display text-teal text-7xl" style={{ animation: 'blink 1.5s ease-in-out infinite' }}>&amp;</span>
        <p className="text-xs text-muted">Signing you in...</p>
      </div>
    </div>
  )
}
