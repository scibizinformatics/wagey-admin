<template>
  <DashPanel
    icon="pending_actions"
    title="Open items"
    :tone="tone"
    :loading="loading"
    :empty="!rows.length"
    empty-icon="check"
    empty-tone="good"
    empty-title="All clear"
    empty-sub="No attendance, overtime or staffing items are waiting on you."
    skeleton="tiles"
    :skeleton-rows="3"
  >
    <ul class="items">
      <li v-for="row in rows" :key="row.key" class="item">
        <span class="item__mark" :style="{ background: row.mark }" />
        <span class="item__label">{{ row.label }}</span>
        <span class="dash-metric dash-metric--sm item__count">{{ row.count }}</span>
      </li>
    </ul>
  </DashPanel>
</template>

<script setup>
/**
 * The Today tab's counter panel — how much is open, by kind.
 *
 * Was a set of label/value rows separated by hairlines. Each kind now carries a
 * colour mark keyed to its severity, so the panel is scannable as a stack of
 * signals rather than read line by line, and the panel's own tone escalates to
 * `warn` as soon as anything is open.
 */
import { computed } from 'vue'
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'

const props = defineProps({
  attentionSummary: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
})

// Known keys get a human label and a severity mark. Anything the backend adds
// later still renders, falling back to a de-slugged label and a neutral mark.
const KNOWN = {
  attendance_issues: { label: 'Attendance issues', mark: 'var(--dash-critical-mark)' },
  pending_ot_approvals: { label: 'Overtime awaiting approval', mark: 'var(--dash-warn-mark)' },
  staffing_gaps: { label: 'Staffing gaps', mark: 'var(--dash-info-mark)' },
}

const rows = computed(() =>
  Object.entries(props.attentionSummary ?? {})
    .filter(([, value]) => Number(value) > 0)
    .map(([key, value]) => ({
      key,
      count: value,
      label: KNOWN[key]?.label ?? deslug(key),
      mark: KNOWN[key]?.mark ?? 'var(--dash-neutral-mark)',
    })),
)

const tone = computed(() => (rows.value.length ? 'warn' : 'good'))

function deslug(key) {
  const words = key.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
</script>

<style scoped>
.items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
}

.item__mark {
  width: 4px;
  align-self: stretch;
  min-height: 22px;
  border-radius: var(--dash-r-pill);
  flex-shrink: 0;
}

.item__label {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--dash-ink-2);
  line-height: 1.4;
}

.item__count {
  flex-shrink: 0;
}
</style>
