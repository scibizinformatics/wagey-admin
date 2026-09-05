import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE } from 'src/composables/utils/http'
import { useToast } from 'src/composables/useToast'

export function useAdminDepartments() {
  const $q = useQuasar()
  const toast = useToast()
  const { companyId } = useCompany()

  const departments = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Dialog state ──────────────────────────────────────────────────────────
  const dialog = ref(false)
  const editing = ref(false)
  const form = ref({ id: null, name: '', company: null, cost_center: null, policies: [] })

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchDepartments() {
    if (!companyId.value) {
      departments.value = []
      return
    }
    loading.value = true
    try {
      const response = await api.get(`${BASE}/organization/departments/`, {
        params: { company: companyId.value },
      })
      departments.value = response.data.data ?? response.data ?? []
      return departments.value
    } catch (error) {
      console.error('Error fetching departments:', error)
      toast.error(error.response?.data?.message || 'Failed to load departments')
    } finally {
      loading.value = false
    }
  }

  // ─── Dialog helpers ────────────────────────────────────────────────────────

  function openDialog() {
    if (!companyId.value) {
      toast.warning('Please select a company first')
      return
    }
    editing.value = false
    form.value = { id: null, name: '', company: companyId.value, cost_center: null, policies: [] }
    dialog.value = true
  }

  function openEditDialog(department) {
    editing.value = true
    form.value = {
      id: department.id,
      name: department.name,
      company: department.company || companyId.value,
      cost_center: department.cost_center ?? null,
      policies: department.policies ? [...department.policies] : [],
    }
    dialog.value = true
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function saveDepartment() {
    if (!form.value.name.trim()) {
      toast.error('Department name is required')
      return
    }
    const cId = form.value.company || companyId.value
    if (!cId) {
      toast.error('Company ID is required')
      return
    }

    saving.value = true
    try {
      const payload = {
        name: form.value.name.trim(),
        company: cId,
        cost_center: form.value.cost_center ?? null,
        policies: form.value.policies,
        date_created: new Date().toISOString(),
      }

      if (editing.value) {
        await api.put(`${BASE}/organization/departments/${form.value.id}/`, payload)
        toast.success('Department updated successfully')
      } else {
        await api.post(`${BASE}/organization/departments/`, payload)
        toast.success('Department created successfully')
      }

      dialog.value = false
      await fetchDepartments()
    } catch (error) {
      console.error('Error saving department:', error)
      let errorMessage = 'Failed to save department'
      if (error.response?.data) {
        if (Array.isArray(error.response.data)) errorMessage = error.response.data[0]
        else if (error.response.data.message) errorMessage = error.response.data.message
        else if (error.response.data.error) errorMessage = error.response.data.error
      }
      toast.error(errorMessage)
    } finally {
      saving.value = false
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function deleteDepartment(department) {
    $q.dialog({
      title: 'Delete this department?',
      message: `"${department.name}" is removed for everyone. This cannot be undone.`,
      cancel: { label: 'Cancel', flat: true },
      ok: { label: 'Delete', color: 'negative', unelevated: true },
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/organization/departments/${department.id}/`)
        toast.success('Department deleted successfully')
        await fetchDepartments()
      } catch (error) {
        console.error('Error deleting department:', error)
        toast.error(error.response?.data?.message || 'Failed to delete department')
      }
    })
  }

  return {
    departments,
    loading,
    saving,
    dialog,
    editing,
    form,
    fetchDepartments,
    openDialog,
    openEditDialog,
    saveDepartment,
    deleteDepartment,
  }
}
