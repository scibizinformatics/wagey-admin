<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Custom multipliers</h2>
        <p class="table-subtitle">Configure pay multipliers for your company</p>
      </div>
      <div class="table-actions">
        <q-btn
          color="primary"
          :label="customMultipliers ? 'Update multipliers' : 'Set multipliers'"
          icon="tune"
          class="add-btn"
          :loading="savingMultipliers || saving"
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
          <q-input
            v-model="multipliersForm.overtime_multiplier"
            outlined
            dense
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 1.25"
            class="multiplier-input"
          >
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
          <q-input
            v-model="multipliersForm.night_diff_multiplier"
            outlined
            dense
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 1.10"
            class="multiplier-input"
          >
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
          <q-input
            v-model="multipliersForm.regular_holiday_multiplier"
            outlined
            dense
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 2.00"
            class="multiplier-input"
          >
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
          <q-input
            v-model="multipliersForm.special_holiday_multiplier"
            outlined
            dense
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 1.30"
            class="multiplier-input"
          >
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
          <q-input
            v-model="multipliersForm.regular_holiday_ot_multiplier"
            outlined
            dense
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 2.60"
            class="multiplier-input"
          >
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
          <q-input
            v-model="multipliersForm.special_holiday_ot_multiplier"
            outlined
            dense
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 1.95"
            class="multiplier-input"
          >
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
          <q-input
            v-model="multipliersForm.undertime_multiplier"
            outlined
            dense
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 0.50"
            class="multiplier-input"
          >
            <template v-slot:prepend><span class="multiplier-prefix">×</span></template>
          </q-input>
        </div>
      </div>
    </div>

    <CustomMultipliersConfirmDialog
      v-model="confirmOpen"
      :changes="pendingChanges"
      :saving="saving"
      @confirm="onConfirmSave"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import CustomMultipliersConfirmDialog from './CustomMultipliersConfirmDialog.vue'
import { extractErrorMessage } from '@/composables/utils/http'
import { usePayroll } from '@/composables/page/usePayroll'
import { useToast } from '@/composables/useToast'

const confirmOpen = ref(false)
const pendingChanges = ref([])
const saving = ref(false)
const toast = useToast()
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
  night_diff: 1.1,
  regular_holiday: 2.0,
  special_holiday: 1.3,
  regular_holiday_ot: 2.6,
  special_holiday_ot: 1.95,
  undertime: 0.5,
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
    toast.warning('Please select a company first')
    return
  }

  const modifiedMultipliers = []
  const multiplierFields = [
    { key: 'overtime', label: 'Overtime', default: PHILIPPINES_DEFAULT_MULTIPLIERS_ADMIN.overtime },
    {
      key: 'night_diff',
      label: 'Night Differential',
      default: PHILIPPINES_DEFAULT_MULTIPLIERS_ADMIN.night_diff,
    },
    {
      key: 'regular_holiday',
      label: 'Regular Holiday',
      default: PHILIPPINES_DEFAULT_MULTIPLIERS_ADMIN.regular_holiday,
    },
    {
      key: 'special_holiday',
      label: 'Special Holiday',
      default: PHILIPPINES_DEFAULT_MULTIPLIERS_ADMIN.special_holiday,
    },
    {
      key: 'regular_holiday_ot',
      label: 'Regular Holiday OT',
      default: PHILIPPINES_DEFAULT_MULTIPLIERS_ADMIN.regular_holiday_ot,
    },
    {
      key: 'special_holiday_ot',
      label: 'Special Holiday OT',
      default: PHILIPPINES_DEFAULT_MULTIPLIERS_ADMIN.special_holiday_ot,
    },
    {
      key: 'undertime',
      label: 'Undertime',
      default: PHILIPPINES_DEFAULT_MULTIPLIERS_ADMIN.undertime,
    },
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

  // The confirmation is a component (CustomMultipliersConfirmDialog), not an
  // HTML string handed to `$q.dialog({ html: true })`. It carries a list of
  // before-and-after values, and that is content: it belongs in a template
  // where the design system can reach it.
  if (modifiedMultipliers.length > 0) {
    pendingChanges.value = modifiedMultipliers
    confirmOpen.value = true
    return
  }

  await commitMultipliers(companyId.value)
}

/** Runs once the dialog is confirmed, or straight away when nothing differs
 *  from the Philippine standards and there is nothing to confirm. */
async function commitMultipliers(company) {
  const payload = {
    company,
    ...multipliersForm.value,
  }
  saving.value = true
  try {
    if (customMultipliers.value) {
      await updateCustomMultipliers(company, payload)
    } else {
      await createCustomMultipliers(payload)
    }
    toast.success('Multipliers saved')
    confirmOpen.value = false
    await loadMultipliers(company)
  } catch (error) {
    toast.error(extractErrorMessage(error, 'Failed to save multipliers'))
  } finally {
    saving.value = false
  }
}

/** The company is re-resolved here rather than captured when the dialog opened:
 *  the workspace switcher can move under a dialog that is still on screen. */
async function onConfirmSave() {
  const { useCompany } = await import('@/composables/page/useCompany')
  const { companyId } = useCompany()
  if (!companyId.value) {
    toast.warning('Select a company first')
    confirmOpen.value = false
    return
  }
  await commitMultipliers(companyId.value)
}

onMounted(async () => {
  const { useCompany } = await import('@/composables/page/useCompany')
  const { companyId } = useCompany()
  if (companyId.value) await loadMultipliers(companyId.value)
})
</script>

<style scoped lang="scss">
/* Card, icon tile, title, description, input and prefix are all defined in the
   shared file now. This block used to restate every one of them after the
   import — at 44px tiles with seven different background tints — so the shared
   definitions never applied. */
@import './AdminSettingsPanelShared.scss';
</style>
