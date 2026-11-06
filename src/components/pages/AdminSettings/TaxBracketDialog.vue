<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="close">
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="o_percent" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">
              {{ editing ? 'Edit tax bracket' : 'Add tax bracket' }}
            </div>
            <div class="dash-modal__sub">An income band, and the tax taken from it</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
      </q-card-section>

      <q-form @submit.prevent="submit" class="dash-modal__form">
        <q-card-section class="dash-modal__body">
          <div class="dash-modal__group">
            <p class="dash-modal__group-label">Band</p>

            <div class="dash-modal__grid">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">
                  Minimum<span class="dash-modal__req">*</span>
                </span>
                <q-input
                  v-model="draft.minimum"
                  type="number"
                  step="0.01"
                  min="0"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field tb-number"
                  placeholder="20833.01"
                >
                  <template v-slot:prepend>
                    <q-icon name="o_payments" size="18px" />
                    <span class="tb-currency">₱</span>
                  </template>
                </q-input>
                <span class="dash-modal__field-hint">
                  The lowest monthly income this bracket covers.
                </span>
              </label>

              <label class="dash-modal__field">
                <span class="dash-modal__field-label">
                  Maximum<span class="dash-modal__req">*</span>
                </span>
                <!-- No `min`: the band's top is free to fall anywhere, and the
                     "Minimum has to be lower than maximum" check already rules
                     out the one pairing that would mean nothing. -->
                <q-input
                  v-model="draft.maximum"
                  type="number"
                  step="0.01"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field tb-number"
                  placeholder="33333.00"
                >
                  <template v-slot:prepend>
                    <q-icon name="o_payments" size="18px" />
                    <span class="tb-currency">₱</span>
                  </template>
                </q-input>
                <span class="dash-modal__field-hint">
                  The highest. Income above this falls into the next bracket.
                </span>
              </label>
            </div>
          </div>

          <div class="dash-modal__group">
            <p class="dash-modal__group-label">Tax</p>

            <div class="dash-modal__grid">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">
                  Fixed tax<span class="dash-modal__req">*</span>
                </span>
                <q-input
                  v-model="draft.fixed_tax"
                  type="number"
                  step="0.01"
                  min="0"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field tb-number"
                  placeholder="0.00"
                >
                  <template v-slot:prepend>
                    <q-icon name="o_receipt_long" size="18px" />
                    <span class="tb-currency">₱</span>
                  </template>
                </q-input>
                <span class="dash-modal__field-hint">
                  The flat amount charged inside this band. `0.00` for a band
                  that charges only a rate.
                </span>
              </label>

              <label class="dash-modal__field">
                <span class="dash-modal__field-label">
                  Percent over<span class="dash-modal__req">*</span>
                </span>
                <q-input
                  v-model="draft.percent_over"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field tb-number"
                  placeholder="0"
                >
                  <template v-slot:append><span class="tb-currency">%</span></template>
                </q-input>
                <span class="dash-modal__field-hint">
                  Charged on the income above the minimum, on top of the fixed
                  tax. Enter `0.00` for a band that charges only a fixed amount.
                </span>
              </label>
            </div>
          </div>
        </q-card-section>

        <q-card-actions class="dash-modal__foot">
          <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" v-close-popup />
          <q-btn
            :label="editing ? 'Update' : 'Save'"
            type="submit"
            no-caps
            unelevated
            class="dash-modal__submit"
            :loading="saving"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * The add / edit form for one withholding tax bracket.
 *
 * The panel owns the write (`saveTaxBracket`), so this dialog only holds the
 * draft: it loads the row it was opened over, emits the form on submit, and is
 * left open when the write fails so the entered figures are not lost. It is
 * closed by the panel on success, which is also when the list behind it has
 * been re-read.
 */
import { computed, ref, watch } from 'vue'
import { emptyTaxBracketForm, taxBracketToForm } from 'src/composables/utils/taxBrackets'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** The normalized bracket being edited, or null when adding. */
  bracket: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'save'])

const draft = ref(emptyTaxBracketForm())

const editing = computed(() => props.bracket?.id != null)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    draft.value = props.bracket ? taxBracketToForm(props.bracket) : emptyTaxBracketForm()
  },
)

function close() {
  emit('update:modelValue', false)
}

function submit() {
  if (props.saving) return
  emit('save', { ...draft.value })
}
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

.tb-currency {
  font-size: 12.5px;
  color: var(--dash-ink-4);
}

/* `type="number"` drops the left pad Quasar gives a text field in some
   browsers; the figures are still read as text by `taxBracketPayload`, so this
   is presentation only. */
.tb-number :deep(.q-field__native) {
  font-variant-numeric: tabular-nums;
}

@media (max-width: 599px) {
  .dash-modal__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
