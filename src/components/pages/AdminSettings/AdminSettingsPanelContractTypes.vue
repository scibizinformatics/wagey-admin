<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Contract Types</h2>
        <p class="table-subtitle">Manage contract type definitions</p>
      </div>
      <div class="table-actions">
        <q-btn color="primary" label="Add Contract Type" icon="add" class="add-btn" @click="openContractTypeDialog" />
      </div>
    </div>

    <div class="modern-table-container">
      <template v-if="loadingContractTypes">
        <div class="table-skeleton">
          <div class="skeleton-header">
            <div class="skeleton-header-cell">Name</div>
            <div class="skeleton-header-cell">Eligibilities</div>
            <div class="skeleton-header-cell">Multipliers</div>
            <div class="skeleton-header-cell" style="flex: 0 0 60px">Actions</div>
          </div>
          <div class="skeleton-row" v-for="n in 4" :key="n">
            <div class="skeleton-cell"><q-skeleton type="text" /></div>
            <div class="skeleton-cell"><q-skeleton type="text" width="120px" /></div>
            <div class="skeleton-cell"><q-skeleton type="text" width="180px" /></div>
            <div class="skeleton-cell" style="flex: 0 0 60px"><q-skeleton type="text" width="40px" /></div>
          </div>
        </div>
      </template>
      <template v-else>
        <q-table :rows="contractTypeDefinitions" :columns="contractTypeColumns" row-key="id" flat no-data-label="No contract types found" class="settings-table" hide-pagination :rows-per-page-options="[0]">
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Name</q-th>
              <q-th class="table-header-cell">Eligibilities</q-th>
              <q-th class="table-header-cell multipliers-header">Multipliers</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell"><span class="item-name">{{ props.row.name }}</span></q-td>
              <q-td class="table-body-cell">
                <div class="eligibility-badges">
                  <template v-if="props.row.eligibility_details?.length">
                    <q-chip v-for="el in props.row.eligibility_details" :key="el.id" size="sm" color="primary" text-color="white">{{ el.name }}</q-chip>
                  </template>
                  <template v-else>
                    <q-chip v-for="el in props.row.eligibilities" :key="el" size="sm" color="primary" text-color="white">{{ getEligibilityName(el) }}</q-chip>
                  </template>
                  <span v-if="!(props.row.eligibility_details?.length || props.row.eligibilities?.length)" class="text-grey">None</span>
                </div>
              </q-td>
              <q-td class="table-body-cell multipliers-cell">
                <div class="multiplier-summary">
                  <span class="multiplier-chip" title="Overtime">OT: ×{{ props.row.overtime_multiplier ?? '-' }}</span>
                  <span class="multiplier-chip" title="Regular Holiday">RH: ×{{ props.row.regular_holiday_multiplier ?? '-' }}</span>
                  <span class="multiplier-chip" title="Special Holiday">SH: ×{{ props.row.special_holiday_multiplier ?? '-' }}</span>
                  <span class="multiplier-chip" title="Night Differential">ND: ×{{ props.row.night_diff_multiplier ?? '-' }}</span>
                  <span class="multiplier-chip" title="Regular Holiday OT">RH-OT: ×{{ props.row.regular_holiday_ot_multiplier ?? '-' }}</span>
                  <span class="multiplier-chip" title="Special Holiday OT">SH-OT: ×{{ props.row.special_holiday_ot_multiplier ?? '-' }}</span>
                  <span class="multiplier-chip" title="Undertime">UT: ×{{ props.row.undertime_multiplier ?? '-' }}</span>
                </div>
              </q-td>
              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 150px">
                      <q-item clickable v-close-popup class="dropdown-item" @click="editContractType(props.row)">
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup class="dropdown-item dropdown-item-danger" @click="deleteContractType(props.row)">
                        <q-item-section side><q-icon name="delete" size="16px" color="negative" /></q-item-section>
                        <q-item-section>Delete</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </q-td>
            </q-tr>
          </template>
        </q-table>
      </template>
    </div>

    <q-dialog v-model="contractTypeDialog" persistent>
      <q-card class="admin-modal-card">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add"><q-icon name="description" size="22px" /></q-avatar>
            <div>
              <div class="admin-modal-title">{{ editingContractType ? 'Edit' : 'Add' }} Contract Type</div>
              <div class="admin-modal-subtitle">Manage contract type definitions</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>
        <q-card-section class="admin-modal-content">
          <q-input v-model="contractTypeForm.name" label="Name *" outlined dense class="q-mb-md" />
          <q-select v-model="contractTypeForm.pay_type" :options="[{ label: 'Monthly', value: 'monthly' }, { label: 'Daily', value: 'daily' }]" label="Pay Type" outlined dense emit-value map-options class="q-mb-md" />
          <q-input v-if="contractTypeForm.pay_type === 'daily'" v-model.number="contractTypeForm.work_hours_per_week" label="Work Hours Per Week" outlined dense type="number" min="0" max="48" :rules="[(val) => !val || val <= 48 || 'Maximum is 48 hours']" class="q-mb-md" />
          <div class="text-subtitle2 q-mb-xs">Eligibilities</div>
          <q-separator class="q-mb-md" />
          <q-select
            v-model="contractTypeForm.work_hours_type"
            :options="[
              { label: 'Work Hours Flexible', value: 'flexible' },
              { label: 'Work Hours Strict', value: 'strict' },
            ]"
            label="Work Hours Type"
            outlined
            dense
            emit-value
            map-options
            clearable
            class="q-mb-md"
          />
          <div class="row">
            <div class="col-6 q-mb-sm" v-if="overtimeId">
              <q-checkbox
                :model-value="contractTypeForm.eligibilities.includes(overtimeId)"
                @update:model-value="toggleEligibility(overtimeId, $event)"
                label="Overtime Eligible"
                dense
              />
            </div>
            <div class="col-6 q-mb-sm" v-if="ctoId && contractTypeForm.pay_type === 'daily'">
              <q-checkbox
                :model-value="contractTypeForm.eligibilities.includes(ctoId)"
                @update:model-value="toggleEligibility(ctoId, $event)"
                label="Overtime Converted to CTO"
                dense
              />
            </div>
            <div v-for="opt in eligibilityOptions" :key="opt.value" class="col-6 q-mb-sm">
              <q-checkbox
                :model-value="contractTypeForm.eligibilities.includes(opt.value)"
                @update:model-value="toggleEligibility(opt.value, $event)"
                :label="opt.label"
                dense
              />
            </div>
          </div>

          <div class="text-subtitle2 q-mb-xs q-mt-md">Payroll Multipliers</div>
          <q-separator class="q-mb-md" />
          <div class="multipliers-section">
            <div v-for="field in multiplierFields" :key="field.key" class="multiplier-row">
              <div class="multiplier-info">
                <q-icon :name="field.icon" size="20px" class="multiplier-icon" />
                <div class="multiplier-details">
                  <div class="multiplier-label">{{ field.label }}</div>
                  <div class="multiplier-desc">{{ field.desc }}</div>
                </div>
              </div>
              <div class="multiplier-controls">
                <q-toggle
                  :model-value="contractTypeForm[`use_standard_${field.key}`]"
                  @update:model-value="toggleMultiplier(field.key, $event)"
                  color="primary"
                  dense
                />
                <div class="multiplier-value-wrapper">
                  <q-input
                    v-if="contractTypeForm[`use_standard_${field.key}`]"
                    v-model="contractTypeForm[`${field.key}_multiplier`]"
                    type="number"
                    step="0.01"
                    min="0"
                    outlined
                    dense
                    class="multiplier-input modern-input"
                    placeholder="e.g. 1.50"
                  >
                    <template v-slot:prepend>
                      <span class="multiplier-badge">×</span>
                    </template>
                  </q-input>
                </div>
              </div>
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn color="primary" label="Save" :loading="savingContractType" @click="saveContractType" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAdminContractTypes } from '@/composables/admin/useAdminContractTypes'

const {
  contractTypes: contractTypeDefinitions,
  eligibilities,
  loading: loadingContractTypes,
  saving: savingContractType,
  dialog: contractTypeDialog,
  editing: editingContractType,
  form: contractTypeForm,
  fetchContractTypes: fetchContractTypeDefs,
  fetchEligibilities,
  openDialog: openContractTypeDialog,
  editContractType,
  saveContractType,
  deleteContractType,
  companyMultipliers,
  PHILIPPINES_DEFAULT_MULTIPLIERS,
} = useAdminContractTypes()

const contractTypeColumns = ref([
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'eligibilities', label: 'Eligibilities', field: 'eligibilities', align: 'left' },
  { name: 'multipliers', label: 'Multipliers', field: 'multipliers', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
])

const overtimeId = computed(() => eligibilities.value.find((e) => e.name === 'Overtime Eligible')?.id)
const ctoId = computed(() => eligibilities.value.find((e) => e.name === 'Overtime Converted to CTO')?.id)

const eligibilityOptions = computed(() =>
  eligibilities.value
    .filter((e) => {
      if (e.name === 'Work Hours Flexible' || e.name === 'Work Hours Strict') return false
      if (e.name === 'Overtime Eligible') return false
      if (e.name === 'Overtime Converted to CTO') return false
      return true
    })
    .map((e) => ({
      label: e.name,
      value: e.id,
    })),
)

function toggleEligibility(id, checked) {
  const current = contractTypeForm.value.eligibilities
  if (checked) {
    contractTypeForm.value.eligibilities = [...current, id]
  } else {
    contractTypeForm.value.eligibilities = current.filter((eid) => eid !== id)
  }
}

const multiplierFields = [
  { key: 'overtime', label: 'Overtime', icon: 'schedule', desc: 'Work beyond 8 hours/day' },
  { key: 'special_holiday', label: 'Special Holiday', icon: 'celebration', desc: 'Special non-working days' },
  { key: 'regular_holiday', label: 'Regular Holiday', icon: 'event', desc: 'Regular holidays (double pay)' },
  { key: 'night_diff', label: 'Night Differential', icon: 'nights_stay', desc: 'Work 10PM-6AM' },
  { key: 'regular_holiday_ot', label: 'Regular Holiday OT', icon: 'event_note', desc: 'OT on regular holidays' },
  { key: 'special_holiday_ot', label: 'Special Holiday OT', icon: 'event_busy', desc: 'OT on special holidays' },
  { key: 'undertime', label: 'Undertime', icon: 'timer_off', desc: 'Hours not worked' },
]

const getStandardDisplay = (fieldKey) => {
  const companyValue = companyMultipliers?.value?.[`${fieldKey}_multiplier`]
  return companyValue ?? PHILIPPINES_DEFAULT_MULTIPLIERS[fieldKey]
}

watch(
  () => contractTypeForm.value.eligibilities,
  (newVal) => {
    if (!overtimeId.value || !ctoId.value) return
    const hasOvertime = newVal.includes(overtimeId.value)
    const hasCto = newVal.includes(ctoId.value)
    const isDaily = contractTypeForm.value.pay_type === 'daily'

    // Overtime is checked but CTO is not -> auto-check CTO (only when daily)
    if (hasOvertime && !hasCto && isDaily) {
      contractTypeForm.value.eligibilities = [...newVal, ctoId.value]
      return
    }

    // Overtime is unchecked but CTO is checked -> auto-uncheck CTO
    if (!hasOvertime && hasCto) {
      contractTypeForm.value.eligibilities = newVal.filter((id) => id !== ctoId.value)
    }
  },
  { immediate: true },
)

watch(
  () => contractTypeForm.value.pay_type,
  (newVal) => {
    if (!ctoId.value) return
    const current = contractTypeForm.value.eligibilities
    // If switched to monthly, remove CTO from eligibilities
    if (newVal === 'monthly') {
      if (current.includes(ctoId.value)) {
        contractTypeForm.value.eligibilities = current.filter((id) => id !== ctoId.value)
      }
      return
    }
    // If switched to daily, auto-check CTO if Overtime is checked
    if (newVal === 'daily') {
      if (overtimeId.value && current.includes(overtimeId.value) && !current.includes(ctoId.value)) {
        contractTypeForm.value.eligibilities = [...current, ctoId.value]
      }
    }
  },
  { immediate: true },
)

const toggleMultiplier = (fieldKey, newValue) => {
  contractTypeForm.value[`use_standard_${fieldKey}`] = newValue
  if (newValue && (contractTypeForm.value[`${fieldKey}_multiplier`] == null || contractTypeForm.value[`${fieldKey}_multiplier`] === '')) {
    contractTypeForm.value[`${fieldKey}_multiplier`] = getStandardDisplay(fieldKey)
  }
}

const getEligibilityName = (id) => {
  const el = eligibilities.value.find((e) => e.id === id)
  return el?.name || 'Unknown'
}

onMounted(async () => {
  await fetchContractTypeDefs()
  await fetchEligibilities()
})
</script>

<style scoped>
@import './AdminSettingsPanelShared.css';

/* ── Component-Specific Styles ── */

.eligibility-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.multiplier-summary {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  align-items: center;
  justify-content: flex-end;
}

.multiplier-chip {
  font-size: 11px;
  color: #374151;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 2px 6px;
  white-space: nowrap;
  flex-shrink: 0;
}

.multipliers-header {
  width: 340px;
  min-width: 340px;
}

.multipliers-cell {
  width: 340px;
  min-width: 340px;
  overflow: hidden;
}

.multipliers-section {
  margin-top: 8px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.multiplier-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #e2e8f0;
}

.multiplier-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.multiplier-row:first-child {
  padding-top: 0;
}

.multiplier-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.multiplier-icon {
  color: #3b82f6;
  background: #dbeafe;
  padding: 6px;
  border-radius: 6px;
}

.multiplier-details {
  display: flex;
  flex-direction: column;
}

.multiplier-label {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.multiplier-desc {
  font-size: 11px;
  color: #64748b;
}

.multiplier-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.multiplier-value-wrapper {
  min-width: 100px;
  text-align: right;
}

.multiplier-value-display {
  font-size: 14px;
  font-weight: 600;
  color: #059669;
}

.multiplier-source {
  font-size: 10px;
  color: #94a3b8;
  margin-left: 4px;
}

.multiplier-input {
  width: 110px;
}

.multiplier-input.modern-input :deep(.q-field__control) {
  height: 38px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #d1d5db;
  transition: all 0.2s ease;
}

.multiplier-input.modern-input :deep(.q-field__control:hover) {
  border-color: #3b82f6;
  background: #ffffff;
}

.multiplier-input.modern-input :deep(.q-field--focused .q-field__control) {
  border-color: #3b82f6;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.multiplier-input.modern-input :deep(.q-field__native) {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  text-align: center;
  padding-left: 0;
}

.multiplier-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #3b82f6;
  color: white;
  font-weight: 700;
  font-size: 13px;
  border-radius: 6px;
  margin-right: 4px;
}

.multiplier-input.modern-input :deep(.q-field__prepend) {
  padding-right: 0;
  padding-left: 8px;
}

@media (max-width: 768px) {
  .multiplier-controls {
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
  }
}
</style>
