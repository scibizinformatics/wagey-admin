import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE, authHeaders } from 'src/composables/utils/http'

export function useAdminDepartments() {
  const $q = useQuasar()
  const { companyId } = useCompany()

  const departments = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Dialog state ──────────────────────────────────────────────────────────
  const dialog = ref(false)
  const editing = ref(false)
  const form = ref({ id: null, name: '', company: null, cost_center: null })

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
        headers: authHeaders(),
      })
      departments.value = response.data.data ?? response.data ?? []
      return departments.value
    } catch (error) {
      console.error('Error fetching departments:', error)
      $q.notify({
        type: 'negative',
        message: error.response?.data?.message || 'Failed to load departments',
        position: 'top',
      })
    } finally {
      loading.value = false
    }
  }

  // ─── Dialog helpers ────────────────────────────────────────────────────────

  function openDialog() {
    if (!companyId.value) {
      $q.notify({ type: 'warning', message: 'Please select a company first', position: 'top' })
      return
    }
    editing.value = false
    form.value = { id: null, name: '', company: companyId.value, cost_center: null }
    dialog.value = true
  }

  function openEditDialog(department) {
    editing.value = true
    form.value = {
      id: department.id,
      name: department.name,
      company: department.company || companyId.value,
      cost_center: department.cost_center ?? null,
    }
    dialog.value = true
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function saveDepartment() {
    if (!form.value.name.trim()) {
      $q.notify({ type: 'negative', message: 'Department name is required', position: 'top' })
      return
    }
    const cId = form.value.company || companyId.value
    if (!cId) {
      $q.notify({ type: 'negative', message: 'Company ID is required', position: 'top' })
      return
    }

    saving.value = true
    try {
      const payload = {
        name: form.value.name.trim(),
        company: cId,
        cost_center: form.value.cost_center ?? null,
      }

      if (editing.value) {
        await api.put(`${BASE}/organization/departments/${form.value.id}/`, payload, {
          headers: authHeaders(),
        })
        $q.notify({ type: 'positive', message: 'Department updated successfully' })
      } else {
        await api.post(`${BASE}/organization/departments/`, payload, { headers: authHeaders() })
        $q.notify({ type: 'positive', message: 'Department created successfully' })
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
      $q.notify({ type: 'negative', message: errorMessage, position: 'top' })
    } finally {
      saving.value = false
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function deleteDepartment(department) {
    $q.dialog({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${department.name}"?`,
      cancel: true,
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/organization/departments/${department.id}/`, {
          headers: authHeaders(),
        })
        $q.notify({ type: 'positive', message: 'Department deleted successfully' })
        await fetchDepartments()
      } catch (error) {
        console.error('Error deleting department:', error)
        $q.notify({
          type: 'negative',
          message: error.response?.data?.message || 'Failed to delete department',
          position: 'top',
        })
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
