import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from './useCompany'
import { BASE, authHeaders } from '../utils/http'

export function useRolesAndPositions() {
  const { companyId } = useCompany()

  const userRoles = ref([])
  const positions = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── User Roles ───────────────────────────────────────────────────────────

  async function fetchUserRoles() {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/user/user-roles/`, {
        params: { company: companyId.value },
        headers: authHeaders(),
      })
      userRoles.value = response.data.data ?? response.data ?? []
      return userRoles.value
    } finally {
      loading.value = false
    }
  }

  async function createUserRole(payload) {
    saving.value = true
    try {
      const response = await api.post(`${BASE}/user/user-roles/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function updateUserRole(roleId, payload) {
    saving.value = true
    try {
      const response = await api.patch(`${BASE}/user/user-roles/${roleId}/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function deleteUserRole(roleId) {
    const response = await api.delete(`${BASE}/user/user-roles/${roleId}/`, {
      headers: authHeaders(),
    })
    return response.data
  }

  // ─── Positions ────────────────────────────────────────────────────────────

  async function fetchPositions() {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/user/positions/`, {
        params: { company: companyId.value },
        headers: authHeaders(),
      })
      positions.value = response.data.data ?? response.data ?? []
      return positions.value
    } finally {
      loading.value = false
    }
  }

  async function createPosition(payload) {
    saving.value = true
    try {
      const response = await api.post(`${BASE}/user/positions/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function updatePosition(positionId, payload) {
    saving.value = true
    try {
      const response = await api.put(`${BASE}/user/positions/${positionId}/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function deletePosition(positionId) {
    const response = await api.delete(`${BASE}/user/positions/${positionId}/`, {
      headers: authHeaders(),
    })
    return response.data
  }

  return {
    // state
    userRoles,
    positions,
    loading,
    saving,
    // user roles
    fetchUserRoles,
    createUserRole,
    updateUserRole,
    deleteUserRole,
    // positions
    fetchPositions,
    createPosition,
    updatePosition,
    deletePosition,
  }
}
