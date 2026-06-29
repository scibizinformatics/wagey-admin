<template>
  <q-dialog :model-value="showCreateRunDialog" persistent @update:model-value="$emit('update:show-create-run-dialog', $event)">
    <q-card style="min-width: 420px; max-width: 95vw; border-radius: 14px">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-avatar size="44px" class="modal-avatar-icon">
            <q-icon name="add_circle" size="22px" />
          </q-avatar>
          <div>
            <div class="modal-title">New Payroll Run</div>
            <div class="modal-subtitle">Create and compute a new payroll run</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
      </q-card-section>
      <q-separator />
      <q-card-section class="modal-content">
        <div class="q-gutter-sm">
          <q-select
            v-model="form.type"
            label="Payroll Type *"
            outlined
            dense
            emit-value
            map-options
            :options="[
              { label: '13th Month', value: '13th_month' },
              { label: 'Cash Loan', value: 'cash_loan' },
              { label: 'Cash Advance', value: 'cash_advance' },
              { label: 'Service Charge', value: 'service_charge' },
            ]"
            no-error-icon
          >
            <template v-slot:prepend><q-icon name="payments" /></template>
          </q-select>
          <q-select
            v-model="form.department_id"
            label="Department"
            outlined
            dense
            clearable
            emit-value
            map-options
            :options="departmentOptions"
            :loading="!departments?.length && !!companyId"
            hint="Optional"
            no-error-icon
          >
            <template v-slot:prepend><q-icon name="account_tree" /></template>
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey-5">No departments found</q-item-section>
              </q-item>
            </template>
          </q-select>
          <q-input
            v-model="form.start_date"
            label="Start Date *"
            outlined
            dense
            type="date"
            hint="e.g. 2026-05-01"
          />
          <q-input
            v-model="form.end_date"
            label="End Date *"
            outlined
            dense
            type="date"
            hint="e.g. 2026-05-15"
          />
        </div>
      </q-card-section>
      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Cancel" v-close-popup class="dialog-btn" no-caps />
        <q-btn
          unelevated
          color="positive"
          label="Create & Compute"
          icon="play_arrow"
          :loading="createRunLoading"
          @click="$emit('create-run', form)"
          class="dialog-btn primary-btn"
          no-caps
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
const props = defineProps({
  showCreateRunDialog: { type: Boolean, default: false },
  createRunForm: { type: Object, default: () => ({}) },
  departmentOptions: { type: Array, default: () => [] },
  createRunLoading: { type: Boolean, default: false },
  companyId: { type: [Number, String], default: null },
  departments: { type: Array, default: () => [] },
})

defineEmits(['update:show-create-run-dialog', 'create-run'])

const form = props.createRunForm
</script>

<style scoped>
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px !important;
  background: #102335;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-avatar-icon {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #ffffff !important;
  border-radius: 10px !important;
  flex-shrink: 0;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}
.modal-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}
.modal-close-btn {
  color: rgba(255, 255, 255, 0.8) !important;
  flex-shrink: 0;
}
.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
}

.modal-content {
  padding: 20px !important;
  overflow-y: auto;
  flex: 1;
}

.dialog-btn {
  border-radius: 8px !important;
  font-size: 13px;
  text-transform: none;
}
.primary-btn {
  font-weight: 500;
}

.text-grey-5 {
  color: #b0b8c1;
  font-size: 12px;
}
</style>
