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
            <q-icon :name="editing ? 'edit' : 'card_giftcard'" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">{{ editing ? 'Edit allowance' : 'Add allowance' }}</div>
            <div class="dash-modal__sub">
              {{
                editing
                  ? 'Update the allowance type details'
                  : 'Define a new allowance type for this company'
              }}
            </div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" @click="cancel" />
      </q-card-section>

      <q-form ref="formRef" @submit="submitHandler" class="dash-modal__form">
        <q-card-section class="dash-modal__body">
          <label class="dash-modal__field">
            <span class="dash-modal__field-label"
              >Name<span class="dash-modal__req">*</span></span
            >
            <q-input
              v-model="form.name"
              outlined
              dense
              autofocus
              :rules="[(val) => !!val?.trim() || 'Name is required']"
              hide-bottom-space
              class="dash-field"
              placeholder="e.g. Transportation allowance"
            />
          </label>

          <label class="dash-modal__field">
            <span class="dash-modal__field-label"
              >Payout policy<span class="dash-modal__req">*</span></span
            >
            <q-select
              v-model="form.payout_policy"
              :options="policyOptions"
              option-value="value"
              option-label="label"
              emit-value
              map-options
              outlined
              dense
              :rules="[(val) => !!val || 'Payout policy is required']"
              hide-bottom-space
              class="dash-field"
              popup-content-class="dash-popup dash-popup--modal"
            >
              <template v-slot:prepend>
                <q-icon name="o_price_check" size="18px" />
              </template>
            </q-select>
          </label>

          <div class="q-mt-md all-toggle">
            <q-toggle v-model="form.is_taxable" color="primary" size="md" class="brand-toggle" />
            <div class="all-toggle__labels">
              <div class="all-toggle__label">Taxable</div>
              <div class="all-toggle__hint">Include this allowance in taxable income calculation</div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions class="dash-modal__foot">
          <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" @click="cancel" />
          <q-btn
            :label="editing ? 'Update' : 'Save'"
            no-caps
            class="dash-modal__submit"
            :loading="saving"
            type="submit"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { PAYOUT_POLICY_OPTIONS } from 'src/composables/utils/allowances'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  allowance: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'submit', 'cancel'])

const formRef = ref(null)
const payload = {
  name: '',
  is_taxable: true,
  payout_policy: null,
}

const form = reactive({ ...payload })

const editing = computed(() => !!props.allowance)

// A policy already set on the row must stay selectable even before the backend
// vocabulary has caught up in PAYOUT_POLICY_OPTIONS — otherwise Edit shows a
// blank value and a save rewrites the policy to nothing.
const policyOptions = computed(() => {
  const options = PAYOUT_POLICY_OPTIONS.map((opt) => ({ ...opt }))
  const current = props.allowance?.payout_policy
  if (current && !options.some((opt) => opt.value === current)) {
    options.unshift({
      value: current,
      label: props.allowance.payout_policy_display || current,
    })
  }
  return options
})

function resetForm() {
  const a = props.allowance
  form.name = a?.name ?? ''
  form.is_taxable = a?.is_taxable ?? true
  form.payout_policy = a?.payout_policy ?? null
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) resetForm()
  },
)

function cancel() {
  emit('cancel')
  emit('update:modelValue', false)
}

async function submitHandler() {
  emit('submit', {
    name: form.name.trim(),
    is_taxable: form.is_taxable,
    payout_policy: form.payout_policy,
  })
}
</script>

<style scoped>
.all-toggle {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.all-toggle__labels {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.all-toggle__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
}

.all-toggle__hint {
  font-size: 12px;
  color: var(--dash-ink-4);
  line-height: 1.4;
}
</style>