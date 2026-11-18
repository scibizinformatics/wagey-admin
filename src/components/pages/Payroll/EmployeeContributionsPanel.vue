<template>
  <q-card-section class="dash-modal__body">
    <div v-if="loading" class="contrib-state">
      <q-spinner size="22px" />
      <span>Loading contributions…</span>
    </div>

    <!-- Everything below the spinner renders on its own evidence rather than as
         a chain of `v-else-if`s: a contributions failure must not hide the
         withholding tax, which is fetched and answered separately. -->
    <template v-else>
      <!-- The other 404: this item is not in this run. Retry is offered because,
           unlike a missing tax month, the data can catch up (a transfer, a
           refreshed roster) without anyone changing config. It stays a takeover
           because nothing about this employee's money is available to show. -->
      <div v-if="missingItem" class="contrib-state contrib-state--unconfigured">
        <p class="contrib-empty__title">Nothing found for this employee</p>
        <p class="contrib-empty__sub">
          This run has no payroll item for
          {{ employeeName || 'this employee' }} to show contributions against. It may have been
          moved to another run.
        </p>
        <span v-if="unconfiguredDetail" class="contrib-state__detail">{{
          unconfiguredDetail
        }}</span>
        <q-btn flat dense no-caps label="Try again" class="contrib-retry" @click="load" />
      </div>
      <div v-if="error" class="contrib-state contrib-state--error">
        <q-icon name="o_error_outline" size="20px" />
        <span>Could not load contributions for this employee.</span>
        <!-- The status and the server's own words. `Try again` cannot fix a
             missing route or a refused permission, and without these it was
             impossible to tell which had happened. -->
        <span v-if="errorDetail" class="contrib-error__detail">{{ errorDetail }}</span>
        <q-btn flat dense no-caps label="Try again" class="contrib-retry" @click="load" />
      </div>

      <!-- The summary and the contributions list survive a run with no tax
           month: the endpoint answers 404 for the item, but the row this dialog
           was opened from still carries its contribution figure and status, and
           the tax section below is a separate request that still answers. -->
      <template v-if="data || noTaxMonth">
        <!-- ── Summary ──────────────────────────────────────────────────
           The item's own status leads, because it is what the review table
           shows and what deducting here changes.

           With no contribution rows there are no deducted/pending halves to
           divide a total into, so that one state shows the figure the row was
           listed at instead — the same number the table showed, rather than a
           total this dialog invented. -->
        <div class="contrib-summary">
          <div class="contrib-summary__status">
            <span class="contrib-summary__label">Contribution status</span>
            <StatusPill :status="summaryStatus" size="md" />
          </div>

          <dl v-if="data" class="contrib-summary__figures">
            <div>
              <dt>Total</dt>
              <dd class="dash-num">{{ formatCurrencyPrecise(totalAmount) }}</dd>
            </div>
            <div>
              <dt>Deducted</dt>
              <dd class="dash-num">{{ formatCurrencyPrecise(deductedAmount) }}</dd>
            </div>
            <div>
              <dt>Pending</dt>
              <dd class="dash-num" :class="{ 'contrib-pending': pendingAmount > 0 }">
                {{ formatCurrencyPrecise(pendingAmount) }}
              </dd>
            </div>
          </dl>
          <dl v-else class="contrib-summary__figures contrib-summary__figures--single">
            <div>
              <dt>Contribution</dt>
              <dd class="dash-num">{{ moneyOrDash(contributionAmount) }}</dd>
            </div>
          </dl>
        </div>

        <!-- ── Contributions ────────────────────────────────────────────
           A list rather than a table: each row is a name, an amount and one
           state, and the pending rows need a checkbox that a q-table
           selection column would place away from the state it applies to. -->
        <div class="contrib-section">
          <div class="contrib-section__head">
            <p class="contrib-section__label">
              Contributions
              <span v-if="contributions.length" class="dash-num">({{ contributions.length }})</span>
            </p>
            <q-btn
              v-if="contributions.length > 1"
              flat
              dense
              no-caps
              size="12px"
              class="contrib-selectall"
              :label="selectAllLabel"
              @click="toggleAllSelectable"
            />
          </div>

          <!-- The run has no tax month configured, so the endpoint answers 404
               for the whole item and there are no rows to list. A note inside
               the section rather than a block that replaced the body: the
               status above and the tax section below are still real answers,
               and the takeover hid both. Deliberately no retry — pressing one
               cannot conjure a tax month onto a cutoff. The server's own line
               rides under it, so a 404 that is not really about a tax month
               cannot hide behind this wording. -->
          <div v-if="noTaxMonth" class="contrib-unset">
            <p class="contrib-unset__title">No tax month for this cutoff</p>
            <p class="contrib-unset__sub">
              Contributions cannot be listed for {{ employeeName || 'this employee' }} until a tax
              month is set for {{ cutoffName || 'this period' }}.
            </p>
            <span v-if="unconfiguredDetail" class="contrib-unset__detail">{{
              unconfiguredDetail
            }}</span>
          </div>

          <ul v-else-if="contributions.length" class="contrib-list">
            <li
              v-for="row in contributions"
              :key="row.id"
              class="contrib-row"
              :class="{
                'contrib-row--selected': selected.includes(row.id),
                'contrib-row--reverting': selected.includes(row.id) && row.deducted,
              }"
            >
              <!-- Every row has an action — pending rows are deducted, deducted
                 rows are reverted — so the checkbox is always offered. -->
              <span class="contrib-row__pick">
                <q-checkbox
                  :model-value="selected.includes(row.id)"
                  dense
                  size="xs"
                  :disable="busy"
                  @update:model-value="toggle(row.id)"
                />
              </span>

              <span class="contrib-row__body">
                <span class="contrib-row__name">{{ row.name }}</span>
                <span class="contrib-row__meta">
                  <template v-if="row.deducted">
                    <!-- The checkbox above already marks selection; this line
                       carries the deducted state alone. -->
                    <q-icon name="check" size="13px" class="contrib-row__meta-tick" />
                    Deducted<template v-if="row.deducted_from">
                      from {{ row.deducted_from }}</template
                    >
                  </template>
                  <template v-else>Not yet deducted</template>
                </span>
              </span>

              <span class="contrib-row__amount dash-num">{{
                formatCurrencyPrecise(row.amount)
              }}</span>
            </li>
          </ul>

          <div v-else class="contrib-empty">
            <span class="dash-featured-icon">
              <q-icon name="o_account_balance" size="18px" />
            </span>
            <p class="contrib-empty__title">No contributions</p>
            <p class="contrib-empty__sub">
              Nothing is due from this employee for {{ taxMonthLabel || 'this period' }}.
            </p>
          </div>
        </div>
      </template>

      <!-- ── Withholding tax ─────────────────────────────────────────────
           Its own section, outside the contributions block: applied or
           reverted as a whole against the item — with no per-row state to
           share with the list above — so it neither selects nor reverts
           with them, and a contributions failure must not hide it.

           Not gated on the unconfigured state any more. `epi-tax` answers 200
           with `tax_month: null` in exactly the case that 404s the
           contributions endpoint, so the section has real evidence to show and
           hid it. Only the duplicated sentence is suppressed below, because the
           contributions note above has already said it. -->
      <div v-if="taxLoading || taxData || taxError" class="contrib-section contrib-tax">
        <div class="contrib-section__head">
          <p class="contrib-section__label">Withholding tax</p>
          <q-btn
            v-if="taxActionReady && canRevertTax"
            flat
            dense
            no-caps
            size="12px"
            icon="o_undo"
            label="Revert tax"
            class="contrib-tax__revert"
            :disable="busy"
            :loading="taxReverting"
            @click="confirmRevertTax"
          >
            <q-tooltip>Remove the withholding tax from this payroll item</q-tooltip>
          </q-btn>
          <q-btn
            v-else-if="taxActionReady && canApplyTax"
            flat
            dense
            no-caps
            size="12px"
            icon="o_account_balance"
            label="Apply tax"
            class="contrib-add"
            :disable="busy"
            :loading="taxApplying"
            @click="applyWithholdingTax"
          >
            <q-tooltip>Apply the configured withholding tax to this payroll item</q-tooltip>
          </q-btn>
        </div>

        <!-- A failure here never blanks the statutory contributions above it. -->
        <div v-if="taxError" class="contrib-note">
          <q-icon name="o_error_outline" size="15px" />
          <span>Could not load withholding tax.</span>
          <!-- The status and the server's own words, as for the
               contributions failure above. -->
          <span v-if="taxErrorDetail" class="contrib-error__detail">{{ taxErrorDetail }}</span>
          <q-btn flat dense no-caps label="Retry" class="contrib-retry" @click="loadTax" />
        </div>
        <div v-else-if="taxLoading" class="contrib-note">
          <q-spinner size="15px" />
          <span>Loading withholding tax…</span>
        </div>

        <div v-else-if="taxData" class="contrib-summary contrib-tax__summary">
          <div class="contrib-summary__status">
            <span class="contrib-summary__label">Status</span>
            <StatusPill :status="taxPillStatus" :label="taxStatusLabel" size="md" />
          </div>

          <!-- The facts the state actually carries. A reverted item has
               none: its evidence is the reason below, and a row reading
               "Tax ₱0.00" beside it would claim the endpoint said zero. -->
          <dl v-if="hasTaxFacts" class="contrib-tax__facts">
            <div v-if="taxHas">
              <dt>Tax</dt>
              <dd class="dash-num">{{ moneyOrDash(taxAmount) }}</dd>
            </div>
            <div v-if="taxTaxableIncome != null">
              <dt>Taxable income</dt>
              <dd class="dash-num">{{ moneyOrDash(taxTaxableIncome) }}</dd>
            </div>
            <div v-if="taxBracket">
              <dt>Bracket</dt>
              <dd>{{ taxBracket }}</dd>
            </div>
            <div v-if="taxFixed != null">
              <dt>Fixed tax</dt>
              <dd class="dash-num">{{ moneyOrDash(taxFixed) }}</dd>
            </div>
            <div v-if="taxPercent != null">
              <dt>Rate over minimum</dt>
              <dd>{{ taxPercentText }}</dd>
            </div>
            <div v-if="taxPeriodLabel">
              <dt>Tax month</dt>
              <dd>{{ taxPeriodLabel }}</dd>
            </div>
          </dl>

          <p v-if="taxReverted" class="contrib-tax__note">
            Reverted<template v-if="taxRevertedByLabel"> by {{ taxRevertedByLabel }}</template
            ><template v-if="taxRevertedAt"> · {{ formatDateTime(taxRevertedAt) }}</template
            ><template v-if="taxRevertReason"> — {{ taxRevertReason }}</template>
          </p>
          <p v-else-if="taxExempt" class="contrib-tax__note">
            This payroll item is exempt from withholding tax, so nothing is taken.
          </p>
          <p v-else-if="!taxHasMonth && !noTaxMonth" class="contrib-tax__note">
            A tax month has not been set for this cutoff, so nothing can be calculated yet.
          </p>
          <p v-else-if="!taxHas" class="contrib-tax__note">
            No withholding tax has been applied to this payroll item yet.
          </p>
        </div>
      </div>
    </template>
  </q-card-section>

  <q-separator />

  <!-- The action states its own precondition beside itself, so a disabled
       button is never unexplained. -->
  <q-card-actions class="dash-modal__foot">
    <span v-if="!loading && !error && contributions.length" class="dash-modal__foot-note">
      <template v-if="selected.length">
        {{ selected.length }} selected · {{ formatCurrencyPrecise(selectedAmount) }}
      </template>
      <template v-else-if="pending.length">
        {{ pending.length }} contribution{{ pending.length > 1 ? 's' : '' }} still to deduct
      </template>
      <template v-else>All contributions deducted</template>
    </span>
    <q-btn flat no-caps label="Close" class="dash-modal__cancel" @click="$emit('close')" />
    <!-- Both directions stay available when an item is only partly deducted.
         The slot used to swap between them on the overall status, which left
         an `incomplete` item holding deducted rows with no way to undo them. -->
    <q-btn
      v-if="canDeduct"
      unelevated
      no-caps
      icon="o_playlist_add_check"
      :label="selectedPending.length ? `Deduct ${selectedPending.length}` : 'Deduct'"
      class="dash-modal__submit"
      :loading="deducting"
      :disable="!selectedPending.length || busy"
      @click="deduct"
    >
      <q-tooltip v-if="!selectedPending.length">
        Select a pending contribution to deduct
      </q-tooltip>
    </q-btn>
    <q-btn
      v-if="canRevert"
      unelevated
      no-caps
      icon="o_undo"
      :label="selectedDeducted.length ? `Revert ${selectedDeducted.length}` : 'Revert all'"
      class="contrib-revert"
      :loading="reverting"
      :disable="busy"
      @click="confirmRevert"
    >
      <q-tooltip>
        {{
          selectedDeducted.length
            ? 'Put the selected contributions back to pending'
            : 'Put every deducted contribution back to pending'
        }}
      </q-tooltip>
    </q-btn>
  </q-card-actions>

  <!-- The reason gate for reverting the tax. Bespoke (not the shared
       `ConfirmDialog`) because the decision needs an input, and the shared
       confirm contract is deliberately slotless; the write lives in
       `commitRevertTax`, reachable only from `@confirm`. -->
  <TaxRevertDialog
    v-model="showTaxRevert"
    :employee="employeeName"
    :amount="taxAmount"
    :loading="taxReverting"
    @confirm="commitRevertTax"
  />
</template>

<script setup>
/**
 * One employee's statutory contributions and withholding tax.
 *
 * Contributions normally come off automatically; this panel is the admin's
 * fallback for what did not, so its job is to make the pending rows obvious and
 * the deduction a single action — not to restate the payslip. Tax is applied or
 * reverted as a whole and carries its own bracket, so it gets its own section and
 * its own reason dialog rather than a row in the contribution list.
 *
 * Manual adjustments are NOT here. They are a different payroll component with
 * their own endpoint, service and panel; nothing in this file reads or writes
 * them.
 */
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import StatusPill from 'src/components/common/StatusPill.vue'
import TaxRevertDialog from 'src/components/pages/Payroll/TaxRevertDialog.vue'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { useEmployeeContributions } from 'src/composables/disbursement/useEmployeeContributions'
import { formatCurrencyPrecise, formatDateTime } from 'src/composables/utils/format'
import { extractErrorMessage } from 'src/composables/utils/http'
import { useToast } from 'src/composables/useToast'

const $q = useQuasar()
const toast = useToast()
const { fetchEpiTax, applyTax: applyTaxRequest, revertTax: revertTaxRequest } = useDisbursementApi()
const { fetchEpiContributions, deductContributions, revertContributions } =
  useEmployeeContributions()

const props = defineProps({
  /** Payout group instance the employee payroll item belongs to. */
  pgiId: { type: [Number, String], default: null },
  /** Employee payroll item id. */
  epiId: { type: [Number, String], default: null },
  employeeName: { type: String, default: '' },
  /**
   * The cutoff the run belongs to, so the "no tax month" state can name the
   * period that is unconfigured instead of saying "this cutoff" to a reader who
   * is looking at a dialog that does not otherwise say which one. Taken from the
   * review payload the page already holds — nothing extra is fetched for it.
   */
  cutoffName: { type: String, default: '' },
  /**
   * The row's own contribution figure and status, snapshotted by the page when
   * it opened the dialog.
   *
   * A cutoff with no tax month answers the contributions endpoint 404, which
   * carries no rows — but the review table still lists this employee's
   * contribution and its status, and the dialog must not contradict the row it
   * was opened from by claiming there is nothing to say. Read only in that state;
   * whenever the endpoint answers, its own figures win.
   */
  contributionAmount: { type: [Number, String], default: null },
  contributionStatus: { type: String, default: '' },
})

// `changed` tells the page its review figures are stale — and a tax apply or
// revert moves the same net pay those figures sit in. One event for both writes.
const emit = defineEmits(['changed', 'close'])

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const NO_TAX_MONTH = /tax month/i

const loading = ref(false)
const error = ref(false)
/**
 * A 404 that is *not* the documented "no tax month" answer — the payroll item is
 * not in this payout group, or belongs to another workspace. Every 404 used to
 * land in `noTaxMonth`, which reported a missing item as a tax-month
 * configuration the reader could neither cause nor fix.
 */
const missingItem = ref(false)
/**
 * The server's own line for a 404, kept so the two cases are distinguishable on
 * screen. `noTaxMonth` deliberately has no retry — pressing one cannot conjure a
 * tax month — but "no such item in this run" can change, so that block offers it.
 */
const unconfiguredDetail = ref('')
/**
 * What the server actually said, kept for the panel to show.
 *
 * A message that reads only "Could not load contributions" is undiagnosable: the
 * status and the server's own sentence are what separate a missing route from a
 * permission refusal from a crash, and they are all indistinguishable from the
 * outside.
 */
const errorDetail = ref('')
/**
 * The run has nothing to calculate: the backend answered 404 because this cutoff
 * has no tax month set, so there is no period to credit contributions against.
 * A configuration state, not a failure — so it gets its own quiet block rather
 * than the red error and a "Try again" that could never succeed.
 */
const noTaxMonth = ref(false)
const deducting = ref(false)
const reverting = ref(false)
const data = ref(null)
const selected = ref([])

/**
 * Withholding tax, on the same terms as contributions: its own state, its own
 * failure and its own writes. Tax is applied or reverted as a whole against the
 * item — there is no per-row selection to share with the contributions — so it
 * keeps its own refs rather than borrowing the contributions'.
 */
const taxData = ref(null)
const taxError = ref(false)
const taxErrorDetail = ref('')
const taxLoading = ref(false)
const taxApplying = ref(false)
const taxReverting = ref(false)
const showTaxRevert = ref(false)

const busy = computed(
  () => deducting.value || reverting.value || taxApplying.value || taxReverting.value,
)

/** An unreadable figure is a dash; a zero would claim the endpoint said zero. */
function moneyOrDash(value) {
  return value === null || value === undefined ? '—' : formatCurrencyPrecise(value)
}

/** Decimal strings ("200.00") arrive from the API; sum them as numbers. */
function amount(val) {
  return Number(val ?? 0)
}

const contributions = computed(() => data.value?.contributions || [])
const pending = computed(() => contributions.value.filter((row) => !row.deducted))
const deductedRows = computed(() => contributions.value.filter((row) => row.deducted))

/**
 * The status the summary leads with.
 *
 * The endpoint's own `epi_contribution_status` whenever it answered; the row's
 * `contribution_status` only in the state where it did not (a cutoff with no tax
 * month), so the dialog says what the review table said rather than showing an
 * empty pill beside a real figure.
 */
const summaryStatus = computed(
  () => data.value?.epi_contribution_status || props.contributionStatus || '',
)

/**
 * The two actions are decided per row, not by the item's overall status.
 *
 * They used to swap in one footer slot gated on `epi_contribution_status` being
 * `complete`, which left a partly deducted item — the normal state after a manual
 * deduction, and one the server reports as `incomplete` — with a Deduct button
 * and no way to undo what had already come off. A deducted row can be reverted
 * whenever it exists; a pending one can be deducted whenever it exists.
 */
const canDeduct = computed(() => pending.value.length > 0)
const canRevert = computed(() => deductedRows.value.length > 0)

const totalAmount = computed(() =>
  contributions.value.reduce((sum, row) => sum + amount(row.amount), 0),
)
const deductedAmount = computed(() =>
  contributions.value
    .filter((row) => row.deducted)
    .reduce((sum, row) => sum + amount(row.amount), 0),
)
const pendingAmount = computed(() =>
  pending.value.reduce((sum, row) => sum + amount(row.amount), 0),
)

// One selection, split by what each action can do with it. A mixed selection is
// legitimate: the checkboxes pick rows, and each button counts only the half it
// will act on, so neither request can carry an id the other endpoint expects.
const selectedRows = computed(() =>
  contributions.value.filter((row) => selected.value.includes(row.id)),
)
const selectedPending = computed(() => selectedRows.value.filter((row) => !row.deducted))
const selectedDeducted = computed(() => selectedRows.value.filter((row) => row.deducted))
const selectedAmount = computed(() =>
  selectedRows.value.reduce((sum, row) => sum + amount(row.amount), 0),
)

const allSelectableSelected = computed(
  () =>
    contributions.value.length > 0 &&
    contributions.value.every((row) => selected.value.includes(row.id)),
)

const selectAllLabel = computed(() => {
  if (allSelectableSelected.value) return 'Clear selection'
  return `Select all ${contributions.value.length}`
})

/**
 * The tax month a payload carries, as "May 2026".
 *
 * The API sends a 1-based calendar month, not a JS month index. One helper for
 * both readers: the contributions payload's month names the run in the tax-month
 * line, and the tax payload's may be the same cutoff's own tax month read second.
 */
function monthLabelOf(taxMonth) {
  if (!taxMonth?.month || !taxMonth?.year) return ''
  return `${MONTHS[taxMonth.month - 1] || ''} ${taxMonth.year}`.trim()
}

const taxMonthLabel = computed(() => monthLabelOf(data.value?.tax_month))
const taxPeriodLabel = computed(() => monthLabelOf(taxData.value?.tax_month))

// ── Withholding tax ────────────────────────────────────────────────────────

/**
 * The tax payload once it is loaded. Its siblings below read it rather than
 * `taxData` so every guard is written once.
 */
const taxHas = computed(() => Boolean(taxData.value?.has_tax))
const taxReverted = computed(() => Boolean(taxData.value?.tax_reverted))
const taxHasMonth = computed(() => Boolean(taxData.value?.tax_month))

/** The bracket breakdown; `.details` differs grossly by state (see below). */
const taxDetails = computed(() => taxData.value?.tax?.details || {})
const taxAmount = computed(
  () => taxData.value?.tax?.total ?? taxData.value?.monthly_tax?.tax_amount ?? null,
)

/**
 * The income the tax was computed from. The applied state names it
 * `monthly_gross_for_tax` on the `tax` object; the monthly row answers the same
 * figure as `taxable_income`, and either name is the evidence behind the total.
 */
const taxTaxableIncome = computed(
  () =>
    taxData.value?.tax?.monthly_gross_for_tax ?? taxData.value?.monthly_tax?.taxable_income ?? null,
)

const taxBracket = computed(() => String(taxDetails.value?.bracket || '').trim())
const taxFixed = computed(() => taxDetails.value?.fixed_tax ?? null)
const taxPercent = computed(() => taxDetails.value?.percent_over ?? null)

const taxPercentText = computed(() => {
  const n = Number(taxPercent.value)
  if (!Number.isFinite(n)) return ''
  return `${n.toLocaleString('en-PH', { maximumFractionDigits: 4 })}%`
})

/** Whether a tax backlog wants its own reason, time and actor line. */
const taxRevertReason = computed(() => String(taxDetails.value?.reason || '').trim())
const taxRevertedAt = computed(() => taxDetails.value?.reverted_at ?? null)

/**
 * Who sent the revert, shown only when the payload carries a person.
 *
 * The endpoint's documented example holds a user id, and a bare number where a
 * person should be is worse than nothing at all — so a number is dropped. If the
 * payload later names the actor as an object, the usual name spellings are read
 * rather than the line silently disappearing.
 */
const taxRevertedByLabel = computed(() => {
  const value = taxDetails.value?.reverted_by
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object') {
    return String(value.name || value.full_name || value.username || '').trim()
  }
  return ''
})

/**
 * Exempt is a real state distinct from "not applied": the item has no tax and
 * no action to take, and saying "not applied" invites pressing Apply that the
 * server will only skip. Reverted items carry the same `is_exempt` flag beside
 * their revert, so the revert check comes first.
 */
const taxExempt = computed(() => Boolean(taxDetails.value?.is_exempt) && !taxReverted.value)

const taxStatusLabel = computed(() => {
  if (!taxData.value) return ''
  if (taxReverted.value) return 'Reverted'
  if (taxHas.value) return 'Applied'
  if (taxExempt.value) return 'Exempt'
  if (!taxHasMonth.value) return 'No tax month'
  return 'Not applied'
})

const taxPillStatus = computed(() => {
  if (taxReverted.value) return 'needs_attention'
  if (taxHas.value) return 'complete'
  if (!taxHasMonth.value || taxExempt.value) return 'not_applicable'
  return 'pending'
})

/**
 * Whether the section can offer a write at all. Apply is only real where the
 * cutoff has a tax month to calculate against and the item is not exempt;
 * revert is only real where a tax is applied. Both go quiet while the section
 * is loading or reporting its own failure.
 */
const taxActionReady = computed(
  () => Boolean(taxData.value) && !taxLoading.value && !taxError.value,
)
const canApplyTax = computed(
  () => taxActionReady.value && taxHasMonth.value && !taxHas.value && !taxExempt.value,
)
const canRevertTax = computed(() => taxActionReady.value && taxHas.value)

/** Whether the facts below the status have anything to say, so the `<dl>` and its rule never render empty. */
const hasTaxFacts = computed(
  () =>
    taxHas.value ||
    taxTaxableIncome.value != null ||
    taxBracket.value !== '' ||
    taxFixed.value != null ||
    taxPercent.value != null ||
    taxPeriodLabel.value !== '',
)

function toggle(id) {
  const index = selected.value.indexOf(id)
  if (index === -1) selected.value.push(id)
  else selected.value.splice(index, 1)
}

function toggleAllSelectable() {
  selected.value = allSelectableSelected.value ? [] : contributions.value.map((row) => row.id)
}

async function load() {
  if (!props.pgiId || !props.epiId) {
    // Opening with a missing id used to render an empty body: `load()` bailed
    // before `loading` ever flipped, so no state at all matched. Say so instead
    // — a review row without `epi_id` is a payload fault.
    error.value = true
    errorDetail.value = 'Missing payout group instance or employee payroll item id.'
    data.value = null
    return
  }
  loading.value = true
  error.value = false
  errorDetail.value = ''
  noTaxMonth.value = false
  missingItem.value = false
  unconfiguredDetail.value = ''
  selected.value = []
  try {
    data.value = await fetchEpiContributions(props.pgiId, props.epiId)
  } catch (err) {
    if (err?.response?.status === 404) {
      // Nothing is wrong, so nothing is reported as wrong. The endpoint's own
      // console line is silenced by `expectedStatuses` on the request, and this
      // line has to stay quiet for the same two states — in production
      // `console.error` is the only diagnostic trail the app ships, so one red
      // line per employee on an unconfigured cutoff would bury a real failure.
      // Both 404s are rendered below as screen states instead.
      //
      // Which of the two 404s it is decides the wording: the documented one is a
      // configuration state ("No tax month found for this cutoff."), the other is
      // an item that is not in this run. A 404 that carries no quotable message
      // keeps the tax-month reading, the one the route documents.
      //
      // `extractErrorMessage` with an empty fallback still fabricates `(404)`
      // when the body has nothing quotable, so that token — not an empty string —
      // is what "nothing was named" looks like here.
      const serverMessage = extractErrorMessage(err, '').trim()
      const named = Boolean(serverMessage) && serverMessage !== '(404)'
      noTaxMonth.value = !named || NO_TAX_MONTH.test(serverMessage)
      missingItem.value = !noTaxMonth.value
      unconfiguredDetail.value = describeFetchFailure(err)
    } else {
      console.error('[EmployeeContributionsPanel] fetch failed:', err)
      error.value = true
      errorDetail.value = describeFetchFailure(err)
    }
    data.value = null
  } finally {
    loading.value = false
  }
  // Tax is read independently of the contributions above, so a 404 here cannot
  // hide the tax section and an error there cannot blank the list.
  await loadTax()
}

/**
 * The tax half of the employee's record, read on its own terms: its failure is
 * the section's own, and — unlike the contributions — an item with no tax month
 * still answers, so a reject here is never the unconfigured state the top of the
 * body handles. Never throws.
 */
async function loadTax() {
  if (!props.epiId) return
  taxError.value = false
  taxErrorDetail.value = ''
  taxLoading.value = true
  try {
    taxData.value = await fetchEpiTax(props.epiId)
  } catch (err) {
    console.error('[EmployeeContributionsPanel] tax fetch failed:', err)
    taxError.value = true
    taxErrorDetail.value = describeFetchFailure(err)
    taxData.value = null
  } finally {
    taxLoading.value = false
  }
}

/**
 * The status and whatever the server said, as one line for the error state.
 *
 * `extractErrorMessage` is the shared reader rather than a `data.detail || ...`
 * chain here, with an empty fallback: an HTML error page, a proxy gateway page,
 * or a request that never reached the server all resolve to nothing quotable,
 * and `''` is the honest result. The status is prepended because it survives
 * those cases and still says whose problem this is.
 */
function describeFetchFailure(err) {
  const status = err?.response?.status
  const detail = extractErrorMessage(err, '')
  const parts = [status ? `HTTP ${status}` : 'No response from the server', detail]
  return parts.filter(Boolean).join(' · ')
}

// ── Contribution writes ────────────────────────────────────────────────────

/** Ids arrive as numbers here and as strings elsewhere. */
function sameId(a, b) {
  return a != null && b != null && String(a) === String(b)
}

/** A decimal string into a number, or null when there is no readable figure. */
function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function capitalise(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : ''
}

/**
 * What one deduct or revert actually did.
 *
 * The documented response names the rows that changed
 * (`updated_contribution_ids` / `reverted_contribution_ids`), the rows it
 * refused (`skipped_contribution_ids`), the item's new `net_pay` and an overall
 * `success`. Every one of those is read here: the previous implementation
 * ignored the body and toasted success unconditionally, so a refused or skipped
 * deduction was reported as done. `changed` / `skipped` are `null` when the
 * server did not name them, which is what lets the caller fall back to "the rows
 * I sent" for an undocumented shape without ever inventing an id.
 */
function readContributionWrite(response) {
  const payload = response?.data ?? response ?? {}
  const list = (value) => (Array.isArray(value) ? value : null)
  const updated = list(payload.updated_contribution_ids)
  const reverted = list(payload.reverted_contribution_ids)
  return {
    ok: payload.success !== false,
    message: String(payload.message ?? '').trim(),
    changed: updated ?? reverted,
    skipped: list(payload.skipped_contribution_ids),
    netPay: toNumber(payload.net_pay),
    status: String(payload.contribution_status ?? '').trim(),
  }
}

/** The second line of a write toast: the server's own words, and the new net pay. */
function writeCaption(outcome) {
  const parts = []
  if (outcome.message) parts.push(outcome.message)
  if (outcome.netPay != null) parts.push(`Net pay now ${formatCurrencyPrecise(outcome.netPay)}`)
  return parts.join(' · ')
}

/**
 * Reports one contribution write against the rows it was sent for.
 *
 * A row is reported as changed only when the server named it as changed. An
 * answer that names nothing is the undocumented shape, and then the rows sent
 * are taken as done — the only reading available. A `success: false` is an
 * error even when the HTTP status was 200, and a partial result says how many
 * rows were skipped instead of covering them with a green toast.
 */
function reportContributionWrite(response, { doneLabel, rows, icon }) {
  const outcome = readContributionWrite(response)
  const named = outcome.changed !== null || outcome.skipped !== null
  const changed = named
    ? rows.filter((row) => (outcome.changed || []).some((id) => sameId(id, row.id)))
    : rows
  const skipped = named ? rows.filter((row) => !changed.includes(row)) : []

  if (!outcome.ok) {
    toast.error(outcome.message || 'The server did not update these contributions.', {
      timeout: 5000,
    })
    return
  }

  if (changed.length) {
    const written = changed.reduce((sum, row) => sum + amount(row.amount), 0)
    toast.success(`${capitalise(doneLabel)} ${formatCurrencyPrecise(written)}`, {
      icon,
      caption: writeCaption(outcome),
      timeout: 3500,
    })
  }

  if (skipped.length) {
    const names = skipped
      .map((row) => row.name)
      .filter(Boolean)
      .join(', ')
    toast.warning(
      changed.length
        ? `${skipped.length} contribution${skipped.length > 1 ? 's' : ''} not ${doneLabel}: ${names}`
        : `Nothing was ${doneLabel}: ${names}`,
      { timeout: 5000 },
    )
  }
}

async function deduct() {
  // Only the pending half of the selection: a mixed selection is legitimate now,
  // and a deducted id sent here is an id the endpoint has nothing to deduct for.
  const rows = selectedPending.value
  if (!rows.length || busy.value) return
  // Held before the refetch, which clears `selected` — read afterwards it would
  // be 0, and the toast would name the wrong figure.
  const ids = rows.map((row) => row.id)
  deducting.value = true
  try {
    const response = await deductContributions(props.epiId, ids)
    // Refetched rather than patched locally: deducting sets `deducted_from` and
    // can move the item's overall status, neither of which is knowable here.
    await load()
    emit('changed')
    reportContributionWrite(response, { doneLabel: 'deducted', rows, icon: 'check_circle' })
  } catch (err) {
    console.error('[EmployeeContributionsPanel] deduct ✖ error:', err)
    toast.error(extractErrorMessage(err, 'Failed to deduct contributions.'), { timeout: 5000 })
  } finally {
    deducting.value = false
  }
}

/**
 * Reverting undoes a settled deduction and changes the money on the run, so it
 * asks first — and names exactly which contributions it will touch, because the
 * button's default is every deducted row rather than the current selection.
 */
function confirmRevert() {
  if (busy.value) return
  // Keyed to the deducted half of the selection, exactly as the button's label
  // is: selecting only pending rows must still read "Revert all" and act on
  // every deducted row rather than becoming a no-op.
  const rows = selectedDeducted.value.length ? selectedDeducted.value : deductedRows.value
  if (!rows.length) return

  const names = rows.map((row) => row.name).join(', ')
  $q.dialog({
    title: 'Revert contributions?',
    message:
      rows.length === 1
        ? `${names} will go back to pending and its amount will be added back to this payroll item.`
        : `${rows.length} contributions (${names}) will go back to pending and their amounts will be added back to this payroll item.`,
    cancel: true,
    persistent: true,
    ok: { label: 'Revert', unelevated: true, color: 'warning', noCaps: true },
  }).onOk(() => revert(rows))
}

async function revert(rows) {
  const ids = rows.map((row) => row.id)
  reverting.value = true
  try {
    const response = await revertContributions(props.epiId, ids)
    // Refetched for the same reason as deducting: the server owns both
    // `deducted_from` and the item's overall contribution status.
    await load()
    emit('changed')
    reportContributionWrite(response, { doneLabel: 'reverted', rows, icon: 'undo' })
  } catch (err) {
    console.error('[EmployeeContributionsPanel] revert error:', err)
    toast.error(extractErrorMessage(err, 'Failed to revert contributions.'), { timeout: 5000 })
  } finally {
    reverting.value = false
  }
}

// ── Withholding tax writes ─────────────────────────────────────────────────

/**
 * The per-status outcome of an apply or revert.
 *
 * The endpoint sends both `*_count` fields and a `results[]` array. Reading only
 * `results` would report a count-only response as an undocumented success — and
 * a `skipped` count is not a success. Each group therefore prefers the declared
 * count and falls back to the rows, so neither half going missing can turn a
 * refusal into a green toast.
 *
 * @returns {{applied: object, reverted: object, skipped: object, failed: object}}
 *   each `{ count, first }`, where `first` carries the row's own `reason`.
 */
function taxOutcomeGroups(response) {
  const results = Array.isArray(response?.results) ? response.results : []
  const pick = (status) =>
    results.filter((row) => String(row?.status).trim().toLowerCase() === status)

  const group = (status, countKey) => {
    const rows = pick(status)
    const declared = response?.[countKey]
    const count =
      declared != null && Number.isFinite(Number(declared)) ? Number(declared) : rows.length
    return { count, first: rows[0] || null }
  }

  return {
    applied: group('applied', 'applied_count'),
    reverted: group('reverted', 'reverted_count'),
    skipped: group('skipped', 'skipped_count'),
    failed: group('failed', 'failed_count'),
  }
}

/**
 * Applies the configured withholding tax to this one item.
 *
 * `force: false` even on the way back in after a revert: an item that still
 * answers "already applied" needs its reason reported rather than overwritten,
 * and every state this panel can reach is one the plain apply is allowed to
 * settle.
 */
async function applyWithholdingTax() {
  if (!props.epiId || busy.value) return
  taxApplying.value = true
  try {
    const response = await applyTaxRequest([props.epiId], { force: false })
    await loadTax()
    emit('changed')
    reportTaxApply(response)
  } catch (err) {
    console.error('[EmployeeContributionsPanel] apply tax ✖ error:', err)
    toast.error(extractErrorMessage(err, 'Failed to apply withholding tax.'), { timeout: 5000 })
  } finally {
    taxApplying.value = false
  }
}

/**
 * The apply outcome, as toasts: one per kind of result the endpoint returns,
 * because a batch of one still spans two truths — applied here, skipped there —
 * and a single "applied" would read over the skip.
 */
function reportTaxApply(response) {
  const { applied, skipped, failed } = taxOutcomeGroups(response)

  if (applied.count > 0) {
    const written = applied.first?.applied_tax?.tax_amount ?? null
    const bracket = String(applied.first?.applied_tax?.details?.bracket || '').trim()
    toast.success(
      `Applied withholding tax${written == null ? '' : ` ${formatCurrencyPrecise(written)}`}`,
      { icon: 'check_circle', caption: bracket, timeout: 3500 },
    )
  }
  if (skipped.count > 0) {
    toast.warning(
      `Withholding tax was not applied: ${skipped.first?.reason || 'no change was made'}`,
      { timeout: 5000 },
    )
  }
  if (failed.count > 0) {
    toast.error(
      `Withholding tax could not be applied: ${failed.first?.reason || 'unhandled failure'}`,
      { timeout: 5000 },
    )
  }
  // Every other response shape is an undocumented "it worked" — say so plainly
  // rather than stay silent and leave the reader guessing whether anything moved.
  if (!applied.count && !skipped.count && !failed.count) {
    toast.success('Withholding tax updated', { icon: 'check_circle', timeout: 3500 })
  }
}

/**
 * Opens the revert gate. It is the panel's only exit from a settled tax, so it
 * is asked with a reason the reader can stand behind.
 */
function confirmRevertTax() {
  if (busy.value || !canRevertTax.value) return
  showTaxRevert.value = true
}

/**
 * Reverts the tax, carrying the reason the gate collected.
 *
 * The dialog is closed only once the write has succeeded — a failure leaves it
 * open with the reason intact, the way the reject dialog does, so a retry does
 * not start from memory.
 */
async function commitRevertTax(reason) {
  if (taxReverting.value || !reason || !props.epiId) return
  // Held before the refetch: the refreshed payload reports the revert, and its
  // own `tax.total` is no longer the figure that came off.
  const written = taxAmount.value
  taxReverting.value = true
  try {
    const response = await revertTaxRequest([props.epiId], reason)
    showTaxRevert.value = false
    await loadTax()
    emit('changed')
    reportTaxRevert(response, written, reason)
  } catch (err) {
    console.error('[EmployeeContributionsPanel] revert tax ✖ error:', err)
    toast.error(extractErrorMessage(err, 'Failed to revert withholding tax.'), { timeout: 5000 })
  } finally {
    taxReverting.value = false
  }
}

/** The revert outcome, as toasts — one per kind of result, as for applying. */
function reportTaxRevert(response, written, reason) {
  const { reverted, skipped, failed } = taxOutcomeGroups(response)

  if (reverted.count > 0) {
    const writtenAmount = reverted.first?.reverted_tax?.tax_amount ?? written
    toast.success(
      `Reverted withholding tax${
        writtenAmount == null ? '' : ` ${formatCurrencyPrecise(writtenAmount)}`
      }`,
      { icon: 'undo', caption: reason, timeout: 3500 },
    )
  }
  if (skipped.count > 0) {
    toast.warning(`Nothing was reverted: ${skipped.first?.reason || 'no tax to revert'}`, {
      timeout: 5000,
    })
  }
  if (failed.count > 0) {
    toast.error(`The tax could not be reverted: ${failed.first?.reason || 'unhandled failure'}`, {
      timeout: 5000,
    })
  }
  if (!reverted.count && !skipped.count && !failed.count) {
    toast.success('Withholding tax reverted', { icon: 'undo', timeout: 3500 })
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
@import './employeeMoneyPanel.scss';

/* Reverting is a correction, not the happy path, so it is a soft amber button
   rather than the footer's filled one — visible without competing with the
   brand action it stands in for. */
.contrib-revert {
  min-height: 36px;
  padding: 0 16px;
  border-radius: var(--dash-r-md);
  background: var(--dash-warn-bg);
  color: var(--dash-warn);
  border: 1px solid var(--dash-warn-line);
  box-shadow: none;
}

.contrib-revert:hover {
  background: #fef0c7;
}

/* The summary's single-figure form, used when the endpoint 404s and only the
   row's own contribution is known. One column, and no top rule: the three-figure
   grid draws a rule under the status line because it separates two rows of facts,
   and a lone figure under the same rule reads as a table missing its columns. */
.contrib-summary__figures--single {
  grid-template-columns: 1fr;
  padding-top: 0;
  border-top: none;
}

/* ── Withholding tax ─────────────────────────────────────────────────────────
   The section reads the shared vocabulary — a bordered summary block for the
   status and figures, `.contrib-note` for its own failures, the same head row —
   so only the facts grid and the text action are its own. Two columns, because
   the applied state carries up to six figures and three columns would widow the
   sixth row. */
.contrib-tax__revert {
  color: var(--dash-warn);
  font-weight: 600;
}

/* The summary block itself already has the card look it needs from
   `.contrib-summary`; this adds only the gap that the note below the facts
   needs to read as evidence rather than as a fourth figure. */
.contrib-tax__summary {
  gap: 12px;
}

.contrib-tax__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding-top: 11px;
  border-top: 1px solid var(--dash-line-soft);
}

.contrib-tax__facts dt {
  font-size: 11.5px;
  color: var(--dash-ink-4);
}

/* The bracket label is a range, not money; `overflow-wrap` keeps a long range
   from being clipped by the grid track it sits in. */
.contrib-tax__facts dd {
  margin: 2px 0 0;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--dash-ink);
  overflow-wrap: anywhere;
}

/* The evidence under the facts — why a tax is sitting reverted, what has to
   happen before one can be calculated — is a sentence, not a figure, so it
   drops to the summary block's body ink at note size. */
.contrib-tax__note {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--dash-ink-3);
}

/* ── No tax month ────────────────────────────────────────────────────────────
   The state a cutoff with no tax month puts the contributions list in. A note
   inside the section, not a block that replaces the body: the status summary
   above it and the withholding-tax section below are both still real answers,
   and the takeover that used to sit here hid them.

   Left-aligned and boxed on the sunken ground rather than centred in the body's
   space, because it is now one section's message rather than the whole panel's.
   It carries no retry: pressing one cannot conjure a tax month onto a cutoff. */
.contrib-unset {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 14px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-sunken);
}

.contrib-unset__title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink-2);
}

.contrib-unset__sub {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--dash-ink-3);
}

/* The server's own line: quieter than the reading above it, and the only copy of
   what went wrong anywhere on screen, so it wraps rather than truncating. */
.contrib-unset__detail {
  margin-top: 3px;
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--dash-ink-4);
  overflow-wrap: anywhere;
}
</style>
