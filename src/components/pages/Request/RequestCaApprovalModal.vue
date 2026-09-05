<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon"><q-icon name="edit" size="20px" /></span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Approve cash advance</div>
            <div class="dash-modal__sub">{{ request?.employee_name || '' }}</div>
          </div>
        </div>
        <q-btn
          icon="close"
          flat
          round
          aria-label="Close"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-section>
      <q-card-section class="dash-modal__body">
        <div class="dash-modal__stack">
          <div class="dash-modal__section">
            <div class="dash-modal__section-title">Request information</div>
            <div class="dash-modal__rows">
              <div class="dash-modal__row">
                <span class="dash-modal__label">Employee:</span>
                <span class="dash-modal__value">{{ request?.employee_name }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Requested amount:</span>
                <span class="dash-modal__value dash-modal__value--strong"
                  >&#8369;{{ formatAmount(request?.requested_amount) }}</span
                >
              </div>
            </div>
          </div>
          <div class="dash-modal__section">
            <div class="dash-modal__section-title">Approval details</div>
            <div class="dash-modal__grid">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label"
                  >Status<span class="dash-modal__req">*</span></span
                >
                <q-select
                  outlined
                  :model-value="approvalData.status"
                  @update:model-value="
                    $emit('update:approvalData', { ...approvalData, status: $event })
                  "
                  :options="['approved', 'rejected']"
                  :rules="[(val) => !!val || 'Status is required']"
                  class="dash-field dash-modal__span-2"
                  dense
                  hide-bottom-space
                  popup-content-class="dash-popup dash-popup--modal"
                />
              </label>
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Remarks</span>
                <q-input
                  outlined
                  :model-value="approvalData.remarks"
                  @update:model-value="
                    $emit('update:approvalData', { ...approvalData, remarks: $event })
                  "
                  type="textarea"
                  rows="3"
                  class="dash-field dash-modal__span-2"
                  dense
                  hide-bottom-space
                />
              </label>
            </div>
          </div>
        </div>
      </q-card-section>
      <q-card-section class="dash-modal__foot">
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
          label="Submit approval"
          class="dash-modal__submit"
          @click="$emit('submit')"
          :loading="submitting"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
defineProps({
  modelValue: Boolean,
  request: Object,
  approvalData: Object,
  submitting: Boolean,
})
defineEmits(['update:modelValue', 'update:approvalData', 'submit'])

const formatAmount = (num) => {
  const n = Number(num || 0)
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped src="./requestModal.css"></style>
