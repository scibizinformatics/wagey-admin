<template>
  <div
    class="dash-tskel"
    :class="[{ 'dash-tskel--flush': flush, 'dash-tskel--compact': compact }, wrapClass]"
    role="status"
    :aria-label="ariaLabel"
  >
    <table class="dash-tskel__table" :style="tableStyle">
      <thead>
        <tr>
          <th
            v-for="col in resolved"
            :key="`h-${col.key}`"
            :class="col.cellClass"
            :style="col.cellStyle"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="`r-${row}`">
          <td
            v-for="col in resolved"
            :key="`c-${row}-${col.key}`"
            :class="col.cellClass"
            :style="col.cellStyle"
          >
            <span class="dash-shimmer dash-tskel__bar" :style="{ width: barWidth(col, row) }" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
/**
 * Loading state for any `dash-qtable`.
 *
 * Takes the same column definitions the live QTable is given, and renders a real
 * <table> from them. That is the whole point: the placeholder's column edges,
 * labels and alignment are derived from the same source as the table that
 * replaces it, so nothing shifts on load.
 *
 * What it replaces, per page, was a hand-built stack of flex rows whose cells
 * were `flex: 1`. Those could never line up with a table whose columns size to
 * their content, and because the column list was retyped by hand they also drifted
 * out of step — the departments skeleton listed four columns above a three-column
 * table, and the contract-types one listed six headers above ten body cells.
 */
import { computed } from 'vue'

const props = defineProps({
  /**
   * QTable column definitions, or any objects carrying `{ name, label, align,
   * width, minWidth, headerClasses }`. Passing the live `columns` array is the
   * intended use.
   */
  columns: { type: Array, required: true },
  /** How many placeholder rows to draw. */
  rows: { type: Number, default: 5 },
  /** Match `dash-qtable--flush`: no top padding on the header strip. */
  flush: { type: Boolean, default: false },
  /** Match `dash-qtable--compact`: the in-dialog density. */
  compact: { type: Boolean, default: false },
  /** Mirrors the live table's own `min-width`, so the skeleton scrolls the same. */
  minWidth: { type: [Number, String], default: null },
  wrapClass: { type: [String, Array, Object], default: '' },
  ariaLabel: { type: String, default: 'Loading table' },
})

const tableStyle = computed(() => {
  if (props.minWidth === null || props.minWidth === '') return null
  const value = typeof props.minWidth === 'number' ? `${props.minWidth}px` : props.minWidth
  return { minWidth: value }
})

/** Matches `.dash-qtable`'s own actions column, so the right edge of the
 *  placeholder grid is anchored even when a caller supplies no widths at all. */
const ACTIONS_WIDTH = 56

/** A declared width is honoured as a minimum as well as a target: a 38px check
 *  column has to stay 38px in the placeholder or the grid shifts on load. */

function widthStyle(col, isActions) {
  const width = col.width ?? col.minWidth ?? (isActions ? ACTIONS_WIDTH : null)
  if (width === undefined || width === null) return undefined
  const value = typeof width === 'number' ? `${width}px` : width
  return { width: value, minWidth: value }
}

const resolved = computed(() =>
  props.columns.map((col, index) => {
    const align = col.align ?? 'left'
    const classes = []
    if (align === 'right') classes.push('num')
    if (align === 'center') classes.push('center')
    // An actions column has no label and no meaningful placeholder width.
    const isActions = col.name === 'actions' || col.type === 'actions'
    return {
      key: col.name ?? `col-${index}`,
      // The label is printed, not shimmered: it is known before the data is, and
      // showing it means the reader can already tell what is loading.
      label: isActions ? '' : (col.label ?? ''),
      index,
      isActions,
      // A narrow fixed-width column gets a small centred bar rather than a
      // percentage one, which at 38px would round to a sliver.
      narrow: Number(col.width ?? col.minWidth ?? 0) > 0 && Number(col.width ?? col.minWidth) <= 60,
      cellClass: classes,
      cellStyle: widthStyle(col, isActions),
    }
  }),
)

/**
 * Deterministic bar widths. Varying them keeps the block from reading as a
 * loaded table of identical values, and deriving the variation from the column
 * and row index rather than `Math.random()` means the placeholder does not
 * reflow on every re-render.
 */
const RATIOS = [72, 54, 84, 46, 64, 78, 58]

function barWidth(col, row) {
  if (col.isActions) return '16px'
  if (col.narrow) return '60%'
  return `${RATIOS[(col.index * 3 + row) % RATIOS.length]}%`
}
</script>
