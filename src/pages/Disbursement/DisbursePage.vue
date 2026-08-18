<template>
  <PageShell>
    <DisbursementStepShell
      :group-id="groupId"
      :step="4"
      :group-name="groupName"
      subtitle="Release pay and record what each employee has claimed."
      :status="pgiStatus"
      :stepper-key="stepperKey"
    >
      <DisbursementStatRow :tiles="statTiles" :loading="loading" />

      <DisbursementTableCard
        v-model:search="searchTerm"
        v-model:page="page"
        v-model:page-size="pageSize"
        title="Disbursement details"
        :total="filteredData.length"
        :page-size-options="pageSizeOptions"
        :loading="loading"
        searchable
        search-placeholder="Search employee, method or status"
        unit-label="employee"
        unit-label-plural="employees"
      >
        <!-- Beside search, so it is reachable without scrolling past the table. -->
        <template #actions>
          <span class="action-note dash-num">
            {{ summary?.released ?? 0 }} released · {{ summary?.pending_claim ?? 0 }} pending
          </span>
          <q-btn
            unelevated
            no-caps
            dense
            icon="o_send"
            label="Disburse all"
            class="btn-primary"
            :loading="disbursing"
            :disable="!disbursements.length || disbursing"
            @click="confirmDisburseAll"
          >
            <q-tooltip v-if="!disbursements.length">Nothing to disburse yet</q-tooltip>
          </q-btn>
        </template>

        <q-table
          :rows="paginatedData"
          :columns="columns"
          :loading="loading"
          :pagination="{ rowsPerPage: 0 }"
          row-key="id"
          flat
          hide-no-data
          hide-pagination
        >
          <template #body-cell-payout_method="props">
            <q-td :props="props">
              <span class="method">
                <q-icon :name="methodIcon(props.row.payout_method)" size="15px" />
                {{ props.row.payout_method || '—' }}
              </span>
            </q-td>
          </template>

          <template #body-cell-claim_status="props">
            <q-td :props="props">
              <StatusPill :status="props.row.claim_status" />
            </q-td>
          </template>

          <template #body-cell-proof_of_payment="props">
            <q-td :props="props">
              <!-- Proof is a link when present, and plainly absent when not. It
                   used to render whatever the field held as bare text. -->
              <a
                v-if="props.row.proof_of_payment"
                :href="props.row.proof_of_payment"
                target="_blank"
                rel="noopener noreferrer"
                class="proof"
              >
                <q-icon name="o_receipt_long" size="14px" />
                View
              </a>
              <span v-else class="muted">—</span>
            </q-td>
          </template>

          <template #body-cell-reference_no="props">
            <q-td :props="props">
              <span v-if="props.row.reference_no" class="dash-num">{{ props.row.reference_no }}</span>
              <span v-else class="muted">—</span>
            </q-td>
          </template>

          <template #no-data>
            <div v-if="!loading" class="dash-empty">
              <span class="dash-featured-icon">
                <q-icon :name="searchTerm ? 'filter_alt_off' : 'o_payments'" size="20px" />
              </span>
              <p class="dash-empty__title">
                {{ searchTerm ? 'No employees match this search' : 'Nothing to disburse' }}
              </p>
              <p class="dash-empty__sub">
                {{
                  searchTerm
                    ? 'Try a different name, method or status.'
                    : 'Employees appear here once this group is funded.'
                }}
              </p>
            </div>
          </template>
        </q-table>
      </DisbursementTableCard>
    </DisbursementStepShell>
  </PageShell>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import StatusPill from 'src/components/common/StatusPill.vue'
import PageShell from 'src/components/layout/PageShell.vue'
import DisbursementStepShell from 'src/components/pages/Payroll/DisbursementStepShell.vue'
import DisbursementStatRow from 'src/components/pages/Payroll/DisbursementStatRow.vue'
import DisbursementTableCard from 'src/components/pages/Payroll/DisbursementTableCard.vue'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'

const route = useRoute()
const $q = useQuasar()
const groupId = route.params.id
const stepperKey = ref(0)
const { fetchPayoutGroupInstanceSummary, fetchDisbursementEmployees, disbursePgi } = useDisbursementApi()

const loading = ref(true)
const disbursing = ref(false)
const summary = ref(null)
const disbursements = ref([])
const searchTerm = ref('')
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]

const columns = [
  { name: 'employee', label: 'Employee', field: 'employee', align: 'left', sortable: true },
  { name: 'position', label: 'Position', field: 'position', align: 'left', sortable: true },
  { name: 'net_pay', label: 'Net pay', field: 'net_pay', align: 'right', sortable: true, format: (v) => `\u20B1${parseFloat(v || 0).toLocaleString('en-PH')}` },
  { name: 'payout_method', label: 'Method', field: 'payout_method', align: 'left', sortable: true },
  { name: 'claim_status', label: 'Claim status', field: 'claim_status', align: 'left', sortable: true },
  { name: 'claimed_on', label: 'Claimed', field: 'claimed_on', align: 'left' },
  { name: 'proof_of_payment', label: 'Proof', field: 'proof_of_payment', align: 'left' },
  { name: 'reference_no', label: 'Reference', field: 'reference_no', align: 'left' },
]

// Narrowing the list while on a later page would strand the reader.
watch([searchTerm, pageSize], () => {
  page.value = 1
})

const pgiStatus = computed(() => route.query.pgi_status || '')

const groupName = computed(
  () => summary.value?.payout_group_name || summary.value?.group_name || route.query.group || '',
)

const statTiles = computed(() => [
  {
    key: 'funded',
    label: 'Net funded',
    value: `₱${parseAmount(summary.value?.net_funded_amount)}`,
    mark: 'var(--dash-cat-1)',
  },
  {
    key: 'released',
    label: 'Released',
    value: summary.value?.released ?? 0,
    mark: 'var(--dash-good-mark)',
  },
  {
    key: 'pending',
    label: 'Pending claims',
    value: summary.value?.pending_claim ?? 0,
    mark: 'var(--dash-warn-mark)',
  },
  {
    key: 'failed',
    label: 'Failed',
    value: summary.value?.failed ?? 0,
    mark: 'var(--dash-critical-mark)',
  },
  {
    key: 'cash',
    label: 'Cash on hand',
    value: `₱${parseAmount(summary.value?.cash_on_hand_remaining)}`,
    mark: 'var(--dash-cat-2)',
  },
])

const METHOD_ICONS = {
  cash: 'o_payments',
  bank: 'o_account_balance',
  gcash: 'o_smartphone',
  check: 'o_receipt_long',
  cheque: 'o_receipt_long',
  paytaca: 'o_qr_code',
}

function methodIcon(method) {
  const key = String(method || '').toLowerCase()
  const hit = Object.keys(METHOD_ICONS).find((k) => key.includes(k))
  return hit ? METHOD_ICONS[hit] : 'o_account_balance_wallet'
}

const filteredData = computed(() => {
  if (!searchTerm.value.trim()) return disbursements.value
  const term = searchTerm.value.toLowerCase()
  return disbursements.value.filter((d) => {
    return (
      (d.employee || '').toLowerCase().includes(term) ||
      (d.payout_method || '').toLowerCase().includes(term) ||
      (d.claim_status || '').toLowerCase().includes(term)
    )
  })
})

const paginatedData = computed(() => {
  if (!filteredData.value) return []
  const start = (page.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

function parseAmount(val) {
  return parseFloat(val || 0).toLocaleString('en-PH')
}

onMounted(async () => {
  try {
    const [summ, data] = await Promise.all([
      fetchPayoutGroupInstanceSummary(groupId),
      fetchDisbursementEmployees(groupId),
    ])
    summary.value = summ
    disbursements.value = data || []
  } catch (err) {
    console.error('[DisbursePage] fetch failed:', err)
  } finally {
    loading.value = false
  }
})

// Disbursing releases real money for every employee at once and cannot be
// undone from this screen, so it confirms first — it used to fire on one click.
function confirmDisburseAll() {
  $q.dialog({
    title: 'Disburse all?',
    message: `This releases pay for ${disbursements.value.length} employee${
      disbursements.value.length === 1 ? '' : 's'
    } in this group. It cannot be undone here.`,
    cancel: { label: 'Cancel', flat: true, noCaps: true },
    ok: { label: 'Disburse all', unelevated: true, color: 'primary', noCaps: true },
    persistent: true,
  }).onOk(() => disburseAll())
}

async function disburseAll() {
  disbursing.value = true
  try {
    const epiIds = disbursements.value.map((e) => e.epi_id)
    await disbursePgi(groupId, epiIds)
    stepperKey.value++
    $q.notify({ type: 'positive', message: 'Disbursement successful!', position: 'top' })
    const [summ, data] = await Promise.all([
      fetchPayoutGroupInstanceSummary(groupId),
      fetchDisbursementEmployees(groupId),
    ])
    summary.value = summ
    disbursements.value = data || []
  } catch (err) {
    console.error('[DisbursePage] disburseAll ✖ error:', err)
  } finally {
    disbursing.value = false
  }
}
</script>

<style scoped>
/* ============================================================================
   Disburse step — local styles only. Frame, figures strip and table chrome are
   shared (DisbursementStepShell / DisbursementStatRow / DisbursementTableCard).
   ========================================================================== */
.btn-primary {
  height: 34px;
  padding: 0 16px;
  border-radius: var(--dash-r-md);
  background: var(--dash-brand);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs);
}
.btn-primary:hover {
  background: #193d5c;
}
.btn-primary:disabled,
.btn-primary[disabled] {
  background: var(--dash-n-200);
  color: var(--dash-ink-4);
  box-shadow: none;
}

/* Sits immediately left of the toolbar action, so the button's precondition is
   readable beside the button rather than only in a disabled tooltip. Hidden on
   narrow viewports, where the toolbar needs its width for search and the action
   itself. */
.action-note {
  font-size: 12.5px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}

@media (max-width: 1023px) {
  .action-note {
    display: none;
  }
}

/* ── Cells ── */
.method {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}
.method .q-icon {
  color: var(--dash-ink-4);
  flex-shrink: 0;
}

.proof {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--dash-accent);
  font-weight: 500;
  text-decoration: none;
}
.proof:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}
.proof:focus-visible {
  outline: none;
  border-radius: var(--dash-r-xs);
  box-shadow: 0 0 0 2px var(--dash-surface), 0 0 0 4px var(--dash-accent-ring);
}

.muted {
  color: var(--dash-ink-4);
}
</style>

<style>
.disb-popup {
  border-radius: var(--dash-r-md) !important;
  border: 1px solid var(--dash-line);
  box-shadow: var(--dash-shadow-lg) !important;
  padding: 4px;
}
.disb-popup .q-item {
  min-height: 32px;
  padding: 0 9px;
  border-radius: var(--dash-r-sm);
  font-size: 12.5px;
  color: var(--dash-ink-2);
}
.disb-popup .q-item:hover {
  background: var(--dash-n-50);
  color: var(--dash-ink);
}
.disb-popup .q-item--active {
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
  font-weight: 600;
}
</style>
