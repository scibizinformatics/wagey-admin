import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE } from 'src/composables/utils/http'
import { useToast } from 'src/composables/useToast'

export function useAdminPositions() {
  const $q = useQuasar()
  const toast = useToast()
  const { companyId } = useCompany()

  const positions = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Dialog state ──────────────────────────────────────────────────────────
  const dialog = ref(false)
  const editing = ref(false)
  const form = ref({ id: null, name: '', description: '', company: null })

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  /**
   * @param {Array} departments – pass in departments list to resolve department_name
   */
  async function fetchPositions(departments = []) {
    if (!companyId.value) {
      positions.value = []
      return
    }
    loading.value = true
    try {
      const response = await api.get(`${BASE}/user/positions/`, {
        params: { company: companyId.value },
      })
      const raw = response.data.data ?? response.data ?? []
      positions.value = raw.map((pos) => {
        const dept = departments.find((d) => d.id === (pos.department_id || pos.department))
        return { ...pos, department_name: pos.department_name || dept?.name || null }
      })
      return positions.value
    } catch (error) {
      console.error('Error fetching positions:', error)
    } finally {
      loading.value = false
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function getPositionName(positionId) {
    const p = positions.value.find((x) => x.id === positionId)
    return p ? p.name : 'N/A'
  }

  // ─── Dialog helpers ────────────────────────────────────────────────────────

  function openDialog() {
    editing.value = false
    form.value = { id: null, name: '', description: '', company: companyId.value }
    dialog.value = true
  }

  function openEditDialog(position) {
    editing.value = true
    form.value = {
      id: position.id,
      name: position.name,
      description: position.description || '',
      company: position.company || companyId.value,
    }
    dialog.value = true
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function savePosition() {
    if (!form.value.name.trim()) {
      toast.error('Position name is required')
      return
    }

    saving.value = true
    try {
      const payload = {
        name: form.value.name,
        description: form.value.description || '',
        company: companyId.value,
      }

      if (editing.value) {
        await api.put(`${BASE}/user/positions/${form.value.id}/`, payload)
        toast.success('Position updated successfully')
      } else {
        await api.post(`${BASE}/user/positions/`, payload)
        toast.success('Position created successfully')
      }

      dialog.value = false
      await fetchPositions()
    } catch (error) {
      console.error('Error saving position:', error)
      toast.error('Failed to save position')
    } finally {
      saving.value = false
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function deletePosition(position) {
    $q.dialog({
      title: 'Delete this position?',
      message: `"${position.name}" is removed and can no longer be assigned. This cannot be undone.`,
      cancel: { label: 'Cancel', flat: true },
      ok: { label: 'Delete', color: 'negative', unelevated: true },
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/user/positions/${position.id}/`)
        toast.success('Position deleted successfully')
        await fetchPositions()
      } catch (error) {
        console.error('Error deleting position:', error)
        toast.error('Failed to delete position')
      }
    })
  }

  return {
    positions,
    loading,
    saving,
    dialog,
    editing,
    form,
    getPositionName,
    fetchPositions,
    openDialog,
    openEditDialog,
    savePosition,
    deletePosition,
  }
}
