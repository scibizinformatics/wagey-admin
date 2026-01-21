// src/boot/axios.js
import { boot } from 'quasar/wrappers'
import axios from 'axios'
import { useAuthStore } from 'boot/auth'

// In dev: empty string (proxy handles routing to staging.wageyapp.com)
// In production: /api prefix for same-origin requests
const baseURL = process.env.NODE_ENV === 'production' ? '/api' : '' // Empty in dev - requests like /api/employee/login/ go through proxy

const api = axios.create({ baseURL })

// Add interceptor to automatically include token
api.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
})

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api }
