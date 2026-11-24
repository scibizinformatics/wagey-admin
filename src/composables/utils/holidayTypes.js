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
 * Second, **`auto_generation_mode` decides what a holiday of the type creates**,
 * and only one of its three values reads the chain at all. `leave_type` debits
 * leave credits through the policies; `attendance` marks the day paid for
 * monthly employees and needs no policy; `none` creates nothing. The policies
 * are stored and listed under every mode — they are simply unused by two of
 * them. The combination worth naming on screen is `leave_type` with no enabled
 * source behind it, which looks configured and grants nothing; `autoApplyState`
 * reports the four states apart. `auto_generate_leave` survives on read as the
 * backend's backward-compatible boolean and is never written.
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

/**
 * The three ways a holiday type can cover its holidays, in the order offered.
 *
 * `description` is the sentence the create dialog prints beside each label —
 * it is the only place the difference between the three is written down, so it
 * says what happens to the *balance*, not just what the mode is called. The
 * `badge` is the same fact cut down for the table cell, and `hint` is the
 * longer explanation a tooltip carries.
 */
export const HOLIDAY_AUTO_GENERATION_MODES = [
  {
    value: 'none',
    label: 'No auto generation',
    badge: 'Off',
    description:
      'Nothing is created when a holiday is added — employees file their own leave or attendance.',
    hint: 'Holidays of this type generate nothing automatically.',
  },
  {
    value: 'leave_type',
    label: 'Auto-leave using leave type',
    badge: 'Leave type',
    description:
      'Grants approved leave from the first source with enough credits, and deducts the balance.',
    hint: 'Eligible employees are granted leave from the first enabled source that approves, deducted from their credits.',
  },
  {
    value: 'attendance',
    label: 'Paid holiday attendance',
    badge: 'Attendance',
    description:
      'Marks the day paid for monthly employees — no leave is deducted, and no leave sources are needed.',
    hint: 'Monthly employees are marked present and paid for the day. No leave credit is used.',
  },
]

const AUTO_GENERATION_MODE_VALUES = HOLIDAY_AUTO_GENERATION_MODES.map((mode) => mode.value)

/** The descriptor for a mode, falling back to `none` for anything unrecognised. */
export function autoGenerationModeEntry(mode) {
  return (
    HOLIDAY_AUTO_GENERATION_MODES.find((entry) => entry.value === mode) ||
    HOLIDAY_AUTO_GENERATION_MODES[0]
  )
}

/**
 * The mode a row or a form carries.
 *
 * `auto_generation_mode` is the field to read and the only one to write.
 * `auto_generate_leave` is the backend's backward-compatible boolean: a payload
 * that predates the mode still answers `true` for "leave generation", and a
 * payload that sends the boolean is mapped onto `leave_type` server-side. The
 * create endpoint takes **only** the mode, which is why the form and the body
 * deal in modes alone.
 */
export function autoGenerationModeOf(row) {
  const mode = String(row?.autoGenerationMode ?? row?.auto_generation_mode ?? '')
  if (AUTO_GENERATION_MODE_VALUES.includes(mode)) return mode
  return row?.auto_generate_leave === true ? 'leave_type' : 'none'
}

/** Whether the mode draws on the leave-source chain. */
export function usesLeaveSources(mode) {
  return mode === 'leave_type'
}

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
    // Null rather than 0: an unsent order means the row carries no position of
    // its own, and 0 would sort it ahead of the chain. Note the *server* does
    // not choose the end of the chain for a missing order — it defaults to 1,
    // which is why `useAdminHolidayPolicies.assignPolicy` sends one explicitly.
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
    autoGenerationMode: autoGenerationModeOf(raw),
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
 * What the auto-generation column says, as one of four states.
 *
 * The two that carry the weight: `attendance` looks like auto-generation and is
 * — but it moves no leave credits, so the chain behind it is inert; and
 * `no-source` is `leave_type` with nothing enabled behind it, which is
 * configured, listed, and grants nothing when a holiday fires. The server logs
 * that one and no one sees the log.
 *
 * The `on` key is the only state in which leave is actually debited; the
 * Holidays panel gates its "this holiday grants leave" confirm on exactly it.
 */
export function autoApplyState(type) {
  const mode = autoGenerationModeOf(type)
  const entry = autoGenerationModeEntry(mode)

  if (mode === 'attendance') {
    return {
      key: 'attendance',
      label: entry.badge,
      tone: 'info',
      hint: entry.hint,
    }
  }

  if (mode !== 'leave_type') {
    return {
      key: 'off',
      label: entry.badge,
      tone: 'neutral',
      hint: entry.hint,
    }
  }

  const summary = summarizeHolidayPolicies(type?.policies)
  if (!summary.enabled) {
    return {
      key: 'no-source',
      label: 'Leave type, no source',
      tone: 'warn',
      hint: 'Auto-leave is on but no enabled leave source is attached, so nothing is granted.',
    }
  }
  return {
    key: 'on',
    label: entry.badge,
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
    auto_generation_mode: 'none',
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
    auto_generation_mode: autoGenerationModeOf(type),
    // An existing type already has a code, and holidays point at it by string.
    code_touched: true,
  }
}

/**
 * The holiday-type half of a create/update body.
 *
 * `auto_generation_mode` is sent on its own: the create endpoint does not accept
 * the legacy `auto_generate_leave` boolean at all (it is a read-side mapping),
 * so sending it alongside the mode would be a second source of truth that the
 * server ignores on one route and honours on the other.
 */
export function holidayTypePayload(form, companyId) {
  const payload = {
    code: slugifyCode(form.code),
    name: (form.name || '').trim(),
    description: (form.description || '').trim(),
    auto_generation_mode: autoGenerationModeOf(form),
  }
  if (companyId != null) payload.company = Number(companyId)
  return payload
}

/**
 * A policy draft as the API takes it.
 *
 * An absent order is left out rather than sent as null — but the server's own
 * default for it is 1, not "the end of the chain", so a caller that wants the
 * position after an existing chain must compute it (`nextOrder`) and pass it.
 */
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
 * Why the chosen auto-generation mode cannot be saved on **create**, or `null`.
 *
 * Only `leave_type` needs anything else: it draws on the chain, and the create
 * endpoint takes the type and its first source in one atomic body — so a
 * `leave_type` type sent with no source is either rejected or saved granting
 * nothing, and reporting "Holiday type created" over that is the worse outcome.
 *
 * Editing is deliberately not covered. The chain has its own dialog there, and
 * refusing the mode switch on a type whose chain is empty would make the form
 * un-saveable for a reason the reader can only fix from a menu they are no
 * longer looking at. The edit dialog warns instead; the table's `no-source`
 * state is the durable record of it.
 */
export function autoGenerationProblem(form, policyDraft = null) {
  if (autoGenerationModeOf(form) !== 'leave_type') return null
  if (policyDraft?.leave_type == null) {
    return 'Auto-leave needs a leave source. Pick the first one below, or choose another mode.'
  }
  return null
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
