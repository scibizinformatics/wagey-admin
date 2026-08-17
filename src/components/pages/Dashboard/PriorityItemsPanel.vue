<template>
  <DashPanel
    icon="flag"
    title="Needs action today"
    :subtitle="subtitle"
    :tone="items.length ? 'critical' : 'good'"
    :loading="loading"
    :empty="!items.length"
    empty-icon="check"
    empty-tone="good"
    empty-title="Nothing needs action today"
    empty-sub="Attendance and payroll are clear. Anything that comes up will land here."
    skeleton="table"
    :skeleton-rows="5"
    scroll
  >
    <DashTable :columns="columns" :rows="items" :min-width="560">
      <template #cell-employee="{ row }">
        <span class="emp">
          <q-avatar size="24px" :style="{ background: avatarColor(row.employee) }" class="emp__avatar">
            <span class="emp__initials">{{ initials(row.employee) }}</span>
          </q-avatar>
          <span class="emp__name">{{ row.employee }}</span>
        </span>
      </template>

      <template #cell-actionType="{ row }">
        <!-- These were rendered as buttons that did nothing. They are severity
             labels, so they are labelled as such — a label labels, a button acts. -->
        <span class="dash-chip" :class="impactClass(row.actionType)">
          <span class="dash-chip__dot" />
          {{ row.actionType }}
        </span>
      </template>
    </DashTable>
  </DashPanel>
</template>

<script setup>
/**
 * The Today tab's lead panel: the queue of things blocking payroll right now.
 *
 * Renamed from "Priority Items" to "Needs action today" — the old title named a
 * category, the new one names the job. Its tone flips to `critical` whenever the
 * queue is non-empty, so an admin can tell at a glance from the panel's edge
 * whether the day is clear without reading the rows.
 */
import { computed } from 'vue'
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'
import DashTable from '@/components/pages/Dashboard/DashTable.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const columns = [
  { key: 'employee', label: 'Employee', flex: 1.3, strong: true },
  { key: 'site', label: 'Site', flex: 0.9 },
  { key: 'issue', label: 'Issue', flex: 1.4 },
  { key: 'actionType', label: 'Impact', flex: 1 },
]

const subtitle = computed(() => {
  if (props.loading) return ''
  const n = props.items.length
  return n ? `${n} ${n === 1 ? 'item' : 'items'} to resolve` : ''
})

const IMPACT_TONE = {
  'May Affect Payroll': 'dash-chip--critical',
  'Attendance Incomplete': 'dash-chip--warn',
  'Affects Staffing': 'dash-chip--info',
}

function impactClass(impact) {
  return IMPACT_TONE[impact] ?? ''
}

function initials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// Avatars are identity, not data, so they draw from the categorical ramp by a
// stable hash of the name — the same person keeps the same colour across loads.
const AVATAR_COLORS = [
  'var(--dash-cat-1)',
  'var(--dash-cat-2)',
  'var(--dash-cat-3)',
  'var(--dash-cat-4)',
  'var(--dash-cat-5)',
  'var(--dash-cat-6)',
]

function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
</script>

<style scoped>
.emp {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.emp__avatar {
  flex-shrink: 0;
}

.emp__initials {
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.02em;
}

.emp__name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
