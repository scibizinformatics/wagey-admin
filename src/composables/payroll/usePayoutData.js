import { ref } from 'vue'
import { useCompany } from 'src/composables/page/useCompany'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'

export function usePayoutData() {
  const { companyId } = useCompany()
  const { fetchPayoutGroupInstances } = useDisbursementApi()

  const rows = ref([])
  const loading = ref(true)

  async function fetchPayouts(cutoffInstanceId) {
    loading.value = true
    try {
      const data = await fetchPayoutGroupInstances(companyId.value, cutoffInstanceId)
      rows.value = (data || []).map((item) => ({
        id: item.id,
        group: item.payout_group_name,
        cutoff: item.cutoff_instance_name,
        method: item.payout_method_name,
        employees: item.employees,
        netAmount: parseFloat(item.net_amount || 0),
        status: item.payout_status,
        statusDisplay: item.payout_status_display,
      }))
    } catch (err) {
      console.error('[usePayoutData] fetch failed:', err)
      rows.value = []
    } finally {
      loading.value = false
    }
  }

  return { rows, loading, fetchPayouts }
}
