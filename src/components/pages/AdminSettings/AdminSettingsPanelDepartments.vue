<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Departments</h2>
        <p class="table-subtitle">Manage organizational departments</p>
      </div>
      <div class="table-actions">
        <q-btn
          color="primary"
          label="Add department"
          icon="add"
          class="add-btn"
          @click="openDepartmentDialog"
        />
      </div>
    </div>

    <div class="modern-table-container">
      <!-- Built from the live `departmentColumns`, so the placeholder shares the
           real table's columns, labels and alignment. -->
      <template v-if="loadingDepartments">
        <TableSkeleton :columns="departmentColumns" :rows="5" />
      </template>
      <template v-else>
        <q-table
          :rows="filteredDepartments"
          :columns="departmentColumns"
          row-key="id"
          flat
          no-data-label="No departments found"
          class="dash-qtable settings-table"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Department Name</q-th>
              <q-th class="table-header-cell">Policies</q-th>
              <q-th class="table-header-cell">Location rule</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell"
                ><span class="item-name">{{ props.row.name }}</span></q-td
              >
              <q-td class="table-body-cell">{{ getPolicyNames(props.row.policies) }}</q-td>
              <!-- The endpoint answers per department, so this column is a
                   batch of one request each; until it lands the cell shimmers
                   rather than claiming the department has no rule. -->
              <q-td class="table-body-cell">
                <span v-if="loadingRules" class="dash-shimmer rule-shimmer" />
                <button
                  v-else-if="ruleSummary(props.row).state === 'active'"
                  type="button"
                  class="rule-cell"
                  :aria-label="`Location rule for ${props.row.name}`"
                  @click="openLocationRule(props.row)"
                >
                  <span class="rule-primary">{{ ruleSummary(props.row).label }}</span>
                  <span class="rule-secondary">{{ ruleSummary(props.row).detail }}</span>
                  <q-tooltip anchor="top middle" self="bottom middle" :offset="[0, 4]">{{
                    ruleTooltip(props.row)
                  }}</q-tooltip>
                </button>
                <button
                  v-else-if="
                    ruleSummary(props.row).state === 'paused' ||
                    ruleSummary(props.row).state === 'open'
                  "
                  type="button"
                  class="rule-cell"
                  :aria-label="`Location rule for ${props.row.name}`"
                  @click="openLocationRule(props.row)"
                >
                  <span class="status-badge status-inactive">{{
                    ruleSummary(props.row).label
                  }}</span>
                  <q-tooltip anchor="top middle" self="bottom middle" :offset="[0, 4]">{{
                    ruleTooltip(props.row)
                  }}</q-tooltip>
                </button>
                <!-- "Could not ask" is not "no rule": saying so beats an em dash
                     an admin would read as a department with nothing set. -->
                <span
                  v-else-if="ruleSummary(props.row).state === 'unknown'"
                  class="rule-unknown"
                  title="The location rule could not be loaded for this department"
                  >Couldn’t load</span
                >
                <span v-else class="rule-none" aria-label="No location rule set">—</span>
              </q-td>
              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 150px">
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="editDepartment(props.row)"
                      >
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit department</q-item-section>
                      </q-item>
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="openLocationRule(props.row)"
                      >
                        <q-item-section side
                          ><q-icon name="where_to_vote" size="16px"
                        /></q-item-section>
                        <q-item-section>Location rule</q-item-section>
                      </q-item>
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item dropdown-item-danger"
                        @click="deleteDepartment(props.row)"
                      >
                        <q-item-section side
                          ><q-icon name="delete" size="16px" color="negative"
                        /></q-item-section>
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

    <q-dialog v-model="departmentDialog" persistent>
      <q-card class="dash-modal">
        <q-card-section class="dash-modal__head">
          <div class="dash-modal__head-main">
            <q-avatar size="38px" class="dash-modal__head-icon"
              ><q-icon name="corporate_fare" size="22px"
            /></q-avatar>
            <div class="dash-modal__head-titles">
              <div class="dash-modal__title">
                {{ editingDepartment ? 'Edit department' : 'Add Department' }}
              </div>
              <div class="dash-modal__sub">Manage department information</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
        </q-card-section>
        <q-card-section class="dash-modal__body">
          <label class="dash-modal__field">
            <span class="dash-modal__field-label"
              >Department name<span class="dash-modal__req">*</span></span
            >
            <q-input
              v-model="departmentForm.name"
              outlined
              dense
              class="dash-field"
              hide-bottom-space
            />
          </label>
          <label class="dash-modal__field">
            <span class="dash-modal__field-label">Cost center</span>
            <q-select
              v-model="departmentForm.cost_center"
              :options="costCenters"
              option-value="id"
              option-label="name"
              emit-value
              map-options
              outlined
              dense
              clearable
              class="dash-field"
              hide-bottom-space
              popup-content-class="dash-popup dash-popup--modal"
            >
              <template v-slot:prepend><q-icon name="account_balance" size="18px" /></template>
            </q-select>
          </label>
          <label class="dash-modal__field">
            <span class="dash-modal__field-label">Policies</span>
            <q-select
              v-model="departmentForm.policies"
              :options="policies"
              option-value="id"
              option-label="name"
              outlined
              dense
              multiple
              use-chips
              clearable
              class="dash-field"
              hide-bottom-space
              popup-content-class="dash-popup dash-popup--modal"
            />
          </label>
        </q-card-section>
        <q-card-actions class="dash-modal__foot">
          <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" v-close-popup />
          <q-btn
            :label="editingDepartment ? 'Update' : 'Save'"
            no-caps
            class="dash-modal__submit"
            :loading="savingDepartment"
            @click="saveDepartment"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <DepartmentLocationRuleDialog
      v-model="locationRuleDialog"
      :department="locationRuleDepartment"
      :rule="ruleForOpenDepartment"
      :loading="loadingDepartmentRule"
      :saving="savingRule"
      :removing="removingRule"
      @save="saveLocationRule"
      @remove="removeLocationRule"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import DepartmentLocationRuleDialog from './DepartmentLocationRuleDialog.vue'
import { useAdminDepartments } from '@/composables/admin/useAdminDepartments'
import { useAdminCostCenters } from '@/composables/admin/useAdminCostCenters'
import { useAdminDepartmentPolicies } from '@/composables/admin/useAdminDepartmentPolicies'
import { useAdminDepartmentLocationRules } from '@/composables/admin/useAdminDepartmentLocationRules'
import { ruleSentence } from '@/composables/utils/departmentLocationRules'

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

const { costCenters, fetchCostCenters } = useAdminCostCenters()
const { policies, fetchDepartmentPolicies } = useAdminDepartmentPolicies()

const {
  departments,
  loading: loadingDepartments,
  saving: savingDepartment,
  dialog: departmentDialog,
  editing: editingDepartment,
  form: departmentForm,
  fetchDepartments,
  openDialog: openDepartmentDialog,
  openEditDialog: editDepartment,
  saveDepartment,
  deleteDepartment,
} = useAdminDepartments()

const getPolicyNames = (ids) => {
  if (!ids?.length) return '—'
  return ids
    .map((id) => {
      const p = policies.value.find((p) => p.id === id)
      return p ? p.name : id
    })
    .join(', ')
}

const departmentColumns = ref([
  { name: 'name', label: 'Department Name', field: 'name', align: 'left' },
  { name: 'policies', label: 'Policies', field: 'policies', align: 'left' },
  { name: 'location_rule', label: 'Location rule', field: 'location_rule', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
])

const filteredDepartments = computed(() => {
  if (!props.searchQuery) return departments.value
  const q = props.searchQuery.toLowerCase()
  return departments.value.filter((d) => (d.name || '').toLowerCase().includes(q))
})

// ─── Location rules ────────────────────────────────────────────────────────
/*
 * How many on-site and off-site shifts a department may hold per period — a
 * hard block at assignment time, not a target. The endpoint is per department,
 * so the column is a batch of one request each, issued once the departments
 * themselves land and again whenever that list changes (a company switch, an
 * add, a delete).
 */
const {
  loadingSummary: loadingRules,
  loadingDepartment: loadingDepartmentRule,
  saving: savingRule,
  removing: removingRule,
  byDepartment: rulesByDepartment,
  ruleFor,
  summaryFor: ruleSummaryFor,
  fetchAll: fetchAllRules,
  fetchForDepartment: fetchDepartmentRule,
  saveRule,
  deleteRule,
} = useAdminDepartmentLocationRules()

const locationRuleDialog = ref(false)
const locationRuleDepartment = ref(null)

const ruleForOpenDepartment = computed(() => {
  const id = locationRuleDepartment.value?.id
  // The dialog takes `null` for "no rule"; an unread department is treated the
  // same, since by the time it opens the fetch below has run.
  return id == null ? null : (rulesByDepartment.value[id] ?? null)
})

function ruleSummary(department) {
  return ruleSummaryFor(department.id)
}

/* The column prints the caps; the tooltip says what they do, including which
   side is uncapped — which the two-figure summary cannot show. */
function ruleTooltip(department) {
  return ruleSentence(ruleFor(department.id))
}

async function openLocationRule(department) {
  locationRuleDepartment.value = department
  locationRuleDialog.value = true
  // Re-read on open rather than trusting the column's batch: the dialog is
  // where a stale limit is actually edited and saved back.
  await fetchDepartmentRule(department.id)
}

async function saveLocationRule(form) {
  const department = locationRuleDepartment.value
  if (!department) return
  const saved = await saveRule(department.id, form)
  if (saved) locationRuleDialog.value = false
}

function removeLocationRule() {
  const department = locationRuleDepartment.value
  if (!department) return
  deleteRule(department, {
    onDone: () => {
      locationRuleDialog.value = false
    },
  })
}

// The rows themselves, not their ids: where the departments payload already
// carries a nested `location_rule`, the column costs no extra requests.
watch(departments, (list) => {
  fetchAllRules(list || [])
})

onMounted(async () => {
  await fetchDepartments()
  await fetchCostCenters()
  await fetchDepartmentPolicies()
})
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

/* ── Location rule column ────────────────────────────────────────────────────
   Two readings of one rule — the caps themselves, and the period they are
   counted over, which is what makes "4 on-site" mean anything. The cell is a
   button because it opens the same dialog the row menu does; the figure you are
   already reading is the most direct handle for it. */
.rule-cell {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 2px 6px;
  margin: -2px -6px;
  background: none;
  border: none;
  border-radius: var(--dash-r-sm);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--dash-fast) var(--dash-ease);
}

.rule-cell:hover,
.rule-cell:focus-visible {
  background: var(--dash-n-100);
}

.rule-primary {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  font-variant-numeric: tabular-nums;
}

.rule-secondary {
  font-size: 11.5px;
  color: var(--dash-ink-3);
}

/* No rule is not a rule of zero — the em dash says nothing caps this
   department, rather than that its caps happen to be empty. */
.rule-none {
  color: var(--dash-ink-4);
}

.rule-unknown {
  font-size: 12px;
  font-style: italic;
  color: var(--dash-ink-4);
}

.rule-shimmer {
  display: inline-block;
  width: 84px;
  height: 11px;
  border-radius: var(--dash-r-sm);
  vertical-align: middle;
}
</style>
