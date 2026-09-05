import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE } from 'src/composables/utils/http'

export function useAdminDepartmentPolicies() {
  const { companyId } = useCompany()

  const policies = ref([])
  const loading = ref(false)

  async function fetchDepartmentPolicies() {
    if (!companyId.value) {
      policies.value = []
      return
    }
    loading.value = true
    try {
      const response = await api.get(`${BASE}/access/department-policies/`, {
        params: { company: companyId.value },
      })
      policies.value = response.data.data ?? response.data ?? []
      return policies.value
    } catch (error) {
      console.error('Error fetching department policies:', error)
    } finally {
      loading.value = false
    }
  }

  return {
    policies,
    loading,
    fetchDepartmentPolicies,
  }
}
