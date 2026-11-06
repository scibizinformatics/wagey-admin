<template>
  <div class="table-section">
    <div class="table-header tb-header">
      <div class="table-title-section">
        <h2 class="table-title">Tax brackets</h2>
        <p class="table-subtitle">Withholding tax bands, and the rate over each minimum</p>
      </div>
      <div class="table-actions tb-toolbar">
        <q-btn
          color="primary"
          label="Add tax bracket"
          icon="add"
          class="add-btn"
          @click="openBracketDialog"
        />
      </div>
    </div>

    <div class="modern-table-container">
      <!-- Built from the live `columns`, so the placeholder shares the real
           table's columns, labels and alignment. -->
      <template v-if="loading">
        <TableSkeleton :columns="columns" />
      </template>
      <template v-else-if="!filteredBrackets.length">
        <div class="dash-empty tb-empty">
          <span class="dash-featured-icon"><q-icon name="o_percent" size="20px" /></span>
          <p class="dash-empty__title">
            {{ isFiltered ? 'No tax brackets match' : 'No tax brackets yet' }}
          </p>
          <p class="dash-empty__sub">
            {{
              isFiltered
                ? 'Nothing matches the search in place.'
                : 'Add the monthly income bands withholding tax is taken from, with the rate over each minimum.'
            }}
          </p>
          <q-btn
            v-if="!isFiltered"
            label="Add tax bracket"
            icon="add"
            class="dash-modal__submit tb-empty__btn"
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
          class="dash-qtable settings-table tb-table"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Bracket</q-th>
              <q-th class="table-header-cell tb-num">Fixed tax</q-th>
              <q-th class="table-header-cell tb-num">Rate over minimum</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell">
                <span class="item-name">{{ taxBracketRangeLabel(props.row) }}</span>
              </q-td>

              <q-td class="table-body-cell tb-num dash-num">
                {{ taxBracketFixedLabel(props.row) }}
              </q-td>

              <q-td class="table-body-cell tb-num">{{ taxPercentLabel(props.row.percentOver) }}</q-td>

              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 170px">
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="editBracket(props.row)"
                      >
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit bracket</q-item-section>
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

    <TaxBracketDialog
      v-model="bracketDialog"
      :bracket="editingBracket"
      :saving="savingBracket"
      @save="handleSaveBracket"
    />

    <!-- The delete is irreversible and the wording is built from a snapshot of
         the row the question was opened over — the table underneath is live,
         and a confirm that re-read its subject could name one bracket while
         deleting another. -->
    <ConfirmDialog
      v-model="showBracketDelete"
      :confirm="bracketDeleteConfirm"
      :loading="isDeletingBracket"
      @confirm="commitDeleteBracket"
    />
  </div>
</template>

<script setup>
/**
 * Withholding tax for the active company: one row per income band, with the
 * fixed amount and the rate charged on income above the band's minimum.
 *
 * Deliberately its own section beside Contributions. The contribution panel is
 * a two-view pair — components, and the employee account numbers for them — and
 * tax brackets share neither half: no type, no employee share split, no account
 * number. Forcing a third view in there would make the panel's header ("Two
 * halves of the same setup") say less than it does.
 *
 * The endpoint has no `is_active` flag, so a bracket is retired by deletion
 * only, and the row menu offers Edit and Delete alone.
 */
import { computed, onMounted, ref, watch } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import TaxBracketDialog from './TaxBracketDialog.vue'
import { useCompany } from '@/composables/page/useCompany'
import { useAdminTaxBrackets } from '@/composables/admin/useAdminTaxBrackets'
import { buildDeleteConfirm } from '@/composables/utils/confirmWording'
import {
  taxBracketFixedLabel,
  taxBracketRangeLabel,
  taxPercentLabel,
} from '@/composables/utils/taxBrackets'

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

const { companyId } = useCompany()

const {
  brackets,
  loading,
  saving: savingBracket,
  fetchTaxBrackets,
  saveTaxBracket,
  deleteTaxBracket,
} = useAdminTaxBrackets()

// ─── Views ──────────────────────────────────────────────────────────────────

const isFiltered = computed(() => !!props.searchQuery.trim())

const filteredBrackets = computed(() => {
  const query = props.searchQuery.trim().toLowerCase()
  if (!query) return brackets.value
  return brackets.value.filter((bracket) =>
    [
      taxBracketRangeLabel(bracket),
      taxBracketFixedLabel(bracket),
      taxPercentLabel(bracket.percentOver),
    ]
      .join(' ')
      .toLowerCase()
      .includes(query),
  )
})

const columns = [
  { name: 'bracket', label: 'Bracket', field: 'minimum', align: 'left' },
  { name: 'fixed', label: 'Fixed tax', field: 'fixedTax', align: 'right' },
  { name: 'percent', label: 'Rate over minimum', field: 'percentOver', align: 'right' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

// ─── Component dialog ───────────────────────────────────────────────────────

const bracketDialog = ref(false)
const editingBracket = ref(null)

function openBracketDialog() {
  editingBracket.value = null
  bracketDialog.value = true
}

function editBracket(bracket) {
  editingBracket.value = bracket
  bracketDialog.value = true
}

async function handleSaveBracket(draft) {
  const saved = await saveTaxBracket(draft, editingBracket.value)
  if (!saved) return
  bracketDialog.value = false
  editingBracket.value = null
}

// ─── Delete confirmation ────────────────────────────────────────────────────

const showBracketDelete = ref(false)
const pendingBracket = ref(null)
const isDeletingBracket = ref(false)

const bracketDeleteConfirm = computed(() =>
  pendingBracket.value
    ? buildDeleteConfirm({
        name: taxBracketRangeLabel(pendingBracket.value),
        noun: 'tax bracket',
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
    await deleteTaxBracket(pending)
  } finally {
    isDeletingBracket.value = false
    showBracketDelete.value = false
    pendingBracket.value = null
  }
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────

// Ids from the previous workspace mean nothing in the next one: the dialogs and
// every pending question are dropped, and the list is re-read.
watch(companyId, () => {
  bracketDialog.value = false
  editingBracket.value = null
  showBracketDelete.value = false
  pendingBracket.value = null
  fetchTaxBrackets()
})

onMounted(() => {
  fetchTaxBrackets()
})
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

/* The add control stays its own width in a toolbar with nothing beside it. */
.tb-toolbar .add-btn {
  flex: 0 0 auto;
}

/* ── Table ────────────────────────────────────────────────────────────────── */
.tb-num {
  text-align: right !important;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.tb-empty {
  padding: 40px 20px;
}

.tb-empty__btn {
  margin-top: 14px;
  height: 34px;
  padding: 0 16px;
  border-radius: var(--dash-r-md);
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
}
</style>
