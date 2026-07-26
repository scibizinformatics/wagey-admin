<template>
  <span class="cs-badge" :class="`cs--${statusClass}`">
    <span class="cs-dot" />
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const STATUS_MAP = {
  needs_attention: { label: 'Needs Attention', cls: 'needs-attention' },
  under_review: { label: 'Under Review', cls: 'under-review' },
  awaiting_acknowledgment: { label: 'Awaiting Acknowledgment', cls: 'awaiting-ack' },
  ready_for_funding: { label: 'Ready for Funding', cls: 'ready-funding' },
  funded: { label: 'Funded', cls: 'funded' },
  disbursing: { label: 'Disbursing', cls: 'disbursing' },
  complete: { label: 'Complete', cls: 'complete' },
}

const props = defineProps({
  status: { type: String, required: true },
})

const entry = computed(() => STATUS_MAP[props.status] ?? { label: props.status, cls: 'needs-attention' })
const statusClass = computed(() => entry.value.cls)
const label = computed(() => entry.value.label)
</script>

<style scoped>
.cs-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.cs-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cs--needs-attention { background: #fff7ed; color: #c2410c; }
.cs--needs-attention .cs-dot { background: #f97316; }

.cs--under-review { background: #eff6ff; color: #1d4ed8; }
.cs--under-review .cs-dot { background: #3b82f6; }

.cs--awaiting-ack { background: #f5f3ff; color: #6d28d9; }
.cs--awaiting-ack .cs-dot { background: #8b5cf6; }

.cs--ready-funding { background: #f0fdf4; color: #15803d; }
.cs--ready-funding .cs-dot { background: #22c55e; }

.cs--funded { background: #f0fdfa; color: #0f766e; }
.cs--funded .cs-dot { background: #14b8a6; }

.cs--disbursing { background: #ecfeff; color: #0e7490; }
.cs--disbursing .cs-dot { background: #06b6d4; }

.cs--complete { background: #f9fafb; color: #6b7280; }
.cs--complete .cs-dot { background: #9ca3af; }
</style>
