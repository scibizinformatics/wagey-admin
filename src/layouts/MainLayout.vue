<template>
  <q-layout view="lHh Lpr lFf">
    <!-- Header -->
    <div class="header-bar bg-white shadow-2 q-pa-md">
      <div class="row items-center justify-between q-col-gutter-sm">
        <div class="col-12 col-sm-6 row items-center">
          <!-- Mobile menu toggle -->
          <q-btn
            flat
            dense
            round
            icon="menu"
            class="mobile-menu-btn lt-md"
            @click="leftDrawerOpen = !leftDrawerOpen"
          />
        </div>
        <div class="col-12 col-sm-6 row items-center justify-end q-gutter-sm">
          <span class="text-body2 email-text">drake.carcellar16@gmail.com</span>
          <q-btn flat round icon="notifications" size="sm">
            <q-badge color="red" floating>4</q-badge>
          </q-btn>
          <q-avatar size="32px">
            <q-icon name="person" />
          </q-avatar>
        </div>
      </div>
    </div>

    <!-- Sidebar -->
    <q-drawer
      show-if-above
      v-model="leftDrawerOpen"
      side="left"
      bordered
      class="modern-sidebar"
      :width="drawerWidth"
      :breakpoint="768"
    >
      <!-- Sidebar Header -->
      <div class="sidebar-header q-pa-md">
        <div class="row items-center no-wrap">
          <div class="sidebar-logo">
            <img :src="logo" alt="Wagey Logo" />
          </div>
          <div class="q-ml-md">
            <div class="sidebar-title">Wagey</div>
          </div>
        </div>
      </div>

      <!-- Company Selector -->
      <div class="company-selector q-px-md q-pb-md">
        <div class="selector-label q-mb-sm">
          <span class="text-caption text-grey-7">Select Company</span>
        </div>
        <q-select
          v-model="selectedCompany"
          :options="companyOptions"
          option-value="siteId"
          option-label="siteName"
          emit-value
          map-options
          outlined
          dense
          :loading="loadingCompanies"
          placeholder="Choose a company..."
          class="company-dropdown"
          @update:model-value="onCompanyChange"
        >
          <template v-slot:prepend>
            <q-icon name="business" size="19px" />
          </template>
          <template v-slot:no-option>
            <q-item>
              <q-item-section class="text-grey"> No companies available </q-item-section>
            </q-item>
          </template>
        </q-select>
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
            :class="{ 'nav-item-active': $route.path === link.to }"
          >
            <q-item-section avatar class="nav-icon">
              <q-icon :name="link.icon" size="19px" />
            </q-item-section>
            <q-item-section class="nav-label">
              {{ link.label }}
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- Settings & Logout -->
      <div class="sidebar-nav q-px-md q-mt-md">
        <q-list class="nav-list">
          <q-item clickable class="nav-item" @click="logout">
            <q-item-section avatar class="nav-icon">
              <q-icon name="logout" size="19px" />
            </q-item-section>
            <q-item-section class="nav-label">Sign Out</q-item-section>
          </q-item>
        </q-list>
      </div>
    </q-drawer>

    <!-- Page Container -->
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { api } from 'src/boot/axios'
import wageyLogo from 'src/assets/wagey_logo.png'

export default {
  name: 'MainLayout',
  data() {
    return {
      leftDrawerOpen: true,
      selectedCompany: null,
      companyOptions: [],
      logo: wageyLogo,
      loadingCompanies: false,
      links: [
        { label: 'Dashboard', icon: 'dashboard', to: '/dashboard' },
        { label: 'Employees', icon: 'groups', to: '/employees' },
        { label: 'Attendance', icon: 'event_available', to: '/attendance' },
        { label: 'Schedule', icon: 'calendar_month', to: '/schedule' },
        { label: 'Payroll', icon: 'paid', to: '/payroll' },
        { label: 'Requests', icon: 'mark_email_unread', to: '/requests' },
        { label: 'Swap Requests', icon: 'swap_horiz', to: '/swap-requests' },
        { label: 'Cash Advance', icon: 'account_balance_wallet', to: '/cash-advance' },
        { label: 'Invite', icon: 'email', to: '/invite' },
        { label: 'Announcement', icon: 'announcement', to: '/announcements' },
        { label: 'Admin Settings', icon: 'settings', to: '/admin-settings' },
      ],
    }
  },

  computed: {
    drawerWidth() {
      if (this.$q.screen.width < 768) return 243
      if (this.$q.screen.width < 1024) return 223
      if (this.$q.screen.width < 1440) return 243
      return 253
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
        const res = await api.get('/organization/companies/', {
          headers: { Authorization: `Bearer ${token}` },
        })
        console.log('Companies response:', res.data)

        // Handle different response structures more safely
        let companiesData = []

        if (Array.isArray(res.data)) {
          // Response is directly an array
          companiesData = res.data
        } else if (res.data && Array.isArray(res.data.data)) {
          // Response has a 'data' property containing the array
          companiesData = res.data.data
        } else if (res.data && Array.isArray(res.data.results)) {
          // Response has a 'results' property (common in paginated APIs)
          companiesData = res.data.results
        } else if (res.data && typeof res.data === 'object') {
          // Response is a single object, wrap it in an array
          companiesData = [res.data]
        }

        console.log('Extracted companies data:', companiesData)

        if (!Array.isArray(companiesData) || companiesData.length === 0) {
          console.warn('No companies found in response')
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

        console.log('Mapped company options:', this.companyOptions)

        // Auto-select if only one company
        if (this.companyOptions.length === 1) {
          this.setSelectedCompany(this.companyOptions[0].siteId)
        }
      } catch (err) {
        console.error('❌ Error fetching companies:', err.response?.status, err.message)
        console.error('Error details:', err.response?.data)
        console.error('Full error:', err)
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
      console.log('✅ Selected company saved:', siteId)
    },

    loadSavedCompany() {
      const saved = localStorage.getItem('selectedCompany')
      if (saved) {
        const match = this.companyOptions.find((opt) => String(opt.siteId) === String(saved))
        if (match) {
          this.selectedCompany = String(match.siteId)
        }
      }
    },

    logout() {
      localStorage.removeItem('access_token')
      localStorage.removeItem('selectedCompany')
      console.log('👋 Logging out...')
      this.$router.push({ name: 'login' }).then(() => {
        window.location.reload()
      })
    },
  },
}
</script>

<style scoped>
/* Hide Scrollbar Globally */
:deep(*) {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

:deep(*::-webkit-scrollbar) {
  display: none; /* Chrome, Safari, Opera */
}

/* Modern Sidebar Styling */
.modern-sidebar {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border: none;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Sidebar Header */
.sidebar-header {
  border-bottom: 1px solid #e2e8f0;
  background: white;
  margin: 14px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.sidebar-logo {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.sidebar-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.025em;
}

/* Company Selector Styling */
.company-selector {
  margin: 14px 0;
  padding-top: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.selector-label {
  font-weight: 500;
  padding-left: 4px;
}

.company-dropdown {
  background: white;
  border-radius: 8px;
  margin-bottom: 14px;
}

.company-dropdown :deep(.q-field__control) {
  border-radius: 8px;
  min-height: 40px;
}

.company-dropdown :deep(.q-field__native) {
  font-size: 13px;
}

.company-dropdown .q-field__control:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Navigation Styling */
.sidebar-nav {
  flex: 1;
  padding-top: 8px;
  padding-bottom: 16px;
}

.nav-list {
  padding: 0;
}

.nav-item {
  margin-bottom: 4px;
  border-radius: 11px;
  min-height: 44px;
  padding: 10px 14px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  color: #64748b;
}

.nav-item:hover {
  background: rgba(99, 102, 241, 0.08);
  color: #4f46e5;
  transform: translateX(2px);
}

.nav-item-active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.nav-item-active:hover {
  transform: translateX(0);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.nav-icon {
  min-width: 36px;
}

.nav-label {
  font-weight: 500;
  font-size: 13px;
  letter-spacing: -0.01em;
}

/* Header bar styling */
.header-bar {
  z-index: 1001;
}

.mobile-menu-btn {
  display: none;
}

/* Remove default Quasar item styling */
.q-item {
  text-decoration: none !important;
}

.q-item__section--avatar {
  padding-right: 12px;
}

/* Responsive Breakpoints */

/* Mobile: < 768px */
@media (max-width: 767px) {
  .mobile-menu-btn {
    display: inline-flex;
  }

  .modern-sidebar {
    width: 243px;
  }

  .sidebar-header {
    margin: 12px;
    padding: 12px 14px;
  }

  .sidebar-logo {
    width: 32px;
    height: 32px;
  }

  .sidebar-title {
    font-size: 16px;
  }

  .company-selector {
    margin: 12px 0;
    padding: 0 10px;
  }

  .sidebar-nav {
    padding: 0 10px;
  }

  .nav-item {
    min-height: 42px;
    padding: 9px 12px;
    margin-bottom: 3px;
    border-radius: 10px;
  }

  .nav-label {
    font-size: 12.5px;
  }

  .nav-icon {
    min-width: 34px;
  }

  .email-text {
    display: none;
  }

  .header-bar {
    padding: 10px 14px;
  }
}

/* Tablet: 768px - 1023px */
@media (min-width: 768px) and (max-width: 1023px) {
  .modern-sidebar {
    width: 223px;
  }

  .sidebar-header {
    margin: 12px;
    padding: 12px;
  }

  .sidebar-logo {
    width: 34px;
    height: 34px;
  }

  .sidebar-title {
    font-size: 17px;
  }

  .company-selector {
    padding: 0 10px;
    margin: 12px 0;
  }

  .sidebar-nav {
    padding: 0 10px;
  }

  .nav-item {
    min-height: 42px;
    padding: 9px 12px;
    border-radius: 10px;
  }

  .nav-label {
    font-size: 12.5px;
  }

  .nav-icon {
    min-width: 34px;
  }
}

/* Small Desktop: 1024px - 1439px */
@media (min-width: 1024px) and (max-width: 1439px) {
  .modern-sidebar {
    width: 243px;
  }

  .sidebar-header {
    margin: 14px;
    padding: 14px;
  }

  .sidebar-logo {
    width: 36px;
    height: 36px;
  }

  .sidebar-title {
    font-size: 18px;
  }

  .nav-item {
    min-height: 43px;
    padding: 10px 13px;
  }

  .nav-label {
    font-size: 13px;
  }
}

/* Large Desktop: 1440px+ */
@media (min-width: 1440px) {
  .modern-sidebar {
    width: 253px;
  }

  .sidebar-header {
    margin: 14px;
    padding: 16px;
  }

  .sidebar-logo {
    width: 36px;
    height: 36px;
  }

  .sidebar-title {
    font-size: 18px;
  }

  .nav-item {
    min-height: 44px;
    padding: 10px 14px;
  }

  .nav-label {
    font-size: 13px;
  }
}

/* Extra smooth transitions */
@media (prefers-reduced-motion: no-preference) {
  .modern-sidebar,
  .nav-item,
  .company-dropdown {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
}
</style>
