import MainLayout from 'layouts/MainLayout.vue'
import DashboardPage from 'pages/DashboardPage.vue'
import EmployeesPage from 'pages/EmployeesPage.vue'
import InvitePage from 'pages/InvitePage.vue'
import LoginPage from 'pages/LoginPage.vue'
import RequestPage from 'pages/RequestPage.vue'
import AuthLayout from 'layouts/AuthLayout.vue'

const routes = [
  {
    path: '/',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'login',
        component: LoginPage,
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
        component: DashboardPage,
      },
      {
        path: 'employees',
        name: 'employees',
        component: EmployeesPage,
      },
      {
        path: 'employees/invite',
        name: 'invite-employee',
        component: InvitePage,
      },
      {
        path: 'employees/:id',
        name: 'employee-detail',
        component: () => import('components/EmployeeDetail.vue'),
        props: true,
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
        component: RequestPage,
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
