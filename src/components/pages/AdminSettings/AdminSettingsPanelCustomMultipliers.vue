<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Custom Multipliers</h2>
        <p class="table-subtitle">Configure pay multipliers for your company</p>
      </div>
      <div class="table-actions">
        <q-btn
          color="primary"
          :label="customMultipliers ? 'Update Multipliers' : 'Set Multipliers'"
          icon="tune"
          class="add-btn"
          :loading="savingMultipliers"
          @click="saveMultipliers"
        />
      </div>
    </div>

    <div class="multipliers-body">
      <div v-if="loadingMultipliers" class="flex flex-center q-pa-xl">
        <q-spinner color="primary" size="40px" />
      </div>
      <div v-else class="multipliers-grid">
        <div class="multiplier-card">
          <div class="multiplier-card-header">
            <div class="multiplier-icon-wrap multiplier-icon--overtime">
              <q-icon name="schedule" size="20px" />
            </div>
            <div>
              <div class="multiplier-card-title">Overtime</div>
              <div class="multiplier-card-desc">Applied to hours beyond regular schedule</div>
            </div>
          </div>
          <q-input v-model="multipliersForm.overtime_multiplier" outlined dense type="number" min="0" step="0.01" placeholder="e.g. 1.25" class="multiplier-input">
            <template v-slot:prepend><span class="multiplier-prefix">×</span></template>
          </q-input>
        </div>

        <div class="multiplier-card">
          <div class="multiplier-card-header">
            <div class="multiplier-icon-wrap multiplier-icon--night">
              <q-icon name="nights_stay" size="20px" />
            </div>
            <div>
              <div class="multiplier-card-title">Night Differential</div>
              <div class="multiplier-card-desc">Applied to hours worked at night</div>
            </div>
          </div>
          <q-input v-model="multipliersForm.night_diff_multiplier" outlined dense type="number" min="0" step="0.01" placeholder="e.g. 1.10" class="multiplier-input">
            <template v-slot:prepend><span class="multiplier-prefix">×</span></template>
          </q-input>
        </div>

        <div class="multiplier-card">
          <div class="multiplier-card-header">
            <div class="multiplier-icon-wrap multiplier-icon--regular">
              <q-icon name="event" size="20px" />
            </div>
            <div>
              <div class="multiplier-card-title">Regular Holiday</div>
              <div class="multiplier-card-desc">Applied on declared regular holidays</div>
            </div>
          </div>
          <q-input v-model="multipliersForm.regular_holiday_multiplier" outlined dense type="number" min="0" step="0.01" placeholder="e.g. 2.00" class="multiplier-input">
            <template v-slot:prepend><span class="multiplier-prefix">×</span></template>
          </q-input>
        </div>

        <div class="multiplier-card">
          <div class="multiplier-card-header">
            <div class="multiplier-icon-wrap multiplier-icon--special">
              <q-icon name="celebration" size="20px" />
            </div>
            <div>
              <div class="multiplier-card-title">Special Holiday</div>
              <div class="multiplier-card-desc">Applied on special non-working days</div>
            </div>
          </div>
          <q-input v-model="multipliersForm.special_holiday_multiplier" outlined dense type="number" min="0" step="0.01" placeholder="e.g. 1.30" class="multiplier-input">
            <template v-slot:prepend><span class="multiplier-prefix">×</span></template>
          </q-input>
        </div>

        <div class="multiplier-card">
          <div class="multiplier-card-header">
            <div class="multiplier-icon-wrap multiplier-icon--regular-ot">
              <q-icon name="event_note" size="20px" />
            </div>
            <div>
              <div class="multiplier-card-title">Regular Holiday OT</div>
              <div class="multiplier-card-desc">Overtime on regular holidays</div>
            </div>
          </div>
          <q-input v-model="multipliersForm.regular_holiday_ot_multiplier" outlined dense type="number" min="0" step="0.01" placeholder="e.g. 2.60" class="multiplier-input">
            <template v-slot:prepend><span class="multiplier-prefix">×</span></template>
          </q-input>
        </div>

        <div class="multiplier-card">
          <div class="multiplier-card-header">
            <div class="multiplier-icon-wrap multiplier-icon--special-ot">
              <q-icon name="event_busy" size="20px" />
            </div>
            <div>
              <div class="multiplier-card-title">Special Holiday OT</div>
              <div class="multiplier-card-desc">Overtime on special holidays</div>
            </div>
          </div>
          <q-input v-model="multipliersForm.special_holiday_ot_multiplier" outlined dense type="number" min="0" step="0.01" placeholder="e.g. 1.95" class="multiplier-input">
            <template v-slot:prepend><span class="multiplier-prefix">×</span></template>
          </q-input>
        </div>

        <div class="multiplier-card">
          <div class="multiplier-card-header">
            <div class="multiplier-icon-wrap multiplier-icon--undertime">
              <q-icon name="timer_off" size="20px" />
            </div>
            <div>
              <div class="multiplier-card-title">Undertime</div>
              <div class="multiplier-card-desc">Applied to undertime hours</div>
            </div>
          </div>
          <q-input v-model="multipliersForm.undertime_multiplier" outlined dense type="number" min="0" step="0.01" placeholder="e.g. 0.50" class="multiplier-input">
            <template v-slot:prepend><span class="multiplier-prefix">×</span></template>
          </q-input>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { usePayroll } from '@/composables/page/usePayroll'

const $q = useQuasar()
const {
  customMultipliers,
  loading: loadingMultipliers,
  saving: savingMultipliers,
  fetchCustomMultipliers,
  createCustomMultipliers,
  updateCustomMultipliers,
} = usePayroll()

const multipliersForm = ref({
  overtime_multiplier: '',
  night_diff_multiplier: '',
  regular_holiday_multiplier: '',
  special_holiday_multiplier: '',
  regular_holiday_ot_multiplier: '',
  special_holiday_ot_multiplier: '',
  undertime_multiplier: '',
})

const PHILIPPINES_DEFAULT_MULTIPLIERS_ADMIN = {
  overtime: 1.25,
  night_diff: 1.10,
  regular_holiday: 2.00,
  special_holiday: 1.30,
  regular_holiday_ot: 2.60,
  special_holiday_ot: 1.95,
  undertime: 0.50,
}

async function loadMultipliers(companyId) {
  const data = await fetchCustomMultipliers(companyId)
  if (data) {
    multipliersForm.value = {
      overtime_multiplier: data.overtime_multiplier ?? '',
      night_diff_multiplier: data.night_diff_multiplier ?? '',
      regular_holiday_multiplier: data.regular_holiday_multiplier ?? '',
      special_holiday_multiplier: data.special_holiday_multiplier ?? '',
      regular_holiday_ot_multiplier: data.regular_holiday_ot_multiplier ?? '',
      special_holiday_ot_multiplier: data.special_holiday_ot_multiplier ?? '',
      undertime_multiplier: data.undertime_multiplier ?? '',
    }
  } else {
    multipliersForm.value = {
      overtime_multiplier: '',
      night_diff_multiplier: '',
      regular_holiday_multiplier: '',
      special_holiday_multiplier: '',
      regular_holiday_ot_multiplier: '',
      special_holiday_ot_multiplier: '',
      undertime_multiplier: '',
    }
  }
}

async function saveMultipliers() {
  const { useCompany } = await import('@/composables/page/useCompany')
  const { companyId } = useCompany()
  if (!companyId.value) {
    $q.notify({ type: 'warning', message: 'Please select a company first', position: 'top' })
    return
  }

  const modifiedMultipliers = []
  const multiplierFields = [
    { key: 'overtime', label: 'Overtime', default: PHILIPPINES_DEFAULT_MULTIPLIERS_ADMIN.overtime },
    { key: 'night_diff', label: 'Night Differential', default: PHILIPPINES_DEFAULT_MULTIPLIERS_ADMIN.night_diff },
    { key: 'regular_holiday', label: 'Regular Holiday', default: PHILIPPINES_DEFAULT_MULTIPLIERS_ADMIN.regular_holiday },
    { key: 'special_holiday', label: 'Special Holiday', default: PHILIPPINES_DEFAULT_MULTIPLIERS_ADMIN.special_holiday },
    { key: 'regular_holiday_ot', label: 'Regular Holiday OT', default: PHILIPPINES_DEFAULT_MULTIPLIERS_ADMIN.regular_holiday_ot },
    { key: 'special_holiday_ot', label: 'Special Holiday OT', default: PHILIPPINES_DEFAULT_MULTIPLIERS_ADMIN.special_holiday_ot },
    { key: 'undertime', label: 'Undertime', default: PHILIPPINES_DEFAULT_MULTIPLIERS_ADMIN.undertime },
  ]

  multiplierFields.forEach((field) => {
    const currentValue = multipliersForm.value[`${field.key}_multiplier`]
    if (currentValue && currentValue !== '' && parseFloat(currentValue) !== field.default) {
      modifiedMultipliers.push({
        name: field.label,
        current: parseFloat(currentValue),
        standard: field.default,
      })
    }
  })

  if (modifiedMultipliers.length > 0) {
    const modifiedListHtml = modifiedMultipliers
      .map(
        (m) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #fde68a;">
          <span style="font-weight: 500;">${m.name}</span>
          <span>
            <span style="text-decoration: line-through; color: #9ca3af; margin-right: 12px;">×${m.standard.toFixed(2)}</span>
            <span style="color: #dc2626; font-weight: 600;">×${m.current.toFixed(2)}</span>
          </span>
        </div>
      `,
      )
      .join('')

    const confirmed = await new Promise((resolve) => {
      $q.dialog({
        title: '⚠️ Save Custom Company Multipliers?',
        message: `
          <div style="margin-top: 12px;">
            <p style="color: #92400e; font-size: 15px; margin-bottom: 16px; font-weight: 600;">
              You are setting company-wide custom multipliers
            </p>
            <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 16px;">
              These values will affect <strong>all employee payroll calculations</strong> and
              serve as "Standard" rates when creating new employee contracts.
            </p>
            <div style="background: #fef3c7; padding: 14px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 16px 0;">
              <p style="margin: 0 0 12px 0; color: #92400e; font-weight: 600; font-size: 14px;">
                Modified Values:
              </p>
              ${modifiedListHtml}
            </div>
            <p style="color: #dc2626; font-size: 13px; margin-top: 16px; font-style: italic;">
              ⚠️ Ensure compliance with Philippines Labor Code (DOLE standards)
            </p>
          </div>
        `,
        html: true,
        class: 'custom-multipliers-save-dialog',
        cancel: { label: 'Go Back & Edit', color: 'grey', flat: true },
        ok: { label: 'Save Custom Multipliers', color: 'warning', unelevated: true },
        persistent: true,
      })
        .onOk(() => resolve(true))
        .onCancel(() => resolve(false))
    })

    if (!confirmed) return
  }

  const payload = {
    company: companyId.value,
    ...multipliersForm.value,
  }
  try {
    if (customMultipliers.value) {
      await updateCustomMultipliers(companyId.value, payload)
    } else {
      await createCustomMultipliers(payload)
    }
    $q.notify({ type: 'positive', message: 'Multipliers saved successfully', position: 'top' })
    await loadMultipliers(companyId.value)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Failed to save multipliers',
      position: 'top',
    })
  }
}

onMounted(async () => {
  const { useCompany } = await import('@/composables/page/useCompany')
  const { companyId } = useCompany()
  if (companyId.value) await loadMultipliers(companyId.value)
})
</script>

<style scoped>
@import './AdminSettingsPanelShared.css';
.multipliers-body {
  padding: 24px;
}

.multipliers-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

@media (max-width: 700px) {
  .multipliers-grid {
    grid-template-columns: 1fr;
  }
}

.multiplier-card {
  background: #ffffff;
  border: 1px solid #e8ecf4;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.05);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.multiplier-card:hover {
  box-shadow: 0 4px 18px rgba(37, 99, 235, 0.1);
  border-color: #c7d7f8;
}

.multiplier-card-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.multiplier-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.multiplier-icon--overtime { background: #eff6ff; color: #2563eb; }
.multiplier-icon--night { background: #f5f3ff; color: #7c3aed; }
.multiplier-icon--regular { background: #fff7ed; color: #ea580c; }
.multiplier-icon--special { background: #f0fdf4; color: #16a34a; }
.multiplier-icon--regular-ot { background: #fef3c7; color: #d97706; }
.multiplier-icon--special-ot { background: #fce7f3; color: #db2777; }
.multiplier-icon--undertime { background: #f3f4f6; color: #4b5563; }

.multiplier-card-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.3;
}

.multiplier-card-desc {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
  line-height: 1.4;
}

.multiplier-input :deep(.q-field__control) {
  background: #f8faff !important;
  border-radius: 10px !important;
}

.multiplier-input :deep(.q-field__native) {
  font-size: 18px !important;
  font-weight: 700 !important;
  color: #1e293b !important;
}

.multiplier-prefix {
  font-size: 18px;
  font-weight: 700;
  color: #94a3b8;
  margin-right: 4px;
}
</style>
