import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE, extractErrorMessage } from 'src/composables/utils/http'
import { useToast } from 'src/composables/useToast'

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
  const toast = useToast()
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
      })
      const d = response.data
      roles.value = d.data ?? d.results ?? (Array.isArray(d) ? d : [])
      return roles.value
    } catch (error) {
      console.error('Error fetching roles:', error)
      toast.error(error.response?.data?.message || 'Failed to load roles')
      roles.value = []
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
    form.value = _emptyForm(companyId.value)
    dialog.value = true
  }

  function openEditDialog(role) {
    const roleId = role.id ?? role.role_id ?? role.pk ?? null
    if (!roleId) {
      toast.error('Role ID is missing.')
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
      toast.error('Role name is required')
      return
    }
    const cId = form.value.company || companyId.value
    if (!cId) {
      toast.error('Company ID is missing')
      return
    }
    if (editing.value && !form.value.id) {
      toast.error('Cannot update: Role ID is missing.')
      return
    }

    saving.value = true
    try {
      const permissions = PERMISSION_FIELDS.filter((p) => Boolean(form.value[p.key])).map(
        (p) => p.key,
      )

      if (editing.value) {
        await api.patch(`${BASE}/user/user-roles/${form.value.id}/`, {
          name: form.value.name.trim(),
          permissions,
        })
        toast.success('Role updated successfully')
      } else {
        await api.post(`${BASE}/user/user-roles/`, { name: form.value.name.trim(), permissions })
        toast.success('Role created successfully')
      }

      dialog.value = false
      await fetchRoles()
    } catch (error) {
      console.error('Error saving role:', error)
      const msg = extractErrorMessage(error, 'Failed to save role')
      toast.error(msg, { timeout: 6000 })
    } finally {
      saving.value = false
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function deleteRole(role) {
    $q.dialog({
      title: 'Delete this role?',
      message: `"${role.name}" is removed, along with the permissions it grants. This cannot be undone.`,
      cancel: { label: 'Cancel', flat: true },
      ok: { label: 'Delete', color: 'negative', unelevated: true },
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/user/user-roles/${role.id}/`)
        toast.success('Role deleted successfully')
        await fetchRoles()
      } catch (error) {
        console.error('Error deleting role:', error)
        const message =
          error.response?.status === 404
            ? 'Role not found. It may have been already deleted.'
            : error.response?.data?.message || 'Failed to delete role'
        toast.error(message)
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
