<template>
  <q-dialog v-model="internalShow" persistent>
    <q-card class="detail-modal-card">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-avatar size="44px" class="modal-avatar-icon">
            <q-icon name="receipt_long" size="22px" />
          </q-avatar>
          <div>
            <div class="modal-title">Attendance Details</div>
            <div class="modal-subtitle" v-if="data">{{ data.full_name }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense class="modal-close-btn" @click="internalShow = false" />
      </q-card-section>

      <q-separator />

      <q-card-section v-if="loading" class="modal-content loading-section">
        <q-spinner color="primary" size="24px" />
        <span>Loading...</span>
      </q-card-section>

      <q-card-section v-else-if="data" class="modal-content">
        <div class="modal-section-title">Attendance Summary</div>
        <div class="detail-grid-cards">
          <div class="detail-card">
            <div class="detail-card-label">Days Worked</div>
            <div class="detail-card-value">{{ data.summary?.days_worked ?? 0 }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Absent Days</div>
            <div class="detail-card-value amount-red">{{ data.summary?.absent_days ?? 0 }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Undertime</div>
            <div class="detail-card-value amount-amber">{{ data.summary?.total_undertime || '0h 0m' }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Late</div>
            <div class="detail-card-value">{{ data.summary?.late ?? 0 }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Overtime</div>
            <div class="detail-card-value amount-green">{{ data.summary?.total_overtime || '0h 0m' }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Leaves</div>
            <div class="detail-card-value">{{ data.summary?.leaves?.length ?? 0 }}</div>
          </div>
        </div>

        <div class="modal-section-title" v-if="data.issues?.length">Issues</div>
        <div v-if="data.issues?.length" class="modal-table-wrap">
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

        <div class="modal-section-title">Attendance</div>
        <div class="modal-table-wrap">
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

      <q-card-actions align="right">
        <q-btn flat label="Close" @click="internalShow = false" class="dialog-btn" no-caps />
      </q-card-actions>
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
.detail-modal-card {
  width: 560px;
  max-width: 95vw;
  max-height: 90vh;
  border-radius: 14px !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px !important;
  background: #102335;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-avatar-icon {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #ffffff !important;
  border-radius: 10px !important;
  flex-shrink: 0;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}
.modal-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}
.modal-close-btn {
  color: rgba(255, 255, 255, 0.8) !important;
  flex-shrink: 0;
}
.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
}

.modal-content {
  padding: 20px !important;
  overflow-y: auto;
  flex: 1;
}

.modal-section-title {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 16px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f1f3f5;
}
.modal-section-title:first-child {
  margin-top: 0;
}

.detail-grid-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.detail-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px 14px;
  border: 1px solid #f1f3f5;
}
.detail-card-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
.detail-card-value {
  font-size: 13px;
  font-weight: 500;
  color: #111827;
  word-break: break-word;
}

.amount-green { color: #16a34a; }
.amount-blue { color: #2563eb; }
.amount-red { color: #dc2626; }
.amount-amber { color: #d97706; }
.amount-purple { color: #7c3aed; }

.dialog-btn {
  border-radius: 8px !important;
  font-size: 13px;
  text-transform: none;
}
.primary-btn { font-weight: 500; }

.loading-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 0;
  font-size: 13px;
  color: #6b7280;
}

.modal-table-wrap {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 4px;
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

@media (max-width: 768px) {
  .detail-grid-cards {
    grid-template-columns: 1fr;
  }
}
</style>
