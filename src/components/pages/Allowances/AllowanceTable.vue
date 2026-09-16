<template>
  <div v-if="loading" class="all-table-wrap">
    <TableSkeleton :columns="columns" :rows="5" />
  </div>

  <div v-else-if="!allowances.length" class="dash-empty">
    <span class="dash-featured-icon">
      <q-icon :name="isFiltered ? 'filter_alt_off' : 'card_giftcard'" size="20px" />
    </span>
    <p class="dash-empty__title">
      {{ isFiltered ? 'No allowance types match your search' : 'No allowance types yet' }}
    </p>
    <p class="dash-empty__sub">
      {{
        isFiltered
          ? 'Try a different search term, or clear the filter.'
          : 'Add the first allowance type to start paying allowances.'
      }}
    </p>
    <q-btn
      v-if="isFiltered"
      outline
      no-caps
      dense
      size="12px"
      icon="filter_alt_off"
      label="Clear filter"
      class="all-empty__btn"
      @click="$emit('clear-filters')"
    />
  </div>

  <div v-else class="all-table-wrap">
    <q-table
      :rows="allowances"
      :columns="columns"
      row-key="id"
      flat
      class="dash-qtable all-table"
      hide-pagination
      :rows-per-page-options="[0]"
    >
      <template v-slot:body="props">
        <q-tr class="dash-qtable__row">
          <q-td key="name" :props="props" class="all-table__td all-table__td--strong">
            {{ props.row.name }}
          </q-td>
          <q-td key="payout_policy" :props="props" class="all-table__td">
            {{ payoutPolicyLabel(props.row.payout_policy, props.row.payout_policy_display) }}
          </q-td>
          <q-td key="is_taxable" :props="props" class="all-table__td">
            <span class="dash-chip" :class="props.row.is_taxable ? 'dash-chip--good' : ''">
              <span class="dash-chip__dot" />
              {{ taxableLabel(props.row.is_taxable) }}
            </span>
          </q-td>
          <q-td key="actions" :props="props" class="all-table__td actions">
            <q-btn flat round dense icon="more_horiz" class="all-table__menu" aria-label="Row actions">
              <q-menu anchor="bottom right" self="top right" class="dash-popup">
                <q-list dense style="min-width: 150px">
                  <q-item clickable v-close-popup @click="$emit('edit', props.row)">
                    <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                    <q-item-section>Edit allowance</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </div>
</template>

<script setup>
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import { payoutPolicyLabel, taxableLabel } from 'src/composables/utils/allowances'

defineProps({
  allowances: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
})

defineEmits(['edit', 'clear-filters'])

const columns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left' },
  { name: 'payout_policy', label: 'Payout policy', field: 'payout_policy', align: 'left' },
  { name: 'is_taxable', label: 'Taxation', field: 'is_taxable', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]
</script>

<style scoped>
.all-table-wrap {
  overflow-x: auto;
}

.all-table__td--strong {
  color: var(--dash-ink);
  font-weight: 500;
}

.all-table__menu {
  color: var(--dash-ink-4);
}
.all-table__menu:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
}

.all-empty__btn {
  color: var(--dash-accent);
  font-weight: 600;
  padding: 0 8px;
}
</style>