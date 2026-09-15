<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="o_contactless" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Access card</div>
            <div class="dash-modal__sub">{{ formatUid(shown?.uid) }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
      </q-card-section>

      <q-card-section v-if="loading && !shown" class="dash-modal__body dash-modal__body--row">
        <q-spinner size="18px" color="primary" />
        <span>Loading the card…</span>
      </q-card-section>

      <q-card-section v-else class="dash-modal__body">
        <!-- The row's own values are on screen while the detail request is in
             flight, so the dialog opens filled rather than blank and only the
             lifecycle block below arrives late. -->
        <div v-if="error" class="acc-alert" role="alert">
          <q-icon name="o_error" size="17px" />
          <span class="acc-alert__text">{{ error }}</span>
          <q-btn
            flat
            dense
            no-caps
            size="12px"
            label="Retry"
            class="acc-alert__btn"
            @click="$emit('retry')"
          />
        </div>

        <div v-if="shown?.foreign" class="acc-alert acc-alert--warn" role="status">
          <q-icon name="o_warning" size="17px" />
          <span class="acc-alert__text">
            This card is registered to another company. Nothing here can be changed from this
            workspace.
          </span>
        </div>

        <div class="acc-hero">
          <div class="acc-hero__uid">
            <button
              type="button"
              class="uid"
              :aria-label="`Copy card UID ${shown?.uid}`"
              @click="$emit('copy', shown)"
            >
              <span class="uid__text dash-num">{{ formatUid(shown?.uid) }}</span>
              <q-icon name="o_content_copy" size="14px" class="uid__icon" />
              <q-tooltip anchor="bottom middle" self="top middle">Copy UID</q-tooltip>
            </button>
            <span class="acc-hero__type">{{ (shown?.cardType || 'nfc').toUpperCase() }}</span>
          </div>
          <span class="dash-chip" :class="chipClass(shown?.status?.tone)">
            <span class="dash-chip__dot" />
            {{ shown?.status?.label || '—' }}
          </span>
        </div>

        <p v-if="shown?.alert" class="acc-warn">
          <q-icon name="o_warning" size="15px" />
          <span>
            <strong>{{ shown.alert.label }}</strong> — {{ shown.alert.detail }}
          </span>
        </p>

        <div class="dash-modal__group">
          <p class="dash-modal__group-label">Holder</p>
          <div class="acc-holder">
            <template v-if="shown?.assigned">
              <q-avatar v-if="avatar?.pictureUrl" size="34px">
                <img :src="avatar.pictureUrl" :alt="shown.employeeName" />
              </q-avatar>
              <q-avatar v-else size="34px" :style="{ background: avatar?.color }">
                <span class="acc-holder__initials">{{ avatar?.initials || '?' }}</span>
              </q-avatar>
              <div class="acc-holder__text">
                <span class="acc-holder__name">{{ shown.employeeName }}</span>
                <span class="acc-holder__sub">
                  Taps on this card are recorded against this employee.
                </span>
              </div>
            </template>
            <template v-else>
              <q-avatar size="34px" class="acc-holder__empty">
                <q-icon name="o_person_off" size="18px" />
              </q-avatar>
              <div class="acc-holder__text">
                <span class="acc-holder__name acc-holder__name--free">Not yet assigned</span>
                <span class="acc-holder__sub"> Nobody is on record as holding this card yet. </span>
              </div>
            </template>
          </div>
        </div>

        <div class="dash-modal__group">
          <p class="dash-modal__group-label">Activity</p>
          <div class="acc-rows">
            <div class="acc-row">
              <span class="acc-row__label">Last tap</span>
              <span class="acc-row__value">
                <template v-if="shown?.lastTapDay">
                  {{ shown.lastTapDay }}
                  <span class="acc-row__quiet">{{ shown.lastTapTime }}</span>
                </template>
                <span v-else class="acc-row__quiet">Never tapped</span>
              </span>
            </div>
            <div v-if="shown?.label" class="acc-row">
              <span class="acc-row__label">Label</span>
              <span class="acc-row__value">{{ shown.label }}</span>
            </div>
            <div v-if="shown?.companyName" class="acc-row">
              <span class="acc-row__label">Company</span>
              <span class="acc-row__value">{{ shown.companyName }}</span>
            </div>
          </div>
        </div>

        <!-- Only the detail endpoint carries these, so the block is skipped
             entirely rather than drawn as four em dashes while the request is
             still out. -->
        <div v-if="hasLifecycle" class="dash-modal__group">
          <p class="dash-modal__group-label">Lifecycle</p>
          <div class="acc-rows">
            <div v-if="detail?.issuedAt" class="acc-row">
              <span class="acc-row__label">Issued</span>
              <span class="acc-row__value">{{ formatStamp(detail.issuedAt) }}</span>
            </div>
            <div v-if="detail?.activatedAt" class="acc-row">
              <span class="acc-row__label">Activated</span>
              <span class="acc-row__value">{{ formatStamp(detail.activatedAt) }}</span>
            </div>
            <div v-if="detail?.deactivatedAt" class="acc-row">
              <span class="acc-row__label">Deactivated</span>
              <span class="acc-row__value">{{ formatStamp(detail.deactivatedAt) }}</span>
            </div>
            <div v-if="detail?.expiresAt" class="acc-row">
              <span class="acc-row__label">Expires</span>
              <span class="acc-row__value">{{ formatStamp(detail.expiresAt) }}</span>
            </div>
          </div>
        </div>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn flat no-caps label="Close" class="dash-modal__cancel" v-close-popup />
        <q-btn
          :label="shown?.assigned ? 'Reassign card' : 'Assign card'"
          no-caps
          class="dash-modal__submit"
          :disable="shown?.foreign"
          @click="$emit('assign', shown)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * Everything one access card carries.
 *
 * Two sources, deliberately: the row the page already has renders immediately,
 * and the fuller `GET /user/access-cards/{uid}/` payload replaces it when it
 * lands. That is why `shown` prefers `detail` and falls back to `row` rather
 * than waiting — a dialog that opens empty for a moment reads as broken even
 * when the request is quick, and the two payloads agree on every field they
 * share.
 *
 * The page owns the fetch, as every other dialog in the app does; this one only
 * renders what it is handed.
 */
import { computed } from 'vue'
import { chipClass, formatStamp, formatUid } from 'src/composables/utils/accessCards'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** The normalised list row the page opened this from. */
  row: { type: Object, default: null },
  /** The normalised detail payload, once it has landed. */
  detail: { type: Object, default: null },
  /** `{ pictureUrl, initials, color }` for the holder, resolved by the page. */
  avatar: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

defineEmits(['update:modelValue', 'assign', 'copy', 'retry'])

const shown = computed(() => props.detail || props.row)

const hasLifecycle = computed(() =>
  Boolean(
    props.detail?.issuedAt ||
    props.detail?.activatedAt ||
    props.detail?.deactivatedAt ||
    props.detail?.expiresAt,
  ),
)
</script>

<style scoped>
/* ── Alerts ── */
.acc-alert {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 11px;
  border-radius: var(--dash-r-md);
  background: var(--dash-critical-bg);
  border: 1px solid var(--dash-critical-line);
  color: var(--dash-critical);
}
.acc-alert__text {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  line-height: 1.45;
}
.acc-alert__btn {
  color: inherit;
  font-weight: 600;
}
.acc-alert--warn {
  background: var(--dash-warn-bg);
  border-color: var(--dash-warn-line);
  color: var(--dash-warn);
}

/* ── Hero ── */
.acc-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
}
.acc-hero__uid {
  min-width: 0;
}
.uid {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 2px 6px 2px 7px;
  margin-left: -7px;
  border: 1px solid transparent;
  border-radius: var(--dash-r-sm);
  background: transparent;
  cursor: pointer;
}
.uid:hover {
  background: var(--dash-surface);
  border-color: var(--dash-line);
}
.uid__text {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--dash-ink);
}
.uid__icon {
  color: var(--dash-ink-4);
  flex: none;
}
.acc-hero__type {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--dash-ink-4);
}

.acc-warn {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 0;
  padding: 9px 11px;
  border-radius: var(--dash-r-md);
  background: var(--dash-warn-bg);
  border: 1px solid var(--dash-warn-line);
  font-size: 12px;
  line-height: 1.45;
  color: var(--dash-warn);
}
.acc-warn .q-icon {
  flex: none;
  margin-top: 1px;
}

/* ── Holder ── */
.acc-holder {
  display: flex;
  align-items: center;
  gap: 11px;
}
.acc-holder__initials {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}
.acc-holder__empty {
  background: var(--dash-n-50);
  color: var(--dash-ink-4);
  border: 1px solid var(--dash-line);
}
.acc-holder__text {
  min-width: 0;
}
.acc-holder__name {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--dash-ink);
}
.acc-holder__name--free {
  font-weight: 400;
  font-style: italic;
  color: var(--dash-ink-4);
}
.acc-holder__sub {
  display: block;
  margin-top: 1px;
  font-size: 12px;
  color: var(--dash-ink-3);
  line-height: 1.45;
}

/* ── Fact rows ── */
.acc-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.acc-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
}
.acc-row__label {
  font-size: 12px;
  color: var(--dash-ink-3);
  flex: none;
}
.acc-row__value {
  font-size: 12.5px;
  color: var(--dash-ink);
  text-align: right;
  min-width: 0;
}
.acc-row__quiet {
  color: var(--dash-ink-4);
}
</style>
