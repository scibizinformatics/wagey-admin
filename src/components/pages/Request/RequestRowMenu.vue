<template>
  <q-menu anchor="bottom right" self="top right" :offset="[0, 6]" class="row-menu">
    <q-list dense class="row-menu__list">
      <template v-for="action in actions" :key="action.key">
        <q-separator v-if="action.separatorBefore" class="row-menu__sep" />
        <q-item
          v-close-popup="action.disabled ? 0 : 1"
          clickable
          :disable="action.disabled"
          :class="['row-menu__item', action.tone ? `row-menu__item--${action.tone}` : '']"
          @click="onSelect(action)"
        >
          <q-item-section avatar><q-icon :name="action.icon" size="17px" /></q-item-section>
          <q-item-section>
            <q-item-label>{{ action.label }}</q-item-label>
            <!-- An action that is present but not yet available says why, on its
                 own line. A greyed item with no explanation reads as a bug. -->
            <q-item-label v-if="action.caption" caption class="row-menu__caption">
              {{ action.caption }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </template>
    </q-list>
  </q-menu>
</template>

<script setup>
/**
 * Per-row action menu for every table on the Requests page — leave, overtime,
 * cash advance, the cash-advance cutoff grid and swaps — so the five queues
 * cannot drift into five different action affordances. It matches
 * `EmployeeRowMenu` on the Employees page, which is where this pattern comes
 * from.
 *
 * It is driven by descriptors rather than by a fixed list of items, because the
 * five queues genuinely offer different actions: leave and overtime decide in
 * place, cash advance opens a review modal, and a swap can be pending on the
 * other employee and so not yet the admin's to approve. What they share is the
 * shape — an icon, a label, an optional tone, and an optional reason when the
 * action is present but unavailable.
 *
 * A descriptor is:
 *   { key, label, icon, tone?: 'good' | 'danger', disabled?, caption?,
 *     separatorBefore? }
 */
defineProps({
  actions: { type: Array, required: true },
})

const emit = defineEmits(['select'])

// A disabled item keeps its click handler off entirely; `v-close-popup` is also
// switched off for it, so mis-clicking an unavailable action does not dismiss
// the menu and leave the reader wondering whether something happened.
const onSelect = (action) => {
  if (action.disabled) return
  emit('select', action.key)
}
</script>

<style scoped>
.row-menu__list {
  min-width: 194px;
  padding: 5px;
}

.row-menu__item {
  min-height: 34px;
  padding: 0 9px;
  border-radius: var(--dash-r-sm);
  font-size: 13px;
  color: var(--dash-ink-2);
}
.row-menu__item:hover {
  background: var(--dash-n-50);
  color: var(--dash-ink);
}
.row-menu__item :deep(.q-item__section--avatar) {
  min-width: 26px;
  padding-right: 10px;
  color: var(--dash-ink-4);
}
.row-menu__item:hover :deep(.q-item__section--avatar) {
  color: var(--dash-ink-3);
}
.row-menu__caption {
  font-size: 11.5px;
  color: var(--dash-ink-4);
  white-space: normal;
}

.row-menu__item--good {
  color: var(--dash-good);
}
.row-menu__item--good:hover {
  background: var(--dash-good-bg);
  color: var(--dash-good);
}
.row-menu__item--good :deep(.q-item__section--avatar),
.row-menu__item--good:hover :deep(.q-item__section--avatar) {
  color: var(--dash-good);
}

.row-menu__item--danger {
  color: var(--dash-critical);
}
.row-menu__item--danger:hover {
  background: var(--dash-critical-bg);
  color: var(--dash-critical);
}
.row-menu__item--danger :deep(.q-item__section--avatar),
.row-menu__item--danger:hover :deep(.q-item__section--avatar) {
  color: var(--dash-critical);
}

/* Quasar dims a disabled item wholesale. These rows are still meant to be read
   — the caption is the point — so the tone is dropped back to neutral instead
   of the whole item being faded out of legibility. */
.row-menu__item.disabled,
.row-menu__item[aria-disabled='true'] {
  opacity: 1 !important;
  color: var(--dash-ink-4);
  cursor: default;
}
.row-menu__item.disabled:hover,
.row-menu__item[aria-disabled='true']:hover {
  background: transparent;
  color: var(--dash-ink-4);
}
.row-menu__item.disabled :deep(.q-item__section--avatar),
.row-menu__item[aria-disabled='true'] :deep(.q-item__section--avatar) {
  color: var(--dash-ink-4);
}

.row-menu__sep {
  margin: 4px 0;
  background: var(--dash-line-soft);
}
</style>

<style>
/* QMenu teleports to the body, so its popup surface has to be styled unscoped.
   Matches `.row-menu` on the Employees page. */
.row-menu {
  border-radius: var(--dash-r-md) !important;
  border: 1px solid var(--dash-line);
  box-shadow: var(--dash-shadow-lg) !important;
}
</style>
