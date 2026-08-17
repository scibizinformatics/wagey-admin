<template>
  <div class="att-table-wrap">
    <q-table
      :rows="rows"
      :columns="columns"
      row-key="id"
      flat
      :loading="loading"
      class="att-table"
      hide-pagination
      :rows-per-page-options="[0]"
      separator="none"
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
        <q-tr class="att-table__row">
          <q-td key="employee" :props="props" class="att-table__td">
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

          <q-td v-if="showShift" key="shift_name" :props="props" class="att-table__td">
            <span class="shift">{{ getShiftName(props.row) }}</span>
          </q-td>

          <q-td key="time_in" :props="props" class="att-table__td">
            <AttendancePunchCell
              kind="in"
              :time="props.row.time_in"
              :timezone="props.row._timezone"
              :selfie="props.row.time_in_selfie"
              :source="props.row.time_in_source || props.row.source"
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
              @edit="$emit('edit-time', props.row, 'time_out')"
              @view-selfie="(url, title) => $emit('view-selfie', url, title)"
            />
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
 * cell (AttendancePunchCell) instead of three columns repeated twice, and the
 * two least load-bearing columns drop out as the viewport narrows. The previous
 * table was a fixed 700px minimum that shrank its own type to 10px on tablet —
 * both of which this replaces.
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
})

defineEmits(['view-selfie', 'view-photo', 'edit-time', 'clear-filters'])

// Employee, time in and time out are the point of the page and always show.
// Work type and shift are context, and give way in that order.
const showWorkType = computed(() => $q.screen.width >= 1280)
const showShift = computed(() => $q.screen.width >= 1440)

const nameOf = (row) => getEmployeeName(row.employee, props.employees)
const photoOf = (row) => getEmployeePhoto(row.employee, props.employees)

const columns = computed(() => {
  const cols = [
    {
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

  if (showShift.value) {
    cols.push({
      name: 'shift_name',
      label: 'Shift',
      field: (row) => getShiftName(row),
      align: 'left',
      style: 'width: 124px',
    })
  }

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
  )

  return cols
})
</script>

<style scoped>
.att-table-wrap {
  overflow-x: auto;
  padding: 0 6px;
}

.att-table,
.att-table :deep(.q-table__container),
.att-table :deep(.q-table__card),
.att-table :deep(.q-table__top),
.att-table :deep(.q-table__bottom),
.att-table :deep(.q-table) {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  background: transparent;
}

/* ── Header: sentence case over a hairline, no filled band ── */
.att-table :deep(.att-table__head-row) {
  background: transparent;
}

.att-table :deep(.att-table__th) {
  font-size: 12px !important;
  font-weight: 500 !important;
  color: var(--dash-ink-3) !important;
  padding: 0 12px 11px !important;
  border-bottom: 1px solid var(--dash-line) !important;
  white-space: nowrap;
}

/* ── Body ── */
.att-table :deep(.att-table__row) {
  transition: background var(--dash-fast) var(--dash-ease);
}
.att-table :deep(.att-table__row:hover) > td {
  background: var(--dash-n-50);
}

.att-table :deep(.att-table__td) {
  font-size: 13px;
  color: var(--dash-ink-2);
  padding: 10px 12px !important;
  border-bottom: 1px solid var(--dash-line-soft) !important;
  vertical-align: middle;
}
.att-table :deep(.att-table__row:last-child) > td {
  border-bottom: none !important;
}

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
    padding: 0 9px 10px !important;
  }
  .att-table :deep(.att-table__td) {
    padding: 10px 9px !important;
  }
}
</style>
