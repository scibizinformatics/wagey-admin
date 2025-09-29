<template>
  <q-layout view="lHh Lpr lFf">
    <!-- Header -->
    <div class="header-bar bg-white shadow-2 q-pa-md">
      <div class="row items-center justify-between q-col-gutter-sm">
        <div class="col-12 col-sm-6 row items-center"></div>
        <div class="col-12 col-sm-6 row items-center justify-end q-gutter-sm">
          <span class="text-body2">drake.carcellar16@gmail.com</span>
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
    <q-drawer show-if-above v-model="leftDrawerOpen" side="left" bordered class="modern-sidebar">
      <!-- Sidebar Header -->
      <div class="sidebar-header q-pa-lg">
        <div class="row items-center no-wrap">
          <q-avatar size="40px" class="sidebar-logo">
            <img :src="logo" alt="Wagey Logo" />
          </q-avatar>
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
            <q-icon name="business" />
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
              <q-icon :name="link.icon" size="20px" />
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
          <q-item clickable class="nav-item">
            <q-item-section avatar class="nav-icon">
              <q-icon name="settings" size="20px" />
            </q-item-section>
            <q-item-section class="nav-label">Settings</q-item-section>
          </q-item>
          <q-item clickable class="nav-item" @click="logout">
            <q-item-section avatar class="nav-icon">
              <q-icon name="logout" size="20px" />
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
        { label: 'Invite', icon: 'email', to: '/invite' },
        { label: 'Announcement', icon: 'announcement', to: '/announcements' },
        { label: 'Admin Settings', icon: 'settings', to: '/admin-settings' },
      ],
    }
  },

  async mounted() {
    await this.fetchCompanies()
    this.loadSavedCompany() // ✅ ensure company loads AFTER options
  },

  methods: {
    async fetchCompanies() {
      this.loadingCompanies = true
      try {
        const token = localStorage.getItem('authToken')
        const res = await api.get('/user/current-user-companies/', {
          headers: { Authorization: `Bearer ${token}` },
        })
        console.log(res)
        this.companyOptions = res.data.map((company) => ({
          siteId: String(company.company), // ✅ always store as string
          siteName: company.name || company.company_name || `Company ${company.id}`,
        }))

        // Auto-select if only one company
        if (this.companyOptions.length === 1) {
          this.setSelectedCompany(this.companyOptions[0].siteId)
        }
      } catch (err) {
        console.error('❌ Error fetching companies:', err.response?.status, err.message)
        this.$q.notify({
          type: 'negative',
          message: 'Failed to load companies',
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
      this.selectedCompany = String(siteId) // ✅ store as string
      localStorage.setItem('selectedCompany', String(siteId))
      console.log('✅ Selected company saved:', siteId)
    },

    loadSavedCompany() {
      const saved = localStorage.getItem('selectedCompany')
      if (saved) {
        const match = this.companyOptions.find((opt) => String(opt.siteId) === String(saved))
        if (match) {
          this.selectedCompany = String(match.siteId) // ✅ ensures label shows
        }
      }
    },

    logout() {
      localStorage.removeItem('selectedCompany')
      localStorage.removeItem('authToken')
      console.log('👋 Logging out...')
      this.$router.push('/login')
    },
  },
}
</script>

<style scoped>
/* Modern Sidebar Styling */
.modern-sidebar {
  width: 280px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border: none;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* Sidebar Header */
.sidebar-header {
  border-bottom: 1px solid #e2e8f0;
  background: white;
  margin: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.sidebar-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.025em;
}

/* Company Selector Styling */
.company-selector {
  margin: 16px 0;
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
  margin-bottom: 16px;
}

.company-dropdown .q-field__control {
  border-radius: 8px;
}

.company-dropdown .q-field__control:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Navigation Styling */
.sidebar-nav {
  flex: 1;
  padding-top: 8px;
}

.nav-list {
  padding: 0;
}

.nav-item {
  margin-bottom: 4px;
  border-radius: 12px;
  min-height: 48px;
  padding: 12px 16px;
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
  min-width: 40px;
}

.nav-label {
  font-weight: 500;
  font-size: 14px;
  letter-spacing: -0.01em;
}

/* Header bar styling remains the same */
.header-bar {
  z-index: 1001;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .modern-sidebar {
    width: 260px;
  }

  .sidebar-header {
    margin: 12px;
    padding: 16px;
  }

  .company-selector {
    margin: 12px 0;
  }
}

/* Remove default Quasar item styling */
.q-item {
  text-decoration: none !important;
}

.q-item__section--avatar {
  padding-right: 12px;
}
</style>
