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
npm run format         # prettier --write over the whole repo — avoid, see warning below
npm run build          # quasar build -> dist/spa
npm run serve:prod     # build then serve dist/spa via server.js (PORT, default 8000)
npm run start          # webpack serve — NOT production serving, despite README
npm test               # no-op; there is no test suite
docker compose -f docker-compose.prod.yml up --build -d   # serves on 8000 via server.js
```

- **Lint is a build gate.** `quasar.config.js` sets `eslint: { warnings: true, errors: true }`, so
  `eslint-webpack-plugin` runs inside both `npm run dev` and `npm run build`; a lint _error_ fails
  the build and shows in the dev overlay. `npm run lint` just gets the result faster.
- ESLint 9 flat config is `eslint.config.js` (Quasar recommended + `vue/flat/essential` + prettier
  skip-formatting). The legacy root `.eslintrc.js` is ignored (lint passes `-c ./eslint.config.js`)
  — editing it changes nothing.
- No test framework exists. Verify changes with `npm run lint` (and a dev-server check if UI).
- **Prettier is repo-wide dirty — do not run `npm run format` for a focused change.** `npm run format`
  is `prettier --write "**/*.{js,vue,scss,html,md,json}" --ignore-path .gitignore`, and that same glob
  with `--list-different` reports **~130 unformatted files, ~115 of them under `src/`** (the exact
  count drifts as files land), plus `package-lock.json`, `package.json`, `quasar.config.js`,
  `index.html`, `README.md`, `CLAUDE.md`, `eslint.config.js`, `jsconfig.json`, `.prettierrc.json`,
  `.vscode/*`, `src-electron/*` and `.opencode/plans/*`. `--ignore-path .gitignore` keeps
  `node_modules`/`dist`/`venv` out, but every other tracked file is in scope and rewriting
  `package-lock.json` is not something a focused diff can undo. Format only what you touched
  (`npx prettier --write <file>`); pre-existing failures elsewhere are not yours. Repo style is
  `semi: false`, `singleQuote: true`, `printWidth: 100`.
- Conventional commits throughout: `feat(scope):`, `fix(scope):`, `refactor(scope):`, `docs(plan):`.
  There is **no CI, no husky, no lint-staged and no PR template** — lint is the only gate, and it
  fires only when you run `npm run lint`, `npm run dev` or `npm run build`.

## Env / build-time config

- `@quasar/app-webpack` does **not** auto-load `.env`. `API_BASE_URL` and `VITE_WS_URL` are baked in
  at **build time** via `webpack.DefinePlugin`, read from real `process.env.*` on the build machine.
  Editing `.env` (or `.env.example`) changes nothing — set real env vars, or edit the fallback in
  `quasar.config.js`. `.env.example` is the committed reference; `.env` is git-ignored.
- Only three places read those defines: `baseURL` in `boot/axios.js`, the **deprecated** `BASE`
  re-export in `composables/utils/http.js` (import `api` instead), and `composables/useWebSocket.js`.
- In **dev** `baseURL` is `''` and every request goes through the proxy; the absolute base is
  production-only.

## Architecture essentials

- Hash-mode router (`vueRouterMode: 'hash'`). `@/*` -> `src/*` (webpack alias + `jsconfig.json`); bare
  `boot/`, `pages/`, `layouts/`, `components/`, `stores/` also resolve, and both `src/...` and bare
  specifiers appear in the codebase. Follow whatever the surrounding file already uses.
- **Auth store lives in `src/boot/auth.js`, not `src/stores/`.** Import as
  `import { useAuthStore } from 'src/boot/auth'`. Its `state()` runs during boot before mount and
  **must not throw** — a throw there stops the app from booting with no UI left to log out.
- Boot order is load-bearing (`quasar.config.js`): pinia -> auth -> axios -> toast -> errorHandler
  -> suppressExtensionErrors -> dialogA11y. Pinia before auth, auth before axios's interceptors;
  toast before errorHandler, which raises a toast of its own.
- `quasar.config.js` `extras` includes `material-icons-outlined`, which backs the `o_*` icon prefix.
  Dropping it blanks every outlined icon with no build error — the nav rail goes blank first.
- Adding a route to `src/router/routes.js` does **not** add a sidebar entry. The nav groups in
  `src/layouts/MainLayout.vue:403` are a hand-maintained array. Every route _page_ component is lazy
  `() => import(...)` except `AdminSettingsPage`, which is static and therefore lands in the initial
  bundle; both layouts, `AuthLayout` and `MainLayout`, are eager too.
- The live SPA template is the **root `index.html`**, not `src/index.template.html` — v4 of
  `@quasar/app-webpack` resolves `appDir/index.html`, and only the root file carries the SPA alias
  redirect script. Editing `src/index.template.html` is a silent no-op.
- Superseded/dead modules remain on disk, and plans name files that no longer exist — this is the main
  source of false leads here. Grep for importers (`git grep -l ComponentName src`) before treating a
  name as current. Confirmed unreferenced: the nine `components/pages/Dashboard/*Panel.vue` +
  `QuickActionsBar.vue` files from the old dashboard (Announcements, NeedsYourAttention, Notifications,
  PayrollReadiness, PayrollStatus, PendingSwaps, RecentActivity, SiteStatus),
  `composables/disbursement/stubData.js`, `composables/payroll/usePayoutData.js` (the whole
  `composables/payroll/` dir is this one dead file), `composables/page/useSwapRequests.js` (the live
  path is `composables/utils/swapRequests.js`), `constants/payoutSteps.js` (live stepper source is
  `constants/pgiStatus.js`), `composables/admin/index.js` (barrel with no importers, and already out
  of sync with the directory), `pages/IndexPage.vue`, `src/index.template.html`. `src/services/` is
  empty — leave it empty.

## Networking / auth

- Always `import { api } from 'boot/axios'`. The request interceptor attaches the bearer token and the
  Django `X-CSRFToken` header, and it **refuses to send at all** when the store holds no token
  (rejecting locally with `code: 'ERR_NO_SESSION'`) unless the path is in `PUBLIC_PATHS` or the caller
  passed its own `Authorization`. Never read the token from `localStorage`/`sessionStorage` — use
  `useAuthStore().token`. The only hand-built `Authorization` headers left are the three login-flow
  lookups in `composables/page/useAuth.js` (a login-response argument, before the store holds one),
  and the interceptor's `readAuthHeader` check exists to let them through — don't "fix" them.
- 401 is recoverable: the interceptor refreshes once (shared across a parallel wave, so concurrent
  401s can't spend a rotating refresh token twice) and replays; only a failed refresh ends the
  session, and that teardown must do a real page reload (a `location.href` to `/#/login` from
  `/#/app/...` is a same-document hash navigation that never reloads). Anything ending a session must
  clear the **store**, not just storage.
- Scope every request by the active company via `useCompany().companyId` (a **computed**, not a
  snapshot). Re-resolve per request; verify the response's company matches before publishing. The
  standalone `resolvedCompanyId()` is the localStorage fallback — don't hand-roll another one.
- Errors: `extractErrorMessage(error, fallback)` from `composables/utils/http.js` — no hand-rolled
  `data.detail || ...` chains. Where a status is genuinely an answer, pass `expectedStatuses: [404]`
  in the request config to keep the error log quiet; that key is read by the response interceptor in
  `boot/axios.js`, not by `http.js`, and it only silences the log — the promise still rejects, so the
  caller's own handling is unchanged. It is not only "no settings row": the payout-group dashboard
  and instance endpoints use it too, because a cutoff outside the company's cutoff type answers 404
  "no runs here", which both callers already treat as nothing. Two sites hand-roll on purpose, each
  commented: `ReviewPage.vue`'s `serverMessage` (must return `''`) and `EmployeesPage.vue`'s
  `addEmployeeErrorMessage` (prints every field error).
- Paths are leading-slash absolutes (`/organization/...`) everywhere except three call sites in
  `composables/useNotifications.js`, which resolve correctly by accident and cannot be matched by a
  proxy `context` string. Write the slash.
- **Dev proxy: `quasar.config.js` has three entries, and the split is deliberate.** (1) The general
  array holds every plain HTTP top-level prefix — `/api`, `/user`, `/organization`,
  `/communication`, `/attendance`, `/cash_advance`, `/contracts`, `/access`, `/admin`, `/audit`,
  `/allowance`. Add a **new top-level prefix to that array**; do not add a fourth proxy object —
  http-proxy-middleware registers a `close` listener per entry, and one-per-prefix put twelve
  listeners on one emitter, past Node's default of ten, so `npm run dev` opened with a spurious
  `MaxListenersExceededWarning`. (2) `/payroll/*` is a **narrow enumerated allowlist**, separate so
  refreshing the bare `/app/payroll` SPA route isn't forwarded to Django — a new `/payroll/<subpath>`
  endpoint **must be added to that list explicitly** or it 404s in dev and works in prod.
  (3) `/ws/notifications` is separate only for `ws: true`.
- Two paths are in neither the general array nor the payroll allowlist, so they fail **in dev only**:
  `/payroll/employee/payslips/*` (the `fetchEmployeePayslipDetail` / `acknowledgePayslip` /
  `reportIssue` / `confirmMoneyReceived` block in `composables/disbursement/useDisbursementApi.js`)
  and `/employee/payslips/` (`composables/page/usePayroll.js`). All of those functions are exported
  with no caller and are shadowed by the `/payroll/admin/employee-payslips/` versions the pages
  actually use (`PayslipsPage.vue`, `FundingPage.vue`) — which is why nothing has noticed.
- Deep links are consumed **once, before the first fetch**: `applyDeepLink()` in `AttendancePage.vue`
  and `Disbursement/DisbursementListPage.vue` runs ahead of it, the value must land in a control the
  reader can see and clear, and the page then `router.replace({ query: {} })` — left in the URL, a
  reload re-applies a narrowing the reader had cleared. The payroll step pages are the opposite: the
  query is **carried**, not consumed (`PayoutGroupStepperHeader.vue`'s `carriedQuery`), because no
  step endpoint returns the run's name/cutoff/status.

## Data-fetching conventions

- Pinia is only for small persisted global state (`stores/company.js`, `boot/auth.js`). Feature data
  lives in `composables/page/*.js`, exposing refs + async fns directly, often with a
  `companyId`-keyed module cache + TTL + `invalidateCache()` (see `useEmployees.js`). Key every
  module-level cache by company — a bare string key served the previous workspace's data after a
  switch (this bit the disbursement cutoff cache in `useDisbursementApi.js`).
- Guard stale responses: take a token from `createRequestToken()` and check `isCurrent(token)`
  before committing — one guard per published ref, in every fetcher that writes into shared state
  (12 composables plus `RequestPage.vue`, `DisbursementListPage.vue` and `PayslipsPage.vue`).
  `usePayroll.js` uses a per-key `AbortController` instead; prefer that when cancelling is worth it,
  the token when the response is cheap or shared through a cache (cancelling a shared request strands
  a second caller).
- Bulk writes decide one record at a time: use `Promise.allSettled` (or per-item try/catch), count
  outcomes, **always refetch**, and emit one message per outcome the endpoint can return. Never one
  `try/catch` around a loop, and never bare `Promise.all` for writes (it is fine for parallel reads).
  Reference: `Disbursement/ReviewPage.vue`, `RequestPage.vue`'s `bulkDecideOvertime`. The bulk-leave
  decision is the four-case one: `bulkLeaveOutcome` in `composables/utils/leaveRequests.js` counts
  `updated` / `skipped` / `failed` and `bulkLeaveOutcomeToast` beside it adds the all-skipped
  message — `skipped` is not `failed` and the reviewer acts on them differently.
- Feature derivations live in `composables/utils/*.js` (or a feature-local module, e.g.
  `components/pages/Announcement/announcementStatus.js`) so table, card list and tiles cannot
  disagree. Extend the module, don't compute in the component. `manning.js` is the fullest worked
  example; `utils/` also splits into generic formatters (`format`, `locale`, `timezone`,
  `calendarDate`, `statusColors`) versus per-feature derivation modules — don't blur the two.
- `composables/payroll/` and `composables/disbursement/` are different: the disbursement subtree is
  live and every `pages/Disbursement/*.vue` page calls `useDisbursementApi.js` unconditionally.

## UI conventions

- **Toasts: no `$q.notify` call sites remain.** Use `import { useToast } from 'src/composables/useToast'`
  and `toast.success/.error/.warning/.info/.loading(...)`. `src/boot/toast.js` deliberately keeps
  `$q.notify` callable as a compatibility shim; that is not permission to add new ones.
- Calendar dates: use `composables/utils/calendarDate.js` (`todayIso()`, `toIso`, `fromIso`,
  `shiftIso`, `longLabel`) — not `toISOString().slice(0,10)` and not `new Date('2026-09-02')` parsing.
  Call `todayIso()` per use; caching it in a `ref` leaves an overnight tab reporting yesterday. A true
  **instant** (an ISO string carrying a zone offset) is the other shape entirely and goes through
  `formatDateTime()` in `utils/format.js`, which prints it in the reader's own timezone and returns an
  unparseable value verbatim rather than blanking it — the disbursement step-5 stamps used to print raw
  `2026-07-01T15:00:00Z` into a table cell. Don't hand-derive either shape from the other.
- localStorage: use `composables/utils/storage.js` (`readStoredJson`/`readStoredObject`/`writeStored`)
  so the literal string `"undefined"` cannot throw. Four `JSON.parse` sites are hand-rolled on
  purpose (their catch branch carries meaning): `useCompany.js`, `stores/company.js`,
  `useWebSocket.js`, `MainLayout.vue`.
- Design system is `src/css/dashboard.scss` (global via `app.scss`'s last-line `@import './dashboard'`)
  — it, not `app.scss`, is the live design system: `--dash-*` tokens, `dash-modal` dialog chrome,
  `dash-qtable` tables, `PageShell.vue`. Reach for the tokens, not the legacy SCSS `$primary`/`$gray-*`
  (no component uses them). Dialog fields are `__field` + `__field-label` above the control, never a
  Quasar floating label, and widths are written twice compounded with `.q-card` because Quasar caps a
  dialog card with a two-class selector. Do **not** build dialogs as HTML strings
  (`$q.dialog({ html: true })`) — no call site uses it; use a component. Inside Quasar's date/time
  pickers `--q-primary` is re-pointed to `--dash-brand`, scoped to `.q-date` / `.q-time`: the header,
  the selected day and the range band all read that one token, and the `.q-btn--primary` overrides
  never reach them because QBtn compiles `color="primary"` to the `bg-primary` utility, not to a
  `q-btn--primary` class — which is how a stock-theme blue survived next to the app's navy action.
- **Confirms wear the shared chrome; `dash-modal--confirm` is it.** The card markup lives **once**, in
  `components/common/ConfirmCard.vue`. Two hosts render it: `components/common/ConfirmDialog.vue` for
  anything holding a `confirm` ref (`v-model` + `@confirm`, `loading` owned by the caller), and —
  **not yet built, and deliberately so** — a component handed to `$q.dialog({ component })` for the
  composables that have no template. (`ConfirmCard.vue`'s own header already describes that second host
  as `openConfirm()` in `composables/utils/confirmAction.js`; that file is not on disk, so the comment
  is a statement of intent, not an import path.) A page with a confirm should use `ConfirmDialog`; don't
  re-type the head/footer. **16 decision-confirms still use bare
  `$q.dialog({ title, message, ok, cancel })`** —
  14 in `composables/admin/`, plus `AdminSettingsPanelHolidayTypes` and `EmployeeContributionsDialog`.
   That is the exception now, not the norm; converting one needs the imperative host, and that path
   is **unproven at runtime**. `ReviewPage` was the third and left the list by the *other* route: it has
   a template, so it took `ConfirmDialog` and a `reviewConfirm.js` exactly as Funding and Disburse did —
   the imperative host is only the answer for a composable with no template of its own. `note` is
   optional in the confirm object — `EmployeeTerminateDialog` has none because terminate is reversible,
   and the irreversible note would be a lie.
- **`dash-page-body` marks a list region; it has no rule of its own.** A page-level list region
  carries it so the empty-state rules can find it by context (`.dash-page-body .dash-empty` and
  `.dash-page-body .grid-empty` take `--dash-body-min`, 580px). It exists purely as a selector prefix —
  **do not give it a `min-height`**; it carried one once, and padding every region to 580 put a band of
  dead space under any list shorter than that. A list with data ends where its data ends. Two
  empty-state vocabularies exist, so the rules are split: `.dash-empty` for most, `.grid-empty` for the
  Request tabs (`requestGrid.css`), and `.modern-table-container > .dash-empty` for the Admin Settings
  panels, which are not marked `dash-page-body`. `TableSkeleton`'s `rows` default (16) is sized to that
  same floor, which is why all 29 call sites pass no literal `:rows` — the only two still setting one
  (`PayoutTable`, `CashAdvanceTable`) pass a local `SKELETON_ROWS` const.
- **Money is ₱, not ₦, and there is no `₦` anywhere in the tree.**
  `composables/utils/format.js` hardcodes **₱** and is the app's formatter.
  `composables/utils/locale.js` has a second `formatCurrency` that takes a `countryCode` and is used
  only by `stores/company.js`.
- **`formatCurrencyPrecise` is a third, for money that is not whole centavos.** Statutory
  contributions and hand-entered adjustments routinely carry more than two decimals (one contribution
  read `319.0033`), and rounding to 2 dp makes the figure disagree with the payroll score behind it —
  so those columns render through it instead: at least 2 dp, up to 4, trailing zeros past the second
  trimmed. `formatCurrency` stays the app-wide standard and is untouched; don't widen it. It rounds on
  the scaled integer rather than by `toFixed`, for the reason `decimalHoursLabel` gives below, so a
  client-side `0.1 + 0.2` prints `0.30` rather than `0.30000000000000004`.
- Employee photos for tables/cards: build the index **once** with `buildEmployeeNameIndex()` and pass
  it down as an `employeeIndex` prop; read it with `avatarFor()` / `employeeByName()` from
  `composables/utils/employee.js`. A name shared by two employees maps to `null` **on purpose**, so the
  wrong photo is never shown — fall back to `getInitials()`. Names, not ids, are the join key on
  several endpoints (`employee` on a card is a display string, and an unassigned card sends the
  literal `"Not yet assigned"`, so `if (card.employee)` is true for every row).
- Production build strips `console.log/debug/trace` but **keeps** `console.warn`/`console.error`
  (`pure_funcs` in `uglifyOptions`, prod only) — the app ships no error reporting, so those are the
  only diagnostic trail. Use `.warn`/`.error` for anything a person should still see.

## Naming / structure drift

- `pages/Disbursement/*` is reached at `/app/payroll`, but its components live under
  `components/pages/Payroll/`. `DeductionsPage.vue` renders a page titled **Contributions** (helpers in
  `composables/utils/contributions.js`). Search both names. Page-specific components go in
  `components/pages/<PageName>/`; shared ones in `components/common/` and `components/layout/PageShell.vue`.

## Newer than CLAUDE.md

These are live and not covered by the long-form doc — treat them as current, not dead:

- **Card taps** `/app/card-taps` (`GET /audit/card-taps/{company_id}/`) and **allowances**
  `/app/allowances` (`/allowance/...`) — `CardTapsPage.vue`/`useCardTaps.js`/`utils/cardTaps.js`,
  `AllowancesPage.vue`/`useAllowances.js`/`useEmployeeAllowances.js`/`utils/allowances.js`.
- **Half-day leave** — `/attendance/leave-list/` reports a half day as `total_days: 1` with
  `total_day_value: "0.50"`; render the _value_, not the count, via `leaveRequestDurationLabel` in
  `utils/leaveRequests.js` (it keeps the `total_days`/`hours`/`N/A` fallbacks). The write side of the
  same rule is `leaveDayValue` / `leaveDayValueLabel`.
- **Irreversible actions go through a confirm gate.** `RequestPage.vue`'s
  `commit*Decision` writers are reachable only from `confirmDecision` (the dialog's `@confirm`);
  `AccessCardsPage.vue`'s `commitStatusChange` only from `AccessCardStatusConfirmDialog`;
  `SchedulePage.vue`'s three day-off entry points only from the single `commitDayOff`; and
  `EmployeesPage.vue`'s bulk terminate only from `commitBulkTerminate` — the write lives **there**,
  not in the handler that opens the dialog, so `:loading` can cover it and block a second click. Each
  has a **wording source** returning a plain confirm object: the per-feature modules
  `Request/decisionConfirm.js`, `AccessCards/statusConfirm.js`, `Schedule/dayOffConfirm.js`,
  `Payroll/fundingConfirm.js`, `Payroll/disburseConfirm.js`, `Payroll/issueDecisionConfirm.js` — where
  the wording is computed from live reactive state — or the
  fixed-shape builders in `composables/utils/confirmWording.js` (`buildDeleteConfirm`,
  `buildTerminateConfirm`, `buildNotice`) where it is not. All render through the shared
  `components/common/ConfirmDialog.vue`, which has **no slot and no branch**: every word comes from the
  object — `title` / `sub` / `icon` / `tone` / `name` / `sentence` / `note` / `actionLabel` /
  `buttonClass` / `cancelable` (`facts` too, where the decision is about numbers). Adding a gate means
  a `commit*` writer plus a builder, and `ConfirmDialog` will render it. The one thing a plain confirm
  object cannot do is **collect input**: rejecting a payslip dispute needs a required admin reason, so
  that one decision gets its own dialog (`components/pages/Payroll/PayslipRejectDialog.vue`, a
  deliberate exception, not a hole in the rule). `cancelable: false` renders a single OK —
  that is what an alert is, and it is why the two "No shift on this day" notices on `AttendancePage`
  are `buildNotice` rather than a confirm. Funding distinguishes **short / settled / over** (a short
  amount is a legitimate instalment, not an error), and disbursement states how many cash payouts the
  bulk release _excludes_ — "Disburse all" otherwise reads as "everything".
- **Attendance filtering is opt-in, and partly probed.** `include_unassigned=true` pulls in records
  orphaned by shift reassignment. The month endpoint carries year/month in the path, and the `employee`
  param is _probed_, not assumed — `useAttendance.js` latches `employeeFilterSupported = false` once the
  backend rejects it.
- **Access cards have two writes, not one, and a confirm gate.** `/app/access-cards` —
  `AccessCardsPage.vue`, `useAccessCards.js`, `utils/accessCards.js`. The holder is
  `PATCH /user/access-cards/{uid}/employee-assign/` (`{ employee_id, status }`); whether the card works is
  a separate `PATCH /user/access-cards/{uid}/status/` (`{ status }`). Both are keyed by **uid alone**, so
  both inherit the `foreign` guard from the detail payload. The status endpoint takes **only** `active` /
  `inactive` / `lost` / `revoked` — that set is `WRITABLE_STATUSES`, and `stolen` / `damaged` / `expired`
  are in `STATUSES` for _display only_, never as a choice. `assignCard` still sends the card's current
  status because `employee-assign` carries the field; deliberate, so a reassignment cannot switch a card on.
  `commitStatusChange` is reachable only from `AccessCardStatusConfirmDialog`'s `@confirm` (wording in
  `components/pages/AccessCards/statusConfirm.js`), and `statusActionsFor(card)` is the single source of
  the verbs — the row menu and the detail dialog's Card status group both render from it, so they cannot
  offer different sets. Adding a status means a `WRITABLE_STATUSES` entry, not a new control.
  `STATUS_FILTERS` is still only All/Active/Inactive, so a lost or revoked card is reachable only via
  search or the "Needs attention" filter.
- **Leave is narrowed to a payroll cutoff, derived client-side.** `utils/leaveCutoffs.js` is the single
  source; `/attendance/leave-list/` returns a span and **no cutoff** and accepts no query param, so the
  narrowing is computed or not at all. Three rules: **overlap, not containment** — a span straddling two
  cutoffs lists under both, because containment hides it from both; **alias every undocumented field**
  (`NAME_FIELDS` / `START_FIELDS` / `END_FIELDS` accept 7/5/5 spellings); and the key prefers `id`,
  falling back to `name:<lower>@<startIso>` so a year of "Semi-monthly" can't collapse into one option. The
  cutoff cache is keyed by company. A failed fetch degrades silently to the un-narrowed queue.
- **Decimal hours are one decision with three consumers.** `decimalHoursLabel` in
  `composables/utils/format.js` is the **only** place the app rounds a decimal hour; attendance, card
  taps and the access-cards monthly total all quote it, so don't reimplement it. It rounds on the
  scaled integer, not via `toFixed` — a hundredth of an hour is 36 seconds, so exact ties arrive every
  36 seconds and `toFixed` prints `1.02` for a genuine `1.025`. Attendance works in **exact
  milliseconds, backend-first** (`DURATION_UNIT` in `composables/utils/attendance.js` pins the
  undocumented unit in one constant; `attendanceDurationOf` prefers the backend's figure over a
  re-derivation; the `h/m` label is the hover companion to that same number, not a contradiction).
  Card taps and access cards work in **seconds** (`durationToSeconds` in `utils/cardTaps.js`).
  **Sum in the base unit and round once at the end** (three one-minute days are `0.05`, not `0.06`), and
  **`null` is not `0`** anywhere — "we could not read this" must never print `0.00`. The server's raw
  duration string is read for seconds but shown verbatim on hover.
- **`time_format` is a display setting, never a storage format.** `admin/useAdminLaborRuleSettings.js` →
  `GET /payroll/admin/company-labor-rule-settings/{id}/` → `{ time_format }`, read through
  `data.data ?? data` because this API's envelope isn't uniform (a wrapped payload read as a bare one
  looks like "no setting" — 12h, silently wrong). `expectedStatuses: [404]` makes "no settings row" a
  configuration state, and a `formatCache` keyed by company. `AttendanceTimeField.vue` prints 12h or 24h
  but **stores `HH:mm` under both branches** — nothing on the write path knows the component exists,
  which is why the native 12h branch can pass its value straight through. The 24h branch delegates to
  `components/common/TimeField.vue`, **not** `<input type="time">`: no browser will draw 24h on request.
  `TimeField` is **two** typeable dropdowns (hour `00–23`, minute `00–59`), not one list of whole
  `HH:mm` strings — a single list means the minute can only change by picking a whole different time.
  Neither punch is **prefilled** — `openAddDialog()` opens both blank, so a forgotten Time In is
  caught by the `Required` rule and the disabled Save rather than filed as a guess. Both halves of
  `TimeField` must therefore be editable rather than pick-only.
  Relatedly, `formatClockTime` / `parseClockTime` in `composables/utils/timezone.js` are **wall-clock**,
  not instants: never route a bare shift time through `formatInTimezone`, which takes an instant and
  turns 08:00 into 16:00 west of Greenwich. `parseClockTime` accepts `6:00 PM` / `0600` / `18:00`
  whatever the company format.
- **Overtime rows with no category are filed as CTO.** `RequestPage.vue` writes
  `category: row.category || ctoCategoryId.value || 0` on both the single and bulk writers — `||`, not
  `??`, because the backend's "no category" sentinel is literally `0`, which `??` would pass straight
  through. `findCtoCategoryId()` in `utils/overtimeRequests.js` matches the company's category by name
  ("cto" substring or "compensatory time off") and returns `null` when none is configured, leaving the
  `0` fallback in place rather than inventing an id. Reading `/payroll/overtime-categories/` needs
  `res.data?.data ?? res.data?.results ?? res.data` (it answers `{data: [...]}`) and an
  `is_active !== false` test, not a truthy one — a category carrying no flag at all is active, and the
  truthy test dropped every row.
- **Balances are invalidated by a module-level counter.** `invalidateEmployeeBalances()` /
  `balancesRevision` in `composables/page/useEmployeeBalances.js`: writers raise it, mounted readers
  `watch` it. It is module-level (not returned from the factory) because the pages that change balances
  and the pages that render them are different route components, never mounted at once — there is no
  keep-alive, so the signal has to outlive whichever one raised it. Cheap and idempotent: over-reporting
  costs a refetch, under-reporting costs a stale figure. Same read, different transport, as the
  `companyId`-keyed caches. Its leave-type lookup filters on `uses_balance`, not `is_paid`.
- **Manual payroll adjustments: totals are the server's, never a re-sum.** `utils/payrollAdjustments.js`
  reads `manual_additions` / `manual_deductions` / `total_deductions` / `net_pay` straight off the
  payload and only _labels_ the rows. A client that re-added the rows would eventually disagree with the
  server about whether a reverted row counts, and that disagreement is a wrong number on a payroll.
  Rows are not reordered either — the endpoint already sends them newest first. `reverted` is the only
  documented end state, so `isApplied` treats anything unrecognised as **applied**: quietly hiding
  money that was actually taken off is the worse mistake.
- **Salary breakdown: one endpoint, two vocabularies.** `GET /payroll/admin/employee-payroll-item/{id}/earnings/`
  answers the day list as `entries` with `hours` / `gross` / `ut` / `ut_amount` / `net`, while its own
  documented schema calls the same fields `daily_earnings` / `total_hours` / `gross_pay` /
  `undertime_amount` / `net_pay`. Both are in circulation, so `components/pages/Payroll/salaryBreakdown.js`
  reads each figure under both names via `amountFrom` — reading only the documented names rendered a
  populated response as a dialog claiming no earnings at all. A third shape means extending
  `amountFrom`, **not** reintroducing a sweep. Money goes through `toAmount` (decimal strings in,
  `null` for unreadable); `null` never prints `₱0.00`.
- **A disputed payslip needs a second fetch.** The row's own `dispute_status` is only a fallback shown
  when nothing better exists (`PayslipDisputeCell.vue`); the reason text and the attachment come from a
  separate endpoint, which is why that cell has its own loading skeleton. `PayslipRowMenu.vue` renders
  only on a disputed row at all (`isDisputed` in `PayslipsPage.vue`), because the actions it offers are
  dispute actions. Both decisions are gated: `resolve` / `reject` are openers and `commitResolve` /
  `commitReject` sit behind `ConfirmDialog` and the reject dialog, rejection carrying a required admin
  reason down `processIssue(row, action, adminNotes)` — which applies it to **every** open issue on the
  payslip, so `openIssuesOf()` counts only undecided ones (an absent `status` means open, matching
  `PayslipDisputeCell`) and a close watcher drops the pending snapshot.
- **The audit page has two trails behind one dropdown, and they share almost everything.** Shift
  assignments (`/audit/assignment/history/`) and contracts (`/audit/contracts/history/`) answer with
  **the same six fields** — so the columns cannot differ; what differs is the **vocabulary**, and that
  comes from one descriptor per source in `utils/auditSources.js`, read by the toolbar, the table and
  the card list alike. Nothing threads an `isContract` boolean through a component; the page holds a
  source _key_ and looks the descriptor up. `utils/auditRows.js` holds the readings both share (stamp
  parsing, row shape, roster scoping), `utils/contractHistory.js` the contract normaliser, and
  `utils/historySource.js` the page-walking fetch factory both composables are built from. **Row keys
  are deliberately NEUTRAL** — `previousValue` / `newValue` / `dateValue`, not `previousShift` — so a
  renderer holding a contract row is not reaching for a field called "shift"; the _labels_ are the
  per-source part. If the backend later sends contract-specific fields, the change is confined to
  `contractHistory.js` and the descriptor's `columns`. Only the selected source is fetched — the other
  is created but never called, so opening the page still costs one request.
- **Manning** (`useManning.js`, `GET /organization/sites/manning/{company_id}/`) and **the audit trail**
  (`useAuditLogs.js` for the cross-module write log, `useAssignmentHistory.js` /
  `useContractHistory.js` for the two trails) are the newest composables and carry their traps in
  their header comments — read those before trusting a field.

## Traps

- `.opencode/plans/*.md` are **historical, not specs** — they read like current plans but are not.
  `disbursement-redesign-plan.md` documents the already-shipped migration, `payroll-redesign-plan.md`
  targets a deleted `PayrollPage.vue`, and `attendance-decimal-hours.md` /
  `attendance-duration-unit-fix.md` describe duration work that has since landed. Read them for the
  reasoning; never as a to-do list.
- Git prints `LF will be replaced by CRLF` on every add (`core.autocrlf=true` against
  `end_of_line=lf` in `.editorconfig`). Expected noise; don't "fix" it.

## Out of scope unless asked

- Deployment via Fabric (`fabfile.py`, needs root `venv`/`requirements.txt`) and Docker (`server.js`,
  `docker-compose.prod.yml`) — touch only for deploy tasks. Root `nginx.conf` is referenced by neither.
- `ssr`, `pwa`, `cordova`, `capacitor`, `electron`, `bex` targets are configured but unused; the app
  ships as a plain web SPA in `dist/spa`.
