<template>
  <q-dialog v-model="internalShow" persistent>
    <q-card class="dash-modal dash-modal--lg">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <!-- A face when the name resolves to exactly one roster employee
                 who has one, otherwise initials — matching the row this dialog
                 opened from. -->
            <template v-if="data && avatarOf(data.full_name).pictureUrl">
              <img :src="avatarOf(data.full_name).pictureUrl" :alt="data.full_name" />
            </template>
            <q-icon v-else-if="!data" name="receipt_long" size="22px" />
            <span v-else>{{ avatarOf(data.full_name).initials }}</span>
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Attendance details</div>
            <div class="dash-modal__sub" v-if="data">{{ data.full_name }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" @click="internalShow = false" />
      </q-card-section>

      <q-card-section v-if="loading" class="dash-modal__body dash-modal__body--row loading-section">
        <q-spinner color="primary" size="24px" />
        <span>Loading...</span>
      </q-card-section>

      <q-card-section v-else-if="data" class="dash-modal__body">
        <div class="dash-modal__section-title">Attendance summary</div>
        <div class="detail-grid-cards">
          <div class="detail-card">
            <div class="detail-card-label">Days worked</div>
            <div class="detail-card-value">{{ data.summary?.days_worked ?? 0 }}</div>
          </div>
          <!-- Labelled by the unit `absent_days` actually counts. It is not days:
               the endpoint repeats an absence per shift, so a date can carry two,
               and the figure cannot be added to "Days worked" beside it. The
               sub-line carries the date span it hides. See `reviewSummary.js`. -->
          <div class="detail-card">
            <div class="detail-card-label">
              Absent shifts
              <q-tooltip>{{ ABSENT_SHIFTS_TIP }}</q-tooltip>
            </div>
            <div class="detail-card-value amount-red">{{ data.summary?.absent_days ?? 0 }}</div>
            <div v-if="absentDaySpan" class="detail-card-note">{{ absentDaySpan }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Undertime</div>
            <div class="detail-card-value amount-amber">
              {{ data.summary?.total_undertime || '0h 0m' }}
            </div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Late</div>
            <div class="detail-card-value">{{ data.summary?.late ?? 0 }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Overtime</div>
            <div class="detail-card-value amount-green">
              {{ data.summary?.total_overtime || '0h 0m' }}
            </div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Leaves</div>
            <div class="detail-card-value">{{ data.summary?.leaves?.length ?? 0 }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">
              Total paid hours
              <q-tooltip>
                The endpoint's own total for this run. It sits about an hour per worked day below
                the sum of the day rows below — so it is not the same figure as adding up the table.
              </q-tooltip>
            </div>
            <div class="detail-card-value">{{ totalHoursLabel }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Net pay</div>
            <div class="detail-card-value">{{ netPayLabel }}</div>
          </div>
        </div>

        <div class="dash-modal__section-title" v-if="data.issues?.length">Issues</div>
        <div v-if="data.issues?.length" class="modal-table-wrap">
          <q-table
            :rows="issueRows"
            :columns="issueColumns"
            row-key="_key"
            flat
            dense
            hide-pagination
            hide-no-data
            class="dash-qtable dash-qtable--compact detail-table"
          />
        </div>

        <div class="dash-modal__section-title">Attendance</div>
        <div class="modal-table-wrap">
          <q-table
            :rows="attendanceRows"
            :columns="attendanceColumns"
            :row-key="attendanceRowKey"
            flat
            dense
            :rows-per-page-options="[10, 20, 50]"
            class="dash-qtable dash-qtable--compact detail-table"
          />
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
import { computed, ref, watch } from 'vue'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { avatarFor } from 'src/composables/utils/employee'
import { decimalHoursLabel, formatCurrency } from 'src/composables/utils/format'
import { ABSENT_SHIFTS_TIP, absentDaySpanLabel } from './reviewSummary'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  employeeId: { type: [Number, String], default: null },
  // Name → employee record, to put a face in the header; built once per page and
  // shared by every tab. A name held by two employees resolves to null, so the
  // avatar draws initials rather than the wrong photo. See `avatarFor`.
  employeeIndex: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue'])

const avatarOf = (name) => avatarFor(props.employeeIndex, name)

/**
 * The two figures the endpoint carries above `summary`, which the dialog had no
 * room for.
 *
 * `decimalHoursLabel` is the app's one decimal-hour rounding, so this quotes the
 * same number the day rows are built from. It returns `''` for an unreadable
 * figure, which is rendered as an em dash rather than as a zero: "we could not
 * read this" is not "they worked no hours".
 *
 * The unit is spelled out because every other tile in this dialog spells its own
 * — `0h 10m`, not `0.17` — and a bare `56.96` beside them reads as a different
 * quantity.
 *
 * This is `total_work_hours`, which the tile labels "Total paid hours" because it
 * is not the sum of the day rows: across two employees it runs almost exactly an
 * hour per worked day below them. The gap is stated in the label's tooltip rather
 * than closed up here — the day rows are the timesheet's figures, and quietly
 * deducting an hour from each of them would be inventing a payroll rule.
 */
const totalHoursLabel = computed(() => {
  const hours = decimalHoursLabel(data.value?.total_work_hours)
  return hours ? `${hours} h` : '—'
})

const netPayLabel = computed(() => formatCurrency(data.value?.net_pay))

/**
 * The sub-line under the absence tile: the dates `absent_days` spans, since the
 * figure itself counts shifts. Empty when the span would only repeat the number, or
 * when there is no `issues` array to count it from.
 */
const absentDaySpan = computed(() => absentDaySpanLabel(data.value?.summary, data.value?.issues))

const { fetchEmployeePayrollItem } = useDisbursementApi()

const internalShow = ref(false)
const loading = ref(false)
const data = ref(null)

watch(
  () => props.modelValue,
  async (val) => {
    internalShow.value = val
    if (val && props.employeeId) {
      loading.value = true
      data.value = null
      try {
        data.value = await fetchEmployeePayrollItem(props.employeeId)
      } catch (err) {
        console.error('[EmployeeDetailDialog] fetch failed:', err)
      } finally {
        loading.value = false
      }
    }
  },
)

watch(internalShow, (val) => {
  emit('update:modelValue', val)
})

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

const attendanceColumns = [
  { name: 'date', label: 'Date', field: 'date', align: 'left', sortable: true },
  { name: 'hours_worked', label: 'Hours Worked', field: 'hours_worked', align: 'center' },
  { name: 'undertime', label: 'Undertime', field: 'undertime', align: 'center' },
  { name: 'late', label: 'Late', field: 'late', align: 'center' },
  { name: 'overtime', label: 'Overtime', field: 'overtime', align: 'center' },
  { name: 'work_type', label: 'Work Type', field: 'work_type', align: 'left' },
]

/**
 * A date as sortable milliseconds, or +∞ when it is unreadable.
 *
 * +∞ rather than 0 so an unparseable date sinks to the bottom instead of being
 * claimed to be the earliest payroll day.
 */
const attendanceTime = (value) => {
  const ms = new Date(String(value ?? '')).getTime()
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY
}

/**
 * A duration as minutes, for *choosing between* rows only.
 *
 * Never for display: the rows' own strings are printed untouched. The parse exists
 * to answer "which row of this date carries the day's hours", and an unreadable
 * value answers 0 so it loses that contest rather than winning it by accident.
 */
const durationMinutes = (value) => {
  const matched = /^\s*(\d+)\s*h\s*(\d+)\s*m\s*$/i.exec(String(value ?? ''))
  if (matched) return Number(matched[1]) * 60 + Number(matched[2])
  const bare = Number(String(value ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(bare) ? bare : 0
}

/**
 * One row per day, in date order.
 *
 * The endpoint sends one row per `(date, work_type)`, so a day an employee both
 * worked and was marked absent without leave comes back twice — and the day's
 * **overtime, undertime and late are repeated identically on each of its rows**.
 * Printing every row therefore double-counts: Larry's overtime column added to
 * 48h 35m against the 24h 25m the summary reports, and every worked day shared its
 * undertime with a duplicate.
 *
 * So a day is shown once, from **the row carrying its hours**, and that row's own
 * figures are printed verbatim — no duration is added, subtracted or re-rounded
 * here. Summing instead is what produced the double count.
 *
 * Only that row's `work_type` is shown, rather than every type the date carries.
 * Listing them together (`Work + Rest Day`) was accurate to the payload and read as
 * a contradiction — a day cannot be both — which is a worse failure than the one it
 * guarded against. The other rows carry no hours; an absence among them is already
 * named in the Issues table above, and a rest day among them is the reason there are
 * no hours, which is the figure printed beside it.
 *
 * Where no row of a day carries hours, the payload's first row wins, so a day with
 * nothing recorded still renders rather than disappearing.
 *
 * Sorted in JS rather than with `q-table`'s `sort`: the date arrives as
 * `October 01, 2026`, and sorting that as text puts October 10 before October 2.
 */
const attendanceRows = computed(() => {
  const rows = Array.isArray(data.value?.attendance) ? data.value.attendance : []
  const byDate = new Map()
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const key = String(row.date ?? '')
    const minutes = durationMinutes(row.hours_worked)
    const held = byDate.get(key)
    if (!held || minutes > held.minutes) byDate.set(key, { row, minutes })
  }
  return [...byDate.entries()]
    .map(([key, held]) => ({ ...held.row, date: key }))
    .sort((a, b) => attendanceTime(a.date) - attendanceTime(b.date))
})

/** One row per date now, so the date is a real key. */
const attendanceRowKey = (row) => String(row?.date ?? '')

/**
 * The issues, keyed by position so the repeats stay separate rows.
 *
 * `date + type` is not unique here: the payload repeats *identical* absent entries
 * (Oct 7, 8, 9, 10 and 11 each carry two), so every such pair would collide on any
 * key built from their contents. The index is what tells two identical rows apart —
 * and unlike the `row-key="index"` this replaces, it is a field that actually
 * exists, rather than a key that was `undefined` for every row.
 *
 * Nothing is deduplicated: `absent_days` counts these entries, not the dates they
 * fall on (13 entries across 8 dates in this payload), so dropping the repeats
 * would leave the table disagreeing with the tile directly above it — which is why
 * that tile names the unit it counts rather than calling itself days.
 */
const issueRows = computed(() =>
  (Array.isArray(data.value?.issues) ? data.value.issues : [])
    .filter(Boolean)
    .map((issue, index) => ({ ...issue, _key: `${issue.date ?? ''}·${index}` })),
)
</script>

<style scoped>
/* The card, header, body, section headings and button are the shared
   `dash-modal` chrome. What is left is this dialog's fact grid and the two
   tables it wraps. Everything reads from `--dash-*`; the block this replaces
   carried eighteen literal hex values and 11px uppercase labels at 0.06em
   tracking, the one convention the design system singles out as dated. */

.loading-section {
  gap: 10px;
  padding: 40px 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

/* ── Summary tiles ── */
.detail-grid-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
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
  font-size: 14px;
  font-weight: 600;
  color: var(--dash-ink);
  font-variant-numeric: tabular-nums;
  word-break: break-word;
}

/* The unit a record count does not carry, stated under the figure rather than in
   the tooltip, so the tile reconciles with its neighbour without being hovered. */
.detail-card-note {
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.3;
  color: var(--dash-ink-3);
}

/* Status tones, and only where the figure means something is off — a count of
   days worked is not "good news" and does not get painted green. */
.amount-green {
  color: var(--dash-good);
}
.amount-red {
  color: var(--dash-critical);
}
.amount-amber {
  color: var(--dash-warn);
}

/* Header strip, row rhythm and dividers come from `dash-qtable--compact`, the
   in-dialog density. This wrapper only supplies the edge around it. */
.modal-table-wrap {
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  overflow: hidden;
  margin-bottom: 4px;
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
