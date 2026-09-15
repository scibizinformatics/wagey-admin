<template>
  <div class="acc-tbl">
    <!-- Built from the same column list the table renders, so the placeholder's
         column edges are the table's and nothing shifts on load. -->
    <TableSkeleton v-if="loading" :columns="columns" :rows="8" :min-width="820" />

    <div v-else-if="!rows.length" class="dash-empty">
      <span class="dash-featured-icon">
        <q-icon :name="isFiltered ? 'filter_alt_off' : 'o_contactless'" size="20px" />
      </span>
      <p class="dash-empty__title">
        {{ isFiltered ? 'Nothing matches this filter' : 'No access cards yet' }}
      </p>
      <p class="dash-empty__sub">
        {{
          isFiltered
            ? 'No card matches what you typed, the status you picked, or who it is assigned to.'
            : 'Cards appear here the first time they are tapped on a reader. Assign one to an employee to let it through.'
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
        class="acc-tbl__empty-btn"
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
        class="dash-qtable acc-grid"
      >
        <template v-slot:header="props">
          <q-tr :props="props">
            <q-th key="uid" :props="props">Card</q-th>
            <q-th key="holder" :props="props">Assigned to</q-th>
            <q-th key="status" :props="props">Status</q-th>
            <q-th key="lastTap" :props="props">Last tap</q-th>
            <q-th key="actions" :props="props" class="num">&nbsp;</q-th>
          </q-tr>
        </template>

        <template v-slot:body="props">
          <q-tr
            :props="props"
            class="dash-qtable__row dash-qtable__row--clickable"
            tabindex="0"
            @click="$emit('view', props.row)"
            @keydown.enter.prevent="$emit('view', props.row)"
          >
            <!-- The uid is the one thing on the row a person carries elsewhere —
                 into a door controller, into a ticket — so copying it is a click
                 rather than a select-and-drag across fourteen hex digits. What
                 is copied is the raw value, not the spaced one on screen. -->
            <q-td key="uid" :props="props" class="strong">
              <button
                type="button"
                class="uid"
                :aria-label="`Copy card UID ${props.row.uid}`"
                @click.stop="$emit('copy', props.row)"
              >
                <span class="uid__text dash-num">{{ formatUid(props.row.uid) }}</span>
                <q-icon name="o_content_copy" size="13px" class="uid__icon" />
                <q-tooltip anchor="bottom middle" self="top middle">Copy UID</q-tooltip>
              </button>
              <span class="uid__type">{{ props.row.cardType.toUpperCase() }}</span>
            </q-td>

            <q-td key="holder" :props="props">
              <!-- Same construction as the Employees table: the photograph when
                   the name resolves to exactly one employee who has one,
                   otherwise initials on that person's identity colour. -->
              <div v-if="props.row.assigned" class="who">
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
              <span v-else class="free">Not yet assigned</span>
            </q-td>

            <!-- The warning sits against the status rather than in a column of
                 its own: it is a reading of the status and the holder together,
                 and a column for it would be empty on almost every row. -->
            <q-td key="status" :props="props">
              <span class="status">
                <span class="dash-chip" :class="chipClass(props.row.status.tone)">
                  <span class="dash-chip__dot" />
                  {{ props.row.status.label }}
                </span>
                <q-icon
                  v-if="props.row.alert"
                  name="o_warning"
                  size="16px"
                  class="status__alert"
                  :aria-label="props.row.alert.label"
                >
                  <q-tooltip anchor="bottom middle" self="top middle" max-width="240px">
                    {{ props.row.alert.label }} — {{ props.row.alert.detail }}
                  </q-tooltip>
                </q-icon>
              </span>
            </q-td>

            <q-td key="lastTap" :props="props" class="date">
              <template v-if="props.row.lastTapDay">
                <span class="stamp">{{ props.row.lastTapDay }}</span>
                <span class="stamp__sub">{{ props.row.lastTapAgo || props.row.lastTapTime }}</span>
              </template>
              <span v-else class="stamp__never">Never tapped</span>
            </q-td>

            <q-td key="actions" :props="props" class="num">
              <q-btn
                flat
                dense
                no-caps
                size="12px"
                :icon="props.row.assigned ? 'o_swap_horiz' : 'o_person_add'"
                :label="props.row.assigned ? 'Reassign' : 'Assign'"
                class="row-action"
                :aria-label="
                  props.row.assigned
                    ? `Reassign card ${props.row.uid}`
                    : `Assign card ${props.row.uid}`
                "
                @click.stop="$emit('assign', props.row)"
              />
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </div>
  </div>
</template>

<script setup>
/**
 * Desktop view of the access-card roll. Below 1024px the page swaps this for
 * AccessCardCardList — five columns inside a tablet's content width means a
 * sideways scroll on every row.
 *
 * Rows arrive already normalised by `composables/utils/accessCards.js` and
 * already carrying their avatar from the page, so what a row displays is the
 * same value the page filtered, sorted and counted on.
 */
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import { chipClass, formatUid } from 'src/composables/utils/accessCards'

defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
})

defineEmits(['view', 'assign', 'copy', 'clear-filters'])

// Sorting is the page's job, over the whole roll, so no column declares
// `sortable` — a header click here would only reorder the rows on screen and
// quietly answer a narrower question than it appears to.
const columns = [
  { name: 'uid', label: 'Card', field: 'uid', align: 'left', minWidth: 190 },
  { name: 'holder', label: 'Assigned to', field: 'employeeName', align: 'left', minWidth: 200 },
  { name: 'status', label: 'Status', field: (row) => row.status.key, align: 'left', width: 150 },
  { name: 'lastTap', label: 'Last tap', field: 'lastTapMs', align: 'left', width: 160 },
  { name: 'actions', label: '', field: 'key', align: 'right', width: 110 },
]
</script>

<style scoped>
.acc-grid {
  width: 100%;
  /* Below this the five columns start folding words; the container scrolls
     instead, with the always-drawn track `dash-scroll-x` supplies. */
  min-width: 820px;
}

/* ── Card UID ── */
.uid {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px 2px 7px;
  margin-left: -7px;
  border: 1px solid transparent;
  border-radius: var(--dash-r-sm);
  background: transparent;
  cursor: pointer;
  transition:
    background var(--dash-fast) var(--dash-ease),
    border-color var(--dash-fast) var(--dash-ease);
}
.uid:hover {
  background: var(--dash-n-50);
  border-color: var(--dash-line);
}
.uid__text {
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--dash-ink);
  white-space: nowrap;
}
.uid__icon {
  color: var(--dash-ink-4);
  flex: none;
}
.uid:hover .uid__icon {
  color: var(--dash-ink-2);
}
.uid__type {
  display: block;
  margin-top: 1px;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--dash-ink-4);
}

/* ── Holder ── */
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
/* Italic and dimmed rather than an em dash: a free card is a state somebody can
   act on, not a missing value. */
.free {
  font-size: 12.5px;
  font-style: italic;
  color: var(--dash-ink-4);
}

/* ── Status ── */
.status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.status__alert {
  color: var(--dash-warn);
  flex: none;
  cursor: help;
}

/* ── Last tap ── */
.stamp {
  display: block;
  font-size: 12.5px;
  color: var(--dash-ink-2);
  white-space: nowrap;
}
.stamp__sub {
  display: block;
  margin-top: 1px;
  font-size: 11px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}
.stamp__never {
  font-size: 12.5px;
  font-style: italic;
  color: var(--dash-ink-4);
  white-space: nowrap;
}

/* ── Row action ── */
.row-action {
  color: var(--dash-ink-2);
  font-weight: 500;
  padding: 0 8px;
}
.row-action:hover {
  color: var(--dash-accent);
}

.acc-tbl__empty-btn {
  margin-top: 4px;
  color: var(--dash-ink-2);
  border-color: var(--dash-line-strong);
}
</style>
