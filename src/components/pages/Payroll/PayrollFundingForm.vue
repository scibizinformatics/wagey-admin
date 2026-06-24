<template>
  <div class="funding-form-card" ref="fundingFormRef">
    <div class="funding-form-header">
      <div class="funding-form-header-icon">
        <q-icon name="account_balance_wallet" size="18px" />
      </div>
      <div>
        <h2 class="funding-form-title">Add Funds</h2>
        <p class="funding-form-subtitle">Record a new funding entry for a disbursement log</p>
      </div>
    </div>

    <div class="funding-divider" />

    <div class="funding-section-label">Disbursement Log</div>
    <div class="funding-form-field" style="margin-bottom: 16px">
      <q-select
        :model-value="form.logId"
        outlined
        dense
        emit-value
        map-options
        :options="runOptions"
        placeholder="Select a disbursement log"
        no-error-icon
        @update:model-value="$emit('update:log-id', $event)"
      >
        <template v-slot:prepend><q-icon name="receipt_long" size="16px" color="grey-6" /></template>
      </q-select>
    </div>

    <div class="funding-section-label">Payment Details</div>
    <div class="funding-form-grid">
      <div class="funding-form-field">
        <label class="funding-field-label">Date</label>
        <q-input :model-value="form.date" outlined dense type="date" no-error-icon
          @update:model-value="$emit('update:form', { ...form, date: $event })" />
      </div>

      <div class="funding-form-field">
        <label class="funding-field-label">Type</label>
        <q-select
          :model-value="form.type"
          outlined
          dense
          emit-value
          map-options
          :options="typeOptions"
          no-error-icon
          @update:model-value="$emit('update:form', { ...form, type: $event })"
        />
      </div>

      <div class="funding-form-field">
        <label class="funding-field-label">Reference #</label>
        <q-input :model-value="form.reference" outlined dense placeholder="e.g. 125436345" no-error-icon
          @update:model-value="$emit('update:form', { ...form, reference: $event })">
          <template v-slot:prepend><span style="font-size: 13px; color: #9ca3af">#</span></template>
        </q-input>
      </div>

      <div class="funding-form-field">
        <label class="funding-field-label">Source</label>
        <q-select
          :model-value="form.source"
          outlined
          dense
          emit-value
          map-options
          :options="fundingSources"
          :disable="!form.logId || fundingSources.length === 0"
          :placeholder="!form.logId ? 'Select a log first' : fundingSources.length === 0 ? 'No bank accounts found' : 'Select bank account'"
          no-error-icon
          @update:model-value="$emit('update:form', { ...form, source: $event })"
        />
      </div>

      <div class="funding-form-field funding-form-field-full">
        <label class="funding-field-label">Amount</label>
        <q-input :model-value="form.amount" outlined dense type="number" placeholder="0.00" no-error-icon
          @update:model-value="$emit('update:form', { ...form, amount: $event })">
          <template v-slot:prepend><span style="font-size: 13px; font-weight: 600; color: #374151">₱</span></template>
        </q-input>
        <div v-if="form.logId" class="funding-amount-helper">
          Total Gross Pay: {{ selectedRunGrossPay }} | Total Net Pay: {{ selectedRunNetPay }}
        </div>
      </div>
    </div>

    <div class="funding-section-label" style="margin-top: 4px">
      Notes <span class="funding-optional">(optional)</span>
    </div>
    <div class="funding-form-field" style="margin-bottom: 20px">
      <q-input :model-value="form.notes" outlined dense placeholder="Add a note about this funding entry..." no-error-icon
        @update:model-value="$emit('update:form', { ...form, notes: $event })" />
    </div>

    <div class="funding-divider" />

    <div class="funding-form-actions">
      <q-btn unelevated label="Add Funds" icon="add" no-caps :loading="savingFunding"
        @click="$emit('submit-funding')" class="funding-submit-btn header-add-btn" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  form: { type: Object, default: () => ({}) },
  runOptions: { type: Array, default: () => [] },
  fundingSources: { type: Array, default: () => [] },
  savingFunding: { type: Boolean, default: false },
  selectedRunGrossPay: { type: String, default: '₱0.00' },
  selectedRunNetPay: { type: String, default: '₱0.00' },
})

defineEmits(['update:log-id', 'update:form', 'submit-funding'])

const typeOptions = [
  { label: 'Check', value: 'check' },
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Paytaca', value: 'paytaca' },
]
</script>

<style scoped>
.funding-form-card {
  background: #ffffff;
  border: 1px solid #e8ecf0;
  border-radius: 12px;
  padding: 20px;
  min-width: 0;
  overflow: hidden;
}

.funding-form-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.funding-form-header-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #eff6ff;
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.funding-form-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.funding-form-subtitle {
  font-size: 12px;
  color: #9ca3af;
  margin: 2px 0 0;
}

.funding-divider {
  height: 1px;
  background: #f1f3f5;
  margin: 0 0 14px;
}

.funding-section-label {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}

.funding-optional {
  font-weight: 400;
  color: #9ca3af;
  text-transform: none;
  letter-spacing: 0;
}

.funding-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.funding-form-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.funding-form-field-full {
  grid-column: 1 / -1;
}

.funding-field-label {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
}

.funding-amount-helper {
  font-size: 11px;
  color: #6b7280;
  margin-top: 4px;
}

.funding-form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.funding-submit-btn {
  border-radius: 10px !important;
  font-weight: 500;
  font-size: 13px;
  padding: 0 18px;
  height: 36px;
}

.header-add-btn {
  background: #1e1b4b !important;
  color: #eef2ff !important;
}

.header-add-btn:hover {
  background: #2d2a6b !important;
}
</style>
