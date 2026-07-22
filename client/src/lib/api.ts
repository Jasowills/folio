import axios from 'axios'

let sessionExpiredHandler: (() => void) | null = null

export function onSessionExpired(handler: () => void) {
  sessionExpiredHandler = handler
}

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const { data } = await axios.post(
          `${API_BASE}/auth/refresh`,
          {},
          { withCredentials: true },
        )
        localStorage.setItem('accessToken', data.accessToken || data.data?.accessToken)
        original.headers.Authorization = `Bearer ${localStorage.getItem('accessToken')}`
        return api(original)
      } catch {
        sessionExpiredHandler?.()
        localStorage.removeItem('accessToken')
        setTimeout(() => { window.location.href = '/login' }, 3000)
      }
    }
    return Promise.reject(error)
  },
)

export default api
