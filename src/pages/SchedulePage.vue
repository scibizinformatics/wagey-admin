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
            <q-btn
              color="primary"
              icon="add"
              label="Add Schedule"
              @click="openAddModal"
              class="add-btn"
              unelevated
              no-caps
            />
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
        <!-- Loading Spinner -->
        <div v-if="isLoadingSchedule" class="schedule-loading-overlay">
          <q-spinner color="primary" size="48px" />
          <div class="schedule-loading-text">Loading schedules...</div>
        </div>
        <template v-else>
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
                            <div class="shift-actions"></div>
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
                            </div>
                          </template>
                          <!-- Merged Dual-Shift Display -->
                          <template v-else-if="element.isMerged">
                            <!-- Each shift on its own compact line -->
                            <template v-for="(sub, si) in element.shifts" :key="sub.id">
                              <div class="shift-time">
                                {{ formatTimeWithTimezone(sub.startTime) }} - {{ sub.endTime }}
                              </div>
                              <div class="shift-site" v-if="getSiteName(sub.site, sub)">
                                <q-icon name="location_on" size="10px" />
                                {{ getSiteName(sub.site, sub) }}
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
                            </div>
                          </template>
                          <!-- Regular Shift Display -->
                          <template v-else>
                            <div class="shift-time" v-if="element.startTime && element.endTime">
                              {{ formatTimeWithTimezone(element.startTime) }} -
                              {{ element.endTime }}
                            </div>
                            <div class="shift-site" v-if="getSiteName(element.site, element)">
                              <q-icon name="location_on" size="11px" />
                              {{ getSiteName(element.site, element) }}
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
                            </div>
                          </template>
                        </div>
                        <!-- Quick Action Buttons -->
                        <div class="cell-quick-actions">
                          <q-btn
                            v-if="getShifts(user.id, dayIdx).length === 0"
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
        </template>
      </div>

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
                <!-- Multi-date picker (dual-month) -->
                <div class="one-time-calendar-section">
                  <div class="one-time-calendar-header">
                    <div style="display: flex; align-items: center; gap: 6px">
                      <q-icon name="event_note" size="16px" color="primary" />
                      <span class="calendar-preview-title">Select Date(s)</span>
                    </div>
                    <q-badge
                      :color="(newSchedule.selectedDates || []).length ? 'primary' : 'grey'"
                      :label="
                        (newSchedule.selectedDates || []).length
                          ? `${newSchedule.selectedDates.length} selected`
                          : 'None selected'
                      "
                    />
                  </div>
                  <div class="legend-row">
                    <span class="legend-dot legend-dot-active"></span>
                    <span class="legend-text">Click dates to select or deselect</span>
                  </div>
                  <!-- Dual calendar for one-time -->
                  <div class="dual-calendar-panel dual-calendar-panel--inline">
                    <div class="dual-calendar-grid">
                      <!-- Left -->
                      <div class="mini-calendar">
                        <div class="mini-calendar-header">
                          <q-btn
                            flat
                            round
                            dense
                            icon="chevron_left"
                            size="sm"
                            @click="oneTimePrevMonth"
                            class="cal-nav-btn"
                          />
                          <span class="mini-calendar-title">{{
                            calendarMonthLabel(oneTimeLeftYear, oneTimeLeftMonth)
                          }}</span>
                          <div style="width: 32px" />
                        </div>
                        <div class="mini-calendar-weekdays">
                          <span v-for="d in ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']" :key="d">{{
                            d
                          }}</span>
                        </div>
                        <div class="mini-calendar-days">
                          <span
                            v-for="(cell, i) in oneTimeLeftCells"
                            :key="'ol' + i"
                            class="cal-day"
                            :class="getOneTimeDayCellClass(cell, oneTimeLeftYear, oneTimeLeftMonth)"
                            @click="
                              cell.day
                                ? toggleOneTimeDate(cell.day, oneTimeLeftYear, oneTimeLeftMonth)
                                : null
                            "
                            >{{ cell.day || '' }}</span
                          >
                        </div>
                      </div>
                      <!-- Right -->
                      <div class="mini-calendar">
                        <div class="mini-calendar-header">
                          <div style="width: 32px" />
                          <span class="mini-calendar-title">{{
                            calendarMonthLabel(oneTimeRightYear, oneTimeRightMonth)
                          }}</span>
                          <q-btn
                            flat
                            round
                            dense
                            icon="chevron_right"
                            size="sm"
                            @click="oneTimeNextMonth"
                            class="cal-nav-btn"
                          />
                        </div>
                        <div class="mini-calendar-weekdays">
                          <span v-for="d in ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']" :key="d">{{
                            d
                          }}</span>
                        </div>
                        <div class="mini-calendar-days">
                          <span
                            v-for="(cell, i) in oneTimeRightCells"
                            :key="'or' + i"
                            class="cal-day"
                            :class="
                              getOneTimeDayCellClass(cell, oneTimeRightYear, oneTimeRightMonth)
                            "
                            @click="
                              cell.day
                                ? toggleOneTimeDate(cell.day, oneTimeRightYear, oneTimeRightMonth)
                                : null
                            "
                            >{{ cell.day || '' }}</span
                          >
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- Selected chips -->
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
                      >{{ formatDisplayDate(date) }}</q-chip
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
                  <div
                    class="shift-fields"
                    style="display: flex; flex-direction: column; gap: 12px"
                  >
                    <!-- Shift Template -->
                    <q-select
                      v-model="shift.shiftTemplate"
                      :options="shiftTemplateOptions"
                      option-value="value"
                      option-label="label"
                      label="Shift Template"
                      outlined
                      dense
                      emit-value
                      map-options
                      clearable
                      class="form-field full-width"
                      :rules="[(val) => !!val || 'Shift template is required']"
                    >
                      <template #option="scope">
                        <q-item v-bind="scope.itemProps" style="min-width: 0; max-width: 100%">
                          <q-item-section>
                            <template v-if="scope.opt.label && scope.opt.label.includes(' / ')">
                              <q-item-label
                                v-for="(part, i) in scope.opt.label.split(' / ')"
                                :key="i"
                                style="font-size: 13px; line-height: 1.5"
                                >{{ part }}</q-item-label
                              >
                            </template>
                            <q-item-label
                              v-else
                              style="
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                font-size: 13px;
                              "
                            >
                              {{ scope.opt.label }}
                            </q-item-label>
                          </q-item-section>
                        </q-item>
                      </template>
                    </q-select>
                  </div>
                </div>
              </div>
              <!-- For Recurring: Date Range Inputs -->
              <div v-if="newSchedule.scheduleType === 'recurring'" class="form-row">
                <q-input
                  v-model="newSchedule.recurringStartDate"
                  label="Start Date"
                  outlined
                  class="form-field"
                  placeholder="YYYY-MM-DD"
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
                  placeholder="YYYY-MM-DD"
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
                class="one-time-calendar-section"
              >
                <div class="one-time-calendar-header">
                  <div style="display: flex; align-items: center; gap: 6px">
                    <q-icon name="event_note" size="16px" color="primary" />
                    <span class="calendar-preview-title">Schedule Preview</span>
                  </div>
                  <q-badge color="primary" :label="`${recurringCalendarDates.length} days`" />
                </div>
                <div class="legend-row">
                  <span class="legend-dot legend-dot-active"></span>
                  <span class="legend-text">Scheduled working days</span>
                </div>
                <div class="dual-calendar-panel dual-calendar-panel--inline">
                  <div class="dual-calendar-grid">
                    <div class="mini-calendar">
                      <div class="mini-calendar-header">
                        <q-btn
                          flat
                          round
                          dense
                          icon="chevron_left"
                          size="sm"
                          @click="previewPrevMonth"
                          class="cal-nav-btn"
                        />
                        <span class="mini-calendar-title">{{
                          calendarMonthLabel(previewLeftYear, previewLeftMonth)
                        }}</span>
                        <div style="width: 32px" />
                      </div>
                      <div class="mini-calendar-weekdays">
                        <span v-for="d in ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']" :key="d">{{
                          d
                        }}</span>
                      </div>
                      <div class="mini-calendar-days">
                        <span
                          v-for="(cell, i) in previewLeftCells"
                          :key="'pl' + i"
                          class="cal-day"
                          :class="getPreviewDayCellClass(cell, previewLeftYear, previewLeftMonth)"
                          >{{ cell.day || '' }}</span
                        >
                      </div>
                    </div>
                    <div class="mini-calendar">
                      <div class="mini-calendar-header">
                        <div style="width: 32px" />
                        <span class="mini-calendar-title">{{
                          calendarMonthLabel(previewRightYear, previewRightMonth)
                        }}</span>
                        <q-btn
                          flat
                          round
                          dense
                          icon="chevron_right"
                          size="sm"
                          @click="previewNextMonth"
                          class="cal-nav-btn"
                        />
                      </div>
                      <div class="mini-calendar-weekdays">
                        <span v-for="d in ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']" :key="d">{{
                          d
                        }}</span>
                      </div>
                      <div class="mini-calendar-days">
                        <span
                          v-for="(cell, i) in previewRightCells"
                          :key="'pr' + i"
                          class="cal-day"
                          :class="getPreviewDayCellClass(cell, previewRightYear, previewRightMonth)"
                          >{{ cell.day || '' }}</span
                        >
                      </div>
                    </div>
                  </div>
                </div>
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
                  v-model="newSchedule.department"
                  :options="departmentOptions"
                  option-value="value"
                  option-label="label"
                  label="Department"
                  outlined
                  emit-value
                  map-options
                  class="form-field full-width"
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
                    v-model="shift.shiftTemplate"
                    :options="shiftTemplateOptions"
                    option-value="value"
                    option-label="label"
                    label="Shift Template"
                    outlined
                    dense
                    emit-value
                    map-options
                    clearable
                    class="form-field full-width"
                    :rules="[(val) => !!val || 'Shift template is required']"
                  >
                    <template #option="scope">
                      <q-item v-bind="scope.itemProps" style="min-width: 0; max-width: 100%">
                        <q-item-section>
                          <template v-if="scope.opt.label && scope.opt.label.includes(' / ')">
                            <q-item-label
                              v-for="(part, i) in scope.opt.label.split(' / ')"
                              :key="i"
                              style="font-size: 13px; line-height: 1.5"
                              >{{ part }}</q-item-label
                            >
                          </template>
                          <q-item-label
                            v-else
                            style="
                              white-space: nowrap;
                              overflow: hidden;
                              text-overflow: ellipsis;
                              font-size: 13px;
                            "
                          >
                            {{ scope.opt.label }}
                          </q-item-label>
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                </div>
              </div>
              <!-- Info Banner -->
              <q-banner class="info-banner" dense>
                <template #avatar>
                  <q-icon name="info" color="primary" />
                </template>
                <span style="font-size: 12px">
                  Adding 1 shift for <strong>{{ days[quickAdd.day] }}</strong>
                </span>
              </q-banner>
              <div class="modal-actions">
                <q-btn flat label="Cancel" @click="closeQuickAddModal" class="cancel-btn" />
                <q-btn
                  type="submit"
                  color="primary"
                  label="Add Shift"
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
            <q-form @submit.prevent="handleReassignShift" class="schedule-form">
              <!-- ── SINGLE SHIFT ── -->
              <template v-if="!reassignData.isDualShift">
                <div class="shift-row">
                  <!-- Shift Template Dropdown (First) -->
                  <div class="shift-row-header">
                    <span class="row-label"
                      ><q-icon name="edit" size="16px" /> Select Shift Template</span
                    >
                  </div>
                  <div class="shift-fields">
                    <q-select
                      v-model="reassignData.shiftTemplateId"
                      :options="shiftTemplateOptions"
                      option-value="value"
                      option-label="label"
                      :display-value="
                        shiftTemplateOptions.find((o) => o.value === reassignData.shiftTemplateId)
                          ?.label || ''
                      "
                      label="Shift Template"
                      outlined
                      dense
                      emit-value
                      map-options
                      class="form-field"
                      :rules="[(val) => !!val || 'Shift template is required']"
                    >
                      <template #option="scope">
                        <q-item v-bind="scope.itemProps" style="min-width: 0; max-width: 100%">
                          <q-item-section>
                            <template v-if="scope.opt.label && scope.opt.label.includes(' / ')">
                              <q-item-label
                                v-for="(part, i) in scope.opt.label.split(' / ')"
                                :key="i"
                                style="font-size: 13px; line-height: 1.5"
                                >{{ part }}</q-item-label
                              >
                            </template>
                            <q-item-label
                              v-else
                              style="
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                font-size: 13px;
                              "
                            >
                              {{ scope.opt.label }}
                            </q-item-label>
                          </q-item-section>
                        </q-item>
                      </template>
                    </q-select>
                  </div>

                  <!-- Current Shift Details Section -->
                  <div class="shift-row-header" style="margin-top: 16px">
                    <span class="row-label"
                      ><q-icon name="history" size="16px" /> Current Shift</span
                    >
                  </div>
                  <div
                    class="current-shift-info"
                    style="
                      padding: 12px;
                      background: #e5e7eb;
                      border-radius: 8px;
                      margin-bottom: 12px;
                    "
                  >
                    <div style="font-size: 13px; color: #374151">
                      <div style="margin-bottom: 6px">
                        <strong>Template:</strong>
                        {{ reassignData.originalTemplateName || 'N/A' }}
                      </div>
                      <div style="margin-bottom: 6px">
                        <strong>Site:</strong>
                        {{ reassignData.originalSiteName || 'N/A' }}
                      </div>
                      <div style="margin-bottom: 6px">
                        <strong>Time:</strong>
                        {{ reassignData.originalTime || 'N/A' }}
                      </div>
                      <div v-if="reassignData.originalDuration">
                        <strong>Duration:</strong> {{ reassignData.originalDuration }}
                      </div>
                    </div>
                  </div>

                  <!-- New Shift Details Section (When template changed) -->
                  <div
                    v-if="
                      reassignData.shiftTemplateId !== reassignData.originalTemplateId &&
                      getTemplateById(reassignData.shiftTemplateId)
                    "
                    class="new-shift-info"
                    style="
                      padding: 12px;
                      background: #fef3c7;
                      border-radius: 8px;
                      margin-bottom: 16px;
                      border: 1px solid #f59e0b;
                    "
                  >
                    <div
                      style="
                        font-size: 11px;
                        color: #d97706;
                        margin-bottom: 8px;
                        font-weight: 600;
                        text-transform: uppercase;
                      "
                    >
                      ⚠️ This will replace your current shift
                    </div>
                    <div style="font-size: 13px; color: #374151">
                      <div style="margin-bottom: 6px">
                        <strong>Template:</strong>
                        {{ getTemplateById(reassignData.shiftTemplateId)?.name || 'N/A' }}
                      </div>
                      <!-- Single-shift template: flat site/time -->
                      <template
                        v-if="
                          !(
                            getTemplateById(reassignData.shiftTemplateId)?.shifts_detail?.length > 1
                          )
                        "
                      >
                        <div style="margin-bottom: 6px">
                          <strong>Site:</strong>
                          {{
                            getTemplateById(reassignData.shiftTemplateId)?.shifts_detail?.[0]?.site
                              ?.name ||
                            getSiteName(
                              getTemplateById(reassignData.shiftTemplateId)?.shifts_detail?.[0]
                                ?.site?.id,
                            ) ||
                            'N/A'
                          }}
                        </div>
                        <div style="margin-bottom: 6px">
                          <strong>Time:</strong>
                          {{
                            getTemplateById(reassignData.shiftTemplateId)?.shifts_detail?.[0]
                              ?.start_time || 'N/A'
                          }}
                          -
                          {{
                            getTemplateById(reassignData.shiftTemplateId)?.shifts_detail?.[0]
                              ?.end_time || 'N/A'
                          }}
                        </div>
                      </template>
                      <!-- Dual-shift template: list each sub-shift -->
                      <template v-else>
                        <div
                          v-for="(sub, si) in getTemplateById(reassignData.shiftTemplateId)
                            .shifts_detail"
                          :key="si"
                          style="
                            margin-bottom: 6px;
                            padding: 6px 8px;
                            background: rgba(0, 0, 0, 0.04);
                            border-radius: 6px;
                          "
                        >
                          <div>
                            <strong>Shift {{ si + 1 }} Site:</strong>
                            {{ sub.site?.name || getSiteName(sub.site?.id) || 'N/A' }}
                          </div>
                          <div>
                            <strong>Time:</strong>
                            {{ sub.start_time || 'N/A' }} -
                            {{ sub.end_time || 'N/A' }}
                          </div>
                        </div>
                      </template>
                    </div>
                  </div>

                  <!-- Back to Original Button -->
                  <div
                    v-if="reassignData.shiftTemplateId !== reassignData.originalTemplateId"
                    style="margin-top: 12px"
                  >
                    <q-btn
                      flat
                      size="sm"
                      color="grey-7"
                      icon="refresh"
                      label="Back to Original"
                      @click="reassignData.shiftTemplateId = reassignData.originalTemplateId"
                    />
                  </div>
                </div>
              </template>

              <!-- ── DUAL SHIFT ── -->
              <template v-else>
                <div class="shift-row">
                  <!-- Shift Template Dropdown (First) -->
                  <div class="shift-row-header">
                    <span class="row-label"
                      ><q-icon name="edit" size="16px" /> Select Shift Template</span
                    >
                  </div>
                  <div class="shift-fields">
                    <q-select
                      v-model="reassignData.shiftTemplateId"
                      :options="shiftTemplateOptions"
                      option-value="value"
                      option-label="label"
                      :display-value="
                        shiftTemplateOptions.find((o) => o.value === reassignData.shiftTemplateId)
                          ?.label || ''
                      "
                      label="Shift Template"
                      outlined
                      dense
                      emit-value
                      map-options
                      class="form-field"
                      :rules="[(val) => !!val || 'Shift template is required']"
                    >
                      <template #option="scope">
                        <q-item v-bind="scope.itemProps" style="min-width: 0; max-width: 100%">
                          <q-item-section>
                            <template v-if="scope.opt.label && scope.opt.label.includes(' / ')">
                              <q-item-label
                                v-for="(part, i) in scope.opt.label.split(' / ')"
                                :key="i"
                                style="font-size: 13px; line-height: 1.5"
                                >{{ part }}</q-item-label
                              >
                            </template>
                            <q-item-label
                              v-else
                              style="
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                font-size: 13px;
                              "
                            >
                              {{ scope.opt.label }}
                            </q-item-label>
                          </q-item-section>
                        </q-item>
                      </template>
                    </q-select>
                  </div>

                  <!-- Current Shift Details Section -->
                  <div class="shift-row-header" style="margin-top: 16px">
                    <span class="row-label"
                      ><q-icon name="history" size="16px" /> Current Shifts</span
                    >
                  </div>
                  <div
                    v-for="(sub, idx) in reassignData.dualShifts"
                    :key="idx"
                    class="current-shift-info"
                    style="
                      padding: 12px;
                      background: #e5e7eb;
                      border-radius: 8px;
                      margin-bottom: 12px;
                    "
                  >
                    <div style="font-size: 13px; color: #374151">
                      <div style="font-weight: 600; margin-bottom: 4px; color: #4b5563">
                        Shift {{ idx + 1 }}: {{ sub.startTime }} - {{ sub.endTime }}
                      </div>
                      <div style="margin-bottom: 6px">
                        <strong>Template:</strong>
                        {{ sub.originalTemplateName || 'N/A' }}
                      </div>
                      <div style="margin-bottom: 6px">
                        <strong>Site:</strong>
                        {{ sub.originalSiteName || 'N/A' }}
                      </div>
                    </div>
                  </div>

                  <!-- New Shift Details Section (When template changed) -->
                  <div
                    v-if="
                      reassignData.shiftTemplateId !== reassignData.originalTemplateId &&
                      getTemplateById(reassignData.shiftTemplateId)
                    "
                    class="new-shift-info"
                    style="
                      padding: 12px;
                      background: #fef3c7;
                      border-radius: 8px;
                      margin-bottom: 16px;
                      border: 1px solid #f59e0b;
                    "
                  >
                    <div
                      style="
                        font-size: 11px;
                        color: #d97706;
                        margin-bottom: 8px;
                        font-weight: 600;
                        text-transform: uppercase;
                      "
                    >
                      ⚠️ This will replace your current shifts
                    </div>
                    <div style="font-size: 13px; color: #374151">
                      <div style="margin-bottom: 6px">
                        <strong>Template:</strong>
                        {{ getTemplateById(reassignData.shiftTemplateId)?.name || 'N/A' }}
                      </div>
                      <!-- Single-shift template: flat site/time -->
                      <template
                        v-if="
                          !(
                            getTemplateById(reassignData.shiftTemplateId)?.shifts_detail?.length > 1
                          )
                        "
                      >
                        <div style="margin-bottom: 6px">
                          <strong>Site:</strong>
                          {{
                            getTemplateById(reassignData.shiftTemplateId)?.shifts_detail?.[0]?.site
                              ?.name ||
                            getSiteName(
                              getTemplateById(reassignData.shiftTemplateId)?.shifts_detail?.[0]
                                ?.site?.id,
                            ) ||
                            'N/A'
                          }}
                        </div>
                        <div style="margin-bottom: 6px">
                          <strong>Time:</strong>
                          {{
                            getTemplateById(reassignData.shiftTemplateId)?.shifts_detail?.[0]
                              ?.start_time || 'N/A'
                          }}
                          -
                          {{
                            getTemplateById(reassignData.shiftTemplateId)?.shifts_detail?.[0]
                              ?.end_time || 'N/A'
                          }}
                        </div>
                      </template>
                      <!-- Dual-shift template: list each sub-shift -->
                      <template v-else>
                        <div
                          v-for="(sub, si) in getTemplateById(reassignData.shiftTemplateId)
                            .shifts_detail"
                          :key="si"
                          style="
                            margin-bottom: 6px;
                            padding: 6px 8px;
                            background: rgba(0, 0, 0, 0.04);
                            border-radius: 6px;
                          "
                        >
                          <div>
                            <strong>Shift {{ si + 1 }} Site:</strong>
                            {{ sub.site?.name || getSiteName(sub.site?.id) || 'N/A' }}
                          </div>
                          <div>
                            <strong>Time:</strong>
                            {{ sub.start_time || 'N/A' }} -
                            {{ sub.end_time || 'N/A' }}
                          </div>
                        </div>
                      </template>
                    </div>
                  </div>

                  <!-- Back to Original Button -->
                  <div
                    v-if="reassignData.shiftTemplateId !== reassignData.originalTemplateId"
                    style="margin-top: 12px"
                  >
                    <q-btn
                      flat
                      size="sm"
                      color="grey-7"
                      icon="refresh"
                      label="Back to Original"
                      @click="reassignData.shiftTemplateId = reassignData.originalTemplateId"
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
                      ? !reassignData.shiftTemplateId
                      : !reassignData.shiftTemplateId || !reassignData.assignmentId
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
import { useCompany } from '@/composables/page/useCompany'
import { useSchedule } from '@/composables/page/useSchedule'
import { useOrganization } from '@/composables/page/useOrganization'
import { useEmployees } from '@/composables/page/useEmployees'

const $q = useQuasar()

const { companyId } = useCompany()
const {
  fetchScheduleByDateRange,
  assignShift,
  reassignShift: reassignShiftApi,
  assignDayOff: assignDayOffApi,
  applyLeaveForEmployee,
  fetchLeaveTypes: fetchLeaveTypesApi,
  fetchShiftTemplates: fetchShiftTemplatesApi,
} = useSchedule()
const {
  sites,
  departments,
  shiftTypes,
  recurringSchedules,
  fetchSites,
  fetchDepartments,
  fetchShiftTypes,
  fetchRecurringSchedules,
} = useOrganization()
const { employees, loading: loadingEmployees, fetchEmployees } = useEmployees()

// ─── State ────────────────────────────────────────────────────────────────────

const users = ref([])
const shifts = ref([])
const isReassigning = ref(false)
const isLoadingSchedule = ref(false)
const userTimezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone)
const viewMode = ref('table')
const filters = ref({ site: null, employee: null })
const searchTerm = ref('')
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const showAddModal = ref(false)
const showQuickAddModal = ref(false)
const showReassignModal = ref(false)
const isCheckingConflict = ref(false)
const isAddingShift = ref(false)
const assigningDayOffId = ref(null)
const quickActionLoading = ref(null)
const leaveTypes = ref([])
const shiftTemplates = ref([])
const addConflictWarning = ref(false)

// ─── Fresh schedule factory (single source of truth) ─────────────────────────
const _freshSchedule = () => ({
  userId: null,
  userIds: [],
  selectedDate: null,
  selectedDates: [],
  oneTimeShifts: [{ shiftTemplate: null }],
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

const newSchedule = ref(_freshSchedule())

const quickAdd = ref({ userId: null, day: null, shifts: [], leaveType: null })

const reassignData = ref({
  assignmentId: null,
  shiftTemplateId: null,
  // Store display values directly to avoid lookup issues
  originalTemplateId: null,
  originalTemplateName: null,
  originalSiteName: null,
  originalTime: null,
  originalDuration: null,
  currentEmployee: null,
  date: null,
  day: null,
  isDualShift: false,
  dualShifts: [],
})

// ─── Refs ─────────────────────────────────────────────────────────────────────

const singleEmployeeSelectRef = ref(null)
const multiEmployeeSelectRef = ref(null)
const siteFilterRef = ref(null)
const employeeFilterRef = ref(null)
const filteredEmployeeOptions = ref([])

// ─── Dual-month date range picker ─────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
const dateRangePickerOpen = ref(false)
// eslint-disable-next-line no-unused-vars
const dateRangeSelecting = ref('start') // 'start' | 'end'
const _today = new Date()
const calLeftMonth = ref(_today.getMonth())
const calLeftYear = ref(_today.getFullYear())
// eslint-disable-next-line no-unused-vars
const calRightMonth = computed(() => (calLeftMonth.value + 1) % 12)
// eslint-disable-next-line no-unused-vars
const calRightYear = computed(() =>
  calLeftMonth.value === 11 ? calLeftYear.value + 1 : calLeftYear.value,
)

const _MONTH_NAMES = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
]

const calendarMonthLabel = (year, month) => `${_MONTH_NAMES[month]} ${year}`

const buildCalendarCells = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push({ day: null })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d })
  return cells
}

const _toDateStr = (year, month, day) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${String(d).padStart(2, '0')} ${months[parseInt(m) - 1]} ${y}`
}

// ─── One-time dual-month multi-select calendar ────────────────────────────────
const oneTimeLeftMonth = ref(_today.getMonth())
const oneTimeLeftYear = ref(_today.getFullYear())
const oneTimeRightMonth = computed(() => (oneTimeLeftMonth.value + 1) % 12)
const oneTimeRightYear = computed(() =>
  oneTimeLeftMonth.value === 11 ? oneTimeLeftYear.value + 1 : oneTimeLeftYear.value,
)

const oneTimeLeftCells = computed(() =>
  buildCalendarCells(oneTimeLeftYear.value, oneTimeLeftMonth.value),
)
const oneTimeRightCells = computed(() =>
  buildCalendarCells(oneTimeRightYear.value, oneTimeRightMonth.value),
)

const oneTimePrevMonth = () => {
  if (oneTimeLeftMonth.value === 0) {
    oneTimeLeftMonth.value = 11
    oneTimeLeftYear.value--
  } else oneTimeLeftMonth.value--
}
const oneTimeNextMonth = () => {
  if (oneTimeLeftMonth.value === 11) {
    oneTimeLeftMonth.value = 0
    oneTimeLeftYear.value++
  } else oneTimeLeftMonth.value++
}

const getOneTimeDayCellClass = (cell, year, month) => {
  if (!cell.day) return 'cal-day--empty'
  const dateStr = _toDateStr(year, month, cell.day)
  const todayStr = _toDateStr(_today.getFullYear(), _today.getMonth(), _today.getDate())
  const isPast = dateStr < todayStr
  const isSelected = (newSchedule.value.selectedDates || []).includes(dateStr)
  return {
    'cal-day--past': isPast,
    'cal-day--disabled': isPast,
    'cal-day--selected': isSelected,
    'cal-day--multi': isSelected,
  }
}

const toggleOneTimeDate = (day, year, month) => {
  const dateStr = _toDateStr(year, month, day)
  const todayStr = _toDateStr(_today.getFullYear(), _today.getMonth(), _today.getDate())
  if (dateStr < todayStr) return
  const current = newSchedule.value.selectedDates || []
  if (current.includes(dateStr)) {
    newSchedule.value.selectedDates = current.filter((d) => d !== dateStr)
  } else {
    newSchedule.value.selectedDates = [...current, dateStr]
  }
}

// ─── Recurring schedule preview calendar ──────────────────────────────────────
const previewLeftMonth = ref(_today.getMonth())
const previewLeftYear = ref(_today.getFullYear())
const previewRightMonth = computed(() => (previewLeftMonth.value + 1) % 12)
const previewRightYear = computed(() =>
  previewLeftMonth.value === 11 ? previewLeftYear.value + 1 : previewLeftYear.value,
)

const previewLeftCells = computed(() =>
  buildCalendarCells(previewLeftYear.value, previewLeftMonth.value),
)
const previewRightCells = computed(() =>
  buildCalendarCells(previewRightYear.value, previewRightMonth.value),
)

const previewPrevMonth = () => {
  if (previewLeftMonth.value === 0) {
    previewLeftMonth.value = 11
    previewLeftYear.value--
  } else previewLeftMonth.value--
}
const previewNextMonth = () => {
  if (previewLeftMonth.value === 11) {
    previewLeftMonth.value = 0
    previewLeftYear.value++
  } else previewLeftMonth.value++
}

// recurringCalendarDates uses YYYY/MM/DD format — convert for lookup
const getPreviewDayCellClass = (cell, year, month) => {
  if (!cell.day) return 'cal-day--empty'
  const dateStr = `${year}/${String(month + 1).padStart(2, '0')}/${String(cell.day).padStart(2, '0')}`
  const isScheduled = recurringCalendarDates.value.includes(dateStr)
  return {
    'cal-day--multi': isScheduled,
    'cal-day--preview-readonly': true,
  }
}

// Sync preview left month to start date when template is selected
watch(
  () => newSchedule.value.recurringStartDate,
  (val) => {
    if (val) {
      const [y, m] = val.split('-')
      previewLeftMonth.value = parseInt(m) - 1
      previewLeftYear.value = parseInt(y)
    }
  },
)

// ─── Week helpers ─────────────────────────────────────────────────────────────

const getWeekRange = (date = new Date()) => {
  const d = new Date(date)
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}

const selectedWeek = ref(getWeekRange())

const nextWeek = async () => {
  const newStart = new Date(selectedWeek.value.start)
  newStart.setDate(newStart.getDate() + 7)
  selectedWeek.value = getWeekRange(newStart)
  await fetchData()
  fetchLeaves()
}

const prevWeek = async () => {
  const newStart = new Date(selectedWeek.value.start)
  newStart.setDate(newStart.getDate() - 7)
  selectedWeek.value = getWeekRange(newStart)
  await fetchData()
  fetchLeaves()
}
// ─── Next month prefetch ───────────────────────────────────────────────────────

const fetchNextMonthSchedule = async () => {
  const now = new Date()
  // First day of next month
  const start = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  // Last day of next month
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0)

  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  try {
    const result = await fetchScheduleByDateRange(fmt(start), fmt(end))
    console.log('Next month schedules fetched:', result)
    return result
  } catch (error) {
    console.error('Failed to fetch next month schedule:', error)
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

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

// eslint-disable-next-line no-unused-vars
const isValidTime = (val) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(val || '')

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

const getPositionName = (positionId) =>
  shiftTypes.value.find((p) => p.id === positionId)?.name || positionId

const getSiteName = (siteId, shift = null) => {
  if (!siteId) return null
  // Use pre-resolved name stored on the shift object when available (comes direct from API)
  if (shift?.siteName) return shift.siteName
  const id = typeof siteId === 'number' ? siteId : parseInt(siteId)
  return sites.value.find((s) => s.id === id)?.name || null
}

const isDayOff = (shift) => {
  if (!shift) return false
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
  const isDayOffByStatus =
    shift.status === 'day_off' ||
    shift.status === 'off' ||
    shift.is_day_off === true ||
    shift.is_off === true
  const isDayOffByTime = !shift.startTime && !shift.endTime
  return isDayOffByName || isDayOffByStatus || isDayOffByTime
}

const getInitials = (name) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)

const getAvatarColor = (name) => {
  const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6']
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[index % colors.length]
}

// Helper to get shift template by ID for displaying details in reassign modal
const getTemplateById = (templateId) => {
  if (!templateId) return null
  const id = typeof templateId === 'number' ? templateId : parseInt(templateId)
  const tmpl = shiftTemplates.value.find((t) => t.id === id)
  if (tmpl?.shifts?.length) {
    console.log('[getTemplateById] sub-shift[0] raw:', JSON.stringify(tmpl.shifts[0], null, 2))
  }
  return tmpl
}

const getEmployeeName = (id) => users.value.find((u) => u.id === id)?.name || 'Unknown Employee'

const isEmployeeTerminated = (emp) => {
  if (emp.status?.toLowerCase() === 'terminated') return true
  const empStatus = emp.companies?.[0]?.employment_status
  if (empStatus?.toLowerCase() === 'terminated') return true
  return false
}

// ─── Computed ─────────────────────────────────────────────────────────────────

const totalShifts = computed(() => shifts.value.length)
const activeEmployees = computed(() => new Set(shifts.value.map((s) => s.userId)).size)
const positionsCount = computed(() => new Set(shifts.value.map((s) => s.position)).size)

const siteFilterOptions = computed(() => [
  { label: 'All Sites', value: null },
  ...sites.value.map((site) => ({ label: site.name, value: site.id })),
])

const userOptions = computed(() => users.value.map((u) => ({ label: u.name, value: u.id })))

const employeeOptions = computed(() =>
  employees.value
    .filter((emp) => !isEmployeeTerminated(emp))
    .map((emp) => ({ label: emp.full_name || emp.name, value: emp.id })),
)

const siteOptions = computed(() => sites.value.map((s) => ({ label: s.name, value: s.id })))

const departmentOptions = computed(() =>
  departments.value.map((d) => ({ label: d.name, value: d.id })),
)

// eslint-disable-next-line no-unused-vars
const positionOptions = computed(() =>
  shiftTypes.value.map((p) => ({ label: p.name, value: p.id })),
)

const shiftTemplateOptions = computed(() => {
  const opts = shiftTemplates.value.map((t) => {
    let label = t.name
    const shifts = parseShifts(t.shifts_detail)
    if (!label && shifts.length) {
      label = shifts
        .map((s) => {
          const site = s.site?.name || getSiteName(s.site?.id || t.site_id) || ''
          const start = s.start_time || s.default_start_time || ''
          const end = s.end_time || s.default_end_time || ''
          const time = start && end ? `${start} - ${end}` : start || end
          return site ? `${time} (${site})` : time
        })
        .filter(Boolean)
        .join(' / ')
    }
    return {
      label: label || `Template ${t.id}`,
      value: Number(t.id),
      site: t.site || t.site_id,
    }
  })
  return opts
})

const recurringScheduleOptions = computed(() =>
  recurringSchedules.value.map((r) => ({ label: r.name, value: r.id })),
)

// eslint-disable-next-line no-unused-vars
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
  const filtered = shiftTypes.value.filter((st) =>
    leaveKeywords.some((kw) => (st.name || '').toLowerCase().includes(kw)),
  )
  return (filtered.length > 0 ? filtered : shiftTypes.value).map((st) => ({
    label: st.name,
    value: st.id,
  }))
})

const filteredUsers = computed(() => {
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
    return matchEmployee && matchSearch && matchSite
  })
})

// ─── Recurring calendar ───────────────────────────────────────────────────────

const WEEKDAY_MAP = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

const parseWeekdays = (weekdaysStr) => {
  if (!weekdaysStr) return []
  if (Array.isArray(weekdaysStr)) return weekdaysStr.map((d) => d.toString().trim().toLowerCase())
  return weekdaysStr
    .toString()
    .split(',')
    .map((d) => d.trim().toLowerCase())
}

const buildRecurringDates = (startStr, endStr, weekdays, interval) => {
  if (!weekdays || weekdays.length === 0) return []
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const oneYearLater = new Date(now)
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
  const defaultEndStr = `${oneYearLater.getFullYear()}-${String(oneYearLater.getMonth() + 1).padStart(2, '0')}-${String(oneYearLater.getDate()).padStart(2, '0')}`
  const start = new Date((startStr || todayStr) + 'T00:00:00')
  const end = new Date((endStr || defaultEndStr) + 'T00:00:00')
  const repeatEvery = interval || 1
  const targetDays = weekdays
    .map((d) => WEEKDAY_MAP[d.toLowerCase()])
    .filter((d) => d !== undefined)
  const dates = []
  let weekStart = new Date(start)
  const dayOfWeek = weekStart.getDay()
  weekStart.setDate(weekStart.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek))
  while (weekStart <= end) {
    for (const targetDay of targetDays) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + (targetDay === 0 ? 6 : targetDay - 1))
      if (date >= start && date <= end) {
        dates.push(
          `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`,
        )
      }
    }
    weekStart.setDate(weekStart.getDate() + 7 * repeatEvery)
  }
  return dates
}

// eslint-disable-next-line no-unused-vars
const recurringCalendarDefaultMonth = computed(() => {
  if (newSchedule.value.recurringStartDate) {
    const [year, month] = newSchedule.value.recurringStartDate.split('-')
    return `${year}/${month}`
  }
  const now = new Date()
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`
})

const recurringCalendarDates = computed({
  get: () =>
    buildRecurringDates(
      newSchedule.value.recurringStartDate,
      newSchedule.value.recurringEndDate,
      newSchedule.value.weekdays,
      newSchedule.value.repeatInterval,
    ),
  set: () => {},
})

// eslint-disable-next-line no-unused-vars
const recurringCalendarOptions = computed(() => {
  const dateSet = new Set(recurringCalendarDates.value)
  return (dateStr) => dateSet.has(dateStr)
})

const recurringActiveWeekdays = computed(() =>
  (newSchedule.value.weekdays || []).map((d) => d.charAt(0).toUpperCase() + d.slice(1)),
)

// ─── Watchers ─────────────────────────────────────────────────────────────────

watch(
  employeeOptions,
  (newOptions) => {
    filteredEmployeeOptions.value = newOptions
  },
  { immediate: true },
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getShifts = (employeeId, dayIdx) =>
  shifts.value.filter((shift) => shift.userId === employeeId && shift.day === dayIdx)

const getMergedShifts = (employeeId, dayIdx) => {
  const dayShifts = getShifts(employeeId, dayIdx)
  const specialShifts = dayShifts.filter((s) => s.isLeave || isDayOff(s))
  const regularShifts = dayShifts.filter((s) => !s.isLeave && !isDayOff(s))
  if (regularShifts.length <= 1) return [...specialShifts, ...regularShifts]
  const sorted = [...regularShifts].sort((a, b) =>
    (a.startTime || '').localeCompare(b.startTime || ''),
  )
  return [
    ...specialShifts,
    {
      id: `merged-${employeeId}-${dayIdx}`,
      userId: employeeId,
      day: dayIdx,
      isMerged: true,
      shifts: sorted,
      site: sorted[0].site,
      position: sorted[0].position,
      startTime: sorted[0].startTime,
      endTime: sorted[sorted.length - 1].endTime,
    },
  ]
}

// eslint-disable-next-line no-unused-vars
const getUserShiftCount = (userId) => shifts.value.filter((s) => s.userId === userId).length

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

const filterEmployeeOptions = (val, update) => {
  update(() => {
    filteredEmployeeOptions.value = !val
      ? employeeOptions.value
      : employeeOptions.value.filter((opt) => opt.label.toLowerCase().includes(val.toLowerCase()))
  })
}

// ─── localStorage leave helpers ───────────────────────────────────────────────

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

// ─── Fetch helpers ────────────────────────────────────────────────────────────

const normalizeCompanyId = () => {
  let raw = localStorage.getItem('selectedCompany')
  try {
    raw = JSON.parse(raw)?.id || raw
  } catch {
    // ignore parse errors
  }
  return parseInt(raw)
}

const fetchSitesAndDepartments = async () => {
  try {
    await Promise.all([
      fetchSites(),
      fetchDepartments(),
      fetchShiftTypes(),
      fetchRecurringSchedules(),
    ])
  } catch {
    // handled silently
  }
}

const fetchLeaveTypes = async () => {
  leaveTypes.value = await fetchLeaveTypesApi()
}

const fetchShiftTemplatesList = async () => {
  shiftTemplates.value = await fetchShiftTemplatesApi()
  console.log('[shiftTemplates] sample:', JSON.stringify(shiftTemplates.value[0], null, 2))
}

const fetchLeaves = () => {
  const cId = String(normalizeCompanyId())
  const ws = selectedWeek.value.start
  const weekStartStr = `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, '0')}-${String(ws.getDate()).padStart(2, '0')}`
  const allLeaves = getStoredLeaves().filter((l) => String(l.companyId) === cId)
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
      const daysDiff = Math.round((d.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24))
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
}

const fetchData = async () => {
  isLoadingSchedule.value = true
  try {
    const token = localStorage.getItem('access_token')
    const cId = normalizeCompanyId()
    if (!token || !cId) {
      $q.notify({
        type: 'negative',
        message: !token ? 'Please log in to view schedules' : 'No company selected.',
      })
      return
    }
    const ws = selectedWeek.value.start
    const weekEnd = selectedWeek.value.end

    const fmt = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    // Fetch only the week's date range instead of the full month(s)
    const fetchResults = [await fetchScheduleByDateRange(fmt(ws), fmt(weekEnd))]

    // Merge all fetched months into one flat employee list, de-duping by employee id
    const mergeEmployeeData = (results) => {
      const map = new Map()
      results.forEach((rawResult) => {
        const list = Array.isArray(rawResult)
          ? rawResult
          : Array.isArray(rawResult?.results)
            ? rawResult.results
            : Array.isArray(rawResult?.data)
              ? rawResult.data
              : rawResult
                ? [rawResult]
                : []
        list.forEach((empData) => {
          const empId = empData.employee?.id || empData.id
          if (!empId) return
          if (map.has(empId)) {
            // Merge schedules arrays
            const existing = map.get(empId)
            const newSchedules =
              empData.schedules || empData.schedule || empData.schedule_list || []
            const existingSchedules = existing.schedules || []
            existing.schedules = [...existingSchedules, ...newSchedules]
          } else {
            map.set(empId, {
              ...empData,
              schedules: [
                ...(empData.schedules || empData.schedule || empData.schedule_list || []),
              ],
            })
          }
        })
      })
      return Array.from(map.values())
    }

    const employeesData = mergeEmployeeData(fetchResults)
    users.value = employees.value
      .filter((emp) => !isEmployeeTerminated(emp))
      .map((emp) => ({
        id: emp.id,
        name: emp.full_name || emp.name || `Employee ${emp.id}`,
        email: emp.email || '',
      }))
    shifts.value = []
    // employeesData is already built by mergeEmployeeData above
    const weekStartStr = `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, '0')}-${String(ws.getDate()).padStart(2, '0')}`
    const weekStartLocal = new Date(weekStartStr + 'T00:00:00')
    const weekEndLocal = new Date(weekStartLocal)
    weekEndLocal.setDate(weekEndLocal.getDate() + 6)

    employeesData.forEach((empData) => {
      const employee =
        empData.employee && typeof empData.employee === 'object'
          ? empData.employee
          : empData.id
            ? empData
            : null
      if (!employee?.id) return

      const scheduleList = empData.schedules || empData.schedule || empData.schedule_list || []
      const parsedSchedules =
        typeof scheduleList === 'string'
          ? (() => {
              try {
                return JSON.parse(scheduleList)
              } catch {
                return []
              }
            })()
          : scheduleList
      if (!Array.isArray(parsedSchedules) || parsedSchedules.length === 0) return

      parsedSchedules.forEach((schedule, sIndex) => {
        if (!schedule.date) return
        const scheduleDateStr = schedule.date.substring(0, 10)
        const scheduleDate = new Date(scheduleDateStr + 'T00:00:00')

        // Filter to current week only
        const daysDiff = Math.round(
          (scheduleDate.getTime() - weekStartLocal.getTime()) / (1000 * 60 * 60 * 24),
        )
        if (daysDiff < 0 || daysDiff >= 7) return

        // Day-off detection: use is_off flag directly (reliable) plus name/status fallbacks
        const isDayOffShift =
          schedule.is_off === true ||
          schedule.is_day_off === true ||
          schedule.status === 'day_off' ||
          schedule.shift_type_name?.toLowerCase().includes('day off')

        const startTime = isDayOffShift
          ? null
          : schedule.actual_start_time?.substring(0, 5) ||
            schedule.start_time?.substring(0, 5) ||
            null

        const endTime = isDayOffShift
          ? null
          : schedule.actual_end_time?.substring(0, 5) || schedule.end_time?.substring(0, 5) || null

        // Resolve shift type: prefer direct shift_type id from API, then match by time,
        // then fall back gracefully (never force shiftTypes[0] which gives wrong label).
        let shiftTypeId = schedule.shift_type || null
        let shiftTypeName = isDayOffShift ? 'Day Off' : schedule.shift_type_name || null

        if (!isDayOffShift && !shiftTypeName && startTime) {
          const match =
            shiftTypes.value.find((st) => {
              const stStart = st.default_start_time?.substring(0, 5)
              const stEnd = st.default_end_time?.substring(0, 5)
              return stStart === startTime && stEnd === endTime
            }) ||
            shiftTypes.value.find((st) => st.default_start_time?.substring(0, 5) === startTime)
          if (match) {
            shiftTypeId = shiftTypeId || match.id
            shiftTypeName = match.name
          }
        }

        // If we still have a shiftTypeId but no name, resolve from local list
        if (shiftTypeId && !shiftTypeName) {
          shiftTypeName = shiftTypes.value.find((st) => st.id === shiftTypeId)?.name || null
        }

        // Use site_name directly from the API response — no local lookup needed
        const resolvedAssignmentId =
          schedule.employee_assignment_id || schedule.assignment_id || null

        shifts.value.push({
          id: `${schedule.id}-${sIndex}`,
          assignmentId: resolvedAssignmentId,
          userId: employee.id,
          day: daysDiff,
          startTime,
          endTime,
          position: shiftTypeName || (startTime ? `${startTime}–${endTime}` : 'Shift'),
          shiftTypeId,
          shiftTemplateId: schedule.shift_template || schedule.shift_template_id || null,
          site: schedule.site || null,
          siteName: schedule.site_name || null,
          department: schedule.department || null,
          status: schedule.status || 'active',
          date: scheduleDateStr,
          is_off: isDayOffShift,
        })
      })
    })
    $q.notify({
      type: shifts.value.length ? 'positive' : 'info',
      message: shifts.value.length
        ? `Loaded ${shifts.value.length} schedules`
        : 'No schedules found for the selected week.',
      timeout: shifts.value.length ? 2000 : 3000,
    })
  } catch (e) {
    console.error('❌ FETCH ERROR:', e)
    $q.notify({ type: 'negative', message: 'Failed to load schedules', timeout: 5000 })
  } finally {
    isLoadingSchedule.value = false
  }
}

// ─── Recurring template change ────────────────────────────────────────────────

const onRecurringTemplateChange = (templateId) => {
  if (!templateId) {
    newSchedule.value.startTime = ''
    newSchedule.value.endTime = ''
    newSchedule.value.weekdays = []
    return
  }
  const template = recurringSchedules.value.find((r) => r.id === templateId)
  if (!template) return
  console.log('[RecurringTemplate]', JSON.stringify(template, null, 2))

  if (template.start_time) newSchedule.value.startTime = template.start_time.substring(0, 5)
  if (template.end_time) newSchedule.value.endTime = template.end_time.substring(0, 5)
  if (template.shift_type) newSchedule.value.position = template.shift_type
  if (template.is_rotating !== undefined) newSchedule.value.isRotating = template.is_rotating
  if (template.site) newSchedule.value.site = template.site
  if (template.department) newSchedule.value.department = template.department
  if (template.start_date) newSchedule.value.recurringStartDate = template.start_date
  if (template.end_date) newSchedule.value.recurringEndDate = template.end_date

  // Extract weekdays — from template.weekdays string/array, or from template.rules[].weekday
  if (template.weekdays) {
    newSchedule.value.weekdays = parseWeekdays(template.weekdays)
  } else if (Array.isArray(template.rules) && template.rules.length) {
    newSchedule.value.weekdays = [
      ...new Set(template.rules.map((r) => r.weekday?.toLowerCase()).filter(Boolean)),
    ]
  }

  $q.notify({ type: 'info', message: 'Template loaded successfully', timeout: 3000 })
}

// ─── Modal handlers ───────────────────────────────────────────────────────────

const openAddModal = () => {
  newSchedule.value = _freshSchedule()
  addConflictWarning.value = false
  fetchEmployees()
  fetchShiftTemplatesList()
  showAddModal.value = true
}
const closeAddModal = () => (showAddModal.value = false)

const openQuickAddModal = (userId, dayIdx) => {
  quickAdd.value = {
    userId,
    day: dayIdx,
    shifts: [{ shiftTemplate: null }],
    leaveType: null,
  }
  fetchShiftTemplatesList()
  showQuickAddModal.value = true
}
const closeQuickAddModal = () => {
  showQuickAddModal.value = false
  quickAdd.value = { userId: null, day: null, shifts: [], leaveType: null }
}

const openReassignModal = async (shift) => {
  await fetchSites()
  // Ensure shift templates are loaded - MUST complete before modal opens
  await fetchShiftTemplatesList()

  if (shift.isMerged && shift.shifts?.length > 1) {
    if (shift.shifts.find((s) => !s.assignmentId)) {
      $q.notify({
        type: 'negative',
        message: 'Cannot update — missing assignment ID on one of the shifts',
        timeout: 5000,
      })
      return
    }

    // Resolve template ID against loaded shiftTemplates list
    // prefer shiftTemplateId (from shift_template field), fall back to shiftTypeId
    const resolveTemplateId = (s) => {
      const fromTemplate = Number(s.shiftTemplateId) || null
      if (fromTemplate && shiftTemplates.value.find((t) => t.id === fromTemplate))
        return fromTemplate
      const fromType = Number(s.shiftTypeId) || null
      if (fromType && shiftTemplates.value.find((t) => t.id === fromType)) return fromType
      return fromTemplate || fromType
    }

    const mainTemplateId = resolveTemplateId(shift.shifts[0])

    reassignData.value = {
      assignmentId: null,
      shiftTemplateId: mainTemplateId,
      originalTemplateId: mainTemplateId,
      // Store display values for current shifts
      dualShifts: shift.shifts.map((s) => ({
        assignmentId: s.assignmentId,
        shiftTemplateId: resolveTemplateId(s),
        originalTemplateId: resolveTemplateId(s),
        originalTemplateName: s.position || 'N/A',
        originalSiteName: s.siteName || getSiteName(s.site),
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      currentEmployee: shift.userId,
      date: shift.shifts[0].date,
      day: shift.day,
      isDualShift: true,
    }
    showReassignModal.value = true
    console.log('[openReassignModal] reassignData:', JSON.stringify(reassignData.value, null, 2))
    const tpl = shiftTemplates.value.find((t) => t.id === mainTemplateId)
    console.log('[openReassignModal] matched template object:', JSON.stringify(tpl, null, 2))
    return
  }
  if (!shift.assignmentId) {
    $q.notify({
      type: 'negative',
      message: 'Cannot update this shift',
      caption: 'Missing required field: Assignment ID',
      timeout: 5000,
    })
    return
  }

  // Resolve template ID against loaded shiftTemplates list
  const _fromTemplate = Number(shift.shiftTemplateId) || null
  const _fromType = Number(shift.shiftTypeId) || null
  const templateId =
    _fromTemplate && shiftTemplates.value.find((t) => t.id === _fromTemplate)
      ? _fromTemplate
      : _fromType && shiftTemplates.value.find((t) => t.id === _fromType)
        ? _fromType
        : _fromTemplate || _fromType

  console.log('[openReassignModal] templateId resolved:', templateId)
  console.log(
    '[openReassignModal] shiftTemplateId on shift:',
    shift.shiftTemplateId,
    '| shiftTypeId:',
    shift.shiftTypeId,
  )
  console.log(
    '[openReassignModal] shiftTemplates IDs:',
    shiftTemplates.value.map((t) => t.id),
  )
  console.log(
    '[openReassignModal] shiftTemplates sample[0]:',
    JSON.stringify(shiftTemplates.value[0], null, 2),
  )

  reassignData.value = {
    assignmentId: shift.assignmentId,
    shiftTemplateId: templateId,
    originalTemplateId: templateId,
    // Store display values directly to avoid lookup issues
    originalTemplateName:
      shiftTemplates.value.find((t) => t.id === templateId)?.name ||
      shiftTemplates.value.find((t) => t.id === templateId)?.time_display ||
      shift.position ||
      'N/A',
    originalSiteName: shift.siteName || getSiteName(shift.site),
    originalTime: `${shift.startTime || ''} - ${shift.endTime || ''}`,
    originalDuration: shift.duration,
    currentEmployee: shift.userId,
    date: shift.date,
    day: shift.day,
    isDualShift: false,
    dualShifts: [],
  }
  showReassignModal.value = true
  console.log('[openReassignModal] reassignData:', JSON.stringify(reassignData.value, null, 2))
}

const closeReassignModal = () => {
  showReassignModal.value = false
  reassignData.value = {
    assignmentId: null,
    shiftTemplateId: null,
    // Display values
    originalTemplateId: null,
    originalTemplateName: null,
    originalSiteName: null,
    originalTime: null,
    originalDuration: null,
    currentEmployee: null,
    date: null,
    day: null,
    isDualShift: false,
    dualShifts: [],
  }
}

// ─── CRUD actions ─────────────────────────────────────────────────────────────

// ─── Helper: safely extract a raw primitive ID from a q-select value ─────────
// q-select with emit-value should always give us the primitive, but if the
// option object leaks through (e.g. emit-value is missing on a dynamic render)
// parseInt(object) → NaN which the API rejects with a 400. This guard matches
// the same pattern already used in quickAddSchedule.
const resolveId = (val) => {
  if (val === null || val === undefined) return null
  const raw = typeof val === 'object' ? val?.value : val
  const n = parseInt(raw)
  return isNaN(n) ? null : n
}

const addSchedule = async () => {
  const n = newSchedule.value

  // ── Basic validations ──────────────────────────────────────────────────────
  if (!n.userIds?.length)
    return $q.notify({ type: 'negative', message: 'Please select at least one employee.' })

  if (n.scheduleType === 'one-time') {
    if (!n.selectedDates?.length)
      return $q.notify({ type: 'negative', message: 'Please select at least one date.' })
    for (const s of n.oneTimeShifts) {
      if (!s.shiftTemplate)
        return $q.notify({
          type: 'negative',
          message: 'Please select a shift template for all shifts.',
        })
    }
  }

  if (n.scheduleType === 'recurring') {
    if (!n.recurringStartDate)
      return $q.notify({ type: 'negative', message: 'Please select a start date.' })
    if (!n.recurringEndDate)
      return $q.notify({ type: 'negative', message: 'Please select an end date.' })
    if (!n.recurringSchedule)
      return $q.notify({ type: 'negative', message: 'Please select a recurring template.' })
  }

  isCheckingConflict.value = true
  addConflictWarning.value = false

  try {
    const cId = normalizeCompanyId()

    if (n.scheduleType === 'recurring') {
      // Build one recurring entry per rule so every weekday defined in the
      // template is sent with its own shift_type / shift_template.
      // Collapsing all rules into a single object (old behaviour) sent only
      // one weekday — and the wrong one (start-date's weekday, not the template's).
      const template = recurringSchedules.value.find((r) => r.id === resolveId(n.recurringSchedule))
      const rules = Array.isArray(template?.rules) && template.rules.length ? template.rules : []

      const recurringEntries = rules.map((rule) => {
        const entry = {
          recurring_id: resolveId(n.recurringSchedule),
          weekday: rule.weekday,
          start_date: n.recurringStartDate,
          end_date: n.recurringEndDate,
        }
        const ruleShiftType = resolveId(rule.shift_type)
        const ruleShiftTemplate = resolveId(rule.shift_template)
        if (ruleShiftType) entry.shift_type = ruleShiftType
        else if (ruleShiftTemplate) entry.shift_template = ruleShiftTemplate
        if (n.startTime || rule.start_time) entry.start_time = n.startTime || rule.start_time
        if (n.endTime || rule.end_time) entry.end_time = n.endTime || rule.end_time
        return entry
      })

      const payload = {
        company_id: cId,
        employee_ids: n.userIds,
        recurring: recurringEntries,
      }

      console.log('[addSchedule] recurring payload:', JSON.stringify(payload, null, 2))
      await assignShift(payload)
    } else {
      const schedulePayloads = n.selectedDates.flatMap((dateStr) =>
        n.oneTimeShifts.map((shift) => {
          const templateId = resolveId(shift.shiftTemplate)
          const template = shiftTemplates.value.find((t) => t.id === templateId)
          const siteId = template?.site || template?.site_id
          return {
            date: dateStr,
            shift_template_id: templateId,
            site_id: siteId ? Number(siteId) : undefined,
          }
        }),
      )

      const payload = {
        company_id: cId,
        employee_ids: n.userIds,
        schedules: schedulePayloads,
      }

      console.log('[addSchedule] one-time payload:', JSON.stringify(payload, null, 2))
      await assignShift(payload)
    }

    showAddModal.value = false
    newSchedule.value = _freshSchedule()

    // Auto-navigate to the week that contains the schedule's start date so the
    // user immediately sees the newly created shifts in the table.
    if (n.recurringStartDate || n.selectedDates?.[0]) {
      const targetDate = new Date((n.recurringStartDate || n.selectedDates[0]) + 'T00:00:00')
      selectedWeek.value = getWeekRange(targetDate)
    }

    // Wait for the backend to finish writing the new assignments, then refresh.
    // 1200 ms gives the server time to generate schedule rows for all rules.
    await new Promise((r) => setTimeout(r, 1200))
    await fetchData()
    fetchLeaves()

    // Tell the user where to find the new schedules — recurring ones may land
    // on a future week depending on the start_date and weekday rules.
    const scheduleLabel = n.scheduleType === 'recurring' ? 'Recurring schedule' : 'Schedule'
    const startHint =
      n.scheduleType === 'recurring' && n.recurringStartDate
        ? ` Starting ${n.recurringStartDate}.`
        : ''
    $q.notify({
      type: 'positive',
      message: `${scheduleLabel} created successfully!`,
      caption: `Navigate to the correct week to see the new shifts.${startHint}`,
      icon: 'check_circle',
      timeout: 5000,
    })
  } catch (error) {
    handleScheduleError(error)
  } finally {
    isCheckingConflict.value = false
  }
}

const quickAddSchedule = async () => {
  const { userId, day, shifts: qShifts } = quickAdd.value
  if (!userId || day === null)
    return $q.notify({ type: 'negative', message: 'Employee and day are required.' })
  for (let i = 0; i < qShifts.length; i++) {
    if (!qShifts[i].shiftTemplate)
      return $q.notify({
        type: 'negative',
        message: `Please select a shift template for shift ${i + 1}`,
      })
  }
  isAddingShift.value = true
  try {
    const cId = normalizeCompanyId()
    const { start } = selectedWeek.value
    const targetDate = new Date(start)
    targetDate.setDate(targetDate.getDate() + day)
    const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`
    await assignShift({
      company_id: cId,
      employee_ids: [userId],
      schedules: qShifts.map((shift) => {
        const templateId =
          typeof shift.shiftTemplate === 'object' ? shift.shiftTemplate.value : shift.shiftTemplate
        const template = shiftTemplates.value.find((t) => t.id === Number(templateId))
        const siteId = template?.site || template?.site_id

        return {
          date: dateStr,
          shift_template_id: Number(templateId),
          site_id: siteId ? Number(siteId) : undefined,
        }
      }),
    })
    $q.notify({
      type: 'positive',
      message: `${qShifts.length} shift${qShifts.length > 1 ? 's' : ''} added successfully for ${days[day]}!`,
      icon: 'check_circle',
    })
    closeQuickAddModal()
    setTimeout(async () => {
      await fetchData()
      fetchLeaves()
    }, 500)
  } catch (error) {
    handleScheduleError(error)
  } finally {
    isAddingShift.value = false
  }
}

const handleReassignShift = async () => {
  isReassigning.value = true
  const r = reassignData.value
  try {
    if (r.isDualShift) {
      // eslint-disable-next-line no-unused-vars
      const results = await Promise.all(
        r.dualShifts.map((s) => {
          // Get company_id from the selected shift template
          const templateId = parseInt(r.shiftTemplateId)
          const template = shiftTemplates.value.find((t) => t.id === templateId)
          const resolvedCompanyId = template?.company?.id || template?.company_id || companyId.value

          const payload = {
            employee_id: r.currentEmployee,
            company_id: parseInt(resolvedCompanyId),
            date: r.date,
            shift_template_id: templateId,
            assignment_id: s.assignmentId,
          }

          console.log('[handleReassignShift] Dual shift payload:', JSON.stringify(payload, null, 2))
          return reassignShiftApi(payload).then((res) => ({ ...res, assignmentId: s.assignmentId }))
        }),
      )
      $q.notify({
        type: 'positive',
        message: 'Both shifts updated successfully!',
        icon: 'check_circle',
        timeout: 3000,
      })
      fetchData()
    } else {
      // Get company_id from the selected shift template
      const templateId = parseInt(r.shiftTemplateId)
      const template = shiftTemplates.value.find((t) => t.id === templateId)
      const resolvedCompanyId = template?.company?.id || template?.company_id || companyId.value

      const payload = {
        employee_id: r.currentEmployee,
        company_id: parseInt(resolvedCompanyId),
        date: r.date,
        shift_template_id: templateId,
        assignment_id: r.assignmentId,
      }

      console.log('[handleReassignShift] Single shift payload:', JSON.stringify(payload, null, 2))
      await reassignShiftApi(payload)
      $q.notify({
        type: 'positive',
        message: 'Shift updated successfully!',
        icon: 'check_circle',
        timeout: 3000,
      })
      fetchData()
    }
    closeReassignModal()
  } catch (error) {
    console.error('❌ Reassign failed:', error)
    $q.notify({
      type: 'negative',
      message: error.response?.data?.detail || 'Failed to reassign shift.',
      timeout: 6000,
    })
  } finally {
    isReassigning.value = false
  }
}

const assignDayOff = async (element) => {
  assigningDayOffId.value = element.id
  try {
    const cId = normalizeCompanyId()
    await assignDayOffApi({
      employee_id: element.userId,
      company_id: cId,
      date: element.date,
      site_id: parseInt(element.site),
    })
    const idx = shifts.value.findIndex((s) => s.id === element.id)
    if (idx !== -1)
      shifts.value[idx] = {
        ...shifts.value[idx],
        position: 'Day Off',
        startTime: null,
        endTime: null,
      }
    $q.notify({
      type: 'positive',
      message: 'Day off assigned!',
      caption: `${getEmployeeName(element.userId)}'s shift changed to Day Off`,
      icon: 'event_busy',
      timeout: 3000,
    })
    setTimeout(async () => {
      await fetchData()
      fetchLeaves()
    }, 1500)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.detail || 'Failed to assign day off.',
      timeout: 5000,
    })
  } finally {
    assigningDayOffId.value = null
  }
}

const assignDualDayOff = async (mergedElement) => {
  assigningDayOffId.value = mergedElement.id
  try {
    const cId = normalizeCompanyId()
    await Promise.all(
      mergedElement.shifts.map((s) =>
        assignDayOffApi({
          employee_id: mergedElement.userId,
          company_id: cId,
          date: s.date,
          site_id: parseInt(s.site),
        }),
      ),
    )
    $q.notify({
      type: 'positive',
      message: 'Day off assigned to both shifts!',
      caption: `${getEmployeeName(mergedElement.userId)}'s dual shift changed to Day Off`,
      icon: 'event_busy',
      timeout: 3000,
    })
    setTimeout(async () => {
      await fetchData()
      fetchLeaves()
    }, 1500)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.detail || 'Failed to assign day off.',
      timeout: 5000,
    })
  } finally {
    assigningDayOffId.value = null
  }
}

const quickDirectAssign = async (userId, dayIdx, type, leaveSubType = null) => {
  const key = `${userId}-${dayIdx}-${type}`
  quickActionLoading.value = key

  try {
    const { start } = selectedWeek.value
    const targetDate = new Date(start)
    targetDate.setDate(targetDate.getDate() + dayIdx)
    const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`

    const cId = String(normalizeCompanyId())

    if (type === 'leave') {
      // Ensure we have a valid leave type ID
      const leaveType = leaveTypes.value.find((lt) => lt.id === leaveSubType)
      if (!leaveType) {
        return $q.notify({ type: 'negative', message: 'Invalid leave type selected.' })
      }

      const payload = {
        employee_id: userId, // must be a UUID string
        leave_type: leaveType.id, // valid leave type ID
        start_date: dateStr,
        end_date: dateStr,
        hours: 8, // full day leave
        reason: leaveType.name || 'Leave',
        company_id: cId,
      }

      const postRes = await applyLeaveForEmployee(payload)
      const apiLeaveId = postRes?.id ?? null
      const localId = `${userId}-${dateStr}-${leaveType.id}-${Date.now()}`

      saveLeaveToStorage({
        localId,
        apiId: apiLeaveId,
        companyId: cId,
        employee_id: userId,
        leave_type: leaveType.id,
        leave_type_name: leaveType.name,
        start_date: dateStr,
        end_date: dateStr,
      })

      $q.notify({
        type: 'positive',
        message: `${leaveType.name} assigned!`,
        caption: `${getEmployeeName(userId)} — ${days[dayIdx]}`,
        icon: 'beach_access',
        timeout: 3000,
      })
    } else {
      // Day-off logic
      const siteId = parseInt(siteOptions.value[0]?.value)
      if (!siteId)
        return $q.notify({ type: 'negative', message: 'No sites available to assign day off.' })

      await assignDayOffApi({
        employee_id: userId,
        company_id: cId,
        date: dateStr,
        site_id: siteId,
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

const handleScheduleError = (error) => {
  const data = error.response?.data
  let msg = 'Failed to create schedule'
  if (Array.isArray(data?.errors) && data.errors.length) msg = data.errors.join('; ')
  else if (data?.detail) msg = data.detail
  else if (typeof data === 'string') msg = data
  $q.notify({ type: 'negative', message: msg, timeout: 10000, position: 'top', multiLine: true })
}

const applyFilters = () => {}
const filterEmployees = () => {}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  await fetchSitesAndDepartments()
  await fetchEmployees()
  await fetchLeaveTypes()
  await fetchShiftTemplatesList()
  await fetchData()
  fetchNextMonthSchedule()
  fetchLeaves()
})
</script>

<style scoped lang="scss">
/* ==============================
   PAGE ROOT
============================== */
.schedule-loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}

.schedule-loading-text {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

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

/* ── Dropdown: truncate long option labels ── */
.schedule-page :deep(.q-menu) {
  max-width: 480px !important;
}
.schedule-page :deep(.q-item__label) {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
/* Truncate the selected value shown in the input */
.modal-body :deep(.q-select .q-field__native span) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Modal UI improvements ── */
.modal-card {
  border-radius: 16px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
}
.modal-header {
  background: #2563eb !important;
  border-bottom: none !important;
}
.modal-header .q-btn {
  color: rgba(255, 255, 255, 0.8) !important;
}
.modal-header .q-btn:hover {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.15) !important;
}
.modal-title {
  color: #ffffff !important;
  font-weight: 700 !important;
}
.modal-body {
  background: #f9fafb !important;
  scrollbar-width: thin !important;
  scrollbar-color: #e2e8f0 transparent !important;
}
.modal-body::-webkit-scrollbar {
  width: 4px;
  display: block !important;
}
.modal-body::-webkit-scrollbar-track {
  background: transparent;
}
.modal-body::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 4px;
}
.modal-body :deep(.q-field__control) {
  background: #ffffff !important;
  border-radius: 10px !important;
}
.modal-body :deep(.q-field--outlined .q-field__control:before) {
  border-color: #e2e8f0 !important;
  border-radius: 10px !important;
}
.modal-body :deep(.q-field--outlined .q-field__control:hover:before) {
  border-color: #2563eb !important;
}
.modal-body :deep(.q-field--outlined.q-field--focused .q-field__control:before) {
  border-color: #2563eb !important;
  border-width: 2px !important;
}
.cancel-btn {
  border: 1px solid #e2e8f0 !important;
  border-radius: 10px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  padding: 0 18px !important;
  min-height: 38px !important;
}
.cancel-btn:hover {
  background: #f1f5f9 !important;
}
.submit-btn {
  background: #2563eb !important;
  border-radius: 10px !important;
  font-weight: 600 !important;
  text-transform: none !important;
  min-height: 38px !important;
  padding: 0 22px !important;
}
.submit-btn:hover {
  background: #1d4ed8 !important;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3) !important;
}
.quick-info {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 12px !important;
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

/* ==============================
   DUAL-MONTH DATE RANGE PICKER
============================== */
.date-range-section {
  margin-bottom: 12px;
}

.date-range-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 8px;
}

.date-range-input-box {
  position: relative;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 40px 10px 14px;
  cursor: pointer;
  background: #fff;
  transition: border-color 0.2s;
  min-height: 62px;
}

.date-range-input-box:hover {
  border-color: #1a3a5c;
}

.date-range-input-box--active {
  border-color: #1a3a5c;
  border-width: 2px;
}

.date-range-input-label {
  font-size: 11px;
  font-weight: 700;
  color: #1a3a5c;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.date-range-input-value {
  font-size: 14px;
  font-weight: 600;
  color: #1a3a5c;
}

.date-range-input-placeholder {
  color: #9ca3af;
  font-weight: 400;
}

.date-range-input-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

.dual-calendar-panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.dual-calendar-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mini-calendar {
  min-width: 0;
}

.mini-calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.mini-calendar-title {
  font-size: 11px;
  font-weight: 700;
  color: #1a3a5c;
  letter-spacing: 0.03em;
  text-align: center;
  flex: 1;
}

.cal-nav-btn {
  color: #6b7280 !important;
}

.mini-calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 2px;
}

.mini-calendar-weekdays span {
  font-size: 10px;
  font-weight: 600;
  color: #6b7280;
  padding: 2px 0;
}

.mini-calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
}

.cal-day {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  font-size: 11px;
  color: #1a3a5c;
  border-radius: 50%;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
  user-select: none;
}

.cal-day:not(.cal-day--empty):not(.cal-day--disabled):hover {
  background: #e8edf5;
}

.cal-day--empty {
  cursor: default;
}

.cal-day--disabled {
  color: #d1d5db;
  cursor: not-allowed;
}

.cal-day--range {
  background: #e8edf5;
  border-radius: 0;
  color: #1a3a5c;
}

.cal-day--selected {
  background: #1a3a5c !important;
  color: #fff !important;
  border-radius: 50% !important;
  font-weight: 700;
}

.cal-day--start {
  border-radius: 50% 0 0 50%;
}

.cal-day--end {
  border-radius: 0 50% 50% 0;
}

.cal-day--start.cal-day--end {
  border-radius: 50%;
}

.cal-day--multi {
  background: #1a3a5c !important;
  color: #fff !important;
  border-radius: 50% !important;
  font-weight: 700;
}

/* One-time calendar section */
.one-time-calendar-section {
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 16px;
}

.one-time-calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.dual-calendar-panel--inline {
  box-shadow: none;
  border: 1px solid #e0e7ff;
  padding: 8px;
}

.cal-day--preview-readonly {
  cursor: default;
}
.cal-day--preview-readonly:hover {
  background: transparent !important;
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
