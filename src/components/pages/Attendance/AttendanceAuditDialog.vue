<template>
  <q-dialog
    :model-value="modelValue"
    :maximized="$q.screen.lt.sm"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="aud-card">
      <!-- ── Header ─────────────────────────────────────────────────────── -->
      <!-- The employee is named here rather than in the body: the dialog is
           opened from a row, and by the time it covers the table there is
           nothing left on screen saying whose record this is. -->
      <q-card-section class="aud-head">
        <q-avatar v-if="photo" size="38px" class="aud-head__avatar">
          <img :src="photo" alt="" />
        </q-avatar>
        <q-avatar
          v-else
          size="38px"
          class="aud-head__avatar"
          :style="{ background: getAvatarColor(employeeName) }"
        >
          <span class="aud-head__initials">{{ getInitials(employeeName) }}</span>
        </q-avatar>

        <div class="aud-head__titles">
          <div class="aud-head__name">{{ employeeName }}</div>
          <div class="aud-head__sub">{{ subtitle }}</div>
        </div>

        <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
      </q-card-section>

      <q-card-section class="aud-body">
        <!-- ── Status ───────────────────────────────────────────────────── -->
        <div class="aud-section">
          <p class="aud-section__label">Status</p>
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
        <div v-if="record.flagged_reason || record.suspicious_reason" class="aud-section">
          <p class="aud-section__label">Reason</p>
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
        <div v-if="record.acknowledged" class="aud-section">
          <p class="aud-section__label">Acknowledgement</p>
          <dl class="aud-grid">
            <dt>Acknowledged by</dt>
            <dd>{{ text(record.acknowledged_by) }}</dd>
            <dt>Acknowledged at</dt>
            <dd>{{ stamp(record.acknowledged_at) }}</dd>
          </dl>
        </div>

        <!-- ── History ──────────────────────────────────────────────────── -->
        <div class="aud-section">
          <p class="aud-section__label">Record history</p>
          <dl class="aud-grid">
            <dt>Source</dt>
            <dd>{{ sourceLabel }}</dd>
            <dt>Created by</dt>
            <dd>{{ text(record.created_by) }}</dd>
            <dt>Created at</dt>
            <dd>{{ stamp(record.created_at) }}</dd>
            <dt>Last updated</dt>
            <dd>{{ stamp(record.updated_at) }}</dd>
          </dl>
        </div>

        <p v-if="timezone" class="aud-tz">Times shown in {{ timezone }}</p>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right" class="aud-actions">
        <q-btn flat no-caps label="Close" @click="$emit('update:modelValue', false)" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * Read-only audit trail for one attendance record — the flags, who acknowledged
 * it and when, and its creation/update history. Opened from the eye icon in the
 * table's Audit column.
 */
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { getInitials, getAvatarColor } from '@/composables/utils/attendance'

const $q = useQuasar()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  record: { type: Object, default: () => ({}) },
  employeeName: { type: String, default: 'Unknown Employee' },
  photo: { type: String, default: '' },
  // IANA zone for the record's employee, so stamps read in their local time
  // rather than the admin's.
  timezone: { type: String, default: '' },
})

defineEmits(['update:modelValue'])

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
  if (record.acknowledged) {
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
.aud-card {
  width: 100%;
  max-width: 500px;
  border-radius: 14px;
  overflow: hidden;
}

/* ── Header ────────────────────────────────────────────────────────────────── */
.aud-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 18px;
  background: var(--dash-brand, #102335);
}

.aud-head__avatar {
  flex: none;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.aud-head__initials {
  font-size: 13px;
  font-weight: 600;
}

.aud-head__titles {
  min-width: 0;
  flex: 1;
}

.aud-head__name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aud-head__sub {
  margin-top: 1px;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.78);
}

.aud-head :deep(.q-btn) {
  color: rgba(255, 255, 255, 0.8);
  flex: none;
}

.aud-head :deep(.q-btn:hover) {
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
}

/* ── Body ──────────────────────────────────────────────────────────────────── */
.aud-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px;
  max-height: 70vh;
  overflow-y: auto;
}

.aud-section__label {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--dash-ink-4, #98a2b3);
}

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
  color: var(--dash-good, #067647);
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
  background: var(--dash-warn-bg, #fffaeb);
  border-color: var(--dash-warn-line, #fedf89);
  color: var(--dash-warn, #b54708);
}

.aud-note--critical {
  background: var(--dash-critical-bg, #fef3f2);
  border-color: var(--dash-critical-line, #fecdca);
  color: var(--dash-critical, #b42318);
}

/* ── Field grid ────────────────────────────────────────────────────────────── */
.aud-grid {
  display: grid;
  grid-template-columns: minmax(110px, auto) 1fr;
  gap: 0;
  margin: 0;
  border: 1px solid var(--dash-line, #eaecf0);
  border-radius: 9px;
  overflow: hidden;
}

.aud-grid dt,
.aud-grid dd {
  margin: 0;
  padding: 9px 12px;
  font-size: 13px;
  border-bottom: 1px solid var(--dash-line-soft, #f2f4f7);
}

.aud-grid dt {
  background: var(--dash-sunken, #f9fafb);
  color: var(--dash-ink-3, #667085);
  font-weight: 500;
}

.aud-grid dd {
  color: var(--dash-ink, #101828);
  word-break: break-word;
}

/* Last pair carries no divider */
.aud-grid dt:nth-last-of-type(1),
.aud-grid dd:nth-last-of-type(1) {
  border-bottom: none;
}

.aud-tz {
  margin: 0;
  font-size: 11.5px;
  color: var(--dash-ink-4, #98a2b3);
}

.aud-actions {
  padding: 10px 18px;
}

@media (max-width: 599px) {
  .aud-card {
    max-width: 100%;
    border-radius: 0;
  }

  .aud-body {
    max-height: none;
  }

  .aud-grid {
    grid-template-columns: 1fr;
  }

  .aud-grid dt {
    padding-bottom: 2px;
    border-bottom: none;
  }
}
</style>
