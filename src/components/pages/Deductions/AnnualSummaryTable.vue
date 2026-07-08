<template>
  <div class="table-section">
    <div class="modern-table-container">
      <q-table
        :rows="rows"
        :columns="columns"
        row-key="month"
        flat
        :loading="loading"
        no-data-label="No annual contribution data found"
        hide-pagination
        :rows-per-page-options="[0]"
      >
        <template v-slot:header="props">
          <q-tr class="table-header-row">
            <q-th key="month" :props="props" class="table-header-cell">Month</q-th>
            <q-th key="employees" :props="props" class="table-header-cell">Employees</q-th>
            <q-th key="total_contributions_due" :props="props" class="table-header-cell">Total Contributions Due</q-th>
            <q-th key="total_contribution_due_employee_share" :props="props" class="table-header-cell">Employee Share (Due)</q-th>
            <q-th key="total_deduction_employee_share" :props="props" class="table-header-cell">Employee Share (Deducted)</q-th>
            <q-th key="undeducted_balance_employee_share" :props="props" class="table-header-cell">Undeducted Balance</q-th>
            <q-th key="no_of_payroll_deduction_cases" :props="props" class="table-header-cell">Deduction Cases</q-th>
          </q-tr>
        </template>

        <template v-slot:body="props">
          <q-tr class="table-body-row">
            <q-td key="month" :props="props" class="table-body-cell">
              <span class="month-label">{{ props.row.month }}</span>
            </q-td>
            <q-td key="employees" :props="props" class="table-body-cell">
              {{ props.row.employees }}
            </q-td>
            <q-td key="total_contributions_due" :props="props" class="table-body-cell">
              {{ formatCurrency(props.row.total_contributions_due) }}
            </q-td>
            <q-td key="total_contribution_due_employee_share" :props="props" class="table-body-cell">
              {{ formatCurrency(props.row.total_contribution_due_employee_share) }}
            </q-td>
            <q-td key="total_deduction_employee_share" :props="props" class="table-body-cell">
              {{ formatCurrency(props.row.total_deduction_employee_share) }}
            </q-td>
            <q-td key="undeducted_balance_employee_share" :props="props" class="table-body-cell">
              {{ formatCurrency(props.row.undeducted_balance_employee_share) }}
            </q-td>
            <q-td key="no_of_payroll_deduction_cases" :props="props" class="table-body-cell">
              {{ props.row.no_of_payroll_deduction_cases }}
            </q-td>
          </q-tr>
        </template>

        <template v-slot:no-data>
          <div v-if="!loading" class="empty-state">
            <q-icon name="receipt_long" size="48px" class="empty-state-icon" />
            <div class="empty-state-title">No annual contribution data found</div>
            <div class="empty-state-sub">Select a different year to view data.</div>
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
  { name: 'month', label: 'Month', field: 'month', align: 'left' },
  { name: 'employees', label: 'Employees', field: 'employees', align: 'left' },
  { name: 'total_contributions_due', label: 'Total Contributions Due', field: 'total_contributions_due', align: 'left' },
  { name: 'total_contribution_due_employee_share', label: 'Employee Share (Due)', field: 'total_contribution_due_employee_share', align: 'left' },
  { name: 'total_deduction_employee_share', label: 'Employee Share (Deducted)', field: 'total_deduction_employee_share', align: 'left' },
  { name: 'undeducted_balance_employee_share', label: 'Undeducted Balance', field: 'undeducted_balance_employee_share', align: 'left' },
  { name: 'no_of_payroll_deduction_cases', label: 'Deduction Cases', field: 'no_of_payroll_deduction_cases', align: 'left' },
]
</script>

<style scoped>
.table-section { background: #ffffff; }
.modern-table-container { overflow-x: auto; position: relative; }
.month-label { font-weight: 500; color: #0f172a; font-size: 13px; }
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
