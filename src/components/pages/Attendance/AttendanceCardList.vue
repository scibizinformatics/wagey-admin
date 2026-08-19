<template>
  <div class="cards">
    <template v-if="loading">
      <div v-for="n in 6" :key="`sk-${n}`" class="card">
        <div class="card__top">
          <span class="dash-shimmer card__sk-avatar" />
          <div class="card__sk-lines">
            <span class="dash-shimmer" style="width: 56%" />
            <span class="dash-shimmer" style="width: 34%; height: 8px" />
          </div>
        </div>
        <div class="card__punches">
          <span class="dash-shimmer" style="height: 34px" />
          <span class="dash-shimmer" style="height: 34px" />
        </div>
      </div>
    </template>

    <div v-else-if="!rows.length" class="dash-empty cards__empty">
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
        class="cards__empty-btn"
        @click="$emit('clear-filters')"
      />
    </div>

    <article v-for="row in rows" v-else :key="row.id" class="card">
      <div class="card__top">
        <q-avatar
          v-if="photoOf(row)"
          size="36px"
          class="card__avatar"
          @click="$emit('view-photo', row.employee)"
        >
          <img :src="photoOf(row)" alt="" loading="lazy" />
        </q-avatar>
        <q-avatar
          v-else
          size="36px"
          class="card__avatar"
          :style="{ background: getAvatarColor(nameOf(row)) }"
          @click="$emit('view-photo', row.employee)"
        >
          <span class="card__initials">{{ getInitials(nameOf(row)) }}</span>
        </q-avatar>

        <!-- Every card is the same person during a single-employee range, so the
             date leads instead of the name — mirrors AttendanceTable. -->
        <div class="card__identity">
          <p class="card__name">{{ singleEmployee ? rowDateLabel(row) : nameOf(row) }}</p>
          <p class="card__meta">
            <span>{{ getShiftName(row) }}</span>
          </p>
        </div>

        <span
          v-if="row.work_type"
          class="dash-chip card__work-type"
          :class="workTypeToneClass(row.work_type)"
        >
          {{ row.work_type }}
        </span>

        <!-- Audit trail, mirroring the table's Audit column -->
        <button
          type="button"
          class="card__audit"
          :class="auditToneClass(row)"
          :aria-label="`View audit trail for ${nameOf(row)}`"
          @click="$emit('view-audit', row)"
        >
          <q-icon name="o_visibility" size="16px" />
          <span v-if="hasAuditFlags(row)" class="card__audit-dot" />
        </button>
      </div>

      <!-- The two punches side by side, each labelled. On a card there is room
           to name them, which the table has to do in its header. -->
      <div class="card__punches">
        <div class="punch-slot">
          <span class="punch-slot__label">Time in</span>
          <AttendancePunchCell
            kind="in"
            :time="row.time_in"
            :timezone="row._timezone"
            :selfie="row.time_in_selfie"
            :source="row.time_in_source || row.source"
            @edit="$emit('edit-time', row, 'time_in')"
            @view-selfie="(url, title) => $emit('view-selfie', url, title)"
          />
        </div>

        <div class="punch-slot">
          <span class="punch-slot__label">Time out</span>
          <AttendancePunchCell
            kind="out"
            :time="row.time_out"
            :timezone="row._timezone"
            :selfie="row.time_out_selfie"
            :source="row.time_out_source || row.source"
            @edit="$emit('edit-time', row, 'time_out')"
            @view-selfie="(url, title) => $emit('view-selfie', url, title)"
          />
        </div>
      </div>
    </article>
  </div>
</template>

<script setup>
/**
 * Attendance records as cards, for tablet width and below.
 *
 * The old table answered narrow viewports by shrinking its own type to 10px and
 * scrolling sideways — nine columns of 10px text on a tablet is not a readable
 * table, it is a table you cannot read. Cards keep every field at full size and
 * remove the horizontal scroll entirely.
 */
import AttendancePunchCell from '@/components/pages/Attendance/AttendancePunchCell.vue'
import {
  getEmployeeName,
  getEmployeePhoto,
  getInitials,
  getAvatarColor,
  getShiftName,
  workTypeToneClass,
} from '@/composables/utils/attendance'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  employees: { type: Array, default: () => [] },
  isFiltered: { type: Boolean, default: false },
  // Set while the list is narrowed to one employee over a date range.
  singleEmployee: { type: Boolean, default: false },
})

// Pinned to local midnight — a bare YYYY-MM-DD parses as UTC and can shift a day
function rowDateLabel(row) {
  const iso = row.date || row.attendance_date || row.log_date || ''
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

defineEmits(['view-selfie', 'view-photo', 'edit-time', 'clear-filters', 'view-audit'])

// ─── Audit ────────────────────────────────────────────────────────────────────
function hasAuditFlags(row) {
  return Boolean(row.flagged || row.is_suspicious || row.auto_closed)
}

// Worst state wins the colour, matching the chip order inside the dialog.
function auditToneClass(row) {
  if (row.is_suspicious) return 'card__audit--critical'
  if (row.flagged) return 'card__audit--warn'
  if (row.auto_closed) return 'card__audit--info'
  return null
}

const nameOf = (row) => getEmployeeName(row.employee, props.employees)
const photoOf = (row) => getEmployeePhoto(row.employee, props.employees)
</script>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
  padding: 14px 16px 16px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
}

/* ── Top row ── */
.card__top {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.card__avatar {
  flex-shrink: 0;
  cursor: pointer;
}

.card__initials {
  font-size: 12.5px;
  font-weight: 600;
  color: #fff;
}

.card__identity {
  flex: 1;
  min-width: 0;
}

.card__name {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.008em;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__meta {
  margin: 1px 0 0;
  font-size: 12px;
  color: var(--dash-ink-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__work-type {
  flex-shrink: 0;
  text-transform: capitalize;
}

/* ── Audit ── */
.card__audit {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border: 1px solid var(--dash-line);
  border-radius: 8px;
  background: var(--dash-surface);
  color: var(--dash-ink-3);
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.card__audit:active {
  background: var(--dash-hover);
}

/* Tinted only when the row carries a flag, so clean cards stay quiet */
.card__audit--warn {
  border-color: var(--dash-warn-line);
  background: var(--dash-warn-bg);
  color: var(--dash-warn);
}

.card__audit--critical {
  border-color: var(--dash-critical-line);
  background: var(--dash-critical-bg);
  color: var(--dash-critical);
}

.card__audit--info {
  border-color: var(--dash-info-line);
  background: var(--dash-info-bg);
  color: var(--dash-info);
}

.card__audit-dot {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 2px var(--dash-surface);
}

/* ── Punches ── */
.card__punches {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
  padding-top: 12px;
  border-top: 1px solid var(--dash-line-soft);
}

.punch-slot {
  min-width: 0;
}

.punch-slot__label {
  display: block;
  margin-bottom: 5px;
  font-size: 11.5px;
  color: var(--dash-ink-4);
}

/* ── Empty + skeleton ── */
.cards__empty {
  grid-column: 1 / -1;
}

.cards__empty-btn {
  margin-top: 6px;
  padding: 0 12px;
  height: 32px;
  border-radius: var(--dash-r-md);
  font-weight: 500;
  color: var(--dash-ink-2);
}

.card__sk-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
}
.card__sk-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

@media (max-width: 560px) {
  .cards {
    grid-template-columns: 1fr;
    padding: 12px;
  }
}
</style>
