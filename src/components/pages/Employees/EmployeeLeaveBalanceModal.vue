<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="event_note" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">
              {{ isSet ? 'Set leave balance' : 'Add leave balance' }}
            </div>
            <div class="dash-modal__sub">{{ employeeName }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" @click="cancel" />
      </q-card-section>

      <q-form @submit="submit" class="dash-modal__form">
        <q-card-section class="dash-modal__body">
          <!-- Add and set are one endpoint apart and produce very different
               balances, so the choice is made first, in plain words, rather
               than being implied by the button at the bottom. -->
          <div class="dash-modal__group">
            <p class="dash-modal__group-label">What this does</p>
            <q-btn-toggle
              v-model="form.mode"
              :options="modeOptions"
              no-caps
              spread
              unelevated
              class="elb-mode"
              toggle-color="primary"
              aria-label="Add to or replace the balance"
            />
            <span class="dash-modal__field-hint">{{ modeHint }}</span>
          </div>

          <div class="dash-modal__group">
            <p class="dash-modal__group-label">Leave balance details</p>
            <div class="dash-modal__grid">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label"
                  >Leave type<span class="dash-modal__req">*</span></span
                >
                <q-select
                  v-model="form.leave_type_id"
                  :options="leaveTypeOptions"
                  option-label="name"
                  option-value="id"
                  emit-value
                  map-options
                  outlined
                  dense
                  :loading="loadingLeaveTypes"
                  :rules="[(val) => !!val || 'Leave type is required']"
                  hide-bottom-space
                  class="dash-field"
                  popup-content-class="dash-popup dash-popup--modal"
                />
              </label>
              <label class="dash-modal__field">
                <span class="dash-modal__field-label"
                  >Days<span class="dash-modal__req">*</span></span
                >
                <q-input
                  v-model.number="form.days"
                  type="number"
                  step="0.01"
                  :min="0"
                  outlined
                  dense
                  :rules="[
                    (val) => (val !== null && val !== '') || 'Days is required',
                    (val) => !isNaN(val) || 'Must be a number',
                    (val) => Number(val) >= 0 || 'Days cannot be negative',
                  ]"
                  hide-bottom-space
                  class="dash-field"
                />
              </label>
            </div>
          </div>

          <!-- What the write will actually leave behind. A set that reads
               "10 → 5" is the one case where an admin can see at a glance that
               they picked the wrong action. -->
          <p v-if="outcomeSentence" class="elb-outcome">
            <q-icon name="o_info" size="15px" />
            <span>{{ outcomeSentence }}</span>
          </p>
        </q-card-section>

        <q-card-actions class="dash-modal__foot">
          <q-btn label="Cancel" flat class="dash-modal__cancel" @click="cancel" />
          <q-btn
            :label="isSet ? 'Set balance' : 'Add balance'"
            type="submit"
            unelevated
            class="dash-modal__submit"
            :loading="submitting"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * Grant or correct one employee's leave balance.
 *
 * The two endpoints behind this (`leave-balances/add/` and `.../set/`) answer
 * with success, but one adds to the balance and the other replaces it — so the
 * mode is a visible choice here rather than two separate menu entries that look
 * alike from the table. They also read the number under different field names:
 * `add` takes `days`, `set` takes `remaining` — the submit key is picked by mode.
 */
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  employee: { type: Object, default: () => ({}) },
  leaveTypeOptions: { type: Array, default: () => [] },
  /** The employee's current balances, `[{ leave_type_id, balance }]`. */
  currentBalances: { type: Array, default: () => [] },
  loadingLeaveTypes: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'submit', 'cancel'])

const form = ref({
  mode: 'add',
  leave_type_id: null,
  days: null,
})

const modeOptions = [
  { label: 'Add to balance', value: 'add' },
  { label: 'Set balance', value: 'set' },
]

const isSet = computed(() => form.value.mode === 'set')

const modeHint = computed(() =>
  isSet.value
    ? 'Replaces the current balance with the number below. A balance of 10 set to 5 becomes 5.'
    : 'Adds the number below to the current balance. A balance of 10 with 5 added becomes 15.',
)

const employeeName = computed(() => {
  const emp = props.employee
  if (!emp) return 'Unknown'
  return (
    `${emp.user?.first_name || ''} ${emp.user?.last_name || ''}`.trim() ||
    emp.user?.username ||
    'Unknown'
  )
})

/** The employee's balance for the picked type, or null when it is not known. */
const currentBalance = computed(() => {
  if (form.value.leave_type_id == null) return null
  const match = props.currentBalances.find(
    (row) => String(row.leave_type_id) === String(form.value.leave_type_id),
  )
  if (!match) return null
  const parsed = Number(match.balance)
  return Number.isFinite(parsed) ? parsed : null
})

const outcomeSentence = computed(() => {
  const days = Number(form.value.days)
  if (form.value.leave_type_id == null || !Number.isFinite(days)) return ''

  const typeName =
    props.leaveTypeOptions.find((type) => String(type.id) === String(form.value.leave_type_id))
      ?.name || 'this leave'

  if (currentBalance.value === null) {
    return isSet.value
      ? `${typeName} will be set to ${days}, whatever it is now.`
      : `${days} will be added to the current ${typeName} balance.`
  }
  const next = isSet.value ? days : currentBalance.value + days
  return `${typeName}: ${currentBalance.value} → ${next} days.`
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      // Always reopens on "add": the safe one of the two, since an add can be
      // corrected with a set but a set has already discarded what was there.
      form.value = {
        mode: 'add',
        leave_type_id: null,
        days: null,
      }
    }
  },
)

const submit = () => {
  const emp = props.employee || {}
  emit('submit', {
    mode: form.value.mode,
    payload: {
      employee_ids: [emp.id],
      leave_type_id: form.value.leave_type_id,
      [form.value.mode === 'set' ? 'remaining' : 'days']: String(form.value.days),
    },
  })
}

const cancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<style scoped>
.elb-mode {
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  overflow: hidden;
}

.elb-mode :deep(.q-btn) {
  height: 34px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-2);
}

.elb-mode :deep(.q-btn__content) {
  letter-spacing: 0;
}

.elb-outcome {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 0;
  padding: 9px 11px;
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  font-size: 12px;
  line-height: 1.5;
  color: var(--dash-ink-2);
}

.elb-outcome .q-icon {
  flex: none;
  margin-top: 1px;
  color: var(--dash-ink-4);
}
</style>
