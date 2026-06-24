import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useResumes, useGenerateCoverLetter, useCoverLetters } from '../lib/queries'
import { Button } from '../components/ui/button'
import { Wand2, FileText, Copy, RefreshCw, FileDown, Save, ChevronRight, X } from 'lucide-react'

const tones = ['Professional', 'Confident', 'Creative']

export default function CoverLetter() {
  const { user } = useAuth()
  const { data: resumes } = useResumes()
  const { data: coverLetters } = useCoverLetters()
  const generateLetter = useGenerateCoverLetter()

  const [resumeId, setResumeId] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [tone, setTone] = useState('Professional')
  const [generated, setGenerated] = useState<string | null>(null)
  const [displayedContent, setDisplayedContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showLetters, setShowLetters] = useState(false)

  const editorRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleGenerate = useCallback(async () => {
    if (!resumeId || !jobTitle || !company) return
    setGenerated(null)
    setDisplayedContent('')
    setIsStreaming(false)
    try {
      const result = await generateLetter.mutateAsync({
        resumeId,
        jobTitle,
        company,
        jobDescription,
        tone: tone.toLowerCase(),
      })
      if (result?.content) {
        setGenerated(result.content)
        setIsStreaming(true)
        let i = 0
        const content = result.content
        const streamChar = () => {
          if (i < content.length) {
            setDisplayedContent(content.slice(0, i + 1))
            i++
            streamRef.current = setTimeout(streamChar, 15 + Math.random() * 20)
          } else {
            setDisplayedContent(content)
            setIsStreaming(false)
          }
        }
        streamChar()
      }
    } catch {
      setIsStreaming(false)
    }
  }, [resumeId, jobTitle, company, jobDescription, tone, generateLetter])

  useEffect(() => {
    return () => {
      if (streamRef.current) clearTimeout(streamRef.current)
    }
  }, [])

  const handleCopy = useCallback(async () => {
    const text = editorRef.current?.innerText || displayedContent
    if (text) await navigator.clipboard.writeText(text)
  }, [displayedContent])

  const handleRegenerate = useCallback(() => {
    handleGenerate()
  }, [handleGenerate])

  const paragraphs = (displayedContent || generated || '')
    .split('\n')
    .filter(Boolean)

  return (
    <div className="page-container h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="page-header flex items-start justify-between">
          <div>
            <h1 className="page-title">Cover Letter</h1>
            <p className="page-subtitle">
              Generate a tailored cover letter for any role
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLetters(true)}
          >
            My letters
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="flex flex-1 gap-8 min-h-0">
          {/* Left Panel — Form */}
          <div className="w-[300px] shrink-0 space-y-5 overflow-y-auto">
            <p className="text-[13px] font-semibold text-ink">
              Generate a cover letter
            </p>

            <div className="space-y-4">
              <div>
                <label className="label-uppercase text-muted block mb-1.5">
                  Select resume
                </label>
                <select
                  value={resumeId}
                  onChange={(e) => setResumeId(e.target.value)}
                  className="input-field"
                >
                  <option value="">Choose a resume...</option>
                  {resumes?.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-uppercase text-muted block mb-1.5">
                  Job title
                </label>
                <input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Senior Product Designer"
                />
              </div>

              <div>
                <label className="label-uppercase text-muted block mb-1.5">
                  Company
                </label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Acme Corp"
                />
              </div>

              <div>
                <label className="label-uppercase text-muted block mb-1.5">
                  Job description
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="input-field"
                  placeholder="Paste the job description to tailor the letter..."
                />
              </div>

              <div>
                <label className="label-uppercase text-muted block mb-1">
                  Tone
                </label>
                <div className="pill-group">
                  {tones.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`pill ${tone === t ? 'pill-active' : 'pill-inactive'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleGenerate}
                disabled={!resumeId || !jobTitle || !company || generateLetter.isPending}
                className="w-full"
              >
                {generateLetter.isPending ? (
                  <span className="font-display text-lg animate-pulse">&amp;</span>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-1.5" />
                    Generate letter
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Panel — Document */}
          <div className="flex-1 flex flex-col min-h-0">
            {!generated && !generateLetter.isPending && !isStreaming ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-border mx-auto mb-4" />
                  <p className="text-sm text-muted">
                    Your cover letter will appear here.
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Fill in the form and click generate.
                  </p>
                </div>
              </div>
            ) : generateLetter.isPending && !isStreaming ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <span className="font-display text-teal text-3xl animate-pulse">&amp;</span>
                  <p className="text-sm text-muted">Writing your cover letter...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto">
                  <div className="max-w-[640px] mx-auto py-8 px-6">
                    <div className="bg-white rounded-xl shadow-lg p-10 space-y-6">
                      {user && (
                        <>
                          <div>
                            <h2 className="text-lg font-semibold text-ink">{user.name}</h2>
                            <p className="text-sm text-muted">{user.email}</p>
                          </div>
                          <hr className="border-border" />
                        </>
                      )}
                      <div
                        ref={editorRef}
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        onClick={() => !isEditing && setIsEditing(true)}
                        onBlur={() => setIsEditing(false)}
                        className={`text-[13px] leading-relaxed text-ink space-y-4 outline-none ${
                          isEditing ? 'ring-1 ring-teal rounded -m-2 p-2' : 'cursor-pointer'
                        }`}
                      >
                        {paragraphs.map((p, i) => (
                          <p key={i}>{p}</p>
                        ))}
                        {isStreaming && (
                          <span className="inline-block w-[2px] h-[1em] bg-teal animate-pulse ml-0.5 align-middle" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fixed toolbar */}
                <div className="border-t border-border bg-surface px-6 py-3 flex items-center justify-center gap-2 shrink-0">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted hover:text-ink hover:bg-paper rounded-lg transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                  <button
                    onClick={handleRegenerate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted hover:text-ink hover:bg-paper rounded-lg transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Regenerate
                  </button>
                  <button
                    onClick={() => {}}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted hover:text-ink hover:bg-paper rounded-lg transition-colors"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    Export PDF
                  </button>
                  <button
                    onClick={() => {}}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted hover:text-ink hover:bg-paper rounded-lg transition-colors"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save to Drive
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Slide-over panel */}
      <AnimatePresence>
        {showLetters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setShowLetters(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[400px] bg-surface shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
                <h2 className="text-sm font-semibold text-ink">My letters</h2>
                <button
                  onClick={() => setShowLetters(false)}
                  className="p-1 rounded-lg text-muted hover:text-ink hover:bg-paper transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {!coverLetters || coverLetters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="empty-state-icon">&amp;</div>
                    <p className="text-sm text-muted">No cover letters yet.</p>
                    <p className="text-xs text-muted mt-1">
                      Generate your first letter above.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...coverLetters].reverse().map((letter) => (
                      <button
                        key={letter._id}
                        onClick={() => {
                          setJobTitle(letter.jobTitle)
                          setCompany(letter.company)
                          setTone(
                            letter.tone.charAt(0).toUpperCase() + letter.tone.slice(1),
                          )
                          setGenerated(letter.content)
                          setDisplayedContent(letter.content)
                          setShowLetters(false)
                        }}
                        className="w-full text-left card hover:bg-paper-dark transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-ink truncate">
                            {letter.jobTitle}
                          </p>
                          <span className="badge badge-teal text-[10px] shrink-0">
                            {letter.tone}
                          </span>
                        </div>
                        <p className="text-xs text-muted">{letter.company}</p>
                        <p className="text-[10px] text-muted mt-2">
                          {new Date(letter.createdAt).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
