<template>
  <nav class="pager" aria-label="Pagination">
    <p class="pager__range">
      <span class="dash-num">{{ from }}–{{ to }}</span> of
      <span class="dash-num">{{ total }}</span><template v-if="noun"> {{ noun }}</template>
    </p>

    <div class="pager__nav">
      <button
        type="button"
        class="pager__btn"
        :disabled="page <= 1"
        aria-label="Previous page"
        @click="go(page - 1)"
      >
        <q-icon name="chevron_left" size="17px" />
      </button>
      <span class="pager__count">
        Page <span class="dash-num">{{ page }}</span> of <span class="dash-num">{{ pageCount }}</span>
      </span>
      <button
        type="button"
        class="pager__btn"
        :disabled="page >= pageCount"
        aria-label="Next page"
        @click="go(page + 1)"
      >
        <q-icon name="chevron_right" size="17px" />
      </button>
    </div>
  </nav>
</template>

<script setup>
/**
 * The pager shared by table-shaped dashboard panels.
 *
 * A panel whose queue can hold dozens of rows used to grow until it dwarfed
 * everything beside it, or scrolled inside its own body — both hide the size of
 * the queue. This states the count outright and keeps the panel a fixed height.
 *
 * It only slices the *view*: the owning panel must sort and filter its full
 * dataset before handing over a page, never the rows currently on screen.
 */
import { computed } from 'vue'

const props = defineProps({
  /** 1-based current page. */
  page: { type: Number, required: true },
  rowsPerPage: { type: Number, default: 6 },
  /** Length of the full (already sorted and filtered) dataset. */
  total: { type: Number, required: true },
  /** What the rows are, for the range read-out. Omitted when the panel head
      already names them. */
  noun: { type: String, default: '' },
})

const emit = defineEmits(['update:page'])

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.rowsPerPage)))
const from = computed(() => (props.total ? (props.page - 1) * props.rowsPerPage + 1 : 0))
const to = computed(() => Math.min(props.page * props.rowsPerPage, props.total))

function go(next) {
  const clamped = Math.min(Math.max(1, next), pageCount.value)
  if (clamped !== props.page) emit('update:page', clamped)
}
</script>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pager__range,
.pager__count {
  margin: 0;
  font-size: 12px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}

.pager__nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Hairline square controls rather than filled buttons: the pager is chrome, so
   it should sit quietly under the rows it moves. */
.pager__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--dash-line-strong);
  border-radius: var(--dash-r-sm);
  background: var(--dash-surface);
  color: var(--dash-ink-2);
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}

.pager__btn:hover:not(:disabled) {
  background: var(--dash-hover);
  border-color: var(--dash-n-400);
  color: var(--dash-ink);
}

.pager__btn:focus-visible {
  outline: 2px solid var(--dash-accent-ring);
  outline-offset: 1px;
}

.pager__btn:disabled {
  color: var(--dash-ink-4);
  border-color: var(--dash-line);
  background: var(--dash-n-50);
  cursor: default;
}

@media (max-width: 600px) {
  .pager__range {
    display: none;
  }
  .pager {
    justify-content: flex-end;
  }
}
</style>
