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
    :skeleton-rows="ROWS_PER_PAGE"
  >
    <DashTable :columns="columns" :rows="pagedItems" :min-width="560">
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

    <template #footer>
      <DashPager
        class="queue-pager"
        :page="page"
        :rows-per-page="ROWS_PER_PAGE"
        :total="items.length"
        @update:page="page = $event"
      />
    </template>
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
import { computed, ref, watch } from 'vue'
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'
import DashPager from '@/components/pages/Dashboard/DashPager.vue'
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

// The queue routinely runs to dozens of rows — three per employee with an
// incomplete day — which grew the panel far past everything beside it. It is
// paged instead, so the card keeps one height and the subtitle still says how
// much work is really queued.
const ROWS_PER_PAGE = 6
const page = ref(1)

const pagedItems = computed(() => {
  const start = (page.value - 1) * ROWS_PER_PAGE
  return props.items.slice(start, start + ROWS_PER_PAGE)
})

// A refetch or a company switch replaces the queue wholesale, and resolving
// items shortens it — either can strand the reader on a page that no longer
// exists, so clamp back into range whenever the length changes.
watch(
  () => props.items.length,
  (len) => {
    const lastPage = Math.max(1, Math.ceil(len / ROWS_PER_PAGE))
    if (page.value > lastPage) page.value = lastPage
  },
)

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
/* DashTable insets its cells 10px inside the panel body, so the pager takes the
   same inset — otherwise its range read-out and its next/prev buttons sit 10px
   outside the first and last columns they page through. */
.queue-pager {
  padding: 0 10px;
}

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
