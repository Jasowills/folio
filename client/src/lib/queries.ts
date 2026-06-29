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
      const { data } = await api.get(`/ats/${id}`)
      return (data.data || data) as AtsResult
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

export function usePortfolioStatus(analysisId: string | null) {
  return useQuery({
    queryKey: ['portfolio', analysisId],
    queryFn: async () => {
      const { data } = await api.get(`/crawler/status/${analysisId}`)
      return (data.data || data) as PortfolioResult
    },
    enabled: !!analysisId,
    refetchInterval: (query) => {
      const result = query.state.data
      if (result?.status === 'completed' || result?.status === 'failed') return false
      return 3000
    },
  })
}
