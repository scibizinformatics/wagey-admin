<template>
  <div class="table-section">
    <div class="table-header cb-header">
      <div class="table-title-section">
        <h2 class="table-title">Contributions</h2>
        <p class="table-subtitle">
          Statutory contribution components, and the types they belong to
        </p>
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
          aria-label="Filter components by contribution type"
        >
          <template v-slot:prepend><q-icon name="filter_list" size="18px" /></template>
        </q-select>
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
          label="Add component"
          icon="add"
          class="add-btn"
          @click="openBracketDialog"
        />
      </div>
    </div>

    <div class="modern-table-container">
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
                : 'Add the income bands each component applies to, with the employee and employer share.'
            }}
          </p>
          <q-btn
            v-if="!isFiltered"
            label="Add component"
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
                   for subcategories. A component may have no type yet, which is
                   why this cell is also where the first type is created. -->
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

    <!-- ── Confirmations ────────────────────────────────────────────────────
         Both deletes are irreversible, so both ask through the shared chrome
         rather than Quasar's stock box. The wording is built from the row the
         question was opened over — the table and the type dialog underneath are
         live, and a confirm that re-read its subject could name one row while
         deleting another. -->
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
  </div>
</template>

<script setup>
/**
 * Statutory contribution components for the active company.
 *
 * A *component* (the API's word; the table says "component") is an income band
 * with the employee and employer share taken from it. A *type* is the scheme it
 * files under, and it is optional: a company can add its components first and
 * create the schemes from the Type column whenever they are ready.
 *
 * The panel owns both composables — the component list and the type list — for
 * the same reason `AdminSettingsPanelCompensable` owns its categories and
 * subcategories: the Type column names a component's scheme and the filter
 * narrows by it, so a type renamed or deleted in the dialog has to refresh the
 * table that prints it. Two instances would leave that column showing a scheme
 * the admin had already changed until a reload.
 *
 * The types are managed in a dialog reached from the Type cell or the
 * "Manage types" button, not a second rail section: the pair is edited together
 * often enough that splitting them across two sections would make it look like
 * unrelated configuration.
 */
import { computed, onMounted, ref, watch } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import ContributionBracketDialog from './ContributionBracketDialog.vue'
import ContributionTypesDialog from './ContributionTypesDialog.vue'
import { useAdminContributionBrackets } from '@/composables/admin/useAdminContributionBrackets'
import { useAdminContributionTypes } from '@/composables/admin/useAdminContributionTypes'
import { useCompany } from '@/composables/page/useCompany'
import { buildDeleteConfirm } from '@/composables/utils/confirmWording'
import {
  bracketEffectiveLabel,
  bracketRangeLabel,
  bracketTitle,
  contributionTypeLabel,
  employeeShareLabel,
  employerShareLabel,
  sameId,
} from '@/composables/utils/contributionSettings'

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

const { companyId } = useCompany()

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

const columns = [
  { name: 'component', label: 'Component', field: 'name', align: 'left' },
  { name: 'type', label: 'Type', field: 'type', align: 'left' },
  { name: 'employee', label: 'Employee share', field: 'employee', align: 'right' },
  { name: 'employer', label: 'Employer share', field: 'employer', align: 'right' },
  { name: 'effective', label: 'Effective', field: 'effectiveDate', align: 'left' },
  { name: 'status', label: 'Status', field: 'isActive', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

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

// ─── Filtering and order ────────────────────────────────────────────────────

/** `'all'` rather than `null`: q-select treats an option value of null as no option. */
const typeFilter = ref('all')

const typeFilterOptions = computed(() => [
  { value: 'all', label: 'All types' },
  { value: 'unassigned', label: 'Unassigned' },
  ...contributionTypes.value
    .slice()
    .sort((a, b) => contributionTypeLabel(a).localeCompare(contributionTypeLabel(b)))
    .map((type) => ({ value: type.id, label: contributionTypeLabel(type) })),
])

const isFiltered = computed(
  () => typeFilter.value !== 'all' || Boolean((props.searchQuery || '').trim()),
)

/**
 * The rows as the table prints them: narrowed, then ordered by type and income
 * band so a scheme reads as a ladder rather than as whichever row was saved
 * last.
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

// ─── Component dialog ───────────────────────────────────────────────────────

const bracketDialog = ref(false)
const editingBracket = ref(null)

/**
 * Open the component form. A component may exist before its type does, so this
 * no longer detours through the types dialog when the company has none — the
 * Type column is where a scheme gets created.
 */
function openBracketDialog() {
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

// ─── Confirmations ──────────────────────────────────────────────────────────
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
          'is removed from the company. A type that still has components filed under it cannot be deleted',
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

// Ids from the previous workspace mean nothing in the next one: the dialogs and
// every pending question are dropped, and both lists are re-read. The
// composables clear their own refs on the switch; the fetch is what fills them
// for the company that is now active.
watch(companyId, () => {
  typeFilter.value = 'all'
  bracketDialog.value = false
  editingBracket.value = null
  typesDialog.value = false
  selectedTypeId.value = null
  showBracketDelete.value = false
  pendingBracket.value = null
  showTypeDelete.value = false
  pendingType.value = null
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

/* ── Toolbar ───────────────────────────────────────────────────────────────
   The three controls are one row. The toolbar used to allow internal wrapping,
   which put "Add component" on a second line whenever the filter's content made
   the group wider than the space the title left. Now the title and the toolbar
   wrap as two units instead: a narrow card drops the whole toolbar below the
   title, and the controls never split. */
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
