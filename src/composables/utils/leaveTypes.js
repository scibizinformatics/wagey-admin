/**
 * Leave types and their grant policies — the shared reading of
 * `GET /attendance/leave-types/` and `GET /attendance/leave-policies/…`.
 *
 * A leave type is what somebody files ("Sick Leave"); a *policy* is the rule
 * that puts credits in their ledger. One type carries any number of policies,
 * and the list endpoint embeds them, so the Admin Settings table, the policies
 * dialog and the create form all read the same rows — which is why the
 * arithmetic and the wording live here rather than in each of them.
 *
 * Five things about the payload drive the helpers below.
 *
 * First, **`departments: []` means company-wide, not "no departments"**. An
 * empty scope is the widest policy there is, so a renderer that prints the
 * array length says "0 departments" about a rule covering everyone. Use
 * `policyScopeLabel`.
 *
 * Second, **`uses_balance` may be absent**, and its documented default is
 * `is_paid || is_cto` rather than `false`. Defaulting a missing value to false
 * would hide a type from every balance-granting screen in the app, so
 * `normalizeLeaveType` applies the real default and records whether the server
 * actually said so.
 *
 * Third, **decimals arrive as strings** (`"1.50"`, `"30.00"`) and `max_balance`
 * is legitimately `null`, meaning no cap — not a cap of zero. `formatDays`
 * trims the trailing zeros for display and `formatMaxBalance` prints the null
 * as words.
 *
 * Fourth, **`event` and `none` policies are overlays**. They stack on top of a
 * department's monthly/annual accrual instead of replacing it, and `event`
 * credits are only ever granted by hand through
 * `POST /attendance/leave-balances/add/`. A summary that counts all policies
 * together therefore overstates how much a department accrues, so
 * `summarizePolicies` keeps the two kinds apart.
 *
 * Fifth, **a department may hold at most one monthly/annual policy per type**.
 * The server enforces it; `findScopeConflict` says so before the round trip,
 * because a 400 on submit is a worse way to learn it.
 */

/** How credits are granted. Order is the order the picker offers them in. */
export const GRANT_TYPES = [
  {
    value: 'monthly',
    label: 'Monthly',
    hint: 'Credits are granted every month, from the anchor date.',
  },
  {
    value: 'annual',
    label: 'Annual',
    hint: 'Credits are granted once a year, from the anchor date.',
  },
  {
    value: 'event',
    label: 'Event (granted by hand)',
    hint: 'No automatic grant — an admin adds credits when the event happens. Stacks on top of a monthly or annual policy.',
  },
  {
    value: 'none',
    label: 'No grant',
    hint: 'Scopes the leave type to these departments without granting anything.',
  },
]

/** The reference date an annual grant counts from. */
export const GRANT_ANCHORS = [
  { value: 'date_joined', label: 'Date joined' },
  { value: 'calendar_year', label: 'Calendar year' },
]

/** Who pays for the leave. */
export const FUNDERS = [
  { value: 'employer', label: 'Employer' },
  { value: 'government', label: 'Government' },
  { value: 'social_insurance', label: 'Social insurance' },
  { value: 'other', label: 'Other' },
]

/** Grant types that stack on top of an accrual rather than being one. */
const OVERLAY_GRANT_TYPES = ['event', 'none']

/** Ids cross the wire as numbers here and as strings elsewhere. */
export function sameId(a, b) {
  if (a == null || b == null) return false
  return String(a) === String(b)
}

function labelFor(options, value, fallback) {
  const match = options.find((option) => option.value === value)
  return match ? match.label : value ? String(value) : fallback
}

export function grantTypeLabel(value) {
  return labelFor(GRANT_TYPES, value, 'No grant')
}

export function grantAnchorLabel(value) {
  return labelFor(GRANT_ANCHORS, value, '—')
}

export function funderLabel(value) {
  return labelFor(FUNDERS, value, 'Employer')
}

/**
 * A decimal string as a person would write it: `"1.50"` → `1.5`, `"10.00"` →
 * `10`. Anything unparseable comes back as an em dash rather than `NaN`.
 */
export function formatDays(value) {
  if (value === null || value === undefined || value === '') return '—'
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return '—'
  return String(Math.round(parsed * 100) / 100)
}

/** `null` is no cap at all, which is a different answer from a cap of zero. */
export function formatMaxBalance(value) {
  if (value === null || value === undefined || value === '') return 'No cap'
  return `${formatDays(value)} days`
}

export function formatServiceLength(months) {
  const parsed = Number(months)
  if (!Number.isFinite(parsed) || parsed <= 0) return 'From day one'
  return `After ${parsed} ${parsed === 1 ? 'month' : 'months'}`
}

export function isOverlayGrantType(grantType) {
  return OVERLAY_GRANT_TYPES.includes(grantType)
}

/**
 * Whether a grant repeats from an anchor date. Monthly credits are granted on
 * the employee's own monthly cycle just as annual ones are on their yearly
 * cycle, so both count from `date_joined` or `calendar_year`; event and none
 * grants have nothing to count from.
 */
export function grantsFromAnchor(grantType) {
  return grantType === 'monthly' || grantType === 'annual'
}

/**
 * One policy row into the shape every renderer reads.
 *
 * `departments` comes back as objects (`[{ id, name }]`) on both the leave-type
 * payload and the policy list endpoint, but a create body sends bare ids — so
 * the normalized row carries both `departments` (the objects, for display) and
 * `departmentIds` (for a form).
 */
export function normalizePolicy(raw) {
  const departments = Array.isArray(raw?.departments) ? raw.departments : []
  // `departments_display` is the server's own list of names; it stands in when
  // the objects came through without one.
  const display = Array.isArray(raw?.departments_display) ? raw.departments_display : []

  const asObjects = departments.map((department, index) => {
    const id = typeof department === 'object' && department !== null ? department.id : department
    const name =
      (typeof department === 'object' && department !== null ? department.name : null) ||
      display[index] ||
      `Department ${id}`
    return { id: id ?? null, name }
  })

  const grantType = raw?.grant_type || 'none'

  return {
    id: raw?.id ?? null,
    leaveTypeId: raw?.leave_type ?? null,
    leaveTypeName: raw?.leave_type_name || '',
    companyName: raw?.company_name || '',
    departments: asObjects,
    departmentIds: asObjects.map((department) => department.id).filter((id) => id != null),
    grantType,
    grantAmount: raw?.grant_amount ?? '0',
    grantAnchor: raw?.grant_anchor || 'date_joined',
    serviceLengthRequired: Number(raw?.service_length_required ?? 0) || 0,
    // Kept null rather than coerced: no cap and a cap of zero are different.
    maxBalance: raw?.max_balance ?? null,
    isOverlay: OVERLAY_GRANT_TYPES.includes(grantType),
    companyWide: asObjects.length === 0,
  }
}

/**
 * One leave type into the shape every renderer reads.
 *
 * `usesBalance` applies the documented default when the server omits the field,
 * and `usesBalanceStated` records that it did so — a form that sent the derived
 * value back as though the admin had chosen it would silently freeze a default
 * that is meant to follow the paid/CTO flags.
 */
export function normalizeLeaveType(raw) {
  const isPaid = raw?.is_paid ?? true
  const isCto = raw?.is_cto ?? false
  const statedUsesBalance = raw?.uses_balance

  return {
    id: raw?.id ?? null,
    name: raw?.name || 'Leave',
    description: raw?.description || '',
    companyId: raw?.company ?? null,
    isPaid,
    isCto,
    isPictureRequired: raw?.is_picture_required ?? false,
    isStatutory: raw?.is_statutory ?? false,
    isConvertibleToCash: raw?.is_convertible_to_cash ?? false,
    funder: raw?.funder || 'employer',
    usesBalance: statedUsesBalance ?? (isPaid || isCto),
    usesBalanceStated: statedUsesBalance !== undefined && statedUsesBalance !== null,
    policies: Array.isArray(raw?.policies) ? raw.policies.map(normalizePolicy) : [],
  }
}

export function normalizeLeaveTypes(raw) {
  const rows = Array.isArray(raw) ? raw : (raw?.results ?? raw?.data ?? [])
  return (Array.isArray(rows) ? rows : []).map(normalizeLeaveType)
}

/**
 * The chips the table prints for one type.
 *
 * Paid/unpaid is always shown because it is the fact people open the table for.
 * Everything else appears only when it is *not* the default — a row of "no"
 * chips is width spent saying nothing, and the exceptional states are the ones
 * worth seeing. Two of them are therefore inverted: a ledger is the norm for a
 * paid type, so the chip names its absence, and the employer funds leave unless
 * told otherwise, so only another funder is named. This is also why the funder
 * is not a column of its own — it would read "Employer" on nearly every row.
 */
export function leaveTypeAttributes(type) {
  if (!type) return []
  const chips = [
    type.isPaid
      ? { key: 'paid', label: 'Paid', tone: 'good' }
      : { key: 'unpaid', label: 'Unpaid', tone: 'neutral' },
  ]
  if (type.isCto) chips.push({ key: 'cto', label: 'CTO', tone: 'info' })
  if (type.isStatutory) chips.push({ key: 'statutory', label: 'Statutory', tone: 'info' })
  if (type.funder && type.funder !== 'employer') {
    chips.push({ key: 'funder', label: `${funderLabel(type.funder)}-funded`, tone: 'info' })
  }
  if (type.isPictureRequired) chips.push({ key: 'photo', label: 'Photo required', tone: 'warn' })
  if (type.isConvertibleToCash)
    chips.push({ key: 'cash', label: 'Convertible to cash', tone: 'neutral' })
  if (!type.usesBalance) chips.push({ key: 'no-ledger', label: 'No balance', tone: 'neutral' })
  return chips
}

/** How a policy's scope reads. An empty department list is the widest scope. */
export function policyScopeLabel(policy) {
  if (!policy || policy.companyWide) return 'All departments'
  const names = policy.departments.map((department) => department.name).filter(Boolean)
  if (!names.length) return 'All departments'
  return names.join(', ')
}

/** How a policy's grant reads on one line: "Monthly · 1.5 days from date joined". */
export function policyGrantLabel(policy) {
  if (!policy) return '—'
  if (policy.grantType === 'none') return 'No grant'
  const amount = formatDays(policy.grantAmount)
  const days = amount === '1' ? 'day' : 'days'
  if (policy.grantType === 'event') return `Event · ${amount} ${days} by hand`
  const anchor = grantsFromAnchor(policy.grantType)
    ? ` from ${grantAnchorLabel(policy.grantAnchor).toLowerCase()}`
    : ''
  return `${grantTypeLabel(policy.grantType)} · ${amount} ${days}${anchor}`
}

/**
 * What the table's policy column says about a type.
 *
 * Accruals and overlays are counted separately (see the header note): adding
 * them would report a department as having two grants when it has one grant and
 * one manual allowance.
 */
export function summarizePolicies(policies = []) {
  const rows = Array.isArray(policies) ? policies : []
  const accruing = rows.filter((policy) => !policy.isOverlay)
  const overlays = rows.filter((policy) => policy.isOverlay)

  const departmentIds = new Set()
  for (const policy of rows) {
    if (policy.companyWide) continue
    for (const id of policy.departmentIds) departmentIds.add(String(id))
  }

  return {
    total: rows.length,
    hasAny: rows.length > 0,
    accruing: accruing.length,
    overlays: overlays.length,
    companyWide: rows.some((policy) => policy.companyWide),
    departmentsCovered: departmentIds.size,
  }
}

/** An empty policy form, matching the endpoint's own defaults. */
export function emptyPolicyDraft() {
  return {
    departments: [],
    grant_type: 'monthly',
    grant_amount: 1,
    grant_anchor: 'date_joined',
    service_length_required: 0,
    max_balance: null,
  }
}

/** An empty leave-type form. `uses_balance` starts where the API default is. */
export function emptyLeaveTypeForm() {
  return {
    id: null,
    name: '',
    description: '',
    is_paid: true,
    is_picture_required: false,
    is_cto: false,
    funder: 'employer',
    is_statutory: false,
    is_convertible_to_cash: false,
    uses_balance: true,
    // False while `uses_balance` is still following `is_paid || is_cto`, which
    // is the server's own default. Once an admin moves the toggle it stops
    // following, so a deliberate "paid but no ledger" survives a later change
    // to the paid flag.
    uses_balance_touched: false,
  }
}

/** An existing type as the edit form reads it. */
export function leaveTypeToForm(type) {
  return {
    id: type.id,
    name: type.name,
    description: type.description,
    is_paid: type.isPaid,
    is_picture_required: type.isPictureRequired,
    is_cto: type.isCto,
    funder: type.funder,
    is_statutory: type.isStatutory,
    is_convertible_to_cash: type.isConvertibleToCash,
    uses_balance: type.usesBalance,
    // An existing type was saved with whatever value it holds, so the toggle is
    // no longer following the default.
    uses_balance_touched: true,
  }
}

/** What `uses_balance` defaults to while the admin has not set it themselves. */
export function defaultUsesBalance(form) {
  return Boolean(form?.is_paid || form?.is_cto)
}

/** The leave-type half of a create/update body. */
export function leaveTypePayload(form, companyId) {
  const payload = {
    name: (form.name || '').trim(),
    description: (form.description || '').trim(),
    is_paid: Boolean(form.is_paid),
    is_picture_required: Boolean(form.is_picture_required),
    is_cto: Boolean(form.is_cto),
    funder: form.funder || 'employer',
    is_statutory: Boolean(form.is_statutory),
    is_convertible_to_cash: Boolean(form.is_convertible_to_cash),
    uses_balance: Boolean(form.uses_balance),
  }
  if (companyId != null) payload.company = Number(companyId)
  return payload
}

/** A policy draft as the API takes it. An empty scope is sent as an empty list. */
export function policyPayload(draft) {
  const grantType = draft.grant_type || 'none'
  const maxBalance = draft.max_balance
  return {
    departments: (draft.departments || []).map((id) => Number(id)),
    grant_type: grantType,
    // The endpoint rejects a non-zero amount on a `none` policy, so the zero is
    // forced here rather than trusting whatever the form last held.
    grant_amount: grantType === 'none' ? 0 : Number(draft.grant_amount) || 0,
    grant_anchor: draft.grant_anchor || 'date_joined',
    service_length_required: Number(draft.service_length_required) || 0,
    max_balance:
      maxBalance === null || maxBalance === undefined || maxBalance === ''
        ? null
        : Number(maxBalance),
  }
}

/**
 * Why a policy draft cannot be saved, or `null`.
 *
 * Returns a sentence, not a field name: these are raised as toasts beside a
 * form whose fields are all visible, so naming the rule beats naming the input.
 */
export function validatePolicyDraft(draft) {
  const grantType = draft?.grant_type || 'none'
  const amount = Number(draft?.grant_amount)

  if (grantType === 'none' && amount) {
    return 'A policy that grants nothing must have an amount of 0.'
  }
  if (grantType !== 'none' && (!Number.isFinite(amount) || amount <= 0)) {
    return 'Enter how many days each grant is worth.'
  }
  const service = Number(draft?.service_length_required ?? 0)
  if (!Number.isFinite(service) || service < 0) {
    return 'Service length must be 0 months or more.'
  }
  const cap = draft?.max_balance
  if (cap !== null && cap !== undefined && cap !== '') {
    const parsed = Number(cap)
    if (!Number.isFinite(parsed) || parsed < 0) return 'A maximum balance must be 0 days or more.'
    if (grantType !== 'none' && parsed > 0 && parsed < amount) {
      return 'The maximum balance is smaller than a single grant.'
    }
  }
  return null
}

/**
 * The existing policy a draft would collide with, or `null`.
 *
 * Only accruals collide: the server allows any number of `event`/`none`
 * overlays beside them, and allows a company-wide accrual beside a
 * department-scoped one. A department already carrying a monthly or annual
 * policy for this type cannot be given a second one.
 */
export function findScopeConflict(draft, policies = []) {
  const grantType = draft?.grant_type || 'none'
  if (OVERLAY_GRANT_TYPES.includes(grantType)) return null

  const wanted = (draft?.departments || []).map(String)
  const accruals = policies.filter((policy) => !policy.isOverlay)

  if (!wanted.length) {
    // A company-wide accrual competes with the existing company-wide one only.
    return accruals.find((policy) => policy.companyWide) || null
  }
  return (
    accruals.find(
      (policy) =>
        !policy.companyWide && policy.departmentIds.some((id) => wanted.includes(String(id))),
    ) || null
  )
}
