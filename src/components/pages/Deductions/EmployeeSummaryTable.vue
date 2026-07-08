<template>
  <div class="table-section">
    <div class="modern-table-container">
      <q-table
        :rows="rows"
        :columns="columns"
        row-key="employee_id"
        flat
        :loading="loading"
        no-data-label="No employee contribution data found"
        hide-pagination
        :rows-per-page-options="[0]"
        @request="onRequest"
      >
        <template v-slot:header="props">
          <q-tr class="table-header-row">
            <q-th auto-width class="table-header-cell" />
            <q-th key="employee_name" :props="props" class="table-header-cell">Employee</q-th>
            <q-th key="total_contributions_due" :props="props" class="table-header-cell">Total Contributions Due</q-th>
            <q-th key="total_contribution_due_employee_share" :props="props" class="table-header-cell">Employee Share (Due)</q-th>
            <q-th key="total_deduction_employee_share" :props="props" class="table-header-cell">Employee Share (Deducted)</q-th>
            <q-th key="undeducted_balance_employee_share" :props="props" class="table-header-cell">Undeducted Balance</q-th>
            <q-th key="no_of_payroll_deduction_cases" :props="props" class="table-header-cell">Deduction Cases</q-th>
          </q-tr>
        </template>

        <template v-slot:body="props">
          <q-tr class="table-body-row">
            <q-td auto-width class="table-body-cell">
              <q-btn
                flat
                dense
                round
                :icon="expandedIndex === props.rowIndex ? 'expand_less' : 'expand_more'"
                @click="toggleExpand(props.rowIndex)"
                size="sm"
              />
            </q-td>
            <q-td key="employee_name" :props="props" class="table-body-cell">
              <span class="employee-name">{{ props.row.employee_name }}</span>
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

          <q-tr v-show="expandedIndex === props.rowIndex" class="table-expanded-row">
            <q-td colspan="100%" class="table-expanded-cell" :class="{ 'expanded-panel-enter': expandedIndex === props.rowIndex }">
              <div class="contributions-detail">
                <div class="detail-header">
                  <q-icon name="receipt_long" size="18px" class="detail-header-icon" />
                  <span>Contribution Breakdown</span>
                </div>

                <div v-if="getDetailRows(props.row).length > 0" class="detail-table-wrapper">
                  <div class="detail-table-header">
                    <span class="detail-col-name">Contribution Name</span>
                    <span class="detail-col-amount">Due (Employee)</span>
                    <span class="detail-col-amount">Deducted (Employee)</span>
                    <span class="detail-col-amount">Undeducted</span>
                  </div>
                  <div v-for="(item, idx) in getDetailRows(props.row)" :key="idx" class="detail-table-row">
                    <span class="detail-col-name">{{ item.contribution_name || item.name || '-' }}</span>
                    <span class="detail-col-amount">{{ formatCurrency(item.employee_share_due || 0) }}</span>
                    <span class="detail-col-amount">{{ formatCurrency(item.employee_share_deducted || 0) }}</span>
                    <span class="detail-col-amount">{{ formatCurrency(item.undeducted_balance || 0) }}</span>
                  </div>
                </div>
                <div v-else class="detail-empty">
                  <q-icon name="info_outline" size="16px" class="detail-empty-icon" />
                  <span>No breakdown data available</span>
                </div>
              </div>
            </q-td>
          </q-tr>
        </template>

        <template v-slot:no-data>
          <div v-if="!loading" class="empty-state">
            <q-icon name="receipt_long" size="48px" class="empty-state-icon" />
            <div class="empty-state-title">No employee contribution data found</div>
            <div class="empty-state-sub">Try selecting a different month or year.</div>
          </div>
        </template>
      </q-table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { formatCurrency } from 'src/composables/utils/format'

defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['request'])

const columns = [
  { name: 'employee_name', label: 'Employee', field: 'employee_name', align: 'left' },
  { name: 'total_contributions_due', label: 'Total Contributions Due', field: 'total_contributions_due', align: 'left' },
  { name: 'total_contribution_due_employee_share', label: 'Employee Share (Due)', field: 'total_contribution_due_employee_share', align: 'left' },
  { name: 'total_deduction_employee_share', label: 'Employee Share (Deducted)', field: 'total_deduction_employee_share', align: 'left' },
  { name: 'undeducted_balance_employee_share', label: 'Undeducted Balance', field: 'undeducted_balance_employee_share', align: 'left' },
  { name: 'no_of_payroll_deduction_cases', label: 'Deduction Cases', field: 'no_of_payroll_deduction_cases', align: 'left' },
]

const expandedIndex = ref(null)

function toggleExpand(index) {
  expandedIndex.value = expandedIndex.value === index ? null : index
}

function getDetailRows(row) {
  return row.breakdown_data || row.details || row.contributions || []
}

function onRequest(req) {
  emit('request', req)
}
</script>

<style scoped>
.table-section { background: #ffffff; }
.modern-table-container { overflow-x: auto; position: relative; }
.employee-name { font-weight: 500; color: #0f172a; font-size: 13px; }
.table-header-row { background: #f8fafc; }
.table-header-cell {
  font-size: 11px !important; font-weight: 600 !important; color: #94a3b8 !important;
  text-transform: uppercase; letter-spacing: 0.06em;
  padding: 8px 14px !important; border-bottom: 1px solid #f1f3f5 !important;
}
.table-body-row { transition: background 0.12s ease; }
.table-body-row:hover .table-body-cell { background: #f8fafc; }
.table-body-row:last-child .table-body-cell { border-bottom: 1px solid #f1f3f5 !important; }
.table-body-cell {
  font-size: 13px; color: #334155; padding: 9px 14px !important;
  border-bottom: 1px solid #f1f3f5 !important; vertical-align: middle;
}
.table-expanded-row .table-expanded-cell {
  background: #f8fafc; padding: 12px 16px !important; border-bottom: 1px solid #e2e8f0 !important;
}
.expanded-panel-enter { animation: fadeSlideIn 0.2s ease; }
@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
.contributions-detail { max-width: 700px; }
.detail-header { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
.detail-header-icon { color: #6366f1; }
.detail-table-wrapper { width: 100%; }
.detail-table-header { display: grid; grid-template-columns: 1.8fr 1fr 1fr 1fr; gap: 12px; padding: 8px 10px; background: #f1f3f5; border-radius: 6px; margin-bottom: 4px; }
.detail-col-name { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; }
.detail-col-amount { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; text-align: right; }
.detail-table-row { display: grid; grid-template-columns: 1.8fr 1fr 1fr 1fr; gap: 12px; padding: 7px 10px; border-bottom: 1px solid #f1f3f5; font-size: 13px; color: #334155; }
.detail-table-row:last-child { border-bottom: none; }
.detail-table-row .detail-col-amount { text-align: right; }
.detail-empty { display: flex; align-items: center; gap: 8px; padding: 12px 10px; color: #94a3b8; font-size: 13px; }
.detail-empty-icon { color: #cbd5e1; }
:deep(.q-table), :deep(.q-table__container), :deep(.q-table__card), :deep(.q-table__bottom-border), :deep(.q-table__top), :deep(.q-table__bottom) {
  border: none !important; border-radius: 0 !important; box-shadow: none !important;
}
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; padding: 60px 20px; text-align: center; }
.empty-state-icon { color: #cbd5e1; margin-bottom: 14px; }
.empty-state-title { font-size: 15px; font-weight: 500; color: #334155; margin-bottom: 6px; }
.empty-state-sub { font-size: 13px; color: #94a3b8; margin-bottom: 16px; }
@media (max-width: 1440px) { .table-body-cell { padding: 8px 12px !important; } }
@media (max-width: 1024px) { .modern-table-container { overflow-x: auto; } .table-header-cell { padding: 7px 10px !important; font-size: 10px !important; } .table-body-cell { padding: 7px 10px !important; font-size: 12px; } }
@media (max-width: 768px) { .table-header-cell { padding: 6px 8px !important; } .table-body-cell { padding: 6px 8px !important; font-size: 11px; } .detail-table-header, .detail-table-row { grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 6px; font-size: 11px; } }
@media (max-width: 480px) { .table-header-cell { padding: 6px 8px !important; font-size: 9px !important; } .table-body-cell { padding: 8px 8px !important; font-size: 12px; } }
</style>
