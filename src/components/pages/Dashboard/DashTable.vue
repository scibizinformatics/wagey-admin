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
      class="dash-table__row"
      role="row"
      :style="widthStyle"
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
   * [{ key, label, flex?, width?, align?, num?, strong? }]
   * `num` right-aligns and applies tabular figures; `strong` promotes the ink.
   */
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  /** Field to key rows by. Falls back to the index. */
  rowKey: { type: String, default: '' },
  /** Minimum width before the table starts scrolling horizontally. */
  minWidth: { type: Number, default: 0 },
})

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
