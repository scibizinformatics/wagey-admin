<template>
  <q-page class="modern-page">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">Schedule</h1>
          <div class="timezone-badge">
            <q-icon name="schedule" size="16px" />
            <span>{{ userTimezone }}</span>
          </div>
        </div>
        <div class="header-actions">
          <!-- Add Employee Button -->
          <q-btn
            v-if="true"
            color="primary"
            icon="add"
            label="Add Schedule"
            @click="openAddModal"
            class="add-btn"
            unelevated
          />
          <!-- Search Input -->
          <q-input
            v-model="searchTerm"
            placeholder="Search employees..."
            outlined
            dense
            class="search-input"
            debounce="300"
            @update:model-value="filterEmployees"
          >
            <template #prepend>
              <q-icon name="search" size="20px" />
            </template>
          </q-input>
        </div>
      </div>
    </div>
    <!-- Summary Cards Section -->
    <div class="summary-section">
      <div class="summary-grid">
        <div class="summary-card card-purple">
          <div class="card-icon">
            <q-icon name="groups" size="32px" />
          </div>
          <div class="card-content">
            <div class="card-value">{{ activeEmployees }}</div>
            <div class="card-label">Total Employees</div>
          </div>
        </div>
        <div class="summary-card card-yellow">
          <div class="card-icon">
            <q-icon name="event" size="32px" />
          </div>
          <div class="card-content">
            <div class="card-value">{{ totalShifts }}</div>
            <div class="card-label">Active</div>
          </div>
        </div>
        <div class="summary-card card-pink">
          <div class="card-icon">
            <q-icon name="schedule" size="32px" />
          </div>
          <div class="card-content">
            <div class="card-value">{{ positionsCount }}</div>
            <div class="card-label">Positions Filled</div>
          </div>
        </div>
      </div>
    </div>
    <!-- Filter and Controls Section -->
    <div class="controls-section">
      <h2 class="section-title">Schedule Overview</h2>
      <div class="controls-row">
        <div class="filter-group">
          <q-select
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
          />
          <q-select
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
          />
        </div>
        <div class="week-nav">
          <q-btn flat round icon="chevron_left" @click="prevWeek" class="nav-btn" size="sm" />
          <div class="week-display">
            {{ selectedWeek.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
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
                    <!-- Existing Shifts -->
                    <div
                      v-for="element in getShifts(user.id, dayIdx)"
                      :key="element.id"
                      class="shift-badge"
                      :class="{
                        'shift-badge-dayoff': isDayOff(element),
                        'shift-badge-leave': element.isLeave,
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
                            @click.stop="cancelLeave(element)"
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
                            @click.stop="deleteShift(element.id)"
                          >
                            <q-tooltip>Remove Day Off</q-tooltip>
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
                            @click.stop="deleteShift(element.id)"
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
                              <q-item-section style="font-size: 11px">{{ lt.name }}</q-item-section>
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
                v-model="newSchedule.userId"
                :options="filteredEmployeeOptions"
                option-value="value"
                option-label="label"
                label="Select Employee"
                outlined
                emit-value
                map-options
                use-input
                input-debounce="0"
                @filter="filterEmployeeOptions"
                @update:model-value="() => singleEmployeeSelectRef?.updateInputValue('')"
                class="form-field full-width q-mb-md"
                :rules="[(val) => !!val || 'Employee is required']"
                :loading="loadingEmployees"
              >
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey">No employees found</q-item-section>
                  </q-item>
                </template>
              </q-select>
              <!-- Multi-date picker -->
              <div class="q-mb-sm text-caption text-grey-7">Select Date(s)</div>
              <q-date
                v-model="newSchedule.selectedDates"
                multiple
                mask="YYYY-MM-DD"
                :options="(date) => date >= new Date().toISOString().split('T')[0]"
                class="q-mb-xs"
                minimal
                style="transform: scale(0.82); transform-origin: top left; width: 122%"
              />
              <div
                class="text-caption q-mb-md"
                :class="newSchedule.selectedDates.length ? 'text-primary' : 'text-negative'"
              >
                {{
                  newSchedule.selectedDates.length
                    ? `${newSchedule.selectedDates.length} date(s) selected`
                    : 'Please select at least one date'
                }}
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
                        :options="(date) => date >= new Date().toISOString().split('T')[0]"
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
                          (date) =>
                            date >=
                            (newSchedule.recurringStartDate ||
                              new Date().toISOString().split('T')[0])
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
                      shift.shiftType ? getShiftTypeDetails(shift.shiftType) : 'Select a shift type'
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
      <q-card class="modal-card" style="max-width: 500px">
        <q-card-section class="modal-header">
          <div class="modal-title">Update Shift Assignment</div>
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
            <!-- Shift Update Section -->
            <div class="shift-row">
              <div class="shift-row-header">
                <span class="row-label">
                  <q-icon name="edit" size="16px" />
                  Shift Details
                </span>
              </div>
              <div class="shift-fields">
                <!-- Site Select -->
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
                <!-- Shift Type Select -->
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
                  <template #hint>
                    {{
                      reassignData.shiftTypeId
                        ? getPositionName(reassignData.shiftTypeId)
                        : 'Select a shift type'
                    }}
                  </template>
                </q-select>
                <!-- Department Select (Optional) -->
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
            <!-- Info Banner -->
            <q-banner class="info-banner" dense>
              <template #avatar>
                <q-icon name="info" color="primary" />
              </template>
              <span style="font-size: 12px">
                Updating shift assignment for
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
                label="UPDATE SHIFT"
                unelevated
                class="submit-btn"
                :loading="isReassigning"
                :disable="
                  !reassignData.siteId || !reassignData.shiftTypeId || !reassignData.assignmentId
                "
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
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
  // 🆕 ADD: Auto-fill date range from template
  if (template.start_date) {
    newSchedule.value.recurringStartDate = template.start_date
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
            const shift = {
              id: schedule.id ? `${schedule.id}-${sIndex}` : `temp-${Date.now()}-${sIndex}`,
              assignmentId:
                schedule.employee_assignment_id || schedule.assignment_id || schedule.id,
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
  if (n.scheduleType !== 'recurring' && !n.userId) {
    $q.notify({ type: 'negative', message: 'Please select an employee.' })
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
      console.log('🔍 Verifying employee-company link...')
      const isLinked = await verifyEmployeeCompanyLink(n.userId)
      if (!isLinked) {
        isCheckingConflict.value = false
        const selectedEmployee = employees.value.find((emp) => emp.id === n.userId)
        $q.notify({
          type: 'negative',
          message: `${selectedEmployee?.full_name || 'Employee'} is not linked to this company.`,
          timeout: 8000,
        })
        return
      }
      console.log('✅ Employee verified')
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
        employee_ids: [n.userId],
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
      return msg.replace(
        /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi,
        (match) => resolveEmployeeName(match) || match,
      )
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
  const dayOffShiftType = shiftTypes.value.find((st) => {
    const name = (st.name || '').toLowerCase()
    return (
      name.includes('day off') ||
      name.includes('dayoff') ||
      name.includes('rest day') ||
      name.includes('off day') ||
      name === 'off'
    )
  })
  if (!dayOffShiftType) {
    $q.notify({
      type: 'warning',
      message: 'No "Day Off" shift type found.',
      caption: 'Please create a shift type named "Day Off" in your settings.',
      timeout: 5000,
    })
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
    const payload = {
      company_id: companyId,
      employee_ids: [userId],
      schedules: [
        {
          date: dateStr,
          site_id: parseInt(siteOptions.value[0].value),
          shift_type_id: parseInt(dayOffShiftType.id),
        },
      ],
    }
    await axios.post('https://staging.wageyapp.com/organization/assignments/assign/', payload, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
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
  const dayOffShiftType = shiftTypes.value.find((st) => {
    const name = st.name?.toLowerCase() || ''
    return (
      name.includes('day off') ||
      name.includes('dayoff') ||
      name.includes('rest day') ||
      name.includes('off day') ||
      name === 'off'
    )
  })
  if (!dayOffShiftType) {
    $q.notify({
      type: 'warning',
      message: 'No "Day Off" shift type found.',
      caption: 'Please create a shift type named "Day Off" in your settings.',
      timeout: 5000,
    })
    return
  }
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
      shift_type_id: parseInt(dayOffShiftType.id),
      site_id: parseInt(element.site),
    }
    if (element.department) {
      payload.department_id = parseInt(element.department)
    }
    await axios.patch('https://staging.wageyapp.com/organization/assignments/reassign/', payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
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
        shiftTypeId: dayOffShiftType.id,
        shiftTypeName: dayOffShiftType.name,
        position: dayOffShiftType.name, // isDayOff() checks this field
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
      // Day off — uses the existing assignments endpoint
      let rawCompanyId = localStorage.getItem('selectedCompany')
      let companyId
      try {
        const parsed = JSON.parse(rawCompanyId)
        companyId = parsed?.id || parsed
      } catch {
        companyId = rawCompanyId
      }
      companyId = parseInt(companyId)
      const keywords = ['day off', 'dayoff', 'rest day', 'off day']
      const matchedShiftType = shiftTypes.value.find((st) => {
        const name = (st.name || '').toLowerCase()
        return keywords.some((kw) => name.includes(kw)) || name === 'off'
      })
      if (!matchedShiftType) {
        $q.notify({
          type: 'warning',
          message: 'No "Day Off" shift type found.',
          caption: 'Please create a matching shift type in your settings.',
          timeout: 5000,
        })
        return
      }
      if (siteOptions.value.length === 0) {
        $q.notify({ type: 'negative', message: 'No sites available.' })
        return
      }
      const payload = {
        company_id: companyId,
        employee_ids: [userId],
        schedules: [
          {
            date: dateStr,
            site_id: parseInt(siteOptions.value[0].value),
            shift_type_id: parseInt(matchedShiftType.id),
          },
        ],
      }
      await axios.post('https://staging.wageyapp.com/organization/assignments/assign/', payload, {
        headers,
      })
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
  console.log('=== 🔍 OPEN UPDATE SHIFT MODAL ===')
  console.log('📋 Shift data:', {
    id: shift.id,
    assignmentId: shift.assignmentId,
    shiftTypeId: shift.shiftTypeId,
    site: shift.site,
    department: shift.department,
    date: shift.date,
    userId: shift.userId,
    isDayOff: isDayOff(shift),
  })
  // Only assignmentId is strictly required to update/reassign
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
    shiftTypeId: shift.shiftTypeId || null, // null for day off shifts — user will pick a new one
    siteId: shift.site || null,
    departmentId: shift.department || null,
    currentEmployee: shift.userId,
    date: shift.date,
    day: shift.day,
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
    originalShift: null,
  }
}
const reassignShift = async () => {
  isReassigning.value = true
  const token = localStorage.getItem('access_token')
  try {
    const r = reassignData.value
    console.log('🔍 Starting shift update...')
    console.log('📋 Update data:', {
      assignmentId: r.assignmentId,
      assignmentIdType: typeof r.assignmentId,
      siteId: r.siteId,
      shiftTypeId: r.shiftTypeId,
      departmentId: r.departmentId,
      currentEmployee: r.currentEmployee,
    })
    if (!r.assignmentId) {
      $q.notify({
        type: 'negative',
        message: 'Assignment ID is missing',
      })
      isReassigning.value = false
      return
    }
    if (!r.siteId) {
      $q.notify({
        type: 'negative',
        message: 'Site is required',
      })
      isReassigning.value = false
      return
    }
    if (!r.shiftTypeId) {
      $q.notify({
        type: 'negative',
        message: 'Shift type is required',
      })
      isReassigning.value = false
      return
    }
    const payload = {
      assignment_id: parseInt(r.assignmentId),
      shift_type_id: parseInt(r.shiftTypeId),
      site_id: parseInt(r.siteId),
    }
    if (r.departmentId) {
      payload.department_id = parseInt(r.departmentId)
    }
    console.log('📤 Update payload:', JSON.stringify(payload, null, 2))
    const response = await axios.patch(
      'https://staging.wageyapp.com/organization/assignments/reassign/',
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    )
    console.log('✅ Shift update API response:', response.data)
    const employeeName = getEmployeeName(r.currentEmployee)
    const shiftTypeName = getPositionName(r.shiftTypeId)
    $q.notify({
      type: 'positive',
      message: 'Shift updated successfully!',
      caption: `${employeeName}'s shift updated to ${shiftTypeName}`,
      icon: 'check_circle',
      timeout: 3000,
    })
    closeReassignModal()
    console.log('🔄 Force refreshing data from server...')
    shifts.value = []
    await new Promise((resolve) => setTimeout(resolve, 500))
    await fetchData()
    console.log('✅ Data refresh complete. New shifts count:', shifts.value.length)
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
.recurring-badge {
  font-size: 10px;
  margin-left: 4px;
}
.warning-banner {
  margin-top: 14px;
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  padding: 12px;
  border-radius: 8px;
}
.info-banner {
  margin-top: 14px;
  background-color: #e3f2fd;
  border: 1px solid #2196f3;
  padding: 12px;
  border-radius: 8px;
}
.quick-info {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
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
  background: #fff8f0;
  border: 1px solid #ffe0b2;
  border-radius: 8px;
}
.quick-dayoff-btn {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  height: 38px;
}
.leave-type-select {
  flex: 1;
  min-width: 0;
}
/* Cell quick action buttons */
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
  min-height: 24px !important;
  height: 24px !important;
}
.cell-btn :deep(.q-btn__content) {
  gap: 3px;
}
.cell-btn-add {
  color: #1565c0;
  background: #deeeff;
  border: 2px solid #90caf9;
  box-shadow: 0 1px 3px rgba(21, 101, 192, 0.15);
}
.cell-btn-add:hover {
  background: #c5e0fb !important;
  border-color: #64b5f6 !important;
  box-shadow: 0 2px 6px rgba(21, 101, 192, 0.25) !important;
}
.cell-btn-leave {
  color: #6a1b9a;
  background: #f0e6fb;
  border: 2px solid #ce93d8;
  box-shadow: 0 1px 3px rgba(106, 27, 154, 0.15);
}
.cell-btn-leave:hover {
  background: #e1bee7 !important;
  border-color: #ba68c8 !important;
  box-shadow: 0 2px 6px rgba(106, 27, 154, 0.25) !important;
}
.cell-btn-leave :deep(.q-btn-dropdown__arrow) {
  display: none;
}
.cell-btn-leave :deep(.q-menu) {
  min-width: unset !important;
  width: 100% !important;
}
.cell-btn-dayoff {
  color: #c84b00;
  background: #ffeadb;
  border: 2px solid #ffb74d;
  box-shadow: 0 1px 3px rgba(200, 75, 0, 0.15);
}
.cell-btn-dayoff:hover {
  background: #ffd5b0 !important;
  border-color: #ffa726 !important;
  box-shadow: 0 2px 6px rgba(200, 75, 0, 0.25) !important;
}
.modern-page {
  background: #f5f5f5;
  min-height: 100vh;
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
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
.title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}
.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a202c;
  margin: 0;
}
.timezone-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f0f9ff;
  border: 1px solid #bfdbfe;
  border-radius: 16px;
  font-size: 11px;
  color: #1e40af;
  font-weight: 500;
}
.timezone-badge .q-icon {
  color: #3b82f6;
  font-size: 14px;
}
.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.search-input {
  width: 260px;
  background: white;
}
.add-btn {
  background: #2563eb;
  color: white;
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  font-weight: 500;
  text-transform: none;
  font-size: 13px;
}
.add-btn:hover {
  background: #1d4ed8;
}
/* Summary Cards */
.summary-section {
  margin-bottom: 16px;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.summary-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: transform 0.2s;
  min-width: 0;
}
.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.card-purple {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
}
.card-purple .card-icon {
  background: rgba(109, 40, 217, 0.15);
  color: #6d28d9;
}
.card-yellow {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}
.card-yellow .card-icon {
  background: rgba(217, 119, 6, 0.15);
  color: #d97706;
}
.card-pink {
  background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
}
.card-pink .card-icon {
  background: rgba(219, 39, 119, 0.15);
  color: #db2777;
}
.card-icon {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.card-icon .q-icon {
  font-size: 28px;
}
.card-content {
  flex: 1;
  min-width: 0;
}
.card-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 4px;
}
.card-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}
/* Controls Section */
.controls-section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}
.section-title {
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 14px 0;
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
}
.filter-select {
  min-width: 160px;
}
.week-nav {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: #f9fafb;
  border-radius: 8px;
}
.nav-btn {
  color: #6b7280;
  width: 32px;
  height: 32px;
}
.nav-btn:hover {
  background: #e5e7eb;
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
/* Content Section */
.content-section {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}
/* Table View */
.table-wrapper {
  overflow-x: auto;
  border: 2px solid #3b82f6;
  border-radius: 10px;
}
.schedule-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}
.schedule-table thead {
  background: #f9fafb;
}
.schedule-table th {
  padding: 12px 10px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  font-size: 13px;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}
.employee-col {
  width: 180px;
  min-width: 180px;
}
.day-col {
  width: 120px;
  min-width: 120px;
  text-align: center !important;
}
.table-row {
  border-bottom: 1px solid #e5e7eb;
  transition: background 0.15s;
}
.table-row:hover {
  background: #f9fafb;
}
.employee-cell {
  padding: 12px 10px;
}
.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.employee-avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
}
.avatar-text {
  color: white;
  font-weight: 600;
  font-size: 13px;
}
.employee-name {
  font-weight: 500;
  color: #1f2937;
  font-size: 13px;
}
.schedule-cell {
  padding: 10px 8px;
  vertical-align: top;
}
.shifts-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 50px;
}
.shift-badge {
  background: #dbeafe;
  border-radius: 8px;
  padding: 10px;
  position: relative;
  transition: all 0.2s;
}
.shift-badge:hover {
  background: #bfdbfe;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.shift-time {
  font-size: 12px;
  font-weight: 600;
  color: #1e40af;
  margin-bottom: 4px;
  line-height: 1.3;
}
.shift-position {
  font-size: 11px;
  color: #3b82f6;
}
.shift-site {
  font-size: 11px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 2px;
  margin-bottom: 2px;
}
/* Day Off Shift Styles */
.shift-badge-dayoff {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%) !important;
  padding: 8px 12px;
}
.shift-badge-dayoff:hover {
  background: linear-gradient(135deg, #ffe0b2 0%, #ffcc80 100%) !important;
  box-shadow: 0 3px 8px rgba(255, 152, 0, 0.3);
  border-color: #f57c00 !important;
}
/* Leave badge */
.shift-badge-leave {
  background: linear-gradient(135deg, #f3e5f5, #ede7f6);
  border: 1.5px solid #ce93d8;
  border-left: 4px solid #9c27b0;
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
  color: #f57c00;
  flex-shrink: 0;
}
.dayoff-label {
  font-weight: 700;
  font-size: 13px;
  color: #e65100;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.shift-badge-dayoff .shift-position {
  color: #6b7280;
  font-weight: 600;
  text-align: center;
  font-size: 12px;
}
.dayoff-text {
  color: #6b7280 !important;
  font-weight: 600 !important;
  text-align: center;
}
.shift-actions {
  display: none;
  position: absolute;
  top: 6px;
  right: 6px;
  gap: 3px;
  background: white;
  padding: 4px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.shift-badge:hover .shift-actions {
  display: flex;
}
.action-btn {
  width: 26px;
  height: 26px;
  min-height: 26px;
  border-radius: 4px;
}
.view-btn {
  background: #dbeafe;
  color: #2563eb;
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
.reassign-btn {
  background: #ddd6fe;
  color: #7c3aed;
}
.reassign-btn:hover {
  background: #c4b5fd;
}
.dayoff-btn {
  background: #fef3c7;
  color: #d97706;
}
.dayoff-btn:hover {
  background: #fde68a;
}
.delete-btn {
  background: #fee2e2;
  color: #dc2626;
}
.delete-btn:hover {
  background: #fecaca;
}
.add-shift-btn {
  color: #6b7280;
  font-size: 11px;
  padding: 6px 8px;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  width: 100%;
  min-height: 32px;
}
.add-shift-btn:hover {
  color: #2563eb;
  border-color: #2563eb;
  background: #f0f9ff;
}
/* Cards View */
.cards-view {
  padding: 16px;
}
.employee-cards {
  display: grid;
  gap: 16px;
}
.employee-card {
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 12px;
  overflow: hidden;
}
.card-header {
  background: #f9fafb;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
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
  background: #e5e7eb;
}
.day-column {
  background: white;
}
.day-header {
  background: #f9fafb;
  padding: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  text-align: center;
  border-bottom: 1px solid #e5e7eb;
}
.day-content {
  padding: 10px;
  min-height: 90px;
}
.empty-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 70px;
}
.shift-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.shift-card {
  background: #dbeafe;
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.shift-card:hover {
  background: #bfdbfe;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.shift-card-dayoff {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%) !important;
}
.shift-card-dayoff:hover {
  background: linear-gradient(135deg, #ffe0b2 0%, #ffcc80 100%) !important;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
}
.dayoff-content-mobile {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.dayoff-content-mobile .dayoff-icon {
  color: #f57c00;
}
.dayoff-content-mobile .dayoff-label {
  font-weight: 700;
  font-size: 12px;
  color: #e65100;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
/* Modal Styles */
.modal-card {
  border-radius: 16px !important;
  max-width: 480px;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.modal-header {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-radius: 16px 16px 0 0;
}
.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}
.modal-body {
  padding: 16px;
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
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}
.cancel-btn {
  color: #6b7280;
  padding: 6px 14px;
}
.submit-btn {
  background: #2563eb;
  color: white;
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 13px;
}
.submit-btn:hover {
  background: #1d4ed8;
}
/* ===================================
   RESPONSIVE BREAKPOINTS
   =================================== */
/* 1440px - Large Desktop */
/* 1440px - Large Desktop */
@media (min-width: 1440px) {
  .modern-page {
    padding: 24px;
  }
  .summary-grid {
    gap: 20px;
  }
  .card-value {
    font-size: 32px;
  }
  .schedule-table th,
  .employee-cell,
  .schedule-cell {
    padding: 16px 14px;
  }
  .shift-badge {
    padding: 12px;
  }
  .employee-col {
    width: 200px;
    min-width: 200px;
  }
  .day-col {
    min-width: 140px;
  }
  .header-content {
    gap: 20px;
  }
  .search-input {
    min-width: 280px;
  }
}
/* 1024px - Desktop / Tablet Landscape */
@media (max-width: 1024px) {
  .modern-page {
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
    justify-content: space-between;
  }
  .search-input {
    flex: 1;
    min-width: 180px;
  }
  .summary-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .summary-card {
    padding: 14px;
  }
  .card-value {
    font-size: 26px;
  }
  .card-label {
    font-size: 12px;
  }
  .controls-row {
    gap: 10px;
    flex-wrap: wrap;
  }
  .filter-group {
    flex-wrap: wrap;
  }
  .filter-select {
    flex: 1;
    min-width: 140px;
  }
  .week-nav {
    width: 100%;
    justify-content: center;
  }
  .view-select {
    width: 100%;
  }
  .table-wrapper {
    overflow-x: auto;
  }
  .schedule-table {
    width: 100%;
    table-layout: fixed;
    min-width: unset;
  }
  .employee-col {
    width: 120px;
    min-width: 120px;
  }
  .day-col {
    width: auto;
    min-width: unset;
  }
  .schedule-table th {
    padding: 8px 4px;
    font-size: 11px;
  }
  .employee-cell {
    padding: 8px 4px;
  }
  .schedule-cell {
    padding: 6px 4px;
  }
  .shift-badge {
    padding: 6px 5px;
  }
  .shift-time {
    font-size: 10px;
  }
  .shift-position,
  .shift-site {
    font-size: 9px;
  }
  .action-btn {
    width: 20px;
    height: 20px;
    min-height: 20px;
  }
  .cell-btn {
    font-size: 9px !important;
    padding: 2px 3px !important;
    height: 22px !important;
    min-height: 22px !important;
  }
  .employee-name {
    font-size: 11px;
    word-break: break-word;
  }
  .employee-avatar {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
  }
  .modal-card {
    max-width: 90vw;
  }
}
/* 768px - Tablet Portrait */
@media (max-width: 768px) {
  .modern-page {
    padding: 12px;
  }
  .page-header {
    padding: 12px;
    margin-bottom: 12px;
  }
  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .title-section {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .page-title {
    font-size: 18px;
  }
  .timezone-badge {
    font-size: 10px;
    padding: 4px 10px;
  }
  .header-actions {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
  }
  .add-btn {
    flex-shrink: 0;
  }
  .search-input {
    flex: 1;
    min-width: 160px;
  }
  .summary-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  .summary-card {
    padding: 12px;
  }
  .card-icon {
    width: 44px;
    height: 44px;
  }
  .card-value {
    font-size: 22px;
  }
  .card-label {
    font-size: 11px;
  }
  .controls-section {
    padding: 12px;
    margin-bottom: 12px;
  }
  .section-title {
    font-size: 16px;
    margin-bottom: 10px;
  }
  .controls-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .filter-group {
    flex-direction: row;
    width: 100%;
    gap: 8px;
  }
  .filter-select {
    flex: 1;
  }
  .view-select {
    width: 100%;
  }
  .week-nav {
    width: 100%;
    justify-content: center;
  }
  .week-display {
    min-width: 140px;
    font-size: 12px;
  }
  .table-wrapper {
    border-radius: 8px;
    overflow-x: auto;
  }
  .schedule-table {
    min-width: 640px;
  }
  .employee-col {
    width: 130px;
    min-width: 130px;
  }
  .day-col {
    min-width: 88px;
  }
  .schedule-table th {
    padding: 10px 6px;
    font-size: 11px;
  }
  .employee-cell,
  .schedule-cell {
    padding: 8px 6px;
  }
  .shift-badge {
    padding: 6px 8px;
  }
  .cell-btn {
    font-size: 9px !important;
    padding: 2px 4px !important;
  }
  .modal-card {
    max-width: 95vw;
    margin: 12px;
  }
  .modal-header,
  .modal-body {
    padding: 14px;
  }
  .modal-title {
    font-size: 17px;
  }
  .form-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .modal-actions {
    flex-direction: column-reverse;
    gap: 8px;
  }
  .cancel-btn,
  .submit-btn {
    width: 100%;
    justify-content: center;
  }
  .quick-info {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
