// src/boot/axios.js
import { boot } from 'quasar/wrappers'
import axios from 'axios'
import { useAuthStore } from 'src/boot/auth' // <-- import your Pinia store

const api = axios.create({ baseURL: 'https://staging.wageyapp.com' })

// Add interceptor to include token automatically
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
