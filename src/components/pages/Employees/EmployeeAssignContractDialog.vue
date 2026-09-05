<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--lg">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="assignment" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">
              {{ isRenewing ? 'Renew Payroll Profile' : 'Assign Payroll Profile' }}
            </div>
            <div v-if="isRenewing && employeeName" class="dash-modal__sub">
              Renewing payroll profile
              <q-chip dense outline size="12px" icon="person" class="employee-chip">
                {{ employeeName }}
              </q-chip>
            </div>
            <div v-else class="dash-modal__sub">Fill in the payroll profile details</div>
          </div>
        </div>
        <q-btn
          icon="close"
          flat
          round
          dense
          aria-label="Close"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <div class="form-section">
          <div class="dash-modal__section-title">Contract details</div>
          <div class="dash-modal__grid">
            <!-- Assignment Mode -->
            <label v-if="!isRenewing" class="dash-modal__field">
              <span class="dash-modal__field-label">Assignment mode</span>
              <q-select
                :model-value="form.assignment_mode"
                @update:model-value="
                  $emit('update:field', { field: 'assignment_mode', value: $event })
                "
                :options="assignmentModeOptions"
                outlined
                dense
                emit-value
                map-options
                class="dash-field dash-modal__span-2"
                hide-bottom-space
                popup-content-class="dash-popup dash-popup--modal"
              />
            </label>

            <!-- Contract Type -->
            <label
              v-if="form.assignment_mode === 'contract_type' && !isRenewing"
              class="dash-modal__field"
            >
              <span class="dash-modal__field-label">Contract type</span>
              <q-select
                :model-value="form.contract_type_id"
                @update:model-value="$emit('contractTypeChange', $event)"
                :options="contractTypeOptions"
                option-label="name"
                option-value="id"
                emit-value
                map-options
                outlined
                dense
                class="dash-field dash-modal__span-2"
                hide-bottom-space
                popup-content-class="dash-popup dash-popup--modal"
              />
            </label>

            <!-- ── Job Structure ── -->
            <div class="dash-modal__section-title dash-modal__span-2" style="margin-top: 8px">
              Job Structure
            </div>

            <!-- Pay Type -->
            <label v-if="form.assignment_mode === 'custom'" class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Pay type<span class="dash-modal__req">*</span></span
              >
              <q-select
                :model-value="form.pay_type"
                @update:model-value="$emit('update:field', { field: 'pay_type', value: $event })"
                :options="payTypeSelectOptions"
                outlined
                dense
                emit-value
                map-options
                class="dash-field dash-modal__span-2"
                hide-bottom-space
                popup-content-class="dash-popup dash-popup--modal"
              />
            </label>
            <label v-else-if="selectedContractType?.pay_type" class="dash-modal__field">
              <span class="dash-modal__field-label">Pay type</span>
              <q-input
                :model-value="payTypeLabel"
                outlined
                dense
                readonly
                class="dash-field dash-modal__span-2"
                hide-bottom-space
              />
            </label>

            <!-- Work Hours Per Week -->
            <label
              v-if="selectedContractType?.pay_type || form.assignment_mode === 'custom'"
              class="dash-modal__field"
            >
              <span class="dash-modal__field-label">Work hours per week</span>
              <q-input
                :model-value="form.work_hours_per_week"
                @update:model-value="
                  $emit('update:field', { field: 'work_hours_per_week', value: $event })
                "
                type="number"
                outlined
                dense
                :hint="'Min 8, max 48 hours per week'"
                :rules="[
                  (val) => !val || (val >= 8 && val <= 48) || 'Must be between 8 and 48 hours',
                ]"
                class="dash-field dash-modal__span-2"
                hide-bottom-space
              />
            </label>

            <!-- Position | Department -->
            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Position</span>
              <q-select
                :model-value="form.position"
                @update:model-value="$emit('update:field', { field: 'position', value: $event })"
                :options="positions"
                option-label="name"
                option-value="id"
                emit-value
                map-options
                outlined
                dense
                clearable
                hide-bottom-space
                class="dash-field"
                popup-content-class="dash-popup dash-popup--modal"
              />
            </label>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Department<span class="dash-modal__req">*</span></span
              >
              <q-select
                :model-value="form.department"
                @update:model-value="$emit('update:field', { field: 'department', value: $event })"
                :options="departments"
                option-label="name"
                option-value="id"
                emit-value
                map-options
                outlined
                dense
                clearable
                hide-bottom-space
                class="dash-field"
                popup-content-class="dash-popup dash-popup--modal"
              />
            </label>

            <!-- Payroll Group -->
            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Payroll group</span>
              <q-select
                :model-value="form.payroll_group_id"
                @update:model-value="
                  $emit('update:field', { field: 'payroll_group_id', value: $event })
                "
                :options="payrollGroupOptions"
                option-label="name"
                option-value="id"
                emit-value
                map-options
                outlined
                dense
                clearable
                class="dash-field dash-modal__span-2"
                hide-bottom-space
                popup-content-class="dash-popup dash-popup--modal"
              />
            </label>

            <!-- ── Period & Compensation ── -->
            <div class="dash-modal__section-title dash-modal__span-2" style="margin-top: 8px">
              Period & Compensation
            </div>

            <!-- Year | Month -->
            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Year<span class="dash-modal__req">*</span></span
              >
              <q-select
                :model-value="form.year"
                @update:model-value="$emit('update:field', { field: 'year', value: $event })"
                :options="yearOptions"
                outlined
                dense
                emit-value
                map-options
                hide-bottom-space
                class="dash-field"
                popup-content-class="dash-popup dash-popup--modal"
              />
            </label>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Month<span class="dash-modal__req">*</span></span
              >
              <q-select
                :model-value="form.month"
                @update:model-value="$emit('update:field', { field: 'month', value: $event })"
                :options="monthOptions"
                outlined
                dense
                emit-value
                map-options
                hide-bottom-space
                class="dash-field"
                popup-content-class="dash-popup dash-popup--modal"
              />
            </label>

            <!-- Rate -->
            <div class="dash-modal__span-2">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label"
                  >Rate<span class="dash-modal__req">*</span></span
                >
                <q-input
                  :model-value="form.rate"
                  @update:model-value="$emit('update:field', { field: 'rate', value: $event })"
                  type="number"
                  outlined
                  dense
                  prefix="₱"
                  @wheel.prevent
                  :rules="[(val) => !val || val >= 100 || 'Minimum rate is ₱100']"
                  :hint="form.pay_type === 'monthly' ? 'Monthly salary' : 'Daily rate (min ₱100)'"
                  hide-bottom-space
                  class="dash-field"
                />
              </label>
              <div
                v-if="
                  form.pay_type === 'monthly' && form.rate >= 100 && form.work_hours_per_week > 0
                "
                class="daily-rate-preview"
              >
                <span class="daily-rate-label">Equivalent Daily Rate</span>
                <span class="daily-rate-value">₱{{ dailyRate }}</span>
                <span class="daily-rate-formula"
                  >based on {{ form.work_hours_per_week }} hrs/week</span
                >
              </div>
            </div>

            <!-- Eligibilities (checkboxes in both modes, editable) -->
            <div
              v-if="
                isRenewing ||
                form.assignment_mode === 'custom' ||
                (form.assignment_mode === 'contract_type' && selectedContractType)
              "
              class="dash-modal__span-2"
            >
              <div class="section-label">Eligibilities</div>
              <div class="checkbox-grid">
                <q-checkbox
                  v-if="overtimeId"
                  :model-value="form.eligibilities.includes(overtimeId)"
                  @update:model-value="toggleEligibility(overtimeId, $event)"
                  label="Overtime eligible"
                  dense
                />
                <q-checkbox
                  v-if="ctoId && form.pay_type === 'monthly'"
                  :model-value="form.eligibilities.includes(ctoId)"
                  @update:model-value="toggleEligibility(ctoId, $event)"
                  label="Overtime converted to CTO"
                  dense
                />
                <q-checkbox
                  v-if="holidayPayId"
                  :model-value="form.eligibilities.includes(holidayPayId)"
                  @update:model-value="toggleEligibility(holidayPayId, $event)"
                  label="Holiday pay"
                  dense
                />
                <q-checkbox
                  v-if="undertimeId"
                  :model-value="form.eligibilities.includes(undertimeId)"
                  @update:model-value="toggleEligibility(undertimeId, $event)"
                  label="Undertime deduction"
                  dense
                />
                <q-checkbox
                  v-if="nightDiffId"
                  :model-value="form.eligibilities.includes(nightDiffId)"
                  @update:model-value="toggleEligibility(nightDiffId, $event)"
                  label="Night differential eligible"
                  dense
                />
                <q-checkbox
                  v-if="contributionsEligId"
                  :model-value="form.eligibilities.includes(contributionsEligId)"
                  @update:model-value="toggleEligibility(contributionsEligId, $event)"
                  label="Contributions"
                  dense
                />
                <q-checkbox
                  v-for="opt in otherEligibilityOptions"
                  :key="opt.id"
                  :model-value="form.eligibilities.includes(opt.id)"
                  @update:model-value="toggleEligibility(opt.id, $event)"
                  :label="opt.name"
                  dense
                />
              </div>
            </div>
            <div v-else-if="eligibilityObjects.length" class="dash-modal__span-2">
              <div class="section-label">Eligibilities</div>
              <div class="eligibility-formal-list">
                <div
                  v-for="(el, index) in eligibilityObjects"
                  :key="el.id"
                  class="eligibility-formal-item"
                >
                  <span class="eligibility-number">{{ index + 1 }}</span>
                  <span class="eligibility-name">{{ el.name }}</span>
                </div>
              </div>
            </div>

            <!-- Contributions -->
            <div
              v-if="
                (isRenewing ||
                  form.assignment_mode === 'custom' ||
                  (form.assignment_mode === 'contract_type' && selectedContractType)) &&
                contributionOptions.length
              "
              class="dash-modal__span-2"
            >
              <div class="section-label">Contributions</div>
              <div class="checkbox-grid">
                <q-checkbox
                  v-for="item in contributionOptions"
                  :key="item.id"
                  :model-value="form.contributions?.includes(item.id)"
                  @update:model-value="toggleContribution(item.id, $event)"
                  :label="item.name"
                  dense
                />
              </div>
            </div>

            <!-- Multipliers -->
            <div
              v-if="
                (isRenewing ||
                  form.assignment_mode === 'custom' ||
                  (form.assignment_mode === 'contract_type' && selectedContractType)) &&
                visibleMultiplierFields.length
              "
              class="dash-modal__span-2"
            >
              <div class="section-label">Payroll Multipliers</div>
              <div class="multipliers-section">
                <div
                  v-for="field in visibleMultiplierFields"
                  :key="field.key"
                  class="multiplier-row"
                >
                  <div class="multiplier-info">
                    <q-icon :name="field.icon" size="20px" class="multiplier-icon" />
                    <div class="multiplier-details">
                      <div class="multiplier-label">{{ field.label }}</div>
                      <div class="multiplier-desc">{{ field.desc }}</div>
                    </div>
                  </div>
                  <div class="multiplier-controls">
                    <div class="multiplier-value-wrapper">
                      <q-input
                        :model-value="form[field.key]"
                        @update:model-value="
                          $emit('update:field', { field: field.key, value: $event })
                        "
                        type="number"
                        step="0.01"
                        min="0"
                        outlined
                        dense
                        class="multiplier-input"
                        placeholder="e.g. 1.50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn
          flat
          label="Cancel"
          class="dash-modal__cancel"
          @click="$emit('update:modelValue', false)"
        />
        <q-btn
          unelevated
          :label="isRenewing ? 'Renew Payroll Profile' : 'Assign Payroll Profile'"
          class="dash-modal__submit"
          :loading="assigning"
          @click="$emit('submit')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'

const emit = defineEmits(['update:modelValue', 'update:field', 'contractTypeChange', 'submit'])

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  form: { type: Object, required: true },
  assigning: { type: Boolean, default: false },
  employee: { type: Object, default: null },
  contractTypeOptions: { type: Array, default: () => [] },
  positions: { type: Array, default: () => [] },
  departments: { type: Array, default: () => [] },
  eligibilityObjects: { type: Array, default: () => [] },
  isRenewing: { type: Boolean, default: false },
  allEligibilityOptions: { type: Array, default: () => [] },
  contributionOptions: { type: Array, default: () => [] },
  payrollGroupOptions: { type: Array, default: () => [] },
})

const selectedContractType = computed(() =>
  props.contractTypeOptions.find((ct) => ct.id === props.form.contract_type_id),
)

const payTypeLabel = computed(() => {
  if (!selectedContractType.value?.pay_type) return ''
  return selectedContractType.value.pay_type === 'monthly' ? 'Monthly' : 'Daily'
})

const assignmentModeOptions = [
  { label: 'Contract Type', value: 'contract_type' },
  { label: 'Custom', value: 'custom' },
]

const payTypeSelectOptions = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Semi-Monthly', value: 'semi-monthly' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Daily', value: 'daily' },
  { label: 'Hourly', value: 'hourly' },
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

const employeeName = computed(() => {
  if (!props.employee) return ''
  return (
    `${props.employee.user?.first_name || ''} ${props.employee.user?.last_name || ''}`.trim() ||
    props.employee.user?.username ||
    'N/A'
  )
})

const dailyRate = computed(() => {
  const monthly = parseFloat(props.form.rate) || 0
  const weeklyHours = parseFloat(props.form.work_hours_per_week) || 48
  if (monthly <= 0 || weeklyHours <= 0) return '0.00'
  const monthlyHours = weeklyHours * (52 / 12)
  const daily = (monthly / monthlyHours) * 8
  return daily.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
})

// ── Renew mode: eligibility/contribution/multiplier helpers ──────────────

const overtimeId = computed(
  () => props.allEligibilityOptions.find((e) => e.name === 'Overtime Eligible')?.id,
)
const ctoId = computed(
  () => props.allEligibilityOptions.find((e) => e.name === 'Overtime Converted to CTO')?.id,
)
const holidayPayId = computed(
  () => props.allEligibilityOptions.find((e) => e.name === 'Holiday Pay')?.id,
)
const undertimeId = computed(
  () => props.allEligibilityOptions.find((e) => e.name === 'Undertime Deduction')?.id,
)
const nightDiffId = computed(
  () => props.allEligibilityOptions.find((e) => e.name === 'Night Differential Eligible')?.id,
)
const contributionsEligId = computed(
  () => props.allEligibilityOptions.find((e) => e.name === 'Contributions')?.id,
)

const dedicatedEligibilityNames = [
  'Overtime Eligible',
  'Overtime Converted to CTO',
  'Holiday Pay',
  'Undertime Deduction',
  'Night Differential Eligible',
  'Contributions',
  'Work Hours Flexible',
  'Work Hours Strict',
]

const otherEligibilityOptions = computed(() =>
  props.allEligibilityOptions.filter((e) => !dedicatedEligibilityNames.includes(e.name)),
)

function toggleEligibility(id, checked) {
  const current = [...props.form.eligibilities]
  const value = checked ? [...current, id] : current.filter((e) => e !== id)
  emit('update:field', { field: 'eligibilities', value })
}

function toggleContribution(id, checked) {
  const current = [...(props.form.contributions || [])]
  const value = checked ? [...current, id] : current.filter((c) => c !== id)
  emit('update:field', { field: 'contributions', value })
}

const multiplierFields = [
  { key: 'overtime_multiplier', label: 'Overtime', icon: 'timer', desc: 'OT rate (e.g. 1.25×)' },
  {
    key: 'special_holiday_multiplier',
    label: 'Special Holiday',
    icon: 'celebration',
    desc: 'Special holiday rate (e.g. 1.30×)',
  },
  {
    key: 'regular_holiday_multiplier',
    label: 'Regular Holiday',
    icon: 'event',
    desc: 'Regular holiday rate (e.g. 2.00×)',
  },
  {
    key: 'night_diff_multiplier',
    label: 'Night Diff',
    icon: 'nights_stay',
    desc: 'Night differential rate (e.g. 1.10×)',
  },
  {
    key: 'regular_holiday_ot_multiplier',
    label: 'Regular Holiday OT',
    icon: 'event_note',
    desc: 'Regular holiday OT rate (e.g. 2.60×)',
  },
  {
    key: 'special_holiday_ot_multiplier',
    label: 'Special Holiday OT',
    icon: 'star',
    desc: 'Special holiday OT rate (e.g. 1.95×)',
  },
  {
    key: 'undertime_multiplier',
    label: 'Undertime',
    icon: 'remove_circle',
    desc: 'Undertime deduction (e.g. 0.50×)',
  },
]

function isMultiplierVisible(key) {
  const eligs = props.form.eligibilities
  switch (key) {
    case 'overtime_multiplier':
      return overtimeId.value && eligs.includes(overtimeId.value)
    case 'special_holiday_multiplier':
    case 'regular_holiday_multiplier':
    case 'special_holiday_ot_multiplier':
    case 'regular_holiday_ot_multiplier':
      return holidayPayId.value && eligs.includes(holidayPayId.value)
    case 'night_diff_multiplier':
      return nightDiffId.value && eligs.includes(nightDiffId.value)
    case 'undertime_multiplier':
      return undertimeId.value && eligs.includes(undertimeId.value)
    default:
      return true
  }
}

const visibleMultiplierFields = computed(() => {
  if (props.form.assignment_mode === 'custom') return multiplierFields
  return multiplierFields.filter((f) => isMultiplierVisible(f.key))
})
</script>

<style scoped>
.employee-chip {
  background: rgba(255, 255, 255, 0.95) !important;
  color: var(--dash-brand) !important;
  font-weight: 600;
  margin-left: 4px;
}

/* Daily rate preview */
.daily-rate-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  padding: 8px 12px;
  background: var(--dash-accent-bg);
  border: 1px solid var(--dash-info-line);
  border-radius: var(--dash-r-sm);
}

.daily-rate-label {
  font-size: 12px;
  color: var(--dash-ink-3);
  font-weight: 500;
}

.daily-rate-value {
  font-size: 13px;
  font-weight: 700;
  color: var(--dash-accent);
}

.daily-rate-formula {
  font-size: 11px;
  color: var(--dash-ink-4);
  margin-left: auto;
}

/* Section label */
.section-label {
  font-size: 12px;
  color: var(--dash-ink-3);
  margin-bottom: 6px;
  font-weight: 500;
}

/* Checkbox grid for renew sections */
.checkbox-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  margin-top: 6px;
  padding: 10px 12px;
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
}
.checkbox-grid :deep(.q-checkbox) {
  width: calc(50% - 6px);
}

/* Multipliers */
.multipliers-section {
  margin-top: 8px;
  padding: 12px 14px;
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
}

.multiplier-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--dash-line);
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
  color: var(--dash-accent);
  background: var(--dash-accent-bg);
  padding: 6px;
  border-radius: var(--dash-r-sm);
}

.multiplier-details {
  display: flex;
  flex-direction: column;
}

.multiplier-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-brand);
}

.multiplier-desc {
  font-size: 11px;
  color: var(--dash-ink-3);
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
  color: var(--dash-good);
}

.multiplier-source {
  font-size: 10px;
  color: var(--dash-ink-4);
  margin-left: 4px;
}

.multiplier-input {
  width: 90px;
}

.multiplier-input :deep(.q-field__control) {
  height: 32px;
}

.multiplier-prefix {
  color: var(--dash-ink-3);
  font-weight: 500;
}

/* Eligibilities */
.eligibility-formal-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
  margin-top: 6px;
  padding: 12px 14px;
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
}

.eligibility-formal-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  background: #ffffff;
  border: 1px solid var(--dash-accent-bg);
  border-radius: var(--dash-r-sm);
}

.eligibility-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  min-width: 20px;
  background: var(--dash-accent);
  color: #ffffff;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
}

.eligibility-name {
  font-size: 12.5px;
  color: var(--dash-brand);
  font-weight: 500;
}

@media (max-width: 768px) {
  .eligibility-formal-list {
    grid-template-columns: 1fr;
  }
  .checkbox-grid :deep(.q-checkbox) {
    width: 100%;
  }
  .multiplier-controls {
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
  }
}
</style>
