<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--confirm">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon dash-modal__head-icon--warn">
            <q-icon name="o_undo" size="20px" />
          </span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Revert this withholding tax?</div>
            <div v-if="employee" class="dash-modal__sub">{{ employee }}</div>
          </div>
        </div>
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <div class="dash-modal__confirm-text">
          <template v-if="amount != null">
            <strong>{{ formatCurrencyPrecise(amount) }}</strong> of withholding tax
          </template>
          <template v-else>The withholding tax</template>
          will be taken back off this payroll item and it can be applied again afterwards. Your
          reason is recorded against the revert and cannot be edited afterwards.
        </div>

        <!-- The reason is required, not optional: the backend records it and the
             epi-tax endpoint reads it back beside the revert, so a bare
             "reverted" tells nobody reading the row later why the tax is gone. -->
        <label class="dash-modal__field tax-revert-reason">
          <span class="dash-modal__field-label"
            >Reason for reverting<span class="dash-modal__req">*</span></span
          >
          <q-input
            v-model="note"
            outlined
            dense
            type="textarea"
            rows="3"
            autofocus
            maxlength="500"
            counter
            placeholder="Why this tax is being taken off"
            class="dash-field"
            :disable="loading"
            @keydown.ctrl.enter.prevent="submit"
            @keydown.meta.enter.prevent="submit"
          />
        </label>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn
          flat
          no-caps
          label="Cancel"
          class="dash-modal__cancel"
          @click="$emit('update:modelValue', false)"
        />
        <q-btn
          unelevated
          no-caps
          label="Revert tax"
          class="dash-modal__danger"
          :disable="!canSubmit"
          :loading="loading"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * The gate in front of reverting a withholding tax.
 *
 * Bespoke rather than `components/common/ConfirmDialog.vue` for the same reason
 * `PayslipRejectDialog.vue` is: the revert needs a *reason* from the admin, and
 * `ConfirmCard` is deliberately slotless and branchless — every word in it
 * comes from the confirm object, which has nowhere to put an input.
 *
 * Everything else is the shared chrome — the same `dash-modal--confirm` card,
 * the same head tile / title / sub, and the same Cancel + solid-action footer
 * that the reject dialog uses — so the two reason-inputs read as the same kind
 * of dialog rather than each inventing their own.
 *
 * The write lives in the parent's `commitRevertTax`, reachable only from
 * `@confirm` — the reason is captured here and handed over in the event, so the
 * button's `:loading` covers the write and a second click cannot land.
 */
import { computed, ref, watch } from 'vue'
import { formatCurrencyPrecise } from 'src/composables/utils/format'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Whose tax is being decided, for the head's subtitle. */
  employee: { type: String, default: '' },
  /** The tax as it sits, for the sentence. Null reads as "the withholding tax". */
  amount: { type: [Number, String], default: null },
  /** The parent's own in-flight state, so the button cannot be pressed twice. */
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const note = ref('')

const canSubmit = computed(() => note.value.trim().length > 0 && !props.loading)

// Cleared on open rather than on close, so a reason half-typed into an abandoned
// dialog cannot be resubmitted against the next one by muscle memory.
watch(
  () => props.modelValue,
  (open) => {
    if (open) note.value = ''
  },
)

/** Hands the trimmed reason over; the parent owns what happens next. */
function submit() {
  if (!canSubmit.value) return
  emit('confirm', note.value.trim())
}
</script>

<style scoped>
/* Sits under the sentence with the body's own rhythm — the field is the point of
   this dialog, so it needs air rather than butting up against the warning. */
.tax-revert-reason {
  margin-top: 16px;
}
</style>
