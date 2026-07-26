<template>
  <q-dialog v-model="internalShow" maximized>
    <q-card class="detail-dialog">
      <q-card-section class="dialog-header">
        <div class="header-info" v-if="data">
          <h2 class="employee-name">{{ data.full_name }}</h2>
          <span class="employee-position">{{ data.position }}</span>
        </div>
        <q-btn flat round dense icon="close" class="close-btn" @click="internalShow = false" />
      </q-card-section>

      <q-card-section v-if="loading" class="loading-section">
        <q-spinner color="primary" size="40px" />
      </q-card-section>

      <q-card-section v-else-if="data" class="dialog-body">
        <!-- Summary Cards -->
        <div class="summary-grid">
          <div class="summary-card">
            <span class="summary-label">Days Worked</span>
            <span class="summary-value">{{ data.summary?.days_worked ?? 0 }}</span>
          </div>
          <div class="summary-card">
            <span class="summary-label">Absent Days</span>
            <span class="summary-value">{{ data.summary?.absent_days ?? 0 }}</span>
          </div>
          <div class="summary-card">
            <span class="summary-label">Undertime</span>
            <span class="summary-value">{{ data.summary?.total_undertime || '0h 0m' }}</span>
          </div>
          <div class="summary-card">
            <span class="summary-label">Late</span>
            <span class="summary-value">{{ data.summary?.late ?? 0 }}</span>
          </div>
          <div class="summary-card">
            <span class="summary-label">Overtime</span>
            <span class="summary-value">{{ data.summary?.total_overtime || '0h 0m' }}</span>
          </div>
          <div class="summary-card">
            <span class="summary-label">Leaves</span>
            <span class="summary-value">{{ data.summary?.leaves?.length ?? 0 }}</span>
          </div>
        </div>

        <!-- Issues -->
        <div class="section" v-if="data.issues?.length">
          <h3 class="section-title">Issues</h3>
          <q-table
            :rows="data.issues"
            :columns="issueColumns"
            row-key="index"
            flat
            dense
            hide-pagination
            hide-no-data
            class="detail-table"
          />
        </div>

        <!-- Attendance -->
        <div class="section">
          <h3 class="section-title">Attendance</h3>
          <q-table
            :rows="data.attendance || []"
            :columns="attendanceColumns"
            row-key="index"
            flat
            dense
            :rows-per-page-options="[10, 20, 50]"
            class="detail-table"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  employeeId: { type: [Number, String], default: null },
})

const emit = defineEmits(['update:modelValue'])

const { fetchEmployeePayrollItem } = useDisbursementApi()

const internalShow = ref(false)
const loading = ref(false)
const data = ref(null)

watch(() => props.modelValue, async (val) => {
  internalShow.value = val
  if (val && props.employeeId) {
    loading.value = true
    data.value = null
    try {
      data.value = await fetchEmployeePayrollItem(props.employeeId)
    } catch (err) {
      console.error('[EmployeeDetailDialog] fetch failed:', err)
    } finally {
      loading.value = false
    }
  }
})

watch(internalShow, (val) => {
  emit('update:modelValue', val)
})

const issueColumns = [
  { name: 'type', label: 'Type', field: 'type', align: 'left' },
  { name: 'description', label: 'Description', field: 'description', align: 'left', format: (v) => v || '-' },
  { name: 'date', label: 'Date', field: 'date', align: 'left' },
]

const attendanceColumns = [
  { name: 'date', label: 'Date', field: 'date', align: 'left', sortable: true },
  { name: 'hours_worked', label: 'Hours Worked', field: 'hours_worked', align: 'center' },
  { name: 'undertime', label: 'Undertime', field: 'undertime', align: 'center' },
  { name: 'late', label: 'Late', field: 'late', align: 'center' },
  { name: 'overtime', label: 'Overtime', field: 'overtime', align: 'center' },
  { name: 'work_type', label: 'Work Type', field: 'work_type', align: 'left' },
]
</script>

<style scoped>
.detail-dialog {
  max-width: 900px;
  width: 100%;
  border-radius: 16px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px 12px;
  border-bottom: 1px solid #f1f3f5;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.employee-name {
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.employee-position {
  font-size: 13px;
  color: #6b7280;
}

.close-btn {
  color: #6b7280;
}

.loading-section {
  display: flex;
  justify-content: center;
  padding: 60px;
}

.dialog-body {
  padding: 20px 24px;
  overflow-y: auto;
  max-height: 70vh;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.summary-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-label {
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.summary-value {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px;
}

.detail-table :deep(.q-table thead th) {
  font-size: 10px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 6px 10px;
  background: #f8f9fb;
  border-bottom: 1px solid #e8ecf0;
}

.detail-table :deep(.q-table tbody td) {
  padding: 6px 10px;
  font-size: 12px;
  color: #374151;
  border-bottom: 1px solid #f1f3f5;
}

.detail-table :deep(.q-table tbody tr:last-child td) {
  border-bottom: none;
}
</style>
