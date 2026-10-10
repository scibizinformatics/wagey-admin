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
          @click="requestContinue"
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
                <!-- What the figure means against the gap, said before it is
                     saved rather than only afterwards. Short and over both warn —
                     neither is refused, because funding in instalments is
                     normal — but both are worth a second look. -->
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
            <!-- First paint, when there is nothing to keep on screen. Built from
                 the same `columns` the roster renders, so the placeholder shares
                 its column edges, labels and alignment. This step is not paged,
                 so the row count is a fixed guess at what fits the panel. -->
            <TableSkeleton
              v-if="loading"
              :columns="earnerColumns"
              aria-label="Loading employees in this group"
              wrap-class="dash-page-body"
            />

            <!-- Empty. `hide-no-data` was on the table alongside this markup, and
                 it suppresses Quasar's no-data branch outright — so the state was
                 never drawn and an empty result showed a bare header strip.
                 Rendered here instead, and without the loading guard it no longer
                 needs: this branch is only reached once the fetch has answered. -->
            <div v-else-if="!allEarners.length" class="dash-empty dash-page-body">
              <span class="dash-featured-icon">
                <q-icon name="o_groups" size="20px" />
              </span>
              <p class="dash-empty__title">No employees in this group</p>
              <p class="dash-empty__sub">
                Employees appear once payslips are released in the earlier steps.
              </p>
            </div>

            <q-table
              v-else
              :rows="allEarners"
              :columns="earnerColumns"
              :pagination="{ rowsPerPage: 0 }"
              row-key="id"
              flat
              hide-pagination
            >
              <template #body-cell-employee="props">
                <q-td :props="props">
                  <div class="identity">
                    <!-- A face when the name resolves to exactly one roster
                         employee who has one, otherwise the person's initials on
                         their identity colour. -->
                    <q-avatar
                      v-if="avatarOf(props.row.employee).pictureUrl"
                      size="30px"
                      class="identity-avatar"
                    >
                      <img
                        :src="avatarOf(props.row.employee).pictureUrl"
                        :alt="props.row.employee || 'Employee'"
                      />
                    </q-avatar>
                    <q-avatar
                      v-else
                      size="30px"
                      class="identity-avatar"
                      :style="{ background: avatarOf(props.row.employee).color }"
                    >
                      <span class="identity-initials">{{
                        avatarOf(props.row.employee).initials
                      }}</span>
                    </q-avatar>
                    <span class="identity-name">{{ props.row.employee }}</span>
                  </div>
                </q-td>
              </template>

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

              <!-- The way into how this net pay was arrived at. Same affordance as
                   the attendance table's audit button: an icon in its own column
                   that says what opening it will show. -->
              <template #body-cell-breakdown="props">
                <q-td :props="props" class="cell-breakdown">
                  <button
                    type="button"
                    class="breakdown-btn"
                    :aria-label="`View salary breakdown for ${props.row.employee}`"
                    @click="requestBreakdown(props.row)"
                  >
                    <q-icon name="o_visibility" size="16px" />
                    <q-tooltip>View salary breakdown</q-tooltip>
                  </button>
                </q-td>
              </template>
            </q-table>
          </div>
        </section>
      </div>
    </DisbursementStepShell>

    <!-- What one employee was paid and what came off it. Read-only: this step
         writes funding entries, never payroll. -->
    <SalaryBreakdownDialog
      v-model="showBreakdown"
      :employee-id="selectedEpiId"
      :employee-name="selectedEmployeeName"
      :net-pay="selectedNetPay"
      :employee-index="employeeIndex"
    />

    <!-- The gate in front of money leaving the company: one dialog for both
         questions this step asks, wording built in `fundingConfirm.js`. -->
    <ConfirmDialog
      v-model="showConfirm"
      :confirm="confirm"
      :loading="submitting"
      @confirm="onConfirm"
    />
  </PageShell>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StatusPill from 'src/components/common/StatusPill.vue'
import TableSkeleton from 'src/components/common/TableSkeleton.vue'
import ConfirmDialog from 'src/components/common/ConfirmDialog.vue'
import SalaryBreakdownDialog from 'src/components/pages/Payroll/SalaryBreakdownDialog.vue'
import PageShell from 'src/components/layout/PageShell.vue'
import DisbursementStepShell from 'src/components/pages/Payroll/DisbursementStepShell.vue'
import DisbursementStatRow from 'src/components/pages/Payroll/DisbursementStatRow.vue'
import {
  buildFundingConfirm,
  buildDisburseConfirm,
} from 'src/components/pages/Payroll/fundingConfirm'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { usePayoutGroupIdentity } from 'src/composables/disbursement/usePayoutGroupIdentity'
import { avatarFor, buildEmployeeNameIndex } from 'src/composables/utils/employee'
import { useEmployees } from 'src/composables/page/useEmployees'
import { extractErrorMessage } from 'src/composables/utils/http'
import { formatCurrency } from 'src/composables/utils/format'
import { useAuthStore } from 'src/boot/auth'
import { useLoadedToast } from 'src/composables/useLoadedToast'
import { useToast } from 'src/composables/useToast'

const route = useRoute()
const router = useRouter()

const toast = useToast()
const authStore = useAuthStore()
const groupId = route.params.id
const { identity, resolveQuietly } = usePayoutGroupIdentity()
const stepperKey = ref(0)
const { fetchPayoutGroupInstanceAmounts, fetchEmployeePayslips, createPgiFunding } =
  useDisbursementApi()
const { notifyLoaded } = useLoadedToast()
const { employees, fetchEmployees } = useEmployees()

// Puts a face beside each name. The payslip payload names an employee but
// carries no photograph, so the roster is the only thing that can supply one —
// the same construction as the Request tables and the disbursement list's
// cash-advance view, including its refusal to guess on duplicate names.
const employeeIndex = computed(() => buildEmployeeNameIndex(employees.value))
const avatarOf = (name) => avatarFor(employeeIndex.value, name)

const loading = ref(true)
const submitting = ref(false)
const amounts = ref(null)
const allEarners = ref([])

/**
 * The confirmation gate.
 *
 * One dialog serves both questions this step asks, distinguished by
 * `pendingAction`; `pendingFunding` is the snapshot the funding write reads, so
 * the dialog and the write can never describe different entries.
 */
const showConfirm = ref(false)
const confirm = ref(null)
const pendingAction = ref(null)
const pendingFunding = ref(null)

/**
 * The salary breakdown, opened from the earners table.
 *
 * Snapshotted from the row rather than read off it on render: the table is
 * refetched after every funding entry, so a dialog left open across a write
 * would otherwise re-point itself at whatever row took that id next.
 */
const showBreakdown = ref(false)
const selectedEpiId = ref(null)
const selectedEmployeeName = ref('')
const selectedNetPay = ref(null)

function requestBreakdown(row) {
  // The id the endpoint keys on. A row without one is a payslip this step cannot
  // break down — the button stays, and the dialog explains rather than hanging.
  selectedEpiId.value = row?.epi_id ?? null
  selectedEmployeeName.value = row?.employee || ''
  selectedNetPay.value = row?.net_pay ?? null
  showBreakdown.value = true
}

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
    amounts.value?.total_funded ??
      amounts.value?.funded_amount ??
      amounts.value?.total_funding ??
      0,
  ),
)

const remainingToFund = computed(() => {
  const required = parseFloat(amounts.value?.net_funding_required || 0)
  return Math.max(0, required - fundedSoFar.value)
})

const gapToneClass = computed(() => (remainingToFund.value > 0 ? '' : 'gap--settled'))

/**
 * The amount as a number, and the comparisons the step is actually about.
 *
 * Funding a group in instalments is legitimate, so a short amount is a decision
 * to confirm rather than a mistake to refuse. What cannot be recorded is a
 * non-positive figure — a negative entry would move the gap the wrong way and
 * quietly make the group look funded.
 *
 * `amounts` is the gate on every comparison: until the amounts call has
 * answered, the gap is zero, and treating that as "already fully funded" would
 * tell a reader their figure overfunds a group nobody has measured yet.
 */
const amountNumber = computed(() => {
  const parsed = Number(form.value.amount)
  return Number.isFinite(parsed) ? parsed : 0
})

const hasAmounts = computed(() => !loading.value && !!amounts.value)

const shortfall = computed(() => Math.max(0, remainingToFund.value - amountNumber.value))
const overage = computed(() => Math.max(0, amountNumber.value - remainingToFund.value))

const canSubmit = computed(() => !submitting.value && hasAmounts.value && amountNumber.value > 0)

/**
 * What the entered figure means, in one line under the field.
 *
 * The same three outcomes `buildFundingConfirm` reads, so the warning the admin
 * sees while typing is the one the dialog then repeats with numbers attached —
 * not a validation message that vanishes the moment they look away.
 */
const amountHint = computed(() => {
  if (!hasAmounts.value) return null
  const entered = amountNumber.value
  // Nothing typed is not an error — the button being disabled already says so,
  // and shouting at a reader who has only just been handed a cleared form (after
  // a save, or on first paint) reads as the page failing.
  if (entered <= 0) {
    return String(form.value.amount ?? '').trim()
      ? { tone: 'error', text: 'Enter an amount greater than zero.' }
      : null
  }

  const remaining = remainingToFund.value
  if (remaining <= 0) {
    return {
      tone: 'warn',
      text: 'This group is already fully funded. This entry would overfund it.',
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
      text: `${formatCurrency(overage.value)} more than the ${formatCurrency(remaining)} still required — this overfunds the group.`,
    }
  }
  return { tone: 'good', text: 'This covers the group in full.' }
})

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

/**
 * First step of a funding entry: work out what it would do, then ask.
 *
 * Nothing is written here. The entry is snapshotted rather than re-read on
 * confirm, so the dialog describes the figure that was asked about even if the
 * amounts refetch moves the gap while it is open.
 */
function requestFunding() {
  // A second submit while the first is still in flight would record the same
  // entry twice, and a click behind an open dialog would leave the snapshot
  // describing a form the reader has since changed.
  if (submitting.value || showConfirm.value) return

  if (!hasAmounts.value) {
    toast.warning('Wait for the funding figures to load.')
    return
  }
  if (amountNumber.value <= 0) {
    toast.warning('Enter an amount greater than zero.')
    return
  }

  const snapshot = {
    funding_source: form.value.funding_source,
    amount: amountNumber.value,
    reference_no: form.value.reference_no,
    notes: form.value.notes,
  }

  pendingFunding.value = snapshot
  confirm.value = buildFundingConfirm({
    amount: snapshot.amount,
    source: snapshot.funding_source,
    reference: snapshot.reference_no,
    remainingBefore: remainingToFund.value,
    groupName: groupName.value,
  })
  pendingAction.value = 'fund'
  showConfirm.value = true
}

/**
 * First step of leaving for disbursement.
 *
 * A fully funded group is not asked about — a confirmation with nothing to warn
 * about is a click that teaches people to click through the ones that matter.
 */
function requestContinue() {
  if (remainingToFund.value > 0) {
    confirm.value = buildDisburseConfirm({
      remaining: remainingToFund.value,
      groupName: groupName.value,
      employees: allEarners.value.length,
    })
    pendingAction.value = 'disburse'
    pendingFunding.value = null
    showConfirm.value = true
    return
  }
  commitContinue()
}

function commitContinue() {
  router.push({ path: `/app/payroll/disburse/${groupId}`, query: route.query })
}

/** The one button in the dialog, dispatching on what was asked. */
function onConfirm() {
  if (pendingAction.value === 'fund') commitFunding()
  else if (pendingAction.value === 'disburse') commitContinue()
}

// Cancelling must clear the snapshot as surely as confirming does: a stale
// `pendingFunding` left behind is a write the next dialog's Confirm could fire.
watch(showConfirm, (open) => {
  if (open) return
  confirm.value = null
  pendingAction.value = null
  pendingFunding.value = null
})

const earnerColumns = [
  { name: 'employee', label: 'Employee', field: 'employee', align: 'left', sortable: true },
  { name: 'position_name', label: 'Position', field: 'position_name', align: 'left' },
  { name: 'net_pay', label: 'Net pay', field: 'net_pay', align: 'right', sortable: true },
  {
    name: 'payslip_status',
    label: 'Status',
    field: 'payslip_status',
    align: 'left',
    sortable: true,
  },
  { name: 'breakdown', label: '', field: 'breakdown', align: 'right' },
]

function parseAmount(val) {
  return parseFloat(val || 0).toLocaleString('en-PH')
}

/**
 * Re-read the run. Shared by the first paint and by every write, because a
 * funding entry moves the gap, the stat tiles and the roster's sort together —
 * and because a write that reported failure may still have landed, so the refetch
 * has to run whatever happened.
 *
 * Reports rather than throws: the caller decides whether a failed read is worth
 * a message, and a caller that only wanted the numbers has nothing to do about
 * an error.
 */
async function refreshRun() {
  try {
    const [amt, earners] = await Promise.all([
      fetchPayoutGroupInstanceAmounts(groupId),
      fetchEmployeePayslips(groupId),
    ])
    amounts.value = amt
    allEarners.value = (earners || []).sort(
      (a, b) => parseFloat(b.net_pay || 0) - parseFloat(a.net_pay || 0),
    )
    return true
  } catch (err) {
    console.error('[FundingPage] fetch failed:', err)
    return false
  }
}

onMounted(async () => {
  // The list page hands the run's name, cutoff and status over in the query, and
  // no step endpoint returns any of them — but a deep link arrives with none of
  // them and a refresh can arrive with a stale status, so the run is resolved by
  // its id either way.
  resolveQuietly(groupId)
  fetchEmployees().catch(() => null)
  if (await refreshRun()) {
    notifyLoaded('Funding', allEarners.value.length, {
      noun: 'employee',
      nounPlural: 'employees',
    })
  }
  loading.value = false
})

/**
 * The confirmed funding entry.
 *
 * Reads only `pendingFunding`, never the form, so it writes exactly what the
 * confirmation described.
 *
 * The write and the refetch are deliberately separate. Folding them into one
 * `try` meant a read that failed after a successful write reported the write as
 * failed and left the reader believing their entry had not been recorded.
 */
async function commitFunding() {
  const entry = pendingFunding.value
  if (!entry || submitting.value) return

  submitting.value = true
  const employeeUuid = authStore.user?.employee_uuid
  try {
    try {
      await createPgiFunding(groupId, {
        funding_source: entry.funding_source,
        amount: String(entry.amount),
        reference_no: entry.reference_no || '',
        prepared_by_employee_id: employeeUuid,
        custodian_employee_id: employeeUuid,
        notes: entry.notes || '',
      })
    } catch (err) {
      console.error('[FundingPage] submitFunding error:', err)
      toast.error(extractErrorMessage(err, 'Failed to record this funding entry.'))
      return
    }

    stepperKey.value++
    await refreshRun()
    form.value = { funding_source: null, amount: '', reference_no: '', notes: '' }
    toast.success('Funding added successfully!')
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

/* The amount's own reading of itself, under the field. Amber rather than red
   for a short or over figure: both are allowed — funding in instalments is
   normal — so this is a caution, not a refusal. Only an amount that cannot be
   recorded at all gets the error colour. */
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

/* The breakdown button: the same 28px bordered square as the attendance table's
   audit button, untinted — unlike that one, a salary has no "flagged" state, and
   every row here offers the same action. */
.cell-breakdown {
  width: 1%;
  white-space: nowrap;
}

.breakdown-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--dash-line);
  border-radius: 7px;
  background: var(--dash-surface);
  color: var(--dash-ink-3);
  cursor: pointer;
  transition:
    background var(--dash-fast) var(--dash-ease),
    border-color var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease);
}
.breakdown-btn:hover {
  background: var(--dash-n-50);
  border-color: var(--dash-n-300);
  color: var(--dash-ink);
}
.breakdown-btn:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--dash-surface),
    0 0 0 4px var(--dash-accent-ring);
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
.earners__scroll :deep(.q-table thead tr th) {
  padding-top: 14px;
}

.earners__scroll :deep(.q-table tbody tr:hover td) {
  background: var(--dash-n-50);
}
.earners__scroll :deep(.q-table tbody td:first-child) {
  color: var(--dash-ink);
  font-weight: 500;
}

.earners__pay {
  color: var(--dash-ink) !important;
  font-weight: 600;
}

/* The employee cell: a 30px face (or the person's initials on their identity
   colour) beside the name. Same construction as the Request tables. */
.identity {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.identity-avatar {
  flex-shrink: 0;
  border: 1px solid var(--dash-line);
}
.identity-avatar :deep(img) {
  object-fit: cover;
}
.identity-initials {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}
.identity-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
