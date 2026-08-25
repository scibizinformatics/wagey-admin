<template>
  <div>
    <div class="tabs-section">
      <div class="tab-pills">
        <button
          :class="['tab-pill', { active: shiftSubTab === 'shift-types' }]"
          @click="shiftSubTab = 'shift-types'"
        >
          <q-icon name="schedule" class="tab-pill-icon" />
          <span>Shift Template</span>
        </button>
        <button
          :class="['tab-pill', { active: shiftSubTab === 'weekly-templates' }]"
          @click="shiftSubTab = 'weekly-templates'"
        >
          <q-icon name="date_range" class="tab-pill-icon" />
          <span>Weekly Shift Templates</span>
        </button>
        <button
          :class="['tab-pill', { active: shiftSubTab === 'templates-24h' }]"
          @click="shiftSubTab = 'templates-24h'"
        >
          <q-icon name="hourglass_full" class="tab-pill-icon" />
          <span>24-Hour Shift Templates</span>
        </button>
      </div>
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
              <q-btn
                color="primary"
                label="Add Shift Template"
                icon="add"
                class="add-btn"
                @click="openShiftTypeTemplateDialog"
              />
            </div>
          </div>
          <div class="modern-table-container">
            <!-- Built from the live `recurringColumns`, so the placeholder shares the
                 real table's columns, labels and alignment. -->
            <template v-if="loadingShiftTypeTemplates">
              <TableSkeleton :columns="recurringColumns" :rows="5" />
            </template>
            <template v-else>
              <q-table
                :rows="shiftTypeTemplates"
                :columns="recurringColumns"
                row-key="id"
                flat
                no-data-label="No shift templates found"
                class="dash-qtable settings-table"
                hide-pagination
                :rows-per-page-options="[0]"
              >
                <template v-slot:header>
                  <q-tr class="table-header-row">
                    <q-th class="table-header-cell">Name</q-th>
                    <q-th class="table-header-cell">Shift Times</q-th>
                    <q-th class="table-header-cell">Total Hours</q-th>
                    <q-th class="table-header-cell actions-header">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr class="table-body-row">
                    <q-td class="table-body-cell"
                      ><span class="item-name">{{ props.row.name }}</span></q-td
                    >
                    <q-td class="table-body-cell">
                      <div
                        v-if="props.row.shifts_detail && props.row.shifts_detail.length"
                        class="shifts-time-list"
                      >
                        <div
                          v-for="(shift, idx) in props.row.shifts_detail"
                          :key="idx"
                          class="shift-time-item"
                        >
                          {{ formatTimeDisplay(shift.start_time) }} -
                          {{ formatTimeDisplay(shift.end_time) }}
                        </div>
                      </div>
                      <span v-else>&mdash;</span>
                    </q-td>
                    <q-td class="table-body-cell"
                      >{{ calculateTotalHoursFromRow(props.row) }} hrs</q-td
                    >
                    <q-td class="table-body-cell actions-cell">
                      <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                        <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                          <q-list dense style="min-width: 150px">
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item"
                              @click="editShiftTypeTemplate(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="edit" size="16px"
                              /></q-item-section>
                              <q-item-section>Edit</q-item-section>
                            </q-item>
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item dropdown-item-danger"
                              @click="deleteShiftTypeTemplate(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="delete" size="16px" color="negative"
                              /></q-item-section>
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

      <q-tab-panel name="weekly-templates" class="q-pa-none">
        <div class="table-section">
          <div class="table-header">
            <div class="table-title-section">
              <h2 class="table-title">Weekly Shift Templates</h2>
              <p class="table-subtitle">Manage shift type templates for weekly scheduling</p>
            </div>
            <div class="table-actions">
              <q-btn
                color="primary"
                label="Add Template"
                icon="add"
                class="add-btn"
                @click="openWeeklyTemplateDialog"
              />
            </div>
          </div>
          <div class="modern-table-container">
            <!-- Built from the live `weeklyTemplateColumns`, so the placeholder shares the
                 real table's columns, labels and alignment. -->
            <template v-if="loadingWeeklyTemplates">
              <TableSkeleton :columns="weeklyTemplateColumns" :rows="5" />
            </template>
            <template v-else>
              <q-table
                :rows="weeklyShiftTemplates"
                :columns="weeklyTemplateColumns"
                row-key="id"
                flat
                no-data-label="No weekly shift templates found"
                class="dash-qtable settings-table"
                hide-pagination
                :rows-per-page-options="[0]"
              >
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
                    <q-td class="table-body-cell"
                      ><span class="item-name">{{ props.row.name }}</span></q-td
                    >
                    <q-td class="table-body-cell">{{
                      Array.isArray(props.row.rules) ? props.row.rules.length + ' rules' : ''
                    }}</q-td>
                    <q-td class="table-body-cell">{{
                      props.row.created_at
                        ? new Date(props.row.created_at).toLocaleDateString()
                        : ''
                    }}</q-td>
                    <q-td class="table-body-cell actions-cell">
                      <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                        <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                          <q-list dense style="min-width: 150px">
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item"
                              @click="editWeeklyTemplate(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="edit" size="16px"
                              /></q-item-section>
                              <q-item-section>Edit</q-item-section>
                            </q-item>
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item dropdown-item-danger"
                              @click="deleteWeeklyTemplate(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="delete" size="16px" color="negative"
                              /></q-item-section>
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

      <q-tab-panel name="templates-24h" class="q-pa-none">
        <div class="table-section">
          <div class="table-header">
            <div class="table-title-section">
              <h2 class="table-title">24-Hour Shift Templates</h2>
              <p class="table-subtitle">
                Manage round-the-clock templates whose shifts chain across the full day
              </p>
            </div>
            <div class="table-actions">
              <q-btn
                color="primary"
                label="Add 24-Hour Template"
                icon="add"
                class="add-btn"
                @click="openShiftTemplate24hDialog"
              />
            </div>
          </div>
          <div class="modern-table-container">
            <template v-if="loadingShiftTemplates24h">
              <TableSkeleton :columns="template24hColumns" :rows="5" />
            </template>
            <template v-else>
              <q-table
                :rows="shiftTemplates24h"
                :columns="template24hColumns"
                row-key="id"
                flat
                no-data-label="No 24-hour shift templates found"
                class="dash-qtable settings-table"
                hide-pagination
                :rows-per-page-options="[0]"
              >
                <template v-slot:header>
                  <q-tr class="table-header-row">
                    <q-th class="table-header-cell">Name</q-th>
                    <q-th class="table-header-cell">Shift Times</q-th>
                    <q-th class="table-header-cell">Coverage</q-th>
                    <q-th class="table-header-cell">Status</q-th>
                    <q-th class="table-header-cell">Created</q-th>
                    <q-th class="table-header-cell actions-header">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr class="table-body-row">
                    <q-td class="table-body-cell"
                      ><span class="item-name">{{ props.row.name }}</span></q-td
                    >
                    <q-td class="table-body-cell">
                      <!-- The API already renders a human-readable span in
                           `time_display`; fall back to the raw shift list when
                           it is absent. -->
                      <span v-if="props.row.time_display" class="shift-time-item">{{
                        props.row.time_display
                      }}</span>
                      <div v-else-if="rowShifts24h(props.row).length" class="shifts-time-list">
                        <div
                          v-for="(shift, idx) in rowShifts24h(props.row)"
                          :key="idx"
                          class="shift-time-item"
                        >
                          {{ formatTimeDisplay(shiftStart(shift)) }} -
                          {{ formatTimeDisplay(shiftEnd(shift)) }}
                        </div>
                      </div>
                      <span v-else>&mdash;</span>
                    </q-td>
                    <q-td class="table-body-cell"
                      >{{ coverage24hFromRow(props.row) }} / 24 hrs</q-td
                    >
                    <q-td class="table-body-cell">
                      <span
                        class="status-badge"
                        :class="props.row.is_active ? 'status-active' : 'status-inactive'"
                        >{{ props.row.is_active ? 'Active' : 'Inactive' }}</span
                      >
                    </q-td>
                    <q-td class="table-body-cell">{{
                      props.row.created_at
                        ? new Date(props.row.created_at).toLocaleDateString()
                        : ''
                    }}</q-td>
                    <q-td class="table-body-cell actions-cell">
                      <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                        <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                          <q-list dense style="min-width: 150px">
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item"
                              @click="editShiftTemplate24h(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="edit" size="16px"
                              /></q-item-section>
                              <q-item-section>Edit</q-item-section>
                            </q-item>
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item dropdown-item-danger"
                              @click="deleteShiftTemplate24h(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="delete" size="16px" color="negative"
                              /></q-item-section>
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
      <q-card class="admin-modal-card weekly-template-modal">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add"
              ><q-icon name="date_range" size="22px"
            /></q-avatar>
            <div>
              <div class="admin-modal-title">
                {{
                  editingWeeklyTemplate ? 'Edit Weekly Shift Template' : 'Add Weekly Shift Template'
                }}
              </div>
              <div class="admin-modal-subtitle">Configure weekly shift assignments</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>
        <q-card-section class="admin-modal-content">
          <q-input
            v-model="weeklyTemplateForm.name"
            label="Template Name *"
            outlined
            dense
            class="q-mb-md"
          />
          <div class="form-section-label q-mb-sm">Weekly Shift Rules</div>
          <div class="week-grid">
            <div v-for="rule in weeklyTemplateForm.rules" :key="rule.weekday" class="day-cell">
              <div class="day-header">{{ formatWeekdayHeader(rule.weekday) }}</div>
              <q-btn-dropdown
                flat
                dense
                size="xs"
                icon="add"
                label="Schedule"
                class="schedule-btn"
                dropdown-icon="none"
                fit
                menu-anchor="bottom left"
                menu-self="top left"
              >
                <q-list dense style="min-width: 220px">
                  <q-item
                    v-for="template in shiftTypeTemplates"
                    :key="template.id"
                    clickable
                    v-close-popup
                    @click="rule.shift_template = template.id"
                    style="padding: 8px 12px"
                  >
                    <q-item-section>
                      <div class="template-name">{{ template.name }}</div>
                      <template v-for="(shift, idx) in getTemplateShifts(template.id)" :key="idx">
                        <div class="dropdown-shift-time">
                          {{ formatTimeDisplay(shift.start_time) }} -
                          {{ formatTimeDisplay(shift.end_time) }}
                        </div>
                        <div
                          class="dropdown-shift-site"
                          v-if="getSiteNameById(shift.site?.id || shift.site_id)"
                        >
                          <q-icon name="location_on" size="9px" />
                          {{ getSiteNameById(shift.site?.id || shift.site_id) }}
                        </div>
                        <div
                          v-if="idx < getTemplateShifts(template.id).length - 1"
                          class="dropdown-shift-separator"
                        />
                      </template>
                      <div class="dropdown-shift-hours">
                        {{ getShiftHoursDisplayForTemplate(template) }}
                      </div>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-btn-dropdown>
              <div v-if="!rule.shift_template" class="day-card day-off-card">
                <q-icon name="event_busy" size="16px" class="day-off-icon" />
                <div class="day-off-label">DAY OFF</div>
              </div>
              <div v-else class="day-card shift-card">
                <template v-for="(shift, idx) in getTemplateShifts(rule.shift_template)" :key="idx">
                  <div class="shift-time">
                    {{ formatTimeDisplay(shift.start_time) }} -
                    {{ formatTimeDisplay(shift.end_time) }}
                  </div>
                  <div class="shift-site" v-if="getSiteNameById(shift.site?.id || shift.site_id)">
                    <q-icon name="location_on" size="9px" />
                    {{ getSiteNameById(shift.site?.id || shift.site_id) }}
                  </div>
                  <div
                    v-if="idx < getTemplateShifts(rule.shift_template).length - 1"
                    class="shift-separator"
                  />
                </template>
                <div class="shift-hours">{{ getShiftHoursDisplay(rule) }}</div>
              </div>
            </div>
          </div>
          <div class="q-mt-md">
            <q-toggle
              v-model="weeklyTemplateForm.is_active"
              label="Active"
              color="primary"
              class="brand-toggle"
            />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn
            color="primary"
            label="Save"
            class="admin-save-btn"
            :loading="savingWeeklyTemplate"
            @click="saveWeeklyTemplate"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="shiftTypeTemplateDialog" persistent>
      <q-card class="admin-modal-card admin-modal-card--lg">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add"
              ><q-icon name="schedule" size="22px"
            /></q-avatar>
            <div>
              <div class="admin-modal-title">
                {{ editingShiftTypeTemplate ? 'Edit Shift Template' : 'Add Shift Template' }}
              </div>
              <div class="admin-modal-subtitle">Define shift schedules and timings</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>
        <q-card-section class="admin-modal-content">
          <q-input
            v-model="shiftTypeTemplateForm.name"
            label="Template Name"
            outlined
            dense
            class="q-mb-md"
          />
          <div class="text-subtitle2 q-mb-sm">Shifts *</div>
          <div
            v-for="(shift, index) in shiftTypeTemplateForm.shifts"
            :key="index"
            class="row q-col-gutter-sm q-mb-md items-start"
          >
            <div class="col-4">
              <q-select
                v-model="shift.site_id"
                :options="sites"
                option-value="id"
                option-label="name"
                emit-value
                map-options
                label="Site *"
                outlined
                dense
                clearable
              />
            </div>
            <div class="col-3">
              <q-input
                v-model="shift.default_start_time"
                label="Start Time *"
                type="time"
                outlined
                dense
                @update:model-value="updateCalculations()"
              />
            </div>
            <div class="col-3">
              <q-input
                v-model="shift.default_end_time"
                label="End Time *"
                type="time"
                outlined
                dense
                @update:model-value="updateCalculations()"
              />
            </div>
            <div class="col-2 flex items-center justify-end">
              <q-btn
                v-if="shiftTypeTemplateForm.shifts.length > 1"
                flat
                round
                dense
                color="negative"
                icon="delete"
                @click="deleteShift(index)"
              />
            </div>
          </div>
          <q-btn
            flat
            color="primary"
            icon="add"
            label="Add Shift"
            class="q-mb-md"
            @click="addShift()"
          />
        </q-card-section>
        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn
            color="primary"
            :label="editingShiftTypeTemplate ? 'Update' : 'Save'"
            :loading="savingShiftTypeTemplate"
            @click="saveShiftTypeTemplate"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="shiftTemplate24hDialog" persistent>
      <q-card class="admin-modal-card admin-modal-card--lg">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add"
              ><q-icon name="hourglass_full" size="22px"
            /></q-avatar>
            <div>
              <div class="admin-modal-title">
                {{
                  editingShiftTemplate24h
                    ? 'Edit 24-Hour Shift Template'
                    : 'Add 24-Hour Shift Template'
                }}
              </div>
              <div class="admin-modal-subtitle">
                Chain shifts around the clock to cover a full day
              </div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>
        <q-card-section class="admin-modal-content">
          <q-input
            v-model="shiftTemplate24hForm.name"
            label="Template Name *"
            outlined
            dense
            class="q-mb-md"
          />
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-subtitle2">Shifts *</div>
            <!-- Advisory, not a gate: the backend decides what counts as valid,
                 so a short or long chain is flagged but still saveable. -->
            <div class="coverage-chip" :class="{ 'coverage-chip--full': coverage24h === 24 }">
              <q-icon :name="coverage24h === 24 ? 'check_circle' : 'schedule'" size="13px" />
              {{ coverage24h }} / 24 hrs covered
            </div>
          </div>
          <div
            v-for="(shift, index) in shiftTemplate24hForm.shifts"
            :key="index"
            class="row q-col-gutter-sm q-mb-md items-start"
          >
            <div class="col-4">
              <q-select
                v-model="shift.site_id"
                :options="sites"
                option-value="id"
                option-label="name"
                emit-value
                map-options
                label="Site *"
                outlined
                dense
                clearable
              />
            </div>
            <div class="col-3">
              <q-input
                v-model="shift.default_start_time"
                label="Start Time *"
                type="time"
                outlined
                dense
              />
            </div>
            <div class="col-3">
              <q-input
                v-model="shift.default_end_time"
                label="End Time *"
                type="time"
                outlined
                dense
              />
            </div>
            <div class="col-2 flex items-center justify-end">
              <q-btn
                v-if="shiftTemplate24hForm.shifts.length > 1"
                flat
                round
                dense
                color="negative"
                icon="delete"
                @click="delete24hShift(index)"
              />
            </div>
          </div>
          <q-btn
            flat
            color="primary"
            icon="add"
            label="Add Shift"
            class="q-mb-md"
            @click="add24hShift()"
          />
          <!-- Only on edit: the create endpoint does not model `is_active`, so
               offering the switch there would promise something it ignores. -->
          <div v-if="editingShiftTemplate24h">
            <q-toggle
              v-model="shiftTemplate24hForm.is_active"
              label="Active"
              color="primary"
              class="brand-toggle"
            />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn
            color="primary"
            :label="editingShiftTemplate24h ? 'Update' : 'Save'"
            class="admin-save-btn"
            :loading="savingShiftTemplate24h"
            @click="saveShiftTemplate24h"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
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
  shiftTemplates24h,
  loadingShiftTemplates24h,
  savingShiftTemplate24h,
  shiftTemplate24hDialog,
  editingShiftTemplate24h,
  shiftTemplate24hForm,
  parseShiftList,
  fetchShiftTemplates24h,
  openShiftTemplate24hDialog,
  openEditShiftTemplate24hDialog: editShiftTemplate24h,
  saveShiftTemplate24h,
  deleteShiftTemplate24h,
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
  return (
    Math.round(
      form.shifts.reduce(
        (sum, s) => sum + calculateShiftDuration(s.default_start_time, s.default_end_time),
        0,
      ) * 10,
    ) / 10
  )
}

function calculateBreakHours() {
  const form = shiftTypeTemplateForm.value
  if (!form.shifts || !form.shifts.length) {
    form.break_hours = 0
    return 0
  }
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

function updateCalculations() {
  calculateWorkingHours()
  calculateBreakHours()
  calculateTotalHours()
}

function deleteShift(index) {
  shiftTypeTemplateForm.value.shifts.splice(index, 1)
  updateCalculations()
}

function addShift() {
  shiftTypeTemplateForm.value.shifts.push({
    site_id: null,
    default_start_time: '',
    default_end_time: '',
  })
  updateCalculations()
}

function parseShifts(shiftsData) {
  if (!shiftsData) return []
  if (Array.isArray(shiftsData)) return shiftsData
  if (typeof shiftsData === 'string') {
    try {
      return JSON.parse(shiftsData)
    } catch {
      return []
    }
  }
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

function _shiftTimes(shift) {
  return {
    start: shift.start_time || shift.default_start_time,
    end: shift.end_time || shift.default_end_time,
  }
}

function _shiftSiteId(shift) {
  return shift.site?.id || shift.site_id
}

function calculateTotalHoursFromRow(row) {
  const shifts = parseShifts(row.shifts_detail)
  if (!shifts || !shifts.length) return 0
  let totalMinutes = 0
  for (const shift of shifts) {
    const { start, end } = _shiftTimes(shift)
    if (start && end) {
      const startDt = new Date(`2000-01-01T${start}`)
      let endDt = new Date(`2000-01-01T${end}`)
      if (endDt < startDt) endDt = new Date(endDt.getTime() + 24 * 60 * 60 * 1000)
      totalMinutes += (endDt - startDt) / (1000 * 60)
    }
  }
  let breakMinutes = 0
  if (shifts.length === 1) {
    if (totalMinutes / 60 >= 9) breakMinutes = 60
  } else {
    for (let i = 1; i < shifts.length; i++) {
      const prevShift = shifts[i - 1]
      const currentShift = shifts[i]
      if (_shiftSiteId(prevShift) !== _shiftSiteId(currentShift)) continue
      const prev = _shiftTimes(prevShift)
      const curr = _shiftTimes(currentShift)
      if (prev.end && curr.start) {
        let prevEnd = new Date(`2000-01-01T${prev.end}`)
        let currStart = new Date(`2000-01-01T${curr.start}`)
        if (currStart < prevEnd) currStart = new Date(currStart.getTime() + 24 * 60 * 60 * 1000)
        const gapMinutes = (currStart - prevEnd) / (1000 * 60)
        if (gapMinutes > 0) breakMinutes += gapMinutes
      }
    }
  }
  return Math.round(((totalMinutes - breakMinutes) / 60) * 10) / 10
}

function formatWeekdayHeader(weekday) {
  const map = {
    monday: 'MON',
    tuesday: 'TUE',
    wednesday: 'WED',
    thursday: 'THU',
    friday: 'FRI',
    saturday: 'SAT',
    sunday: 'SUN',
  }
  return map[weekday?.toLowerCase()] || weekday
}

function getTemplateById(templateId) {
  if (!templateId) return null
  return shiftTypeTemplates.value.find((t) => t.id === templateId) || null
}

function getTemplateShifts(templateId) {
  const template = getTemplateById(templateId)
  if (!template) return []
  return parseShifts(template.shifts_detail)
}

function getSiteNameById(siteId) {
  if (!siteId) return null
  const id = Number(siteId)
  return sites.value.find((s) => Number(s.id) === id)?.name || null
}

function calculateBreakHoursFromRow(row) {
  const shifts = parseShifts(row.shifts_detail)
  if (!shifts || !shifts.length) return 0
  let totalMinutes = 0
  for (const shift of shifts) {
    const { start, end } = _shiftTimes(shift)
    if (start && end) {
      const startDt = new Date(`2000-01-01T${start}`)
      let endDt = new Date(`2000-01-01T${end}`)
      if (endDt < startDt) endDt = new Date(endDt.getTime() + 24 * 60 * 60 * 1000)
      totalMinutes += (endDt - startDt) / (1000 * 60)
    }
  }
  let breakMinutes = 0
  if (shifts.length === 1) {
    if (totalMinutes / 60 >= 9) breakMinutes = 60
  } else {
    for (let i = 1; i < shifts.length; i++) {
      const prevShift = shifts[i - 1]
      const currentShift = shifts[i]
      if (_shiftSiteId(prevShift) !== _shiftSiteId(currentShift)) continue
      const prev = _shiftTimes(prevShift)
      const curr = _shiftTimes(currentShift)
      if (prev.end && curr.start) {
        let prevEnd = new Date(`2000-01-01T${prev.end}`)
        let currStart = new Date(`2000-01-01T${curr.start}`)
        if (currStart < prevEnd) currStart = new Date(currStart.getTime() + 24 * 60 * 60 * 1000)
        const gapMinutes = (currStart - prevEnd) / (1000 * 60)
        if (gapMinutes > 0) breakMinutes += gapMinutes
      }
    }
  }
  return Math.round((breakMinutes / 60) * 10) / 10
}

function getShiftHoursDisplay(rule) {
  const template = getTemplateById(rule.shift_template)
  if (!template) return ''
  return getShiftHoursDisplayForTemplate(template)
}

function getShiftHoursDisplayForTemplate(template) {
  if (!template) return ''
  const totalHours = calculateTotalHoursFromRow(template)
  const breakHours = calculateBreakHoursFromRow(template)
  let text = `${totalHours} Hour${totalHours !== 1 ? 's' : ''}`
  if (breakHours > 0) {
    text += `, ${breakHours} Hour${breakHours !== 1 ? 's' : ''} Break`
  }
  return text
}

// ── 24-hour shift templates ──
// Coverage, not total/break hours, is the useful number here: a 24-hour template
// is judged by whether its segments chain all the way around the clock.

const template24hColumns = ref([
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'shift_times', label: 'Shift Times', field: 'time_display', align: 'left' },
  { name: 'coverage', label: 'Coverage', field: 'coverage', align: 'center' },
  { name: 'is_active', label: 'Status', field: 'is_active', align: 'center' },
  { name: 'created_at', label: 'Created', field: 'created_at', align: 'left', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
])

function shiftStart(shift) {
  return shift.start_time || shift.default_start_time
}

function shiftEnd(shift) {
  return shift.end_time || shift.default_end_time
}

/** `shifts_detail` is the richer payload; `shifts` is the fallback. */
function rowShifts24h(row) {
  const detail = parseShiftList(row.shifts_detail)
  return detail.length ? detail : parseShiftList(row.shifts)
}

function sumCoverageHours(shifts) {
  if (!shifts?.length) return 0
  const total = shifts.reduce(
    (sum, s) => sum + calculateShiftDuration(shiftStart(s), shiftEnd(s)),
    0,
  )
  return Math.round(total * 10) / 10
}

function coverage24hFromRow(row) {
  return sumCoverageHours(rowShifts24h(row))
}

const coverage24h = computed(() => sumCoverageHours(shiftTemplate24hForm.value.shifts))

function add24hShift() {
  shiftTemplate24hForm.value.shifts.push({
    site_id: null,
    default_start_time: '',
    default_end_time: '',
  })
}

function delete24hShift(index) {
  shiftTemplate24hForm.value.shifts.splice(index, 1)
}

onMounted(async () => {
  await fetchShiftTemplates()
  await fetchWeeklyShiftTemplates()
  await fetchSites()
  await fetchShiftTypeTemplates()
  await fetchShiftTemplates24h()
})
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

.weekly-template-modal {
  width: 780px;
  max-width: 92vw;
}

.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.day-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.day-header {
  text-align: center;
  font-size: 10px;
  font-weight: 700;
  color: var(--dash-ink-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.day-card {
  border-radius: 6px;
  padding: 6px 8px;
  min-height: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.day-off-card {
  background: var(--dash-warn-bg);
  border: 1px solid var(--dash-warn-line);
  align-items: center;
}

.day-off-icon {
  color: var(--dash-warn-mark);
}

.day-off-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--dash-warn);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.shift-card {
  background: var(--dash-info-bg);
  border: 1px solid var(--dash-info-line);
}

.shift-time {
  font-size: 10px;
  font-weight: 600;
  color: var(--dash-info);
  line-height: 1.3;
}

.shift-site {
  font-size: 9px;
  color: var(--dash-ink-3);
  display: flex;
  align-items: center;
  gap: 2px;
  line-height: 1.3;
}

.shift-hours {
  font-size: 9px;
  color: var(--dash-info-mark);
  line-height: 1.3;
  margin-top: 1px;
}

.shift-separator {
  border-top: 1px dashed var(--dash-line-strong);
  margin: 2px 0;
}

.schedule-btn {
  font-size: 10px !important;
  font-weight: 500;
  border-radius: 5px;
  padding: 2px 6px !important;
  justify-content: center;
  min-height: 24px !important;
  height: 24px !important;
  color: #ffffff;
  background: var(--dash-brand);
  border: none;
  width: 100%;
}
.schedule-btn:hover {
  background: #193d5c !important;
}
.schedule-btn :deep(.q-btn__content) {
  gap: 3px;
}
.schedule-btn :deep(.q-btn-dropdown__arrow) {
  display: none;
}
.schedule-btn :deep(.q-menu) {
  min-width: unset !important;
  width: 100% !important;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.schedule-btn :deep(.q-menu)::-webkit-scrollbar {
  display: none;
}

.tabs-section {
  padding: 10px 14px;
  border-bottom: 1px solid var(--dash-line);
  background: var(--dash-n-25);
}

.tab-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tab-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 20px;
  border: 1px solid var(--dash-line);
  background: var(--dash-n-50);
  color: var(--dash-ink-3);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;
}

.tab-pill:hover {
  background: var(--dash-n-100);
  border-color: var(--dash-line-strong);
  color: var(--dash-ink-2);
}

/* Flat fill, no drop shadow: a selected sub-tab is a state, and lifting it off
   the band promised a depth nothing else on the page has. */
.tab-pill.active {
  background: var(--dash-brand);
  border-color: var(--dash-brand);
  color: #ffffff;
}

.tab-pill-icon {
  font-size: 15px;
}

@media (max-width: 1023px) {
  .tab-pills {
    gap: 5px;
  }
  /* The sub-tabs split the row rather than shrinking. Labels stay at every
     width; with three of them the row wraps before it crowds. */
  .tab-pill {
    padding: 7px 12px;
    font-size: 12.5px;
    flex: 1;
    justify-content: center;
  }
}

@media (max-width: 1023px) {
  .weekly-template-modal {
    width: 640px;
  }
  .week-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 767px) {
  .weekly-template-modal {
    width: 340px;
  }
  .week-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ── Component-Specific Styles ── */

.coverage-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 20px;
  border: 1px solid var(--dash-line);
  background: var(--dash-n-50);
  color: var(--dash-ink-3);
  font-size: 11px;
  font-weight: 600;
}

.coverage-chip--full {
  border-color: var(--dash-good-line);
  background: var(--dash-good-bg);
  color: var(--dash-good);
}

.shifts-time-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shift-time-item {
  font-size: 12px;
  color: var(--dash-ink-2);
  background: var(--dash-n-100);
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
}

/* Dropdown preview styles */
.template-name {
  font-weight: 600;
  font-size: 12px;
  color: var(--dash-info);
  margin-bottom: 4px;
}

.dropdown-shift-time {
  font-size: 11px;
  font-weight: 600;
  color: var(--dash-info);
  line-height: 1.3;
}

.dropdown-shift-site {
  font-size: 10px;
  color: var(--dash-ink-3);
  display: flex;
  align-items: center;
  gap: 2px;
  line-height: 1.3;
}

.dropdown-shift-hours {
  font-size: 10px;
  color: var(--dash-info-mark);
  line-height: 1.3;
  margin-top: 4px;
}

.dropdown-shift-separator {
  border-top: 1px dashed var(--dash-line-strong);
  margin: 2px 0;
}

/* Separator between dropdown items */
.q-list > .q-item:not(:last-child) {
  border-bottom: 1px solid var(--dash-line);
}
</style>
