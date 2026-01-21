import MainLayout from 'layouts/MainLayout.vue'
import DashboardPage from 'pages/DashboardPage.vue'
import EmployeesPage from 'pages/EmployeesPage.vue'
import InvitePage from 'pages/InvitePage.vue'
import LoginPage from 'pages/LoginPage.vue'
import RequestPage from 'pages/RequestPage.vue'
import AuthLayout from 'layouts/AuthLayout.vue'
import CashAdvanceRequest from 'pages/CashAdvanceRequestPage.vue'

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
        alias: '/dashboard',
      },
      {
        path: 'employees',
        name: 'employees',
        component: EmployeesPage,
        alias: '/employees',
      },
      {
        path: 'employees/invite',
        name: 'invite-employee',
        component: InvitePage,
        alias: '/invite',
      },
      {
        path: 'employees/:id',
        name: 'employee-detail',
        component: () => import('components/EmployeeDetail.vue'),
        props: true,
        alias: '/employees/:id',
      },
      {
        path: 'attendance',
        name: 'attendance',
        component: () => import('pages/AttendancePage.vue'),
        alias: '/attendance',
      },
      {
        path: 'schedule',
        name: 'schedule',
        component: () => import('pages/SchedulePage.vue'),
        alias: '/schedule',
      },
      {
        path: 'requests',
        name: 'requests',
        component: RequestPage,
        alias: '/requests',
      },
      {
        path: 'swap-requests',
        name: 'swap-requests',
        component: () => import('pages/SwapRequestPage.vue'),
        alias: '/swap-requests',
      },
      {
        path: 'payroll',
        name: 'payroll',
        component: () => import('pages/PayrollPage.vue'),
        alias: '/payroll',
      },
      {
        path: 'announcements',
        name: 'announcements',
        component: () => import('pages/AnnouncementPage.vue'),
        alias: '/announcements',
      },
      {
        path: '/cash-advance',
        name: 'cash-advance',
        component: CashAdvanceRequest, // ✅ uses the imported component
        meta: { requiresAuth: true },
      },

      {
        path: 'admin-settings',
        name: 'admin-settings',
        component: () => import('pages/AdminSettingsPage.vue'),
        alias: '/admin-settings',
        meta: {
          requiresAuth: true,
          requiresAdminRole: true,
        },
      },
    ],
  },
]

export default routes
