<template>
  <q-dialog :model-value="showDetailModal" persistent @update:model-value="$emit('update:show-detail-modal', $event)">
    <q-card class="detail-modal-card">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-avatar size="44px" class="modal-avatar-icon">
            <q-icon name="receipt_long" size="22px" />
          </q-avatar>
          <div>
            <div class="modal-title">Payroll Details</div>
            <div class="modal-subtitle" v-if="record">{{ record.employee }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense class="modal-close-btn" @click="$emit('close')" />
      </q-card-section>

      <q-separator />

      <q-card-section class="modal-content" v-if="record">
        <div class="modal-section-title">Employee information</div>
        <div class="detail-grid-cards">
          <div class="detail-card">
            <div class="detail-card-label">Name</div>
            <div class="detail-card-value">{{ record.employee }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Employee ID</div>
            <div class="detail-card-value">{{ record.employee_id || 'N/A' }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Period</div>
            <div class="detail-card-value">{{ record.period }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Run</div>
            <div class="detail-card-value">#{{ record.run }}</div>
          </div>
        </div>
        <div class="modal-section-title">Pay information</div>
        <div class="detail-grid-cards">
          <div class="detail-card">
            <div class="detail-card-label">Gross Pay</div>
            <div class="detail-card-value amount-green">{{ formatCurrency(record.gross_pay) }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Net Pay</div>
            <div class="detail-card-value amount-blue">{{ formatCurrency(record.net_pay) }}</div>
          </div>
          <div class="detail-card detail-card-full">
            <div class="detail-card-label">Deductions</div>
            <div class="detail-card-value amount-red">{{ formatCurrency(record.gross_pay - record.net_pay) }}</div>
          </div>
        </div>
        <template v-if="breakdownLoading">
          <div class="loading-section">
            <q-spinner color="primary" size="24px" />
            <span>Loading breakdown...</span>
          </div>
        </template>
        <template v-else-if="breakdown">
          <div class="modal-section-title">Work summary</div>
          <div class="detail-grid-cards">
            <div class="detail-card">
              <div class="detail-card-label">Total Days</div>
              <div class="detail-card-value">{{ breakdown.summary?.total_days ?? 0 }}</div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Total Hours</div>
              <div class="detail-card-value">{{ breakdown.summary?.total_hours ?? 0 }}h</div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Overtime Hours</div>
              <div class="detail-card-value amount-amber">{{ breakdown.summary?.total_overtime_hours ?? 0 }}h</div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Undertime Hours</div>
              <div class="detail-card-value amount-red">{{ breakdown.summary?.total_undertime_hours ?? 0 }}h</div>
            </div>
          </div>

          <div class="modal-section-title">Daily records</div>
          <div class="daily-records-table">
            <div class="dr-header">
              <div class="dr-th dr-th-date">Date</div>
              <div class="dr-th dr-th-hours">Hours</div>
              <div class="dr-th dr-th-status">Status</div>
            </div>
            <div
              v-for="(dr, i) in breakdown.daily_records"
              :key="i"
              class="dr-row-wrapper"
            >
              <div
                class="dr-row"
                :class="{
                  'dr-row-holiday': dr.is_holiday,
                  'dr-row-rest': dr.shift_count === 0 && !dr.is_holiday,
                  'dr-row-expanded': expandedDays.has(i),
                }"
                @click="toggleDay(i)"
              >
                <div class="dr-td dr-td-date">
                  <q-icon :name="expandedDays.has(i) ? 'expand_less' : 'expand_more'" size="14px" class="expand-icon" />
                  {{ dr.date }}
                </div>
                <div class="dr-td dr-td-hours">{{ dr.total_hours }}h</div>
                <div class="dr-td dr-td-status">
                  <span v-if="dr.is_holiday" class="holiday-badge">{{ dr.holiday_name }}</span>
                  <span v-else-if="dr.shift_count === 0" class="rest-label">Rest</span>
                  <span v-else class="work-label">Work</span>
                </div>
              </div>
              <div v-if="expandedDays.has(i) && dr.shifts_detail?.length" class="shifts-detail">
                <div v-for="(shift, si) in dr.shifts_detail" :key="si" class="shift-row">
                  <q-icon name="schedule" size="14px" class="shift-icon" />
                  <span class="shift-label">Schedule:</span>
                  <span class="shift-value">{{ shift.schedule_start }} → {{ shift.schedule_end }}</span>
                  <span class="shift-label">Log:</span>
                  <span class="shift-value">{{ shift.time_in }} → {{ shift.time_out }}</span>
                  <span class="shift-label">Hours:</span>
                  <span class="shift-value">{{ shift.hours }}h</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Close" @click="$emit('close')" class="dialog-btn" no-caps />
        <q-btn
          v-if="breakdown"
          flat
          color="secondary"
          label="Download Daily Record"
          icon="calendar_month"
          @click="$emit('download-daily-record')"
          class="dialog-btn"
          no-caps
        />
        <q-btn
          color="primary"
          label="Download Payslip"
          @click="$emit('download-payslip')"
          class="dialog-btn primary-btn"
          no-caps
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { formatCurrency } from 'src/composables/utils/format'

defineProps({
  showDetailModal: { type: Boolean, default: false },
  record: { type: Object, default: null },
  breakdown: { type: Object, default: null },
  breakdownLoading: { type: Boolean, default: false },
})

defineEmits(['update:show-detail-modal', 'close', 'download-payslip', 'download-daily-record'])

const expandedDays = ref(new Set())

const toggleDay = (index) => {
  const next = new Set(expandedDays.value)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  expandedDays.value = next
}
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
.detail-card-full {
  grid-column: 1 / -1;
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
  gap: 10px;
  padding: 20px 0;
  font-size: 13px;
  color: #6b7280;
}

.daily-records-table {
  width: 100%;
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 12px;
  min-width: 320px;
}

.dr-header {
  display: flex;
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dr-th {
  flex: 1;
  padding: 8px 6px;
  text-align: right;
  min-width: 50px;
  white-space: nowrap;
}

.dr-th-date { text-align: left; flex: 1.4; }
.dr-th-hours { flex: 0.6; text-align: center; }
.dr-th-status { flex: 1; }

.dr-row-wrapper {
  display: flex;
  flex-direction: column;
}

.dr-row {
  display: flex;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.1s;
  cursor: pointer;
}

.dr-row:hover { background: #f9fafb; }

.dr-row-holiday {
  background: #fefce8;
}

.dr-row-holiday:hover { background: #fef9c3; }

.dr-row-rest {
  background: #f9fafb;
  color: #9ca3af;
}

.dr-row-rest .dr-td { color: #9ca3af; }

.dr-row-expanded {
  border-left: 3px solid #3b82f6;
  background: #eff6ff;
}

.dr-row-expanded:hover { background: #dbeafe; }

.dr-td {
  flex: 1;
  padding: 7px 6px;
  text-align: right;
  color: #374151;
  white-space: nowrap;
  cursor: default;
}

.dr-td-date {
  text-align: left;
  flex: 1.4;
  display: flex;
  align-items: center;
  gap: 4px;
}

.dr-td-hours { flex: 0.6; text-align: center; }
.dr-td-status { flex: 1; }

.expand-icon {
  color: #9ca3af;
  flex-shrink: 0;
}

.holiday-badge {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  background: #fef3c7;
  color: #92400e;
}

.rest-label {
  font-size: 10px;
  color: #9ca3af;
}

.work-label {
  font-size: 10px;
  color: #16a34a;
}

.shifts-detail {
  padding: 8px 16px;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
}

.shift-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  font-size: 11px;
}

.shift-icon { color: #6b7280; }
.shift-label { color: #9ca3af; }
.shift-value { color: #374151; font-weight: 500; }

@media (max-width: 768px) {
  .detail-grid-cards {
    grid-template-columns: 1fr;
  }
  .detail-card-full {
    grid-column: span 1;
  }
  .daily-records-table { min-width: 280px; }
}
</style>
