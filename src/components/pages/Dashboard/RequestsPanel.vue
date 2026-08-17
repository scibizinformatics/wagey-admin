<template>
  <DashPanel
    icon="inbox"
    title="Pending requests"
    :subtitle="subtitle"
    :tone="total ? 'accent' : 'neutral'"
    :loading="loading"
    :empty="!requests.length"
    empty-icon="check"
    empty-tone="good"
    empty-title="No pending requests"
    empty-sub="Leave, overtime and cash advance requests will queue here as they come in."
    skeleton="lines"
    :skeleton-rows="4"
  >
    <ul class="reqs">
      <li v-for="(r, i) in requests" :key="r.type || i" class="req">
        <q-icon :name="r.icon || 'description'" size="15px" class="req__icon" />
        <span class="req__label">{{ r.label || r.type }}</span>
        <span class="dash-metric dash-metric--sm req__count">{{ r.count }}</span>
      </li>
    </ul>
  </DashPanel>
</template>

<script setup>
/**
 * Open request counts by type (leave, overtime, cash advance).
 *
 * A two-column table for two columns of data was more chrome than content, so
 * it is now a plain list. The header carries the total, which is the number an
 * admin actually wants from this panel.
 */
import { computed } from 'vue'
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'

const props = defineProps({
  requests: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const total = computed(() => props.requests.reduce((acc, r) => acc + Number(r.count ?? 0), 0))

const subtitle = computed(() => {
  if (props.loading || !total.value) return ''
  return `${total.value} awaiting review`
})
</script>

<style scoped>
.reqs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.req {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 2px;
  border-bottom: 1px solid var(--dash-line-soft);
}
.req:last-child {
  border-bottom: none;
}

.req__icon {
  color: var(--dash-ink-4);
  flex-shrink: 0;
}

.req__label {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--dash-ink-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.req__count {
  flex-shrink: 0;
}
</style>
