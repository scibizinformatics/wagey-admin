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

        <div v-else-if="error" class="contrib-state contrib-state--error">
          <q-icon name="o_error_outline" size="20px" />
          <span>Could not load contributions for this employee.</span>
          <q-btn flat dense no-caps label="Try again" class="contrib-retry" @click="load" />
        </div>

        <template v-else-if="data">
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
                <dd class="dash-num">{{ formatCurrency(totalAmount) }}</dd>
              </div>
              <div>
                <dt>Deducted</dt>
                <dd class="dash-num">{{ formatCurrency(deductedAmount) }}</dd>
              </div>
              <div>
                <dt>Pending</dt>
                <dd class="dash-num" :class="{ 'contrib-pending': pendingAmount > 0 }">
                  {{ formatCurrency(pendingAmount) }}
                </dd>
              </div>
            </dl>

            <!-- The manual figures sit on their own line, below a rule, rather
                 than being folded into Total or Deducted: those two mean
                 "required by law", and a reader who cannot tell which is which
                 will either distrust the number or trust it wrongly. -->
            <dl v-if="adjustments.hasAny" class="contrib-summary__figures contrib-summary__figures--manual">
              <div>
                <dt>Manual additions</dt>
                <dd class="dash-num">{{ moneyOrDash(adjustments.manualAdditions) }}</dd>
              </div>
              <div>
                <dt>Manual deductions</dt>
                <dd class="dash-num contrib-pending">{{ moneyOrDash(adjustments.manualDeductions) }}</dd>
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

                <span class="contrib-row__amount dash-num">{{ formatCurrency(row.amount) }}</span>
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
              <q-btn flat dense no-caps label="Retry" class="contrib-retry" @click="loadAdjustments" />
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
                    :class="row.applied ? `adj-mark--${row.typeTone}` : 'contrib-row__reverted-mark'"
                  />
                </span>

                <span class="contrib-row__body">
                  <span class="contrib-row__name">
                    {{ row.description || row.category || row.typeLabel }}
                  </span>
                  <span class="contrib-row__meta">
                    <template v-if="row.applied">
                      {{ row.typeLabel }}<template v-if="row.category"> · {{ row.category }}</template>
                      <template v-if="row.appliedBy"> · {{ row.appliedBy }}</template>
                      <template v-if="row.appliedAt"> · {{ formatDateTime(row.appliedAt) }}</template>
                    </template>
                    <template v-else>
                      Reverted<template v-if="row.revertedBy"> by {{ row.revertedBy }}</template
                      ><template v-if="row.revertedAt"> · {{ formatDateTime(row.revertedAt) }}</template>
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
            {{ selected.length }} selected · {{ formatCurrency(selectedAmount) }}
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
  </q-dialog>
</template>

<script setup>
/**
 * One employee's statutory contributions for a payout run, with manual deduction.
 *
 * Opened from the Contribution column on the Review step. Contributions normally
 * come off automatically; this is the admin's fallback when one did not, so the
 * dialog's job is to make the pending rows obvious and deducting them a single
 * action — not to restate the payslip.
 */
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import StatusPill from 'src/components/common/StatusPill.vue'
import AdjustmentFormDialog from 'src/components/pages/Payroll/AdjustmentFormDialog.vue'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { formatCurrency, formatDateTime } from 'src/composables/utils/format'
import { normalizeAdjustments, signedAmount } from 'src/composables/utils/payrollAdjustments'
import { extractErrorMessage } from 'src/composables/utils/http'
import { avatarFor } from 'src/composables/utils/employee'
import { useToast } from 'src/composables/useToast'

const $q = useQuasar()
const toast = useToast()
const {
  fetchEpiContributions,
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
  // Name → employee record, to put a face in the header; built once per page and
  // shared by every tab. A name held by two employees resolves to null, so the
  // avatar draws initials rather than the wrong photo. See `avatarFor`.
  employeeIndex: { type: Object, default: null },
})

const avatarOf = (name) => avatarFor(props.employeeIndex, name)

// `deducted` tells the parent its review figures are stale — reverting moves the
// same figures, so it reuses the event rather than adding a second one the parent
// would have to handle identically.
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
const showAdjustForm = ref(false)
const applying = ref(false)
/** The one adjustment currently being reverted, so only its button spins. */
const revertingId = ref(null)

const adjustments = computed(() => normalizeAdjustments(adjustmentsData.value))

const busy = computed(() => deducting.value || reverting.value || applying.value || revertingId.value !== null)

/** An unreadable figure is a dash; a zero would claim the endpoint said zero. */
function moneyOrDash(value) {
  return value === null || value === undefined ? '—' : formatCurrency(value)
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

const taxMonthLabel = computed(() => {
  const taxMonth = data.value?.tax_month
  if (!taxMonth?.month || !taxMonth?.year) return ''
  // The API sends a 1-based calendar month, not a JS month index.
  return `${MONTHS[taxMonth.month - 1] || ''} ${taxMonth.year}`.trim()
})

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
  selected.value = []
  try {
    data.value = await fetchEpiContributions(props.pgiId, props.epiId)
  } catch (err) {
    console.error('[EmployeeContributionsDialog] fetch failed:', err)
    error.value = true
    data.value = null
  } finally {
    loading.value = false
  }
  // After the contributions, not beside them: the section renders inside this
  // dialog's body, and an error above should not open a dialog with nothing in it.
  // Awaited, because every write toasts the resulting net pay and reads it from
  // here — fired without awaiting, a contribution change would report the figure
  // that was on screen before the change.
  await loadAdjustments()
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
  if (net !== null && net !== undefined) detail.push(`Net pay now ${formatCurrency(net)}`)
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
  try {
    adjustmentsData.value = await fetchEpiAdjustments(props.epiId)
  } catch (err) {
    console.error('[EmployeeContributionsDialog] adjustments fetch failed:', err)
    adjustmentsError.value = true
    adjustmentsData.value = null
  }
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
      `${body.type === 'addition' ? 'Added' : 'Deducted'} ${formatCurrency(written)}`,
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
      `Reverted ${row.amount === null ? 'the adjustment' : formatCurrency(row.amount)}`,
      { icon: 'undo', caption: netPayCaption(row.description), timeout: 3500 },
    )
  } catch (err) {
    console.error('[EmployeeContributionsDialog] revertAdjustment ✖ error:', err)
    toast.error(extractErrorMessage(err, 'Failed to revert this adjustment.'), { timeout: 5000 })
  } finally {
    revertingId.value = null
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
    toast.success(`Deducted ${formatCurrency(written)}`, {
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
    toast.success(`Reverted ${formatCurrency(written)}`, {
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
      showAdjustForm.value = false
      selected.value = []
      error.value = false
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
</style>
