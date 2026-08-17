<template>
  <q-menu anchor="bottom right" self="top right" :offset="[0, 6]" class="row-menu">
    <q-list dense class="row-menu__list">
      <q-item v-close-popup clickable class="row-menu__item" @click="$emit('view', employee)">
        <q-item-section avatar><q-icon name="o_visibility" size="17px" /></q-item-section>
        <q-item-section>View details</q-item-section>
      </q-item>

      <template v-if="!terminated">
        <q-item v-close-popup clickable class="row-menu__item" @click="$emit('edit', employee)">
          <q-item-section avatar><q-icon name="o_edit" size="17px" /></q-item-section>
          <q-item-section>Edit</q-item-section>
        </q-item>

        <q-item v-close-popup clickable class="row-menu__item" @click="$emit('assign', employee)">
          <q-item-section avatar><q-icon name="o_assignment" size="17px" /></q-item-section>
          <q-item-section>
            {{ hasContract ? 'Renew payroll profile' : 'Assign payroll profile' }}
          </q-item-section>
        </q-item>

        <q-separator class="row-menu__sep" />

        <q-item
          v-close-popup
          clickable
          class="row-menu__item"
          @click="$emit('add-leave-balance', employee)"
        >
          <q-item-section avatar><q-icon name="o_event_note" size="17px" /></q-item-section>
          <q-item-section>Add leave balance</q-item-section>
        </q-item>

        <q-item
          v-close-popup
          clickable
          class="row-menu__item"
          @click="$emit('add-cto-balance', employee)"
        >
          <q-item-section avatar><q-icon name="o_more_time" size="17px" /></q-item-section>
          <q-item-section>Add CTO balance</q-item-section>
        </q-item>

        <q-separator class="row-menu__sep" />

        <q-item
          v-close-popup
          clickable
          class="row-menu__item row-menu__item--danger"
          @click="$emit('terminate', employee)"
        >
          <q-item-section avatar><q-icon name="o_block" size="17px" /></q-item-section>
          <q-item-section>Terminate</q-item-section>
        </q-item>
      </template>

      <!-- Restoring a terminated employee was already fully built on the page
           (confirmRestore + EmployeeRestoreDialog, wired to a `restore` event)
           but nothing ever emitted it, so the dialog was unreachable. This is
           the missing trigger. -->
      <template v-else>
        <q-separator class="row-menu__sep" />
        <q-item
          v-close-popup
          clickable
          class="row-menu__item row-menu__item--restore"
          @click="$emit('restore', employee)"
        >
          <q-item-section avatar><q-icon name="o_restart_alt" size="17px" /></q-item-section>
          <q-item-section>Restore employee</q-item-section>
        </q-item>
      </template>
    </q-list>
  </q-menu>
</template>

<script setup>
/**
 * Per-row action menu, shared by EmployeeTable (desktop) and EmployeeCardList
 * (tablet) so the two presentations cannot offer different actions.
 *
 * A terminated employee gets a different menu, not a menu of disabled items:
 * the actions that no longer apply are absent rather than greyed out.
 */
import { computed } from 'vue'
import { getStatus } from '@/composables/utils/employee'

const props = defineProps({
  employee: { type: Object, required: true },
  hasContract: { type: Boolean, default: false },
})

defineEmits([
  'view',
  'edit',
  'assign',
  'terminate',
  'restore',
  'add-leave-balance',
  'add-cto-balance',
])

const terminated = computed(() => getStatus(props.employee) === 'Terminated')
</script>

<style scoped>
.row-menu__list {
  min-width: 214px;
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

.row-menu__item--restore {
  color: var(--dash-good);
}
.row-menu__item--restore:hover {
  background: var(--dash-good-bg);
  color: var(--dash-good);
}
.row-menu__item--restore :deep(.q-item__section--avatar),
.row-menu__item--restore:hover :deep(.q-item__section--avatar) {
  color: var(--dash-good);
}

.row-menu__sep {
  margin: 4px 0;
  background: var(--dash-line-soft);
}
</style>

<style>
/* QMenu teleports to the body, so its popup surface has to be styled unscoped. */
.row-menu {
  border-radius: var(--dash-r-md) !important;
  border: 1px solid var(--dash-line);
  box-shadow: var(--dash-shadow-lg) !important;
}
</style>
