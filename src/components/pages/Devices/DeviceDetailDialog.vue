<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon :name="shown?.deviceType?.icon || 'o_devices'" size="21px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Device</div>
            <div class="dash-modal__sub">{{ shown?.deviceName || 'Unnamed device' }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <div v-if="!shown" class="dv-empty">This device is no longer in the list on screen.</div>

        <template v-else>
          <!-- Everything the list row already carries, laid out to be read in
               one pass — there is no second fetch behind this dialog, because
               the list endpoint answers every field the page shows. -->
          <div class="dv-hero">
            <button
              type="button"
              class="uuid"
              :aria-label="`Copy device UUID ${shown.deviceUuid}`"
              :disable="!shown.deviceUuid"
              @click="$emit('copy', shown)"
            >
              <span class="uuid__text dash-num">{{ shown.deviceUuid }}</span>
              <q-icon name="o_content_copy" size="14px" class="uuid__icon" />
              <q-tooltip anchor="bottom middle" self="top middle">Copy device UUID</q-tooltip>
            </button>
            <span class="dash-chip" :class="chipClass(shown.status.tone)">
              <span class="dash-chip__dot" />
              {{ shown.status.label }}
            </span>
          </div>

          <div class="dash-modal__group">
            <p class="dash-modal__group-label">Employee</p>
            <div class="dv-owner">
              <q-avatar v-if="avatar?.pictureUrl" size="34px">
                <img :src="avatar.pictureUrl" :alt="ownerName" />
              </q-avatar>
              <q-avatar v-else size="34px" :style="{ background: avatar?.color }">
                <span class="dv-owner__initials">{{ avatar?.initials || '?' }}</span>
              </q-avatar>
              <div class="dv-owner__text">
                <span class="dv-owner__name">{{ ownerName }}</span>
                <span class="dv-owner__sub">
                  Attendance and taps recorded by this device are credited to this employee.
                </span>
              </div>
            </div>
          </div>

          <div class="dash-modal__group">
            <p class="dash-modal__group-label">Device</p>
            <div class="dv-rows">
              <div class="dv-row">
                <span class="dv-row__label">Type</span>
                <span class="dv-row__value">
                  <q-icon :name="shown.deviceType.icon" size="14px" class="dv-row__type-icon" />
                  {{ shown.deviceType.label }}
                </span>
              </div>
              <div class="dv-row">
                <span class="dv-row__label">Name</span>
                <span class="dv-row__value">{{ shown.deviceName || 'Unnamed device' }}</span>
              </div>
              <div v-if="shown.employeeCompany" class="dv-row">
                <span class="dv-row__label">Record</span>
                <span class="dv-row__value">{{ shown.employeeCompany }}</span>
              </div>
            </div>
          </div>

          <div class="dash-modal__group">
            <p class="dash-modal__group-label">Activity</p>
            <div class="dv-rows">
              <div class="dv-row">
                <span class="dv-row__label">Registered</span>
                <span v-if="shown.registeredKnown" class="dv-row__value dash-num">
                  {{ shown.registeredLabel }}
                </span>
                <span v-else class="dv-row__value dv-row__value--quiet">—</span>
              </div>
              <div class="dv-row">
                <span class="dv-row__label">Last seen</span>
                <span v-if="shown.lastSeenKnown" class="dv-row__value dash-num">
                  {{ shown.lastSeenLabel }}
                </span>
                <!-- Registered but never reported in — said, not dashed. -->
                <span v-else class="dv-row__value dv-row__value--quiet">Never</span>
              </div>
            </div>
          </div>

          <!-- Only a switched-off device carries this, so the group is skipped
               entirely rather than drawn as two em dashes on an active one. -->
          <div v-if="shown.deactivated" class="dash-modal__group">
            <p class="dash-modal__group-label">Deactivation</p>
            <div class="dv-rows">
              <div class="dv-row">
                <span class="dv-row__label">Reason</span>
                <span v-if="shown.deactivatedReasonLabel" class="dv-row__value">
                  {{ shown.deactivatedReasonLabel }}
                </span>
                <span v-else class="dv-row__value dv-row__value--quiet">None recorded</span>
              </div>
              <div v-if="shown.deactivatedKnown" class="dv-row">
                <span class="dv-row__label">When</span>
                <span class="dv-row__value dash-num">{{ shown.deactivatedLabel }}</span>
              </div>
            </div>
          </div>
        </template>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn flat no-caps label="Close" class="dash-modal__cancel" v-close-popup />
        <!-- The write lives on the page's `commitDeactivate`, reachable only
             from the deactivation dialog this opens — the button here is an
             opener, same as the row menu's verb. -->
        <q-btn
          v-if="shown?.deactivated === false"
          unelevated
          no-caps
          label="Deactivate device"
          class="dash-modal__danger"
          :disable="deactivating"
          @click="$emit('deactivate', shown)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * Everything one device carries.
 *
 * There is no detail fetch behind it, deliberately: the list endpoint answers
 * every field the page shows, so a second request would be a slower copy of a
 * row already on screen. The dialog reads the *live* row the page selects, so a
 * deactivation that refetches underneath it is reflected the moment it lands —
 * the chip turns, the Deactivation group appears, the own button disappears.
 */
import { computed } from 'vue'
import { chipClass } from 'src/composables/utils/devices'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** The live normalised row, kept current by the page's computed selection. */
  row: { type: Object, default: null },
  /** `{ pictureUrl, initials, color }` for the employee, resolved by the page. */
  avatar: { type: Object, default: null },
  /** The page's write flag, so this button cannot kick off behind the gate. */
  deactivating: { type: Boolean, default: false },
})

defineEmits(['update:modelValue', 'copy', 'deactivate'])

const shown = computed(() => props.row)

const ownerName = computed(() => shown.value?.employeeName || 'Unknown employee')
</script>

<style scoped>
.dv-empty {
  font-size: 13px;
  color: var(--dash-ink-3);
}

/* ── Hero ── */
.dv-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
  min-width: 0;
}
.uuid {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 2px 6px 2px 7px;
  margin-left: -7px;
  border: 1px solid transparent;
  border-radius: var(--dash-r-sm);
  background: transparent;
  cursor: pointer;
  min-width: 0;
}
.uuid:hover {
  background: var(--dash-surface);
  border-color: var(--dash-line);
}
.uuid__text {
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--dash-ink);
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.uuid__icon {
  color: var(--dash-ink-4);
  flex: none;
}

/* ── Owner ── */
.dv-owner {
  display: flex;
  align-items: center;
  gap: 11px;
}
.dv-owner__initials {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}
.dv-owner__text {
  min-width: 0;
}
.dv-owner__name {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--dash-ink);
}
.dv-owner__sub {
  display: block;
  margin-top: 1px;
  font-size: 12px;
  color: var(--dash-ink-3);
  line-height: 1.45;
}

/* ── Fact rows ── */
.dv-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dv-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
}
.dv-row__label {
  font-size: 12px;
  color: var(--dash-ink-3);
  flex: none;
}
.dv-row__value {
  font-size: 12.5px;
  color: var(--dash-ink);
  text-align: right;
  min-width: 0;
}
.dv-row__type-icon {
  color: var(--dash-ink-3);
  position: relative;
  top: 1.5px;
  margin-right: 2px;
}
.dv-row__value--quiet {
  color: var(--dash-ink-4);
  font-style: italic;
}
</style>
