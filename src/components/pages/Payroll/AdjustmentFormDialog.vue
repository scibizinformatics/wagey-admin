<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--sm">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon">
            <q-icon :name="form.type === 'addition' ? 'o_add_circle' : 'o_remove_circle'" size="20px" />
          </span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Add an adjustment</div>
            <div class="dash-modal__sub">{{ employeeName || 'This employee' }}</div>
          </div>
        </div>
        <q-btn flat round dense icon="close" aria-label="Close" @click="close" />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <q-form class="dash-modal__stack" @submit.prevent="submit">
          <!-- The sign of the whole entry. It leads because it decides what the
               other fields mean — an amount under "Addition" and the same amount
               under "Deduction" are opposite acts. -->
          <div class="type-pick" role="radiogroup" aria-label="Adjustment type">
            <button
              v-for="option in ADJUSTMENT_TYPES"
              :key="option.value"
              type="button"
              class="type-pick__option"
              :class="[
                `type-pick__option--${option.tone}`,
                { 'type-pick__option--on': form.type === option.value },
              ]"
              role="radio"
              :aria-checked="form.type === option.value"
              @click="form.type = option.value"
            >
              <q-icon :name="option.icon" size="16px" />
              {{ option.label }}
            </button>
          </div>

          <label class="dash-modal__field">
            <span class="dash-modal__field-label">
              Amount<span class="dash-modal__req">*</span>
            </span>
            <q-input
              v-model="form.amount"
              type="number"
              step="any"
              outlined
              dense
              hide-bottom-space
              placeholder="0.00"
              class="dash-field amount-field"
            >
              <template #prepend><span class="peso">₱</span></template>
            </q-input>
            <span class="dash-modal__field-hint">
              Taken off the net pay for a deduction, added to it for an addition.
            </span>
          </label>

          <!-- Free text: the endpoint takes whatever category is sent, and the
               values in use span statutory-looking codes and plain words. -->
          <label class="dash-modal__field">
            <span class="dash-modal__field-label">Category</span>
            <q-input
              v-model="form.category"
              outlined
              dense
              hide-bottom-space
              placeholder="e.g. allowance, loan, correction"
              class="dash-field"
            >
              <template #prepend><q-icon name="o_label" size="16px" /></template>
            </q-input>
          </label>

          <label class="dash-modal__field">
            <span class="dash-modal__field-label">
              Description<span class="dash-modal__req">*</span>
            </span>
            <q-input
              v-model="form.description"
              outlined
              dense
              hide-bottom-space
              placeholder="Why this adjustment is being made"
              class="dash-field"
            >
              <template #prepend><q-icon name="o_notes" size="16px" /></template>
            </q-input>
            <span class="dash-modal__field-hint">
              Printed on the payslip record, and the first thing anyone reading it asks.
            </span>
          </label>
        </q-form>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" @click="close" />
        <q-btn
          unelevated
          no-caps
          label="Apply"
          class="dash-modal__submit"
          :loading="loading"
          :disable="!canSubmit"
          @click="submit"
        >
          <q-tooltip v-if="!canSubmit">Enter an amount and a description</q-tooltip>
        </q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * The form behind one manual addition or deduction.
 *
 * Separate from `EmployeeContributionsDialog` rather than inline in it: four
 * fields with their own validation and their own busy state, and a nested form
 * inside a list that is itself being clicked on and selected from is a mess to
 * read. It commits nothing — it hands a body up and the parent decides when to
 * write, so the dialog that owns the data owns the refetch too.
 *
 * The type picker leads the form because it is what everything else means. A
 * deduction is money leaving the payslip and an addition is money arriving, and
 * nothing about the amount or description distinguishes the two — so this is a
 * choice the reader makes deliberately rather than a default they may not notice.
 */
import { ref, computed, watch } from 'vue'
import { ADJUSTMENT_TYPES, isValidAdjustment } from 'src/composables/utils/payrollAdjustments'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  employeeName: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const blank = () => ({ type: 'deduction', amount: '', category: '', description: '' })

const form = ref(blank())

const canSubmit = computed(() => !props.loading && isValidAdjustment(form.value))

function close() {
  emit('update:modelValue', false)
}

function submit() {
  if (!canSubmit.value) return
  emit('submit', {
    type: form.value.type,
    // The endpoint takes these as decimal strings, like every other amount in
    // this API — sending a JS number here would be the one call on this screen
    // using a different shape.
    //
    // Sent exactly as typed rather than through `toFixed(2)`: a contribution-
    // precise figure is often not a whole centavo, and rounding it here would
    // save an amount the reader did not enter. `isValidAdjustment` already
    // proved the value parses and is positive.
    amount: String(form.value.amount).trim(),
    category: form.value.category.trim(),
    description: form.value.description.trim(),
  })
}

// Reopened fresh each time, and cleared on close, so a half-typed entry from the
// last adjustment is not waiting behind the next one.
watch(
  () => props.modelValue,
  (open) => {
    if (open) form.value = blank()
  },
)
</script>

<style scoped>
/* Two halves of one decision, so they read as a choice rather than as a select
   with two options. The selected half takes its own tone; the unselected one
   recedes to the neutral edge the rest of the app's controls use. */
.type-pick {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.type-pick__option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink-3);
  cursor: pointer;
  transition:
    background var(--dash-fast) var(--dash-ease),
    border-color var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease);
}
.type-pick__option:hover {
  color: var(--dash-ink-2);
}

.type-pick__option--on.type-pick__option--good {
  border-color: var(--dash-good-line);
  background: var(--dash-good-bg);
  color: var(--dash-good);
}
.type-pick__option--on.type-pick__option--danger {
  border-color: var(--dash-critical-line);
  background: var(--dash-critical-bg);
  color: var(--dash-critical);
}

.type-pick__option:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--dash-surface),
    0 0 0 4px var(--dash-accent-ring);
}

.amount-field :deep(.q-field__native) {
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.peso {
  font-size: 14px;
  font-weight: 600;
  color: var(--dash-ink-3);
}
</style>