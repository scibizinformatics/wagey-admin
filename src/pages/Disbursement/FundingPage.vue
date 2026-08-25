<template>
  <PageShell>
    <DisbursementStepShell
      :group-id="groupId"
      :step="3"
      :group-name="groupName"
      :subtitle="subtitle"
      :status="pgiStatus"
      :stepper-key="stepperKey"
    >
      <!-- This step has no list toolbar to sit in, so its forward action goes in
           the page header — also above the fold, and beside the status badge. -->
      <template #header-actions>
        <q-btn
          unelevated
          no-caps
          icon-right="o_arrow_forward"
          label="Continue to disbursement"
          class="btn-primary"
          @click="goToDisburse"
        />
      </template>

      <DisbursementStatRow :tiles="statTiles" :loading="loading" />

      <div class="funding-cols">
        <!-- ── Add funds ─────────────────────────────────────────────────── -->
        <section class="dash-panel">
          <header class="dash-panel__head">
            <q-icon name="o_account_balance_wallet" size="17px" class="dash-panel__icon" />
            <div class="dash-panel__titles">
              <h3 class="dash-title">Add funds</h3>
              <p class="dash-panel__subtitle">Record a funding entry against this group</p>
            </div>
          </header>

          <div class="dash-panel__body form">
            <!-- The gap between what is required and what has been recorded is
                 the whole question this step answers, so it leads the form
                 rather than sitting in helper text under the amount field. -->
            <div class="gap" :class="gapToneClass">
              <div class="gap__row">
                <span class="gap__label">Still to fund</span>
                <span class="gap__value dash-num">₱{{ parseAmount(remainingToFund) }}</span>
              </div>
              <div class="gap__meta">
                <span class="dash-num">₱{{ parseAmount(amounts?.net_funding_required) }}</span>
                required
                <template v-if="fundedSoFar > 0">
                  · <span class="dash-num">₱{{ parseAmount(fundedSoFar) }}</span> recorded
                </template>
              </div>
              <q-btn
                v-if="remainingToFund > 0"
                flat
                dense
                no-caps
                size="11px"
                label="Use this amount"
                class="gap__fill"
                @click="fillRemaining"
              />
            </div>

            <div class="form__grid">
              <label class="field">
                <span class="field__label">Funding source</span>
                <q-select
                  v-model="form.funding_source"
                  :options="sourceOptions"
                  emit-value
                  map-options
                  outlined
                  dense
                  hide-bottom-space
                  placeholder="Select source"
                  :popup-content-class="'disb-popup'"
                  class="dash-field"
                >
                  <template #prepend><q-icon name="o_account_balance" size="16px" /></template>
                </q-select>
              </label>

              <label class="field">
                <span class="field__label">Reference no.</span>
                <q-input
                  v-model="form.reference_no"
                  outlined
                  dense
                  hide-bottom-space
                  placeholder="e.g. 125436345"
                  class="dash-field"
                >
                  <template #prepend><q-icon name="o_tag" size="16px" /></template>
                </q-input>
              </label>

              <label class="field field--full">
                <span class="field__label">Amount</span>
                <q-input
                  v-model="form.amount"
                  type="number"
                  outlined
                  dense
                  hide-bottom-space
                  placeholder="0.00"
                  class="dash-field field__amount"
                >
                  <template #prepend><span class="peso">₱</span></template>
                </q-input>
              </label>

              <label class="field field--full">
                <span class="field__label">
                  Notes <span class="field__optional">optional</span>
                </span>
                <q-input
                  v-model="form.notes"
                  outlined
                  dense
                  hide-bottom-space
                  placeholder="What this entry covers"
                  class="dash-field"
                />
              </label>
            </div>
          </div>

          <footer class="dash-panel__footer form__foot">
            <q-btn
              unelevated
              no-caps
              icon="add"
              label="Add funds"
              class="btn-primary"
              :loading="submitting"
              :disable="!form.amount || submitting"
              @click="submitFunding"
            />
          </footer>
        </section>

        <!-- ── Earners ───────────────────────────────────────────────────── -->
        <section class="dash-panel earners">
          <header class="dash-panel__head">
            <q-icon name="o_leaderboard" size="17px" class="dash-panel__icon" />
            <div class="dash-panel__titles">
              <h3 class="dash-title">Employees in this group</h3>
              <p class="dash-panel__subtitle">Highest net pay first</p>
            </div>
          </header>

          <!-- `dash-qtable` on the scroll wrapper: it is the table's ancestor,
               so the chrome comes from the system and only the sticky header —
               which the other tables do not need — stays local. -->
          <div class="earners__scroll dash-qtable dash-qtable--flush">
            <q-table
              :rows="allEarners"
              :columns="earnerColumns"
              :loading="loading"
              :pagination="{ rowsPerPage: 0 }"
              row-key="id"
              flat
              hide-pagination
              hide-no-data
            >
              <template #body-cell-net_pay="props">
                <q-td :props="props" class="text-right earners__pay dash-num">
                  ₱{{ parseAmount(props.row.net_pay) }}
                </q-td>
              </template>

              <template #body-cell-payslip_status="props">
                <q-td :props="props">
                  <StatusPill :status="props.row.payslip_status" />
                </q-td>
              </template>

              <template #no-data>
                <div v-if="!loading" class="dash-empty">
                  <span class="dash-featured-icon">
                    <q-icon name="o_groups" size="20px" />
                  </span>
                  <p class="dash-empty__title">No employees in this group</p>
                  <p class="dash-empty__sub">
                    Employees appear once payslips are released in the earlier steps.
                  </p>
                </div>
              </template>
            </q-table>
          </div>
        </section>
      </div>

    </DisbursementStepShell>
  </PageShell>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import StatusPill from 'src/components/common/StatusPill.vue'
import PageShell from 'src/components/layout/PageShell.vue'
import DisbursementStepShell from 'src/components/pages/Payroll/DisbursementStepShell.vue'
import DisbursementStatRow from 'src/components/pages/Payroll/DisbursementStatRow.vue'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { usePayoutGroupIdentity } from 'src/composables/disbursement/usePayoutGroupIdentity'
import { useAuthStore } from 'src/boot/auth'
import { useLoadedToast } from 'src/composables/useLoadedToast'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()
const groupId = route.params.id
const { identity, resolveQuietly } = usePayoutGroupIdentity()
const stepperKey = ref(0)
  const { fetchPayoutGroupInstanceAmounts, fetchEmployeePayslips, createPgiFunding } = useDisbursementApi()
  const { notifyLoaded } = useLoadedToast()

  const loading = ref(true)
  const submitting = ref(false)
  const amounts = ref(null)
  const allEarners = ref([])

const form = ref({
  funding_source: null,
  amount: '',
  reference_no: '',
  notes: '',
})

const sourceOptions = [
  { label: 'Bank transfer', value: 'Bank Transfer' },
  { label: 'Check', value: 'Check' },
  { label: 'Paytaca', value: 'Paytaca' },
]

// The resolved run first: `pgi_status` in the query is a snapshot from whenever
// the list page last loaded, so on a refresh it can name a step the run has long
// since left. It stands in only until the run itself answers.
const pgiStatus = computed(() => identity.value?.status || route.query.pgi_status || '')

const groupName = computed(
  () =>
    amounts.value?.payout_group_name ||
    amounts.value?.group_name ||
    route.query.group ||
    identity.value?.name ||
    '',
)

// The period this run settles, from whichever of the three knows it. Naming it
// in the header saves opening the run to find out which cutoff you are looking
// at — every step page said only what the step was for.
const cutoffName = computed(
  () => amounts.value?.cutoff_name || route.query.cutoff || identity.value?.cutoff || '',
)

const subtitle = computed(() => {
  const purpose = 'Record the cash that covers this payout group.'
  return cutoffName.value ? `${cutoffName.value} · ${purpose}` : purpose
})

/**
 * Money in, against money owed. The API reports what is required and what has
 * been funded; the gap is what the step is actually asking for, so it is derived
 * here rather than left for the reader to subtract.
 */
const fundedSoFar = computed(() =>
  parseFloat(
    amounts.value?.total_funded ?? amounts.value?.funded_amount ?? amounts.value?.total_funding ?? 0,
  ),
)

const remainingToFund = computed(() => {
  const required = parseFloat(amounts.value?.net_funding_required || 0)
  return Math.max(0, required - fundedSoFar.value)
})

const gapToneClass = computed(() => (remainingToFund.value > 0 ? '' : 'gap--settled'))

const statTiles = computed(() => [
  {
    key: 'gross',
    label: 'Total gross pay',
    value: `₱${parseAmount(amounts.value?.total_gross_pay)}`,
    mark: 'var(--dash-cat-1)',
  },
  {
    key: 'deductions',
    label: 'Deductions',
    value: `₱${parseAmount(amounts.value?.total_deductions)}`,
    mark: 'var(--dash-cat-3)',
  },
  {
    key: 'advances',
    label: 'Cash advances',
    value: `₱${parseAmount(amounts.value?.total_cash_advances)}`,
    mark: 'var(--dash-cat-5)',
  },
  {
    key: 'required',
    label: 'Net funding required',
    value: `₱${parseAmount(amounts.value?.net_funding_required)}`,
    mark: 'var(--dash-good-mark)',
  },
  {
    key: 'employees',
    label: 'Employees',
    value: allEarners.value.length ?? 0,
    mark: 'var(--dash-cat-2)',
  },
])

function fillRemaining() {
  form.value.amount = String(remainingToFund.value)
}

function goToDisburse() {
  router.push(`/app/payroll/disburse/${groupId}`)
}

  const earnerColumns = [
    { name: 'employee', label: 'Employee', field: 'employee', align: 'left', sortable: true },
    { name: 'position_name', label: 'Position', field: 'position_name', align: 'left' },
    { name: 'net_pay', label: 'Net pay', field: 'net_pay', align: 'right', sortable: true },
    { name: 'payslip_status', label: 'Status', field: 'payslip_status', align: 'left', sortable: true },
  ]

function parseAmount(val) {
  return parseFloat(val || 0).toLocaleString('en-PH')
}

  onMounted(async () => {
    // The list page hands the run's name, cutoff and status over in the query, and
    // no step endpoint returns any of them — but a deep link arrives with none of
    // them and a refresh can arrive with a stale status, so the run is resolved by
    // its id either way.
    resolveQuietly(groupId)
    try {
      const [amt, earners] = await Promise.all([
        fetchPayoutGroupInstanceAmounts(groupId),
        fetchEmployeePayslips(groupId),
      ])
      amounts.value = amt
      allEarners.value = (earners || []).sort((a, b) => parseFloat(b.net_pay || 0) - parseFloat(a.net_pay || 0))
      notifyLoaded('Funding', allEarners.value.length, {
        noun: 'employee',
        nounPlural: 'employees',
      })
    } catch (err) {
      console.error('[FundingPage] fetch failed:', err)
    } finally {
      loading.value = false
    }
  })

async function submitFunding() {
  if (!form.value.amount) return
  submitting.value = true
  const employeeUuid = authStore.user?.employee_uuid
  try {
    await createPgiFunding(groupId, {
      funding_source: form.value.funding_source,
      amount: String(Number(form.value.amount)),
      reference_no: form.value.reference_no || '',
      prepared_by_employee_id: employeeUuid,
      custodian_employee_id: employeeUuid,
      notes: form.value.notes || '',
    })
    stepperKey.value++
    $q.notify({ type: 'positive', message: 'Funding added successfully!', position: 'top' })
      const [amt, earners] = await Promise.all([
        fetchPayoutGroupInstanceAmounts(groupId),
        fetchEmployeePayslips(groupId),
      ])
      amounts.value = amt
      allEarners.value = (earners || []).sort((a, b) => parseFloat(b.net_pay || 0) - parseFloat(a.net_pay || 0))
    form.value = { funding_source: null, amount: '', reference_no: '', notes: '' }
  } catch (err) {
    console.error('[FundingPage] submitFunding error:', err)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* ============================================================================
   Funding step — local styles only.
   The page frame, figures strip and shared table chrome come from
   DisbursementStepShell / DisbursementStatRow / the design system.
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

/* ── Two columns ──
   The form is the work; the roster is reference. It was a 50/50 split of two
   equally-weighted cards, so neither led. */
.funding-cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: var(--dash-gap);
  align-items: start;
}

/* ── The funding gap ──
   Reads as the step's headline figure. Green once the group is fully funded, so
   "done" is visible without reading the number. */
.gap {
  padding: 13px 15px;
  border-radius: var(--dash-r-md);
  border: 1px solid var(--dash-info-line);
  background: var(--dash-accent-bg);
}
.gap--settled {
  border-color: var(--dash-good-line);
  background: var(--dash-good-bg);
}

.gap__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.gap__label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-2);
}

.gap__value {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--dash-accent);
}
.gap--settled .gap__value {
  color: var(--dash-good);
}

.gap__meta {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--dash-ink-3);
}

.gap__fill {
  margin-top: 6px;
  margin-left: -6px;
  color: var(--dash-accent);
  font-weight: 600;
}

/* ── Form ── */
.form {
  gap: 16px;
}

.form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}
.field--full {
  grid-column: 1 / -1;
}

.field__label {
  font-size: 12px;
  font-weight: 500;
  color: var(--dash-ink-2);
}

.field__optional {
  color: var(--dash-ink-4);
  font-weight: 400;
}

.field :deep(.q-field__control) {
  height: 36px;
  min-height: 36px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.field :deep(.q-field__native),
.field :deep(.q-field__input) {
  font-size: 13px;
  color: var(--dash-ink);
}
.field :deep(.q-field__marginal) {
  height: 36px;
  color: var(--dash-ink-4);
}

/* The amount is the number being entered, so it is set larger and tabular. */
.field__amount :deep(.q-field__native) {
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.peso {
  font-size: 14px;
  font-weight: 600;
  color: var(--dash-ink-3);
}

.form__foot {
  display: flex;
  justify-content: flex-end;
}

/* ── Earners ── */
.earners__scroll {
  overflow: auto;
  max-height: 460px;
}

/* The header sticks so a long roster keeps its column names in view — the one
   thing this table needs that the shared chrome does not give it. It has to
   carry an opaque background of its own, or rows would show through as they
   scroll under it. */
.earners__scroll :deep(.q-table thead th) {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--dash-surface);
}

/* The same header strip the other four steps' tables get: `dash-qtable--flush`
   drops the top padding, which leaves the labels against the panel head above
   them. Matching it here keeps the five steps reading as one table. */
.earners__scroll :deep(.q-table thead tr:not(.q-table__progress) th) {
  padding-top: 14px;
}

.earners__scroll :deep(.q-table tbody tr:hover td) {
  background: var(--dash-n-50);
}
.earners__scroll :deep(.q-table tbody td:first-child) {
  color: var(--dash-ink);
  font-weight: 500;
}
.earners__scroll :deep(.q-table__progress) {
  height: 0;
}

.earners__pay {
  color: var(--dash-ink) !important;
  font-weight: 600;
}

/* ── Responsive ──
   The two columns stack below 1280px: at laptop width a 1fr form leaves the
   amount field too narrow to read a peso figure comfortably. */
@media (max-width: 1279px) {
  .funding-cols {
    grid-template-columns: 1fr;
  }
  .earners__scroll {
    max-height: 380px;
  }
}

@media (max-width: 640px) {
  .form__grid {
    grid-template-columns: 1fr;
  }
  .form__foot :deep(.q-btn) {
    width: 100%;
  }
}
</style>

<style>
/* Page-size and source selects teleport to the body. */
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
