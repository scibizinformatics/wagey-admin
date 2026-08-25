<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="modal-card approval-modal">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-icon name="edit" class="modal-icon" />
          <div>
            <div class="modal-title">Approve cash advance</div>
            <div class="modal-subtitle">{{ request?.employee_name || '' }}</div>
          </div>
        </div>
        <q-btn
          icon="close"
          flat
          round
          class="modal-close-btn"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-section>
      <q-separator />
      <q-card-section class="modal-content">
        <div class="detail-sections">
          <div class="detail-section">
            <div class="section-title">Request information</div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Employee:</span>
                <span class="detail-value">{{ request?.employee_name }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Requested amount:</span>
                <span class="detail-value amount-highlight"
                  >&#8369;{{ formatAmount(request?.requested_amount) }}</span
                >
              </div>
            </div>
          </div>
          <div class="detail-section">
            <div class="section-title">Approval details</div>
            <div class="form-grid">
              <q-select
                outlined
                :model-value="approvalData.status"
                @update:model-value="
                  $emit('update:approvalData', { ...approvalData, status: $event })
                "
                :options="['approved', 'rejected']"
                label="Status *"
                :rules="[(val) => !!val || 'Status is required']"
                class="col-span-2"
              />
              <q-input
                outlined
                :model-value="approvalData.remarks"
                @update:model-value="
                  $emit('update:approvalData', { ...approvalData, remarks: $event })
                "
                label="Remarks"
                type="textarea"
                rows="3"
                class="col-span-2"
              />
            </div>
          </div>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="modal-footer">
        <div class="form-actions">
          <q-btn
            flat
            no-caps
            label="Cancel"
            class="cancel-btn"
            @click="$emit('update:modelValue', false)"
          />
          <q-btn
            unelevated
            no-caps
            label="Submit approval"
            class="submit-btn"
            @click="$emit('submit')"
            :loading="submitting"
          />
        </div>
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
