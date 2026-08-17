<template>
  <span class="dash-chip" :class="`cs--${entry.cls}`">
    <span class="dash-chip__dot" :style="{ background: entry.mark }" />
    {{ entry.label }}
  </span>
</template>

<script setup>
/**
 * The status pill for a payout group.
 *
 * Colours are shared with CutoffStageRail so a group's badge in the table and
 * its segment in the rail read as the same thing. Every badge carries its label,
 * so status is never communicated by colour alone.
 */
import { computed } from 'vue'

const STATUS_MAP = {
  needs_attention: {
    label: 'Needs attention',
    cls: 'critical',
    mark: 'var(--dash-critical-mark)',
  },
  under_review: { label: 'Under review', cls: 'warn', mark: 'var(--dash-warn-mark)' },
  awaiting_acknowledgment: {
    label: 'Awaiting ack',
    cls: 'violet',
    mark: 'var(--dash-cat-4)',
  },
  ready_for_funding: { label: 'Ready to fund', cls: 'info', mark: 'var(--dash-cat-1)' },
  funded: { label: 'Funded', cls: 'teal', mark: 'var(--dash-cat-2)' },
  disbursing: { label: 'Disbursing', cls: 'info', mark: 'var(--dash-info-mark)' },
  complete: { label: 'Complete', cls: 'neutral', mark: 'var(--dash-neutral-mark)' },
}

const props = defineProps({
  status: { type: String, required: true },
})

const entry = computed(
  () =>
    STATUS_MAP[props.status] ?? {
      label: props.status,
      cls: 'neutral',
      mark: 'var(--dash-neutral-mark)',
    },
)
</script>

<style scoped>
/* Each badge is a tint plus a 1px ring in its own hue. The ring is what keeps
   the pill legible against both white rows and the tinted hover plate. */
.cs--critical {
  background: var(--dash-critical-bg);
  border-color: var(--dash-critical-line);
  color: var(--dash-critical);
}
.cs--warn {
  background: var(--dash-warn-bg);
  border-color: var(--dash-warn-line);
  color: var(--dash-warn);
}
.cs--info {
  background: var(--dash-info-bg);
  border-color: var(--dash-info-line);
  color: var(--dash-info);
}
.cs--violet {
  background: #f5f3ff;
  border-color: #ddd6fe;
  color: #6941c6;
}
.cs--teal {
  background: #f0fdf9;
  border-color: #a7f3d0;
  color: #0e9384;
}
.cs--neutral {
  background: var(--dash-neutral-bg);
  border-color: var(--dash-neutral-line);
  color: var(--dash-neutral);
}
</style>
