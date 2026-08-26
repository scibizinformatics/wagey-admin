<template>
  <div class="payout">
    <DashSkeleton v-if="loading" variant="table" :rows="6" :columns="6" />

    <q-table
      v-else
      :rows="rows"
      :columns="columns"
      row-key="id"
      flat
      dense
      :pagination="pagination"
      :rows-per-page-options="[5, 10, 15]"
      class="dash-qtable payout__table"
      hide-no-data
      @request="onRequest"
    >
      <template v-slot:body-cell-payout_group="props">
        <q-td :props="props">
          <div class="group">
            <q-icon :name="channelIcon(props.row.disbursement_type)" size="15px" class="group__icon" />
            <div class="group__info">
              <span class="group__name">{{ props.row.payout_group }}</span>
              <span class="group__range dash-num">{{ props.row.date_range }}</span>
            </div>
          </div>
          <div v-if="props.row.notes?.length" class="group__notes">
            <span v-for="(note, ni) in props.row.notes" :key="ni" class="group__note">{{ note }}</span>
          </div>
        </q-td>
      </template>

      <template v-slot:body-cell-disbursement_type="props">
        <q-td :props="props">
          <span class="channel">
            <q-icon :name="channelIcon(props.row.disbursement_type)" size="14px" />
            {{ props.row.disbursement_type }}
          </span>
        </q-td>
      </template>

      <template v-slot:body-cell-reviewed="props">
        <q-td :props="props">
          <ProgressFraction :done="props.row.reviewed" :total="props.row.employees" />
        </q-td>
      </template>

      <template v-slot:body-cell-acknowledged="props">
        <q-td :props="props">
          <ProgressFraction :done="props.row.acknowledged" :total="props.row.employees" />
        </q-td>
      </template>

      <template v-slot:body-cell-payroll_amount="props">
        <q-td :props="props" class="amount dash-num">{{ fmtAmount(props.row.payroll_amount) }}</q-td>
      </template>

      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <CutoffStatusBadge :status="props.row.status" />
        </q-td>
      </template>

      <template v-slot:no-data>
        <div class="dash-empty">
          <q-icon name="filter_alt_off" size="26px" :style="{ color: 'var(--dash-ink-3)' }" />
          <p class="dash-empty__title">No payout groups match this view</p>
          <p class="dash-empty__sub">Clear the stage filter or the "hide completed" toggle to see them all.</p>
        </div>
      </template>
    </q-table>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import CutoffStatusBadge from '@/components/pages/Dashboard/CutoffStatusBadge.vue'
import DashSkeleton from '@/components/pages/Dashboard/DashSkeleton.vue'
import ProgressFraction from '@/components/pages/Dashboard/ProgressFraction.vue'

defineEmits(['action', 'update:pagination'])

const props = defineProps({
  groups: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  fmtCurrency: { type: Function, default: (v) => `₱${Number(v || 0).toLocaleString('en-PH')}` },
  hideCompleted: { type: Boolean, default: false },
  /** Status selected on the stage rail above, or null for all. */
  statusFilter: { type: String, default: null },
})

function fmtAmount(v) {
  return props.fmtCurrency(Number(v))
}

function channelIcon(ch) {
  const map = { Cash: 'payments', Bank: 'account_balance', GCash: 'smartphone' }
  return map[ch] ?? 'payments'
}

const columns = [
  { name: 'payout_group', label: 'Payout group', field: 'payout_group', align: 'left', sortable: true, classes: 'col-group', headerClasses: 'col-group' },
  { name: 'disbursement_type', label: 'Channel', field: 'disbursement_type', align: 'left', sortable: true, classes: 'col-channel', headerClasses: 'col-channel' },
  { name: 'employees', label: 'Employees', field: 'employees', align: 'right', sortable: true, classes: 'col-num', headerClasses: 'col-num' },
  { name: 'reviewed', label: 'Reviewed', field: 'reviewed', align: 'left', sortable: true, classes: 'col-progress', headerClasses: 'col-progress' },
  { name: 'acknowledged', label: 'Acknowledged', field: 'acknowledged', align: 'left', sortable: true, classes: 'col-progress', headerClasses: 'col-progress' },
  { name: 'payroll_amount', label: 'Payroll amount', field: 'payroll_amount', align: 'right', sortable: true, classes: 'col-amount', headerClasses: 'col-amount' },
  { name: 'status', label: 'Status', field: 'status', align: 'left', sortable: true, classes: 'col-status', headerClasses: 'col-status' },
]

const filteredRows = computed(() => {
  let list = props.groups
  if (props.hideCompleted) list = list.filter((g) => g.status !== 'complete')
  if (props.statusFilter) list = list.filter((g) => g.status === props.statusFilter)
  return list
})

const filteredCount = computed(() => filteredRows.value.length)

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  sortBy: null,
  descending: false,
  rowsNumber: 0,
})

watch(
  () => props.groups,
  () => {
    pagination.value.page = 1
    pagination.value.rowsNumber = filteredCount.value
  },
  { immediate: true },
)

// Narrowing the list can strand the reader on a page that no longer exists, so
// snap back to the first page whenever a filter changes the row count.
watch(filteredCount, (val) => {
  pagination.value.rowsNumber = val
  const lastPage = Math.max(1, Math.ceil(val / pagination.value.rowsPerPage))
  if (pagination.value.page > lastPage) pagination.value.page = lastPage
})

const rows = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.rowsPerPage
  return filteredRows.value.slice(start, start + pagination.value.rowsPerPage)
})

function onRequest(pp) {
  pagination.value = { ...pagination.value, ...pp.pagination }
}
</script>

<style scoped>
.payout {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  padding: 0 var(--dash-pad-x) 4px;
}

/* ── Table chrome ──
   Header strip, row rhythm, dividers and hover come from `dash-qtable`. Only
   the border model is this table's own: the panel needs separate borders for
   its own bottom rule to sit under the last row. */
.payout__table :deep(.q-table) {
  border-collapse: separate;
  border-spacing: 0;
}
.payout__table :deep(.q-table tbody tr:hover td) {
  background: var(--dash-hover);
}

/* The panel head's rule sits directly above this header strip, so the column
   labels keep `dash-qtable`'s own top padding rather than the flush variant's
   zero — without it they read as a second line of the panel head. The skeleton
   head takes the same offset so nothing shifts when the rows land. */
.payout :deep(.dash-skeleton__head) {
  padding-top: 13px;
}

.payout__table :deep(.q-table__bottom) {
  border-top: 1px solid var(--dash-line);
  font-size: 12px;
  color: var(--dash-ink-3);
  min-height: 44px;
  padding: 0 4px;
}

.payout__table :deep(.col-group) { min-width: 190px; }
.payout__table :deep(.col-channel) { min-width: 104px; }
.payout__table :deep(.col-num) { min-width: 84px; }
.payout__table :deep(.col-progress) { min-width: 96px; }
.payout__table :deep(.col-amount) { min-width: 122px; }
.payout__table :deep(.col-status) { min-width: 132px; }

/* ── Group cell ── */
.group {
  display: flex;
  align-items: center;
  gap: 9px;
}
.group__icon {
  color: var(--dash-ink-3);
  flex-shrink: 0;
}
.group__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.group__name {
  font-weight: 500;
  color: var(--dash-ink);
  font-size: 13px;
}
.group__range {
  font-size: 12px;
  color: var(--dash-ink-3);
}
.group__notes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 6px 0 0 24px;
}
.group__note {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dash-warn);
  background: var(--dash-warn-bg);
  border: 1px solid var(--dash-warn-line);
  padding: 1px 7px;
  border-radius: var(--dash-r-xs);
  white-space: nowrap;
}

/* ── Channel cell ── */
.channel {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.channel .q-icon {
  color: var(--dash-ink-3);
}

.amount {
  font-weight: 500;
  color: var(--dash-ink);
}

@media (max-width: 1024px) {
  .payout {
    padding: 0 var(--dash-pad-x) 4px;
    overflow-x: auto;
  }
}
</style>
