<template>
  <q-layout view="lHh Lpr lFf">
    <!-- Header -->
    <q-header class="header-bar bg-white shadow-2 q-pa-md">
      <div class="row items-center justify-between no-wrap">
        <!-- Mobile menu toggle -->
        <q-btn
          flat
          dense
          round
          icon="menu"
          class="mobile-menu-btn lt-md q-mr-sm"
          @click="leftDrawerOpen = !leftDrawerOpen"
        />

        <!-- Company Tabs -->
        <div class="company-tabs-wrapper row no-wrap q-gutter-sm flex-1">
          <div
            v-for="company in companyOptions"
            :key="company.siteId"
            class="company-tab"
            :class="{ 'company-tab-active': selectedCompany === company.siteId }"
            @click="onCompanyChange(company.siteId)"
          >
            <q-icon name="business" size="14px" class="q-mr-xs" />
            <span>{{ company.siteName }}</span>
          </div>
          <div v-if="loadingCompanies" class="company-tab">
            <q-spinner size="14px" class="q-mr-xs" />
            <span>Loading...</span>
          </div>
        </div>

        <!-- Right side -->
        <div class="row items-center q-gutter-sm q-ml-md">
          <span class="text-body2 email-text" style="color: #000000">
            {{ currentUsername }}
          </span>

          <!-- ── Notifications Button ── -->
          <q-btn flat round dense color="grey-7" class="notification-btn" ref="notifBtn">
            <q-icon name="notifications" size="22px" />
            <q-badge color="red" floating rounded :label="unreadCount" v-if="unreadCount > 0" />
            <q-tooltip>Notifications</q-tooltip>

            <!-- WebSocket connection status dot -->
            <span
              class="ws-status-dot"
              :class="{
                'ws-dot-connected': isConnected,
                'ws-dot-connecting': isConnecting,
                'ws-dot-error': !isConnected && !isConnecting,
              }"
            />

            <q-menu
              v-model="notifModal"
              anchor="bottom right"
              self="top right"
              :offset="[0, 8]"
              class="notif-menu"
              transition-show="jump-down"
              transition-hide="jump-up"
            >
              <q-card class="notif-card">
                <!-- Header -->
                <q-card-section class="notif-header row items-center justify-between q-pb-sm">
                  <div class="row items-center q-gutter-sm">
                    <q-icon name="notifications" size="20px" color="primary" />
                    <span class="notif-title">Notifications</span>
                    <q-badge color="red" rounded :label="unreadCount" v-if="unreadCount > 0" />
                  </div>
                  <div class="row items-center q-gutter-xs">
                    <!-- WS connection indicator -->
                    <q-chip
                      dense
                      :color="isConnected ? 'positive' : isConnecting ? 'warning' : 'negative'"
                      text-color="white"
                      :icon="isConnected ? 'wifi' : isConnecting ? 'sync' : 'wifi_off'"
                      size="sm"
                      class="q-px-sm"
                    >
                      {{ isConnected ? 'Live' : isConnecting ? 'Connecting…' : 'Offline' }}
                    </q-chip>

                    <q-btn
                      flat
                      dense
                      size="sm"
                      label="Mark all read"
                      color="primary"
                      @click="handleMarkAllRead"
                      :loading="isMarkingAsRead"
                      v-if="unreadCount > 0"
                    />
                    <q-btn
                      flat
                      round
                      dense
                      icon="refresh"
                      color="grey-6"
                      @click="requestRefresh"
                      :loading="isInitialLoad"
                    >
                      <q-tooltip>Refresh</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="close"
                      color="grey-6"
                      @click="notifModal = false"
                    />
                  </div>
                </q-card-section>

                <q-separator />

                <!-- Notification List -->
                <q-scroll-area style="height: 380px; width: 380px; max-width: 95vw">
                  <!-- Loading / initial state -->
                  <div
                    v-if="isInitialLoad"
                    class="column items-center justify-center q-py-xl text-grey-5"
                  >
                    <q-spinner color="primary" size="32px" class="q-mb-sm" />
                    <span class="text-body2">Loading notifications...</span>
                  </div>

                  <q-list separator v-else>
                    <q-item
                      v-for="notif in sortedNotifications"
                      :key="notif.id"
                      clickable
                      class="notif-item"
                      :class="{ 'notif-unread': !notif.read }"
                      @click="handleMarkAsRead(notif)"
                    >
                      <q-item-section avatar>
                        <q-avatar :color="notif.iconColor" text-color="white" size="38px">
                          <q-icon :name="notif.icon" size="18px" />
                        </q-avatar>
                      </q-item-section>

                      <q-item-section>
                        <q-item-label class="notif-item-title">{{ notif.title }}</q-item-label>
                        <q-item-label caption class="notif-item-body">{{
                          notif.message
                        }}</q-item-label>
                        <q-item-label caption class="notif-item-time">
                          <q-icon name="schedule" size="11px" class="q-mr-xs" />
                          {{ formatTimeAgo(notif.timestamp) }}
                        </q-item-label>
                      </q-item-section>

                      <q-item-section side top v-if="!notif.read">
                        <q-badge
                          color="blue-5"
                          rounded
                          style="width: 8px; height: 8px; min-width: unset; padding: 0"
                        />
                      </q-item-section>

                      <!-- Priority badge -->
                      <q-item-section side v-if="notif.priority === 'high'">
                        <q-chip dense color="red-1" text-color="red-8" size="xs">Urgent</q-chip>
                      </q-item-section>
                    </q-item>

                    <!-- Empty state -->
                    <div
                      v-if="sortedNotifications.length === 0"
                      class="column items-center justify-center q-py-xl text-grey-5"
                    >
                      <q-icon name="notifications_none" size="48px" class="q-mb-sm" />
                      <span class="text-body2">No notifications yet</span>
                      <span class="text-caption q-mt-xs">
                        {{ isConnected ? "You're all caught up!" : 'Reconnecting…' }}
                      </span>
                    </div>
                  </q-list>
                </q-scroll-area>

                <!-- Footer: reconnect button when offline -->
                <div v-if="!isConnected && !isConnecting" class="notif-footer">
                  <q-btn
                    flat
                    dense
                    color="primary"
                    icon="wifi"
                    label="Reconnect"
                    size="sm"
                    @click="reconnect"
                  />
                </div>
              </q-card>
            </q-menu>
          </q-btn>

          <q-avatar size="36px" class="user-avatar" :style="{ background: avatarColor }">
            <span class="avatar-initials">{{ avatarInitials }}</span>
            <q-tooltip>{{ currentUsername }}</q-tooltip>
          </q-avatar>
        </div>
      </div>
    </q-header>

    <!-- Sidebar Drawer -->
    <q-drawer
      show-if-above
      v-model="leftDrawerOpen"
      side="left"
      bordered
      class="modern-sidebar"
      :width="drawerWidth"
      :mini="isMini"
      :mini-width="68"
      :breakpoint="768"
    >
      <!-- Background image layer -->
      <div class="drawer-bg" :style="{ backgroundImage: `url(${terrainBgUrl})` }"></div>

      <!-- Sidebar Header -->
      <div class="sidebar-header q-pa-lg" :class="{ 'sidebar-header-mini': isMini }">
        <div class="row items-center no-wrap" :class="isMini ? 'justify-center' : ''">
          <div class="sidebar-logo" :class="{ 'sidebar-logo-mini': isMini }">
            <img :src="logo" alt="Wagey Logo" />
          </div>
          <div class="q-ml-md" v-if="!isMini">
            <div class="sidebar-title">Wagey</div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="sidebar-nav q-px-md">
        <q-list class="nav-list">
          <q-item
            v-for="link in links"
            :key="link.label"
            clickable
            tag="router-link"
            :to="link.to"
            class="nav-item"
            :class="{ 'nav-item-active': route.path === link.to, 'nav-item-mini': isMini }"
          >
            <q-item-section avatar class="nav-icon">
              <q-icon :name="link.icon" size="20px" />
            </q-item-section>
            <q-item-section class="nav-label" v-if="!isMini">
              {{ link.label }}
            </q-item-section>
            <q-tooltip
              v-if="isMini"
              anchor="center right"
              self="center left"
              :offset="[12, 0]"
              class="nav-tooltip"
            >
              {{ link.label }}
            </q-tooltip>
          </q-item>
        </q-list>
      </div>

      <!-- Sign Out -->
      <div class="sidebar-nav q-px-md q-mt-md">
        <q-list class="nav-list">
          <q-item clickable class="nav-item" :class="{ 'nav-item-mini': isMini }" @click="logout">
            <q-item-section avatar class="nav-icon">
              <q-icon name="logout" size="20px" />
            </q-item-section>
            <q-item-section class="nav-label" v-if="!isMini"> Sign Out </q-item-section>
            <q-tooltip
              v-if="isMini"
              anchor="center right"
              self="center left"
              :offset="[12, 0]"
              class="nav-tooltip"
            >
              Sign Out
            </q-tooltip>
          </q-item>
        </q-list>
      </div>
    </q-drawer>

    <!-- Half Circle Toggle Button -->
    <div
      class="sidebar-bookmark"
      :class="{ 'sidebar-bookmark-mini': isMini }"
      @click="isMini = !isMini"
    >
      <svg class="bookmark-svg" viewBox="0 0 28 56" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 0 A28 28 0 0 1 0 56 Z" fill="#13283d" />
        <polyline
          points="11,23 17,28 11,33"
          fill="none"
          stroke="white"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <q-tooltip anchor="center right" self="center left" :offset="[10, 0]">
        {{ isMini ? 'Expand sidebar' : 'Collapse sidebar' }}
      </q-tooltip>
    </div>

    <!-- Page Container -->
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'

// ─── Composables ──────────────────────────────────────────────────────────────
import { useOrganization } from '@/composables/page/useOrganization'
import { useNotifications } from '@/composables/useNotifications'

import wageyLogo from 'src/assets/wagey_icon(White).png'
import terrainBg from 'src/assets/terrain.svg'

const $q = useQuasar()
const router = useRouter()
const route = useRoute()

// ─── Static assets ────────────────────────────────────────────────────────────
const logo = wageyLogo
const terrainBgUrl = terrainBg

// ─── Nav links ────────────────────────────────────────────────────────────────
const links = [
  { label: 'Dashboard', icon: 'dashboard', to: '/app' },
  { label: 'Employees', icon: 'groups', to: '/app/employees' },
  { label: 'Attendance', icon: 'event_available', to: '/app/attendance' },
  { label: 'Schedule', icon: 'calendar_month', to: '/app/schedule' },
  { label: 'Payroll', icon: 'paid', to: '/app/payroll' },
  { label: 'Requests', icon: 'mark_email_unread', to: '/app/requests' },
  { label: 'Swap Requests', icon: 'swap_horiz', to: '/app/swap-requests' },
  { label: 'Invite', icon: 'email', to: '/app/employees/invite' },
  { label: 'Announcement', icon: 'announcement', to: '/app/announcements' },
  { label: 'Admin Settings', icon: 'settings', to: '/app/admin-settings' },
]

// ─── UI state ─────────────────────────────────────────────────────────────────
const leftDrawerOpen = ref(true)
const isMini = ref(false)
const notifModal = ref(false)

// ─── Company state ────────────────────────────────────────────────────────────
const selectedCompany = ref(null)
const companyOptions = ref([])
const loadingCompanies = ref(false)

// ─── User state ───────────────────────────────────────────────────────────────
const currentUsername = ref('')

// ─── Notifications (WebSocket-powered) ───────────────────────────────────────
const {
  sortedNotifications,
  unreadCount,
  isInitialLoad,
  isMarkingAsRead,
  isConnected,
  isConnecting,
  markAsRead,
  markAllAsRead,
  requestRefresh,
  reconnect,
  cleanup: cleanupNotifications,
  formatTimeAgo,
} = useNotifications()

// ─── Computed ─────────────────────────────────────────────────────────────────
const avatarInitials = computed(() => {
  const name = currentUsername.value
  if (!name) return '?'
  if (name.includes('@')) return name.slice(0, 2).toUpperCase()
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
})

const avatarColor = computed(() => {
  const name = currentUsername.value || '?'
  const colors = [
    '#667eea',
    '#764ba2',
    '#f093fb',
    '#4facfe',
    '#43e97b',
    '#fa709a',
    '#fee140',
    '#30cfd0',
    '#a18cd1',
    '#fda085',
    '#84fab0',
    '#f6d365',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
})

const drawerWidth = computed(() => {
  const w = $q.screen.width
  if (w < 640) return 260
  if (w < 768) return 268
  if (w < 1024) return 244
  if (w < 1280) return 260
  if (w < 1440) return 268
  return 276
})

// ─── Notification handlers ────────────────────────────────────────────────────
async function handleMarkAsRead(notif) {
  if (notif.read) return
  try {
    await markAsRead(notif.id)
  } catch {
    $q.notify({ type: 'negative', message: 'Could not mark notification as read', position: 'top' })
  }
}

async function handleMarkAllRead() {
  try {
    await markAllAsRead()
    $q.notify({ type: 'positive', message: 'All notifications marked as read', position: 'top' })
  } catch {
    $q.notify({ type: 'negative', message: 'Could not mark all as read', position: 'top' })
  }
}

// ─── Companies ────────────────────────────────────────────────────────────────
const { fetchCompanies: fetchCompaniesFromOrg } = useOrganization()

async function fetchCompanies() {
  loadingCompanies.value = true
  try {
    const companiesData = await fetchCompaniesFromOrg()
    if (!Array.isArray(companiesData) || companiesData.length === 0) {
      $q.notify({
        type: 'warning',
        message: 'No companies found for your account',
        position: 'top',
      })
      return
    }
    companyOptions.value = companiesData.map((company) => ({
      siteId: String(company.id),
      siteName: company.name || `Company ${company.id}`,
    }))
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to load companies',
      position: 'top',
    })
  } finally {
    loadingCompanies.value = false
  }
}

function setSelectedCompany(siteId) {
  selectedCompany.value = String(siteId)
  localStorage.setItem('selectedCompany', String(siteId))
}

function loadSavedCompany() {
  const saved = localStorage.getItem('selectedCompany')
  if (saved) {
    const match = companyOptions.value.find((opt) => String(opt.siteId) === String(saved))
    if (match) {
      selectedCompany.value = String(match.siteId)
      return
    }
  }
  if (companyOptions.value.length > 0) setSelectedCompany(companyOptions.value[0].siteId)
}

function onCompanyChange(siteId) {
  setSelectedCompany(siteId)
  window.location.reload()
}

// ─── Current user ─────────────────────────────────────────────────────────────
async function loadCurrentUser() {
  const cached = localStorage.getItem('cached_username')
  if (cached) currentUsername.value = cached

  try {
    const token = localStorage.getItem('access_token')
    if (!token) return
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload?.email) {
      currentUsername.value = payload.email
      localStorage.setItem('cached_username', payload.email)
    }
  } catch {
    // keep cached value
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
function logout() {
  cleanupNotifications()
  localStorage.removeItem('access_token')
  localStorage.removeItem('selectedCompany')
  localStorage.removeItem('username')
  router.push({ name: 'login' }).then(() => window.location.reload())
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  await fetchCompanies()
  loadSavedCompany()
  reconnect() // Re-connect WS now that companyId is resolved
  loadCurrentUser()
})

onUnmounted(() => {
  cleanupNotifications()
})
</script>

<style>
.modern-sidebar .q-drawer__content {
  background-color: #13283d !important;
}
</style>

<style scoped>
/* Hide Scrollbar */
:deep(*) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
:deep(*::-webkit-scrollbar) {
  display: none;
}

/* ── WebSocket status dot ── */
.ws-status-dot {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: 1px solid white;
}
.ws-dot-connected {
  background: #22c55e;
}
.ws-dot-connecting {
  background: #f59e0b;
  animation: pulse-dot 1.2s infinite;
}
.ws-dot-error {
  background: #ef4444;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

/* Modern Sidebar Styling */
.modern-sidebar {
  border: none;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
}
.modern-sidebar :deep(.q-drawer__content) {
  background-color: #13283d !important;
  position: relative;
}
.drawer-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.15;
  z-index: 0;
  pointer-events: none;
}
.modern-sidebar :deep(.q-drawer__content) > *:not(.drawer-bg) {
  position: relative;
  z-index: 1;
}

/* ── Sidebar Header ── */
.sidebar-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  margin: 18px 10px 10px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  padding: 12px 14px !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.sidebar-header-mini {
  margin: 18px 6px 10px 6px;
  padding: 10px 6px !important;
  display: flex;
  justify-content: center;
}
.sidebar-logo {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.sidebar-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.sidebar-logo-mini {
  width: 36px;
  height: 36px;
}
.sidebar-title {
  font-size: 21px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.025em;
  white-space: nowrap;
}

/* ── Half Circle Toggle ── */
.sidebar-bookmark {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  left: calc(276px - 28px);
  width: 28px;
  height: 56px;
  cursor: pointer;
  z-index: 1100;
  transition: left 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(-3px 0px 5px rgba(0, 0, 0, 0.4));
}
.sidebar-bookmark:not(.sidebar-bookmark-mini) .bookmark-svg {
  transform: scaleX(-1);
}
.sidebar-bookmark-mini {
  left: calc(68px - 1px);
}
.sidebar-bookmark-mini .bookmark-svg {
  transform: scaleX(1);
}
.bookmark-svg {
  width: 100%;
  height: 100%;
  display: block;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.sidebar-bookmark:hover path {
  fill: #1e3f61;
  transition: fill 0.2s ease;
}

/* ── Navigation ── */
.sidebar-nav {
  flex: 1;
  padding: 6px 10px 16px 10px;
}
.nav-list {
  padding: 0;
}
.nav-item {
  margin-bottom: 3px;
  border-radius: 9px;
  min-height: 42px;
  padding: 9px 12px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  color: rgba(255, 255, 255, 0.55);
}
.nav-item-mini {
  justify-content: center;
  padding: 9px 0;
}
.nav-item:hover {
  background: rgba(99, 102, 241, 0.15);
  color: #ffffff;
  transform: translateX(2px);
}
.nav-item-mini:hover {
  transform: translateX(0);
}
.nav-item-active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 3px 10px rgba(102, 126, 234, 0.35);
}
.nav-item-active:hover {
  transform: translateX(0);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
.nav-icon {
  min-width: 34px;
}
.nav-icon :deep(.q-icon) {
  font-size: 18px;
}
.nav-label {
  font-weight: 500;
  font-size: 13px;
  letter-spacing: -0.01em;
  white-space: nowrap;
  color: inherit;
}
.nav-tooltip {
  background: #1e3a55;
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  padding: 5px 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* ── Header ── */
.header-bar {
  z-index: 1001;
}
.company-tabs-wrapper {
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  max-width: 50%;
  flex-shrink: 0;
}
.company-tabs-wrapper::-webkit-scrollbar {
  display: none;
}
.company-tab {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  user-select: none;
}
.company-tab:hover {
  background: #e2e8f0;
  color: #334155;
}
.company-tab-active {
  background: #13283d;
  color: #ffffff;
  border-color: #13283d;
  box-shadow: 0 2px 8px rgba(19, 40, 61, 0.3);
}
.mobile-menu-btn {
  display: none;
}
.q-item {
  text-decoration: none !important;
}
.q-item__section--avatar {
  padding-right: 10px;
}

/* ── Notification Menu ── */
.notif-menu {
  border-radius: 14px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.14) !important;
  overflow: hidden;
}
.notif-card {
  width: 380px;
  max-width: 95vw;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: none;
}
.notif-header {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
.notif-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}
.notif-item {
  padding: 12px 16px;
  transition: background 0.15s ease;
}
.notif-item:hover {
  background: #f1f5f9;
}
.notif-unread {
  background: #eff6ff;
}
.notif-unread:hover {
  background: #dbeafe;
}
.notif-item-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
}
.notif-item-body {
  font-size: 12px;
  color: #475569;
  line-height: 1.4;
}
.notif-item-time {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
  display: flex;
  align-items: center;
}
.notif-footer {
  padding: 8px 16px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: center;
  background: #fafafa;
}

/* ── Responsive ── */
@media (max-width: 639px) {
  .mobile-menu-btn {
    display: inline-flex;
  }
  .sidebar-header {
    margin: 8px;
    padding: 10px 12px !important;
  }
  .sidebar-logo {
    width: 44px;
    height: 44px;
  }
  .sidebar-title {
    font-size: 16px;
  }
  .sidebar-nav {
    padding: 4px 8px 14px 8px;
  }
  .nav-item {
    min-height: 40px;
    padding: 8px 10px;
    margin-bottom: 2px;
    border-radius: 8px;
  }
  .nav-label {
    font-size: 12.5px;
  }
  .nav-icon {
    min-width: 32px;
  }
  .nav-icon :deep(.q-icon) {
    font-size: 17px;
  }
  .header-bar {
    padding: 8px 12px;
  }
  .sidebar-bookmark {
    display: none;
  }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .sidebar-bookmark {
    left: calc(244px - 28px);
  }
  .sidebar-bookmark.sidebar-bookmark-mini {
    left: calc(68px - 1px);
  }
}
@media (min-width: 1024px) and (max-width: 1279px) {
  .sidebar-bookmark {
    left: calc(260px - 28px);
  }
  .sidebar-bookmark.sidebar-bookmark-mini {
    left: calc(68px - 1px);
  }
}
@media (min-width: 1280px) and (max-width: 1439px) {
  .sidebar-bookmark {
    left: calc(268px - 28px);
  }
  .sidebar-bookmark.sidebar-bookmark-mini {
    left: calc(68px - 1px);
  }
}
</style>
