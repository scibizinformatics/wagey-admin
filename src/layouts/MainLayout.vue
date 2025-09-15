<template>
  <q-layout view="lHh Lpr lFf">
    <div class="header-bar bg-white shadow-2 q-pa-md">
      <div class="row items-center justify-between q-col-gutter-sm">
        <div class="col-12 col-sm-6 row items-center">
          <q-avatar size="36px" class="q-mr-sm" color="primary">
            <img src="/asset/wagey_app_logo1.png" style="width: 24px; height: 24px" />
          </q-avatar>
          <div>
            <div class="text-caption text-grey-7">VEESS Corporation</div>
          </div>
        </div>
        <div class="col-12 col-sm-6 row items-center justify-end q-gutter-sm">
          <span class="text-body2">nanogveloso@gmail.com</span>
          <q-btn flat round icon="notifications" size="sm">
            <q-badge color="red" floating>4</q-badge>
          </q-btn>
          <q-avatar size="32px">
            <q-icon name="person" />
          </q-avatar>
        </div>
      </div>
    </div>

    <q-drawer show-if-above v-model="leftDrawerOpen" side="left" bordered class="modern-sidebar">
      <!-- Sidebar Header -->
      <div class="sidebar-header q-pa-lg">
        <div class="row items-center no-wrap">
          <q-avatar size="40px" class="sidebar-logo">
            <img src="/asset/wagey_app_logo1.png" alt="Wagey Logo" />
          </q-avatar>
          <div class="q-ml-md">
            <div class="sidebar-title">Wagey</div>
          </div>
        </div>
      </div>

      <!-- Navigation Menu -->
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

      <!-- Settings and Logout -->
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

      <!-- Promotional Card -->
      <div class="promo-card-container q-pa-md q-mt-auto">
        <div class="promo-card">
          <div class="promo-icon">
            <q-icon name="workspace_premium" size="32px" color="white" />
          </div>
          <div class="promo-title">Wagey Pro</div>
          <div class="promo-subtitle">Get access to all premium features</div>
          <q-btn class="promo-btn q-mt-md" label="Get Pro" no-caps rounded unelevated />
        </div>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
export default {
  name: 'MainLayout',
  data() {
    return {
      leftDrawerOpen: true,
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
  methods: {
    logout() {
      console.log('Logging out...')
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

.sidebar-logo {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
}

.sidebar-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.025em;
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

/* Promotional Card */
.promo-card-container {
  margin-bottom: 20px;
}

.promo-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  color: white;
  position: relative;
  overflow: hidden;
}

.promo-card::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -30%;
  width: 100px;
  height: 100px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  pointer-events: none;
}

.promo-icon {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.promo-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  letter-spacing: -0.025em;
}

.promo-subtitle {
  font-size: 13px;
  opacity: 0.9;
  line-height: 1.4;
  margin-bottom: 16px;
}

.promo-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-weight: 600;
  padding: 8px 24px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.2s ease;
}

.promo-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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

  .promo-card {
    padding: 20px;
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
