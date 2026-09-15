<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Leave types</h2>
        <p class="table-subtitle">What can be filed, and how its credits are granted</p>
      </div>
      <div class="table-actions">
        <q-btn
          color="primary"
          label="Add leave type"
          icon="add"
          class="add-btn"
          @click="openDialog"
        />
      </div>
    </div>

    <div class="modern-table-container">
      <!-- Built from the live `columns`, so the placeholder shares the real
           table's columns, labels and alignment. -->
      <template v-if="loading">
        <TableSkeleton :columns="columns" :rows="5" />
      </template>
      <template v-else-if="!filteredLeaveTypes.length">
        <!-- A header strip over an empty grid reads as a table that failed to
             load; the centred state says which of the two it is and, when the
             search is what hid the rows, offers the way back. -->
        <div class="dash-empty lt-empty">
          <span class="dash-featured-icon"><q-icon name="o_event_busy" size="20px" /></span>
          <p class="dash-empty__title">
            {{ searchQuery ? 'No leave types match' : 'No leave types yet' }}
          </p>
          <p class="dash-empty__sub">
            {{
              searchQuery
                ? `Nothing here is called “${searchQuery}”.`
                : 'Add the leave your people can file — sick leave, vacation, and any statutory leave you carry.'
            }}
          </p>
          <q-btn
            v-if="!searchQuery"
            label="Add leave type"
            icon="add"
            class="dash-modal__submit lt-empty__btn"
            unelevated
            @click="openDialog"
          />
        </div>
      </template>
      <template v-else>
        <q-table
          :rows="filteredLeaveTypes"
          :columns="columns"
          row-key="id"
          flat
          class="dash-qtable settings-table"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Leave type</q-th>
              <q-th class="table-header-cell">Attributes</q-th>
              <q-th class="table-header-cell">Grant policies</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell">
                <span class="item-name">{{ props.row.name }}</span>
                <span v-if="props.row.description" class="lt-desc">{{
                  props.row.description
                }}</span>
              </q-td>

              <q-td class="table-body-cell">
                <div class="lt-chips">
                  <span
                    v-for="chip in attributesFor(props.row)"
                    :key="chip.key"
                    class="lt-chip"
                    :class="`lt-chip--${chip.tone}`"
                    >{{ chip.label }}</span
                  >
                </div>
              </q-td>

              <!-- The policy count opens the dialog that changes it, so the
                   figure and the way to act on it are the same control. -->
              <q-td class="table-body-cell">
                <button
                  v-if="summaryFor(props.row).hasAny"
                  type="button"
                  class="lt-policy-cell"
                  @click="openPolicies(props.row)"
                  :aria-label="`Grant policies for ${props.row.name}`"
                >
                  <span class="lt-policy-primary">
                    {{ summaryFor(props.row).total }}
                    {{ summaryFor(props.row).total === 1 ? 'policy' : 'policies' }}
                  </span>
                  <span class="lt-policy-secondary">{{ detailFor(props.row) }}</span>
                </button>
                <button
                  v-else
                  type="button"
                  class="lt-policy-cell lt-policy-cell--none"
                  @click="openPolicies(props.row)"
                  :aria-label="`Add a grant policy for ${props.row.name}`"
                >
                  <span class="lt-policy-primary">No policies</span>
                  <span class="lt-policy-secondary">Grants nothing</span>
                </button>
              </q-td>

              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 170px">
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="openEditDialog(props.row)"
                      >
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit leave type</q-item-section>
                      </q-item>
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="openPolicies(props.row)"
                      >
                        <q-item-section side><q-icon name="rule" size="16px" /></q-item-section>
                        <q-item-section>Grant policies</q-item-section>
                      </q-item>
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item dropdown-item-danger"
                        @click="deleteLeaveType(props.row)"
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

    <!-- ── Add / edit ───────────────────────────────────────────────────────-->
    <q-dialog v-model="dialog" persistent>
      <q-card class="dash-modal dash-modal--lg">
        <q-card-section class="dash-modal__head">
          <div class="dash-modal__head-main">
            <q-avatar size="38px" class="dash-modal__head-icon">
              <q-icon name="event_busy" size="22px" />
            </q-avatar>
            <div class="dash-modal__head-titles">
              <div class="dash-modal__title">
                {{ editing ? 'Edit leave type' : 'Add leave type' }}
              </div>
              <div class="dash-modal__sub">What can be filed, and how it behaves</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
        </q-card-section>

        <q-form @submit.prevent="submit" class="dash-modal__form">
          <q-card-section class="dash-modal__body">
            <div class="dash-modal__group">
              <p class="dash-modal__group-label">Leave type</p>
              <div class="dash-modal__grid">
                <label class="dash-modal__field dash-modal__span-2">
                  <span class="dash-modal__field-label">
                    Name<span class="dash-modal__req">*</span>
                  </span>
                  <q-input
                    v-model="form.name"
                    outlined
                    dense
                    hide-bottom-space
                    class="dash-field"
                    placeholder="Sick Leave"
                  >
                    <template v-slot:prepend><q-icon name="label" size="18px" /></template>
                  </q-input>
                </label>

                <label class="dash-modal__field dash-modal__span-2">
                  <span class="dash-modal__field-label">Description</span>
                  <q-input
                    v-model="form.description"
                    type="textarea"
                    rows="2"
                    outlined
                    dense
                    hide-bottom-space
                    class="dash-field"
                    placeholder="When and how this leave is used"
                  />
                </label>

                <label class="dash-modal__field">
                  <span class="dash-modal__field-label">Funded by</span>
                  <q-select
                    v-model="form.funder"
                    :options="funderOptions"
                    option-value="value"
                    option-label="label"
                    emit-value
                    map-options
                    outlined
                    dense
                    options-dense
                    hide-bottom-space
                    class="dash-field"
                    popup-content-class="dash-popup dash-popup--modal"
                  >
                    <template v-slot:prepend
                      ><q-icon name="account_balance" size="18px"
                    /></template>
                  </q-select>
                </label>
              </div>
            </div>

            <div class="dash-modal__group">
              <p class="dash-modal__group-label">How it behaves</p>
              <div class="toggles-grid">
                <div v-for="toggle in behaviourToggles" :key="toggle.field" class="toggle-item">
                  <q-toggle
                    :model-value="form[toggle.field]"
                    color="primary"
                    size="md"
                    class="brand-toggle"
                    :aria-label="toggle.label"
                    @update:model-value="setToggle(toggle.field, $event)"
                  />
                  <div class="toggle-label-group">
                    <div class="toggle-label">{{ toggle.label }}</div>
                    <div class="toggle-hint">{{ toggle.hint }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── First policy, on create only ───────────────────────────────
                 The create endpoint saves the type and its policies in one
                 atomic call, so offering the first one here means a new type is
                 never left granting nothing. Editing goes through the policies
                 dialog instead: the update endpoint documents no nested-policy
                 behaviour, and guessing at it risks clearing the rules a type
                 already has. -->
            <div v-if="!editing" class="dash-modal__group">
              <div class="dash-modal__group-head">
                <p class="dash-modal__group-label">First grant policy</p>
                <q-toggle
                  v-model="includeFirstPolicy"
                  color="primary"
                  size="sm"
                  class="brand-toggle"
                  label="Add one now"
                  aria-label="Add a grant policy with this leave type"
                />
              </div>

              <p v-if="!includeFirstPolicy" class="lt-policy-hint">
                Without a policy the type can be filed but grants no credits. You can add policies
                any time from the row menu.
              </p>

              <div v-else class="dash-modal__grid">
                <label class="dash-modal__field dash-modal__span-2">
                  <span class="dash-modal__field-label">Departments</span>
                  <q-select
                    v-model="policyDraft.departments"
                    :options="departmentOptions"
                    option-value="value"
                    option-label="label"
                    emit-value
                    map-options
                    multiple
                    use-chips
                    clearable
                    outlined
                    dense
                    options-dense
                    :loading="loadingDepartments"
                    hide-bottom-space
                    class="dash-field"
                    popup-content-class="dash-popup dash-popup--modal"
                  >
                    <template v-slot:prepend><q-icon name="corporate_fare" size="18px" /></template>
                    <template v-slot:no-option>
                      <q-item>
                        <q-item-section class="text-grey-7">
                          No departments in this company yet
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                  <span class="dash-modal__field-hint">
                    Leave empty to apply the policy company-wide.
                  </span>
                </label>

                <label class="dash-modal__field">
                  <span class="dash-modal__field-label">How credits are granted</span>
                  <q-select
                    v-model="policyDraft.grant_type"
                    :options="grantTypeOptions"
                    option-value="value"
                    option-label="label"
                    emit-value
                    map-options
                    outlined
                    dense
                    options-dense
                    hide-bottom-space
                    class="dash-field"
                    popup-content-class="dash-popup dash-popup--modal"
                  >
                    <template v-slot:prepend><q-icon name="event_repeat" size="18px" /></template>
                  </q-select>
                </label>

                <label class="dash-modal__field">
                  <span class="dash-modal__field-label">Days per grant</span>
                  <q-input
                    v-model.number="policyDraft.grant_amount"
                    type="number"
                    min="0"
                    step="0.5"
                    outlined
                    dense
                    :disable="policyDraft.grant_type === 'none'"
                    hide-bottom-space
                    class="dash-field"
                  >
                    <template v-slot:prepend
                      ><q-icon name="exposure_plus_1" size="18px"
                    /></template>
                  </q-input>
                </label>

                <label v-if="policyDraft.grant_type === 'annual'" class="dash-modal__field">
                  <span class="dash-modal__field-label">Granted from</span>
                  <q-select
                    v-model="policyDraft.grant_anchor"
                    :options="grantAnchorOptions"
                    option-value="value"
                    option-label="label"
                    emit-value
                    map-options
                    outlined
                    dense
                    options-dense
                    hide-bottom-space
                    class="dash-field"
                    popup-content-class="dash-popup dash-popup--modal"
                  >
                    <template v-slot:prepend><q-icon name="event" size="18px" /></template>
                  </q-select>
                </label>

                <label class="dash-modal__field">
                  <span class="dash-modal__field-label">Months of service required</span>
                  <q-input
                    v-model.number="policyDraft.service_length_required"
                    type="number"
                    min="0"
                    step="1"
                    outlined
                    dense
                    hide-bottom-space
                    class="dash-field"
                  >
                    <template v-slot:prepend
                      ><q-icon name="hourglass_bottom" size="18px"
                    /></template>
                  </q-input>
                </label>

                <label class="dash-modal__field">
                  <span class="dash-modal__field-label">Maximum balance</span>
                  <q-input
                    v-model="policyDraft.max_balance"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="No cap"
                    outlined
                    dense
                    hide-bottom-space
                    class="dash-field"
                  >
                    <template v-slot:prepend
                      ><q-icon name="vertical_align_top" size="18px"
                    /></template>
                  </q-input>
                </label>
              </div>
            </div>
          </q-card-section>

          <q-card-actions class="dash-modal__foot">
            <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" v-close-popup />
            <q-btn
              :label="editing ? 'Update' : 'Save'"
              type="submit"
              no-caps
              unelevated
              class="dash-modal__submit"
              :loading="saving"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- ── Policies ─────────────────────────────────────────────────────────-->
    <LeaveTypePoliciesDialog
      ref="policiesDialogRef"
      v-model="policiesDialog"
      :leave-type="policiesFor"
      :policies="policies"
      :departments="departments"
      :loading="loadingPolicies"
      :loading-departments="loadingDepartments"
      :saving="savingPolicy"
      @assign="handleAssignPolicy"
    />
  </div>
</template>

<script setup>
/**
 * Leave types for the active company.
 *
 * The panel owns both composables rather than letting the policies dialog hold
 * its own: adding a policy has to refresh the list *and* the row summary the
 * table prints, and two instances would leave the column stale until a reload.
 * Same reason the departments lookup lives here — the create dialog's inline
 * policy and the policies dialog both offer it.
 */
import { computed, onMounted, ref, watch } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import LeaveTypePoliciesDialog from './LeaveTypePoliciesDialog.vue'
import { useAdminLeaveTypes } from '@/composables/admin/useAdminLeaveTypes'
import { useAdminLeavePolicies } from '@/composables/admin/useAdminLeavePolicies'
import { useAdminDepartments } from '@/composables/admin/useAdminDepartments'
import { useCompany } from '@/composables/page/useCompany'
import {
  FUNDERS,
  GRANT_ANCHORS,
  GRANT_TYPES,
  defaultUsesBalance,
  emptyPolicyDraft,
  leaveTypeAttributes,
  policySummaryDetail,
  summarizePolicies,
} from '@/composables/utils/leaveTypes'

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

const { companyId } = useCompany()

const {
  leaveTypes,
  loading,
  saving,
  dialog,
  editing,
  form,
  includeFirstPolicy,
  fetchLeaveTypes,
  leaveTypeById,
  openDialog,
  openEditDialog,
  saveLeaveType,
  deleteLeaveType,
} = useAdminLeaveTypes()

const {
  policies,
  loading: loadingPolicies,
  saving: savingPolicy,
  fetchPolicies,
  assignPolicy,
} = useAdminLeavePolicies()

const { departments, loading: loadingDepartments, fetchDepartments } = useAdminDepartments()

const funderOptions = FUNDERS
const grantTypeOptions = GRANT_TYPES.map(({ value, label }) => ({ value, label }))
const grantAnchorOptions = GRANT_ANCHORS

/**
 * The same `{ value, label }` shape the policies dialog builds, because the
 * create dialog's inline policy offers the same picker. Kept as a computed over
 * the shared `departments` ref so a fetch that lands while the dialog is open
 * fills the list rather than leaving it on its no-options slot.
 */
const departmentOptions = computed(() =>
  departments.value.map((department) => ({ value: department.id, label: department.name })),
)

const columns = [
  { name: 'name', label: 'Leave type', field: 'name', align: 'left' },
  { name: 'attributes', label: 'Attributes', field: 'attributes', align: 'left' },
  { name: 'policies', label: 'Grant policies', field: 'policies', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const behaviourToggles = [
  {
    field: 'is_paid',
    label: 'Paid',
    hint: 'The employee is paid for days taken.',
  },
  {
    field: 'is_cto',
    label: 'Compensatory time off',
    hint: 'Accrued from overtime rather than granted as leave.',
  },
  {
    field: 'is_statutory',
    label: 'Statutory',
    hint: 'Legally mandated, not a company benefit.',
  },
  {
    field: 'is_picture_required',
    label: 'Evidence required',
    hint: 'A photo or certificate must be attached when filing.',
  },
  {
    field: 'is_convertible_to_cash',
    label: 'Convertible to cash',
    hint: 'Unused balance can be paid out.',
  },
  {
    field: 'uses_balance',
    label: 'Draws from a balance',
    hint: 'Keeps a credit ledger per employee. Follows paid and CTO until you set it.',
  },
]

// ─── Table ──────────────────────────────────────────────────────────────────

const filteredLeaveTypes = computed(() => {
  const query = (props.searchQuery || '').trim().toLowerCase()
  if (!query) return leaveTypes.value
  return leaveTypes.value.filter(
    (type) =>
      type.name.toLowerCase().includes(query) ||
      type.description.toLowerCase().includes(query) ||
      type.policies.some((policy) =>
        policy.departments.some((department) =>
          (department.name || '').toLowerCase().includes(query),
        ),
      ),
  )
})

function attributesFor(type) {
  return leaveTypeAttributes(type)
}

function summaryFor(type) {
  return summarizePolicies(type.policies)
}

function detailFor(type) {
  return policySummaryDetail(summaryFor(type))
}

// ─── Add / edit dialog ──────────────────────────────────────────────────────

const policyDraft = ref(emptyPolicyDraft())

// A fresh inline policy per opening, so a draft abandoned on one type is not
// silently attached to the next.
watch(dialog, (open) => {
  if (open) policyDraft.value = emptyPolicyDraft()
})

/**
 * `uses_balance` follows `is_paid || is_cto` — the server's own default — right
 * up until an admin moves that toggle themselves. Sending the derived value as
 * though it had been chosen would freeze it, so a type later switched to unpaid
 * would keep a ledger nobody asked for.
 */
function setToggle(field, value) {
  form.value[field] = value
  if (field === 'uses_balance') {
    form.value.uses_balance_touched = true
    return
  }
  if (!form.value.uses_balance_touched) {
    form.value.uses_balance = defaultUsesBalance(form.value)
  }
}

async function submit() {
  await saveLeaveType(!editing.value && includeFirstPolicy.value ? policyDraft.value : null)
}

// ─── Policies dialog ────────────────────────────────────────────────────────

const policiesDialog = ref(false)
const policiesFor = ref(null)
const policiesDialogRef = ref(null)

async function openPolicies(type) {
  policiesFor.value = type
  policiesDialog.value = true
  await Promise.all([fetchPolicies(type.id), ensureDepartments()])
}

async function handleAssignPolicy(draft) {
  const typeId = policiesFor.value?.id
  const saved = await assignPolicy(typeId, draft)
  if (!saved) return
  policiesDialogRef.value?.resetDraft()
  // The table prints a summary of the same policies, so the list has to be
  // re-read before the dialog closes rather than on next mount.
  await fetchLeaveTypes()
  policiesFor.value = leaveTypeById(typeId) || policiesFor.value
}

// ─── Lookups ────────────────────────────────────────────────────────────────

/** Departments are only needed by the two policy forms, so they load on demand. */
async function ensureDepartments() {
  if (departments.value.length) return departments.value
  return fetchDepartments()
}

watch(includeFirstPolicy, (on) => {
  if (on) ensureDepartments()
})

// Ids from the previous workspace mean nothing in the next one, so both
// lookups are dropped and the list re-read when the company changes.
watch(companyId, () => {
  departments.value = []
  policiesDialog.value = false
  policiesFor.value = null
  fetchLeaveTypes()
})

onMounted(fetchLeaveTypes)
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

/* A description is context for the name above it, not a paragraph — two lines
   is the most a table row can carry without the rows losing their rhythm. */
.lt-desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 2px;
  font-size: 11.5px;
  line-height: 1.35;
  color: var(--dash-ink-4);
  max-width: 320px;
}

.lt-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 300px;
}

/* A soft tint rather than a saturated outline: these repeat down every row, and
   hard edges on many small elements read as harsh while scrolling. */
.lt-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--dash-r-pill);
  border: 1px solid transparent;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.lt-chip--good {
  background: var(--dash-good-bg);
  border-color: var(--dash-good-line);
  color: var(--dash-good);
}

.lt-chip--info {
  background: var(--dash-info-bg);
  border-color: var(--dash-info-line);
  color: var(--dash-info);
}

.lt-chip--warn {
  background: var(--dash-warn-bg);
  border-color: var(--dash-warn-line);
  color: var(--dash-warn);
}

.lt-chip--neutral {
  background: var(--dash-neutral-bg);
  border-color: var(--dash-neutral-line);
  color: var(--dash-neutral);
}

.lt-policy-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 2px 6px 2px 0;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  border-radius: var(--dash-r-sm);
}

.lt-policy-cell:hover .lt-policy-primary {
  text-decoration: underline;
}

.lt-policy-cell:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--dash-accent-ring);
}

.lt-policy-primary {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
}

.lt-policy-secondary {
  font-size: 11.5px;
  color: var(--dash-ink-4);
}

/* "No policies" is a real answer, not missing data — stated in the quiet ink so
   it does not compete with the rows that have rules to report. */
.lt-policy-cell--none .lt-policy-primary {
  font-weight: 400;
  color: var(--dash-ink-3);
}

.lt-policy-hint {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--dash-ink-4);
}

.lt-empty {
  padding: 40px 20px;
}

.lt-empty__btn {
  margin-top: 14px;
  height: 34px;
  padding: 0 16px;
  border-radius: var(--dash-r-md);
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
}

@media (max-width: 1023px) {
  .lt-chips,
  .lt-desc {
    max-width: 220px;
  }
}
</style>
