// src/boot/axios.js
import { boot } from 'quasar/wrappers'
import axios from 'axios'
import { useAuthStore } from 'src/boot/auth'

// Dev:  empty string → Quasar proxy handles /api → https://staging.wageyapp.com
// Prod: full origin  → requests go directly to the API server
const baseURL =
  process.env.NODE_ENV === 'production'
    ? process.env.API_BASE_URL || 'https://staging.wageyapp.com'
    : ''

const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      authStore.clearToken()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api }
