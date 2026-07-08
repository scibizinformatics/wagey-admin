<template>
  <div class="table-section">
    <div class="modern-table-container">
      <q-table
        :rows="rows"
        :columns="columns"
        row-key="department"
        flat
        :loading="loading"
        no-data-label="No department contribution data found"
        hide-pagination
        :rows-per-page-options="[0]"
      >
        <template v-slot:header="props">
          <q-tr class="table-header-row">
            <q-th key="department" :props="props" class="table-header-cell">Department</q-th>
            <q-th key="employee_count" :props="props" class="table-header-cell">Employees</q-th>
            <q-th key="total_contributions_due" :props="props" class="table-header-cell">Total Due</q-th>
            <q-th key="total_deduction" :props="props" class="table-header-cell">Deducted</q-th>
            <q-th key="balance" :props="props" class="table-header-cell">Balance</q-th>
            <q-th key="rate" :props="props" class="table-header-cell">Rate</q-th>
            <q-th key="status" :props="props" class="table-header-cell">Status</q-th>
          </q-tr>
        </template>

        <template v-slot:body="props">
          <q-tr class="table-body-row">
            <q-td key="department" :props="props" class="table-body-cell">
              <span class="department-name">{{ props.row.department }}</span>
            </q-td>
            <q-td key="employee_count" :props="props" class="table-body-cell">
              {{ props.row.employee_count }}
            </q-td>
            <q-td key="total_contributions_due" :props="props" class="table-body-cell">
              {{ formatCurrency(Number(props.row.total_contributions_due)) }}
            </q-td>
            <q-td key="total_deduction" :props="props" class="table-body-cell">
              {{ formatCurrency(Number(props.row.total_deduction)) }}
            </q-td>
            <q-td key="balance" :props="props" class="table-body-cell">
              {{ formatCurrency(Number(props.row.balance)) }}
            </q-td>
            <q-td key="rate" :props="props" class="table-body-cell">
              {{ Number(props.row.rate).toFixed(2) }}%
            </q-td>
            <q-td key="status" :props="props" class="table-body-cell">
              <q-badge
                :color="statusColor(props.row.status)"
                class="status-badge"
                rounded
              >
                {{ props.row.status }}
              </q-badge>
            </q-td>
          </q-tr>
        </template>

        <template v-slot:no-data>
          <div v-if="!loading" class="empty-state">
            <q-icon name="receipt_long" size="48px" class="empty-state-icon" />
            <div class="empty-state-title">No department contribution data found</div>
            <div class="empty-state-sub">Try selecting a different month or year.</div>
          </div>
        </template>
      </q-table>
    </div>
  </div>
</template>

<script setup>
import { formatCurrency } from 'src/composables/utils/format'

defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const columns = [
  { name: 'department', label: 'Department', field: 'department', align: 'left' },
  { name: 'employee_count', label: 'Employees', field: 'employee_count', align: 'left' },
  { name: 'total_contributions_due', label: 'Total Due', field: 'total_contributions_due', align: 'left' },
  { name: 'total_deduction', label: 'Deducted', field: 'total_deduction', align: 'left' },
  { name: 'balance', label: 'Balance', field: 'balance', align: 'left' },
  { name: 'rate', label: 'Rate', field: 'rate', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
]

function statusColor(status) {
  switch (status?.toLowerCase()) {
    case 'complete': return 'green'
    case 'incomplete': return 'orange'
    case 'pending': return 'grey'
    default: return 'grey'
  }
}
</script>

<style scoped>
.table-section { background: #ffffff; }
.modern-table-container { overflow-x: auto; position: relative; }
.department-name { font-weight: 500; color: #0f172a; font-size: 13px; }
.table-header-row { background: #f8fafc; }
.table-header-cell {
  font-size: 11px !important; font-weight: 600 !important; color: #94a3b8 !important;
  text-transform: uppercase; letter-spacing: 0.06em;
  padding: 8px 14px !important; border-bottom: 1px solid #f1f3f5 !important;
}
.table-body-row { transition: background 0.12s ease; }
.table-body-row:hover .table-body-cell { background: #f8fafc; }
.table-body-row:last-child .table-body-cell { border-bottom: none !important; }
.table-body-cell {
  font-size: 13px; color: #334155; padding: 9px 14px !important;
  border-bottom: 1px solid #f1f3f5 !important; vertical-align: middle;
}
.status-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 3px 10px;
  text-transform: capitalize;
}
:deep(.q-table), :deep(.q-table__container), :deep(.q-table__card), :deep(.q-table__bottom-border), :deep(.q-table__top), :deep(.q-table__bottom) {
  border: none !important; border-radius: 0 !important; box-shadow: none !important;
}
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; padding: 60px 20px; text-align: center; }
.empty-state-icon { color: #cbd5e1; margin-bottom: 14px; }
.empty-state-title { font-size: 15px; font-weight: 500; color: #334155; margin-bottom: 6px; }
.empty-state-sub { font-size: 13px; color: #94a3b8; margin-bottom: 16px; }
@media (max-width: 1440px) { .table-body-cell { padding: 8px 12px !important; } }
@media (max-width: 1024px) { .modern-table-container { overflow-x: auto; } .table-header-cell { padding: 7px 10px !important; font-size: 10px !important; } .table-body-cell { padding: 7px 10px !important; font-size: 12px; } }
@media (max-width: 768px) { .table-header-cell { padding: 6px 8px !important; } .table-body-cell { padding: 6px 8px !important; font-size: 11px; } }
@media (max-width: 480px) { .table-header-cell { padding: 6px 8px !important; font-size: 9px !important; } .table-body-cell { padding: 8px 8px !important; font-size: 12px; } }
</style>
