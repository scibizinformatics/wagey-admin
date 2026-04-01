import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from '../page/useCompany'
import { BASE, authHeaders } from '../utils/http'

export function useAdminPositions() {
  const $q = useQuasar()
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
        headers: authHeaders(),
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
      $q.notify({ type: 'negative', message: 'Position name is required' })
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
        await api.put(`${BASE}/user/positions/${form.value.id}/`, payload, {
          headers: authHeaders(),
        })
        $q.notify({ type: 'positive', message: 'Position updated successfully' })
      } else {
        await api.post(`${BASE}/user/positions/`, payload, { headers: authHeaders() })
        $q.notify({ type: 'positive', message: 'Position created successfully' })
      }

      dialog.value = false
      await fetchPositions()
    } catch (error) {
      console.error('Error saving position:', error)
      $q.notify({ type: 'negative', message: 'Failed to save position' })
    } finally {
      saving.value = false
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function deletePosition(position) {
    $q.dialog({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${position.name}"?`,
      cancel: true,
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/user/positions/${position.id}/`, { headers: authHeaders() })
        $q.notify({ type: 'positive', message: 'Position deleted successfully' })
        await fetchPositions()
      } catch (error) {
        console.error('Error deleting position:', error)
        $q.notify({ type: 'negative', message: 'Failed to delete position' })
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
