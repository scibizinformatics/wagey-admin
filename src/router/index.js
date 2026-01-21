// src/router/index.js
import {
  createRouter,
  createWebHistory,
  createWebHashHistory,
  createMemoryHistory,
} from 'vue-router'
import routes from './routes.js'
import { useAuthStore } from 'src/boot/auth'

const createHistory = process.env.SERVER
  ? createMemoryHistory
  : process.env.VUE_ROUTER_MODE === 'history'
    ? createWebHistory
    : createWebHashHistory

const router = createRouter({
  history: createHistory(process.env.VUE_ROUTER_BASE),
  routes,
  scrollBehavior: () => ({ left: 0, top: 0 }),
})

// 🔐 Global guard for authentication
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
