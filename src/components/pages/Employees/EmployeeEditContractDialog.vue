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
            <q-icon name="o_edit_note" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Edit Contract</div>
            <div v-if="employeeName" class="dash-modal__sub">
              Editing payroll profile
              <q-chip dense outline size="12px" icon="person" class="employee-chip">
                {{ employeeName }}
              </q-chip>
            </div>
            <div v-else class="dash-modal__sub">Edit the payroll profile details</div>
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
        <div class="dash-modal__grid">
          <!-- Pay Type -->
          <label class="dash-modal__field">
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

          <!-- Work Hours Per Week -->
          <label class="dash-modal__field">
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
              :model-value="form.payroll_group"
              @update:model-value="$emit('update:field', { field: 'payroll_group', value: $event })"
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

          <!-- Holiday Pay Types -->
          <label class="dash-modal__field dash-modal__span-2">
            <span class="dash-modal__field-label">Holiday pay types</span>
            <q-select
              :model-value="form.holiday_pay_types || []"
              @update:model-value="
                $emit('update:field', { field: 'holiday_pay_types', value: $event ?? [] })
              "
              :options="holidayPayTypeOptions"
              option-label="name"
              option-value="id"
              emit-value
              map-options
              multiple
              use-chips
              outlined
              dense
              clearable
              class="dash-field"
              hide-bottom-space
              popup-content-class="dash-popup dash-popup--modal"
            />
          </label>

          <!-- Eligibilities -->
          <div class="dash-modal__span-2">
            <div class="section-label">Eligibilities</div>
            <div class="checkbox-grid">
              <q-checkbox
                v-if="overtimeId"
                :model-value="(form.eligibilities || []).includes(overtimeId)"
                @update:model-value="toggleEligibility(overtimeId, $event)"
                label="Overtime eligible"
                dense
              />
              <q-checkbox
                v-if="ctoId && form.pay_type === 'monthly'"
                :model-value="(form.eligibilities || []).includes(ctoId)"
                @update:model-value="toggleEligibility(ctoId, $event)"
                label="Overtime converted to CTO"
                dense
              />
              <q-checkbox
                v-if="holidayPayId"
                :model-value="(form.eligibilities || []).includes(holidayPayId)"
                @update:model-value="toggleEligibility(holidayPayId, $event)"
                label="Holiday pay"
                dense
              />
              <q-checkbox
                v-if="undertimeId"
                :model-value="(form.eligibilities || []).includes(undertimeId)"
                @update:model-value="toggleEligibility(undertimeId, $event)"
                label="Undertime deduction"
                dense
              />
              <q-checkbox
                v-if="nightDiffId"
                :model-value="(form.eligibilities || []).includes(nightDiffId)"
                @update:model-value="toggleEligibility(nightDiffId, $event)"
                label="Night differential eligible"
                dense
              />
              <q-checkbox
                v-if="contributionsEligId"
                :model-value="(form.eligibilities || []).includes(contributionsEligId)"
                @update:model-value="toggleEligibility(contributionsEligId, $event)"
                label="Contributions"
                dense
              />
              <q-checkbox
                v-for="opt in otherEligibilityOptions"
                :key="opt.id"
                :model-value="(form.eligibilities || []).includes(opt.id)"
                @update:model-value="toggleEligibility(opt.id, $event)"
                :label="opt.name"
                dense
              />
            </div>
          </div>

          <!-- Contributions -->
          <div v-if="contributionOptions.length" class="dash-modal__span-2">
            <div class="section-label">Contributions</div>
            <div class="checkbox-grid">
              <q-checkbox
                v-for="item in contributionOptions"
                :key="item.id"
                :model-value="(form.contributions || []).includes(item.id)"
                @update:model-value="toggleContribution(item.id, $event)"
                :label="item.name"
                dense
              />
            </div>
          </div>

          <!-- Multipliers -->
          <div class="dash-modal__span-2">
            <div class="section-label">Payroll Multipliers</div>
            <div class="multipliers-section">
              <div
                v-for="field in multiplierFields"
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
          label="Save Changes"
          class="dash-modal__submit"
          :loading="saving"
          @click="$emit('submit')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'

const emit = defineEmits(['update:modelValue', 'update:field', 'submit'])

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  form: { type: Object, required: true },
  saving: { type: Boolean, default: false },
  employee: { type: Object, default: null },
  positions: { type: Array, default: () => [] },
  departments: { type: Array, default: () => [] },
  payrollGroupOptions: { type: Array, default: () => [] },
  allEligibilityOptions: { type: Array, default: () => [] },
  contributionOptions: { type: Array, default: () => [] },
  holidayPayTypeOptions: { type: Array, default: () => [] },
})

const payTypeSelectOptions = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Semi-Monthly', value: 'semi-monthly' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Daily', value: 'daily' },
  { label: 'Hourly', value: 'hourly' },
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
  const current = [...(props.form.eligibilities || [])]
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
</script>

<style scoped>
.employee-chip {
  background: rgba(255, 255, 255, 0.95) !important;
  color: var(--dash-brand) !important;
  font-weight: 600;
  margin-left: 4px;
}

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

.section-label {
  font-size: 12px;
  color: var(--dash-ink-3);
  margin-bottom: 6px;
  font-weight: 500;
}

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

.multiplier-input {
  width: 90px;
}

.multiplier-input :deep(.q-field__control) {
  height: 32px;
}

@media (max-width: 768px) {
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