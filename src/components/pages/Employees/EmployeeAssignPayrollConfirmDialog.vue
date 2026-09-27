<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--sm">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon dash-modal__head-icon--warn">
            <q-icon name="o_warning_amber" size="20px" />
          </span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">{{ title }}</div>
            <div v-if="subject" class="dash-modal__sub">{{ subject }}</div>
          </div>
        </div>
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <p class="apc__lede">
          <template v-if="employeeCount > 0">
            These terms are saved to <strong>all {{ employeeCount }} selected employees</strong>,
            and payroll runs on them from the first cutoff.
          </template>
          <template v-else-if="isRenewing">
            This replaces <strong>{{ employeeName }}</strong
            >'s current payroll profile, and payroll runs on the new terms from the first cutoff.
          </template>
          <template v-else>
            <strong>{{ employeeName }}</strong> has no payroll profile yet. Once saved, payroll runs
            on these terms from the first cutoff.
          </template>
        </p>

        <div class="dash-modal__group">
          <p class="dash-modal__group-label">Check these details</p>
          <ul class="apc__list">
            <li v-for="row in summaryRows" :key="row.label" class="apc__row">
              <span class="apc__label">{{ row.label }}</span>
              <span class="apc__value" :class="{ 'apc__value--empty': !row.value }">
                {{ row.value || '—' }}
              </span>
            </li>
          </ul>
        </div>

        <p v-if="isRenewing" class="apc__note">
          <q-icon name="o_info" size="15px" />
          <span
            >A field showing “—” is being left as it is; only the fields you filled in change.</span
          >
        </p>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn
          flat
          no-caps
          label="Go back and edit"
          class="dash-modal__cancel"
          @click="$emit('update:modelValue', false)"
        />
        <q-btn
          unelevated
          no-caps
          :label="confirmLabel"
          class="dash-modal__submit"
          :loading="loading"
          @click="$emit('confirm')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * Confirmation between the assign form and the write it makes.
 *
 * Assigning a payroll profile is the point of no return for that employee's
 * pay terms: `useAdminContracts.assignContract` posts straight through, and the
 * edit path's own confirm already warns that it recalculates salary, overtime
 * and deductions inside the current cutoff. So the assign path gets the same
 * gate — the one difference being that there is nothing on screen yet to
 * compare against, which is what the recap below is for.
 *
 * It shows the values that will be *sent*, not the ones the select happens to
 * be displaying: department, position and payroll group are stored as ids, and
 * a recap of ids is a recap nobody can check.
 */
import { computed } from 'vue'
import {
  formatHours,
  formatRate,
  monthLabel,
  payTypeLabel,
} from '@/composables/utils/contractTerms'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** The `assignForm` being confirmed — read only here, never written. */
  form: { type: Object, default: () => ({}) },
  employee: { type: Object, default: null },
  /** True when the employee already has a contract and this replaces it. */
  isRenewing: { type: Boolean, default: false },
  /** > 0 for the bulk toolbar action; the terms are saved to all of them. */
  employeeCount: { type: Number, default: 0 },
  contractTypeOptions: { type: Array, default: () => [] },
  positions: { type: Array, default: () => [] },
  departments: { type: Array, default: () => [] },
  payrollGroupOptions: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

defineEmits(['update:modelValue', 'confirm'])

const employeeName = computed(() => {
  if (!props.employee) return ''
  return (
    `${props.employee.user?.first_name || ''} ${props.employee.user?.last_name || ''}`.trim() ||
    props.employee.user?.username ||
    'this employee'
  )
})

const title = computed(() => {
  if (props.employeeCount > 0) return 'Assign payroll profile?'
  return props.isRenewing ? 'Renew payroll profile?' : 'Assign payroll profile?'
})

const subject = computed(() => {
  if (props.employeeCount > 0) {
    return `${props.employeeCount} selected employee${props.employeeCount === 1 ? '' : 's'}`
  }
  return employeeName.value
})

const confirmLabel = computed(() => {
  if (props.employeeCount > 0) return `Assign to ${props.employeeCount}`
  return props.isRenewing ? 'Renew payroll profile' : 'Assign payroll profile'
})

/**
 * Ids to names. The fallback matters: a contract prefilled from the API can
 * carry a name where the select would have carried an id, and a non-numeric
 * value is therefore a name already, not a lookup that came up empty.
 */
function nameFor(options, value) {
  if (value === null || value === undefined || value === '') return ''
  const match = options.find((o) => String(o.id) === String(value))
  if (match) return match.name
  return Number.isNaN(Number(value)) ? String(value) : ''
}

const periodLabel = computed(() => {
  const month = monthLabel(props.form.month)
  const year = props.form.year
  if (!month) return year ? String(year) : ''
  return year ? `${month} ${year}` : month
})

const termsSource = computed(() => {
  if (props.form.assignment_mode === 'contract_type') {
    const type = nameFor(props.contractTypeOptions, props.form.contract_type_id)
    return type ? `Contract type · ${type}` : ''
  }
  return 'Custom terms'
})

const summaryRows = computed(() => [
  { label: 'Terms', value: termsSource.value },
  { label: 'Pay type', value: payTypeLabel(props.form.pay_type) },
  { label: 'Rate', value: formatRate(props.form.rate) },
  { label: 'Work hours', value: formatHours(props.form.work_hours_per_week) },
  { label: 'Department', value: nameFor(props.departments, props.form.department) },
  { label: 'Position', value: nameFor(props.positions, props.form.position) },
  {
    label: 'Payroll group',
    value: nameFor(props.payrollGroupOptions, props.form.payroll_group_id),
  },
  { label: 'First cutoff', value: periodLabel.value },
])
</script>

<style scoped>
.apc__lede {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--dash-ink-2);
}
.apc__lede strong {
  font-weight: 600;
  color: var(--dash-ink);
}

.apc__list {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  overflow: hidden;
}

.apc__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  padding: 7px 11px;
  background: var(--dash-surface);
  border-bottom: 1px solid var(--dash-line-soft);
}
.apc__row:last-child {
  border-bottom: none;
}

.apc__label {
  flex: none;
  font-size: 12.5px;
  color: var(--dash-ink-3);
}

.apc__value {
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
  text-align: right;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

/* A value that is absent is not zero and not an error — it reads as a quiet
   placeholder so it cannot be mistaken for a term that was confirmed. */
.apc__value--empty {
  font-weight: 400;
  color: var(--dash-ink-4);
}

.apc__note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  padding: 9px 11px;
  border: 1px solid var(--dash-warn-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-warn-bg);
  color: var(--dash-warn);
  font-size: 12px;
  line-height: 1.5;
}
.apc__note .q-icon {
  flex: none;
  margin-top: 1px;
}
</style>
