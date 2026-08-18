<template>
  <section class="dash-panel table-card">
    <!-- ── Toolbar ── -->
    <div v-if="title || searchable || $slots.actions || $slots.tabs" class="table-card__bar">
      <div class="table-card__lead">
        <h2 v-if="title" class="table-card__title">{{ title }}</h2>
        <span v-if="!loading && total" class="table-card__count dash-num">
          {{ total }} {{ total === 1 ? unitLabel : unitLabelPlural }}
        </span>
      </div>

      <!-- Actions sit to the left of the search field, and the group never wraps:
           the action keeps its width while search absorbs whatever is left, so
           the button holds one position at every viewport instead of dropping
           onto a second line when the row runs short. -->
      <div class="table-card__tools">
        <div v-if="$slots.actions" class="table-card__actions">
          <slot name="actions" />
        </div>

        <q-input
          v-if="searchable"
          ref="searchRef"
          :model-value="search"
          :placeholder="searchPlaceholder"
          dense
          outlined
          clearable
          hide-bottom-space
          debounce="250"
          class="table-card__search dash-field"
          @update:model-value="(v) => emit('update:search', v ?? '')"
        >
          <template #prepend>
            <q-icon name="search" size="18px" />
          </template>
        </q-input>
      </div>
    </div>

    <!-- Filter tabs, when a step has them. -->
    <div v-if="$slots.tabs" class="table-card__tabs">
      <slot name="tabs" />
    </div>

    <!-- ── Table ── -->
    <div class="table-card__scroll">
      <slot />
    </div>

    <!-- ── Footer ── -->
    <footer v-if="total > 0" class="table-card__foot">
      <div class="table-card__foot-left">
        <span class="table-card__range dash-num">
          {{ rangeStart }}–{{ rangeEnd }} of {{ total }}
        </span>
        <q-select
          :model-value="pageSize"
          :options="pageSizeOptions.map((n) => ({ label: `${n} per page`, value: n }))"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          dense
          outlined
          hide-bottom-space
          :popup-content-class="'disb-popup'"
          class="table-card__size dash-field"
          @update:model-value="(v) => emit('update:pageSize', v)"
        />
      </div>

      <q-pagination
        :model-value="page"
        :max="maxPages"
        :max-pages="$q.screen.lt.md ? 3 : 6"
        boundary-numbers
        direction-links
        :ripple="false"
        icon-first="first_page"
        icon-prev="chevron_left"
        icon-next="chevron_right"
        icon-last="last_page"
        class="table-card__pager"
        @update:model-value="(v) => emit('update:page', v)"
      />
    </footer>
  </section>
</template>

<script setup>
/**
 * The list card shared by the disbursement steps: toolbar, table slot, and a
 * pagination footer.
 *
 * Four of the five steps rendered this same arrangement — a section heading, a
 * q-table, then a `.pagination-bar` of range text, a page-size select and a
 * q-pagination — each with its own copy of the CSS. This holds one copy.
 *
 * Search and paging are exposed as v-model props (`search`, `page`, `pageSize`)
 * so the owning page keeps its own state and filtering logic; this component only
 * renders the controls.
 */
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const props = defineProps({
  title: { type: String, default: '' },
  /** Total rows *after* filtering — drives the range text and the footer. */
  total: { type: Number, default: 0 },
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 10 },
  pageSizeOptions: { type: Array, default: () => [10, 20, 50] },
  loading: { type: Boolean, default: false },
  searchable: { type: Boolean, default: false },
  search: { type: String, default: '' },
  searchPlaceholder: { type: String, default: 'Search' },
  unitLabel: { type: String, default: 'row' },
  unitLabelPlural: { type: String, default: 'rows' },
})

const emit = defineEmits(['update:search', 'update:page', 'update:pageSize'])

const searchRef = ref(null)

const maxPages = computed(() => Math.ceil(props.total / props.pageSize) || 1)
const rangeStart = computed(() => (props.total ? (props.page - 1) * props.pageSize + 1 : 0))
const rangeEnd = computed(() => Math.min(props.page * props.pageSize, props.total))

defineExpose({ focusSearch: () => searchRef.value?.focus() })
</script>

<style scoped>
.table-card {
  overflow: hidden;
}

/* ── Toolbar ── */
.table-card__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 56px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--dash-line);
  flex-wrap: wrap;
}

.table-card__lead {
  display: flex;
  align-items: baseline;
  gap: 9px;
  min-width: 0;
  flex-shrink: 0;
}

.table-card__title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.008em;
  color: var(--dash-ink);
}

.table-card__count {
  font-size: 12.5px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}

/* `nowrap` is the whole fix: with wrapping allowed, a row too narrow for
   action-plus-search pushed the action onto its own line below the field. Now the
   group stays on one line and the search field takes the squeeze instead. */
.table-card__tools {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1 1 320px;
  min-width: 0;
  justify-content: flex-end;
  flex-wrap: nowrap;
}

/* The action group holds its natural width. */
.table-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* Search gives up width first, down to a floor that still shows a few
   characters. */
.table-card__search {
  flex: 1 1 auto;
  min-width: 116px;
  max-width: 300px;
}
.table-card__search :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.table-card__search :deep(.q-field__native) {
  font-size: 13px;
  color: var(--dash-ink);
}
.table-card__search :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

/* ── Tabs ── */
.table-card__tabs {
  padding: 10px 16px;
  border-bottom: 1px solid var(--dash-line);
  background: var(--dash-n-25);
  overflow-x: auto;
}

/* ── Table ──────────────────────────────────────────────────────────────────
   The card styles whatever q-table it holds, so the five steps no longer each
   carry their own copy of header/cell/hover rules under a page-specific class
   (.review-table, .payslip-table, .disburse-table, .complete-table, …). */
.table-card__scroll {
  overflow-x: auto;
  padding: 0 6px;
}

.table-card__scroll :deep(.q-table__container),
.table-card__scroll :deep(.q-table__card),
.table-card__scroll :deep(.q-table) {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  background: transparent;
}

/* Sentence-case label strip over a hairline — no filled grey band. */
.table-card__scroll :deep(.q-table thead th) {
  font-size: 12px;
  font-weight: 500;
  color: var(--dash-ink-3);
  padding: 0 12px 11px;
  background: transparent;
  border-bottom: 1px solid var(--dash-line);
  white-space: nowrap;
}

.table-card__scroll :deep(.q-table tbody td) {
  padding: 12px;
  font-size: 13px;
  color: var(--dash-ink-2);
  border-bottom: 1px solid var(--dash-line-soft);
  vertical-align: middle;
}
.table-card__scroll :deep(.q-table tbody tr:last-child td) {
  border-bottom: none;
}
.table-card__scroll :deep(.q-table tbody tr:hover td) {
  background: var(--dash-n-50);
}

/* Every figure column reads as figures: right-aligned and tabular, so a column
   of pesos lines up on its decimal rather than ragging. */
.table-card__scroll :deep(.q-table th.text-right),
.table-card__scroll :deep(.q-table td.text-right) {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.table-card__scroll :deep(.q-table th.text-center),
.table-card__scroll :deep(.q-table td.text-center) {
  font-variant-numeric: tabular-nums;
}

/* The employee name is the row's subject, so it carries the weight. */
.table-card__scroll :deep(.q-table tbody td:first-child) {
  color: var(--dash-ink);
  font-weight: 500;
}

.table-card__scroll :deep(.q-table__progress) {
  height: 0;
}

@media (max-width: 1279px) {
  .table-card__scroll :deep(.q-table thead th) {
    padding: 0 9px 10px;
  }
  .table-card__scroll :deep(.q-table tbody td) {
    padding: 11px 9px;
  }
}

/* ── Footer ── */
.table-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 11px 16px;
  border-top: 1px solid var(--dash-line);
  background: var(--dash-n-25);
  flex-wrap: wrap;
}

.table-card__foot-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.table-card__range {
  font-size: 12.5px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}

.table-card__size {
  width: 132px;
}
.table-card__size :deep(.q-field__control) {
  height: 32px;
  min-height: 32px;
  border-radius: var(--dash-r-sm);
  background: var(--dash-surface);
}
.table-card__size :deep(.q-field__native) {
  font-size: 12.5px;
  color: var(--dash-ink-2);
  min-height: 32px;
  padding: 0;
}
.table-card__size :deep(.q-field__marginal) {
  height: 32px;
  color: var(--dash-ink-4);
}

.table-card__pager :deep(.q-btn) {
  min-width: 30px;
  min-height: 30px;
  border-radius: var(--dash-r-sm);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-3);
}
.table-card__pager :deep(.q-btn:hover) {
  background: var(--dash-n-100);
  color: var(--dash-ink);
}
.table-card__pager :deep(.q-btn--active) {
  background: var(--dash-surface);
  border: 1px solid var(--dash-line-strong);
  color: var(--dash-ink);
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs);
}

@media (max-width: 1023px) {
  .table-card__bar,
  .table-card__tabs,
  .table-card__foot {
    padding: 10px 14px;
  }
  /* Tools take the full width under the title, still on one line together. */
  .table-card__tools {
    flex: 1 1 100%;
    justify-content: flex-start;
  }
  .table-card__search {
    max-width: none;
  }
  .table-card__count {
    display: none;
  }
}

/* Phone width is the one place the pair may stack: below roughly 520px a button
   and a usable search field cannot share a line. */
@media (max-width: 520px) {
  .table-card__tools {
    flex-wrap: wrap;
  }
  .table-card__actions {
    width: 100%;
  }
  .table-card__actions :deep(.q-btn) {
    flex: 1;
  }
  .table-card__search {
    flex: 1 1 100%;
  }
}

@media (max-width: 640px) {
  .table-card__foot {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .table-card__foot-left {
    justify-content: space-between;
  }
  .table-card__pager {
    align-self: center;
  }
}
</style>
