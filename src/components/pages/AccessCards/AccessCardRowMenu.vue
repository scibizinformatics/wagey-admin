<template>
  <q-menu anchor="bottom right" self="top right" :offset="[0, 6]" class="row-menu">
    <q-list dense class="row-menu__list">
      <q-item v-close-popup clickable class="row-menu__item" @click="$emit('view', card)">
        <q-item-section avatar><q-icon name="o_visibility" size="17px" /></q-item-section>
        <q-item-section>View details</q-item-section>
      </q-item>

      <q-item v-close-popup clickable class="row-menu__item" @click="$emit('assign', card)">
        <q-item-section avatar>
          <q-icon :name="card.assigned ? 'o_swap_horiz' : 'o_person_add'" size="17px" />
        </q-item-section>
        <q-item-section>{{ card.assigned ? 'Reassign card' : 'Assign card' }}</q-item-section>
      </q-item>

      <!-- The status verbs, in the order `WRITABLE_STATUSES` lists them: putting
           a card back before taking it away. Drawn from `statusActionsFor` rather
           than written out here, so this menu and the detail dialog's Card status
           group cannot offer a card different ways to be switched off. -->
      <template v-if="statusActions.length">
        <q-separator class="row-menu__rule" />
        <q-item
          v-for="action in statusActions"
          :key="action.key"
          v-close-popup
          clickable
          class="row-menu__item"
          @click="$emit('status', card, action.key)"
        >
          <q-item-section avatar><q-icon :name="action.icon" size="17px" /></q-item-section>
          <q-item-section>{{ action.actionLabel }}</q-item-section>
        </q-item>
      </template>
    </q-list>
  </q-menu>
</template>

<script setup>
/**
 * Per-row action menu, shared by AccessCardTable (desktop) and
 * AccessCardCardList (tablet) so the two presentations cannot offer different
 * actions. It follows `EmployeeRowMenu`, which is where this pattern comes from
 * — the two menus are interchangeable to the reader, on different pages.
 *
 * The first two items, and the second is worded off the card rather than fixed: a
 * card already in somebody's hand is being reassigned, one nobody holds is being
 * assigned. The distinction is the one the row's own action button used to make,
 * so moving it into a menu did not quietly change what the page calls things.
 *
 * The status verbs below them are the second way to change a card, and the reason
 * the menu is longer than two items now. They emit `status` rather than writing,
 * and the page answers that with a confirmation — so reaching "Revoke" is three
 * deliberate clicks and never one, exactly as approving a request is on the
 * Requests page. A menu that could revoke from a single click would be the one
 * control on this page that could not be taken back.
 *
 * "View details" is the only path to a card's detail dialog — the row it is on
 * does nothing on click, carries no pointer cursor and has no hover, so nothing
 * else in either renderer claims that opening it is one click away. That is the
 * deliberate cost: a card's record is two clicks now. What it buys is a row that
 * does not open something whenever it is clicked, including when the reader only
 * meant to select text or reach the UID beside it.
 *
 * The keyboard path is unaffected by the row losing its tab stop: the trigger is
 * a real button, so Tab reaches it, Enter opens the menu and the arrows move
 * between items. The row's `tabindex="0"` used to sit ahead of both of its
 * controls in the tab order, which meant tabbing through the table was a walk
 * past every card rather than a walk through the things you can act on.
 *
 * Copying the UID stays on the cell rather than joining these: pasting a UID
 * into a door controller is frequent, and a cell target costs one click where a
 * menu item costs two.
 */
import { computed } from 'vue'
import { statusActionsFor } from 'src/composables/utils/accessCards'

const props = defineProps({
  card: { type: Object, required: true },
})

defineEmits(['view', 'assign', 'status'])

const statusActions = computed(() => statusActionsFor(props.card))
</script>

<style scoped>
.row-menu__list {
  min-width: 194px;
  padding: 5px;
}

/* Between the two card actions and the status verbs, so a reader does not have
   to read to tell that revoking is a different kind of act from reassigning. */
.row-menu__rule {
  margin: 5px 4px;
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
