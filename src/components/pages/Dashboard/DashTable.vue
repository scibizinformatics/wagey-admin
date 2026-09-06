<template>
  <div class="dash-table" role="table">
    <div class="dash-table__head" role="row" :style="widthStyle">
      <div
        v-for="col in columns"
        :key="col.key"
        class="dash-table__th"
        role="columnheader"
        :style="colStyle(col)"
      >
        {{ col.label }}
      </div>
    </div>

    <div
      v-for="(row, i) in rows"
      :key="rowKey ? row[rowKey] : i"
      :class="['dash-table__row', { 'dash-table__row--clickable': rowClickable }]"
      role="row"
      :style="widthStyle"
      :tabindex="rowClickable ? 0 : undefined"
      :aria-label="rowClickable && rowLabel ? rowLabel(row) : undefined"
      @click="onRowActivate(row, i)"
      @keydown="onRowKey($event, row, i)"
    >
      <div
        v-for="col in columns"
        :key="col.key"
        :class="['dash-table__td', { 'dash-table__td--num': col.num, 'dash-table__td--strong': col.strong }]"
        role="cell"
        :style="colStyle(col)"
      >
        <slot :name="`cell-${col.key}`" :row="row" :index="i" :value="row[col.key]">
          {{ row[col.key] }}
        </slot>
      </div>
    </div>

    <div v-if="$slots.total" class="dash-table__total" role="row" :style="widthStyle">
      <slot name="total" :col-style="colStyle" />
    </div>
  </div>
</template>

<script setup>
/**
 * The list language shared by every table-shaped dashboard panel.
 *
 * Panels previously each hand-rolled a flex header + rows with inline
 * `style="flex: 1.2"` on every single cell, duplicated between the real table
 * and its skeleton. Column weights are now declared once, in `columns`, and the
 * skeleton reads the same shape.
 *
 * Built from flex rows rather than a real <table> because the panels need to
 * scroll horizontally inside a fixed-width card while keeping sticky headers —
 * ARIA roles restore the semantics a <table> would have given for free.
 */
import { computed } from 'vue'

const props = defineProps({
  /**
   * [{ key, label, flex?, width?, minWidth?, align?, num?, strong? }]
   * `num` right-aligns and applies tabular figures; `strong` promotes the ink.
   *
   * `minWidth` is the floor for a column that still wants to share the spare
   * space. Cells are `overflow: hidden`, so a column holding something that
   * cannot reflow — a chip, a pill, a badge — silently clips it once the panel
   * gets narrow enough. A floor sized to the longest item is what stops that,
   * while `flex` keeps the column growing on a wide screen.
   */
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  /** Field to key rows by. Falls back to the index. */
  rowKey: { type: String, default: '' },
  /** Minimum width before the table starts scrolling horizontally. */
  minWidth: { type: Number, default: 0 },
  /**
   * Makes each row open something — cursor, keyboard reachability and the
   * `row-click` event travel together, so a panel cannot end up clickable by
   * mouse and dead to the keyboard.
   */
  rowClickable: { type: Boolean, default: false },
  /**
   * `(row) => string` for the accessible name of a clickable row. Without it a
   * screen reader announces the cells and nothing about what activating the
   * row would do, which is the whole point of the affordance.
   */
  rowLabel: { type: Function, default: null },
})

const emit = defineEmits(['row-click'])

function onRowActivate(row, index) {
  if (!props.rowClickable) return
  emit('row-click', row, index)
}

// Enter and Space, the two keys that activate anything. Handled here rather
// than with `@keydown.enter.prevent` on the row, because that modifier would
// call preventDefault on every panel's rows — including the five that are not
// clickable — and swallow the key from anything focusable inside a cell.
function onRowKey(event, row, index) {
  if (!props.rowClickable) return
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  emit('row-click', row, index)
}

const widthStyle = computed(() =>
  props.minWidth ? { minWidth: `${props.minWidth}px` } : {},
)

function colStyle(col) {
  const style = {}
  if (col.width) {
    style.width = typeof col.width === 'number' ? `${col.width}px` : col.width
    style.flex = `0 0 ${style.width}`
  } else {
    style.flex = String(col.flex ?? 1)
  }
  // Overrides the `min-width: 0` the cell carries so it can ellipsise. Applied
  // to the header cell too, so the label strip stays aligned to the rows below
  // it once a floor is in play.
  if (col.minWidth) {
    style.minWidth = typeof col.minWidth === 'number' ? `${col.minWidth}px` : col.minWidth
  }
  if (col.align) style.textAlign = col.align
  else if (col.num) style.textAlign = 'right'
  return style
}
</script>

<style scoped>
/* `.dash-table*` classes live in src/css/dashboard.scss — this component only
   assembles them. `min-width` is bound per row in the template so the header,
   body rows and total column-align while the whole table scrolls as one unit. */
.dash-table {
  flex: 1;
}
</style>
