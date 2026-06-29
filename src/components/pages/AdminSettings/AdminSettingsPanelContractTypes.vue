<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Contract Types</h2>
        <p class="table-subtitle">Manage contract type definitions</p>
      </div>
      <div class="table-actions">
        <q-btn
          color="primary"
          label="Add Contract Type"
          icon="add"
          class="add-btn"
          @click="openContractTypeDialog"
        />
      </div>
    </div>

    <div class="modern-table-container" :style="{ '--table-min-width': tableMinWidth + 'px' }">
      <template v-if="loadingContractTypes">
        <div class="table-skeleton">
          <div class="skeleton-header">
            <div class="skeleton-header-cell">Name</div>
            <div
              class="skeleton-header-cell"
              v-for="n in 6"
              :key="n"
              style="width: 50px; min-width: 50px"
            ></div>
            <div class="skeleton-header-cell" style="flex: 0 0 60px">Actions</div>
          </div>
          <div class="skeleton-row" v-for="n in 4" :key="n">
            <div class="skeleton-cell"><q-skeleton type="text" /></div>
            <div
              class="skeleton-cell"
              v-for="m in 10"
              :key="m"
              style="width: 50px; min-width: 50px"
            >
              <q-skeleton type="text" />
            </div>
            <div class="skeleton-cell" style="flex: 0 0 60px">
              <q-skeleton type="text" width="40px" />
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <q-table
          :rows="contractTypeDefinitions"
          :columns="tableColumns"
          row-key="id"
          flat
          no-data-label="No contract types found"
          class="settings-table spreadsheet-table"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header>
            <q-tr class="group-header-row">
              <q-th
                v-for="g in tableGroups"
                :key="g.label"
                class="group-header-cell"
                :colspan="g.cols.length"
                :class="{ 'group-start': g.start, 'group-end': g.end }"
              >
                {{ g.label }}
              </q-th>
            </q-tr>
            <q-tr class="table-header-row">
              <q-th
                v-for="col in tableColumns"
                :key="col.name"
                class="table-header-cell"
                :class="{
                  'group-first': col.groupFirst,
                  'col-elig': col.type === 'eligibility' || col.type === 'contribution',
                  'col-mult': col.type === 'multiplier',
                }"
              >
                <span class="header-label">{{ col.label }}</span>
                <q-tooltip
                  v-if="col.tooltip"
                  anchor="top middle"
                  self="bottom middle"
                  :offset="[0, 4]"
                >
                  {{ col.tooltip }}
                </q-tooltip>
              </q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td
                v-for="col in tableColumns"
                :key="col.name"
                class="table-body-cell"
                :class="{
                  'group-first': col.groupFirst,
                  'col-elig': col.type === 'eligibility' || col.type === 'contribution',
                  'col-mult': col.type === 'multiplier',
                }"
              >
                <template v-if="col.type === 'name'">
                  <span class="item-name" :title="props.row.name">{{ props.row.name }}</span>
                </template>
                <template v-else-if="col.type === 'eligibility'">
                  <span v-if="hasRowEligibility(props.row, col.id)" class="check-mark">✓</span>
                </template>
                <template v-else-if="col.type === 'contribution'">
                  <span v-if="hasRowContribution(props.row, col.id)" class="check-mark">✓</span>
                </template>
                <template v-else-if="col.type === 'multiplier'">
                  <span class="mult-value">{{ formatMultiplier(props.row[col.field]) }}</span>
                </template>
                <template v-else-if="col.type === 'actions'">
                  <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                    <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                      <q-list dense style="min-width: 150px">
                        <q-item
                          clickable
                          v-close-popup
                          class="dropdown-item"
                          @click="editContractType(props.row)"
                        >
                          <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                          <q-item-section>Edit</q-item-section>
                        </q-item>
                        <q-item
                          clickable
                          v-close-popup
                          class="dropdown-item dropdown-item-danger"
                          @click="deleteContractType(props.row)"
                        >
                          <q-item-section side
                            ><q-icon name="delete" size="16px" color="negative"
                          /></q-item-section>
                          <q-item-section>Delete</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </template>
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
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add"
              ><q-icon name="description" size="22px"
            /></q-avatar>
            <div>
              <div class="admin-modal-title">
                {{ editingContractType ? 'Edit' : 'Add' }} Contract Type
              </div>
              <div class="admin-modal-subtitle">Manage contract type definitions</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>
        <q-card-section class="admin-modal-content">
          <q-input v-model="contractTypeForm.name" label="Name *" outlined dense class="q-mb-md" />
          <q-select
            v-model="contractTypeForm.pay_type"
            :options="[
              { label: 'Monthly', value: 'monthly' },
              { label: 'Daily', value: 'daily' },
            ]"
            label="Pay Type"
            outlined
            dense
            emit-value
            map-options
            class="q-mb-md"
          />
          <q-input
            v-if="contractTypeForm.pay_type === 'daily'"
            v-model.number="contractTypeForm.work_hours_per_week"
            label="Work Hours Per Week"
            outlined
            dense
            type="number"
            min="0"
            max="48"
            :rules="[(val) => !val || val <= 48 || 'Maximum is 48 hours']"
            class="q-mb-md"
          />
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
            <div class="col-6 q-mb-sm" v-if="ctoId && contractTypeForm.pay_type === 'monthly'">
              <q-checkbox
                :model-value="contractTypeForm.eligibilities.includes(ctoId)"
                @update:model-value="toggleEligibility(ctoId, $event)"
                label="Overtime Converted to CTO"
                dense
              />
            </div>
            <div class="col-6 q-mb-sm" v-if="holidayPayId">
              <q-checkbox
                :model-value="contractTypeForm.eligibilities.includes(holidayPayId)"
                @update:model-value="toggleEligibility(holidayPayId, $event)"
                label="Holiday Pay"
                dense
              />
            </div>
            <div class="col-6 q-mb-sm" v-if="undertimeId">
              <q-checkbox
                :model-value="contractTypeForm.eligibilities.includes(undertimeId)"
                @update:model-value="toggleEligibility(undertimeId, $event)"
                label="Undertime Deduction"
                dense
              />
            </div>
            <div class="col-6 q-mb-sm" v-if="nightDiffId">
              <q-checkbox
                :model-value="contractTypeForm.eligibilities.includes(nightDiffId)"
                @update:model-value="toggleEligibility(nightDiffId, $event)"
                label="Night Differential Eligible"
                dense
              />
            </div>
            <div class="col-6 q-mb-sm" v-if="hasContributionsId">
              <q-checkbox
                :model-value="contractTypeForm.eligibilities.includes(hasContributionsId)"
                @update:model-value="toggleEligibility(hasContributionsId, $event)"
                label="Contributions"
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

          <template
            v-if="
              !hasContributionsId || contractTypeForm.eligibilities.includes(hasContributionsId)
            "
          >
            <div class="text-subtitle2 q-mb-xs q-mt-md">Contributions</div>
            <q-separator class="q-mb-md" />
            <div class="row">
              <div v-for="item in contributions" :key="item.id" class="col-6 q-mb-sm">
                <q-checkbox
                  :model-value="contractTypeForm.contributions.includes(item.id)"
                  @update:model-value="toggleContribution(item.id, $event)"
                  :label="item.name"
                  dense
                />
              </div>
            </div>
          </template>

          <template v-if="holidayPayId && contractTypeForm.eligibilities.includes(holidayPayId)">
            <div class="text-subtitle2 q-mb-xs q-mt-md">Holiday</div>
            <q-separator class="q-mb-md" />
            <div class="row">
              <div class="col-6 q-mb-sm">
                <q-checkbox
                  v-model="contractTypeForm.special_holiday_enabled"
                  label="Special Holiday"
                  dense
                />
              </div>
              <div class="col-6 q-mb-sm">
                <q-checkbox
                  v-model="contractTypeForm.regular_holiday_enabled"
                  label="Regular Holiday"
                  dense
                />
              </div>
            </div>
          </template>

          <div class="text-subtitle2 q-mb-xs q-mt-md">Payroll Multipliers</div>
          <q-separator class="q-mb-md" />
          <div class="multipliers-section">
            <div v-for="field in visibleMultiplierFields" :key="field.key" class="multiplier-row">
              <div class="multiplier-info">
                <q-icon :name="field.icon" size="20px" class="multiplier-icon" />
                <div class="multiplier-details">
                  <div class="multiplier-label">{{ field.label }}</div>
                  <div class="multiplier-desc">{{ field.desc }}</div>
                </div>
              </div>
              <div class="multiplier-controls">
                <div class="multiplier-value-wrapper">
                  <q-input
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
                      <span class="multiplier-badge" @click="clearMultiplier(field.key)">×</span>
                    </template>
                  </q-input>
                </div>
              </div>
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn color="primary" label="Save" class="admin-save-btn" :loading="savingContractType" @click="handleSave" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showGovWarning" persistent>
      <q-card class="admin-modal-card" style="max-width: 520px">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" color="negative" text-color="white">
              <q-icon name="warning" size="22px" />
            </q-avatar>
            <div>
              <div class="admin-modal-title">Government Compliance Warning</div>
              <div class="admin-modal-subtitle">Government Mandated Multiplier Requirements</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>
        <q-card-section class="admin-modal-content">
          <div class="text-body2 q-mb-md">
            The following multipliers are set for this contract type. Values below government
            minimums may violate regulatory requirements.
          </div>
          <q-list dense class="gov-violations-list">
            <q-item v-for="item in govViolations" :key="item.key" class="gov-violation-item">
              <q-item-section>
                <div class="row items-center no-wrap">
                  <q-icon
                    :name="item.isViolation ? 'error' : 'check_circle'"
                    :color="item.isViolation ? 'negative' : 'positive'"
                    size="20px"
                    class="q-mr-sm"
                  />
                  <div>
                    <div class="text-weight-bold" style="font-size: 13px">{{ item.label }}</div>
                    <div class="text-caption text-grey">
                      Current:
                      <span :class="item.isViolation ? 'text-negative text-weight-bold' : ''">
                        ×{{ item.currentValue.toFixed(2) }}
                      </span>
                      &nbsp;|&nbsp; Minimum: ×{{ item.minStandard.toFixed(2) }}
                    </div>
                  </div>
                </div>
              </q-item-section>
            </q-item>
          </q-list>
          <q-banner class="gov-banner q-mt-md" rounded>
            <template v-slot:avatar>
              <q-icon name="info" color="orange-8" />
            </template>
            <div class="text-caption text-grey-8">
              <strong>Legal Notice:</strong> Setting multipliers below government standards may
              expose your company to penalties, back-pay claims, and labor disputes. Ensure
              compliance with regulations.
            </div>
          </q-banner>
        </q-card-section>
        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn color="negative" label="I Understand, Proceed" @click="confirmGovSave" />
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
  contributions,
  loading: loadingContractTypes,
  saving: savingContractType,
  dialog: contractTypeDialog,
  editing: editingContractType,
  form: contractTypeForm,
  fetchContractTypes: fetchContractTypeDefs,
  fetchEligibilities,
  fetchContributions,
  openDialog: openContractTypeDialog,
  editContractType,
  saveContractType,
  deleteContractType,
  companyMultipliers,
  PHILIPPINES_DEFAULT_MULTIPLIERS,
} = useAdminContractTypes()

const GOV_MINIMUM_MULTIPLIERS = {
  overtime: 1.25,
  special_holiday: 1.3,
  regular_holiday: 2.0,
  night_diff: 1.1,
  regular_holiday_ot: 2.6,
  special_holiday_ot: 1.69,
  undertime: 1.0,
}

const showGovWarning = ref(false)
const govViolations = ref([])

const checkGovCompliance = () => {
  const items = []
  let hasAnyEnabled = false
  let allStandard = true

  for (const field of multiplierFields) {
    if (!isMultiplierVisible(field.key)) continue
    hasAnyEnabled = true
    const currentValue = parseFloat(contractTypeForm.value[`${field.key}_multiplier`]) || 0
    const minStandard = GOV_MINIMUM_MULTIPLIERS[field.key]
    const dovStandard = PHILIPPINES_DEFAULT_MULTIPLIERS[field.key]
    if (currentValue !== dovStandard) {
      allStandard = false
    }
    items.push({
      ...field,
      currentValue,
      minStandard,
      isViolation: currentValue < minStandard,
    })
  }

  govViolations.value = items
  return { hasAnyEnabled, allStandard }
}

const handleSave = () => {
  const { hasAnyEnabled, allStandard } = checkGovCompliance()
  if (!hasAnyEnabled || allStandard) {
    saveContractType()
    return
  }
  showGovWarning.value = true
}

const confirmGovSave = () => {
  showGovWarning.value = false
  saveContractType()
}

const MULTIPLIER_COLUMNS = [
  { key: 'overtime', label: 'OT', fullLabel: 'Overtime' },
  { key: 'regular_holiday', label: 'RH', fullLabel: 'Regular Holiday' },
  { key: 'special_holiday', label: 'SH', fullLabel: 'Special Holiday' },
  { key: 'night_diff', label: 'ND', fullLabel: 'Night Differential' },
  { key: 'regular_holiday_ot', label: 'ROT', fullLabel: 'Regular Holiday OT' },
  { key: 'special_holiday_ot', label: 'SOT', fullLabel: 'Special Holiday OT' },
  { key: 'undertime', label: 'UT', fullLabel: 'Undertime' },
]

const COLUMN_ABBREVIATIONS = {
  'Overtime Eligible': 'OT',
  'Overtime Converted to CTO': 'CTO',
  'Holiday Pay': 'HOL',
  'Undertime Deduction': 'UTD',
  'Night Differential Eligible': 'ND',
  Contributions: 'CONT',
  '13th Month': '13TH',
  Taxable: 'TAX',
}

function getContributionShort(name) {
  const lower = name.toLowerCase()
  if (lower.includes('sss') || lower.includes('social')) return 'S'
  if (lower.includes('philhealth')) return 'H'
  if (lower.includes('pagibig') || lower.includes('pag-ibig')) return 'P'
  return name.length > 7 ? name.substring(0, 7) : name
}

function getShortName(name) {
  if (COLUMN_ABBREVIATIONS[name]) return COLUMN_ABBREVIATIONS[name]
  const cleaned = name
    .replace(/ (Eligible|Pay|Deduction|Fee|Contribution)$/gi, '')
    .replace(/^Employee /i, '')
  if (cleaned.length <= 5) return cleaned.toUpperCase()
  const words = cleaned.split(/\s+/)
  if (words.length >= 2) {
    return words
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .substring(0, 5)
  }
  return cleaned.substring(0, 5).toUpperCase()
}

function hasRowEligibility(row, eligibilityId) {
  if (row.eligibility_details?.length) {
    return row.eligibility_details.some((el) => el.id === eligibilityId)
  }
  return row.eligibilities?.includes(eligibilityId) ?? false
}

function hasRowContribution(row, contributionId) {
  if (row.contribution_details?.length) {
    return row.contribution_details.some((c) => c.id === contributionId)
  }
  return row.contributions?.includes(contributionId) ?? false
}

function formatMultiplier(value) {
  if (value == null || value === '') return '-'
  const num = Number(value)
  return isNaN(num) ? '-' : num.toFixed(2)
}

const tableColumns = computed(() => {
  const cols = [
    { name: 'name', label: 'Name', type: 'name', group: null, tooltip: null, sortable: true },
  ]
  let prevGroup = null
  function push(col) {
    col.groupFirst = col.group && col.group !== prevGroup
    prevGroup = col.group
    cols.push(col)
  }
  for (const el of eligibilities.value) {
    if (el.name === 'Work Hours Flexible' || el.name === 'Work Hours Strict') continue
    push({
      name: `el_${el.id}`,
      label: getShortName(el.name),
      type: 'eligibility',
      group: 'Eligibilities',
      id: el.id,
      tooltip: el.name,
    })
  }
  for (const c of contributions.value) {
    const short = getContributionShort(c.name)
    push({
      name: `contrib_${c.id}`,
      label: short,
      type: 'contribution',
      group: 'Contributions',
      id: c.id,
      tooltip: c.name,
    })
  }
  for (const mc of MULTIPLIER_COLUMNS) {
    push({
      name: `mult_${mc.key}`,
      label: mc.label,
      type: 'multiplier',
      group: 'Multipliers',
      field: `${mc.key}_multiplier`,
      tooltip: mc.fullLabel,
    })
  }
  cols.push({ name: 'actions', label: '', type: 'actions', group: null, tooltip: null })
  return cols
})

// Column widths must stay in sync with the CSS widths set on
// .col-elig / .col-mult / :first-child / :last-child below.
const NAME_COL_WIDTH = 180
const NARROW_COL_WIDTH = 38 // eligibility / contribution columns
const MULT_COL_WIDTH = 40 // multiplier columns
const ACTIONS_COL_WIDTH = 52

const tableMinWidth = computed(() =>
  tableColumns.value.reduce((total, col) => {
    if (col.type === 'name') return total + NAME_COL_WIDTH
    if (col.type === 'actions') return total + ACTIONS_COL_WIDTH
    if (col.type === 'multiplier') return total + MULT_COL_WIDTH
    return total + NARROW_COL_WIDTH // eligibility / contribution
  }, 0),
)

const tableGroups = computed(() => {
  const groups = []
  let current = null
  let first = true
  for (const col of tableColumns.value) {
    if (first || col.group !== current) {
      if (!first) groups[groups.length - 1].end = true
      groups.push({ label: col.group || '', cols: [col], start: true, end: false })
      current = col.group
      first = false
    } else {
      groups[groups.length - 1].cols.push(col)
    }
  }
  if (groups.length) groups[groups.length - 1].end = true
  return groups
})

const overtimeId = computed(
  () => eligibilities.value.find((e) => e.name === 'Overtime Eligible')?.id,
)
const ctoId = computed(
  () => eligibilities.value.find((e) => e.name === 'Overtime Converted to CTO')?.id,
)
const holidayPayId = computed(() => eligibilities.value.find((e) => e.name === 'Holiday Pay')?.id)
const undertimeId = computed(
  () => eligibilities.value.find((e) => e.name === 'Undertime Deduction')?.id,
)
const nightDiffId = computed(
  () => eligibilities.value.find((e) => e.name === 'Night Differential Eligible')?.id,
)
const hasContributionsId = computed(
  () => eligibilities.value.find((e) => e.name === 'Contributions')?.id,
)

const dedicatedEligibilityNames = [
  'Overtime Eligible',
  'Overtime Converted to CTO',
  'Holiday Pay',
  'Undertime Deduction',
  'Night Differential Eligible',
  'Contributions',
]

const eligibilityOptions = computed(() =>
  eligibilities.value
    .filter((e) => {
      if (e.name === 'Work Hours Flexible' || e.name === 'Work Hours Strict') return false
      if (dedicatedEligibilityNames.includes(e.name)) return false
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

    // Pre-fill associated multiplier(s) with default when eligibility is checked
    const eligibilityToMultipliers = {}
    if (overtimeId.value) eligibilityToMultipliers[overtimeId.value] = ['overtime']
    if (holidayPayId.value)
      eligibilityToMultipliers[holidayPayId.value] = [
        'regular_holiday',
        'special_holiday',
        'regular_holiday_ot',
        'special_holiday_ot',
      ]
    if (undertimeId.value) eligibilityToMultipliers[undertimeId.value] = ['undertime']
    if (nightDiffId.value) eligibilityToMultipliers[nightDiffId.value] = ['night_diff']

    const keys = eligibilityToMultipliers[id]
    if (keys) {
      for (const key of keys) {
        if (
          contractTypeForm.value[`${key}_multiplier`] == null ||
          contractTypeForm.value[`${key}_multiplier`] === ''
        ) {
          contractTypeForm.value[`${key}_multiplier`] = getStandardDisplay(key)
        }
      }
    }

    if (holidayPayId.value && id === holidayPayId.value) {
      contractTypeForm.value.special_holiday_enabled = true
      contractTypeForm.value.regular_holiday_enabled = true
    }
  } else {
    contractTypeForm.value.eligibilities = current.filter((eid) => eid !== id)
    if (hasContributionsId.value && id === hasContributionsId.value) {
      contractTypeForm.value.contributions = []
    }
  }
}

function toggleContribution(id, checked) {
  if (checked) {
    contractTypeForm.value.contributions = [...contractTypeForm.value.contributions, id]
  } else {
    contractTypeForm.value.contributions = contractTypeForm.value.contributions.filter(
      (c) => c !== id,
    )
  }
}

function isMultiplierVisible(fieldKey) {
  const map = {
    overtime: overtimeId,
    regular_holiday_ot: holidayPayId,
    special_holiday_ot: holidayPayId,
    regular_holiday: holidayPayId,
    special_holiday: holidayPayId,
    night_diff: nightDiffId,
    undertime: undertimeId,
  }
  const eligibilityId = map[fieldKey]?.value
  if (!eligibilityId) return true
  if (!contractTypeForm.value.eligibilities.includes(eligibilityId)) return false

  if (fieldKey === 'special_holiday' || fieldKey === 'special_holiday_ot')
    return contractTypeForm.value.special_holiday_enabled
  if (fieldKey === 'regular_holiday' || fieldKey === 'regular_holiday_ot')
    return contractTypeForm.value.regular_holiday_enabled

  return true
}

const multiplierFields = [
  { key: 'overtime', label: 'Overtime', icon: 'schedule', desc: 'Work beyond 8 hours/day' },
  {
    key: 'special_holiday',
    label: 'Special Holiday',
    icon: 'celebration',
    desc: 'Special non-working days',
  },
  {
    key: 'regular_holiday',
    label: 'Regular Holiday',
    icon: 'event',
    desc: 'Regular holidays (double pay)',
  },
  { key: 'night_diff', label: 'Night Differential', icon: 'nights_stay', desc: 'Work 10PM-6AM' },
  {
    key: 'regular_holiday_ot',
    label: 'Regular Holiday OT',
    icon: 'event_note',
    desc: 'OT on regular holidays',
  },
  {
    key: 'special_holiday_ot',
    label: 'Special Holiday OT',
    icon: 'event_busy',
    desc: 'OT on special holidays',
  },
  { key: 'undertime', label: 'Undertime', icon: 'timer_off', desc: 'Hours not worked' },
]

const visibleMultiplierFields = computed(() =>
  multiplierFields.filter((f) => isMultiplierVisible(f.key)),
)

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
    const isMonthly = contractTypeForm.value.pay_type === 'monthly'

    // Overtime is checked but CTO is not -> auto-check CTO (only when monthly)
    if (hasOvertime && !hasCto && isMonthly) {
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
    // If switched to daily, remove CTO from eligibilities
    if (newVal === 'daily') {
      if (current.includes(ctoId.value)) {
        contractTypeForm.value.eligibilities = current.filter((id) => id !== ctoId.value)
      }
      return
    }
    // If switched to monthly, auto-check CTO if Overtime is checked
    if (newVal === 'monthly') {
      if (
        overtimeId.value &&
        current.includes(overtimeId.value) &&
        !current.includes(ctoId.value)
      ) {
        contractTypeForm.value.eligibilities = [...current, ctoId.value]
      }
    }
  },
  { immediate: true },
)

const clearMultiplier = (fieldKey) => {
  contractTypeForm.value[`${fieldKey}_multiplier`] = null
}

onMounted(async () => {
  await fetchContractTypeDefs()
  await fetchEligibilities()
  await fetchContributions()
})
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

/* ── Component-Specific Styles ── */

.table-section {
  width: 0;
  min-width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.modern-table-container {
  overflow-x: auto;
  width: 0;
  min-width: 100%;
  max-width: 100%;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

/* Visible scrollbar so the horizontal scroll is discoverable */
.modern-table-container::-webkit-scrollbar {
  height: 10px;
}

.modern-table-container::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.modern-table-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 6px;
}

.modern-table-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.spreadsheet-table {
  width: 100%;
  min-width: 100%;
}

.spreadsheet-table :deep(.q-table__card) {
  box-shadow: none;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: visible;
}

.spreadsheet-table :deep(.q-table__container) {
  overflow: visible;
}

/* The real horizontal scroll happens on .modern-table-container; this just
   needs to not clip and let the table grow to its natural width */
.spreadsheet-table :deep(.q-table__middle) {
  overflow: visible;
}

.spreadsheet-table :deep(.q-table__middle > table),
.spreadsheet-table :deep(.q-table__middle > .q-table) {
  width: auto;
  min-width: max(var(--table-min-width, 1200px), 100%);
  border-collapse: collapse;
  white-space: nowrap;
  table-layout: fixed;
}

/* ── Group header row ── */

.spreadsheet-table :deep(.group-header-row th) {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #334155;
  background: #f1f5f9;
  border-bottom: 2px solid #cbd5e1;
  padding: 5px 4px;
  text-align: center;
}

.spreadsheet-table :deep(.group-header-row th:first-child) {
  text-align: left;
  padding-left: 10px;
  border-right: 2px solid #cbd5e1;
}

.spreadsheet-table :deep(.group-header-row th.group-end) {
  border-right: none;
}

/* vertical group separators */
.spreadsheet-table :deep(.group-header-row th:not(.group-end)) {
  border-right: 2px solid #cbd5e1;
}

/* ── Column header row ── */

.spreadsheet-table :deep(.table-header-row th) {
  font-size: 10px !important;
  font-weight: 700 !important;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: #475569 !important;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0 !important;
  padding: 4px 2px !important;
  text-align: center !important;
  white-space: nowrap;
  min-width: 0;
}

.spreadsheet-table :deep(.table-header-row th.col-elig) {
  min-width: 38px;
  width: 38px;
  padding: 4px 2px !important;
  font-size: 10px !important;
}

.spreadsheet-table :deep(.table-header-row th.col-mult) {
  min-width: 40px;
  width: 40px;
  padding: 4px 2px !important;
}

.spreadsheet-table :deep(.table-header-row th:first-child) {
  text-align: left !important;
  min-width: 180px;
  width: 180px;
  padding-left: 12px !important;
  padding-right: 12px !important;
  position: sticky;
  left: 0;
  z-index: 3;
  background: #f8fafc;
  overflow: hidden;
  text-overflow: ellipsis;
  border-right: 2px solid #e2e8f0;
}

.spreadsheet-table :deep(.table-header-row th:last-child) {
  min-width: 52px;
  max-width: 52px;
  width: 52px;
  padding: 2px !important;
  position: sticky;
  right: 0;
  z-index: 3;
  background: #f8fafc;
}

.header-label {
  cursor: help;
  border-bottom: 1px dashed #94a3b8;
}

/* ── Body cells ── */

.spreadsheet-table :deep(.q-table tbody td) {
  text-align: center !important;
  padding: 4px 2px !important;
  font-size: 12px;
  border-bottom: 1px solid #f1f5f9 !important;
  vertical-align: middle;
  min-width: 0;
}

.spreadsheet-table :deep(.q-table tbody td.col-elig) {
  min-width: 38px;
  width: 38px;
  padding: 4px 2px !important;
}

.spreadsheet-table :deep(.q-table tbody td.col-mult) {
  min-width: 40px;
  width: 40px;
  padding: 4px 2px !important;
}

.spreadsheet-table :deep(.q-table tbody td:first-child) {
  text-align: left !important;
  min-width: 180px;
  width: 180px;
  padding: 6px 12px !important;
  font-size: 12px;
  color: #1e293b;
  font-weight: 500;
  position: sticky;
  left: 0;
  z-index: 1;
  background: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  border-right: 2px solid #e2e8f0;
}

.spreadsheet-table :deep(.q-table tbody td:last-child) {
  min-width: 52px;
  max-width: 52px;
  width: 52px;
  padding: 2px !important;
  position: sticky;
  right: 0;
  z-index: 1;
  background: #fff;
  text-align: center !important;
}

/* hover highlight for sticky cells too */
.spreadsheet-table :deep(.q-table tbody tr:hover td:first-child),
.spreadsheet-table :deep(.q-table tbody tr:hover td:last-child) {
  background-color: #f8fafc;
}

.spreadsheet-table :deep(.q-table tbody tr:last-child td) {
  border-bottom: none;
}

/* ── Group column separators in body (adds left border to first col of each group except name) ── */

.spreadsheet-table :deep(.q-table tbody td.group-first:not(:nth-child(2))) {
  border-left: 2px solid #e2e8f0;
}

/* ── Checkmark and multiplier styles ── */

.action-menu-btn {
  width: 28px;
  height: 28px;
  min-height: 28px;
}

.action-menu-btn :deep(.q-icon) {
  font-size: 18px;
}

.check-mark {
  color: #16a34a;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.mult-value {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  font-variant-numeric: tabular-nums;
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
  background: #102335;
  color: white;
  font-weight: 700;
  font-size: 13px;
  border-radius: 6px;
  margin-right: 4px;
  cursor: pointer;
  user-select: none;
}
.multiplier-badge:hover {
  background: #193d5c;
}

.multiplier-badge:hover {
  background: #dc2626;
}

.multiplier-input.modern-input :deep(.q-field__prepend) {
  padding-right: 0;
  padding-left: 8px;
}

.gov-violations-list {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 4px 0;
}

.gov-violation-item {
  min-height: 40px;
}

.gov-banner {
  background: #fff7ed;
  border: 1px solid #fed7aa;
}

@media (max-width: 768px) {
  .multiplier-controls {
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
  }
}
</style>
