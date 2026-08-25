<template>
  <div class="emp-table-wrap dash-scroll-x">
    <q-table
      :rows="employees"
      :columns="columns"
      row-key="id"
      flat
      :loading="loading"
      class="dash-qtable emp-table"
      hide-pagination
      :rows-per-page-options="[0]"
      selection="multiple"
      :selected="selected"
      @update:selected="(val) => $emit('update:selected', val)"
    >
      <template v-slot:header="props">
        <q-tr class="emp-table__head-row">
          <q-th auto-width class="emp-table__th">
            <q-checkbox
              :model-value="props.selected"
              :indeterminate="props.selected === 'some'"
              size="sm"
              aria-label="Select all on this page"
              @update:model-value="
                () => $emit('update:selected', selected.length > 0 ? [] : [...employees])
              "
            />
          </q-th>
          <q-th
            v-for="col in columns"
            :key="col.name"
            :props="props"
            class="emp-table__th"
            :class="col.headerClasses"
          >
            {{ col.label }}
          </q-th>
        </q-tr>
      </template>

      <template v-slot:body="props">
        <q-tr
          class="dash-qtable__row emp-table__row"
          :class="{ 'dash-qtable__row--muted': isTerminated(props.row) }"
        >
          <q-td auto-width class="emp-table__td">
            <q-checkbox
              v-model="props.selected"
              :val="props.row"
              size="sm"
              :aria-label="`Select ${getFullName(props.row)}`"
            />
          </q-td>

          <!-- Identity: name with its role beside it, email beneath. Role used to
               own a whole column; folding it in here is what freed the width the
               table needed to stop scrolling on a 1024px laptop. -->
          <q-td key="name" :props="props" class="emp-table__td">
            <div class="who">
              <q-avatar
                v-if="props.row.user?.picture_url"
                size="34px"
                class="who__avatar"
                @click="$emit('view-photo', props.row)"
              >
                <img :src="props.row.user.picture_url" :alt="getFullName(props.row)" />
              </q-avatar>
              <q-avatar
                v-else
                size="34px"
                class="who__avatar"
                :style="{ background: getAvatarColor(getFullName(props.row)) }"
                @click="$emit('view-photo', props.row)"
              >
                <span class="who__initials">{{ getInitials(getFullName(props.row)) }}</span>
              </q-avatar>

              <div class="who__block">
                <div class="who__line">
                  <!-- The name is the row's primary action. Reaching details via
                       the ⋯ menu only was two clicks for the most common intent. -->
                  <button type="button" class="who__name" @click="$emit('view', props.row)">
                    {{ getFullName(props.row) }}
                  </button>
                  <span class="who__role">{{ getRole(props.row) }}</span>
                </div>
                <a :href="`mailto:${getEmail(props.row)}`" class="who__email">
                  {{ getEmail(props.row) }}
                </a>
              </div>
            </div>
          </q-td>

          <q-td key="status" :props="props" class="emp-table__td">
            <span class="dash-chip" :class="isTerminated(props.row) ? '' : 'dash-chip--good'">
              <span class="dash-chip__dot" />
              {{ getStatus(props.row) }}
            </span>
          </q-td>

          <q-td
            v-for="lt in visibleLeaveTypes"
            :key="`leave_${lt.id}`"
            :props="props"
            class="emp-table__td emp-table__td--num"
          >
            <q-skeleton v-if="isLoadingBalance(props.row)" type="text" width="30px" height="14px" />
            <span v-else class="dash-num">{{ getLeaveBalanceForType(props.row, lt.id) }}</span>
          </q-td>

          <q-td key="ctoBalance" :props="props" class="emp-table__td emp-table__td--num">
            <q-skeleton v-if="isLoadingBalance(props.row)" type="text" width="30px" height="14px" />
            <span v-else class="dash-num">{{ getCtoBalance(props.row) }}</span>
          </q-td>

          <q-td key="contract" :props="props" class="emp-table__td">
            <q-skeleton
              v-if="isLoadingContract(props.row)"
              type="text"
              width="54px"
              height="14px"
            />
            <span
              v-else
              class="dash-chip contract"
              :class="hasContract(props.row, contracts, companyId) ? 'dash-chip--info' : ''"
            >
              {{ getContract(props.row, contracts, companyId) }}
            </span>
          </q-td>

          <q-td key="actions" :props="props" class="emp-table__td emp-table__td--actions">
            <q-btn flat round dense icon="more_horiz" size="12px" class="row-btn">
              <EmployeeRowMenu
                :employee="props.row"
                :has-contract="hasContract(props.row, contracts, companyId)"
                @view="$emit('view', props.row)"
                @edit="$emit('edit', props.row)"
                @assign="$emit('assign', props.row)"
                @terminate="$emit('terminate', props.row)"
                @restore="$emit('restore', props.row)"
                @add-leave-balance="$emit('add-leave-balance', props.row)"
                @add-cto-balance="$emit('add-cto-balance', props.row)"
              />
            </q-btn>
          </q-td>
        </q-tr>
      </template>

      <!-- Two different empty states, because they need two different actions:
           a filtered-to-nothing list wants the filters cleared, an genuinely
           empty company wants its first employee added. -->
      <template v-slot:no-data>
        <div v-if="!loading" class="dash-empty">
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
            class="empty-btn"
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
            class="empty-btn empty-btn--primary"
            @click="$emit('add')"
          />
        </div>
      </template>
    </q-table>
  </div>
</template>

<script setup>
/**
 * The employee list as a table, used on laptop and desktop.
 * EmployeeCardList takes over below 1024px.
 *
 * The visible leave-balance columns scale with viewport width. With three leave
 * types configured the full table needs roughly 1000px, which does not exist on
 * a 1024px laptop once the navigation rail is subtracted — so the table showed a
 * horizontal scrollbar and hid columns behind a gesture. Dropping to one leave
 * column at that width, plus folding Role into the identity cell, makes it fit.
 */
import { computed } from 'vue'
import { useQuasar } from 'quasar'
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

const $q = useQuasar()

const props = defineProps({
  employees: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  contracts: { type: Object, default: () => ({}) },
  companyId: { type: [Number, String], default: null },
  selected: { type: Array, default: () => [] },
  leaveTypes: { type: Array, default: () => [] },
  loadingContractIds: { type: Object, default: () => new Set() },
  loadingBalanceIds: { type: Object, default: () => new Set() },
  /** Drives which empty state to show when there are no rows. */
  isFiltered: { type: Boolean, default: false },
})

defineEmits([
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

// How many leave columns the viewport can carry without forcing a sideways
// scroll. Anything hidden here is still shown in full on the card view and in
// the employee's detail modal.
const leaveColumnBudget = computed(() => {
  const w = $q.screen.width
  if (w >= 1600) return 3
  if (w >= 1280) return 2
  return 1
})

const visibleLeaveTypes = computed(() =>
  props.leaveTypes
    .filter((lt) => !lt.name?.toLowerCase().includes('unpaid'))
    .slice(0, leaveColumnBudget.value),
)

const isLoadingContract = (employee) => props.loadingContractIds.has(employee.id)
const isLoadingBalance = (employee) => props.loadingBalanceIds.has(employee.id)

// Column widths, tightened so the table genuinely fits its narrowest supported
// viewport. At 1024px the content box is about 728px after the navigation rail
// and page padding; with one leave column these sum to roughly 664px, which
// leaves headroom instead of overflowing by a few pixels and re-introducing the
// horizontal scrollbar this redesign set out to remove.
const columns = computed(() => [
  {
    name: 'name',
    label: 'Employee',
    field: (row) => getFullName(row),
    align: 'left',
    style: 'min-width: 200px',
  },
  {
    name: 'status',
    label: 'Status',
    field: (row) => getStatus(row),
    align: 'left',
    style: 'width: 104px',
  },
  ...visibleLeaveTypes.value.map((lt) => ({
    name: `leave_${lt.id}`,
    label: lt.name || 'Leave',
    field: (row) => getLeaveBalanceForType(row, lt.id),
    align: 'right',
    style: 'width: 88px',
    headerClasses: 'emp-table__th--num',
  })),
  {
    name: 'ctoBalance',
    label: 'CTO',
    field: (row) => getCtoBalance(row),
    align: 'right',
    style: 'width: 72px',
    headerClasses: 'emp-table__th--num',
  },
  {
    name: 'contract',
    label: 'Contract',
    field: (row) => getContract(row, props.contracts, props.companyId),
    align: 'left',
    style: 'width: 108px',
  },
  {
    name: 'actions',
    label: '',
    field: 'actions',
    align: 'center',
    style: 'width: 52px',
    headerClasses: 'emp-table__th--actions',
  },
])
</script>

<style scoped>
.emp-table-wrap {
  overflow-x: auto;
  padding: 0 6px;
}

/* The card reset, header strip, row rhythm, hover plate, dividers and the
   dimmed-record state all come from `dash-qtable` in src/css/dashboard.scss —
   including the terminated-row tint, which used to be spelled
   `emp-table__row--inactive` here, `--lapsed` on invitations and `--off` on
   announcements, for the same two declarations. Only the two column modifiers
   below are this table's own. */
.emp-table :deep(.emp-table__th--num) {
  text-align: right !important;
}
.emp-table :deep(.emp-table__td--num) {
  text-align: right;
  color: var(--dash-ink);
  font-variant-numeric: tabular-nums;
}
.emp-table :deep(.emp-table__th--actions) {
  width: 56px;
}
.emp-table :deep(.emp-table__td--actions) {
  text-align: center;
}

/* ── Identity cell ── */
.who {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.who__avatar {
  flex-shrink: 0;
  cursor: pointer;
}

.who__initials {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.who__block {
  min-width: 0;
}

.who__line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.who__name {
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--dash-fast) var(--dash-ease);
}
.who__name:hover {
  color: var(--dash-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.who__name:focus-visible {
  outline: none;
  border-radius: var(--dash-r-xs);
  box-shadow:
    0 0 0 2px var(--dash-surface),
    0 0 0 4px var(--dash-accent-ring);
}

/* Role reads as metadata on the name, not as a second value competing with it. */
.who__role {
  flex-shrink: 0;
  font-size: 11.5px;
  color: var(--dash-ink-3);
  padding-left: 8px;
  border-left: 1px solid var(--dash-line);
  white-space: nowrap;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.who__email {
  display: block;
  font-size: 12px;
  color: var(--dash-ink-4);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.who__email:hover {
  color: var(--dash-accent);
  text-decoration: underline;
}

.contract {
  text-transform: capitalize;
}

.row-btn {
  color: var(--dash-ink-4);
}
.row-btn:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
}

/* Laptop (1024–1279) runs the table at its tightest: one leave column, less cell
   padding, and a shorter role clamp. Below 1024 the card list takes over, so
   nothing here has to survive narrower than this. */
@media (max-width: 1279px) {
  .emp-table-wrap {
    padding: 0 2px;
  }
  .emp-table :deep(.emp-table__th) {
    padding: 12px 9px 10px !important;
  }
  .emp-table :deep(.emp-table__td) {
    padding: 10px 9px !important;
  }
  .who {
    gap: 9px;
  }
  .who__role {
    max-width: 84px;
    padding-left: 7px;
  }
}

/* ── Empty state action ── */
.empty-btn {
  margin-top: 6px;
  padding: 0 12px;
  height: 32px;
  border-radius: var(--dash-r-md);
  font-weight: 500;
  color: var(--dash-ink-2);
}
.empty-btn--primary {
  background: var(--dash-brand);
  color: #fff;
}
.empty-btn--primary:hover {
  background: #193d5c;
}
</style>
