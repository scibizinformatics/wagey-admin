<template>
  <DashPanel
    icon="apartment"
    title="Coverage by site"
    :subtitle="subtitle"
    :loading="loading"
    :empty="!sites.length"
    empty-icon="apartment"
    empty-title="No site data for this date"
    empty-sub="Pick another date, or check that shifts are scheduled for these sites."
    skeleton="table"
    :skeleton-rows="4"
    scroll
  >
    <DashTable :columns="columns" :rows="rows" :min-width="520">
      <template #cell-name="{ row }">
        <span class="site">{{ row.name }}</span>
      </template>

      <!-- Scheduled vs clocked-in was two numbers side by side, which made the
           reader do the division. The bar does it for them: short bar = a site
           that has not turned up. -->
      <template #cell-coverage="{ row }">
        <span class="dash-bar">
          <span class="dash-bar__track">
            <span
              class="dash-bar__fill"
              :style="{ width: `${row.coverage}%`, background: coverageColor(row.coverage) }"
            />
          </span>
          <span class="dash-bar__label">{{ row.clockedIn }}/{{ row.scheduled }}</span>
        </span>
      </template>

      <template #cell-late="{ row }">
        <span :class="row.late > 0 ? 'flag flag--warn' : 'flag'">{{ row.late }}</span>
      </template>

      <template #cell-noShow="{ row }">
        <span :class="row.noShow > 0 ? 'flag flag--critical' : 'flag'">{{ row.noShow }}</span>
      </template>
    </DashTable>
  </DashPanel>
</template>

<script setup>
/**
 * Attendance coverage per site for the selected date.
 *
 * Renamed from "Workforce Status" — the panel answers "is each site covered?",
 * so the title says so. The scheduled/clocked-in pair is now encoded as a
 * proportion bar; late and no-show counts stay as figures but only take colour
 * when they are non-zero, so a clean site reads as visually quiet.
 */
import { computed } from 'vue'
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'
import DashTable from '@/components/pages/Dashboard/DashTable.vue'

const props = defineProps({
  sites: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const columns = [
  { key: 'name', label: 'Site', flex: 1.4, strong: true },
  { key: 'coverage', label: 'Clocked in', flex: 1.5 },
  { key: 'late', label: 'Late', flex: 0.6, num: true },
  { key: 'noShow', label: 'No show', flex: 0.7, num: true },
]

const rows = computed(() =>
  props.sites.map((s) => {
    const scheduled = Number(s.scheduled ?? 0)
    const clockedIn = Number(s.clockedIn ?? 0)
    return {
      ...s,
      scheduled,
      clockedIn,
      coverage: scheduled > 0 ? Math.min(100, Math.round((clockedIn / scheduled) * 100)) : 0,
    }
  }),
)

const subtitle = computed(() => {
  if (props.loading || !rows.value.length) return ''
  const scheduled = rows.value.reduce((acc, r) => acc + r.scheduled, 0)
  const clockedIn = rows.value.reduce((acc, r) => acc + r.clockedIn, 0)
  if (!scheduled) return `${rows.value.length} sites`
  return `${clockedIn} of ${scheduled} clocked in across ${rows.value.length} sites`
})

// Coverage is a magnitude on a single scale, so it takes a status colour rather
// than a series hue: full attendance reads good, a gap reads as a problem.
function coverageColor(pct) {
  if (pct >= 95) return 'var(--dash-good-mark)'
  if (pct >= 75) return 'var(--dash-warn-mark)'
  return 'var(--dash-critical-mark)'
}
</script>

<style scoped>
.site {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.flag {
  font-variant-numeric: tabular-nums;
  color: var(--dash-ink-3);
}
.flag--warn {
  color: var(--dash-warn);
  font-weight: 600;
}
.flag--critical {
  color: var(--dash-critical);
  font-weight: 700;
}
</style>
