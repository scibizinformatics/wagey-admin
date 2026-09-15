<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="where_to_vote" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Location rule</div>
            <div class="dash-modal__sub">{{ department?.name || 'Department' }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
      </q-card-section>

      <q-card-section v-if="loading" class="dash-modal__body dash-modal__body--row">
        <q-spinner size="18px" color="primary" />
        <span>Loading the rule…</span>
      </q-card-section>

      <q-card-section v-else class="dash-modal__body">
        <p class="dlr-intro">
          A cap on how many <strong>on-site</strong> and <strong>off-site</strong> shifts anyone in
          this department may hold in a period. It is a hard block: an assignment that would go over
          it is refused, whether it comes from the schedule board, auto-assign, a reassignment or an
          approved swap.
        </p>

        <label class="dash-modal__field">
          <span class="dash-modal__field-label">Period</span>
          <q-select
            v-model="form.periodType"
            :options="PERIOD_TYPES"
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
          <span class="dash-modal__field-hint">{{ periodHint }}</span>
        </label>

        <div class="dash-modal__grid">
          <label class="dash-modal__field">
            <span class="dash-modal__field-label">On-site limit</span>
            <q-input
              v-model.number="form.onSite"
              type="number"
              min="0"
              :max="numberMax"
              step="1"
              outlined
              dense
              hide-bottom-space
              class="dash-field"
            >
              <template v-slot:prepend><q-icon name="o_business" size="18px" /></template>
            </q-input>
            <span class="dash-modal__field-hint">{{ limitLabel(form.onSite) }} {{ perLabel }}</span>
          </label>

          <label class="dash-modal__field">
            <span class="dash-modal__field-label">Off-site limit</span>
            <q-input
              v-model.number="form.offSite"
              type="number"
              min="0"
              :max="numberMax"
              step="1"
              outlined
              dense
              hide-bottom-space
              class="dash-field"
            >
              <template v-slot:prepend><q-icon name="o_travel_explore" size="18px" /></template>
            </q-input>
            <span class="dash-modal__field-hint"
              >{{ limitLabel(form.offSite) }} {{ perLabel }}</span
            >
          </label>
        </div>

        <!-- 0 is the API's own "no limit", and it is the field default, so a
             reader who takes it at face value has it exactly backwards. -->
        <p class="dlr-zero-hint">
          <q-icon name="o_info" size="15px" />
          <span>Leave a limit at <strong>0</strong> to not cap that side at all.</span>
        </p>

        <div class="dash-modal__group">
          <p class="dash-modal__group-label">Enforcement</p>
          <div class="toggle-item">
            <q-toggle
              v-model="form.isActive"
              color="primary"
              size="md"
              class="brand-toggle"
              aria-label="Enforce this rule"
            />
            <div class="toggle-label-group">
              <div class="toggle-label">Enforce this rule</div>
              <div class="toggle-hint">
                Switch off to keep the limits on record without blocking anything. Existing
                assignments are never undone either way — the rule is only checked when one is
                created.
              </div>
            </div>
          </div>
        </div>

        <!-- The same sentence the table column's tooltip shows, built from what
             is currently typed rather than from what is saved. -->
        <div class="dlr-preview" :class="{ 'dlr-preview--invalid': !!problem }">
          <q-icon :name="problem ? 'o_error' : 'o_check_circle'" size="16px" />
          <span>{{ problem || previewSentence }}</span>
        </div>

        <p class="dlr-note">
          Limits count <strong>shifts, not days</strong> — a day with two shifts spends two. OFF and
          leave shifts, and shifts with no site, never count against either limit. An employee's
          department is taken from their active contract on the shift date.
        </p>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn
          v-if="hasRule"
          flat
          no-caps
          label="Remove rule"
          class="dlr-remove"
          :loading="removing"
          @click="$emit('remove')"
        />
        <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" v-close-popup />
        <q-btn
          :label="hasRule ? 'Save rule' : 'Create rule'"
          no-caps
          class="dash-modal__submit"
          :loading="saving"
          :disable="!!problem || loading"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * One department's on-site / off-site shift cap.
 *
 * State is owned by the Departments panel: the same composable feeds the
 * table's rule column, so saving here has to refresh the cache that column
 * reads. A second composable instance in this file would have left the column
 * showing the pre-save figures until a reload.
 *
 * The form is synced from `rule` when the dialog opens and again when a fetch
 * in flight at open time lands — never while the reader is typing, which is why
 * the body shows a loading row instead of an editable form until then.
 */
import { computed, reactive, watch } from 'vue'
import {
  PERIOD_TYPES,
  WEEK_MAX,
  blankLocationRuleForm,
  limitLabel,
  locationRuleToForm,
  perPeriodLabel,
  ruleSentence,
  validateLocationRule,
} from '@/composables/utils/departmentLocationRules'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  department: { type: Object, default: null },
  /** Normalized rule from `useAdminDepartmentLocationRules`, or null for none. */
  rule: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  removing: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'save', 'remove'])

const form = reactive(blankLocationRuleForm())

const hasRule = computed(() => !!props.rule)

const periodHint = computed(() => PERIOD_TYPES.find((p) => p.value === form.periodType)?.hint || '')

const perLabel = computed(() => perPeriodLabel(form.periodType))

/** A week holds seven shifts of one kind; the other periods have no stated cap. */
const numberMax = computed(() => (form.periodType === 'week' ? WEEK_MAX : undefined))

const problem = computed(() => validateLocationRule(form))

const previewSentence = computed(() =>
  ruleSentence({
    periodType: form.periodType,
    onSite: Number(form.onSite) || 0,
    offSite: Number(form.offSite) || 0,
    isActive: form.isActive,
    capsOnSite: Number(form.onSite) > 0,
    capsOffSite: Number(form.offSite) > 0,
  }),
)

function syncForm() {
  Object.assign(form, locationRuleToForm(props.rule))
}

function submit() {
  if (problem.value || props.saving) return
  emit('save', { ...form })
}

watch(
  () => props.modelValue,
  (open) => {
    if (open && !props.loading) syncForm()
  },
)

watch(
  () => props.loading,
  (isLoading) => {
    if (!isLoading && props.modelValue) syncForm()
  },
)
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

.dlr-intro {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--dash-ink-3);
}

.dlr-intro strong {
  font-weight: 600;
  color: var(--dash-ink-2);
}

/* Pulled tight under the two limit fields: it explains the value in them, so it
   reads as their shared hint rather than as a paragraph of its own. */
.dlr-zero-hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: -6px 0 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--dash-ink-4);
}

.dlr-zero-hint strong {
  font-weight: 600;
  color: var(--dash-ink-2);
}

/* What the rule will actually do, in one sentence — the same reading the table
   column shows, so the two cannot disagree. It carries the validation message
   in the same slot because both answer "what happens if I save this". */
.dlr-preview {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--dash-good-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-good-bg);
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--dash-good);
}

.dlr-preview--invalid {
  border-color: var(--dash-critical-line);
  background: var(--dash-critical-bg);
  color: var(--dash-critical);
}

.dlr-note {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--dash-ink-4);
}

.dlr-note strong {
  font-weight: 600;
  color: var(--dash-ink-3);
}

/* Removing is the rare exit, not the alternative to saving — quiet, and pushed
   away from the pair on the right so it cannot be hit by reflex. */
.dlr-remove.q-btn {
  margin-right: auto;
  color: var(--dash-critical);
}

.dlr-remove.q-btn:hover {
  background: var(--dash-critical-bg);
}
</style>
