<template>
  <div class="panel">
    <div class="panel-head">
      <div class="panel-head-left">
        <q-icon name="receipt" size="18px" class="panel-icon" />
        <span class="panel-title">Current Payroll Status</span>
      </div>
    </div>
    <div v-if="loading || !rows.length" class="empty-panel-state">
      <div
        class="eps-shimmer"
        v-for="n in 4"
        :key="n"
        :style="{ width: n % 2 === 0 ? '60%' : '80%', animationDelay: `${n * 0.12}s` }"
      />
    </div>
    <q-table
      v-else
      :rows="rows"
      :columns="columns"
      row-key="id"
      flat
      dense
      hide-pagination
      :rows-per-page-options="[0]"
      :loading="loading"
      no-data-label="No payroll data found"
      class="ct-table"
    >
      <template v-slot:header="props">
        <q-tr :props="props" class="ct-thead-row">
          <q-th v-for="col in props.cols" :key="col.name" class="ct-th">{{ col.label }}</q-th>
        </q-tr>
      </template>
      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <span
            :class="[
              'ct-status',
              props.value?.toLowerCase() === 'released' ? 'ct-status--green' : 'ct-status--amber',
            ]"
          >
            {{ props.value }}
          </span>
        </q-td>
      </template>
    </q-table>
  </div>
</template>

<script setup>
defineProps({
  rows: { type: Array, required: true },
  columns: { type: Array, required: true },
  loading: { type: Boolean, default: false },
})
</script>

<style scoped>
.panel {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
  flex-shrink: 0;
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  border-bottom: 1px solid #f1f3f5;
  flex-shrink: 0;
}
.panel-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.panel-icon {
  color: #1a73e8;
}
.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.ct-table {
  background: transparent;
}
.ct-thead-row {
  background: #f8f9fb;
}
.ct-th {
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 10px 16px;
  border-bottom: 1px solid #e8ecf0;
}
.ct-table :deep(td) {
  font-size: 13px;
  color: #374151;
  padding: 11px 16px;
  border-bottom: 1px solid #f1f3f5;
}
.ct-table :deep(tr:last-child td) {
  border-bottom: none;
}
.ct-status {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}
.ct-status--green {
  background: #e8f5e9;
  color: #2e7d32;
}
.ct-status--amber {
  background: #fff8e1;
  color: #f57f17;
}

/* Empty panel state */
@keyframes eps-pulse {
  0%,
  100% {
    opacity: 0.45;
    transform: scaleX(1);
  }
  50% {
    opacity: 0.85;
    transform: scaleX(1.015);
  }
}
.empty-panel-state {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 20px;
  min-height: 100px;
}
.eps-shimmer {
  height: 10px;
  border-radius: 6px;
  background: linear-gradient(90deg, #e8ecf0 0%, #d1d9e0 50%, #e8ecf0 100%);
  background-size: 200% 100%;
  animation: eps-pulse 1.6s ease-in-out infinite;
  transform-origin: left center;
}
</style>
