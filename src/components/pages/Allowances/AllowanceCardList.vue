<template>
  <div class="all-cards">
    <template v-if="loading">
      <div v-for="n in 4" :key="`sk-${n}`" class="all-card all-card--skeleton">
        <span class="dash-shimmer" style="width: 45%; height: 14px" />
        <span class="dash-shimmer" style="width: 62%; height: 10px" />
      </div>
    </template>

    <div v-else-if="!allowances.length" class="dash-empty all-cards__empty">
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
        @click="$emit('clear-filters')"
      />
    </div>

    <article
      v-for="allowance in allowances"
      v-else
      :key="allowance.id"
      class="all-card"
    >
      <div class="all-card__top">
        <div class="all-card__identity">
          <div class="all-card__name">{{ allowance.name }}</div>
          <div class="all-card__policy">
            {{ payoutPolicyLabel(allowance.payout_policy, allowance.payout_policy_display) }}
          </div>
        </div>

        <q-btn
          flat
          round
          dense
          icon="edit"
          size="13px"
          class="all-card__edit"
          aria-label="Edit allowance"
          @click="$emit('edit', allowance)"
        />
      </div>

      <div class="all-card__foot">
        <span class="dash-chip" :class="allowance.is_taxable ? 'dash-chip--good' : ''">
          <span class="dash-chip__dot" />
          {{ taxableLabel(allowance.is_taxable) }}
        </span>
      </div>
    </article>
  </div>
</template>

<script setup>
import { payoutPolicyLabel, taxableLabel } from 'src/composables/utils/allowances'

defineProps({
  allowances: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
})

defineEmits(['edit', 'clear-filters'])
</script>

<style scoped>
.all-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.all-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 13px 14px;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  box-shadow: var(--dash-shadow-xs);
}

.all-card__top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.all-card__identity {
  flex: 1;
  min-width: 0;
}

.all-card__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.all-card__policy {
  margin-top: 3px;
  font-size: 12.5px;
  color: var(--dash-ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.all-card__edit {
  flex: none;
  color: var(--dash-ink-4);
}
.all-card__edit:hover {
  color: var(--dash-accent);
}

.all-card__foot {
  padding-top: 10px;
  border-top: 1px solid var(--dash-line-soft);
}

.all-card--skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.all-cards__empty {
  padding: 28px 12px;
}
</style>