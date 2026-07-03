import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'

export interface Stats {
  resumes: number
  coverLetters: number
  atsScores: number
  portfolioAnalyses: number
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data } = await api.get('/stats')
      return (data.data || data) as Stats
    },
  })
}

interface ResumeContact {
  email?: string
  phone?: string
  location?: string
  linkedin?: string
  website?: string
  github?: string
}

interface ResumeExperience {
  company: string
  title: string
  startDate?: string
  endDate?: string
  current?: boolean
  bullets: string[]
}

interface ResumeEducation {
  institution: string
  degree: string
  field?: string
  startDate?: string
  endDate?: string
  gpa?: string
}

interface ResumeCertification {
  name: string
  issuer?: string
  date?: string
}

export interface Resume {
  _id: string
  title: string
  filename: string
  name?: string
  fileUrl?: string
  cloudinaryPublicId?: string
  rawText?: string
  overallScore?: number
  strengths?: string[]
  sectionScores?: Record<string, number>
  quality?: {
    layoutScore: number
    linksScore: number
    professionalismScore: number
    readabilityScore: number
    overallQuality: number
    strengths: string[]
    issues: string[]
    suggestions: string[]
  }
  redFlags?: Array<{ message: string; reason?: string; severity: 'low' | 'medium' | 'high'; section: string; roleSpecific?: boolean }>
  detectedRole?: { role: string; seniority: string; industries: string[]; confidence: number }
  contact?: ResumeContact
  summary?: string
  experience?: ResumeExperience[]
  education?: ResumeEducation[]
  skills?: string[]
  certifications?: ResumeCertification[]
  languages?: string[]
  links?: Array<{ title: string; url: string }>
  score?: number
  updatedAt: string
  createdAt: string
}

export function useResumes() {
  return useQuery({
    queryKey: ['resumes'],
    queryFn: async () => {
      const { data } = await api.get('/resumes')
      return (data.data || data) as Resume[]
    },
  })
}

export function useUploadResume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/resumes/upload-file', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data.data || data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resumes'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useAnalyzeResume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/resumes/${id}/analyze`)
      return data.data || data
    },
    onSettled: (_data, _err, id) => {
      qc.invalidateQueries({ queryKey: ['resume', id] })
      qc.invalidateQueries({ queryKey: ['resumes'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useReExtractResume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/resumes/${id}/re-extract`)
      return data.data || data
    },
    onSettled: (_data, _err, id) => {
      qc.invalidateQueries({ queryKey: ['resume', id] })
      qc.invalidateQueries({ queryKey: ['resumes'] })
    },
  })
}

export function useCreateResume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/resumes')
      return data.data || data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resumes'] })
    },
  })
}

export function useGuestUploadResume() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/resumes/guest-extract', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data.data || data
    },
  })
}

export function useResume(id: string) {
  return useQuery({
    queryKey: ['resume', id],
    queryFn: async () => {
      const { data } = await api.get(`/resumes/${id}`)
      return (data.data || data) as Resume
    },
    enabled: !!id,
  })
}

export function useUpdateResume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await api.put(`/resumes/${id}`, data)
      return (res.data.data || res.data) as Resume
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['resume', id] })
      qc.invalidateQueries({ queryKey: ['resumes'] })
    },
  })
}

export function useRewriteBullet() {
  return useMutation({
    mutationFn: async ({ resumeId, bullet, context }: { resumeId: string; bullet: string; context?: string }) => {
      const { data } = await api.post(`/resumes/${resumeId}/rewrite-bullet`, { bullet, context })
      return (data.data || data) as { variations: string[] }
    },
  })
}

export function useDeleteResume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/resumes/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resumes'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export interface AtsResult {
  _id: string
  score: number
  jobTitle?: string
  companyName?: string
  matchedKeywords: Array<{ keyword: string; category: string; importance: string }>
  missingKeywords: Array<{ keyword: string; category: string; importance: string }>
  sectionScores: Record<string, number>
  suggestions: string[]
  createdAt: string
}

export function useAtsScore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { resumeId: string; jobDescription?: string; jobUrl?: string }) => {
      const { data } = await api.post('/ats/score', body)
      return (data.data || data) as AtsResult
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ats-history'] })
    },
  })
}

export function useAtsHistory() {
  return useQuery({
    queryKey: ['ats-history'],
    queryFn: async () => {
      const { data } = await api.get('/ats/history')
      return (data.data || data) as AtsResult[]
    },
  })
}

export function useAtsResult(id: string | null) {
  return useQuery({
    queryKey: ['ats-result', id],
    queryFn: async () => {
      console.debug('[AtsResult] fetching', { id })
      const { data } = await api.get(`/ats/${id}`)
      const result = (data.data || data) as AtsResult
      console.debug('[AtsResult] loaded', { id, score: result.score })
      return result
    },
    enabled: !!id,
  })
}

export interface CoverLetter {
  _id: string
  jobTitle: string
  company: string
  content: string
  tone: string
  createdAt: string
}

export function useCoverLetters() {
  return useQuery({
    queryKey: ['cover-letters'],
    queryFn: async () => {
      const { data } = await api.get('/cover-letters')
      return (data.data || data) as CoverLetter[]
    },
  })
}

export function useDeleteCoverLetter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/cover-letters/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cover-letters'] })
    },
  })
}

export function useGenerateCoverLetter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      resumeId: string
      jobTitle: string
      company: string
      jobDescription: string
      tone: string
    }) => {
      const { data } = await api.post('/cover-letters/generate', body)
      return (data.data || data) as CoverLetter
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cover-letters'] })
    },
  })
}

export interface PortfolioResult {
  _id: string
  overallScore: number
  confirmedSkills: string[]
  missingSkills: string[]
  projects: { name: string; description: string; technologies: string[]; url: string }[]
  suggestions: string[]
  status: string
}

export function useAnalyzePortfolio() {
  return useMutation({
    mutationFn: async (body: { resumeId: string; portfolioUrl: string }) => {
      const { data } = await api.post('/crawler/analyze', body)
      return (data.data || data) as { analysisId: string }
    },
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name?: string; email?: string }) => {
      const res = await api.patch('/users/me', data)
      return res.data.data || res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user'] })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await api.post('/users/me/change-password', data)
      return res.data.data || res.data
    },
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.delete('/users/me')
    },
    onSuccess: () => {
      qc.clear()
      localStorage.removeItem('accessToken')
    },
  })
}

// Interview Prep
export interface InterviewSessionData {
  _id: string
  role: string
  level: string
  company?: { name: string; url?: string }
  interviewTypes: string[]
  techStack?: string[]
  includesCoding?: boolean
  difficulty?: string
  plannedDuration: number
  status: 'setup' | 'in_progress' | 'paused' | 'completed' | 'abandoned'
  interviewerPersona?: unknown
  questionPlan?: unknown[]
  startedAt?: string
  endedAt?: string
  actualDuration?: number
  pausesRemaining?: number
  pauseSecondsRemaining?: number
}

export interface InterviewResultsData {
  session: InterviewSessionData
  transcript: { turns: Array<{ speaker: string; text: string; timestamp: number; duration: number }> } | null
  proctoring: { events: unknown[]; integrityScore?: number; summary?: string } | null
  results: {
    overallScore: number
    headline?: string
    dimensionScores?: Array<{ name: string; score: number }>
    confidenceLevel?: string
    perQuestionScores?: Array<{ questionPlanRef: number; score: number; feedback: string; modelAnswer: string }>
    nextSteps?: string[]
  } | null
}

export function useCreateInterviewSession() {
  return useMutation({
    mutationFn: async (data: {
      resumeId: string
      role: string
      level: string
      interviewTypes: string[]
      company?: { name: string; url?: string }
      techStack?: string[]
      includesCoding?: boolean
      difficulty?: string
      plannedDuration: number
    }) => {
      const res = await api.post('/interviews/sessions', data)
      return (res.data.data || res.data) as InterviewSessionData
    },
  })
}

export function useGeneratePersona() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await api.post(`/interviews/sessions/${sessionId}/persona`)
      return res.data.data || res.data
    },
  })
}

export function useStartSession() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await api.post(`/interviews/sessions/${sessionId}/start`)
      return (res.data.data || res.data) as InterviewSessionData
    },
  })
}

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['interview-session', sessionId],
    queryFn: async () => {
      const { data } = await api.get(`/interviews/sessions/${sessionId}`)
      return (data.data || data) as InterviewSessionData
    },
    enabled: !!sessionId,
  })
}

export function useInterviewResults(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['interview-results', sessionId],
    queryFn: async () => {
      const { data } = await api.get(`/interviews/sessions/${sessionId}/results`)
      return (data.data || data) as InterviewResultsData
    },
    enabled: !!sessionId,
  })
}

export function useEndSession() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await api.post(`/interviews/sessions/${sessionId}/end`)
      return (res.data.data || res.data) as InterviewSessionData
    },
  })
}

export function useDeleteInterviewSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await api.delete(`/interviews/sessions/${sessionId}`)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['interview-session'] }) },
  })
}

export function usePortfolioStatus(analysisId: string | null) {
  return useQuery({
    queryKey: ['portfolio', analysisId],
    queryFn: async () => {
      const { data } = await api.get(`/crawler/status/${analysisId}`)
      const raw = data.data || data
      console.debug('[PortfolioStatus] raw response shape', {
        status: raw.status,
        hasMetadata: !!raw.metadata,
        metadataKeys: raw.metadata ? Object.keys(raw.metadata) : [],
        analysisKeys: raw.metadata?.analysis ? Object.keys(raw.metadata.analysis) : [],
        raw,
      })
      const analysis = raw.metadata?.analysis || {}
      return {
        _id: raw._id,
        status: raw.status,
        overallScore: analysis.overallAlignment ?? 0,
        confirmedSkills: analysis.skillsConfirmed ?? [],
        missingSkills: analysis.skillsMissing ?? [],
        projects: analysis.projectsFound ?? [],
        suggestions: analysis.suggestions ?? [],
      } as PortfolioResult
    },
    enabled: !!analysisId,
    refetchInterval: (query) => {
      const result = query.state.data
      if (result?.status === 'completed' || result?.status === 'failed') return false
      return 3000
    },
  })
}

// Company Research
export interface ResearchBrief {
  atAGlance: string
  foundedYear: string | null
  fundingStage: string | null
  teamSizeEstimate: string | null
  headquarters: string | null
  industry: string | null
  companySizeSignal: string | null
  mission: string | null
  values: string[] | null
  whatTheyBuild: string
  roleConnection: string | null
  recentNews: Array<{ headline: string; date: string; sourceUrl: string }>
  interviewStyle: { summary: string; confidenceSource: 'careers_page' | 'inferred' }
  questionsToAsk: Array<{ question: string; rationale: string }>
  redFlags: Array<{ flag: string; source: string }> | null
  salaryRange: { estimate: string; confidence: 'high' | 'medium' | 'low' } | null
}

export interface CrawlPage {
  url: string
  title: string
  text: string
  crawledAt: string
}

export interface CrawlingUrl {
  url: string
  title: string
  startedAt: string
}

export interface ResearchJob {
  _id: string
  companyName: string
  companyUrl?: string
  roleContext?: { roleTitle: string; resumeId?: string }
  status: 'queued' | 'crawling' | 'analysing' | 'completed' | 'failed'
  brief?: ResearchBrief
  crawlData?: {
    pagesVisited: CrawlPage[]
    pageCount: number
    currentlyCrawling?: CrawlingUrl[]
  }
  createdAt: string
  error?: string
  usedGeneralKnowledge?: boolean
}

export function useStartResearch() {
  return useMutation({
    mutationFn: async (body: { companyName: string; companyUrl?: string; roleContext?: { roleTitle: string; resumeId?: string } }) => {
      const { data } = await api.post('/research/analyze', body)
      return (data.data || data) as { analysisId: string; status: string }
    },
  })
}

export function useResearchStatus(analysisId: string | null) {
  return useQuery({
    queryKey: ['research', analysisId],
    queryFn: async () => {
      const { data } = await api.get(`/research/status/${analysisId}`)
      return (data.data || data) as ResearchJob
    },
    enabled: !!analysisId,
    refetchInterval: (query) => {
      const result = query.state.data
      if (result?.status === 'completed' || result?.status === 'failed') return false
      return result?.status === 'crawling' ? 1500 : 3000
    },
  })
}

export function useResearchHistory() {
  return useQuery({
    queryKey: ['research-history'],
    queryFn: async () => {
      const { data } = await api.get('/research/history')
      return (data.data || data) as { jobs: ResearchJob[]; total: number }
    },
  })
}

// ─── Discover Feed ────────────────────────────────────────

export interface DiscoverFeedJob {
  _id: string
  source: string
  sourceId: string
  companyName: string
  companyLogoUrl?: string
  roleTitle: string
  location?: string
  isRemote: boolean
  postedAt: string
  applicationUrl?: string
  descriptionRaw: string
  extractedFields?: {
    requiredSkills?: string[]
    niceToHaveSkills?: string[]
    experienceLevel?: string
    salaryMin?: number | null
    salaryMax?: number | null
    salaryCurrency?: string | null
  }
  isVerified: boolean
  match: {
    atsScore: number
    matchedKeywords: string[]
    missingKeywords: string[]
    sectionScores: Record<string, number>
    matchIntelligenceLine: string
  } | null
  isTracked: boolean
}

export interface DiscoverFeedResponse {
  jobs: DiscoverFeedJob[]
  cursor: string | null
  hasMore: boolean
}

export interface FeedFilters {
  sources?: string[]
  postedWithin?: '24h' | '3d' | 'week'
  minScore?: number
  hasSalary?: boolean
  remoteOnly?: boolean
  excludeApplied?: boolean
  excludeRejected?: boolean
  sort?: 'relevance' | 'newest' | 'salary'
  techRelevance?: 'tech' | 'non-tech' | 'all'
}

export function useDiscoverFeed(filters: FeedFilters, cursor?: string) {
  return useQuery({
    queryKey: ['discover-feed', filters, cursor],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (cursor) params.set('cursor', cursor)
      if (filters.sources?.length) params.set('sources', filters.sources.join(','))
      if (filters.postedWithin) params.set('postedWithin', filters.postedWithin)
      if (filters.minScore !== undefined) params.set('minScore', String(filters.minScore))
      if (filters.hasSalary) params.set('hasSalary', 'true')
      if (filters.remoteOnly) params.set('remoteOnly', 'true')
      if (filters.excludeApplied !== undefined) params.set('excludeApplied', String(filters.excludeApplied))
      if (filters.excludeRejected) params.set('excludeRejected', 'true')
      if (filters.sort) params.set('sort', filters.sort)
      if (filters.techRelevance) params.set('techRelevance', filters.techRelevance)
      const { data } = await api.get(`/discover/feed?${params}`)
      return (data.data || data) as DiscoverFeedResponse
    },
  })
}

export function useDiscoverFeedStats() {
  return useQuery({
    queryKey: ['discover-feed-stats'],
    queryFn: async () => {
      const { data } = await api.get('/discover/feed/stats')
      return (data.data || data) as {
        totalJobs: number
        newSinceVisit: number
        lastCrawledAt: string | null
        sourceStatus: Record<string, any>
      }
    },
  })
}

export interface DiscoverPreferences {
  _id: string
  userId: string
  targetRoles: string[]
  resumeId?: string
  preferredLocations: string[]
  isRemoteOnly: boolean
  experienceLevels: string[]
  minimumMatchScore: number
  excludeApplied: boolean
  excludeRejected: boolean
  emailAlertsEnabled: boolean
  hiddenJobIds: string[]
  enabledSources: string[]
  lastVisitedAt?: string
}

export function useDiscoverPreferences() {
  return useQuery({
    queryKey: ['discover-preferences'],
    queryFn: async () => {
      const { data } = await api.get('/discover/preferences')
      return (data.data || data) as DiscoverPreferences | null
    },
  })
}

export function useUpdateDiscoverPreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<DiscoverPreferences>) => {
      const { data } = await api.post('/discover/preferences', body)
      return data.data || data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discover-preferences'] })
    },
  })
}

export function useHideJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (jobId: string) => {
      await api.post(`/discover/hide/${jobId}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discover-feed'] })
    },
  })
}

// ─── Discover Tracker ─────────────────────────────────────

export interface TrackerJob {
  _id: string
  jobListingId: DiscoverFeedJob
  stage: string
  notes: string
  checklistState: {
    resumeTailored: boolean
    coverLetterGenerated: boolean
    companyResearched: boolean
    interviewPracticed: boolean
    followUpSent: boolean
  }
  activityLog: Array<{ action: string; timestamp: string }>
  trackedAt: string
  appliedAt?: string
  lastActivityAt?: string
  match: {
    atsScore: number
    matchedKeywords: string[]
    missingKeywords: string[]
    sectionScores: Record<string, number>
    matchIntelligenceLine: string
  } | null
}

export interface TrackerStats {
  totalTracked: number
  responseRate: number
  averageMatchScore: number
  ghostedCount: number
}

export function useTracker() {
  return useQuery({
    queryKey: ['tracker'],
    queryFn: async () => {
      const { data } = await api.get('/discover/tracker')
      return (data.data || data) as TrackerJob[]
    },
  })
}

export function useTrackJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { jobListingId?: string; url?: string; description?: string }) => {
      const { data } = await api.post('/discover/tracker', body)
      return data.data || data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracker'] })
      qc.invalidateQueries({ queryKey: ['discover-feed'] })
      qc.invalidateQueries({ queryKey: ['discover-feed-stats'] })
    },
  })
}

export function useUpdateTrackerJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; stage?: string; notes?: string; checklistState?: Record<string, boolean> }) => {
      const { data } = await api.patch(`/discover/tracker/${id}`, body)
      return data.data || data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracker'] })
      qc.invalidateQueries({ queryKey: ['tracker-stats'] })
    },
  })
}

export function useDeleteTrackerJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/discover/tracker/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracker'] })
      qc.invalidateQueries({ queryKey: ['tracker-stats'] })
    },
  })
}

export function useTrackerStats() {
  return useQuery({
    queryKey: ['tracker-stats'],
    queryFn: async () => {
      const { data } = await api.get('/discover/tracker/stats')
      return (data.data || data) as TrackerStats
    },
  })
}
