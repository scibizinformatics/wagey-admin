<template>
  <div class="dv-tbl dash-page-body">
    <!-- Built from the same column list the table renders, so the placeholder's
         column edges are the table's and nothing shifts on load. -->
    <TableSkeleton v-if="loading" :columns="columns" :min-width="920" />

    <div v-else-if="!rows.length" class="dash-empty">
      <span class="dash-featured-icon">
        <q-icon :name="isFiltered ? 'filter_alt_off' : 'o_devices'" size="20px" />
      </span>
      <p class="dash-empty__title">
        {{ isFiltered ? 'Nothing matches this filter' : 'No devices registered yet' }}
      </p>
      <p class="dash-empty__sub">
        {{
          isFiltered
            ? 'No device matches what you typed, or the status you picked.'
            : 'Devices appear here the first time an employee signs in to the Wagey app on one.'
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
        class="dv-tbl__empty-btn"
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
        class="dash-qtable dv-grid"
      >
        <template v-slot:header="props">
          <q-tr :props="props">
            <q-th key="employee" :props="props">Employee</q-th>
            <q-th key="device" :props="props">Device</q-th>
            <q-th key="status" :props="props">Status</q-th>
            <q-th key="registered" :props="props">Registered</q-th>
            <q-th key="lastSeen" :props="props">Last seen</q-th>
            <q-th key="actions" :props="props" class="actions">&nbsp;</q-th>
          </q-tr>
        </template>

        <template v-slot:body="props">
          <!-- The row itself does nothing. Its two actions live in the row menu,
               and the hover tint is deliberately absent so nothing about a row
               claims to be clickable — see the `dash-qtable__row` note in
               dashboard.scss. -->
          <q-tr :props="props">
            <q-td key="employee" :props="props" class="strong">
              <!-- Same construction as the Access Cards table: the photograph
                   when the roster places this person, otherwise initials on
                   their identity colour. -->
              <div class="who">
                <q-avatar v-if="props.row.avatar?.pictureUrl" size="28px" class="who__avatar">
                  <img :src="props.row.avatar.pictureUrl" :alt="ownerName(props.row)" />
                </q-avatar>
                <q-avatar
                  v-else
                  size="28px"
                  class="who__avatar"
                  :style="{ background: props.row.avatar?.color }"
                >
                  <span class="who__initials">{{ props.row.avatar?.initials || '?' }}</span>
                </q-avatar>
                <span class="who__name">{{ ownerName(props.row) }}</span>
              </div>
            </q-td>

            <q-td key="device" :props="props" class="strong">
              <div class="device">
                <span class="device__name">{{ props.row.deviceName || 'Unnamed device' }}</span>
                <!-- The uuid is the one value a support ticket or a server log
                     names the device by, so copying it is a click rather than a
                     select-and-drag across thirty-six hex digits. Clipped by
                     width with the full value on hover: never re-typed. -->
                <button
                  type="button"
                  class="uuid"
                  :aria-label="`Copy device UUID ${props.row.deviceUuid}`"
                  :disable="!props.row.deviceUuid"
                  @click="$emit('copy', props.row)"
                >
                  <span class="uuid__text dash-num">{{ props.row.deviceUuid }}</span>
                  <q-icon name="o_content_copy" size="13px" class="uuid__icon" />
                </button>
                <span class="device__type">
                  <q-icon :name="props.row.deviceType.icon" size="13px" />
                  {{ props.row.deviceType.label }}
                </span>
              </div>
            </q-td>

            <!-- The reason sits against the status rather than in a column of
                 its own: it is a reading of the status, and a column for it
                 would be empty on every active row. -->
            <q-td key="status" :props="props">
              <div class="status">
                <span class="dash-chip" :class="chipClass(props.row.status.tone)">
                  <span class="dash-chip__dot" />
                  {{ props.row.status.label }}
                </span>
                <span
                  v-if="props.row.deactivated && props.row.deactivatedReasonLabel"
                  class="status__why"
                >
                  {{ props.row.deactivatedReasonLabel }}
                  <template v-if="props.row.deactivatedLabel">
                    · {{ props.row.deactivatedLabel }}</template
                  >
                </span>
              </div>
            </q-td>

            <q-td key="registered" :props="props" class="date">
              <span v-if="props.row.registeredKnown" class="stamp dash-num">
                {{ props.row.registeredLabel }}
              </span>
              <span v-else class="stamp__none">—</span>
            </q-td>

            <q-td key="lastSeen" :props="props" class="date">
              <!-- Known and parseable: the formatted instant. Known but
                   unparseable: the value as it arrived, verbatim. Known not at
                   all: "Never", which is a real state for a device that has
                   registered but never reported in. -->
              <span
                v-if="props.row.lastSeenKnown && props.row.lastSeenMs !== null"
                class="stamp dash-num"
              >
                {{ props.row.lastSeenLabel }}
              </span>
              <span v-else-if="!props.row.lastSeenKnown" class="stamp__never">Never</span>
              <span v-else class="stamp dash-num">{{ props.row.lastSeenLabel }}</span>
            </q-td>

            <q-td key="actions" :props="props" class="actions">
              <q-btn
                flat
                round
                dense
                icon="more_horiz"
                size="12px"
                class="row-btn"
                :aria-label="`Actions for ${ownerName(props.row) ?? 'this device'}`"
              >
                <RowMenu
                  :actions="deviceActionsFor(props.row)"
                  @select="(key) => $emit('action', props.row, key)"
                />
              </q-btn>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </div>
  </div>
</template>

<script setup>
/**
 * Desktop view of the device roll. Below 1024px the page swaps this for
 * DeviceCardList — six columns inside a tablet's content width means a sideways
 * scroll on every row.
 *
 * Rows arrive already normalised by `composables/utils/devices.js` and already
 * carrying their avatar from the page, so what a row displays is the same value
 * the page filtered, sorted and counted on.
 *
 * Nothing here writes. The row menu's verbs are re-emitted upward rather than
 * acted on, so the one place that answers "are you sure?" — with a required
 * reason — is the page, for both this renderer and the card list below 1024px.
 */
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import RowMenu from '@/components/common/RowMenu.vue'
import { chipClass, deviceActionsFor } from 'src/composables/utils/devices'

defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
})

defineEmits(['copy', 'clear-filters', 'action'])

/** The owner the roster knows by uuid; without one the payload's own name,
 *  and without either, something that says nobody is on record. */
function ownerName(row) {
  return row?.employeeName || 'Unknown employee'
}

// Sorting is the page's job, over the whole roll, so no column declares
// `sortable` — a header click here would only reorder the rows on screen and
// quietly answer a narrower question than it appears to.
const columns = [
  { name: 'employee', label: 'Employee', field: 'employeeName', align: 'left', minWidth: 200 },
  { name: 'device', label: 'Device', field: 'deviceName', align: 'left', minWidth: 250 },
  { name: 'status', label: 'Status', field: (row) => row.status.key, align: 'left', width: 220 },
  { name: 'registered', label: 'Registered', field: 'registeredLabel', align: 'left', width: 165 },
  { name: 'lastSeen', label: 'Last seen', field: 'lastSeenMs', align: 'left', width: 165 },
  // The row-menu column. `align` and `width` stay declared here because the
  // `.actions` class in dashboard.scss carries the same intent globally; this is
  // just the same statement at the table that owns it.
  { name: 'actions', label: '', field: 'key', align: 'right', width: 52 },
]
</script>

<style scoped>
.dv-grid {
  width: 100%;
  /* Below this the six columns start folding words; the container scrolls
     instead, with the always-drawn track `dash-scroll-x` supplies. */
  min-width: 920px;
}

.dv-tbl__empty-btn {
  margin-top: 4px;
  color: var(--dash-ink-2);
  border-color: var(--dash-line-strong);
}

/* ── Owner ── */
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

/* ── Device ── */
.device {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.device__name {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.uuid {
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
.uuid:hover {
  background: var(--dash-n-50);
  border-color: var(--dash-line);
}
.uuid__text {
  font-size: 11.5px;
  letter-spacing: 0.01em;
  color: var(--dash-ink-3);
  max-width: 210px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.uuid__icon {
  color: var(--dash-ink-4);
  flex: none;
}
.uuid:hover .uuid__icon {
  color: var(--dash-ink-2);
}
.device__type {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--dash-ink-4);
}

/* ── Status ── */
.status {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
}
.status__why {
  font-size: 11px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}

/* ── Stamps ── */
.stamp {
  display: block;
  font-size: 12.5px;
  color: var(--dash-ink-2);
  white-space: nowrap;
}
.stamp__never {
  font-size: 12.5px;
  font-style: italic;
  color: var(--dash-ink-4);
  white-space: nowrap;
}
.stamp__none {
  font-size: 12.5px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}

/* ── Row action ──
   The same treatment the Access Cards and Employee tables give their row menu,
   so the three are recognisably the same control. Quiet at rest, ink on hover. */
.row-btn {
  color: var(--dash-ink-4);
}
.row-btn:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
}
</style>
