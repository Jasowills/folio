import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useResumes, useCoverLetters, useDeleteCoverLetter } from '../lib/queries'
import { Button } from '../components/ui/button'
import { Select } from '../components/ui/select'
import { IconWand, IconFileText, IconCopy, IconRefresh, IconFileDownload, IconChevronRight, IconX, IconAlertTriangle, IconLoader, IconTrash } from '@tabler/icons-react'

const tones = ['Professional', 'Confident', 'Creative', 'All']

export default function CoverLetter() {
  const { user } = useAuth()
  const { data: resumes } = useResumes()
  const { data: coverLetters, isLoading: lettersLoading } = useCoverLetters()
  const [resumeId, setResumeId] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [tone, setTone] = useState('Professional')
  const [generated, setGenerated] = useState<string | null>(null)
  const [displayedContent, setDisplayedContent] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showLetters, setShowLetters] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [error, setError] = useState('')
  const deleteCoverLetter = useDeleteCoverLetter()

  const editorRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const handleGenerate = useCallback(async () => {
    if (!resumeId || !jobTitle || !company) return
    console.debug('[CoverLetter] generate started', { resumeId, jobTitle, company, tone })
    setGenerated(null)
    setDisplayedContent('')
    setIsConnecting(true)
    setIsStreaming(true)
    setError('')

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    let content = ''
    let streamEnded = false

    try {
      const token = localStorage.getItem('accessToken')
      console.debug('[CoverLetter] sending POST /api/cover-letters/generate')
      const res = await fetch('/api/cover-letters/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          resumeId,
          jobTitle,
          company,
          jobDescription: jobDescription || undefined,
          tone: tone.toLowerCase(),
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error('Generation failed')
      console.debug('[CoverLetter] response OK, opening stream')

      setIsConnecting(false)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let chunkCount = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunkCount++
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const json = line.slice(6).trim()
          if (!json) continue
          try {
            const parsed = JSON.parse(json)
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.text) {
              content += parsed.text
              setDisplayedContent(content)
            }
            if (parsed.done) {
              console.debug('[CoverLetter] stream complete', { totalChunks: chunkCount, totalLength: content.length })
              setGenerated(content)
              setDisplayedContent(content)
              setIsStreaming(false)
              streamEnded = true
            }
          } catch {
            // skip
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('[CoverLetter] generation error', err)
        setError((err as Error)?.message || 'Generation failed')
      } else {
        console.debug('[CoverLetter] generation aborted')
      }
    } finally {
      setIsConnecting(false)
      if (!streamEnded) setIsStreaming(false)
    }
  }, [resumeId, jobTitle, company, jobDescription, tone])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const handleCopy = useCallback(async () => {
    const text = editorRef.current?.innerText || displayedContent
    if (text) {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [displayedContent])

  const handleEdit = useCallback(() => {
    const text = editorRef.current?.innerText || ''
    if (text) {
      setDisplayedContent(text)
      setGenerated(text)
    }
  }, [])

  const handleRegenerate = useCallback(() => {
    handleGenerate()
  }, [handleGenerate])

  const paragraphs = (displayedContent || generated || '')
    .split('\n')
    .filter(Boolean)

  return (
    <div className="page-container h-full flex flex-col">
        <div className="page-header flex items-start justify-between shrink-0">
          <div>
            <h1 className="page-title">Cover Letter</h1>
            <p className="page-subtitle">
              Write a cover letter for the role
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLetters(true)}
          >
            My letters
            <IconChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="flex gap-8 flex-col lg:flex-row flex-1 min-h-0">
          {/* Left Panel — Form */}
          <div className="w-full lg:w-[340px] shrink-0 overflow-y-auto">
            <div className="space-y-5 bg-surface border border-border rounded-xl p-5">
            <p className="text-xs font-semibold text-ink">
              Generate a cover letter
            </p>

            <div className="space-y-4">
              <div>
                <label className="label-uppercase text-muted block mb-1.5">
                  Select resume
                </label>
                <Select
                  value={resumeId}
                  onChange={setResumeId}
                  options={[
                    { value: '', label: 'Choose a resume...' },
                    ...(resumes?.map((r) => ({ value: r._id, label: r.name || r.title || 'Untitled' })) || []),
                  ]}
                  placeholder="Choose a resume..."
                />
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
                  className="input-field min-h-[200px]"
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

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <IconAlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                onClick={handleGenerate}
                disabled={!resumeId || !jobTitle || !company || isStreaming}
                className="w-full"
              >
                {isStreaming ? (
                  <span className="inline-flex items-center gap-2">
                    <IconLoader className="h-4 w-4 animate-spin" />
                    {generated ? 'Regenerating...' : 'Generating...'}
                  </span>
                ) : (
                  <>
                    <IconWand className="h-4 w-4 mr-1.5" />
                    {generated ? 'Regenerate' : 'Generate letter'}
                  </>
                )}
              </Button>
            </div>
            </div>
          </div>

          {/* Right Panel — Document */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            {isConnecting ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <IconLoader className="h-6 w-6 text-teal animate-spin" />
                    <span className="font-display text-2xl text-teal animate-pulse">&amp;</span>
                  </div>
                  <p className="text-sm text-muted">Generating your cover letter...</p>
                  <p className="text-xs text-muted mt-1">Connecting to the AI</p>
                </div>
              </div>
            ) : !displayedContent && !isStreaming ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-xs">
                  <div className="w-14 h-14 rounded-2xl bg-teal-light/50 flex items-center justify-center mx-auto mb-5">
                    <IconFileText className="h-7 w-7 text-teal" />
                  </div>
                  <p className="text-sm font-medium text-ink mb-1">Ready when you are</p>
                  <p className="text-xs text-muted leading-relaxed">
                    Select a resume, fill in the job details, choose a tone, and click generate.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col min-h-[60vh]">
                <div className="flex-1">
                  <div className="max-w-[640px] mx-auto py-8 px-6">
                    <div className="bg-white rounded-xl shadow-lg border border-border/50 p-10 space-y-6">
                      {(() => {
                        const selectedResume = resumes?.find((r) => r._id === resumeId)
                        const candidateName = selectedResume?.name || user?.name || 'Your Name'
                        const candidateEmail = selectedResume?.contact?.email || user?.email || ''
                        return (
                          <>
                            <div>
                              <h2 className="text-lg font-semibold text-ink">{candidateName}</h2>
                              {candidateEmail && <p className="text-sm text-muted">{candidateEmail}</p>}
                            </div>
                            <hr className="border-border" />
                          </>
                        )
                      })()}
                      <div
                        ref={editorRef}
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        onClick={() => !isEditing && setIsEditing(true)}
                        onBlur={() => {
                          handleEdit()
                          setIsEditing(false)
                        }}
                        onInput={handleEdit}
                        className={`text-[14px] leading-relaxed text-ink space-y-4 outline-none ${
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

                <div className="border-t border-border bg-surface px-6 py-3 flex items-center justify-center gap-2 shrink-0">
                  {isStreaming ? (
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <IconLoader className="h-3.5 w-3.5 text-teal animate-spin" />
                      Generating...
                    </div>
                  ) : (
                    <>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted hover:text-ink hover:bg-paper rounded-lg transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <span className="text-teal font-medium">Copied</span>
                    ) : (
                      <>
                        <IconCopy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleRegenerate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted hover:text-ink hover:bg-paper rounded-lg transition-colors cursor-pointer"
                  >
                    <IconRefresh className="h-3.5 w-3.5" />
                    Regenerate
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted hover:text-ink hover:bg-paper rounded-lg transition-colors cursor-pointer"
                  >
                    <IconFileDownload className="h-3.5 w-3.5" />
                    Export PDF
                  </button>
                  </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

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
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[400px] max-w-full bg-surface shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
                <h2 className="text-sm font-semibold text-ink">My letters</h2>
                <button
                  onClick={() => setShowLetters(false)}
                  className="p-1 rounded-lg text-muted hover:text-ink hover:bg-paper transition-colors"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {lettersLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <span className="font-display text-teal text-2xl animate-pulse">&amp;</span>
                  </div>
                ) : !coverLetters || coverLetters.length === 0 ? (
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
                      <div
                        key={letter._id}
                        className="card transition-shadow hover:shadow-sm cursor-pointer"
                        onClick={() => {
                          setJobTitle(letter.jobTitle)
                          setCompany(letter.company)
                          setTone(
                            letter.tone
                              ? letter.tone.charAt(0).toUpperCase() + letter.tone.slice(1)
                              : 'Professional',
                          )
                          setGenerated(letter.content)
                          setDisplayedContent(letter.content)
                          setShowLetters(false)
                        }}
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
                        <div className="border-t border-border mt-3 pt-3 flex justify-end">
                          {confirmDelete === letter._id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted">Delete?</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteCoverLetter.mutate(letter._id)
                                  setConfirmDelete(null)
                                }}
                                className="text-xs font-medium text-danger hover:text-danger/80 transition-colors cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setConfirmDelete(null)
                                }}
                                className="text-xs font-medium text-muted hover:text-ink transition-colors cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setConfirmDelete(letter._id)
                              }}
                              className="p-1 rounded text-muted hover:text-danger hover:bg-danger/5 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <IconTrash className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
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
