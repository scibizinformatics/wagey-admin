<template>
  <q-table
    :rows="rows"
    :columns="columns"
    :loading="loading"
    :pagination="{ rowsPerPage: 0 }"
    row-key="id"
    flat
    dense
    hide-pagination
    hide-no-data
    class="payout-table"
  >
    <template #body-cell-status="props">
      <q-td :props="props">
        <PayoutStatusBadge :status="props.row.status" />
      </q-td>
    </template>
    <template #body-cell-progress="props">
      <q-td :props="props">
        <PayoutProgressStepper :group-id="props.row.id" />
      </q-td>
    </template>
    <template #body-cell-actions="props">
      <q-td :props="props">
        <q-btn-dropdown flat dense no-caps size="11px" label="Actions" class="action-btn">
          <q-list dense>
            <q-item v-ripple clickable @click="$emit('view', props.row)">
              <q-item-section><q-item-label>View</q-item-label></q-item-section>
            </q-item>
            <q-item v-ripple clickable @click="$emit('delete', props.row)">
              <q-item-section><q-item-label>Delete</q-item-label></q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-td>
    </template>
    <template #no-data>
      <div class="empty-state">
        <q-icon name="inbox" size="28px" color="grey-4" />
        <div class="empty-text">No data found</div>
      </div>
    </template>
  </q-table>
</template>

<script setup>
import { computed } from 'vue'
import PayoutStatusBadge from 'src/components/pages/Payroll/PayoutStatusBadge.vue'
import PayoutProgressStepper from 'src/components/pages/Payroll/PayoutProgressStepper.vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  columns: { type: Array, default: null },
})

defineEmits(['view', 'delete'])

const defaultColumns = [
  { name: 'group', label: 'Group', field: 'group', align: 'left', sortable: true },
  { name: 'cutoff', label: 'Cutoff', field: 'cutoff', align: 'left', sortable: true },
  { name: 'method', label: 'Method', field: 'method', align: 'left', sortable: true },
  { name: 'employees', label: 'Employees', field: 'employees', align: 'center', sortable: true },
  {
    name: 'netAmount',
    label: 'Net Amount',
    field: 'netAmount',
    align: 'right',
    sortable: true,
    format: (v) => `\u20B1${(v ?? 0).toLocaleString('en-PH')}`,
  },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'progress', label: 'Progress', field: 'progress', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const columns = computed(() => props.columns ?? defaultColumns)
</script>

<style scoped>
.payout-table {
  width: 100%;
}
.payout-table :deep(.q-table thead th) {
  font-size: 10.5px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 8px 10px;
  background: #f8f9fb;
  border-bottom: 1px solid #e8ecf0;
}
.payout-table :deep(.q-table tbody td) {
  padding: 8px 10px;
  font-size: 12.5px;
  color: #374151;
  border-bottom: 1px solid #f1f3f5;
  vertical-align: middle;
}
.payout-table :deep(.q-table tbody tr:last-child td) {
  border-bottom: none;
}
.payout-table :deep(.q-table tbody tr:hover td) {
  background: #f8fafc;
}
.action-btn :deep(.q-btn__content) {
  font-size: 11px;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 0;
}
.empty-text {
  font-size: 13px;
  color: #9ca3af;
}
</style>
