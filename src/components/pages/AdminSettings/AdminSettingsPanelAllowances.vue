<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Allowances</h2>
        <p class="table-subtitle">Allowance types and how they are paid</p>
      </div>
      <div class="table-actions">
        <q-btn
          color="primary"
          label="Add allowance"
          icon="add"
          class="add-btn"
          @click="openAdd"
        />
      </div>
    </div>

    <div class="modern-table-container">
      <!-- Built from the live `columns`, so the placeholder shares the real
           table's columns, labels and alignment. -->
      <template v-if="loading">
        <TableSkeleton :columns="columns" />
      </template>
      <template v-else-if="!filteredAllowances.length">
        <div class="dash-empty al-empty">
          <span class="dash-featured-icon"><q-icon name="o_card_giftcard" size="20px" /></span>
          <p class="dash-empty__title">
            {{ searchQuery ? 'No allowance types match' : 'No allowance types yet' }}
          </p>
          <p class="dash-empty__sub">
            {{
              searchQuery
                ? `Nothing here is called “${searchQuery}”.`
                : 'Add the allowance types this company pays — transport, meal, and any other regular allowance.'
            }}
          </p>
          <q-btn
            v-if="!searchQuery"
            label="Add allowance"
            icon="add"
            class="dash-modal__submit al-empty__btn"
            unelevated
            @click="openAdd"
          />
        </div>
      </template>
      <template v-else>
        <q-table
          :rows="filteredAllowances"
          :columns="columns"
          row-key="id"
          flat
          class="dash-qtable settings-table"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Allowance</q-th>
              <q-th class="table-header-cell">Payout policy</q-th>
              <q-th class="table-header-cell">Taxation</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell">
                <span class="item-name">{{ props.row.name }}</span>
              </q-td>

              <q-td class="table-body-cell">
                {{ payoutPolicyLabel(props.row.payout_policy, props.row.payout_policy_display) }}
              </q-td>

              <q-td class="table-body-cell">
                <span class="dash-chip" :class="props.row.is_taxable ? 'dash-chip--good' : ''">
                  <span class="dash-chip__dot" />
                  {{ taxableLabel(props.row.is_taxable) }}
                </span>
              </q-td>

              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 170px">
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="openEdit(props.row)"
                      >
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit allowance</q-item-section>
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

    <!-- Add / edit share one dialog; the row being edited decides its mode. -->
    <AllowanceFormDialog
      v-model="showDialog"
      :allowance="editingAllowance"
      :saving="saving"
      @submit="handleSubmit"
      @cancel="showDialog = false"
    />
  </div>
</template>

<script setup>
/**
 * Allowance types for the active company — the Admin Settings section that
 * replaced the retired `/app/allowances` page.
 *
 * The list, writes and labels come from the same modules the old page used
 * (`useAllowances` + `utils/allowances`), so the Request page's compensable
 * allowance picker and this table cannot disagree about what a payout policy is
 * called. Only the chrome is new: the page-level search supplies `searchQuery`,
 * and the row menu opens the same `AllowanceFormDialog`.
 */
import { computed, onMounted, ref, watch } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import AllowanceFormDialog from '@/components/pages/Allowances/AllowanceFormDialog.vue'
import { useAllowances } from '@/composables/page/useAllowances'
import { useCompany } from '@/composables/page/useCompany'
import { payoutPolicyLabel, taxableLabel } from '@/composables/utils/allowances'

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

const { companyId } = useCompany()

const {
  allowanceTypes,
  loading,
  saving,
  fetchAllowanceTypes,
  createAllowanceType,
  updateAllowanceType,
} = useAllowances()

const showDialog = ref(false)
const editingAllowance = ref(null)

const columns = [
  { name: 'name', label: 'Allowance', field: 'name', align: 'left' },
  { name: 'payout_policy', label: 'Payout policy', field: 'payout_policy', align: 'left' },
  { name: 'is_taxable', label: 'Taxation', field: 'is_taxable', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

// ─── Table ──────────────────────────────────────────────────────────────────

const filteredAllowances = computed(() => {
  const query = (props.searchQuery || '').trim().toLowerCase()
  if (!query) return allowanceTypes.value
  return allowanceTypes.value.filter((row) => {
    const policy = payoutPolicyLabel(row.payout_policy, row.payout_policy_display)
    return (
      String(row.name ?? '').toLowerCase().includes(query) ||
      String(policy ?? '').toLowerCase().includes(query) ||
      taxableLabel(row.is_taxable).toLowerCase().includes(query)
    )
  })
})

// ─── Add / edit dialog ──────────────────────────────────────────────────────

function openAdd() {
  if (!companyId.value) return
  editingAllowance.value = null
  showDialog.value = true
}

function openEdit(allowance) {
  editingAllowance.value = allowance
  showDialog.value = true
}

async function handleSubmit(payload) {
  const target = editingAllowance.value
  const ok = target
    ? await updateAllowanceType(target.id, payload)
    : await createAllowanceType(payload)
  if (ok) showDialog.value = false
}

// A dialog open on one workspace's row must not carry into the next — the
// composable clears and refetches the list, and this drops the snapshot too.
watch(companyId, () => {
  showDialog.value = false
  editingAllowance.value = null
})

onMounted(fetchAllowanceTypes)
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

.al-empty {
  padding: 40px 20px;
}

.al-empty__btn {
  margin-top: 14px;
  height: 34px;
  padding: 0 16px;
  border-radius: var(--dash-r-md);
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
}
</style>
