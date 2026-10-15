<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon"><q-icon name="work_history" size="20px" /></span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Compensable time details</div>
            <div class="dash-modal__sub">{{ request?.employeeName || '' }}</div>
          </div>
        </div>
        <q-btn
          icon="close"
          flat
          round
          aria-label="Close"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <div class="dash-modal__stack">
          <div class="dash-modal__section">
            <div class="dash-modal__section-title">Application</div>
            <div class="dash-modal__rows">
              <div class="dash-modal__row">
                <span class="dash-modal__label">Employee:</span>
                <span class="dash-modal__value">{{ request?.employeeName || '—' }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Category:</span>
                <span class="dash-modal__value">{{ request?.categoryName || '—' }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Subcategory:</span>
                <span class="dash-modal__value">{{ request?.subCategoryName || '—' }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Dates:</span>
                <span class="dash-modal__value">{{ request?.datesLabel || '—' }}</span>
              </div>
              <!-- The accrued value rather than the calendar-day count: a half day
                   reports `total_days: 1` and would otherwise read as a full one,
                   here as it does in the table and in the confirmation. -->
              <div class="dash-modal__row">
                <span class="dash-modal__label">Duration:</span>
                <span class="dash-modal__value">{{ request?.duration || '—' }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Status:</span>
                <span class="dash-modal__value">
                  <div :class="['dash-chip', chipTone(request?.status)]">
                    {{ request?.statusLabel || 'Unknown' }}
                  </div>
                </span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Submitted:</span>
                <span class="dash-modal__value">{{ formatStamp(request?.submittedDate) }}</span>
              </div>
              <!-- Only while it is live. A decided application's flag is history,
                   and showing it here would read as advice attached to a request
                   nobody is recommending against any more. -->
              <div v-if="request?.recommendedForRejection" class="dash-modal__row">
                <span class="dash-modal__label">Rejection recommended:</span>
                <span class="dash-modal__value">
                  <div class="dash-chip dash-chip--warn">
                    {{ request?.rejectionNote || 'No note given' }}
                  </div>
                </span>
              </div>
            </div>
            <div v-if="request?.notes" class="info-content">
              <div class="dash-modal__field-label">Notes:</div>
              <div class="dash-modal__note">{{ request.notes }}</div>
            </div>

            <!--
              The days one at a time. The span above says which dates; this says
              what each one is worth, and the two facts a span cannot carry — a
              half day, and the excess hours worked on it — only exist here. An
              admin settling this request is reading it for exactly those, so they
              get a row each rather than being folded into a single figure.

              The same Full/Half control the apply dialogs use, read-only here: a
              decided application cannot have its day parts edited, and a switch
              that does nothing is worse than plain words, so the marker and the
              label are shown instead.
            -->
            <div v-if="request?.dates?.length" class="info-content">
              <div class="dash-modal__field-label">Days</div>
              <div class="ct-days">
                <div v-for="day in request.dates" :key="day.date" class="ct-days__row">
                  <span class="ct-days__date">
                    {{ longLabel(day.date) }}
                    <span class="ct-days__iso">{{ day.date }}</span>
                  </span>
                  <span class="ct-days__part">
                    <span
                      class="day-part__mark"
                      :class="day.is_half_day ? 'day-part__mark--half' : 'day-part__mark--full'"
                      aria-hidden="true"
                    />
                    {{ day.is_half_day ? 'Half day' : 'Full day' }}
                  </span>
                  <span class="ct-days__excess">{{ excessLabel(day.excess_hours) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!--
            The money attached to this application. Fetched on open rather than
            read off the list payload, because the queue answers ids and amounts
            and this is the surface that has to show what an admin is about to
            change — and because the list's own total is the server's figure, not
            a client-side re-sum of the rows below it.
          -->
          <div class="dash-modal__section">
            <div class="dash-modal__section-title">Allowances</div>

            <div v-if="allowancesLoading" class="allow-list-loading">
              <q-spinner-dots color="grey-6" size="22px" />
            </div>

            <template v-else>
              <div v-if="allowances.length" class="allow-list">
                <div v-for="allowance in allowances" :key="allowance.id" class="allow-row">
                  <div class="allow-row__main">
                    <span class="allow-row__type">{{ allowance.typeName }}</span>
                    <span v-if="allowance.notes" class="allow-row__notes">
                      {{ allowance.notes }}
                    </span>
                  </div>
                  <div class="allow-row__side">
                    <span class="allow-row__amount">{{ formatMoney(allowance.amount) }}</span>
                    <q-btn
                      flat
                      dense
                      round
                      icon="close"
                      size="sm"
                      class="allow-row__remove"
                      :loading="allowanceSaving"
                      :aria-label="'Remove ' + allowance.typeName"
                      @click="$emit('remove-allowance', allowance)"
                    >
                      <q-tooltip>Remove this allowance</q-tooltip>
                    </q-btn>
                  </div>
                </div>
              </div>

              <div v-else class="allow-empty">No allowances attached to this application yet.</div>

              <!-- The server's own figure. Printed even when it is zero, and
                   never recomputed from the rows above: a client-side sum would
                   eventually disagree with the server about whether a reverted
                   allowance still counts, and that disagreement is a wrong number
                   on a request. -->
              <div class="allow-total">
                <span class="allow-total__label">Total</span>
                <span class="allow-total__value">{{ formatMoney(totalAmount) }}</span>
              </div>

              <!--
                Collected here rather than in its own dialog: an allowance is a
                type and an amount on a row the reviewer is already looking at,
                so there is nothing to restate and nothing to decide. The remove
                button on the row above is the irreversible half, and it goes
                through the page's confirmation like every other write.
              -->
              <div class="allow-add">
                <label class="dash-modal__field">
                  <span class="dash-modal__field-label">Allowance type</span>
                  <q-select
                    v-model="draft.allowanceType"
                    :options="allowanceTypeOptions"
                    emit-value
                    map-options
                    outlined
                    dense
                    hide-bottom-space
                    popup-content-class="dash-popup"
                    class="dash-field"
                  />
                </label>
                <label class="dash-modal__field">
                  <span class="dash-modal__field-label">Amount</span>
                  <q-input
                    v-model="draft.amount"
                    outlined
                    dense
                    hide-bottom-space
                    type="number"
                    step="0.01"
                    min="0"
                    class="dash-field"
                  />
                </label>
                <label class="dash-modal__field allow-add__notes">
                  <span class="dash-modal__field-label">Notes (optional)</span>
                  <q-input
                    v-model="draft.notes"
                    outlined
                    dense
                    hide-bottom-space
                    class="dash-field"
                  />
                </label>
                <q-btn
                  unelevated
                  no-caps
                  label="Add allowance"
                  class="dash-modal__submit"
                  :loading="allowanceSaving"
                  :disable="!canAdd"
                  @click="submit"
                />
                <span v-if="!canAdd && touched" class="allow-add__hint">
                  Choose an allowance type and an amount above zero.
                </span>
              </div>
            </template>
          </div>
        </div>
      </q-card-section>

      <q-card-section class="dash-modal__foot">
        <q-btn
          flat
          no-caps
          label="Close"
          class="dash-modal__cancel"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * One compensable time application, and the allowances attached to it.
 *
 * Dumb by design, like the other detail dialogs on this page: the allowances are
 * fetched by the page when this opens and every write is emitted upward, so this
 * component owns no state the rest of the page cannot see. That matters more here
 * than on the other tabs — removing an allowance is money leaving a request, and
 * it goes through the page's confirmation rather than firing a write from behind
 * a dialog that a reviewer did not open deliberately.
 *
 * `totalAmount` is the server's own `total_amount` and is printed verbatim rather
 * than summed from the rows. The two are the same figure today; when they stop
 * agreeing, the server is the one the payroll will be built from.
 */
import { computed, reactive, ref, watch } from 'vue'
import { formatCurrency, formatDateTime } from 'src/composables/utils/format'
import { longLabel } from 'src/composables/utils/calendarDate'

const props = defineProps({
  modelValue: Boolean,
  request: { type: Object, default: null },
  allowances: { type: Array, default: () => [] },
  // The server's `total_amount`, as a string. Null renders as ₱0.00 rather than
  // blank: an application with no allowance attached has a total of zero, which
  // is a fact, and an empty cell would read as a figure this code failed to read.
  totalAmount: { type: [String, Number], default: null },
  allowancesLoading: Boolean,
  allowanceSaving: Boolean,
  // Raw allowance-type rows from `/allowance/allowance-types/company/{id}/`.
  allowanceTypes: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'add-allowance', 'remove-allowance'])

const draft = reactive({ allowanceType: null, amount: '', notes: '' })
/** Whether the reviewer has tried to add anything yet, so the hint appears when
 *  a click is refused rather than greeting an untouched form with a complaint. */
const touched = ref(false)

/**
 * Opened empty, every time.
 *
 * The dialog is reused for each application in turn, and nothing cleared the
 * draft between visits — so an amount typed for one request would arrive on the
 * next, against a different employee. The allowances list is not cleared here
 * either: the page refetches on every open, and blanking it first would only
 * flash an empty state for a request that does have allowances.
 */
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      draft.allowanceType = null
      draft.amount = ''
      draft.notes = ''
      touched.value = false
    }
  },
)

const allowanceTypeOptions = computed(() =>
  (props.allowanceTypes || [])
    .filter((type) => type?.id != null)
    .map((type) => ({ label: type.name || `Type ${type.id}`, value: type.id })),
)

const amountValue = computed(() => Number(draft.amount))

const canAdd = computed(
  () => draft.allowanceType != null && Number.isFinite(amountValue.value) && amountValue.value > 0,
)

const submit = () => {
  touched.value = true
  if (!canAdd.value) return
  // The amount travels as the string it was typed as. The endpoint documents a
  // decimal string, and reformatting it here is how a trailing precision the
  // reviewer saw disappears between the field and the ledger.
  emit('add-allowance', {
    allowanceType: draft.allowanceType,
    amount: String(draft.amount).trim(),
    notes: draft.notes || '',
  })
  draft.allowanceType = null
  draft.amount = ''
  draft.notes = ''
  touched.value = false
}

// An allowance row's amount is already a number, resolved once by the queue's
// reader so the dialog and any future summary of the same rows cannot disagree
// about what was entered.
const formatMoney = (value) => formatCurrency(value ?? 0)

const formatStamp = (value) => formatDateTime(value) || '—'

/**
 * A day's excess hours, or nothing.
 *
 * Silence rather than a zero: most days on a request carry no excess hours at
 * all, and a column of "₱0.00" would read as a value somebody entered rather
 * than as an absence, which is the same "null is not 0" rule the duration column
 * follows.
 */
const excessLabel = (value) => {
  const hours = Number(value)
  if (!Number.isFinite(hours) || hours <= 0) return ''
  return `${hours} excess hour${hours === 1 ? '' : 's'}`
}

const chipTone = (status) => {
  const key = String(status || '').toLowerCase()
  if (key === 'pending') return 'dash-chip--warn'
  if (key === 'approved') return 'dash-chip--good'
  if (key === 'rejected') return 'dash-chip--critical'
  return ''
}
</script>

<style scoped src="./requestModal.css"></style>

<style scoped>
/* ===== Per-day breakdown =====
   The two marks repeat `DayPartToggle`'s geometry rather than importing it: that
   component's styles are scoped to it, and a 22px disc duplicated here is far
   cheaper than a second component or a global class for one dialog's list. */
.ct-days {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-sm);
  background: var(--dash-surface);
  overflow: hidden;
}
.ct-days__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 11px;
  border-bottom: 1px solid var(--dash-line-soft);
}
.ct-days__row:last-child {
  border-bottom: none;
}
.ct-days__date {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  font-size: 13px;
  color: var(--dash-ink);
}
.ct-days__iso {
  font-size: 11.5px;
  color: var(--dash-ink-4);
  font-variant-numeric: tabular-nums;
}
.ct-days__part {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  font-size: 12.5px;
  color: var(--dash-ink-2);
  white-space: nowrap;
}
.ct-days__excess {
  min-width: 96px;
  font-size: 12.5px;
  color: var(--dash-ink-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.day-part__mark {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  flex-shrink: 0;
}
.day-part__mark--full {
  background: var(--dash-ink);
}
.day-part__mark--half {
  background: linear-gradient(90deg, var(--dash-accent) 50%, transparent 50%);
  border: 1px solid var(--dash-accent);
  box-sizing: border-box;
}
/* ===== Allowances =====
   The list, the total and the add form are compensable-time specific and have
   no counterpart on the other four queues, so they live here rather than in
   requestModal.css. */
.allow-list-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 26px 12px;
}
.allow-list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-sm);
  background: var(--dash-surface);
  overflow: hidden;
}
.allow-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 11px;
  border-bottom: 1px solid var(--dash-line-soft);
}
.allow-row:last-child {
  border-bottom: none;
}
.allow-row__main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.allow-row__type {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
}
.allow-row__notes {
  font-size: 11.5px;
  color: var(--dash-ink-4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.allow-row__side {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.allow-row__amount {
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
  font-variant-numeric: tabular-nums;
}
.allow-row__remove {
  width: 26px;
  height: 26px;
  min-width: 26px;
  min-height: 26px;
  color: var(--dash-ink-4);
}
.allow-row__remove:hover {
  background: var(--dash-critical-bg);
  color: var(--dash-critical);
}
.allow-empty {
  padding: 14px 12px;
  border: 1px dashed var(--dash-line);
  border-radius: var(--dash-r-sm);
  background: var(--dash-n-25);
  color: var(--dash-ink-3);
  font-size: 13px;
  text-align: center;
}
.allow-total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 13px;
}
.allow-total__label {
  color: var(--dash-ink-3);
}
.allow-total__value {
  font-weight: 600;
  color: var(--dash-ink);
  font-variant-numeric: tabular-nums;
}
.allow-add {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 130px auto;
  gap: 10px;
  align-items: end;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--dash-line);
}
.allow-add__notes {
  grid-column: 1 / 3;
}
.allow-add__hint {
  grid-column: 1 / -1;
  font-size: 12px;
  color: var(--dash-critical);
}

@media (max-width: 599px) {
  .allow-add {
    grid-template-columns: minmax(0, 1fr);
  }
  .allow-add__notes {
    grid-column: auto;
  }
}
</style>
