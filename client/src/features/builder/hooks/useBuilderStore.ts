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
  stepData: { ...initialStepData },
  isComplete: false,
  streamingSection: null,
  streamingText: '',
  streamingBullets: [],
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

      goToStep: (n) => set({ currentStep: n, dirtyAfterEdit: false }),

      completeStep: (n) =>
        set((s) => {
          const completed = s.completedSteps.includes(n)
            ? s.completedSteps
            : [...s.completedSteps, n]
          return {
            currentStep: Math.min(n + 1, 8),
            completedSteps: completed,
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
        set({ streamingSection: null, streamingText: '', streamingBullets: [] })
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
