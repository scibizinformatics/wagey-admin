<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="close">
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="o_tag" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">
              {{ replacing ? 'Replace account number' : 'Add account number' }}
            </div>
            <div class="dash-modal__sub">
              {{
                replacing
                  ? 'The current number is deactivated and kept as history'
                  : "An employee's number for one contribution type"
              }}
            </div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
      </q-card-section>

      <q-form @submit.prevent="submit" class="dash-modal__form">
        <q-card-section class="dash-modal__body">
          <div class="dash-modal__group">
            <p class="dash-modal__group-label">Employee and scheme</p>

            <div class="dash-modal__grid">
              <label class="dash-modal__field dash-modal__span-2">
                <span class="dash-modal__field-label">
                  Employee<span class="dash-modal__req">*</span>
                </span>

                <!-- A replace keeps the same person, so the field is a read-only
                     statement rather than a picker — except when the row's
                     membership id could not be matched to the roster, where the
                     admin has to identify the employee again. -->
                <q-input
                  v-if="replacing && presetEmployeeId"
                  :model-value="presetEmployeeLabel"
                  readonly
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field"
                >
                  <template v-slot:prepend><q-icon name="o_person" size="18px" /></template>
                </q-input>
                <q-select
                  v-else
                  v-model="draft.employeeId"
                  :options="filteredEmployees"
                  option-value="value"
                  option-label="label"
                  emit-value
                  map-options
                  outlined
                  dense
                  options-dense
                  use-input
                  fill-input
                  hide-selected
                  input-debounce="0"
                  hide-bottom-space
                  class="dash-field"
                  placeholder="Choose an employee"
                  popup-content-class="dash-popup dash-popup--modal"
                  @filter="filterEmployees"
                >
                  <template v-slot:prepend><q-icon name="o_person" size="18px" /></template>
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey-7">No employees match</q-item-section>
                    </q-item>
                  </template>
                </q-select>

                <span v-if="replacing && !presetEmployeeId" class="dash-modal__field-hint">
                  This account's employee could not be matched to the roster. Choose them again
                  before replacing.
                </span>
                <span v-else-if="!replacing" class="dash-modal__field-hint">
                  The employee this number belongs to.
                </span>
              </label>

              <label class="dash-modal__field dash-modal__span-2">
                <span class="dash-modal__field-label">
                  Contribution type<span class="dash-modal__req">*</span>
                </span>

                <!-- The type is part of the row's identity, not a field being
                     edited: a replace changes the number, never the scheme. -->
                <q-input
                  v-if="replacing"
                  :model-value="typeLabel"
                  readonly
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field"
                >
                  <template v-slot:prepend><q-icon name="o_category" size="18px" /></template>
                </q-input>
                <q-select
                  v-else
                  v-model="draft.componentType"
                  :options="typeOptions"
                  option-value="value"
                  option-label="label"
                  emit-value
                  map-options
                  outlined
                  dense
                  options-dense
                  hide-bottom-space
                  class="dash-field"
                  placeholder="Choose a contribution type"
                  popup-content-class="dash-popup dash-popup--modal"
                >
                  <template v-slot:prepend><q-icon name="o_category" size="18px" /></template>
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey-7">
                        No contribution types yet — add one from the Components view
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>

                <span class="dash-modal__field-hint">
                  One number per scheme, so the same employee can hold one for each.
                </span>
              </label>
            </div>
          </div>

          <div class="dash-modal__group">
            <p class="dash-modal__group-label">Account number</p>

            <div class="dash-modal__grid">
              <label class="dash-modal__field dash-modal__span-2">
                <span class="dash-modal__field-label">
                  {{ numberFieldLabel }}<span class="dash-modal__req">*</span>
                </span>
                <!-- Text, never `type="number"`: an account number is an
                     identifier, and a numeric input would drop its leading
                     zeros and offer steppers it has no use for. -->
                <q-input
                  v-model="draft.accountNumber"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field ca-number-field"
                  maxlength="64"
                  autocomplete="off"
                  :placeholder="replacing ? account.accountNumber : 'e.g. 34-1234567-8'"
                >
                  <template v-slot:prepend><q-icon name="o_tag" size="18px" /></template>
                </q-input>

                <span v-if="replacing" class="dash-modal__field-hint">
                  The current number <strong>{{ account.accountNumber }}</strong> is deactivated and
                  kept as history. A deactivated number cannot be switched back on.
                </span>
                <span v-else class="dash-modal__field-hint">
                  Text, so leading zeros are kept. Up to 64 characters.
                </span>
              </label>
            </div>
          </div>
        </q-card-section>

        <q-card-actions class="dash-modal__foot">
          <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" v-close-popup />
          <q-btn
            :label="replacing ? 'Replace number' : 'Add account'"
            type="submit"
            no-caps
            unelevated
            class="dash-modal__submit"
            :loading="saving"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * The add / replace form for one employee contribution account number.
 *
 * It is two forms in one because the API has only one create shape and one
 * deactivation: adding writes a new row, replacing deactivates the row it was
 * opened over and then writes a new one. The panel owns both writes, so this
 * dialog only holds the draft and is left open when a write fails.
 *
 * The employee and the scheme are fixed during a replace. They identify the
 * account being retired; changing either would be a different account, not a
 * new number, and the panel offers that through Add account instead.
 */
import { computed, ref, watch } from 'vue'
import {
  accountTypeLabel,
  emptyContributionAccountForm,
} from 'src/composables/utils/contributionAccounts'
import { contributionTypeLabel, sameId } from 'src/composables/utils/contributionSettings'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** The account row being replaced, or null when adding. */
  account: { type: Object, default: null },
  /** Employee options, from `contributionEmployeeOptions`. */
  employees: { type: Array, default: () => [] },
  /** The company's contribution types, for the picker. */
  types: { type: Array, default: () => [] },
  /** Preselects a type when the panel's filter already names one. */
  presetTypeId: { type: [Number, String], default: null },
  /** The roster UUID the row resolved to, when it did. */
  presetEmployeeId: { type: String, default: null },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'save'])

const draft = ref(emptyContributionAccountForm())
const employeeQuery = ref('')

const replacing = computed(() => props.account?.id != null)

const typeOptions = computed(() =>
  props.types
    .filter((type) => type?.id != null)
    .map((type) => ({ value: type.id, label: contributionTypeLabel(type) })),
)

const matchedType = computed(
  () => props.types.find((type) => sameId(type.id, props.account?.typeId)) ?? null,
)

const typeLabel = computed(() => accountTypeLabel(props.account, matchedType.value))

/** The field's label, kept out of the template so the required mark stays tight. */
const numberFieldLabel = computed(() => (replacing.value ? 'New account number' : 'Account number'))

const presetEmployee = computed(
  () => props.employees.find((employee) => sameId(employee.value, props.presetEmployeeId)) ?? null,
)

const presetEmployeeLabel = computed(
  () => presetEmployee.value?.name || props.account?.employeeName || 'Employee',
)

/**
 * The picker's own filtering. `q-select` asks for a new list on every keystroke,
 * and the roster is small enough that a case-insensitive substring test over
 * the labels is the whole search.
 */
const filteredEmployees = computed(() => {
  const query = employeeQuery.value.trim().toLowerCase()
  if (!query) return props.employees
  return props.employees.filter((employee) => employee.label.toLowerCase().includes(query))
})

/** The name `fill-input` writes into the box once an employee is chosen. */
const selectedEmployeeLabel = computed(
  () =>
    props.employees.find((employee) => sameId(employee.value, draft.value.employeeId))?.label || '',
)

/**
 * `q-select`'s filter contract is `(value, update)`, and the handler has to call
 * `update` — that is what clears the field's busy spinner and re-opens the menu.
 * Without it the control sits on a spinner and no list ever appears, because the
 * filter call itself closes the menu first.
 *
 * `fill-input` puts the chosen employee's name in the box, and opening the menu
 * again re-runs the filter with whatever the box holds. Read as a needle, that
 * name would match only the employee already chosen — whom `hide-selected` then
 * hides, leaving an empty menu on the second open.
 */
function filterEmployees(value, update) {
  update(() => {
    const typed = value || ''
    employeeQuery.value = typed === selectedEmployeeLabel.value ? '' : typed
  })
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    employeeQuery.value = ''

    if (props.account) {
      draft.value = {
        employeeId: props.presetEmployeeId ?? null,
        componentType: props.account.typeId ?? null,
        accountNumber: '',
      }
      return
    }

    // Ids cross the wire as numbers here and as strings elsewhere; q-select
    // matches an option by strict `===`, so the draft takes the option's own
    // value rather than whatever spelling the panel's filter carried.
    const preset = props.types.find((type) => sameId(type.id, props.presetTypeId))
    draft.value = emptyContributionAccountForm({ typeId: preset?.id ?? null })
  },
)

function close() {
  emit('update:modelValue', false)
}

function submit() {
  if (props.saving) return
  emit('save', { ...draft.value })
}
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

.ca-number-field :deep(.q-field__native) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12.5px;
  letter-spacing: 0.01em;
}

@media (max-width: 599px) {
  .dash-modal__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
