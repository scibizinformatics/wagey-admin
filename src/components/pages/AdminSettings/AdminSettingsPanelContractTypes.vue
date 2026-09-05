<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Contract Types</h2>
        <p class="table-subtitle">Manage contract type definitions</p>
      </div>
      <div class="table-actions">
        <!-- Column groups. Multipliers are the rightmost of three groups behind
             a dozen narrow check columns, so on any screen short of a wide
             desktop they were off the right edge and the only way to them was a
             horizontal scroll most people never tried. Picking one group brings
             it to full width immediately. -->
        <div class="col-groups" role="group" aria-label="Columns to show">
          <button
            v-for="option in groupOptions"
            :key="option.value"
            type="button"
            class="col-groups__btn"
            :class="{ 'is-on': visibleGroup === option.value }"
            :aria-pressed="visibleGroup === option.value"
            @click="visibleGroup = option.value"
          >
            {{ option.label }}
          </button>
        </div>
        <q-btn
          color="primary"
          label="Add contract type"
          icon="add"
          class="add-btn"
          @click="openContractTypeDialog"
        />
      </div>
    </div>

    <!-- Plain wrapper: the table scrolls inside its own `.q-table__middle`, which
         is the element Quasar makes the scrollport. -->
    <div class="modern-table-container">
      <!-- Built from the same `tableColumns` as the live table, with the summed
           column widths as its own min-width — the real table sizes itself to
           its content, which a skeleton with no content cannot do. The old one
           hard-coded six header cells above ten body cells, neither matching the
           real column count. -->
      <template v-if="loadingContractTypes">
        <TableSkeleton
          :columns="skeletonColumns"
          :rows="5"
          :min-width="tableMinWidth"
          wrap-class="dash-scroll-x"
          aria-label="Loading contract types"
        />
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
      <q-card class="dash-modal">
        <q-card-section class="dash-modal__head">
          <div class="dash-modal__head-main">
            <q-avatar size="38px" class="dash-modal__head-icon"
              ><q-icon name="description" size="22px"
            /></q-avatar>
            <div class="dash-modal__head-titles">
              <div class="dash-modal__title">
                {{ editingContractType ? 'Edit' : 'Add' }} Contract Type
              </div>
              <div class="dash-modal__sub">Manage contract type definitions</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
        </q-card-section>
        <q-card-section class="dash-modal__body">
          <label class="dash-modal__field">
            <span class="dash-modal__field-label">Name<span class="dash-modal__req">*</span></span>
            <q-input
              v-model="contractTypeForm.name"
              outlined
              dense
              class="dash-field"
              hide-bottom-space
            />
          </label>
          <label class="dash-modal__field">
            <span class="dash-modal__field-label">Pay type</span>
            <q-select
              v-model="contractTypeForm.pay_type"
              :options="[
                { label: 'Monthly', value: 'monthly' },
                { label: 'Daily', value: 'daily' },
              ]"
              outlined
              dense
              emit-value
              map-options
              class="dash-field"
              hide-bottom-space
              popup-content-class="dash-popup dash-popup--modal"
            />
          </label>
          <label v-if="contractTypeForm.pay_type === 'daily'" class="dash-modal__field">
            <span class="dash-modal__field-label">Work hours per week</span>
            <q-input
              v-model.number="contractTypeForm.work_hours_per_week"
              outlined
              dense
              type="number"
              min="0"
              max="48"
              :rules="[(val) => !val || val <= 48 || 'Maximum is 48 hours']"
              class="dash-field"
              hide-bottom-space
            />
          </label>
          <div class="section-label">Eligibilities</div>
          <label class="dash-modal__field">
            <span class="dash-modal__field-label">Work Hours Type</span>
            <q-select
              v-model="contractTypeForm.work_hours_type"
              :options="[
                { label: 'Work Hours Flexible', value: 'flexible' },
                { label: 'Work Hours Strict', value: 'strict' },
              ]"
              outlined
              dense
              emit-value
              map-options
              clearable
              class="dash-field"
              hide-bottom-space
              popup-content-class="dash-popup dash-popup--modal"
            />
          </label>
          <div class="row">
            <div class="col-6 q-mb-sm" v-if="overtimeId">
              <q-checkbox
                :model-value="contractTypeForm.eligibilities.includes(overtimeId)"
                @update:model-value="toggleEligibility(overtimeId, $event)"
                label="Overtime eligible"
                dense
              />
            </div>
            <div class="col-6 q-mb-sm" v-if="ctoId && contractTypeForm.pay_type === 'monthly'">
              <q-checkbox
                :model-value="contractTypeForm.eligibilities.includes(ctoId)"
                @update:model-value="toggleEligibility(ctoId, $event)"
                label="Overtime converted to CTO"
                dense
              />
            </div>
            <div class="col-6 q-mb-sm" v-if="holidayPayId">
              <q-checkbox
                :model-value="contractTypeForm.eligibilities.includes(holidayPayId)"
                @update:model-value="toggleEligibility(holidayPayId, $event)"
                label="Holiday pay"
                dense
              />
            </div>
            <div class="col-6 q-mb-sm" v-if="undertimeId">
              <q-checkbox
                :model-value="contractTypeForm.eligibilities.includes(undertimeId)"
                @update:model-value="toggleEligibility(undertimeId, $event)"
                label="Undertime deduction"
                dense
              />
            </div>
            <div class="col-6 q-mb-sm" v-if="nightDiffId">
              <q-checkbox
                :model-value="contractTypeForm.eligibilities.includes(nightDiffId)"
                @update:model-value="toggleEligibility(nightDiffId, $event)"
                label="Night differential eligible"
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
            <div class="section-label">Contributions</div>
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
            <div class="section-label">Holiday</div>
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

          <div class="section-label">Payroll Multipliers</div>
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
                    v-model="contractTypeForm[field.key + '_multiplier']"
                    type="number"
                    step="0.01"
                    min="0"
                    outlined
                    dense
                    class="multiplier-input"
                    placeholder="e.g. 1.50"
                  />
                </div>
              </div>
            </div>
          </div>
        </q-card-section>
        <q-card-actions class="dash-modal__foot">
          <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" v-close-popup />
          <q-btn
            label="Save"
            no-caps
            class="dash-modal__submit"
            :loading="savingContractType"
            @click="handleSave"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showGovWarning" persistent>
      <q-card class="dash-modal">
        <q-card-section class="dash-modal__head">
          <div class="dash-modal__head-main">
            <q-avatar size="44px" color="negative" text-color="white">
              <q-icon name="warning" size="22px" />
            </q-avatar>
            <div class="dash-modal__head-titles">
              <div class="dash-modal__title">Government Compliance Warning</div>
              <div class="dash-modal__sub">Government Mandated Multiplier Requirements</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
        </q-card-section>
        <q-card-section class="dash-modal__body">
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
        <q-card-actions class="dash-modal__foot">
          <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" v-close-popup />
          <q-btn color="negative" label="I Understand, Proceed" @click="confirmGovSave" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
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

/**
 * Which column groups the table shows. `all` is the default and the only value a
 * wide desktop needs; the three single-group values exist so the multiplier
 * columns are reachable on a laptop or tablet without a horizontal scroll past
 * every eligibility and contribution column.
 */
const visibleGroup = ref('all')

const groupOptions = [
  { value: 'all', label: 'All' },
  { value: 'Eligibilities', label: 'Eligibility' },
  { value: 'Contributions', label: 'Contributions' },
  { value: 'Multipliers', label: 'Multipliers' },
]

const tableColumns = computed(() => {
  const cols = [
    { name: 'name', label: 'Name', type: 'name', group: null, tooltip: null, sortable: true },
  ]
  let prevGroup = null
  function push(col) {
    // The name and actions columns are always present, so a filtered view is
    // still a table of contract types rather than a bare block of figures.
    if (visibleGroup.value !== 'all' && col.group !== visibleGroup.value) return
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

// Column widths. These mirror the `min-width` each column is given in CSS below
// (.col-elig / .col-mult / :first-child / :last-child) and are summed for the
// loading skeleton, which has no content to size itself from. The live table
// takes its width from `max-content` and does not read these.
const NAME_COL_WIDTH = 260
const NARROW_COL_WIDTH = 34 // eligibility / contribution columns
const MULT_COL_WIDTH = 36 // multiplier columns
const ACTIONS_COL_WIDTH = 52

const tableMinWidth = computed(() =>
  tableColumns.value.reduce((total, col) => {
    if (col.type === 'name') return total + NAME_COL_WIDTH
    if (col.type === 'actions') return total + ACTIONS_COL_WIDTH
    if (col.type === 'multiplier') return total + MULT_COL_WIDTH
    return total + NARROW_COL_WIDTH // eligibility / contribution
  }, 0),
)

/**
 * The live columns, annotated with the widths their CSS gives them, so
 * TableSkeleton can reproduce the same grid. Kept next to the width constants
 * above rather than inside the component, which cannot know a check column is
 * 38px wide.
 */
const skeletonColumns = computed(() =>
  tableColumns.value.map((col) => {
    if (col.type === 'name') return { ...col, align: 'left', width: NAME_COL_WIDTH }
    if (col.type === 'actions') return { ...col, align: 'center', width: ACTIONS_COL_WIDTH }
    if (col.type === 'multiplier') return { ...col, align: 'center', width: MULT_COL_WIDTH }
    return { ...col, align: 'center', width: NARROW_COL_WIDTH }
  }),
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

/* Plain wrapper. The scroll is inside the table, on `.q-table__middle`. */
.modern-table-container {
  overflow: visible;
  width: 0;
  min-width: 100%;
  max-width: 100%;
}

/* The visible-scrollbar treatment this panel invented is now in the shared
   stylesheet for all nine, at 8px rather than 10px. */

.spreadsheet-table {
  width: 100%;
  min-width: 100%;
}

/* ── Where the horizontal scroll lives ───────────────────────────────────────
 * Quasar already makes `.q-table__middle` the scrollport: it ships with the
 * `scroll` class (`overflow: auto`) and `max-width: 100%`. This panel used to
 * override that to `overflow: visible` and try to scroll an outer wrapper
 * instead — which is why the table could not be scrolled at all. The middle
 * stayed capped at the container's width, the `max-content` table spilled out of
 * it as visible overflow, and the first ancestor that did anything with overflow
 * was the settings card's `overflow: hidden`, which clipped it. The extra
 * columns were not off-screen-but-reachable; they were cut off.
 *
 * Every other table in the app scrolls because it leaves this element alone.
 * This one now does too — the rules below only add the visible scroll track. */
.spreadsheet-table :deep(.q-table__middle) {
  scrollbar-width: thin;
  scrollbar-color: var(--dash-line-strong) transparent;
}

.spreadsheet-table :deep(.q-table__middle)::-webkit-scrollbar {
  height: 8px;
}

.spreadsheet-table :deep(.q-table__middle)::-webkit-scrollbar-track {
  background: var(--dash-n-50);
  border-top: 1px solid var(--dash-line-soft);
}

.spreadsheet-table :deep(.q-table__middle)::-webkit-scrollbar-thumb {
  background: var(--dash-line-strong);
  border-radius: var(--dash-r-pill);
}

.spreadsheet-table :deep(.q-table__middle)::-webkit-scrollbar-thumb:hover {
  background: var(--dash-n-400);
}

/* `table-layout: auto` with `width: max-content`, deliberately.
 *
 * Under `fixed`, column widths are taken from the FIRST row — which here is the
 * group header, five cells carrying colspans of 1, N, M, 7 and 1. Fixed layout
 * splits a colspan cell's width evenly across its columns and ignores the widths
 * declared on the real header row below it, so the 38px check columns and 40px
 * multiplier columns never took effect: the browser divided the table between
 * five groups instead of across every column.
 *
 * `auto` alone was not enough either. With the table capped at the container's
 * width, auto layout still had to fit twenty-odd columns into it, and a declared
 * `width` is only a suggestion there — so the multiplier columns were compressed
 * instead of overflowing, and there was nothing to scroll to.
 *
 * `max-content` is what makes the scroll exist: the table takes exactly the
 * width its columns need (their `min-width` is respected, so a check column
 * cannot fall below 38px), and overflows `.modern-table-container`, which
 * scrolls. `min-width: 100%` keeps it filling the panel when a single column
 * group is selected and the columns do not reach the edge. */
.spreadsheet-table :deep(.q-table__middle > table),
.spreadsheet-table :deep(.q-table__middle > .q-table) {
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  white-space: nowrap;
  table-layout: auto;
}

/* ── Group header row ── */

/* No fill on the group band or the column labels below it. Grey bands behind
   Eligibilities, Contributions and Multipliers made three quarters of the header
   a block of colour; the group rules and the hairline under the labels already
   say where one group ends and the next begins. */
.spreadsheet-table :deep(.group-header-row th) {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--dash-ink);
  background: transparent;
  border-bottom: 2px solid var(--dash-line-strong);
  padding: 5px 4px;
  text-align: center;
}

/* Pinned with the two rows below it. Without this the group labels scrolled
   while the column header and the body's first cell stayed put, so the header
   stack came apart from its own columns the moment you scrolled sideways —
   exactly where the reader needs the labels most. */
.spreadsheet-table :deep(.group-header-row th:first-child) {
  text-align: left;
  padding-left: 10px;
  border-right: 2px solid var(--dash-line-strong);
  position: sticky;
  left: 0;
  z-index: 4;
  /* Opaque so columns pass behind it rather than through it, but white rather
     than grey: the pinned cells should not be the one part of the header still
     carrying a band. */
  background: var(--dash-surface);
}

.spreadsheet-table :deep(.group-header-row th:last-child) {
  position: sticky;
  right: 0;
  z-index: 4;
  background: var(--dash-surface);
}

.spreadsheet-table :deep(.group-header-row th.group-end) {
  border-right: none;
}

/* vertical group separators */
.spreadsheet-table :deep(.group-header-row th:not(.group-end)) {
  border-right: 2px solid var(--dash-line-strong);
}

/* ── Column header row ── */

.spreadsheet-table :deep(.table-header-row th) {
  z-index: 2;
  font-size: 11px !important;
  font-weight: 600 !important;
  letter-spacing: 0;
  color: var(--dash-ink-2) !important;
  background: transparent;
  border-bottom: 1px solid var(--dash-line) !important;
  padding: 4px 2px !important;
  text-align: center !important;
  white-space: nowrap;
  min-width: 0;
}

.spreadsheet-table :deep(.table-header-row th.col-elig) {
  min-width: 34px;
  width: 34px;
  padding: 4px 2px !important;
  font-size: 10px !important;
}

.spreadsheet-table :deep(.table-header-row th.col-mult) {
  min-width: 36px;
  width: 36px;
  padding: 4px 2px !important;
}

.spreadsheet-table :deep(.table-header-row th:first-child) {
  text-align: left !important;
  min-width: 180px;
  width: 260px;
  max-width: 260px;
  padding-left: 12px !important;
  padding-right: 12px !important;
  position: sticky;
  left: 0;
  z-index: 3;
  background: var(--dash-surface);
  overflow: hidden;
  text-overflow: ellipsis;
  border-right: 2px solid var(--dash-line);
}

.spreadsheet-table :deep(.table-header-row th:last-child) {
  min-width: 52px;
  max-width: 52px;
  width: 52px;
  padding: 2px !important;
  position: sticky;
  right: 0;
  z-index: 3;
  background: var(--dash-surface);
}

.header-label {
  cursor: help;
  border-bottom: 1px dashed var(--dash-ink-4);
}

/* ── Body cells ── */

.spreadsheet-table :deep(.q-table tbody td) {
  text-align: center !important;
  padding: 4px 2px !important;
  font-size: 12px;
  /* Opaque, so a value passing under the pinned name or actions column is
     covered rather than showing through it. */
  background: var(--dash-surface);
  border-bottom: 1px solid var(--dash-n-100) !important;
  vertical-align: middle;
  min-width: 0;
}

.spreadsheet-table :deep(.q-table tbody td.col-elig) {
  min-width: 34px;
  width: 34px;
  padding: 4px 2px !important;
}

.spreadsheet-table :deep(.q-table tbody td.col-mult) {
  min-width: 36px;
  width: 36px;
  padding: 4px 2px !important;
}

/* Capped, not just declared: `width` alone is a suggestion under auto layout, so
   the cell grew to fit the longest contract name — around 260px here, and
   unbounded as names get longer — and every pixel of that came out of the
   multiplier columns at the far end of the row. The ellipsis and the `title`
   tooltip below were already in place for exactly this. */
.spreadsheet-table :deep(.q-table tbody td:first-child) {
  text-align: left !important;
  min-width: 180px;
  width: 260px;
  max-width: 260px;
  padding: 6px 12px !important;
  font-size: 12px;
  color: var(--dash-ink);
  font-weight: 500;
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--dash-surface);
  overflow: hidden;
  text-overflow: ellipsis;
  border-right: 2px solid var(--dash-line);
}

.spreadsheet-table :deep(.q-table tbody td:last-child) {
  min-width: 52px;
  max-width: 52px;
  width: 52px;
  padding: 2px !important;
  position: sticky;
  right: 0;
  z-index: 1;
  background: var(--dash-surface);
  text-align: center !important;
}

/* hover highlight for sticky cells too */
.spreadsheet-table :deep(.q-table tbody tr:hover td:first-child),
.spreadsheet-table :deep(.q-table tbody tr:hover td:last-child) {
  background-color: var(--dash-n-50);
}

.spreadsheet-table :deep(.q-table tbody tr:last-child td) {
  border-bottom: none;
}

/* ── Group column separators in body (adds left border to first col of each group except name) ── */

.spreadsheet-table :deep(.q-table tbody td.group-first:not(:nth-child(2))) {
  border-left: 2px solid var(--dash-line);
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
  color: var(--dash-good);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.mult-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--dash-ink);
  font-variant-numeric: tabular-nums;
}

.multipliers-section {
  margin-top: 8px;
  padding: 12px 14px;
  background: var(--dash-n-50);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
}

.multiplier-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--dash-line);
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
  color: var(--dash-info-mark);
  background: var(--dash-info-bg);
  padding: 6px;
  border-radius: var(--dash-r-sm);
}

.multiplier-details {
  display: flex;
  flex-direction: column;
}

.section-label {
  font-size: 12px;
  color: var(--dash-ink-3);
  margin-bottom: 6px;
  font-weight: 500;
}

.multiplier-label {
  font-size: 13px;
  font-weight: 400;
  color: var(--dash-ink);
}

.multiplier-desc {
  font-size: 11px;
  color: var(--dash-ink-3);
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
  color: var(--dash-good);
}

.multiplier-source {
  font-size: 10px;
  color: var(--dash-ink-4);
  margin-left: 4px;
}

.multiplier-input {
  width: 90px;
}

.multiplier-input :deep(.q-field__control) {
  height: 32px;
}

.gov-violations-list {
  background: var(--dash-n-50);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  padding: 4px 0;
}

.gov-violation-item {
  min-height: 40px;
}

.gov-banner {
  background: var(--dash-warn-bg);
  border: 1px solid var(--dash-warn-line);
}

/* ── Column-group control ── */
.col-groups {
  display: inline-flex;
  padding: 2px;
  background: var(--dash-n-100);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
}

/* A segmented track rather than separate pills: exactly one group shows at a
   time, and a connected track is what says "pick one of these". */
.col-groups__btn {
  padding: 5px 10px;
  background: transparent;
  border: none;
  border-radius: var(--dash-r-sm);
  color: var(--dash-ink-3);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease);
}
.col-groups__btn:hover {
  color: var(--dash-ink);
}
.col-groups__btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--dash-accent-ring);
}
.col-groups__btn.is-on {
  background: var(--dash-surface);
  color: var(--dash-ink);
  box-shadow: var(--dash-shadow-xs);
}

/* ── Responsive ──
   The panel header stacks at 1023 with the rest of the settings panels, so the
   group track gets its own line and spreads across it rather than being squeezed
   beside a full-width Add button. */
@media (max-width: 1023px) {
  /* The shared panel header already gives `.table-actions` the full width and
     the Add button 100% of it. This panel puts two controls in there, so they
     stack instead of halving a line neither fits on. */
  .table-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .col-groups {
    width: 100%;
  }
  .col-groups__btn {
    flex: 1;
  }
}

@media (max-width: 599px) {
  .col-groups__btn {
    padding: 5px 6px;
    font-size: 11.5px;
  }
}

@media (max-width: 768px) {
  .multiplier-controls {
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
  }
}
</style>
