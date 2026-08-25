<template>
  <div class="ann-tbl">
    <!-- Loading. Built from `visibleColumns`, the same list the table below
         renders, so the placeholder's columns are the table's columns at every
         width — including the one where "Type" is dropped. -->
    <TableSkeleton v-if="loading" :columns="visibleColumns" :rows="5" flush />

    <!-- Empty -->
    <div v-else-if="!rows.length" class="dash-empty">
      <span class="dash-featured-icon">
        <q-icon :name="isFiltered ? 'filter_alt_off' : 'o_campaign'" size="20px" />
      </span>
      <p class="dash-empty__title">
        {{ isFiltered ? 'Nothing matches this filter' : 'No announcements yet' }}
      </p>
      <p class="dash-empty__sub">
        {{
          isFiltered
            ? 'No announcement matches what you typed or the filters you picked.'
            : 'Post an announcement and it appears here with its audience and schedule.'
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
        class="ann-tbl__empty-btn"
        @click="$emit('clear-filters')"
      />
    </div>

    <!-- Grid -->
    <div v-else class="ann-tbl__scroll dash-scroll-x">
      <q-table
        :rows="rows"
        :columns="visibleColumns"
        row-key="id"
        flat
        hide-pagination
        :rows-per-page-options="[0]"
        class="dash-qtable ann-grid"
      >
        <template v-slot:header="props">
          <q-tr :props="props">
            <q-th key="announcement" :props="props">Announcement</q-th>
            <q-th v-if="showType" key="type" :props="props">Type</q-th>
            <q-th key="audience" :props="props">Audience</q-th>
            <q-th key="window" :props="props">Schedule</q-th>
            <q-th key="state" :props="props">Status</q-th>
            <q-th key="actions" :props="props" class="num">&nbsp;</q-th>
          </q-tr>
        </template>

        <template v-slot:body="props">
          <q-tr
            :props="props"
            class="dash-qtable__row dash-qtable__row--clickable ann-row"
            :class="{
              'ann-row--urgent': props.row.announcement_type === 'urgent',
              'ann-row--off':
                props.row._state.key === 'inactive' || props.row._state.key === 'ended',
            }"
            tabindex="0"
            @click="$emit('edit', props.row)"
            @keydown.enter.prevent="$emit('edit', props.row)"
          >
            <!-- Title and message share one cell. As two columns the message got
                 a 260px box it could never fill usefully, and the title column
                 stayed half empty beside it. -->
            <q-td key="announcement" :props="props" class="strong">
              <p class="subject__title">{{ props.row.title || 'Untitled' }}</p>
              <p class="subject__message">{{ props.row.message }}</p>
            </q-td>

            <q-td v-if="showType" key="type" :props="props">
              <span class="type-tag">
                <span class="type-tag__dot" :style="{ background: props.row._type.mark }" />
                {{ props.row._type.label }}
              </span>
            </q-td>

            <q-td key="audience" :props="props">
              <span v-if="props.row._audience.everyone" class="audience audience--all">
                <q-icon name="o_groups" size="15px" />
                Everyone
              </span>
              <span v-else class="audience">
                <span class="audience__summary">{{ props.row._audience.summary }}</span>
                <span v-if="props.row._audience.names.length" class="audience__names">
                  {{ props.row._audience.names.slice(0, 2).join(', ') }}
                  <template v-if="props.row._audience.names.length > 2">
                    +{{ props.row._audience.names.length - 2 }}
                  </template>
                </span>
                <q-tooltip
                  v-if="props.row._audience.detail"
                  anchor="bottom middle"
                  self="top middle"
                  max-width="280px"
                >
                  {{ props.row._audience.detail }}
                </q-tooltip>
              </span>
            </q-td>

            <q-td key="window" :props="props">
              <span class="window">{{ windowLabel(props.row) }}</span>
              <span class="window__note" :class="noteClass(props.row)">
                {{ windowNote(props.row) }}
              </span>
            </q-td>

            <q-td key="state" :props="props">
              <span class="dash-chip" :class="chipClass(props.row._state.tone)">
                <span class="dash-chip__dot" />
                {{ props.row._state.label }}
              </span>
            </q-td>

            <q-td key="actions" :props="props" class="num">
              <div class="row-actions">
                <q-btn
                  flat
                  dense
                  round
                  size="sm"
                  icon="o_edit"
                  class="row-action"
                  :aria-label="`Edit ${props.row.title}`"
                  @click.stop="$emit('edit', props.row)"
                >
                  <q-tooltip anchor="bottom right" self="top right">Edit</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  dense
                  round
                  size="sm"
                  icon="o_delete"
                  class="row-action row-action--danger"
                  :aria-label="`Delete ${props.row.title}`"
                  @click.stop="$emit('delete', props.row)"
                >
                  <q-tooltip anchor="bottom right" self="top right">Delete</q-tooltip>
                </q-btn>
              </div>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </div>
  </div>
</template>

<script setup>
/**
 * Desktop and laptop view of the announcement board. Below 1024px the page
 * swaps this for AnnouncementCardList.
 *
 * Rows arrive carrying `_state`, `_type` and `_audience` from the page, so the
 * state a row shows is the value the page filtered and counted on.
 *
 * Editing and deleting live here. Both dialogs existed before this pass but
 * nothing on the page could open them: the table had no action column, so
 * `editingAnnouncement` was only ever set to null and `announcementToDelete`
 * was never set at all.
 */
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import { chipClass, windowLabel, windowNote } from './announcementStatus'

defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
})

defineEmits(['edit', 'delete', 'clear-filters'])

const columns = [
  { name: 'announcement', label: 'Announcement', field: 'title', align: 'left' },
  { name: 'type', label: 'Type', field: 'announcement_type', align: 'left' },
  { name: 'audience', label: 'Audience', field: 'target_everyone', align: 'left' },
  { name: 'window', label: 'Schedule', field: 'start_at', align: 'left' },
  { name: 'state', label: 'Status', field: (row) => row._state.key, align: 'left' },
  { name: 'actions', label: '', field: 'id', align: 'right' },
]

const $q = useQuasar()

/**
 * Type drops first below 1280: the toolbar carries a type filter, and an urgent
 * row still shows its red rail. Decided here rather than in a CSS
 * `display: none`, so the loading placeholder cannot draw a column the table
 * then declines to render.
 */
const showType = computed(() => $q.screen.width >= 1280)

const visibleColumns = computed(() =>
  showType.value ? columns : columns.filter((col) => col.name !== 'type'),
)

/** Amber only while something is about to change; grey once it has. */
const noteClass = (row) => {
  const key = row._state.key
  if (key === 'ended' || key === 'inactive') return 'window__note--past'
  const note = windowNote(row)
  if (note.startsWith('ends today') || note.startsWith('ends tomorrow')) return 'window__note--soon'
  return ''
}
</script>

<style scoped>
.ann-tbl__scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.ann-grid {
  width: 100%;
}

/* The one row-level accent, kept from the old table: an urgent announcement is
   findable without reading the type column. */
.ann-row--urgent > td:first-child {
  box-shadow: inset 3px 0 0 var(--dash-critical-mark);
}

/* ── Subject ── */
.subject__title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  line-height: 1.35;
}
/* Two lines, clamped. A one-line clamp cut most messages mid-clause; three made
   row heights vary too much to scan down the status column. */
.subject__message {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 2px 0 0;
  max-width: 420px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--dash-ink-3);
}

/* ── Type ── */
.type-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: var(--dash-r-sm);
  background: var(--dash-n-50);
  border: 1px solid var(--dash-line);
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dash-ink-2);
  white-space: nowrap;
}
/* Tone rides on a 6px dot rather than tinting the whole tag: four tinted tags
   down a column competed with the status chips beside them. */
.type-tag__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
}

/* ── Audience ── */
.audience {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.audience--all {
  flex-direction: row;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--dash-ink-2);
}
.audience__summary {
  font-size: 12.5px;
  color: var(--dash-ink-2);
  white-space: nowrap;
}
.audience__names {
  margin-top: 1px;
  max-width: 190px;
  font-size: 11px;
  color: var(--dash-ink-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Schedule ── */
.window {
  display: block;
  font-size: 12.5px;
  color: var(--dash-ink-2);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.window__note {
  display: block;
  margin-top: 1px;
  font-size: 11px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}
.window__note--soon {
  color: var(--dash-warn);
  font-weight: 500;
}
.window__note--past {
  color: var(--dash-ink-4);
}

/* ── Actions ── */
.row-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.row-action {
  color: var(--dash-ink-4);
}
.row-action:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
}
.row-action--danger:hover {
  color: var(--dash-critical);
  background: var(--dash-critical-bg);
}

.ann-tbl__empty-btn {
  margin-top: 4px;
  color: var(--dash-ink-2);
  border-color: var(--dash-line-strong);
}

/* ── Laptop ──
   Cell padding is stepped by `dash-qtable` for every table in the product; the
   dropped column is decided in script so the skeleton agrees with the table. */
@media (max-width: 1279px) {
  .subject__message {
    max-width: 300px;
  }
  .audience__names {
    max-width: 150px;
  }
}
</style>
