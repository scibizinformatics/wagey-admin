<template>
  <div class="cards">
    <!-- Loading: card-shaped placeholders, so the list does not jump when data
         lands the way a spinner-to-content swap does. -->
    <template v-if="loading">
      <div v-for="n in 6" :key="`sk-${n}`" class="card card--skeleton">
        <div class="card__top">
          <span class="dash-shimmer card__sk-avatar" />
          <div class="card__sk-lines">
            <span class="dash-shimmer" style="width: 58%" />
            <span class="dash-shimmer" style="width: 40%; height: 8px" />
          </div>
        </div>
        <div class="card__grid">
          <span v-for="i in 4" :key="i" class="dash-shimmer" style="height: 26px" />
        </div>
      </div>
    </template>

    <!-- Filtered-to-nothing and genuinely-empty need different actions. -->
    <div v-else-if="!employees.length" class="dash-empty cards__empty">
      <span class="dash-featured-icon">
        <q-icon :name="isFiltered ? 'filter_alt_off' : 'group_add'" size="20px" />
      </span>
      <p class="dash-empty__title">
        {{ isFiltered ? 'No employees match these filters' : 'No employees yet' }}
      </p>
      <p class="dash-empty__sub">
        {{
          isFiltered
            ? 'Nothing here fits the current search and filters.'
            : 'Add your first employee to start tracking attendance and payroll.'
        }}
      </p>
      <q-btn
        v-if="isFiltered"
        outline
        no-caps
        dense
        size="12px"
        icon="filter_alt_off"
        label="Clear filters"
        class="cards__empty-btn"
        @click="$emit('clear-filters')"
      />
      <q-btn
        v-else
        unelevated
        no-caps
        dense
        size="12px"
        icon="add"
        label="Add employee"
        class="cards__empty-btn cards__empty-btn--primary"
        @click="$emit('add')"
      />
    </div>

    <article
      v-for="emp in employees"
      v-else
      :key="emp.id"
      class="card"
      :class="{ 'card--selected': isSelected(emp), 'card--inactive': isTerminated(emp) }"
    >
      <div class="card__top">
        <q-checkbox
          :model-value="isSelected(emp)"
          size="sm"
          class="card__check"
          :aria-label="`Select ${getFullName(emp)}`"
          @update:model-value="(v) => toggle(emp, v)"
        />

        <q-avatar
          v-if="emp.user?.picture_url"
          size="38px"
          class="card__avatar"
          @click="$emit('view-photo', emp)"
        >
          <img :src="emp.user.picture_url" :alt="getFullName(emp)" />
        </q-avatar>
        <q-avatar
          v-else
          size="38px"
          class="card__avatar"
          :style="{ background: getAvatarColor(getFullName(emp)) }"
          @click="$emit('view-photo', emp)"
        >
          <span class="card__initials">{{ getInitials(getFullName(emp)) }}</span>
        </q-avatar>

        <div class="card__identity">
          <button type="button" class="card__name" @click="$emit('view', emp)">
            {{ getFullName(emp) }}
          </button>
          <a :href="`mailto:${getEmail(emp)}`" class="card__email">{{ getEmail(emp) }}</a>
        </div>

        <div class="card__top-right">
          <span class="dash-chip" :class="isTerminated(emp) ? '' : 'dash-chip--good'">
            <span class="dash-chip__dot" />
            {{ getStatus(emp) }}
          </span>

          <q-btn flat round dense icon="more_horiz" size="12px" class="card__menu-btn">
            <EmployeeRowMenu
              :employee="emp"
              :has-contract="hasContract(emp, contracts, companyId)"
              @view="$emit('view', emp)"
              @edit="$emit('edit', emp)"
              @assign="$emit('assign', emp)"
              @terminate="$emit('terminate', emp)"
              @restore="$emit('restore', emp)"
              @add-leave-balance="$emit('add-leave-balance', emp)"
              @add-cto-balance="$emit('add-cto-balance', emp)"
            />
          </q-btn>
        </div>
      </div>

      <!-- Everything the table shows as columns, as a wrapping definition grid.
           This is what removes the horizontal scroll on tablet rather than just
           narrowing it. -->
      <dl class="card__grid">
        <div class="field">
          <dt class="field__label">Role</dt>
          <dd class="field__value">{{ getRole(emp) }}</dd>
        </div>

        <div class="field">
          <dt class="field__label">Contract</dt>
          <dd class="field__value">
            <q-skeleton v-if="isLoadingContract(emp)" type="text" width="54px" height="14px" />
            <span
              v-else
              class="dash-chip"
              :class="hasContract(emp, contracts, companyId) ? 'dash-chip--info' : ''"
            >
              {{ getContract(emp, contracts, companyId) }}
            </span>
          </dd>
        </div>

        <div v-for="lt in leaveTypes" :key="lt.id" class="field">
          <dt class="field__label">{{ lt.name }}</dt>
          <dd class="field__value dash-num">
            <q-skeleton v-if="isLoadingBalance(emp)" type="text" width="30px" height="14px" />
            <span v-else>{{ getLeaveBalanceForType(emp, lt.id) }}</span>
          </dd>
        </div>

        <div class="field">
          <dt class="field__label">CTO</dt>
          <dd class="field__value dash-num">
            <q-skeleton v-if="isLoadingBalance(emp)" type="text" width="30px" height="14px" />
            <span v-else>{{ getCtoBalance(emp) }}</span>
          </dd>
        </div>
      </dl>
    </article>
  </div>
</template>

<script setup>
/**
 * The employee list as cards, used at tablet width and below.
 *
 * The table needs roughly 700–1000px depending on how many leave types are
 * configured. Below 1024px, once the navigation rail has taken its share, that
 * width does not exist — the old page answered this with a horizontal scrollbar,
 * which hides half the columns behind a gesture nobody discovers. Each record
 * becomes a card instead, so every field stays visible and nothing scrolls
 * sideways.
 *
 * Accessors are shared with EmployeeTable via composables/utils/employee.js.
 */
import EmployeeRowMenu from '@/components/pages/Employees/EmployeeRowMenu.vue'
import {
  getFullName,
  getEmail,
  getRole,
  getStatus,
  getInitials,
  getContract,
  hasContract,
  getLeaveBalanceForType,
  getCtoBalance,
  getAvatarColor,
  isTerminated,
} from '@/composables/utils/employee'

const props = defineProps({
  employees: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  contracts: { type: Object, default: () => ({}) },
  companyId: { type: [Number, String], default: null },
  selected: { type: Array, default: () => [] },
  leaveTypes: { type: Array, default: () => [] },
  loadingContractIds: { type: Object, default: () => new Set() },
  loadingBalanceIds: { type: Object, default: () => new Set() },
  /** Drives which empty state to show when there are no cards. */
  isFiltered: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update:selected',
  'view',
  'edit',
  'assign',
  'terminate',
  'restore',
  'view-photo',
  'add-leave-balance',
  'add-cto-balance',
  'clear-filters',
  'add',
])

function isSelected(emp) {
  return props.selected.some((e) => e.id === emp.id)
}

function toggle(emp, checked) {
  const next = checked
    ? [...props.selected, emp]
    : props.selected.filter((e) => e.id !== emp.id)
  emit('update:selected', next)
}

const isLoadingContract = (emp) => props.loadingContractIds.has(emp.id)
const isLoadingBalance = (emp) => props.loadingBalanceIds.has(emp.id)
</script>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
  padding: 14px 16px 16px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  transition: border-color var(--dash-fast) var(--dash-ease),
    box-shadow var(--dash-fast) var(--dash-ease);
}
.card--selected {
  border-color: var(--dash-info-line);
  box-shadow: 0 0 0 3px var(--dash-accent-ring);
}
/* Terminated records stay readable but recede — they are history, not work. */
.card--inactive {
  background: var(--dash-n-25);
}
.card--inactive .card__name {
  color: var(--dash-ink-2);
}

/* ── Top row ── */
.card__top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.card__check {
  margin: -2px 0 0 -6px;
  flex-shrink: 0;
}

.card__avatar {
  flex-shrink: 0;
  cursor: pointer;
}

.card__initials {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.card__identity {
  flex: 1;
  min-width: 0;
}

/* The name is the card's primary action, matching the table. */
.card__name {
  display: block;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.008em;
  color: var(--dash-ink);
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.card__name:hover {
  color: var(--dash-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.card__name:focus-visible {
  outline: none;
  border-radius: var(--dash-r-xs);
  box-shadow: 0 0 0 2px var(--dash-surface), 0 0 0 4px var(--dash-accent-ring);
}

.card__email {
  display: block;
  font-size: 12px;
  color: var(--dash-ink-3);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card__email:hover {
  color: var(--dash-accent);
  text-decoration: underline;
}

.card__top-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.card__menu-btn {
  color: var(--dash-ink-4);
}
.card__menu-btn:hover {
  color: var(--dash-ink);
  background: var(--dash-n-50);
}

/* ── Field grid ── */
.card__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
  gap: 10px 12px;
  margin: 0;
  padding-top: 12px;
  border-top: 1px solid var(--dash-line-soft);
}

.field {
  min-width: 0;
}

.field__label {
  margin: 0;
  font-size: 11.5px;
  color: var(--dash-ink-4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.field__value {
  margin: 3px 0 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  text-transform: capitalize;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Empty state ── */
/* The grid is auto-fill, so an empty state placed in it would sit in one narrow
   column instead of centring across the card. */
.cards__empty {
  grid-column: 1 / -1;
}

.cards__empty-btn {
  margin-top: 6px;
  padding: 0 12px;
  height: 32px;
  border-radius: var(--dash-r-md);
  font-weight: 500;
  color: var(--dash-ink-2);
}
.cards__empty-btn--primary {
  background: var(--dash-brand);
  color: #fff;
}
.cards__empty-btn--primary:hover {
  background: #193d5c;
}

/* ── Skeleton ── */
.card--skeleton {
  gap: 12px;
}
.card__sk-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  flex-shrink: 0;
}
.card__sk-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-top: 4px;
}

@media (max-width: 560px) {
  .cards {
    grid-template-columns: 1fr;
    padding: 12px;
  }
}
</style>
