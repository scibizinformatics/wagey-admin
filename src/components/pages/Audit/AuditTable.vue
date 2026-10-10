<template>
  <div class="aud-tbl dash-page-body">
    <!-- Built from the same column list the table renders, so the placeholder's
         column edges are the table's and nothing shifts on load. -->
    <TableSkeleton v-if="loading" :columns="columns" :min-width="AUDIT_TABLE_MIN_WIDTH" />

    <div v-else-if="!rows.length" class="dash-empty">
      <span class="dash-featured-icon">
        <q-icon :name="isFiltered ? 'filter_alt_off' : 'o_history'" size="20px" />
      </span>
      <p class="dash-empty__title">
        {{ isFiltered ? 'Nothing matches this filter' : source.emptyTitle }}
      </p>
      <p class="dash-empty__sub">
        {{ isFiltered ? FILTERED_SUB : source.emptySub }}
      </p>
      <q-btn
        v-if="isFiltered"
        outline
        no-caps
        dense
        size="12px"
        icon="filter_alt_off"
        label="Clear filters"
        class="aud-tbl__empty-btn"
        @click="$emit('clear-filters')"
      />
    </div>

    <div v-else class="dash-scroll-x">
      <q-table
        :rows="rows"
        :columns="columns"
        row-key="key"
        flat
        hide-pagination
        :rows-per-page-options="[0]"
        class="dash-qtable aud-grid"
      >
        <template v-slot:header="props">
          <q-tr :props="props">
            <q-th key="employee" :props="props">{{ headings.employee }}</q-th>
            <q-th key="change" :props="props">{{ headings.change }}</q-th>
            <q-th key="move" :props="props">{{ headings.move }}</q-th>
            <q-th key="shiftDate" :props="props" class="date">{{ headings.shiftDate }}</q-th>
            <q-th key="updater" :props="props">{{ headings.updater }}</q-th>
            <q-th key="updatedAt" :props="props" class="date">{{ headings.updatedAt }}</q-th>
          </q-tr>
        </template>

        <template v-slot:body="props">
          <q-tr :props="props" class="dash-qtable__row">
            <q-td key="employee" :props="props" class="strong">
              <div class="who">
                <!-- Same construction as the Employees table: the photograph
                     when the name resolves to exactly one employee who has one,
                     otherwise initials on that person's identity colour. -->
                <q-avatar v-if="props.row.avatar?.pictureUrl" size="28px" class="who__avatar">
                  <img :src="props.row.avatar.pictureUrl" :alt="props.row.employeeName" />
                </q-avatar>
                <q-avatar
                  v-else
                  size="28px"
                  class="who__avatar"
                  :style="{ background: props.row.avatar?.color }"
                >
                  <span class="who__initials">{{ props.row.avatar?.initials || '?' }}</span>
                </q-avatar>
                <span class="who__name">{{ props.row.employeeName }}</span>
              </div>
            </q-td>

            <q-td key="change" :props="props">
              <span class="dash-chip" :class="chipClass(props.row.change.tone)">
                <span class="dash-chip__dot" />
                {{ props.row.change.label }}
              </span>
            </q-td>

            <!-- Both values in one cell rather than a "From" column that is empty on
                 every first entry. The move is the fact; the two names on their
                 own are not. -->
            <q-td key="move" :props="props">
              <span class="move">
                <span v-if="props.row.previousValue" class="move__from">
                  {{ props.row.previousValue }}
                </span>
                <q-icon
                  v-if="props.row.previousValue && props.row.newValue"
                  name="arrow_right_alt"
                  size="16px"
                  class="move__arrow"
                />
                <span v-if="props.row.newValue" class="move__to">{{ props.row.newValue }}</span>
                <span v-else class="move__none">{{ moveNoneLabel }}</span>
              </span>
            </q-td>

            <q-td key="shiftDate" :props="props" class="date">
              {{ props.row.dateLabel || '—' }}
            </q-td>

            <q-td key="updater" :props="props">
              {{ props.row.updaterName }}
            </q-td>

            <q-td key="updatedAt" :props="props" class="date">
              <span class="stamp">{{ props.row.updatedAtDay || '—' }}</span>
              <span v-if="props.row.updatedAtTime" class="stamp__time">
                {{ props.row.updatedAtTime }}
              </span>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </div>
  </div>
</template>

<script setup>
/**
 * Desktop view of an audit trail. Below 1024px the page swaps this for
 * AuditCardList — six columns inside a tablet's content width means a sideways
 * scroll on every row.
 *
 * Rows arrive already normalised by `composables/utils/auditRows.js`, which is
 * also what the card list reads, so the two cannot disagree about what a change
 * was. Nothing here is clickable: a trail entry is a statement of what happened,
 * and there is no record behind it to open.
 *
 * The `source` prop is a descriptor from `composables/utils/auditSources.js`, and
 * it supplies the column labels, the empty state and the "nothing here" wording.
 * Nothing in this template names a source: the row keys it reads are neutral, so
 * switching sources switches the words without touching the markup.
 */
import { computed } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import { chipClass } from 'src/composables/utils/auditRows'
import { AUDIT_TABLE_MIN_WIDTH } from 'src/composables/utils/auditSources'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
  /** A descriptor from `auditSources.js`. */
  source: { type: Object, required: true },
})

defineEmits(['clear-filters'])

// Sorting is the page's job, over the whole trail, so no column declares
// `sortable` — a header click here would only reorder the page slice on screen
// and quietly answer a narrower question than it appears to. The columns come
// from the descriptor so their labels follow the selected source.
const columns = computed(() => props.source.columns)

/** The cell beside the arrow, when a value was removed rather than changed. */
const moveNoneLabel = computed(() => props.source.moveNoneLabel)

/**
 * Header labels keyed by column name.
 *
 * Looked up rather than read by index: the body cells below are hand-written and
 * keyed by name, so a column reordered in the descriptor would otherwise put
 * "Contract" over a date column with no error anywhere.
 */
const headings = computed(() =>
  Object.fromEntries(props.source.columns.map((column) => [column.name, column.label])),
)

/**
 * The empty state under an active filter.
 *
 * One sentence for both sources: it describes what the reader did — typed, chose
 * a kind, picked dates — and none of those three controls mean anything specific
 * to shifts or contracts.
 */
const FILTERED_SUB =
  'No change matches what you typed, the kind you picked, or the dates you chose.'
</script>

<style scoped>
.aud-grid {
  width: 100%;
  /* Below this the six columns start folding words; the container scrolls
     instead, with the always-drawn track `dash-scroll-x` supplies. */
  min-width: 880px;
}

/* ── Employee ── */
.who {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.who__avatar {
  flex-shrink: 0;
}
.who__initials {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}
.who__name {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Shift move ── */
.move {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}
/* The shift being left is dimmed rather than struck through: it was real, it
   is simply no longer current, and a strikethrough reads as cancelled. */
.move__from {
  font-size: 12.5px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}
.move__arrow {
  color: var(--dash-ink-4);
  flex: none;
}
.move__to {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink);
  white-space: nowrap;
}
.move__none {
  font-size: 12.5px;
  font-style: italic;
  color: var(--dash-ink-4);
  white-space: nowrap;
}

/* ── Recorded ── */
.stamp {
  display: block;
  font-size: 12.5px;
  color: var(--dash-ink-2);
  white-space: nowrap;
}
.stamp__time {
  display: block;
  margin-top: 1px;
  font-size: 11px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}

.aud-tbl__empty-btn {
  margin-top: 4px;
  color: var(--dash-ink-2);
  border-color: var(--dash-line-strong);
}
</style>
