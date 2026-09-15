<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="dash-modal dash-modal--xl">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="low_priority" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Leave sources</div>
            <div class="dash-modal__sub">{{ holidayType?.name || 'Holiday type' }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <!-- The gate sits on the type, not on these rows, so a chain that is
             fully configured and completely inert is otherwise invisible from
             in here. -->
        <p v-if="holidayType && !holidayType.autoGenerateLeave" class="htp-banner">
          <q-icon name="o_info" size="16px" />
          <span>
            Auto-apply is off for this holiday type, so none of these sources are used. Turn it on
            from <strong>Edit holiday type</strong>.
          </span>
        </p>

        <!-- ── Add ─────────────────────────────────────────────────────────── -->
        <div class="dash-modal__group">
          <p class="dash-modal__group-label">Add a leave source</p>

          <div class="htp-add-row">
            <label class="dash-modal__field">
              <span class="dash-modal__field-label">
                Leave type<span class="dash-modal__req">*</span>
              </span>
              <q-select
                v-model="draft.leave_type"
                :options="leaveTypeOptions"
                option-value="value"
                option-label="label"
                option-disable="disable"
                emit-value
                map-options
                outlined
                dense
                options-dense
                :loading="loadingLeaveTypes"
                hide-bottom-space
                class="dash-field"
                popup-content-class="dash-popup dash-popup--modal"
              >
                <template v-slot:prepend><q-icon name="event_note" size="18px" /></template>
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section>
                      <q-item-label>{{ scope.opt.label }}</q-item-label>
                      <q-item-label caption :class="scope.opt.captionTone">
                        {{ scope.opt.caption }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
                <template v-slot:no-option>
                  <q-item>
                    <q-item-section class="text-grey-7">
                      No leave types in this company yet
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </label>

            <q-btn
              label="Add"
              icon="add"
              class="dash-modal__submit htp-add-btn"
              unelevated
              :loading="saving"
              :disable="draft.leave_type == null"
              @click="submit"
            />
          </div>
          <p class="dash-modal__field-hint">
            It joins the end of the chain at position {{ nextPosition }}. Move it up to have it
            tried sooner.
          </p>
        </div>

        <!-- ── Chain ───────────────────────────────────────────────────────── -->
        <div class="dash-modal__group">
          <div class="dash-modal__group-head">
            <p class="dash-modal__group-label">Fallback chain</p>
            <span v-if="summary.hasAny" class="htp-count">{{ summaryLine }}</span>
          </div>

          <p class="htp-note">
            When a holiday of this type is created, each enabled source is tried in this order for
            every eligible employee — the first whose leave type approves wins, and an employee
            whose every source fails is skipped.
          </p>

          <div v-if="loading" class="htp-state">
            <q-spinner size="18px" color="primary" />
            <span>Loading leave sources…</span>
          </div>

          <div v-else-if="!policies.length" class="htp-state htp-state--empty">
            <q-icon name="o_low_priority" size="20px" />
            <span>No leave sources yet — a holiday of this type grants nothing.</span>
          </div>

          <ol v-else class="htp-chain">
            <li
              v-for="(policy, index) in policies"
              :key="policy.id"
              class="htp-row"
              :class="{ 'htp-row--off': !policy.isEnabled }"
            >
              <span class="htp-pos" aria-hidden="true">{{ index + 1 }}</span>

              <span class="htp-row-main">
                <span class="htp-name">{{ leaveTypeName(policy) }}</span>
                <span class="htp-meta">{{ rowMeta(policy) }}</span>
              </span>

              <span class="htp-row-actions">
                <q-toggle
                  :model-value="policy.isEnabled"
                  color="primary"
                  size="sm"
                  class="brand-toggle"
                  :disable="busyPolicyId === policy.id"
                  :aria-label="`${policy.isEnabled ? 'Disable' : 'Enable'} ${leaveTypeName(policy)}`"
                  @update:model-value="$emit('toggle', { policy, isEnabled: $event })"
                />
                <q-btn
                  flat
                  round
                  dense
                  icon="arrow_upward"
                  size="sm"
                  class="htp-icon-btn"
                  :disable="index === 0 || busyPolicyId === policy.id"
                  :aria-label="`Move ${leaveTypeName(policy)} earlier`"
                  @click="$emit('move', { policy, direction: 'up' })"
                />
                <q-btn
                  flat
                  round
                  dense
                  icon="arrow_downward"
                  size="sm"
                  class="htp-icon-btn"
                  :disable="index === policies.length - 1 || busyPolicyId === policy.id"
                  :aria-label="`Move ${leaveTypeName(policy)} later`"
                  @click="$emit('move', { policy, direction: 'down' })"
                />
                <q-btn
                  flat
                  round
                  dense
                  icon="close"
                  size="sm"
                  class="htp-icon-btn htp-icon-btn--danger"
                  :disable="busyPolicyId === policy.id"
                  :aria-label="`Remove ${leaveTypeName(policy)}`"
                  @click="$emit('remove', policy)"
                />
              </span>
            </li>
          </ol>
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
 * The leave sources a holiday type falls back through, in order.
 *
 * State is owned by the panel, as with the other settings dialogs: the table
 * prints the same chain, so a write made in here has to refresh what the column
 * reads. Every mutation is emitted rather than performed — this component
 * decides what the chain should look like, and the panel's composable is the
 * only thing that talks to the API.
 */
import { computed, ref, watch } from 'vue'
import {
  emptyHolidayPolicyDraft,
  nextOrder,
  summarizeHolidayPolicies,
} from '@/composables/utils/holidayTypes'
import { policyGrantLabel, summarizePolicies } from '@/composables/utils/leaveTypes'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** The normalized holiday type this chain belongs to. */
  holidayType: { type: Object, default: null },
  /** Normalized, chain-ordered policies, from `useAdminHolidayPolicies`. */
  policies: { type: Array, default: () => [] },
  /** The company's normalized leave types, for the picker. */
  leaveTypes: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  loadingLeaveTypes: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  busyPolicyId: { type: [Number, String], default: null },
})

const emit = defineEmits(['update:modelValue', 'assign', 'toggle', 'move', 'remove'])

const draft = ref(emptyHolidayPolicyDraft())

const summary = computed(() => summarizeHolidayPolicies(props.policies))

const summaryLine = computed(() => {
  const parts = [`${summary.value.enabled} enabled`]
  if (summary.value.disabled) parts.push(`${summary.value.disabled} off`)
  return parts.join(' · ')
})

const nextPosition = computed(() => nextOrder(props.policies))

/**
 * The picker, with each leave type's own grant rule as its caption.
 *
 * That caption is the useful part: a source can only approve if the employee
 * has credits, so a leave type carrying no grant policy will fail for everyone
 * and silently pass the holiday down the chain. Saying so at the moment of
 * choosing beats discovering it on the next holiday.
 */
const leaveTypeOptions = computed(() =>
  props.leaveTypes.map((type) => {
    const used = props.policies.some((policy) => String(policy.leaveTypeId) === String(type.id))
    const grants = summarizePolicies(type.policies)
    const accrual = (type.policies || []).find((policy) => !policy.isOverlay)

    let caption
    let captionTone = 'htp-opt-caption'
    if (used) {
      caption = 'Already in this chain'
    } else if (!grants.hasAny) {
      caption = 'No grant policy — it will never have credits to approve'
      captionTone = 'htp-opt-caption htp-opt-caption--warn'
    } else if (accrual) {
      caption = policyGrantLabel(accrual)
    } else {
      caption = 'Credits granted by hand only'
    }

    return { value: type.id, label: type.name, caption, captionTone, disable: used }
  }),
)

/** The picker holds names the chain rows do not always carry. */
function leaveTypeName(policy) {
  if (policy.leaveTypeName) return policy.leaveTypeName
  const match = props.leaveTypes.find((type) => String(type.id) === String(policy.leaveTypeId))
  return match?.name || `Leave type ${policy.leaveTypeId}`
}

function rowMeta(policy) {
  return policy.isEnabled ? `Position ${policy.order ?? '—'}` : 'Skipped — disabled'
}

function submit() {
  if (props.saving || draft.value.leave_type == null) return
  emit('assign', { ...draft.value, order: null })
}

// A fresh form each time the dialog opens, so a choice abandoned on one holiday
// type is not offered on the next.
watch(
  () => props.modelValue,
  (open) => {
    if (open) draft.value = emptyHolidayPolicyDraft()
  },
)

defineExpose({
  resetDraft() {
    draft.value = emptyHolidayPolicyDraft()
  },
})
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

.htp-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  padding: 10px 12px;
  background: var(--dash-warn-bg);
  border: 1px solid var(--dash-warn-line);
  border-radius: var(--dash-r-md);
  font-size: 12px;
  line-height: 1.5;
  color: var(--dash-warn);
}

.htp-banner .q-icon {
  flex: none;
  margin-top: 1px;
}

.htp-add-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 10px;
}

.htp-add-btn {
  height: 34px;
  padding: 0 16px;
  border-radius: var(--dash-r-md);
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
}

.htp-count {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dash-ink-3);
  font-variant-numeric: tabular-nums;
}

.htp-note {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--dash-ink-4);
}

.htp-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 18px 12px;
  font-size: 12.5px;
  color: var(--dash-ink-3);
}

.htp-state--empty {
  justify-content: center;
  text-align: center;
  border: 1px dashed var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
  color: var(--dash-ink-4);
}

/* The chain is a numbered list rather than a table: its order is the content,
   and a list says so in a way four columns of the same width do not. */
.htp-chain {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.htp-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
}

/* A disabled source keeps its place in the list — it is skipped, not removed —
   so it is quietened rather than hidden. */
.htp-row--off {
  background: var(--dash-n-25);
}

.htp-row--off .htp-name {
  color: var(--dash-ink-3);
}

.htp-pos {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: var(--dash-r-pill);
  background: var(--dash-n-100);
  color: var(--dash-ink-3);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.htp-row-main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}

.htp-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.htp-meta {
  font-size: 11px;
  color: var(--dash-ink-4);
}

.htp-row-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: none;
}

.htp-icon-btn {
  color: var(--dash-ink-4);
}

.htp-icon-btn:hover {
  color: var(--dash-ink);
}

.htp-icon-btn--danger:hover {
  color: var(--dash-critical);
}

.htp-opt-caption {
  color: var(--dash-ink-4);
}

.htp-opt-caption--warn {
  color: var(--dash-warn);
}

@media (max-width: 599px) {
  .htp-add-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .htp-add-btn {
    width: 100%;
  }
}
</style>
