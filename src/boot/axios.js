// src/boot/axios.js
import { boot } from 'quasar/wrappers'
import axios from 'axios'
import { useAuthStore } from 'boot/auth'

// Empty baseURL in both dev and production
// Dev: proxy in quasar.config.js handles forwarding /api to staging.wageyapp.com
// Production: nginx/server handles forwarding /api to backend
const baseURL = ''

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
