<template>
  <div class="content-section">
    <div v-if="loading" class="schedule-loading-overlay">
      <q-spinner color="primary" size="48px" />
      <div class="schedule-loading-text">{{ props.loadingText }}</div>
    </div>
    <template v-else>
      <div class="table-view">
        <div class="table-wrapper">
          <table class="schedule-table">
            <thead>
              <tr>
                <th class="employee-col">Employee</th>
                <th v-for="(day, i) in days" :key="i" class="day-col">{{ day }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id" class="table-row">
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
                    <q-spinner
                      v-if="refreshingRowUserId === user.id"
                      color="primary"
                      size="14px"
                      class="row-refresh-spinner"
                    />
                  </div>
                </td>
                <td v-for="(day, dayIdx) in days" :key="dayIdx" class="schedule-cell">
                  <div class="shifts-wrapper">
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
                      <template v-if="element.isLeave">
                        <div class="leave-content">
                          <q-icon name="beach_access" size="15px" class="leave-icon" />
                          <div class="leave-label">{{ element.leaveTypeName }}</div>
                        </div>
                        <div class="shift-actions"></div>
                      </template>
                      <template v-else-if="isDayOff(element)">
                        <div class="dayoff-content">
                          <q-icon name="event_busy" size="18px" class="dayoff-icon" />
                          <div class="dayoff-label">Day Off</div>
                        </div>
                        <div class="shift-actions">
                          <q-btn
                            flat dense round icon="swap_horiz" size="xs"
                            class="action-btn reassign-btn"
                            @click="$emit('open-reassign', element)"
                          >
                            <q-tooltip>Reassign Day Off</q-tooltip>
                          </q-btn>
                        </div>
                      </template>
                      <template v-else-if="element.isMerged">
                        <template v-for="(sub, si) in element.shifts" :key="sub.id">
                          <div class="shift-time">
                            {{ formatTimeWithTimezone(sub.startTime) }} - {{ sub.endTime }}
                          </div>
                          <div class="shift-site" v-if="getSiteName(sub.site, sub)">
                            <q-icon name="location_on" size="10px" />
                            {{ getSiteName(sub.site, sub) }}
                          </div>
                          <div class="shift-position">{{ getPositionName(sub.position) }}</div>
                          <div v-if="si < element.shifts.length - 1" class="merged-shift-separator" />
                        </template>
                        <div class="shift-actions">
                          <q-btn
                            flat dense round icon="swap_horiz" size="xs"
                            class="action-btn reassign-btn"
                            @click="$emit('open-reassign', element)"
                          >
                            <q-tooltip>Update Shifts</q-tooltip>
                          </q-btn>
                          <q-btn
                            flat dense round icon="event_busy" size="xs"
                            class="action-btn dayoff-btn"
                            :loading="assigningDayOffId === element.id"
                            :disable="assigningDayOffId === element.id"
                            @click.stop="$emit('assign-dual-dayoff', element)"
                          >
                            <q-tooltip>Assign Day Off (Both)</q-tooltip>
                          </q-btn>
                        </div>
                      </template>
                      <template v-else>
                        <div class="shift-time" v-if="element.startTime && element.endTime">
                          {{ formatTimeWithTimezone(element.startTime) }} - {{ element.endTime }}
                        </div>
                        <div class="shift-site" v-if="getSiteName(element.site, element)">
                          <q-icon name="location_on" size="11px" />
                          {{ getSiteName(element.site, element) }}
                        </div>
                        <div class="shift-position">{{ getPositionName(element.position) }}</div>
                        <div class="shift-actions">
                          <q-btn
                            flat dense round icon="swap_horiz" size="xs"
                            class="action-btn reassign-btn"
                            @click="$emit('open-reassign', element)"
                          >
                            <q-tooltip>Update Shift</q-tooltip>
                          </q-btn>
                          <q-btn
                            flat dense round icon="event_busy" size="xs"
                            class="action-btn dayoff-btn"
                            :loading="assigningDayOffId === element.id"
                            :disable="assigningDayOffId === element.id"
                            @click.stop="$emit('assign-dayoff', element)"
                          >
                            <q-tooltip>Assign Day Off</q-tooltip>
                          </q-btn>
                        </div>
                      </template>
                    </div>
                    <div class="cell-quick-actions">
                      <q-btn
                        v-if="getShifts(user.id, dayIdx).length === 0"
                        flat dense size="xs" icon="add" label="Schedule"
                        @click="$emit('open-quick-add', user.id, dayIdx)"
                        class="cell-btn cell-btn-add"
                      />
                      <template v-if="getShifts(user.id, dayIdx).length === 0">
                        <q-btn-dropdown
                          flat dense size="xs" no-icon-animation
                          icon="beach_access" label="Leave"
                          :loading="quickActionLoading === `${user.id}-${dayIdx}-leave`"
                          class="cell-btn cell-btn-leave"
                          dropdown-icon="none" fit
                        >
                          <q-list dense>
                            <q-item
                              v-for="lt in leaveTypes" :key="lt.id"
                              clickable v-close-popup
                              @click="$emit('quick-direct-assign', user.id, dayIdx, 'leave', lt.id)"
                              style="min-height: 28px; padding: 4px 8px"
                            >
                              <q-item-section style="font-size: 11px">{{ lt.name }}</q-item-section>
                            </q-item>
                            <q-item v-if="leaveTypes.length === 0" style="min-height: 28px; padding: 4px 8px">
                              <q-item-section style="font-size: 11px; color: grey">No leave types found</q-item-section>
                            </q-item>
                          </q-list>
                        </q-btn-dropdown>
                        <q-btn
                          flat dense size="xs" icon="event_busy" label="Day Off"
                          :loading="quickActionLoading === `${user.id}-${dayIdx}-dayoff`"
                          :disable="quickActionLoading === `${user.id}-${dayIdx}-dayoff`"
                          @click="$emit('quick-direct-assign', user.id, dayIdx, 'dayoff')"
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
</template>

<script setup>
const props = defineProps({
  users: { type: Array, default: () => [] },
  shifts: { type: Array, default: () => [] },
  days: { type: Array, default: () => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  leaveTypes: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  quickActionLoading: { type: String, default: null },
  assigningDayOffId: { type: String, default: null },
  sites: { type: Array, default: () => [] },
  shiftTypes: { type: Array, default: () => [] },
  loadingText: { type: String, default: 'Loading schedules...' },
  refreshingRowUserId: { type: [Number, String], default: null },
});

defineEmits([
  'open-quick-add',
  'open-reassign',
  'assign-dayoff',
  'assign-dual-dayoff',
  'quick-direct-assign',
]);

// ─── Helpers ────────────────────────────────────────────────────────────────
function getShifts(employeeId, dayIdx) {
  return props.shifts.filter((shift) => shift.userId === employeeId && shift.day === dayIdx);
}

function getMergedShifts(employeeId, dayIdx) {
  const dayShifts = getShifts(employeeId, dayIdx);
  const specialShifts = dayShifts.filter((s) => s.isLeave || isDayOff(s));
  const regularShifts = dayShifts.filter((s) => !s.isLeave && !isDayOff(s));
  if (regularShifts.length <= 1) return [...specialShifts, ...regularShifts];
  const sorted = [...regularShifts].sort((a, b) =>
    (a.startTime || '').localeCompare(b.startTime || ''),
  );
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
  ];
}

function isDayOff(shift) {
  if (!shift) return false;
  const positionName =
    (typeof shift.position === 'string'
      ? shift.position
      : getPositionName(shift.position)
    )?.toLowerCase() || '';
  const isDayOffByName =
    positionName.includes('day off') ||
    positionName.includes('dayoff') ||
    positionName.includes('rest day') ||
    positionName.includes('off day') ||
    positionName === 'off';
  const isDayOffByStatus =
    shift.status === 'day_off' || shift.status === 'off' || shift.is_day_off === true || shift.is_off === true;
  const isDayOffByTime = !shift.startTime && !shift.endTime;
  return isDayOffByName || isDayOffByStatus || isDayOffByTime;
}

function getPositionName(positionId) {
  return props.shiftTypes.find((p) => p.id === positionId)?.name || positionId;
}

function getSiteName(siteId, shift = null) {
  if (!siteId) return null;
  if (shift?.siteName) return shift.siteName;
  const id = typeof siteId === 'number' ? siteId : parseInt(siteId);
  return props.sites.find((s) => s.id === id)?.name || null;
}

function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

function getAvatarColor(name) {
  const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

function getTimezoneAbbreviation() {
  const date = new Date();
  const shortFormat = date.toLocaleTimeString('en-US', { timeZoneName: 'short' });
  const match = shortFormat.match(/\b[A-Z]{3,4}\b/);
  return match ? match[0] : '';
}

function formatTimeWithTimezone(time) {
  if (!time) return '';
  const abbr = getTimezoneAbbreviation();
  return abbr ? `${time} ${abbr}` : time;
}
</script>

<style scoped>
.content-section {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e8ecf0;
}
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
.shift-badge-dayoff {
  background: #fff7ed !important;
  border: 1px solid #fed7aa !important;
  padding: 8px 10px;
}
.shift-badge-dayoff:hover {
  background: #ffedd5 !important;
  box-shadow: 0 2px 6px rgba(249, 115, 22, 0.15);
}
.shift-badge-leave {
  background: #fdf4ff;
  border: 1px solid #e9d5ff;
  border-left: 3px solid #9c27b0;
}
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
.cell-quick-actions {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 4px;
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
.row-refresh-spinner {
  margin-left: 6px;
}

@media (min-width: 1440px) {
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
}
</style>
