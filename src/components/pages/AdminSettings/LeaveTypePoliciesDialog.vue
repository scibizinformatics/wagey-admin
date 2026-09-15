<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="dash-modal dash-modal--xl">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="rule" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Grant policies</div>
            <div class="dash-modal__sub">{{ leaveType?.name || 'Leave type' }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <!-- ── Add ─────────────────────────────────────────────────────────── -->
        <div class="dash-modal__group">
          <p class="dash-modal__group-label">Add a policy</p>

          <div class="dash-modal__grid">
            <label class="dash-modal__field dash-modal__span-2">
              <span class="dash-modal__field-label">Departments</span>
              <q-select
                v-model="draft.departments"
                :options="departmentOptions"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                multiple
                use-chips
                clearable
                outlined
                dense
                options-dense
                :loading="loadingDepartments"
                hide-bottom-space
                class="dash-field"
                popup-content-class="dash-popup dash-popup--modal"
              >
                <template v-slot:prepend><q-icon name="corporate_fare" size="18px" /></template>
                <template v-slot:no-option>
                  <q-item>
                    <q-item-section class="text-grey-7">
                      No departments in this company yet
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
              <span class="dash-modal__field-hint">
                Leave this empty and the policy applies company-wide, to every department.
              </span>
            </label>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label">
                How credits are granted<span class="dash-modal__req">*</span>
              </span>
              <q-select
                v-model="draft.grant_type"
                :options="grantTypeOptions"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                outlined
                dense
                options-dense
                hide-bottom-space
                class="dash-field"
                popup-content-class="dash-popup dash-popup--modal"
              >
                <template v-slot:prepend><q-icon name="event_repeat" size="18px" /></template>
              </q-select>
              <span class="dash-modal__field-hint">{{ grantTypeHint }}</span>
            </label>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label">
                Days per grant<span v-if="grantsCredits" class="dash-modal__req">*</span>
              </span>
              <q-input
                v-model.number="draft.grant_amount"
                type="number"
                min="0"
                step="0.5"
                outlined
                dense
                :disable="!grantsCredits"
                hide-bottom-space
                class="dash-field"
              >
                <template v-slot:prepend><q-icon name="exposure_plus_1" size="18px" /></template>
              </q-input>
              <span v-if="!grantsCredits" class="dash-modal__field-hint">
                A policy that grants nothing keeps an amount of 0.
              </span>
            </label>

            <!-- Only an annual grant has an anchor to count from; a monthly one
                 runs every month regardless, so the field would be a control
                 that changes nothing. -->
            <label v-if="draft.grant_type === 'annual'" class="dash-modal__field">
              <span class="dash-modal__field-label">Granted from</span>
              <q-select
                v-model="draft.grant_anchor"
                :options="grantAnchorOptions"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                outlined
                dense
                options-dense
                hide-bottom-space
                class="dash-field"
                popup-content-class="dash-popup dash-popup--modal"
              >
                <template v-slot:prepend><q-icon name="event" size="18px" /></template>
              </q-select>
            </label>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Months of service required</span>
              <q-input
                v-model.number="draft.service_length_required"
                type="number"
                min="0"
                step="1"
                outlined
                dense
                hide-bottom-space
                class="dash-field"
              >
                <template v-slot:prepend><q-icon name="hourglass_bottom" size="18px" /></template>
              </q-input>
            </label>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Maximum balance</span>
              <q-input
                v-model="draft.max_balance"
                type="number"
                min="0"
                step="0.5"
                placeholder="No cap"
                outlined
                dense
                hide-bottom-space
                class="dash-field"
              >
                <template v-slot:prepend><q-icon name="vertical_align_top" size="18px" /></template>
              </q-input>
              <span class="dash-modal__field-hint">Leave empty for no cap.</span>
            </label>
          </div>

          <!-- The rule in a sentence, built from the same helpers the table
               below prints, so the preview and the saved row cannot disagree. -->
          <p class="ltp-preview">
            <q-icon name="o_info" size="15px" />
            <span>{{ previewSentence }}</span>
          </p>

          <div class="ltp-add-actions">
            <q-btn
              label="Add policy"
              icon="add"
              class="dash-modal__submit ltp-add-btn"
              unelevated
              :loading="saving"
              @click="submit"
            />
          </div>
        </div>

        <!-- ── Existing ────────────────────────────────────────────────────── -->
        <div class="dash-modal__group">
          <div class="dash-modal__group-head">
            <p class="dash-modal__group-label">Current policies</p>
            <span v-if="summary.hasAny" class="ltp-count">{{ summaryLine }}</span>
          </div>

          <div v-if="loading" class="ltp-state">
            <q-spinner size="18px" color="primary" />
            <span>Loading policies…</span>
          </div>

          <div v-else-if="!policies.length" class="ltp-state ltp-state--empty">
            <q-icon name="o_rule" size="20px" />
            <span>No grant policies yet — this leave type grants nothing on its own.</span>
          </div>

          <table v-else class="ltp-table">
            <thead>
              <tr>
                <th>Applies to</th>
                <th>Grant</th>
                <th>Eligibility</th>
                <th class="ltp-num">Max balance</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="policy in sortedPolicies" :key="policy.id ?? policyKey(policy)">
                <td>
                  <span class="ltp-scope" :class="{ 'ltp-scope--wide': policy.companyWide }">
                    {{ policyScopeLabel(policy) }}
                  </span>
                </td>
                <td>
                  <span class="ltp-grant">{{ policyGrantLabel(policy) }}</span>
                  <span v-if="policy.grantType === 'annual'" class="ltp-grant-sub">
                    from {{ grantAnchorLabel(policy.grantAnchor).toLowerCase() }}
                  </span>
                </td>
                <td class="ltp-muted">{{ formatServiceLength(policy.serviceLengthRequired) }}</td>
                <td class="ltp-num ltp-muted">{{ formatMaxBalance(policy.maxBalance) }}</td>
              </tr>
            </tbody>
          </table>

          <p class="ltp-note">
            Event credits are never granted automatically — an admin adds them to somebody's balance
            from the Employees page.
          </p>
        </div>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn flat label="Close" class="dash-modal__cancel" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * The grant policies one leave type carries, and the form that adds to them.
 *
 * State is owned by the panel rather than here, for the same reason
 * `SitePositionRequirementsDialog` does it that way: the panel's table prints a
 * summary of the same policies, so an add made in here has to refresh the list
 * the column reads. A second composable instance would leave the column showing
 * pre-add figures until a reload.
 *
 * There is no edit or delete row action because the API documents neither —
 * only list and assign. A revision is a new policy; see `useAdminLeavePolicies`.
 */
import { computed, ref, watch } from 'vue'
import {
  GRANT_ANCHORS,
  GRANT_TYPES,
  emptyPolicyDraft,
  formatDays,
  formatMaxBalance,
  formatServiceLength,
  grantAnchorLabel,
  policyGrantLabel,
  policyScopeLabel,
  summarizePolicies,
} from '@/composables/utils/leaveTypes'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** The normalized leave type these policies belong to. */
  leaveType: { type: Object, default: null },
  /** Normalized policies for `leaveType`, from `useAdminLeavePolicies`. */
  policies: { type: Array, default: () => [] },
  departments: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  loadingDepartments: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'assign'])

const draft = ref(emptyPolicyDraft())

const grantTypeOptions = GRANT_TYPES.map(({ value, label }) => ({ value, label }))
const grantAnchorOptions = GRANT_ANCHORS

const departmentOptions = computed(() =>
  props.departments.map((department) => ({ value: department.id, label: department.name })),
)

const grantsCredits = computed(() => draft.value.grant_type !== 'none')

const grantTypeHint = computed(
  () => GRANT_TYPES.find((type) => type.value === draft.value.grant_type)?.hint || '',
)

const summary = computed(() => summarizePolicies(props.policies))

const summaryLine = computed(() => {
  const parts = []
  if (summary.value.accruing) parts.push(`${summary.value.accruing} accruing`)
  if (summary.value.overlays) parts.push(`${summary.value.overlays} by hand`)
  if (summary.value.companyWide) parts.push('company-wide')
  return parts.join(' · ')
})

/**
 * Company-wide policies first, then department-scoped ones: the widest rule is
 * the one that applies unless something narrower overrides it, so it reads as
 * the baseline the rest are exceptions to.
 */
const sortedPolicies = computed(() =>
  [...props.policies].sort((a, b) => {
    if (a.companyWide !== b.companyWide) return a.companyWide ? -1 : 1
    if (a.isOverlay !== b.isOverlay) return a.isOverlay ? 1 : -1
    return policyScopeLabel(a).localeCompare(policyScopeLabel(b))
  }),
)

/** A stable key for a policy the server has not given an id to yet. */
function policyKey(policy) {
  return `${policy.grantType}-${policy.departmentIds.join('.')}`
}

const previewSentence = computed(() => {
  const scope = draft.value.departments?.length
    ? departmentOptions.value
        .filter((option) => draft.value.departments.includes(option.value))
        .map((option) => option.label)
        .join(', ')
    : 'Everyone in the company'
  const name = props.leaveType?.name || 'this leave'

  if (draft.value.grant_type === 'none') {
    return `${scope} gets no automatic ${name} credits from this policy.`
  }

  const amount = formatDays(draft.value.grant_amount)
  const days = amount === '1' ? 'day' : 'days'
  const cadence =
    draft.value.grant_type === 'monthly'
      ? 'every month'
      : draft.value.grant_type === 'annual'
        ? `once a year from their ${grantAnchorLabel(draft.value.grant_anchor).toLowerCase()}`
        : 'whenever an admin grants it'

  const service = Number(draft.value.service_length_required) || 0
  const eligibility = service > 0 ? `, after ${service} months of service` : ''
  const cap =
    draft.value.max_balance === null ||
    draft.value.max_balance === undefined ||
    draft.value.max_balance === ''
      ? ''
      : `, up to a balance of ${formatDays(draft.value.max_balance)}`

  return `${scope} gets ${amount} ${days} of ${name} ${cadence}${eligibility}${cap}.`
})

function submit() {
  if (props.saving) return
  emit('assign', { ...draft.value })
}

// A fresh form each time the dialog opens, so a draft abandoned on one leave
// type is not offered on the next.
watch(
  () => props.modelValue,
  (open) => {
    if (open) draft.value = emptyPolicyDraft()
  },
)

// The panel clears the form by telling us the add landed, rather than us
// guessing from a changed list length — a refetch that returns the same count
// (a failed add followed by a reload) must not look like success.
defineExpose({
  resetDraft() {
    draft.value = emptyPolicyDraft()
  },
})
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

.ltp-preview {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 0;
  padding: 9px 11px;
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  font-size: 12px;
  line-height: 1.5;
  color: var(--dash-ink-2);
}

.ltp-preview .q-icon {
  flex: none;
  margin-top: 1px;
  color: var(--dash-ink-4);
}

.ltp-add-actions {
  display: flex;
  justify-content: flex-end;
}

.ltp-add-btn {
  height: 34px;
  padding: 0 16px;
  border-radius: var(--dash-r-md);
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
}

.ltp-count {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dash-ink-3);
  font-variant-numeric: tabular-nums;
}

.ltp-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 18px 12px;
  font-size: 12.5px;
  color: var(--dash-ink-3);
}

.ltp-state--empty {
  justify-content: center;
  text-align: center;
  border: 1px dashed var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
  color: var(--dash-ink-4);
}

.ltp-table {
  width: 100%;
  border-collapse: collapse;
}

.ltp-table th {
  padding: 10px 10px 8px;
  text-align: left;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--dash-ink-4);
  border-bottom: 1px solid var(--dash-line);
}

.ltp-table td {
  padding: 9px 10px;
  font-size: 12.5px;
  color: var(--dash-ink-2);
  border-bottom: 1px solid var(--dash-line-soft);
  vertical-align: middle;
}

.ltp-table tbody tr:last-child td {
  border-bottom: none;
}

.ltp-num {
  width: 120px;
  text-align: right !important;
  font-variant-numeric: tabular-nums;
}

.ltp-scope {
  font-weight: 500;
  color: var(--dash-ink);
}

/* The company-wide rule is the baseline the others are exceptions to, so it is
   named in the quieter weight rather than competing with the departments. */
.ltp-scope--wide {
  font-weight: 400;
  color: var(--dash-ink-3);
}

.ltp-grant {
  display: block;
  font-weight: 500;
  color: var(--dash-ink);
}

.ltp-grant-sub {
  display: block;
  margin-top: 1px;
  font-size: 11.5px;
  color: var(--dash-ink-4);
}

.ltp-muted {
  color: var(--dash-ink-3);
}

.ltp-note {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--dash-ink-4);
}

@media (max-width: 599px) {
  .dash-modal__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .ltp-add-btn {
    width: 100%;
  }
}
</style>
