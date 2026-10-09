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
        <!-- The money, and what it is made of. Leads because "why this salary"
             is answered by the days and their figures, not by the total. -->
        <div v-if="bd.hasFigures" class="detail-grid-cards">
          <div class="detail-card">
            <div class="detail-card-label">Gross pay</div>
            <div class="detail-card-value">{{ money(bd.totals.gross) }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Overtime</div>
            <div class="detail-card-value amount-green">{{ money(bd.totals.ot) }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Night differential</div>
            <div class="detail-card-value amount-green">{{ money(bd.totals.nd) }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Undertime</div>
            <div class="detail-card-value amount-red">{{ money(bd.totals.undertime) }}</div>
          </div>
          <div class="detail-card detail-card--net">
            <div class="detail-card-label">Net pay</div>
            <div class="detail-card-value amount-green">{{ money(bd.net) }}</div>
          </div>
        </div>

        <!-- The endpoint returned no per-day earnings. Said plainly rather than
             showing a column of em dashes, which is a different claim. -->
        <div v-if="!bd.hasFigures" class="brk__empty">
          This employee has no daily earnings recorded for this run.
        </div>

        <template v-else>
          <div v-if="bd.hasDays">
            <div class="dash-modal__section-title">Daily earnings</div>
            <div class="modal-table-wrap">
              <q-table
                :rows="bd.daily"
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
                  </q-td>
                </template>
              </q-table>
            </div>
            <!-- The days' own sum, against the net the row was listed at. -->
            <div class="brk__subtotal">
              <span class="dash-modal__label">Days total</span>
              <span class="dash-modal__value dash-num">{{ money(bd.totals.net) }}</span>
            </div>
          </div>

          <!-- The attendance half, which the same response carries. Secondary
               because it is context for the figures above, not an explanation of
               them; the per-day attendance table lives in EmployeeDetailDialog,
               so drawing it here too would make the two siblings the same
               dialog. -->
          <template v-if="bd.summary">
            <div class="dash-modal__section-title">Attendance summary</div>
            <div class="detail-grid-cards">
              <div class="detail-card">
                <div class="detail-card-label">Days worked</div>
                <div class="detail-card-value">{{ bd.summary.days_worked ?? 0 }}</div>
              </div>
              <div class="detail-card">
                <div class="detail-card-label">Absent days</div>
                <div class="detail-card-value amount-red">
                  {{ bd.summary.absent_days ?? 0 }}
                </div>
              </div>
              <div class="detail-card">
                <div class="detail-card-label">Undertime</div>
                <div class="detail-card-value amount-amber">
                  {{ bd.summary.total_undertime || '0h 0m' }}
                </div>
              </div>
              <div class="detail-card">
                <div class="detail-card-label">Late</div>
                <div class="detail-card-value">{{ bd.summary.late ?? 0 }}</div>
              </div>
              <div class="detail-card">
                <div class="detail-card-label">Overtime</div>
                <div class="detail-card-value amount-green">
                  {{ bd.summary.total_overtime || '0h 0m' }}
                </div>
              </div>
              <div class="detail-card">
                <div class="detail-card-label">Leaves</div>
                <div class="detail-card-value">{{ bd.summary.leaves?.length ?? 0 }}</div>
              </div>
            </div>
          </template>

          <template v-if="bd.issues.length">
            <div class="dash-modal__section-title">Issues</div>
            <div class="modal-table-wrap">
              <q-table
                :rows="bd.issues"
                :columns="issueColumns"
                row-key="index"
                flat
                dense
                hide-pagination
                hide-no-data
                class="dash-qtable dash-qtable--compact detail-table"
              />
            </div>
          </template>
        </template>

        <!-- Do the days come to the figure this row was listed at? A payroll a
             person is about to be paid from should be able to say yes; when it
             cannot, that is the answer. -->
        <div v-if="message" :class="['brk__check', `brk__check--${messageTone}`]">
          <q-icon :name="messageTone === 'good' ? 'o_check_circle' : 'o_warning'" size="15px" />
          <span>{{ message }}</span>
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
 * What one employee was actually paid for this run, day by day.
 *
 * The Funding step lists net pay per employee, which is the figure a decision is
 * made on and the one figure that explains nothing. This is the way into how that
 * number was arrived at — the hours, rates and money each day contributed.
 *
 * Reads `GET /payroll/admin/employee-payroll-item/{epi_id}/earnings/`, which
 * carries the per-day earnings alongside the attendance summary and issues. It is
 * a sibling of `EmployeeDetailDialog`, not a replacement: that dialog is where the
 * per-day *attendance* table lives, and neither writes.
 *
 * The field names come from `salaryBreakdown.js`, which is where the response
 * shape is handled. Fetched on open rather than on mount, because the dialog stays
 * mounted while it is closed and the figures must belong to the row that opened it.
 */
import { ref, computed, watch } from 'vue'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { buildSalaryBreakdown, formatCurrency } from 'src/components/pages/Payroll/salaryBreakdown'
import { decimalHoursLabel } from 'src/composables/utils/format'
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

const { fetchEmployeePayrollItemEarnings } = useDisbursementApi()

const internalShow = ref(false)
const loading = ref(false)
const error = ref('')
const data = ref(null)

const bd = computed(() => buildSalaryBreakdown(data.value, { fallbackNet: props.netPay }))

// The row's name stands in until the payload supplies its own, so the header is
// never blank while loading.
const name = computed(() => bd.value.name || props.employeeName)

// The period this run settles, then the employee's position if the endpoint
// carries one. Neither is on every response, so the row's own name is the floor —
// the header is never blank, and never reads name-over-name when a cutoff is
// available.
const subtitle = computed(() => bd.value.cutoff || bd.value.position || props.employeeName)

/** `null` prints as an em dash, never as `₱0.00`. */
function money(value) {
  return value === null || value === undefined ? '—' : formatCurrency(value)
}

/**
 * Hours, to two decimals — the precision `decimalHoursLabel` exists to settle.
 *
 * Quoted from that one place rather than reimplemented, because a hundredth of an
 * hour is 36 seconds and the exact ties it produces are frequent enough that a
 * second rounding rule would disagree with attendance, card taps and the access
 * cards' monthly totals on the same person's run.
 */
function hours(value) {
  return value === null || value === undefined ? '—' : decimalHoursLabel(value)
}

/**
 * The one sentence that says whether the days add up to the net pay shown.
 *
 * A day's money summing to a different net than the row was listed at is worth
 * saying out loud before somebody funds against it. When there is nothing to
 * compare — the endpoint sent no per-day net — there is no claim to make, so the
 * line stays empty rather than asserting a check that did not happen.
 */
const message = computed(() => {
  if (!bd.value.hasFigures || !bd.value.netMatches) return ''
  const { drift } = bd.value
  if (drift === null) return ''
  if (Math.abs(drift) >= 0.005) {
    return `These days come to ${formatCurrency(Math.abs(drift))} ${drift > 0 ? 'over' : 'under'} the net pay shown.`
  }
  return 'These days come to the net pay shown.'
})

const messageTone = computed(() => {
  const { drift } = bd.value
  if (drift === null) return 'good'
  return Math.abs(drift) >= 0.005 ? 'bad' : 'good'
})

/**
 * A money column.
 *
 * `format` rather than a `body-cell-*` slot: Quasar names that slot after each
 * column individually, so five money columns would need five near-identical
 * templates that could drift out of step with each other. One formatter keeps the
 * em-dash-for-`null` rule in a single place.
 */
const moneyColumn = (name, label) => ({
  name,
  label,
  field: name,
  align: 'right',
  classes: 'day__amount',
  format: money,
})

const dayColumns = [
  { name: 'date', label: 'Day', field: 'date', align: 'left' },
  {
    name: 'hours',
    label: 'Hours',
    field: 'hours',
    align: 'right',
    classes: 'day__amount',
    format: hours,
  },
  moneyColumn('gross', 'Gross'),
  moneyColumn('ot', 'OT'),
  moneyColumn('nd', 'Night diff'),
  moneyColumn('undertime', 'Undertime'),
  moneyColumn('net', 'Net'),
]

const issueColumns = [
  { name: 'type', label: 'Type', field: 'type', align: 'left' },
  {
    name: 'description',
    label: 'Description',
    field: 'description',
    align: 'left',
    format: (v) => v || '-',
  },
  { name: 'date', label: 'Date', field: 'date', align: 'left' },
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
      data.value = await fetchEmployeePayrollItemEarnings(props.employeeId)
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
.amount-amber {
  color: var(--dash-warn);
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

.day__date {
  display: block;
  font-weight: 500;
  color: var(--dash-ink);
}
.day__amount {
  font-weight: 600;
  color: var(--dash-ink-2);
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
.brk__check--bad {
  background: var(--dash-critical-bg);
  color: var(--dash-critical);
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
