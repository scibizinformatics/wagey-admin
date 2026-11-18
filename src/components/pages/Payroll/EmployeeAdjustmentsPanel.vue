<template>
  <q-card-section class="dash-modal__body">
    <!-- Not an empty state, because "not known yet" and "there are none" are
         different statements, and only the first one is true while this request
         is in flight. -->
    <div v-if="loading" class="contrib-state">
      <q-spinner size="22px" />
      <span>Loading adjustments…</span>
    </div>

    <div v-else-if="error" class="contrib-state contrib-state--error">
      <q-icon name="o_error_outline" size="20px" />
      <span>Could not load manual adjustments for this employee.</span>
      <span v-if="errorDetail" class="contrib-error__detail">{{ errorDetail }}</span>
      <q-btn flat dense no-caps label="Try again" class="contrib-retry" @click="load" />
    </div>

    <template v-else>
      <!-- ── Summary ──────────────────────────────────────────────────
           The item's own totals, read from the server rather than re-summed:
           applying or reverting an entry moves `net_pay` and both manual
           figures, and the server owns whether a reverted row still counts. -->
      <div class="contrib-summary">
        <dl class="contrib-summary__figures adj-figures">
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

      <!-- ── Adjustments ──────────────────────────────────────────────
           A list rather than a table: each row is what was added or taken off,
           when, by whom, and one action. Reverted rows stay in it — they are
           why a figure is not on this payslip. -->
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
            @click="showForm = true"
          />
        </div>

        <ul v-if="adjustments.rows.length" class="contrib-list">
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

  <q-card-actions class="dash-modal__foot">
    <span v-if="!loading && !error && adjustments.rows.length" class="dash-modal__foot-note">
      {{ adjustments.rows.length }} entr{{ adjustments.rows.length > 1 ? 'ies' : 'y' }} on record
    </span>
    <q-btn flat no-caps label="Close" class="dash-modal__cancel" @click="$emit('close')" />
  </q-card-actions>

  <!-- Its own dialog rather than an inline form: four fields with their own
       validation and busy state, inside a list that is itself being read. -->
  <AdjustmentFormDialog
    v-model="showForm"
    :employee-name="employeeName"
    :loading="saving"
    @submit="applyAdjustment"
  />
</template>

<script setup>
/**
 * One employee's manual adjustments: money a person decided rather than money
 * the law required — a bonus, a loan repayment, a correction.
 *
 * Kept apart from the statutory contributions on purpose, down to the API
 * service: the two are different payroll components with their own endpoints,
 * their own payloads and their own state. This panel reads only
 * `useEmployeeAdjustments` and `payrollAdjustments`, so a change to
 * contributions cannot reach it, and vice versa.
 *
 * Totals and net pay are the server's. Re-adding the rows here would eventually
 * disagree with the server about whether a reverted entry counts, and that
 * disagreement is a wrong number on a payroll.
 */
import { ref, computed, onMounted } from 'vue'
import AdjustmentFormDialog from 'src/components/pages/Payroll/AdjustmentFormDialog.vue'
import { useEmployeeAdjustments } from 'src/composables/disbursement/useEmployeeAdjustments'
import { formatCurrencyPrecise, formatDateTime } from 'src/composables/utils/format'
import { extractErrorMessage } from 'src/composables/utils/http'
import { normalizeAdjustments, signedAmount } from 'src/composables/utils/payrollAdjustments'
import { useToast } from 'src/composables/useToast'

const toast = useToast()
const {
  fetchEpiAdjustments,
  applyAdjustment: applyAdjustmentRequest,
  revertAdjustment: revertAdjustmentRequest,
} = useEmployeeAdjustments()

const props = defineProps({
  /** Employee payroll item id. */
  epiId: { type: [Number, String], default: null },
  /** Named in the add form so the entry is filed against the right person. */
  employeeName: { type: String, default: '' },
})

// `changed` tells the page its review figures are stale — applying or reverting
// moves the row's net pay.
const emit = defineEmits(['changed', 'close'])

const loading = ref(false)
const error = ref(false)
const errorDetail = ref('')
const data = ref(null)
const showForm = ref(false)
const saving = ref(false)
/** The one adjustment currently being reverted, so only its button spins. */
const revertingId = ref(null)

const adjustments = computed(() => normalizeAdjustments(data.value))
const busy = computed(() => saving.value || revertingId.value !== null)

/** An unreadable figure is a dash; a zero would claim the endpoint said zero. */
function moneyOrDash(value) {
  return value === null || value === undefined ? '—' : formatCurrencyPrecise(value)
}

/**
 * The status and whatever the server said, as one line for the error state —
 * the same reading the contributions panel uses, so a failure is diagnosable
 * rather than a generic sentence.
 */
function describeFetchFailure(err) {
  const status = err?.response?.status
  const detail = extractErrorMessage(err, '')
  const parts = [status ? `HTTP ${status}` : 'No response from the server', detail]
  return parts.filter(Boolean).join(' · ')
}

async function load() {
  if (!props.epiId) {
    error.value = true
    errorDetail.value = 'Missing employee payroll item id.'
    data.value = null
    return
  }
  loading.value = true
  error.value = false
  errorDetail.value = ''
  try {
    data.value = await fetchEpiAdjustments(props.epiId)
  } catch (err) {
    console.error('[EmployeeAdjustmentsPanel] fetch failed:', err)
    error.value = true
    errorDetail.value = describeFetchFailure(err)
    data.value = null
  } finally {
    loading.value = false
  }
}

/**
 * The second line of a success toast: what the entry was for, and what it left.
 *
 * The net-pay clause is dropped rather than faked when the payload carries no
 * figure — a caption reading "Net pay now ₱0.00" would be a worse lie than a
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
 * Records one manual adjustment.
 *
 * Refetched rather than appended to: applying moves `net_pay` and both manual
 * totals, and the server owns whether a row counts as in force.
 */
async function applyAdjustment(body) {
  if (saving.value || !props.epiId) return
  saving.value = true
  // The amount as sent, held here: the form clears itself on close, and the
  // toast must name the figure that was written rather than re-derive it.
  const written = Number(body.amount)
  try {
    await applyAdjustmentRequest({ epi_id: props.epiId, ...body })
    showForm.value = false
    await load()
    emit('changed')
    toast.success(
      `${body.type === 'addition' ? 'Added' : 'Deducted'} ${formatCurrencyPrecise(written)}`,
      { icon: 'check_circle', caption: netPayCaption(body.description), timeout: 3500 },
    )
  } catch (err) {
    console.error('[EmployeeAdjustmentsPanel] applyAdjustment ✖ error:', err)
    toast.error(extractErrorMessage(err, 'Failed to record this adjustment.'), { timeout: 5000 })
  } finally {
    saving.value = false
  }
}

/**
 * Reverts one adjustment.
 *
 * No confirmation, deliberately: an adjustment is a single line this person just
 * recorded, reverting is how it is undone rather than an irreversible act, and
 * the row's new state plus the toast say plainly what happened. The page is
 * told so the review table's figures follow, same as applying.
 */
async function revertAdjustmentRow(row) {
  if (!row?.id || busy.value) return
  revertingId.value = row.id
  try {
    await revertAdjustmentRequest(row.id)
    await load()
    emit('changed')
    // The row's amount, held before the refetch: `row` is the pre-revert state
    // and the refreshed list will have dropped it to the reverted copy.
    toast.success(
      `Reverted ${row.amount === null ? 'the adjustment' : formatCurrencyPrecise(row.amount)}`,
      { icon: 'undo', caption: netPayCaption(row.description), timeout: 3500 },
    )
  } catch (err) {
    console.error('[EmployeeAdjustmentsPanel] revertAdjustment ✖ error:', err)
    toast.error(extractErrorMessage(err, 'Failed to revert this adjustment.'), { timeout: 5000 })
  } finally {
    revertingId.value = null
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
@import './employeeMoneyPanel.scss';

/* The figures stand alone in this tab, so the rule they carry in the
   contributions summary — where they sit under the status line — would read as
   an empty row above them. */
.adj-figures {
  padding-top: 0;
  border-top: none;
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
</style>
