<template>
  <q-dialog
    :model-value="modelValue"
    :maximized="$q.screen.lt.sm"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="dash-modal dash-modal--sm">
      <!-- ── Header ─────────────────────────────────────────────────────── -->
      <!-- The employee is named here rather than in the body: the dialog is
           opened from a row, and by the time it covers the table there is
           nothing left on screen saying whose record this is. -->
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar v-if="photo" size="38px" class="dash-modal__head-icon">
            <img :src="photo" alt="" />
          </q-avatar>
          <!-- The per-person background colour this fallback used to carry is
               gone: on the navy header an arbitrary hue read as a second brand,
               and the tile the rest of the app uses is the translucent white
               one. -->
          <q-avatar v-else size="38px" class="dash-modal__head-icon">
            {{ getInitials(employeeName) }}
          </q-avatar>

          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">{{ employeeName }}</div>
            <div class="dash-modal__sub">{{ subtitle }}</div>
          </div>
        </div>

        <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <!-- ── Status ───────────────────────────────────────────────────── -->
        <div class="dash-modal__group">
          <p class="dash-modal__group-label">Status</p>
          <div v-if="statusChips.length" class="aud-chips">
            <span v-for="chip in statusChips" :key="chip.key" class="dash-chip" :class="chip.tone">
              <q-icon :name="chip.icon" size="13px" />
              {{ chip.label }}
            </span>
          </div>
          <div v-else class="aud-clean">
            <q-icon name="o_check_circle" size="17px" />
            Nothing flagged on this record
          </div>
        </div>

        <!-- ── Reasons ──────────────────────────────────────────────────── -->
        <!-- Given their own blocks rather than table rows: a reason is free text
             and can run long, where the fields below are all short values. -->
        <div v-if="record.flagged_reason || record.suspicious_reason" class="dash-modal__group">
          <p class="dash-modal__group-label">Reason</p>
          <div v-if="record.flagged_reason" class="aud-note aud-note--warn">
            <q-icon name="o_flag" size="16px" />
            <span>{{ record.flagged_reason }}</span>
          </div>
          <div v-if="record.suspicious_reason" class="aud-note aud-note--critical">
            <q-icon name="o_gpp_maybe" size="16px" />
            <span>{{ record.suspicious_reason }}</span>
          </div>
        </div>

        <!-- ── Acknowledgement ──────────────────────────────────────────── -->
        <div v-if="isAcknowledged" class="dash-modal__group">
          <p class="dash-modal__group-label">Acknowledgement</p>
          <dl class="aud-grid">
            <dt>Acknowledged by</dt>
            <dd>{{ text(record.acknowledged_by) }}</dd>
            <dt>Acknowledged at</dt>
            <dd>{{ stamp(record.acknowledged_at) }}</dd>
          </dl>
        </div>

        <!-- ── History ──────────────────────────────────────────────────── -->
        <div class="dash-modal__group">
          <p class="dash-modal__group-label">Record history</p>
          <dl class="aud-grid">
            <dt>Source</dt>
            <dd>{{ sourceLabel }}</dd>
            <dt>Created by</dt>
            <dd>{{ createdBy }}</dd>
            <dt>Created at</dt>
            <dd>{{ stamp(record.created_at) }}</dd>
            <dt>Last updated</dt>
            <dd>{{ stamp(record.updated_at) }}</dd>
          </dl>
        </div>

        <!-- ── Change history ─────────────────────────────────────────────── -->
        <!-- Every saved revision of the punch, newest first: what the times were
             after that save, and who saved them. The record's own fields cannot
             answer the second half — `updated_at` moves without naming anyone. -->
        <div class="dash-modal__group">
          <div class="dash-modal__group-head">
            <p class="dash-modal__group-label">Change history</p>
            <q-btn
              flat
              dense
              round
              size="sm"
              icon="o_refresh"
              class="aud-reload"
              :disable="trailLoading"
              aria-label="Reload change history"
              @click="loadTrail"
            >
              <q-tooltip>Reload</q-tooltip>
            </q-btn>
          </div>

          <div v-if="trailLoading" class="aud-trail-state">
            <q-spinner size="15px" />
            Loading activity…
          </div>

          <div v-else-if="trailError" class="aud-trail-state aud-trail-state--error">
            <q-icon name="o_error_outline" size="16px" />
            {{ trailError }}
          </div>

          <ol v-else-if="trail.length" class="aud-trail">
            <li v-for="entry in trail" :key="entry.key" class="aud-trail__item">
              <span class="aud-trail__mark aud-trail__mark--update">
                <q-icon name="o_edit" size="13px" />
              </span>
              <div class="aud-trail__body">
                <div class="aud-trail__line">
                  <span class="aud-trail__who">Updated by {{ text(entry.updaterName) }}</span>
                  <span class="aud-trail__when">{{ text(entry.updatedAt) }}</span>
                </div>
                <!-- The times as they stood after this save. Only the fields the
                     save actually moved are tinted, so a list of near-identical
                     revisions can be read down rather than compared by eye. -->
                <p class="aud-trail__times">
                  <span class="aud-trail__pair" :class="{ 'is-changed': entry.changedTimeIn }">
                    <span class="aud-trail__pair-key">In</span>
                    <span class="aud-trail__pair-val">{{ entry.timeIn || EM_DASH }}</span>
                  </span>
                  <span class="aud-trail__pair" :class="{ 'is-changed': entry.changedTimeOut }">
                    <span class="aud-trail__pair-key">Out</span>
                    <span class="aud-trail__pair-val">{{ entry.timeOut || EM_DASH }}</span>
                  </span>
                </p>
              </div>
            </li>
          </ol>

          <div v-else class="aud-trail-state aud-trail-state--empty">
            <q-icon name="o_history_toggle_off" size="16px" />
            This entry has not been edited since it was logged
          </div>
        </div>

        <p v-if="timezone" class="aud-tz">Times shown in {{ timezone }}</p>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <!-- Acknowledging settles the review, it does not clear the flag: the
             anomaly still happened, and the reason stays on the record. -->
        <q-btn
          v-if="canAcknowledge"
          unelevated
          no-caps
          icon="o_task_alt"
          label="Mark as resolved"
          class="dash-modal__submit"
          :loading="acknowledging"
          @click="resolve"
        />
        <div v-else-if="isAcknowledged" class="aud-resolved">
          <q-icon name="o_task_alt" size="16px" />
          Resolved
        </div>
        <q-space />
        <q-btn
          flat
          no-caps
          label="Close"
          class="dash-modal__cancel"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * Audit trail for one attendance record — the flags, who acknowledged it and
 * when, its creation/update history, and every saved revision of the punch.
 * Opened from the eye icon in the table's Audit column.
 *
 * The one write it offers is acknowledgement: an admin who has reviewed a
 * flagged or suspicious punch marks it resolved from here, since this is where
 * the reason and the edit history that justify that call are on screen.
 */
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { getInitials } from '@/composables/utils/attendance'
import { useAuditLogs } from 'src/composables/page/useAuditLogs'
import { useAttendance } from '@/composables/page/useAttendance'
import { extractErrorMessage } from '@/composables/utils/http'
import { useToast } from 'src/composables/useToast'

const $q = useQuasar()
const toast = useToast()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  record: { type: Object, default: () => ({}) },
  employeeName: { type: String, default: 'Unknown Employee' },
  photo: { type: String, default: '' },
  // IANA zone for the record's employee, so stamps read in their local time
  // rather than the admin's.
  timezone: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'acknowledged'])

const EM_DASH = '—'

function text(value) {
  const trimmed = typeof value === 'string' ? value.trim() : value
  return trimmed || EM_DASH
}

function stamp(iso) {
  if (!iso) return EM_DASH
  const date = new Date(iso)
  if (isNaN(date.getTime())) return EM_DASH

  return date.toLocaleString('en-US', {
    timeZone: props.timezone || undefined,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const subtitle = computed(() => {
  const iso = props.record.date || props.record.attendance_date || props.record.log_date
  if (!iso) return 'Attendance record'
  // Pinned to local midnight — a bare YYYY-MM-DD parses as UTC and can shift a day
  const date = new Date(`${iso}T00:00:00`)
  if (isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
})

// ─── Change history ────────────────────────────────────────────────────────

const {
  updates: trail,
  updatesLoading: trailLoading,
  updatesError: trailError,
  fetchAttendanceUpdates,
  reset: resetTrail,
} = useAuditLogs()

// The updates endpoint is keyed by the record's uuid; elsewhere in the app the
// same value is carried as `id`, so either spelling is accepted here.
const recordId = computed(() => props.record?.uuid || props.record?.id || '')

function loadTrail() {
  if (!recordId.value) {
    resetTrail()
    return
  }
  fetchAttendanceUpdates(recordId.value)
}

// Fetched when the dialog opens rather than on mount: it stays mounted while the
// page swaps records underneath it, and a trail nobody asked to see is not worth
// a request. The id is watched too, so a different row opened straight after
// does not keep showing the previous one's activity.
watch(
  () => [props.modelValue, recordId.value],
  ([open]) => {
    if (open) loadTrail()
    else resetTrail()
  },
  { immediate: true },
)

// ─── Acknowledgement ───────────────────────────────────────────────────────

const { acknowledgeAttendance, acknowledging } = useAttendance()

// Held locally so the footer settles the moment the write lands. The record
// itself is a snapshot taken when the row was clicked, and only catches up once
// the page has refetched.
const justAcknowledged = ref(false)

watch(
  () => [props.modelValue, recordId.value],
  () => {
    justAcknowledged.value = false
  },
)

const isAcknowledged = computed(() => Boolean(props.record?.acknowledged) || justAcknowledged.value)

// Offered only where there is something to settle: acknowledging a record that
// was never flagged says nothing, and the backend has nothing to clear.
const canAcknowledge = computed(
  () =>
    !isAcknowledged.value &&
    Boolean(recordId.value) &&
    Boolean(props.record?.flagged || props.record?.is_suspicious || props.record?.auto_closed),
)

async function resolve() {
  if (!canAcknowledge.value || acknowledging.value) return

  try {
    await acknowledgeAttendance(recordId.value, true)
    justAcknowledged.value = true
    toast.success('Attendance record marked as resolved')
    // The page owns the rows: it refetches and re-syncs this dialog's record, so
    // the acknowledgement's author and stamp arrive from the server rather than
    // being guessed at here.
    emit('acknowledged', recordId.value)
  } catch (error) {
    toast.error(extractErrorMessage(error, 'Could not mark this record as resolved'))
  }
}

const createdBy = computed(() => text(props.record.created_by))

const sourceLabel = computed(() => {
  const source = props.record.source
  if (!source) return EM_DASH
  return String(source)
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
})

// Ordered worst-first, so the most serious state is the one read first.
const statusChips = computed(() => {
  const record = props.record
  const chips = []

  if (record.is_suspicious) {
    chips.push({
      key: 'suspicious',
      label: 'Suspicious',
      tone: 'dash-chip--critical',
      icon: 'o_gpp_maybe',
    })
  }
  if (record.flagged) {
    chips.push({ key: 'flagged', label: 'Flagged', tone: 'dash-chip--warn', icon: 'o_flag' })
  }
  if (record.auto_closed) {
    chips.push({
      key: 'auto_closed',
      label: 'Auto-closed',
      tone: 'dash-chip--info',
      icon: 'o_lock_clock',
    })
  }
  if (isAcknowledged.value) {
    chips.push({
      key: 'acknowledged',
      label: 'Acknowledged',
      tone: 'dash-chip--good',
      icon: 'o_task_alt',
    })
  }
  return chips
})
</script>

<style scoped>
.aud-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.aud-clean {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--dash-good);
}

/* ── Reason callouts ───────────────────────────────────────────────────────── */
.aud-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid;
  border-radius: 9px;
  font-size: 13px;
  line-height: 1.45;
}

.aud-note + .aud-note {
  margin-top: 7px;
}

.aud-note--warn {
  background: var(--dash-warn-bg);
  border-color: var(--dash-warn-line);
  color: var(--dash-warn);
}

.aud-note--critical {
  background: var(--dash-critical-bg);
  border-color: var(--dash-critical-line);
  color: var(--dash-critical);
}

/* ── Field grid ────────────────────────────────────────────────────────────── */
.aud-grid {
  display: grid;
  grid-template-columns: minmax(110px, auto) 1fr;
  gap: 0;
  margin: 0;
  border: 1px solid var(--dash-line);
  border-radius: 9px;
  overflow: hidden;
}

.aud-grid dt,
.aud-grid dd {
  margin: 0;
  padding: 9px 12px;
  font-size: 13px;
  border-bottom: 1px solid var(--dash-line-soft);
}

.aud-grid dt {
  background: var(--dash-sunken);
  color: var(--dash-ink-3);
  font-weight: 500;
}

.aud-grid dd {
  color: var(--dash-ink);
  word-break: break-word;
}

/* Last pair carries no divider */
.aud-grid dt:nth-last-of-type(1),
.aud-grid dd:nth-last-of-type(1) {
  border-bottom: none;
}

/* ── Change history ────────────────────────────────────────────────────────── */
.aud-reload {
  color: var(--dash-ink-4);
}

.aud-reload:hover {
  color: var(--dash-ink-3);
}

.aud-trail {
  list-style: none;
  margin: 0;
  padding: 0;
}

.aud-trail__item {
  position: relative;
  display: flex;
  gap: 10px;
  padding-bottom: 14px;
}

.aud-trail__item:last-child {
  padding-bottom: 0;
}

/* Connector between marks, stopping short of the last one so the trail reads as
   finished rather than cut off. */
.aud-trail__item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 22px;
  bottom: 4px;
  width: 1px;
  background: var(--dash-line);
}

.aud-trail__mark {
  position: relative;
  z-index: 1;
  flex: none;
  display: grid;
  place-items: center;
  width: 21px;
  height: 21px;
  margin-top: 1px;
  border-radius: 50%;
  /* Soft tint rather than an outlined badge — these repeat down the list, and a
     saturated ring on each one is louder than the text it sits beside. */
  background: var(--dash-sunken);
  color: var(--dash-ink-3);
}

.aud-trail__mark--update {
  background: var(--dash-info-bg);
  color: var(--dash-info);
}

.aud-trail__body {
  min-width: 0;
  flex: 1;
}

.aud-trail__line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.aud-trail__who {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  line-height: 1.4;
}

.aud-trail__when {
  flex: none;
  font-size: 11.5px;
  color: var(--dash-ink-4);
  font-variant-numeric: tabular-nums;
}

/* The punch as it stood after the save. Values are tabular so the column of
   times below reads as a column, not as ragged prose. */
.aud-trail__times {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 5px 0 0;
}

.aud-trail__pair {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  padding: 2px 8px;
  border-radius: var(--dash-r-sm);
  background: var(--dash-sunken);
  font-size: 12px;
  color: var(--dash-ink-3);
}

/* A soft tint rather than an outline: these repeat down the list, and a ring on
   each changed value would be louder than the times themselves. */
.aud-trail__pair.is-changed {
  background: var(--dash-info-bg);
  color: var(--dash-info);
}

.aud-trail__pair-key {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  opacity: 0.75;
}

.aud-trail__pair-val {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: inherit;
}

.aud-trail__pair:not(.is-changed) .aud-trail__pair-val {
  color: var(--dash-ink);
}

.aud-trail-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 12px;
  border: 1px solid var(--dash-line);
  border-radius: 9px;
  background: var(--dash-sunken);
  font-size: 12.5px;
  color: var(--dash-ink-3);
}

.aud-trail-state--error {
  background: var(--dash-critical-bg);
  border-color: var(--dash-critical-line);
  color: var(--dash-critical);
}

.aud-tz {
  margin: 0;
  font-size: 11.5px;
  color: var(--dash-ink-4);
}

/* Stands where the button did once the record is settled, so the footer keeps
   its shape instead of the Close button jumping left. */
.aud-resolved {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 4px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-good);
}

@media (max-width: 599px) {
  .aud-grid {
    grid-template-columns: 1fr;
  }

  .aud-grid dt {
    padding-bottom: 2px;
    border-bottom: none;
  }

  .aud-trail__line {
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
  }
}
</style>
