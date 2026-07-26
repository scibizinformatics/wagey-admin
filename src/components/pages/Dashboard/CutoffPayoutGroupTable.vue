<template>
  <div class="payout-table-wrap">
    <div v-if="loading" class="skeleton-body">
      <div class="eps-shimmer" v-for="n in 6" :key="n" :style="{ width: n % 2 === 0 ? '70%' : '85%', animationDelay: `${n * 0.12}s` }" />
    </div>
    <template v-else>
      <q-table
        :rows="rows"
        :columns="columns"
        row-key="id"
        flat
        dense
        :pagination="pagination"
        :rows-per-page-options="[5, 10, 15]"
        class="payout-table"
        hide-no-data
        @request="onRequest"
      >
        <template v-slot:body-cell-payout_group="props">
          <q-td class="cell-group">
            <div class="group-name-row">
              <q-icon :name="groupIcon(props.row)" size="16px" class="group-icon" />
              <div class="group-info">
                <div class="group-name">{{ props.row.payout_group }}</div>
                <div class="group-range">{{ props.row.date_range }}</div>
              </div>
            </div>
            <div v-if="props.row.notes?.length" class="group-notes">
              <span v-for="(note, ni) in props.row.notes" :key="ni" class="note-chip">
                {{ note }}
              </span>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-disbursement_type="props">
          <q-td>
            <div class="disburse-type">
              <q-icon :name="channelIcon(props.row.disbursement_type)" size="14px" class="channel-icon" />
              <span>{{ props.row.disbursement_type }}</span>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-reviewed="props">
          <q-td style="white-space: nowrap">
            <span :class="['frac', props.row.reviewed >= props.row.employees ? 'frac-done' : 'frac-pending']">
              {{ props.row.reviewed }}/{{ props.row.employees }}
            </span>
          </q-td>
        </template>

        <template v-slot:body-cell-acknowledged="props">
          <q-td style="white-space: nowrap">
            <span :class="['frac', props.row.acknowledged >= props.row.employees ? 'frac-done' : 'frac-pending']">
              {{ props.row.acknowledged }}/{{ props.row.employees }}
            </span>
          </q-td>
        </template>

        <template v-slot:body-cell-payroll_amount="props">
          <q-td style="white-space: nowrap">{{ fmtAmount(props.row.payroll_amount) }}</q-td>
        </template>

        <template v-slot:body-cell-status="props">
          <q-td>
            <CutoffStatusBadge :status="props.row.status" />
          </q-td>
        </template>

        <template v-slot:no-data>
          <div class="empty-state">
            <q-icon name="inbox" size="32px" color="grey-4" />
            <div class="empty-text">No payout groups found</div>
          </div>
        </template>
      </q-table>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import CutoffStatusBadge from '@/components/pages/Dashboard/CutoffStatusBadge.vue'

defineEmits(['action', 'update:pagination'])

const props = defineProps({
  groups: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  fmtCurrency: { type: Function, default: (v) => `₱${Number(v || 0).toLocaleString('en-PH')}` },
  hideCompleted: { type: Boolean, default: false },
})

function fmtAmount(v) {
  return props.fmtCurrency(Number(v))
}

function groupIcon(row) {
  const map = { Cash: 'payments', Bank: 'account_balance', GCash: 'smartphone' }
  return map[row.disbursement_type] ?? 'payments'
}

function channelIcon(ch) {
  const map = { Cash: 'payments', Bank: 'account_balance', GCash: 'smartphone' }
  return map[ch] ?? 'payments'
}

const columns = [
  { name: 'payout_group', label: 'Payout Group', field: 'payout_group', align: 'center', sortable: true, classes: 'col-payout-group' },
  { name: 'disbursement_type', label: 'Disbursement Type', field: 'disbursement_type', align: 'center', sortable: true, classes: 'col-disbursement' },
  { name: 'employees', label: 'Employees', field: 'employees', align: 'center', sortable: true, classes: 'col-employees' },
  { name: 'reviewed', label: 'Reviewed', field: 'reviewed', align: 'center', sortable: true, classes: 'col-reviewed' },
  { name: 'acknowledged', label: 'Acknowledged', field: 'acknowledged', align: 'center', sortable: true, classes: 'col-acknowledged' },
  { name: 'payroll_amount', label: 'Payroll Amount', field: 'payroll_amount', align: 'center', sortable: true, classes: 'col-payroll-amount' },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true, classes: 'col-status' },
]

const filteredRows = computed(() => {
  if (!props.hideCompleted) return props.groups
  return props.groups.filter((g) => g.status !== 'complete')
})

const filteredCount = computed(() => filteredRows.value.length)

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  sortBy: null,
  descending: false,
  rowsNumber: 0,
})

watch(() => props.groups, () => {
  pagination.value.page = 1
  pagination.value.rowsNumber = filteredCount.value
}, { immediate: true })

watch(filteredCount, (val) => {
  pagination.value.rowsNumber = val
})

const rows = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.rowsPerPage
  const end = start + pagination.value.rowsPerPage
  return filteredRows.value.slice(start, end)
})

function onRequest(pp) {
  pagination.value = { ...pagination.value, ...pp.pagination }
}
</script>

<style scoped>
.payout-table-wrap {
  display: flex;
  flex-direction: column;
}

.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 200px;
  padding: 16px;
}

@keyframes eps-pulse {
  0%, 100% { opacity: 0.45; transform: scaleX(1); }
  50% { opacity: 0.85; transform: scaleX(1.015); }
}

.eps-shimmer {
  height: 10px;
  border-radius: 6px;
  background: linear-gradient(90deg, #e8ecf0 0%, #d1d9e0 50%, #e8ecf0 100%);
  background-size: 200% 100%;
  animation: eps-pulse 1.6s ease-in-out infinite;
  transform-origin: left center;
}

.payout-table :deep(.q-table) {
  border-collapse: separate;
  border-spacing: 0;
}

.payout-table :deep(.q-table thead th) {
  font-size: 10.5px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 8px 8px;
  background: #f8f9fb;
  border-bottom: 1px solid #e8ecf0;
}

.payout-table :deep(.q-table tbody td) {
  padding: 8px 8px;
  font-size: 12.5px;
  color: #374151;
  border-bottom: 1px solid #f1f3f5;
}

.payout-table :deep(.q-table tbody tr:last-child td) {
  border-bottom: none;
}

.payout-table :deep(.q-table tbody tr:hover td) {
  background: #f8fafc;
}

.payout-table :deep(.col-payout-group) {
  min-width: 180px;
}
.payout-table :deep(.col-disbursement) {
  min-width: 100px;
}
.payout-table :deep(.col-payroll-amount) {
  min-width: 120px;
}
.payout-table :deep(.col-employees) {
  min-width: 80px;
}
.payout-table :deep(.col-reviewed) {
  min-width: 80px;
}
.payout-table :deep(.col-acknowledged) {
  min-width: 80px;
}
.payout-table :deep(.col-status) {
  min-width: 100px;
}

.group-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-icon {
  color: #6b7280;
  flex-shrink: 0;
}

.group-info {
  min-width: 0;
}

.group-name {
  font-weight: 600;
  color: #111827;
  font-size: 12.5px;
}

.group-range {
  font-size: 11px;
  color: #9ca3af;
}

.group-notes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-top: 5px;
}

.note-chip {
  font-size: 10px;
  color: #b45309;
  background: #fffbeb;
  padding: 1px 7px;
  border-radius: 4px;
  white-space: nowrap;
}

.disburse-type {
  display: flex;
  align-items: center;
  gap: 6px;
}

.channel-icon {
  color: #6b7280;
}

.font-mono {
  font-variant-numeric: tabular-nums;
}

.frac {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.frac-done { color: #16a34a; }
.frac-pending { color: #d97706; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
}

.empty-text {
  font-size: 13px;
  color: #9ca3af;
}
</style>
