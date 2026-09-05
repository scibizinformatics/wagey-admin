<template>
  <div class="aud-tbl">
    <!-- Built from the same column list the table renders, so the placeholder's
         column edges are the table's and nothing shifts on load. -->
    <TableSkeleton v-if="loading" :columns="columns" :rows="8" flush :min-width="880" />

    <div v-else-if="!rows.length" class="dash-empty">
      <span class="dash-featured-icon">
        <q-icon :name="isFiltered ? 'filter_alt_off' : 'o_history'" size="20px" />
      </span>
      <p class="dash-empty__title">
        {{ isFiltered ? 'Nothing matches this filter' : 'No shift changes recorded' }}
      </p>
      <p class="dash-empty__sub">
        {{
          isFiltered
            ? 'No change matches what you typed, the kind you picked, or the dates you chose.'
            : 'Once somebody assigns or moves a shift, the change appears here with who made it and when.'
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
        class="aud-tbl__empty-btn"
        @click="$emit('clear-filters')"
      />
    </div>

    <div v-else class="dash-scroll-x">
      <q-table
        :rows="rows"
        :columns="columns"
        row-key="key"
        flat
        hide-pagination
        :rows-per-page-options="[0]"
        class="dash-qtable aud-grid"
      >
        <template v-slot:header="props">
          <q-tr :props="props">
            <q-th key="employee" :props="props">Employee</q-th>
            <q-th key="change" :props="props">Change</q-th>
            <q-th key="shift" :props="props">Shift</q-th>
            <q-th key="shiftDate" :props="props" class="date">Shift date</q-th>
            <q-th key="updater" :props="props">Changed by</q-th>
            <q-th key="updatedAt" :props="props" class="date">Recorded</q-th>
          </q-tr>
        </template>

        <template v-slot:body="props">
          <q-tr :props="props" class="dash-qtable__row">
            <q-td key="employee" :props="props" class="strong">
              <div class="who">
                <!-- Same construction as the Employees table: the photograph
                     when the name resolves to exactly one employee who has one,
                     otherwise initials on that person's identity colour. -->
                <q-avatar v-if="props.row.avatar?.pictureUrl" size="28px" class="who__avatar">
                  <img :src="props.row.avatar.pictureUrl" :alt="props.row.employeeName" />
                </q-avatar>
                <q-avatar
                  v-else
                  size="28px"
                  class="who__avatar"
                  :style="{ background: props.row.avatar?.color }"
                >
                  <span class="who__initials">{{ props.row.avatar?.initials || '?' }}</span>
                </q-avatar>
                <span class="who__name">{{ props.row.employeeName }}</span>
              </div>
            </q-td>

            <q-td key="change" :props="props">
              <span class="dash-chip" :class="chipClass(props.row.change.tone)">
                <span class="dash-chip__dot" />
                {{ props.row.change.label }}
              </span>
            </q-td>

            <!-- Both shift names in one cell rather than a "From" column that
                 is empty on every first assignment. The move is the fact; the
                 two names on their own are not. -->
            <q-td key="shift" :props="props">
              <span class="move">
                <span v-if="props.row.previousShift" class="move__from">
                  {{ props.row.previousShift }}
                </span>
                <q-icon
                  v-if="props.row.previousShift && props.row.newShift"
                  name="arrow_right_alt"
                  size="16px"
                  class="move__arrow"
                />
                <span v-if="props.row.newShift" class="move__to">{{ props.row.newShift }}</span>
                <span v-else class="move__none">no shift</span>
              </span>
            </q-td>

            <q-td key="shiftDate" :props="props" class="date">
              {{ props.row.shiftDateLabel || '—' }}
            </q-td>

            <q-td key="updater" :props="props">
              {{ props.row.updaterName }}
            </q-td>

            <q-td key="updatedAt" :props="props" class="date">
              <span class="stamp">{{ props.row.updatedAtDay || '—' }}</span>
              <span v-if="props.row.updatedAtTime" class="stamp__time">
                {{ props.row.updatedAtTime }}
              </span>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </div>
  </div>
</template>

<script setup>
/**
 * Desktop view of the shift-assignment trail. Below 1024px the page swaps this
 * for AuditCardList — six columns inside a tablet's content width means a
 * sideways scroll on every row.
 *
 * Rows arrive already normalised by `composables/utils/assignmentHistory.js`,
 * which is also what the card list reads, so the two cannot disagree about what
 * a change was. Nothing here is clickable: a trail entry is a statement of what
 * happened, and there is no record behind it to open.
 */
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import { chipClass } from 'src/composables/utils/assignmentHistory'

defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
})

defineEmits(['clear-filters'])

// Sorting is the page's job, over the whole trail, so no column declares
// `sortable` — a header click here would only reorder the page slice on screen
// and quietly answer a narrower question than it appears to.
const columns = [
  { name: 'employee', label: 'Employee', field: 'employeeName', align: 'left', minWidth: 190 },
  { name: 'change', label: 'Change', field: (row) => row.change.key, align: 'left', width: 130 },
  { name: 'shift', label: 'Shift', field: 'newShift', align: 'left', minWidth: 190 },
  { name: 'shiftDate', label: 'Shift date', field: 'shiftDate', align: 'left', width: 120 },
  { name: 'updater', label: 'Changed by', field: 'updaterName', align: 'left', minWidth: 150 },
  { name: 'updatedAt', label: 'Recorded', field: 'updatedAtMs', align: 'left', width: 130 },
]
</script>

<style scoped>
.aud-grid {
  width: 100%;
  /* Below this the six columns start folding words; the container scrolls
     instead, with the always-drawn track `dash-scroll-x` supplies. */
  min-width: 880px;
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
}
.who__initials {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}
.who__name {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Shift move ── */
.move {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}
/* The shift being left is dimmed rather than struck through: it was real, it
   is simply no longer current, and a strikethrough reads as cancelled. */
.move__from {
  font-size: 12.5px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}
.move__arrow {
  color: var(--dash-ink-4);
  flex: none;
}
.move__to {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink);
  white-space: nowrap;
}
.move__none {
  font-size: 12.5px;
  font-style: italic;
  color: var(--dash-ink-4);
  white-space: nowrap;
}

/* ── Recorded ── */
.stamp {
  display: block;
  font-size: 12.5px;
  color: var(--dash-ink-2);
  white-space: nowrap;
}
.stamp__time {
  display: block;
  margin-top: 1px;
  font-size: 11px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}

.aud-tbl__empty-btn {
  margin-top: 4px;
  color: var(--dash-ink-2);
  border-color: var(--dash-line-strong);
}
</style>
