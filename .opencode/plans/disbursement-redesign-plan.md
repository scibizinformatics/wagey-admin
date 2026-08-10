# Disbursement Module Redesign — Implementation Plan

## Architecture Overview

```
/app/payroll                        → DisbursementListPage.vue    (main list, 1st to ship)
/app/payroll/review/:id             → ReviewPage.vue              (2nd)
/app/payroll/payslips/:id           → PayslipsPage.vue            (3rd)
/app/payroll/funding/:id            → FundingPage.vue             (4th)
/app/payroll/disburse/:id           → DisbursePage.vue            (5th)
/app/payroll/complete/:id           → CompletePage.vue            (6th)
```

All sub-pages share the `PayoutGroupStepperHeader.vue` at the top (5-step: Review → Payslips → Funding → Disbursement → Complete). The stepper is the primary navigation.

---

## Phase 0 — Shared Components

### 0.1 Feature Flags System

**File:** `src/composables/useDisbursementFeatureFlags.js`

A composable that tracks which pages have been migrated. Exposes:
- `flags` — reactive object with boolean per page: `{ list: false, review: false, payslips: false, funding: false, disburse: false, complete: false }`
- `setFlag(page, value)` — toggle a flag
- `migrationProgress` — computed `{ completed: number, total: 6, percent: number }`
- `isMigrationEnabled` — master toggle to show new pages vs old PayrollPage

Used by:
- `MainLayout.vue` sidebar — show a mini progress bar badge next to "Disbursement"
- Each new page — check its flag before rendering new vs redirecting to old

**File:** `src/components/pages/Payroll/DisbursementMigrationBadge.vue`

Mini progress bar for sidebar or header:
- Shows `completed / 6` with a thin colored bar
- Grey dots for un-migrated pages, blue/green for completed
- Clicking opens a small tooltip listing each page and its migration status

### 0.2 KpiCard.vue

**File:** `src/components/common/KpiCard.vue`

Generic stat card used across all 6 pages.

**Props:**
- `icon` (String) — Material icon name
- `label` (String)
- `value` (String|Number)
- `trend` (Number, optional) — percentage change, negative = red, positive = green
- `trendLabel` (String, optional) — "vs last cutoff"
- `currency` (Boolean) — format value as ₱
- `loading` (Boolean) — show skeleton shimmer

**Slots:**
- `default` — alternative to `value` prop for custom content
- `footer` — extra content below the value

**States:** normal, loading (shimmer), empty (value = "—").

### 0.3 StatusPill.vue

**File:** `src/components/common/StatusPill.vue`

Color-coded badge driven by a status string.

**Props:**
- `status` (String)
- `size` ('sm' | 'md', default 'sm')

**Color map (config-driven, defined in a shared constant file):**
- `draft` → gray
- `pending_review` / `needs_attention` → orange
- `under_review` → blue
- `approved` → teal
- `funded` → purple
- `disbursing` → amber
- `disbursed` / `complete` → green
- `disputed` → red
- `failed` → red

**File for color tokens:** `src/composables/utils/statusColors.js`

Exports `STATUS_COLORS` object and a `statusColor(status)` helper function. Used by StatusPill and anywhere else status colors are needed.

### 0.4 PayoutGroupStepperHeader.vue

**File:** `src/components/pages/Payroll/PayoutGroupStepperHeader.vue`

5-node horizontal stepper, the primary navigation between sub-pages.

**Props:**
- `groupId` (String|Number) — the payout group ID, used to build route links
- `currentStep` (Number, 0-4) — which step is active
- `stepStates` (Array of 5 strings: 'locked' | 'current' | 'completed' | 'upcoming')

**Steps:**
0. Review Employees
1. Payslips
2. Funding
3. Disbursement
4. Complete

**Behavior:**
- Each node is a `<router-link>` to the corresponding sub-page
- Locked steps (before current) are grayed out and not clickable
- Current step is highlighted (blue filled circle)
- Completed steps show a checkmark
- Upcoming steps are hollow circles
- Between nodes, a thin line connects them (gray / blue when completed)

**Responsive:** collapses to a compact version on mobile (smaller text, fewer labels).

### 0.5 DataTable.vue (q-table wrapper)

**File:** `src/components/common/DataTable.vue`

Wraps Quasar's `q-table` with consistent search, filter, export, and pagination.

**Props:**
- `columns` (Array) — same as q-table columns
- `rows` (Array)
- `loading` (Boolean)
- `searchable` (Boolean, default true) — show search bar
- `exportable` (Boolean, default false) — show export CSV button
- `filterOptions` (Array, optional) — dropdown filters
- `title` (String, optional) — heading above the table
- `rowKey` (String, default 'id')
- `dense` (Boolean, default true)
- `flat` (Boolean, default true)

**Slots:**
- All named q-table body-cell-* slots pass through
- `top-left` — prepend content before the search bar
- `top-right` — append content after filters
- `bottom` — replace default pagination

**Built-in behavior:**
- Search input v-model tied to `:filter` prop of q-table
- Export button emits `@export` or downloads a generated CSV of visible rows
- Consistent pagination footer styling

### 0.6 Endpoint-Ready Pattern (stub data)

**File:** `src/composables/disbursement/useDisbursementApi.js`

A composable wrapping ALL disbursement API calls with the "endpoint-ready" pattern:

```js
async function fetchDisbursementRuns(params) {
  // 🟢 REAL ENDPOINT — uncomment when backend is ready
  // const { data } = await api.get('/payroll/admin/disbursement-logs/summary/', { params })
  // return Array.isArray(data) ? data : (data?.data ?? data?.results ?? [])

  // 🔴 STUB — remove when endpoint is ready
  return getStubRuns(params)
}
```

Each function has:
1. The real API call (commented out with a clear marker)
2. A stub fallback returning realistic mock data
3. Error handling that catches and returns empty fallback

**Functions in this composable:**
- `fetchDisbursementRuns(params)` → list of runs for main page
- `fetchRunDetails(groupId)` → single run details
- `fetchReviewEmployees(groupId)` → employees needing review
- `fetchPayslips(groupId)` → payslip list
- `fetchFundingHistory(groupId)` → funding entries
- `fetchDisbursementStatus(groupId)` → claim statuses
- `fetchCompleteSummary(groupId)` → aggregate data
- `fetchKpiSummary(params)` → KPI card data
- `fetchStepperState(groupId)` → which steps are unlocked

**Also create:** `src/composables/disbursement/stubData.js` — all mock data in one place, shared across the API functions. Uses simple placeholders (e.g. "Run 1", "Employee A", ₱1,000).

---

## Phase 1 — Pages (Migration Order)

### Step 1: Routes Update

**File:** `src/router/routes.js`

Add sub-routes under `/app/payroll`:

```js
{
  path: 'payroll',
  component: () => import('pages/PayrollPage.vue'),      // ← keep as default/fallback
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
  ],
},
```

Each sub-page is gated by `useDisbursementFeatureFlags()`. If the flag for that page is off, the component shows a "Coming soon" placeholder or redirects to the old PayrollPage.

### Step 2: DisbursementListPage.vue

**File:** `src/pages/Disbursement/DisbursementListPage.vue`

The entry point — replaces the Logs tab of the old PayrollPage.

**Template structure:**
1. Page header with title "Disbursement" + "Create Run" button + feature flags mini badge
2. KPI cards row (4 cards: Total Runs, Total Employees, Gross Pay, Net Pay)
3. DataTable with columns:
   - Run ID / Name
   - Period
   - Status (StatusPill)
   - Employees count
   - Calculated Amount (₱)
   - Funded Amount (₱)
   - Released Amount (₱)
   - Actions dropdown (View → opens stepper sub-page, Delete)
4. "Create Run" dialog (reuse PayrollCreateRunDialog.vue or inline a minimal version)

**Composable used:** `useDisbursementApi` for data, `useDisbursementFeatureFlags` for migration status

**States:** loading (skeleton), empty (no runs yet, illustration + CTA), error (retry banner)

**Feature flag:** `flags.list`

### Step 3: CompletePage.vue

**File:** `src/pages/Disbursement/CompletePage.vue`

Read-only summary. Safe to build first as it has no write actions.

**Template structure:**
1. PayoutGroupStepperHeader (step 4 highlighted, all previous completed)
2. KPI cards row (total disbursed, employees paid, success rate, avg time to complete)
3. Summary table of all employees in this run with final status

**Data:** `fetchCompleteSummary(groupId)` from the API composable.

**Feature flag:** `flags.complete`

### Step 4: ReviewPage.vue

**File:** `src/pages/Disbursement/ReviewPage.vue`

**Template structure:**
1. PayoutGroupStepperHeader (step 0 highlighted)
2. KPI cards (total to review, reviewed, issues flagged)
3. DataTable with columns:
   - Employee Name
   - Department
   - Hours Worked
   - Issues (tags: Undertime, Late, Absent — colored chips)
   - Status (StatusPill: needs_attention / reviewed)
   - Action (Mark Reviewed button)
4. Bulk action bar (select all, bulk mark reviewed)

**Data:** `fetchReviewEmployees(groupId)` from API composable.

**Feature flag:** `flags.review`

### Step 5: PayslipsPage.vue

**File:** `src/pages/Disbursement/PayslipsPage.vue`

**Template structure:**
1. PayoutGroupStepperHeader (step 1 highlighted)
2. KPI cards (total payslips, acknowledged, disputed)
3. Tabs: All | Acknowledged | Pending | Disputed
4. DataTable with columns:
   - Employee
   - Gross Pay
   - Deductions
   - Net Pay
   - Status (acknowledged / pending / disputed)
   - Dispute note (if disputed)
   - Actions (View Payslip, Acknowledge, Resolve Dispute)

**Data:** `fetchPayslips(groupId)` from API composable.

**Feature flag:** `flags.payslips`

### Step 6: FundingPage.vue

**File:** `src/pages/Disbursement/FundingPage.vue`

First page with a real form.

**Template structure:**
1. PayoutGroupStepperHeader (step 2 highlighted)
2. KPI cards (total needed, total funded, remaining, cash-on-hand)
3. Funding form (left panel):
   - Disbursement log selector (pre-selected from URL param)
   - Amount
   - Source (Bank Transfer, Check, Paytaca, Cash)
   - Reference / OR number
   - Custodian name
   - Date
   - Submit button
4. Funding history table (right panel or below form):
   - Date | Amount | Source | Reference | Status (StatusPill)
5. Confirm action with gating (can't proceed to Disbursement until fully funded)

**Data:** `fetchFundingHistory(groupId)`, API composable POST for new funding.

**Feature flag:** `flags.funding`

### Step 7: DisbursePage.vue

**File:** `src/pages/Disbursement/DisbursePage.vue`

Most complex page — live claim status and retry logic.

**Template structure:**
1. PayoutGroupStepperHeader (step 3 highlighted)
2. KPI cards (total to disburse, disbursed, failed, pending claims)
3. DataTable with columns:
   - Employee
   - Amount
   - Payment Method (Cash/Bank/GCash)
   - Claim Status (pending / claimed / failed)
   - Confirmation Method (Password / Photo+Signature / None)
   - Retry count
   - Actions (Mark as Disbursed, Retry, View Details)
4. Bulk disburse button in header

**Data:** `fetchDisbursementStatus(groupId)` from API composable.

**Feature flag:** `flags.disburse`

---

## Sidebar Update

**File:** `src/layouts/MainLayout.vue`

```diff
- { label: 'Disbursement', icon: 'paid', to: '/app/payroll' },
+ { label: 'Disbursement', icon: 'paid', to: '/app/payroll' },
+   // After the label text, show <DisbursementMigrationBadge />
```

The badge component mounts only if `useDisbursementFeatureFlags().migrationProgress.percent > 0`.

---

## Migration Check (Replace-in-Place)

When all 6 pages are live (all flags on), the root `/app/payroll` route should redirect to `DisbursementListPage.vue` directly. At that point:
- Old `PayrollPage.vue` is renamed to `PayrollPage.legacy.vue` and kept for one release
- The old tab-based pattern (Logs + Funding) is fully replaced
- Sidebar badge is removed
- Routes flatten to not need children (optional cleanup)

---

## File Checklist Summary

### Phase 0 — Shared (create first)
- [ ] `src/composables/disbursement/useDisbursementFeatureFlags.js`
- [ ] `src/components/pages/Payroll/DisbursementMigrationBadge.vue`
- [ ] `src/components/common/KpiCard.vue`
- [ ] `src/components/common/StatusPill.vue`
- [ ] `src/composables/utils/statusColors.js`
- [ ] `src/components/pages/Payroll/PayoutGroupStepperHeader.vue`
- [ ] `src/components/common/DataTable.vue`
- [ ] `src/composables/disbursement/useDisbursementApi.js`
- [ ] `src/composables/disbursement/stubData.js`

### Phase 1 — Pages (in order)
- [ ] `src/router/routes.js` — add sub-routes
- [ ] `src/pages/Disbursement/DisbursementListPage.vue`
- [ ] `src/pages/Disbursement/CompletePage.vue`
- [ ] `src/pages/Disbursement/ReviewPage.vue`
- [ ] `src/pages/Disbursement/PayslipsPage.vue`
- [ ] `src/pages/Disbursement/FundingPage.vue`
- [ ] `src/pages/Disbursement/DisbursePage.vue`
- [ ] `src/layouts/MainLayout.vue` — add migration badge

### Cleanup (after all flags on)
- [ ] Rename `PayrollPage.vue` → `PayrollPage.legacy.vue`
- [ ] Flatten routes to remove children wrapper
- [ ] Remove feature flags and badge component

---

## Decided

1. **Stub data** — simple placeholders ("Run 1", "Employee A", ₱1,000).
2. **Stepper lock logic** — sequential: step N is unlocked when step N-1 is complete (no backend endpoint needed).
3. **Donut charts** — removed from plan. `chart.js` + `vue-chartjs` are available in the project if needed later.
