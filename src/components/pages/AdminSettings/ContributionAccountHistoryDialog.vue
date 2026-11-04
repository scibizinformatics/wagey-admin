<template>
  <q-dialog :model-value="modelValue" @update:model-value="close">
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="history" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Account numbers</div>
            <div class="dash-modal__sub">{{ employeeName || 'Employee' }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <div v-if="!rows.length" class="ca-history__empty">
          <q-icon name="o_tag" size="20px" />
          <span>No account numbers recorded for this employee yet.</span>
        </div>

        <div v-else class="ca-history">
          <div v-for="row in rows" :key="row.id" class="ca-history__item">
            <div class="ca-history__top">
              <span class="ca-history__type">{{ typeLabel(row) }}</span>
              <span :class="['status-badge', row.isActive ? 'status-active' : 'status-inactive']">
                {{ row.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <div class="ca-history__number">{{ row.accountNumber }}</div>
            <div class="ca-history__meta">
              <span>Added {{ accountCreatedLabel(row) }}</span>
              <span v-if="row.deactivatedAt"> Deactivated {{ accountDeactivatedLabel(row) }} </span>
            </div>
          </div>
        </div>

        <p class="ca-history__note">
          A number is never edited. Replacing one deactivates it and adds a new row, so every number
          this employee has had stays here.
        </p>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn flat no-caps label="Close" class="dash-modal__cancel" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * Every account number one employee has held, including retired ones.
 *
 * The company-wide list already carries inactive rows and their deactivation
 * stamps, so this dialog is a filtered view rather than a second request. That
 * also means the history cannot disagree with the table it was opened from.
 */
import { computed } from 'vue'
import {
  accountCreatedLabel,
  accountDeactivatedLabel,
  accountTypeLabel,
  sortContributionAccounts,
} from 'src/composables/utils/contributionAccounts'
import { sameId } from 'src/composables/utils/contributionSettings'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  employeeName: { type: String, default: '' },
  /** The rows `accountsForEmployee` selected for this person. */
  accounts: { type: Array, default: () => [] },
  /** The company's contribution types, for live names. */
  types: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const rows = computed(() => sortContributionAccounts(props.accounts))

function typeLabel(row) {
  const type = props.types.find((candidate) => sameId(candidate.id, row.typeId)) ?? null
  return accountTypeLabel(row, type)
}

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

.ca-history {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ca-history__item {
  padding: 12px 14px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}

.ca-history__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ca-history__type {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dash-ink);
}

.ca-history__number {
  margin-top: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  color: var(--dash-ink);
  word-break: break-all;
}

.ca-history__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 6px;
  font-size: 11.5px;
  color: var(--dash-ink-4);
}

.ca-history__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 28px 12px;
  border: 1px dashed var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
  color: var(--dash-ink-4);
  font-size: 12.5px;
}

.ca-history__note {
  margin: 14px 0 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--dash-ink-4);
}
</style>
