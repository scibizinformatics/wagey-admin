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

// Read Django's csrftoken cookie
function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

api.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }

  // Attach CSRF token for all mutating requests
  const method = (config.method || '').toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = getCsrfToken()
    if (csrf) {
      config.headers['X-CSRFToken'] = csrf
    }
  }

  console.log('[axios request]', config.method?.toUpperCase(), config.url, {
    authorization: config.headers.Authorization ? 'present' : 'MISSING',
    tokenPreview: config.headers.Authorization
      ? config.headers.Authorization.slice(0, 30) + '...'
      : null,
  })

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const req = error.config || {}
    const res = error.response || {}
    let dataPreview = res.data
    if (typeof dataPreview === 'string' && dataPreview.length > 200) {
      dataPreview = dataPreview.slice(0, 200) + '...[truncated]'
    }
    console.error('[axios error] status:', res.status, '| url:', req.url, '| method:', req.method, '\ndata:', dataPreview)
    if (res.status === 401) {
      const isLoginRequest = (req.url || '').includes('/api/employee/login/')
      if (!isLoginRequest) {
        console.warn('[axios 401] redirecting to login — triggered by:', req.url)
        const authStore = useAuthStore()
        authStore.clearToken()
        window.location.href = '/#/login'
      }
    }
    return Promise.reject(error)
  },
)

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api }
