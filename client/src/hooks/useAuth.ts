import { create } from 'zustand'
import api from '../lib/api'

export interface User {
  _id: string
  email: string
  name: string
  picture?: string
  plan?: string
  googleId?: string | null
  hasPassword?: boolean
}

interface AuthState {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  googleLogin: (credential: string) => Promise<void>
  emailLogin: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  fetchUser: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),

  fetchUser: async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      set({ user: null, loading: false })
      return
    }
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data.data || data, loading: false })
    } catch {
      localStorage.removeItem('accessToken')
      set({ user: null, loading: false })
    }
  },

  googleLogin: async (credential: string) => {
    const { data } = await api.post('/auth/google', { credential })
    const token = data.accessToken || data.data?.accessToken
    const user = data.user || data.data?.user || null
    localStorage.setItem('accessToken', token)
    set({ user, loading: false })
  },

  emailLogin: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    const token = data.accessToken || data.data?.accessToken
    const user = data.user || data.data?.user || null
    localStorage.setItem('accessToken', token)
    set({ user, loading: false })
  },

  signup: async (email: string, password: string, name: string) => {
    const { data } = await api.post('/auth/signup', { email, password, name })
    const token = data.accessToken || data.data?.accessToken
    const user = data.user || data.data?.user || null
    localStorage.setItem('accessToken', token)
    set({ user, loading: false })
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      localStorage.removeItem('accessToken')
      set({ user: null })
    }
  },
}))
