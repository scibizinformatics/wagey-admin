<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Payroll Groups</h2>
        <p class="table-subtitle">Manage payroll grouping and payment methods</p>
      </div>
      <div class="table-actions">
        <q-btn
          color="primary"
          label="Add payroll group"
          icon="add"
          class="add-btn"
          @click="openDialog"
        />
      </div>
    </div>

    <div class="modern-table-container">
      <!-- Built from the live `columns`, so the placeholder shares the
           real table's columns, labels and alignment. -->
      <template v-if="loadingPayrollGroups">
        <TableSkeleton :columns="columns" />
      </template>
      <template v-else-if="!filteredPayrollGroups.length">
        <div class="dash-empty">
          <span class="dash-featured-icon"><q-icon name="o_groups" size="20px" /></span>
          <p class="dash-empty__title">
            {{ searchQuery ? 'No payroll groups match' : 'No payroll groups yet' }}
          </p>
          <p class="dash-empty__sub">
            {{
              searchQuery
                ? `Nothing here is called “${searchQuery}”.`
                : 'A payroll group is who gets paid together in one run.'
            }}
          </p>
        </div>
      </template>
      <template v-else>
        <q-table
          :rows="filteredPayrollGroups"
          :columns="columns"
          row-key="id"
          flat
          no-data-label="No payroll groups found"
          class="dash-qtable settings-table"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Name</q-th>
              <q-th class="table-header-cell">Payment Method</q-th>
              <q-th class="table-header-cell">Status</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell"
                ><span class="item-name">{{ props.row.name }}</span></q-td
              >
              <q-td class="table-body-cell">{{
                getPaymentMethodName(props.row.payment_method)
              }}</q-td>
              <q-td class="table-body-cell">
                <span
                  :class="[
                    'status-badge',
                    props.row.is_active ? 'status-active' : 'status-inactive',
                  ]"
                >
                  {{ props.row.is_active ? 'Active' : 'Inactive' }}
                </span>
              </q-td>
              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 150px">
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="editPayrollGroup(props.row)"
                      >
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit payroll group</q-item-section>
                      </q-item>
                      <!-- One status item, and it flips with the row: a
                           deactivated group has to be reachable back to active
                           now that the edit dialog no longer carries a toggle. -->
                      <q-item
                        v-if="props.row.is_active"
                        clickable
                        v-close-popup
                        class="dropdown-item dropdown-item-danger"
                        @click="openDeactivate(props.row)"
                      >
                        <q-item-section side
                          ><q-icon name="o_block" size="16px" color="negative"
                        /></q-item-section>
                        <q-item-section>Deactivate</q-item-section>
                      </q-item>
                      <q-item
                        v-else
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="activatePayrollGroup(props.row)"
                      >
                        <q-item-section side
                          ><q-icon name="o_check_circle" size="16px"
                        /></q-item-section>
                        <q-item-section>Activate</q-item-section>
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

    <q-dialog v-model="dialog" persistent>
      <q-card class="dash-modal">
        <q-card-section class="dash-modal__head">
          <div class="dash-modal__head-main">
            <q-avatar size="38px" class="dash-modal__head-icon"
              ><q-icon name="payments" size="22px"
            /></q-avatar>
            <div class="dash-modal__head-titles">
              <div class="dash-modal__title">
                {{ editing ? 'Edit payroll group' : 'Add Payroll Group' }}
              </div>
              <div class="dash-modal__sub">Manage payroll group information</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
        </q-card-section>
        <q-card-section class="dash-modal__body">
          <label class="dash-modal__field">
            <span class="dash-modal__field-label"
              >Group Name<span class="dash-modal__req">*</span></span
            >
            <q-input v-model="form.name" outlined dense hide-bottom-space class="dash-field" />
          </label>

          <label class="dash-modal__field">
            <span class="dash-modal__field-label"
              >Payment Method<span class="dash-modal__req">*</span></span
            >
            <q-select
              v-model="form.payment_method"
              :options="paymentMethodOptions"
              outlined
              dense
              emit-value
              map-options
              class="dash-field"
              hide-bottom-space
              popup-content-class="dash-popup dash-popup--modal"
            >
              <template v-slot:prepend
                ><q-icon name="account_balance_wallet" size="18px"
              /></template>
            </q-select>
          </label>

          <!-- The Active switch that used to sit here is gone: status is now the
               row menu's Activate / Deactivate, next to the group it applies to.
               `form.is_active` is still carried on save so an edit cannot reset
               a deactivated group back to active. -->
        </q-card-section>
        <q-card-actions class="dash-modal__foot">
          <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" v-close-popup />
          <q-btn
            :label="editing ? 'Update' : 'Save'"
            no-caps
            class="dash-modal__submit"
            :loading="saving"
            @click="savePayrollGroup"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Deactivate gate. Reached only from the row menu's Deactivate, and the
         write itself lives in `commitDeactivate`, so `:loading` blocks a second
         click. Activating back is not gated: nothing is lost by it. -->
    <ConfirmDialog
      v-model="showDeactivateConfirm"
      :confirm="deactivateConfirm"
      :loading="isDeactivating"
      @confirm="commitDeactivate"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { buildPayrollGroupDeactivateConfirm } from './payrollGroupConfirm.js'
import { useAdminPayrollGroups } from '@/composables/admin/useAdminPayrollGroups'

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

const {
  payrollGroups,
  paymentMethods,
  loading,
  saving,
  dialog,
  editing,
  form,
  fetchPayrollGroups,
  fetchPaymentMethods,
  openDialog,
  openEditDialog,
  savePayrollGroup,
  setPayrollGroupActive,
} = useAdminPayrollGroups()

const loadingPayrollGroups = computed(() => loading.value)

const paymentMethodOptions = computed(() =>
  paymentMethods.value.map((pm) => ({ label: pm.name, value: pm.id })),
)

const columns = ref([
  { name: 'name', label: 'Name', field: 'name', align: 'left' },
  { name: 'payment_method', label: 'Payment Method', field: 'payment_method', align: 'left' },
  { name: 'is_active', label: 'Status', field: 'is_active', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
])

const filteredPayrollGroups = computed(() => {
  if (!props.searchQuery) return payrollGroups.value
  const q = props.searchQuery.toLowerCase()
  return payrollGroups.value.filter(
    (g) =>
      (g.name || '').toLowerCase().includes(q) ||
      (g.display_name || '').toLowerCase().includes(q) ||
      (g.payment_method_name || '').toLowerCase().includes(q),
  )
})

function getPaymentMethodName(id) {
  const pm = paymentMethods.value.find((p) => p.id === id)
  return pm ? pm.name : (id ?? '—')
}

function editPayrollGroup(group) {
  openEditDialog(group)
}

// ─── Deactivate / activate ───────────────────────────────────────────────────

/** The row the question was asked about, frozen — the list under the dialog is
 * live, so a confirm that re-read its subject could describe one group while
 * writing another. */
const showDeactivateConfirm = ref(false)
const pendingDeactivate = ref(null)
const isDeactivating = ref(false)

const deactivateConfirm = computed(() =>
  pendingDeactivate.value
    ? buildPayrollGroupDeactivateConfirm({
        name: pendingDeactivate.value.name,
        paymentMethodLabel: getPaymentMethodName(pendingDeactivate.value.payment_method),
      })
    : null,
)

// Cancel clears nothing by itself, so the frozen row is dropped on the close
// rather than on the write — never while the write is in flight.
watch(showDeactivateConfirm, (open) => {
  if (open || isDeactivating.value) return
  pendingDeactivate.value = null
})

/** Opens the question. The write lives in `commitDeactivate`, below. */
function openDeactivate(group) {
  pendingDeactivate.value = group
  showDeactivateConfirm.value = true
}

async function commitDeactivate() {
  const pending = pendingDeactivate.value
  if (!pending || isDeactivating.value) return

  isDeactivating.value = true
  try {
    await setPayrollGroupActive(pending, false)
  } finally {
    isDeactivating.value = false
    showDeactivateConfirm.value = false
    pendingDeactivate.value = null
  }
}

/** Switching a group back on loses nothing, so it takes effect straight away. */
function activatePayrollGroup(group) {
  setPayrollGroupActive(group, true)
}

onMounted(async () => {
  await Promise.all([fetchPayrollGroups(), fetchPaymentMethods()])
})
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';
</style>
