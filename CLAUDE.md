# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Wagey Web Admin: a Quasar 2 / Vue 3 SPA (JavaScript, not TypeScript) that is the admin dashboard for the Wagey payroll/HR product. It talks to a separate Django REST backend (`staging.wageyapp.com` by default) for auth, employees, attendance, scheduling, leave requests, payroll/disbursement, and admin settings.

## Commands

```bash
npm install          # postinstall runs `quasar prepare`
npm run dev           # quasar dev — dev server with hot reload + API proxy
npm run start          # webpack serve directly (rarely needed; `npm run dev` is the normal entry point)
npm run lint          # eslint over src*/**/*.{js,cjs,mjs,vue}
npm run format         # prettier --write across the repo
npm run build          # quasar build -> dist/spa
npm run serve:prod     # build then serve dist/spa via server.js (PORT env, default 8000)
```

Note: README.md's "serve the production build" section says `npm run build && PORT=8000 npm start` — that's stale/wrong, `npm start` just runs webpack serve. The actual prod-serve command is `npm run serve:prod` (or `npm run build && node server.js`).

There is no real test suite (`npm test` is a no-op placeholder) — do not assume Jest/Vitest config exists.

Docker: `docker compose -f docker-compose.prod.yml up --build -d` builds and serves on port 8000 via `server.js` (a hand-rolled static file server with SPA fallback, not `quasar serve`).

Deployment to the remote host is via Fabric (`fabfile.py`, Python — needs the `venv`/`requirements.txt` at repo root), not part of the JS app; only touch it if asked about deploys.

## Architecture

**Build tooling**: this project uses `@quasar/app-webpack` (Webpack), not Vite. `.env` is *not* auto-loaded — the `VITE_WS_URL` value inside `.env` itself is ignored at runtime. Runtime config (`API_BASE_URL`, `VITE_WS_URL` fallback) is baked in at build time via `webpack.DefinePlugin` in `quasar.config.js`, keyed off `process.env.*` read at build time on the host machine — set real env vars, don't edit `.env`. `VITE_WS_URL` itself is a live, wired-up feature, not dead weight: `src/composables/useWebSocket.js` (reconnect-with-backoff WS client) reads it, and `src/composables/useNotifications.js` builds on that to connect to `ws/notifications/?token=...&company=...`, consumed by `MainLayout.vue` and `DashboardPage.vue`. `devServer.proxy` has a matching `/ws/notifications` context entry (with `ws: true`) alongside the HTTP prefixes.

**Path aliases**: `@/*` maps to `src/*` (see `jsconfig.json` / webpack alias in `quasar.config.js`). Quasar's own conventions also make `boot/`, `pages/`, `layouts/`, `components/`, `stores/`, `css/`, `assets/` resolvable as bare specifiers, and the codebase also imports many things via the equivalent `src/...` path (e.g. `src/boot/axios`, `src/composables/page/useCompany`) — both styles appear interchangeably, follow whichever the surrounding file already uses.

**Routing** (`src/router/`): hash-mode history by default (`vueRouterMode: 'hash'` in `quasar.config.js`; only switches to real history mode if `VUE_ROUTER_BASE`/`VUE_ROUTER_MODE=history` env vars are set). `router/index.js` has a global `beforeEach` guard that redirects to `login` when `to.meta.requiresAuth` is falsy-checked, but no route in `router/routes.js` currently sets `meta.requiresAuth` — the guard is effectively inert today; don't assume routes are protected without checking.

Top-level route groups:
- `/` (`AuthLayout`) → login
- `/app` (`MainLayout`) → dashboard, employees, `employees/invite` (`InvitePage.vue`, backed by `useInvites.js`), attendance, schedule, requests, deductions, announcements, admin-settings, and a nested `/app/payroll` subtree (`DisbursementShell.vue` + child pages: list, review/:id, payslips/:id, funding/:id, disburse/:id, complete/:id)

`src/pages/PayrollPage.vue` and `src/pages/IndexPage.vue` (Quasar scaffold default) are not referenced by any route in `routes.js` — dead code left over from before the `pages/Disbursement/*` subtree existed; don't treat either as live.

**Boot sequence** (`quasar.config.js` → `boot: ['pinia', 'auth', 'axios', 'suppressExtensionErrors']`) is order-sensitive: Pinia must init before `auth`, and the auth store must exist before `axios`'s interceptors can read it.

**Auth store naming gotcha**: `useAuthStore` is defined in `src/boot/auth.js` (its top-of-file comment still says `src/stores/auth.js`, which does not exist). Always import it as `import { useAuthStore } from 'src/boot/auth'`.

**API layer** (`src/boot/axios.js`): a single shared `api` axios instance. Its request interceptor attaches `Authorization: Bearer <token>` from the Pinia auth store and a Django `X-CSRFToken` header (read from the `csrftoken` cookie) on mutating requests; its response interceptor clears auth and hard-redirects to `/#/login` on any 401 (except the login call itself). Always `import { api } from 'boot/axios'` (or `src/boot/axios`) for new network calls. `src/composables/utils/http.js` re-exports `api` plus deprecated `BASE`/`authHeaders` kept only for legacy callers — several existing composables (e.g. `useEmployees.js`) still import `BASE` for URL-building; don't propagate that pattern into new code, but don't be surprised to see it.

**Dev proxy** (`quasar.config.js` → `devServer.proxy`): forwards specific path prefixes (`/api`, `/user`, `/organization`, `/communication`, `/attendance`, `/cash_advance`, `/contracts`, `/access`, `/admin`, and an explicit allowlist of `/payroll/<subpath>` routes) to `API_BASE_URL`. The `/payroll` allowlist is deliberately narrow so it doesn't swallow the SPA's own `/app/payroll` client route. When wiring up a new backend endpoint under an existing prefix, no config change is needed; a genuinely new top-level prefix needs a new proxy `context` entry here or `npm run dev` requests to it will 404.

**State management**: Pinia is used sparingly for small persisted/global state (`stores/company.js` for the active company + company list, `boot/auth.js` for the auth store) — both mirror their own state into `localStorage` and rehydrate from it on init. Most feature data-fetching and mutation logic instead lives in `composables/page/*.js`, one composable per feature area (`useEmployees`, `useAttendance`, `useSchedule`, `useRequests`, `usePayroll`, `useDeductions`, `useAnnouncements`, `useInvites`, `useAuth`, `useOrganization`, `useDashboardSummary`, `useRolesAndPositions`, `useSwapRequests`, `useEmployeeBalances` (leave/CTO balance grants, backing the Employees page's leave/CTO balance-assignment modals), etc.), each exposing refs + async functions directly rather than going through a store. Several of these (see `useEmployees.js`) implement their own module-level cache keyed by `companyId` with a TTL and in-flight request de-duplication, plus an `invalidateCache()` called after mutations — follow that shape when adding fetch logic to a composable rather than introducing a new caching mechanism.

Besides `composables/page/`, there are three other composable directories: `composables/admin/` (see below), `composables/disbursement/` (see below), and `composables/payroll/` (currently just `usePayoutData.js`, a thin wrapper around `useDisbursementApi().fetchPayoutGroupInstances`). `composables/utils/` holds `http.js` plus small helpers (`timezone.js`, `format.js`, `locale.js`, `statusColors.js`). `composables/useWebSocket.js` and `composables/useNotifications.js` live at the top level of `composables/` (not under `page/`) — see the WebSocket note above.

**Multi-tenancy**: nearly every API call is scoped by the active company. Resolve it via `useCompany()` (`composables/page/useCompany.js`, backed by `useCompanyStore`) before building request URLs. Users can belong to multiple companies, switchable via tabs in `MainLayout.vue`'s header.

**Admin-settings composables** (`composables/admin/*.js`): one composable per admin sub-resource (departments, positions, roles, shifts, sites, cost centers, contracts + contract types, payroll groups, department policies), each following the same list/create/update/delete shape and mostly re-exported together from `composables/admin/index.js` — but this isn't exhaustive, e.g. `useAdminCostCenters.js` is currently missing from that barrel and consumers import it directly. Check the barrel before assuming a composable is exported from it.

**Disbursement (payroll) subsystem** is mid-migration from stubbed to real data, coordinated by `composables/disbursement/useDisbursementFeatureFlags.js` — a reactive singleton (`flags` object, one boolean per Disbursement sub-page: list/review/payslips/funding/disburse/complete) with a `migrationProgress` computed. Check/set these flags to know or change whether a given `pages/Disbursement/*.vue` page should call `useDisbursementApi.js` (real endpoints) or `stubData.js` (mock data).

**Component organization**: page-specific components live under `components/pages/<PageName>/` mirroring the corresponding `pages/<PageName>Page.vue` (e.g. `components/pages/Employees/EmployeeAddModal.vue` for `pages/EmployeesPage.vue`). Shared, page-agnostic pieces live in `components/common/` (e.g. `DataTable.vue`, `KpiCard.vue`, `StatusPill.vue`) and `components/layout/` (`PageShell.vue`). The payroll/Disbursement subtree breaks the mirroring rule: pages live at `pages/Disbursement/*.vue`, but their components live under `components/pages/Payroll/` (not `components/pages/Disbursement/`), e.g. `PayrollStatsCards.vue`, `PayoutTable.vue`, `PayoutProgressStepper.vue`, `DisbursementMigrationBadge.vue`.

**Toasts / notifications**: Quasar's `Notify` UI is *not* used. `src/boot/toast.js` replaces both `Notify.create` and the shared `$q.notify` reference with the queue in `src/composables/useToast.js`, rendered by `src/components/common/AppToast.vue` (teleported to `<body>`, mounted once in `src/App.vue`). Every toast is top-center — the `position` option that existing call sites pass is deliberately ignored. The ~270 legacy `$q.notify({ type, message, caption, icon, timeout })` calls keep working through that shim (`positive/negative/warning/info/ongoing` map to `success/error/warning/info/loading`); new code should `import { useToast } from 'src/composables/useToast'` and call `toast.success(...)` / `.error(...)` / `.warning(...)` / `.info(...)` / `.loading(...)` instead. Repeated identical messages collapse onto one card with a counter, hovering the stack pauses every countdown, and at most four cards stay on screen.

**Unused Quasar scaffolding**: `quasar.config.js` also configures `ssr`, `pwa`, `cordova`, `capacitor`, `electron`, and `bex` targets (`src-electron/` exists on disk), but the app is actually built and shipped as a plain web SPA — via `dist/spa`, `server.js`, `Dockerfile`, and `docker-compose.prod.yml`. Don't assume the other targets are maintained or wired up unless a task specifically asks about them.
