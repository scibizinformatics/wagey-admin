<template>
  <q-dialog
    :model-value="modelValue"
    :maximized="$q.screen.lt.sm"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="dash-modal dash-modal--md">
      <!-- ── Header ─────────────────────────────────────────────────────────
           The employee is named here rather than in the body: the dialog is
           opened from a table row, and once it covers the table nothing else on
           screen says whose contributions these are. -->
      <q-card-section class="dash-modal__head">
        <span class="dash-modal__head-icon">
          <!-- A face when the name resolves to exactly one roster employee who
               has one, otherwise initials — matching the row this dialog opened
               from. The tile stays an icon only while no name has arrived. -->
          <template v-if="avatarOf(employeeName).pictureUrl">
            <img :src="avatarOf(employeeName).pictureUrl" :alt="employeeName || 'Employee'" />
          </template>
          <q-icon v-else-if="!employeeName" name="o_account_balance" size="19px" />
          <span v-else>{{ avatarOf(employeeName).initials }}</span>
        </span>

        <div class="dash-modal__head-titles">
          <div class="dash-modal__title">{{ employeeName || 'Contributions' }}</div>
          <div class="dash-modal__sub">{{ headerSub }}</div>
        </div>

        <q-btn flat round dense icon="close" @click="close" />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <div v-if="loading" class="contrib-state">
          <q-spinner size="22px" />
          <span>Loading contributions…</span>
        </div>

        <!-- Everything below the spinner renders together rather than as a chain
             of `v-else-if`s. The chain made the two sections mutually exclusive,
             so a contributions failure hid the manual adjustments that had been
             fetched successfully — the request was made, the answer discarded,
             and the dialog said nothing about it. They are independent facts
             about the same employee, and now each is shown or not shown on its
             own evidence. -->
        <template v-else>
          <!-- The run has no tax month configured, so there is nothing to
               calculate. Quieter than the error below it and, deliberately,
               without a retry: pressing "Try again" cannot conjure a tax month
               onto a cutoff, and offering the button would invite a reader to
               keep pressing it. It says what has to happen instead — somebody
               sets the tax month on the backend — rather than reporting a fault
               that did not happen. -->
          <div v-if="noTaxMonth" class="contrib-state contrib-state--unconfigured">
            <p class="contrib-empty__title">No tax month for this cutoff</p>
            <p class="contrib-empty__sub">
              Nothing can be calculated for
              {{ employeeName || 'this employee' }} until a tax month is set for
              {{ cutoffName || 'this period' }}.
            </p>
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

          <template v-if="data">
            <!-- ── Summary ──────────────────────────────────────────────────
               The item's own status leads, because it is what the review table
               shows and what deducting here changes. -->
            <div class="contrib-summary">
              <div class="contrib-summary__status">
                <span class="contrib-summary__label">Contribution status</span>
                <StatusPill :status="data.epi_contribution_status" size="md" />
              </div>

              <dl class="contrib-summary__figures">
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

              <!-- The manual figures sit on their own line, below a rule, rather
                 than being folded into Total or Deducted: those two mean
                 "required by law", and a reader who cannot tell which is which
                 will either distrust the number or trust it wrongly. -->
              <dl
                v-if="adjustments.hasAny"
                class="contrib-summary__figures contrib-summary__figures--manual"
              >
                <div>
                  <dt>Manual additions</dt>
                  <dd class="dash-num">{{ moneyOrDash(adjustments.manualAdditions) }}</dd>
                </div>
                <div>
                  <dt>Manual deductions</dt>
                  <dd class="dash-num contrib-pending">
                    {{ moneyOrDash(adjustments.manualDeductions) }}
                  </dd>
                </div>
                <div>
                  <dt>Net pay</dt>
                  <dd class="dash-num">{{ moneyOrDash(adjustments.netPay) }}</dd>
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
                  <span v-if="contributions.length" class="dash-num"
                    >({{ contributions.length }})</span
                  >
                </p>
                <q-btn
                  v-if="selectable.length > 1"
                  flat
                  dense
                  no-caps
                  size="12px"
                  class="contrib-selectall"
                  :label="selectAllLabel"
                  @click="toggleAllSelectable"
                />
              </div>

              <ul v-if="contributions.length" class="contrib-list">
                <li
                  v-for="row in contributions"
                  :key="row.id"
                  class="contrib-row"
                  :class="{
                    'contrib-row--selected': selected.includes(row.id),
                    'contrib-row--reverting': selected.includes(row.id) && isComplete,
                  }"
                >
                  <!-- A row is selectable when there is an action for it: pending
                     rows can be deducted, and once the item is complete the
                     deducted rows can be reverted. Unselectable deducted rows
                     keep the same slot so names stay on one vertical line. -->
                  <span class="contrib-row__pick">
                    <q-checkbox
                      v-if="isSelectable(row)"
                      :model-value="selected.includes(row.id)"
                      dense
                      size="xs"
                      :disable="busy"
                      @update:model-value="toggle(row.id)"
                    />
                    <q-icon
                      v-else
                      :name="row.deducted ? 'o_check_circle' : 'o_radio_button_unchecked'"
                      size="17px"
                      :class="row.deducted ? 'contrib-row__done' : 'contrib-row__waiting'"
                    />
                  </span>

                  <span class="contrib-row__body">
                    <span class="contrib-row__name">{{ row.name }}</span>
                    <span class="contrib-row__meta">
                      <template v-if="row.deducted">
                        <!-- With the tick replaced by a checkbox on a complete
                           item, this line carries the deducted state alone. -->
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

               Gated on the body's own unconfigured state so a cutoff with no
               tax month never shows it twice: the quiet block up top already
               says what has to happen, and the section would say it again. -->
          <div
            v-if="!noTaxMonth && (taxLoading || taxData || taxError)"
            class="contrib-section contrib-tax"
          >
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

            <!-- The same confinement as the adjustments section below: a failure
                 here never blanks the statutory contributions above it. -->
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
              <p v-else-if="!taxHasMonth" class="contrib-tax__note">
                A tax month has not been set for this cutoff, so nothing can be calculated yet.
              </p>
              <p v-else-if="!taxHas" class="contrib-tax__note">
                No withholding tax has been applied to this payroll item yet.
              </p>
            </div>
          </div>

          <!-- ── Manual adjustments ───────────────────────────────────────
               Kept apart from the contributions above rather than mixed into
               them. They are different kinds of money — what the law requires
               versus what a person decided — with different rules (an adjustment
               is reverted on its own row), and a list that merged them would make
               the totals unreadable. -->
          <div class="contrib-section">
            <div class="contrib-section__head">
              <p class="contrib-section__label">
                Manual adjustments
                <span v-if="adjustments.rows.length" class="dash-num"
                  >({{ adjustments.rows.length }})</span
                >
              </p>
              <q-btn
                flat
                dense
                no-caps
                size="12px"
                icon="o_add"
                label="Add adjustment"
                class="contrib-add"
                :disable="busy"
                @click="showAdjustForm = true"
              />
            </div>

            <!-- Only this section reports its own failure. An adjustments error
                 must not blank the statutory contributions, which are the dialog's
                 actual reason to exist. -->
            <div v-if="adjustmentsError" class="contrib-note">
              <q-icon name="o_error_outline" size="15px" />
              <span>Could not load manual adjustments.</span>
              <q-btn
                flat
                dense
                no-caps
                label="Retry"
                class="contrib-retry"
                @click="loadAdjustments"
              />
            </div>

            <!-- Not an empty state, because "not known yet" and "there are none"
                 are different statements, and only the first one is true while
                 this request is in flight. -->
            <div v-else-if="adjustmentsLoading" class="contrib-note">
              <q-spinner size="15px" />
              <span>Loading manual adjustments…</span>
            </div>

            <ul v-else-if="adjustments.rows.length" class="contrib-list">
              <li
                v-for="row in adjustments.rows"
                :key="row.id"
                class="contrib-row"
                :class="{ 'contrib-row--reverted': !row.applied }"
              >
                <span class="contrib-row__pick">
                  <q-icon
                    :name="row.applied ? row.typeIcon : 'o_undo'"
                    size="17px"
                    :class="
                      row.applied ? `adj-mark--${row.typeTone}` : 'contrib-row__reverted-mark'
                    "
                  />
                </span>

                <span class="contrib-row__body">
                  <span class="contrib-row__name">
                    {{ row.description || row.category || row.typeLabel }}
                  </span>
                  <span class="contrib-row__meta">
                    <template v-if="row.applied">
                      {{ row.typeLabel
                      }}<template v-if="row.category"> · {{ row.category }}</template>
                      <template v-if="row.appliedBy"> · {{ row.appliedBy }}</template>
                      <template v-if="row.appliedAt">
                        · {{ formatDateTime(row.appliedAt) }}</template
                      >
                    </template>
                    <template v-else>
                      Reverted<template v-if="row.revertedBy"> by {{ row.revertedBy }}</template
                      ><template v-if="row.revertedAt">
                        · {{ formatDateTime(row.revertedAt) }}</template
                      >
                    </template>
                  </span>
                </span>

                <span class="contrib-row__amount dash-num">
                  {{ signedAmount(row) }}
                  <q-btn
                    v-if="row.applied"
                    flat
                    round
                    dense
                    size="10px"
                    icon="o_undo"
                    class="adj-revert"
                    :disable="busy || revertingId === row.id"
                    :aria-label="`Revert ${row.description || row.typeLabel}`"
                    @click="revertAdjustmentRow(row)"
                  >
                    <q-tooltip>Revert this adjustment</q-tooltip>
                  </q-btn>
                </span>
              </li>
            </ul>

            <div v-else class="contrib-empty">
              <span class="dash-featured-icon">
                <q-icon name="o_tune" size="18px" />
              </span>
              <p class="contrib-empty__title">No manual adjustments</p>
              <p class="contrib-empty__sub">
                Nothing has been added to or taken off this payslip by hand.
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
        <q-btn flat no-caps label="Close" class="dash-modal__cancel" @click="close" />
        <!-- A complete item has nothing left to deduct, so the same slot turns
             into the way back out: revert everything, or only the rows picked. -->
        <q-btn
          v-if="isComplete"
          unelevated
          no-caps
          icon="o_undo"
          :label="selected.length ? `Revert ${selected.length}` : 'Revert all'"
          class="contrib-revert"
          :loading="reverting"
          :disable="busy"
          @click="confirmRevert"
        >
          <q-tooltip>
            {{
              selected.length
                ? 'Put the selected contributions back to pending'
                : 'Put every deducted contribution back to pending'
            }}
          </q-tooltip>
        </q-btn>
        <q-btn
          v-else-if="pending.length"
          unelevated
          no-caps
          icon="o_playlist_add_check"
          :label="selected.length ? `Deduct ${selected.length}` : 'Deduct'"
          class="dash-modal__submit"
          :loading="deducting"
          :disable="!selected.length || busy"
          @click="deduct"
        >
          <q-tooltip v-if="!selected.length">Select a contribution to deduct</q-tooltip>
        </q-btn>
      </q-card-actions>
    </q-card>

    <!-- Its own dialog rather than an inline form: four fields with their own
         validation and busy state, inside a list that is itself being selected
         from. -->
    <AdjustmentFormDialog
      v-model="showAdjustForm"
      :employee-name="employeeName"
      :loading="applying"
      @submit="applyAdjustment"
    />

    <!-- The reason gate for reverting the tax. Bespoke (not the shared
         `ConfirmDialog`) because the decision needs an input, and the shared
         confirm contract is deliberately slotless; the write lives in the
         parent's `commitRevertTax`, reachable only from `@confirm`. -->
    <TaxRevertDialog
      v-model="showTaxRevert"
      :employee="employeeName"
      :amount="taxAmount"
      :loading="taxReverting"
      @confirm="commitRevertTax"
    />
  </q-dialog>
</template>

<script setup>
/**
 * One employee's money for a run that a person can fix by hand: the statutory
 * contributions, the withholding tax and the manual adjustments.
 *
 * Opened from the Contribution column on the Review step. Contributions and tax
 * normally come off automatically; the dialog is the admin's fallback for what
 * did not, so its job is to make the pending rows obvious and the deduction a
 * single action — not to restate the payslip. The tax half is applied or
 * reverted as a whole and carries its own bracket, so it gets its own section
 * and its own reason dialog rather than a row in the contribution list.
 */
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import StatusPill from 'src/components/common/StatusPill.vue'
import AdjustmentFormDialog from 'src/components/pages/Payroll/AdjustmentFormDialog.vue'
import TaxRevertDialog from 'src/components/pages/Payroll/TaxRevertDialog.vue'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { formatCurrencyPrecise, formatDateTime } from 'src/composables/utils/format'
import { normalizeAdjustments, signedAmount } from 'src/composables/utils/payrollAdjustments'
import { extractErrorMessage } from 'src/composables/utils/http'
import { avatarFor } from 'src/composables/utils/employee'
import { useToast } from 'src/composables/useToast'

const $q = useQuasar()
const toast = useToast()
const {
  fetchEpiContributions,
  fetchEpiTax,
  applyTax: applyTaxRequest,
  revertTax: revertTaxRequest,
  deductContributions,
  revertContributions,
  fetchEpiAdjustments,
  applyAdjustment: applyAdjustmentRequest,
  revertAdjustment: revertAdjustmentRequest,
} = useDisbursementApi()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
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
   *
   * Only used when the contributions request has nothing to show. Once they load,
   * the header names the cutoff from the endpoint's own `cutoff` object, which is
   * the authority on it.
   */
  cutoffName: { type: String, default: '' },
  // Name → employee record, to put a face in the header; built once per page and
  // shared by every tab. A name held by two employees resolves to null, so the
  // avatar draws initials rather than the wrong photo. See `avatarFor`.
  employeeIndex: { type: Object, default: null },
})

const avatarOf = (name) => avatarFor(props.employeeIndex, name)

// `deducted` tells the parent its review figures are stale — and a tax apply or
// revert moves the same net pay those figures sit in. It reuses the event rather
// than adding a second one the parent would have to handle identically.
const emit = defineEmits(['update:modelValue', 'deducted'])

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

const COMPLETE_STATUSES = ['complete', 'completed']

const loading = ref(false)
const error = ref(false)
/**
 * What the server actually said, kept for the dialog to show.
 *
 * A dialog that reads only "Could not load contributions" is undiagnosable: the
 * status and the server's own sentence are what separate a missing route from a
 * permission refusal from a crash, and they are all indistinguishable from the
 * outside. `Try again` cannot help with any of them, so it needs the evidence
 * beside it. Empty when the response carried nothing worth quoting — an HTML
 * error page, or no response at all.
 */
const errorDetail = ref('')
/**
 * The run has nothing to calculate: the backend answered 404 because this cutoff
 * has no tax month set, so there is no period to credit contributions against.
 *
 * A configuration state, not a failure — so it gets its own quiet block rather
 * than the red error and a "Try again" that could never succeed. What the reader
 * is told is what has to happen next (a tax month gets set on the backend), not
 * what went wrong, because nothing went wrong.
 *
 * Every 404 from the endpoint lands here, which is deliberate: the other 404s it
 * can answer — an employee payroll item that is not in this payout group — mean
 * the same thing to this screen, that there is nothing configured here to show.
 * Reading the server's message to tell them apart would mean a third hand-rolled
 * `data.detail || ...` chain for no gain a reader could act on.
 */
const noTaxMonth = ref(false)
const deducting = ref(false)
const reverting = ref(false)
const data = ref(null)
const selected = ref([])

/**
 * Manual adjustments, loaded beside the contributions but held apart from them.
 *
 * Separate state and a separate failure: the statutory contributions are the
 * dialog's reason to exist, so an adjustments error must not blank them, and the
 * two totals are different things that must not be summed into one number here.
 */
const adjustmentsData = ref(null)
const adjustmentsError = ref(false)
/**
 * The adjustments request has its own in-flight flag because it now has its own
 * place on screen. It used to ride on `loading`, which is cleared before this
 * request starts — so the section briefly rendered its empty state ("No manual
 * adjustments") and then filled in, claiming for a moment that an employee had
 * none when the truth was simply not known yet.
 */
const adjustmentsLoading = ref(false)
const showAdjustForm = ref(false)
const applying = ref(false)
/** The one adjustment currently being reverted, so only its button spins. */
const revertingId = ref(null)

/**
 * Withholding tax, on the same terms: its own state, its own failure and its
 * own writes. Tax is applied or reverted as a whole against the item — there is
 * no per-row selection to share with the contributions — so it keeps its own
 * refs rather than borrowing the contributions'.
 */
const taxData = ref(null)
const taxError = ref(false)
const taxErrorDetail = ref('')
const taxLoading = ref(false)
const taxApplying = ref(false)
const taxReverting = ref(false)
const showTaxRevert = ref(false)

const adjustments = computed(() => normalizeAdjustments(adjustmentsData.value))

const busy = computed(
  () =>
    deducting.value ||
    reverting.value ||
    applying.value ||
    revertingId.value !== null ||
    taxApplying.value ||
    taxReverting.value,
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
 * Reverting is offered only on a complete item, matching the backend's model of
 * the action: it undoes a settled contribution status, not a half-finished one.
 * The status string is the authority rather than the row flags, since the server
 * can hold an item short of complete for reasons the rows do not show.
 */
const isComplete = computed(() => {
  const status = String(data.value?.epi_contribution_status || '')
    .trim()
    .toLowerCase()
  return COMPLETE_STATUSES.includes(status) && deductedRows.value.length > 0
})

/**
 * A row is selectable only when the mode's action applies to it: reverting acts
 * on deducted rows, deducting on pending ones. Keeping these disjoint is what
 * stops the footer count from including rows the request would drop.
 */
function isSelectable(row) {
  return isComplete.value ? Boolean(row.deducted) : !row.deducted
}

const selectable = computed(() => contributions.value.filter((row) => isSelectable(row)))

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
const selectedAmount = computed(() =>
  contributions.value
    .filter((row) => selected.value.includes(row.id))
    .reduce((sum, row) => sum + amount(row.amount), 0),
)

const allSelectableSelected = computed(
  () =>
    selectable.value.length > 0 && selectable.value.every((row) => selected.value.includes(row.id)),
)

const selectAllLabel = computed(() => {
  if (allSelectableSelected.value) return 'Clear selection'
  return isComplete.value
    ? `Select all ${selectable.value.length}`
    : `Select all ${selectable.value.length} pending`
})

/**
 * The tax month a payload carries, as "May 2026".
 *
 * The API sends a 1-based calendar month, not a JS month index. One helper for
 * both readers: the contributions payload's month names the run in the header,
 * and the tax payload's may be the same cutoff's own tax month read second.
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
const taxAmount = computed(() => taxData.value?.tax?.total ?? taxData.value?.monthly_tax?.tax_amount ?? null)

/**
 * The income the tax was computed from. The applied state names it
 * `monthly_gross_for_tax` on the `tax` object; the monthly row answers the same
 * figure as `taxable_income`, and either name is the evidence behind the total.
 */
const taxTaxableIncome = computed(
  () => taxData.value?.tax?.monthly_gross_for_tax ?? taxData.value?.monthly_tax?.taxable_income ?? null,
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

/**
 * The cutoff names the run; the tax month names the period the contribution is
 * credited to. They differ often enough — a July cutoff settling June's
 * contributions — that showing only one would mislead.
 */
const headerSub = computed(() => {
  if (!data.value) return 'Statutory contributions'
  const parts = []
  if (data.value.cutoff?.name) parts.push(data.value.cutoff.name)
  if (taxMonthLabel.value) parts.push(`Tax month ${taxMonthLabel.value}`)
  return parts.join(' · ') || 'Statutory contributions'
})

function close() {
  emit('update:modelValue', false)
}

function toggle(id) {
  const index = selected.value.indexOf(id)
  if (index === -1) selected.value.push(id)
  else selected.value.splice(index, 1)
}

function toggleAllSelectable() {
  selected.value = allSelectableSelected.value ? [] : selectable.value.map((row) => row.id)
}

async function load() {
  if (!props.pgiId || !props.epiId) return
  loading.value = true
  error.value = false
  errorDetail.value = ''
  noTaxMonth.value = false
  selected.value = []
  try {
    data.value = await fetchEpiContributions(props.pgiId, props.epiId)
  } catch (err) {
    console.error('[EmployeeContributionsDialog] fetch failed:', err)
    if (err?.response?.status === 404) {
      // Nothing is wrong, so nothing is reported as wrong. The endpoint's own
      // console line is silenced by `expectedStatuses` on the request; this
      // catch is where the answer becomes a screen state.
      noTaxMonth.value = true
    } else {
      error.value = true
      errorDetail.value = describeFetchFailure(err)
    }
    data.value = null
  } finally {
    loading.value = false
  }
  // After the contributions, not beside them: the section renders inside this
  // dialog's body, and an error above should not open a dialog with nothing in it.
  // Awaited, because every write toasts the resulting net pay and reads it from
  // here — fired without awaiting, a contribution change would report the figure
  // that was on screen before the change.
  await Promise.all([loadAdjustments(), loadTax()])
}

/**
 * The second line of a success toast: what the entry was for, and what it left.
 *
 * The net-pay clause is dropped rather than faked when the adjustments request
 * failed — a caption reading "Net pay now ₱0.00" would be a worse lie than a
 * caption that simply omits it.
 *
 * @param {...string} parts the entry's own description(s)
 * @returns {string} the caption, or '' when there is nothing to say
 */
function netPayCaption(...parts) {
  const detail = parts.filter((part) => !!part)
  const net = adjustments.value.netPay
  if (net !== null && net !== undefined) detail.push(`Net pay now ${formatCurrencyPrecise(net)}`)
  return detail.join(' · ')
}

/**
 * Adjustments on their own, with their own failure.
 *
 * Never throws. A worker reading this dialog to find a pending contribution must
 * still find it when the adjustments endpoint is down, and the section can say
 * so on its own.
 */
async function loadAdjustments() {
  if (!props.epiId) return
  adjustmentsError.value = false
  adjustmentsLoading.value = true
  try {
    adjustmentsData.value = await fetchEpiAdjustments(props.epiId)
  } catch (err) {
    console.error('[EmployeeContributionsDialog] adjustments fetch failed:', err)
    adjustmentsError.value = true
    adjustmentsData.value = null
  } finally {
    adjustmentsLoading.value = false
  }
}

/**
 * The tax half of the employee's record, read on the same terms as the
 * adjustments above: its failure is the section's own, the endpoints it can
 * refuse to name `expectedStatuses:[404]` already silences, and — unlike the
 * contributions — an item with no tax month still answers, so a reject here is
 * never the unconfigured state the top of the body handles.
 */
async function loadTax() {
  if (!props.epiId) return
  taxError.value = false
  taxErrorDetail.value = ''
  taxLoading.value = true
  try {
    taxData.value = await fetchEpiTax(props.epiId)
  } catch (err) {
    console.error('[EmployeeContributionsDialog] tax fetch failed:', err)
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
 * chain here for the same reason as everywhere else, with an empty fallback: an
 * HTML error page, a proxy gateway page, or a request that never reached the
 * server all resolve to nothing quotable, and `''` is the honest result. The
 * status is prepended because it survives those cases and still says whose
 * problem this is.
 */
function describeFetchFailure(err) {
  const status = err?.response?.status
  const detail = extractErrorMessage(err, '')
  const parts = [status ? `HTTP ${status}` : 'No response from the server', detail]
  return parts.filter(Boolean).join(' · ')
}

/**
 * Records one manual adjustment.
 *
 * Refetched rather than appended to: applying moves `net_pay` and both manual
 * totals, and the server owns whether a row counts as in force.
 */
async function applyAdjustment(body) {
  if (applying.value || !props.epiId) return
  applying.value = true
  // The amount as sent, held here: the form clears itself on close, and the
  // toast must name the figure that was written rather than re-derive it.
  const written = Number(body.amount)
  try {
    await applyAdjustmentRequest({ epi_id: props.epiId, ...body })
    showAdjustForm.value = false
    await loadAdjustments()
    emit('deducted')
    toast.success(
      `${body.type === 'addition' ? 'Added' : 'Deducted'} ${formatCurrencyPrecise(written)}`,
      { icon: 'check_circle', caption: netPayCaption(body.description), timeout: 3500 },
    )
  } catch (err) {
    console.error('[EmployeeContributionsDialog] applyAdjustment ✖ error:', err)
    toast.error(extractErrorMessage(err, 'Failed to record this adjustment.'), { timeout: 5000 })
  } finally {
    applying.value = false
  }
}

/**
 * Reverts one adjustment.
 *
 * No confirmation, deliberately: an adjustment is a single line this person just
 * recorded, reverting is how it is undone rather than an irreversible act, and
 * the row's new state plus the toast say plainly what happened. The parent is
 * refetched so the review table's figures follow, same as deducting.
 */
async function revertAdjustmentRow(row) {
  if (!row?.id || busy.value) return
  revertingId.value = row.id
  try {
    await revertAdjustmentRequest(row.id)
    await loadAdjustments()
    emit('deducted')
    // The row's amount, held before the refetch: `row` is the pre-revert state
    // and the refreshed list will have dropped it to the reverted copy.
    toast.success(
      `Reverted ${row.amount === null ? 'the adjustment' : formatCurrencyPrecise(row.amount)}`,
      { icon: 'undo', caption: netPayCaption(row.description), timeout: 3500 },
    )
  } catch (err) {
    console.error('[EmployeeContributionsDialog] revertAdjustment ✖ error:', err)
    toast.error(extractErrorMessage(err, 'Failed to revert this adjustment.'), { timeout: 5000 })
  } finally {
    revertingId.value = null
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
 * and every state this dialog can reach is one the plain apply is allowed to
 * settle. The refetches are awaited (tax for the status line, adjustments for
 * the net pay the toast quotes) before the toast is raised.
 */
async function applyWithholdingTax() {
  if (!props.epiId || busy.value) return
  taxApplying.value = true
  try {
    const response = await applyTaxRequest([props.epiId], { force: false })
    await Promise.all([loadTax(), loadAdjustments()])
    emit('deducted')
    reportTaxApply(response)
  } catch (err) {
    console.error('[EmployeeContributionsDialog] apply tax ✖ error:', err)
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
    const amount = applied.first?.applied_tax?.tax_amount ?? null
    const bracket = String(applied.first?.applied_tax?.details?.bracket || '').trim()
    toast.success(
      `Applied withholding tax${amount == null ? '' : ` ${formatCurrencyPrecise(amount)}`}`,
      { icon: 'check_circle', caption: netPayCaption(bracket), timeout: 3500 },
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
 * Opens the revert gate. It is the dialog's only exit from a settled tax, so it
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
    await Promise.all([loadTax(), loadAdjustments()])
    emit('deducted')
    reportTaxRevert(response, written, reason)
  } catch (err) {
    console.error('[EmployeeContributionsDialog] revert tax ✖ error:', err)
    toast.error(extractErrorMessage(err, 'Failed to revert withholding tax.'), { timeout: 5000 })
  } finally {
    taxReverting.value = false
  }
}

/** The revert outcome, as toasts — one per kind of result, as for applying. */
function reportTaxRevert(response, written, reason) {
  const { reverted, skipped, failed } = taxOutcomeGroups(response)

  if (reverted.count > 0) {
    const amount = reverted.first?.reverted_tax?.tax_amount ?? written
    toast.success(
      `Reverted withholding tax${amount == null ? '' : ` ${formatCurrencyPrecise(amount)}`}`,
      { icon: 'undo', caption: netPayCaption(reason), timeout: 3500 },
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

async function deduct() {
  if (!selected.value.length || busy.value) return
  const count = selected.value.length
  // Held before the refetch, which clears `selected` — read afterwards it would
  // be 0, and the toast would claim nothing was deducted.
  const written = selectedAmount.value
  deducting.value = true
  try {
    await deductContributions(props.epiId, [...selected.value])
    // Refetched rather than patched locally: deducting sets `deducted_from` and
    // can move the item's overall status, neither of which is knowable here.
    await load()
    emit('deducted')
    toast.success(`Deducted ${formatCurrencyPrecise(written)}`, {
      icon: 'check_circle',
      caption: netPayCaption(`${count} contribution${count > 1 ? 's' : ''}`),
      timeout: 3500,
    })
  } catch (err) {
    console.error('[EmployeeContributionsDialog] deduct ✖ error:', err)
    toast.error('Failed to deduct contributions.', { icon: 'error', timeout: 3000 })
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
  const rows = selected.value.length
    ? deductedRows.value.filter((row) => selected.value.includes(row.id))
    : deductedRows.value
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
  const count = ids.length
  // As with deducting: `load()` below empties the list these rows came from.
  const written = rows.reduce((sum, row) => sum + amount(row.amount), 0)
  reverting.value = true
  try {
    await revertContributions(props.epiId, ids)
    // Refetched for the same reason as deducting: the server owns both
    // `deducted_from` and the item's overall contribution status.
    await load()
    emit('deducted')
    toast.success(`Reverted ${formatCurrencyPrecise(written)}`, {
      icon: 'undo',
      caption: netPayCaption(`${count} contribution${count > 1 ? 's' : ''}`),
      timeout: 3500,
    })
  } catch (err) {
    console.error('[EmployeeContributionsDialog] revert error:', err)
    toast.error('Failed to revert contributions.', { icon: 'error', timeout: 3000 })
  } finally {
    reverting.value = false
  }
}

// Fetch on open. Data is dropped on close so reopening a different row never
// shows the previous employee's contributions while the request is in flight.
watch(
  () => props.modelValue,
  (open) => {
    if (open) load()
    else {
      data.value = null
      adjustmentsData.value = null
      adjustmentsError.value = false
      adjustmentsLoading.value = false
      showAdjustForm.value = false
      selected.value = []
      error.value = false
      errorDetail.value = ''
      noTaxMonth.value = false
      taxData.value = null
      taxError.value = false
      taxErrorDetail.value = ''
      taxLoading.value = false
      showTaxRevert.value = false
    }
  },
)
</script>

<style scoped>
.contrib-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 34px 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

.contrib-state--error {
  color: var(--dash-critical);
  /* Only the error state needs it: the detail below is given a full-width basis
     so it drops to its own line, and wrapping is what lets that happen. */
  flex-wrap: wrap;
}

/* The status and the server's words, under the message they belong to. Its own
   line and a quieter ink rather than more of the same red: the message above is
   the reader-facing part, this is the evidence they would otherwise have to open
   devtools to get. A long sentence from the server wraps instead of being
   truncated — it is the only copy of what went wrong anywhere on screen. */
.contrib-error__detail {
  flex-basis: 100%;
  text-align: center;
  font-size: 12px;
  line-height: 1.45;
  color: var(--dash-ink-4);
  overflow-wrap: anywhere;
}

.contrib-retry {
  color: var(--dash-accent);
  font-weight: 600;
}

/* ── Summary ───────────────────────────────────────────────────────────────── */
.contrib-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 13px 14px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-sunken);
}

.contrib-summary__status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.contrib-summary__label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--dash-ink-4);
}

.contrib-summary__figures {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 0;
  padding-top: 11px;
  border-top: 1px solid var(--dash-line-soft);
}

.contrib-summary__figures dt {
  font-size: 11.5px;
  color: var(--dash-ink-4);
}

.contrib-summary__figures dd {
  margin: 2px 0 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--dash-ink);
}

/* Pending money is the reason to open this dialog, so it is the one figure that
   changes colour when it is non-zero. */
.contrib-pending {
  color: var(--dash-warn);
}

/* ── List ──────────────────────────────────────────────────────────────────── */
.contrib-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}
.contrib-section__label {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--dash-ink-4);
}

.contrib-selectall {
  color: var(--dash-accent);
  font-weight: 600;
}

.contrib-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  overflow: hidden;
}

.contrib-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--dash-line-soft);
  transition: background 0.12s ease;
}

.contrib-row:last-child {
  border-bottom: none;
}

.contrib-row--selected {
  background: var(--dash-accent-bg);
}

/* A selected row about to be reverted reads as a warning, not as progress. */
.contrib-row--reverting {
  background: var(--dash-warn-bg);
}

.contrib-row__pick {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
}

.contrib-row__done {
  color: var(--dash-good-mark);
}

.contrib-row__waiting {
  color: var(--dash-ink-4);
}

.contrib-row__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.contrib-row__name {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  line-height: 1.35;
}

.contrib-row__meta {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11.5px;
  color: var(--dash-ink-4);
}

.contrib-row__meta-tick {
  color: var(--dash-good-mark);
}

.contrib-row__amount {
  flex: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
}

/* The manual figures read as a second block under the statutory ones, so nobody
   scans them as part of the same total. */
.contrib-summary__figures--manual {
  margin-top: 2px;
  padding-top: 11px;
}

.contrib-section + .contrib-section {
  margin-top: 18px;
}

.contrib-add {
  color: var(--dash-accent);
  font-weight: 600;
}

/* A failure confined to the adjustments section. It never replaces the
   contributions above it. */
.contrib-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--dash-critical-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-critical-bg);
  font-size: 12.5px;
  color: var(--dash-critical);
}

/* A reverted adjustment stays in the list — it is why a figure is not on this
   payslip — but it is greyed, and its sign is dropped so it reads as spent rather
   than as money still moving. */
.contrib-row--reverted {
  background: var(--dash-n-25);
}
.contrib-row--reverted .contrib-row__name,
.contrib-row--reverted .contrib-row__amount {
  color: var(--dash-ink-4);
  text-decoration: line-through;
  text-decoration-color: var(--dash-n-300);
}
.contrib-row__reverted-mark {
  color: var(--dash-ink-4);
}

.adj-mark--good {
  color: var(--dash-good-mark);
}
.adj-mark--danger {
  color: var(--dash-critical-mark);
}

.adj-revert {
  margin-left: 4px;
  color: var(--dash-ink-4);
}
.adj-revert:hover {
  color: var(--dash-warn);
  background: var(--dash-warn-bg);
}
.adj-revert:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--dash-surface),
    0 0 0 4px var(--dash-accent-ring);
}

.contrib-empty {
  padding: 26px 0;
  text-align: center;
}

.contrib-empty__title {
  margin: 10px 0 2px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--dash-ink-2);
}

.contrib-empty__sub {
  margin: 0;
  font-size: 12.5px;
  color: var(--dash-ink-4);
}

/* The "no tax month" state, in the same words as the other empty states in this
   dialog but centred in the body's own space rather than boxed into a section.

   A column, because `.contrib-state` is a row and these two lines have to stack
   to read as a sentence and its explanation. The title's own `10px` top margin
   is dropped here — the gap below already separates it from the body's edge, and
   together they opened a hole above the text. */
.contrib-state--unconfigured {
  flex-direction: column;
  gap: 3px;
  padding: 26px 24px;
  text-align: center;
}

.contrib-state--unconfigured .contrib-empty__title {
  margin: 0;
  color: var(--dash-ink-2);
}

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
</style>
