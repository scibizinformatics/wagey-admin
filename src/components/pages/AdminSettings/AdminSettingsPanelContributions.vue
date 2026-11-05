<template>
  <div class="table-section">
    <div class="table-header cb-header">
      <div class="table-title-section">
        <h2 class="table-title">Contributions</h2>
        <p class="table-subtitle">{{ subtitle }}</p>
        <q-btn-toggle
          v-model="view"
          class="cb-view-toggle"
          no-caps
          unelevated
          color="white"
          text-color="grey-8"
          toggle-color="primary"
          :options="viewOptions"
        />
      </div>
      <div class="table-actions cb-toolbar">
        <q-select
          v-model="typeFilter"
          :options="typeFilterOptions"
          emit-value
          map-options
          dense
          outlined
          options-dense
          hide-bottom-space
          class="dash-field cb-filter"
          popup-content-class="dash-popup"
          :aria-label="
            view === 'accounts'
              ? 'Filter account numbers by contribution type'
              : 'Filter components by contribution type'
          "
        >
          <template v-slot:prepend><q-icon name="filter_list" size="18px" /></template>
        </q-select>

        <template v-if="view === 'components'">
          <q-btn
            flat
            no-caps
            icon="o_category"
            label="Manage types"
            class="cb-manage-btn"
            @click="openTypesDialog()"
          />
          <q-btn
            color="primary"
            :label="addComponentLabel"
            icon="add"
            class="add-btn"
            @click="openBracketDialog"
          />
        </template>

        <template v-else>
          <q-select
            v-model="accountStatusFilter"
            :options="accountStatusOptions"
            emit-value
            map-options
            dense
            outlined
            options-dense
            hide-bottom-space
            class="dash-field cb-filter cb-status-filter"
            popup-content-class="dash-popup"
            aria-label="Filter account numbers by status"
          >
            <template v-slot:prepend><q-icon name="o_toggle_on" size="18px" /></template>
          </q-select>
          <q-btn
            color="primary"
            label="Add account"
            icon="add"
            class="add-btn"
            @click="openAccountDialog"
          />
        </template>
      </div>
    </div>

    <!-- ── Components ─────────────────────────────────────────────────────────
         The original view: one row per income band, with the scheme it files
         under and the shares taken from it. -->
    <div v-if="view === 'components'" class="modern-table-container">
      <!-- Built from the live `columns`, so the placeholder shares the real
           table's columns, labels and alignment. -->
      <template v-if="loading || loadingTypes">
        <TableSkeleton :columns="columns" />
      </template>
      <template v-else-if="!filteredBrackets.length">
        <div class="dash-empty cb-empty">
          <span class="dash-featured-icon"><q-icon name="o_savings" size="20px" /></span>
          <p class="dash-empty__title">
            {{ isFiltered ? 'No components match' : 'No contribution components yet' }}
          </p>
          <p class="dash-empty__sub">
            {{
              isFiltered
                ? 'Nothing matches the type filter and search in place.'
                : componentsEmptyHint
            }}
          </p>
          <q-btn
            v-if="!isFiltered"
            :label="addComponentLabel"
            icon="add"
            class="dash-modal__submit cb-empty__btn"
            unelevated
            @click="openBracketDialog"
          />
        </div>
      </template>
      <template v-else>
        <q-table
          :rows="filteredBrackets"
          :columns="columns"
          row-key="id"
          flat
          class="dash-qtable settings-table cb-table"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Component</q-th>
              <q-th class="table-header-cell">Type</q-th>
              <q-th class="table-header-cell cb-num">Employee share</q-th>
              <q-th class="table-header-cell cb-num">Employer share</q-th>
              <q-th class="table-header-cell">Effective</q-th>
              <q-th class="table-header-cell">Status</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell">
                <span class="item-name">{{ bracketTitle(props.row) }}</span>
                <span v-if="props.row.name" class="cb-range">
                  {{ bracketRangeLabel(props.row) }}
                </span>
              </q-td>

              <!-- The scheme and the way to manage it are the same control, so
                   an admin can open the type manager from the row without
                   hunting the toolbar for it — the pattern Compensable time uses
                   for subcategories. A row created before the type requirement
                   may still carry none, so this cell also says "Unassigned" and
                   offers the way to fix it. -->
              <q-td class="table-body-cell">
                <button
                  type="button"
                  class="cb-type-cell"
                  :aria-label="
                    typeFor(props.row)
                      ? `Manage contribution types, including ${typeNameFor(props.row)}`
                      : 'Add a contribution type for this component'
                  "
                  @click="openTypesDialog(props.row.typeId)"
                >
                  <span class="cb-type-name">{{ typeNameFor(props.row) }}</span>
                  <span class="cb-type-code">{{ typeCodeFor(props.row) }}</span>
                </button>
              </q-td>

              <q-td class="table-body-cell cb-num">{{ employeeShareLabel(props.row) }}</q-td>
              <q-td class="table-body-cell cb-num">{{ employerShareLabel(props.row) }}</q-td>
              <q-td class="table-body-cell">{{ bracketEffectiveLabel(props.row) }}</q-td>

              <q-td class="table-body-cell">
                <span
                  :class="[
                    'status-badge',
                    props.row.isActive ? 'status-active' : 'status-inactive',
                  ]"
                >
                  {{ props.row.isActive ? 'Active' : 'Inactive' }}
                </span>
              </q-td>

              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 190px">
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="editBracket(props.row)"
                      >
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit component</q-item-section>
                      </q-item>
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="setContributionBracketActive(props.row, !props.row.isActive)"
                      >
                        <q-item-section side>
                          <q-icon
                            :name="props.row.isActive ? 'visibility_off' : 'visibility'"
                            size="16px"
                          />
                        </q-item-section>
                        <q-item-section>
                          {{ props.row.isActive ? 'Deactivate' : 'Activate' }}
                        </q-item-section>
                      </q-item>
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item dropdown-item-danger"
                        @click="openDeleteBracket(props.row)"
                      >
                        <q-item-section side>
                          <q-icon name="delete" size="16px" color="negative" />
                        </q-item-section>
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

    <!-- ── Employee accounts ──────────────────────────────────────────────────
         One row per employee + contribution type, with the number that scheme
         knows them by. Inactive rows stay in the list (reachable through the
         status filter and each employee's history) because a retired number is
         the record of what was used before, not a row that never existed. -->
    <div v-else class="modern-table-container">
      <template v-if="loadingAccounts">
        <TableSkeleton :columns="accountColumns" />
      </template>
      <template v-else-if="!filteredAccounts.length">
        <div class="dash-empty cb-empty">
          <span class="dash-featured-icon"><q-icon name="o_tag" size="20px" /></span>
          <p class="dash-empty__title">
            {{
              isAccountsFiltered ? 'No account numbers match' : 'No employee account numbers yet'
            }}
          </p>
          <p class="dash-empty__sub">
            {{
              isAccountsFiltered
                ? 'Nothing matches the type, status and search in place.'
                : "Add each employee's number for a contribution type — SSS, PhilHealth, Pag-IBIG."
            }}
          </p>
          <q-btn
            v-if="!isAccountsFiltered"
            label="Add account"
            icon="add"
            class="dash-modal__submit cb-empty__btn"
            unelevated
            @click="openAccountDialog"
          />
        </div>
      </template>
      <template v-else>
        <q-table
          :rows="filteredAccounts"
          :columns="accountColumns"
          row-key="id"
          flat
          class="dash-qtable settings-table cb-table"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Employee</q-th>
              <q-th class="table-header-cell">Type</q-th>
              <q-th class="table-header-cell">Account number</q-th>
              <q-th class="table-header-cell">Added</q-th>
              <q-th class="table-header-cell">Status</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell">
                <button
                  type="button"
                  class="cb-employee-cell"
                  :aria-label="`View account numbers for ${props.row.employeeName || 'this employee'}`"
                  @click="openAccountHistory(props.row)"
                >
                  <span class="item-name">{{ props.row.employeeName || 'Unknown employee' }}</span>
                </button>
              </q-td>

              <q-td class="table-body-cell">
                <span class="cb-type-name">{{ accountTypeFor(props.row) }}</span>
                <span v-if="accountTypeCodeFor(props.row)" class="cb-type-code">
                  {{ accountTypeCodeFor(props.row) }}
                </span>
              </q-td>

              <q-td class="table-body-cell">
                <code class="cb-account-number">{{ props.row.accountNumber }}</code>
              </q-td>

              <q-td class="table-body-cell">{{ accountCreatedLabel(props.row) }}</q-td>

              <q-td class="table-body-cell">
                <span
                  :class="[
                    'status-badge',
                    props.row.isActive ? 'status-active' : 'status-inactive',
                  ]"
                >
                  {{ props.row.isActive ? 'Active' : 'Inactive' }}
                </span>
              </q-td>

              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 200px">
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="openAccountHistory(props.row)"
                      >
                        <q-item-section side>
                          <q-icon name="history" size="16px" />
                        </q-item-section>
                        <q-item-section>View history</q-item-section>
                      </q-item>
                      <q-item
                        v-if="props.row.isActive"
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="openReplaceAccount(props.row)"
                      >
                        <q-item-section side>
                          <q-icon name="o_swap_horiz" size="16px" />
                        </q-item-section>
                        <q-item-section>Replace number</q-item-section>
                      </q-item>
                      <q-item
                        v-if="props.row.isActive"
                        clickable
                        v-close-popup
                        class="dropdown-item dropdown-item-danger"
                        @click="openDeactivateAccount(props.row)"
                      >
                        <q-item-section side>
                          <q-icon name="visibility_off" size="16px" color="negative" />
                        </q-item-section>
                        <q-item-section>Deactivate</q-item-section>
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

    <ContributionBracketDialog
      v-model="bracketDialog"
      :bracket="editingBracket"
      :types="contributionTypes"
      :preset-type-id="typeFilter === 'all' || typeFilter === 'unassigned' ? null : typeFilter"
      :saving="savingBracket"
      @save="handleSaveBracket"
    />

    <ContributionTypesDialog
      ref="typesDialogRef"
      v-model="typesDialog"
      :types="contributionTypes"
      :brackets="brackets"
      :selected-type-id="selectedTypeId"
      :loading="loadingTypes"
      :saving="savingType"
      @create="handleCreateType"
      @update="handleUpdateType"
      @delete="openDeleteType"
    />

    <ContributionAccountDialog
      v-model="accountDialog"
      :account="editingAccount"
      :employees="employeeOptions"
      :types="contributionTypes"
      :preset-type-id="typeFilter === 'all' || typeFilter === 'unassigned' ? null : typeFilter"
      :preset-employee-id="presetAccountEmployeeId"
      :saving="savingAccount"
      @save="handleSaveAccount"
    />

    <ContributionAccountHistoryDialog
      v-model="historyDialog"
      :employee-name="historyEmployee?.employeeName || ''"
      :accounts="historyAccounts"
      :types="contributionTypes"
    />

    <!-- ── Confirmations ────────────────────────────────────────────────────
         Every irreversible write asks through the shared chrome. The wording is
         built from a snapshot of the row the question was opened over — the
         tables underneath are live, and a confirm that re-read its subject could
         name one row while writing another. -->
    <ConfirmDialog
      v-model="showBracketDelete"
      :confirm="bracketDeleteConfirm"
      :loading="isDeletingBracket"
      @confirm="commitDeleteBracket"
    />
    <ConfirmDialog
      v-model="showTypeDelete"
      :confirm="typeDeleteConfirm"
      :loading="isDeletingType"
      @confirm="commitDeleteType"
    />
    <ConfirmDialog
      v-model="showAccountReplace"
      :confirm="accountReplaceConfirm"
      :loading="isReplacingAccount"
      @confirm="commitReplaceAccount"
    />
    <ConfirmDialog
      v-model="showAccountDeactivate"
      :confirm="accountDeactivateConfirm"
      :loading="isDeactivatingAccount"
      @confirm="commitDeactivateAccount"
    />
  </div>
</template>

<script setup>
/**
 * Statutory contributions for the active company.
 *
 * Two views share one panel because they are two halves of the same setup:
 *
 *   Components        an income band with the employee and employer share
 *                     taken from it. A *type* is the scheme a component files
 *                     under ("SSS", "PhilHealth", "Pag-IBIG") and is required by
 *                     the endpoint — "Add component" routes into the type
 *                     manager when the company has none yet.
 *   Employee accounts one employee's number for one contribution type.
 *
 * The panel owns every composable the views read: the component list, the type
 * list and the account list. The Type column names a component's scheme, the
 * filter narrows both tables by it, and the account form picks from the same
 * list — so a type renamed or deleted in the dialog has to refresh everything
 * that prints it. Two instances would leave a column showing a scheme the admin
 * had already changed.
 *
 * The types are managed in a dialog reached from the Type cell or the "Manage
 * types" button, not a second rail section: the pair is edited together often
 * enough that splitting them across two sections would make it look like
 * unrelated configuration.
 *
 * Account numbers are immutable. Changing one is deactivate-then-create, which
 * is why the row menu says "Replace number" and the confirm says the old row
 * stays as history. The panel never writes an account number in place.
 */
import { computed, onMounted, ref, watch } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import ContributionAccountDialog from './ContributionAccountDialog.vue'
import ContributionAccountHistoryDialog from './ContributionAccountHistoryDialog.vue'
import ContributionBracketDialog from './ContributionBracketDialog.vue'
import ContributionTypesDialog from './ContributionTypesDialog.vue'
import { useAdminContributionAccounts } from '@/composables/admin/useAdminContributionAccounts'
import { useAdminContributionBrackets } from '@/composables/admin/useAdminContributionBrackets'
import { useAdminContributionTypes } from '@/composables/admin/useAdminContributionTypes'
import { useEmployees } from '@/composables/page/useEmployees'
import { useCompany } from '@/composables/page/useCompany'
import { useToast } from '@/composables/useToast'
import { buildDeleteConfirm } from '@/composables/utils/confirmWording'
import {
  accountCreatedLabel,
  accountTypeLabel,
  accountsForEmployee,
  conflictingActiveAccount,
  contributionEmployeeOptions,
  employeeUuidForAccount,
  sortContributionAccounts,
  validateContributionAccountForm,
} from '@/composables/utils/contributionAccounts'
import {
  bracketEffectiveLabel,
  bracketRangeLabel,
  bracketTitle,
  contributionTypeLabel,
  employeeShareLabel,
  employerShareLabel,
  sameId,
} from '@/composables/utils/contributionSettings'
import { getFullName } from '@/composables/utils/employee'
import {
  buildDeactivateAccountConfirm,
  buildReplaceAccountConfirm,
} from './contributionAccountConfirm'

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

const { companyId } = useCompany()
const toast = useToast()

const {
  contributionTypes,
  loading: loadingTypes,
  saving: savingType,
  fetchContributionTypes,
  createContributionType,
  updateContributionType,
  deleteContributionType,
} = useAdminContributionTypes()

const {
  brackets,
  loading,
  saving: savingBracket,
  fetchContributionBrackets,
  saveContributionBracket,
  setContributionBracketActive,
  deleteContributionBracket,
} = useAdminContributionBrackets()

const {
  accounts,
  loading: loadingAccounts,
  saving: savingAccount,
  fetchContributionAccounts,
  createContributionAccount,
  deactivateContributionAccount,
  replaceContributionAccount,
} = useAdminContributionAccounts()

const { employees, fetchEmployees } = useEmployees()

/**
 * Which workspace the roster in `employees` belongs to.
 *
 * `useEmployees` caches per company, but its published `employees` ref is not
 * cleared when the company changes — the next fetch replaces it. So between a
 * switch and that fetch, the ref can still be holding the previous company's
 * people, and a row's membership id from the new company could resolve against
 * the wrong person. Only trust the rows once they are known to be this
 * company's.
 */
const rosterCompanyId = ref(null)

const rosterEmployees = computed(() =>
  sameId(rosterCompanyId.value, companyId.value) ? employees.value : [],
)

/** Load the roster for the company that is active now, and record whose it is. */
async function ensureRoster() {
  const askedFor = companyId.value
  if (!askedFor) return
  try {
    await fetchEmployees()
    // A switch mid-flight leaves this naming the company that was asked for,
    // not the one now active — `rosterEmployees` then refuses the rows.
    rosterCompanyId.value = askedFor
  } catch (error) {
    console.error('Error loading the employee roster for contribution accounts:', error)
    toast.error('The employee list could not be loaded, so account numbers cannot be matched')
  }
}

const columns = [
  { name: 'component', label: 'Component', field: 'name', align: 'left' },
  { name: 'type', label: 'Type', field: 'type', align: 'left' },
  { name: 'employee', label: 'Employee share', field: 'employee', align: 'right' },
  { name: 'employer', label: 'Employer share', field: 'employer', align: 'right' },
  { name: 'effective', label: 'Effective', field: 'effectiveDate', align: 'left' },
  { name: 'status', label: 'Status', field: 'isActive', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const accountColumns = [
  { name: 'employee', label: 'Employee', field: 'employeeName', align: 'left' },
  { name: 'type', label: 'Type', field: 'typeId', align: 'left' },
  { name: 'number', label: 'Account number', field: 'accountNumber', align: 'left' },
  { name: 'created', label: 'Added', field: 'createdAt', align: 'left' },
  { name: 'status', label: 'Status', field: 'isActive', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

// ─── Views ──────────────────────────────────────────────────────────────────

/** `'components'` | `'accounts'`. The search box is shared across both. */
const view = ref('components')

const viewOptions = [
  { label: 'Components', value: 'components', icon: 'o_savings' },
  { label: 'Employee accounts', value: 'accounts', icon: 'o_tag' },
]

const subtitle = computed(() =>
  view.value === 'accounts'
    ? "Each employee's account number for a contribution type"
    : 'Statutory contribution components, and the types they belong to',
)

/**
 * The components view's call to action names the thing that is actually
 * missing. With no scheme configured the endpoint refuses every component, so
 * the button leads to the type manager rather than to a form that cannot save.
 */
const addComponentLabel = computed(() =>
  contributionTypes.value.length ? 'Add component' : 'Add a contribution type',
)

const componentsEmptyHint = computed(() =>
  contributionTypes.value.length
    ? 'Add the income bands each component applies to, with the employee and employer share.'
    : 'Add a contribution type first — every component files under one — then the income bands it applies to.',
)

// ─── Lookups ────────────────────────────────────────────────────────────────

const typeById = computed(() => {
  const map = new Map()
  for (const type of contributionTypes.value) map.set(String(type.id), type)
  return map
})

function typeFor(bracket) {
  return typeById.value.get(String(bracket?.typeId)) ?? null
}

/** The scheme a component is filed under, or the invitation to create one. */
function typeNameFor(bracket) {
  const type = typeFor(bracket)
  return type ? contributionTypeLabel(type) : 'Unassigned'
}

function typeCodeFor(bracket) {
  const type = typeFor(bracket)
  if (!type) return 'Add type'
  return type.code || 'Edit type'
}

/** An account row's scheme, preferring the live type over the stored name. */
function accountTypeFor(account) {
  return accountTypeLabel(account, typeById.value.get(String(account?.typeId)) ?? null)
}

function accountTypeCodeFor(account) {
  const type = typeById.value.get(String(account?.typeId)) ?? null
  return type?.code || account?.typeCode || ''
}

const employeeOptions = computed(() => contributionEmployeeOptions(rosterEmployees.value))

function employeeNameFor(id) {
  const employee = rosterEmployees.value.find((candidate) => sameId(candidate.id, id))
  return employee ? getFullName(employee) : ''
}

// ─── Filtering and order ────────────────────────────────────────────────────

/** `'all'` rather than `null`: q-select treats an option value of null as no option. */
const typeFilter = ref('all')

const typeFilterOptions = computed(() => {
  const options = [{ value: 'all', label: 'All types' }]
  // Accounts always have a type — the endpoint requires `component_type` — so
  // "Unassigned" would only ever produce an empty table there. Components keep
  // it for rows created before the type requirement.
  if (view.value === 'components') options.push({ value: 'unassigned', label: 'Unassigned' })
  options.push(
    ...contributionTypes.value
      .slice()
      .sort((a, b) => contributionTypeLabel(a).localeCompare(contributionTypeLabel(b)))
      .map((type) => ({ value: type.id, label: contributionTypeLabel(type) })),
  )
  return options
})

const isFiltered = computed(
  () => typeFilter.value !== 'all' || Boolean((props.searchQuery || '').trim()),
)

/**
 * The rows as the components table prints them: narrowed, then ordered by type
 * and income band so a scheme reads as a ladder rather than as whichever row was
 * saved last.
 */
const filteredBrackets = computed(() => {
  const query = (props.searchQuery || '').trim().toLowerCase()
  let rows = brackets.value.slice()

  if (typeFilter.value === 'unassigned') {
    rows = rows.filter((bracket) => !typeFor(bracket))
  } else if (typeFilter.value !== 'all') {
    rows = rows.filter((bracket) => sameId(bracket.typeId, typeFilter.value))
  }

  if (query) {
    rows = rows.filter((bracket) => {
      const type = typeFor(bracket)
      return [
        bracket.name,
        type?.name,
        type?.code,
        bracketRangeLabel(bracket),
        employeeShareLabel(bracket),
      ].some((value) => (value || '').toLowerCase().includes(query))
    })
  }

  const typeOrder = (bracket) => {
    const type = typeFor(bracket)
    return type ? contributionTypeLabel(type).toLowerCase() : '\uffff'
  }

  return rows.sort((a, b) => {
    const byType = typeOrder(a).localeCompare(typeOrder(b))
    if (byType) return byType
    const fromA = a.incomeFrom ?? Number.POSITIVE_INFINITY
    const fromB = b.incomeFrom ?? Number.POSITIVE_INFINITY
    if (fromA !== fromB) return fromA - fromB
    return String(a.id).localeCompare(String(b.id))
  })
})

const accountStatusFilter = ref('all')

const accountStatusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const isAccountsFiltered = computed(
  () =>
    typeFilter.value !== 'all' ||
    accountStatusFilter.value !== 'all' ||
    Boolean((props.searchQuery || '').trim()),
)

const filteredAccounts = computed(() => {
  const query = (props.searchQuery || '').trim().toLowerCase()
  let rows = accounts.value.slice()

  if (typeFilter.value !== 'all') {
    rows = rows.filter((account) => sameId(account.typeId, typeFilter.value))
  }

  if (accountStatusFilter.value === 'active') {
    rows = rows.filter((account) => account.isActive)
  } else if (accountStatusFilter.value === 'inactive') {
    rows = rows.filter((account) => !account.isActive)
  }

  if (query) {
    rows = rows.filter((account) =>
      [
        account.employeeName,
        account.accountNumber,
        accountTypeFor(account),
        accountTypeCodeFor(account),
      ].some((value) => (value || '').toLowerCase().includes(query)),
    )
  }

  return sortContributionAccounts(rows)
})

// ─── Component dialog ───────────────────────────────────────────────────────

const bracketDialog = ref(false)
const editingBracket = ref(null)

/**
 * Open the component form.
 *
 * The endpoint requires a type, so a company with no scheme cannot create a
 * component at all. Sending the admin into a form the server will refuse is
 * worse than sending them to the one screen that unblocks it, so the type
 * manager opens instead.
 */
function openBracketDialog() {
  if (!contributionTypes.value.length) {
    toast.info('Add a contribution type first — every component belongs to one')
    openTypesDialog()
    return
  }
  editingBracket.value = null
  bracketDialog.value = true
}

function editBracket(bracket) {
  editingBracket.value = bracket
  bracketDialog.value = true
}

async function handleSaveBracket(draft) {
  const saved = await saveContributionBracket(draft, editingBracket.value)
  if (!saved) return
  bracketDialog.value = false
  editingBracket.value = null
}

// ─── Types dialog ───────────────────────────────────────────────────────────

const typesDialog = ref(false)
const typesDialogRef = ref(null)
const selectedTypeId = ref(null)

function openTypesDialog(typeId = null) {
  selectedTypeId.value = typeId
  typesDialog.value = true
}

async function handleCreateType(form) {
  const saved = await createContributionType(form)
  if (saved) typesDialogRef.value?.resetDraft()
}

async function handleUpdateType(type, form) {
  const saved = await updateContributionType(type, form)
  if (saved) typesDialogRef.value?.resetDraft()
}

// ─── Account dialog ─────────────────────────────────────────────────────────

const accountDialog = ref(false)
const editingAccount = ref(null)
const presetAccountEmployeeId = ref(null)

function openAccountDialog() {
  editingAccount.value = null
  presetAccountEmployeeId.value = null
  accountDialog.value = true
}

function openReplaceAccount(account) {
  editingAccount.value = account
  // The row carries a membership id and a name; POST wants the roster UUID.
  // When the roster cannot settle it, the dialog asks the admin to pick.
  presetAccountEmployeeId.value = employeeUuidForAccount(account, rosterEmployees.value)
  accountDialog.value = true
}

async function handleSaveAccount(draft) {
  // Checked here as well as in the composable: a replace asks the admin to
  // confirm before writing, and there is no point asking about a draft the
  // endpoint will refuse.
  const invalid = validateContributionAccountForm(draft)
  if (invalid) {
    toast.warning(invalid)
    return
  }

  if (editingAccount.value) {
    // A replace is two writes, so the form hands its draft to the confirm
    // rather than writing straight away. Closing the form first keeps the two
    // dialogs from stacking.
    const account = editingAccount.value
    accountDialog.value = false
    pendingAccountReplace.value = { account, draft: { ...draft } }
    showAccountReplace.value = true
    return
  }

  const employeeName = employeeNameFor(draft.employeeId)
  const conflict = conflictingActiveAccount(
    accounts.value,
    { employeeId: draft.employeeId, employeeName, typeId: draft.componentType },
    rosterEmployees.value,
  )
  if (conflict) {
    toast.warning(
      `${employeeName || 'That employee'} already has an active ${accountTypeFor(conflict)} account number. Replace that number instead of adding a second one.`,
      { timeout: 6000 },
    )
    return
  }

  const saved = await createContributionAccount(draft)
  if (saved) accountDialog.value = false
}

// ─── Account confirmations ──────────────────────────────────────────────────
//
// A replace is irreversible in one direction only: the old number can never be
// reactivated, while the new one can be replaced again. Deactivation is the
// same write without the second half. Both therefore ask, and both snapshot the
// row and draft they were opened over.

const showAccountReplace = ref(false)
const pendingAccountReplace = ref(null)
const isReplacingAccount = ref(false)

const accountReplaceConfirm = computed(() => {
  const pending = pendingAccountReplace.value
  if (!pending?.account) return null
  return buildReplaceAccountConfirm({
    employeeName:
      employeeNameFor(pending.draft?.employeeId) || pending.account.employeeName || 'this employee',
    typeLabel: accountTypeFor(pending.account),
    oldNumber: pending.account.accountNumber,
    newNumber: String(pending.draft?.accountNumber ?? '').trim(),
  })
})

watch(showAccountReplace, (open) => {
  if (open || isReplacingAccount.value) return
  pendingAccountReplace.value = null
  editingAccount.value = null
  presetAccountEmployeeId.value = null
})

async function commitReplaceAccount() {
  const pending = pendingAccountReplace.value
  if (!pending || isReplacingAccount.value) return

  isReplacingAccount.value = true
  try {
    await replaceContributionAccount(pending.account, pending.draft)
  } finally {
    isReplacingAccount.value = false
    showAccountReplace.value = false
    pendingAccountReplace.value = null
    editingAccount.value = null
    presetAccountEmployeeId.value = null
  }
}

const showAccountDeactivate = ref(false)
const pendingAccount = ref(null)
const isDeactivatingAccount = ref(false)

const accountDeactivateConfirm = computed(() => {
  const pending = pendingAccount.value
  if (!pending) return null
  return buildDeactivateAccountConfirm({
    employeeName: pending.employeeName || 'this employee',
    typeLabel: accountTypeFor(pending),
    accountNumber: pending.accountNumber,
  })
})

watch(showAccountDeactivate, (open) => {
  if (open || isDeactivatingAccount.value) return
  pendingAccount.value = null
})

function openDeactivateAccount(account) {
  pendingAccount.value = account
  showAccountDeactivate.value = true
}

async function commitDeactivateAccount() {
  const pending = pendingAccount.value
  if (!pending || isDeactivatingAccount.value) return

  isDeactivatingAccount.value = true
  try {
    await deactivateContributionAccount(pending)
  } finally {
    isDeactivatingAccount.value = false
    showAccountDeactivate.value = false
    pendingAccount.value = null
  }
}

// ─── Account history ────────────────────────────────────────────────────────

const historyDialog = ref(false)
const historyEmployee = ref(null)

const historyAccounts = computed(() =>
  accountsForEmployee(accounts.value, historyEmployee.value ?? {}),
)

function openAccountHistory(account) {
  historyEmployee.value = {
    employeeCompany: account?.employeeCompany ?? null,
    employeeName: account?.employeeName ?? '',
  }
  historyDialog.value = true
}

// ─── Delete confirmations ───────────────────────────────────────────────────
//
// Each delete is three parts: a `pending` ref holding the row the question was
// asked about, a computed confirm object describing it, and a `commit*` that
// does the write. The snapshot is the point — the tables under these confirms
// are live, so a confirm that re-read its subject could describe one row while
// deleting another.

const showBracketDelete = ref(false)
const pendingBracket = ref(null)
const isDeletingBracket = ref(false)

const bracketDeleteConfirm = computed(() =>
  pendingBracket.value
    ? buildDeleteConfirm({
        name: bracketTitle(pendingBracket.value),
        noun: 'contribution component',
        consequence: 'no longer applies to a pay run that has not already used it',
      })
    : null,
)

// Cancel is the only exit the shared confirm offers and it clears nothing by
// itself, so a frozen write describing a row nobody agreed to would outlive the
// dialog that asked about it. Cleared on the close rather than on the write.
watch(showBracketDelete, (open) => {
  if (open || isDeletingBracket.value) return
  pendingBracket.value = null
})

function openDeleteBracket(bracket) {
  pendingBracket.value = bracket
  showBracketDelete.value = true
}

async function commitDeleteBracket() {
  const pending = pendingBracket.value
  if (!pending || isDeletingBracket.value) return

  isDeletingBracket.value = true
  try {
    await deleteContributionBracket(pending)
  } finally {
    isDeletingBracket.value = false
    showBracketDelete.value = false
    pendingBracket.value = null
  }
}

const showTypeDelete = ref(false)
const pendingType = ref(null)
const isDeletingType = ref(false)

const typeDeleteConfirm = computed(() =>
  pendingType.value
    ? buildDeleteConfirm({
        name: contributionTypeLabel(pendingType.value),
        noun: 'contribution type',
        consequence:
          'is removed from the company. A type that still has components or employee account numbers filed under it cannot be deleted',
      })
    : null,
)

watch(showTypeDelete, (open) => {
  if (open || isDeletingType.value) return
  pendingType.value = null
})

function openDeleteType(type) {
  pendingType.value = type
  showTypeDelete.value = true
}

async function commitDeleteType() {
  const pending = pendingType.value
  if (!pending || isDeletingType.value) return

  isDeletingType.value = true
  try {
    await deleteContributionType(pending)
    // The filter must not keep pointing at a scheme that no longer exists.
    if (sameId(typeFilter.value, pending.id)) typeFilter.value = 'all'
  } finally {
    isDeletingType.value = false
    showTypeDelete.value = false
    pendingType.value = null
  }
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────

// A filter that points at a type the latest refetch no longer contains would
// leave the table empty with no visible cause.
watch(contributionTypes, (types) => {
  if (typeFilter.value === 'all' || typeFilter.value === 'unassigned') return
  if (!types.some((type) => sameId(type.id, typeFilter.value))) typeFilter.value = 'all'
})

/**
 * Read the accounts only when the view that shows them is opened.
 *
 * The roster is re-resolved every time rather than only when `employees` looks
 * empty: that ref can still be holding the previous workspace's people, which
 * would make `employeeOptions` offer them and the replace dialog resolve a
 * membership id against the wrong roster. `useEmployees` caches per company and
 * de-duplicates, so re-asking costs one cheap call.
 */
async function loadAccounts() {
  await Promise.all([fetchContributionAccounts(), ensureRoster()])
}

watch(view, (next) => {
  if (next !== 'accounts') return
  // "Unassigned" is not an option in this view, and leaving the filter on it
  // would show an empty table with a blank picker.
  if (typeFilter.value === 'unassigned') typeFilter.value = 'all'
  loadAccounts()
})

// Ids from the previous workspace mean nothing in the next one: the dialogs and
// every pending question are dropped, and the lists are re-read. The
// composables clear their own refs on the switch; the fetch is what fills them
// for the company that is now active. Accounts stay lazy until their view opens.
watch(companyId, () => {
  view.value = 'components'
  typeFilter.value = 'all'
  accountStatusFilter.value = 'all'
  bracketDialog.value = false
  editingBracket.value = null
  typesDialog.value = false
  selectedTypeId.value = null
  accountDialog.value = false
  editingAccount.value = null
  presetAccountEmployeeId.value = null
  historyDialog.value = false
  historyEmployee.value = null
  showAccountReplace.value = false
  pendingAccountReplace.value = null
  showAccountDeactivate.value = false
  pendingAccount.value = null
  showBracketDelete.value = false
  pendingBracket.value = null
  showTypeDelete.value = false
  pendingType.value = null
  // The roster ref still holds the previous workspace's people until the next
  // fetch replaces it, so stop trusting it now rather than on the next visit.
  rosterCompanyId.value = null
  fetchContributionTypes()
  fetchContributionBrackets()
})

onMounted(() => {
  fetchContributionTypes()
  fetchContributionBrackets()
})
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

/* ── View switcher ─────────────────────────────────────────────────────────
   A recessed track carrying a raised white plate on the active segment — the
   same segmented control the dashboard and requests use. It sits under the
   title because the two views are one section, not two rail entries. */
.cb-view-toggle {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 2px;
  margin-top: 9px;
  padding: 3px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-n-100);
  box-shadow: none;
}

.cb-view-toggle :deep(.q-btn) {
  height: 28px;
  min-height: 28px;
  padding: 0 12px;
  border-radius: var(--dash-r-sm) !important;
  background: transparent !important;
  color: var(--dash-ink-3) !important;
  font-size: 12.5px;
  font-weight: 500;
  text-transform: none;
  box-shadow: none;
  white-space: nowrap;
}

.cb-view-toggle :deep(.q-btn .q-icon) {
  margin-right: 5px;
  font-size: 15px;
  color: var(--dash-ink-4);
}

.cb-view-toggle :deep(.q-btn.bg-white) {
  background: transparent !important;
  color: var(--dash-ink-3) !important;
}

.cb-view-toggle :deep(.q-btn.bg-white:hover) {
  color: var(--dash-ink-2) !important;
}

.cb-view-toggle :deep(.q-btn.bg-primary) {
  background: var(--dash-surface) !important;
  color: var(--dash-ink) !important;
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs) !important;
}

.cb-view-toggle :deep(.q-btn.bg-primary .q-icon) {
  color: var(--dash-accent);
}

.cb-view-toggle :deep(.q-btn:focus-visible) {
  outline: none;
  box-shadow:
    0 0 0 2px var(--dash-canvas),
    0 0 0 4px var(--dash-accent-ring) !important;
}

/* ── Toolbar ───────────────────────────────────────────────────────────────
   The controls are one row. The toolbar used to allow internal wrapping, which
   put "Add component" on a second line whenever the filter's content made the
   group wider than the space the title left. Now the title and the toolbar wrap
   as two units instead: a narrow card drops the whole toolbar below the title,
   and the controls never split. */
.cb-header {
  flex-wrap: wrap;
}

.cb-toolbar {
  flex: 0 0 auto;
  flex-wrap: nowrap;
  justify-content: flex-end;
}

/* Fixed width so the picker's content cannot widen the group. */
.cb-filter {
  flex: 0 0 165px;
  width: 165px;
  min-width: 0;
}

/* The status picker is a longer label ("All statuses"); it shares every field
   rule above but needs the room to print the whole word. */
.cb-status-filter {
  flex: 0 0 150px;
  width: 150px;
}

.cb-filter :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}

.cb-filter :deep(.q-field__native),
.cb-filter :deep(.q-field__input) {
  font-size: 12.5px;
  color: var(--dash-ink);
}

.cb-filter :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

.cb-manage-btn {
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--dash-line) !important;
  border-radius: var(--dash-r-md) !important;
  background: var(--dash-surface) !important;
  color: var(--dash-ink-2) !important;
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
  white-space: nowrap;
}

.cb-manage-btn:hover {
  border-color: var(--dash-line-strong) !important;
  color: var(--dash-ink) !important;
}

/* Keep the label and padding intact rather than compressing beside the others. */
.cb-toolbar .add-btn {
  flex: 0 0 auto;
}

/* ── Table ────────────────────────────────────────────────────────────────── */
.cb-num {
  text-align: right !important;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.cb-range {
  display: block;
  margin-top: 2px;
  font-size: 11.5px;
  line-height: 1.35;
  color: var(--dash-ink-4);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ── Type cell ──────────────────────────────────────────────────────────────
   The scheme and the way to manage it are the same control. An unassigned
   component is the normal state while the company is still setting up, so the
   cell invites the first type rather than looking like missing data. */
.cb-type-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 2px 6px 2px 0;
  max-width: 200px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  border-radius: var(--dash-r-sm);
}

.cb-type-cell:hover .cb-type-name {
  text-decoration: underline;
}

.cb-type-cell:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--dash-accent-ring);
}

.cb-type-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  line-height: 1.3;
}

.cb-type-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  color: var(--dash-ink-4);
}

/* ── Account rows ───────────────────────────────────────────────────────────
   The employee name is the way into that person's full history, so it is a
   button rather than plain text. The number is an identifier, not a figure:
   monospace, and never parsed as a number. */
.cb-employee-cell {
  display: inline-flex;
  padding: 0;
  border: none;
  border-radius: var(--dash-r-sm);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.cb-employee-cell:hover .item-name {
  text-decoration: underline;
}

.cb-employee-cell:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--dash-accent-ring);
}

.cb-account-number {
  padding: 2px 7px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-sm);
  background: var(--dash-n-50);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: var(--dash-ink-2);
  white-space: nowrap;
}

.cb-empty {
  padding: 40px 20px;
}

.cb-empty__btn {
  margin-top: 14px;
  height: 34px;
  padding: 0 16px;
  border-radius: var(--dash-r-md);
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
}

@media (max-width: 1023px) {
  .cb-view-toggle {
    width: 100%;
  }

  .cb-view-toggle :deep(.q-btn) {
    flex: 1;
  }

  .cb-toolbar {
    flex-wrap: wrap;
    justify-content: stretch;
  }

  .cb-filter,
  .cb-manage-btn {
    flex: 1 1 auto;
  }

  .cb-toolbar .add-btn {
    flex: 1 1 100%;
  }

  .cb-type-cell {
    max-width: 160px;
  }
}
</style>
