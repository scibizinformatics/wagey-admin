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
            drake.carcellar16@gmail.com
          </span>
          <q-avatar size="32px">
            <q-icon name="person" />
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
      <div class="drawer-bg" :style="{ backgroundImage: `url(${terrainBg})` }"></div>

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
            :class="{ 'nav-item-active': $route.path === link.to, 'nav-item-mini': isMini }"
          >
            <q-item-section avatar class="nav-icon">
              <q-icon :name="link.icon" size="20px" />
            </q-item-section>
            <q-item-section class="nav-label" v-if="!isMini">
              {{ link.label }}
            </q-item-section>

            <!-- Tooltip shown only when collapsed -->
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
        <!-- Half circle: flat on left, curve bulges right -->
        <path d="M0 0 A28 28 0 0 1 0 56 Z" fill="#13283d" />
        <!-- Arrow always points right; CSS scaleX(-1) flips it left when expanded -->
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

<script>
import { api } from 'src/boot/axios'
import wageyLogo from 'src/assets/wagey_icon(White).png'
import terrainBg from 'src/assets/terrain.svg'

export default {
  name: 'MainLayout',
  data() {
    return {
      leftDrawerOpen: true,
      isMini: false, // ← controls collapsed/expanded state
      selectedCompany: null,
      companyOptions: [],
      logo: wageyLogo,
      terrainBg: terrainBg,
      loadingCompanies: false,
      links: [
        { label: 'Dashboard', icon: 'dashboard', to: '/dashboard' },
        { label: 'Employees', icon: 'groups', to: '/employees' },
        { label: 'Attendance', icon: 'event_available', to: '/attendance' },
        { label: 'Schedule', icon: 'calendar_month', to: '/schedule' },
        { label: 'Payroll', icon: 'paid', to: '/payroll' },
        { label: 'Requests', icon: 'mark_email_unread', to: '/requests' },
        { label: 'Swap Requests', icon: 'swap_horiz', to: '/swap-requests' },
        { label: 'Invite', icon: 'email', to: '/invite' },
        { label: 'Announcement', icon: 'announcement', to: '/announcements' },
        { label: 'Admin Settings', icon: 'settings', to: '/admin-settings' },
      ],
    }
  },

  computed: {
    drawerWidth() {
      if (this.$q.screen.width < 640) return 260
      if (this.$q.screen.width < 768) return 268
      if (this.$q.screen.width < 1024) return 244
      if (this.$q.screen.width < 1280) return 260
      if (this.$q.screen.width < 1440) return 268
      return 276
    },
  },

  async mounted() {
    await this.fetchCompanies()
    this.loadSavedCompany()
  },

  methods: {
    async fetchCompanies() {
      this.loadingCompanies = true
      try {
        const token = localStorage.getItem('access_token')
        const res = await api.get('https://staging.wageyapp.com/organization/companies/', {
          headers: { Authorization: `Bearer ${token}` },
        })

        let companiesData = []
        if (Array.isArray(res.data)) companiesData = res.data
        else if (res.data && Array.isArray(res.data.data)) companiesData = res.data.data
        else if (res.data && Array.isArray(res.data.results)) companiesData = res.data.results
        else if (res.data && typeof res.data === 'object') companiesData = [res.data]

        if (!Array.isArray(companiesData) || companiesData.length === 0) {
          this.$q.notify({
            type: 'warning',
            message: 'No companies found for your account',
            position: 'top',
          })
          return
        }

        this.companyOptions = companiesData.map((company) => ({
          siteId: String(company.id),
          siteName: company.name || `Company ${company.id}`,
        }))
      } catch (err) {
        this.$q.notify({
          type: 'negative',
          message: err.response?.data?.message || 'Failed to load companies',
          position: 'top',
        })
      } finally {
        this.loadingCompanies = false
      }
    },

    onCompanyChange(siteId) {
      this.setSelectedCompany(siteId)
      this.$root.$emit('company-changed', siteId)
      window.location.reload()
    },

    setSelectedCompany(siteId) {
      this.selectedCompany = String(siteId)
      localStorage.setItem('selectedCompany', String(siteId))
    },

    loadSavedCompany() {
      const saved = localStorage.getItem('selectedCompany')
      if (saved) {
        const match = this.companyOptions.find((opt) => String(opt.siteId) === String(saved))
        if (match) {
          this.selectedCompany = String(match.siteId)
          return
        }
      }
      if (this.companyOptions.length > 0) {
        this.setSelectedCompany(this.companyOptions[0].siteId)
      }
    },

    logout() {
      localStorage.removeItem('access_token')
      localStorage.removeItem('selectedCompany')
      this.$router.push({ name: 'login' }).then(() => {
        window.location.reload()
      })
    },
  },
}
</script>

<style>
/* Global override for Quasar drawer background */
.modern-sidebar .q-drawer__content {
  background-color: #13283d !important;
}
</style>

<style scoped>
/* Hide Scrollbar Globally */
:deep(*) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
:deep(*::-webkit-scrollbar) {
  display: none;
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

/* Collapsed header: shrink & center */
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

/* Collapsed logo: smaller */
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

/* ── Half Circle Toggle Button ── */
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

/* Expanded: flip SVG so flat edge is on RIGHT, curve bulges LEFT */
.sidebar-bookmark:not(.sidebar-bookmark-mini) .bookmark-svg {
  transform: scaleX(-1);
}

/* Collapsed: normal orientation — flat on left, curve bulges RIGHT (outside sidebar) */
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

/* Center icons when collapsed */
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

/* Tooltip style */
.nav-tooltip {
  background: #1e3a55;
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  padding: 5px 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* ── Header bar ── */
.header-bar {
  z-index: 1001;
}

.company-tabs-wrapper {
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  flex: 1;
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

/* Remove default Quasar item styling */
.q-item {
  text-decoration: none !important;
}

.q-item__section--avatar {
  padding-right: 10px;
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
  .email-text {
    display: none;
  }
  .header-bar {
    padding: 8px 12px;
  }
  .sidebar-bookmark {
    display: none;
  } /* hidden on mobile, use hamburger instead */
}

@media (min-width: 640px) and (max-width: 767px) {
  .mobile-menu-btn {
    display: inline-flex;
  }
  .sidebar-header {
    margin: 9px;
    padding: 11px 13px !important;
  }
  .sidebar-logo {
    width: 48px;
    height: 48px;
  }
  .sidebar-title {
    font-size: 16.5px;
  }
  .nav-item {
    min-height: 41px;
    padding: 8px 11px;
    border-radius: 8px;
  }
  .nav-label {
    font-size: 12.75px;
  }
  .nav-icon {
    min-width: 33px;
  }
  .email-text {
    display: none;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .sidebar-header {
    margin: 9px;
    padding: 10px 12px !important;
  }
  .sidebar-logo {
    width: 48px;
    height: 48px;
  }
  .sidebar-title {
    font-size: 16px;
  }
  .sidebar-nav {
    padding: 5px 8px 15px 8px;
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
  .sidebar-bookmark {
    left: calc(244px - 28px);
  }
  .sidebar-bookmark.sidebar-bookmark-mini {
    left: calc(68px - 1px);
  }
}

@media (min-width: 1024px) and (max-width: 1279px) {
  .sidebar-header {
    margin: 10px;
    padding: 11px 13px !important;
  }
  .sidebar-logo {
    width: 50px;
    height: 50px;
  }
  .sidebar-title {
    font-size: 16.5px;
  }
  .sidebar-nav {
    padding: 5px 9px 16px 9px;
  }
  .nav-item {
    min-height: 41px;
    padding: 8.5px 11px;
  }
  .nav-label {
    font-size: 12.75px;
  }
  .nav-icon {
    min-width: 33px;
  }
  .sidebar-bookmark {
    left: calc(260px - 28px);
  }
  .sidebar-bookmark.sidebar-bookmark-mini {
    left: calc(68px - 1px);
  }
}

@media (min-width: 1280px) and (max-width: 1439px) {
  .sidebar-header {
    margin: 10px;
    padding: 11px 13px !important;
  }
  .sidebar-logo {
    width: 50px;
    height: 50px;
  }
  .sidebar-title {
    font-size: 16.75px;
  }
  .nav-item {
    min-height: 41px;
    padding: 9px 11px;
  }
  .nav-label {
    font-size: 12.85px;
  }
  .sidebar-bookmark {
    left: calc(268px - 28px);
  }
  .sidebar-bookmark.sidebar-bookmark-mini {
    left: calc(68px - 1px);
  }
}

@media (min-width: 1440px) {
  .sidebar-header {
    margin: 10px;
    padding: 12px 14px !important;
  }
  .sidebar-logo {
    width: 52px;
    height: 52px;
  }
  .sidebar-title {
    font-size: 17px;
  }
  .nav-item {
    min-height: 42px;
    padding: 9px 12px;
  }
  .nav-label {
    font-size: 13px;
  }
  .sidebar-bookmark {
    left: calc(276px - 28px);
  }
  .sidebar-bookmark.sidebar-bookmark-mini {
    left: calc(68px - 1px);
  }
}

@media (prefers-reduced-motion: no-preference) {
  .modern-sidebar,
  .nav-item,
  .sidebar-header,
  .sidebar-logo {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
}
</style>
