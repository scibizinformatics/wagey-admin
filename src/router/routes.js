import AuthLayout from 'layouts/AuthLayout.vue'
import MainLayout from 'layouts/MainLayout.vue'
import AdminSettingsPage from 'pages/AdminSettingsPage.vue'

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
    // Declared once on the parent: Vue Router merges `meta` down the matched
    // chain, so this covers every page in the shell including the nested
    // /app/payroll subtree.
    //
    // The guard in router/index.js has always read `to.meta.requiresAuth`, but
    // no route set it, so the condition was permanently false and the guard had
    // never fired. What actually kept the app together was the axios 401
    // interceptor: an unauthenticated visitor to /#/app/employees got the whole
    // admin shell rendered, which then fired its requests, 401'd, and bounced.
    // That means a visible flash of the entire admin UI before the redirect, and
    // real exposure the moment any endpoint answers anonymously — the page will
    // render whatever it is given.
    meta: { requiresAuth: true },
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
        path: 'manning',
        name: 'manning',
        component: () => import('pages/ManningPage.vue'),
      },
      {
        path: 'access-cards',
        name: 'access-cards',
        component: () => import('pages/AccessCardsPage.vue'),
      },
      {
        path: 'card-taps',
        name: 'card-taps',
        component: () => import('pages/CardTapsPage.vue'),
      },
      {
        path: 'requests',
        name: 'requests',
        component: () => import('pages/RequestPage.vue'),
      },
      {
        path: 'payroll',
        component: () => import('pages/Disbursement/DisbursementShell.vue'),
        children: [
          {
            path: '',
            name: 'disbursement-list',
            component: () => import('pages/Disbursement/DisbursementListPage.vue'),
          },
          {
            path: 'review/:id',
            name: 'disbursement-review',
            component: () => import('pages/Disbursement/ReviewPage.vue'),
          },
          {
            path: 'payslips/:id',
            name: 'disbursement-payslips',
            component: () => import('pages/Disbursement/PayslipsPage.vue'),
          },
          {
            path: 'funding/:id',
            name: 'disbursement-funding',
            component: () => import('pages/Disbursement/FundingPage.vue'),
          },
          {
            path: 'disburse/:id',
            name: 'disbursement-disburse',
            component: () => import('pages/Disbursement/DisbursePage.vue'),
          },
          {
            path: 'complete/:id',
            name: 'disbursement-complete',
            component: () => import('pages/Disbursement/CompletePage.vue'),
          },
          // The cash-advance flow is a parallel four-step sequence against the
          // same payout group instance. It lives under `/app/payroll` because it
          // is opened from that page's "Cash advances" view and returns there.
          {
            path: 'cash-advance/:id/review',
            name: 'cash-advance-review',
            component: () => import('pages/Disbursement/CashAdvance/CashAdvanceReviewPage.vue'),
          },
          {
            path: 'cash-advance/:id/funding',
            name: 'cash-advance-funding',
            component: () => import('pages/Disbursement/CashAdvance/CashAdvanceFundingPage.vue'),
          },
          {
            path: 'cash-advance/:id/disburse',
            name: 'cash-advance-disburse',
            component: () => import('pages/Disbursement/CashAdvance/CashAdvanceDisbursePage.vue'),
          },
          {
            path: 'cash-advance/:id/complete',
            name: 'cash-advance-complete',
            component: () => import('pages/Disbursement/CashAdvance/CashAdvanceCompletePage.vue'),
          },
        ],
      },
      {
        path: 'deductions',
        name: 'deductions',
        component: () => import('pages/DeductionsPage.vue'),
      },
      {
        // Allowance types are configured in Admin Settings now. Kept as a
        // redirect so an old bookmark or link still lands on the section that
        // replaced this page.
        path: 'allowances',
        name: 'allowances',
        redirect: { name: 'admin-settings', query: { tab: 'allowances' } },
      },
      {
        path: 'announcements',
        name: 'announcements',
        component: () => import('pages/AnnouncementPage.vue'),
      },
      {
        path: 'admin-settings',
        name: 'admin-settings',
        component: AdminSettingsPage,
      },
      {
        path: 'audit',
        name: 'audit',
        component: () => import('pages/AuditPage.vue'),
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
