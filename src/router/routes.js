import AuthLayout from 'layouts/AuthLayout.vue'
import MainLayout from 'layouts/MainLayout.vue'

const routes = [
  {
    path: '/',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('pages/LoginPage.vue'),
      },
    ],
  },
  {
    path: '/app',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('pages/DashboardPage.vue'),
      },
      {
        path: 'employees',
        name: 'employees',
        component: () => import('pages/EmployeesPage.vue'),
      },
      {
        path: 'employees/invite',
        name: 'invite-employee',
        component: () => import('pages/InvitePage.vue'),
      },
      {
        path: 'attendance',
        name: 'attendance',
        component: () => import('pages/AttendancePage.vue'),
      },
      {
        path: 'schedule',
        name: 'schedule',
        component: () => import('pages/SchedulePage.vue'),
      },
      {
        path: 'requests',
        name: 'requests',
        component: () => import('pages/RequestPage.vue'),
      },
      {
        path: 'swap-requests',
        name: 'swap-requests',
        component: () => import('pages/SwapRequestPage.vue'),
      },
      {
        path: 'payroll',
        name: 'payroll',
        component: () => import('pages/PayrollPage.vue'),
      },
      {
        path: 'announcements',
        name: 'announcements',
        component: () => import('pages/AnnouncementPage.vue'),
      },
      {
        path: 'admin-settings',
        name: 'admin-settings',
        component: () => import('pages/AdminSettingsPage.vue'),
        meta: {
          requiresAuth: true,
          requiresAdminRole: true,
        },
      },
    ],
  },
  // Catch-all for unknown routes — renders the 404 page inside the SPA
  {
    path: '/:pathMatch(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
    name: 'not-found',
  },
]

export default routes
