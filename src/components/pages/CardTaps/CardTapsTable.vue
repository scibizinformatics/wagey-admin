<template>
  <div class="ct-table-wrap dash-scroll-x">
    <q-table
      :rows="rows"
      :columns="columns"
      row-key="key"
      flat
      :loading="loading"
      class="dash-qtable ct-table"
      hide-pagination
      :rows-per-page-options="[0]"
      separator="none"
      :pagination="tablePagination"
      :sort-method="keepGivenOrder"
      @update:pagination="onPaginationUpdate"
    >
      <template v-slot:header="props">
        <q-tr class="ct-table__head-row">
          <q-th
            v-for="col in columns"
            :key="col.name"
            :props="props"
            class="ct-table__th"
            :class="col.headerClasses"
          >
            {{ col.label }}
          </q-th>
        </q-tr>
      </template>

      <template v-slot:body="props">
        <q-tr class="dash-qtable__row ct-table__row">
          <!-- Every row is the same person while a single-employee range is
               active, so the date earns the lead column instead. -->
          <q-td v-if="singleEmployee" key="date" :props="props" class="ct-table__td">
            <span class="ct-when">{{ rowDateLabel(props.row) }}</span>
          </q-td>
          <q-td v-else key="employee" :props="props" class="ct-table__td">
            <div class="ct-who">
              <q-avatar
                size="32px"
                class="ct-who__avatar"
                :style="{ background: getAvatarColor(props.row.employee_name) }"
              >
                <span class="ct-who__initials">{{ getInitials(props.row.employee_name) }}</span>
              </q-avatar>
              <span class="ct-who__name">{{ props.row.employee_name }}</span>
            </div>
          </q-td>

          <q-td key="first_tap" :props="props" class="ct-table__td">
            <span class="ct-time dash-num">{{ timeLabel(props.row.first_tap) }}</span>
          </q-td>

          <q-td key="last_tap" :props="props" class="ct-table__td">
            <span class="ct-time dash-num">{{ timeLabel(props.row.last_tap) }}</span>
          </q-td>

          <q-td key="duration" :props="props" class="ct-table__td">
            <span class="ct-time dash-num">{{ durationLabel(props.row) }}</span>
          </q-td>

          <q-td key="tap_count" :props="props" class="ct-table__td">
            <button
              type="button"
              class="ct-taps-btn"
              :aria-label="`View the ${tapCount(props.row)} taps on ${rowDateLabel(props.row)}`"
              @click="$emit('view-taps', props.row)"
            >
              <span class="ct-taps-btn__count dash-num">{{ tapCount(props.row) }}</span>
              <q-icon name="o_visibility" size="15px" />
              <q-tooltip>View all taps</q-tooltip>
            </button>
          </q-td>
        </q-tr>
      </template>

      <template v-slot:no-data>
        <div v-if="!loading" class="dash-empty">
          <span class="dash-featured-icon">
            <q-icon :name="isFiltered ? 'filter_alt_off' : 'o_contactless'" size="20px" />
          </span>
          <p class="dash-empty__title">
            {{ isFiltered ? 'No taps match these filters' : 'No card taps for this date' }}
          </p>
          <p class="dash-empty__sub">
            {{
              isFiltered
                ? 'Nothing here fits the current search and filters.'
                : 'No access cards were tapped on this date. Pick another day, or open the date range to review a longer span.'
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
            class="ct-empty-btn"
            @click="$emit('clear-filters')"
          />
        </div>
      </template>
    </q-table>
  </div>
</template>

<script setup>
/**
 * Card taps as a table, for laptop and desktop. CardTapsCardList takes over
 * below 1024px.
 *
 * Five columns: the employee (or the date, during a single-employee range) and
 * the four facts that describe a day's tapping — first tap, last tap, duration
 * and tap count. Sort lives on the page, not here: `rows` is one page of an
 * already-sorted list, so the header arrows only report which column was
 * clicked, exactly as AttendanceTable does.
 */
import { computed } from 'vue'
import { getInitials, getAvatarColor } from '@/composables/utils/attendance'
import { tapCount } from '@/composables/utils/cardTaps'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
  // Set while the list is narrowed to one employee over a date range: the
  // Employee column carries no information then, so Date takes its place.
  singleEmployee: { type: Boolean, default: false },
  // Sort lives on the page, not here — see header comments.
  sortBy: { type: String, default: '' },
  descending: { type: Boolean, default: false },
})

const emit = defineEmits(['view-taps', 'clear-filters', 'update:sort'])

// `rows` is one page of an already-sorted list, so the header arrows only report
// which column the reader clicked; the page re-sorts every filtered record and
// hands back a fresh first page.
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

function rowDate(row) {
  return row?.date || ''
}

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

function timeLabel(tap) {
  return tap || '—'
}

function durationLabel(row) {
  return row?.duration || '—'
}

const columns = computed(() => {
  const cols = [
    props.singleEmployee
      ? {
          name: 'date',
          label: 'Date',
          field: (row) => rowDate(row),
          align: 'left',
          style: 'min-width: 170px',
          sortable: true,
        }
      : {
          name: 'employee',
          label: 'Employee',
          field: (row) => row?.employee_name || '',
          align: 'left',
          style: 'min-width: 190px',
          sortable: true,
        },
    {
      name: 'first_tap',
      label: 'First tap',
      field: (row) => row?.first_tap || '',
      align: 'left',
      style: 'width: 130px',
    },
    {
      name: 'last_tap',
      label: 'Last tap',
      field: (row) => row?.last_tap || '',
      align: 'left',
      style: 'width: 130px',
    },
    {
      name: 'duration',
      label: 'Duration',
      field: (row) => row?.duration || '',
      align: 'left',
      style: 'width: 130px',
    },
    {
      name: 'tap_count',
      label: 'Taps',
      field: (row) => tapCount(row),
      align: 'left',
      style: 'width: 110px',
      sortable: true,
      headerClasses: 'ct-table__th--taps',
    },
  ]

  return cols
})
</script>

<style scoped>
.ct-table-wrap {
  overflow-x: auto;
  padding: 0 6px;
}

/* ── Employee / Date ── */
.ct-who {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.ct-who__avatar {
  flex-shrink: 0;
}
.ct-who__initials {
  font-size: 11.5px;
  font-weight: 600;
  color: #fff;
}
.ct-who__name {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ct-when {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
}

/* ── Tap facts ── */
.ct-time {
  font-size: 12.5px;
  color: var(--dash-ink);
  white-space: nowrap;
}

/* ── Tap-count button ── */
.ct-taps-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px 4px 9px;
  border: 1px solid var(--dash-line-strong);
  border-radius: var(--dash-r-sm);
  background: var(--dash-surface);
  color: var(--dash-ink-3);
  font-family: inherit;
  cursor: pointer;
  transition:
    border-color var(--dash-fast, 0.15s) var(--dash-ease, ease),
    color var(--dash-fast, 0.15s) var(--dash-ease, ease),
    background var(--dash-fast, 0.15s) var(--dash-ease, ease);
}
.ct-taps-btn:hover {
  border-color: var(--dash-accent);
  color: var(--dash-accent);
  background: var(--dash-accent-bg);
}
.ct-taps-btn__count {
  font-size: 12px;
  font-weight: 600;
}

.ct-empty-btn {
  margin-top: 10px;
}
</style>