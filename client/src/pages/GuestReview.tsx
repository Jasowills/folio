import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import GuestResult, { type GuestResultData } from '../components/GuestResult'

export default function GuestReview() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<GuestResultData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<'expired' | 'network' | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!token) {
      setError('expired')
      setLoading(false)
      return
    }

    const abort = new AbortController()

    fetch(`/api/resumes/guest-result/${encodeURIComponent(token)}`, { signal: abort.signal })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error('expired')
          throw new Error('network')
        }
        return res.json()
      })
      .then((json) => {
        if (!mountedRef.current) return
        const d = json.data || json
        setData({
          score: d.score ?? 0,
          title: d.name || 'Resume',
          issues: (d.redFlags || []).map((f: any) => f.message),
          redFlags: d.redFlags || [],
          resumeText: d.rawText || null,
          fileUrl: d.fileUrl || null,
          cloudinaryPublicId: d.cloudinaryPublicId || null,
          detectedRole: d.detectedRole || undefined,
          quality: d.quality || undefined,
          name: d.name || null,
          contact: d.contact || undefined,
          summary: d.summary || null,
          experience: d.experience || undefined,
          education: d.education || undefined,
          skills: d.skills || undefined,
          certifications: d.certifications || undefined,
          languages: d.languages || undefined,
        })
        setLoading(false)
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        if (!mountedRef.current) return
        setError(err.message === 'expired' ? 'expired' : 'network')
        setLoading(false)
      })

    return () => abort.abort()
  }, [token, navigate])

  const handleReset = () => {
    navigate('/', { replace: true })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="font-display text-teal text-6xl" style={{ animation: 'blink 1.5s ease-in-out infinite' }}>&amp;</span>
          <p className="text-sm text-muted">Loading your results...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-4">
        <span className="font-display text-teal text-6xl">&amp;</span>
        <h1 className="font-display text-h3 text-ink">Results not found</h1>
        <p className="text-sm text-muted max-w-sm text-center">
          {error === 'network'
            ? 'Could not connect to the server. Check your connection and try again.'
            : 'This review link has expired or is invalid. Upload your resume again for a fresh analysis.'}
        </p>
        <button
          onClick={handleReset}
          className="text-xs font-medium text-white bg-teal px-4 py-1.5 rounded-md hover:bg-teal-dark transition-colors cursor-pointer"
        >
          Analyse a resume
        </button>
      </div>
    )
  }

  return <GuestResult data={data} onReset={handleReset} />
}
