import { ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { useToast } from 'src/composables/useToast'
import { extractErrorMessage } from 'src/composables/utils/http'
import {
  normalizeLocationRule,
  summarizeLocationRule,
  toLocationRulePayload,
  validateLocationRule,
} from 'src/composables/utils/departmentLocationRules'

/**
 * One department's location-type scheduling rule — "at most N on-site and M
 * off-site shifts per period".
 *
 *   GET    /organization/departments/{department_id}/location-rule/
 *   POST   same path — create or upsert, safe to repeat
 *   PATCH  same path — partial update, 404 when no rule is set
 *   DELETE same path — 204, 404 when no rule is set
 *
 * The endpoint is department-scoped by path with no list-across-departments
 * form, so the Departments table's rule column costs one request per row. They
 * go out together and the whole batch is written under a single token: the
 * workspace switcher can settle after the panel is built, and a slower batch
 * for the previous company must not land on top of a newer one. The payload
 * carries no company field either, so the *only* thing scoping this to the
 * active workspace is that we ask about that company's departments — hence the
 * cache is dropped outright on a company change, since department ids from the
 * previous workspace mean nothing in the next one.
 *
 * `byDepartment` distinguishes three answers and every renderer depends on it:
 * a normalized rule, `null` for "asked, there is none", and an absent key for
 * "not asked, or the request failed". A department that failed is deliberately
 * left out rather than cached as null — the column prints an em dash for "no
 * rule", and claiming that about a department we could not read would be a lie
 * an admin acts on.
 */
export function useAdminDepartmentLocationRules() {
  const $q = useQuasar()
  const toast = useToast()
  const { companyId } = useCompany()

  /** departmentId → normalized rule, or null for "no rule set". */
  const byDepartment = ref({})

  const loadingSummary = ref(false)
  const loadingDepartment = ref(false)
  const saving = ref(false)
  const removing = ref(false)

  // Only the newest batch may write to `byDepartment`.
  let latestBatch = 0

  watch(companyId, () => {
    latestBatch += 1
    byDepartment.value = {}
  })

  function url(departmentId) {
    return `/organization/departments/${departmentId}/location-rule/`
  }

  function write(departmentId, rule) {
    byDepartment.value = { ...byDepartment.value, [departmentId]: rule }
  }

  /**
   * "No rule" is documented as a null body, but a department that has never had
   * one can also come back 404 — both are the same answer here, so the 404 is
   * expected rather than logged as a failure. Anything else is a real error.
   */
  async function requestRule(departmentId) {
    try {
      const response = await api.get(url(departmentId), { expectedStatuses: [404] })
      const raw = response.data?.data ?? response.data ?? null
      return { rule: normalizeLocationRule(raw) }
    } catch (error) {
      if (error.response?.status === 404) return { rule: null }
      return { error }
    }
  }

  /** One department's rule. Returns the normalized rule, or null when none. */
  async function fetchForDepartment(departmentId, { silent = false } = {}) {
    if (!companyId.value || departmentId == null) return null
    if (!silent) loadingDepartment.value = true
    try {
      const { rule, error } = await requestRule(departmentId)
      if (error) {
        console.error(`Error fetching location rule for department ${departmentId}:`, error)
        if (!silent) toast.error(extractErrorMessage(error, 'Failed to load the location rule'))
        return null
      }
      write(departmentId, rule)
      return rule
    } finally {
      if (!silent) loadingDepartment.value = false
    }
  }

  /**
   * Every department's rule, for the table column.
   *
   * Takes the department rows themselves, not just their ids, because the
   * department serializer carries a nested `location_rule` — where the list
   * payload already has it, the column costs no requests at all and only the
   * rows missing the key are asked about. The key has to be *present* to be
   * trusted: a serializer that simply omits it is not saying the department has
   * no rule, and reading an absent key as null would print an em dash over a
   * live cap.
   *
   * Failures stay quiet — one toast per department would bury the page under a
   * column of identical cards, and the cell says "couldn't load" on its own.
   */
  async function fetchAll(entries = []) {
    const rows = entries
      .map((entry) => (entry && typeof entry === 'object' ? entry : { id: entry }))
      .filter((row) => row.id != null)

    if (!companyId.value || !rows.length) {
      byDepartment.value = {}
      return {}
    }

    const batch = ++latestBatch
    loadingSummary.value = true
    try {
      const next = {}
      const toFetch = []
      for (const row of rows) {
        if (Object.prototype.hasOwnProperty.call(row, 'location_rule')) {
          next[row.id] = normalizeLocationRule(row.location_rule)
        } else {
          toFetch.push(row.id)
        }
      }

      if (toFetch.length) {
        const results = await Promise.all(
          toFetch.map((id) => requestRule(id).then((result) => ({ id, ...result }))),
        )
        if (batch !== latestBatch) return byDepartment.value

        for (const result of results) {
          if (result.error) {
            console.error(`Error fetching location rule for department ${result.id}:`, result.error)
            continue
          }
          next[result.id] = result.rule
        }
      }

      byDepartment.value = next
      return next
    } finally {
      if (batch === latestBatch) loadingSummary.value = false
    }
  }

  /** The rule for one department: normalized, `null`, or `undefined` if unread. */
  function ruleFor(departmentId) {
    return byDepartment.value[departmentId]
  }

  /** The summary the table column renders. */
  function summaryFor(departmentId) {
    return summarizeLocationRule(ruleFor(departmentId))
  }

  /**
   * Create or replace a department's rule.
   *
   * POST is an upsert, so this is the one call for both cases — there is no
   * need to know whether a rule already exists, and a PATCH would 404 when it
   * does not. The body is sent whole for the same reason: an upsert replaces
   * values, and omitting a cap would leave the old one standing.
   */
  async function saveRule(departmentId, form) {
    if (departmentId == null) {
      toast.error('No department selected')
      return false
    }

    // The server's own rules, restated before the round trip — a 400 on submit
    // is a worse way to learn that a weekly rule cannot exceed seven shifts.
    const problem = validateLocationRule(form)
    if (problem) {
      toast.error(problem)
      return false
    }

    saving.value = true
    try {
      const response = await api.post(url(departmentId), toLocationRulePayload(form))
      const raw = response.data?.data ?? response.data ?? null
      // The response is the saved rule, so the column updates from what the
      // server stored rather than from what was typed.
      write(departmentId, normalizeLocationRule(raw) ?? null)
      if (!raw) await fetchForDepartment(departmentId, { silent: true })
      toast.success('Location rule saved')
      return true
    } catch (error) {
      console.error('Error saving department location rule:', error)
      toast.error(extractErrorMessage(error, 'Failed to save the location rule'))
      return false
    } finally {
      saving.value = false
    }
  }

  /**
   * Switch enforcement on or off without losing the limits. PATCH 404s when no
   * rule exists, so this is only ever offered on a department that has one.
   */
  async function setActive(departmentId, isActive) {
    if (departmentId == null) return false
    saving.value = true
    try {
      const response = await api.patch(url(departmentId), { is_active: isActive })
      const raw = response.data?.data ?? response.data ?? null
      write(departmentId, normalizeLocationRule(raw) ?? null)
      if (!raw) await fetchForDepartment(departmentId, { silent: true })
      toast.success(isActive ? 'Location rule switched on' : 'Location rule paused')
      return true
    } catch (error) {
      console.error('Error updating department location rule:', error)
      toast.error(extractErrorMessage(error, 'Failed to update the location rule'))
      return false
    } finally {
      saving.value = false
    }
  }

  /**
   * Remove the rule entirely. Confirmed first: removing it lifts the block for
   * everyone in the department, which is not obvious from the row menu, and the
   * limits are not recoverable afterwards.
   */
  function deleteRule(department, { onDone } = {}) {
    if (!department?.id) return
    $q.dialog({
      title: 'Remove this location rule?',
      message: `"${department.name}" goes back to no on-site or off-site limit, and the saved limits are lost.`,
      cancel: { label: 'Cancel', flat: true },
      ok: { label: 'Remove', color: 'negative', unelevated: true },
      persistent: true,
    }).onOk(async () => {
      removing.value = true
      try {
        await api.delete(url(department.id))
        write(department.id, null)
        toast.success('Location rule removed')
        onDone?.()
      } catch (error) {
        console.error('Error deleting department location rule:', error)
        toast.error(extractErrorMessage(error, 'Failed to remove the location rule'))
      } finally {
        removing.value = false
      }
    })
  }

  return {
    byDepartment,
    loadingSummary,
    loadingDepartment,
    saving,
    removing,
    fetchAll,
    fetchForDepartment,
    ruleFor,
    summaryFor,
    saveRule,
    setActive,
    deleteRule,
  }
}
