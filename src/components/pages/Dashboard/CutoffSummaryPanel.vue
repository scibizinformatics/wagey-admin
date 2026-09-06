<template>
  <DashPanel
    icon="summarize"
    title="Where this cutoff stands"
    :loading="loading"
    skeleton="lines"
    :skeleton-rows="4"
  >
    <ul class="rollup">
      <li v-for="row in rows" :key="row.key" class="rollup__row">
        <span class="rollup__label">{{ row.label }}</span>
        <span class="dash-metric dash-metric--sm rollup__value" :style="{ color: row.color }">
          {{ row.value }}
        </span>
      </li>
    </ul>

    <!-- Every figure above is settled somewhere else — a group is reviewed,
         funded and released in Disbursement, not here — so the panel's one exit
         is the cutoff it has just been counting. It is withheld rather than
         disabled when no cutoff resolves: a button that cannot go anywhere is
         worse than no button. -->
    <template v-if="canOpen" #footer>
      <q-btn
        flat
        dense
        no-caps
        size="12px"
        class="rollup__link"
        icon-right="arrow_forward"
        label="Open this cutoff"
        @click="$emit('openCutoff')"
      />
    </template>
  </DashPanel>
</template>

<script setup>
/**
 * The Current Cutoff tab's roll-up: the four counts that decide whether the
 * cutoff can close.
 *
 * Values that represent work still outstanding take the warning colour, values
 * that represent work cleared take the good colour, and a zero takes neither —
 * so a cutoff with nothing left reads as visually settled.
 */
import { computed } from 'vue'
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'

const props = defineProps({
  data: {
    type: Object,
    default: () => ({
      groups_ready_for_funding: 0,
      groups_under_review: 0,
      employees_needing_acknowledgment: 0,
      salaries_pending_release: 0,
    }),
  },
  loading: { type: Boolean, default: false },
  /**
   * Whether there is a cutoff for the footer link to open. The tab knows; this
   * panel is handed only the counts, so it cannot work it out for itself.
   */
  canOpen: { type: Boolean, default: false },
})

// Named to match `CutoffOverdueBanner`, which sends the reader to the same
// screen for the same reason. One cutoff is overdue and the other is current,
// but "open cutoff" is one action and keeps one name.
defineEmits(['openCutoff'])

const rows = computed(() => {
  const d = props.data ?? {}
  return [
    {
      key: 'ready',
      label: 'Payout groups ready to fund',
      value: d.groups_ready_for_funding ?? 0,
      color: (d.groups_ready_for_funding ?? 0) > 0 ? 'var(--dash-good)' : 'var(--dash-ink-3)',
    },
    {
      key: 'review',
      label: 'Payout groups under review',
      value: d.groups_under_review ?? 0,
      color: (d.groups_under_review ?? 0) > 0 ? 'var(--dash-warn)' : 'var(--dash-ink-3)',
    },
    {
      key: 'ack',
      label: 'Employees yet to acknowledge a payslip',
      value: d.employees_needing_acknowledgment ?? 0,
      color: (d.employees_needing_acknowledgment ?? 0) > 0 ? 'var(--dash-warn)' : 'var(--dash-ink-3)',
    },
    {
      key: 'release',
      label: 'Salaries pending release',
      value: d.salaries_pending_release ?? 0,
      color: (d.salaries_pending_release ?? 0) > 0 ? 'var(--dash-critical)' : 'var(--dash-ink-3)',
    },
  ]
})
</script>

<style scoped>
.rollup {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.rollup__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--dash-line-soft);
}
.rollup__row:last-child {
  border-bottom: none;
}

.rollup__label {
  font-size: 12.5px;
  color: var(--dash-ink-3);
  line-height: 1.45;
  min-width: 0;
}

.rollup__value {
  flex-shrink: 0;
}

.rollup__link {
  color: var(--dash-accent);
  padding: 0 4px;
}
</style>
