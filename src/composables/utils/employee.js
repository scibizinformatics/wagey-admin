/**
 * Shared read accessors for an employee record.
 *
 * The API returns employee data in several shapes depending on the endpoint —
 * a role can arrive as `user_role_name`, as `user_role.name`, or nested under
 * `companies[0].user_role` — so every consumer needs the same defensive
 * unwrapping. These lived duplicated in EmployeesPage.vue and EmployeeTable.vue,
 * which meant the page and the table could disagree about an employee's status.
 * They are plain functions rather than a composable: no reactive state, nothing
 * to set up or tear down.
 */

const EM_DASH = '—'

export function getFullName(employee) {
  if (!employee) return 'N/A'
  return (
    `${employee.user?.first_name || ''} ${employee.user?.last_name || ''}`.trim() ||
    employee.user?.username ||
    'N/A'
  )
}

/**
 * Who approved a request, by name.
 *
 * The cash-advance endpoints return `approved_by` as the approver's id, and the
 * table printed it straight out, so an approved row read "by 14". The sibling
 * request endpoints (leave, overtime) return `approved_by_name` beside it, so
 * the name is often already in the payload under a different key — this looks
 * under every spelling in use and unwraps the object form.
 *
 * Returns '' when all that is available is an id. A bare number names nobody, so
 * callers show nothing rather than showing that.
 */
export function getApproverName(record) {
  if (!record) return ''

  const named = record.approved_by_name || record.approver_name || record.approved_by_full_name
  if (named) return String(named).trim()

  const by = record.approved_by ?? record.approver ?? record.approved_by_user
  if (by == null) return ''

  // Some payloads put the name straight in `approved_by`; an id, whether it
  // arrives as 14 or as "14", is not one.
  if (typeof by === 'string') {
    const text = by.trim()
    return /^d+$/.test(text) ? '' : text
  }

  if (typeof by === 'object') {
    const full =
      by.full_name ||
      by.name ||
      `${by.first_name || ''} ${by.last_name || ''}`.trim() ||
      by.username ||
      by.email
    return full ? String(full).trim() : ''
  }

  return ''
}

export function getEmail(employee) {
  return employee?.user?.email || 'N/A'
}

export function getPhoneNumber(employee) {
  return employee?.phone_number || 'N/A'
}

export function getRole(employee) {
  if (!employee) return 'N/A'
  if (employee.user_role_name) return String(employee.user_role_name)
  if (employee.user_role?.name) return String(employee.user_role.name)
  if (employee.companies?.length > 0) {
    const role = employee.companies[0].user_role
    return role?.name ? String(role.name) : 'N/A'
  }
  return 'N/A'
}

/**
 * Termination can be recorded in three places, and any one of them counts.
 * Anything else is treated as active.
 */
export function getStatus(employee) {
  if (!employee) return 'N/A'
  if (employee.status?.toLowerCase() === 'terminated') return 'Terminated'
  if (employee.is_active === false) return 'Terminated'
  const empStatus = employee.companies?.[0]?.employment_status
  if (empStatus?.toLowerCase() === 'terminated') return 'Terminated'
  return 'Active'
}

export function isTerminated(employee) {
  return getStatus(employee) === 'Terminated'
}

export function getInitials(name) {
  if (!name || name === 'N/A') return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Resolve an employee's contract pay type from the page-level contract cache,
 * which is keyed by company and then by employee id.
 *
 * The cache holds each employee's *active* contract (from
 * `/user/employee/{company}/{employee}/active-contract/`). A `null` entry means
 * "resolved: this employee has no active contract"; a missing entry means it has
 * not been fetched yet. Both render as "No Contract".
 */
export function getContract(employee, contracts, companyId) {
  if (!employee || !companyId) return 'N/A'

  const companyContracts = contracts?.[companyId]
  if (!companyContracts) return 'No Contract'

  const contract = companyContracts[employee.id]
  if (!contract) return 'No Contract'

  // Tolerate a wrapped list, in case the endpoint ever returns one.
  const record = Array.isArray(contract) ? contract[0] : contract

  // Never fall through to a bare `undefined` — that renders as an empty chip
  // styled as though a contract existed.
  return record?.pay_type || record?.contract?.name || record?.name || 'No Contract'
}

export function hasContract(employee, contracts, companyId) {
  return getContract(employee, contracts, companyId) !== 'No Contract'
}

export function getLeaveBalanceForType(employee, leaveTypeId) {
  const balances = employee?._balance?.leaveBalances || []
  const match = balances.find((b) => b.leave_type_id === leaveTypeId || b.id === leaveTypeId)
  if (!match) return EM_DASH
  return match.balance ?? match.days ?? match.hours ?? 0
}

export function getCtoBalance(employee) {
  let cto = employee?._balance?.ctoBalance
  if (cto === null || cto === undefined || cto === '') return EM_DASH

  // Object form: { remaining: "7.00", ... }
  if (typeof cto === 'object') {
    cto = cto.remaining ?? cto.hours ?? null
  }

  return cto !== null && cto !== undefined ? `${cto}h` : EM_DASH
}

/**
 * Identity colour for an avatar, from the design system's categorical ramp.
 * Hashed off the name so a person keeps the same colour across reloads.
 */
const AVATAR_COLORS = [
  'var(--dash-cat-1)',
  'var(--dash-cat-2)',
  'var(--dash-cat-3)',
  'var(--dash-cat-4)',
  'var(--dash-cat-5)',
  'var(--dash-cat-6)',
]

export function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/**
 * Collapse a person's name to a comparison key: lowercased, trimmed, and with
 * internal runs of whitespace reduced to one space. "  Jane   SMITH " and
 * "Jane Smith" are the same person written twice.
 */
function nameKey(name) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/**
 * Index employee records by display name, for payloads that identify a person
 * by name and nothing else.
 *
 * The audit trail's assignment history is the case this exists for: it carries
 * `employee_name` with no id, so the only way to put a face beside it is to
 * match the name against the employee list.
 *
 * A name shared by two employees maps to `null` rather than to whichever record
 * was seen first. That is the whole reason this is a builder and not a `find`
 * inside the component: on an audit screen, showing one colleague's photograph
 * against another's actions is a worse failure than showing no photograph, and
 * a first-match lookup makes exactly that mistake silently. Callers treat a
 * `null` — and a miss — the same way, by falling back to initials.
 *
 * @param {Array} employees  raw employee records, as `useEmployees` returns them
 * @returns {Map<string, object|null>}
 */
export function buildEmployeeNameIndex(employees) {
  const index = new Map()
  for (const employee of Array.isArray(employees) ? employees : []) {
    const key = nameKey(getFullName(employee))
    // `getFullName` answers 'N/A' for a record with no name at all; indexing
    // that would make every unnamed employee the same person.
    if (!key || key === 'n/a') continue
    index.set(key, index.has(key) ? null : employee)
  }
  return index
}

/**
 * Everything needed to draw one avatar for a named person: the photograph when
 * the name resolves to exactly one employee who has one, and the initials and
 * identity colour to fall back on when it does not.
 *
 * @param {Map<string, object|null>|null} index  from `buildEmployeeNameIndex`
 * @param {string} name
 */
export function avatarFor(index, name) {
  const match = index?.get(nameKey(name)) ?? null
  return {
    pictureUrl: match?.user?.picture_url || '',
    initials: getInitials(name),
    color: getAvatarColor(name),
  }
}

/**
 * Does this name belong to somebody in the indexed employee list?
 *
 * Membership, not identity — a name shared by two employees indexes to `null`
 * (see `buildEmployeeNameIndex`), and that is still a "yes" here: we cannot say
 * *which* colleague it is, but we can say the name is one of this company's.
 * That distinction is why this asks the Map with `has` rather than reading the
 * value out; `avatarFor` deliberately makes the opposite call, because drawing
 * the wrong face is worse than drawing none.
 *
 * The audit trail uses this to keep another workspace's rows off the table: its
 * payload names a person and carries no company, so the roster is the only
 * thing that can say whether an entry belongs here.
 *
 * @param {Map<string, object|null>|null} index  from `buildEmployeeNameIndex`
 * @param {string} name
 */
export function hasEmployeeName(index, name) {
  return Boolean(index?.has(nameKey(name)))
}
