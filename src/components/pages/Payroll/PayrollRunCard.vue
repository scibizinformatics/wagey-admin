<template>
  <div
    class="run-card-header"
    :class="{ expanded: isExpanded }"
    @click="$emit('toggle-expand')"
    style="cursor: pointer; user-select: none"
  >
    <div class="run-header-stats-row">
      <div class="run-header-name-group">
        <q-icon
          name="expand_more"
          :style="{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }"
          size="18px"
          class="expand-icon"
        />
        <div class="run-name-stack">
          <div class="run-name">
            {{ baseName }}
            <q-badge v-if="run.__optimistic" color="orange" label="syncing..." class="q-ml-xs" style="font-size: 10px">
              <q-tooltip>Waiting for server confirmation</q-tooltip>
            </q-badge>
          </div>
          <div class="run-period-tag" v-if="period">{{ period }}</div>
        </div>
      </div>

      <div class="run-header-stat-cols">
        <div class="run-header-stat-col">
          <span class="run-header-stat-label">Employees</span>
          <span class="run-header-stat-val">{{ run.number_of_employee ?? '\u2014' }}</span>
        </div>
        <div class="run-header-stat-col">
          <span class="run-header-stat-label">Calculated</span>
          <span class="run-header-stat-val">{{ formatCurrency(run.calculated_amount) }}</span>
        </div>
        <div class="run-header-stat-col">
          <span class="run-header-stat-label">Total Net Pay</span>
          <span class="run-header-stat-val">{{ formatCurrency(run.total_net_pay) }}</span>
        </div>
        <div class="run-header-stat-col">
          <span class="run-header-stat-label">Funded</span>
          <span class="run-header-stat-val">{{ formatCurrency(run.funded ?? 0) }}</span>
        </div>
        <div class="run-header-stat-col">
          <span class="run-header-stat-label">Released</span>
          <span class="run-header-stat-val">{{ formatCurrency(run.released ?? 0) }}</span>
        </div>
        <div class="run-header-stat-col">
          <span class="run-header-stat-label">Status</span>
          <span class="run-header-stat-val">
            <span :class="['run-status-chip', `run-status-${run.status}`]">{{ stageLabel }}</span>
          </span>
        </div>
      </div>

      <div class="run-header-action" @click.stop>
        <q-btn
          v-if="actionType === 'disburse'"
          unelevated no-caps size="sm" icon="payments" color="teal" label="Disburse"
          class="run-action-btn" :loading="actionLoading" @click="$emit('disburse')"
        />
        <q-btn
          v-else-if="actionType === 'release'"
          unelevated no-caps size="sm" icon="send" color="orange" label="Release"
          class="run-action-btn" :loading="actionLoading" @click="$emit('release')"
        />
        <div v-else-if="actionType === 'awaiting'" class="run-await-chip">
          <q-icon name="hourglass_top" size="13px" />
          <span>Awaiting Acknowledgement</span>
        </div>
        <div v-else-if="actionType === 'completed'" class="run-done-chip">
          <q-icon name="task_alt" size="18px" color="positive" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  run: { type: Object, required: true },
  isExpanded: { type: Boolean, default: false },
  actionType: { type: String, default: null },
  actionLoading: { type: Boolean, default: false },
})

defineEmits(['toggle-expand', 'disburse', 'release'])

const baseName = (() => {
  if (!props.run?.name) return '\u2014'
  return props.run.name.replace(/\s*\|?\s*\d{4}-\d{2}-\d{2}\s*-\s*\d{4}-\d{2}-\d{2}\s*$/, '').trim()
})()

const period = (() => {
  if (props.run?.period) return props.run.period
  if (!props.run?.name) return ''
  const match = props.run.name.match(/(\d{4}-\d{2}-\d{2}\s*-\s*\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : ''
})()

const stageLabel = (() => {
  const labels = {
    pending: 'Pending', draft: 'Draft', pending_review: 'Pending Review',
    ready_for_payment: 'Ready for Payment', disbursed: 'Disbursed',
    completed: 'Completed', closed: 'Completed',
  }
  return labels[props.run?.status] || props.run?.status
})()

const formatCurrency = (val) => {
  const n = Number(val ?? 0)
  return '\u20B1' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.run-card-header {
  display: block;
  width: 100%;
  background: #eef3fb;
  border-bottom: 1px solid #d8e4f0;
  transition: all 0.2s ease;
}

.run-card-header:hover {
  background: #e6eef8;
}

.run-card-header.expanded {
  background: #deeaf8;
  border-bottom-color: #bfdbfe;
}

.run-header-stats-row {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  gap: 16px;
  flex-wrap: nowrap;
  width: 100%;
  box-sizing: border-box;
}

.run-header-name-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
}

.run-name-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  overflow: hidden;
}

.run-header-stat-cols {
  display: flex;
  align-items: center;
  gap: 0;
  flex: 0 0 auto;
}

.run-header-stat-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  padding: 0 12px;
  border-right: 1px solid #d1dce8;
}

.run-header-stat-col:first-child {
  padding-left: 0;
}

.run-header-stat-col:last-of-type {
  border-right: none;
}

.run-header-stat-label {
  font-size: 10px;
  font-weight: 600;
  color: #8a9ab5;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.run-header-stat-val {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
}

.run-header-action {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  padding-left: 16px;
  border-left: 1px solid #d1dce8;
}

.run-action-btn {
  border-radius: 8px !important;
  font-weight: 600;
  padding: 0 18px !important;
  height: 38px;
}

.run-await-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: #92400e;
}

.run-done-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 50%;
}

.run-period-tag {
  font-size: 11px;
  font-weight: 400;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.run-status-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.run-status-pending,
.run-status-draft {
  background: #fff7ed;
  color: #c2410c;
}

.run-status-pending_review {
  background: #fef3c7;
  color: #92400e;
}

.run-status-ready_for_payment {
  background: #ecfdf5;
  color: #065f46;
}

.run-status-disbursed,
.run-status-completed,
.run-status-closed {
  background: #f0fdf4;
  color: #166534;
}

.expand-icon {
  flex-shrink: 0;
  color: #6b7280;
  transition: transform 0.3s ease;
}

.run-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Responsive overrides */
@media (min-width: 1440px) {
  .run-header-stats-row { padding: 16px 24px; }
  .run-header-stat-col { padding: 0 16px; }
  .run-header-stat-label { font-size: 11px; }
  .run-header-stat-val { font-size: 15px; }
}

@media (max-width: 1024px) {
  .run-header-stat-cols { gap: 0; }
  .run-header-stat-col { padding: 0 10px; }
  .run-header-stat-label { font-size: 9px; }
  .run-header-stat-val { font-size: 13px; }
  .run-header-stat-col:nth-child(4),
  .run-header-stat-col:nth-child(5) { display: none; }
  .run-header-stats-row { padding: 12px 16px; gap: 12px; }
}

@media (max-width: 768px) {
  .run-header-stats-row { flex-wrap: wrap; padding: 12px 14px; gap: 10px; }
  .run-header-name-group { flex: 1 1 100%; min-width: 0; }
  .run-header-stat-cols { flex: 1 1 auto; overflow-x: auto; padding-bottom: 2px; }
  .run-header-stat-col:nth-child(4),
  .run-header-stat-col:nth-child(5) { display: flex; }
  .run-header-stat-col { padding: 0 8px; }
  .run-header-action { flex: 0 0 auto; padding-left: 10px; }
  .run-action-btn { height: 32px; padding: 0 12px !important; font-size: 12px; }
  .run-await-chip, .run-done-chip { padding: 4px 6px; }
}

@media (max-width: 480px) {
  .run-header-stats-row { flex-direction: column; align-items: flex-start; padding: 10px 12px; gap: 8px; }
  .run-header-name-group { width: 100%; }
  .run-header-stat-cols { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .run-header-action { width: 100%; border-left: none; border-top: 1px solid #d1dce8; padding-left: 0; padding-top: 8px; justify-content: flex-end; }
}
</style>
