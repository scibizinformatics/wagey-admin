<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="close">
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="savings" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">
              {{ editing ? 'Edit contribution component' : 'Add contribution component' }}
            </div>
            <div class="dash-modal__sub">An income band, and the share taken from it</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
      </q-card-section>

      <q-form @submit.prevent="submit" class="dash-modal__form">
        <q-card-section class="dash-modal__body">
          <div class="dash-modal__group">
            <p class="dash-modal__group-label">Component</p>

            <div class="dash-modal__grid">
              <label class="dash-modal__field dash-modal__span-2">
                <span class="dash-modal__field-label">
                  Contribution type<span class="dash-modal__req">*</span>
                </span>
                <q-select
                  v-model="draft.type"
                  :options="typeOptions"
                  option-value="value"
                  option-label="label"
                  emit-value
                  map-options
                  outlined
                  dense
                  options-dense
                  hide-bottom-space
                  class="dash-field"
                  placeholder="Choose a type"
                  popup-content-class="dash-popup dash-popup--modal"
                >
                  <template v-slot:prepend><q-icon name="o_category" size="18px" /></template>
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey-7">
                        No contribution types yet — close this and add one from Manage types first
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
                <span class="dash-modal__field-hint">
                  Required. Every component files under a scheme — SSS, PhilHealth, Pag-IBIG.
                </span>
              </label>

              <label class="dash-modal__field">
                <span class="dash-modal__field-label">
                  Income from<span class="dash-modal__req">*</span>
                </span>
                <q-input
                  v-model="draft.income_from"
                  type="number"
                  step="0.01"
                  min="0"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field cb-number"
                  placeholder="0.00"
                >
                  <template v-slot:prepend>
                    <q-icon name="o_payments" size="18px" />
                    <span class="cb-currency">₱</span>
                  </template>
                </q-input>
              </label>

              <label class="dash-modal__field">
                <span class="dash-modal__field-label">
                  Income to<span class="dash-modal__req">*</span>
                </span>
                <q-input
                  v-model="draft.income_to"
                  type="number"
                  step="0.01"
                  min="0"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field cb-number"
                  placeholder="10000.00"
                >
                  <template v-slot:prepend><q-icon name="o_payments" size="18px" /></template>
                </q-input>
              </label>
            </div>
          </div>

          <div class="dash-modal__group">
            <p class="dash-modal__group-label">Shares</p>

            <div class="dash-modal__grid">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Employee fixed</span>
                <q-input
                  v-model="draft.employee_fixed"
                  type="number"
                  step="0.01"
                  min="0"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field cb-number"
                  placeholder="0.00"
                >
                  <template v-slot:prepend><q-icon name="o_person" size="18px" /></template>
                </q-input>
                <span class="dash-modal__field-hint">
                  A flat amount the employee pays in this band.
                </span>
              </label>

              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Employee percentage</span>
                <q-input
                  v-model="draft.employee_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field cb-number"
                  placeholder="0"
                >
                  <template v-slot:append>
                    <span class="cb-currency">%</span>
                  </template>
                </q-input>
                <span class="dash-modal__field-hint">
                  Taken from income inside the band, on top of the fixed amount.
                </span>
              </label>

              <label class="dash-modal__field dash-modal__span-2">
                <span class="dash-modal__field-label">Employer share</span>
                <q-input
                  v-model="draft.fixed_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field cb-number"
                  placeholder="0.00"
                >
                  <template v-slot:prepend>
                    <span class="cb-currency">₱</span>
                  </template>
                </q-input>
                <span class="dash-modal__field-hint">
                  What the company contributes for this band. It is recorded beside the employee's
                  share, never added to it.
                </span>
              </label>
            </div>
          </div>

          <div class="dash-modal__group">
            <p class="dash-modal__group-label">When it applies</p>

            <div class="dash-modal__grid">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">
                  Effective date<span class="dash-modal__req">*</span>
                </span>
                <!-- `q-date` writes `YYYY-MM-DD` into the same field, so the two
                     ends of the mask cannot disagree about the shape. -->
                <q-input
                  v-model="draft.effective_date"
                  mask="####-##-##"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field"
                  placeholder="YYYY-MM-DD"
                >
                  <template v-slot:append>
                    <q-icon name="o_event" size="18px" class="cursor-pointer">
                      <q-popup-proxy transition-show="scale" transition-hide="scale">
                        <q-date v-model="draft.effective_date" mask="YYYY-MM-DD" />
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </label>

              <div class="dash-modal__field">
                <span class="dash-modal__field-label">Status</span>
                <div class="toggle-item">
                  <q-toggle
                    v-model="draft.is_active"
                    color="primary"
                    size="md"
                    class="brand-toggle"
                    aria-label="Applies to pay runs"
                  />
                  <div class="toggle-label-group">
                    <div class="toggle-label">
                      {{ draft.is_active ? 'Applies to pay runs' : 'Switched off' }}
                    </div>
                    <div class="toggle-hint">
                      A component switched off keeps its figures but is not applied.
                    </div>
                  </div>
                </div>
              </div>
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
 * The add / edit form for one contribution component.
 *
 * The panel owns the write (`saveContributionBracket`), so this dialog only
 * holds the draft: it loads the row it was opened over, emits the form on
 * submit, and is left open when the write fails so the entered figures are not
 * lost. It is closed by the panel on success, which is also when the list behind
 * it has been re-read.
 */
import { computed, ref, watch } from 'vue'
import {
  bracketToForm,
  contributionTypeLabel,
  emptyBracketForm,
  sameId,
} from 'src/composables/utils/contributionSettings'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** The normalized bracket being edited, or null when adding. */
  bracket: { type: Object, default: null },
  /** The company's contribution types, for the picker. */
  types: { type: Array, default: () => [] },
  /** Preselects a type when the panel's filter already names one. */
  presetTypeId: { type: [Number, String], default: null },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'save'])

const draft = ref(emptyBracketForm())

const editing = computed(() => props.bracket?.id != null)

const typeOptions = computed(() =>
  props.types
    .filter((type) => type?.id != null)
    .map((type) => ({ value: type.id, label: contributionTypeLabel(type) })),
)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    if (props.bracket) {
      draft.value = bracketToForm(props.bracket)
    } else {
      // A company with exactly one scheme has no real choice to make, so the
      // form opens on it rather than asking for a pick that can only go one way.
      const onlyType = props.types.length === 1 ? (props.types[0]?.id ?? null) : null
      draft.value = emptyBracketForm(props.presetTypeId ?? onlyType)
    }
    // Ids cross the wire as numbers here and as strings elsewhere; q-select
    // matches an option by strict `===`, so the draft takes the option's own
    // value rather than whatever spelling the row carried.
    const matched = props.types.find((type) => sameId(type.id, draft.value.type))
    if (matched) draft.value.type = matched.id
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

.cb-currency {
  font-size: 12.5px;
  color: var(--dash-ink-4);
}

/* `type="number"` drops the left pad Quasar gives a text field in some
   browsers; the figures are still read as text by `bracketPayload`, so this is
   presentation only. */
.cb-number :deep(.q-field__native) {
  font-variant-numeric: tabular-nums;
}

@media (max-width: 599px) {
  .dash-modal__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
