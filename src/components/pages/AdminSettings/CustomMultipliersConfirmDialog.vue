<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="dash-modal dash-modal--sm">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon dash-modal__head-icon--warn">
            <q-icon name="o_tune" size="20px" />
          </span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Save custom multipliers?</div>
            <div class="dash-modal__sub">These apply company-wide</div>
          </div>
        </div>
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <p class="cmc__lede">
          These rates replace the Philippine standards for
          <strong>every employee's payroll</strong>, and become the defaults on new contracts.
        </p>

        <div class="dash-modal__group">
          <p class="dash-modal__group-label">
            Changed from standard
            <span class="cmc__count">{{ changes.length }}</span>
          </p>
          <!-- Old value struck through beside the new one, rather than the new
               value alone: the point of the confirmation is the size of the
               change, which a single number cannot show. -->
          <ul class="cmc__list">
            <li v-for="change in changes" :key="change.name" class="cmc__row">
              <span class="cmc__name">{{ change.name }}</span>
              <span class="cmc__values">
                <span class="cmc__was">&times;{{ change.standard.toFixed(2) }}</span>
                <q-icon name="arrow_forward" size="13px" class="cmc__arrow" />
                <span class="cmc__now">&times;{{ change.current.toFixed(2) }}</span>
              </span>
            </li>
          </ul>
        </div>

        <p class="cmc__note">
          <q-icon name="o_gavel" size="15px" />
          <span
            >Rates below the DOLE minimums put the company out of compliance with the Labor
            Code.</span
          >
        </p>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn
          flat
          no-caps
          label="Go back and edit"
          class="dash-modal__cancel"
          @click="$emit('update:modelValue', false)"
        />
        <q-btn
          unelevated
          no-caps
          label="Save multipliers"
          class="dash-modal__submit"
          :loading="saving"
          @click="$emit('confirm')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * Confirmation before company-wide pay multipliers are overwritten.
 *
 * This was the one dialog in the app built as an HTML string passed to
 * `$q.dialog({ html: true })` — about thirty lines of markup with eighteen
 * inline hex colours, an emoji in the title, and an amber `unelevated` OK
 * button whose white label sat on a #f2c037 fill. None of the dialog chrome
 * could reach it, so it was the only surface still looking the way the app did
 * before the design system.
 *
 * It is a component now for the ordinary reason: it has real content — a list
 * of changes with before-and-after values — and content belongs in a template,
 * not in a template literal.
 */
defineProps({
  modelValue: { type: Boolean, default: false },
  /** [{ name, standard, current }] — only the multipliers that differ. */
  changes: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
})

defineEmits(['update:modelValue', 'confirm'])
</script>

<style scoped>
.cmc__lede {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--dash-ink-2);
}
.cmc__lede strong {
  font-weight: 600;
  color: var(--dash-ink);
}

/* Reads as part of the label rather than as a status, so it is the neutral
   chip, not the warn one — the count is a fact, and the tone is carried by the
   header tile and the note at the foot of the body. */
.cmc__count {
  display: inline-block;
  margin-left: 5px;
  padding: 0 6px;
  border-radius: var(--dash-r-pill);
  background: var(--dash-n-100);
  color: var(--dash-ink-3);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.cmc__list {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  overflow: hidden;
}

.cmc__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 11px;
  background: var(--dash-surface);
  border-bottom: 1px solid var(--dash-line-soft);
}
.cmc__row:last-child {
  border-bottom: none;
}

.cmc__name {
  min-width: 0;
  font-size: 12.5px;
  color: var(--dash-ink-2);
}

.cmc__values {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: none;
  font-variant-numeric: tabular-nums;
}

.cmc__was {
  font-size: 12.5px;
  color: var(--dash-ink-4);
  text-decoration: line-through;
}

.cmc__arrow {
  color: var(--dash-ink-4);
}

.cmc__now {
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
}

/* The compliance line is the one thing here that is a warning, so it is the
   only thing wearing the warn tone. The old version tinted the whole list
   amber and put a 4px amber bar down its side, which left the actual caution
   competing with a block of colour that meant nothing. */
.cmc__note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  padding: 9px 11px;
  border: 1px solid var(--dash-warn-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-warn-bg);
  color: var(--dash-warn);
  font-size: 12px;
  line-height: 1.5;
}
.cmc__note .q-icon {
  flex: none;
  margin-top: 1px;
}
</style>
