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
            <q-icon name="phone_android" class="stats-icon" />
          </div>
          <div class="stats-content">
            <q-skeleton v-if="loading" type="text" class="text-h5" />
            <div v-else class="stats-amount">{{ stats[1].count }}</div>
            <div class="stats-label">App</div>
          </div>
        </div>

        <div class="stats-card business-card">
          <div class="stats-icon-wrapper">
            <q-icon name="computer" class="stats-icon" />
          </div>
          <div class="stats-content">
            <q-skeleton v-if="loading" type="text" class="text-h5" />
            <div v-else class="stats-amount">{{ stats[2].count }}</div>
            <div class="stats-label">Terminal</div>
          </div>
        </div>

        <div class="stats-card custom-card">
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
                      <img
                        v-if="scope.opt.employee?.photo || scope.opt.employee?.image"
                        :src="scope.opt.employee?.photo || scope.opt.employee?.image"
                        alt="Employee"
                        style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%"
                      />
                      <span v-else>{{ scope.opt.label.charAt(0) }}</span>
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ scope.opt.label }}</q-item-label>
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
            <q-select
              dense
              outlined
              label="Filter by Site"
              v-model="filters.site"
              :options="siteOptions"
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
                <q-icon name="location_on" />
              </template>
            </q-select>

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

        <!-- Attendance Table - IMPROVED STRUCTURE -->
        <div class="modern-table-container">
          <div class="table-wrapper">
            <q-table
              :rows="attendanceData"
              :columns="columns"
              row-key="id"
              flat
              :loading="loading"
              class="attendance-table"
              hide-pagination
              :rows-per-page-options="[0]"
              :grid="$q.screen.xs"
              table-header-class="table-header-custom"
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
                  </q-card>
                </div>
              </template>

              <template v-slot:header="props">
                <q-tr :props="props" class="table-header-row">
                  <q-th class="table-header-cell employee-col">Employee</q-th>
                  <q-th class="table-header-cell site-col">Site</q-th>
                  <q-th class="table-header-cell cost-center-col">Cost Center</q-th>
                  <q-th class="table-header-cell time-col">Time In</q-th>
                  <q-th class="table-header-cell photo-col">Photo</q-th>
                  <q-th class="table-header-cell source-mini-col">In Source</q-th>
                  <q-th class="table-header-cell time-col">Time Out</q-th>
                  <q-th class="table-header-cell photo-col">Photo</q-th>
                  <q-th class="table-header-cell source-mini-col">Out Source</q-th>
                </q-tr>
              </template>

              <template v-slot:body="props">
                <q-tr :props="props" class="table-body-row">
                  <q-td class="table-body-cell employee-col">
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
                  <q-td class="table-body-cell site-col">
                    <div v-if="props.row.site" class="site-name-text">
                      <q-icon name="location_on" size="12px" class="q-mr-xs text-grey-6" />
                      {{ getSiteName(props.row.site) }}
                    </div>
                    <span v-else class="no-photo">-</span>
                  </q-td>
                  <!-- Cost Center -->
                  <q-td class="table-body-cell cost-center-col">
                    <div
                      class="cost-center-badge time-editable"
                      @click="openCostCenterInlineEdit(props.row)"
                      title="Click to edit cost center"
                    >
                      <q-icon name="account_balance_wallet" size="12px" class="q-mr-xs" />
                      {{ getCostCenterName(props.row.cost_center) || 'None' }}
                      <q-icon name="edit" size="10px" class="edit-icon q-ml-xs" />
                    </div>
                  </q-td>
                  <!-- Time In — clickable inline edit -->
                  <q-td class="table-body-cell time-col">
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
                  <q-td class="table-body-cell photo-col">
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
                  <q-td class="table-body-cell source-mini-col">
                    <div
                      class="source-mini-badge"
                      :class="getSourceClass(props.row.time_in_source || props.row.source)"
                    >
                      {{ formatSource(props.row.time_in_source || props.row.source) }}
                    </div>
                  </q-td>
                  <!-- Time Out — clickable inline edit -->
                  <q-td class="table-body-cell time-col">
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
                  <q-td class="table-body-cell photo-col">
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
                  <q-td class="table-body-cell source-mini-col">
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
              <span class="total-records">{{ attendanceData.length }} Records</span>
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

            <!-- Cost Center Dropdown -->
            <q-select
              filled
              dense
              v-model="newRecord.cost_center_id"
              :options="costCenterOptions"
              label="Cost Center"
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
                <q-icon name="account_balance_wallet" size="xs" />
              </template>
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey">No cost centers found</q-item-section>
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
import { api } from 'src/boot/axios'

const $q = useQuasar()

// Template refs
const employeeSelectRef = ref(null)

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

// Inline time edit state
const showInlineEditDialog = ref(false)
const inlineEdit = ref({
  record: null,
  field: '', // 'time_in' or 'time_out'
  value: '', // HH:MM format
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

// State for schedule data
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
  source: '',
  employee: '',
  business_owner: '',
  site: '',
})

// Date range handling
const dateRange = ref(today)
const currentDate = ref(today)

const tempDateRange = ref({
  from: '',
  to: '',
})

// ================= DATE NAVIGATION =================
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

// Filter options
const employeeOptions = ref([])
const businessOwnerOptions = ref([])
const siteOptions = ref([])
const costCenterOptions = ref([])
const sourceOptions = ref([
  { label: 'App', value: 'app' },
  { label: 'Terminal', value: 'terminal' },
  { label: 'System', value: 'system' },
  { label: 'Manual', value: 'manual' },
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
  const app = data.filter((item) => item.source === 'app').length
  const terminal = data.filter((item) => item.source === 'terminal').length
  const manual = data.filter((item) => item.source === 'manual').length
  const system = data.filter((item) => item.source === 'system').length

  return [
    { label: 'Total Records', count: total },
    { label: 'App', count: app },
    { label: 'Terminal', count: terminal },
    { label: 'System', count: system },
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
  {
    name: 'select',
    label: '',
    align: 'center',
    field: 'id',
    sortable: false,
  },
  {
    name: 'sl_no',
    label: 'SL No',
    align: 'center',
    field: 'id',
    sortable: false,
  },
  {
    name: 'employee',
    label: 'Employee',
    align: 'left',
    field: 'employee',
    sortable: true,
  },
  {
    name: 'date',
    label: 'Date',
    align: 'center',
    field: 'date',
    sortable: true,
  },
  {
    name: 'site',
    label: 'Site',
    align: 'left',
    field: 'site',
    sortable: true,
  },
  {
    name: 'time_in',
    label: 'Time In',
    align: 'center',
    field: 'time_in',
    sortable: true,
  },
  {
    name: 'time_in_photo',
    label: 'Photo',
    align: 'center',
    field: 'time_in_selfie',
    sortable: false,
  },
  {
    name: 'time_in_source',
    label: 'In Source',
    align: 'center',
    field: 'source',
    sortable: false,
  },
  {
    name: 'time_out',
    label: 'Time Out',
    align: 'center',
    field: 'time_out',
    sortable: true,
  },
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
  {
    name: 'actions',
    label: 'Actions',
    align: 'center',
    field: 'actions',
    sortable: false,
  },
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

    const response = await api.get(
      `https://staging.wageyapp.com/organization/scheduled/${companyId.value}/${date}/`,
    )

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

  // Only fetch schedule if we have a valid date — prevents 400 errors
  const date = newRecord.value.date
  if (employeeId && date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    fetchEmployeeSchedule(employeeId, date)
  }
}

function onAddDialogDateChange(val) {
  if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return
  // Re-fetch schedule when date changes and employee is already selected
  if (newRecord.value.employee) {
    fetchEmployeeSchedule(newRecord.value.employee, val)
  }
}

function onEmployeeDropdownClick() {
  if (newRecord.value.employee) {
    newRecord.value.employee = ''
    employeeSchedule.value = null
    scheduleError.value = null
    // Reset input and reload full employee list
    nextTick(() => {
      employeeSelectRef.value?.updateInputValue('', true)
    })
  }
}

function formatScheduleTime(timeString) {
  if (!timeString) return '-'
  try {
    // Handle plain time strings like "08:00:00" or "08:00"
    const timeOnlyRegex = /^(\d{1,2}):(\d{2})(:\d{2})?$/
    if (timeOnlyRegex.test(timeString)) {
      const [hours, minutes] = timeString.split(':').map(Number)
      const date = new Date(1970, 0, 1, hours, minutes)
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    }
    // Handle full ISO datetime strings
    const date = new Date(timeString)
    if (isNaN(date.getTime())) return timeString
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

  const inDate = new Date(0, 0, 0, inHours, inMinutes)
  let outDate = new Date(0, 0, 0, outHours, outMinutes)

  let diff = (outDate - inDate) / 1000 / 60

  // Auto-detect overnight shift: if time out < time in, add 24 hours
  if (diff < 0) {
    diff += 24 * 60
  }

  const hours = Math.floor(diff / 60)
  const minutes = Math.floor(diff % 60)

  return `${hours}h ${minutes}m`
}

function getEmployeePhoto(employee) {
  if (!employee) return null

  // If employee is an object, check for photo/image fields
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
  function debugAttendanceData() {
    console.log('=== ATTENDANCE DEBUG INFO ===')
    console.log('Total records in attendanceData:', attendanceData.value.length)
    console.log('Active filters:', filters.value)
    console.log('Sample record:', attendanceData.value[0])
    console.log('Employees loaded:', employees.value.length)
    console.log('Company ID:', companyId.value)
    console.log('===========================')
  }
  // If employee is ID, find in employees array
  const foundEmployee = employees.value.find((emp) => emp.id === employee || emp.uuid === employee)

  return foundEmployee
    ? foundEmployee.photo ||
        foundEmployee.image ||
        foundEmployee.profile_picture ||
        foundEmployee.profile_photo ||
        foundEmployee.avatar ||
        foundEmployee.picture ||
        null
    : null
}

function viewEmployeePhoto(employee) {
  if (!employee) return

  selectedEmployeeName.value = getEmployeeName(employee)
  selectedEmployeePhoto.value = getEmployeePhoto(employee)
  showEmployeePhotoDialog.value = true
}
function getYearMonth() {
  let baseDate = filters.value.date_from ? new Date(filters.value.date_from) : new Date()

  const year = baseDate.getFullYear()
  const month = String(baseDate.getMonth() + 1).padStart(2, '0')

  return { year, month }
}

// ================= API FUNCTIONS =================
async function fetchAttendanceData(params = {}) {
  if (!companyId.value) {
    showErrorNotification('Company ID not found. Please log in again.')
    return
  }

  loading.value = true

  try {
    const { year, month } = getYearMonth()

    // Build URL with site filter if present
    let url = `https://staging.wageyapp.com/attendance/company/${companyId.value}/${year}/${month}/`

    if (filters.value.site) {
      url += `?site=${filters.value.site}`
    }

    console.log('🔍 Fetching attendance with URL:', url)

    const response = await api.get(url, {
      params: {
        page: pagination.value.page,
        limit: pagination.value.rowsPerPage,
        ...params,
      },
    })

    // Extract data from response
    let data = Array.isArray(response.data) ? response.data : response.data.data
    data = data || []

    console.log(`📊 Raw data received: ${data.length} records`)

    // Apply client-side filters
    let filteredData = [...data] // Create a copy

    // Filter by employee
    if (filters.value.employee) {
      filteredData = filteredData.filter((record) => {
        const employeeId =
          typeof record.employee === 'object'
            ? record.employee.uuid || record.employee.id
            : record.employee

        return employeeId === filters.value.employee
      })
      console.log(`🔍 After employee filter: ${filteredData.length} records`)
    }

    // Filter by source
    if (filters.value.source) {
      filteredData = filteredData.filter((record) => record.source === filters.value.source)
      console.log(`🔍 After source filter: ${filteredData.length} records`)
    }

    // Filter by business owner
    if (filters.value.business_owner) {
      filteredData = filteredData.filter((record) => {
        const ownerId =
          typeof record.business_owner === 'object'
            ? record.business_owner.uuid || record.business_owner.id
            : record.business_owner

        return ownerId === filters.value.business_owner
      })
      console.log(`🔍 After business owner filter: ${filteredData.length} records`)
    }

    // Filter by date range if set
    if (filters.value.date_from && filters.value.date_to) {
      filteredData = filteredData.filter((record) => {
        const recordDate = new Date(record.date)
        const fromDate = new Date(filters.value.date_from)
        const toDate = new Date(filters.value.date_to)
        return recordDate >= fromDate && recordDate <= toDate
      })
      console.log(`🔍 After date range filter: ${filteredData.length} records`)
    }

    attendanceData.value = filteredData
    pagination.value.rowsNumber = filteredData.length

    console.log(`✅ Final displayed records: ${attendanceData.value.length}`)

    // Show message if no data after filtering
    if (filteredData.length === 0 && data.length > 0) {
      showErrorNotification('No records match the current filters. Try adjusting your filters.')
    } else if (filteredData.length === 0) {
      showErrorNotification('No attendance records found for this period.')
    }
  } catch (error) {
    console.error('❌ Error fetching attendance:', error)
    console.error('📍 Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    })

    let errorMessage = 'Failed to load attendance data'
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail
    }

    showErrorNotification(errorMessage)
    attendanceData.value = []
  } finally {
    loading.value = false
  }
}
async function filterByEmployeeId(employeeId) {
  filters.value.employee = employeeId
  pagination.value.page = 1
  await fetchAttendanceData()
}
async function fetchSites() {
  if (!companyId.value) {
    console.error('❌ Company ID is missing:', companyId.value)
    showErrorNotification('Company ID not found. Please log in again.')
    return
  }

  console.log('🔍 Fetching sites for company:', companyId.value)
  filtersLoading.value = true

  try {
    const response = await api.get('https://staging.wageyapp.com/organization/sites/', {
      params: { company: companyId.value },
    })

    console.log('✅ Sites API Response:', response.data)

    // Handle response structure
    const data = response.data.data || response.data || []

    console.log('📊 Processed sites data:', data)

    // Map sites to options format
    siteOptions.value = Array.isArray(data)
      ? data.map((site) => ({
          label: site.name || site.site_name || site.title || `Site ${site.id}`,
          value: site.id || site.site_id || site.uuid,
          site: site,
        }))
      : []

    console.log('✅ Site options ready:', siteOptions.value)

    if (siteOptions.value.length === 0) {
      console.warn('⚠️ No sites found for company:', companyId.value)
    }
  } catch (error) {
    console.error('❌ Error fetching sites:', error)
    console.error('Error response:', error.response)

    let errorMessage = 'Failed to load sites'
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail
    }

    showErrorNotification(errorMessage)
    siteOptions.value = []
  } finally {
    filtersLoading.value = false
  }
}

async function fetchCostCenters() {
  if (!companyId.value) return

  try {
    const response = await api.get('https://staging.wageyapp.com/payroll/cost-centers/', {
      params: { company: companyId.value },
    })

    const data = response.data.data || response.data || []

    costCenterOptions.value = Array.isArray(data)
      ? data.map((cc) => ({
          label: cc.name || `Cost Center ${cc.id}`,
          value: cc.id,
          costCenter: cc,
        }))
      : []

    console.log('✅ Cost center options ready:', costCenterOptions.value)
  } catch (error) {
    console.error('❌ Error fetching cost centers:', error)
    costCenterOptions.value = []
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
    const response = await api.get(
      `https://staging.wageyapp.com/user/companies/${companyId.value}/employees/`,
    )
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
// ================= NEW SINGLE SUBMIT FUNCTION FOR BOTH TIME IN AND TIME OUT =================
async function submitAttendance() {
  if (!companyId.value) {
    showErrorNotification('Company ID not found. Please log in again.')
    return
  }

  if (!newRecord.value.employee) {
    showErrorNotification('Please select an employee')
    return
  }

  if (!newRecord.value.time_in || !newRecord.value.time_out) {
    showErrorNotification('Please enter both time in and time out')
    return
  }

  // Build timestamps — auto-detect overnight/graveyard shift
  const timeIn = new Date(`${newRecord.value.date}T${newRecord.value.time_in}:00`)
  let timeOut = new Date(`${newRecord.value.date}T${newRecord.value.time_out}:00`)

  // If time out is earlier than time in, the shift crosses midnight — add 1 day
  if (timeOut <= timeIn) {
    timeOut.setDate(timeOut.getDate() + 1)
  }

  // Check for schedule if needed
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

    // ✅ Use the adjusted timeOut for timestamp
    const timeInTimestamp = timeIn.toISOString()
    const timeOutTimestamp = timeOut.toISOString()

    console.log('📤 Sending Time In data:', {
      source: 'manual',
      employee_id: employeeUUID,
      timestamp: timeInTimestamp,
    })

    // First API call - Time In
    const timeInResponse = await api.post(
      `https://staging.wageyapp.com/attendance/log/${companyId.value}/`,
      {
        source: 'manual',
        time_in_source: 'manual',
        employee_id: employeeUUID,
        timestamp: timeInTimestamp,
        ...(newRecord.value.site_id && { site_id: newRecord.value.site_id }),
        ...(newRecord.value.cost_center_id != null && {
          cost_center: newRecord.value.cost_center_id,
        }),
      },
    )

    console.log('✅ Time In recorded:', timeInResponse.data)

    // Small delay to ensure proper sequencing
    await new Promise((resolve) => setTimeout(resolve, 500))

    console.log('📤 Sending Time Out data:', {
      source: 'manual',
      employee_id: employeeUUID,
      timestamp: timeOutTimestamp,
    })

    // Second API call - Time Out
    const timeOutResponse = await api.post(
      `https://staging.wageyapp.com/attendance/log/${companyId.value}/`,
      {
        source: 'manual',
        time_out_source: 'manual',
        employee_id: employeeUUID,
        timestamp: timeOutTimestamp,
        ...(newRecord.value.site_id && { site_id: newRecord.value.site_id }),
        ...(newRecord.value.cost_center_id != null && {
          cost_center: newRecord.value.cost_center_id,
        }),
      },
    )

    console.log('✅ Time Out recorded:', timeOutResponse.data)

    showSuccessNotification(`Attendance completed! Total hours: ${calculateWorkingHours()}`)

    closeAddDialog()
    await fetchAttendanceData()
  } catch (error) {
    console.error('❌ Error recording attendance:', error)
    let errorMessage = 'Failed to record attendance'

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

// ================= INLINE TIME EDIT =================
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
  if (!companyId.value) {
    showErrorNotification('Company ID not found.')
    return
  }

  inlineEdit.value.saving = true

  try {
    const record = inlineEdit.value.record
    const field = inlineEdit.value.field
    const date = record.date

    // Build the updated timestamp
    let newTimestamp = new Date(`${date}T${inlineEdit.value.value}:00`).toISOString()

    // Get existing timestamps to keep the other field intact
    const existingTimeIn = field === 'time_in' ? newTimestamp : record.time_in
    const existingTimeOut = field === 'time_out' ? newTimestamp : record.time_out

    // Handle overnight: if time_out < time_in, push time_out to next day
    let timeOutTimestamp = existingTimeOut
    if (existingTimeIn && existingTimeOut) {
      const tIn = new Date(existingTimeIn)
      let tOut = new Date(existingTimeOut)
      if (tOut <= tIn) {
        tOut.setDate(tOut.getDate() + 1)
        timeOutTimestamp = tOut.toISOString()
      }
    }

    const payload = {
      time_in: existingTimeIn,
      time_out: timeOutTimestamp,
      source: record.source || 'admin',
    }

    console.log(`📤 Inline updating ${field}:`, payload)

    await api.put(
      `https://staging.wageyapp.com/attendance/log-update/${companyId.value}/${record.id}/`,
      payload,
    )

    showSuccessNotification(`${field === 'time_in' ? 'Time In' : 'Time Out'} updated successfully`)
    closeInlineEdit()
    await fetchAttendanceData()
  } catch (error) {
    console.error('❌ Inline edit error:', error)
    const data = error.response?.data
    const msg =
      typeof data === 'string' ? data : data?.detail || data?.message || 'Failed to update'
    showErrorNotification(msg)
  } finally {
    inlineEdit.value.saving = false
  }
}

// ================= INLINE COST CENTER EDIT =================
function openCostCenterInlineEdit(row) {
  // cost_center may be an object {id, name} or a plain string/id
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
  if (!companyId.value) {
    showErrorNotification('Company ID not found.')
    return
  }

  costCenterInlineEdit.value.saving = true

  try {
    const record = costCenterInlineEdit.value.record

    const payload = {
      time_in: record.time_in || null,
      time_out: record.time_out || null,
      time_in_source: record.time_in_source || record.source || 'admin',
      time_out_source: record.time_out_source || record.source || 'admin',
      source: record.source || 'admin',
      cost_center: costCenterInlineEdit.value.value ?? null,
    }

    console.log('📤 Inline updating cost center:', payload)

    await api.put(
      `https://staging.wageyapp.com/attendance/log-update/${companyId.value}/${record.id}/`,
      payload,
    )

    showSuccessNotification('Cost center updated successfully')
    closeCostCenterInlineEdit()
    await fetchAttendanceData()
  } catch (error) {
    console.error('❌ Cost center inline edit error:', error)
    const data = error.response?.data
    const msg =
      typeof data === 'string'
        ? data
        : data?.detail || data?.message || 'Failed to update cost center'
    showErrorNotification(msg)
  } finally {
    costCenterInlineEdit.value.saving = false
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

    // Construct timestamps using the ORIGINAL date (date field is readonly)
    // Only time_in and time_out are being updated
    let timeInTimestamp = null
    let timeOutTimestamp = null

    if (editingRecord.value.time_in) {
      const timeInDate = new Date(`${editingRecord.value.date}T${editingRecord.value.time_in}:00`)
      timeInTimestamp = timeInDate.toISOString()
    }

    if (editingRecord.value.time_out) {
      let timeOutDate = new Date(`${editingRecord.value.date}T${editingRecord.value.time_out}:00`)
      // Auto-detect overnight: if time out < time in, shift crosses midnight
      if (
        editingRecord.value.time_in &&
        timeOutDate <= new Date(`${editingRecord.value.date}T${editingRecord.value.time_in}:00`)
      ) {
        timeOutDate.setDate(timeOutDate.getDate() + 1)
      }
      timeOutTimestamp = timeOutDate.toISOString()
    }

    // Only send time_in, time_out, source, cost_center - date is NOT included in update
    const attendanceData = {
      time_in: timeInTimestamp,
      time_out: timeOutTimestamp,
      time_in_source: editingRecord.value.time_in_source || editingRecord.value.source || 'admin',
      time_out_source: editingRecord.value.time_out_source || editingRecord.value.source || 'admin',
      source: editingRecord.value.source || 'admin',
      ...(editingRecord.value.cost_center_id != null && {
        cost_center: editingRecord.value.cost_center_id,
      }),
    }

    console.log('📤 Sending Update data:', attendanceData)
    console.log(
      '🔗 Update URL:',
      `https://staging.wageyapp.com/attendance/log-update/${companyId.value}/${editingRecord.value.id}/`,
    )

    // Try the exact endpoint from your API docs
    const response = await api.put(
      `https://staging.wageyapp.com/attendance/log-update/${companyId.value}/${editingRecord.value.id}/`,
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
    await api.post(`https://staging.wageyapp.com/attendance/batch-delete/`, { ids })

    showSuccessNotification(`${records.length} records deleted successfully`)
    selected.value = []
    await fetchAttendanceData()
  } catch (error) {
    console.error('Error batch deleting:', error)
    showErrorNotification('Failed to delete records')
  }
}
async function filterByEmployee(employeeId) {
  filters.value.employee = employeeId
  pagination.value.page = 1
  await fetchAttendanceData()
}
// ================= DIALOG HANDLERS =================
function openAddDialog() {
  // Date is always auto-filled from the active calendar filter (currentDate)
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

// Keep newRecord.date in sync if the calendar filter changes while dialog is open
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
  // Match cost_center — may be object {id, name} or a plain string/name
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
    date_from: today,
    date_to: today,
    source: '',
    employee: '',
    business_owner: '',
    site: '',
  }
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
function getSiteName(site) {
  if (!site) return ''
  let name = ''
  if (typeof site === 'object') {
    name = site.name || site.site_name || site.title || ''
  } else {
    name = String(site)
  }
  // Strip anything in parentheses and clean up extra whitespace
  return name.replace(/\s*\(.*?\)\s*/g, '').trim()
}

function getCostCenterName(costCenter) {
  if (!costCenter) return ''
  if (typeof costCenter === 'object') {
    return costCenter.name || costCenter.cost_center_name || ''
  }
  return String(costCenter)
}

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
    // Always fetch sites for the company
    console.log('🏢 Fetching sites for company:', companyId.value)
    await fetchSites()

    console.log('💰 Fetching cost centers...')
    await fetchCostCenters()

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
  border-radius: 8px;
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 8px;
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
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.stats-icon {
  font-size: 14px;
  color: #374151;
}

.stats-content {
  flex: 1;
  min-width: 0;
}

.stats-amount {
  font-size: 16px;
  font-weight: 700;
  color: #1a202c;
  line-height: 1;
  margin-bottom: 1px;
}

.stats-label {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0;
}

.stats-sublabel {
  font-size: 10px;
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

/* ===================================
   IMPROVED TABLE STYLES - FIXED ALIGNMENT
   =================================== */

.modern-table-container {
  border: 2px solid #3b82f6;
  border-radius: 10px;
  overflow: hidden;
  margin: 0 16px 16px 16px;
}

.table-wrapper {
  overflow-x: visible;
  overflow-y: visible;
}

.attendance-table {
  background: white;
  width: 100%;
  table-layout: auto;
  border-collapse: collapse;
}

/* Percentage-based column widths — no fixed min-widths so table always fits */
.checkbox-col {
  width: 3%;
}

.sl-col {
  width: 4%;
}

.employee-col {
  width: 14%;
}

.date-col {
  width: 7%;
}

.time-col {
  width: 7%;
}

.photo-col {
  width: 5%;
}

.source-col {
  width: 7%;
}

.actions-col {
  width: 6%;
}

.table-header-row {
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.table-header-cell {
  padding: 12px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  text-align: center;
  border: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}

.table-body-row {
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.table-body-row:hover {
  background: #f8fafc;
}

.table-body-cell {
  padding: 10px 8px;
  font-size: 13px;
  color: #374151;
  border: none;
  vertical-align: middle;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 6px;
  justify-content: flex-start;
  min-width: 0;
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

.employee-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  line-height: 1.4;
  letter-spacing: 0.01em;
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
  flex: 1;
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
    padding: 24px;
    max-width: 1600px;
    margin: 0 auto;
  }

  .stats-section {
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }

  .stats-card {
    padding: 20px;
  }

  .stats-amount {
    font-size: 32px;
  }

  .filters-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }

  .attendance-table {
    width: 100%;
  }

  .employee-col {
    width: 16%;
  }

  .site-col {
    width: 12%;
  }

  .table-header-cell {
    font-size: 13px;
    padding: 14px 10px;
  }

  .table-body-cell {
    font-size: 14px;
    padding: 12px 10px;
  }
}

/* 1024px - Desktop / Tablet Landscape */
@media (max-width: 1024px) {
  .dashboard-container {
    padding: 14px;
  }

  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
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
}

/* 768px - Tablet Portrait */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 12px;
  }

  .page-header {
    padding: 12px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .header-actions {
    justify-content: space-between;
  }

  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .stats-card {
    padding: 12px;
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

  .page-header {
    padding: 10px;
  }

  .page-title {
    font-size: 16px;
  }

  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .stats-card {
    padding: 10px;
  }

  .stats-icon-wrapper {
    width: 34px;
    height: 34px;
  }

  .stats-amount {
    font-size: 18px;
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

/* New column styles */
.source-mini-col {
  width: 7%;
}

.site-col {
  width: 10%;
}

.cost-center-col {
  width: 8%;
}

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
</style>
