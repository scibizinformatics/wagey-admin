<template>
  <q-dialog v-model="internalShow" persistent>
    <q-card class="dash-modal dash-modal--lg">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="receipt_long" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Attendance details</div>
            <div class="dash-modal__sub" v-if="data">{{ data.full_name }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" @click="internalShow = false" />
      </q-card-section>

      <q-card-section v-if="loading" class="dash-modal__body dash-modal__body--row loading-section">
        <q-spinner color="primary" size="24px" />
        <span>Loading...</span>
      </q-card-section>

      <q-card-section v-else-if="data" class="dash-modal__body">
        <div class="dash-modal__section-title">Attendance summary</div>
        <div class="detail-grid-cards">
          <div class="detail-card">
            <div class="detail-card-label">Days worked</div>
            <div class="detail-card-value">{{ data.summary?.days_worked ?? 0 }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Absent days</div>
            <div class="detail-card-value amount-red">{{ data.summary?.absent_days ?? 0 }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Undertime</div>
            <div class="detail-card-value amount-amber">
              {{ data.summary?.total_undertime || '0h 0m' }}
            </div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Late</div>
            <div class="detail-card-value">{{ data.summary?.late ?? 0 }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Overtime</div>
            <div class="detail-card-value amount-green">
              {{ data.summary?.total_overtime || '0h 0m' }}
            </div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Leaves</div>
            <div class="detail-card-value">{{ data.summary?.leaves?.length ?? 0 }}</div>
          </div>
        </div>

        <div class="dash-modal__section-title" v-if="data.issues?.length">Issues</div>
        <div v-if="data.issues?.length" class="modal-table-wrap">
          <q-table
            :rows="data.issues"
            :columns="issueColumns"
            row-key="index"
            flat
            dense
            hide-pagination
            hide-no-data
            class="dash-qtable dash-qtable--compact detail-table"
          />
        </div>

        <div class="dash-modal__section-title">Attendance</div>
        <div class="modal-table-wrap">
          <q-table
            :rows="data.attendance || []"
            :columns="attendanceColumns"
            row-key="index"
            flat
            dense
            :rows-per-page-options="[10, 20, 50]"
            class="dash-qtable dash-qtable--compact detail-table"
          />
        </div>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn
          flat
          label="Close"
          @click="internalShow = false"
          class="dash-modal__cancel"
          no-caps
        />
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

watch(
  () => props.modelValue,
  async (val) => {
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
  },
)

watch(internalShow, (val) => {
  emit('update:modelValue', val)
})

const issueColumns = [
  { name: 'type', label: 'Type', field: 'type', align: 'left' },
  {
    name: 'description',
    label: 'Description',
    field: 'description',
    align: 'left',
    format: (v) => v || '-',
  },
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
/* The card, header, body, section headings and button are the shared
   `dash-modal` chrome. What is left is this dialog's fact grid and the two
   tables it wraps. Everything reads from `--dash-*`; the block this replaces
   carried eighteen literal hex values and 11px uppercase labels at 0.06em
   tracking, the one convention the design system singles out as dated. */

.loading-section {
  gap: 10px;
  padding: 40px 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

/* ── Summary tiles ── */
.detail-grid-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.detail-card {
  padding: 10px 13px;
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  min-width: 0;
}

.detail-card-label {
  margin-bottom: 3px;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  color: var(--dash-ink-3);
}

.detail-card-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--dash-ink);
  font-variant-numeric: tabular-nums;
  word-break: break-word;
}

/* Status tones, and only where the figure means something is off — a count of
   days worked is not "good news" and does not get painted green. */
.amount-green {
  color: var(--dash-good);
}
.amount-red {
  color: var(--dash-critical);
}
.amount-amber {
  color: var(--dash-warn);
}

/* Header strip, row rhythm and dividers come from `dash-qtable--compact`, the
   in-dialog density. This wrapper only supplies the edge around it. */
.modal-table-wrap {
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  overflow: hidden;
  margin-bottom: 4px;
}

@media (max-width: 1023px) {
  .detail-grid-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .detail-grid-cards {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
