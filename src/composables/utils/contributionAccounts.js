/**
 * Employee contribution account numbers — the shared reading of
 *   GET   /payroll/contributions/accounts/{company_id}/
 *   POST  /payroll/contributions/accounts/{company_id}/
 *   PATCH /payroll/contributions/accounts/{company_id}/{id}/
 *
 * An account row pairs one employee with one contribution type and the number
 * that scheme knows them by. The number itself is immutable: PATCH accepts only
 * `is_active`, so changing a number is deactivate-then-create, and the old row
 * stays on record as history. Everything below is built around that — there is
 * a create payload and a deactivation, never an account-number update.
 *
 * The row names its employee twice: `employee_company`, the membership id, and
 * `employee_name`. POST wants the employee's UUID. `employeeUuidForAccount` is
 * the only place those two vocabularies are reconciled, and it answers null
 * rather than guessing when the roster cannot settle the question — the replace
 * dialog then asks the admin to pick the employee again.
 */

import { contributionTypeLabel, rowsFrom, sameId } from 'src/composables/utils/contributionSettings'
import {
  buildEmployeeNameIndex,
  employeeByName,
  getFullName,
  isTerminated,
  nameKey,
} from 'src/composables/utils/employee'
import { formatDateTime } from 'src/composables/utils/format'

/** One account row into the shape every renderer reads. */
export function normalizeContributionAccount(raw) {
  const type = raw?.component_type
  return {
    id: raw?.id ?? null,
    companyId: raw?.company?.id ?? raw?.company ?? null,
    // The read side documents this as a membership id, but the same field is
    // nested on some list shapes; `String(object)` would be "[object Object]"
    // and quietly match nothing.
    employeeCompany:
      raw?.employee_company?.id ?? raw?.employee_company ?? raw?.employee_company_id ?? null,
    employeeId: raw?.employee?.id ?? raw?.employee_id ?? raw?.employee_uuid ?? null,
    employeeName: String(raw?.employee_name ?? raw?.employee?.full_name ?? '').trim(),
    typeId: type?.id ?? type ?? null,
    typeName: String(raw?.component_type_name ?? type?.name ?? '').trim(),
    typeCode: String(raw?.component_type_code ?? type?.code ?? '').trim(),
    accountNumber: String(raw?.account_number ?? '').trim(),
    isActive: raw?.is_active ?? true,
    createdAt: raw?.created_at ?? null,
    deactivatedAt: raw?.deactivated_at ?? null,
  }
}

export function normalizeContributionAccounts(payload) {
  return rowsFrom(payload)
    .map(normalizeContributionAccount)
    .filter((account) => account.id != null)
}

// ─── Labels ────────────────────────────────────────────────────────────────

/**
 * The scheme an account belongs to.
 *
 * The live type list wins over the name the row carried when it was read: a
 * type renamed in the Types dialog should read under its new name everywhere,
 * and the row's own `component_type_name` is the fallback for a type that has
 * since been deleted (or for a response that never carried the list).
 */
export function accountTypeLabel(account, type = null) {
  if (type) return contributionTypeLabel(type)
  if (account?.typeName) return account.typeName
  if (account?.typeCode) return account.typeCode
  return account?.typeId != null ? `Type ${account.typeId}` : 'Unassigned type'
}

export function accountStatusLabel(account) {
  return account?.isActive ? 'Active' : 'Inactive'
}

/** `created_at` is an instant, so it goes through the app's instant formatter. */
export function accountCreatedLabel(account) {
  return account?.createdAt ? formatDateTime(account.createdAt) : '—'
}

export function accountDeactivatedLabel(account) {
  return account?.deactivatedAt ? formatDateTime(account.deactivatedAt) : ''
}

// ─── Forms and payloads ────────────────────────────────────────────────────

export function emptyContributionAccountForm({ employeeId = null, typeId = null } = {}) {
  return { employeeId, componentType: typeId, accountNumber: '' }
}

/** A message worth showing a person, or null when the form can be saved. */
export function validateContributionAccountForm(form) {
  if (!form?.employeeId) return 'Choose the employee this account number belongs to'
  if (form?.componentType == null || form?.componentType === '') {
    return 'Choose a contribution type'
  }
  const number = String(form?.accountNumber ?? '').trim()
  if (!number) return 'Account number is required'
  if (number.length > 64) return 'Account number cannot be more than 64 characters'
  return null
}

/**
 * The create body. The number is sent as text so leading zeros survive, and
 * `employee_id` is the roster UUID the endpoint documents — not the membership
 * id the read side exposes as `employee_company`.
 */
export function contributionAccountPayload(form) {
  return {
    employee_id: form?.employeeId,
    component_type: form?.componentType,
    account_number: String(form?.accountNumber ?? '').trim(),
  }
}

// ─── Roster reconciliation ─────────────────────────────────────────────────

/** Every id a roster record answers to for its company membership. */
function membershipIdsOf(employee) {
  const companies = Array.isArray(employee?.companies)
    ? employee.companies.map((company) => company?.id ?? company)
    : []
  return [employee?.employee_company, employee?.employee_company_id, ...companies]
    .filter((id) => id !== null && id !== undefined && id !== '')
    .map(String)
}

/**
 * The id a roster record is written back with.
 *
 * The roster endpoints agree on a UUID but not on the field that carries it —
 * `EmployeeMiniWithActive` uses `id`, and some list shapes add `uuid` — so the
 * write path reads both. `id` is the fallback because the endpoint this panel
 * reads documents it as the UUID.
 */
export function employeeRosterId(employee) {
  return employee?.uuid || employee?.id || null
}

/** The employee picker's options, A→Z, with terminated people still listed. */
export function contributionEmployeeOptions(employees) {
  return (Array.isArray(employees) ? employees : [])
    .filter((employee) => employeeRosterId(employee))
    .map((employee) => {
      const name = getFullName(employee)
      return {
        value: employeeRosterId(employee),
        label: isTerminated(employee) ? `${name} (terminated)` : name,
        name,
      }
    })
    .filter((option) => option.name && option.name !== 'N/A')
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * The roster UUID an account row belongs to, or null when the roster cannot say.
 *
 * `employee_company` is a membership id, so it is matched against every
 * membership field a roster record carries before falling back to the name.
 * The name fallback goes through `buildEmployeeNameIndex`, which answers null
 * for a name shared by two people — replacing the wrong colleague's number is
 * worse than asking which employee this is.
 */
export function employeeUuidForAccount(account, employees, nameIndex = null) {
  if (!account) return null
  if (account.employeeId) return account.employeeId

  const roster = Array.isArray(employees) ? employees : []
  const membership = account.employeeCompany == null ? null : String(account.employeeCompany)
  if (membership) {
    const matches = roster.filter((employee) => membershipIdsOf(employee).includes(membership))
    if (matches.length === 1) return employeeRosterId(matches[0])
    if (matches.length > 1) return null
  }

  const index = nameIndex ?? buildEmployeeNameIndex(roster)
  return employeeRosterId(employeeByName(index, account.employeeName))
}

/**
 * An active account already holding the same employee + type pair, or null.
 *
 * Only used to keep the Add dialog from posting a duplicate the server would
 * refuse. Two ways to identify the employee, in order:
 *
 *   1. membership id, when both the roster record and the account row carry one;
 *   2. the full name, but only when the roster says that name is unique.
 *
 * The second is not a fallback for missing data so much as the usual path: the
 * roster endpoint this panel reads (`EmployeeMiniWithActive`) names an employee
 * by UUID and full name and exposes no membership id at all, while every account
 * row carries `employee_company`. So a membership-only test would never find the
 * duplicate it exists to find. A shared name still refuses to match, for the same
 * reason `employeeUuidForAccount` does.
 */
export function conflictingActiveAccount(
  accounts,
  { employeeId = null, employeeCompany = null, employeeName = '', typeId = null } = {},
  employees = [],
) {
  if (typeId == null) return null

  const roster = Array.isArray(employees) ? employees : []
  const selected = employeeId
    ? roster.find((employee) => sameId(employeeRosterId(employee), employeeId))
    : null
  const memberships = selected ? membershipIdsOf(selected) : []
  if (employeeCompany != null) memberships.push(String(employeeCompany))

  const name = employeeName || (selected ? getFullName(selected) : '')
  const uniqueByName = name ? Boolean(employeeByName(buildEmployeeNameIndex(roster), name)) : false

  return (
    (Array.isArray(accounts) ? accounts : []).find((account) => {
      if (!account?.isActive || !sameId(account.typeId, typeId)) return false

      const accountMembership =
        account.employeeCompany == null ? null : String(account.employeeCompany)
      if (accountMembership && memberships.includes(accountMembership)) return true
      // The roster identified a membership and it is not this row's: a
      // namesake, not the person being added.
      if (accountMembership && memberships.length) return false

      return Boolean(uniqueByName && name && nameKey(account.employeeName) === nameKey(name))
    }) || null
  )
}

// ─── Ordering and history ──────────────────────────────────────────────────

function createdTime(account) {
  if (!account?.createdAt) return 0
  const time = new Date(account.createdAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

/** Active first, then by employee, scheme and number. */
export function sortContributionAccounts(accounts) {
  return (Array.isArray(accounts) ? accounts : []).slice().sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
    const byName = String(a.employeeName).localeCompare(String(b.employeeName))
    if (byName) return byName
    const byType = accountTypeLabel(a).localeCompare(accountTypeLabel(b))
    if (byType) return byType
    const byCreated = createdTime(b) - createdTime(a)
    if (byCreated) return byCreated
    return String(a.accountNumber).localeCompare(String(b.accountNumber))
  })
}

/**
 * One employee's rows, newest first, from the company-wide list.
 *
 * Membership id first, because it survives a rename; the name is the fallback
 * for a row whose membership could not be read. The two are never mixed: a
 * membership match means the roster has identified the person, and adding
 * name-only rows on top would pull in a namesake.
 */
export function accountsForEmployee(accounts, { employeeCompany = null, employeeName = '' } = {}) {
  const rows = Array.isArray(accounts) ? accounts : []
  const membership = employeeCompany == null ? null : String(employeeCompany)

  const byMembership = membership
    ? rows.filter(
        (account) =>
          account.employeeCompany != null && String(account.employeeCompany) === membership,
      )
    : []

  const matched = byMembership.length
    ? byMembership
    : rows.filter(
        (account) =>
          account.employeeCompany == null &&
          Boolean(employeeName) &&
          nameKey(account.employeeName) === nameKey(employeeName),
      )

  return matched.slice().sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
    return createdTime(b) - createdTime(a)
  })
}
