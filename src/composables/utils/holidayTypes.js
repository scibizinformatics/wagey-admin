/**
 * Holiday types and their leave-source policies — the shared reading of
 * `GET /attendance/holiday-types/` and `GET /attendance/holiday-policies/…`.
 *
 * A holiday type is a kind of holiday ("Special Non-Working Holiday"); its
 * *policies* are the leave types the system draws on when a holiday of that
 * kind fires, tried in order until one approves. So a type's policies are not a
 * set — they are a **fallback chain**, and their order is the feature.
 *
 * Five things drive the helpers below.
 *
 * First, **`code` is identity, not decoration**. It is unique per company and
 * it is what a Holiday names when it attaches itself to a type, so renaming a
 * type is safe and re-coding one is not: existing holidays point at the old
 * string. `slugifyCode` produces the conventional shape (lowercase, underscores)
 * and the edit form says out loud what changing it costs.
 *
 * Second, **`auto_generate_leave` is a gate over the whole chain**. With it off,
 * the policies are still stored and still listed but nothing is ever applied.
 * The combination worth naming on screen is the other one — the gate on with no
 * enabled policy behind it — which looks configured and does nothing;
 * `autoApplyState` reports those three states apart.
 *
 * Third, **a disabled policy is skipped**, so "how many sources does this type
 * have" and "how many will actually be tried" are different questions.
 * `summarizeHolidayPolicies` answers both.
 *
 * Fourth, **the nested key is `holiday_policies`**, not `policies` — the list
 * endpoint and the per-type endpoint disagree on the wrapper but not on the row,
 * so `normalizeHolidayType` reads either.
 *
 * Fifth, **`order` is unique per holiday type**. Two policies cannot hold the
 * same position, which is why a reorder cannot be done as a straight swap; see
 * `useAdminHolidayPolicies`.
 */

/** The codes the API documents as examples. Offered, never enforced. */
export const HOLIDAY_CODE_SUGGESTIONS = [
  { value: 'regular', label: 'regular', hint: 'Regular holiday' },
  { value: 'special', label: 'special', hint: 'Special non-working holiday' },
  { value: 'special_working', label: 'special_working', hint: 'Special working holiday' },
]

/** Ids cross the wire as numbers here and as strings elsewhere. */
export function sameId(a, b) {
  if (a == null || b == null) return false
  return String(a) === String(b)
}

/**
 * A code as the API expects it: lowercase, underscores, nothing else.
 *
 * Applied on the way out rather than as you type, so a half-typed
 * "Special Working" is not rewritten under the cursor.
 */
export function slugifyCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** One policy row into the shape every renderer reads. */
export function normalizeHolidayPolicy(raw) {
  return {
    id: raw?.id ?? null,
    companyId: raw?.company ?? null,
    companyName: raw?.company_name || '',
    holidayTypeId: raw?.holiday_type ?? null,
    holidayTypeName: raw?.holiday_type_name || '',
    leaveTypeId: raw?.leave_type ?? null,
    // The list endpoints send the name; a freshly assigned row may not, and the
    // caller resolves it against the company's leave types instead.
    leaveTypeName: raw?.leave_type_name || '',
    // Null rather than 0: an unsent order means "the server will assign one",
    // and 0 would sort it ahead of the chain it is meant to join the end of.
    order: raw?.order ?? null,
    isEnabled: raw?.is_enabled ?? true,
  }
}

/**
 * Chain order. The server sends them ordered, but a locally-added row or a
 * payload that omits `order` must not float to an arbitrary position — an
 * unordered policy sorts last, which is where the server would put it.
 */
export function sortHolidayPolicies(policies = []) {
  return [...policies].sort((a, b) => {
    if (a.order == null && b.order == null) return 0
    if (a.order == null) return 1
    if (b.order == null) return -1
    return a.order - b.order
  })
}

/** One holiday type into the shape every renderer reads. */
export function normalizeHolidayType(raw) {
  const rawPolicies = Array.isArray(raw?.holiday_policies)
    ? raw.holiday_policies
    : Array.isArray(raw?.policies)
      ? raw.policies
      : []

  return {
    id: raw?.id ?? null,
    code: raw?.code || '',
    name: raw?.name || raw?.code || 'Holiday type',
    description: raw?.description || '',
    companyId: raw?.company ?? null,
    companyName: raw?.company_name || '',
    autoGenerateLeave: raw?.auto_generate_leave ?? false,
    policies: sortHolidayPolicies(rawPolicies.map(normalizeHolidayPolicy)),
  }
}

export function normalizeHolidayTypes(raw) {
  const rows = Array.isArray(raw) ? raw : (raw?.results ?? raw?.data ?? [])
  return (Array.isArray(rows) ? rows : []).map(normalizeHolidayType)
}

/** Sources and how many of them will actually be tried. */
export function summarizeHolidayPolicies(policies = []) {
  const rows = Array.isArray(policies) ? policies : []
  const enabled = rows.filter((policy) => policy.isEnabled)
  return {
    total: rows.length,
    hasAny: rows.length > 0,
    enabled: enabled.length,
    disabled: rows.length - enabled.length,
  }
}

/**
 * The chain in reading order: "Birthday Leave → Emergency Leave".
 *
 * Disabled sources are left out rather than struck through — the chain is what
 * will be tried, and a name in it that is quietly skipped is worse than absent.
 * `limit` keeps a table cell to one line; the remainder is reported as a count.
 */
export function policyChainLabel(policies = [], limit = 2) {
  const enabled = sortHolidayPolicies(policies.filter((policy) => policy.isEnabled))
  if (!enabled.length) return ''
  const names = enabled.map((policy) => policy.leaveTypeName || `Leave type ${policy.leaveTypeId}`)
  if (names.length <= limit) return names.join(' → ')
  return `${names.slice(0, limit).join(' → ')} +${names.length - limit}`
}

/**
 * What the auto-apply column says, as one of three states.
 *
 * The middle one is the reason this exists: a type with the gate on and no
 * enabled source is configured, listed, and does nothing when a holiday fires —
 * the server logs it and no one sees the log.
 */
export function autoApplyState(type) {
  const summary = summarizeHolidayPolicies(type?.policies)
  if (!type?.autoGenerateLeave) {
    return {
      key: 'off',
      label: 'Off',
      tone: 'neutral',
      hint: 'Holidays of this type never apply leave automatically.',
    }
  }
  if (!summary.enabled) {
    return {
      key: 'no-source',
      label: 'On, no source',
      tone: 'warn',
      hint: 'Auto-apply is on but no enabled leave source is attached, so nothing is granted.',
    }
  }
  return {
    key: 'on',
    label: 'On',
    tone: 'good',
    hint: `Eligible employees are granted leave from the first of ${summary.enabled} source${
      summary.enabled === 1 ? '' : 's'
    } that approves.`,
  }
}

/** The next free position at the end of the chain. */
export function nextOrder(policies = []) {
  const orders = policies.map((policy) => Number(policy.order)).filter(Number.isFinite)
  if (!orders.length) return 1
  return Math.max(...orders) + 1
}

/** An order no existing policy holds, for parking a row mid-reorder. */
export function parkingOrder(policies = []) {
  return nextOrder(policies) + 1000
}

/** An empty policy form. `order` is left to the caller, who knows the chain. */
export function emptyHolidayPolicyDraft() {
  return {
    leave_type: null,
    order: null,
    is_enabled: true,
  }
}

/** An empty holiday-type form. */
export function emptyHolidayTypeForm() {
  return {
    id: null,
    code: '',
    name: '',
    description: '',
    auto_generate_leave: false,
    // False while `code` is still following `name`. Once an admin types a code
    // it stops following, so a deliberate code survives a later rename.
    code_touched: false,
  }
}

/** An existing type as the edit form reads it. */
export function holidayTypeToForm(type) {
  return {
    id: type.id,
    code: type.code,
    name: type.name,
    description: type.description,
    auto_generate_leave: type.autoGenerateLeave,
    // An existing type already has a code, and holidays point at it by string.
    code_touched: true,
  }
}

/** The holiday-type half of a create/update body. */
export function holidayTypePayload(form, companyId) {
  const payload = {
    code: slugifyCode(form.code),
    name: (form.name || '').trim(),
    description: (form.description || '').trim(),
    auto_generate_leave: Boolean(form.auto_generate_leave),
  }
  if (companyId != null) payload.company = Number(companyId)
  return payload
}

/** A policy draft as the API takes it. An absent order is left to the server. */
export function holidayPolicyPayload(draft) {
  const payload = {
    leave_type: Number(draft.leave_type),
    is_enabled: Boolean(draft.is_enabled),
  }
  const order = Number(draft.order)
  if (Number.isFinite(order) && order > 0) payload.order = order
  return payload
}

/**
 * Why a holiday type cannot be saved, or `null`.
 *
 * Sentences rather than field names: the form is small and fully visible, so
 * naming the rule reads better than naming the input.
 */
export function validateHolidayTypeForm(form) {
  if (!String(form?.name || '').trim()) return 'Give the holiday type a name.'
  if (!slugifyCode(form?.code)) {
    return 'Give the holiday type a code — letters and numbers, used to attach holidays to it.'
  }
  return null
}

/** Why a policy draft cannot be saved, or `null`. */
export function validateHolidayPolicyDraft(draft, policies = []) {
  if (draft?.leave_type == null) return 'Pick the leave type this holiday grants.'
  if (policies.some((policy) => sameId(policy.leaveTypeId, draft.leave_type))) {
    return 'That leave type is already a source for this holiday type.'
  }
  const order = draft?.order
  if (order !== null && order !== undefined && order !== '') {
    const parsed = Number(order)
    if (!Number.isFinite(parsed) || parsed < 1) return 'Order must be a whole number of 1 or more.'
    if (policies.some((policy) => Number(policy.order) === parsed)) {
      return `Another source already holds position ${parsed}. Orders are unique within a holiday type.`
    }
  }
  return null
}
