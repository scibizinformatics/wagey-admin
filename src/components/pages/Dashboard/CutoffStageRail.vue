<template>
  <div class="rail">
    <div v-if="loading" class="rail__skeleton">
      <span v-for="n in 6" :key="n" class="dash-shimmer rail__skeleton-row" />
    </div>

    <template v-else-if="total > 0">
      <!-- Every stage is drawn, every time, in the order payroll moves through
           them. A stage holding no work still gets its row: the seven tracks are
           the axis a bar is read against, and a rail that only drew the stages
           with work in them collapsed to one full-width block the moment a cutoff
           sat entirely in a single stage — which is exactly when the reader most
           needs to see how far it still has to go. -->
      <ul class="rail__rows" :aria-label="ariaSummary">
        <li v-for="s in stages" :key="s.status">
          <button
            type="button"
            class="rail__row dash-focusable"
            :class="{ 'rail__row--active': active === s.status, 'rail__row--empty': !s.count }"
            :disabled="!s.count"
            :aria-pressed="active === s.status"
            :aria-label="rowAria(s)"
            @click="toggle(s.status)"
          >
            <span class="rail__row-label">{{ s.label }}</span>
            <span class="rail__row-track">
              <span class="rail__row-bar" :style="{ width: `${s.pct}%`, background: s.color }" />
            </span>
            <span class="rail__row-value dash-num">{{ s.count }}</span>
            <span v-if="s.sub" class="rail__row-sub">{{ s.sub }}</span>
          </button>
        </li>
      </ul>

      <!-- One statement, not three. The bar's own datum is on its row, so the
           note only adds what a row cannot say: where the cutoff is blocked, how
           far through the seven stages that is, and how much has cleared. -->
      <p class="rail__note">
        <q-icon name="filter_alt" size="13px" />
        <span v-if="bottleneck">
          <strong>{{ bottleneck.count }}</strong>
          {{ bottleneck.count === 1 ? 'group is' : 'groups are' }} held at
          <strong>{{ bottleneck.label }}</strong> — stage {{ bottleneck.stageNo }} of
          {{ stages.length }}<template v-if="bottleneckMoney">, {{ bottleneckMoney }}</template>.
          <strong>{{ cleared }}</strong> of {{ total }}
          {{ cleared === 1 ? 'has' : 'have' }} cleared the pipeline.
        </span>
        <span v-else>All {{ total }} groups are through the pipeline.</span>
      </p>
    </template>

    <!-- Two empties, not one. A cutoff with nothing stuck in it and a summary the
         app could not read are the same blank rail, and only the first is good
         news — so a failed read says so rather than congratulating the reader on
         a cutoff that may be in trouble. -->
    <div v-else-if="!loaded" class="dash-empty">
      <q-icon name="error_outline" size="26px" :style="{ color: 'var(--dash-warn-mark)' }" />
      <p class="dash-empty__title">Could not read this cutoff's pipeline</p>
      <p class="dash-empty__sub">
        The stage summary did not load, so where this cutoff has stalled is unknown — not clear.
      </p>
    </div>

    <div v-else class="dash-empty">
      <q-icon name="done_all" size="26px" :style="{ color: 'var(--dash-good)' }" />
      <p class="dash-empty__title">No open payout groups</p>
      <p class="dash-empty__sub">Every group in this cutoff has cleared the pipeline.</p>
    </div>
  </div>
</template>

<script setup>
/**
 * The cutoff stage rail — the Current Cutoff tab's lead element.
 *
 * One row per stage, seven rows always, in the order payroll moves through them.
 * What this replaced encoded *share of the whole*, which is the wrong statistic
 * for a pipeline: with every group in one stage the "chart" was a single
 * 100%-wide block and the other six stages were not drawn at all, so the render
 * carried no information beyond its own label. Bars scaled to the largest stage
 * and drawn on a continuous seven-row axis say where work is, how much of it, and
 * how much has already moved past — and keep their meaning when only one stage
 * holds anything.
 *
 * Clicking a populated row emits `filter` so the payout table below narrows to
 * that stage. An empty row is inert: filtering to a stage nobody is at would
 * empty the table for no reason, and there is a real filter under it to lose.
 *
 * `data` is the endpoint's stage counts and stays authoritative — the table
 * below and this rail must not disagree about how many groups exist. `totals`
 * carries money and headcount per stage, summed client-side from the payout group
 * rows the page already fetched, so it is informational and never labelled a
 * total.
 */
import { computed, ref } from 'vue'

const STAGES = [
  { status: 'needs_attention', label: 'Needs attention', color: 'var(--dash-critical-mark)' },
  { status: 'under_review', label: 'Under review', color: 'var(--dash-warn-mark)' },
  { status: 'awaiting_acknowledgment', label: 'Awaiting ack', color: 'var(--dash-cat-4)' },
  { status: 'ready_for_funding', label: 'Ready to fund', color: 'var(--dash-cat-1)' },
  { status: 'funded', label: 'Funded', color: 'var(--dash-cat-2)' },
  { status: 'disbursing', label: 'Disbursing', color: 'var(--dash-info-mark)' },
  { status: 'complete', label: 'Complete', color: 'var(--dash-neutral-mark)' },
]

// Stages before money is committed. The first of these still holding groups is
// what is actually blocking the cutoff.
const BLOCKING = ['needs_attention', 'under_review', 'awaiting_acknowledgment']

/** A payload figure, or 0 — a missing count is no groups, never NaN. */
const num = (value) => Number(value) || 0

const props = defineProps({
  data: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  /**
   * Whether the summary arrived. Default true so the panel reads as "nothing is
   * stuck here" unless it is told otherwise — a caller that forgets the prop
   * should not be told its pipeline is unreadable.
   */
  loaded: { type: Boolean, default: true },
  /**
   * Money and headcount per stage, keyed by the same stage names as `data`:
   * `{ under_review: { employees: 240, amount: 1240000 } }`. Optional; without it
   * the rail renders counts only.
   */
  totals: { type: Object, default: () => ({}) },
  /** The app's money formatter. Optional, for the same reason as `totals`. */
  fmtCurrency: { type: Function, default: null },
})

const emit = defineEmits(['filter'])

const active = ref(null)

function subLine(row) {
  const parts = []
  if (props.fmtCurrency && row.amount > 0) parts.push(props.fmtCurrency(row.amount))
  if (row.employees > 0) {
    parts.push(`${row.employees} ${row.employees === 1 ? 'employee' : 'employees'}`)
  }
  return parts.join(' · ')
}

const stages = computed(() => {
  const rows = STAGES.map((s, i) => {
    const totals = props.totals?.[s.status]
    return {
      ...s,
      stageNo: i + 1,
      count: num(props.data?.[s.status]),
      employees: num(totals?.employees),
      amount: num(totals?.amount),
    }
  })
  // Scaled to the largest bar, not to the total. Bars are read by comparing
  // lengths against a shared axis, and a share-of-total scale would leave every
  // empty stage at zero width with nothing to compare the populated one against.
  // The exact count is always printed at the end of the row.
  const max = Math.max(...rows.map((r) => r.count), 1)
  return rows.map((r) => ({
    ...r,
    pct: (r.count / max) * 100,
    sub: r.count ? subLine(r) : '',
  }))
})

const total = computed(() => stages.value.reduce((sum, s) => sum + s.count, 0))

const cleared = computed(() => stages.value.find((s) => s.status === 'complete')?.count ?? 0)

const bottleneck = computed(
  () => stages.value.find((s) => BLOCKING.includes(s.status) && s.count > 0) ?? null,
)

// Only when there is money to name. A stage whose rows carried no amount says
// nothing rather than "₱0", which would read as "worthless", not "unknown".
const bottleneckMoney = computed(() => {
  const b = bottleneck.value
  if (!b || !props.fmtCurrency || b.amount <= 0) return ''
  return props.fmtCurrency(b.amount)
})

const ariaSummary = computed(() => {
  const parts = stages.value.map((s) => `${s.label} ${s.count}`).join(', ')
  const where = bottleneck.value
    ? `Stage ${bottleneck.value.stageNo} of ${stages.value.length}, ${cleared.value} of ${total.value} cleared.`
    : `All ${total.value} cleared.`
  return `${total.value} payout ${total.value === 1 ? 'group' : 'groups'} in this cutoff: ${parts}. ${where}`
})

function rowAria(row) {
  const parts = [`${row.label}: ${row.count} of ${total.value} groups`]
  if (props.fmtCurrency && row.amount > 0) parts.push(props.fmtCurrency(row.amount))
  if (row.employees > 0) parts.push(`${row.employees} employees`)
  return parts.join(', ')
}

function toggle(status) {
  active.value = active.value === status ? null : status
  emit('filter', active.value)
}

function reset() {
  if (active.value === null) return
  active.value = null
  emit('filter', null)
}

// Lets the hosting panel's "Clear filter" action drop the selection without
// reaching into the rail's internal state.
defineExpose({ reset })
</script>

<style scoped>
.rail {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

/* ── Stage rows ──
   A fixed label column so all seven tracks share both edges, and one row per
   stage whether or not it holds work. The empty track is the axis the filled one
   is read against — take it away and a single-stage cutoff becomes a block. */
.rail__rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rail__row {
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr) 36px;
  grid-template-areas:
    'label track value'
    '.     sub   sub';
  align-items: center;
  gap: 2px 10px;
  width: 100%;
  padding: 5px 6px;
  border: none;
  border-radius: var(--dash-r-sm);
  background: none;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--dash-fast) var(--dash-ease);
}
.rail__row:hover {
  background: var(--dash-n-50);
}
.rail__row:disabled {
  cursor: default;
}
.rail__row:disabled:hover {
  background: none;
}
.rail__row--active {
  background: var(--dash-n-50);
  box-shadow: inset 0 0 0 1px var(--dash-line);
}

.rail__row-label {
  grid-area: label;
  font-size: 12.5px;
  color: var(--dash-ink-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rail__row-track {
  grid-area: track;
  height: 10px;
  border-radius: 999px;
  background: var(--dash-n-100);
  overflow: hidden;
}
.rail__row-bar {
  display: block;
  height: 100%;
  min-width: 2px;
  border-radius: 999px;
  transition: width var(--dash-slow) var(--dash-ease);
}

.rail__row-value {
  grid-area: value;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dash-ink);
  text-align: right;
}

.rail__row-sub {
  grid-area: sub;
  font-size: 11px;
  color: var(--dash-ink-4);
}

/* An empty stage keeps its row: a hairline track and a muted zero, so the axis
   stays continuous and the empty rows read as "nothing here" rather than
   "not counted". */
.rail__row--empty .rail__row-value {
  color: var(--dash-ink-4);
  font-weight: 400;
}
.rail__row--empty .rail__row-track {
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--dash-line);
}

/* ── Bottleneck note ── */
.rail__note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  padding: 10px 12px;
  background: var(--dash-n-50);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--dash-ink-2);
}
.rail__note strong {
  color: var(--dash-ink);
  font-weight: 600;
}
.rail__note .q-icon {
  color: var(--dash-ink-4);
  margin-top: 2px;
  flex-shrink: 0;
}

/* ── Skeleton ── */
.rail__skeleton {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rail__skeleton-row {
  height: 22px;
  border-radius: var(--dash-r-sm);
}

@media (max-width: 1024px) {
  .rail__row {
    grid-template-columns: 96px minmax(0, 1fr) 32px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rail__row-bar {
    transition: none;
  }
}
</style>
