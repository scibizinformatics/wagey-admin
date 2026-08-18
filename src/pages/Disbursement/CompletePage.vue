<template>
  <PageShell>
    <DisbursementStepShell
      :group-id="groupId"
      :step="5"
      :group-name="groupName"
      subtitle="The finished record of this payout group."
      :status="pgiStatus"
    >
      <!-- The terminal step is a result, not a worklist, so it opens by saying
           the run is done and what it came to. Previously it looked identical to
           the four working steps, giving no sense of arrival. -->
      <div class="done">
        <span class="dash-featured-icon dash-featured-icon--good done__icon">
          <q-icon name="check" size="20px" />
        </span>
        <div class="done__text">
          <h2 class="done__title">Disbursement complete</h2>
          <p class="done__sub">
            <template v-if="completion?.completion_date">
              Closed {{ completion.completion_date }} ·
            </template>
            {{ completion?.employees_paid ?? 0 }} of {{ employees.length }} employees paid
          </p>
        </div>
        <div class="done__total">
          <span class="done__total-label">Net payroll</span>
          <span class="done__total-value dash-num">₱{{ parseAmount(completion?.net_payroll_amount) }}</span>
        </div>
      </div>

      <DisbursementStatRow :tiles="statTiles" :loading="loading" />

      <DisbursementTableCard
        v-model:search="searchTerm"
        v-model:page="page"
        v-model:page-size="pageSize"
        title="Payment summary"
        :total="filteredData.length"
        :page-size-options="pageSizeOptions"
        :loading="loading"
        searchable
        search-placeholder="Search employee, method or status"
        unit-label="employee"
        unit-label-plural="employees"
      >
        <!-- Both actions beside search rather than below the table. -->
        <template #actions>
          <q-btn
            outline
            no-caps
            dense
            icon="o_file_download"
            label="Export PDF"
            class="btn-outline"
            :disable="!filteredData.length"
            @click="exportSummary"
          />
          <q-btn
            unelevated
            no-caps
            dense
            icon="o_list"
            label="All runs"
            class="btn-primary"
            @click="goToList"
          />
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
          <template #body-cell-payment_method="props">
            <q-td :props="props">
              <span class="method">
                <q-icon :name="methodIcon(props.row.payment_method)" size="15px" />
                {{ props.row.payment_method || '—' }}
              </span>
            </q-td>
          </template>

          <template #body-cell-reference_no="props">
            <q-td :props="props">
              <span v-if="props.row.reference_no" class="dash-num">{{ props.row.reference_no }}</span>
              <span v-else class="muted">—</span>
            </q-td>
          </template>

          <template #body-cell-status="props">
            <q-td :props="props">
              <StatusPill :status="props.row.status" />
            </q-td>
          </template>

          <template #body-cell-received_by="props">
            <q-td :props="props">
              <span v-if="props.row.received_by">{{ props.row.received_by }}</span>
              <span v-else class="muted">—</span>
            </q-td>
          </template>

          <template #no-data>
            <div v-if="!loading" class="dash-empty">
              <span class="dash-featured-icon">
                <q-icon :name="searchTerm ? 'filter_alt_off' : 'o_receipt_long'" size="20px" />
              </span>
              <p class="dash-empty__title">
                {{ searchTerm ? 'No employees match this search' : 'No payment records' }}
              </p>
              <p class="dash-empty__sub">
                {{
                  searchTerm
                    ? 'Try a different name, method or status.'
                    : 'This group has no completed payments to show.'
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
import { useRoute, useRouter } from 'vue-router'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import StatusPill from 'src/components/common/StatusPill.vue'
import PageShell from 'src/components/layout/PageShell.vue'
import DisbursementStepShell from 'src/components/pages/Payroll/DisbursementStepShell.vue'
import DisbursementStatRow from 'src/components/pages/Payroll/DisbursementStatRow.vue'
import DisbursementTableCard from 'src/components/pages/Payroll/DisbursementTableCard.vue'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'

const route = useRoute()
const router = useRouter()
const groupId = route.params.id
const { fetchPayoutGroupCompletion, fetchPayoutSummaryByEmployee } = useDisbursementApi()

const loading = ref(true)
const completion = ref(null)
const employees = ref([])
const searchTerm = ref('')
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]

const columns = [
  { name: 'employee', label: 'Employee', field: 'employee', align: 'left', sortable: true },
  { name: 'position', label: 'Position', field: 'position', align: 'left', sortable: true },
  { name: 'payment_method', label: 'Method', field: 'payment_method', align: 'left' },
  { name: 'reference_no', label: 'Reference', field: 'reference_no', align: 'left' },
  { name: 'net_pay', label: 'Net pay', field: 'net_pay', align: 'right', sortable: true, format: (v) => `\u20B1${parseFloat(v || 0).toLocaleString('en-PH')}` },
  { name: 'status', label: 'Status', field: 'status', align: 'left', sortable: true },
  { name: 'released_on', label: 'Released', field: 'released_on', align: 'left' },
  { name: 'received_by', label: 'Received by', field: 'received_by', align: 'left' },
]

const pgiStatus = computed(() => route.query.pgi_status || '')

const groupName = computed(
  () =>
    completion.value?.payout_group_name ||
    completion.value?.group_name ||
    route.query.group ||
    '',
)

const statTiles = computed(() => [
  {
    key: 'paid',
    label: 'Employees paid',
    value: completion.value?.employees_paid ?? 0,
    mark: 'var(--dash-good-mark)',
  },
  {
    key: 'payouts',
    label: 'Total payouts',
    value: completion.value?.total_payouts ?? 0,
    mark: 'var(--dash-cat-1)',
  },
  {
    key: 'fees',
    label: 'Total fees',
    value: `₱${parseAmount(completion.value?.total_fees)}`,
    mark: 'var(--dash-cat-3)',
  },
  {
    key: 'date',
    label: 'Completed',
    value: completion.value?.completion_date || '—',
    mark: 'var(--dash-neutral-mark)',
    numeric: false,
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

// Narrowing the list while on a later page would strand the reader.
watch([searchTerm, pageSize], () => {
  page.value = 1
})

function goToList() {
  router.push('/app/payroll')
}

/**
 * A completed run is the record people are asked for later, so it exports.
 * Uses the same jsPDF + autotable pair as the disbursement list page.
 */
function exportSummary() {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.setFontSize(15)
  doc.text(`Payment summary - ${groupName.value || 'Payout group'}`, 14, 18)
  doc.setFontSize(9)
  doc.text(
    [
      completion.value?.completion_date ? `Completed ${completion.value.completion_date}` : '',
      `Employees paid: ${completion.value?.employees_paid ?? 0}`,
      `Net payroll: PHP ${parseAmount(completion.value?.net_payroll_amount)}`,
    ]
      .filter(Boolean)
      .join('   |   '),
    14,
    25,
  )

  doc.autoTable({
    startY: 31,
    head: [
      [
        'Employee',
        'Position',
        'Method',
        'Reference',
        'Net pay',
        'Status',
        'Released',
        'Received by',
      ],
    ],
    body: filteredData.value.map((e) => [
      e.employee || '',
      e.position || '',
      e.payment_method || '',
      e.reference_no || '',
      `PHP ${parseAmount(e.net_pay)}`,
      e.status || '',
      e.released_on || '',
      e.received_by || '',
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [16, 35, 53] },
  })

  doc.save(`payment-summary-${groupId}.pdf`)
}

const filteredData = computed(() => {
  if (!searchTerm.value.trim()) return employees.value
  const term = searchTerm.value.toLowerCase()
  return employees.value.filter((e) => {
    return (
      (e.employee || '').toLowerCase().includes(term) ||
      (e.status || '').toLowerCase().includes(term) ||
      (e.payment_method || '').toLowerCase().includes(term)
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
    const [comp, emp] = await Promise.all([
      fetchPayoutGroupCompletion(groupId),
      fetchPayoutSummaryByEmployee(groupId),
    ])
    completion.value = comp
    employees.value = emp || []
  } catch (err) {
    console.error('[CompletePage] fetch failed:', err)
  } finally {
    loading.value = false
  }
})




</script>

<style scoped>
/* ============================================================================
   Complete step — local styles only. Frame, figures strip and table chrome are
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

.btn-outline {
  height: 34px;
  padding: 0 11px;
  border-radius: var(--dash-r-md);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-2);
}

/* ── Completion banner ──
   States the outcome and its headline figure. A completed run should read as
   finished on arrival, not as another step waiting for input. */
.done {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: var(--dash-good-bg);
  border: 1px solid var(--dash-good-line);
  border-radius: var(--dash-r-lg);
  flex-wrap: wrap;
}

.done__icon {
  background: var(--dash-surface);
  flex-shrink: 0;
}

.done__text {
  flex: 1;
  min-width: 180px;
}

.done__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.012em;
  color: #05603a;
}

.done__sub {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--dash-good);
}

.done__total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.done__total-label {
  font-size: 11.5px;
  color: var(--dash-good);
}

.done__total-value {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: #05603a;
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

.muted {
  color: var(--dash-ink-4);
}

@media (max-width: 640px) {
  .done__total {
    align-items: flex-start;
    width: 100%;
    padding-top: 4px;
    border-top: 1px solid var(--dash-good-line);
  }
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
