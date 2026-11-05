<template>
  <PageShell>
    <CashAdvanceStepShell
      :pgi-id="pgiId"
      :step="2"
      :stage="stage"
      :status="groupStatus"
      :group-name="groupName"
      :subtitle="subtitle"
      :stepper-key="stepperKey"
    >
      <DisbursementStatRow :tiles="statTiles" :loading="loading" />

      <!-- The funding detail is the step's only source of the amount owed. If it
           could not be read, writing a figure against it would be guessing, so the
           form is held behind this notice rather than left open with a ₱0.00 gap. -->
      <div v-if="!loading && !summary.loaded" class="ca-notice" role="status">
        <q-icon name="o_info" size="16px" class="ca-notice__icon" />
        <span class="ca-notice__text">
          The funding figures for these advances could not be read. Funding is disabled until they
          load.
        </span>
        <q-btn
          outline
          no-caps
          dense
          icon="refresh"
          label="Retry"
          class="btn-outline"
          @click="refresh"
        />
      </div>

      <div class="funding-cols">
        <!-- ── Add funds ─────────────────────────────────────────────────── -->
        <section class="dash-panel">
          <header class="dash-panel__head">
            <q-icon name="o_account_balance_wallet" size="17px" class="dash-panel__icon" />
            <div class="dash-panel__titles">
              <h3 class="dash-title">Add funds</h3>
              <p class="dash-panel__subtitle">Record a funding entry against these advances</p>
            </div>
          </header>

          <div class="dash-panel__body form">
            <!-- The gap between what the advances come to and what has been
                 recorded is the whole question this step answers, so it leads the
                 form rather than sitting in helper text under the amount field. -->
            <div class="gap" :class="gapToneClass">
              <div class="gap__row">
                <span class="gap__label">Still to fund</span>
                <span class="gap__value dash-num">₱{{ parseAmount(summary.remaining) }}</span>
              </div>
              <div class="gap__meta">
                <span class="dash-num">₱{{ parseAmount(summary.total) }}</span>
                required
                <template v-if="summary.funded > 0">
                  · <span class="dash-num">₱{{ parseAmount(summary.funded) }}</span> recorded
                </template>
              </div>
              <q-btn
                v-if="summary.remaining > 0"
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
                  placeholder="e.g. FND-2026-0001"
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
                <span
                  v-if="amountHint"
                  :class="['field__hint', `field__hint--${amountHint.tone}`]"
                  role="status"
                >
                  <q-icon
                    :name="amountHint.tone === 'good' ? 'o_check_circle' : 'o_error'"
                    size="13px"
                  />
                  {{ amountHint.text }}
                </span>
              </label>

              <label class="field">
                <span class="field__label">Prepared by</span>
                <q-select
                  v-model="form.prepared_by_employee_id"
                  :options="employeeOptions"
                  emit-value
                  map-options
                  outlined
                  dense
                  hide-bottom-space
                  placeholder="Select employee"
                  :popup-content-class="'disb-popup'"
                  class="dash-field"
                >
                  <template #prepend><q-icon name="o_badge" size="16px" /></template>
                </q-select>
              </label>

              <label class="field">
                <span class="field__label">Custodian</span>
                <q-select
                  v-model="form.custodian_employee_id"
                  :options="employeeOptions"
                  emit-value
                  map-options
                  outlined
                  dense
                  hide-bottom-space
                  placeholder="Select employee"
                  :popup-content-class="'disb-popup'"
                  class="dash-field"
                >
                  <template #prepend><q-icon name="o_person" size="16px" /></template>
                </q-select>
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
              :disable="!canSubmit"
              @click="requestFunding"
            />
          </footer>
        </section>

        <!-- ── Funding history ───────────────────────────────────────────── -->
        <section class="dash-panel">
          <header class="dash-panel__head">
            <q-icon name="o_receipt_long" size="17px" class="dash-panel__icon" />
            <div class="dash-panel__titles">
              <h3 class="dash-title">Funding history</h3>
              <p class="dash-panel__subtitle">Every entry recorded against these advances</p>
            </div>
          </header>

          <div class="history-scroll dash-qtable dash-qtable--flush">
            <TableSkeleton
              v-if="loading"
              :columns="historyColumns"
              :rows="3"
              aria-label="Loading funding history"
              wrap-class="dash-page-body"
            />

            <div v-else-if="!summary.history.length" class="dash-empty dash-page-body">
              <span class="dash-featured-icon">
                <q-icon name="o_account_balance_wallet" size="20px" />
              </span>
              <p class="dash-empty__title">No funding recorded yet</p>
              <p class="dash-empty__sub">
                Entries appear here as they are recorded against this payout group.
              </p>
            </div>

            <q-table
              v-else
              :rows="summary.history"
              :columns="historyColumns"
              :pagination="{ rowsPerPage: 0 }"
              flat
              hide-pagination
            >
              <template #body-cell-source="props">
                <q-td :props="props">{{ props.row.source || '—' }}</q-td>
              </template>
              <template #body-cell-amount="props">
                <q-td :props="props" class="text-right history-amount dash-num">
                  {{ formatCurrency(props.row.amount) }}
                </q-td>
              </template>
              <template #body-cell-reference="props">
                <q-td :props="props">
                  <span v-if="props.row.reference" class="dash-num">{{ props.row.reference }}</span>
                  <span v-else class="muted">—</span>
                </q-td>
              </template>
              <template #body-cell-preparedDate="props">
                <q-td :props="props">
                  <span v-if="props.row.preparedDate" class="dash-num">
                    {{ formatDateTime(props.row.preparedDate) }}
                  </span>
                  <span v-else class="muted">—</span>
                </q-td>
              </template>
              <template #body-cell-preppedBy="props">
                <q-td :props="props">
                  <span v-if="props.row.preparedBy">{{ props.row.preparedBy }}</span>
                  <span v-else class="muted">—</span>
                </q-td>
              </template>
              <template #body-cell-custodian="props">
                <q-td :props="props">
                  <span v-if="props.row.custodian">{{ props.row.custodian }}</span>
                  <span v-else class="muted">—</span>
                </q-td>
              </template>
              <template #body-cell-notes="props">
                <q-td :props="props">
                  <span v-if="props.row.notes" class="history-notes">{{ props.row.notes }}</span>
                  <span v-else class="muted">—</span>
                </q-td>
              </template>
            </q-table>
          </div>

          <!-- The BCH contract is only present when the payment method is BCH.
               It is not a missing field when absent, so the panel is absent too. -->
          <div v-if="summary.bchContract" class="bch">
            <div class="bch__head">
              <q-icon name="o_qr_code_2" size="16px" class="bch__icon" />
              <span class="bch__title">BCH contract</span>
              <StatusPill :status="summary.bchContract.status" />
            </div>
            <p class="bch__address dash-num">{{ summary.bchContract.address || '—' }}</p>
            <p class="bch__meta">
              {{ summary.bchContract.employeeCount }} employees ·
              {{ formatSats(summary.bchContract.totalSats) }} sats
            </p>
          </div>
        </section>
      </div>

      <ConfirmDialog
        v-model="showConfirm"
        :confirm="confirm"
        :loading="submitting"
        @confirm="onConfirm"
      />
    </CashAdvanceStepShell>
  </PageShell>
</template>

<script setup>
/**
 * Step 2 of the cash-advance flow: fund the advances.
 *
 * Mirrors the payroll Funding step — the same gap-led form, the same short /
 * settled / over reading of the entered amount, the same history beside it — with
 * two differences the cash-advance endpoint requires: an explicit preparer and
 * custodian (both employee UUIDs), and a BCH contract panel when the payment
 * method produced one.
 *
 * Funding in instalments is legitimate, so a short amount is a decision to
 * confirm rather than a mistake to refuse. The one thing this page will not do is
 * let a figure be written when the amount owed could not be read: guessing there
 * would record money against a total nobody measured.
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageShell from 'src/components/layout/PageShell.vue'
import TableSkeleton from 'src/components/common/TableSkeleton.vue'
import ConfirmDialog from 'src/components/common/ConfirmDialog.vue'
import StatusPill from 'src/components/common/StatusPill.vue'
import CashAdvanceStepShell from 'src/components/pages/CashAdvance/CashAdvanceStepShell.vue'
import DisbursementStatRow from 'src/components/pages/Payroll/DisbursementStatRow.vue'
import { buildCashAdvanceFundingConfirm } from 'src/components/pages/CashAdvance/cashAdvanceConfirm'
import { useCashAdvanceApi } from 'src/composables/disbursement/useCashAdvanceApi'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { usePayoutGroupIdentity } from 'src/composables/disbursement/usePayoutGroupIdentity'
import { useEmployees } from 'src/composables/page/useEmployees'
import { useLoadedToast } from 'src/composables/useLoadedToast'
import { useToast } from 'src/composables/useToast'
import { useAuthStore } from 'src/boot/auth'
import { summariseCashAdvanceFunding } from 'src/composables/utils/cashAdvance'
import { extractErrorMessage } from 'src/composables/utils/http'
import { formatCurrency, formatDateTime } from 'src/composables/utils/format'
import { getFullName } from 'src/composables/utils/employee'
import { createRequestToken } from 'src/composables/utils/requestToken'
import { furtherCashAdvanceStage, normalizeStatusKey } from 'src/constants/cashAdvanceStatus'

const route = useRoute()
const toast = useToast()
const authStore = useAuthStore()
const { notifyLoaded } = useLoadedToast()
const pgiId = route.params.id
const { identity, resolveQuietly } = usePayoutGroupIdentity()
const { fetchCashAdvanceFunding, createCashAdvanceFunding } = useCashAdvanceApi()
const { invalidateCache } = useDisbursementApi()
const { employees, fetchEmployees } = useEmployees()

const loading = ref(true)
const submitting = ref(false)
const funding = ref(null)
const stepperKey = ref(0)
const guard = createRequestToken()

const summary = computed(() => summariseCashAdvanceFunding(funding.value))

const groupStatus = computed(() =>
  normalizeStatusKey(summary.value.groupStatus || identity.value?.status || route.query.pgi_status),
)
const caStatus = computed(() =>
  normalizeStatusKey(
    summary.value.groupStatus || identity.value?.cashAdvanceStatus || route.query.ca_status,
  ),
)
const groupName = computed(() => identity.value?.name || route.query.group || '')
const cutoffName = computed(() => identity.value?.cutoff || route.query.cutoff || '')

/**
 * The stage the flow is actually on. Once funding covers the advances there is
 * nothing left for this step to ask, so the flow moves to Disburse — even if the
 * payroll run's own status has not caught up yet. The PGI's cash-advance status
 * can carry it further (disbursing/complete).
 */
const stage = computed(() =>
  summary.value.fullyFunded
    ? furtherCashAdvanceStage('disburse', caStatus.value || groupStatus.value)
    : 'funding',
)

const subtitle = computed(() => {
  const purpose = 'Record the cash that covers these advances.'
  return cutoffName.value ? `${cutoffName.value} · ${purpose}` : purpose
})

const statTiles = computed(() => [
  {
    key: 'total',
    label: 'Total cash advance',
    value: `₱${parseAmount(summary.value.total)}`,
    mark: 'var(--dash-cat-1)',
  },
  {
    key: 'employees',
    label: 'Employees',
    value: summary.value.employees,
    mark: 'var(--dash-cat-2)',
  },
  {
    key: 'funded',
    label: 'Funded',
    value: `₱${parseAmount(summary.value.funded)}`,
    mark: 'var(--dash-good-mark)',
  },
  {
    key: 'remaining',
    label: 'Still to fund',
    value: `₱${parseAmount(summary.value.remaining)}`,
    mark: 'var(--dash-warn-mark)',
  },
  {
    key: 'status',
    label: 'Group status',
    value: summary.value.groupStatus || '—',
    mark: 'var(--dash-neutral-mark)',
    numeric: false,
  },
])

const sourceOptions = [
  { label: 'Bank transfer', value: 'Bank Transfer' },
  { label: 'Check', value: 'Check' },
  { label: 'Paytaca', value: 'Paytaca' },
]

/**
 * The roster's id is the employee UUID the funding endpoint takes. The list
 * endpoint and the funding body both speak that id, which is why this is a
 * select of people rather than a free-text field.
 */
function employeeUuid(employee) {
  return employee?.id || employee?.user?.id || employee?.user_id || ''
}

const employeeOptions = computed(() =>
  employees.value
    .map((employee) => ({ label: getFullName(employee), value: employeeUuid(employee) }))
    .filter((option) => option.value),
)

const form = ref({
  funding_source: null,
  amount: '',
  reference_no: '',
  prepared_by_employee_id: null,
  custodian_employee_id: null,
  notes: '',
})

/**
 * The signed-in employee is the sensible default for both roles — the salary
 * funding step records the same pair from the session — and the reader can still
 * change either. The default is only applied once the roster has the id, so a
 * select never shows a raw UUID as its label.
 */
const defaultedPeople = ref(false)
watch(
  employeeOptions,
  (options) => {
    if (defaultedPeople.value || !options.length) return
    const uuid = authStore.user?.employee_uuid
    if (!uuid || !options.some((option) => option.value === uuid)) return
    form.value.prepared_by_employee_id = uuid
    form.value.custodian_employee_id = uuid
    defaultedPeople.value = true
  },
  { immediate: true },
)

const hasFigures = computed(() => summary.value.loaded)
const gapToneClass = computed(() => (summary.value.remaining > 0 ? '' : 'gap--settled'))
const amountNumber = computed(() => {
  const parsed = Number(form.value.amount)
  return Number.isFinite(parsed) ? parsed : 0
})

const canSubmit = computed(
  () =>
    !submitting.value &&
    hasFigures.value &&
    amountNumber.value > 0 &&
    Boolean(form.value.funding_source) &&
    Boolean(form.value.prepared_by_employee_id) &&
    Boolean(form.value.custodian_employee_id),
)

const shortfall = computed(() => Math.max(0, summary.value.remaining - amountNumber.value))
const overage = computed(() => Math.max(0, amountNumber.value - summary.value.remaining))

/**
 * What the entered figure means, in one line under the field. The same three
 * outcomes the confirm reads, so the warning while typing is the one the dialog
 * repeats with numbers attached.
 */
const amountHint = computed(() => {
  if (!hasFigures.value) return null
  const entered = amountNumber.value
  if (entered <= 0) {
    return String(form.value.amount ?? '').trim()
      ? { tone: 'error', text: 'Enter an amount greater than zero.' }
      : null
  }

  const remaining = summary.value.remaining
  if (remaining <= 0) {
    return {
      tone: 'warn',
      text: 'These advances are already fully funded. This entry would overfund them.',
    }
  }
  if (shortfall.value > 0) {
    return {
      tone: 'warn',
      text: `${formatCurrency(shortfall.value)} short of the ${formatCurrency(remaining)} still required. You can record a partial amount.`,
    }
  }
  if (overage.value > 0) {
    return {
      tone: 'warn',
      text: `${formatCurrency(overage.value)} more than the ${formatCurrency(remaining)} still required — this overfunds the advances.`,
    }
  }
  return { tone: 'good', text: 'This covers the advances in full.' }
})

const historyColumns = [
  { name: 'source', label: 'Source', field: 'source', align: 'left' },
  { name: 'amount', label: 'Amount', field: 'amount', align: 'right' },
  { name: 'reference', label: 'Reference', field: 'reference', align: 'left' },
  { name: 'preparedBy', label: 'Prepared by', field: 'preparedBy', align: 'left' },
  { name: 'preparedDate', label: 'Prepared', field: 'preparedDate', align: 'left' },
  { name: 'custodian', label: 'Custodian', field: 'custodian', align: 'left' },
  { name: 'notes', label: 'Notes', field: 'notes', align: 'left' },
]

const showConfirm = ref(false)
const confirm = ref(null)
const pendingFunding = ref(null)

function parseAmount(val) {
  return parseFloat(val || 0).toLocaleString('en-PH')
}

function formatSats(value) {
  return Number(value || 0).toLocaleString('en-PH')
}

function fillRemaining() {
  form.value.amount = String(summary.value.remaining)
}

async function refresh() {
  const token = guard.next()
  loading.value = true
  try {
    const res = await fetchCashAdvanceFunding(pgiId)
    if (!guard.isCurrent(token)) return false
    funding.value = res.data
    return true
  } catch (err) {
    if (err?.response?.status === 404) {
      // No funding row yet: the form still opens, but it cannot claim a total.
      if (guard.isCurrent(token)) funding.value = null
      return false
    }
    console.error('[CashAdvanceFundingPage] fetch failed:', err)
    return false
  } finally {
    if (guard.isCurrent(token)) loading.value = false
  }
}

function requestFunding() {
  if (submitting.value || showConfirm.value) return
  if (!hasFigures.value) {
    toast.warning('Wait for the funding figures to load.')
    return
  }
  if (amountNumber.value <= 0) {
    toast.warning('Enter an amount greater than zero.')
    return
  }
  if (!form.value.funding_source) {
    toast.warning('Choose a funding source.')
    return
  }
  if (!form.value.prepared_by_employee_id || !form.value.custodian_employee_id) {
    toast.warning('Choose who prepared this entry and who holds the cash.')
    return
  }

  const snapshot = {
    funding_source: form.value.funding_source,
    amount: amountNumber.value,
    reference_no: form.value.reference_no,
    prepared_by_employee_id: form.value.prepared_by_employee_id,
    custodian_employee_id: form.value.custodian_employee_id,
    notes: form.value.notes,
  }

  pendingFunding.value = snapshot
  confirm.value = buildCashAdvanceFundingConfirm({
    amount: snapshot.amount,
    source: snapshot.funding_source,
    reference: snapshot.reference_no,
    remainingBefore: summary.value.remaining,
    groupName: groupName.value,
  })
  showConfirm.value = true
}

function onConfirm() {
  commitFunding()
}

// Cancelling must clear the snapshot as surely as confirming does: a stale
// `pendingFunding` left behind is a write the next dialog's Confirm could fire.
watch(showConfirm, (open) => {
  if (open) return
  confirm.value = null
  pendingFunding.value = null
})

/**
 * The confirmed funding entry. Reads only the snapshot, never the form, so it
 * writes exactly what the confirmation described.
 *
 * The write and the refetch are deliberately separate: a read that failed after
 * a successful write must not report the write as failed.
 */
async function commitFunding() {
  const entry = pendingFunding.value
  if (!entry || submitting.value) return

  submitting.value = true
  try {
    let result
    try {
      result = await createCashAdvanceFunding(pgiId, {
        funding_source: entry.funding_source,
        amount: String(entry.amount),
        reference_no: entry.reference_no || '',
        prepared_by_employee_id: entry.prepared_by_employee_id,
        custodian_employee_id: entry.custodian_employee_id,
        notes: entry.notes || '',
      })
    } catch (err) {
      console.error('[CashAdvanceFundingPage] submitFunding error:', err)
      toast.error(extractErrorMessage(err, 'Failed to record this funding entry.'))
      return
    }

    showConfirm.value = false
    stepperKey.value++
    await refresh()
    invalidateCache()
    form.value.amount = ''
    form.value.reference_no = ''
    form.value.notes = ''
    // The endpoint may skip BCH contract creation and answer a `warning` on the
    // flat response instead. Reporting success would hide the one thing the
    // reader needs to chase, so the warning takes the toast.
    const warning = result?.data?.warning
    if (warning) toast.warning(String(warning))
    else toast.success('Cash advance funding added.')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  resolveQuietly(pgiId)
  fetchEmployees().catch(() => null)
  if (await refresh()) {
    notifyLoaded('Cash advance funding', summary.value.history.length, {
      noun: 'entry',
      nounPlural: 'entries',
    })
  }
})
</script>

<style scoped>
/* ============================================================================
   Cash advance Funding step — local styles only. Frame, figures strip and table
   chrome are shared with the payroll steps.
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

.btn-outline {
  height: 30px;
  padding: 0 12px;
  border-radius: var(--dash-r-md);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-2);
  flex-shrink: 0;
}

.ca-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--dash-warn-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-warn-bg);
  font-size: 13px;
  color: var(--dash-ink-2);
}
.ca-notice__icon {
  color: var(--dash-warn);
  flex-shrink: 0;
}
.ca-notice__text {
  flex: 1;
  min-width: 0;
}

/* ── Two columns ──
   The form is the work; the history is reference. */
.funding-cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: var(--dash-gap);
  align-items: start;
}

/* ── The funding gap ── */
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

.field__amount :deep(.q-field__native) {
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.field__hint {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--dash-ink-4);
}
.field__hint .q-icon {
  flex-shrink: 0;
  margin-top: 1px;
}
.field__hint--warn {
  color: var(--dash-warn-mark);
}
.field__hint--error {
  color: var(--dash-critical-mark);
}
.field__hint--good {
  color: var(--dash-good);
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

/* ── History ── */
.history-scroll {
  overflow: auto;
  max-height: 420px;
}
.history-scroll :deep(.q-table thead th) {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--dash-surface);
}
.history-scroll :deep(.q-table thead tr th) {
  padding-top: 14px;
}
.history-scroll :deep(.q-table tbody tr:hover td) {
  background: var(--dash-n-50);
}

.history-amount {
  color: var(--dash-ink) !important;
  font-weight: 600;
}

.history-notes {
  display: block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dash-ink-3);
}

.muted {
  color: var(--dash-ink-4);
}

/* ── BCH contract ── */
.bch {
  margin: var(--dash-gap);
  padding: 12px 14px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
}
.bch__head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bch__icon {
  color: var(--dash-accent);
}
.bch__title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dash-ink);
  flex: 1;
  min-width: 0;
}
.bch__address {
  margin: 7px 0 0;
  font-size: 12px;
  color: var(--dash-ink-2);
  word-break: break-all;
}
.bch__meta {
  margin: 3px 0 0;
  font-size: 11.5px;
  color: var(--dash-ink-4);
}

/* ── Responsive ── */
@media (max-width: 1279px) {
  .funding-cols {
    grid-template-columns: 1fr;
  }
  .history-scroll {
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
