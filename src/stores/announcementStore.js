// src/stores/announcementStore.js
import { defineStore } from 'pinia'
import axios from 'axios'

export const useAnnouncementStore = defineStore('announcement', {
  state: () => ({
    announcements: [],
    loading: false,
    error: null,
  }),

  actions: {
    async fetchAnnouncements(page = 1, pageSize = 10) {
      this.loading = true
      this.error = null
      try {
        const token = localStorage.getItem('access_token')
        const companyId = localStorage.getItem('selectedCompany')

        const res = await axios.get(
          `https://staging.wageyapp.com/communication/announcements/?company=${companyId}&page=${page}&page_size=${pageSize}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )

        this.announcements = res.data.results || res.data
      } catch (err) {
        console.error('❌ Failed to fetch announcements:', err.response?.data || err.message)
        this.error = err
      } finally {
        this.loading = false
      }
    },

    async createAnnouncement(formData) {
      this.error = null
      try {
        const token = localStorage.getItem('access_token')
        const companyId = localStorage.getItem('selectedCompany')
        const userId = localStorage.getItem('user_id') // store this after login

        // 🔑 Build payload exactly as backend expects
        const payload = {
          title: formData.title,
          message: formData.message,
          announcement_type: formData.type || 'general',
          is_active: true,
          start_at: formData.start_at,
          end_at: formData.end_at,
          target_everyone: true,

          // required arrays (set empty if not used)
          target_positions: [],
          target_sites: [],
          target_departments: [],
          target_roles: [],
          target_users: [],

          company: Number(companyId),
          created_by: Number(userId),
        }

        console.log('📤 Sending payload:', payload)

        const res = await axios.post(
          `https://staging.wageyapp.com/communication/announcements/create/`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } },
        )

        // refresh after create
        await this.fetchAnnouncements()
        return res.data
      } catch (err) {
        console.error('❌ Create announcement failed:', err.response?.data || err.message)
        this.error = err
        throw err
      }
    },
  },
})
