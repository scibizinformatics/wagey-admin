# AGENTS.md

Wagey Web Admin: Quasar 2 / **Vue 3 JavaScript** (no TypeScript) SPA that is the admin
dashboard for the Wagey payroll/HR product. Talks to a Django REST backend
(`staging.wageyapp.com` by default). Built with `@quasar/app-webpack` (**Webpack, not Vite**).

This file is the fast bootstrap. `CLAUDE.md` holds the long-form architecture narrative — read it
before deep work, but note it **predates the newest features** (see "Newer than CLAUDE.md" below).

## Commands

```bash
npm install            # postinstall runs `quasar prepare`
npm run dev            # quasar dev — hot reload + API proxy (normal entry point)
npm run lint           # eslint over ./src*/**/*.{js,cjs,mjs,vue}
npx eslint src/pages/AttendancePage.vue   # lint a single file
npm run format         # prettier --write
npm run build          # quasar build -> dist/spa
npm run serve:prod     # build then serve dist/spa via server.js (PORT, default 8000)
npm run start          # webpack serve — NOT production serving, despite README
npm test               # no-op; there is no test suite
docker compose -f docker-compose.prod.yml up --build -d   # serves on 8000 via server.js
```

- **Lint is a build gate.** `quasar.config.js` sets `eslint: { warnings: true, errors: true }`, so
  `eslint-webpack-plugin` runs inside both `npm run dev` and `npm run build`; a lint *error* fails
  the build and shows in the dev overlay. `npm run lint` just gets the result faster.
- ESLint 9 flat config is `eslint.config.js`. The legacy root `.eslintrc.js` is ignored (lint passes
  `-c ./eslint.config.js`) — editing it changes nothing.
- No test framework exists. Verify changes with `npm run lint` (and a dev-server check if UI).

## Env / build-time config

- `@quasar/app-webpack` does **not** auto-load `.env`. `API_BASE_URL` and `VITE_WS_URL` are baked in
  at **build time** via `webpack.DefinePlugin`, read from real `process.env.*` on the build machine.
  Editing `.env` (or `.env.example`) changes nothing — set real env vars, or edit the fallback in
  `quasar.config.js`. `.env.example` is the committed reference; `.env` is git-ignored.

## Architecture essentials

- Hash-mode router (`vueRouterMode: 'hash'`). `@/*` -> `src/*`; bare `boot/`, `pages/`, `layouts/`,
  `components/`, `stores/` also resolve, and both `src/...` and bare styles appear in the codebase.
- **Auth store lives in `src/boot/auth.js`, not `src/stores/`.** Import as
  `import { useAuthStore } from 'src/boot/auth'`. Its `state()` runs during boot before mount and
  **must not throw** — a throw there stops the app from booting with no UI left to log out.
- Boot order is load-bearing (`quasar.config.js`): pinia -> auth -> axios -> toast -> errorHandler
  -> suppressExtensionErrors -> dialogA11y. Pinia before auth, auth before axios's interceptors.
- Adding a route to `src/router/routes.js` does **not** add a sidebar entry. The nav groups in
  `MainLayout.vue` are a hand-maintained array. Every route component is lazy `() => import(...)`
  except `AdminSettingsPage`, which is statically imported.
- Superseded/dead modules remain on disk: grep for importers (`grep -rl ComponentName src`) before
  treating a file as current. Known dead: nine `components/pages/Dashboard/*.vue` panels,
  `composables/disbursement/stubData.js`, `composables/payroll/usePayoutData.js`,
  `composables/page/useSwapRequests.js`, `constants/payoutSteps.js`, `composables/admin/index.js`,
  `pages/IndexPage.vue`, `src/index.template.html`. `src/services/` is empty — leave it empty.

## Networking / auth

- Always `import { api } from 'boot/axios'`. The request interceptor attaches the bearer token and
  CSRF header; it is the **only** thing that authenticates a request. Never read the token from
  `localStorage`/`sessionStorage` — use `useAuthStore().token`.
- 401 is recoverable: the interceptor refreshes once (shared across a parallel wave) and replays;
  only a failed refresh ends the session, and that teardown must do a real page reload.
- Scope every request by the active company via `useCompany().companyId` (a **computed**, not a
  snapshot). Re-resolve per request; verify the response's company matches before publishing.
- Errors: `extractErrorMessage(error, fallback)` from `composables/utils/http.js` — no hand-rolled
  `data.detail || ...` chains. Where a status is genuinely an answer (e.g. 404 = "nothing yet"),
  pass `expectedStatuses: [404]` to keep the error log quiet.

## Data-fetching conventions

- Pinia is only for small persisted global state (`stores/company.js`, `boot/auth.js`). Feature data
  lives in `composables/page/*.js`, exposing refs + async fns directly, often with a
  `companyId`-keyed module cache + TTL + `invalidateCache()` (see `useEmployees.js`).
- Guard stale responses: take a token from `createRequestToken()` and check `isCurrent(token)`
  before committing (attendance/schedule/deductions/requests). `usePayroll.js` uses a per-key
  `AbortController` where cancelling is worth it.
- Bulk writes decide one record at a time: use `Promise.allSettled` (or per-item try/catch), count
  outcomes, **always refetch**, and emit three distinct messages (all / some / none). Never one
  `try/catch` around a loop, and never bare `Promise.all` for writes (it is fine for parallel reads).
  Reference: `Disbursement/ReviewPage.vue`, `RequestPage.vue`'s `bulkDecideOvertime`.
- Feature derivations live in `composables/utils/*.js` (or a feature-local module, e.g.
  `components/pages/Announcement/announcementStatus.js`) so table, card list and tiles cannot
  disagree. Extend the module, don't compute in the component.

## UI conventions

- **Toasts: no `$q.notify` call sites remain.** Use `import { useToast } from 'src/composables/useToast'`
  and `toast.success/.error/.warning/.info/.loading(...)`. Do not add `$q.notify` back.
- Calendar dates: use `composables/utils/calendarDate.js` (`todayIso()`, `toIso`, `fromIso`,
  `shiftIso`) — not `toISOString().slice(0,10)` and not `new Date('2026-09-02')` parsing.
- localStorage: use `composables/utils/storage.js` (`readStoredJson`/`writeStored`) so the literal
  string `"undefined"` cannot throw.
- Design system is `src/css/dashboard.scss` (global via `app.scss`): `--dash-*` tokens, `dash-modal`
  dialog chrome, `dash-qtable` tables, `PageShell.vue`. Reach for the tokens, not the legacy SCSS
  `$primary`/`$gray-*`. Do **not** build dialogs as HTML strings (`$q.dialog({ html: true })`) —
  use a component.
- Charts: `echarts` + `vue-echarts` only. PDF export: `jspdf` + `jspdf-autotable`.
- Production build strips `console.log/debug/trace` but **keeps** `console.warn`/`console.error`
  (the app ships no error reporting). Use `.warn`/`.error` for anything a person should still see.

## Naming / structure drift

- `pages/Disbursement/*` is reached at `/app/payroll`, but its components live under
  `components/pages/Payroll/`. `DeductionsPage.vue` renders a page titled **Contributions**
  (helpers in `composables/utils/contributions.js`). Search both names.
- Page-specific components: `components/pages/<PageName>/`. Shared: `components/common/`
  (`StatusPill.vue`, `TableSkeleton.vue`, `AppToast.vue`) and `components/layout/PageShell.vue`.

## Newer than CLAUDE.md

These are live and not covered by the long-form doc — treat them as current, not dead:

- **Card taps** `/app/card-taps` — `pages/CardTapsPage.vue`, `useCardTaps.js`,
  `composables/utils/cardTaps.js` (`GET /audit/card-taps/{company_id}/`).
- **Allowances** `/app/allowances` — `pages/AllowancesPage.vue`, `useAllowances.js`,
  `useEmployeeAllowances.js`, `composables/utils/allowances.js` (`/allowance/...`).
- The dev proxy's shared `context` array now also includes `/allowance`.
- **Half-day leave** — `/attendance/leave-list/` reports a half day as `total_days: 1` with
  `total_day_value: "0.50"`; render the *value*, not the count, via `leaveRequestDurationLabel` in
  `composables/utils/leaveRequests.js` (it keeps the `total_days`/`hours`/`N/A` fallbacks).

## Out of scope unless asked

- Deployment via Fabric (`fabfile.py`, needs root `venv`/`requirements.txt`) and Docker
  (`server.js`, `docker-compose.prod.yml`) — touch only for deploy tasks. Root `nginx.conf` is not
  referenced by the Docker build.
- `ssr`, `pwa`, `cordova`, `capacitor`, `electron`, `bex` targets are configured but unused; the app
  ships as a plain web SPA in `dist/spa`.
