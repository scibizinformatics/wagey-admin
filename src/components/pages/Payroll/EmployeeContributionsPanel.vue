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
          <!-- No row list, but the month report named this employee. Its three
               figures replace the single borrowed one rather than sitting beside
               it: two amounts under two labels for the same month's money is the
               disagreement this dialog exists to avoid. -->
          <dl v-else-if="hasMonthSummary" class="contrib-summary__figures">
            <div>
              <dt>Due</dt>
              <dd class="dash-num">{{ moneyOrDash(monthSummaryTotals.due) }}</dd>
            </div>
            <div>
              <dt>Deducted</dt>
              <dd class="dash-num">{{ moneyOrDash(monthSummaryTotals.deducted) }}</dd>
            </div>
            <div>
              <dt>Outstanding</dt>
              <dd
                class="dash-num"
                :class="{ 'contrib-pending': monthSummaryTotals.undeducted > 0 }"
              >
                {{ moneyOrDash(monthSummaryTotals.undeducted) }}
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

          <!-- The run has no tax month, so the endpoint answers 404 for the whole
               item and there are no rows to list. A cutoff without a tax month
               still sits inside a calendar month, though, and that month's
               contributions are posted: the company's month report can say what
               each component is due, what has been withheld and what is still
               outstanding. Read-only by nature — those rows carry no contribution
               ids, so there is nothing here to select or deduct. This block is
               the stand-in until `epi-contributions` takes the month as a
               parameter; the real list then renders instead and this is never
               reached. -->
          <div v-if="noTaxMonth && hasMonthSummary" class="contrib-month">
            <p class="contrib-month__title">{{ runMonthLabel || 'Month' }} contributions</p>
            <ul v-if="monthSummaryRows.length" class="contrib-list">
              <li v-for="row in monthSummaryRows" :key="row.name" class="contrib-row">
                <span class="contrib-row__body">
                  <span class="contrib-row__name">{{ row.name }}</span>
                  <!-- This payload tracks the month's deduction, not each
                       component's, so the per-row state is rendered only when a
                       richer breakdown supplied it. -->
                  <span
                    v-if="row.deducted != null || row.undeducted != null"
                    class="contrib-row__meta"
                  >
                    <template v-if="row.undeducted != null && row.undeducted > 0">
                      {{ moneyOrDash(row.undeducted) }} outstanding
                    </template>
                    <template v-else-if="row.undeducted === 0">Deducted</template>
                    <template v-else-if="row.deducted != null && row.deducted > 0">
                      {{ moneyOrDash(row.deducted) }} deducted
                    </template>
                  </span>
                </span>
                <span class="contrib-row__amount dash-num">{{ moneyOrDash(row.due) }}</span>
              </li>
            </ul>
            <p v-if="monthDeductedFrom" class="contrib-month__note">
              Deducted from {{ monthDeductedFrom }}.
            </p>
            <p v-else class="contrib-month__note">
              Not yet deducted. The run that closes {{ runMonthLabel || 'the month' }} is where it
              is taken.
            </p>
          </div>

          <!-- The month report is being read; the note below is what shows if it
               answers with no row for this employee. -->
          <div v-else-if="noTaxMonth && monthSummaryLoading" class="contrib-note">
            <q-spinner size="15px" />
            <span>Loading {{ runMonthLabel || 'month' }} contributions…</span>
          </div>

          <!-- Nothing usable came back: no scoped rows and no row for this employee
               in the month report. A note inside the section rather than a block
               that replaced the body: the status above and the tax section below
               are still real answers, and the takeover hid both. Deliberately no
               retry — pressing one cannot conjure a tax month onto a cutoff.

               There are two reasons for the 404 and only one of them is a missing
               setting. A mid-month cutoff never carries a tax month: contributions
               settle on the run that closes the month, which is where the deducted
               rows live (`deducted_from: "Cut off #2"`). So the first half of a
               month says "nothing happens here", not "ask someone to configure
               this" — and the server's own line is dropped in that state, because
               a 404 is the expected answer there. A closing cutoff with no tax
               month keeps the configuration wording and its server line: that one
               really is unset. -->
          <div v-else-if="noTaxMonth" class="contrib-unset">
            <p class="contrib-unset__title">
              {{
                settlesOnClosingCutoff
                  ? 'Contributions settle on the closing cutoff'
                  : 'No tax month for this cutoff'
              }}
            </p>
            <p class="contrib-unset__sub">
              <template v-if="settlesOnClosingCutoff">
                Statutory contributions{{ cutoffMonthLabel ? ` for ${cutoffMonthLabel}` : '' }}
                are settled on the run that closes the month.
                {{ cutoffName || 'This cutoff' }} ends before that, so there is nothing to list or
                deduct here.
              </template>
              <template v-else>
                Contributions cannot be listed for {{ employeeName || 'this employee' }} until a tax
                month is set for {{ cutoffName || 'this period' }}.
              </template>
            </p>
            <span
              v-if="unconfiguredDetail && !settlesOnClosingCutoff"
              class="contrib-unset__detail"
              >{{ unconfiguredDetail }}</span
            >
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
              Nothing is due from this employee for
              {{ taxMonthLabel || runMonthLabel || 'this period' }}.
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
            <div v-if="showTaxAmount">
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
          <!-- The month is settled, but not by this run: its money is on another
               cutoff's item, so neither action here could be honest. -->
          <p v-else-if="taxSettledElsewhere" class="contrib-tax__note">
            This month's withholding tax was applied on
            {{ taxSettledOnLabel || 'the run that closes the month' }}, so it cannot be applied or
            reverted from here.
          </p>
          <!-- Before the missing-setting line below: a mid-month cutoff with no
               month to show has no tax month by design, so naming it as unset
               would send the reader looking for a switch that does not exist. -->
          <p v-else-if="!taxMonthKnown && isMidMonthCutoff" class="contrib-tax__note">
            Withholding tax{{ cutoffMonthLabel ? ` for ${cutoffMonthLabel}` : '' }}
            is settled on the run that closes the month, so there is nothing to apply here.
          </p>
          <p v-else-if="!taxMonthKnown && !noTaxMonth" class="contrib-tax__note">
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
import { useCompany } from 'src/composables/page/useCompany'
import { useDeductions } from 'src/composables/page/useDeductions'
import {
  contributionBalanceOf,
  contributionComponentsOf,
  contributionDeductedOf,
  contributionDueOf,
} from 'src/composables/utils/contributions'
import { formatCurrencyPrecise, formatDateTime } from 'src/composables/utils/format'
import { extractErrorMessage } from 'src/composables/utils/http'
import { useToast } from 'src/composables/useToast'

const $q = useQuasar()
const toast = useToast()
const { fetchEpiTax, applyTax: applyTaxRequest, revertTax: revertTaxRequest } = useDisbursementApi()
const { fetchEpiContributions, deductContributions, revertContributions } =
  useEmployeeContributions()
const { companyId } = useCompany()
const { fetchEmployeeContributions } = useDeductions()

const props = defineProps({
  /** Payout group instance the employee payroll item belongs to. */
  pgiId: { type: [Number, String], default: null },
  /** Employee payroll item id. */
  epiId: { type: [Number, String], default: null },
  employeeName: { type: String, default: '' },
  /**
   * The employee's own uuid, when the page has it.
   *
   * Only the month report needs it: that endpoint answers every active employee
   * in the company for the month, so the row is picked by id rather than by name
   * — two colleagues can share a name, and one person's contribution figures
   * beside another's name is the worse mistake. Without it the panel falls back
   * to an exact name match, and refuses a name held by more than one row.
   */
  employeeId: { type: String, default: '' },
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
/**
 * This employee's row from the company's month report, shown only where the real
 * row list cannot be.
 *
 * `epi-contributions` resolves its rows through the EPI's tax month, which a 1–15
 * run does not own; the month report resolves through the calendar month, so it
 * can tell the reader what November owes even when the deduction itself belongs
 * to the closing cutoff. It carries no row ids and no per-row deduction state, so
 * it is display only — no checkbox, no Deduct.
 */
const monthSummary = ref(null)
const monthSummaryLoading = ref(false)
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
/**
 * The month this payload was asked for, when the item carried no tax month of its
 * own and the panel named one (`?year=&month=`).
 *
 * Only set when the scoped answer actually brought a month back, so it doubles as
 * the evidence that the month is addressable: it makes the card render, it is the
 * period sent with apply/revert, and a payload that came back empty leaves it
 * null so the "settles on the closing cutoff" note stands.
 */
const taxScopedMonth = ref(null)

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
const summaryStatus = computed(() => {
  // Whenever the endpoint answers, its own status wins — including an empty one,
  // which renders as "—" rather than borrowing the row's. The fallback exists only
  // for the state where nothing answered.
  if (data.value) return data.value.epi_contribution_status || ''
  return props.contributionStatus || ''
})

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
const taxPeriodLabel = computed(
  () => monthLabelOf(taxData.value?.tax_month) || monthLabelOf(taxScopedMonth.value),
)

/**
 * The cutoff this item belongs to, as the tax payload reports it — the only
 * place the panel is told the run's real dates.
 *
 * `epi-contributions` 404s with no cutoff in the body, and `cutoffName` is a
 * display string ("November 1 - November 15, 2026 (Semi-Monthly)") that would
 * have to be parsed to learn anything. `epi-tax` answers these two fields even
 * when it has no tax month, so they are read rather than guessed.
 */
const cutoffSpan = computed(() => {
  const span = taxData.value?.cutoff
  if (!span?.end_date) return null
  return { start: String(span.start_date || ''), end: String(span.end_date || '') }
})

/**
 * Whether this run closes before the 16th of its month, i.e. it is the first of
 * two semi-monthly cutoffs rather than the one that closes the month.
 *
 * Observed across every company-5 run on staging (Sep, Oct and Nov 2026): the
 * tax month is carried only by the cutoff that *closes* the month — 16–30 gets
 * `2026-09` / `2026-10` / `2026-11`, while 1–15 gets `null`. So a 404 in the
 * first half of a month is the documented answer for a period that is not
 * supposed to have one, not a setting somebody forgot.
 *
 * Read from the payload's own dates rather than from the cutoff's name, and
 * `false` whenever the tax payload did not load: without evidence the panel
 * keeps the configuration wording, which is the safe reading.
 */
const isMidMonthCutoff = computed(() => {
  const end = cutoffSpan.value?.end
  if (!end) return false
  const day = Number(end.slice(8, 10))
  return Number.isFinite(day) && day < 16
})

/** The month the run belongs to, as "November 2026", from the cutoff's own dates. */
const cutoffMonthLabel = computed(() => {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(cutoffSpan.value?.start || '')
  if (!match) return ''
  return `${MONTHS[Number(match[2]) - 1] || ''} ${match[1]}`.trim()
})

/**
 * The calendar month this run belongs to, as `{ year, month }`.
 *
 * Read from the cutoff's **end** date, not its start: the month's contribution
 * rows are named after the month the run closes in, so a week that straddles a
 * boundary (Apr 28 – May 4) belongs to May, and the first half of November
 * belongs to November. This is the period the panel asks for when the EPI has no
 * tax month to resolve one from.
 */
const runMonth = computed(() => {
  const match = /^(\d{4})-(\d{2})/.exec(cutoffSpan.value?.end || '')
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isFinite(year) || month < 1 || month > 12) return null
  return { year, month }
})

/** The run's own month, as "November 2026". */
const runMonthLabel = computed(() => monthLabelOf(runMonth.value))

/**
 * The 404 read as "not this cutoff's job" rather than "not configured".
 *
 * Both conditions: the endpoint answered the tax-month 404 *and* the run is the
 * mid-month cutoff, where no tax month is ever expected. A closing cutoff keeps
 * `false` and its configuration wording.
 */
const settlesOnClosingCutoff = computed(() => noTaxMonth.value && isMidMonthCutoff.value)

/**
 * The month report's component rows, normalised to one shape.
 *
 * `contributionComponentsOf` is the one reading of this payload: the employee
 * summary sends `contributions` as `{ name, amount }`, while a richer payload
 * carries per-component deducted and outstanding figures under other names. A
 * missing figure stays `null` — the row then shows only what it knows rather
 * than a confident zero.
 */
const monthSummaryRows = computed(() => contributionComponentsOf(monthSummary.value))

/**
 * The month's own totals, read off the report's aggregate fields — never re-summed
 * from the breakdown, which can be abbreviated or absent.
 */
const monthSummaryTotals = computed(() => ({
  due: contributionDueOf(monthSummary.value),
  deducted: contributionDeductedOf(monthSummary.value),
  undeducted: contributionBalanceOf(monthSummary.value),
}))

/**
 * Whether the month report has anything worth showing.
 *
 * Either half counts on its own: a report row that names its components is a
 * breakdown, and one that only carries the three totals is still the month's
 * money. Requiring `breakdown_data` was the earlier reading, and it sent a
 * populated row back to the note whenever the backend abbreviated the breakdown.
 */
const hasMonthSummary = computed(() => {
  if (!monthSummary.value) return false
  if (monthSummaryRows.value.length) return true
  const totals = monthSummaryTotals.value
  return totals.due != null || totals.deducted != null || totals.undeducted != null
})

/**
 * The cutoff that actually took the month's contributions, when one has.
 *
 * The report sends `deducted_from: "N/A"` until something is deducted, then the
 * cutoff's name. Read rather than assumed: the dialog used to state that the run
 * closing the month takes them, which is wrong for a month already settled on an
 * earlier one.
 */
const monthDeductedFrom = computed(() => {
  const value = String(monthSummary.value?.deducted_from ?? '').trim()
  if (!value || /^n\/?a$/i.test(value)) return ''
  return value
})

// ── Withholding tax ────────────────────────────────────────────────────────

/**
 * The tax payload once it is loaded. Its siblings below read it rather than
 * `taxData` so every guard is written once.
 */
const taxHas = computed(() => Boolean(taxData.value?.has_tax))
const taxReverted = computed(() => Boolean(taxData.value?.tax_reverted))
/** The item's own tax month, exactly as the endpoint reports it (null on a 1–15 run). */
const taxHasMonth = computed(() => Boolean(taxData.value?.tax_month))
/** The month behind the figures: the item's own, or the one the panel asked for by name. */
const taxMonthKnown = computed(() => taxHasMonth.value || Boolean(taxScopedMonth.value))

/** The month row behind the figures, when the endpoint sends one beside `tax`. */
const monthlyTax = computed(() => {
  const row = taxData.value?.monthly_tax
  return row && typeof row === 'object' ? row : null
})

/**
 * The bracket breakdown.
 *
 * Two shapes wear it: an applied tax carries `tax.details`, while a month read
 * before it is applied — or read from the cutoff that did not settle it — carries
 * the same fields under `monthly_tax.details`. The applied object wins when it
 * has anything in it, because that is the row the money was actually taken from;
 * an empty one would otherwise hide a perfectly good bracket behind it.
 */
const taxDetails = computed(() => {
  const applied = taxData.value?.tax?.details
  if (applied && typeof applied === 'object' && Object.keys(applied).length) return applied
  const monthly = monthlyTax.value?.details
  if (monthly && typeof monthly === 'object') return monthly
  return {}
})

/** The first readable string among the values, for markers whose spelling varies. */
function firstText(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

/**
 * The cutoff the month's tax was taken on, when the payload names one.
 *
 * The endpoint's applied state lives on one EPI, so a first-half run needs to be
 * told that the month is already settled — otherwise it reads "Not applied" over
 * money that has been withheld. No endpoint documents this field yet; the names
 * below are the shapes a month-settlement marker is expected to take, and an
 * absent one simply keeps the older behaviour.
 */
const taxSettledOnLabel = computed(() =>
  firstText(
    monthlyTax.value?.applied_to,
    monthlyTax.value?.applied_cutoff,
    monthlyTax.value?.settled_on,
    monthlyTax.value?.deducted_from,
    taxDetails.value?.applied_to,
  ),
)

/**
 * Whether the tax this item reports is actually held by this item.
 *
 * The documented applied state puts the figures on `tax`; a month read from the
 * cutoff that did not settle it carries them on `monthly_tax` instead, with `tax`
 * left at its placeholder. That difference is the ownership evidence — a marker
 * naming the cutoff is a bonus, not the only proof.
 *
 * "Never applied" is not an empty object: the endpoint answers
 * `tax: { total: "0.00", details: {}, monthly_gross_for_tax: null }`. Testing
 * `total != null` therefore counted every untouched item as holding its tax — and
 * `"0.00"` is a non-null string — which would have defeated the check below and
 * offered Apply over a month another cutoff had already settled. A non-zero
 * total, a populated bracket, or a gross figure are the real signs; a zero with
 * nothing else is the placeholder.
 */
const taxHeldHere = computed(() => {
  const tax = taxData.value?.tax
  if (!tax || typeof tax !== 'object') return false
  if (tax.monthly_gross_for_tax != null) return true
  if (tax.details && Object.keys(tax.details).length) return true
  const total = Number(tax.total)
  return Number.isFinite(total) && total !== 0
})

/**
 * Whether the month's tax is settled somewhere this run cannot act on it.
 *
 * Only ever true for a run without its own tax month: the cutoff that closes the
 * month owns the tax and always acts on it. Beyond that it takes evidence — an
 * applied record on this item means the money is here, while a month-level
 * `has_tax`, a populated `monthly_tax` row, or a marker naming the cutoff that
 * took it all mean the money is elsewhere. Guessing "not applied" over withheld
 * tax is the mistake that matters, so the ambiguous cases read as settled.
 */
const taxSettledElsewhere = computed(() => {
  if (taxHasMonth.value || taxReverted.value || taxExempt.value) return false
  if (taxHeldHere.value) return false
  if (taxSettledOnLabel.value) return true
  if (taxHas.value) return true
  const owner = monthlyTax.value?.epi_id ?? monthlyTax.value?.applied_epi_id
  return owner != null && props.epiId != null && !sameId(owner, props.epiId)
})

/**
 * The figure to show, preferring the money the item actually holds.
 *
 * `tax.total` is the applied figure, but on an item that never applied tax it is
 * the placeholder `"0.00"` — non-null, so `??` would keep it and print zero over
 * a month row that carries the real amount. The month's `tax_amount` is the
 * fallback whenever this item is not the one holding the tax.
 */
const taxAmount = computed(() => {
  const applied = taxData.value?.tax?.total ?? null
  const monthly = taxData.value?.monthly_tax?.tax_amount ?? null
  if (taxHeldHere.value && applied != null) return applied
  return monthly ?? applied
})

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
  // A month settled by another run reads as applied here too: the money has been
  // withheld, and "Not applied" beside it would invite a second deduction.
  if (taxHas.value || taxSettledElsewhere.value) return 'Applied'
  if (taxExempt.value) return 'Exempt'
  // A mid-month cutoff with nothing to show for its month has no tax month by
  // design, so the pill says where the tax lives instead of naming a setting that
  // is not missing.
  if (!taxMonthKnown.value && isMidMonthCutoff.value) return 'Closing cutoff'
  if (!taxMonthKnown.value) return 'No tax month'
  return 'Not applied'
})

const taxPillStatus = computed(() => {
  if (taxReverted.value) return 'needs_attention'
  if (taxHas.value || taxSettledElsewhere.value) return 'complete'
  if (!taxMonthKnown.value || taxExempt.value) return 'not_applicable'
  return 'pending'
})

/**
 * Whether the section can offer a write at all. Apply is only real where there is
 * a month to calculate against — the item's own, or the one asked for by name —
 * the item is not exempt, and the month is not already settled on another run;
 * revert is only real where this run holds the tax. Both go quiet while the
 * section is loading or reporting its own failure.
 */
const taxActionReady = computed(
  () => Boolean(taxData.value) && !taxLoading.value && !taxError.value,
)
const canApplyTax = computed(
  () =>
    taxActionReady.value &&
    taxMonthKnown.value &&
    !taxHas.value &&
    !taxExempt.value &&
    !taxSettledElsewhere.value,
)
const canRevertTax = computed(
  () => taxActionReady.value && taxHas.value && !taxSettledElsewhere.value,
)

/** The month to write against: only a run that had to name one sends it. */
const taxWritePeriod = computed(() => taxScopedMonth.value)

/**
 * Whether the "Tax" figure is evidence rather than a hopeful zero.
 *
 * A month read before it is applied still carries the amount that will be taken,
 * so it is shown beside the figures — but never over an exempt or reverted state,
 * where a `₱0.00` would claim the endpoint answered zero.
 */
const showTaxAmount = computed(
  () =>
    taxAmount.value != null &&
    (taxHas.value || taxMonthKnown.value) &&
    !taxExempt.value &&
    !taxReverted.value,
)

/** Whether the facts below the status have anything to say, so the `<dl>` and its rule never render empty. */
const hasTaxFacts = computed(
  () =>
    showTaxAmount.value ||
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
  monthSummary.value = null
  selected.value = []

  // Started before the contributions read rather than after it: the cutoff's own
  // dates are what name the run's month, and the 404 below needs them. The same
  // promise is awaited again at the end, so the happy path still overlaps the two
  // requests instead of serialising them.
  const taxPromise = loadTax()

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
      if (!named || NO_TAX_MONTH.test(serverMessage)) {
        await readContributionsForRunMonth(err, taxPromise)
      } else {
        missingItem.value = true
        unconfiguredDetail.value = describeFetchFailure(err)
        data.value = null
      }
    } else {
      console.error('[EmployeeContributionsPanel] fetch failed:', err)
      error.value = true
      errorDetail.value = describeFetchFailure(err)
      data.value = null
    }
  } finally {
    loading.value = false
  }
  // Tax is read independently of the contributions above, so a 404 here cannot
  // hide the tax section and an error there cannot blank the list.
  await taxPromise
}

/**
 * The second question asked of the contributions route: what does this run's own
 * month owe, when the EPI carries no tax month for the route to resolve?
 *
 * A cutoff without a tax month still sits inside a calendar month, and the month's
 * rows exist whichever cutoff settles them. Asking for the month by name is what
 * lets the first half of a month show — and deduct — the rows the closing cutoff
 * would otherwise own. Until the route answers for a month (`?year=&month=`), the
 * second request 404s as well and the note stands, which is the earlier behaviour.
 *
 * An answer with no rows is still an answer: the month is addressable and this
 * employee owes nothing on it, so the empty state is what renders.
 */
async function readContributionsForRunMonth(originalError, taxPromise) {
  await taxPromise
  const period = runMonth.value
  if (!period) {
    markNoTaxMonth(originalError)
    return
  }
  try {
    // A 200 with no body is still an answer, and an empty payload would render the
    // whole body blank; the empty state is the honest reading of it.
    const scoped = await fetchEpiContributions(props.pgiId, props.epiId, period)
    data.value = scoped ?? { contributions: [] }
  } catch (err) {
    if (err?.response?.status === 404) {
      markNoTaxMonth(originalError)
      // The route cannot name a month; the company's month report can still say
      // what the month owes, read-only, so the note is not the whole answer.
      await loadMonthSummary()
      return
    }
    console.error('[EmployeeContributionsPanel] month contributions fetch failed:', err)
    error.value = true
    errorDetail.value = describeFetchFailure(err)
    data.value = null
  }
}

/** The tax-month 404, rendered as the note it is rather than as a failure. */
function markNoTaxMonth(err) {
  noTaxMonth.value = true
  missingItem.value = false
  unconfiguredDetail.value = describeFetchFailure(err)
  data.value = null
}

/**
 * Picks this employee's row out of the company's month report.
 *
 * The uuid is tried first, because an id is the only key that can separate two
 * colleagues who share a name — but the employee summary this reads does **not**
 * send `employee_id`, so in practice the exact name is the path taken. A name
 * held by more than one row is refused rather than guessed: one person's
 * contribution figures under another's heading is the worse mistake, the same
 * rule `buildEmployeeNameIndex` follows for photographs.
 */
function pickMonthSummaryRow(rows, employeeId, employeeName) {
  if (!Array.isArray(rows)) return null
  if (employeeId) {
    const byId = rows.filter((row) => sameId(row.employee_id, employeeId))
    if (byId.length === 1) return byId[0]
    if (byId.length > 1) return null
  }
  const name = String(employeeName || '')
    .trim()
    .toLowerCase()
  if (!name) return null
  const byName = rows.filter(
    (row) =>
      String(row.employee_name || '')
        .trim()
        .toLowerCase() === name,
  )
  return byName.length === 1 ? byName[0] : null
}

/**
 * The fallback that still answers the question: what does this run's month owe?
 *
 * `epi-contributions` cannot be asked without a tax month, but the Contributions
 * page's month report is keyed by company/year/month and knows the figures for
 * every employee. It is display only: the rows carry no contribution ids and no
 * per-row deduction state, so nothing here can be selected or deducted. A failure
 * is quiet — the note above the section already explains the state, and a report
 * that cannot be read must not turn a normal 1–15 cutoff into an error.
 */
async function loadMonthSummary() {
  monthSummary.value = null
  const period = runMonth.value
  // A uuid identifies the row; without one an exact name is the only option, so
  // a payload with neither is not worth the request.
  const identifiable = Boolean(props.employeeId || props.employeeName)
  if (!period || !companyId.value || !identifiable) return
  monthSummaryLoading.value = true
  try {
    const rows = await fetchEmployeeContributions(companyId.value, period.year, period.month)
    monthSummary.value = pickMonthSummaryRow(rows, props.employeeId, props.employeeName)
  } catch (err) {
    console.warn('[EmployeeContributionsPanel] month report fetch failed:', err)
    monthSummary.value = null
  } finally {
    monthSummaryLoading.value = false
  }
}

/**
 * Whether a tax payload brings a month back with it.
 *
 * The route resolves the month from the EPI, so a month-scoped answer is only
 * worth keeping when it actually carries one: the month itself, an applied tax, a
 * `monthly_tax` row with a figure or a bracket, or a settlement marker. An empty
 * `monthly_tax: {}` is what a route that ignores the parameter answers — reading
 * that as a month would draw a card over nothing and hide the note that explains
 * why there is nothing.
 */
function taxPayloadHasMonth(payload) {
  if (!payload) return false
  if (payload.tax_month) return true
  if (payload.has_tax) return true
  const row = payload.monthly_tax
  if (!row || typeof row !== 'object') return false
  if (row.tax_amount != null || row.taxable_income != null) return true
  if (row.details && typeof row.details === 'object' && Object.keys(row.details).length) return true
  return Boolean(row.applied_to || row.applied_cutoff || row.settled_on || row.deducted_from)
}

/**
 * The tax half of the employee's record, read on its own terms: its failure is
 * the section's own, and — unlike the contributions — an item with no tax month
 * still answers, so a reject here is never the unconfigured state the top of the
 * body handles. Never throws.
 *
 * A cutoff that closes a month owns that month, and the endpoint resolves it from
 * the EPI. The first half of a month does not, so it is asked for by name after
 * the documented answer comes back — the same month row the closing cutoff
 * settles, which is what lets the card show on a 1–15 run. The second request is
 * an extra: a route that does not answer it leaves the documented payload, and
 * the note, exactly as before.
 */
async function loadTax() {
  if (!props.epiId) return
  taxError.value = false
  taxErrorDetail.value = ''
  taxLoading.value = true
  taxScopedMonth.value = null
  try {
    const own = await fetchEpiTax(props.epiId)
    taxData.value = own
    if (!own?.tax_month) {
      const period = runMonth.value
      if (period) {
        try {
          const scoped = await fetchEpiTax(props.epiId, period)
          if (taxPayloadHasMonth(scoped)) {
            taxData.value = scoped
            taxScopedMonth.value = period
          }
        } catch (err) {
          // The documented payload above is already a real answer, so a month
          // question the route cannot answer is not the section's failure. A 404
          // is the expected shape of that refusal; anything else is worth a line.
          if (err?.response?.status !== 404) {
            console.warn('[EmployeeContributionsPanel] month tax fetch failed:', err)
          }
        }
      }
    }
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
    const response = await applyTaxRequest([props.epiId], {
      force: false,
      period: taxWritePeriod.value,
    })
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
    const response = await revertTaxRequest([props.epiId], reason, taxWritePeriod.value)
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

/* The month report shown where the real row list cannot be. No box of its own:
   it is evidence rather than a message, and the list and figure grid bring their
   own chrome — only the heading and the closing sentence are its own. */
.contrib-month {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.contrib-month__title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink-2);
}

.contrib-month__note {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--dash-ink-3);
}

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
