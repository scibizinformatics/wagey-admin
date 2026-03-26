<template>
  <q-page class="attendance-dashboard">
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Attendance</h1>
          <div class="header-actions">
            <q-btn
              unelevated
              color="primary"
              icon="add"
              label="Add Attendance"
              class="add-attendance-btn"
              no-caps
              @click="openAddDialog"
            />
            <q-input
              v-model="employeeSearch"
              placeholder="Search by employee name..."
              class="header-search"
              dense
              outlined
              clearable
            >
              <template v-slot:prepend>
                <q-icon name="search" class="search-icon" />
              </template>
            </q-input>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-section">
        <div class="stats-card total-card">
          <div class="stats-icon-wrapper">
            <q-icon name="people" class="stats-icon" />
          </div>
          <div class="stats-content">
            <q-skeleton v-if="loading" type="text" class="text-h5" />
            <div v-else class="stats-amount">{{ stats[0].count }}</div>
            <div class="stats-label">Total Records</div>
          </div>
        </div>

        <div class="stats-card pending-card">
          <div class="stats-icon-wrapper">
            <q-icon name="phone_android" class="stats-icon" />
          </div>
          <div class="stats-content">
            <q-skeleton v-if="loading" type="text" class="text-h5" />
            <div v-else class="stats-amount">{{ stats[1].count }}</div>
            <div class="stats-label">App</div>
          </div>
        </div>

        <div class="stats-card approved-card">
          <div class="stats-icon-wrapper">
            <q-icon name="computer" class="stats-icon" />
          </div>
          <div class="stats-content">
            <q-skeleton v-if="loading" type="text" class="text-h5" />
            <div v-else class="stats-amount">{{ stats[2].count }}</div>
            <div class="stats-label">Terminal</div>
          </div>
        </div>

        <div class="stats-card scheduled-card">
          <div class="stats-icon-wrapper">
            <q-icon name="schedule" class="stats-icon" />
          </div>
          <div class="stats-content">
            <q-skeleton v-if="loading" type="text" class="text-h5" />
            <div v-else class="stats-amount">{{ stats[3].count }}</div>
            <div class="stats-label">System</div>
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
            <!-- Date Navigation -->
            <div class="date-nav-wrapper">
              <q-btn
                flat
                round
                dense
                icon="chevron_left"
                class="date-nav-btn"
                @click="goToPreviousDay"
              />
              <q-input
                dense
                outlined
                v-model="currentDate"
                type="date"
                class="filter-input date-nav-input"
                @update:model-value="onDateNavChange"
              >
                <template v-slot:prepend>
                  <q-icon name="event" />
                </template>
              </q-input>
              <q-btn
                flat
                round
                dense
                icon="chevron_right"
                class="date-nav-btn"
                @click="goToNextDay"
                :disable="currentDate >= today"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Main Table Section -->
      <div class="table-section">
        <div class="table-header">
          <h2 class="table-title">Attendance Overview</h2>
          <div class="table-actions">
            <q-btn flat round icon="refresh" class="header-btn" @click="fetchAttendanceData()" />
            <q-select
              dense
              outlined
              label="Filter by Cost Center"
              v-model="filters.cost_center"
              :options="costCenterOptions"
              :loading="filtersLoading"
              class="site-filter-dropdown"
              clearable
              map-options
              emit-value
              behavior="menu"
              menu-anchor="bottom left"
              menu-self="top left"
              style="min-width: 180px"
            >
              <template v-slot:prepend>
                <q-icon name="account_balance_wallet" />
              </template>
            </q-select>
          </div>
        </div>

        <!-- Attendance Table - IMPROVED STRUCTURE -->
        <div class="modern-table-container">
          <div class="table-wrapper">
            <q-table
              :rows="filteredAttendanceRows"
              :columns="columns"
              row-key="id"
              flat
              :loading="loading"
              class="attendance-table"
              hide-pagination
              :rows-per-page-options="[0]"
              :grid="$q.screen.xs"
              table-header-class="table-header-custom"
              separator="none"
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
                            loading="lazy"
                            @click="viewSelfie(props.row.time_in_selfie, 'Time In')"
                          />
                        </div>
                        <div v-if="props.row.time_out_selfie" class="mobile-selfie-item">
                          <span class="mobile-selfie-label">Time Out Photo:</span>
                          <img
                            :src="props.row.time_out_selfie"
                            alt="Time Out"
                            class="mobile-selfie-img"
                            loading="lazy"
                            @click="viewSelfie(props.row.time_out_selfie, 'Time Out')"
                          />
                        </div>
                      </div>
                    </q-card-section>
                  </q-card>
                </div>
              </template>

              <template v-slot:header="props">
                <q-tr :props="props" class="table-header-row">
                  <q-th key="employee" :props="props" class="table-header-cell employee-col"
                    >Employee</q-th
                  >
                  <q-th
                    key="work_type"
                    :props="props"
                    class="table-header-cell employment-status-col"
                    >Work Type</q-th
                  >
                  <q-th key="cost_center" :props="props" class="table-header-cell cost-center-col"
                    >Cost Center</q-th
                  >
                  <q-th key="time_in" :props="props" class="table-header-cell time-col"
                    >Time In</q-th
                  >
                  <q-th key="time_in_photo" :props="props" class="table-header-cell photo-col"
                    >Photo</q-th
                  >
                  <q-th
                    key="time_in_source"
                    :props="props"
                    class="table-header-cell source-mini-col"
                    >In Source</q-th
                  >
                  <q-th key="time_out" :props="props" class="table-header-cell time-col"
                    >Time Out</q-th
                  >
                  <q-th key="time_out_photo" :props="props" class="table-header-cell photo-col"
                    >Photo</q-th
                  >
                  <q-th
                    key="time_out_source"
                    :props="props"
                    class="table-header-cell source-mini-col"
                    >Out Source</q-th
                  >
                </q-tr>
              </template>

              <template v-slot:body="props">
                <q-tr :props="props" class="table-body-row">
                  <q-td key="employee" :props="props" class="table-body-cell employee-col">
                    <div class="employee-info">
                      <q-avatar
                        size="32px"
                        class="employee-avatar clickable-avatar"
                        @click="viewEmployeePhoto(props.row.employee)"
                      >
                        <img
                          v-if="getEmployeePhoto(props.row.employee)"
                          :src="getEmployeePhoto(props.row.employee)"
                          alt="Employee Photo"
                          class="avatar-image"
                          loading="lazy"
                        />
                        <span v-else class="avatar-initials">
                          {{ getEmployeeName(props.row.employee).charAt(0) }}
                        </span>
                      </q-avatar>
                      <span class="employee-name">
                        {{ getEmployeeName(props.row.employee) }}
                      </span>
                    </div>
                  </q-td>
                  <!-- Work Type -->
                  <q-td
                    key="work_type"
                    :props="props"
                    class="table-body-cell employment-status-col"
                  >
                    <div
                      v-if="props.row.work_type"
                      class="employment-status-badge"
                      :class="getEmploymentStatusClass(props.row.work_type)"
                    >
                      {{ props.row.work_type }}
                    </div>
                    <span v-else class="no-photo">-</span>
                  </q-td>
                  <!-- Cost Center (merged with Site) -->
                  <q-td key="cost_center" :props="props" class="table-body-cell cost-center-col">
                    <div
                      class="cost-center-badge time-editable"
                      @click="openCostCenterInlineEdit(props.row)"
                      title="Click to edit cost center"
                    >
                      <div
                        style="
                          display: flex;
                          flex-direction: column;
                          align-items: flex-start;
                          gap: 2px;
                        "
                      >
                        <div style="display: flex; align-items: center">
                          <q-icon name="account_balance_wallet" size="12px" class="q-mr-xs" />
                          {{ getCostCenterName(props.row.cost_center) || 'None' }}
                          <q-icon name="edit" size="10px" class="edit-icon q-ml-xs" />
                        </div>
                        <div
                          v-if="props.row.site"
                          style="
                            display: flex;
                            align-items: center;
                            font-size: 11px;
                            color: #6b7280;
                          "
                        >
                          <q-icon name="location_on" size="11px" class="q-mr-xs" />
                          {{ getSiteName(props.row.site) }}
                        </div>
                      </div>
                    </div>
                  </q-td>
                  <!-- Time In — clickable inline edit -->
                  <q-td key="time_in" :props="props" class="table-body-cell time-col">
                    <div
                      class="time-badge time-in"
                      :class="{ 'has-time': props.row.time_in, 'time-editable': true }"
                      @click="openInlineEdit(props.row, 'time_in')"
                      title="Click to edit"
                    >
                      {{ props.row.time_in ? formatTime(props.row.time_in) : '--:--' }}
                      <q-icon name="edit" size="10px" class="edit-icon q-ml-xs" />
                    </div>
                  </q-td>
                  <q-td key="time_in_photo" :props="props" class="table-body-cell photo-col">
                    <div class="selfie-container">
                      <img
                        v-if="props.row.time_in_selfie"
                        :src="props.row.time_in_selfie"
                        alt="Time In Selfie"
                        class="selfie-thumbnail"
                        loading="lazy"
                        @click="viewSelfie(props.row.time_in_selfie, 'Time In')"
                      />
                      <span v-else class="no-photo">-</span>
                    </div>
                  </q-td>
                  <q-td key="time_in_source" :props="props" class="table-body-cell source-mini-col">
                    <div
                      class="source-mini-badge"
                      :class="getSourceClass(props.row.time_in_source || props.row.source)"
                    >
                      {{ formatSource(props.row.time_in_source || props.row.source) }}
                    </div>
                  </q-td>
                  <!-- Time Out — clickable inline edit -->
                  <q-td key="time_out" :props="props" class="table-body-cell time-col">
                    <div
                      class="time-badge time-out"
                      :class="{ 'has-time': props.row.time_out, 'time-editable': true }"
                      @click="openInlineEdit(props.row, 'time_out')"
                      title="Click to edit"
                    >
                      {{ props.row.time_out ? formatTime(props.row.time_out) : '--:--' }}
                      <q-icon name="edit" size="10px" class="edit-icon q-ml-xs" />
                    </div>
                  </q-td>
                  <q-td key="time_out_photo" :props="props" class="table-body-cell photo-col">
                    <div class="selfie-container">
                      <img
                        v-if="props.row.time_out_selfie"
                        :src="props.row.time_out_selfie"
                        alt="Time Out Selfie"
                        class="selfie-thumbnail"
                        loading="lazy"
                        @click="viewSelfie(props.row.time_out_selfie, 'Time Out')"
                      />
                      <span v-else class="no-photo">-</span>
                    </div>
                  </q-td>
                  <q-td
                    key="time_out_source"
                    :props="props"
                    class="table-body-cell source-mini-col"
                  >
                    <div
                      v-if="props.row.time_out"
                      class="source-mini-badge"
                      :class="getSourceClass(props.row.time_out_source || props.row.source)"
                    >
                      {{ formatSource(props.row.time_out_source || props.row.source) }}
                    </div>
                    <span v-else class="no-photo">-</span>
                  </q-td>
                </q-tr>
              </template>
            </q-table>
          </div>

          <!-- Table Footer with Pagination Info -->
          <div class="table-footer">
            <div class="footer-info">
              <span class="total-label">Total</span>
              <span class="total-records">{{ filteredAttendanceRows.length }} Records</span>
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

    <!-- IMPROVED Add Attendance Dialog - COMPACT VERSION -->
    <q-dialog v-model="showAddDialog" persistent :maximized="$q.screen.lt.sm">
      <q-card class="compact-dialog-card">
        <q-card-section class="compact-dialog-header">
          <div>
            <div class="dialog-title">Add Attendance</div>
            <div class="dialog-subtitle">
              Record time in and time out for {{ formatDate(currentDate) }}
            </div>
          </div>
          <q-btn flat round dense icon="close" @click="closeAddDialog" v-close-popup />
        </q-card-section>

        <q-separator />

        <q-card-section class="compact-dialog-body">
          <q-form @submit.prevent="submitAttendance" class="compact-form">
            <!-- Employee and Date Row -->
            <div class="form-row">
              <q-select
                ref="employeeSelectRef"
                filled
                dense
                v-model="newRecord.employee"
                :options="employeeOptions"
                label="Employee *"
                option-label="label"
                option-value="value"
                emit-value
                map-options
                use-input
                fill-input
                hide-selected
                input-debounce="300"
                @filter="filterEmployees"
                @update:model-value="onEmployeeSelected"
                @click="onEmployeeDropdownClick"
                class="form-field"
                :rules="[(val) => !!val || 'Required']"
              >
                <template v-slot:prepend>
                  <q-icon name="person" size="xs" />
                </template>
              </q-select>

              <!-- Date is auto-filled from the active calendar filter -->
              <q-input
                filled
                dense
                :model-value="newRecord.date"
                label="Date"
                class="form-field"
                readonly
              >
                <template v-slot:prepend>
                  <q-icon name="event" size="xs" />
                </template>
                <template v-slot:append>
                  <q-icon name="lock" size="xs" color="grey-5" />
                </template>
              </q-input>
            </div>

            <!-- Site Dropdown -->
            <q-select
              filled
              dense
              v-model="newRecord.site_id"
              :options="siteOptions"
              label="Site"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              clearable
              :loading="filtersLoading"
              class="form-field q-mb-sm"
              behavior="menu"
              menu-anchor="bottom left"
              menu-self="top left"
            >
              <template v-slot:prepend>
                <q-icon name="location_on" size="xs" />
              </template>
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey">No sites found</q-item-section>
                </q-item>
              </template>
            </q-select>

            <!-- Schedule Info (Compact) -->
            <q-banner
              v-if="employeeSchedule && newRecord.employee && newRecord.date"
              dense
              rounded
              class="schedule-banner bg-blue-1"
            >
              <template v-slot:avatar>
                <q-icon name="schedule" color="primary" />
              </template>
              <div class="schedule-compact">
                <div class="schedule-compact-row">
                  <span class="text-weight-medium">{{ employeeSchedule.employee_name }}</span>
                  <q-badge :color="getStatusColor(employeeSchedule.status)">
                    {{ employeeSchedule.status }}
                  </q-badge>
                </div>
                <div class="schedule-compact-row text-caption text-grey-7">
                  <span>{{ employeeSchedule.site }} • {{ employeeSchedule.position }}</span>
                  <span>{{ employeeSchedule.shift_start }} - {{ employeeSchedule.shift_end }}</span>
                </div>
              </div>
            </q-banner>

            <q-banner
              v-else-if="loadingSchedule && newRecord.employee && newRecord.date"
              dense
              rounded
              class="bg-grey-2"
            >
              <template v-slot:avatar>
                <q-spinner color="primary" size="sm" />
              </template>
              Loading schedule...
            </q-banner>

            <!-- Time In and Out Row -->
            <div class="form-row">
              <q-input
                filled
                dense
                v-model="newRecord.time_in"
                label="Time In *"
                type="time"
                class="form-field"
                :rules="[(val) => !!val || 'Required']"
              >
                <template v-slot:prepend>
                  <q-icon name="login" size="xs" />
                </template>
              </q-input>

              <q-input
                filled
                dense
                v-model="newRecord.time_out"
                label="Time Out *"
                type="time"
                class="form-field"
                :rules="[(val) => !!val || 'Required']"
              >
                <template v-slot:prepend>
                  <q-icon name="logout" size="xs" />
                </template>
              </q-input>
            </div>

            <!-- Overnight Shift Indicator -->
            <q-banner
              v-if="newRecord.time_in && newRecord.time_out && isOvernightShift()"
              dense
              rounded
              class="bg-deep-purple-1 q-mb-sm"
            >
              <template v-slot:avatar>
                <q-icon name="dark_mode" color="deep-purple" />
              </template>
              <span class="text-deep-purple text-caption text-weight-medium">
                Graveyard shift detected — Time Out is on
                <strong>{{ getTimeOutDate() }}</strong>
              </span>
            </q-banner>

            <!-- Working Hours Display (Compact) -->
            <div
              v-if="newRecord.time_in && newRecord.time_out"
              class="working-hours-compact bg-green-1"
            >
              <q-icon name="schedule" color="positive" size="sm" />
              <div class="working-hours-text">
                <span class="text-caption text-grey-7">Total Hours</span>
                <span class="text-h6 text-positive text-weight-bold">{{
                  calculateWorkingHours()
                }}</span>
              </div>
            </div>
          </q-form>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right" class="compact-dialog-actions">
          <q-btn flat label="Cancel" @click="closeAddDialog" v-close-popup />
          <q-btn
            unelevated
            color="primary"
            label="Save"
            icon="check"
            @click="submitAttendance"
            :loading="creating"
            :disable="!newRecord.employee || !newRecord.time_in || !newRecord.time_out"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Employee Photo Viewer Dialog -->
    <q-dialog v-model="showEmployeePhotoDialog">
      <q-card class="employee-photo-dialog-card">
        <q-card-section class="employee-photo-header">
          <div class="employee-photo-title">
            <q-avatar size="48px" color="primary" text-color="white" class="q-mr-md">
              <img
                v-if="selectedEmployeePhoto"
                :src="selectedEmployeePhoto"
                alt="Employee"
                style="width: 100%; height: 100%; object-fit: cover"
              />
              <span v-else>{{ selectedEmployeeName.charAt(0) }}</span>
            </q-avatar>
            <div>
              <div class="dialog-title">{{ selectedEmployeeName }}</div>
              <div class="text-caption text-grey-7">Employee Profile Photo</div>
            </div>
          </div>
          <q-btn
            flat
            round
            dense
            icon="close"
            @click="showEmployeePhotoDialog = false"
            class="close-btn"
          />
        </q-card-section>
        <q-card-section class="employee-photo-body">
          <img
            v-if="selectedEmployeePhoto"
            :src="selectedEmployeePhoto"
            alt="Employee Photo"
            class="employee-full-image"
          />
          <div v-else class="no-photo-placeholder">
            <q-icon name="person" size="120px" color="grey-5" />
            <div class="text-grey-7 q-mt-md">No photo available</div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Inline Time Edit Dialog -->
    <q-dialog v-model="showInlineEditDialog" persistent>
      <q-card class="inline-edit-card">
        <q-card-section class="inline-edit-header">
          <div>
            <div class="dialog-title">
              Edit {{ inlineEdit.field === 'time_in' ? 'Time In' : 'Time Out' }}
            </div>
            <div class="dialog-subtitle text-grey-6 text-caption">
              {{ inlineEdit.employeeName }} — {{ inlineEdit.date }}
            </div>
          </div>
          <q-btn flat round dense icon="close" @click="closeInlineEdit" />
        </q-card-section>

        <q-separator />

        <q-card-section class="q-pt-md q-pb-md">
          <q-input
            filled
            dense
            v-model="inlineEdit.value"
            :label="inlineEdit.field === 'time_in' ? 'New Time In' : 'New Time Out'"
            type="time"
            class="form-field"
            autofocus
          >
            <template v-slot:prepend>
              <q-icon :name="inlineEdit.field === 'time_in' ? 'login' : 'logout'" size="xs" />
            </template>
          </q-input>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right" class="q-pa-sm">
          <q-btn flat label="Cancel" @click="closeInlineEdit" size="sm" />
          <q-btn
            unelevated
            color="primary"
            label="Save"
            icon="check"
            size="sm"
            @click="saveInlineEdit"
            :loading="inlineEdit.saving"
            :disable="!inlineEdit.value"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Inline Cost Center Edit Dialog -->
    <q-dialog v-model="showCostCenterInlineDialog" persistent>
      <q-card class="inline-edit-card">
        <q-card-section class="inline-edit-header">
          <div>
            <div class="dialog-title">Edit Cost Center</div>
            <div class="dialog-subtitle text-grey-6 text-caption">
              {{ costCenterInlineEdit.employeeName }} — {{ costCenterInlineEdit.date }}
            </div>
          </div>
          <q-btn flat round dense icon="close" @click="closeCostCenterInlineEdit" />
        </q-card-section>

        <q-separator />

        <q-card-section class="q-pt-md q-pb-md">
          <q-select
            filled
            dense
            v-model="costCenterInlineEdit.value"
            :options="costCenterOptions"
            label="Cost Center"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            clearable
            :loading="filtersLoading"
            class="form-field"
            behavior="menu"
            menu-anchor="bottom left"
            menu-self="top left"
            autofocus
          >
            <template v-slot:prepend>
              <q-icon name="account_balance_wallet" size="xs" />
            </template>
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey">No cost centers found</q-item-section>
              </q-item>
            </template>
          </q-select>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right" class="q-pa-sm">
          <q-btn flat label="Cancel" @click="closeCostCenterInlineEdit" size="sm" />
          <q-btn
            unelevated
            color="primary"
            label="Save"
            icon="check"
            size="sm"
            @click="saveCostCenterInlineEdit"
            :loading="costCenterInlineEdit.saving"
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
              readonly
              disable
            >
              <template v-slot:append>
                <q-icon name="lock" />
              </template>
            </q-input>

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

            <!-- Cost Center Dropdown -->
            <q-select
              filled
              v-model="editingRecord.cost_center_id"
              :options="costCenterOptions"
              label="Cost Center"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              clearable
              :loading="filtersLoading"
              class="form-field q-mt-sm"
              behavior="menu"
              menu-anchor="bottom left"
              menu-self="top left"
            >
              <template v-slot:prepend>
                <q-icon name="account_balance_wallet" />
              </template>
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey">No cost centers found</q-item-section>
                </q-item>
              </template>
            </q-select>
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
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import { useAttendance } from 'src/composables/useAttendance'
import { useEmployees } from 'src/composables/useEmployees'
import { useOrganization } from 'src/composables/useOrganization'

const $q = useQuasar()

// ─── Composables ──────────────────────────────────────────────────────────────
const {
  attendanceData,
  loading,
  fetchAttendance,
  fetchAttendanceByDate,
  fetchEmployeeSchedule: fetchScheduleFromComposable,
  logAttendance,
  updateAttendance: updateAttendanceApi,
  batchDeleteAttendance,
  exportSelectedAttendance,
  exportAllAttendance,
} = useAttendance()

const { employees, fetchEmployees } = useEmployees()
const {
  sites: rawSites,
  costCenters: rawCostCenters,
  fetchSites: fetchSitesApi,
  fetchCostCenters: fetchCostCentersApi,
} = useOrganization()

// ─── Template refs ────────────────────────────────────────────────────────────
const employeeSelectRef = ref(null)

// ─── Local UI state ───────────────────────────────────────────────────────────
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

// Inline time edit state
const showInlineEditDialog = ref(false)
const inlineEdit = ref({
  record: null,
  field: '',
  value: '',
  date: '',
  employeeName: '',
  saving: false,
})

// Inline cost center edit state
const showCostCenterInlineDialog = ref(false)
const costCenterInlineEdit = ref({
  record: null,
  value: null,
  date: '',
  employeeName: '',
  saving: false,
})

// Loading states
const updating = ref(false)
const creating = ref(false)

// Schedule state
const employeeSchedule = ref(null)
const loadingSchedule = ref(false)
const scheduleError = ref(null)

const showEmployeePhotoDialog = ref(false)
const selectedEmployeePhoto = ref('')
const selectedEmployeeName = ref('')

const pagination = ref({
  page: 1,
  rowsPerPage: 25,
  rowsNumber: 0,
})

const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

const filters = ref({
  date_from: today,
  date_to: today,
  cost_center: '',
})

const dateRange = ref(today)
const currentDate = ref(today)
const tempDateRange = ref({ from: '', to: '' })

// Filter options — built from composable refs
const siteOptions = ref([])
const costCenterOptions = ref([])
const employeeOptions = ref([])
const employeeSearch = ref('')

// Edit form
const editingRecord = ref(null)

// Add form
const newRecord = ref({
  employee: '',
  site_id: '',
  cost_center_id: '',
  date: '',
  time_in: '',
  time_out: '',
  source: 'admin',
})

const isAdmin = ref(false)
const userData = JSON.parse(localStorage.getItem('user') || '{}')
if (userData.role === 'admin') isAdmin.value = true

// ─── Computed ─────────────────────────────────────────────────────────────────
const stats = computed(() => {
  const data = attendanceData.value
  const total = data.length
  const app = data.filter((item) => item.source === 'app').length
  const terminal = data.filter((item) => item.source === 'terminal').length
  const system = data.filter((item) => item.source === 'system').length
  return [
    { label: 'Total Records', count: total },
    { label: 'App', count: app },
    { label: 'Terminal', count: terminal },
    { label: 'System', count: system },
  ]
})

const filteredAttendanceRows = computed(() => {
  if (!employeeSearch.value || !employeeSearch.value.trim()) return attendanceData.value
  const term = employeeSearch.value.trim().toLowerCase()
  return attendanceData.value.filter((row) =>
    getEmployeeName(row.employee).toLowerCase().includes(term),
  )
})

const totalPages = computed(() => {
  return Math.ceil(pagination.value.rowsNumber / pagination.value.rowsPerPage) || 1
})

// ─── Table columns ────────────────────────────────────────────────────────────
const columns = [
  { name: 'select', label: '', align: 'center', field: 'id', sortable: false },
  { name: 'employee', label: 'Employee', align: 'left', field: 'employee', sortable: true },
  { name: 'date', label: 'Date', align: 'center', field: 'date', sortable: true },
  { name: 'site', label: 'Site', align: 'left', field: 'site', sortable: true },
  { name: 'work_type', label: 'Work Type', align: 'left', field: 'work_type', sortable: true },
  {
    name: 'cost_center',
    label: 'Cost Center',
    align: 'left',
    field: 'cost_center',
    sortable: false,
  },
  { name: 'time_in', label: 'Time In', align: 'center', field: 'time_in', sortable: true },
  {
    name: 'time_in_photo',
    label: 'Photo',
    align: 'center',
    field: 'time_in_selfie',
    sortable: false,
  },
  { name: 'time_in_source', label: 'In Source', align: 'center', field: 'source', sortable: false },
  { name: 'time_out', label: 'Time Out', align: 'center', field: 'time_out', sortable: true },
  {
    name: 'time_out_photo',
    label: 'Photo',
    align: 'center',
    field: 'time_out_selfie',
    sortable: false,
  },
  {
    name: 'time_out_source',
    label: 'Out Source',
    align: 'center',
    field: 'source',
    sortable: false,
  },
  { name: 'actions', label: 'Actions', align: 'center', field: 'actions', sortable: false },
]

// ─── Date navigation ──────────────────────────────────────────────────────────
function goToPreviousDay() {
  const date = new Date(currentDate.value)
  date.setDate(date.getDate() - 1)
  const newDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  currentDate.value = newDate
  filters.value.date_from = newDate
  filters.value.date_to = newDate
  dateRange.value = newDate
  pagination.value.page = 1
  fetchAttendanceData()
}

function goToNextDay() {
  const date = new Date(currentDate.value)
  date.setDate(date.getDate() + 1)
  const newDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  currentDate.value = newDate
  filters.value.date_from = newDate
  filters.value.date_to = newDate
  dateRange.value = newDate
  pagination.value.page = 1
  fetchAttendanceData()
}

function onDateNavChange(val) {
  if (!val) return
  currentDate.value = val
  filters.value.date_from = val
  filters.value.date_to = val
  dateRange.value = val
  pagination.value.page = 1
  fetchAttendanceData()
}

// ─── Selfie viewer ────────────────────────────────────────────────────────────
function viewSelfie(imageUrl, title) {
  selectedSelfie.value = imageUrl
  selfieDialogTitle.value = `${title} Selfie`
  showSelfieDialog.value = true
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
async function fetchEmployeeSchedule(employeeId, date) {
  if (!employeeId || !date) return

  loadingSchedule.value = true
  scheduleError.value = null
  employeeSchedule.value = null

  try {
    const scheduleData = await fetchScheduleFromComposable(employeeId, date)
    if (scheduleData) {
      employeeSchedule.value = {
        employee_id: scheduleData.employee_id,
        employee_name: scheduleData.employee_name,
        position: scheduleData.position_name,
        site: scheduleData.site_name,
        date: scheduleData.schedule_date,
        shift_start: formatScheduleTime(scheduleData.start_time),
        shift_end: formatScheduleTime(scheduleData.end_time),
        status: scheduleData.status,
      }
    } else {
      employeeSchedule.value = null
    }
  } catch (error) {
    scheduleError.value =
      error.response?.data?.message ?? error.response?.data?.detail ?? 'Failed to load schedule'
    employeeSchedule.value = null
  } finally {
    loadingSchedule.value = false
  }
}

function onEmployeeSelected(employeeId) {
  employeeSchedule.value = null
  scheduleError.value = null
  const date = newRecord.value.date
  if (employeeId && date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    fetchEmployeeSchedule(employeeId, date)
  }
}

function onAddDialogDateChange(val) {
  if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return
  if (newRecord.value.employee) {
    fetchEmployeeSchedule(newRecord.value.employee, val)
  }
}

function onEmployeeDropdownClick() {
  if (newRecord.value.employee) {
    newRecord.value.employee = ''
    employeeSchedule.value = null
    scheduleError.value = null
    nextTick(() => {
      employeeSelectRef.value?.updateInputValue('', true)
    })
  }
}

// ─── Data fetching ────────────────────────────────────────────────────────────
function getYearMonth() {
  const baseDate = filters.value.date_from ? new Date(filters.value.date_from) : new Date()
  const year = baseDate.getFullYear()
  const month = String(baseDate.getMonth() + 1).padStart(2, '0')
  return { year, month }
}

async function fetchAttendanceData(params = {}) {
  try {
    const extraParams = {
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage,
      ...(filters.value.cost_center ? { cost_center: filters.value.cost_center } : {}),
      ...params,
    }

    const data = await fetchAttendanceByDate(currentDate.value, extraParams)

    const filtered = [...data]

    attendanceData.value = filtered
    pagination.value.rowsNumber = filtered.length

    if (filtered.length === 0 && data.length > 0) {
      showErrorNotification('No records match the current filters. Try adjusting your filters.')
    } else if (filtered.length === 0) {
      showErrorNotification('No attendance records found for this period.')
    }
  } catch (error) {
    showErrorNotification(
      error.response?.data?.detail ??
        error.response?.data?.message ??
        'Failed to load attendance data',
    )
    attendanceData.value = []
  }
}

async function fetchSites() {
  filtersLoading.value = true
  try {
    await fetchSitesApi()
    siteOptions.value = rawSites.value.map((site) => ({
      label: site.name || site.site_name || site.title || `Site ${site.id}`,
      value: site.id || site.site_id || site.uuid,
      site,
    }))
  } catch (error) {
    showErrorNotification(error.response?.data?.detail ?? 'Failed to load sites')
    siteOptions.value = []
  } finally {
    filtersLoading.value = false
  }
}

async function fetchCostCenters() {
  try {
    await fetchCostCentersApi()
    costCenterOptions.value = rawCostCenters.value.map((cc) => ({
      label: cc.name || `Cost Center ${cc.id}`,
      value: cc.id,
      costCenter: cc,
    }))
  } catch {
    costCenterOptions.value = []
  }
}

async function fetchEmployeeDetails() {
  filtersLoading.value = true
  try {
    await fetchEmployees()
    employeeOptions.value = employees.value
      .map((emp) => ({
        label: getEmployeeName(emp) || 'Unknown Employee',
        value: emp.uuid || emp.id,
        employee: emp,
      }))
      .filter((opt) => opt.label !== 'Unknown Employee')

    if (employeeOptions.value.length === 0) {
      showErrorNotification('No employees found. Please add employees first.')
    }
  } catch (error) {
    showErrorNotification(error.response?.data?.detail ?? 'Failed to load employees')
    employeeOptions.value = []
  } finally {
    filtersLoading.value = false
  }
}

async function filterByEmployeeId(employeeId) {
  filters.value.employee = employeeId
  pagination.value.page = 1
  await fetchAttendanceData()
}

async function filterByEmployee(employeeId) {
  filters.value.employee = employeeId
  pagination.value.page = 1
  await fetchAttendanceData()
}

// ─── Submit attendance (add) ──────────────────────────────────────────────────
async function submitAttendance() {
  if (!newRecord.value.employee) {
    showErrorNotification('Please select an employee')
    return
  }
  if (!newRecord.value.time_in || !newRecord.value.time_out) {
    showErrorNotification('Please enter both time in and time out')
    return
  }

  const timeIn = new Date(`${newRecord.value.date}T${newRecord.value.time_in}:00`)
  let timeOut = new Date(`${newRecord.value.date}T${newRecord.value.time_out}:00`)
  if (timeOut <= timeIn) timeOut.setDate(timeOut.getDate() + 1)

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
    const selectedEmp = employees.value.find(
      (emp) => emp.id === newRecord.value.employee || emp.uuid === newRecord.value.employee,
    )

    if (!selectedEmp) {
      showErrorNotification('Employee not found.')
      return
    }

    const employeeUUID = selectedEmp.uuid || selectedEmp.id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!employeeUUID || !uuidRegex.test(employeeUUID)) {
      showErrorNotification('Invalid employee ID format.')
      return
    }

    // Time In
    await logAttendance({
      source: 'manual',
      time_in_source: 'manual',
      employee_id: employeeUUID,
      timestamp: timeIn.toISOString(),
      ...(newRecord.value.site_id && { site_id: newRecord.value.site_id }),
      ...(newRecord.value.cost_center_id != null && {
        cost_center: newRecord.value.cost_center_id,
      }),
    })

    await new Promise((resolve) => setTimeout(resolve, 500))

    // Time Out
    await logAttendance({
      source: 'manual',
      time_out_source: 'manual',
      employee_id: employeeUUID,
      timestamp: timeOut.toISOString(),
      ...(newRecord.value.site_id && { site_id: newRecord.value.site_id }),
      ...(newRecord.value.cost_center_id != null && {
        cost_center: newRecord.value.cost_center_id,
      }),
    })

    showSuccessNotification(`Attendance completed! Total hours: ${calculateWorkingHours()}`)
    closeAddDialog()
    await fetchAttendanceData()
  } catch (error) {
    const data = error.response?.data
    const msg =
      typeof data === 'string'
        ? data
        : (data?.reason ?? data?.detail ?? data?.message ?? 'Failed to record attendance')
    showErrorNotification(msg)
  } finally {
    creating.value = false
  }
}

// ─── Inline time edit ─────────────────────────────────────────────────────────
function openInlineEdit(row, field) {
  const currentValue = field === 'time_in' ? row.time_in : row.time_out
  inlineEdit.value = {
    record: row,
    field,
    value: formatTimeForInput(currentValue),
    date: row.date,
    employeeName: getEmployeeName(row.employee),
    saving: false,
  }
  showInlineEditDialog.value = true
}

function closeInlineEdit() {
  showInlineEditDialog.value = false
  inlineEdit.value = {
    record: null,
    field: '',
    value: '',
    date: '',
    employeeName: '',
    saving: false,
  }
}

async function saveInlineEdit() {
  if (!inlineEdit.value.value || !inlineEdit.value.record) return

  inlineEdit.value.saving = true
  try {
    const record = inlineEdit.value.record
    const field = inlineEdit.value.field
    const date = record.date
    let newTimestamp = new Date(`${date}T${inlineEdit.value.value}:00`).toISOString()

    const existingTimeIn = field === 'time_in' ? newTimestamp : record.time_in
    const existingTimeOut = field === 'time_out' ? newTimestamp : record.time_out

    let timeOutTimestamp = existingTimeOut
    if (existingTimeIn && existingTimeOut) {
      const tIn = new Date(existingTimeIn)
      let tOut = new Date(existingTimeOut)
      if (tOut <= tIn) {
        tOut.setDate(tOut.getDate() + 1)
        timeOutTimestamp = tOut.toISOString()
      }
    }

    await updateAttendanceApi(record.id, {
      time_in: existingTimeIn,
      time_out: timeOutTimestamp,
      source: record.source || 'admin',
    })

    showSuccessNotification(`${field === 'time_in' ? 'Time In' : 'Time Out'} updated successfully`)
    closeInlineEdit()
    await fetchAttendanceData()
  } catch (error) {
    const data = error.response?.data
    const msg =
      typeof data === 'string' ? data : (data?.detail ?? data?.message ?? 'Failed to update')
    showErrorNotification(msg)
  } finally {
    inlineEdit.value.saving = false
  }
}

// ─── Inline cost center edit ──────────────────────────────────────────────────
function openCostCenterInlineEdit(row) {
  const rawCc = row.cost_center
  let resolvedId = null
  if (rawCc) {
    if (typeof rawCc === 'object') {
      resolvedId = rawCc.id ?? null
    } else {
      const match = costCenterOptions.value.find((cc) => cc.label === rawCc || cc.value === rawCc)
      resolvedId = match ? match.value : null
    }
  }
  costCenterInlineEdit.value = {
    record: row,
    value: resolvedId,
    date: row.date,
    employeeName: getEmployeeName(row.employee),
    saving: false,
  }
  showCostCenterInlineDialog.value = true
}

function closeCostCenterInlineEdit() {
  showCostCenterInlineDialog.value = false
  costCenterInlineEdit.value = {
    record: null,
    value: null,
    date: '',
    employeeName: '',
    saving: false,
  }
}

async function saveCostCenterInlineEdit() {
  if (!costCenterInlineEdit.value.record) return

  costCenterInlineEdit.value.saving = true
  try {
    const record = costCenterInlineEdit.value.record
    await updateAttendanceApi(record.id, {
      time_in: record.time_in || null,
      time_out: record.time_out || null,
      time_in_source: record.time_in_source || record.source || 'admin',
      time_out_source: record.time_out_source || record.source || 'admin',
      source: record.source || 'admin',
      cost_center: costCenterInlineEdit.value.value ?? null,
    })

    showSuccessNotification('Cost center updated successfully')
    closeCostCenterInlineEdit()
    await fetchAttendanceData()
  } catch (error) {
    const data = error.response?.data
    const msg =
      typeof data === 'string'
        ? data
        : (data?.detail ?? data?.message ?? 'Failed to update cost center')
    showErrorNotification(msg)
  } finally {
    costCenterInlineEdit.value.saving = false
  }
}

// ─── Update attendance (edit dialog) ─────────────────────────────────────────
async function updateAttendance() {
  if (!editingRecord.value) return

  updating.value = true
  try {
    const selectedEmp = employees.value.find(
      (emp) =>
        emp.id === editingRecord.value.employee ||
        emp.uuid === editingRecord.value.employee ||
        (typeof editingRecord.value.employee === 'object' &&
          (emp.id === editingRecord.value.employee.id ||
            emp.uuid === editingRecord.value.employee.uuid)),
    )

    if (!selectedEmp) {
      showErrorNotification('Employee not found.')
      return
    }

    let timeInTimestamp = null
    let timeOutTimestamp = null

    if (editingRecord.value.time_in) {
      timeInTimestamp = new Date(
        `${editingRecord.value.date}T${editingRecord.value.time_in}:00`,
      ).toISOString()
    }

    if (editingRecord.value.time_out) {
      let timeOutDate = new Date(`${editingRecord.value.date}T${editingRecord.value.time_out}:00`)
      if (
        editingRecord.value.time_in &&
        timeOutDate <= new Date(`${editingRecord.value.date}T${editingRecord.value.time_in}:00`)
      ) {
        timeOutDate.setDate(timeOutDate.getDate() + 1)
      }
      timeOutTimestamp = timeOutDate.toISOString()
    }

    await updateAttendanceApi(editingRecord.value.id, {
      time_in: timeInTimestamp,
      time_out: timeOutTimestamp,
      time_in_source: editingRecord.value.time_in_source || editingRecord.value.source || 'admin',
      time_out_source: editingRecord.value.time_out_source || editingRecord.value.source || 'admin',
      source: editingRecord.value.source || 'admin',
      ...(editingRecord.value.cost_center_id != null && {
        cost_center: editingRecord.value.cost_center_id,
      }),
    })

    showSuccessNotification('Attendance updated successfully')
    showEditDialog.value = false
    await fetchAttendanceData()
  } catch (error) {
    const data = error.response?.data
    let msg = 'Failed to update attendance'
    if (error.response?.status === 404)
      msg = 'Update endpoint not found. Please check the API documentation.'
    else if (typeof data === 'string') msg = data
    else if (data?.detail) msg = data.detail
    else if (data?.message) msg = data.message
    showErrorNotification(msg)
  } finally {
    updating.value = false
  }
}

// ─── Batch delete ─────────────────────────────────────────────────────────────
async function batchDelete(records) {
  try {
    const ids = records.map((r) => r.id)
    await batchDeleteAttendance(ids)
    showSuccessNotification(`${records.length} records deleted successfully`)
    selected.value = []
    await fetchAttendanceData()
  } catch {
    showErrorNotification('Failed to delete records')
  }
}

// ─── Dialog handlers ──────────────────────────────────────────────────────────
function openAddDialog() {
  newRecord.value = {
    employee: '',
    site_id: '',
    cost_center_id: '',
    date: currentDate.value || today,
    time_in: '',
    time_out: '',
    source: 'admin',
  }
  employeeSchedule.value = null
  scheduleError.value = null
  loadingSchedule.value = false
  showAddDialog.value = true
}

watch(currentDate, (newDate) => {
  if (showAddDialog.value && newDate) {
    newRecord.value.date = newDate
    if (newRecord.value.employee) {
      fetchEmployeeSchedule(newRecord.value.employee, newDate)
    }
  }
})

function closeAddDialog() {
  showAddDialog.value = false
  newRecord.value = {
    employee: '',
    site_id: '',
    cost_center_id: '',
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
  let resolvedCostCenterId = null
  const rawCc = record.cost_center
  if (rawCc) {
    if (typeof rawCc === 'object') {
      resolvedCostCenterId = rawCc.id ?? null
    } else {
      const match = costCenterOptions.value.find((cc) => cc.label === rawCc || cc.value === rawCc)
      resolvedCostCenterId = match ? match.value : null
    }
  }

  editingRecord.value = {
    ...record,
    employee: record.employee?.id || record.employee?.uuid || record.employee,
    cost_center_id: resolvedCostCenterId,
  }

  if (editingRecord.value.time_in)
    editingRecord.value.time_in = formatTimeForInput(editingRecord.value.time_in)
  if (editingRecord.value.time_out)
    editingRecord.value.time_out = formatTimeForInput(editingRecord.value.time_out)

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

// ─── Filters ──────────────────────────────────────────────────────────────────
function clearAllFilters() {
  filters.value = { date_from: today, date_to: today, cost_center: '' }
  dateRange.value = today
  currentDate.value = today
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
          .map((emp) => ({ label: getEmployeeName(emp), value: emp.id || emp.uuid, employee: emp }))
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
    const base =
      !isAdmin.value && newRecord.value.site_id
        ? employees.value.filter((emp) => {
            const empSiteId = emp.site_id || emp.siteId || emp.site
            return empSiteId && Number(empSiteId) === Number(newRecord.value.site_id)
          })
        : employees.value

    employeeOptions.value = base
      .map((emp) => ({ label: getEmployeeName(emp), value: emp.id || emp.uuid, employee: emp }))
      .filter((emp) => emp.label.toLowerCase().indexOf(needle) > -1)
  })
}

// ─── Table functions ──────────────────────────────────────────────────────────
function toggleSelectAll(val) {
  selected.value = val ? [...attendanceData.value] : []
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

// ─── Export ───────────────────────────────────────────────────────────────────
async function exportSelected() {
  if (selected.value.length === 0) return
  try {
    const response = await exportSelectedAttendance(selected.value.map((r) => r.id))
    downloadFile(response, 'selected_attendance.csv')
    showSuccessNotification('Export completed')
  } catch {
    showErrorNotification('Export failed')
  }
}

async function exportAll() {
  try {
    const response = await exportAllAttendance(filters.value)
    downloadFile(response, 'all_attendance.csv')
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getSiteName(site) {
  if (!site) return ''
  let name =
    typeof site === 'object' ? site.name || site.site_name || site.title || '' : String(site)
  name = name.replace(/\s*\(.*?\)\s*/g, '').trim()
  const dashIndex = name.indexOf('-')
  return dashIndex !== -1 ? name.substring(0, dashIndex).trim() : name
}

function getCostCenterName(costCenter) {
  if (!costCenter) return ''
  if (typeof costCenter === 'object') return costCenter.name || costCenter.cost_center_name || ''
  return String(costCenter)
}

function getEmployeeName(employee) {
  if (!employee) return 'Unknown Employee'

  if (typeof employee === 'number' || typeof employee === 'string') {
    const found = employees.value.find(
      (emp) => emp.id === employee || emp.id === parseInt(employee),
    )
    if (found) {
      const fullName =
        `${found.first_name || found.firstName || ''} ${found.last_name || found.lastName || ''}`.trim()
      return fullName || found.name || found.username || found.email || 'Unknown Employee'
    }
    return `Employee #${employee}`
  }

  if (typeof employee === 'object') {
    const fullName =
      `${employee.first_name || employee.firstName || employee.firstname || ''} ${employee.last_name || employee.lastName || employee.lastname || ''}`.trim()
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

function getEmployeePhoto(employee) {
  if (!employee) return null
  if (typeof employee === 'object') {
    return (
      employee.photo ||
      employee.image ||
      employee.profile_picture ||
      employee.profile_photo ||
      employee.avatar ||
      employee.picture ||
      null
    )
  }
  const found = employees.value.find((emp) => emp.id === employee || emp.uuid === employee)
  return found
    ? found.photo ||
        found.image ||
        found.profile_picture ||
        found.profile_photo ||
        found.avatar ||
        found.picture ||
        null
    : null
}

function viewEmployeePhoto(employee) {
  if (!employee) return
  selectedEmployeeName.value = getEmployeeName(employee)
  selectedEmployeePhoto.value = getEmployeePhoto(employee)
  showEmployeePhotoDialog.value = true
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

function getEmploymentStatusClass(status) {
  if (!status) return ''
  switch (status.toLowerCase()) {
    case 'regular':
      return 'employment-status-regular'
    case 'probationary':
      return 'employment-status-probationary'
    case 'contractual':
      return 'employment-status-contractual'
    case 'part-time':
      return 'employment-status-parttime'
    default:
      return 'employment-status-default'
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

function formatSource(source) {
  if (!source) return '-'
  return source.replace('_', ' ').toUpperCase()
}

function formatTime(dateTimeString) {
  if (!dateTimeString) return '-'
  try {
    return new Date(dateTimeString).toLocaleTimeString('en-US', {
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
    return new Date(dateTimeString).toTimeString().slice(0, 5)
  } catch {
    return ''
  }
}

function formatScheduleTime(timeString) {
  if (!timeString) return '-'
  try {
    if (/^(\d{1,2}):(\d{2})(:\d{2})?$/.test(timeString)) {
      const [hours, minutes] = timeString.split(':').map(Number)
      return new Date(1970, 0, 1, hours, minutes).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    }
    const date = new Date(timeString)
    if (isNaN(date.getTime())) return timeString
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch {
    return timeString
  }
}

function formatDate(dateString) {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

function formatDateTime(dateTimeString) {
  if (!dateTimeString) return '-'
  try {
    return new Date(dateTimeString).toLocaleString('en-US', {
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

function isOvernightShift() {
  if (!newRecord.value.time_in || !newRecord.value.time_out) return false
  const [inH, inM] = newRecord.value.time_in.split(':').map(Number)
  const [outH, outM] = newRecord.value.time_out.split(':').map(Number)
  return outH * 60 + outM < inH * 60 + inM
}

function getTimeOutDate() {
  if (!newRecord.value.date) return ''
  const next = new Date(newRecord.value.date)
  next.setDate(next.getDate() + 1)
  return next.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function calculateWorkingHours() {
  if (!newRecord.value.time_in || !newRecord.value.time_out) return '0h 0m'
  const [inHours, inMinutes] = newRecord.value.time_in.split(':').map(Number)
  const [outHours, outMinutes] = newRecord.value.time_out.split(':').map(Number)
  let diff = outHours * 60 + outMinutes - (inHours * 60 + inMinutes)
  if (diff < 0) diff += 24 * 60
  return `${Math.floor(diff / 60)}h ${diff % 60}m`
}

// ─── Notifications ────────────────────────────────────────────────────────────
function showSuccessNotification(message) {
  $q.notify({ type: 'positive', message, position: 'top', timeout: 3000 })
}

function showErrorNotification(message) {
  $q.notify({ type: 'negative', message, position: 'top', timeout: 5000 })
}

// ─── Watchers ─────────────────────────────────────────────────────────────────
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
    employeeSchedule.value = null
    scheduleError.value = null
    if (newRecord.value.employee && newDate) {
      fetchEmployeeSchedule(newRecord.value.employee, newDate)
    }
  },
)

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    await Promise.all([fetchSites(), fetchCostCenters(), fetchEmployeeDetails()])
    await fetchAttendanceData()
  } catch (error) {
    showErrorNotification('Error during initialization')
  }
})
</script>

<style scoped>
/* ==============================
   PAGE ROOT
============================== */
.attendance-dashboard {
  background: #f4f6f9;
  min-height: 100vh;
  padding: 0;
}

/* ==============================
   BASE
============================== */
.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* ==============================
   HEADER
============================== */
.page-header {
  background: #ffffff;
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 16px;
  border: 1px solid #e8ecf0;
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
  color: #111827;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.header-btn {
  color: #6b7280 !important;
  width: 36px;
  height: 36px;
  border-radius: 8px !important;
}

.header-btn:hover {
  background: #f3f4f6 !important;
}

.header-search {
  min-width: 280px;
  max-width: 280px;
}

.header-search .q-field__control,
.header-search :deep(.q-field__control) {
  border-radius: 8px;
  height: 36px;
}

.search-icon {
  color: #9ca3af;
}

/* ==============================
   STATS CARDS
============================== */
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stats-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px 18px;
  border: 1px solid #e8ecf0;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  transition: box-shadow 0.2s ease;
}

.stats-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
}

.stats-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stats-icon {
  font-size: 20px;
}

.stats-content {
  min-width: 0;
}

.stats-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 2px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stats-amount {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
}

/* Stat card color variants */
.total-card .stats-icon-wrapper,
.personal-card .stats-icon-wrapper {
  background: #eff6ff;
  color: #3b82f6;
}
.pending-card .stats-icon-wrapper,
.corporate-card .stats-icon-wrapper {
  background: #fefce8;
  color: #ca8a04;
}
.approved-card .stats-icon-wrapper,
.active-card .stats-icon-wrapper,
.business-card .stats-icon-wrapper {
  background: #f0fdf4;
  color: #22c55e;
}
.rejected-card .stats-icon-wrapper,
.urgent-card .stats-icon-wrapper {
  background: #fef2f2;
  color: #ef4444;
}
.scheduled-card .stats-icon-wrapper,
.custom-card .stats-icon-wrapper {
  background: #f5f3ff;
  color: #8b5cf6;
}
.overtime-total-card .stats-icon-wrapper {
  background: #fff7ed;
  color: #f97316;
}

/* ==============================
   TABLE SECTION
============================== */
.table-section {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f3f5;
  flex-wrap: wrap;
  gap: 10px;
}

.table-title-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.table-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.modern-table-container {
  overflow-x: auto;
  margin: 0 16px 16px 16px;
}

.table-header-row {
  background: #f8fafc;
}

.table-header-cell {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #6b7280 !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 11px 16px !important;
  border-bottom: 1px solid #e8ecf0 !important;
  white-space: nowrap;
}

.table-body-row {
  transition: background 0.15s ease;
}

.table-body-row:hover .table-body-cell {
  background: #f9fafb;
}

.table-body-cell {
  font-size: 13px;
  color: #374151;
  padding: 12px 16px !important;
  border-bottom: 1px solid #f1f3f5 !important;
  vertical-align: middle;
}

/* ==============================
   STATUS BADGES
============================== */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.status-badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-active,
.status-approved,
.status-accepted {
  background: #f0fdf4;
  color: #16a34a;
}
.status-active::before,
.status-approved::before,
.status-accepted::before {
  background: #22c55e;
}

.status-pending {
  background: #fefce8;
  color: #ca8a04;
}
.status-pending::before {
  background: #eab308;
}

.status-rejected,
.status-terminated,
.status-inactive {
  background: #fef2f2;
  color: #dc2626;
}
.status-rejected::before,
.status-terminated::before,
.status-inactive::before {
  background: #ef4444;
}

.status-scheduled {
  background: #f5f3ff;
  color: #7c3aed;
}
.status-scheduled::before {
  background: #8b5cf6;
}

.status-default {
  background: #f3f4f6;
  color: #6b7280;
}
.status-default::before {
  background: #9ca3af;
}

/* ==============================
   ACTION BUTTONS (⋯ menu style)
============================== */
.action-buttons,
.action-buttons-wrapper {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
}

.action-btn {
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  border-radius: 6px !important;
  color: #6b7280 !important;
}

.action-btn:hover {
  background: #f3f4f6 !important;
}

.view-btn:hover {
  color: #3b82f6 !important;
  background: #eff6ff !important;
}
.approve-btn {
  color: #16a34a !important;
}
.approve-btn:hover {
  background: #f0fdf4 !important;
  color: #16a34a !important;
}
.reject-btn {
  color: #dc2626 !important;
}
.reject-btn:hover {
  background: #fef2f2 !important;
  color: #dc2626 !important;
}
.edit-btn:hover {
  color: #ca8a04 !important;
  background: #fefce8 !important;
}
.delete-btn {
  color: #dc2626 !important;
}
.delete-btn:hover {
  background: #fef2f2 !important;
}
.restore-btn {
  color: #16a34a !important;
}
.restore-btn:hover {
  background: #f0fdf4 !important;
}

/* ==============================
   LOADING / EMPTY STATES
============================== */
.loading-state,
.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 20px;
  gap: 14px;
}

.loading-text {
  font-size: 13px;
  color: #9ca3af;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56px 20px;
  text-align: center;
  gap: 6px;
}

.empty-title,
.empty-state-title {
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  margin-top: 6px;
}

.empty-subtitle,
.empty-state-sub {
  font-size: 13px;
  color: #9ca3af;
  margin-bottom: 8px;
}

/* ==============================
   MODALS
============================== */
.modal-card {
  width: 560px;
  max-width: 95vw;
  max-height: 90vh;
  border-radius: 14px !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px !important;
  background: #ffffff;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-icon {
  font-size: 24px;
  color: #3b82f6;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.modal-subtitle {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.modal-close-btn {
  color: #9ca3af !important;
  flex-shrink: 0;
}

.modal-close-btn:hover {
  background: #f3f4f6 !important;
  color: #374151 !important;
}

.modal-content {
  padding: 20px !important;
  overflow-y: auto;
  flex: 1;
}

/* ==============================
   FORM SECTIONS
============================== */
.form-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f3f5;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.col-span-2 {
  grid-column: 1 / -1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #f1f3f5;
  margin-top: 8px;
}

/* Detail grid cards */
.detail-sections,
.detail-section {
  margin-bottom: 16px;
}

.detail-grid-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.detail-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px 14px;
  border: 1px solid #f1f3f5;
}

.detail-card-full {
  grid-column: 1 / -1;
}

.detail-card-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.detail-card-value {
  font-size: 13px;
  color: #111827;
  font-weight: 500;
  word-break: break-word;
}

/* Confirm dialogs */
.confirm-dialog,
.terminate-dialog,
.restore-dialog {
  width: 400px;
  max-width: 95vw;
  border-radius: 14px !important;
}

.confirm-actions,
.terminate-actions,
.restore-actions {
  padding: 12px 16px !important;
  border-top: 1px solid #f1f3f5;
  gap: 8px;
}

/* Filters section */
.filters-section {
  margin-bottom: 16px;
}

.filters-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  padding: 16px 20px;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.filters-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.clear-btn {
  color: #6b7280 !important;
  font-size: 12px;
}

.filters-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: end;
  justify-content: flex-start;
}

.filter-input :deep(.q-field__control),
.filter-input .q-field__control {
  border-radius: 8px;
}

/* Pagination */
.pagination-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid #f1f3f5;
  flex-wrap: wrap;
  gap: 8px;
}

.pagination-info {
  font-size: 13px;
  color: #6b7280;
}

/* Sort / filter selects */
.sort-select,
.type-select,
.site-select,
.status-filter {
  min-width: 160px;
}

/* Employee info cell */
.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.employee-name-block {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.employee-name {
  font-weight: 600;
  color: #111827;
  font-size: 13px;
}

.email-link {
  font-size: 11px;
  color: #6b7280;
  text-decoration: none;
}

.email-link:hover {
  color: #3b82f6;
  text-decoration: underline;
}

/* Role chip */
.role-chip {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  white-space: nowrap;
}

/* Primary action buttons in header */
.add-employee-btn,
.add-announcement-btn,
.export-btn,
.invite-btn {
  height: 36px;
  border-radius: 8px !important;
  font-weight: 500;
  text-transform: none;
  white-space: nowrap;
  padding: 0 16px;
  font-size: 13px;
}

/* ==============================
   RESPONSIVE
============================== */
@media (max-width: 900px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .stats-amount {
    font-size: 22px;
  }
}

@media (max-width: 768px) {
  .modal-card {
    max-width: calc(100vw - 20px);
    max-height: calc(100vh - 24px);
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .col-span-2 {
    grid-column: span 1;
  }

  .detail-grid-cards {
    grid-template-columns: 1fr;
  }

  .detail-card-full {
    grid-column: span 1;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions .q-btn {
    width: 100%;
  }

  .pagination-section {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* Attendance-specific */

/* Header Section */

.page-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

/* Stats Section */

.stats-sublabel {
  font-size: 10px;
  color: #64748b;
}

/* Filters Section */

/* Table Section */

.add-attendance-btn {
  height: 36px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px !important;
  text-transform: none;
  white-space: nowrap;
  padding: 0 16px;
}

/* ===================================
   IMPROVED TABLE STYLES - FIXED ALIGNMENT
   =================================== */

.table-wrapper {
  overflow-x: visible;
  overflow-y: visible;
}

.attendance-table {
  background: white;
  width: 100%;
  table-layout: fixed;
}

.attendance-table :deep(.q-table__bottom-border),
.attendance-table :deep(thead tr:last-child th),
.attendance-table :deep(.q-table__top),
.attendance-table :deep(.q-table__bottom) {
  border: none !important;
}

.attendance-table :deep(.q-table) {
  border-bottom: none !important;
}

/* Fixed column widths — all 10 cols fit within 100% */
.employee-col {
  width: 15%;
}
.site-col {
  width: 11%;
}
.employment-status-col {
  width: 9%;
}
.cost-center-col {
  width: 10%;
}
.time-col {
  width: 9%;
}
.photo-col {
  width: 6%;
}
.source-mini-col {
  width: 8%;
}

/* Attendance table cell sizing — bigger text, still fits */
.attendance-table .table-header-cell {
  padding: 11px 10px !important;
  font-size: 11px !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attendance-table .table-body-cell {
  padding: 10px 10px !important;
  font-size: 13px !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attendance-table .employee-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
  display: block;
}

.attendance-table .time-badge {
  font-size: 12px;
  padding: 4px 8px;
  min-width: 72px;
}

.attendance-table .selfie-thumbnail {
  width: 34px;
  height: 34px;
}

.attendance-table .cost-center-badge {
  font-size: 12px;
  padding: 3px 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: block;
}

.attendance-table .employment-status-badge {
  font-size: 11px;
  padding: 3px 8px;
}

.attendance-table .source-mini-badge {
  font-size: 11px;
  padding: 3px 8px;
}

.attendance-table .employee-avatar {
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  font-size: 12px !important;
  flex-shrink: 0;
}

.employee-avatar {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-weight: 600;
  width: 34px;
  height: 34px;
  font-size: 14px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.time-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  background: #f1f5f9;
  color: #64748b;
  white-space: nowrap;
  min-width: 80px;
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

/* Table Footer */
.table-footer {
  background: #f8fafc;
  padding: 14px 16px;
  border-top: none;
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

/* ===================================
   COMPACT DIALOG STYLES
   =================================== */

.compact-dialog-card {
  width: 100%;
  max-width: 550px;
  border-radius: 12px;
}

.compact-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
  gap: 12px;
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a202c;
  line-height: 1.3;
}

.dialog-subtitle {
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
}

.compact-dialog-body {
  padding: 16px 20px;
  max-height: 70vh;
  overflow-y: auto;
}

.compact-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-field {
  margin-bottom: 0;
}

.schedule-banner {
  padding: 10px 12px;
  margin: 8px 0;
}

.schedule-compact {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.schedule-compact-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.working-hours-compact {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  margin-top: 8px;
}

.working-hours-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.compact-dialog-actions {
  padding: 12px 20px;
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

.clickable-avatar {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.clickable-avatar:hover {
  transform: scale(1.1);
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-initials {
  font-weight: 600;
  font-size: 14px;
}

.employee-photo-dialog-card {
  width: 100%;
  max-width: 700px;
  border-radius: 12px;
}

.employee-photo-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.employee-photo-title {
  display: flex;
  align-items: center;
  flex: 1;
}

.employee-photo-body {
  padding: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  background: #f8fafc;
}

.employee-full-image {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 12px;
  object-fit: contain;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.no-photo-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
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

/* Date Navigation */
.date-nav-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.date-nav-btn {
  color: #64748b;
  flex-shrink: 0;
}

.date-nav-input {
  width: 175px;
}

/* Focus States */

.dialog-btn:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* ===================================
   RESPONSIVE BREAKPOINTS
   =================================== */

/* 1440px - Large Desktop */
/* 1024px - Desktop / Tablet Landscape */
@media (max-width: 1024px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .filters-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .table-wrapper {
    overflow-x: visible;
  }

  .attendance-table {
    width: 100%;
  }

  .table-header-cell {
    font-size: 11px;
    padding: 10px 4px;
  }

  .table-body-cell {
    font-size: 11px;
    padding: 8px 4px;
  }

  .compact-dialog-card {
    max-width: 95vw;
  }

  .table-header {
    flex-wrap: wrap;
    gap: 10px;
  }

  .table-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .modern-table-container {
    margin: 0 14px 14px 14px;
  }
}

/* 768px - Tablet Portrait */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 14px;
  }

  .page-header {
    padding: 12px 14px;
    margin-bottom: 12px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .header-actions {
    justify-content: space-between;
  }

  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }

  .stats-card {
    padding: 14px;
  }

  .stats-amount {
    font-size: 22px;
  }

  .stats-icon-wrapper {
    width: 38px;
    height: 38px;
  }

  .filters-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .table-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .table-actions {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
  }

  .add-attendance-btn {
    flex: 1;
  }

  .site-filter-dropdown {
    flex: 1;
  }

  .modern-table-container {
    margin: 0 10px 10px 10px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .table-wrapper {
    overflow-x: visible;
  }

  .attendance-table {
    width: 100%;
  }

  .table-header-cell {
    font-size: 10px;
    padding: 8px 3px;
    white-space: normal;
    word-break: break-word;
  }

  .table-body-cell {
    font-size: 10px;
    padding: 7px 3px;
  }

  .selfie-thumbnail {
    width: 28px;
    height: 28px;
  }

  .employee-avatar {
    width: 26px !important;
    height: 26px !important;
  }

  .source-mini-badge,
  .source-badge {
    font-size: 9px;
    padding: 2px 4px;
  }

  .table-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .footer-info {
    justify-content: center;
  }

  .pagination-controls {
    justify-content: center;
  }

  .date-picker-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .compact-dialog-card {
    max-width: 90vw;
    margin: 12px;
  }

  .employee-photo-dialog-card {
    max-width: 90vw;
    margin: 16px;
  }

  .employee-photo-body {
    padding: 24px;
    min-height: 350px;
  }
}

/* 480px - Small Mobile */
@media (max-width: 480px) {
  .dashboard-container {
    padding: 10px;
  }

  .page-title {
    font-size: 18px;
  }

  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  .stats-card {
    padding: 12px;
  }

  .stats-icon-wrapper {
    width: 34px;
    height: 34px;
  }

  .stats-amount {
    font-size: 20px;
  }

  .stats-label {
    font-size: 11px;
  }

  .filters-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .filters-card {
    padding: 10px;
  }

  .table-header {
    padding: 10px;
  }

  .table-actions {
    flex-direction: column;
    gap: 8px;
  }

  .add-attendance-btn {
    width: 100%;
  }

  .site-filter-dropdown {
    width: 100%;
  }

  .modern-table-container {
    margin: 0 8px 8px 8px;
  }

  .compact-dialog-header {
    padding: 14px 16px;
  }

  .compact-dialog-body {
    padding: 14px 16px;
    max-height: 60vh;
  }

  .compact-dialog-actions {
    padding: 10px 16px;
  }

  .dialog-title {
    font-size: 16px;
  }

  .employee-photo-header {
    padding: 16px;
  }

  .employee-photo-body {
    padding: 20px;
    min-height: 300px;
  }
}

/* Prevent horizontal scroll */
body {
  overflow-x: hidden;
}

.attendance-dashboard {
  overflow-x: hidden;
}

/* Inline Edit Dialog */
.inline-edit-card {
  width: 100%;
  max-width: 320px;
  border-radius: 12px;
}

.inline-edit-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 14px 16px;
}

/* Selected date display in Add dialog */
.selected-date-display {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #f0f4ff;
  border-radius: 8px;
  border: 1px solid #c7d7f9;
}

/* Clickable time badge */
.time-editable {
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.time-editable:hover {
  filter: brightness(0.93);
  transform: scale(1.04);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.time-editable:hover .edit-icon {
  opacity: 1;
}

.edit-icon {
  opacity: 1;
  transition: opacity 0.15s ease;
  color: inherit;
}

/* Column widths defined above in attendance-table section */

.source-mini-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.site-name-text {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #374151;
  font-weight: 500;
}

.cost-center-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.employment-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  text-transform: capitalize;
}

.employment-status-regular {
  background: #d1fae5;
  color: #065f46;
}

.employment-status-probationary {
  background: #fef3c7;
  color: #92400e;
}

.employment-status-contractual {
  background: #dbeafe;
  color: #1e40af;
}

.employment-status-parttime {
  background: #ede9fe;
  color: #5b21b6;
}

.employment-status-default {
  background: #f1f5f9;
  color: #475569;
}
</style>
