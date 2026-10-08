<template>
  <q-menu anchor="bottom right" self="top right" :offset="[0, 6]" class="row-menu">
    <q-list dense class="row-menu__list">
      <q-item
        v-close-popup
        clickable
        class="row-menu__item row-menu__item--good"
        @click="$emit('resolve')"
      >
        <q-item-section avatar><q-icon name="o_check" size="17px" /></q-item-section>
        <q-item-section>Resolve</q-item-section>
      </q-item>

      <q-item
        v-close-popup
        clickable
        class="row-menu__item row-menu__item--danger"
        @click="$emit('reject')"
      >
        <q-item-section avatar><q-icon name="o_close" size="17px" /></q-item-section>
        <q-item-section>Reject</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script setup>
/**
 * Per-row action menu for the Payslips step.
 *
 * These two decisions used to be a pair of outline buttons sitting in the cell of
 * every disputed row. On a run with a handful of disputes that is fine; on a run
 * with twenty it turned the right-hand edge of the table into a wall of buttons
 * that competed with the figures they sat beside. A kebab keeps the row a row.
 *
 * It follows `EmployeeRowMenu`, which is where this pattern comes from — same
 * trigger (`more_horiz`, `row-btn`), same `.row-menu` chrome, same `good` /
 * `danger` tone classes — so the two pages read as one table language. The
 * Requests page's `RequestRowMenu` is the descriptor-driven variant of the same
 * idea; this one is fixed because a payslip row has exactly two decisions and
 * neither is ever available on a row that is not disputed.
 *
 * The menu is only rendered on a disputed row at all (see `isDisputed` in
 * PayslipsPage), matching `EmployeeRowMenu`'s own rule that an action which does
 * not apply is absent rather than greyed out.
 */
defineEmits(['resolve', 'reject'])
</script>

<style scoped>
.row-menu__list {
  min-width: 168px;
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
</style>

<style>
/* QMenu teleports to the body, so its popup surface has to be styled unscoped.
   Matches `.row-menu` on the Employees and Requests pages. */
.row-menu {
  border-radius: var(--dash-r-md) !important;
  border: 1px solid var(--dash-line);
  box-shadow: var(--dash-shadow-lg) !important;
}
</style>