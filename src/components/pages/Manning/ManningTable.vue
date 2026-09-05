<template>
  <TableSkeleton
    v-if="loading && !rows.length"
    :columns="columns"
    :rows="7"
    :min-width="minWidth"
    wrap-class="man-table-wrap"
    aria-label="Loading site manning"
  />

  <div v-else class="man-table-wrap dash-scroll-x">
    <q-table
      v-model:pagination="pagination"
      :rows="rows"
      :columns="columns"
      row-key="key"
      flat
      :loading="loading"
      hide-pagination
      :rows-per-page-options="[0]"
      separator="none"
      class="dash-qtable man-table"
      :table-style="{ minWidth: `${minWidth}px` }"
    >
      <!-- The default header is used rather than a hand-written one: QTable
           writes the alignment class onto each cell from the column's own
           `align`, which is what keeps a label over its own figures. This slot
           only adds the explanatory tooltips on top of it. -->
      <template v-slot:header-cell="props">
        <q-th :props="props">
          {{ props.col.label }}
          <q-tooltip v-if="props.col.hint" anchor="bottom middle" self="top middle" class="man-tip">
            {{ props.col.hint }}
          </q-tooltip>
        </q-th>
      </template>

      <!-- Both rows carry an explicit key. A body slot that emits a second row
           conditionally makes the tbody's child count change under Vue's keyed
           patch, and with unkeyed children it can end up matching a <tr> against
           a vnode that was never mounted — which surfaces as "Cannot read
           properties of null (reading 'emitsOptions')" the first time a row is
           expanded or the rows are re-sorted. Keys make the match explicit. -->
      <template v-slot:body="props">
        <q-tr
          :key="props.row.key"
          :props="props"
          class="dash-qtable__row man-row"
          :class="{ 'man-row--open': isExpanded(props.row.key) }"
          @click="toggle(props.row)"
        >
          <!-- The site is repeated on every row rather than written once above a
               block of them. It costs a column of repetition and buys a table
               where no row depends on the one above it, and where a header can
               never end up standing over a group heading instead of data. -->
          <q-td key="site" :props="props">
            <span class="man-site">
              <q-icon name="o_store" size="15px" class="man-site__icon" />
              {{ props.row.site }}
            </span>
          </q-td>

          <q-td key="position" :props="props">
            <button
              type="button"
              class="man-position"
              :class="{ 'man-position--static': !props.row.shifts.length }"
              :aria-expanded="props.row.shifts.length ? isExpanded(props.row.key) : undefined"
              :disabled="!props.row.shifts.length"
              @click.stop="toggle(props.row)"
            >
              <q-icon
                v-if="props.row.shifts.length"
                :name="isExpanded(props.row.key) ? 'expand_more' : 'chevron_right'"
                size="16px"
                class="man-position__chevron"
              />
              <span v-else class="man-position__chevron-gap" />
              <span class="man-position__name">{{ props.row.position }}</span>
              <span v-if="props.row.shifts.length > 1" class="man-position__shifts">
                {{ props.row.shifts.length }} shifts
              </span>
            </button>
          </q-td>

          <q-td v-if="showRequired" key="needed" :props="props">
            <!-- A position with no requirement has no target, which is not the
                 same as a target of zero. -->
            <span v-if="props.row.needed === null" class="man-dash">—</span>
            <span v-else class="man-strong">{{ props.row.needed }}</span>
          </q-td>

          <q-td key="assigned" :props="props" class="man-strong">
            {{ props.row.assigned }}
          </q-td>

          <!-- Working is the only figure with a meter, because it is the only
               one that is a share of something. The meter runs against the
               requirement where the row has one and against assigned otherwise —
               and which of the two applies is visible in the row itself. -->
          <q-td key="working" :props="props">
            <ManningMeter
              :working="props.row.working"
              :target="mannedTarget(props.row)"
              :target-noun="props.row.needed ? 'required' : 'assigned'"
            />
          </q-td>

          <!-- Where five near-always-zero columns used to be. -->
          <q-td key="attention" :props="props">
            <div v-if="attentionChips(props.row).length" class="man-flags">
              <span
                v-for="chip in attentionChips(props.row)"
                :key="chip.key"
                class="dash-chip man-flag"
                :class="chip.tone === 'neutral' ? '' : `dash-chip--${chip.tone}`"
              >
                <span class="dash-chip__dot" />
                {{ chip.label }}
                <q-tooltip
                  v-if="chip.hint"
                  anchor="bottom middle"
                  self="top middle"
                  class="man-tip"
                >
                  {{ chip.hint }}
                </q-tooltip>
              </span>
            </div>
            <!-- Stated in words rather than left blank: an empty cell reads as
                 data that failed to load. Deliberately quiet type, not a green
                 chip — a column of those was the loudest thing on the page and
                 it was reporting that nothing had happened. -->
            <span v-else-if="props.row.assigned" class="man-ok">
              <q-icon name="o_check" size="14px" />
              All present
            </span>
            <span v-else class="man-dash">Nobody assigned</span>
          </q-td>
        </q-tr>

        <!-- Always rendered, hidden with v-show, so the tbody's child count is
             the same whether or not a row is open. The breakdown itself is still
             v-if'd, so a collapsed row costs one empty <tr> rather than a full
             shift table. -->
        <q-tr
          v-show="isExpanded(props.row.key)"
          :key="`${props.row.key}::shifts`"
          :props="props"
          class="man-detail-row"
        >
          <q-td colspan="100%" class="man-detail-cell">
            <ManningShiftBreakdown
              v-if="isExpanded(props.row.key)"
              :shifts="props.row.shifts"
              :show-required="showRequired"
            />
          </q-td>
        </q-tr>
      </template>

      <template v-slot:no-data>
        <div v-if="!loading" class="dash-empty">
          <span class="dash-featured-icon">
            <q-icon :name="isFiltered ? 'filter_alt_off' : 'o_store'" size="20px" />
          </span>
          <p class="dash-empty__title">
            {{ isFiltered ? 'No positions match these filters' : 'No manning for this day' }}
          </p>
          <p class="dash-empty__sub">
            {{
              isFiltered
                ? 'Nothing on this day matches the site, search or attention filter you set.'
                : 'No site has a position scheduled on this date. Try another day, or check that sites and shifts are set up in Admin settings.'
            }}
          </p>
          <q-btn
            v-if="isFiltered"
            outline
            no-caps
            dense
            size="12px"
            icon="filter_alt_off"
            label="Clear filters"
            class="man-empty-btn"
            @click="$emit('clear-filters')"
          />
        </div>
      </template>
    </q-table>
  </div>
</template>

<script setup>
/**
 * The manning board: one row per site + position, with its shifts one click in.
 *
 * ── Why it looks like this ──────────────────────────────────────────────────
 * This is the third shape for this table, and the two it replaces are worth
 * recording so they are not rebuilt.
 *
 * It had eleven columns, five of which — not timed in, AWOL, leave, CTO, off —
 * held a zero on nearly every row of a normal day. Eight columns of "0" is not
 * information, and it buried the one non-zero figure that was the reason to open
 * the page. Those five are now a single Attention column that names only the
 * states somebody is actually in, and says "All present" in words when nobody
 * is. The row also stated the same thing four times — assigned 2, working 2, a
 * full bar, "2 / 2", a "Fully manned" chip. Each figure now appears once, and
 * the bar belongs to working alone.
 *
 * Then it grouped rows under collapsible site heading rows. That broke the
 * column grid: the headings spanned every column, so their own right-aligned
 * totals sat under the "Attention" label, and with the sites collapsed the
 * header strip stood over no data at all. The grouping is gone. The site is a
 * column like any other, repeated per row, so a header cell can only ever
 * describe the cells beneath it and no row depends on the one above it.
 *
 * The trade is per-site subtotals, which the summary tiles above the table and
 * the site filter in the toolbar cover between them.
 *
 * ── Sorting ─────────────────────────────────────────────────────────────────
 * Client-side over the full row set, which is safe here because the endpoint
 * returns the whole day in one response and this table is not paginated — there
 * is no page slice for a sort to reorder only part of. Attention sorts by how
 * urgent a row is, and ascending is worst-first, so the obvious single click
 * brings the rows that need a person to the top.
 */
import { computed, ref } from 'vue'
import { attentionChips, mannedTarget, statusRank } from 'src/composables/utils/manning'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import ManningMeter from '@/components/pages/Manning/ManningMeter.vue'
import ManningShiftBreakdown from '@/components/pages/Manning/ManningShiftBreakdown.vue'

const props = defineProps({
  /** Normalised rows, already filtered by the page. */
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  /** Whether any position on the board carries a headcount requirement. */
  showRequired: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
})

defineEmits(['clear-filters'])

// `rowsPerPage: 0` shows every row; `sortBy: null` keeps the backend's own
// order, which already lists a site's positions together.
const pagination = ref({ sortBy: null, descending: false, page: 1, rowsPerPage: 0 })

const columns = computed(() => {
  const cols = [
    {
      name: 'site',
      label: 'Site',
      field: 'site',
      align: 'left',
      sortable: true,
      style: 'width: 200px',
      headerStyle: 'width: 200px',
    },
    {
      name: 'position',
      label: 'Position',
      field: 'position',
      align: 'left',
      sortable: true,
      style: 'width: 210px',
      headerStyle: 'width: 210px',
    },
  ]

  if (props.showRequired) {
    cols.push({
      name: 'needed',
      label: 'Required',
      // Sorts unset requirements to one end rather than mixing them through the
      // middle, which is what a null would do.
      field: (row) => (row.needed === null ? -1 : row.needed),
      align: 'right',
      sortable: true,
      style: 'width: 96px',
      headerStyle: 'width: 96px',
      hint: 'Headcount this position asks for. A dash means no requirement is set.',
    })
  }

  cols.push(
    {
      name: 'assigned',
      label: 'Assigned',
      field: 'assigned',
      align: 'right',
      sortable: true,
      style: 'width: 100px',
      headerStyle: 'width: 100px',
      hint: 'People the schedule put on a shift here today',
    },
    {
      name: 'working',
      label: 'Working',
      field: 'working',
      align: 'left',
      sortable: true,
      style: 'width: 170px',
      headerStyle: 'width: 170px',
      hint: props.showRequired
        ? 'Timed in and on the floor, against the requirement where there is one and against the number assigned where there is not'
        : 'Timed in and on the floor, against the number assigned',
    },
    {
      name: 'attention',
      label: 'Attention',
      field: statusRank,
      align: 'left',
      sortable: true,
      hint: 'Anyone missing, short or accounted for elsewhere. Sort this column to bring problems to the top.',
    },
  )

  return cols
})

// The attention column absorbs whatever is left over; the rest are fixed, so the
// minimum is those plus a floor for the chips.
const ATTENTION_MIN = 250
const FIXED_WIDTHS = { site: 200, position: 210, needed: 96, assigned: 100, working: 170 }
const minWidth = computed(
  () =>
    ATTENTION_MIN + columns.value.reduce((total, col) => total + (FIXED_WIDTHS[col.name] ?? 0), 0),
)

// ─── Expansion ────────────────────────────────────────────────────────────────
// Held here rather than on the row objects: the rows are rebuilt on every fetch,
// and state written onto them would be lost each time the day changed.
const expanded = ref(new Set())

function isExpanded(key) {
  return expanded.value.has(key)
}

function toggle(row) {
  if (!row.shifts.length) return
  const next = new Set(expanded.value)
  if (next.has(row.key)) next.delete(row.key)
  else next.add(row.key)
  expanded.value = next
}
</script>

<style scoped>
.man-table-wrap {
  width: 100%;
}

/* ── Site ── */
.man-site {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
}

/* A quiet mark, not a coloured badge: it repeats on every row, and at that
   frequency any saturated element becomes the texture of the whole table. */
.man-site__icon {
  color: var(--dash-ink-4);
  flex-shrink: 0;
}

/* ── Position ── */
.man-row {
  cursor: pointer;
}
.man-row--open > td {
  background: var(--dash-n-25);
}

.man-position {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  width: 100%;
  padding: 2px 4px 2px 0;
  border: none;
  border-radius: var(--dash-r-sm);
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  text-align: left;
}
.man-position--static {
  cursor: default;
}
.man-position:focus-visible {
  outline: 2px solid var(--dash-accent);
  outline-offset: 1px;
}

.man-position__chevron {
  color: var(--dash-ink-4);
  flex-shrink: 0;
}
/* Keeps a shiftless row's name on the same left edge as the rest. */
.man-position__chevron-gap {
  width: 16px;
  flex-shrink: 0;
}

.man-position__name {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Only shown above one shift: "1 shift" on every row was noise, and the chevron
   already says there is something to open. */
.man-position__shifts {
  font-size: 11px;
  color: var(--dash-ink-4);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Figures ── */
.man-strong {
  color: var(--dash-ink);
  font-weight: 500;
}

.man-dash {
  color: var(--dash-ink-4);
}

/* ── Attention ── */
.man-flags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.man-flag {
  font-size: 11.5px;
  padding: 2px 8px 2px 6px;
}

.man-ok {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  color: var(--dash-ink-4);
}

/* ── Shift breakdown ── */
.man-detail-row > td {
  background: var(--dash-n-25);
}

.man-detail-cell {
  padding: 0 12px 4px !important;
  border-bottom: 1px solid var(--dash-line-soft) !important;
}

.man-empty-btn {
  border-color: var(--dash-line-strong);
  color: var(--dash-ink-2);
  border-radius: var(--dash-r-md);
}
</style>

<style>
/* Tooltips teleport to the body. */
.man-tip {
  background: var(--dash-n-800);
  color: #fff;
  font-size: 11.5px;
  padding: 5px 9px;
  border-radius: var(--dash-r-sm);
  max-width: 260px;
}
</style>
