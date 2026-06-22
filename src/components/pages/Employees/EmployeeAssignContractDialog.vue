<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="modal-card" style="width: 520px; max-width: 95vw">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add">
            <q-icon name="assignment" size="22px" />
          </q-avatar>
          <div>
            <div class="modal-title">{{ isRenewing ? 'Renew Contract' : 'Assign Contract' }}</div>
            <div class="modal-subtitle">{{ isRenewing ? 'Update the existing employment contract' : 'Fill in the employment contract details' }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense class="modal-close-btn" @click="$emit('update:modelValue', false)" />
      </q-card-section>

      <q-card-section class="modal-content">
        <div class="form-section">
          <div class="section-title">Contract Details</div>
          <div class="form-grid">
            <!-- Contract Type -->
            <q-select v-if="!isRenewing"
              :model-value="form.contract_type_id"
              @update:model-value="$emit('contractTypeChange', $event)"
              :options="contractTypeOptions"
              option-label="name"
              option-value="id"
              emit-value
              map-options
              label="Contract Type"
              outlined
              dense
              class="col-span-2"
            />

            <!-- Row 2: Pay Type -->
            <q-input
              v-if="selectedContractType?.pay_type"
              :model-value="payTypeLabel"
              label="Pay Type"
              outlined
              dense
              readonly
              class="col-span-2"
            />

            <!-- Row 3: Payment Method | Work Hours Per Week -->
            <q-select
              :model-value="form.payment_method"
              @update:model-value="$emit('update:field', { field: 'payment_method', value: $event })"
              :options="paymentMethodOptions"
              label="Payment Method *"
              outlined
              dense
              emit-value
              map-options
              :class="{ 'col-span-2': !selectedContractType?.pay_type }"
            />

            <q-input
              v-if="selectedContractType?.pay_type"
              :model-value="form.work_hours_per_week"
              @update:model-value="$emit('update:field', { field: 'work_hours_per_week', value: $event })"
              label="Work Hours Per Week"
              type="number"
              outlined
              dense
              :hint="'Min 8, max 48 hours per week'"
              :rules="[(val) => !val || (val >= 8 && val <= 48) || 'Must be between 8 and 48 hours']"
            />

            <!-- Row 3: Rate -->
            <div class="col-span-2">
              <q-input
                :model-value="form.rate"
                @update:model-value="$emit('update:field', { field: 'rate', value: $event })"
                label="Rate *"
                type="number"
                outlined
                dense
                prefix="₱"
                @wheel.prevent
                :rules="[(val) => !val || val >= 100 || 'Minimum rate is ₱100']"
                :hint="form.pay_type === 'monthly' ? 'Monthly salary' : 'Daily rate (min ₱100)'"
              />
              <div v-if="form.pay_type === 'monthly' && form.rate >= 100 && form.work_hours_per_week > 0" class="daily-rate-preview">
                <span class="daily-rate-label">Equivalent Daily Rate</span>
                <span class="daily-rate-value">₱{{ dailyRate }}</span>
                <span class="daily-rate-formula">based on {{ form.work_hours_per_week }} hrs/week</span>
              </div>
            </div>

            <!-- Row 4: Position | Department -->
            <q-select
              :model-value="form.position"
              @update:model-value="$emit('update:field', { field: 'position', value: $event })"
              :options="positions"
              option-label="name"
              option-value="id"
              emit-value
              map-options
              label="Position"
              outlined
              dense
              clearable
            />

            <q-select
              :model-value="form.department"
              @update:model-value="$emit('update:field', { field: 'department', value: $event })"
              :options="departments"
              option-label="name"
              option-value="id"
              emit-value
              map-options
              label="Department *"
              outlined
              dense
              clearable
            />

            <!-- Row: Year | Month -->
            <q-select
              :model-value="form.year"
              @update:model-value="$emit('update:field', { field: 'year', value: $event })"
              :options="yearOptions"
              label="Year *"
              outlined
              dense
              emit-value
              map-options
            />

            <q-select
              :model-value="form.month"
              @update:model-value="$emit('update:field', { field: 'month', value: $event })"
              :options="monthOptions"
              label="Month *"
              outlined
              dense
              emit-value
              map-options
            />

            <!-- Eligibilities -->
            <div v-if="eligibilityObjects.length" class="col-span-2">
              <div class="section-label">Eligibilities</div>
              <div class="eligibility-formal-list">
                <div v-for="(el, index) in eligibilityObjects" :key="el.id" class="eligibility-formal-item">
                  <span class="eligibility-number">{{ index + 1 }}</span>
                  <span class="eligibility-name">{{ el.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <q-btn flat label="Cancel" class="cancel-btn" @click="$emit('update:modelValue', false)" />
          <q-btn unelevated :label="isRenewing ? 'Renew Contract' : 'Assign Contract'" class="submit-btn" :loading="assigning" @click="$emit('submit')" />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  form: { type: Object, required: true },
  assigning: { type: Boolean, default: false },
  contractTypeOptions: { type: Array, default: () => [] },
  positions: { type: Array, default: () => [] },
  departments: { type: Array, default: () => [] },
  eligibilityObjects: { type: Array, default: () => [] },
  isRenewing: { type: Boolean, default: false },
})

const selectedContractType = computed(() =>
  props.contractTypeOptions.find((ct) => ct.id === props.form.contract_type_id),
)

const payTypeLabel = computed(() => {
  if (!selectedContractType.value?.pay_type) return ''
  return selectedContractType.value.pay_type === 'monthly' ? 'Monthly' : 'Daily'
})



const paymentMethodOptions = [
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Cash', value: 'cash' },
  { label: 'Paytaca', value: 'paytaca' },
]

const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 2100 - currentYear + 1 }, (_, i) => ({
  label: String(currentYear + i),
  value: currentYear + i,
}))

const monthOptions = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
]

const dailyRate = computed(() => {
  const monthly = parseFloat(props.form.rate) || 0
  const weeklyHours = parseFloat(props.form.work_hours_per_week) || 48
  if (monthly <= 0 || weeklyHours <= 0) return '0.00'
  const monthlyHours = weeklyHours * (52 / 12)
  const daily = (monthly / monthlyHours) * 8
  return daily.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
})

</script>

<style scoped>
.modal-card {
  border-radius: 16px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  background: #2563eb !important;
  border-bottom: none !important;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.modal-header .q-btn {
  color: rgba(255, 255, 255, 0.8) !important;
}
.modal-header .q-btn:hover {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.15) !important;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-avatar-icon {
  border-radius: 10px !important;
  flex-shrink: 0;
}

.modal-avatar-add {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #ffffff !important;
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
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

.modal-content {
  padding: 20px !important;
  overflow-y: auto;
  max-height: 70vh;
  flex: 1;
  background: #f9fafb !important;
}

.modal-content::-webkit-scrollbar {
  width: 4px;
}
.modal-content::-webkit-scrollbar-track {
  background: transparent;
}
.modal-content::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 4px;
}

.modal-content :deep(.q-field__control) {
  background: #ffffff !important;
  border-radius: 10px !important;
}
.modal-content :deep(.q-field--outlined .q-field__control:before) {
  border-color: #e2e8f0 !important;
  border-radius: 10px !important;
}
.modal-content :deep(.q-field--outlined .q-field__control:hover:before) {
  border-color: #2563eb !important;
}
.modal-content :deep(.q-field--outlined.q-field--focused .q-field__control:before) {
  border-color: #2563eb !important;
  border-width: 2px !important;
}

.form-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f3f5;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.col-span-2 {
  grid-column: 1 / -1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #f1f3f5;
  margin-top: 8px;
}

.cancel-btn {
  color: #6b7280;
  border: 1px solid #e2e8f0 !important;
  border-radius: 10px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  padding: 0 18px !important;
  min-height: 38px !important;
}
.cancel-btn:hover {
  background: #f1f5f9 !important;
}
.submit-btn {
  background: #2563eb !important;
  color: white;
  border-radius: 10px !important;
  font-weight: 600 !important;
  text-transform: none !important;
  min-height: 38px !important;
  padding: 0 22px !important;
}
.submit-btn:hover {
  background: #1d4ed8 !important;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3) !important;
}

/* Daily rate preview */
.daily-rate-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  padding: 8px 12px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
}

.daily-rate-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.daily-rate-value {
  font-size: 13px;
  font-weight: 700;
  color: #2563eb;
}

.daily-rate-formula {
  font-size: 11px;
  color: #9ca3af;
  margin-left: auto;
}

/* Section label */
.section-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 6px;
  font-weight: 500;
}

/* Multipliers */
.multipliers-section {
  margin-top: 8px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.multiplier-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #e2e8f0;
}

.multiplier-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.multiplier-row:first-child {
  padding-top: 0;
}

.multiplier-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.multiplier-icon {
  color: #3b82f6;
  background: #dbeafe;
  padding: 6px;
  border-radius: 6px;
}

.multiplier-details {
  display: flex;
  flex-direction: column;
}

.multiplier-label {
  font-size: 13px;
  font-weight: 600;
  color: #1e3a5f;
}

.multiplier-desc {
  font-size: 11px;
  color: #6b7280;
}

.multiplier-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.multiplier-value-wrapper {
  min-width: 100px;
  text-align: right;
}

.multiplier-value-display {
  font-size: 14px;
  font-weight: 600;
  color: #059669;
}

.multiplier-source {
  font-size: 10px;
  color: #9ca3af;
  margin-left: 4px;
}

.multiplier-input {
  width: 90px;
}

.multiplier-input :deep(.q-field__control) {
  height: 32px;
}

.multiplier-prefix {
  color: #6b7280;
  font-weight: 500;
}

/* Eligibilities */
.eligibility-formal-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
  margin-top: 6px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.eligibility-formal-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  background: #ffffff;
  border: 1px solid #dbeafe;
  border-radius: 6px;
}

.eligibility-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  min-width: 20px;
  background: #2563eb;
  color: #ffffff;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
}

.eligibility-name {
  font-size: 12.5px;
  color: #1e3a5f;
  font-weight: 500;
}

@media (max-width: 768px) {
  .modal-card {
    max-width: calc(100vw - 20px);
    max-height: calc(100vh - 24px);
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .col-span-2 {
    grid-column: span 1;
  }
  .form-actions {
    flex-direction: column-reverse;
  }
  .form-actions .q-btn {
    width: 100%;
  }
  .eligibility-formal-list {
    grid-template-columns: 1fr;
  }
  .multiplier-controls {
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
  }
}

/* Hide number input spinners */
.modal-content :deep(input[type=number])::-webkit-outer-spin-button,
.modal-content :deep(input[type=number])::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.modal-content :deep(input[type=number]) {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
