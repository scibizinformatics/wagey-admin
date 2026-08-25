<template>
  <q-dialog
    :model-value="modelValue"
    :maximized="$q.screen.lt.sm"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="contrib-card">
      <!-- ── Header ─────────────────────────────────────────────────────────
           The employee is named here rather than in the body: the dialog is
           opened from a table row, and once it covers the table nothing else on
           screen says whose contributions these are. -->
      <q-card-section class="contrib-head">
        <span class="contrib-head__icon">
          <q-icon name="o_account_balance" size="19px" />
        </span>

        <div class="contrib-head__titles">
          <div class="contrib-head__name">{{ employeeName || 'Contributions' }}</div>
          <div class="contrib-head__sub">{{ headerSub }}</div>
        </div>

        <q-btn flat round dense icon="close" @click="close" />
      </q-card-section>

      <q-card-section class="contrib-body">
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
                v-if="pending.length > 1"
                flat
                dense
                no-caps
                size="12px"
                class="contrib-selectall"
                :label="allPendingSelected ? 'Clear selection' : `Select all ${pending.length} pending`"
                @click="toggleAllPending"
              />
            </div>

            <ul v-if="contributions.length" class="contrib-list">
              <li
                v-for="row in contributions"
                :key="row.id"
                class="contrib-row"
                :class="{ 'contrib-row--selected': selected.includes(row.id) }"
              >
                <!-- Only an undeducted contribution is selectable. Deducted rows
                     keep the same slot so names stay on one vertical line. -->
                <span class="contrib-row__pick">
                  <q-checkbox
                    v-if="!row.deducted"
                    :model-value="selected.includes(row.id)"
                    dense
                    size="xs"
                    :disable="deducting"
                    @update:model-value="toggle(row.id)"
                  />
                  <q-icon v-else name="o_check_circle" size="17px" class="contrib-row__done" />
                </span>

                <span class="contrib-row__body">
                  <span class="contrib-row__name">{{ row.name }}</span>
                  <span class="contrib-row__meta">
                    <template v-if="row.deducted">
                      Deducted<template v-if="row.deducted_from"> from {{ row.deducted_from }}</template>
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
        </template>
      </q-card-section>

      <q-separator />

      <!-- The action states its own precondition beside itself, so a disabled
           button is never unexplained. -->
      <q-card-actions class="contrib-actions">
        <span v-if="!loading && !error && contributions.length" class="contrib-actions__note">
          <template v-if="selected.length">
            {{ selected.length }} selected · {{ formatCurrency(selectedAmount) }}
          </template>
          <template v-else-if="pending.length">
            {{ pending.length }} contribution{{ pending.length > 1 ? 's' : '' }} still to deduct
          </template>
          <template v-else>All contributions deducted</template>
        </span>
        <q-space />
        <q-btn flat no-caps label="Close" class="contrib-btn" @click="close" />
        <q-btn
          v-if="pending.length"
          unelevated
          no-caps
          icon="o_playlist_add_check"
          :label="selected.length ? `Deduct ${selected.length}` : 'Deduct'"
          class="contrib-btn contrib-btn--primary"
          :loading="deducting"
          :disable="!selected.length || deducting"
          @click="deduct"
        >
          <q-tooltip v-if="!selected.length">Select a contribution to deduct</q-tooltip>
        </q-btn>
      </q-card-actions>
    </q-card>
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
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { formatCurrency } from 'src/composables/utils/format'

const $q = useQuasar()
const { fetchEpiContributions, deductContributions } = useDisbursementApi()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Payout group instance the employee payroll item belongs to. */
  pgiId: { type: [Number, String], default: null },
  /** Employee payroll item id. */
  epiId: { type: [Number, String], default: null },
  employeeName: { type: String, default: '' },
})

// `deducted` tells the parent its review figures are stale.
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

const loading = ref(false)
const error = ref(false)
const deducting = ref(false)
const data = ref(null)
const selected = ref([])

/** Decimal strings ("200.00") arrive from the API; sum them as numbers. */
function amount(val) {
  return Number(val ?? 0)
}

const contributions = computed(() => data.value?.contributions || [])
const pending = computed(() => contributions.value.filter((row) => !row.deducted))

const totalAmount = computed(() =>
  contributions.value.reduce((sum, row) => sum + amount(row.amount), 0),
)
const deductedAmount = computed(() =>
  contributions.value.filter((row) => row.deducted).reduce((sum, row) => sum + amount(row.amount), 0),
)
const pendingAmount = computed(() =>
  pending.value.reduce((sum, row) => sum + amount(row.amount), 0),
)
const selectedAmount = computed(() =>
  contributions.value
    .filter((row) => selected.value.includes(row.id))
    .reduce((sum, row) => sum + amount(row.amount), 0),
)

const allPendingSelected = computed(
  () => pending.value.length > 0 && pending.value.every((row) => selected.value.includes(row.id)),
)

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

function toggleAllPending() {
  selected.value = allPendingSelected.value ? [] : pending.value.map((row) => row.id)
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
}

async function deduct() {
  if (!selected.value.length) return
  const count = selected.value.length
  deducting.value = true
  try {
    await deductContributions(props.epiId, [...selected.value])
    // Refetched rather than patched locally: deducting sets `deducted_from` and
    // can move the item's overall status, neither of which is knowable here.
    await load()
    emit('deducted')
    $q.notify({
      type: 'positive',
      message: `Deducted ${count} contribution${count > 1 ? 's' : ''}.`,
      icon: 'check_circle',
      timeout: 2500,
      position: 'top',
    })
  } catch (err) {
    console.error('[EmployeeContributionsDialog] deduct ✖ error:', err)
    $q.notify({
      type: 'negative',
      message: 'Failed to deduct contributions.',
      icon: 'error',
      timeout: 3000,
      position: 'top',
    })
  } finally {
    deducting.value = false
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
      selected.value = []
      error.value = false
    }
  },
)
</script>

<style scoped>
.contrib-card {
  width: 100%;
  max-width: 520px;
  border-radius: 14px;
  overflow: hidden;
}

/* ── Header ────────────────────────────────────────────────────────────────── */
.contrib-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 18px;
  background: var(--dash-brand, #102335);
}

.contrib-head__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}

.contrib-head__titles {
  min-width: 0;
  flex: 1;
}

.contrib-head__name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contrib-head__sub {
  margin-top: 1px;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.78);
}

.contrib-head :deep(.q-btn) {
  color: rgba(255, 255, 255, 0.8);
  flex: none;
}

.contrib-head :deep(.q-btn:hover) {
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
}

/* ── Body ──────────────────────────────────────────────────────────────────── */
.contrib-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px;
  max-height: 68vh;
  overflow-y: auto;
}

.contrib-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 34px 0;
  font-size: 13px;
  color: var(--dash-ink-3, #667085);
}

.contrib-state--error {
  color: var(--dash-critical, #b42318);
}

.contrib-retry {
  color: var(--dash-accent, #175cd3);
  font-weight: 600;
}

/* ── Summary ───────────────────────────────────────────────────────────────── */
.contrib-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 13px 14px;
  border: 1px solid var(--dash-line, #eaecf0);
  border-radius: 10px;
  background: var(--dash-sunken, #f9fafb);
}

.contrib-summary__status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.contrib-summary__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--dash-ink-4, #98a2b3);
}

.contrib-summary__figures {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 0;
  padding-top: 11px;
  border-top: 1px solid var(--dash-line-soft, #f2f4f7);
}

.contrib-summary__figures dt {
  font-size: 11.5px;
  color: var(--dash-ink-4, #98a2b3);
}

.contrib-summary__figures dd {
  margin: 2px 0 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--dash-ink, #101828);
}

/* Pending money is the reason to open this dialog, so it is the one figure that
   changes colour when it is non-zero. */
.contrib-pending {
  color: var(--dash-warn, #b54708);
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
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--dash-ink-4, #98a2b3);
}

.contrib-selectall {
  color: var(--dash-accent, #175cd3);
  font-weight: 600;
}

.contrib-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--dash-line, #eaecf0);
  border-radius: 10px;
  overflow: hidden;
}

.contrib-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--dash-line-soft, #f2f4f7);
  transition: background 0.12s ease;
}

.contrib-row:last-child {
  border-bottom: none;
}

.contrib-row--selected {
  background: var(--dash-accent-bg, #eff8ff);
}

.contrib-row__pick {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
}

.contrib-row__done {
  color: var(--dash-good-mark, #17b26a);
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
  color: var(--dash-ink, #101828);
  line-height: 1.35;
}

.contrib-row__meta {
  font-size: 11.5px;
  color: var(--dash-ink-4, #98a2b3);
}

.contrib-row__amount {
  flex: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink, #101828);
}

.contrib-empty {
  padding: 26px 0;
  text-align: center;
}

.contrib-empty__title {
  margin: 10px 0 2px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--dash-ink-2, #344054);
}

.contrib-empty__sub {
  margin: 0;
  font-size: 12.5px;
  color: var(--dash-ink-4, #98a2b3);
}

/* ── Actions ───────────────────────────────────────────────────────────────── */
.contrib-actions {
  align-items: center;
  gap: 8px;
  padding: 11px 18px;
}

.contrib-actions__note {
  font-size: 12.5px;
  color: var(--dash-ink-3, #667085);
}

.contrib-btn {
  height: 34px;
  padding: 0 14px;
  border-radius: var(--dash-r-md, 8px);
  font-size: 13px;
  font-weight: 600;
}

.contrib-btn--primary {
  background: var(--dash-brand, #102335);
  color: #fff;
  box-shadow: var(--dash-shadow-xs);
}

.contrib-btn--primary:hover {
  background: #193d5c;
}

.contrib-btn--primary:disabled,
.contrib-btn--primary[disabled] {
  background: var(--dash-n-200, #eaecf0);
  color: var(--dash-ink-4, #98a2b3);
  box-shadow: none;
}

@media (max-width: 599px) {
  .contrib-card {
    max-width: 100%;
    border-radius: 0;
  }

  .contrib-body {
    max-height: none;
  }

  .contrib-actions__note {
    display: none;
  }
}
</style>
