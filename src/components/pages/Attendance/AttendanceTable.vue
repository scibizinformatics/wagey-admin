<template>
  <div class="att-table-wrap dash-scroll-x">
    <q-table
      :rows="rows"
      :columns="columns"
      row-key="id"
      flat
      :loading="loading"
      class="dash-qtable att-table"
      hide-pagination
      :rows-per-page-options="[0]"
      separator="none"
      :pagination="tablePagination"
      :sort-method="keepGivenOrder"
      @update:pagination="onPaginationUpdate"
    >
      <template v-slot:header="props">
        <q-tr class="att-table__head-row">
          <q-th
            v-for="col in columns"
            :key="col.name"
            :props="props"
            class="att-table__th"
            :class="col.headerClasses"
          >
            {{ col.label }}
          </q-th>
        </q-tr>
      </template>

      <template v-slot:body="props">
        <q-tr class="dash-qtable__row att-table__row">
          <!-- Every row is the same person while a single-employee range is
               active, so the date earns the lead column instead. -->
          <q-td v-if="singleEmployee" key="date" :props="props" class="att-table__td">
            <span class="when">{{ rowDateLabel(props.row) }}</span>
          </q-td>
          <q-td v-else key="employee" :props="props" class="att-table__td">
            <div class="who">
              <q-avatar
                v-if="photoOf(props.row)"
                size="32px"
                class="who__avatar"
                @click="$emit('view-photo', props.row.employee)"
              >
                <img :src="photoOf(props.row)" alt="" loading="lazy" />
              </q-avatar>
              <q-avatar
                v-else
                size="32px"
                class="who__avatar"
                :style="{ background: getAvatarColor(nameOf(props.row)) }"
                @click="$emit('view-photo', props.row.employee)"
              >
                <span class="who__initials">{{ getInitials(nameOf(props.row)) }}</span>
              </q-avatar>
              <span class="who__name">{{ nameOf(props.row) }}</span>
            </div>
          </q-td>

          <q-td v-if="showWorkType" key="work_type" :props="props" class="att-table__td">
            <span
              v-if="props.row.work_type"
              class="dash-chip work-type"
              :class="workTypeToneClass(props.row.work_type)"
            >
              {{ props.row.work_type }}
            </span>
            <span v-else class="muted">—</span>
          </q-td>

          <q-td key="shift_name" :props="props" class="att-table__td">
            <span class="shift">{{ getShiftName(props.row) }}</span>
          </q-td>

          <q-td key="time_in" :props="props" class="att-table__td">
            <AttendancePunchCell
              kind="in"
              :time="props.row.time_in"
              :timezone="props.row._timezone"
              :selfie="props.row.time_in_selfie"
              :source="props.row.time_in_source || props.row.source"
              :locked="props.row._shiftLocked"
              :locked-reason="props.row._shiftLockedReason"
              @edit="$emit('edit-time', props.row, 'time_in')"
              @view-selfie="(url, title) => $emit('view-selfie', url, title)"
            />
          </q-td>

          <q-td key="time_out" :props="props" class="att-table__td">
            <AttendancePunchCell
              kind="out"
              :time="props.row.time_out"
              :timezone="props.row._timezone"
              :selfie="props.row.time_out_selfie"
              :source="props.row.time_out_source || props.row.source"
              :locked="props.row._shiftLocked"
              :locked-reason="props.row._shiftLockedReason"
              @edit="$emit('edit-time', props.row, 'time_out')"
              @view-selfie="(url, title) => $emit('view-selfie', url, title)"
            />
          </q-td>

          <q-td key="audit" :props="props" class="att-table__td att-table__td--audit">
            <button
              type="button"
              class="audit-btn"
              :class="auditToneClass(props.row)"
              :aria-label="`View audit trail for ${nameOf(props.row)}`"
              @click="$emit('view-audit', props.row)"
            >
              <q-icon name="o_visibility" size="16px" />
              <!-- A dot rather than a count: the row only ever has flags set or
                   not, and a number here would imply a tally that doesn't exist. -->
              <span v-if="hasAuditFlags(props.row)" class="audit-btn__dot" />
              <q-tooltip>{{ auditTooltip(props.row) }}</q-tooltip>
            </button>
          </q-td>
        </q-tr>
      </template>

      <template v-slot:no-data>
        <div v-if="!loading" class="dash-empty">
          <span class="dash-featured-icon">
            <q-icon :name="isFiltered ? 'filter_alt_off' : 'o_schedule'" size="20px" />
          </span>
          <p class="dash-empty__title">
            {{ isFiltered ? 'No records match these filters' : 'No attendance for this date' }}
          </p>
          <p class="dash-empty__sub">
            {{
              isFiltered
                ? 'Nothing here fits the current search and filters.'
                : 'Nobody has clocked in on this date yet. Pick another day, or add a record.'
            }}
          </p>
          <q-btn
            v-if="isFiltered"
            outline
            no-caps
            dense
            size="12px"
            icon="filter_alt_off"
            label="Clear filters"
            class="empty-btn"
            @click="$emit('clear-filters')"
          />
        </div>
      </template>
    </q-table>
  </div>
</template>

<script setup>
/**
 * Attendance records as a table, for laptop and desktop. AttendanceCardList
 * takes over below 1024px.
 *
 * Nine columns became five. Each punch's time, selfie and source are now one
 * cell (AttendancePunchCell) instead of three columns repeated twice, and work
 * type — the least load-bearing column — drops out as the viewport narrows. The
 * previous table was a fixed 700px minimum that shrank its own type to 10px on
 * tablet — both of which this replaces.
 */
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import AttendancePunchCell from '@/components/pages/Attendance/AttendancePunchCell.vue'
import {
  getEmployeeName,
  getEmployeePhoto,
  getInitials,
  getAvatarColor,
  getShiftName,
  workTypeToneClass,
} from '@/composables/utils/attendance'

const $q = useQuasar()

const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  employees: { type: Array, default: () => [] },
  isFiltered: { type: Boolean, default: false },
  // Set while the list is narrowed to one employee over a date range: the
  // Employee column carries no information then, so Date takes its place.
  singleEmployee: { type: Boolean, default: false },
  // Sort lives on the page, not here — see below.
  sortBy: { type: String, default: '' },
  descending: { type: Boolean, default: false },
})

const emit = defineEmits([
  'view-selfie',
  'view-photo',
  'edit-time',
  'clear-filters',
  'view-audit',
  'update:sort',
])

// `rows` is one page of an already-sorted list, so the header arrows only report
// which column the reader clicked; the page re-sorts every filtered record and
// hands back a fresh first page. Sorting here instead would shuffle the 25 rows
// on screen and leave matching records sitting on page 2.
const tablePagination = computed(() => ({
  sortBy: props.sortBy || null,
  descending: props.descending,
  page: 1,
  rowsPerPage: 0,
}))

function onPaginationUpdate(value) {
  emit('update:sort', {
    sortBy: value?.sortBy || '',
    descending: Boolean(value?.descending),
  })
}

const keepGivenOrder = (rows) => rows

// Employee, shift, time in and time out are the point of the page and always
// show — the table only renders at 1024px and up, where all four fit without
// sideways scroll. Work type is the one piece of context that gives way.
const showWorkType = computed(() => $q.screen.width >= 1280)

const nameOf = (row) => getEmployeeName(row.employee, props.employees)
const photoOf = (row) => getEmployeePhoto(row.employee, props.employees)

const rowDate = (row) => row.date || row.attendance_date || row.log_date || ''

// A bare YYYY-MM-DD parses as UTC and can shift a day west of Greenwich, so pin
// it to local midnight before formatting.
function rowDateLabel(row) {
  const iso = rowDate(row)
  if (!iso) return '—'
  const date = new Date(`${iso}T00:00:00`)
  if (isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const columns = computed(() => {
  const cols = [
    props.singleEmployee
      ? {
          name: 'date',
          label: 'Date',
          field: (row) => rowDate(row),
          align: 'left',
          style: 'min-width: 190px',
          sortable: true,
        }
      : {
          name: 'employee',
          label: 'Employee',
          field: (row) => nameOf(row),
          align: 'left',
          style: 'min-width: 190px',
          sortable: true,
        },
  ]

  if (showWorkType.value) {
    cols.push({
      name: 'work_type',
      label: 'Work type',
      field: 'work_type',
      align: 'left',
      style: 'width: 118px',
      sortable: true,
    })
  }

  cols.push({
    name: 'shift_name',
    label: 'Shift',
    field: (row) => getShiftName(row),
    align: 'left',
    style: 'width: 124px',
  })

  cols.push(
    {
      name: 'time_in',
      label: 'Time in',
      field: 'time_in',
      align: 'left',
      style: 'width: 164px',
      sortable: true,
    },
    {
      name: 'time_out',
      label: 'Time out',
      field: 'time_out',
      align: 'left',
      style: 'width: 164px',
      sortable: true,
    },
    {
      name: 'audit',
      label: 'Audit',
      field: 'id',
      align: 'center',
      style: 'width: 62px',
      headerClasses: 'att-table__th--audit',
    },
  )

  return cols
})

// ─── Audit ────────────────────────────────────────────────────────────────────
function hasAuditFlags(row) {
  return Boolean(row.flagged || row.is_suspicious || row.auto_closed)
}

// Worst state wins the colour, matching the chip order inside the dialog.
function auditToneClass(row) {
  if (row.is_suspicious) return 'audit-btn--critical'
  if (row.flagged) return 'audit-btn--warn'
  if (row.auto_closed) return 'audit-btn--info'
  return null
}

function auditTooltip(row) {
  const states = []
  if (row.is_suspicious) states.push('Suspicious')
  if (row.flagged) states.push('Flagged')
  if (row.auto_closed) states.push('Auto-closed')
  if (row.acknowledged) states.push('Acknowledged')
  return states.length ? `${states.join(' · ')} — view audit trail` : 'View audit trail'
}
</script>

<style scoped>
.att-table-wrap {
  overflow-x: auto;
  padding: 0 6px;
}

/* The card reset, header strip, row rhythm, hover plate and dividers all come
   from `dash-qtable` in src/css/dashboard.scss. This file used to restate every
   one of them behind `:deep()` and `!important`; the only difference from the
   system was a 10px row padding against its 11px, which is why an attendance
   row sat a pixel shorter than an employees row on the same screen. */

/* ── Employee ── */
.who {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.who__avatar {
  flex-shrink: 0;
  cursor: pointer;
}

.who__initials {
  font-size: 11.5px;
  font-weight: 600;
  color: #fff;
}

.who__name {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Audit ── */
.att-table__td--audit,
.att-table :deep(.att-table__th--audit) {
  text-align: center;
}

.audit-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--dash-line, #eaecf0);
  border-radius: 7px;
  background: var(--dash-surface, #fff);
  color: var(--dash-ink-3, #667085);
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.audit-btn:hover {
  background: var(--dash-hover, #f9fafb);
  border-color: var(--dash-line-strong, #d0d5dd);
  color: var(--dash-ink, #101828);
}

/* Tinted only when the row actually carries a flag, so a clean table stays quiet
   and the exceptions are what catch the eye. */
.audit-btn--warn {
  border-color: var(--dash-warn-line, #fedf89);
  background: var(--dash-warn-bg, #fffaeb);
  color: var(--dash-warn, #b54708);
}

.audit-btn--critical {
  border-color: var(--dash-critical-line, #fecdca);
  background: var(--dash-critical-bg, #fef3f2);
  color: var(--dash-critical, #b42318);
}

.audit-btn--info {
  border-color: var(--dash-info-line, #c7d2fe);
  background: var(--dash-info-bg, #eef2ff);
  color: var(--dash-info, #2e4fd4);
}

.audit-btn__dot {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 2px var(--dash-surface, #fff);
}

/* Stands in for .who__name in the lead column during a single-employee range */
.when {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  white-space: nowrap;
}

.work-type {
  text-transform: capitalize;
}

.shift {
  color: var(--dash-ink-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.muted {
  color: var(--dash-ink-4);
}

.empty-btn {
  margin-top: 6px;
  padding: 0 12px;
  height: 32px;
  border-radius: var(--dash-r-md);
  font-weight: 500;
  color: var(--dash-ink-2);
}

/* Laptop runs the table at its tightest — three columns and less cell padding.
   Below 1024 the card list takes over, so nothing here has to go narrower. */
@media (max-width: 1279px) {
  .att-table-wrap {
    padding: 0 2px;
  }
  .att-table :deep(.att-table__th) {
    padding: 12px 9px 10px !important;
  }
  .att-table :deep(.att-table__td) {
    padding: 10px 9px !important;
  }
}
</style>
