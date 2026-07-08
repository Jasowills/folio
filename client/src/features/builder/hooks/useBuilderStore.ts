import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TemplateId } from '../../resume-editor/templates/types'
import { DEFAULT_DESIGN } from '../../../pages/editor/types'
import type {
  BuilderState,
  BuilderSnapshot,
  BuilderStepData,
  BasicsData,
  TargetRoleData,
  ExperienceRole,
  EducationEntry,
  OptionalData,
} from '../types'

interface BuilderActions {
  setResumeId: (id: string) => void
  setTemplate: (id: TemplateId) => void
  setDesign: (design: Partial<typeof DEFAULT_DESIGN>) => void
  goToStep: (n: number) => void
  completeStep: (n: number) => void
  setBasics: (data: BasicsData) => void
  setTargetRole: (data: TargetRoleData) => void
  setSummary: (text: string, accepted: boolean) => void
  addExperience: (role: ExperienceRole) => void
  updateExperienceBullets: (index: number, bullets: string[]) => void
  removeExperience: (index: number) => void
  setEducation: (edu: EducationEntry[]) => void
  setSkills: (skills: string[]) => void
  addSkill: (skill: string) => void
  removeSkill: (skill: string) => void
  setOptional: (data: OptionalData) => void
  setStreamingText: (text: string) => void
  setStreamingSection: (section: 'summary' | 'experience' | null) => void
  setStreamingBullets: (bullets: string[]) => void
  acceptStream: () => void
  // Per-field live updates (no history push — for real-time canvas sync)
  updateBasicsField: (field: keyof BasicsData, value: string) => void
  updateTargetRoleField: (field: keyof TargetRoleData, value: string) => void
  updateEducationField: (index: number, field: keyof EducationEntry, value: string | boolean) => void
  updateOptionalField: (field: keyof OptionalData, value: unknown) => void
  updateExperienceField: (index: number, field: keyof ExperienceRole, value: string | boolean | string[]) => void
  addExperienceEntry: (role: ExperienceRole) => void
  // Summary streaming keys
  setSummaryStreaming: (streaming: boolean) => void
  setSummaryDraft: (text: string) => void
  acceptSummaryDraft: () => void
  // Stale step tracking
  markStaleStep: (step: number) => void
  clearStaleStep: (step: number) => void
  checkStaleDependents: (step: number) => void
  markComplete: () => void
  setDirtyAfterEdit: (dirty: boolean) => void
  hydrate: (state: Partial<BuilderState>) => void
  reset: () => void
  undo: () => void
  redo: () => void
}

type BuilderStore = BuilderState & BuilderActions

const initialStepData: BuilderStepData = {
  basics: null,
  targetRole: null,
  summary: null,
  experience: [],
  education: [],
  skills: [],
  optional: null,
}

const initialState: BuilderState = {
  resumeId: null,
  selectedTemplate: null,
  design: { ...DEFAULT_DESIGN },
  currentStep: 0,
  completedSteps: [],
  stepDependencies: { 1: [], 2: [1], 3: [2], 4: [2], 5: [], 6: [2], 7: [], 8: [1, 2, 3, 4, 5, 6, 7] },
  staleSteps: [],
  stepData: { ...initialStepData },
  isComplete: false,
  streamingSection: null,
  streamingText: '',
  streamingBullets: [],
  summaryStreaming: false,
  summaryDraft: '',
  dirtyAfterEdit: false,
  _history: [],
  _future: [],
}

const MAX_HISTORY = 50

function snapshot(s: BuilderState): BuilderSnapshot {
  return {
    stepData: structuredClone(s.stepData),
    design: { ...s.design },
    selectedTemplate: s.selectedTemplate,
  }
}

function pushHistory(s: BuilderState): Partial<BuilderState> {
  return {
    _history: [...s._history.slice(-(MAX_HISTORY - 1)), snapshot(s)],
    _future: [],
  }
}

export const useBuilderStore = create<BuilderStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setResumeId: (id) => {
        console.log('[builder] setResumeId', id)
        set({ resumeId: id })
      },

      setTemplate: (id) => {
        console.log('[builder] setTemplate', id)
        set((s) => ({ ...pushHistory(s), selectedTemplate: id }))
      },

      setDesign: (partial) => {
        console.log('[builder] setDesign', partial)
        set((s) => ({ ...pushHistory(s), design: { ...s.design, ...partial } }))
      },

      goToStep: (n) =>
        set((s) => ({
          currentStep: n,
          dirtyAfterEdit: false,
          staleSteps: s.staleSteps.filter(st => st !== n),
        })),

      completeStep: (n) =>
        set((s) => {
          const completed = s.completedSteps.includes(n)
            ? s.completedSteps
            : [...s.completedSteps, n]
          const staleSteps = [...s.staleSteps]
          // Check for stale dependents
          const deps = s.stepDependencies
          for (const [dependent, upstreamSteps] of Object.entries(deps)) {
            if (upstreamSteps.includes(n) && completed.includes(Number(dependent))) {
              if (!staleSteps.includes(Number(dependent))) {
                staleSteps.push(Number(dependent))
              }
            }
          }
          return {
            currentStep: Math.min(n + 1, 8),
            completedSteps: completed,
            staleSteps,
          }
        }),

      setBasics: (data) => {
        console.log('[builder] setBasics', data)
        set((s) => ({ ...pushHistory(s), stepData: { ...s.stepData, basics: data } }))
      },

      setTargetRole: (data) => {
        console.log('[builder] setTargetRole', data)
        set((s) => ({ ...pushHistory(s), stepData: { ...s.stepData, targetRole: data } }))
      },

      setSummary: (text, accepted) => {
        console.log('[builder] setSummary', text ? text.slice(0, 60) + '...' : 'empty', accepted)
        set((s) => ({ ...pushHistory(s), stepData: { ...s.stepData, summary: { text, accepted } } }))
      },

      addExperience: (role) => {
        console.log('[builder] addExperience', role.company, role.title)
        set((s) => ({
          ...pushHistory(s),
          stepData: {
            ...s.stepData,
            experience: [...s.stepData.experience, role],
          },
        }))
      },

      updateExperienceBullets: (index, bullets) =>
        set((s) => {
          const exp = [...s.stepData.experience]
          if (exp[index]) exp[index] = { ...exp[index], bullets }
          return { ...pushHistory(s), stepData: { ...s.stepData, experience: exp } }
        }),

      removeExperience: (index) =>
        set((s) => ({
          ...pushHistory(s),
          stepData: {
            ...s.stepData,
            experience: s.stepData.experience.filter((_, i) => i !== index),
          },
        })),

      setEducation: (edu) => {
        console.log('[builder] setEducation', edu.length, 'entries')
        set((s) => ({ ...pushHistory(s), stepData: { ...s.stepData, education: edu } }))
      },

      setSkills: (skills) => {
        console.log('[builder] setSkills', skills)
        set((s) => ({ ...pushHistory(s), stepData: { ...s.stepData, skills } }))
      },

      addSkill: (skill) =>
        set((s) => {
          if (s.stepData.skills.includes(skill)) return s
          return {
            ...pushHistory(s),
            stepData: {
              ...s.stepData,
              skills: [...s.stepData.skills, skill],
            },
          }
        }),

      removeSkill: (skill) =>
        set((s) => ({
          ...pushHistory(s),
          stepData: {
            ...s.stepData,
            skills: s.stepData.skills.filter((sk) => sk !== skill),
          },
        })),

      setOptional: (data) =>
        set((s) => ({ ...pushHistory(s), stepData: { ...s.stepData, optional: data } })),

      setStreamingText: (text) => set({ streamingText: text }),

      setStreamingSection: (section) =>
        set({ streamingSection: section, streamingText: '', streamingBullets: [] }),

      setStreamingBullets: (bullets) => set({ streamingBullets: bullets }),

      // Per-field live updates — no history push for real-time canvas sync
      updateBasicsField: (field, value) =>
        set((s) => ({
          stepData: {
            ...s.stepData,
            basics: { ...(s.stepData.basics || { name: '', headline: '', email: '', phone: '', location: '' }), [field]: value } as BasicsData,
          },
        })),

      updateTargetRoleField: (field, value) =>
        set((s) => ({
          stepData: {
            ...s.stepData,
            targetRole: { ...(s.stepData.targetRole || { role: '', level: '', industry: '' }), [field]: value } as TargetRoleData,
          },
        })),

      updateEducationField: (index, field, value) =>
        set((s) => {
          const edu = [...s.stepData.education]
          if (edu[index]) edu[index] = { ...edu[index], [field]: value as never }
          return { stepData: { ...s.stepData, education: edu } }
        }),

      updateOptionalField: (field, value) =>
        set((s) => ({
          stepData: {
            ...s.stepData,
            optional: { ...(s.stepData.optional || { certifications: false, certificationsData: [], languages: false, languagesData: [], projects: false, projectsData: [], volunteer: false, volunteerData: [], awards: false, awardsData: [] }), [field]: value } as OptionalData,
          },
        })),

      updateExperienceField: (index, field, value) =>
        set((s) => {
          const exp = [...s.stepData.experience]
          if (exp[index]) exp[index] = { ...exp[index], [field]: value as never }
          return { stepData: { ...s.stepData, experience: exp } }
        }),

      addExperienceEntry: (role) =>
        set((s) => ({
          ...pushHistory(s),
          stepData: { ...s.stepData, experience: [...s.stepData.experience, role] },
        })),

      // Summary streaming keys
      setSummaryStreaming: (streaming) => set({ summaryStreaming: streaming }),

      setSummaryDraft: (text) => set({ summaryDraft: text }),

      acceptSummaryDraft: () => {
        const s = get()
        if (s.summaryDraft) {
          set({
            ...pushHistory(s),
            stepData: { ...s.stepData, summary: { text: s.summaryDraft, accepted: true } },
            summaryStreaming: false,
            summaryDraft: '',
          })
        }
      },

      // Stale step tracking
      markStaleStep: (step) =>
        set((s) => {
          if (s.staleSteps.includes(step)) return s
          return { staleSteps: [...s.staleSteps, step] }
        }),

      clearStaleStep: (step) =>
        set((s) => ({ staleSteps: s.staleSteps.filter(st => st !== step) })),

      checkStaleDependents: (step) =>
        set((s) => {
          const newStale: number[] = []
          const deps = s.stepDependencies
          for (const [dependent, upstreamSteps] of Object.entries(deps)) {
            if (upstreamSteps.includes(step) && s.completedSteps.includes(Number(dependent))) {
              newStale.push(Number(dependent))
            }
          }
          if (newStale.length === 0) return s
          return { staleSteps: [...new Set([...s.staleSteps, ...newStale])] }
        }),

      acceptStream: () => {
        const { streamingSection, streamingText, streamingBullets: _sb } = get()
        const s = get()
        if (streamingSection === 'summary') {
          set({
            ...pushHistory(s),
            stepData: {
              ...s.stepData,
              summary: { text: streamingText, accepted: true },
            },
            streamingSection: null,
            streamingText: '',
          })
        }
        set({ streamingSection: null, streamingText: '', streamingBullets: [], summaryStreaming: false, summaryDraft: '' })
      },

      markComplete: () => set({ isComplete: true }),

      setDirtyAfterEdit: (dirty) => set({ dirtyAfterEdit: dirty }),

      hydrate: (partial) => set({ ...partial, _history: [], _future: [] }),

      reset: () => set({ ...initialState, stepData: { ...initialStepData } }),

      undo: () => {
        const s = get()
        const prev = s._history.at(-1)
        if (!prev) return
        console.log('[builder] undo', prev)
        set({
          ...prev,
          _history: s._history.slice(0, -1),
          _future: [...s._future, snapshot(s)],
        })
      },

      redo: () => {
        const s = get()
        const next = s._future.at(-1)
        if (!next) return
        console.log('[builder] redo', next)
        set({
          ...next,
          _history: [...s._history, snapshot(s)],
          _future: s._future.slice(0, -1),
        })
      },
    }),
    {
      name: 'folio-builder',
      partialize: (state) => ({
        resumeId: state.resumeId,
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        stepData: state.stepData,
        isComplete: state.isComplete,
        design: state.design,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as object),
        selectedTemplate: null,
        _history: [],
        _future: [],
      }),
    },
  ),
)
