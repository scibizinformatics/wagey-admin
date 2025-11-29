<template>
  <q-page class="attendance-dashboard">
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">Attendance</h1>
          </div>
          <div class="header-actions">
            <q-btn
              flat
              round
              icon="refresh"
              size="md"
              class="header-btn"
              @click="fetchAttendanceData()"
            />
            <q-btn
              unelevated
              icon="file_download"
              label="Export All"
              color="primary"
              class="export-btn"
              no-caps
              @click="exportAll"
            />
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-section">
        <div class="stats-card personal-card">
          <div class="stats-icon-wrapper">
            <q-icon name="people" class="stats-icon" />
          </div>
          <div class="stats-content">
            <q-skeleton v-if="loading" type="text" class="text-h5" />
            <div v-else class="stats-amount">{{ stats[0].count }}</div>
            <div class="stats-label">Total Records</div>
          </div>
        </div>

        <div class="stats-card corporate-card">
          <div class="stats-icon-wrapper">
            <q-icon name="qr_code" class="stats-icon" />
          </div>
          <div class="stats-content">
            <q-skeleton v-if="loading" type="text" class="text-h5" />
            <div v-else class="stats-amount">{{ stats[1].count }}</div>
            <div class="stats-label">QR Scans</div>
          </div>
        </div>

        <div class="stats-card business-card">
          <div class="stats-icon-wrapper">
            <q-icon name="edit" class="stats-icon" />
          </div>
          <div class="stats-content">
            <q-skeleton v-if="loading" type="text" class="text-h5" />
            <div v-else class="stats-amount">{{ stats[2].count }}</div>
            <div class="stats-label">Manual Entry</div>
          </div>
        </div>

        <div class="stats-card custom-card">
          <div class="stats-icon-wrapper">
            <q-icon name="schedule" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-label">Auto Login</div>
            <div class="stats-sublabel">System Generated</div>
          </div>
        </div>
      </div>

      <!-- Filters Section -->
      <div class="filters-section">
        <div class="filters-card">
          <div class="filters-header">
            <h3 class="filters-title">Filter Records</h3>
            <q-btn
              flat
              dense
              icon="clear_all"
              label="Clear All"
              @click="clearAllFilters"
              class="clear-btn"
              size="sm"
            />
          </div>

          <div class="filters-grid">
            <q-input
              dense
              outlined
              label="Date Range"
              v-model="dateRange"
              class="filter-input"
              clearable
              readonly
              @click="showDatePicker = true"
            >
              <template v-slot:prepend>
                <q-icon name="event" class="cursor-pointer" @click="showDatePicker = true" />
              </template>
            </q-input>

            <q-select
              dense
              outlined
              label="Source"
              v-model="filters.source"
              :options="sourceOptions"
              :loading="filtersLoading"
              class="filter-input"
              clearable
              map-options
              emit-value
              behavior="menu"
              menu-anchor="bottom left"
              menu-self="top left"
            />

            <q-select
              dense
              outlined
              label="Employee"
              v-model="filters.employee"
              :options="employeeOptions"
              :loading="filtersLoading"
              class="filter-input"
              clearable
              map-options
              emit-value
              use-input
              input-debounce="300"
              @filter="filterEmployees"
              option-label="label"
              option-value="value"
              behavior="menu"
              menu-anchor="bottom left"
              menu-self="top left"
            >
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey"> No employees found </q-item-section>
                </q-item>
              </template>
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section avatar>
                    <q-avatar size="32px" color="primary" text-color="white">
                      {{ scope.opt.label.charAt(0) }}
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ scope.opt.label }}</q-item-label>
                    <q-item-label caption>ID: {{ scope.opt.value }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>

            <q-select
              dense
              outlined
              label="Business Owner"
              v-model="filters.business_owner"
              :options="businessOwnerOptions"
              :loading="filtersLoading"
              class="filter-input"
              clearable
              map-options
              emit-value
              behavior="menu"
              menu-anchor="bottom left"
              menu-self="top left"
            />
          </div>
        </div>
      </div>

      <!-- Main Table Section -->
      <div class="table-section">
        <div class="table-header">
          <div class="table-title-section">
            <h2 class="table-title">Attendance Overview</h2>
          </div>
          <div class="table-actions">
            <q-btn
              v-if="selected.length > 0"
              color="negative"
              icon="delete"
              :label="`Delete ${selected.length} items`"
              @click="confirmBatchDelete"
              size="sm"
              no-caps
            />
            <q-btn
              v-if="selected.length > 0"
              color="primary"
              icon="file_download"
              label="Export Selected"
              @click="exportSelected"
              size="sm"
              no-caps
            />
            <q-btn
              unelevated
              color="primary"
              icon="add"
              label="Add Attendance"
              @click="openAddDialog"
              size="sm"
              no-caps
              class="add-attendance-btn"
            />
          </div>
        </div>

        <!-- Attendance Table -->
        <div class="modern-table-container">
          <q-table
            :rows="attendanceData"
            :columns="columns"
            row-key="id"
            flat
            :loading="loading"
            class="attendance-table"
            hide-pagination
            :rows-per-page-options="[0]"
            selection="multiple"
            v-model:selected="selected"
            :grid="$q.screen.xs"
          >
            <!-- Grid mode for mobile -->
            <template v-slot:item="props" v-if="$q.screen.xs">
              <div class="q-pa-xs col-xs-12 col-sm-6 col-md-4">
                <q-card class="mobile-card">
                  <q-card-section>
                    <div class="mobile-employee">{{ getEmployeeName(props.row.employee) }}</div>
                    <div class="mobile-date">{{ props.row.date }}</div>
                  </q-card-section>
                  <q-card-section class="q-pt-none">
                    <div class="mobile-details">
                      Time In: {{ formatTime(props.row.time_in) }}<br />
                      Time Out: {{ formatTime(props.row.time_out) }}<br />
                      Source: {{ props.row.source?.replace('_', ' ').toUpperCase() }}
                    </div>
                    <div class="mobile-selfies q-mt-md">
                      <div v-if="props.row.time_in_selfie" class="mobile-selfie-item">
                        <span class="mobile-selfie-label">Time In Photo:</span>
                        <img
                          :src="props.row.time_in_selfie"
                          alt="Time In"
                          class="mobile-selfie-img"
                          @click="viewSelfie(props.row.time_in_selfie, 'Time In')"
                        />
                      </div>
                      <div v-if="props.row.time_out_selfie" class="mobile-selfie-item">
                        <span class="mobile-selfie-label">Time Out Photo:</span>
                        <img
                          :src="props.row.time_out_selfie"
                          alt="Time Out"
                          class="mobile-selfie-img"
                          @click="viewSelfie(props.row.time_out_selfie, 'Time Out')"
                        />
                      </div>
                    </div>
                  </q-card-section>
                  <q-card-actions align="right">
                    <q-btn flat size="sm" color="primary" @click="editAttendance(props.row)"
                      >Edit</q-btn
                    >
                  </q-card-actions>
                </q-card>
              </div>
            </template>

            <template v-slot:header>
              <q-tr class="table-header-row">
                <q-th class="table-header-cell">
                  <q-checkbox v-model="selectAll" @update:model-value="toggleSelectAll" />
                </q-th>
                <q-th class="table-header-cell">SL No</q-th>
                <q-th class="table-header-cell">Employee</q-th>
                <q-th class="table-header-cell">Date</q-th>
                <q-th class="table-header-cell">Time In</q-th>
                <q-th class="table-header-cell">Time In Photo</q-th>
                <q-th class="table-header-cell">Time Out</q-th>
                <q-th class="table-header-cell">Time Out Photo</q-th>
                <q-th class="table-header-cell">Source</q-th>
                <q-th class="table-header-cell">Actions</q-th>
              </q-tr>
            </template>

            <template v-slot:body="props">
              <q-tr class="table-body-row">
                <q-td class="table-body-cell">
                  <q-checkbox v-model="selected" :val="props.row" />
                </q-td>
                <q-td class="table-body-cell">
                  {{ String(props.rowIndex + 1).padStart(2, '0') }}.
                </q-td>
                <q-td class="table-body-cell employee-cell">
                  <div class="employee-info">
                    <q-avatar size="32px" class="employee-avatar">
                      {{ getEmployeeName(props.row.employee).charAt(0) }}
                    </q-avatar>
                    <span class="employee-name">{{ getEmployeeName(props.row.employee) }}</span>
                  </div>
                </q-td>
                <q-td class="table-body-cell">
                  {{ props.row.date }}
                </q-td>
                <q-td class="table-body-cell">
                  <div class="time-badge time-in" :class="{ 'has-time': props.row.time_in }">
                    {{ formatTime(props.row.time_in) }}
                  </div>
                </q-td>
                <q-td class="table-body-cell">
                  <div class="selfie-container">
                    <img
                      v-if="props.row.time_in_selfie"
                      :src="props.row.time_in_selfie"
                      alt="Time In Selfie"
                      class="selfie-thumbnail"
                      @click="viewSelfie(props.row.time_in_selfie, 'Time In')"
                    />
                    <span v-else class="no-photo">-</span>
                  </div>
                </q-td>
                <q-td class="table-body-cell">
                  <div class="time-badge time-out" :class="{ 'has-time': props.row.time_out }">
                    {{ formatTime(props.row.time_out) }}
                  </div>
                </q-td>
                <q-td class="table-body-cell">
                  <div class="selfie-container">
                    <img
                      v-if="props.row.time_out_selfie"
                      :src="props.row.time_out_selfie"
                      alt="Time Out Selfie"
                      class="selfie-thumbnail"
                      @click="viewSelfie(props.row.time_out_selfie, 'Time Out')"
                    />
                    <span v-else class="no-photo">-</span>
                  </div>
                </q-td>
                <q-td class="table-body-cell">
                  <div class="source-badge" :class="getSourceClass(props.row.source)">
                    {{ formatSource(props.row.source) }}
                  </div>
                </q-td>
                <q-td class="table-body-cell actions-cell">
                  <div class="action-buttons">
                    <q-btn
                      flat
                      round
                      icon="visibility"
                      size="sm"
                      class="action-btn view-btn"
                      @click="viewDetails(props.row)"
                    />
                    <q-btn
                      flat
                      round
                      icon="edit"
                      size="sm"
                      class="action-btn edit-btn"
                      @click="editAttendance(props.row)"
                    />
                  </div>
                </q-td>
              </q-tr>
            </template>
          </q-table>

          <!-- Table Footer with Pagination Info -->
          <div class="table-footer">
            <div class="footer-info">
              <span class="total-label">Total</span>
              <span class="total-records">{{ attendanceData.length }} Records</span>
              <span class="total-selected" v-if="selected.length > 0"
                >{{ selected.length }} Selected</span
              >
            </div>
            <div class="pagination-controls">
              <q-btn
                flat
                icon="chevron_left"
                class="pagination-btn"
                :disable="pagination.page === 1"
                @click="previousPage"
              />
              <span class="page-info">Page {{ pagination.page }} of {{ totalPages }}</span>
              <q-btn
                flat
                icon="chevron_right"
                class="pagination-btn"
                :disable="pagination.page === totalPages"
                @click="nextPage"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Date Range Picker Dialog -->
    <q-dialog v-model="showDatePicker">
      <q-card class="date-picker-card">
        <q-card-section>
          <div class="dialog-title">Select Date Range</div>
        </q-card-section>
        <q-card-section>
          <div class="date-picker-grid">
            <q-date v-model="tempDateRange.from" label="From Date" class="date-picker" />
            <q-date v-model="tempDateRange.to" label="To Date" class="date-picker" />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="showDatePicker = false" class="dialog-btn" />
          <q-btn flat label="Clear" @click="clearDateRange" class="dialog-btn" />
          <q-btn
            color="primary"
            label="Apply"
            @click="applyDateRange"
            class="dialog-btn primary-btn"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Selfie Viewer Dialog -->
    <q-dialog v-model="showSelfieDialog">
      <q-card class="selfie-dialog-card selfie-portrait">
        <q-card-section class="selfie-dialog-header">
          <div class="dialog-title">{{ selfieDialogTitle }}</div>
          <q-btn
            flat
            round
            dense
            icon="close"
            @click="showSelfieDialog = false"
            class="close-btn"
          />
        </q-card-section>
        <q-card-section class="selfie-dialog-body">
          <img :src="selectedSelfie" alt="Selfie" class="selfie-full-image selfie-portrait-image" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Add Attendance Dialog - TWO STEP PROCESS -->
    <q-dialog v-model="showAddDialog" persistent>
      <q-card class="edit-dialog-card" style="min-width: 600px">
        <q-card-section>
          <div class="dialog-title">
            {{ attendanceStep === 'time_in' ? 'Clock In' : 'Clock Out' }}
          </div>
          <div class="text-caption text-grey-7">
            {{
              attendanceStep === 'time_in' ? 'Step 1: Record Time In' : 'Step 2: Record Time Out'
            }}
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form @submit.prevent="handleAttendanceSubmit" class="edit-form">
            <!-- Employee dropdown - Only show in Time In step -->
            <q-select
              v-if="attendanceStep === 'time_in'"
              filled
              v-model="newRecord.employee"
              :options="employeeOptions"
              label="Employee *"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              use-input
              input-debounce="300"
              @filter="filterEmployees"
              @update:model-value="onEmployeeSelected"
              class="form-field"
              :rules="[(val) => !!val || 'Employee is required']"
            >
              <template v-slot:prepend>
                <q-icon name="person" />
              </template>
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey">No employees found</q-item-section>
                </q-item>
              </template>
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section avatar>
                    <q-avatar size="32px" color="primary" text-color="white">
                      {{ scope.opt.label.charAt(0) }}
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ scope.opt.label }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>

            <!-- Show selected employee info in Time Out step -->
            <div v-if="attendanceStep === 'time_out'" class="q-mb-md">
              <q-card flat bordered>
                <q-card-section>
                  <div class="row items-center">
                    <q-avatar size="48px" color="primary" text-color="white" class="q-mr-md">
                      {{ getSelectedEmployeeName().charAt(0) }}
                    </q-avatar>
                    <div>
                      <div class="text-subtitle1 text-weight-medium">
                        {{ getSelectedEmployeeName() }}
                      </div>
                      <div class="text-caption text-grey-7">
                        Clocked in at: {{ newRecord.time_in }}
                      </div>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <!-- Date Input - Only show in Time In step -->
            <q-input
              v-if="attendanceStep === 'time_in'"
              filled
              v-model="newRecord.date"
              label="Date *"
              type="date"
              class="form-field"
              :rules="[(val) => !!val || 'Date is required']"
            >
              <template v-slot:prepend>
                <q-icon name="event" />
              </template>
            </q-input>

            <!-- Schedule Calendar Section - Only show in Time In step -->
            <div
              v-if="attendanceStep === 'time_in' && newRecord.employee && newRecord.date"
              class="schedule-section q-mt-md"
            >
              <div class="text-subtitle2 q-mb-sm">
                <q-icon name="schedule" class="q-mr-xs" />
                Employee Schedule
              </div>

              <q-card flat bordered>
                <q-card-section>
                  <!-- Loading State -->
                  <div v-if="loadingSchedule" class="text-center q-pa-md">
                    <q-spinner color="primary" size="40px" />
                    <div class="q-mt-sm text-grey-7">Loading schedule...</div>
                  </div>

                  <!-- Error State -->
                  <div v-else-if="scheduleError" class="text-center q-pa-md">
                    <q-icon name="error_outline" color="negative" size="40px" />
                    <div class="q-mt-sm text-negative">{{ scheduleError }}</div>
                  </div>

                  <!-- Schedule Found -->
                  <div v-else-if="employeeSchedule">
                    <div class="schedule-info">
                      <div class="schedule-item">
                        <q-icon name="person" color="primary" class="q-mr-sm" />
                        <span class="text-weight-medium">Employee:</span>
                        <span class="q-ml-sm">{{ employeeSchedule.employee_name }}</span>
                      </div>
                      <div class="schedule-item q-mt-sm">
                        <q-icon name="work" color="primary" class="q-mr-sm" />
                        <span class="text-weight-medium">Position:</span>
                        <span class="q-ml-sm">{{ employeeSchedule.position }}</span>
                      </div>
                      <div class="schedule-item q-mt-sm">
                        <q-icon name="location_on" color="primary" class="q-mr-sm" />
                        <span class="text-weight-medium">Site:</span>
                        <span class="q-ml-sm">{{ employeeSchedule.site }}</span>
                      </div>
                      <div class="schedule-item q-mt-sm">
                        <q-icon name="event" color="primary" class="q-mr-sm" />
                        <span class="text-weight-medium">Date:</span>
                        <span class="q-ml-sm">{{ formatDate(employeeSchedule.date) }}</span>
                      </div>
                      <div class="schedule-item q-mt-sm">
                        <q-icon name="schedule" color="primary" class="q-mr-sm" />
                        <span class="text-weight-medium">Shift:</span>
                        <span class="q-ml-sm"
                          >{{ employeeSchedule.shift_start }} -
                          {{ employeeSchedule.shift_end }}</span
                        >
                      </div>
                      <div class="schedule-item q-mt-sm">
                        <q-icon name="info" color="primary" class="q-mr-sm" />
                        <span class="text-weight-medium">Status:</span>
                        <q-badge :color="getStatusColor(employeeSchedule.status)" class="q-ml-sm">
                          {{ employeeSchedule.status }}
                        </q-badge>
                      </div>
                    </div>
                  </div>

                  <!-- No Schedule Found -->
                  <div v-else class="text-center q-pa-md text-grey-7">
                    <q-icon name="event_busy" size="40px" />
                    <div class="q-mt-sm">No schedule found for this date</div>
                    <div class="text-caption q-mt-xs">You can still create attendance manually</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <!-- Time In Input - Only show in Time In step -->
            <q-input
              v-if="attendanceStep === 'time_in'"
              filled
              v-model="newRecord.time_in"
              label="Time In *"
              type="time"
              class="form-field q-mt-md"
              :rules="[(val) => !!val || 'Time In is required']"
            >
              <template v-slot:prepend>
                <q-icon name="login" />
              </template>
            </q-input>

            <!-- Time Out Input - Only show in Time Out step -->
            <q-input
              v-if="attendanceStep === 'time_out'"
              filled
              v-model="newRecord.time_out"
              label="Time Out *"
              type="time"
              class="form-field"
              :rules="[(val) => !!val || 'Time Out is required']"
            >
              <template v-slot:prepend>
                <q-icon name="logout" />
              </template>
            </q-input>

            <!-- Working Hours Display - Show in Time Out step -->
            <div
              v-if="attendanceStep === 'time_out' && newRecord.time_in && newRecord.time_out"
              class="q-mt-md"
            >
              <q-card flat bordered class="bg-blue-1">
                <q-card-section>
                  <div class="text-center">
                    <div class="text-caption text-grey-7">Total Working Hours</div>
                    <div class="text-h4 text-primary text-weight-bold q-mt-xs">
                      {{ calculateWorkingHours() }}
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="closeAddDialog" />
          <q-btn
            v-if="attendanceStep === 'time_in'"
            color="primary"
            label="Clock In"
            icon="login"
            @click="handleAttendanceSubmit"
            :loading="creating"
            :disable="!newRecord.employee || !newRecord.date || !newRecord.time_in"
          />
          <q-btn
            v-if="attendanceStep === 'time_out'"
            color="positive"
            label="Clock Out & Complete"
            icon="check"
            @click="handleAttendanceSubmit"
            :loading="creating"
            :disable="!newRecord.time_out"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Edit Attendance Dialog -->
    <q-dialog v-model="showEditDialog" persistent>
      <q-card class="edit-dialog-card">
        <q-card-section>
          <div class="dialog-title">Edit Attendance</div>
        </q-card-section>

        <q-card-section class="q-pt-none" v-if="editingRecord">
          <q-form @submit.prevent="updateAttendance" class="edit-form">
            <q-input
              filled
              v-model="editingRecord.date"
              label="Date"
              type="date"
              class="form-field"
            />

            <div class="time-inputs">
              <q-input
                filled
                v-model="editingRecord.time_in"
                label="Time In"
                type="time"
                class="form-field"
              />

              <q-input
                filled
                v-model="editingRecord.time_out"
                label="Time Out"
                type="time"
                class="form-field"
              />
            </div>
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="showEditDialog = false" class="dialog-btn" />
          <q-btn
            color="primary"
            label="Update"
            @click="updateAttendance"
            :loading="updating"
            class="dialog-btn primary-btn"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'

const $q = useQuasar()

// Reactive data
const attendanceData = ref([])
const employees = ref([])
const loading = ref(false)
const filtersLoading = ref(false)
const selected = ref([])
const selectAll = ref(false)

// Dialog states
const showDatePicker = ref(false)
const showEditDialog = ref(false)
const showAddDialog = ref(false)
const showSelfieDialog = ref(false)
const selectedSelfie = ref('')
const selfieDialogTitle = ref('')

// Loading states
const updating = ref(false)
const creating = ref(false)

// State for schedule data
const employeeSchedule = ref(null)
const loadingSchedule = ref(false)
const scheduleError = ref(null)

const attendanceStep = ref('time_in')
const currentAttendanceId = ref(null)

const pagination = ref({
  page: 1,
  rowsPerPage: 25,
  rowsNumber: 0,
})

const filters = ref({
  date_from: '',
  date_to: '',
  source: '',
  employee: '',
  business_owner: '',
})

// Date range handling
const dateRange = ref('')
const tempDateRange = ref({
  from: '',
  to: '',
})

// Edit form
const editingRecord = ref(null)

// Add form
const newRecord = ref({
  employee: '',
  site_id: '',
  date: '',
  time_in: '',
  time_out: '',
  source: 'admin',
})

// Filter options
const employeeOptions = ref([])
const businessOwnerOptions = ref([])
const siteOptions = ref([])
const sourceOptions = ref([
  { label: 'QR Scan', value: 'qr_scan' },
  { label: 'Manual Entry', value: 'admin' },
  { label: 'Auto Login', value: 'auto_login' },
])

// Get company ID
const getCompanyId = () => {
  const possibleKeys = ['selectCompany', 'selectedCompany', 'company_id', 'companyId']

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key)
    if (value) {
      console.log(`✅ Found company ID in localStorage.${key}:`, value)
      return value
    }
  }

  console.warn('⚠️ No company ID found in localStorage')
  return null
}

const companyId = ref(getCompanyId())

// Computed
const stats = computed(() => {
  const data = attendanceData.value
  const total = data.length
  const qrScans = data.filter((item) => item.source === 'qr_scan').length
  const manual = data.filter((item) => item.source === 'manual').length

  return [
    { label: 'Total Records', count: total },
    { label: 'QR Scans', count: qrScans },
    { label: 'Manual Entry', count: manual },
  ]
})

const totalPages = computed(() => {
  return Math.ceil(pagination.value.rowsNumber / pagination.value.rowsPerPage) || 1
})

const isAdmin = ref(false)
const userData = JSON.parse(localStorage.getItem('user') || '{}')
if (userData.role === 'admin') {
  isAdmin.value = true
}

// ================= TABLE COLUMNS =================
const columns = [
  { name: 'id', label: 'ID', align: 'left', field: 'id', sortable: true },
  { name: 'employee', label: 'Employee', align: 'left', field: 'employee', sortable: true },
  { name: 'date', label: 'Date', align: 'center', field: 'date', sortable: true },
  { name: 'time_in', label: 'Time In', align: 'center', field: 'time_in', sortable: true },
  {
    name: 'time_in_selfie',
    label: 'Time In Photo',
    align: 'center',
    field: 'time_in_selfie',
    sortable: false,
  },
  { name: 'time_out', label: 'Time Out', align: 'center', field: 'time_out', sortable: true },
  {
    name: 'time_out_selfie',
    label: 'Time Out Photo',
    align: 'center',
    field: 'time_out_selfie',
    sortable: false,
  },
  { name: 'source', label: 'Source', align: 'center', field: 'source', sortable: true },
  { name: 'action', label: 'Actions', align: 'center', field: 'action', sortable: false },
]

// ================= SELFIE VIEWER FUNCTION =================
function viewSelfie(imageUrl, title) {
  selectedSelfie.value = imageUrl
  selfieDialogTitle.value = `${title} Selfie`
  showSelfieDialog.value = true
}

// ================= SCHEDULE MANAGEMENT SECTION =================
async function fetchEmployeeSchedule(employeeId, date) {
  if (!companyId.value || !employeeId || !date) {
    console.warn('⚠️ Missing required params for schedule fetch:', {
      companyId: companyId.value,
      employeeId,
      date,
    })
    return
  }

  loadingSchedule.value = true
  scheduleError.value = null
  employeeSchedule.value = null

  try {
    console.log('🔍 Fetching schedule for:', { companyId: companyId.value, date })

    const response = await api.get(`/organization/scheduled/${companyId.value}/${date}/`)

    console.log('✅ Schedule API Response:', response.data)

    let schedules = []
    if (Array.isArray(response.data)) {
      schedules = response.data
    } else if (response.data.data && Array.isArray(response.data.data)) {
      schedules = response.data.data
    } else if (response.data.schedules && Array.isArray(response.data.schedules)) {
      schedules = response.data.schedules
    }

    const employeeScheduleData = schedules.find((schedule) => schedule.employee_id === employeeId)

    if (employeeScheduleData) {
      employeeSchedule.value = {
        employee_id: employeeScheduleData.employee_id,
        employee_name: employeeScheduleData.employee_name,
        position: employeeScheduleData.position_name,
        site: employeeScheduleData.site_name,
        date: employeeScheduleData.schedule_date,
        shift_start: formatScheduleTime(employeeScheduleData.start_time),
        shift_end: formatScheduleTime(employeeScheduleData.end_time),
        status: employeeScheduleData.status,
      }
      console.log('✅ Employee schedule found:', employeeSchedule.value)
    } else {
      console.log('ℹ️ No schedule found for employee:', employeeId)
      employeeSchedule.value = null
    }
  } catch (error) {
    console.error('❌ Error fetching employee schedule:', error)
    scheduleError.value =
      error.response?.data?.message || error.response?.data?.detail || 'Failed to load schedule'
    employeeSchedule.value = null
  } finally {
    loadingSchedule.value = false
  }
}

function onEmployeeSelected(employeeId) {
  console.log('👤 Employee selected:', employeeId)
  employeeSchedule.value = null
  scheduleError.value = null

  if (employeeId && newRecord.value.date) {
    fetchEmployeeSchedule(employeeId, newRecord.value.date)
  }
}

function formatScheduleTime(timeString) {
  if (!timeString) return '-'
  try {
    const date = new Date(timeString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return timeString
  }
}

function formatDate(dateString) {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

function getStatusColor(status) {
  const statusColors = {
    active: 'positive',
    completed: 'info',
    cancelled: 'negative',
    pending: 'warning',
  }
  return statusColors[status?.toLowerCase()] || 'grey'
}

function getSelectedEmployeeName() {
  const employee = employees.value.find(
    (emp) => emp.id === newRecord.value.employee || emp.uuid === newRecord.value.employee,
  )
  return employee ? getEmployeeName(employee) : 'Unknown Employee'
}

function calculateWorkingHours() {
  if (!newRecord.value.time_in || !newRecord.value.time_out) return '0h 0m'

  const [inHours, inMinutes] = newRecord.value.time_in.split(':').map(Number)
  const [outHours, outMinutes] = newRecord.value.time_out.split(':').map(Number)

  const inDate = new Date(0, 0, 0, inHours, inMinutes)
  const outDate = new Date(0, 0, 0, outHours, outMinutes)

  let diff = (outDate - inDate) / 1000 / 60 // difference in minutes

  if (diff < 0) {
    diff += 24 * 60 // handle overnight shift
  }

  const hours = Math.floor(diff / 60)
  const minutes = Math.floor(diff % 60)

  return `${hours}h ${minutes}m`
}

// ================= API FUNCTIONS =================
async function fetchAttendanceData(params = {}) {
  if (!companyId.value) {
    showErrorNotification('Company ID not found. Please log in again.')
    return
  }

  loading.value = true
  try {
    const response = await api.get(
      `https://staging.wageyapp.com/attendance/company/${companyId.value}/`,
      {
        params: {
          page: pagination.value.page,
          limit: pagination.value.rowsPerPage,
          ...filters.value,
          ...params,
        },
      },
    )

    const data = Array.isArray(response.data) ? response.data : response.data.data

    attendanceData.value = (data || []).map((record) => {
      if (record.employee && typeof record.employee === 'object') {
        return record
      }

      const employeeId = record.employee || record.employee_id || record.site_id || record.user_id

      if (employeeId) {
        const employeeDetails = employees.value.find(
          (emp) =>
            emp.id === employeeId ||
            emp.id === String(employeeId) ||
            String(emp.id) === String(employeeId),
        )

        if (employeeDetails) {
          return {
            ...record,
            employee: employeeDetails,
          }
        }
      }

      return record
    })

    pagination.value.rowsNumber =
      response.data.total || response.data.meta?.total || attendanceData.value.length

    return response.data
  } catch (error) {
    console.error('Error fetching attendance data:', error)
    showErrorNotification('Failed to load attendance data')
    attendanceData.value = []
  } finally {
    loading.value = false
  }
}

async function fetchSites() {
  if (!companyId.value) {
    console.error('❌ Company ID is missing:', companyId.value)
    showErrorNotification('Company ID not found. Please log in again.')
    return
  }

  console.log('🔍 Fetching sites for company:', companyId.value)

  try {
    const response = await api.get(`/organization/sites/${companyId.value}/`)
    console.log('✅ Sites API Response:', response.data)

    let data = []
    if (Array.isArray(response.data)) {
      data = response.data
    } else if (response.data.data) {
      data = Array.isArray(response.data.data) ? response.data.data : [response.data.data]
    } else if (response.data.results) {
      data = Array.isArray(response.data.results) ? response.data.results : [response.data.results]
    } else if (response.data.sites) {
      data = Array.isArray(response.data.sites) ? response.data.sites : [response.data.sites]
    } else if (response.data.id || response.data.name) {
      data = [response.data]
    }

    console.log('📊 Processed sites data:', data)

    siteOptions.value = data.map((site) => ({
      label: site.name || site.site_name || site.title || `Site ${site.id}`,
      value: site.id || site.site_id,
      site: site,
    }))

    console.log('✅ Site options ready:', siteOptions.value)

    if (siteOptions.value.length === 0) {
      console.warn('⚠️ No sites found for this company')
      showErrorNotification('No sites found. Please add sites first.')
    }
  } catch (error) {
    console.error('❌ Error fetching sites:', error)
    console.error('Error details:', error.response?.data)
    showErrorNotification(
      error.response?.data?.message || error.response?.data?.detail || 'Failed to load sites',
    )
    siteOptions.value = []
  }
}

async function fetchEmployeeDetails() {
  if (!companyId.value) {
    console.error('❌ Company ID is missing:', companyId.value)
    showErrorNotification('Company ID not found. Please log in again.')
    return
  }

  console.log('🔍 Fetching employees for company:', companyId.value)
  filtersLoading.value = true

  try {
    const response = await api.get(`/user/companies/${companyId.value}/employees/`)
    console.log('✅ Employees API Response:', response.data)

    let data = []
    if (Array.isArray(response.data)) {
      data = response.data
    } else if (response.data.data) {
      data = Array.isArray(response.data.data) ? response.data.data : []
    } else if (response.data.results) {
      data = Array.isArray(response.data.results) ? response.data.results : []
    } else if (response.data.employees) {
      data = Array.isArray(response.data.employees) ? response.data.employees : []
    }

    console.log('📊 Processed employees data:', data)
    employees.value = data

    employeeOptions.value = employees.value
      .map((emp) => {
        const name = getEmployeeName(emp)
        return {
          label: name || 'Unknown Employee',
          value: emp.uuid || emp.id,
          employee: emp,
        }
      })
      .filter((opt) => opt.label !== 'Unknown Employee')

    console.log('✅ Employee options ready:', employeeOptions.value)

    if (employeeOptions.value.length === 0) {
      console.warn('⚠️ No employees found for this company')
      showErrorNotification('No employees found. Please add employees first.')
    }
  } catch (error) {
    console.error('❌ Error fetching employees:', error)
    console.error('Error details:', error.response?.data)
    showErrorNotification(
      error.response?.data?.message || error.response?.data?.detail || 'Failed to load employees',
    )
    employees.value = []
    employeeOptions.value = []
  } finally {
    filtersLoading.value = false
  }
}

async function handleAttendanceSubmit() {
  if (attendanceStep.value === 'time_in') {
    await submitTimeIn()
  } else if (attendanceStep.value === 'time_out') {
    await submitTimeOut()
  }
}

async function submitTimeIn() {
  if (!companyId.value) {
    showErrorNotification('Company ID not found. Please log in again.')
    return
  }
  if (!newRecord.value.employee) {
    showErrorNotification('Please select an employee')
    return
  }

  if (newRecord.value.date && !employeeSchedule.value && !loadingSchedule.value) {
    try {
      await $q.dialog({
        title: 'No Schedule Found',
        message:
          'This employee does not have a schedule for the selected date. Do you want to proceed anyway?',
        cancel: true,
        persistent: true,
      })
    } catch {
      return
    }
  }

  creating.value = true

  try {
    const selectedEmployee = employees.value.find(
      (emp) => emp.id === newRecord.value.employee || emp.uuid === newRecord.value.employee,
    )

    if (!selectedEmployee) {
      showErrorNotification('Employee not found.')
      creating.value = false
      return
    }

    const employeeUUID = selectedEmployee.uuid || selectedEmployee.id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (!employeeUUID || !uuidRegex.test(employeeUUID)) {
      showErrorNotification('Invalid employee ID format.')
      creating.value = false
      return
    }

    const now = new Date()
    const timeInTimestamp = now.toISOString()

    newRecord.value.date = now.toISOString().split('T')[0]
    newRecord.value.time_in = now.toTimeString().slice(0, 8)
    newRecord.value.timeInTimestamp = timeInTimestamp

    const attendanceData = {
      source: 'admin',
      employee_id: employeeUUID,
      timestamp: timeInTimestamp,
    }

    console.log('📤 Sending Time In data:', attendanceData)

    const response = await api.post(`/attendance/log/${companyId.value}/`, attendanceData)

    console.log('✅ Time In recorded:', response.data)

    if (response.data?.id) {
      currentAttendanceId.value = response.data.id
    }

    showSuccessNotification(`Time In recorded at ${newRecord.value.time_in}`)

    attendanceStep.value = 'time_out'

    fetchAttendanceData()
  } catch (error) {
    console.error('❌ Error recording Time In:', error)
    let errorMessage = 'Failed to record Time In'

    if (error.response?.data) {
      const data = error.response.data
      if (typeof data === 'string') {
        errorMessage = data
      } else if (data.reason) {
        errorMessage = data.reason
      } else if (data.detail) {
        errorMessage = data.detail
      } else if (data.message) {
        errorMessage = data.message
      }
    }

    showErrorNotification(errorMessage)
  } finally {
    creating.value = false
  }
}

async function submitTimeOut() {
  if (!newRecord.value.time_out) {
    showErrorNotification('Please select time out')
    return
  }

  creating.value = true

  try {
    const selectedEmployee = employees.value.find(
      (emp) => emp.id === newRecord.value.employee || emp.uuid === newRecord.value.employee,
    )

    if (!selectedEmployee) {
      showErrorNotification('Employee not found.')
      creating.value = false
      return
    }

    const employeeUUID = selectedEmployee.uuid || selectedEmployee.id

    const timeOutDate = new Date(`${newRecord.value.date}T${newRecord.value.time_out}:00`)
    const timeOutTimestamp = timeOutDate.toISOString()

    const attendanceData = {
      source: 'admin',
      employee_id: employeeUUID,
      timestamp: timeOutTimestamp,
    }

    console.log('📤 Sending Time Out data:', attendanceData)

    await api.post(`/attendance/log/${companyId.value}/`, attendanceData)

    showSuccessNotification(`Attendance completed! Total hours: ${calculateWorkingHours()}`)

    closeAddDialog()
    await fetchAttendanceData()
  } catch (error) {
    console.error('❌ Error recording Time Out:', error)
    let errorMessage = 'Failed to record Time Out'

    if (error.response?.data) {
      const data = error.response.data
      if (typeof data === 'string') {
        errorMessage = data
      } else if (data.reason) {
        errorMessage = data.reason
      } else if (data.detail) {
        errorMessage = data.detail
      } else if (data.message) {
        errorMessage = data.message
      }
    }

    showErrorNotification(errorMessage)
  } finally {
    creating.value = false
  }
}

async function updateAttendance() {
  if (!editingRecord.value) return
  if (!companyId.value) {
    showErrorNotification('Company ID not found. Please log in again.')
    return
  }

  updating.value = true

  try {
    const selectedEmployee = employees.value.find(
      (emp) =>
        emp.id === editingRecord.value.employee ||
        emp.uuid === editingRecord.value.employee ||
        (typeof editingRecord.value.employee === 'object' &&
          (emp.id === editingRecord.value.employee.id ||
            emp.uuid === editingRecord.value.employee.uuid)),
    )

    if (!selectedEmployee) {
      showErrorNotification('Employee not found.')
      updating.value = false
      return
    }

    let timeInTimestamp = null
    let timeOutTimestamp = null

    if (editingRecord.value.time_in) {
      const timeInDate = new Date(`${editingRecord.value.date}T${editingRecord.value.time_in}:00`)
      timeInTimestamp = timeInDate.toISOString()
    }

    if (editingRecord.value.time_out) {
      const timeOutDate = new Date(`${editingRecord.value.date}T${editingRecord.value.time_out}:00`)
      timeOutTimestamp = timeOutDate.toISOString()
    }

    const attendanceData = {
      time_in: timeInTimestamp,
      time_out: timeOutTimestamp,
      source: editingRecord.value.source || 'admin',
    }

    console.log('📤 Sending Update data:', attendanceData)
    console.log(
      '🔗 Update URL:',
      `/attendance/log-update/${companyId.value}/${editingRecord.value.id}/`,
    )

    // Try the exact endpoint from your API docs
    const response = await api.put(
      `/attendance/log-update/${companyId.value}/${editingRecord.value.id}/`,
      attendanceData,
    )

    console.log('✅ Attendance updated:', response.data)

    showSuccessNotification('Attendance updated successfully')
    showEditDialog.value = false
    await fetchAttendanceData()
  } catch (error) {
    console.error('❌ Error updating attendance:', error)
    console.error(
      '📍 Failed endpoint:',
      `/attendance/log-update/${companyId.value}/${editingRecord.value.id}/`,
    )
    console.error('📊 Error response:', error.response)

    let errorMessage = 'Failed to update attendance'

    // Check if it's a 404 error
    if (error.response?.status === 404) {
      errorMessage = 'Update endpoint not found. Please check the API documentation.'
      console.error('💡 Suggestion: Verify the correct endpoint path with your backend team')
    } else if (error.response?.data) {
      const data = error.response.data
      if (typeof data === 'string') {
        errorMessage = data
      } else if (data.detail) {
        errorMessage = data.detail
      } else if (data.message) {
        errorMessage = data.message
      }
    }

    showErrorNotification(errorMessage)
  } finally {
    updating.value = false
  }
}

async function batchDelete(records) {
  try {
    const ids = records.map((r) => r.id)
    await api.post(`/attendance/batch-delete/`, { ids })

    showSuccessNotification(`${records.length} records deleted successfully`)
    selected.value = []
    await fetchAttendanceData()
  } catch (error) {
    console.error('Error batch deleting:', error)
    showErrorNotification('Failed to delete records')
  }
}

// ================= DIALOG HANDLERS =================
function openAddDialog() {
  attendanceStep.value = 'time_in'
  currentAttendanceId.value = null

  newRecord.value = {
    employee: '',
    site_id: '',
    date: new Date().toISOString().split('T')[0],
    time_in: new Date().toTimeString().slice(0, 5),
    time_out: '',
    source: 'admin',
  }

  employeeSchedule.value = null
  scheduleError.value = null
  loadingSchedule.value = false

  showAddDialog.value = true
}

function closeAddDialog() {
  showAddDialog.value = false

  attendanceStep.value = 'time_in'
  currentAttendanceId.value = null

  newRecord.value = {
    employee: '',
    site_id: '',
    date: '',
    time_in: '',
    time_out: '',
    source: 'admin',
  }

  employeeSchedule.value = null
  scheduleError.value = null
  loadingSchedule.value = false
}

function editAttendance(record) {
  editingRecord.value = {
    ...record,
    employee: record.employee?.id || record.employee?.uuid || record.employee,
  }

  if (editingRecord.value.time_in) {
    editingRecord.value.time_in = formatTimeForInput(editingRecord.value.time_in)
  }

  if (editingRecord.value.time_out) {
    editingRecord.value.time_out = formatTimeForInput(editingRecord.value.time_out)
  }

  console.log('✏️ Editing record:', editingRecord.value)

  showEditDialog.value = true
}

function confirmBatchDelete() {
  $q.dialog({
    title: 'Confirm Batch Delete',
    message: `Are you sure you want to delete ${selected.value.length} selected records?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    batchDelete(selected.value)
  })
}

function viewDetails(record) {
  $q.dialog({
    title: 'Attendance Details',
    message: `
      Employee: ${getEmployeeName(record.employee)}
      Date: ${record.date}
      Time In: ${formatTime(record.time_in)}
      Time Out: ${formatTime(record.time_out)}
      Source: ${record.source?.replace('_', ' ').toUpperCase()}
      Created: ${formatDateTime(record.created_at)}
    `,
    html: true,
  })
}

// ================= FILTERS =================
function clearAllFilters() {
  filters.value = {
    date_from: '',
    date_to: '',
    source: '',
    employee: '',
    business_owner: '',
  }
  dateRange.value = ''
  pagination.value.page = 1
  selected.value = []
  selectAll.value = false
}

function applyDateRange() {
  if (tempDateRange.value.from && tempDateRange.value.to) {
    filters.value.date_from = tempDateRange.value.from
    filters.value.date_to = tempDateRange.value.to
    dateRange.value = `${tempDateRange.value.from} - ${tempDateRange.value.to}`
  }
  showDatePicker.value = false
}

function clearDateRange() {
  tempDateRange.value = { from: '', to: '' }
  filters.value.date_from = ''
  filters.value.date_to = ''
  dateRange.value = ''
}

function filterEmployees(val, update) {
  if (val === '') {
    update(() => {
      if (!isAdmin.value && newRecord.value.site_id) {
        employeeOptions.value = employees.value
          .filter((emp) => {
            const empSiteId = emp.site_id || emp.siteId || emp.site
            return empSiteId && Number(empSiteId) === Number(newRecord.value.site_id)
          })
          .map((emp) => ({
            label: getEmployeeName(emp),
            value: emp.id || emp.uuid,
            employee: emp,
          }))
      } else {
        employeeOptions.value = employees.value.map((emp) => ({
          label: getEmployeeName(emp),
          value: emp.id || emp.uuid,
          employee: emp,
        }))
      }
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    const baseEmployees =
      !isAdmin.value && newRecord.value.site_id
        ? employees.value.filter((emp) => {
            const empSiteId = emp.site_id || emp.siteId || emp.site
            return empSiteId && Number(empSiteId) === Number(newRecord.value.site_id)
          })
        : employees.value

    employeeOptions.value = baseEmployees
      .map((emp) => ({
        label: getEmployeeName(emp),
        value: emp.id || emp.uuid,
        employee: emp,
      }))
      .filter((emp) => emp.label.toLowerCase().indexOf(needle) > -1)
  })
}

// ================= TABLE FUNCTIONS =================
function toggleSelectAll(val) {
  if (val) {
    selected.value = [...attendanceData.value]
  } else {
    selected.value = []
  }
}

function previousPage() {
  if (pagination.value.page > 1) {
    pagination.value.page--
    fetchAttendanceData()
  }
}

function nextPage() {
  if (pagination.value.page < totalPages.value) {
    pagination.value.page++
    fetchAttendanceData()
  }
}

// ================= EXPORT FUNCTIONS =================
async function exportSelected() {
  if (selected.value.length === 0) return

  try {
    const response = await api.post('/attendance/export/', {
      ids: selected.value.map((r) => r.id),
      format: 'csv',
    })

    downloadFile(response.data, 'selected_attendance.csv')
    showSuccessNotification('Export completed')
  } catch {
    showErrorNotification('Export failed')
  }
}

async function exportAll() {
  try {
    const response = await api.get('/attendance/export/', {
      params: { ...filters.value, format: 'csv' },
    })

    downloadFile(response.data, 'all_attendance.csv')
    showSuccessNotification('Export completed')
  } catch {
    showErrorNotification('Export failed')
  }
}

function downloadFile(data, filename) {
  const blob = new Blob([data], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

// ================= HELPERS =================
function getEmployeeName(employee) {
  if (!employee) return 'Unknown Employee'

  if (typeof employee === 'number' || typeof employee === 'string') {
    const foundEmployee = employees.value.find(
      (emp) => emp.id === employee || emp.id === parseInt(employee),
    )
    if (foundEmployee) {
      const firstName = foundEmployee.first_name || foundEmployee.firstName || ''
      const lastName = foundEmployee.last_name || foundEmployee.lastName || ''
      const fullName = `${firstName} ${lastName}`.trim()
      return (
        fullName ||
        foundEmployee.name ||
        foundEmployee.username ||
        foundEmployee.email ||
        'Unknown Employee'
      )
    }
    return `Employee #${employee}`
  }

  if (typeof employee === 'object') {
    const firstName = employee.first_name || employee.firstName || employee.firstname || ''
    const lastName = employee.last_name || employee.lastName || employee.lastname || ''
    const fullName = `${firstName} ${lastName}`.trim()

    return (
      fullName ||
      employee.name ||
      employee.fullName ||
      employee.full_name ||
      employee.username ||
      employee.email ||
      'Unknown Employee'
    )
  }

  return 'Unknown Employee'
}

function getSourceClass(source) {
  switch (source) {
    case 'qr_scan':
      return 'source-qr'
    case 'manual':
      return 'source-manual'
    case 'auto_login':
      return 'source-auto'
    default:
      return 'source-default'
  }
}

function formatSource(source) {
  if (!source) return '-'
  return source.replace('_', ' ').toUpperCase()
}

function formatTime(dateTimeString) {
  if (!dateTimeString) return '-'
  try {
    const date = new Date(dateTimeString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return '-'
  }
}

function formatTimeForInput(dateTimeString) {
  if (!dateTimeString) return ''
  try {
    const date = new Date(dateTimeString)
    return date.toTimeString().slice(0, 5)
  } catch {
    return ''
  }
}

function formatDateTime(dateTimeString) {
  if (!dateTimeString) return '-'
  try {
    const date = new Date(dateTimeString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return '-'
  }
}

// ================= NOTIFICATIONS =================
function showSuccessNotification(message) {
  $q.notify({
    type: 'positive',
    message,
    position: 'top',
    timeout: 3000,
  })
}

function showErrorNotification(message) {
  $q.notify({
    type: 'negative',
    message,
    position: 'top',
    timeout: 5000,
  })
}

// ================= WATCHERS =================
watch(
  filters,
  () => {
    pagination.value.page = 1
    fetchAttendanceData()
  },
  { deep: true },
)

watch(
  () => newRecord.value.date,
  (newDate) => {
    console.log('📅 Date changed:', newDate)
    employeeSchedule.value = null
    scheduleError.value = null

    if (newRecord.value.employee && newDate) {
      fetchEmployeeSchedule(newRecord.value.employee, newDate)
    }
  },
)

// ================= LIFECYCLE =================
onMounted(async () => {
  console.log('🚀 Component mounted, initializing...')
  console.log('📋 Company ID:', companyId.value)
  console.log('👤 Is Admin:', isAdmin.value)
  console.log('👤 User Data:', userData)

  try {
    if (!isAdmin.value) {
      console.log('🏢 Fetching sites (non-admin user)...')
      await fetchSites()
    } else {
      console.log('👑 Admin user - skipping site fetch')
    }

    console.log('👥 Fetching employees...')
    await fetchEmployeeDetails()

    console.log('📊 Fetching attendance data...')
    await fetchAttendanceData()

    console.log('✅ All data loaded successfully')
  } catch (error) {
    console.error('❌ Error during initialization:', error)
  }
})
</script>

<style scoped>
.attendance-dashboard {
  background: #f8fafc;
  min-height: 100vh;
  padding: 0;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
}

/* Header Section */
.page-header {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 4px 0;
}

.page-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-btn {
  color: #64748b;
  width: 36px;
  height: 36px;
}

.export-btn {
  background: #6366f1;
  border-radius: 8px;
  font-weight: 500;
  padding: 6px 14px;
  height: 36px;
  font-size: 13px;
}

/* Stats Section */
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stats-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s ease;
  min-width: 0;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.personal-card {
  background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%);
}

.corporate-card {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.business-card {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
}

.custom-card {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
}

.stats-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.stats-icon {
  font-size: 24px;
  color: #374151;
}

.stats-content {
  flex: 1;
  min-width: 0;
}

.stats-amount {
  font-size: 26px;
  font-weight: 700;
  color: #1a202c;
  line-height: 1;
  margin-bottom: 4px;
}

.stats-label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 2px;
}

.stats-sublabel {
  font-size: 12px;
  color: #64748b;
}

/* Filters Section */
.filters-section {
  margin-bottom: 16px;
}

.filters-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.filters-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.clear-btn {
  color: #64748b;
  font-weight: 500;
  font-size: 13px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.filter-input {
  background: #f8fafc;
  border-radius: 8px;
}

.filter-input .q-field__control {
  border-radius: 8px;
  height: 36px;
}

/* Table Section */
.table-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.table-header {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.table-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.table-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.add-attendance-btn {
  background: #10b981;
  font-weight: 600;
  height: 36px;
  font-size: 13px;
}

.add-attendance-btn:hover {
  background: #059669;
}

/* Modern Table */
.modern-table-container {
  border: 2px solid #3b82f6;
  border-radius: 10px;
  overflow: hidden;
  margin: 0 16px 16px 16px;
}

.attendance-table {
  background: white;
  border-radius: 10px;
  overflow: hidden;
}

.table-header-row {
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.table-header-cell {
  padding: 12px 10px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  text-align: left;
  border: none;
  white-space: nowrap;
}

.table-body-row {
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.table-body-row:hover {
  background: #f8fafc;
}

.table-body-cell {
  padding: 12px 10px;
  font-size: 13px;
  color: #374151;
  border: none;
  vertical-align: middle;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.employee-avatar {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-weight: 600;
  width: 32px;
  height: 32px;
  font-size: 14px;
}

.employee-name {
  font-weight: 500;
  color: #1a202c;
  font-size: 13px;
}

.time-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  background: #f1f5f9;
  color: #64748b;
  white-space: nowrap;
}

.time-badge.has-time.time-in {
  background: #dcfce7;
  color: #166534;
}

.time-badge.has-time.time-out {
  background: #fef2f2;
  color: #991b1b;
}

/* Selfie Styles */
.selfie-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.selfie-thumbnail {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  object-fit: cover;
  cursor: pointer;
  border: 2px solid #e2e8f0;
  transition: all 0.2s ease;
}

.selfie-thumbnail:hover {
  transform: scale(1.1);
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.no-photo {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}

.selfie-dialog-card {
  width: 100%;
  max-width: 600px;
  border-radius: 12px;
}

.selfie-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
}

.selfie-dialog-body {
  padding: 16px;
}

.selfie-full-image {
  width: 100%;
  height: auto;
  border-radius: 8px;
  max-height: 70vh;
  object-fit: contain;
}

.close-btn {
  color: #64748b;
}

/* Mobile Selfies */
.mobile-selfies {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.mobile-selfie-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mobile-selfie-label {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
}

.mobile-selfie-img {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  object-fit: cover;
  cursor: pointer;
  border: 2px solid #e2e8f0;
}

.mobile-selfie-img:hover {
  border-color: #3b82f6;
}

.source-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.source-qr {
  background: #f3e8ff;
  color: #7c3aed;
}

.source-manual {
  background: #dbeafe;
  color: #2563eb;
}

.source-auto {
  background: #dcfce7;
  color: #16a34a;
}

.source-default {
  background: #f1f5f9;
  color: #64748b;
}

.actions-cell {
  width: 100px;
  min-width: 100px;
}

.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
  flex-wrap: nowrap;
}

.action-btn {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 6px;
  flex-shrink: 0;
}

.view-btn {
  background: #dbeafe;
  color: #3b82f6;
}

.view-btn:hover {
  background: #bfdbfe;
}

.edit-btn {
  background: #fef3c7;
  color: #d97706;
}

.edit-btn:hover {
  background: #fde68a;
}

.delete-btn {
  background: #fef2f2;
  color: #dc2626;
}

.delete-btn:hover {
  background: #fecaca;
}

/* Table Footer */
.table-footer {
  background: #f8fafc;
  padding: 14px 16px;
  border-top: 2px solid #3b82f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.footer-info {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.total-label {
  font-size: 13px;
  font-weight: 600;
  color: #ef4444;
}

.total-records {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.total-selected {
  font-size: 13px;
  font-weight: 600;
  color: #16a34a;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pagination-btn {
  color: #64748b;
  padding: 4px;
  width: 32px;
  height: 32px;
}

.pagination-btn:hover:not(:disabled) {
  background: #f1f5f9;
}

.page-info {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}

/* Mobile Cards */
.mobile-card {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.mobile-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.mobile-employee {
  font-size: 16px;
  font-weight: 600;
  color: #1a202c;
}

.mobile-date {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
}

.mobile-details {
  font-size: 13px;
  color: #4b5563;
  line-height: 1.4;
}

/* Dialog Styles */
.date-picker-card {
  width: 100%;
  max-width: 700px;
  border-radius: 12px;
}

.edit-dialog-card {
  width: 100%;
  max-width: 500px;
  border-radius: 12px;
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a202c;
}

.date-picker-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.date-picker {
  border-radius: 8px;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.time-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.form-field {
  margin-bottom: 0;
}

.dialog-btn {
  padding: 7px 14px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 13px;
}

.primary-btn {
  background: #3b82f6;
  color: white;
}

/* Schedule Section */
.schedule-section {
  background: #f8fafc;
  padding: 14px;
  border-radius: 8px;
}

.schedule-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.schedule-item {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #374151;
}

/* Loading States */
.q-skeleton {
  animation: skeleton-loading 1.5s infinite ease-in-out;
}

@keyframes skeleton-loading {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

/* Focus States */
.filter-input .q-field--focused .q-field__control {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.dialog-btn:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* ===================================
   RESPONSIVE BREAKPOINTS
   =================================== */

/* 1440px - Large Desktop */
@media (min-width: 1440px) {
  .dashboard-container {
    max-width: 1400px;
    padding: 20px;
  }

  .stats-section {
    gap: 16px;
  }

  .filters-grid {
    gap: 14px;
  }

  .table-header-cell,
  .table-body-cell {
    padding: 14px 12px;
  }

  .action-buttons {
    gap: 5px;
  }

  .action-btn {
    width: 34px;
    height: 34px;
    min-width: 34px;
  }
}

/* 1024px - Desktop / Tablet Landscape */
@media (max-width: 1024px) {
  .dashboard-container {
    padding: 16px;
  }

  .page-header {
    padding: 14px;
  }

  .header-content {
    flex-wrap: wrap;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .stats-card {
    padding: 14px;
  }

  .stats-icon-wrapper {
    width: 44px;
    height: 44px;
  }

  .stats-icon {
    font-size: 22px;
  }

  .stats-amount {
    font-size: 24px;
  }

  .stats-label {
    font-size: 12px;
  }

  .filters-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .table-header {
    flex-wrap: wrap;
    padding: 14px;
  }

  .table-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .modern-table-container {
    margin: 0 14px 14px 14px;
    overflow-x: auto;
  }

  .attendance-table {
    min-width: 900px;
  }

  .table-header-cell,
  .table-body-cell {
    padding: 11px 8px;
    font-size: 12px;
  }

  .actions-cell {
    width: 90px;
    min-width: 90px;
  }

  .action-buttons {
    gap: 3px;
  }

  .action-btn {
    width: 30px;
    height: 30px;
    min-width: 30px;
  }

  .employee-info {
    gap: 8px;
  }

  .employee-name {
    font-size: 12px;
  }

  .selfie-thumbnail {
    width: 32px;
    height: 32px;
  }
}

/* 768px - Tablet Portrait */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 12px;
  }

  .page-header {
    padding: 12px;
    margin-bottom: 12px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .header-actions {
    justify-content: space-between;
  }

  .page-title {
    font-size: 18px;
  }

  .stats-section {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-bottom: 12px;
  }

  .stats-card {
    padding: 12px;
  }

  .stats-icon-wrapper {
    width: 40px;
    height: 40px;
  }

  .stats-icon {
    font-size: 20px;
  }

  .stats-amount {
    font-size: 22px;
  }

  .stats-label {
    font-size: 11px;
  }

  .filters-section {
    margin-bottom: 12px;
  }

  .filters-card {
    padding: 12px;
  }

  .filters-title {
    font-size: 15px;
  }

  .filters-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .table-header {
    flex-direction: column;
    align-items: stretch;
    padding: 12px;
    gap: 12px;
  }

  .table-title {
    font-size: 16px;
  }

  .table-actions {
    width: 100%;
    flex-direction: column;
  }

  .table-actions button {
    width: 100%;
    justify-content: center;
  }

  .modern-table-container {
    margin: 0 10px 10px 10px;
  }

  .table-footer {
    flex-direction: column;
    align-items: stretch;
    padding: 12px;
    gap: 12px;
  }

  .footer-info {
    justify-content: center;
    gap: 12px;
  }

  .pagination-controls {
    justify-content: center;
  }

  .date-picker-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .time-inputs {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .edit-dialog-card,
  .date-picker-card {
    max-width: 95vw;
    margin: 12px;
  }

  .selfie-dialog-card {
    max-width: 95vw;
    margin: 12px;
  }

  .schedule-section {
    padding: 12px;
  }

  .schedule-item {
    font-size: 12px;
  }
}

/* Small Mobile - 480px and below */
@media (max-width: 480px) {
  .dashboard-container {
    padding: 10px;
  }

  .page-header {
    padding: 10px;
    border-radius: 10px;
  }

  .page-title {
    font-size: 16px;
  }

  .header-btn {
    width: 32px;
    height: 32px;
  }

  .export-btn {
    padding: 6px 12px;
    height: 32px;
    font-size: 12px;
  }

  .stats-card {
    padding: 10px;
  }

  .stats-icon-wrapper {
    width: 36px;
    height: 36px;
  }

  .stats-icon {
    font-size: 18px;
  }

  .stats-amount {
    font-size: 20px;
  }

  .stats-label {
    font-size: 10px;
  }

  .filters-card {
    padding: 10px;
  }

  .filters-title {
    font-size: 14px;
  }

  .table-header {
    padding: 10px;
  }

  .table-title {
    font-size: 15px;
  }

  .modern-table-container {
    margin: 0 8px 8px 8px;
  }

  .action-btn {
    width: 28px;
    height: 28px;
    min-width: 28px;
  }

  .selfie-thumbnail {
    width: 28px;
    height: 28px;
  }

  .dialog-title {
    font-size: 16px;
  }

  .pagination-btn {
    width: 28px;
    height: 28px;
  }
}
</style>
