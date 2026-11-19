<template>
  <q-dialog
    :model-value="modelValue"
    :maximized="$q.screen.lt.sm"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="dash-modal dash-modal--md">
      <!-- ── Header ─────────────────────────────────────────────────────────
           The employee is named here rather than in a panel: the dialog is
           opened from a table row, and once it covers the table nothing else on
           screen says whose money this is. -->
      <q-card-section class="dash-modal__head">
        <span class="dash-modal__head-icon">
          <!-- A face when the name resolves to exactly one roster employee who
               has one, otherwise initials — matching the row this dialog opened
               from. The tile stays an icon only while no name has arrived. -->
          <template v-if="avatarOf(employeeName).pictureUrl">
            <img :src="avatarOf(employeeName).pictureUrl" :alt="employeeName || 'Employee'" />
          </template>
          <q-icon v-else-if="!employeeName" name="o_account_balance" size="19px" />
          <span v-else>{{ avatarOf(employeeName).initials }}</span>
        </span>

        <div class="dash-modal__head-titles">
          <div class="dash-modal__title">{{ employeeName || 'Employee money' }}</div>
          <div class="dash-modal__sub">{{ headerSub }}</div>
        </div>

        <q-btn flat round dense icon="close" aria-label="Close" @click="close" />
      </q-card-section>

      <!-- ── Tabs ───────────────────────────────────────────────────────────
           The two payroll components sit behind one dialog because they describe
           the same employee's payslip, but nothing below this bar is shared:
           each tab is its own panel, its own API service and its own handlers.
           The inactive panel is destroyed rather than hidden, so switching tabs
           cannot leave one module's state sitting behind the other's. -->
      <div class="money-tabs" role="tablist" aria-label="Employee payroll components">
        <button
          v-for="entry in TABS"
          :key="entry.value"
          type="button"
          role="tab"
          class="money-tab"
          :class="{ 'money-tab--active': tab === entry.value }"
          :aria-selected="tab === entry.value"
          @click="tab = entry.value"
        >
          {{ entry.label }}
        </button>
      </div>

      <EmployeeContributionsPanel
        v-if="tab === 'contributions'"
        :pgi-id="pgiId"
        :epi-id="epiId"
        :employee-name="employeeName"
        :employee-id="employeeId"
        :cutoff-name="cutoffName"
        :contribution-amount="contributionAmount"
        :contribution-status="contributionStatus"
        @changed="$emit('changed')"
        @close="close"
      />

      <EmployeeAdjustmentsPanel
        v-else
        :epi-id="epiId"
        :employee-name="employeeName"
        @changed="$emit('changed')"
        @close="close"
      />
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * The employee-money dialog on the disbursement Review step: the tab shell for
 * statutory contributions (with withholding tax) and manual adjustments.
 *
 * The shell is chrome only. It owns the dialog frame, the employee identity and
 * which tab is showing — no contributions or adjustments data, no loading
 * flags, no writes. Those live in `EmployeeContributionsPanel` and
 * `EmployeeAdjustmentsPanel`, each with its own API service, so the two payroll
 * components stay separate implementations behind a shared frame.
 */
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import EmployeeAdjustmentsPanel from 'src/components/pages/Payroll/EmployeeAdjustmentsPanel.vue'
import EmployeeContributionsPanel from 'src/components/pages/Payroll/EmployeeContributionsPanel.vue'
import { avatarFor } from 'src/composables/utils/employee'

const $q = useQuasar()

const TABS = [
  {
    value: 'contributions',
    label: 'Contributions',
    hint: 'Statutory contributions and withholding tax',
  },
  {
    value: 'adjustments',
    label: 'Adjustments',
    hint: 'Manual additions and deductions',
  },
]

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Payout group instance the employee payroll item belongs to. */
  pgiId: { type: [Number, String], default: null },
  /** Employee payroll item id. */
  epiId: { type: [Number, String], default: null },
  employeeName: { type: String, default: '' },
  /**
   * The employee's uuid, passed straight through to the contributions panel.
   * Its month fallback looks the person up in a company-wide report, where the
   * uuid is the only safe join key.
   */
  employeeId: { type: String, default: '' },
  /**
   * The cutoff the run belongs to, for the header and for the "no tax month"
   * state. Taken from the review payload the page already holds — nothing extra
   * is fetched for it.
   */
  cutoffName: { type: String, default: '' },
  /**
   * The row's own contribution figure and status, passed straight to the
   * contributions panel. They matter in exactly one state — a cutoff with no tax
   * month, where the endpoint 404s and the panel would otherwise have no figure
   * to show beside a row the table is displaying with one.
   */
  contributionAmount: { type: [Number, String], default: null },
  contributionStatus: { type: String, default: '' },
  // Name → employee record, to put a face in the header; built once per page and
  // shared by every tab. A name held by two employees resolves to null, so the
  // avatar draws initials rather than the wrong photo. See `avatarFor`.
  employeeIndex: { type: Object, default: null },
  /**
   * Which tab opens. The review row's Contribution cell and its row menu both
   * open this dialog; the menu's Adjustments item is the same dialog aimed at
   * the other tab, not a second implementation.
   */
  initialTab: { type: String, default: 'contributions' },
})

// One event for both panels: whichever writes, the review table's figures are
// stale and the page refetches.
const emit = defineEmits(['update:modelValue', 'changed'])

const tab = ref('contributions')

const avatarOf = (name) => avatarFor(props.employeeIndex, name)

const activeTab = computed(() => TABS.find((entry) => entry.value === tab.value) || TABS[0])

const headerSub = computed(() =>
  [props.cutoffName, activeTab.value.hint].filter(Boolean).join(' · '),
)

/** Whatever the page asked for, never a tab that does not exist. */
function normaliseTab(value) {
  return TABS.some((entry) => entry.value === value) ? value : TABS[0].value
}

// Set the tab on open rather than on mount: the row that opened the dialog is
// what decides it, and reopening the same dialog from the other entry point must
// land on that entry point's tab.
watch(
  () => props.modelValue,
  (open) => {
    if (open) tab.value = normaliseTab(props.initialTab)
  },
)

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.money-tabs {
  display: flex;
  flex: none;
  gap: 2px;
  padding: 6px 16px 0;
  border-bottom: 1px solid var(--dash-line);
  background: var(--dash-surface);
}

.money-tab {
  appearance: none;
  margin-bottom: -1px;
  padding: 9px 14px 10px;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: var(--dash-r-sm) var(--dash-r-sm) 0 0;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dash-ink-4);
  cursor: pointer;
}

.money-tab:hover {
  color: var(--dash-ink-2);
  background: var(--dash-sunken);
}

.money-tab--active,
.money-tab--active:hover {
  color: var(--dash-accent);
  border-bottom-color: var(--dash-accent);
  background: transparent;
}

.money-tab:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--dash-accent-ring);
}
</style>
