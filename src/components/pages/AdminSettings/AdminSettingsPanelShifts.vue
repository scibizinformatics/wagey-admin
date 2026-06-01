<template>
  <div>
    <div class="subtabs-wrapper">
      <q-tabs v-model="shiftSubTab" dense class="settings-tabs" active-color="primary" indicator-color="primary" align="left">
        <q-tab name="shift-types" label="Shift Template" class="settings-tab" />
        <q-tab name="weekly-templates" label="Weekly Shift Templates" class="settings-tab" />
      </q-tabs>
    </div>

    <q-tab-panels v-model="shiftSubTab" animated class="transparent-panels">
      <q-tab-panel name="shift-types" class="q-pa-none">
        <div class="table-section">
          <div class="table-header">
            <div class="table-title-section">
              <h2 class="table-title">Shift Templates</h2>
              <p class="table-subtitle">Manage shift schedule templates</p>
            </div>
            <div class="table-actions">
              <q-btn color="primary" label="Add Shift Template" icon="add" class="add-btn" @click="openShiftTypeTemplateDialog" />
            </div>
          </div>
          <div class="modern-table-container">
            <template v-if="loadingShiftTypeTemplates">
              <div class="table-skeleton">
                <div class="skeleton-header">
                  <div class="skeleton-header-cell" style="flex: 2">Name</div>
                  <div class="skeleton-header-cell" style="flex: 1.5; text-align: center">Shift Times</div>
                  <div class="skeleton-header-cell" style="flex: 0.75; text-align: center">Total Hours</div>
                  <div class="skeleton-header-cell" style="flex: 0.75; text-align: center">Actions</div>
                </div>
                <div class="skeleton-row" v-for="n in 4" :key="n">
                  <div class="skeleton-cell" style="flex: 2"><q-skeleton type="text" /></div>
                  <div class="skeleton-cell" style="flex: 1.5"><q-skeleton type="text" width="100px" /></div>
                  <div class="skeleton-cell" style="flex: 0.75"><q-skeleton type="text" width="50px" /></div>
                  <div class="skeleton-cell" style="flex: 0.75"><q-skeleton type="text" width="40px" /></div>
                </div>
              </div>
            </template>
            <template v-else>
              <q-table :rows="shiftTypeTemplates" :columns="recurringColumns" row-key="id" flat no-data-label="No shift templates found" class="settings-table" hide-pagination :rows-per-page-options="[0]">
                <template v-slot:header>
                  <q-tr class="table-header-row">
                    <q-th class="table-header-cell" style="width: 40%">Name</q-th>
                    <q-th class="table-header-cell text-center" style="width: 30%">Shift Times</q-th>
                    <q-th class="table-header-cell text-center" style="width: 15%">Total Hours</q-th>
                    <q-th class="table-header-cell text-center actions-header" style="width: 15%; text-align: center !important">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr class="table-body-row">
                    <q-td class="table-body-cell" style="width: 40%"><span class="item-name">{{ props.row.name }}</span></q-td>
                    <q-td class="table-body-cell text-center" style="width: 30%">
                      <div v-if="props.row.shifts_detail && props.row.shifts_detail.length" class="shifts-time-list">
                        <div v-for="(shift, idx) in props.row.shifts_detail" :key="idx" class="shift-time-item">
                          {{ formatTimeDisplay(shift.start_time) }} - {{ formatTimeDisplay(shift.end_time) }}
                        </div>
                      </div>
                      <span v-else>&mdash;</span>
                    </q-td>
                    <q-td class="table-body-cell text-center" style="width: 15%">{{ calculateTotalHoursFromRow(props.row) }} hrs</q-td>
                    <q-td class="table-body-cell text-center" style="width: 15%">
                      <div class="flex justify-center items-center full-width">
                        <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                          <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                            <q-list dense style="min-width: 150px">
                              <q-item clickable v-close-popup class="dropdown-item" @click="editShiftTypeTemplate(props.row)">
                                <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                                <q-item-section>Edit</q-item-section>
                              </q-item>
                              <q-item clickable v-close-popup class="dropdown-item dropdown-item-danger" @click="deleteShiftTypeTemplate(props.row)">
                                <q-item-section side><q-icon name="delete" size="16px" color="negative" /></q-item-section>
                                <q-item-section>Delete</q-item-section>
                              </q-item>
                            </q-list>
                          </q-menu>
                        </q-btn>
                      </div>
                    </q-td>
                  </q-tr>
                </template>
              </q-table>
            </template>
          </div>
        </div>
      </q-tab-panel>

      <q-tab-panel name="weekly-templates" class="q-pa-none">
        <div class="table-section">
          <div class="table-header">
            <div class="table-title-section">
              <h2 class="table-title">Weekly Shift Templates</h2>
              <p class="table-subtitle">Manage shift type templates for weekly scheduling</p>
            </div>
            <div class="table-actions">
              <q-btn color="primary" label="Add Template" icon="add" class="add-btn" @click="openWeeklyTemplateDialog" />
            </div>
          </div>
          <div class="modern-table-container">
            <template v-if="loadingWeeklyTemplates">
              <div class="table-skeleton">
                <div class="skeleton-header">
                  <div class="skeleton-header-cell">Name</div>
                  <div class="skeleton-header-cell">Rules</div>
                  <div class="skeleton-header-cell">Created</div>
                  <div class="skeleton-header-cell" style="flex: 0 0 60px">Actions</div>
                </div>
                <div class="skeleton-row" v-for="n in 4" :key="n">
                  <div class="skeleton-cell"><q-skeleton type="text" /></div>
                  <div class="skeleton-cell"><q-skeleton type="text" width="80px" /></div>
                  <div class="skeleton-cell"><q-skeleton type="text" width="80px" /></div>
                  <div class="skeleton-cell" style="flex: 0 0 60px"><q-skeleton type="text" width="40px" /></div>
                </div>
              </div>
            </template>
            <template v-else>
              <q-table :rows="weeklyShiftTemplates" :columns="weeklyTemplateColumns" row-key="id" flat no-data-label="No weekly shift templates found" class="settings-table" hide-pagination :rows-per-page-options="[0]">
                <template v-slot:header>
                  <q-tr class="table-header-row">
                    <q-th class="table-header-cell">Name</q-th>
                    <q-th class="table-header-cell">Rules</q-th>
                    <q-th class="table-header-cell">Created</q-th>
                    <q-th class="table-header-cell actions-header">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr class="table-body-row">
                    <q-td class="table-body-cell"><span class="item-name">{{ props.row.name }}</span></q-td>
                    <q-td class="table-body-cell">{{ Array.isArray(props.row.rules) ? props.row.rules.length + ' rules' : '' }}</q-td>
                    <q-td class="table-body-cell">{{ props.row.created_at ? new Date(props.row.created_at).toLocaleDateString() : '' }}</q-td>
                    <q-td class="table-body-cell actions-cell">
                      <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                        <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                          <q-list dense style="min-width: 150px">
                            <q-item clickable v-close-popup class="dropdown-item" @click="editWeeklyTemplate(props.row)">
                              <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                              <q-item-section>Edit</q-item-section>
                            </q-item>
                            <q-item clickable v-close-popup class="dropdown-item dropdown-item-danger" @click="deleteWeeklyTemplate(props.row)">
                              <q-item-section side><q-icon name="delete" size="16px" color="negative" /></q-item-section>
                              <q-item-section>Delete</q-item-section>
                            </q-item>
                          </q-list>
                        </q-menu>
                      </q-btn>
                    </q-td>
                  </q-tr>
                </template>
              </q-table>
            </template>
          </div>
        </div>
      </q-tab-panel>
    </q-tab-panels>

    <q-dialog v-model="weeklyTemplateDialog" persistent>
      <q-card class="admin-modal-card">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add"><q-icon name="date_range" size="22px" /></q-avatar>
            <div>
              <div class="admin-modal-title">{{ editingWeeklyTemplate ? 'Edit Weekly Shift Template' : 'Add Weekly Shift Template' }}</div>
              <div class="admin-modal-subtitle">Configure weekly shift assignments</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>
        <q-card-section class="admin-modal-content">
          <q-input v-model="weeklyTemplateForm.name" label="Template Name *" outlined dense class="q-mb-md" />
          <div class="q-mb-md">
            <div class="text-subtitle2 q-mb-sm">Weekly Shift Rules</div>
            <div v-for="rule in weeklyTemplateForm.rules" :key="rule.weekday" class="row q-col-gutter-sm q-mb-sm items-center">
              <div class="col-3"><q-chip dense color="blue-1" text-color="blue-8" :label="rule.weekday" /></div>
              <div class="col-9">
                <q-select v-model="rule.shift_template" :options="shiftTypeTemplates" option-value="id" option-label="name" emit-value map-options label="Shift Template" outlined dense clearable />
              </div>
            </div>
          </div>
          <div class="q-mb-md"><q-toggle v-model="weeklyTemplateForm.is_active" label="Active" color="primary" /></div>
        </q-card-section>
        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn color="primary" label="Save" :loading="savingWeeklyTemplate" @click="saveWeeklyTemplate" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="shiftTypeTemplateDialog" persistent>
      <q-card class="admin-modal-card" style="max-width: 720px; width: 720px">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add"><q-icon name="schedule" size="22px" /></q-avatar>
            <div>
              <div class="admin-modal-title">{{ editingShiftTypeTemplate ? 'Edit Shift Template' : 'Add Shift Template' }}</div>
              <div class="admin-modal-subtitle">Define shift schedules and timings</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>
        <q-card-section class="admin-modal-content">
          <q-input v-model="shiftTypeTemplateForm.name" label="Template Name" outlined dense class="q-mb-md" />
          <div class="text-subtitle2 q-mb-sm">Shifts *</div>
          <div v-for="(shift, index) in shiftTypeTemplateForm.shifts" :key="index" class="row q-col-gutter-sm q-mb-md items-start">
            <div class="col-4">
              <q-select v-model="shift.site_id" :options="sites" option-value="id" option-label="name" emit-value map-options label="Site *" outlined dense clearable />
            </div>
            <div class="col-3">
              <q-input v-model="shift.default_start_time" label="Start Time *" type="time" outlined dense @update:model-value="updateCalculations()" />
            </div>
            <div class="col-3">
              <q-input v-model="shift.default_end_time" label="End Time *" type="time" outlined dense @update:model-value="updateCalculations()" />
            </div>
            <div class="col-2 flex items-center justify-end">
              <q-btn v-if="shiftTypeTemplateForm.shifts.length > 1" flat round dense color="negative" icon="delete" @click="deleteShift(index)" />
            </div>
          </div>
          <q-btn flat color="primary" icon="add" label="Add Shift" class="q-mb-md" @click="addShift()" />
        </q-card-section>
        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn color="primary" :label="editingShiftTypeTemplate ? 'Update' : 'Save'" :loading="savingShiftTypeTemplate" @click="saveShiftTypeTemplate" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAdminShifts } from '@/composables/admin/useAdminShifts'
import { useAdminSites } from '@/composables/admin/useAdminSites'

const { sites, fetchSites } = useAdminSites()

const {
  shiftTypeTemplates,
  weeklyShiftTemplates,
  loadingShiftTypeTemplates,
  savingShiftTypeTemplate,
  loadingWeeklyTemplates,
  savingWeeklyTemplate,
  shiftTypeTemplateDialog,
  editingShiftTypeTemplate,
  shiftTypeTemplateForm,
  weeklyTemplateDialog,
  weeklyTemplateForm,
  editingWeeklyTemplate,
  fetchShiftTemplates,
  fetchShiftTypeTemplates,
  fetchWeeklyShiftTemplates,
  openShiftTypeTemplateDialog,
  openEditShiftTypeTemplateDialog: editShiftTypeTemplate,
  saveShiftTypeTemplate,
  deleteShiftTypeTemplate,
  openWeeklyTemplateDialog,
  openEditWeeklyTemplateDialog: editWeeklyTemplate,
  saveWeeklyTemplate,
  deleteWeeklyTemplate,
} = useAdminShifts()

const shiftSubTab = ref('shift-types')

const recurringColumns = ref([
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'shift_times', label: 'Shift Times', field: 'shift_times', align: 'center' },
  { name: 'total_hours', label: 'Total Hours', field: 'total_hours', align: 'center' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
])

const weeklyTemplateColumns = ref([
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'rules', label: 'Rules', field: 'rules', align: 'left' },
  { name: 'created_at', label: 'Created', field: 'created_at', align: 'left', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
])

function calculateShiftDuration(startTime, endTime) {
  if (!startTime || !endTime) return 0
  const start = new Date(`2000-01-01T${startTime}`)
  let end = new Date(`2000-01-01T${endTime}`)
  if (end < start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
  return (end - start) / (1000 * 60 * 60)
}

function calculateWorkingHours() {
  const form = shiftTypeTemplateForm.value
  if (!form.shifts || !form.shifts.length) return 0
  return Math.round(form.shifts.reduce((sum, s) => sum + calculateShiftDuration(s.default_start_time, s.default_end_time), 0) * 10) / 10
}

function calculateBreakHours() {
  const form = shiftTypeTemplateForm.value
  if (!form.shifts || !form.shifts.length) { form.break_hours = 0; return 0 }
  if (form.shifts.length === 1) {
    const workingHours = calculateWorkingHours()
    form.break_hours = workingHours >= 9 ? 1 : 0
    return form.break_hours
  }
  let totalBreakMinutes = 0
  for (let i = 1; i < form.shifts.length; i++) {
    const prevShift = form.shifts[i - 1]
    const currentShift = form.shifts[i]
    if (prevShift.site_id !== currentShift.site_id) continue
    if (prevShift.default_end_time && currentShift.default_start_time) {
      let prevEnd = new Date(`2000-01-01T${prevShift.default_end_time}`)
      let currStart = new Date(`2000-01-01T${currentShift.default_start_time}`)
      if (currStart < prevEnd) currStart = new Date(currStart.getTime() + 24 * 60 * 60 * 1000)
      const breakMinutes = (currStart - prevEnd) / (1000 * 60)
      if (breakMinutes > 0) totalBreakMinutes += breakMinutes
    }
  }
  form.break_hours = Math.round((totalBreakMinutes / 60) * 10) / 10
  return form.break_hours
}

function calculateTotalHours() {
  const workingHours = calculateWorkingHours()
  const breakHours = calculateBreakHours()
  shiftTypeTemplateForm.value.total_hours = Math.round((workingHours - breakHours) * 10) / 10
  return shiftTypeTemplateForm.value.total_hours
}

function updateCalculations() { calculateWorkingHours(); calculateBreakHours(); calculateTotalHours() }

function deleteShift(index) { shiftTypeTemplateForm.value.shifts.splice(index, 1); updateCalculations() }

function addShift() { shiftTypeTemplateForm.value.shifts.push({ site_id: null, default_start_time: '', default_end_time: '' }); updateCalculations() }

function parseShifts(shiftsData) {
  if (!shiftsData) return []
  if (Array.isArray(shiftsData)) return shiftsData
  if (typeof shiftsData === 'string') { try { return JSON.parse(shiftsData) } catch { return [] } }
  return []
}

function formatTimeDisplay(timeString) {
  if (!timeString) return ''
  const [hours, minutes] = timeString.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

function calculateTotalHoursFromRow(row) {
  const shifts = parseShifts(row.shifts_detail)
  if (!shifts || !shifts.length) return 0
  let totalMinutes = 0
  for (const shift of shifts) {
    if (shift.default_start_time && shift.default_end_time) {
      const start = new Date(`2000-01-01T${shift.default_start_time}`)
      let end = new Date(`2000-01-01T${shift.default_end_time}`)
      if (end < start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
      totalMinutes += (end - start) / (1000 * 60)
    }
  }
  let breakMinutes = 0
  if (shifts.length === 1) {
    if (totalMinutes / 60 >= 9) breakMinutes = 60
  } else {
    for (let i = 1; i < shifts.length; i++) {
      const prevShift = shifts[i - 1]
      const currentShift = shifts[i]
      if (prevShift.site_id !== currentShift.site_id) continue
      if (prevShift.default_end_time && currentShift.default_start_time) {
        let prevEnd = new Date(`2000-01-01T${prevShift.default_end_time}`)
        let currStart = new Date(`2000-01-01T${currentShift.default_start_time}`)
        if (currStart < prevEnd) currStart = new Date(currStart.getTime() + 24 * 60 * 60 * 1000)
        const gapMinutes = (currStart - prevEnd) / (1000 * 60)
        if (gapMinutes > 0) breakMinutes += gapMinutes
      }
    }
  }
  return Math.round(((totalMinutes - breakMinutes) / 60) * 10) / 10
}

onMounted(async () => {
  await fetchShiftTemplates()
  await fetchWeeklyShiftTemplates()
  await fetchSites()
  await fetchShiftTypeTemplates()
})
</script>

<style scoped>
@import './AdminSettingsPanelShared.css';
</style>
