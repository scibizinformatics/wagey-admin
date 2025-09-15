// src/services/employeeService.js
import axios from 'axios'
import { useAuthStore } from '@/boot/auth'

export async function fetchEmployees() {
  const authStore = useAuthStore()

  const token = authStore.token
  const companyId = authStore.companyId

  if (!token) {
    console.error('❌ No token found in authStore')
    throw new Error('No token found')
  }

  if (!companyId) {
    console.error('❌ No companyId found in authStore')
    throw new Error('No companyId found')
  }

  try {
    const response = await axios.get(
      `https://staging.wageyapp.com/api/companies/${companyId}/employees/`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    return response.data
  } catch (error) {
    console.error('❌ Failed to fetch employees:', error)
    throw error
  }
}
