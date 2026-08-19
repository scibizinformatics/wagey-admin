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
