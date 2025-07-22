<template>
  <q-layout view="lHh Lpr lFf">
    <div class="header-bar bg-white shadow-2 q-pa-md">
      <div class="row items-center justify-between q-col-gutter-sm">
        <div class="col-12 col-sm-6 row items-center">
          <q-avatar size="36px" class="q-mr-sm" color="primary">
            <q-icon name="work" size="24px" />
          </q-avatar>
          <div>
            <div class="text-h6 text-weight-bold text-dark">Wagey</div>
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

    <q-drawer
      show-if-above
      v-model="leftDrawerOpen"
      side="left"
      bordered
      class="sidebar-menu q-pa-sm bg-grey-1"
    >
      <q-list>
        <div class="q-mb-md q-mt-sm">
          <q-avatar size="36px" class="q-mr-sm" color="primary">
            <q-icon name="work" size="24px" />
          </q-avatar>
          <span class="text-h6 text-weight-bold">Wagey</span>
        </div>
        <q-item-label header class="text-grey-7 q-mb-xs">VEESS Corporation</q-item-label>
        <q-separator spaced />
        <q-item
          v-for="link in links"
          :key="link.label"
          clickable
          tag="router-link"
          :to="link.to"
          class="sidebar-link"
        >
          <q-item-section avatar><q-icon :name="link.icon" /></q-item-section>
          <q-item-section>{{ link.label }}</q-item-section>
        </q-item>
        <q-separator spaced />
        <q-item clickable class="sidebar-link q-mt-md">
          <q-item-section avatar><q-icon name="settings" /></q-item-section>
          <q-item-section>Settings</q-item-section>
        </q-item>
        <q-item clickable class="sidebar-link" @click="logout">
          <q-item-section avatar><q-icon name="logout" /></q-item-section>
          <q-item-section>Log Out</q-item-section>
        </q-item>
      </q-list>
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
        { label: 'Dashboard', icon: 'dashboard', to: '/app' },
        { label: 'Employees', icon: 'groups', to: '/app/employees' },
        { label: 'Attendance', icon: 'event_available', to: '/app/attendance' },
        { label: 'Schedule', icon: 'calendar_month', to: '/app/schedule' },
        { label: 'Payroll', icon: 'paid', to: '/app/payroll' },
        { label: 'Requests', icon: 'mark_email_unread', to: '/app/requests' },
        { label: 'Admin Settings', icon: 'settings', to: '/app/admin-settings' },
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
.q-toolbar-title {
  font-weight: bold;
}
.sidebar-menu {
  min-width: 220px;
  max-width: 260px;
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #e0e0e0;
}
.sidebar-link {
  border-radius: 8px;
  margin-bottom: 4px;
  font-weight: 500;
}
.sidebar-link.router-link-exact-active {
  background: #e3f2fd;
  color: #1976d2;
}
</style>
