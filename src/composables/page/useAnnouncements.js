import { computed, ref } from 'vue'
import { api } from 'src/boot/axios'
import { resolvedCompanyId } from 'src/composables/page/useCompany'
import { useCompanyStore } from 'src/stores/company'
import { BASE, authHeaders } from 'src/composables/utils/http'

/** Thrown instead of firing a company-less request, so the caller can say so. */
export const NO_COMPANY = 'No company selected'

export function useAnnouncements() {
  // Every call here resolves the company from the store rather than from a ref
  // captured at setup. Reading it once meant a page that mounted before the
  // company switcher had settled kept the stale id for its whole life: the board
  // was fetched for one company (via localStorage) while a new announcement was
  // posted to another (via the captured ref). One reactive source, read per
  // call, is the only way those two can agree.
  const store = useCompanyStore()
  const companyId = computed(() => store.companyId || resolvedCompanyId())

  function requireCompanyId() {
    const cid = companyId.value
    if (!cid) throw new Error(NO_COMPANY)
    return String(cid)
  }

  /**
   * The documented payload carries `"company": 12`, a number. The store keeps
   * the id as a string, and while DRF coerces a numeric string on an integer PK,
   * matching the documented shape costs nothing and cannot be rejected. A
   * non-numeric id (a UUID tenant, say) is passed through untouched.
   */
  function companyValue() {
    const cid = requireCompanyId()
    return /^\d+$/.test(cid) ? Number(cid) : cid
  }

  /**
   * Both spellings, deliberately. The sibling endpoints all name their filters
   * with an `_id` suffix (`payroll_group_id`, `position_id`, `department_id`),
   * and DRF ignores a query param it does not filter on rather than rejecting
   * it — so sending only `company` risks an unscoped board that looks like it
   * was scoped, which is the worst of the three outcomes. Sending both means
   * whichever the backend reads, it reads the selected company.
   */
  function companyParams() {
    const cid = requireCompanyId()
    return { company: cid, company_id: cid }
  }

  const announcements = ref([])
  const loading = ref(false)
  const saving = ref(false)
  const recipients = ref([])
  const loadingRecipients = ref(false)

  // ─── Read ─────────────────────────────────────────────────────────────────

  /**
   * The list endpoint takes the same four contract filters as the employee
   * list, and applies them to an announcement's audience — so filtering the
   * board by payroll group answers "what has the monthly-paid warehouse been
   * told?" without any client-side guessing about who a target user is.
   *
   * Anything else passed in is forwarded as a raw query param, which is how the
   * pre-existing callers passed `params`.
   *
   * @param {{payrollGroupId?: number|string, positionId?: number|string,
   *          departmentId?: number|string, payType?: 'daily'|'monthly'}} filters
   */
  async function fetchAnnouncements(filters = {}) {
    const { payrollGroupId, positionId, departmentId, payType, ...rest } = filters
    loading.value = true
    try {
      const response = await api.get(`${BASE}/communication/announcements/`, {
        params: {
          ...companyParams(),
          ...toContractParams({ payrollGroupId, positionId, departmentId, payType }),
          ...rest,
        },
        headers: authHeaders(),
      })
      announcements.value = onlyThisCompany(toList(response.data), companyId.value)
      return announcements.value
    } catch (error) {
      console.error('[fetchAnnouncements] failed:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // ─── Recipients ────────────────────────────────────────────────────────────

  /**
   * Employees an announcement can be addressed to, from the contract-backed
   * list — `target_users` on the create payload is a list of *user* UUIDs, and
   * this is the endpoint that returns them alongside the contract facets the
   * dialog filters on.
   *
   * All four filters are optional and are only sent when set; the backend ANDs
   * whatever it receives.
   *
   * @param {{payrollGroupId?: number|string, positionId?: number|string,
   *          departmentId?: number|string, payType?: 'daily'|'monthly'}} filters
   * @returns {Promise<Array<{value: string, label: string, caption: string}>>}
   */
  async function fetchRecipients(filters = {}) {
    const cid = requireCompanyId()

    loadingRecipients.value = true
    try {
      const response = await api.get(`${BASE}/user/companies/${cid}/employees-list/by-contract/`, {
        params: toContractParams(filters),
      })
      const rows = toList(response.data)
      recipients.value = rows.map(toRecipientOption).filter((r) => r.value)
      describeRecipientShape(rows, recipients.value)
      return recipients.value
    } finally {
      loadingRecipients.value = false
    }
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async function createAnnouncement(payload) {
    const company = companyValue()
    saving.value = true
    try {
      const response = await api.post(
        `${BASE}/communication/announcements/create/`,
        { ...payload, company },
        { headers: authHeaders() },
      )
      warnOnDroppedTargets(payload, response.data)
      return response.data
    } finally {
      saving.value = false
    }
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async function updateAnnouncement(announcementId, payload) {
    const company = companyValue()
    saving.value = true
    try {
      const response = await api.put(
        `${BASE}/communication/announcements/${announcementId}/`,
        { ...payload, company },
        { headers: authHeaders() },
      )
      return response.data
    } finally {
      saving.value = false
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async function deleteAnnouncement(announcementId) {
    const response = await api.delete(`${BASE}/communication/announcements/${announcementId}/`, {
      params: companyParams(),
      headers: authHeaders(),
    })
    return response.data
  }

  return {
    // state
    companyId,
    announcements,
    loading,
    saving,
    recipients,
    loadingRecipients,
    // methods
    fetchAnnouncements,
    fetchRecipients,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
  }
}

/**
 * The four contract filters shared by the announcement list and the employee
 * list. Only what is set is sent — the backend ANDs whatever it receives, so an
 * empty value has to be absent rather than null.
 */
function toContractParams(filters = {}) {
  const params = {}
  if (filters.payrollGroupId) params.payroll_group_id = filters.payrollGroupId
  if (filters.positionId) params.position_id = filters.positionId
  if (filters.departmentId) params.department_id = filters.departmentId
  if (filters.payType) params.pay_type = filters.payType
  return params
}

/**
 * Last line of defence for "only this company's announcements". The query param
 * is the mechanism; this is the guarantee — if the backend ever ignores the
 * param, or a cached response arrives after a workspace switch, a foreign row
 * still never reaches the table. Rows whose serializer omits a company are kept
 * (there is nothing to contradict), and anything dropped is logged, because it
 * means the server-side filter is not being applied and that is worth knowing.
 */
function onlyThisCompany(rows, companyId) {
  if (!companyId) return []
  const active = String(companyId)
  const kept = rows.filter((row) => {
    const own = row?.company_id ?? row?.company
    const id = own && typeof own === 'object' ? own.id : own
    return id === undefined || id === null || id === '' || String(id) === active
  })
  if (kept.length !== rows.length) {
    console.warn(
      `[useAnnouncements] dropped ${rows.length - kept.length} announcement(s) belonging to ` +
        `another company — the list endpoint is not filtering on the company param`,
    )
  }
  return kept
}

// ─── Shapes ─────────────────────────────────────────────────────────────────
/**
 * List endpoints come back as a bare array on some deployments, a `{ data: [] }`
 * envelope on others and DRF's `{ results: [] }` when pagination is on — and
 * `{ data: { results: [] } }` when both apply. An unrecognised shape returns an
 * empty list and logs what it saw, rather than throwing: the caller renders
 * "no employees" instead of an error with nothing actionable in it.
 */
function toList(payload) {
  if (Array.isArray(payload)) return payload

  const level1 = [payload?.data, payload?.results, payload?.employees]
  for (const value of level1) {
    if (Array.isArray(value)) return value
  }
  for (const value of level1) {
    if (value && typeof value === 'object') {
      const level2 = [value.results, value.employees, value.data]
      for (const nested of level2) {
        if (Array.isArray(nested)) return nested
      }
    }
  }

  console.warn('[useAnnouncements] unrecognised list shape, keys:', Object.keys(payload || {}))
  return []
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * `target_users` wants the *user* UUID, not the employee or contract row id, so
 * a UUID-shaped field wins over a numeric `id` whichever order the serializer
 * lists them in.
 */
function recipientId(row) {
  // `user`-flavoured keys first, then the row's own id. An employee row's `id`
  // is the employee or contract record, which `target_users` will not match.
  const candidates = [
    row?.user_id,
    row?.user,
    row?.user_uuid,
    row?.employee_user_id,
    row?.account_id,
    row?.uuid,
    row?.id,
  ]
  for (const candidate of candidates) {
    const value =
      typeof candidate === 'object' && candidate ? (candidate.id ?? candidate.uuid) : candidate
    if (typeof value === 'string' && UUID_RE.test(value)) return value
  }
  // Nothing UUID-shaped: fall back to whatever identifier exists rather than
  // dropping the employee out of the picker entirely.
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && typeof candidate !== 'object') {
      return String(candidate)
    }
  }
  return ''
}

/**
 * `target_users` takes user ids, and an employee list can carry three or four
 * ids per row (employee, contract, user). Picking the wrong one posts an
 * announcement the backend then records with no recipients at all — which is
 * silent, so it is worth one line in the console naming what was matched.
 */
function describeRecipientShape(rows, options) {
  if (!rows.length) return
  const first = options[0]?.value
  const looksLikeUser = typeof first === 'string' && UUID_RE.test(first)
  const message = looksLikeUser
    ? '[useAnnouncements] recipient ids look like UUIDs'
    : '[useAnnouncements] recipient ids are NOT UUIDs — target_users will likely save empty'
  const log = looksLikeUser ? console.debug : console.warn
  log(message, { sample: first, availableKeys: Object.keys(rows[0] || {}) })
}

function recipientName(row) {
  const full =
    row?.full_name ||
    row?.name ||
    `${row?.first_name || ''} ${row?.last_name || ''}`.trim() ||
    row?.user_full_name ||
    row?.email
  return full || 'Unnamed employee'
}

/** Position, department and pay type read as the second line of an option. */
function recipientCaption(row) {
  const parts = [
    row?.position_name || row?.position?.name || row?.position,
    row?.department_name || row?.department?.name || row?.department,
    row?.pay_type || row?.payment_type,
  ]
  return parts
    .filter((part) => part && typeof part !== 'object')
    .map((part) => String(part))
    .join(' · ')
}

function toRecipientOption(row) {
  return {
    value: recipientId(row),
    label: recipientName(row),
    caption: recipientCaption(row),
  }
}

/**
 * A create can succeed with a 201 and still record none of the recipients it was
 * given — the ids simply do not resolve to users on the backend. Nothing about
 * the response says so unless someone reads the JSON, so it is raised here and
 * the caller turns it into something the person who posted can see.
 *
 * @returns {boolean} true when recipients were sent but not echoed back
 */
export function targetsWereDropped(payload, created) {
  const sent = payload?.target_users
  if (!Array.isArray(sent) || !sent.length) return false
  const saved = created?.target_users ?? created?.data?.target_users
  return Array.isArray(saved) && saved.length === 0
}

function warnOnDroppedTargets(payload, created) {
  if (!targetsWereDropped(payload, created)) return
  console.warn(
    '[useAnnouncements] the server saved this announcement with no recipients. Sent ' +
      `${payload.target_users.length} id(s), first: ${payload.target_users[0]}. Either these are ` +
      'not user ids, or the create endpoint ignores target_users.',
  )
}

/** File → `data:<mime>;base64,<...>` for the create payload's `attachments`. */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () =>
      reject(reader.error || new Error(`Could not read ${file?.name || 'file'}`))
    reader.readAsDataURL(file)
  })
}
