<template>
  <q-dialog v-model="internalShow" persistent>
    <q-card class="dash-modal dash-modal--lg">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <!-- A face when the name resolves to exactly one roster employee who
                 has one, otherwise initials — matching the row this opened from.
                 The payload's own name is preferred over the row's, since the
                 figures below it came from the payload. -->
            <template v-if="avatarOf(name).pictureUrl">
              <img :src="avatarOf(name).pictureUrl" :alt="name" />
            </template>
            <q-icon v-else-if="!loading && !name" name="receipt_long" size="22px" />
            <span v-else>{{ avatarOf(name).initials }}</span>
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Salary breakdown</div>
            <div class="dash-modal__sub">{{ subtitle }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" @click="internalShow = false" />
      </q-card-section>

      <q-card-section v-if="loading" class="dash-modal__body dash-modal__body--row loading-section">
        <q-spinner color="primary" size="24px" />
        <span>Loading...</span>
      </q-card-section>

      <q-card-section v-else-if="error" class="dash-modal__body dash-modal__body--center">
        <q-icon name="o_error" size="28px" class="state-icon state-icon--critical" />
        <p class="dash-modal__group-label">{{ error }}</p>
      </q-card-section>

      <q-card-section v-else class="dash-modal__body">
        <!-- The three figures the funding decision is made on. -->
        <div class="detail-grid-cards">
          <div class="detail-card">
            <div class="detail-card-label">Gross pay</div>
            <div class="detail-card-value">{{ money(bd.gross) }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Deductions</div>
            <div class="detail-card-value amount-red">{{ money(bd.totalDeducted) }}</div>
          </div>
          <div class="detail-card detail-card--net">
            <div class="detail-card-label">Net pay</div>
            <div class="detail-card-value amount-green">{{ money(bd.net) }}</div>
          </div>
        </div>

        <!-- The endpoint returned no money at all. Said plainly rather than
             showing three zeros, which is a different claim entirely. -->
        <div v-if="!bd.hasFigures" class="brk__empty">
          This endpoint returned no salary components for this employee.
          <span v-if="bd.unrecognised.length">
            It did return {{ bd.unrecognised.length }} other
            {{ bd.unrecognised.length === 1 ? 'figure' : 'figures' }}, listed below.
          </span>
        </div>

        <template v-else>
          <!-- The evidence for the earnings below: what each day paid. Placed
               first, because "why this salary" is answered by the days, not by
               the components they add up to. -->
          <div v-if="bd.hasDays">
            <div class="dash-modal__section-title">Daily earnings</div>
            <div class="modal-table-wrap">
              <q-table
                :rows="bd.days"
                :columns="dayColumns"
                row-key="key"
                flat
                dense
                :pagination="{ rowsPerPage: 0 }"
                hide-pagination
                hide-no-data
                class="dash-qtable dash-qtable--compact detail-table"
              >
                <template #body-cell-date="props">
                  <q-td :props="props">
                    <span class="day__date">{{ props.row.date || '—' }}</span>
                    <!-- The day's reason rides under it rather than taking a
                         column of its own: most days have none, and a column
                         empty on every row is worse than an absent one. -->
                    <span v-if="props.row.note" class="day__note">{{ props.row.note }}</span>
                  </q-td>
                </template>

                <template #body-cell-amount="props">
                  <q-td :props="props" class="text-right day__amount dash-num">
                    {{ money(props.row.amount) }}
                  </q-td>
                </template>
              </q-table>
            </div>
            <div v-if="bd.daysTotal !== null" class="brk__subtotal">
              <span class="dash-modal__label">Days total</span>
              <span class="dash-modal__value dash-num">{{ formatCurrency(bd.daysTotal) }}</span>
            </div>

            <!-- The days carry no peso figure, so say what they do carry. Without
                 this the table above just shows em dashes and the only way to
                 learn the endpoint's real shape is devtools — which is exactly
                 the round trip that produced this dialog in the first place. -->
            <div v-if="bd.dayFields.length" class="brk__probe">
              <span class="brk__probe-label">
                No per-day amount was found. These are the fields a day carries:
              </span>
              <span class="brk__extra">
                <span v-for="field in bd.dayFields" :key="field.key" class="brk__extra-item">
                  <span class="brk__extra-label">{{ field.label }}</span>
                  <span class="brk__extra-value dash-num">{{ field.value }}</span>
                </span>
              </span>
            </div>
          </div>

          <div v-if="bd.earnings.length">
            <div class="dash-modal__section-title">Earnings</div>
            <div class="modal-table-wrap">
              <q-table
                :rows="bd.earnings"
                :columns="lineColumns"
                row-key="label"
                flat
                dense
                hide-pagination
                hide-no-data
                class="dash-qtable dash-qtable--compact detail-table"
              />
            </div>
          </div>

          <div v-if="bd.deductions.length">
            <div class="dash-modal__section-title">Deductions</div>
            <div class="modal-table-wrap">
              <q-table
                :rows="bd.deductions"
                :columns="lineColumns"
                row-key="label"
                flat
                dense
                hide-pagination
                hide-no-data
                class="dash-qtable dash-qtable--compact detail-table"
              />
            </div>
          </div>
        </template>

        <!-- Does the arithmetic hold, and does it agree with the figure this row
             was listed at? A payroll a person is about to be paid from should be
             able to say yes to both; when it cannot, that is the answer. -->
        <div v-if="message" :class="['brk__check', `brk__check--${messageTone}`]">
          <q-icon :name="messageTone === 'good' ? 'o_check_circle' : 'o_error'" size="15px" />
          <span>{{ message }}</span>
        </div>

        <!-- TEMPORARY. What the endpoint actually sent, so a wrong guess about
             its field names is visible instead of inferred. Remove once the real
             names are mapped into `salaryBreakdown.js`. -->
        <details class="brk__raw">
          <summary>Raw response</summary>

          <div v-if="bd.debug.shape.length" class="brk__raw-section">
            <div class="dash-modal__section-title">Top-level keys</div>
            <div class="brk__raw-table">
              <span v-for="row in bd.debug.shape" :key="row.key" class="brk__raw-row">
                <span class="brk__raw-key">{{ row.label }}</span>
                <span class="brk__raw-type">{{ row.type }}</span>
                <span class="brk__raw-value">{{ row.value }}</span>
              </span>
            </div>
          </div>

          <div v-if="bd.debug.sampleJson" class="brk__raw-section">
            <div class="dash-modal__section-title">First day row</div>
            <pre class="brk__raw-pre">{{ bd.debug.sampleJson }}</pre>
          </div>
        </details>

        <!-- Everything the normaliser did not claim. Present because the field
             names this reads are unconfirmed aliases: if the breakdown above is
             short, this is where the real keys are. -->
        <div v-if="bd.unrecognised.length">
          <div class="dash-modal__section-title">Other figures returned</div>
          <div class="brk__extra">
            <span v-for="row in bd.unrecognised" :key="row.key" class="brk__extra-item">
              <span class="brk__extra-label">{{ row.label }}</span>
              <span class="brk__extra-value dash-num">{{ formatCurrency(row.amount) }}</span>
            </span>
          </div>
        </div>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn
          flat
          label="Close"
          @click="internalShow = false"
          class="dash-modal__cancel"
          no-caps
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * What one employee was actually paid for this run, and what came off it.
 *
 * The Funding step lists net pay per employee, which is the figure a decision is
 * made on and the one figure that explains nothing. This is the way into how that
 * number was arrived at — the earnings that made it up and the deductions taken
 * off it.
 *
 * It is a sibling of `EmployeeDetailDialog`, not a replacement: that dialog shows
 * the attendance half of the same endpoint (days worked, undertime, the daily
 * rows), which is a different question. Both read
 * `GET /payroll/admin/employee-payroll-item/{epi_id}/` and neither writes.
 *
 * The field names come from `salaryBreakdown.js`, which is where the response
 * shape is handled — including the parts it does not recognise. Fetched on open
 * rather than on mount, because the dialog stays mounted while it is closed and
 * the figures must belong to the row that opened it.
 */
import { ref, computed, watch } from 'vue'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { buildSalaryBreakdown, formatCurrency } from 'src/components/pages/Payroll/salaryBreakdown'
import { extractErrorMessage } from 'src/composables/utils/http'
import { avatarFor } from 'src/composables/utils/employee'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** The employee payroll item id — the row's `epi_id`. */
  employeeId: { type: [Number, String], default: null },
  /** The row's name, shown while the payload is still loading. */
  employeeName: { type: String, default: '' },
  /** The row's own net pay, to reconcile the breakdown against. */
  netPay: { type: [Number, String], default: null },
  // Name → employee record, to put a face in the header; built once per page and
  // shared by every table. A name held by two employees resolves to null, so the
  // avatar draws initials rather than the wrong photo. See `avatarFor`.
  employeeIndex: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue'])

const avatarOf = (n) => avatarFor(props.employeeIndex, n)

const { fetchEmployeePayrollItem } = useDisbursementApi()

const internalShow = ref(false)
const loading = ref(false)
const error = ref('')
const data = ref(null)

const bd = computed(() =>
  buildSalaryBreakdown(data.value, { fallbackNet: props.netPay }),
)

// The row's name stands in until the payload supplies its own, so the header is
// never blank while loading.
const name = computed(() => bd.value.name || props.employeeName)

const subtitle = computed(() => bd.value.position || props.employeeName)

/** `null` prints as an em dash, never as `₱0.00`. */
function money(value) {
  return value === null || value === undefined ? '—' : formatCurrency(value)
}

/**
 * The one sentence that says whether the arithmetic holds.
 *
 * Three answers, and none of them is "looks fine": the parts can fail to add up
 * to the net, or the net can disagree with the figure the table listed this row
 * at, and both are worth saying out loud before somebody funds against them.
 */
const message = computed(() => {
  if (!bd.value.hasFigures) return ''
  const { gross, totalDeducted, net, drift, netMatches } = bd.value

  if (gross === null || totalDeducted === null || net === null) {
    return netMatches === false
      ? 'This item nets a different figure from the one this row was listed at.'
      : ''
  }
  if (Math.abs(drift) >= 0.005) {
    return `These figures do not add up — they are ${formatCurrency(Math.abs(drift))} ${drift > 0 ? 'short of' : 'over'} the net pay shown.`
  }
  if (netMatches === false) {
    return 'These figures add up, but to a different net than the one this row was listed at.'
  }
  return 'Earnings less deductions come to the net pay shown.'
})

const messageTone = computed(() => {
  const { gross, totalDeducted, net, drift, netMatches } = bd.value
  if (gross === null || totalDeducted === null || net === null) {
    return netMatches === false ? 'bad' : 'good'
  }
  if (Math.abs(drift) >= 0.005) return 'bad'
  return netMatches === false ? 'warn' : 'good'
})

const lineColumns = [
  { name: 'label', label: 'Component', field: 'label', align: 'left' },
  {
    name: 'amount',
    label: 'Amount',
    field: 'amount',
    align: 'right',
    format: (v) => formatCurrency(v),
  },
]

const dayColumns = [
  { name: 'date', label: 'Day', field: 'date', align: 'left' },
  { name: 'hours', label: 'Hours', field: 'hours', align: 'left' },
  { name: 'amount', label: 'Amount', field: 'amount', align: 'right' },
]

watch(
  () => props.modelValue,
  async (open) => {
    internalShow.value = open
    if (!open || !props.employeeId) return

    loading.value = true
    error.value = ''
    data.value = null
    try {
      data.value = await fetchEmployeePayrollItem(props.employeeId)
    } catch (err) {
      console.error('[SalaryBreakdownDialog] fetch failed:', err)
      error.value = extractErrorMessage(err, 'Could not load this employee’s salary breakdown.')
    } finally {
      loading.value = false
    }
  },
)

watch(internalShow, (open) => {
  emit('update:modelValue', open)
})
</script>

<style scoped>
.loading-section {
  gap: 10px;
  padding: 40px 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

.state-icon--critical {
  color: var(--dash-critical-mark);
}

/* ── Summary tiles ── */
.detail-grid-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

/* Net is the figure the row was listed at, so it gets the card that reads as
   the answer rather than one of three equals. */
.detail-card--net {
  background: var(--dash-good-bg);
  border-color: var(--dash-good-line);
}

.detail-card {
  padding: 10px 13px;
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  min-width: 0;
}

.detail-card-label {
  margin-bottom: 3px;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  color: var(--dash-ink-3);
}

.detail-card-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--dash-ink);
  font-variant-numeric: tabular-nums;
  word-break: break-word;
}

/* A figure is only toned where it means something is off. Gross pay being
   positive is not good news. */
.amount-green {
  color: var(--dash-good);
}
.amount-red {
  color: var(--dash-critical);
}

/* Header strip, row rhythm and dividers come from `dash-qtable--compact`. */
.modal-table-wrap {
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  overflow: hidden;
  margin-bottom: 4px;
}

/* The days total. Reads as the answer to "did these days add up", so it sits
   against the table's own right edge rather than floating beside its title. */
.brk__subtotal {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 10px;
  padding: 6px 4px 2px;
}
.brk__subtotal .dash-modal__label {
  font-size: 11.5px;
  color: var(--dash-ink-3);
}
.brk__subtotal .dash-modal__value {
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink-2);
}

/* A day with a reason: the reason is smaller and quieter, not a second row of
   type competing with the date. */
.day__date {
  display: block;
  font-weight: 500;
  color: var(--dash-ink);
}
.day__note {
  display: block;
  margin-top: 1px;
  font-size: 11.5px;
  color: var(--dash-ink-4);
}
.day__amount {
  font-weight: 600;
  color: var(--dash-ink-2);
}

/* The probe line under the days table: quiet, but explicitly a diagnosis rather
   than part of the payroll. */
.brk__probe {
  display: block;
  margin-top: 6px;
}
.brk__probe-label {
  display: block;
  font-size: 11.5px;
  color: var(--dash-ink-4);
}

/* TEMPORARY diagnostic — see the `details` block above. */
.brk__raw {
  margin-top: 6px;
}
.brk__raw > summary {
  cursor: pointer;
  font-size: 11.5px;
  color: var(--dash-ink-4);
  user-select: none;
}
.brk__raw > summary:hover {
  color: var(--dash-ink-3);
}
.brk__raw-section {
  margin-top: 8px;
}
.brk__raw-table {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 240px;
  overflow: auto;
  padding: 8px 10px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
}
.brk__raw-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  font-size: 11.5px;
}
.brk__raw-key {
  color: var(--dash-ink-2);
  font-weight: 500;
}
.brk__raw-type {
  color: var(--dash-ink-4);
}
.brk__raw-value {
  color: var(--dash-ink-3);
  font-variant-numeric: tabular-nums;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.brk__raw-pre {
  max-height: 260px;
  overflow: auto;
  margin: 0;
  padding: 8px 10px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--dash-ink-2);
  white-space: pre-wrap;
  word-break: break-word;
}

.brk__empty {
  padding: 20px 0;
  font-size: 13px;
  color: var(--dash-ink-3);
  text-align: center;
}

/* The arithmetic verdict. One line, and it either agrees or it does not. */
.brk__check {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-top: 4px;
  padding: 9px 11px;
  border-radius: var(--dash-r-md);
  font-size: 12.5px;
  line-height: 1.45;
}
.brk__check--good {
  background: var(--dash-good-bg);
  color: var(--dash-good);
}
.brk__check--warn {
  background: var(--dash-warn-bg);
  color: var(--dash-warn);
}
.brk__check--bad {
  background: var(--dash-critical-bg);
  color: var(--dash-critical);
}

/* The figures the normaliser did not claim: a quiet wrap list rather than
   another table, because these are diagnostic, not part of the breakdown. */
.brk__extra {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.brk__extra-item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 4px 9px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-sm);
  background: var(--dash-n-25);
  font-size: 12px;
}
.brk__extra-label {
  color: var(--dash-ink-3);
}
.brk__extra-value {
  font-weight: 600;
  color: var(--dash-ink-2);
}

@media (max-width: 1023px) {
  .detail-grid-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .detail-grid-cards {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>