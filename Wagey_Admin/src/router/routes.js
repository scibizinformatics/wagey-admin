import MainLayout from 'layouts/MainLayout.vue'
import DashboardPage from 'pages/DashboardPage.vue'
import EmployeesPage from 'pages/EmployeesPage.vue'
import LoginPage from 'pages/LoginPage.vue'
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
    ],
  },
  // Always leave this as last route for 404 Not Found
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
