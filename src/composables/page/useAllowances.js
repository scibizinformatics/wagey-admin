import { ref, watch } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { createRequestToken } from 'src/composables/utils/requestToken'
import { extractErrorMessage } from 'src/composables/utils/http'
import { useToast } from 'src/composables/useToast'

/**
 * Allowance types for the active company — the table rows behind the
 * Allowances page (`/app/allowances`).
 *
 * The endpoints are keyed by company in the *path*:
 *   GET  /allowance/allowance-types/company/{company_id}/
 *   POST /allowance/allowance-types/company/{company_id}/create/
 *   PATCH /allowance/allowance-types/{id}/update/
 * so `companyId` is resolved per request rather than captured at setup. A
 * company switch clears the rows and refetches, and a request token keeps a
 * slow response for the previous company from landing after the new one's.
 */
export function useAllowances() {
  const toast = useToast()
  const { companyId } = useCompany()

  const allowanceTypes = ref([])
  const loading = ref(false)
  const saving = ref(false)

  const listGuard = createRequestToken()

  // A switch of company must not leave the previous company's rows on screen
  // while the new list is in flight — clear immediately, then refetch.
  watch(companyId, (next, prev) => {
    if (next === prev) return
    listGuard.next()
    allowanceTypes.value = []
    fetchAllowanceTypes()
  })

  async function fetchAllowanceTypes() {
    const id = companyId.value
    if (!id) {
      allowanceTypes.value = []
      return []
    }
    const token = listGuard.next()
    loading.value = true
    try {
      const response = await api.get(`/allowance/allowance-types/company/${id}/`)
      if (!listGuard.isCurrent(token)) return allowanceTypes.value
      allowanceTypes.value = response.data.data ?? response.data ?? []
      return allowanceTypes.value
    } catch (error) {
      if (!listGuard.isCurrent(token)) return allowanceTypes.value
      console.error('[useAllowances] fetchAllowanceTypes ✖ error', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      })
      toast.error(extractErrorMessage(error, 'Failed to load allowance types'))
      return []
    } finally {
      if (listGuard.isCurrent(token)) loading.value = false
    }
  }

  function formPayload(form) {
    return {
      name: form.name?.trim(),
      is_taxable: form.is_taxable,
      payout_policy: form.payout_policy,
    }
  }

  async function createAllowanceType(form) {
    const id = companyId.value
    if (!id) {
      toast.warning('Please select a company first')
      return null
    }
    saving.value = true
    try {
      const response = await api.post(
        `/allowance/allowance-types/company/${id}/create/`,
        formPayload(form),
      )
      toast.success('Allowance type added successfully')
      await fetchAllowanceTypes()
      return response.data
    } catch (error) {
      console.error('[useAllowances] createAllowanceType ✖ error', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      })
      toast.error(extractErrorMessage(error, 'Failed to add allowance type'))
      return null
    } finally {
      saving.value = false
    }
  }

  async function updateAllowanceType(typeId, form) {
    if (!typeId) return null
    saving.value = true
    try {
      const response = await api.patch(
        `/allowance/allowance-types/${typeId}/update/`,
        formPayload(form),
      )
      toast.success('Allowance type updated successfully')
      await fetchAllowanceTypes()
      return response.data
    } catch (error) {
      console.error('[useAllowances] updateAllowanceType ✖ error', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      })
      toast.error(extractErrorMessage(error, 'Failed to update allowance type'))
      return null
    } finally {
      saving.value = false
    }
  }

  return {
    allowanceTypes,
    loading,
    saving,
    fetchAllowanceTypes,
    createAllowanceType,
    updateAllowanceType,
  }
}