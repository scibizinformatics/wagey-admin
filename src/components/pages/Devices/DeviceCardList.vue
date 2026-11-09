<template>
  <div class="dv-cards dash-page-body">
    <div v-if="loading" class="dv-cards__list">
      <div v-for="n in 5" :key="`sk-${n}`" class="dv-card dv-card--skeleton">
        <div class="dv-card__top">
          <span class="dash-shimmer dv-sk dv-sk--name" />
          <div class="dv-card__top-right">
            <span class="dash-shimmer dv-sk dv-sk--chip" />
            <span class="dash-shimmer dv-sk dv-sk--menu" />
          </div>
        </div>
        <span class="dash-shimmer dv-sk dv-sk--line" />
        <span class="dash-shimmer dv-sk dv-sk--foot" />
      </div>
    </div>

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
        class="dv-cards__empty-btn"
        @click="$emit('clear-filters')"
      />
    </div>

    <div v-else class="dv-cards__list">
      <!-- The card itself does nothing on click. Its two actions live in the
           row menu, and there is no pointer cursor or hover to imply otherwise. -->
      <article v-for="row in rows" :key="row.key" class="dv-card">
        <!-- The device leads: on a phone it is the line that identifies the row. -->
        <div class="dv-card__top">
          <span class="dv-card__name">{{ row.deviceName || 'Unnamed device' }}</span>
          <div class="dv-card__top-right">
            <span class="dash-chip" :class="chipClass(row.status.tone)">
              <span class="dash-chip__dot" />
              {{ row.status.label }}
            </span>

            <q-btn
              flat
              round
              dense
              icon="more_horiz"
              size="12px"
              class="dv-card__menu-btn"
              :aria-label="`Actions for ${row.employeeName || 'this device'}`"
            >
              <RowMenu
                :actions="deviceActionsFor(row)"
                @select="(key) => $emit('action', row, key)"
              />
            </q-btn>
          </div>
        </div>

        <!-- Why it was switched off, said in words — the one thing on the card a
             reader cannot get from the chip above it. -->
        <p v-if="row.deactivated" class="dv-card__note">
          <q-icon name="o_power_settings_new" size="15px" />
          <span>
            Deactivated<template v-if="row.deactivatedReasonLabel">
              — {{ row.deactivatedReasonLabel }}</template
            ><template v-if="row.deactivatedKnown"> · {{ row.deactivatedLabel }}</template>
          </span>
        </p>

        <div class="dv-card__owner">
          <q-avatar v-if="row.avatar?.pictureUrl" size="26px" class="dv-card__avatar">
            <img :src="row.avatar.pictureUrl" :alt="row.employeeName || 'Unknown employee'" />
          </q-avatar>
          <q-avatar
            v-else
            size="26px"
            class="dv-card__avatar"
            :style="{ background: row.avatar?.color }"
          >
            <span class="dv-card__icon">{{ row.avatar?.initials || '?' }}</span>
          </q-avatar>
          <span class="dv-card__owner-name">{{ row.employeeName || 'Unknown employee' }}</span>
          <span class="dv-card__type">
            <q-icon :name="row.deviceType.icon" size="14px" />
            {{ row.deviceType.label }}
          </span>
        </div>

        <div class="dv-card__foot">
          <!-- Same click-to-copy the table offers, for pasting into a ticket. -->
          <button
            type="button"
            class="uuid"
            :aria-label="`Copy device UUID ${row.deviceUuid}`"
            :disable="!row.deviceUuid"
            @click="$emit('copy', row)"
          >
            <span class="uuid__text dash-num">{{ row.deviceUuid }}</span>
            <q-icon name="o_content_copy" size="13px" class="uuid__icon" />
          </button>
          <span class="dv-card__when dash-num">{{ row.lastSeenLabel }}</span>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
/**
 * Tablet and phone view of the device roll, swapped in below 1024px.
 *
 * Reads the same normalised rows as DeviceTable, from
 * `composables/utils/devices.js` — which is the point of that module: the two
 * renderers cannot end up describing the same device differently.
 */
import RowMenu from '@/components/common/RowMenu.vue'
import { chipClass, deviceActionsFor } from 'src/composables/utils/devices'

defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
})

defineEmits(['copy', 'clear-filters', 'action'])
</script>

<style scoped>
.dv-cards__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}

.dv-card {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  background: var(--dash-surface);
}

/* ── Header row ── */
.dv-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
}
.dv-card__name {
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dv-card__top-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.dv-card__menu-btn {
  color: var(--dash-ink-4);
}
.dv-card__menu-btn:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
}

/* ── Deactivation note ──
   Muted rather than an alarm band: the act was deliberate, and the line exists
   to say what and when, not to shout. */
.dv-card__note {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--dash-ink-3);
}
.dv-card__note .q-icon {
  color: var(--dash-ink-4);
  flex: none;
}

/* ── Owner ── */
.dv-card__owner {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
}
.dv-card__avatar {
  flex-shrink: 0;
}
.dv-card__icon {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}
.dv-card__owner-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dv-card__type {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--dash-ink-4);
  flex-shrink: 0;
}

/* ── Footer ── */
.dv-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
}
.dv-card__when {
  font-size: 11.5px;
  color: var(--dash-ink-4);
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
}
.uuid:hover {
  background: var(--dash-n-50);
  border-color: var(--dash-line);
}
.uuid__text {
  font-size: 11.5px;
  letter-spacing: 0.01em;
  color: var(--dash-ink-3);
  max-width: 190px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.uuid__icon {
  color: var(--dash-ink-4);
  flex: none;
}

/* ── Shimmer placeholders ── */
.dv-sk {
  display: block;
  border-radius: var(--dash-r-sm);
}
.dv-sk--name {
  width: 46%;
  height: 14px;
}
.dv-sk--chip {
  width: 88px;
  height: 12px;
}
.dv-sk--menu {
  width: 26px;
  height: 26px;
  border-radius: 50%;
}
.dv-sk--line {
  width: 70%;
  height: 11px;
}
.dv-sk--foot {
  width: 40%;
  height: 11px;
}

.dv-cards__empty-btn {
  margin-top: 4px;
  color: var(--dash-ink-2);
  border-color: var(--dash-line-strong);
}
</style>
