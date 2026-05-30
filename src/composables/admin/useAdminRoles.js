import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE, authHeaders } from 'src/composables/utils/http'

export const PERMISSION_FIELDS = [
  { key: 'can_view_dashboard', label: 'View Dashboard' },
  { key: 'can_manage_employees', label: 'Manage Employees' },
  { key: 'can_view_attendance', label: 'View Attendance' },
  { key: 'can_edit_attendance', label: 'Edit Attendance' },
  { key: 'can_view_payroll', label: 'View Payroll' },
  { key: 'can_release_payroll', label: 'Release Payroll' },
  { key: 'can_approve_requests', label: 'Approve Requests' },
  { key: 'can_manage_schedules', label: 'Manage Schedules' },
  { key: 'can_access_admin_settings', label: 'Admin Settings' },
  { key: 'can_access_web_admin', label: 'Web Admin' },
  { key: 'can_access_manager_app', label: 'Manager App' },
  { key: 'can_view_salary', label: 'View Salary' },
]

const PERM_LABEL_MAP = Object.fromEntries(PERMISSION_FIELDS.map((p) => [p.key, p.label]))

export function useAdminRoles() {
  const $q = useQuasar()
  const { companyId } = useCompany()

  const roles = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Dialog state ──────────────────────────────────────────────────────────
  const dialog = ref(false)
  const editing = ref(false)
  const form = ref(_emptyForm())

  function _emptyForm(cId = null) {
    return {
      id: null,
      name: '',
      company: cId,
      can_view_dashboard: false,
      can_manage_employees: false,
      can_view_attendance: false,
      can_edit_attendance: false,
      can_view_payroll: false,
      can_release_payroll: false,
      can_approve_requests: false,
      can_manage_schedules: false,
      can_access_admin_settings: false,
      can_access_web_admin: false,
      can_access_manager_app: false,
      can_view_salary: false,
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function getActivePermissions(role) {
    if (!Array.isArray(role.permissions)) return []
    return role.permissions.map((p) => PERM_LABEL_MAP[p] || p)
  }

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchRoles() {
    if (!companyId.value) {
      roles.value = []
      return
    }
    loading.value = true
    try {
      const response = await api.get(`${BASE}/user/user-roles/`, {
        params: { company: companyId.value },
        headers: authHeaders(),
      })
      const d = response.data
      roles.value = d.data ?? d.results ?? (Array.isArray(d) ? d : [])
      return roles.value
    } catch (error) {
      console.error('Error fetching roles:', error)
      $q.notify({
        type: 'negative',
        message: error.response?.data?.message || 'Failed to load roles',
        position: 'top',
      })
      roles.value = []
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
    form.value = _emptyForm(companyId.value)
    dialog.value = true
  }

  function openEditDialog(role) {
    const roleId = role.id ?? role.role_id ?? role.pk ?? null
    if (!roleId) {
      $q.notify({ type: 'negative', message: 'Role ID is missing.', position: 'top' })
      return
    }
    editing.value = true
    const perms = Array.isArray(role.permissions) ? role.permissions : []
    form.value = {
      id: roleId,
      name: role.name || '',
      company: role.company ?? role.company_id ?? companyId.value,
      ...Object.fromEntries(PERMISSION_FIELDS.map((p) => [p.key, perms.includes(p.key)])),
    }
    dialog.value = true
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function saveRole() {
    if (!form.value.name.trim()) {
      $q.notify({ type: 'negative', message: 'Role name is required', position: 'top' })
      return
    }
    const cId = form.value.company || companyId.value
    if (!cId) {
      $q.notify({ type: 'negative', message: 'Company ID is missing', position: 'top' })
      return
    }
    if (editing.value && !form.value.id) {
      $q.notify({
        type: 'negative',
        message: 'Cannot update: Role ID is missing.',
        position: 'top',
      })
      return
    }

    saving.value = true
    try {
      const permissions = PERMISSION_FIELDS.filter((p) => Boolean(form.value[p.key])).map(
        (p) => p.key,
      )

      if (editing.value) {
        await api.patch(
          `${BASE}/user/user-roles/${form.value.id}/`,
          { name: form.value.name.trim(), permissions },
          { headers: authHeaders() },
        )
        $q.notify({ type: 'positive', message: 'Role updated successfully', position: 'top' })
      } else {
        await api.post(
          `${BASE}/user/user-roles/`,
          { name: form.value.name.trim(), permissions },
          { headers: authHeaders() },
        )
        $q.notify({ type: 'positive', message: 'Role created successfully', position: 'top' })
      }

      dialog.value = false
      await fetchRoles()
    } catch (error) {
      console.error('Error saving role:', error)
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.response?.data?.non_field_errors?.[0] ||
        (typeof error.response?.data === 'string' ? error.response.data : null) ||
        `Request failed (${error.response?.status})`
      $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 6000 })
    } finally {
      saving.value = false
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function deleteRole(role) {
    $q.dialog({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${role.name}"?`,
      cancel: true,
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/user/user-roles/${role.id}/`, { headers: authHeaders() })
        $q.notify({ type: 'positive', message: 'Role deleted successfully' })
        await fetchRoles()
      } catch (error) {
        console.error('Error deleting role:', error)
        const message =
          error.response?.status === 404
            ? 'Role not found. It may have been already deleted.'
            : error.response?.data?.message || 'Failed to delete role'
        $q.notify({ type: 'negative', message })
        await fetchRoles()
      }
    })
  }

  return {
    roles,
    loading,
    saving,
    dialog,
    editing,
    form,
    permissionFields: PERMISSION_FIELDS,
    getActivePermissions,
    fetchRoles,
    openDialog,
    openEditDialog,
    saveRole,
    deleteRole,
  }
}
