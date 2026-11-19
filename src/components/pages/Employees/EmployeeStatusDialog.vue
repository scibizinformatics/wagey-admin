<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--confirm">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon dash-modal__head-icon--warn">
            <q-icon name="o_swap_horiz" size="20px" />
          </span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Update employment status</div>
            <div class="dash-modal__sub">{{ fullName }}</div>
          </div>
        </div>
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <div class="dash-modal__confirm-text">
          <template v-if="loadingCurrentStatus">
            Reading <strong>{{ fullName }}</strong
            >'s current employment status…
          </template>
          <template v-else>
            <strong>{{ fullName }}</strong> currently reads <strong>{{ currentLabel }}</strong
            >. Pick the status that should apply from today.
          </template>
        </div>

        <!-- A bespoke dialog rather than `ConfirmDialog`: the decision is *which*
             status to apply, and `ConfirmCard` is deliberately slotless, so it
             cannot collect one (the `DeviceDeactivateDialog` precedent). -->
        <label class="dash-modal__field st-status">
          <span class="dash-modal__field-label"
            >Employment status<span class="dash-modal__req">*</span></span
          >
          <q-select
            v-model="selectedId"
            :options="statusOptions"
            option-value="id"
            option-label="name"
            emit-value
            map-options
            dense
            outlined
            hide-bottom-space
            :loading="loadingStatuses"
            :disable="loading"
            placeholder="Choose a status"
            popup-content-class="dash-popup dash-popup--modal"
            class="st-status__select dash-field"
          >
            <template v-slot:prepend>
              <q-icon name="o_badge" size="16px" />
            </template>
          </q-select>
          <span v-if="separatesEmployee" class="dash-modal__field-hint">
            A separated status also ends this employee's active payroll contracts and deactivates
            their devices.
          </span>
          <span
            v-else-if="!loadingStatuses && !statusOptions.length"
            class="dash-modal__field-hint"
          >
            This company has no other employment status to move to yet.
          </span>
        </label>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn
          flat
          no-caps
          label="Cancel"
          class="dash-modal__cancel"
          @click="$emit('update:modelValue', false)"
        />
        <q-btn
          unelevated
          no-caps
          label="Update status"
          class="dash-modal__approve"
          :disable="!canSubmit"
          :loading="loading"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * The Employees row menu's Cancel action.
 *
 * Replaces the old "Terminate" confirm: terminating is only one of the statuses
 * a company may have, and hard-coding it made every other one unreachable from
 * this page. The list comes from the company's own employment statuses, so a
 * company that names its statuses "Resigned" / "Retired" gets exactly those —
 * minus the `active` category, which is what this action moves people away from.
 *
 * The write itself lives in the page's `updateEmployeeStatus`, reachable only
 * from the `confirm` this dialog emits, so the footer button's `:loading` covers
 * the request and a second click cannot land.
 */
import { computed, ref, watch } from 'vue'
import { getFullName } from '@/composables/utils/employee'
import {
  EMPLOYEE_MOVE_STATUS_CATEGORIES,
  employmentStatusLabelOf,
} from '@/composables/utils/employmentStatuses'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** The employee the menu was opened on, frozen by the page. */
  employee: { type: Object, default: () => ({}) },
  /** Selectable statuses for the active company, from `useEmploymentStatuses`. */
  statuses: { type: Array, default: () => [] },
  /** Id/code/name index of every status, so the fallback label can be resolved. */
  statusLookup: {
    type: Object,
    default: () => ({ byId: new Map(), byCode: new Map(), byName: new Map() }),
  },
  loadingStatuses: { type: Boolean, default: false },
  /**
   * The employee's current status, read by pk from
   * `GET …/employment-statuses/{id}/`. `null` until it lands, and also when the
   * row carries no pk or the read failed — the heuristics below are the fallback.
   */
  currentStatus: { type: Object, default: null },
  loadingCurrentStatus: { type: Boolean, default: false },
  /** The page's in-flight state, so the button cannot be pressed twice. */
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const fullName = computed(() => getFullName(props.employee))

/**
 * Which status the row is on now.
 *
 * The status read by pk wins when it is there: it is the only authoritative
 * answer, because the employee row carries the status as an id and its code
 * fields arrive in more than one shape. The matches below are the fallback for
 * a row with no pk (or a read that 404s), and both shapes are still read so the
 * dropdown can preselect instead of opening blank.
 */
const resolvedCurrentStatus = computed(() => {
  if (props.currentStatus?.id != null) return props.currentStatus

  const list = props.statuses
  const code = props.employee?.status_code ?? props.employee?.companies?.[0]?.employment_status
  if (code && typeof code === 'string') {
    const match = list.find(
      (s) => String(s.code ?? '').toLowerCase() === String(code).toLowerCase(),
    )
    if (match) return match
  }

  const id = props.employee?.status
  if (id != null && /^\d+$/.test(String(id))) {
    return list.find((s) => Number(s.id) === Number(id)) ?? null
  }

  return null
})

const currentLabel = computed(
  () =>
    resolvedCurrentStatus.value?.name ||
    employmentStatusLabelOf(props.employee, props.statusLookup),
)

/**
 * The categories this action may move somebody to — see
 * `EMPLOYEE_MOVE_STATUS_CATEGORIES` for why `active` is not one of them.
 */
const statusOptions = computed(() =>
  props.statuses.filter((s) =>
    EMPLOYEE_MOVE_STATUS_CATEGORIES.includes(String(s.category ?? '').toLowerCase()),
  ),
)

const selectedId = ref(null)

function prefill() {
  const current = resolvedCurrentStatus.value
  // Only preselects something the dropdown actually offers; a currently-active
  // employee opens with no selection rather than with a value that is not among
  // the options.
  selectedId.value =
    current && statusOptions.value.some((s) => s.id === current.id) ? current.id : null
}

// Prefilled on open, not on close, so a choice abandoned in one employee's
// dialog cannot be resubmitted against the next one by muscle memory.
watch(
  () => props.modelValue,
  (open) => {
    if (open) prefill()
  },
)

// The statuses are fetched when the dialog opens, so on a cold cache they land
// after it did. Only fills a still-empty selection: a choice already made while
// the request was in flight must not be overwritten by its answer. The same rule
// covers the pk read, which lands after the dialog has opened.
watch(
  () => props.statuses,
  () => {
    if (props.modelValue && selectedId.value == null) prefill()
  },
)

watch(
  () => props.currentStatus,
  () => {
    if (props.modelValue && selectedId.value == null) prefill()
  },
)

const selectedStatus = computed(() => props.statuses.find((s) => s.id === selectedId.value) ?? null)

const separatesEmployee = computed(
  () => String(selectedStatus.value?.category ?? '').toLowerCase() === 'separated',
)

const canSubmit = computed(
  () =>
    selectedId.value != null &&
    selectedId.value !== resolvedCurrentStatus.value?.id &&
    !props.loading,
)

function submit() {
  if (!canSubmit.value || !selectedStatus.value) return
  // Hands the chosen status over; the page owns the write and this dialog's
  // close, so the button keeps its loading state until the request settles.
  emit('confirm', selectedStatus.value)
}
</script>

<style scoped>
/* Sits under the sentence with the body's own rhythm — the dropdown is the
   point of this dialog, so it needs air rather than butting up against the text. */
.st-status {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 16px;
}
</style>
