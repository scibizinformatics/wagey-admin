<template>
  <q-page class="schedule-page">
    <!-- Header Section -->
    <div class="dashboard-container">
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">Schedule</h1>
            <div class="timezone-badge">
              <q-icon name="schedule" size="14px" />
              <span>{{ userTimezone }}</span>
            </div>
          </div>
          <div class="header-actions">
            <q-input
              v-model="searchTerm"
              placeholder="Search employees..."
              outlined
              dense
              class="header-search"
              debounce="300"
              @update:model-value="filterEmployees"
            >
              <template #prepend>
                <q-icon name="search" class="search-icon" />
              </template>
            </q-input>
            <q-btn
              color="primary"
              icon="add"
              label="Add Schedule"
              @click="openAddModal"
              class="add-btn"
              unelevated
              no-caps
            />
          </div>
        </div>
      </div>
      <!-- Summary Cards Section -->
      <div class="stats-section">
        <div class="stats-card">
          <div class="stats-icon-wrapper stats-icon-blue">
            <q-icon name="groups" />
          </div>
          <div class="stats-content">
            <div class="stats-label">Total Employees</div>
            <div class="stats-amount">{{ activeEmployees }}</div>
          </div>
        </div>
        <div class="stats-card">
          <div class="stats-icon-wrapper stats-icon-green">
            <q-icon name="event" />
          </div>
          <div class="stats-content">
            <div class="stats-label">Active Schedules</div>
            <div class="stats-amount">{{ totalShifts }}</div>
          </div>
        </div>
        <div class="stats-card">
          <div class="stats-icon-wrapper stats-icon-purple">
            <q-icon name="work" />
          </div>
          <div class="stats-content">
            <div class="stats-label">Positions Filled</div>
            <div class="stats-amount">{{ positionsCount }}</div>
          </div>
        </div>
      </div>
      <!-- Filter and Controls Section -->
      <div class="controls-section">
        <div class="controls-top">
          <h2 class="section-title">Schedule Overview</h2>
          <div class="controls-row">
            <div class="filter-group">
              <q-select
                ref="siteFilterRef"
                v-model="filters.site"
                :options="siteFilterOptions"
                option-value="value"
                option-label="label"
                label="Filter by Site"
                outlined
                dense
                class="filter-select"
                clearable
                emit-value
                map-options
                @update:model-value="applyFilters"
                @popup-show="pinDropdown(siteFilterRef)"
                popup-content-class="filter-dropdown-popup"
              />
              <q-select
                ref="employeeFilterRef"
                v-model="filters.employee"
                :options="[{ label: 'All Employees', value: null }, ...userOptions]"
                option-value="value"
                option-label="label"
                label="Employee"
                outlined
                dense
                class="filter-select"
                clearable
                emit-value
                map-options
                @update:model-value="applyFilters"
                @popup-show="pinDropdown(employeeFilterRef)"
                popup-content-class="filter-dropdown-popup"
              />
            </div>
            <q-select
              v-model="viewMode"
              :options="[
                { label: 'Table View', value: 'table' },
                { label: 'Card View', value: 'cards' },
              ]"
              outlined
              dense
              emit-value
              map-options
              class="view-select"
              label="Sort by"
            />
            <div class="week-nav">
              <q-btn flat round icon="chevron_left" @click="prevWeek" class="nav-btn" size="sm" />
              <div class="week-display">
                {{
                  selectedWeek.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }}
                –
                {{
                  selectedWeek.end.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                }}
              </div>
              <q-btn flat round icon="chevron_right" @click="nextWeek" class="nav-btn" size="sm" />
            </div>
          </div>
        </div>
      </div>
      <div class="content-section">
        <div class="table-view">
          <div class="table-wrapper">
            <table class="schedule-table">
              <thead>
                <tr>
                  <th class="employee-col">Employee</th>
                  <th v-for="(day, i) in days" :key="i" class="day-col">
                    {{ day }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in filteredUsers" :key="user.id" class="table-row">
                  <td class="employee-cell">
                    <div class="employee-info">
                      <q-avatar
                        size="32px"
                        class="employee-avatar"
                        :style="{ backgroundColor: getAvatarColor(user.name) }"
                      >
                        <span class="avatar-text">{{ getInitials(user.name) }}</span>
                      </q-avatar>
                      <span class="employee-name">{{ user.name }}</span>
                    </div>
                  </td>
                  <td v-for="(day, dayIdx) in days" :key="dayIdx" class="schedule-cell">
                    <div class="shifts-wrapper">
                      <!-- Existing Shifts (merged when dual-shift) -->
                      <div
                        v-for="element in getMergedShifts(user.id, dayIdx)"
                        :key="element.id"
                        class="shift-badge"
                        :class="{
                          'shift-badge-dayoff': isDayOff(element),
                          'shift-badge-leave': element.isLeave,
                          'shift-badge-merged': element.isMerged,
                        }"
                      >
                        <!-- Leave Display -->
                        <template v-if="element.isLeave">
                          <div class="leave-content">
                            <q-icon name="beach_access" size="15px" class="leave-icon" />
                            <div class="leave-label">{{ element.leaveTypeName }}</div>
                          </div>
                          <div class="shift-actions">
                            <q-btn
                              flat
                              dense
                              round
                              icon="close"
                              size="xs"
                              class="action-btn delete-btn"
                              @click.stop="confirmDelete('leave', element)"
                            >
                              <q-tooltip>Cancel Leave</q-tooltip>
                            </q-btn>
                          </div>
                        </template>
                        <!-- Day Off Display -->
                        <template v-else-if="isDayOff(element)">
                          <div class="dayoff-content">
                            <q-icon name="event_busy" size="18px" class="dayoff-icon" />
                            <div class="dayoff-label">Day Off</div>
                          </div>
                          <div class="shift-actions">
                            <q-btn
                              flat
                              dense
                              round
                              icon="swap_horiz"
                              size="xs"
                              class="action-btn reassign-btn"
                              @click="openReassignModal(element)"
                            >
                              <q-tooltip>Reassign Day Off</q-tooltip>
                            </q-btn>
                            <q-btn
                              flat
                              dense
                              round
                              icon="close"
                              size="xs"
                              class="action-btn delete-btn"
                              @click.stop="confirmDelete('single', element.id)"
                            >
                              <q-tooltip>Remove Day Off</q-tooltip>
                            </q-btn>
                          </div>
                        </template>
                        <!-- Merged Dual-Shift Display -->
                        <template v-else-if="element.isMerged">
                          <!-- Each shift on its own compact line -->
                          <template v-for="(sub, si) in element.shifts" :key="sub.id">
                            <div class="shift-time">
                              {{ formatTimeWithTimezone(sub.startTime) }} - {{ sub.endTime }}
                            </div>
                            <div class="shift-site" v-if="getSiteName(sub.site)">
                              <q-icon name="location_on" size="10px" />
                              {{ getSiteName(sub.site) }}
                            </div>
                            <div class="shift-position">{{ getPositionName(sub.position) }}</div>
                            <div
                              v-if="si < element.shifts.length - 1"
                              class="merged-shift-separator"
                            />
                          </template>
                          <!-- Merged shift actions -->
                          <div class="shift-actions">
                            <q-btn
                              flat
                              dense
                              round
                              icon="swap_horiz"
                              size="xs"
                              class="action-btn reassign-btn"
                              @click="openReassignModal(element)"
                            >
                              <q-tooltip>Update Shifts</q-tooltip>
                            </q-btn>
                            <q-btn
                              flat
                              dense
                              round
                              icon="event_busy"
                              size="xs"
                              class="action-btn dayoff-btn"
                              :loading="assigningDayOffId === element.id"
                              :disable="assigningDayOffId === element.id"
                              @click.stop="assignDualDayOff(element)"
                            >
                              <q-tooltip>Assign Day Off (Both)</q-tooltip>
                            </q-btn>
                            <q-btn
                              flat
                              dense
                              round
                              icon="close"
                              size="xs"
                              class="action-btn delete-btn"
                              @click.stop="confirmDelete('dual', element)"
                            >
                              <q-tooltip>Remove Both Shifts</q-tooltip>
                            </q-btn>
                          </div>
                        </template>
                        <!-- Regular Shift Display -->
                        <template v-else>
                          <div class="shift-time" v-if="element.startTime && element.endTime">
                            {{ formatTimeWithTimezone(element.startTime) }} - {{ element.endTime }}
                          </div>
                          <div class="shift-site" v-if="getSiteName(element.site)">
                            <q-icon name="location_on" size="11px" />
                            {{ getSiteName(element.site) }}
                          </div>
                          <div class="shift-position">
                            {{ getPositionName(element.position) }}
                          </div>
                          <div class="shift-actions">
                            <q-btn
                              flat
                              dense
                              round
                              icon="swap_horiz"
                              size="xs"
                              class="action-btn reassign-btn"
                              @click="openReassignModal(element)"
                            >
                              <q-tooltip>Update Shift</q-tooltip>
                            </q-btn>
                            <q-btn
                              flat
                              dense
                              round
                              icon="event_busy"
                              size="xs"
                              class="action-btn dayoff-btn"
                              :loading="assigningDayOffId === element.id"
                              :disable="assigningDayOffId === element.id"
                              @click.stop="assignDayOff(element)"
                            >
                              <q-tooltip>Assign Day Off</q-tooltip>
                            </q-btn>
                            <q-btn
                              flat
                              dense
                              round
                              icon="close"
                              size="xs"
                              class="action-btn delete-btn"
                              @click.stop="confirmDelete('single', element.id)"
                            />
                          </div>
                        </template>
                      </div>
                      <!-- Quick Action Buttons -->
                      <div class="cell-quick-actions">
                        <q-btn
                          flat
                          dense
                          size="xs"
                          icon="add"
                          label="Schedule"
                          @click="openQuickAddModal(user.id, dayIdx)"
                          class="cell-btn cell-btn-add"
                        />
                        <template v-if="getShifts(user.id, dayIdx).length === 0">
                          <q-btn-dropdown
                            flat
                            dense
                            size="xs"
                            no-icon-animation
                            icon="beach_access"
                            label="Leave"
                            :loading="quickActionLoading === `${user.id}-${dayIdx}-leave`"
                            class="cell-btn cell-btn-leave"
                            dropdown-icon="none"
                            fit
                          >
                            <q-list dense>
                              <q-item
                                v-for="lt in leaveTypes"
                                :key="lt.id"
                                clickable
                                v-close-popup
                                @click="quickDirectAssign(user.id, dayIdx, 'leave', lt.id)"
                                style="min-height: 28px; padding: 4px 8px"
                              >
                                <q-item-section style="font-size: 11px">{{
                                  lt.name
                                }}</q-item-section>
                              </q-item>
                              <q-item
                                v-if="leaveTypes.length === 0"
                                style="min-height: 28px; padding: 4px 8px"
                              >
                                <q-item-section style="font-size: 11px; color: grey"
                                  >No leave types found</q-item-section
                                >
                              </q-item>
                            </q-list>
                          </q-btn-dropdown>
                          <q-btn
                            flat
                            dense
                            size="xs"
                            icon="event_busy"
                            label="Day Off"
                            :loading="quickActionLoading === `${user.id}-${dayIdx}-dayoff`"
                            :disable="quickActionLoading === `${user.id}-${dayIdx}-dayoff`"
                            @click="quickDirectAssign(user.id, dayIdx, 'dayoff')"
                            class="cell-btn cell-btn-dayoff"
                          />
                        </template>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <!-- Delete Confirmation Modal -->
      <q-dialog v-model="showDeleteModal" persistent>
        <q-card class="modal-card" style="min-width: 320px; max-width: 420px">
          <q-card-section class="modal-header">
            <div class="modal-title" style="display: flex; align-items: center; gap: 8px">
              <q-icon name="warning" color="negative" size="22px" />
              Delete Schedule
            </div>
          </q-card-section>
          <q-card-section class="modal-body">
            <p style="margin: 0; font-size: 15px; color: #374151">
              Are you sure you want to delete this schedule? This action cannot be undone.
            </p>
          </q-card-section>
          <q-card-actions align="right" class="modal-actions" style="padding: 12px 16px; gap: 8px">
            <q-btn flat label="No, Keep It" class="cancel-btn" @click="showDeleteModal = false" />
            <q-btn
              unelevated
              color="negative"
              label="Yes, Delete"
              class="submit-btn"
              @click="confirmDeleteAction"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
      <!-- Add Schedule Modal -->

      <q-dialog v-model="showAddModal" persistent>
        <q-card class="modal-card">
          <q-card-section class="modal-header">
            <div class="modal-title">Add New Schedule</div>
            <q-btn flat round dense icon="close" @click="closeAddModal" />
          </q-card-section>
          <q-card-section class="modal-body">
            <q-form @submit="addSchedule" class="schedule-form">
              <!-- Schedule Type Selection -->
              <q-select
                v-model="newSchedule.scheduleType"
                :options="[
                  { label: 'One-Time Schedule', value: 'one-time' },
                  { label: 'Recurring Schedule', value: 'recurring' },
                ]"
                option-value="value"
                option-label="label"
                label="Schedule Type"
                outlined
                emit-value
                map-options
                class="form-field full-width"
              >
                <template #hint>
                  Choose whether this is a single schedule or repeats weekly
                </template>
              </q-select>
              <!-- Employee Selection -->
              <!-- Multi-select for recurring, single-select for one-time -->
              <q-select
                v-if="newSchedule.scheduleType === 'recurring'"
                ref="multiEmployeeSelectRef"
                v-model="newSchedule.userIds"
                :options="filteredEmployeeOptions"
                option-value="value"
                option-label="label"
                label="Select Employees"
                outlined
                emit-value
                map-options
                multiple
                use-chips
                use-input
                input-debounce="0"
                @filter="filterEmployeeOptions"
                @update:model-value="() => multiEmployeeSelectRef?.updateInputValue('')"
                class="form-field full-width"
                :rules="[(val) => (val && val.length > 0) || 'At least one employee is required']"
                :loading="loadingEmployees"
              >
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey"> No employees found </q-item-section>
                  </q-item>
                </template>
              </q-select>
              <!-- One-Time: Employee + Multi-date picker + Shift rows -->
              <div v-else>
                <!-- Employee -->
                <q-select
                  ref="singleEmployeeSelectRef"
                  v-model="newSchedule.userIds"
                  :options="filteredEmployeeOptions"
                  option-value="value"
                  option-label="label"
                  label="Select Employees"
                  outlined
                  emit-value
                  map-options
                  multiple
                  use-chips
                  use-input
                  input-debounce="0"
                  @filter="filterEmployeeOptions"
                  @update:model-value="() => singleEmployeeSelectRef?.updateInputValue('')"
                  class="form-field full-width q-mb-md"
                  :rules="[(val) => (val && val.length > 0) || 'At least one employee is required']"
                  :loading="loadingEmployees"
                >
                  <template #no-option>
                    <q-item>
                      <q-item-section class="text-grey">No employees found</q-item-section>
                    </q-item>
                  </template>
                </q-select>
                <!-- Multi-date picker -->
                <div class="recurring-calendar-preview">
                  <div class="calendar-preview-header">
                    <q-icon name="event_note" size="16px" color="primary" />
                    <span class="calendar-preview-title">Select Date(s)</span>
                    <q-badge
                      :color="(newSchedule.selectedDates || []).length ? 'primary' : 'grey'"
                      :label="
                        (newSchedule.selectedDates || []).length
                          ? `${newSchedule.selectedDates.length} selected`
                          : 'None selected'
                      "
                    />
                  </div>
                  <div class="calendar-preview-legend">
                    <span class="legend-dot legend-dot-active"></span>
                    <span class="legend-text">Click dates to select or deselect</span>
                  </div>
                  <q-date
                    v-model="newSchedule.selectedDates"
                    multiple
                    mask="YYYY-MM-DD"
                    :options="
                      (date) => {
                        const n = new Date()
                        return (
                          date >=
                          `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
                        )
                      }
                    "
                    :events="newSchedule.selectedDates || []"
                    event-color="primary"
                    minimal
                    class="recurring-calendar"
                  />
                  <div
                    v-if="(newSchedule.selectedDates || []).length > 0"
                    class="calendar-weekdays-summary"
                  >
                    <span class="weekdays-label">Selected:</span>
                    <q-chip
                      v-for="date in (newSchedule.selectedDates || []).slice().sort()"
                      :key="date"
                      dense
                      color="primary"
                      text-color="white"
                      size="sm"
                      removable
                      @remove="
                        newSchedule.selectedDates = (newSchedule.selectedDates || []).filter(
                          (d) => d !== date,
                        )
                      "
                      >{{ date }}</q-chip
                    >
                  </div>
                  <div
                    v-else
                    class="calendar-weekdays-summary"
                    style="color: #ef4444; font-size: 12px"
                  >
                    <q-icon name="info" size="14px" color="negative" />
                    Please select at least one date
                  </div>
                </div>
                <!-- Shift rows (like Quick Add) -->
                <div
                  v-for="(shift, index) in newSchedule.oneTimeShifts"
                  :key="index"
                  class="shift-row"
                >
                  <div class="shift-row-header">
                    <span class="row-label">
                      <q-icon name="schedule" size="16px" />
                      Shift {{ index + 1 }}
                    </span>
                    <q-btn
                      v-if="newSchedule.oneTimeShifts.length > 1"
                      flat
                      dense
                      round
                      icon="close"
                      size="sm"
                      @click="newSchedule.oneTimeShifts.splice(index, 1)"
                      class="remove-btn"
                    />
                  </div>
                  <div class="shift-fields">
                    <q-select
                      v-model="shift.site"
                      :options="siteOptions"
                      option-value="value"
                      option-label="label"
                      label="Select Site"
                      outlined
                      dense
                      emit-value
                      map-options
                      class="form-field"
                      :rules="[(val) => !!val || 'Site is required']"
                    />
                    <q-select
                      v-model="shift.shiftType"
                      :options="shiftTypeOptions"
                      option-value="value"
                      option-label="label"
                      label="Shift Type"
                      outlined
                      dense
                      emit-value
                      map-options
                      class="form-field"
                      :rules="[(val) => !!val || 'Shift type is required']"
                    />
                  </div>
                </div>
                <q-btn
                  flat
                  icon="add"
                  label="Add Another Shift"
                  @click="newSchedule.oneTimeShifts.push({ site: null, shiftType: null })"
                  color="primary"
                  size="sm"
                  class="add-row-btn q-mb-sm"
                />
              </div>
              <!-- For Recurring: Date Range Selection -->
              <div v-if="newSchedule.scheduleType === 'recurring'" class="form-row">
                <q-input
                  v-model="newSchedule.recurringStartDate"
                  label="Start Date"
                  outlined
                  class="form-field"
                  :rules="[(val) => !!val || 'Start date is required']"
                  readonly
                >
                  <template #append>
                    <q-icon name="event" class="cursor-pointer">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-date
                          v-model="newSchedule.recurringStartDate"
                          mask="YYYY-MM-DD"
                          :options="
                            (date) => {
                              const n = new Date()
                              return (
                                date >=
                                `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
                              )
                            }
                          "
                        >
                          <div class="row items-center justify-end">
                            <q-btn v-close-popup label="Close" color="primary" flat />
                          </div>
                        </q-date>
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
                <q-input
                  v-model="newSchedule.recurringEndDate"
                  label="End Date"
                  outlined
                  class="form-field"
                  :rules="[(val) => !!val || 'End date is required']"
                  readonly
                >
                  <template #append>
                    <q-icon name="event" class="cursor-pointer">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-date
                          v-model="newSchedule.recurringEndDate"
                          mask="YYYY-MM-DD"
                          :options="
                            (date) => {
                              const n = new Date()
                              const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
                              return date >= (newSchedule.recurringStartDate || today)
                            }
                          "
                        >
                          <div class="row items-center justify-end">
                            <q-btn v-close-popup label="Close" color="primary" flat />
                          </div>
                        </q-date>
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>
              <!-- Recurring Template Selection -->
              <q-select
                v-if="newSchedule.scheduleType === 'recurring'"
                v-model="newSchedule.recurringSchedule"
                :options="recurringScheduleOptions"
                option-value="value"
                option-label="label"
                label="Use Recurring Template"
                outlined
                emit-value
                map-options
                class="form-field full-width"
                clearable
                @update:model-value="onRecurringTemplateChange"
              >
                <template #hint> Select a template to auto-fill schedule details </template>
              </q-select>
              <!-- Recurring Calendar Preview -->
              <div
                v-if="
                  newSchedule.scheduleType === 'recurring' &&
                  newSchedule.recurringSchedule &&
                  recurringCalendarDates.length > 0
                "
                class="recurring-calendar-preview"
              >
                <div class="calendar-preview-header">
                  <q-icon name="event_note" size="16px" color="primary" />
                  <span class="calendar-preview-title">Schedule Preview</span>
                  <q-badge color="primary" :label="`${recurringCalendarDates.length} days`" />
                </div>
                <div class="calendar-preview-legend">
                  <span class="legend-dot legend-dot-active"></span>
                  <span class="legend-text">Scheduled working days</span>
                </div>
                <q-date
                  v-model="recurringCalendarDates"
                  multiple
                  mask="YYYY/MM/DD"
                  minimal
                  readonly
                  no-unset
                  :default-year-month="recurringCalendarDefaultMonth"
                  class="recurring-calendar"
                />
                <div class="calendar-weekdays-summary">
                  <span class="weekdays-label">Active on:</span>
                  <q-chip
                    v-for="day in recurringActiveWeekdays"
                    :key="day"
                    dense
                    color="primary"
                    text-color="white"
                    size="sm"
                    >{{ day }}</q-chip
                  >
                </div>
              </div>
              <!-- Site & Department (recurring only) -->
              <div v-if="newSchedule.scheduleType === 'recurring'" class="form-row">
                <q-select
                  v-model="newSchedule.site"
                  :options="siteOptions"
                  option-value="value"
                  option-label="label"
                  label="Select Site"
                  outlined
                  emit-value
                  map-options
                  class="form-field"
                  :rules="[(val) => !!val || 'Site is required']"
                />
                <q-select
                  v-model="newSchedule.department"
                  :options="departmentOptions"
                  option-value="value"
                  option-label="label"
                  label="Department"
                  outlined
                  emit-value
                  map-options
                  class="form-field"
                  clearable
                />
              </div>
              <!-- Repeat Interval (for recurring) -->
              <q-input
                v-if="newSchedule.scheduleType === 'recurring'"
                v-model.number="newSchedule.repeatInterval"
                label="Repeat Every (weeks)"
                type="number"
                outlined
                min="1"
                class="form-field full-width"
              >
                <template #hint> 1 = every week, 2 = every other week, etc. </template>
              </q-input>
              <!-- Rotating Schedule Options -->
              <q-checkbox
                v-if="newSchedule.scheduleType === 'recurring'"
                v-model="newSchedule.isRotating"
                label="This is a rotating schedule"
                class="full-width"
              />
              <!-- Conflict Warning -->
              <q-banner v-if="addConflictWarning" class="warning-banner">
                <template #avatar>
                  <q-icon name="warning" />
                </template>
                <strong>Schedule Conflict Detected!</strong><br />
                This employee already has a schedule on the selected date/time.
              </q-banner>
              <!-- Actions -->
              <div class="modal-actions">
                <q-btn flat label="Cancel" @click="closeAddModal" class="cancel-btn" />
                <q-btn
                  type="submit"
                  color="primary"
                  :label="
                    newSchedule.scheduleType === 'recurring'
                      ? 'Create Recurring Schedule'
                      : 'Add Schedule'
                  "
                  unelevated
                  class="submit-btn"
                  :loading="isCheckingConflict"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </q-dialog>
      <!-- Edit Schedule Modal -->
      <!-- Quick Add Modal - Multiple Shifts Same Day -->
      <q-dialog v-model="showQuickAddModal" persistent>
        <q-card class="modal-card" style="max-width: 500px">
          <q-card-section class="modal-header">
            <div class="modal-title">Quick Add Shifts</div>
            <q-btn flat round dense icon="close" @click="closeQuickAddModal" />
          </q-card-section>
          <q-card-section class="modal-body">
            <!-- Employee and Day Info -->
            <div class="quick-info">
              <div class="info-item">
                <q-icon name="person" size="20px" />
                <span>{{ getEmployeeName(quickAdd.userId) }}</span>
              </div>
              <div class="info-item">
                <q-icon name="today" size="20px" />
                <span>{{ days[quickAdd.day] }}</span>
              </div>
            </div>
            <q-form @submit="quickAddSchedule" class="schedule-form">
              <!-- Multiple Shift Rows -->
              <div v-for="(shift, index) in quickAdd.shifts" :key="index" class="shift-row">
                <div class="shift-row-header">
                  <span class="row-label">
                    <q-icon name="schedule" size="16px" />
                    Shift {{ index + 1 }}
                  </span>
                  <q-btn
                    v-if="quickAdd.shifts.length > 1"
                    flat
                    dense
                    round
                    icon="close"
                    size="sm"
                    @click="removeShiftRow(index)"
                    class="remove-btn"
                  />
                </div>
                <div class="shift-fields">
                  <q-select
                    v-model="shift.site"
                    :options="siteOptions"
                    option-value="value"
                    option-label="label"
                    label="Select Site"
                    outlined
                    dense
                    emit-value
                    map-options
                    class="form-field"
                    :rules="[(val) => !!val || 'Site is required']"
                  />
                  <q-select
                    v-model="shift.shiftType"
                    :options="shiftTypeOptions"
                    option-value="value"
                    option-label="label"
                    label="Shift Type"
                    outlined
                    dense
                    emit-value
                    map-options
                    class="form-field"
                    :rules="[(val) => !!val || 'Shift type is required']"
                  >
                    <template #hint>
                      {{
                        shift.shiftType
                          ? getShiftTypeDetails(shift.shiftType)
                          : 'Select a shift type'
                      }}
                    </template>
                  </q-select>
                </div>
              </div>
              <!-- Add Another Shift Button -->
              <q-btn
                flat
                icon="add"
                label="Add Another Shift"
                @click="addShiftRow"
                class="add-row-btn"
                color="primary"
                size="sm"
              />
              <!-- Info Banner -->
              <q-banner class="info-banner" dense>
                <template #avatar>
                  <q-icon name="info" color="primary" />
                </template>
                <span style="font-size: 12px">
                  Adding {{ quickAdd.shifts.length }} shift{{
                    quickAdd.shifts.length > 1 ? 's' : ''
                  }}
                  for <strong>{{ days[quickAdd.day] }}</strong>
                </span>
              </q-banner>
              <div class="modal-actions">
                <q-btn flat label="Cancel" @click="closeQuickAddModal" class="cancel-btn" />
                <q-btn
                  type="submit"
                  color="primary"
                  :label="`Add ${quickAdd.shifts.length} Shift${quickAdd.shifts.length > 1 ? 's' : ''}`"
                  unelevated
                  class="submit-btn"
                  :loading="isAddingShift"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </q-dialog>
      <!-- Update Shift Assignment Modal -->
      <q-dialog v-model="showReassignModal" persistent>
        <q-card class="modal-card" style="max-width: 520px">
          <q-card-section class="modal-header">
            <div class="modal-title">
              {{ reassignData.isDualShift ? 'Update Dual Shift' : 'Update Shift Assignment' }}
            </div>
            <q-btn flat round dense icon="close" @click="closeReassignModal" />
          </q-card-section>
          <q-card-section class="modal-body">
            <!-- Employee and Day Info -->
            <div class="quick-info">
              <div class="info-item">
                <q-icon name="person" size="20px" />
                <span>{{ getEmployeeName(reassignData.currentEmployee) }}</span>
              </div>
              <div class="info-item">
                <q-icon name="event" size="20px" />
                <span>{{ reassignData.date }}</span>
              </div>
            </div>
            <q-form @submit.prevent="reassignShift" class="schedule-form">
              <!-- ── SINGLE SHIFT ── -->
              <template v-if="!reassignData.isDualShift">
                <div class="shift-row">
                  <div class="shift-row-header">
                    <span class="row-label"><q-icon name="edit" size="16px" /> Shift Details</span>
                  </div>
                  <div class="shift-fields">
                    <q-select
                      v-model="reassignData.siteId"
                      :options="siteOptions"
                      option-value="value"
                      option-label="label"
                      label="Select Site"
                      outlined
                      dense
                      emit-value
                      map-options
                      class="form-field"
                      :rules="[(val) => !!val || 'Site is required']"
                    />
                    <q-select
                      v-model="reassignData.shiftTypeId"
                      :options="positionOptions"
                      option-value="value"
                      option-label="label"
                      label="Shift Type"
                      outlined
                      dense
                      emit-value
                      map-options
                      class="form-field"
                      :rules="[(val) => !!val || 'Shift type is required']"
                    >
                      <template #hint>{{
                        reassignData.shiftTypeId
                          ? getPositionName(reassignData.shiftTypeId)
                          : 'Select a shift type'
                      }}</template>
                    </q-select>
                    <q-select
                      v-model="reassignData.departmentId"
                      :options="departmentOptions"
                      option-value="value"
                      option-label="label"
                      label="Department (Optional)"
                      outlined
                      dense
                      emit-value
                      map-options
                      clearable
                      class="form-field"
                    />
                  </div>
                </div>
              </template>

              <!-- ── DUAL SHIFT ── -->
              <template v-else>
                <div
                  v-for="(sub, idx) in reassignData.dualShifts"
                  :key="sub.assignmentId"
                  class="shift-row"
                  style="margin-bottom: 12px"
                >
                  <div class="shift-row-header">
                    <span class="row-label">
                      <q-icon name="edit" size="16px" />
                      Shift {{ idx + 1 }}
                      <span style="font-size: 10px; color: #6b7280; margin-left: 4px">
                        {{ sub.startTime }} - {{ sub.endTime }}
                      </span>
                    </span>
                  </div>
                  <div class="shift-fields">
                    <q-select
                      v-model="sub.siteId"
                      :options="siteOptions"
                      option-value="value"
                      option-label="label"
                      :label="`Site (Shift ${idx + 1})`"
                      outlined
                      dense
                      emit-value
                      map-options
                      class="form-field"
                      :rules="[(val) => !!val || 'Site is required']"
                    />
                    <q-select
                      v-model="sub.shiftTypeId"
                      :options="positionOptions"
                      option-value="value"
                      option-label="label"
                      :label="`Shift Type (Shift ${idx + 1})`"
                      outlined
                      dense
                      emit-value
                      map-options
                      class="form-field"
                      :rules="[(val) => !!val || 'Shift type is required']"
                    >
                      <template #hint>{{
                        sub.shiftTypeId ? getPositionName(sub.shiftTypeId) : 'Select a shift type'
                      }}</template>
                    </q-select>
                    <q-select
                      v-model="sub.departmentId"
                      :options="departmentOptions"
                      option-value="value"
                      option-label="label"
                      :label="`Department (Shift ${idx + 1}, Optional)`"
                      outlined
                      dense
                      emit-value
                      map-options
                      clearable
                      class="form-field"
                    />
                  </div>
                </div>
              </template>

              <!-- Info Banner -->
              <q-banner class="info-banner" dense>
                <template #avatar><q-icon name="info" color="primary" /></template>
                <span style="font-size: 12px">
                  Updating {{ reassignData.isDualShift ? 'dual shift' : 'shift' }} for
                  <strong>{{ getEmployeeName(reassignData.currentEmployee) }}</strong>
                </span>
              </q-banner>
              <div class="modal-actions">
                <q-btn
                  flat
                  label="CANCEL"
                  @click="closeReassignModal"
                  class="cancel-btn"
                  :disable="isReassigning"
                />
                <q-btn
                  type="submit"
                  color="primary"
                  :label="reassignData.isDualShift ? 'UPDATE BOTH SHIFTS' : 'UPDATE SHIFT'"
                  unelevated
                  class="submit-btn"
                  :loading="isReassigning"
                  :disable="
                    reassignData.isDualShift
                      ? reassignData.dualShifts.some((s) => !s.siteId || !s.shiftTypeId)
                      : !reassignData.siteId ||
                        !reassignData.shiftTypeId ||
                        !reassignData.assignmentId
                  "
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </q-dialog>
    </div>
    <!-- /dashboard-container -->
  </q-page>
</template>
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import axios from 'axios'
const $q = useQuasar()
// State
const users = ref([])
const shifts = ref([])
const shiftTypes = ref([])
const sites = ref([])
const departments = ref([])
const employees = ref([])
const loadingEmployees = ref(false)
const isReassigning = ref(false)
const recurringSchedules = ref([])
const userTimezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone)
const viewMode = ref('table')
const filters = ref({
  site: null,
  employee: null,
})
const searchTerm = ref('')
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const dayOptions = days.map((d, i) => ({ label: d, value: i }))
const showAddModal = ref(false)
const showQuickAddModal = ref(false)
const showReassignModal = ref(false)
const showDeleteModal = ref(false)
const pendingDelete = ref(null) // { type: 'single' | 'dual' | 'leave', payload: any }
const isCheckingConflict = ref(false)
const isAddingShift = ref(false)
const assigningDayOffId = ref(null) // tracks per-element shift id
const quickActionLoading = ref(null) // tracks `${userId}-${dayIdx}-leave/dayoff`
const leaveTypes = ref([])
const newSchedule = ref({
  userId: null,
  userIds: [],
  selectedDate: null,
  selectedDates: [],
  oneTimeShifts: [{ site: null, shiftType: null }],
  startTime: '',
  endTime: '',
  position: null,
  site: null,
  department: null,
  recurringSchedule: null,
  scheduleType: 'one-time',
  isRotating: false,
  rotationShifts: [],
  weekdays: [],
  repeatInterval: 1,
  recurringStartDate: null,
  recurringEndDate: null,
})
const weekdayOptions = [
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' },
]
const quickAdd = ref({
  userId: null,
  day: null,
  shifts: [],
  leaveType: null,
})
// Reassign data state (for updating shift assignment)
const reassignData = ref({
  assignmentId: null,
  shiftTypeId: null,
  siteId: null,
  departmentId: null,
  currentEmployee: null,
  date: null,
  day: null,
  isDualShift: false,
  dualShifts: [], // [{ assignmentId, shiftTypeId, siteId, departmentId, startTime, endTime }]
})
const addConflictWarning = ref(false)
// Week helpers
const getWeekRange = (date = new Date()) => {
  const d = new Date(date)
  console.log('getWeekRange input:', d)
  console.log('getWeekRange input is valid?:', !isNaN(d.getTime()))
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  console.log('getWeekRange output:', { start: monday, end: sunday })
  console.log('Week start year:', monday.getFullYear())
  return { start: monday, end: sunday }
}
const selectedWeek = ref(getWeekRange())
const nextWeek = async () => {
  const newStart = new Date(selectedWeek.value.start)
  newStart.setDate(newStart.getDate() + 7)
  selectedWeek.value = getWeekRange(newStart)
  console.log('📅 Moving to next week:', selectedWeek.value.start.toISOString().split('T')[0])
  await fetchData()
  fetchLeaves()
}
const prevWeek = async () => {
  const newStart = new Date(selectedWeek.value.start)
  newStart.setDate(newStart.getDate() - 7)
  selectedWeek.value = getWeekRange(newStart)
  console.log('📅 Moving to previous week:', selectedWeek.value.start.toISOString().split('T')[0])
  await fetchData()
  fetchLeaves()
}
// Utilities
const getTimezoneAbbreviation = () => {
  const date = new Date()
  const shortFormat = date.toLocaleTimeString('en-US', { timeZoneName: 'short' })
  const match = shortFormat.match(/\b[A-Z]{3,4}\b/)
  return match ? match[0] : ''
}
const formatTimeWithTimezone = (time) => {
  if (!time) return ''
  const abbr = getTimezoneAbbreviation()
  return abbr ? `${time} ${abbr}` : time
}
const isValidTime = (val) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(val || '')
const timeValidation = (val) => isValidTime(val) || 'Please use HH:MM (24h)'
const validateEndTime = (val, start = null) => {
  if (!isValidTime(val)) return 'Invalid time'
  if (start && isValidTime(start)) {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = val.split(':').map(Number)
    if (eh < sh || (eh === sh && em <= sm)) return 'End must be after start'
  }
  return true
}
const getPositionName = (positionId) => {
  const position = shiftTypes.value.find((p) => p.id === positionId)
  return position?.name || positionId
}
const getSiteName = (siteId) => {
  if (!siteId) return null
  const id = typeof siteId === 'number' ? siteId : parseInt(siteId)
  const site = sites.value.find((s) => s.id === id)
  return site?.name || null
}
// Check if a shift is a "day off" shift
const isDayOff = (shift) => {
  if (!shift) return false
  // Check by position/shift type name (case insensitive)
  const positionName =
    (typeof shift.position === 'string'
      ? shift.position
      : getPositionName(shift.position)
    )?.toLowerCase() || ''
  const isDayOffByName =
    positionName.includes('day off') ||
    positionName.includes('dayoff') ||
    positionName.includes('rest day') ||
    positionName.includes('off day') ||
    positionName === 'off'
  // Check by status
  const isDayOffByStatus =
    shift.status === 'day_off' ||
    shift.status === 'off' ||
    shift.is_day_off === true ||
    shift.is_off === true
  // Check if both start and end times are null (common for day off)
  const isDayOffByTime = !shift.startTime && !shift.endTime
  return isDayOffByName || isDayOffByStatus || isDayOffByTime
}
const getInitials = (name) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}
const getAvatarColor = (name) => {
  const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6']
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[index % colors.length]
}
const requireId = (value, name) => {
  const id = parseInt(value)
  if (!id || Number.isNaN(id)) {
    throw new Error(`${name} is required and must be a valid ID`)
  }
  return id
}
// Summaries
const totalShifts = computed(() => shifts.value.length)
const activeEmployees = computed(() => new Set(shifts.value.map((s) => s.userId)).size)
const positionsCount = computed(() => new Set(shifts.value.map((s) => s.position)).size)
const siteFilterOptions = computed(() => {
  if (!sites.value || sites.value.length === 0) {
    return [{ label: 'All Sites', value: null }]
  }
  return [
    { label: 'All Sites', value: null },
    ...sites.value.map((site) => ({
      label: site.name,
      value: site.id,
    })),
  ]
})
// Options
const userOptions = computed(() => users.value.map((u) => ({ label: u.name, value: u.id })))
const employeeOptions = computed(() =>
  employees.value.map((emp) => ({
    label: emp.full_name || emp.name,
    value: emp.id,
  })),
)
const filteredEmployeeOptions = ref([])
const singleEmployeeSelectRef = ref(null)
const multiEmployeeSelectRef = ref(null)
const siteFilterRef = ref(null)
const employeeFilterRef = ref(null)

// Pin dropdown to fixed position anchored below the input, immune to page scroll
const pinDropdown = (selectRef) => {
  if (!selectRef?.value) return
  const el = selectRef.value.$el
  if (!el) return
  const rect = el.getBoundingClientRect()
  const popup = document.querySelector('.filter-dropdown-popup')
  if (!popup) return
  popup.style.position = 'fixed'
  popup.style.top = rect.bottom + 4 + 'px'
  popup.style.left = rect.left + 'px'
  popup.style.width = rect.width + 'px'
  popup.style.zIndex = '9999'
}
watch(
  employeeOptions,
  (newOptions) => {
    filteredEmployeeOptions.value = newOptions
  },
  { immediate: true },
)
const filterEmployeeOptions = (val, update) => {
  update(() => {
    if (!val) {
      filteredEmployeeOptions.value = employeeOptions.value
    } else {
      const needle = val.toLowerCase()
      filteredEmployeeOptions.value = employeeOptions.value.filter((opt) =>
        opt.label.toLowerCase().includes(needle),
      )
    }
  })
}
const shiftTypeOptions = computed(() =>
  shiftTypes.value.map((st) => ({
    label: st.name,
    value: st.id,
  })),
)
const positionOptions = computed(() =>
  shiftTypes.value.map((p) => ({ label: p.name, value: p.id })),
)
const siteOptions = computed(() =>
  sites.value.map((s) => ({
    label: s.name,
    value: s.id,
  })),
)
const departmentOptions = computed(() =>
  departments.value.map((d) => ({
    label: d.name,
    value: d.id,
  })),
)
const recurringScheduleOptions = computed(() =>
  recurringSchedules.value.map((r) => ({ label: r.name, value: r.id })),
)
const filteredUsers = computed(() => {
  if (filters.value.site) {
    console.log('🔍 FILTERING DEBUG:', {
      selectedSite: filters.value.site,
      totalShifts: shifts.value.length,
      sampleShift: shifts.value[0],
      shiftsWithSite: shifts.value.filter((s) => s.site).length,
      uniqueSiteIds: [...new Set(shifts.value.map((s) => s.site))],
      siteIdTypes: shifts.value.slice(0, 3).map((s) => ({ site: s.site, type: typeof s.site })),
    })
  }
  return users.value.filter((u) => {
    const matchEmployee = !filters.value.employee || u.id === filters.value.employee
    const matchSearch = (u.name || '')
      .toLowerCase()
      .includes((searchTerm.value || '').toLowerCase())
    const matchSite =
      !filters.value.site ||
      shifts.value.some((shift) => {
        const shiftSiteId = typeof shift.site === 'number' ? shift.site : parseInt(shift.site)
        const filterSiteId =
          typeof filters.value.site === 'number' ? filters.value.site : parseInt(filters.value.site)
        return shift.userId === u.id && shiftSiteId === filterSiteId
      })
    if (filters.value.site && matchEmployee && matchSearch) {
      const userShifts = shifts.value.filter((s) => s.userId === u.id)
      if (userShifts.length > 0) {
        console.log(`👤 ${u.name}:`, {
          totalShifts: userShifts.length,
          shiftSites: userShifts.map((s) => s.site),
          matchSite: matchSite,
        })
      }
    }
    return matchEmployee && matchSearch && matchSite
  })
})
const onRecurringTemplateChange = (templateId) => {
  if (!templateId) {
    newSchedule.value.startTime = ''
    newSchedule.value.endTime = ''
    quickAdd.value.startTime = ''
    quickAdd.value.endTime = ''
    return
  }
  const template = recurringSchedules.value.find((r) => r.id === templateId)
  if (!template) {
    console.warn('Template not found:', templateId)
    return
  }
  console.log('Selected recurring template:', template)
  if (template.start_time) {
    try {
      const startTime =
        typeof template.start_time === 'string'
          ? template.start_time.substring(0, 5)
          : template.start_time
      newSchedule.value.startTime = startTime
      quickAdd.value.startTime = startTime
    } catch (e) {
      console.error('Error parsing start_time:', e)
    }
  }
  if (template.end_time) {
    try {
      const endTime =
        typeof template.end_time === 'string'
          ? template.end_time.substring(0, 5)
          : template.end_time
      newSchedule.value.endTime = endTime
      quickAdd.value.endTime = endTime
    } catch (e) {
      console.error('Error parsing end_time:', e)
    }
  }
  if (template.shift_type) {
    newSchedule.value.position = template.shift_type
    quickAdd.value.position = template.shift_type
  }
  if (template.weekdays) {
    try {
      newSchedule.value.weekdays = parseWeekdays(template.weekdays)
    } catch (e) {
      console.error('Error parsing weekdays:', e)
      newSchedule.value.weekdays = []
    }
  }
  if (template.is_rotating !== undefined) {
    newSchedule.value.isRotating = template.is_rotating
  }
  if (template.site) {
    newSchedule.value.site = template.site
    quickAdd.value.site = template.site
  }
  if (template.department) {
    newSchedule.value.department = template.department
    quickAdd.value.department = template.department
  }
  // Auto-fill date range from template; default to today if no start_date
  if (template.start_date) {
    newSchedule.value.recurringStartDate = template.start_date
  } else if (!newSchedule.value.recurringStartDate) {
    const now = new Date()
    newSchedule.value.recurringStartDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }
  if (template.end_date) {
    newSchedule.value.recurringEndDate = template.end_date
  }
  $q.notify({
    type: 'info',
    message: 'Template loaded successfully',
    caption:
      template.start_date && template.end_date
        ? `Valid dates: ${template.start_date} to ${template.end_date}`
        : undefined,
    timeout: 3000,
  })
}
// Recurring calendar preview
const recurringCalendarModel = ref(null)

const recurringCalendarDefaultMonth = computed(() => {
  if (newSchedule.value.recurringStartDate) {
    const [year, month] = newSchedule.value.recurringStartDate.split('-')
    return `${year}/${month}`
  }
  const now = new Date()
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`
})

const WEEKDAY_MAP = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

const buildRecurringDates = (startStr, endStr, weekdays, interval) => {
  if (!weekdays || weekdays.length === 0) return []

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const oneYearLater = new Date(now)
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
  const defaultEndStr = `${oneYearLater.getFullYear()}-${String(oneYearLater.getMonth() + 1).padStart(2, '0')}-${String(oneYearLater.getDate()).padStart(2, '0')}`

  const resolvedStart = startStr || todayStr
  const resolvedEnd = endStr || defaultEndStr

  const start = new Date(resolvedStart + 'T00:00:00')
  const end = new Date(resolvedEnd + 'T00:00:00')
  const repeatEvery = interval || 1
  const targetDays = weekdays
    .map((d) => WEEKDAY_MAP[d.toLowerCase()])
    .filter((d) => d !== undefined)
  const dates = []

  let weekStart = new Date(start)
  const dayOfWeek = weekStart.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  weekStart.setDate(weekStart.getDate() + diffToMonday)

  while (weekStart <= end) {
    for (const targetDay of targetDays) {
      const date = new Date(weekStart)
      const offset = targetDay === 0 ? 6 : targetDay - 1
      date.setDate(weekStart.getDate() + offset)
      if (date >= start && date <= end) {
        const yyyy = date.getFullYear()
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const dd = String(date.getDate()).padStart(2, '0')
        dates.push(`${yyyy}/${mm}/${dd}`)
      }
    }
    weekStart.setDate(weekStart.getDate() + 7 * repeatEvery)
  }
  return dates
}

// Writable computed so q-date multiple v-model works (readonly: ignore writes)
const recurringCalendarDates = computed({
  get() {
    return buildRecurringDates(
      newSchedule.value.recurringStartDate,
      newSchedule.value.recurringEndDate,
      newSchedule.value.weekdays,
      newSchedule.value.repeatInterval,
    )
  },
  set() {
    // readonly — ignore any writes from q-date (it's readonly anyway)
  },
})

const recurringCalendarOptions = computed(() => {
  const dateSet = new Set(recurringCalendarDates.value)
  return (dateStr) => dateSet.has(dateStr)
})

const recurringActiveWeekdays = computed(() => {
  return (newSchedule.value.weekdays || []).map((d) => d.charAt(0).toUpperCase() + d.slice(1))
})

const parseWeekdays = (weekdaysStr) => {
  if (!weekdaysStr) return []
  if (Array.isArray(weekdaysStr)) {
    return weekdaysStr.map((d) => d.toString().trim().toLowerCase())
  }
  if (typeof weekdaysStr === 'string') {
    return weekdaysStr.split(',').map((d) => d.trim().toLowerCase())
  }
  return weekdaysStr
    .toString()
    .split(',')
    .map((d) => d.trim().toLowerCase())
}
// API functions
const fetchSitesAndDepartments = async () => {
  try {
    const token = localStorage.getItem('access_token')
    const companyId = localStorage.getItem('selectedCompany')
    if (!token || !companyId) {
      sites.value = [
        { id: 1, name: 'Main Office' },
        { id: 2, name: 'Branch 1' },
      ]
      departments.value = [
        { id: 1, name: 'Sales' },
        { id: 2, name: 'Operations' },
      ]
      shiftTypes.value = [
        {
          id: 1,
          name: 'Morning Shift',
          default_start_time: '08:00:00',
          default_end_time: '17:00:00',
        },
        {
          id: 2,
          name: 'Night Shift',
          default_start_time: '21:00:00',
          default_end_time: '06:00:00',
        },
      ]
      recurringSchedules.value = []
      return
    }
    const [sitesRes, deptsRes, shiftTypesRes, recurringRes] = await Promise.all([
      axios.get(`https://staging.wageyapp.com/organization/sites/?company=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`https://staging.wageyapp.com/organization/departments/?company=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`https://staging.wageyapp.com/organization/shift-types/?company=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(
        `https://staging.wageyapp.com/organization/recurring-schedules/?company=${companyId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      ),
    ])
    sites.value = sitesRes.data.results || sitesRes.data || []
    departments.value = deptsRes.data.results || deptsRes.data || []
    shiftTypes.value = shiftTypesRes.data.results || shiftTypesRes.data || []
    recurringSchedules.value = recurringRes.data.results || recurringRes.data || []
    console.log('✅ Data loaded:', {
      sites: sites.value.length,
      departments: departments.value.length,
      shiftTypes: shiftTypes.value.length,
      recurringSchedules: recurringSchedules.value.length,
    })
    console.log(
      '📋 Available Shift Types:',
      shiftTypes.value.map((st) => ({
        id: st.id,
        name: st.name,
        times: `${st.default_start_time?.substring(0, 5)} - ${st.default_end_time?.substring(0, 5)}`,
      })),
    )
    console.log(
      '🔄 Available Recurring Schedules:',
      recurringSchedules.value.map((rs) => ({
        id: rs.id,
        name: rs.name,
      })),
    )
  } catch (error) {
    console.error('❌ Failed to fetch data:', error.response?.data || error.message)
    sites.value = [{ id: 1, name: 'Main Office' }]
    departments.value = [{ id: 1, name: 'Sales' }]
    shiftTypes.value = [{ id: 1, name: 'Morning Shift' }]
    recurringSchedules.value = []
    $q.notify({
      type: 'warning',
      message: 'Using fallback data. Some features may be limited.',
      timeout: 3000,
    })
  }
}
const fetchLeaveTypes = async () => {
  try {
    const token = localStorage.getItem('access_token')
    let companyId = localStorage.getItem('selectedCompany')
    try {
      const parsed = JSON.parse(companyId)
      companyId = parsed?.id || parsed
    } catch {
      // Already a plain value
    }
    if (!token || !companyId) {
      console.warn('⚠️ Cannot fetch leave types: missing token or company ID')
      return
    }
    const res = await axios.get(
      `https://staging.wageyapp.com/attendance/leave-types/?company=${companyId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    leaveTypes.value = res.data.results || res.data || []
    console.log('✅ Leave types loaded:', leaveTypes.value)
  } catch (error) {
    console.error('❌ Failed to fetch leave types:', error.response?.data || error.message)
  }
}
const fetchEmployees = async () => {
  try {
    const token = localStorage.getItem('access_token')
    let storedCompany = localStorage.getItem('selectedCompany')
    let companyId = null
    try {
      const parsed = JSON.parse(storedCompany)
      companyId = parsed?.id || parsed
    } catch {
      companyId = storedCompany
    }
    if (!token || !companyId) {
      $q.notify({
        type: 'negative',
        message: 'Missing token or company ID.',
        position: 'top',
      })
      return
    }
    loadingEmployees.value = true
    const response = await axios.get(
      `https://staging.wageyapp.com/user/companies/${companyId}/employees/`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    console.log('=== EMPLOYEES FETCHED ===')
    console.log('Total employees from API:', response.data.length)
    console.log('Sample employee structure:', JSON.stringify(response.data[0], null, 2))
    console.log('Company ID we are filtering for:', companyId)
    employees.value = response.data || []
    console.log('✅ All employees loaded (already filtered by API):', employees.value.length)
  } catch (error) {
    console.error('Error fetching employees:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to fetch employees',
      position: 'top',
    })
  } finally {
    loadingEmployees.value = false
  }
}
const fetchData = async () => {
  try {
    console.log('🔄 fetchData called at:', new Date().toISOString())
    const token = localStorage.getItem('access_token')
    let companyId = localStorage.getItem('selectedCompany')
    console.log('=== FETCH DATA DEBUG ===')
    console.log('🔑 Token exists:', !!token)
    console.log('🏢 Raw companyId from localStorage:', companyId)
    // 🆕 ADD: Log selected week range
    console.log('📅 Selected week range:', {
      start: selectedWeek.value.start.toISOString().split('T')[0],
      end: selectedWeek.value.end.toISOString().split('T')[0],
    })
    try {
      const parsed = JSON.parse(companyId)
      companyId = parsed?.id || parsed
      console.log('🏢 Parsed companyId:', companyId)
    } catch {
      console.log('🏢 CompanyId is plain value (not JSON)')
    }
    if (!token) {
      console.error('❌ No token found')
      $q.notify({
        type: 'negative',
        message: 'Please log in to view schedules',
        timeout: 3000,
      })
      return
    }
    if (!companyId) {
      console.error('❌ No company selected')
      $q.notify({
        type: 'negative',
        message: 'No company selected. Please select a company.',
        timeout: 3000,
      })
      return
    }
    const url = `https://staging.wageyapp.com/organization/schedules/company/monthly/?company=${companyId}`
    console.log('🌐 API URL:', url)
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    console.log('✅ API Response Status:', res.status)
    console.log('📥 RAW API RESPONSE:', JSON.stringify(res.data, null, 2))
    if (!res.data) {
      console.error('❌ API returned null/undefined')
      return
    }
    users.value = employees.value.map((emp) => ({
      id: emp.id,
      name: emp.full_name || emp.name || `Employee ${emp.id}`,
      email: emp.email || '',
    }))
    shifts.value = []
    let employeesData = []
    if (Array.isArray(res.data)) {
      employeesData = res.data
    } else if (res.data?.results && Array.isArray(res.data.results)) {
      employeesData = res.data.results
    } else if (res.data?.data && Array.isArray(res.data.data)) {
      employeesData = res.data.data
    } else if (res.data && typeof res.data === 'object') {
      employeesData = [res.data]
    }
    console.log('📊 Processing', employeesData.length, 'employees with schedules')
    let loggedFirstSchedule = false
    let totalSchedulesProcessed = 0
    let schedulesInWeekRange = 0
    let schedulesOutsideWeekRange = 0
    employeesData.forEach((empData, index) => {
      let employee = null
      let schedules = []
      if (empData.employee && typeof empData.employee === 'object') {
        employee = empData.employee
        schedules = empData.schedules || []
      } else if (empData.id && empData.schedules) {
        employee = empData
        schedules = empData.schedules || []
      } else if (empData.id) {
        employee = empData
        schedules = empData.schedule || empData.schedule_list || []
      }
      if (!employee || !employee.id) {
        return
      }
      if (typeof schedules === 'string') {
        try {
          schedules = JSON.parse(schedules)
        } catch (e) {
          console.error('Failed to parse schedules string:', e)
          schedules = []
        }
      }
      if (!Array.isArray(schedules) || schedules.length === 0) {
        return
      }
      schedules.forEach((schedule, sIndex) => {
        try {
          if (!loggedFirstSchedule) {
            console.log('=== 🔍 FIRST SCHEDULE DETAILED ANALYSIS ===')
            console.log('📋 Full schedule object:', schedule)
            console.log('📋 All keys in schedule:', Object.keys(schedule))
            console.log('📋 Complete JSON:', JSON.stringify(schedule, null, 2))
            loggedFirstSchedule = true
          }
          if (!schedule.date) {
            return
          }
          totalSchedulesProcessed++
          // Compare as local date strings to avoid UTC vs local midnight mismatch
          const scheduleDateStr = schedule.date.substring(0, 10)
          const ws = selectedWeek.value.start
          const weekStartStr = `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, '0')}-${String(ws.getDate()).padStart(2, '0')}`
          const scheduleDate = new Date(scheduleDateStr + 'T00:00:00')
          const weekStartLocal = new Date(weekStartStr + 'T00:00:00')
          const timeDiff = scheduleDate.getTime() - weekStartLocal.getTime()
          const daysDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24))
          // 🆕 ADD: Detailed date comparison logging
          if (totalSchedulesProcessed <= 5) {
            console.log(
              `📅 Schedule ${totalSchedulesProcessed}: date=${schedule.date}, daysDiff=${daysDiff}, weekStart=${weekStartLocal.toISOString().split('T')[0]}`,
            )
          }
          if (daysDiff >= 0 && daysDiff < 7) {
            schedulesInWeekRange++
            // ✅ Check if this is a day off shift first
            const isDayOffShift =
              schedule.shift_type_name?.toLowerCase().includes('day off') ||
              schedule.shift_type_name?.toLowerCase().includes('dayoff') ||
              schedule.shift_type_name?.toLowerCase().includes('rest day') ||
              schedule.shift_type_name?.toLowerCase().includes('off day') ||
              schedule.shift_type_name?.toLowerCase() === 'off' ||
              schedule.status === 'day_off' ||
              schedule.status === 'off' ||
              schedule.is_day_off === true ||
              schedule.is_off === true
            // ✅ Extract times (use null for day off shifts)
            const startTime = isDayOffShift
              ? null
              : schedule.actual_start_time?.substring(0, 5) ||
                schedule.start_time?.substring(0, 5) ||
                '09:00'
            const endTime = isDayOffShift
              ? null
              : schedule.actual_end_time?.substring(0, 5) ||
                schedule.end_time?.substring(0, 5) ||
                '17:00'
            // ✅ The API never returns a shift_type_id.
            // Match shift type by comparing actual times to shift type defaults.
            let shiftTypeId = null
            let shiftTypeName = 'Shift'
            if (isDayOffShift) {
              shiftTypeName = 'Day Off'
            } else if (startTime && shiftTypes.value.length > 0) {
              // Try exact start + end time match
              const exactMatch = shiftTypes.value.find((st) => {
                const stStart = st.default_start_time?.substring(0, 5)
                const stEnd = st.default_end_time?.substring(0, 5)
                return stStart === startTime && stEnd === endTime
              })
              if (exactMatch) {
                shiftTypeId = exactMatch.id
                shiftTypeName = exactMatch.name
              } else {
                // Fall back to start-time-only match (handles graveyard cross-midnight)
                const startMatch = shiftTypes.value.find(
                  (st) => st.default_start_time?.substring(0, 5) === startTime,
                )
                if (startMatch) {
                  shiftTypeId = startMatch.id
                  shiftTypeName = startMatch.name
                } else {
                  // Last resort: use first shift type
                  shiftTypeId = shiftTypes.value[0].id
                  shiftTypeName = shiftTypes.value[0].name
                }
              }
            }
            // Log all ID-related fields on first dual shift to diagnose wrong assignmentId
            console.log(`🔑 Schedule ID fields [${sIndex}]:`, {
              id: schedule.id,
              employee_assignment_id: schedule.employee_assignment_id,
              assignment_id: schedule.assignment_id,
              all_keys: Object.keys(schedule).filter((k) => k.includes('id') || k.includes('Id')),
            })
            const resolvedAssignmentId =
              schedule.employee_assignment_id || schedule.assignment_id || null
            if (!resolvedAssignmentId) {
              console.error(
                '❌ CRITICAL: assignment ID missing — schedule.id is NOT the assignment ID and must NOT be used as fallback. Raw schedule:',
                schedule,
              )
            }
            const shift = {
              id: schedule.id ? `${schedule.id}-${sIndex}` : `temp-${Date.now()}-${sIndex}`,
              assignmentId: resolvedAssignmentId,
              userId: employee.id,
              day: daysDiff,
              startTime: startTime,
              endTime: endTime,
              position: shiftTypeName,
              shiftTypeId: shiftTypeId,
              site: schedule.site || null,
              department: schedule.department || null,
              status: schedule.status || 'draft',
              date: schedule.date,
              is_off: schedule.is_off || false,
            }
            // ✅ WARN about missing critical fields
            if (!shift.assignmentId) {
              console.error('❌ CRITICAL: No assignment ID for shift:', schedule.id)
            }
            if (!shift.shiftTypeId) {
              console.error('❌ CRITICAL: No shift type ID for shift:', schedule.id)
            }
            if (!shift.site) {
              console.warn('⚠️ No site ID for shift:', schedule.id)
            }
            shifts.value.push(shift)
          } else {
            schedulesOutsideWeekRange++
          }
        } catch (err) {
          console.error('❌ Error processing schedule:', err)
        }
      })
    })
    // 🆕 ADD: Summary of date filtering
    console.log('\n=== 📅 DATE FILTERING SUMMARY ===')
    console.log('Total schedules processed:', totalSchedulesProcessed)
    console.log('Schedules within week range:', schedulesInWeekRange)
    console.log('Schedules outside week range:', schedulesOutsideWeekRange)
    console.log('Selected week:', {
      start: selectedWeek.value.start.toISOString().split('T')[0],
      end: selectedWeek.value.end.toISOString().split('T')[0],
    })
    console.log('\n=== FINAL RESULTS ===')
    console.log('👥 Users loaded:', users.value.length)
    console.log('📋 Shifts loaded:', shifts.value.length)
    console.log('📋 First shift:', shifts.value[0])
    console.log('📋 Shifts with assignmentId:', shifts.value.filter((s) => s.assignmentId).length)
    console.log(
      '📋 Shifts WITHOUT assignmentId:',
      shifts.value.filter((s) => !s.assignmentId).length,
    )
    // ✅ LOG DAY OFF SHIFTS
    const dayOffShifts = shifts.value.filter(
      (s) =>
        (!s.startTime && !s.endTime) ||
        s.position?.toLowerCase().includes('day off') ||
        s.position?.toLowerCase().includes('off'),
    )
    if (dayOffShifts.length > 0) {
      console.log('🏖️ DAY OFF SHIFTS FOUND:', dayOffShifts.length)
      console.log(
        'Day off shift examples:',
        dayOffShifts.slice(0, 3).map((s) => ({
          id: s.id,
          userId: s.userId,
          date: s.date,
          day: s.day,
          position: s.position,
          startTime: s.startTime,
          endTime: s.endTime,
          status: s.status,
        })),
      )
    } else {
      console.log('⚠️ NO DAY OFF SHIFTS DETECTED')
    }
    // ✅ LOG SHIFTS WITH MISSING SHIFT TYPES
    const shiftsWithoutShiftType = shifts.value.filter(
      (s) => !s.shiftTypeId && s.startTime && s.endTime,
    )
    if (shiftsWithoutShiftType.length > 0) {
      console.error(
        '❌ CRITICAL: Some shifts are missing shift type IDs:',
        shiftsWithoutShiftType.length,
      )
      console.error(
        'Affected shifts:',
        shiftsWithoutShiftType.map((s) => ({
          id: s.id,
          date: s.date,
          times: `${s.startTime}-${s.endTime}`,
        })),
      )
    }
    console.log('🔍 SAMPLE SHIFTS WITH FULL DATA:')
    shifts.value.slice(0, 3).forEach((shift, idx) => {
      console.log(`Shift ${idx + 1}:`, {
        id: shift.id,
        assignmentId: shift.assignmentId,
        assignmentIdType: typeof shift.assignmentId,
        userId: shift.userId,
        date: shift.date,
        site: shift.site,
        siteType: typeof shift.site,
        department: shift.department,
        position: shift.position,
        shiftTypeId: shift.shiftTypeId,
        shiftTypeIdType: typeof shift.shiftTypeId,
      })
    })
    if (shifts.value.length > 0) {
      $q.notify({
        type: 'positive',
        message: `Loaded ${shifts.value.length} schedules`,
        timeout: 2000,
      })
    } else {
      $q.notify({
        type: 'info',
        message: 'No schedules found for the selected week.',
        timeout: 3000,
      })
    }
  } catch (e) {
    console.error('❌ FETCH ERROR:', e)
    console.error('❌ Response:', e.response?.data)
    $q.notify({
      type: 'negative',
      message: 'Failed to load schedules',
      timeout: 5000,
    })
  }
}
// ── localStorage leave helpers ──────────────────────────────────────────────
const LEAVE_STORAGE_KEY = 'wagey_leaves'

const getStoredLeaves = () => {
  try {
    return JSON.parse(localStorage.getItem(LEAVE_STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

const saveLeaveToStorage = (leave) => {
  const leaves = getStoredLeaves()
  if (!leaves.find((l) => l.localId === leave.localId)) {
    leaves.push(leave)
    localStorage.setItem(LEAVE_STORAGE_KEY, JSON.stringify(leaves))
  }
}

const removeLeaveFromStorage = (localId) => {
  const leaves = getStoredLeaves().filter((l) => l.localId !== localId)
  localStorage.setItem(LEAVE_STORAGE_KEY, JSON.stringify(leaves))
}

const fetchLeaves = () => {
  let companyId = localStorage.getItem('selectedCompany')
  try {
    const parsed = JSON.parse(companyId)
    companyId = parsed?.id || parsed
  } catch {}
  companyId = String(companyId)

  const ws = selectedWeek.value.start
  const weekStartStr = `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, '0')}-${String(ws.getDate()).padStart(2, '0')}`

  const allLeaves = getStoredLeaves().filter((l) => String(l.companyId) === companyId)
  console.log('📦 Leaves from localStorage:', allLeaves.length)

  // Remove old leave injections then re-inject
  shifts.value = shifts.value.filter((s) => !s.isLeave)

  const weekStart = new Date(weekStartStr + 'T00:00:00')
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  allLeaves.forEach((leave) => {
    if (!leave.start_date) return
    const ls = new Date(leave.start_date + 'T00:00:00')
    const le = new Date((leave.end_date || leave.start_date) + 'T00:00:00')
    if (ls > weekEnd || le < weekStart) return

    const leaveTypeName =
      leaveTypes.value.find((lt) => lt.id === leave.leave_type)?.name ||
      leave.leave_type_name ||
      'Leave'

    for (let d = new Date(ls); d <= le; d.setDate(d.getDate() + 1)) {
      const timeDiff = d.getTime() - weekStart.getTime()
      const daysDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24))
      if (daysDiff >= 0 && daysDiff < 7) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        shifts.value.push({
          id: `leave-${leave.localId}-${daysDiff}`,
          assignmentId: leave.localId,
          userId: leave.employee_id,
          day: daysDiff,
          startTime: null,
          endTime: null,
          position: leaveTypeName,
          shiftTypeId: null,
          site: null,
          department: null,
          status: 'approved',
          date: dateStr,
          isLeave: true,
          leaveTypeName,
        })
      }
    }
  })

  console.log('📋 Shifts after leave injection:', shifts.value.length)
}
onMounted(async () => {
  await fetchSitesAndDepartments()
  await fetchEmployees()
  await fetchLeaveTypes()
  await fetchData()
  fetchLeaves()
  await debugEmployeeAndCompany()
})
const checkEmployeeScheduleOnDate = async (employeeId, dateStr) => {
  try {
    const token = localStorage.getItem('access_token')
    const companyId = localStorage.getItem('selectedCompany')
    if (!token || !companyId) {
      return shifts.value.some((s) => {
        if (s.userId !== employeeId) return false
        const { start } = selectedWeek.value
        const shiftDate = new Date(start)
        shiftDate.setDate(start.getDate() + s.day)
        const shiftDateStr = shiftDate.toISOString().split('T')[0]
        return shiftDateStr === dateStr
      })
    }
    const response = await axios.get(
      `https://staging.wageyapp.com/organization/schedules/company/monthly/?company=${companyId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const employeesData = response.data || []
    const employeeData = employeesData.find((emp) => emp.employee.id === employeeId)
    if (!employeeData) return false
    return employeeData.schedules.some((schedule) => {
      const scheduleDate = schedule.date.split('T')[0]
      return scheduleDate === dateStr
    })
  } catch (error) {
    console.error('Error checking employee schedule:', error)
    return false
  }
}
// Helpers
const getShifts = (employeeId, dayIdx) =>
  shifts.value.filter((shift) => shift.userId === employeeId && shift.day === dayIdx)

// Returns shifts merged: multiple regular shifts on the same day are combined into one entry.
// Leave and Day Off shifts are never merged with regular shifts.
const getMergedShifts = (employeeId, dayIdx) => {
  const dayShifts = getShifts(employeeId, dayIdx)

  // Separate special shifts (leave / day off) from regular shifts
  const specialShifts = dayShifts.filter((s) => s.isLeave || isDayOff(s))
  const regularShifts = dayShifts.filter((s) => !s.isLeave && !isDayOff(s))

  if (regularShifts.length <= 1) {
    // Nothing to merge — return as-is
    return [...specialShifts, ...regularShifts]
  }

  // Sort regular shifts by startTime so earliest shows first
  const sorted = [...regularShifts].sort((a, b) =>
    (a.startTime || '').localeCompare(b.startTime || ''),
  )

  // Build labels in the desired format:
  // Line 1: "09:00 GMT - 18:00/22:00 GMT - 06:00"
  const timeParts = sorted.map((s) => `${formatTimeWithTimezone(s.startTime)} - ${s.endTime}`)
  const mergedTimeLabel = timeParts.join('/')

  // Line 2: "Fatima Station/Fatima Station"
  const mergedSiteLabel = sorted
    .map((s) => getSiteName(s.site) || '')
    .filter(Boolean)
    .join('/')

  // Line 3: "Whole Day/Night Shift" — just the position names joined
  const mergedPositionLabel = sorted
    .map((s) => getPositionName(s.position) || '')
    .filter(Boolean)
    .join(' / ')

  const merged = {
    id: `merged-${employeeId}-${dayIdx}`,
    userId: employeeId,
    day: dayIdx,
    isMerged: true,
    shifts: sorted,
    mergedTimeLabel,
    mergedSiteLabel,
    mergedPositionLabel,
    site: sorted[0].site,
    position: sorted[0].position,
    startTime: sorted[0].startTime,
    endTime: sorted[sorted.length - 1].endTime,
  }

  return [...specialShifts, merged]
}
const getUserShiftCount = (userId) => shifts.value.filter((s) => s.userId === userId).length
const getEmployeeName = (id) => {
  const user = users.value.find((u) => u.id === id)
  return user?.name || 'Unknown Employee'
}
const getShiftTypeDetails = (shiftTypeId) => {
  const shiftType = shiftTypes.value.find((st) => st.id === shiftTypeId)
  if (!shiftType) return ''
  const start = shiftType.default_start_time?.substring(0, 5) || ''
  const end = shiftType.default_end_time?.substring(0, 5) || ''
  return start && end ? `${start} - ${end}` : ''
}
const createScheduleRecord = async (scheduleData, dateStr) => {
  const token = localStorage.getItem('access_token')
  let companyId = localStorage.getItem('selectedCompany')
  console.log('=== CREATE SCHEDULE DEBUG ===')
  console.log('📋 Raw scheduleData:', scheduleData)
  console.log('📅 Date string:', dateStr)
  console.log('🏢 Raw companyId from localStorage:', companyId)
  if (!companyId) {
    throw new Error('No company selected')
  }
  try {
    const parsed = JSON.parse(companyId)
    companyId = parsed?.id || parsed
  } catch {
    // Already a plain value
  }
  companyId = parseInt(companyId)
  console.log('🏢 Normalized companyId:', companyId, typeof companyId)
  console.log('👤 Employee ID:', scheduleData.userId, typeof scheduleData.userId)
  console.log('🏢 Site ID:', scheduleData.site, typeof scheduleData.site)
  console.log('👔 Shift Type ID:', scheduleData.position, typeof scheduleData.position)
  if (!scheduleData.userIds || scheduleData.userIds.length === 0) {
    throw new Error('At least one employee is required')
  }
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    scheduleData.userId,
  )
  console.log('🔑 Employee ID format - Is UUID?:', isUUID)
  const employeeId = isUUID ? scheduleData.userId : parseInt(scheduleData.userId)
  const payload = {
    company_id: companyId,
    employee_ids: [employeeId],
    schedules: [
      {
        date: dateStr,
        site_id: parseInt(scheduleData.site),
        shift_type_id: parseInt(scheduleData.position),
        department_id: parseInt(scheduleData.department || departments.value[0]?.id),
      },
    ],
  }
  if (scheduleData.department) {
    payload.schedules[0].department_id = parseInt(scheduleData.department)
  }
  console.log('📤 Final Payload:', JSON.stringify(payload, null, 2))
  console.log('📤 Payload Types:', {
    company_id: typeof payload.company_id,
    employee_ids: typeof payload.employee_ids[0],
    site_id: typeof payload.schedules[0].site_id,
    shift_type_id: typeof payload.schedules[0].shift_type_id,
  })
  try {
    const response = await axios.post(
      'https://staging.wageyapp.com/organization/assignments/assign/',
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    )
    console.log('✅ SUCCESS - Response:', response.data)
    return response.data
  } catch (error) {
    console.error('❌ FAILED - Full Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
    })
    if (error.response?.data?.results && error.response.data.results.length === 0) {
      console.error('⚠️ DIAGNOSIS: Empty results array - Common causes:')
      console.error('  1. Employee is not linked to this company')
      console.error('  2. Invalid employee_id format')
      console.error("  3. Company_id does not match employee's company")
      console.error('  4. Site or shift_type does not exist for this company')
      try {
        const empResponse = await axios.get(
          `https://staging.wageyapp.com/user/companies/${companyId}/employees/`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        const employeeExists = empResponse.data.some((emp) => emp.id === employeeId)
        console.error('🔍 Employee verification:', {
          employeeId: employeeId,
          existsInCompany: employeeExists,
          totalEmployees: empResponse.data.length,
        })
        if (!employeeExists) {
          throw new Error(`Employee ${employeeId} is not linked to company ${companyId}`)
        }
      } catch (verifyError) {
        console.error('❌ Could not verify employee:', verifyError)
      }
    }
    throw error
  }
}
const createRecurringSchedule = async (scheduleData) => {
  const token = localStorage.getItem('access_token')
  let companyId = localStorage.getItem('selectedCompany')
  console.log('=== CREATE RECURRING SCHEDULE DEBUG ===')
  console.log('📋 Raw scheduleData:', scheduleData)
  if (!companyId) throw new Error('No company selected')
  try {
    const parsed = JSON.parse(companyId)
    companyId = parsed?.id || parsed
  } catch {
    // Already a plain value
  }
  companyId = parseInt(companyId)
  // Validate required fields
  if (!scheduleData.userIds || scheduleData.userIds.length === 0) {
    throw new Error('At least one employee is required')
  }
  if (!scheduleData.recurringSchedule) throw new Error('Recurring template is required')
  if (!scheduleData.recurringStartDate) throw new Error('Start date is required')
  if (!scheduleData.recurringEndDate) throw new Error('End date is required')
  if (!scheduleData.site) throw new Error('Site is required')
  console.log('✅ All required fields present')
  // Normalize employee IDs (handle both UUID and integer)
  const employeeIds = scheduleData.userIds.map((id) => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      String(id),
    )
    return isUUID ? id : parseInt(id)
  })
  console.log('👥 Employee IDs to assign:', employeeIds)
  // Verify all employees belong to the company
  try {
    const companyEmpsRes = await axios.get(
      `https://staging.wageyapp.com/user/companies/${companyId}/employees/`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const invalidIds = employeeIds.filter((id) => !companyEmpsRes.data.some((emp) => emp.id === id))
    if (invalidIds.length > 0) {
      throw new Error(`Some employees are not linked to this company: ${invalidIds.join(', ')}`)
    }
    console.log('✅ All employees verified in company')
  } catch (verifyError) {
    console.error('❌ Could not verify employees:', verifyError)
    throw verifyError
  }
  // Validate recurring template
  const templateExists = recurringSchedules.value.find(
    (r) => r.id === parseInt(scheduleData.recurringSchedule),
  )
  if (!templateExists) {
    throw new Error(`Recurring template ${scheduleData.recurringSchedule} not found`)
  }
  console.log('✅ Recurring template verified:', templateExists.name)
  if (templateExists.start_date && templateExists.end_date) {
    const templateStart = new Date(templateExists.start_date)
    const templateEnd = new Date(templateExists.end_date)
    scheduleData.recurringStartDate =
      scheduleData.recurringStartDate < templateExists.start_date
        ? templateExists.start_date
        : scheduleData.recurringStartDate
    scheduleData.recurringEndDate =
      scheduleData.recurringEndDate > templateExists.end_date
        ? templateExists.end_date
        : scheduleData.recurringEndDate
    console.log('⚠️ Dates clamped to template range')
  }
  // Validate site
  const siteExists = sites.value.find((s) => s.id === parseInt(scheduleData.site))
  if (!siteExists) throw new Error(`Site ${scheduleData.site} not found`)
  console.log('✅ Site verified:', siteExists.name)
  // Pre-check: filter out employees who already have schedules in the date range
  let finalEmployeeIds = [...employeeIds]
  try {
    const existingRes = await axios.get(
      `https://staging.wageyapp.com/organization/schedules/company/monthly/?company=${companyId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const existingData = existingRes.data?.results || existingRes.data || []
    const rangeStart = new Date(scheduleData.recurringStartDate)
    const rangeEnd = new Date(scheduleData.recurringEndDate)
    const conflictingNames = []
    const cleanIds = []
    for (const empId of employeeIds) {
      const empData = existingData.find((e) => e.employee?.id === empId || e.id === empId)
      const schedules = empData?.schedules || empData?.schedule || []
      const hasConflict = schedules.some((s) => {
        const d = new Date(s.date)
        return d >= rangeStart && d <= rangeEnd
      })
      if (hasConflict) {
        const emp = employees.value.find((e) => e.id === empId)
        conflictingNames.push(emp?.full_name || emp?.name || String(empId))
      } else {
        cleanIds.push(empId)
      }
    }
    if (conflictingNames.length > 0) {
      $q.notify({
        type: 'warning',
        message: `Skipped ${conflictingNames.length} employee(s) with existing schedules`,
        caption: conflictingNames.join(', '),
        timeout: 8000,
        position: 'top',
        multiLine: true,
        actions: [{ label: 'Dismiss', color: 'white' }],
      })
      if (cleanIds.length === 0) {
        throw new Error('All selected employees already have schedules in this date range.')
      }
      finalEmployeeIds = cleanIds
    }
  } catch (preCheckError) {
    if (preCheckError.message?.includes('already have schedules')) throw preCheckError
    // If pre-check fails for other reasons, proceed with all employees
    console.warn('⚠️ Pre-check skipped due to error:', preCheckError.message)
  }
  // Build and send payload
  const payload = {
    company_id: companyId,
    employee_ids: finalEmployeeIds,
    recurring: [
      {
        recurring_id: parseInt(scheduleData.recurringSchedule),
        start_date: scheduleData.recurringStartDate,
        end_date: scheduleData.recurringEndDate,
        site_id: parseInt(scheduleData.site),
      },
    ],
  }
  if (scheduleData.department) {
    payload.recurring[0].department_id = parseInt(scheduleData.department)
  }
  console.log('📤 Recurring Payload:', JSON.stringify(payload, null, 2))
  try {
    const response = await axios.post(
      'https://staging.wageyapp.com/organization/assignments/assign/',
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    )
    console.log('✅ SUCCESS - Recurring Schedule Response:', response.data)
    return response.data
  } catch (error) {
    console.error('❌ FAILED - Recurring Schedule Error:', {
      status: error.response?.status,
      data: error.response?.data,
    })
    console.error('❌ Failed payload was:', JSON.stringify(payload, null, 2))
    // Parse duplicate key errors and show human-readable names
    const apiErrors = error.response?.data?.errors
    if (Array.isArray(apiErrors) && apiErrors.length > 0) {
      const names = apiErrors.map((e) => {
        const uuidMatch = e.match(/^([0-9a-f-]{36})/)
        const empId = uuidMatch?.[1]
        const emp = employees.value.find((em) => em.id === empId)
        return emp?.full_name || emp?.name || empId || 'Unknown employee'
      })
      throw new Error(
        `Duplicate schedule detected for: ${names.join(', ')}. These employees already have assignments in the selected date range.`,
      )
    }
    throw error
  }
}
const handleScheduleError = (error) => {
  console.error('❌ Full Error Object:', error)
  console.error('❌ Error Response:', error.response)
  console.error('❌ Error Data:', error.response?.data)
  let errorMessage = 'Failed to create schedule'
  let caption = 'Please try again'
  if (error.response?.data) {
    const data = error.response.data
    console.error('❌ Full Error Data:', JSON.stringify(data, null, 2))
    if (data.results && Array.isArray(data.results) && data.results.length === 0) {
      errorMessage = 'Could not create schedule'
      caption =
        'Common causes: Employee not linked to company, invalid recurring template, invalid site, date format issues, or permission problems. Check console for details.'
    } else if (data.errors && Array.isArray(data.errors)) {
      errorMessage = data.errors.join('; ')
      caption = 'Please correct the errors above'
    } else if (typeof data === 'object') {
      const errorDetails = []
      Object.keys(data).forEach((key) => {
        const value = data[key]
        if (key !== 'results' || (Array.isArray(value) && value.length > 0)) {
          const message = Array.isArray(value) ? value.join(', ') : value
          errorDetails.push(`${key}: ${message}`)
          console.error(`❌ ${key}:`, value)
        }
      })
      if (errorDetails.length > 0) {
        errorMessage = errorDetails.join('; ')
      } else if (data.detail) {
        errorMessage = data.detail
      }
    } else if (typeof data === 'string') {
      errorMessage = data
    }
  }
  if (error.response?.status === 400) {
    caption = 'Bad Request - Check console for detailed validation errors'
  } else if (error.response?.status === 404) {
    caption = 'Resource not found - Check company, site, or shift type IDs'
  } else if (error.response?.status === 403) {
    caption = 'Permission denied - You may not have access to this resource'
  }
  $q.notify({
    type: 'negative',
    message: errorMessage,
    caption: caption,
    timeout: 10000,
    position: 'top',
    multiLine: true,
    actions: [
      {
        label: 'View Console',
        color: 'white',
        handler: () => console.table({ error: error.response?.data }),
      },
      { label: 'Dismiss', color: 'white' },
    ],
  })
}
const debugEmployeeAndCompany = async () => {
  try {
    const token = localStorage.getItem('access_token')
    let companyId = localStorage.getItem('selectedCompany')
    try {
      const parsed = JSON.parse(companyId)
      companyId = parsed?.id || parsed
    } catch {
      // Already plain value
    }
    companyId = parseInt(companyId)
    console.log('=== EMPLOYEE-COMPANY DEBUG ===')
    console.log('🏢 Company ID:', companyId)
    const empResponse = await axios.get(
      `https://staging.wageyapp.com/user/companies/${companyId}/employees/`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    console.log('👥 Total Employees:', empResponse.data.length)
    console.log(
      '👥 Employee IDs:',
      empResponse.data.map((e) => ({
        id: e.id,
        name: e.full_name || e.name,
        type: typeof e.id,
      })),
    )
    const sitesResponse = await axios.get(
      `https://staging.wageyapp.com/organization/sites/?company=${companyId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    console.log(
      '🏢 Sites:',
      (sitesResponse.data.results || sitesResponse.data).map((s) => ({
        id: s.id,
        name: s.name,
      })),
    )
    const shiftResponse = await axios.get(
      `https://staging.wageyapp.com/organization/shift-types/?company=${companyId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    console.log(
      '👔 Shift Types:',
      (shiftResponse.data.results || shiftResponse.data).map((st) => ({
        id: st.id,
        name: st.name,
      })),
    )
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}
const verifyEmployeeCompanyLink = async (employeeId) => {
  try {
    const token = localStorage.getItem('access_token')
    let companyId = localStorage.getItem('selectedCompany')
    try {
      const parsed = JSON.parse(companyId)
      companyId = parsed?.id || parsed
    } catch {
      // Already a plain string/number
    }
    const response = await axios.get(
      `https://staging.wageyapp.com/user/companies/${companyId}/employees/`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const employeeExists = response.data.some((emp) => emp.id === employeeId)
    console.log('Employee verification:', {
      employeeId,
      companyId,
      exists: employeeExists,
    })
    return employeeExists
  } catch (error) {
    console.error('Failed to verify employee:', error)
    return false
  }
}
const addSchedule = async () => {
  const n = newSchedule.value
  if (n.scheduleType !== 'recurring' && (!n.userIds || n.userIds.length === 0)) {
    $q.notify({ type: 'negative', message: 'Please select at least one employee.' })
    return
  }
  if (n.scheduleType === 'one-time') {
    if (!n.selectedDates || n.selectedDates.length === 0) {
      $q.notify({ type: 'negative', message: 'Please select at least one date.' })
      return
    }
    if (!n.oneTimeShifts || n.oneTimeShifts.length === 0) {
      $q.notify({ type: 'negative', message: 'Please add at least one shift.' })
      return
    }
    if (n.oneTimeShifts.some((s) => !s.site || !s.shiftType)) {
      $q.notify({ type: 'negative', message: 'Please fill in site and shift type for all shifts.' })
      return
    }
  }
  if (n.scheduleType === 'recurring') {
    if (!n.userIds || n.userIds.length === 0) {
      $q.notify({ type: 'negative', message: 'Please select at least one employee.' })
      return
    }
    if (!n.recurringStartDate) {
      $q.notify({ type: 'negative', message: 'Please select a start date.' })
      return
    }
    if (!n.recurringEndDate) {
      $q.notify({ type: 'negative', message: 'Please select an end date.' })
      return
    }
    if (!n.recurringSchedule) {
      $q.notify({ type: 'negative', message: 'Please select a recurring template.' })
      return
    }
  }
  // Only require site at top level for recurring (one-time has site per shift row)
  if (n.scheduleType === 'recurring' && !n.site) {
    $q.notify({ type: 'negative', message: 'Please select a site.' })
    return
  }
  isCheckingConflict.value = true
  addConflictWarning.value = false
  try {
    if (n.scheduleType === 'recurring') {
      // Multi-employee verification is handled inside createRecurringSchedule
      await createRecurringSchedule(n)
    } else {
      // One-time: build payload from selectedDates x oneTimeShifts
      console.log('🔍 Verifying employee-company links...')
      const invalidEmployees = []
      for (const empId of n.userIds) {
        const isLinked = await verifyEmployeeCompanyLink(empId)
        if (!isLinked) {
          const emp = employees.value.find((e) => e.id === empId)
          invalidEmployees.push(emp?.full_name || emp?.name || empId)
        }
      }
      if (invalidEmployees.length > 0) {
        isCheckingConflict.value = false
        $q.notify({
          type: 'negative',
          message: `Some employees are not linked to this company: ${invalidEmployees.join(', ')}`,
          timeout: 8000,
        })
        return
      }
      console.log('✅ All employees verified')
      const token = localStorage.getItem('access_token')
      let companyId = localStorage.getItem('selectedCompany')
      try {
        const parsed = JSON.parse(companyId)
        companyId = parsed?.id || parsed
      } catch {}
      companyId = parseInt(companyId)
      const schedulePayloads = []
      for (const dateStr of n.selectedDates) {
        for (const shift of n.oneTimeShifts) {
          schedulePayloads.push({
            date: dateStr,
            site_id: parseInt(shift.site),
            shift_type_id: parseInt(shift.shiftType),
          })
        }
      }
      const payload = {
        company_id: companyId,
        employee_ids: n.userIds,
        schedules: schedulePayloads,
      }
      console.log('📤 One-time payload:', JSON.stringify(payload, null, 2))
      await axios.post('https://staging.wageyapp.com/organization/assignments/assign/', payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
    }
    isCheckingConflict.value = false
    showAddModal.value = false
    newSchedule.value = {
      userId: null,
      userIds: [],
      selectedDate: null,
      selectedDates: [],
      oneTimeShifts: [{ site: null, shiftType: null }],
      startTime: '',
      endTime: '',
      position: null,
      site: null,
      department: null,
      recurringSchedule: null,
      scheduleType: 'one-time',
      isRotating: false,
      rotationShifts: [],
      weekdays: [],
      repeatInterval: 1,
      recurringStartDate: null,
      recurringEndDate: null,
    }
    $q.notify({
      type: 'positive',
      message: `${n.scheduleType === 'recurring' ? 'Recurring schedule' : 'Schedule'} created successfully!`,
      icon: 'check_circle',
    })
    setTimeout(async () => {
      await fetchData()
      fetchLeaves()
    }, 500)
  } catch (error) {
    isCheckingConflict.value = false
    console.error('❌ Error adding schedule:', error)
    handleScheduleError(error)
  }
}
const quickAddSchedule = async () => {
  console.log('🚀 Quick Add Started')
  const { userId, day, shifts } = quickAdd.value
  console.log('📋 Quick Add Values:', { userId, day, shifts })
  if (!userId || day === null) {
    $q.notify({
      type: 'negative',
      message: 'Employee and day are required.',
    })
    return
  }
  for (let i = 0; i < shifts.length; i++) {
    const shift = shifts[i]
    if (!shift.site || !shift.shiftType) {
      $q.notify({
        type: 'negative',
        message: `Please fill all fields for shift ${i + 1}`,
      })
      return
    }
  }
  isAddingShift.value = true
  try {
    const token = localStorage.getItem('access_token')
    let rawCompanyId = localStorage.getItem('selectedCompany')
    if (!token || !rawCompanyId) {
      $q.notify({
        type: 'negative',
        message: 'Authentication required. Please log in.',
      })
      isAddingShift.value = false
      return
    }
    // Parse companyId the same way as addSchedule/createScheduleRecord do
    let companyId
    try {
      const parsed = JSON.parse(rawCompanyId)
      companyId = parsed?.id || parsed
    } catch {
      companyId = rawCompanyId
    }
    companyId = parseInt(companyId)
    console.log('=== DATE CALCULATION DEBUG ===')
    const { start } = selectedWeek.value
    const weekStart = start instanceof Date ? start : new Date(start)
    const targetDate = new Date(weekStart)
    targetDate.setDate(targetDate.getDate() + day)
    console.log('Target date:', targetDate)
    const year = targetDate.getFullYear()
    const month = String(targetDate.getMonth() + 1).padStart(2, '0')
    const dayOfMonth = String(targetDate.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${dayOfMonth}`
    console.log('Final dateStr:', dateStr)
    const schedulePayloads = shifts.map((shift) => ({
      date: dateStr,
      site_id: parseInt(shift.site),
      shift_type_id: parseInt(shift.shiftType),
    }))
    const payload = {
      company_id: companyId,
      employee_ids: [userId],
      schedules: schedulePayloads,
    }
    console.log('📤 Sending payload with multiple shifts:', JSON.stringify(payload, null, 2))
    const response = await axios.post(
      'https://staging.wageyapp.com/organization/assignments/assign/',
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    )
    console.log('✅ Success:', response.data)
    $q.notify({
      type: 'positive',
      message: `${shifts.length} shift${shifts.length > 1 ? 's' : ''} added successfully for ${days[day]}!`,
      icon: 'check_circle',
    })
    closeQuickAddModal()
    setTimeout(async () => {
      await fetchData()
      fetchLeaves()
    }, 500)
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message)
    const resolveEmployeeName = (id) => {
      const emp = users.value.find((u) => String(u.id) === String(id))
      return emp?.name || null
    }
    const humanizeErrorMessage = (msg) => {
      // Replace UUIDs with employee names
      let result = msg.replace(
        /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi,
        (match) => resolveEmployeeName(match) || match,
      )
      // Friendly message for daily hours exceeded
      result = result.replace(
        /(.+?)\s+exceeds allowed daily hours on (\d{4}-\d{2}-\d{2})/i,
        (_, name, date) =>
          `"${name}" has already reached the maximum allowed hours on ${date}. Remove or shorten an existing shift first.`,
      )
      // Friendly message for duplicate/conflict
      result = result.replace(
        /(.+?)\s+already has a schedule on (\d{4}-\d{2}-\d{2})/i,
        (_, name, date) =>
          `"${name}" already has a schedule on ${date}. Please remove the existing shift first.`,
      )
      return result
    }
    let errorMsg = 'Failed to add shifts'
    let errorCaption = ''
    if (error.response?.data) {
      const data = error.response.data
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        const humanized = data.errors.map(humanizeErrorMessage)
        if (humanized.length === 1) {
          errorMsg = humanized[0]
        } else {
          errorMsg = 'Some shifts could not be created'
          errorCaption = humanized.join('\n')
        }
      } else if (data.detail) {
        errorMsg = humanizeErrorMessage(data.detail)
      } else if (data.results && data.results.length === 0) {
        errorMsg = 'Unable to create schedules. Check for conflicts or invalid data.'
      } else if (typeof data === 'object') {
        const errors = Object.entries(data)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('; ')
        if (errors) errorMsg = humanizeErrorMessage(errors)
      }
    }
    $q.notify({
      type: 'negative',
      message: errorMsg,
      caption: errorCaption || undefined,
      multiLine: true,
      timeout: 8000,
      icon: 'warning',
    })
  } finally {
    isAddingShift.value = false
  }
}
const openAddModal = () => {
  newSchedule.value = {
    userId: null,
    userIds: [],
    selectedDate: null,
    selectedDates: [],
    oneTimeShifts: [{ site: null, shiftType: null }],
    startTime: '',
    endTime: '',
    position: null,
    site: null,
    department: null,
    recurringSchedule: null,
    scheduleType: 'one-time',
    isRotating: false,
    rotationShifts: [],
    weekdays: [],
    repeatInterval: 1,
    recurringStartDate: null,
    recurringEndDate: null,
  }
  addConflictWarning.value = false
  fetchEmployees()
  showAddModal.value = true
}
const closeAddModal = () => (showAddModal.value = false)
const confirmDelete = (type, payload) => {
  pendingDelete.value = { type, payload }
  showDeleteModal.value = true
}
const confirmDeleteAction = async () => {
  showDeleteModal.value = false
  const { type, payload } = pendingDelete.value
  if (type === 'single') await deleteShift(payload)
  else if (type === 'dual') await deleteDualShift(payload)
  else if (type === 'leave') await cancelLeave(payload)
  pendingDelete.value = null
}
const deleteShift = async (id) => {
  try {
    const token = localStorage.getItem('access_token')
    if (!token) {
      shifts.value = shifts.value.filter((s) => s.id !== id)
      $q.notify({ type: 'positive', message: 'Shift removed (local)' })
      return
    }
    // Find the shift to get its assignmentId
    const shift = shifts.value.find((s) => s.id === id)
    const assignmentId = shift?.assignmentId || id
    await axios.patch(
      `https://staging.wageyapp.com/organization/assignments/${assignmentId}/cancel/`,
      { status: 'cancelled' },
      { headers: { Authorization: `Bearer ${token}` } },
    )
    shifts.value = shifts.value.filter((s) => s.id !== id)
    $q.notify({ type: 'positive', message: 'Schedule cancelled successfully' })
    setTimeout(async () => {
      await fetchData()
      fetchLeaves()
    }, 1500)
  } catch (e) {
    console.error('Failed to cancel schedule:', e.response?.data || e.message)
    $q.notify({ type: 'negative', message: 'Failed to cancel schedule' })
  }
}
const openQuickAddModal = (userId, dayIdx) => {
  quickAdd.value = {
    userId,
    day: dayIdx,
    shifts: [
      {
        site: null,
        shiftType: null,
      },
    ],
    leaveType: null,
  }
  showQuickAddModal.value = true
}
const addShiftRow = () => {
  quickAdd.value.shifts.push({
    site: null,
    shiftType: null,
  })
}
const removeShiftRow = (index) => {
  quickAdd.value.shifts.splice(index, 1)
}
const closeQuickAddModal = () => {
  showQuickAddModal.value = false
  quickAdd.value = {
    userId: null,
    day: null,
    shifts: [],
    leaveType: null,
  }
}
// Leave type options — shift types that represent leaves/absences
const leaveTypeOptions = computed(() => {
  const leaveKeywords = [
    'day off',
    'dayoff',
    'rest day',
    'off day',
    'sick',
    'leave',
    'vacation',
    'annual',
    'emergency',
    'absent',
    'holiday',
  ]
  const leaveTypes = shiftTypes.value.filter((st) => {
    const name = (st.name || '').toLowerCase()
    return leaveKeywords.some((kw) => name.includes(kw))
  })
  if (leaveTypes.length > 0) {
    return leaveTypes.map((st) => ({ label: st.name, value: st.id }))
  }
  return shiftTypes.value.map((st) => ({ label: st.name, value: st.id }))
})
// When a leave type is selected from the dropdown, auto-populate the first shift row
const onLeaveTypeSelected = (shiftTypeId) => {
  if (!shiftTypeId) return
  const firstShift = quickAdd.value.shifts[0]
  if (firstShift) {
    firstShift.shiftType = shiftTypeId
    // Auto-pick first site if none selected
    if (!firstShift.site && siteOptions.value.length > 0) {
      firstShift.site = siteOptions.value[0].value
    }
  }
}
// Directly assign day off without opening the full shift form
const quickAssignDayOff = async () => {
  const { userId, day } = quickAdd.value
  if (!userId || day === null) {
    $q.notify({ type: 'negative', message: 'Employee and day are required.' })
    return
  }
  if (siteOptions.value.length === 0) {
    $q.notify({ type: 'negative', message: 'No sites available to assign day off.' })
    return
  }
  assigningDayOffId.value = 'quick'
  try {
    const token = localStorage.getItem('access_token')
    let rawCompanyId = localStorage.getItem('selectedCompany')
    let companyId
    try {
      const parsed = JSON.parse(rawCompanyId)
      companyId = parsed?.id || parsed
    } catch {
      companyId = rawCompanyId
    }
    companyId = parseInt(companyId)
    const { start } = selectedWeek.value
    const weekStart = start instanceof Date ? start : new Date(start)
    const targetDate = new Date(weekStart)
    targetDate.setDate(targetDate.getDate() + day)
    const year = targetDate.getFullYear()
    const month = String(targetDate.getMonth() + 1).padStart(2, '0')
    const dayOfMonth = String(targetDate.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${dayOfMonth}`
    const siteId = parseInt(siteOptions.value[0].value)
    const placeholderShiftTypeId = parseInt(shiftTypes.value[0]?.id)
    if (!placeholderShiftTypeId) {
      $q.notify({ type: 'negative', message: 'No shift types available to create assignment.' })
      return
    }
    // Step 1: Create a regular assignment to get an assignment_id (shift_type_id is a required placeholder)
    const assignRes = await axios.post(
      'https://staging.wageyapp.com/organization/assignments/assign/',
      {
        company_id: companyId,
        employee_ids: [userId],
        schedules: [{ date: dateStr, site_id: siteId, shift_type_id: placeholderShiftTypeId }],
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
    )
    // Step 2: Look up the newly created assignment_id for this employee + date
    const schedulesRes = await axios.get(
      `https://staging.wageyapp.com/organization/schedules/company/monthly/?company=${companyId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    console.log(
      '📦 monthly response sample:',
      JSON.stringify((schedulesRes.data || []).slice(0, 1), null, 2),
    )
    const allEmployees = schedulesRes.data || []
    const employeeData = allEmployees.find(
      (e) =>
        e.employee?.id === userId || e.id === userId || String(e.employee?.id) === String(userId),
    )
    console.log(
      '👤 employeeData found:',
      JSON.stringify(employeeData?.schedules?.slice(0, 2), null, 2),
    )
    const newSchedule = (employeeData?.schedules || []).find((s) => {
      const d = s.date || s.schedule_date || ''
      return d.startsWith(dateStr) || d === dateStr
    })
    console.log('📅 newSchedule found:', JSON.stringify(newSchedule, null, 2))
    const assignmentId =
      newSchedule?.employee_assignment_id || newSchedule?.assignment_id || newSchedule?.id
    if (!assignmentId)
      throw new Error('Could not find assignment_id for ' + dateStr + ' after assign/')
    console.log('✅ Found assignment_id for day off:', assignmentId)
    // Step 3: Mark the assignment as day off
    await axios.patch(
      'https://staging.wageyapp.com/organization/assignments/assign-off/',
      { assignment_id: parseInt(assignmentId), site_id: siteId },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
    )
    $q.notify({
      type: 'positive',
      message: 'Day off assigned!',
      caption: `${getEmployeeName(userId)} — ${days[day]}`,
      icon: 'event_busy',
      timeout: 3000,
    })
    closeQuickAddModal()
    setTimeout(async () => {
      await fetchData()
      fetchLeaves()
    }, 1500)
  } catch (error) {
    console.error('❌ Quick day off failed:', error.response?.data || error.message)
    $q.notify({
      type: 'negative',
      message: error.response?.data?.detail || 'Failed to assign day off.',
      timeout: 5000,
    })
  } finally {
    assigningDayOffId.value = null
  }
}
const assignDayOff = async (element) => {
  if (!element.assignmentId) {
    $q.notify({
      type: 'negative',
      message: 'Cannot assign day off — missing assignment ID.',
      timeout: 4000,
    })
    return
  }
  assigningDayOffId.value = element.id
  const token = localStorage.getItem('access_token')
  try {
    const payload = {
      assignment_id: parseInt(element.assignmentId),
      site_id: parseInt(element.site),
    }
    if (element.department) {
      payload.department_id = parseInt(element.department)
    }
    await axios.patch(
      'https://staging.wageyapp.com/organization/assignments/assign-off/',
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    )
    const employeeName = getEmployeeName(element.userId)
    $q.notify({
      type: 'positive',
      message: 'Day off assigned!',
      caption: `${employeeName}'s shift changed to Day Off`,
      icon: 'event_busy',
      timeout: 3000,
    })
    // Optimistically update the shift in place (same as deleteShift does locally)
    const idx = shifts.value.findIndex((s) => s.id === element.id)
    if (idx !== -1) {
      shifts.value[idx] = {
        ...shifts.value[idx],
        position: 'Day Off', // isDayOff() checks this field
        startTime: null,
        endTime: null,
      }
    }
    setTimeout(async () => {
      await fetchData()
      fetchLeaves()
    }, 1500)
  } catch (error) {
    console.error('❌ Assign day off failed:', error.response?.data || error.message)
    let errorMsg = 'Failed to assign day off.'
    if (error.response?.data?.detail) {
      errorMsg = error.response.data.detail
    } else if (typeof error.response?.data === 'object') {
      errorMsg = Object.entries(error.response.data)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('; ')
    }
    $q.notify({
      type: 'negative',
      message: errorMsg,
      timeout: 5000,
    })
  } finally {
    assigningDayOffId.value = null
  }
}
// Assign day off to BOTH shifts in a merged/dual shift
const assignDualDayOff = async (mergedElement) => {
  const missing = mergedElement.shifts.find((s) => !s.assignmentId)
  if (missing) {
    $q.notify({
      type: 'negative',
      message: 'Cannot assign day off — assignment ID missing.',
      timeout: 6000,
    })
    return
  }
  assigningDayOffId.value = mergedElement.id
  const token = localStorage.getItem('access_token')
  try {
    // Call assign-off/ directly on each existing assignment
    await Promise.all(
      mergedElement.shifts.map((s) => {
        const payload = {
          assignment_id: parseInt(s.assignmentId),
          site_id: parseInt(s.site),
        }
        if (s.department) payload.department_id = parseInt(s.department)
        return axios.patch(
          'https://staging.wageyapp.com/organization/assignments/assign-off/',
          payload,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
        )
      }),
    )

    const employeeName = getEmployeeName(mergedElement.userId)
    $q.notify({
      type: 'positive',
      message: 'Day off assigned to both shifts!',
      caption: `${employeeName}'s dual shift changed to Day Off`,
      icon: 'event_busy',
      timeout: 3000,
    })
    setTimeout(async () => {
      await fetchData()
      fetchLeaves()
    }, 1500)
  } catch (error) {
    console.error('Failed to assign dual day off:', error.response?.data || error.message)
    $q.notify({
      type: 'negative',
      message: error.response?.data?.detail || 'Failed to assign day off.',
      timeout: 5000,
    })
  } finally {
    assigningDayOffId.value = null
  }
}

// Delete (cancel) BOTH shifts in a merged/dual shift
const deleteDualShift = async (mergedElement) => {
  const token = localStorage.getItem('access_token')
  try {
    if (!token) {
      mergedElement.shifts.forEach((s) => {
        shifts.value = shifts.value.filter((x) => x.id !== s.id)
      })
      $q.notify({ type: 'positive', message: 'Both shifts removed (local)' })
      return
    }
    await Promise.all(
      mergedElement.shifts.map((s) =>
        axios.patch(
          `https://staging.wageyapp.com/organization/assignments/${s.assignmentId}/cancel/`,
          { status: 'cancelled' },
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      ),
    )
    mergedElement.shifts.forEach((s) => {
      shifts.value = shifts.value.filter((x) => x.id !== s.id)
    })
    $q.notify({ type: 'positive', message: 'Both shifts cancelled successfully' })
    setTimeout(async () => {
      await fetchData()
      fetchLeaves()
    }, 1500)
  } catch (e) {
    console.error('Failed to cancel dual shift:', e.response?.data || e.message)
    $q.notify({ type: 'negative', message: 'Failed to cancel shifts' })
  }
}

// Quick direct assign from cell buttons — no modal needed
const quickDirectAssign = async (userId, dayIdx, type, leaveSubType = null) => {
  const key = `${userId}-${dayIdx}-${type}`
  quickActionLoading.value = key
  try {
    const token = localStorage.getItem('access_token')
    // Compute the target date from week start + day index
    const { start } = selectedWeek.value
    const weekStart = start instanceof Date ? start : new Date(start)
    const targetDate = new Date(weekStart)
    targetDate.setDate(targetDate.getDate() + dayIdx)
    const year = targetDate.getFullYear()
    const month = String(targetDate.getMonth() + 1).padStart(2, '0')
    const day = String(targetDate.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    if (type === 'leave') {
      const leaveType = leaveTypes.value.find((lt) => lt.id === leaveSubType)
      const payload = {
        employee_id: userId,
        leave_type: leaveSubType,
        start_date: dateStr,
        end_date: dateStr,
        reason: leaveType?.name ?? 'Leave',
      }
      const postRes = await axios.post(
        'https://staging.wageyapp.com/attendance/leave/apply-for-employee/',
        payload,
        { headers },
      )
      // Save to localStorage so it persists across page refreshes
      // Capture the real integer ID returned by the API for cancellation
      const apiLeaveId = postRes.data?.id ?? null
      console.log('✅ Leave POST response:', postRes.data)
      let companyId = localStorage.getItem('selectedCompany')
      try {
        const parsed = JSON.parse(companyId)
        companyId = parsed?.id || parsed
      } catch {}
      const localId = `${userId}-${dateStr}-${leaveSubType}-${Date.now()}`
      saveLeaveToStorage({
        localId,
        apiId: apiLeaveId,
        companyId: String(companyId),
        employee_id: userId,
        leave_type: leaveSubType,
        leave_type_name: leaveType?.name ?? 'Leave',
        start_date: dateStr,
        end_date: dateStr,
      })
      $q.notify({
        type: 'positive',
        message: `${leaveType?.name ?? 'Leave'} assigned!`,
        caption: `${getEmployeeName(userId)} — ${days[dayIdx]}`,
        icon: 'beach_access',
        timeout: 3000,
      })
    } else {
      // Day off — Step 1: create a regular assignment, Step 2: mark it as day off
      let rawCompanyId = localStorage.getItem('selectedCompany')
      let companyId
      try {
        const parsed = JSON.parse(rawCompanyId)
        companyId = parsed?.id || parsed
      } catch {
        companyId = rawCompanyId
      }
      companyId = parseInt(companyId)
      if (siteOptions.value.length === 0) {
        $q.notify({ type: 'negative', message: 'No sites available.' })
        return
      }
      const siteId = parseInt(siteOptions.value[0].value)
      const placeholderShiftTypeId = parseInt(shiftTypes.value[0]?.id)
      if (!placeholderShiftTypeId) {
        $q.notify({ type: 'negative', message: 'No shift types available to create assignment.' })
        return
      }
      // Step 1: Create a regular assignment to get an assignment_id (shift_type_id is a required placeholder)
      const assignRes = await axios.post(
        'https://staging.wageyapp.com/organization/assignments/assign/',
        {
          company_id: companyId,
          employee_ids: [userId],
          schedules: [{ date: dateStr, site_id: siteId, shift_type_id: placeholderShiftTypeId }],
        },
        { headers },
      )
      // Step 2: Look up the newly created assignment_id for this employee + date
      const schedulesRes = await axios.get(
        `https://staging.wageyapp.com/organization/schedules/company/monthly/?company=${companyId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      console.log(
        '📦 monthly response sample:',
        JSON.stringify((schedulesRes.data || []).slice(0, 1), null, 2),
      )
      const allEmployees2 = schedulesRes.data || []
      const employeeData2 = allEmployees2.find(
        (e) =>
          e.employee?.id === userId || e.id === userId || String(e.employee?.id) === String(userId),
      )
      console.log(
        '👤 employeeData found:',
        JSON.stringify(employeeData2?.schedules?.slice(0, 2), null, 2),
      )
      const newSchedule2 = (employeeData2?.schedules || []).find((s) => {
        const d = s.date || s.schedule_date || ''
        return d.startsWith(dateStr) || d === dateStr
      })
      console.log('📅 newSchedule found:', JSON.stringify(newSchedule2, null, 2))
      const assignmentId =
        newSchedule2?.employee_assignment_id || newSchedule2?.assignment_id || newSchedule2?.id
      if (!assignmentId)
        throw new Error('Could not find assignment_id for ' + dateStr + ' after assign/')
      console.log('✅ Found assignment_id for day off:', assignmentId)
      // Step 3: Mark the assignment as day off
      await axios.patch(
        'https://staging.wageyapp.com/organization/assignments/assign-off/',
        { assignment_id: parseInt(assignmentId), site_id: siteId },
        { headers },
      )
      $q.notify({
        type: 'positive',
        message: 'Day off assigned!',
        caption: `${getEmployeeName(userId)} — ${days[dayIdx]}`,
        icon: 'event_busy',
        timeout: 3000,
      })
    }
    setTimeout(async () => {
      await fetchData()
      fetchLeaves()
    }, 500)
  } catch (error) {
    console.error(`❌ Quick ${type} failed:`, error.response?.data || error.message)
    $q.notify({
      type: 'negative',
      message:
        error.response?.data?.detail ||
        `Failed to assign ${type === 'dayoff' ? 'day off' : 'leave'}.`,
      timeout: 5000,
    })
  } finally {
    quickActionLoading.value = null
  }
}
const openReassignModal = (shift) => {
  console.log('=== 🔍 OPEN UPDATE SHIFT MODAL ===', shift)

  // ── Dual / merged shift ──
  if (shift.isMerged && shift.shifts?.length > 1) {
    const missingId = shift.shifts.find((s) => !s.assignmentId)
    if (missingId) {
      $q.notify({
        type: 'negative',
        message: 'Cannot update — missing assignment ID on one of the shifts',
        timeout: 5000,
      })
      return
    }
    reassignData.value = {
      assignmentId: null,
      shiftTypeId: null,
      siteId: null,
      departmentId: null,
      currentEmployee: shift.userId,
      date: shift.shifts[0].date,
      day: shift.day,
      isDualShift: true,
      dualShifts: shift.shifts.map((s) => ({
        assignmentId: s.assignmentId,
        shiftTypeId: s.shiftTypeId || null,
        siteId: s.site || null,
        departmentId: s.department || null,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    }
    showReassignModal.value = true
    return
  }

  // ── Single shift ──
  if (!shift.assignmentId) {
    console.error('❌ Cannot update shift - Missing: Assignment ID')
    $q.notify({
      type: 'negative',
      message: 'Cannot update this shift',
      caption: 'Missing required field: Assignment ID',
      timeout: 5000,
    })
    return
  }
  reassignData.value = {
    assignmentId: shift.assignmentId,
    shiftTypeId: shift.shiftTypeId || null,
    siteId: shift.site || null,
    departmentId: shift.department || null,
    currentEmployee: shift.userId,
    date: shift.date,
    day: shift.day,
    isDualShift: false,
    dualShifts: [],
    originalShift: { ...shift },
  }
  console.log('✅ Update shift data ready:', reassignData.value)
  showReassignModal.value = true
}
const closeReassignModal = () => {
  showReassignModal.value = false
  reassignData.value = {
    assignmentId: null,
    shiftTypeId: null,
    siteId: null,
    departmentId: null,
    currentEmployee: null,
    date: null,
    day: null,
    isDualShift: false,
    dualShifts: [],
    originalShift: null,
  }
}
const reassignShift = async () => {
  isReassigning.value = true
  const token = localStorage.getItem('access_token')
  const r = reassignData.value

  // helper to patch one assignment
  const patchOne = (assignmentId, shiftTypeId, siteId, departmentId) => {
    const payload = {
      assignment_id: parseInt(assignmentId),
      shift_type_id: parseInt(shiftTypeId),
      site_id: parseInt(siteId),
    }
    if (departmentId) payload.department_id = parseInt(departmentId)
    return axios.patch('https://staging.wageyapp.com/organization/assignments/reassign/', payload, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
  }

  try {
    if (r.isDualShift) {
      // Patch both shifts in parallel
      await Promise.all(
        r.dualShifts.map((s) => patchOne(s.assignmentId, s.shiftTypeId, s.siteId, s.departmentId)),
      )
      $q.notify({
        type: 'positive',
        message: 'Both shifts updated successfully!',
        icon: 'check_circle',
        timeout: 3000,
      })
    } else {
      console.log('🔍 Starting shift update...')
      if (!r.assignmentId) {
        $q.notify({ type: 'negative', message: 'Assignment ID is missing' })
        isReassigning.value = false
        return
      }
      if (!r.siteId) {
        $q.notify({ type: 'negative', message: 'Site is required' })
        isReassigning.value = false
        return
      }
      if (!r.shiftTypeId) {
        $q.notify({ type: 'negative', message: 'Shift type is required' })
        isReassigning.value = false
        return
      }
      await patchOne(r.assignmentId, r.shiftTypeId, r.siteId, r.departmentId)
      const employeeName = getEmployeeName(r.currentEmployee)
      const shiftTypeName = getPositionName(r.shiftTypeId)
      $q.notify({
        type: 'positive',
        message: 'Shift updated successfully!',
        caption: `${employeeName}'s shift updated to ${shiftTypeName}`,
        icon: 'check_circle',
        timeout: 3000,
      })
    }
    closeReassignModal()
    shifts.value = []
    await new Promise((resolve) => setTimeout(resolve, 500))
    await fetchData()
  } catch (error) {
    console.error('❌ Reassign failed:', error)
    console.error('❌ Error response:', error.response?.data)
    let errorMsg = 'Failed to reassign shift.'
    let errorCaption = ''
    if (error.response?.status === 400) {
      const data = error.response.data
      if (typeof data === 'object') {
        const errors = []
        Object.entries(data).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            errors.push(`${key}: ${value.join(', ')}`)
          } else {
            errors.push(`${key}: ${value}`)
          }
        })
        if (errors.length > 0) {
          errorMsg = errors.join('; ')
        }
      } else if (data.detail) {
        errorMsg = data.detail
      }
      errorCaption = 'Check the console for detailed validation errors'
    } else if (error.response?.status === 404) {
      errorMsg = 'Assignment not found'
      errorCaption = 'The assignment may be invalid or the shift was deleted'
    } else if (error.response?.status === 403) {
      errorMsg = 'Permission denied'
      errorCaption = 'You may not have access to reassign this shift'
    } else if (error.response?.data?.detail) {
      errorMsg = error.response.data.detail
    }
    $q.notify({
      type: 'negative',
      message: errorMsg,
      caption: errorCaption,
      timeout: 6000,
      actions: [{ label: 'Dismiss', color: 'white' }],
    })
  } finally {
    isReassigning.value = false
  }
}
const cancelLeave = async (element) => {
  // element.assignmentId is the localId stored in localStorage
  const localId = element.assignmentId

  // Look up the real integer API ID from localStorage
  const storedLeave = getStoredLeaves().find((l) => l.localId === localId)
  const apiId = storedLeave?.apiId ?? null

  // Always clean up localStorage and UI immediately
  removeLeaveFromStorage(localId)
  shifts.value = shifts.value.filter((s) => s.id !== element.id)

  // Only attempt API cancellation if we have a real integer ID
  if (apiId) {
    try {
      const token = localStorage.getItem('access_token')
      const headers = { Authorization: `Bearer ${token}` }
      try {
        await axios.patch(
          `https://staging.wageyapp.com/attendance/leaves/${apiId}/`,
          { status: 'cancelled' },
          { headers },
        )
      } catch (patchErr) {
        if (patchErr.response?.status === 404 || patchErr.response?.status === 405) {
          await axios.delete(`https://staging.wageyapp.com/attendance/leaves/${apiId}/`, {
            headers,
          })
        } else {
          throw patchErr
        }
      }
      $q.notify({ type: 'positive', message: 'Leave cancelled successfully', timeout: 3000 })
    } catch (error) {
      console.warn('⚠️ Leave API cancel failed (already removed from UI):', error.response?.status)
      $q.notify({ type: 'warning', message: 'Leave removed from schedule.', timeout: 3000 })
    }
  } else {
    // No API ID — leave was created before fix or API didn't return an ID
    $q.notify({ type: 'positive', message: 'Leave removed from schedule.', timeout: 3000 })
  }

  setTimeout(async () => {
    await fetchData()
    fetchLeaves()
  }, 500)
}
const applyFilters = () => {
  console.log('🔍 Filters applied:', {
    site: filters.value.site,
    employee: filters.value.employee,
    searchTerm: searchTerm.value,
  })
}
const filterEmployees = () => {}
</script>
<style scoped lang="scss">
/* ==============================
   PAGE ROOT
============================== */
.schedule-page {
  background: #f4f6f9;
  min-height: 100vh;
  padding: 0;
}

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

.title-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.timezone-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  color: #1d4ed8;
  white-space: nowrap;
}

.timezone-badge .q-icon {
  font-size: 13px;
  color: #3b82f6;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.header-search {
  min-width: 220px;
  max-width: 280px;
}

.header-search :deep(.q-field__control) {
  border-radius: 8px;
  height: 36px;
}

.search-icon {
  color: #9ca3af;
}

.add-btn {
  height: 36px;
  border-radius: 8px !important;
  font-weight: 500;
  font-size: 13px;
  text-transform: none;
  white-space: nowrap;
  padding: 0 16px;
}

/* ==============================
   STATS CARDS
============================== */
.stats-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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
  font-size: 20px;
}

.stats-icon-blue {
  background: #eff6ff;
  color: #3b82f6;
}
.stats-icon-green {
  background: #f0fdf4;
  color: #22c55e;
}
.stats-icon-purple {
  background: #f5f3ff;
  color: #8b5cf6;
}

.stats-content {
  min-width: 0;
}

.stats-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}

.stats-amount {
  font-size: 26px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
}

/* ==============================
   CONTROLS / SCHEDULE OVERVIEW
============================== */
.controls-section {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 16px;
  border: 1px solid #e8ecf0;
}

.controls-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 8px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  gap: 10px;
  flex: 1;
  flex-wrap: wrap;
}

.filter-select {
  min-width: 160px;
}

.week-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e8ecf0;
}

.nav-btn {
  color: #6b7280 !important;
  width: 28px;
  height: 28px;
  border-radius: 6px !important;
}

.nav-btn:hover {
  background: #f3f4f6 !important;
}

.week-display {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  min-width: 160px;
  text-align: center;
}

.view-select {
  min-width: 140px;
}

/* ==============================
   CONTENT / TABLE SECTION
============================== */
.content-section {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e8ecf0;
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid #e8ecf0;
  border-radius: 10px;
}

.schedule-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  background: white;
}

.schedule-table thead {
  background: #f8fafc;
}

.schedule-table th {
  padding: 10px 8px;
  text-align: left;
  font-weight: 600;
  color: #6b7280;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e8ecf0;
  white-space: nowrap;
}

.employee-col {
  width: 140px;
  min-width: 0;
}

.day-col {
  width: auto;
  min-width: 0;
  text-align: center !important;
}

.table-row {
  border-bottom: 1px solid #f1f3f5;
  transition: background 0.15s;
}

.table-row:hover {
  background: #f9fafb;
}

.employee-cell {
  padding: 10px 8px;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.employee-avatar {
  flex-shrink: 0;
  width: 30px !important;
  height: 30px !important;
  border-radius: 50% !important;
}

.avatar-text {
  color: white;
  font-weight: 600;
  font-size: 12px;
}

.employee-name {
  font-weight: 600;
  color: #111827;
  font-size: 12px;
  word-break: break-word;
}

.schedule-cell {
  padding: 6px 4px;
  vertical-align: top;
}

.shifts-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
}

/* ==============================
   SHIFT BADGES
============================== */
.shift-badge {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 5px 6px;
  position: relative;
  transition: all 0.15s;
}

.shift-badge:hover {
  background: #dbeafe;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.15);
}

.shift-time {
  font-size: 11px;
  font-weight: 600;
  color: #1e40af;
  margin-bottom: 1px;
  line-height: 1.3;
  white-space: normal;
  word-break: break-word;
}

.shift-position {
  font-size: 10px;
  color: #3b82f6;
  line-height: 1.3;
  white-space: normal;
  word-break: break-word;
}

.shift-site {
  font-size: 10px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 2px;
  margin-bottom: 1px;
  white-space: normal;
  word-break: break-word;
}

/* Day off */
.shift-badge-dayoff {
  background: #fff7ed !important;
  border: 1px solid #fed7aa !important;
  padding: 8px 10px;
}

.shift-badge-dayoff:hover {
  background: #ffedd5 !important;
  box-shadow: 0 2px 6px rgba(249, 115, 22, 0.15);
}

/* Leave */
.shift-badge-leave {
  background: #fdf4ff;
  border: 1px solid #e9d5ff;
  border-left: 3px solid #9c27b0;
}

/* Merged dual-shift */
.shift-badge-merged {
  border-left: 3px solid #7c3aed;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-left: 3px solid #7c3aed;
  padding: 5px 7px;
}

.merged-shift-separator {
  border-top: 1px dashed #c4b5fd;
  margin: 3px 0;
}

.shift-badge-merged .shift-time {
  font-size: 11px;
  white-space: normal;
  word-break: break-all;
  line-height: 1.3;
}

.shift-badge-merged .shift-site,
.shift-badge-merged .shift-position {
  font-size: 10px;
  white-space: normal;
  word-break: break-word;
}

.merged-shift-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  font-weight: 700;
  color: #7c3aed;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.merged-icon {
  color: #7c3aed;
}
.merged-shift-row {
  padding: 2px 0;
}
.merged-sub-actions {
  margin-top: 2px;
}
.merged-divider {
  margin: 4px 0;
  opacity: 0.3;
}

.leave-content {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 2px;
}

.leave-icon {
  color: #7b1fa2;
  flex-shrink: 0;
}

.leave-label {
  font-size: 11px;
  font-weight: 600;
  color: #6a1b9a;
  line-height: 1.2;
}

.dayoff-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 4px 0;
  width: 100%;
}

.dayoff-icon {
  color: #f97316;
  flex-shrink: 0;
}

.dayoff-label {
  font-weight: 700;
  font-size: 12px;
  color: #ea580c;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.shift-badge-dayoff .shift-position {
  color: #6b7280;
  font-weight: 600;
  text-align: center;
  font-size: 11px;
}

.dayoff-text {
  color: #6b7280 !important;
  font-weight: 600 !important;
  text-align: center;
}

/* ==============================
   SHIFT ACTIONS (hover overlay)
============================== */
.shift-actions {
  display: none;
  position: absolute;
  top: 5px;
  right: 5px;
  gap: 3px;
  background: white;
  padding: 3px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  border: 1px solid #e8ecf0;
}

.shift-badge:hover .shift-actions {
  display: flex;
}

.action-btn {
  width: 24px;
  height: 24px;
  min-height: 24px;
  border-radius: 4px !important;
}

.view-btn {
  background: #eff6ff;
  color: #2563eb;
}
.view-btn:hover {
  background: #dbeafe !important;
}
.edit-btn {
  background: #fefce8;
  color: #ca8a04;
}
.edit-btn:hover {
  background: #fef9c3 !important;
}
.reassign-btn {
  background: #f5f3ff;
  color: #7c3aed;
}
.reassign-btn:hover {
  background: #ede9fe !important;
}
.dayoff-btn {
  background: #fefce8;
  color: #ca8a04;
}
.dayoff-btn:hover {
  background: #fef9c3 !important;
}
.delete-btn {
  background: #fef2f2;
  color: #dc2626;
}
.delete-btn:hover {
  background: #fee2e2 !important;
}

/* ==============================
   CELL QUICK ACTIONS
============================== */
.cell-quick-actions {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 4px;
}

.cell-quick-actions-mobile {
  flex-direction: row;
  flex-wrap: wrap;
}

.cell-btn {
  font-size: 10px !important;
  font-weight: 500;
  border-radius: 5px;
  padding: 2px 6px !important;
  justify-content: flex-start;
  min-height: 22px !important;
  height: 22px !important;
}

.cell-btn :deep(.q-btn__content) {
  gap: 3px;
}

.cell-btn-add {
  color: #1d4ed8;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}
.cell-btn-add:hover {
  background: #dbeafe !important;
  border-color: #93c5fd !important;
}

.cell-btn-leave {
  color: #7c3aed;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
}
.cell-btn-leave:hover {
  background: #ede9fe !important;
  border-color: #c4b5fd !important;
}

.cell-btn-leave :deep(.q-btn-dropdown__arrow) {
  display: none;
}
.cell-btn-leave :deep(.q-menu) {
  min-width: unset !important;
  width: 100% !important;
}

.cell-btn-dayoff {
  color: #ea580c;
  background: #fff7ed;
  border: 1px solid #fed7aa;
}
.cell-btn-dayoff:hover {
  background: #ffedd5 !important;
  border-color: #fdba74 !important;
}

.add-shift-btn {
  color: #6b7280;
  font-size: 11px;
  padding: 6px 8px;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  width: 100%;
  min-height: 30px;
}
.add-shift-btn:hover {
  color: #2563eb;
  border-color: #93c5fd;
  background: #eff6ff;
}

/* ==============================
   CARDS VIEW
============================== */
.cards-view {
  padding: 16px;
}

.employee-cards {
  display: grid;
  gap: 14px;
}

.employee-card {
  background: white;
  border: 1px solid #e8ecf0;
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  background: #f8fafc;
  padding: 14px 16px;
  border-bottom: 1px solid #e8ecf0;
}

.employee-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.employee-stats {
  font-size: 12px;
  color: #6b7280;
}

.schedule-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 1px;
  background: #e8ecf0;
}

.day-column {
  background: white;
}

.day-header {
  background: #f8fafc;
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-align: center;
  border-bottom: 1px solid #e8ecf0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.day-content {
  padding: 10px;
  min-height: 80px;
}

.empty-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
}

.shift-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.shift-card {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.shift-card:hover {
  background: #dbeafe;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.15);
}

.shift-card-dayoff {
  background: #fff7ed !important;
  border-color: #fed7aa !important;
}
.shift-card-dayoff:hover {
  background: #ffedd5 !important;
  box-shadow: 0 2px 6px rgba(249, 115, 22, 0.15);
}

.dayoff-content-mobile {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.dayoff-content-mobile .dayoff-icon {
  color: #f97316;
}
.dayoff-content-mobile .dayoff-label {
  font-weight: 700;
  font-size: 12px;
  color: #ea580c;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ==============================
   MODALS
============================== */
.modal-card {
  border-radius: 14px !important;
  width: 500px !important;
  min-width: 500px !important;
  max-width: 95vw !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  background: #ffffff;
  border-bottom: 1px solid #e8ecf0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  max-height: 70vh;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.modal-body::-webkit-scrollbar {
  display: none;
}

.schedule-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-field {
  width: 100%;
}
.full-width {
  grid-column: 1 / -1;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f1f3f5;
}

.cancel-btn {
  color: #6b7280;
}

.submit-btn {
  background: #3b82f6;
  color: white;
  padding: 6px 16px;
  border-radius: 8px !important;
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
}

.submit-btn:hover {
  background: #2563eb;
}

/* ==============================
   MISC / INLINE MODAL HELPERS
============================== */
.warning-banner {
  margin-top: 14px;
  background-color: #fffbeb;
  border: 1px solid #fcd34d;
  padding: 12px;
  border-radius: 8px;
}

.info-banner {
  margin-top: 14px;
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 12px;
  border-radius: 8px;
}

.quick-info {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e8ecf0;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.quick-action-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 10px 12px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
}

.quick-dayoff-btn {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  height: 36px;
}
.leave-type-select {
  flex: 1;
  min-width: 0;
}

.recurring-badge {
  font-size: 10px;
  margin-left: 4px;
}

.recurring-calendar-preview {
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 16px;
}

.calendar-preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.calendar-preview-title {
  font-size: 13px;
  font-weight: 600;
  color: #4338ca;
  flex: 1;
}

.calendar-preview-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
.legend-dot-active {
  background-color: #6366f1;
}
.legend-text {
  font-size: 11px;
  color: #6b7280;
}

.recurring-calendar {
  width: 100% !important;
  max-width: 100% !important;
  border-radius: 8px;
  box-shadow: none !important;
  border: 1px solid #e0e7ff;
}

.recurring-calendar :deep(.q-date__calendar-item--active) {
  background: #6366f1 !important;
  border-radius: 50%;
}
.recurring-calendar :deep(.q-date__event) {
  background: #6366f1 !important;
}

.calendar-weekdays-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e0e7ff;
}

.weekdays-label {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}

/* Filter dropdown popup */
.filter-dropdown-popup {
  position: fixed !important;
  max-height: 280px !important;
  overflow-y: auto !important;
  z-index: 9999 !important;
  transform: none !important;
}

/* ==============================
   RESPONSIVE
============================== */
@media (min-width: 1440px) {
  .stats-amount {
    font-size: 30px;
  }
  .schedule-table th,
  .employee-cell,
  .schedule-cell {
    padding: 14px 10px;
  }
  .employee-col {
    width: 180px;
  }
  .day-col {
    min-width: 130px;
  }
  .header-search {
    max-width: 340px;
  }
}

@media (max-width: 1024px) {
  .dashboard-container {
    padding: 14px;
  }
  .header-content {
    flex-wrap: wrap;
    gap: 12px;
  }
  .title-section {
    width: 100%;
  }
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
  .header-search {
    max-width: 100%;
    flex: 1;
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 12px;
  }
  .stats-section {
    grid-template-columns: 1fr;
  }
  .header-actions {
    flex-direction: column;
  }
  .header-search,
  .add-btn {
    width: 100%;
    max-width: 100%;
  }
  .controls-row {
    flex-direction: column;
    align-items: stretch;
  }
  .filter-group {
    flex-direction: column;
  }
  .week-nav {
    justify-content: center;
  }
  .modal-card {
    min-width: unset !important;
    max-width: calc(100vw - 20px) !important;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
  .full-width {
    grid-column: span 1;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 18px;
  }
  .stats-amount {
    font-size: 22px;
  }
}
</style>
