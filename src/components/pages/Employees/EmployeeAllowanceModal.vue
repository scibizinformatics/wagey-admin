<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--lg alw">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="card_giftcard" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Assign allowance</div>
            <div class="dash-modal__sub">{{ employeeLine }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" @click="close" />
      </q-card-section>

      <q-form ref="formRef" @submit="submitAdd" class="dash-modal__form">
        <q-card-section class="dash-modal__body">
          <div v-if="fetching" class="alw-state">
            <q-spinner size="20px" />
            <span>Loading allowances…</span>
          </div>

          <div v-else-if="loadError" class="alw-state alw-state--error">
            <q-icon name="o_error_outline" size="20px" />
            <span>Could not load allowances for this employee.</span>
            <q-btn flat dense no-caps label="Try again" class="alw-retry" @click="load" />
          </div>

          <template v-else>
            <!-- What the employee already holds, so an assignment is never made
                 blind: the "not sure whether this is already set up" case is
                 where a manager dialog and the 3-dot action disagree. -->
            <div class="dash-modal__group">
              <div class="dash-modal__group-head">
                <p class="dash-modal__group-label">
                  Current allowances<span v-if="allowances.length" class="dash-num">
                    ({{ allowances.length }})</span
                  >
                </p>
              </div>

              <ul v-if="allowances.length" class="alw-list">
                <li
                  v-for="row in allowances"
                  :key="row.id"
                  class="alw-row"
                  :class="{ 'alw-row--off': !row.isActive }"
                >
                  <span class="alw-row__body">
                    <span class="alw-row__name">{{ row.typeName }}</span>
                    <span class="alw-row__meta">
                      {{ row.policyLabel }}
                      <template v-if="row.policy"> · </template>
                      {{ taxableLabel(row.taxable) }}
                      <template v-if="row.effectiveDate"> · since {{ row.effectiveDate }}</template>
                    </span>
                  </span>

                  <span v-if="editingId !== row.id" class="alw-row__amount dash-num">
                    {{ formatCurrency(row.amount) }}
                  </span>

                  <span v-else class="alw-row__edit">
                    <q-input
                      ref="editInputRef"
                      v-model="editingDraft"
                      type="number"
                      step="0.01"
                      dense
                      outlined
                      class="dash-field alw-row__edit-input"
                      @keyup.enter="saveEdit(row)"
                      @keyup.esc="cancelEdit"
                    />
                    <q-btn
                      flat
                      round
                      dense
                      size="12px"
                      icon="o_check"
                      class="alw-row__icon alw-row__icon--ok"
                      :disable="savingUpdateId === row.id"
                      aria-label="Save amount"
                      @click="saveEdit(row)"
                    />
                    <q-btn
                      flat
                      round
                      dense
                      size="12px"
                      icon="o_close"
                      class="alw-row__icon"
                      aria-label="Cancel editing"
                      @click="cancelEdit"
                    />
                  </span>

                  <div v-if="editingId !== row.id" class="alw-row__actions">
                    <q-btn
                      v-if="!editingId"
                      flat
                      round
                      dense
                      size="13px"
                      icon="o_edit"
                      class="alw-row__icon"
                      aria-label="Edit amount"
                      @click="startEdit(row)"
                    />
                    <q-toggle
                      :model-value="row.isActive"
                      :loading="savingUpdateId === row.id"
                      size="sm"
                      :aria-label="
                        row.isActive
                          ? `Deactivate ${row.typeName}`
                          : `Activate ${row.typeName}`
                      "
                      @update:model-value="(v) => toggleActive(row, v)"
                    />
                  </div>
                </li>
              </ul>

              <div v-else class="alw-empty">
                <span class="dash-featured-icon">
                  <q-icon name="o_card_giftcard" size="18px" />
                </span>
                <p class="alw-empty__title">No allowances yet</p>
                <p class="alw-empty__sub">Assign the first one below.</p>
              </div>
            </div>

            <div class="dash-modal__group">
              <p class="dash-modal__group-label">Add an allowance</p>
              <div class="dash-modal__grid">
                <label class="dash-modal__field dash-modal__span-2">
                  <span class="dash-modal__field-label"
                    >Allowance type<span class="dash-modal__req">*</span></span
                  >
                  <q-select
                    v-model="form.allowance_type"
                    :options="allowanceTypeOptions"
                    option-value="id"
                    option-label="name"
                    emit-value
                    map-options
                    outlined
                    dense
                    :loading="loadingAllowanceTypes"
                    :rules="[(val) => !!val || 'Allowance type is required']"
                    hide-bottom-space
                    class="dash-field"
                    popup-content-class="dash-popup dash-popup--modal"
                  />
                </label>

                <label class="dash-modal__field">
                  <span class="dash-modal__field-label"
                    >Amount<span class="dash-modal__req">*</span></span
                  >
                  <q-input
                    v-model.number="form.amount"
                    type="number"
                    step="0.01"
                    outlined
                    dense
                    :rules="[
                      (val) => (val !== null && val !== '' && !isNaN(val)) || 'Amount is required',
                    ]"
                    hide-bottom-space
                    class="dash-field"
                  />
                </label>

                <label class="dash-modal__field">
                  <span class="dash-modal__field-label"
                    >Effective date<span class="dash-modal__req">*</span></span
                  >
                  <q-input
                    v-model="form.effective_date"
                    mask="####-##-##"
                    outlined
                    dense
                    placeholder="YYYY-MM-DD"
                    :rules="[dateRule]"
                    hide-bottom-space
                    class="dash-field"
                  >
                    <template v-slot:append>
                      <q-icon name="o_event" size="18px" class="cursor-pointer">
                        <q-popup-proxy transition-show="scale" transition-hide="scale">
                          <q-date v-model="form.effective_date" mask="YYYY-MM-DD" />
                        </q-popup-proxy>
                      </q-icon>
                    </template>
                  </q-input>
                </label>
              </div>
            </div>
          </template>
        </q-card-section>

        <q-card-actions class="dash-modal__foot">
          <q-btn flat no-caps label="Close" class="dash-modal__cancel" @click="close" />
          <q-btn
            no-caps
            type="submit"
            unelevated
            icon="o_add"
            label="Add allowance"
            class="dash-modal__submit"
            :loading="savingCreate"
            :disable="fetching || loadError"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useCompany } from 'src/composables/page/useCompany'
import { useAllowances } from 'src/composables/page/useAllowances'
import { useEmployeeAllowances } from 'src/composables/page/useEmployeeAllowances'
import { normalizeEmployeeAllowance, taxableLabel } from 'src/composables/utils/allowances'
import { todayIso } from 'src/composables/utils/calendarDate'
import { formatCurrency } from 'src/composables/utils/format'
import { extractErrorMessage } from 'src/composables/utils/http'
import { useToast } from 'src/composables/useToast'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** The employee row the menu was opened from. Its `id` is the UUID the API keys by. */
  employee: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue'])

const toast = useToast()
const { companyId } = useCompany()
const { allowanceTypes, loading: loadingAllowanceTypes, fetchAllowanceTypes } = useAllowances()
const {
  fetching,
  savingCreate,
  savingUpdateId,
  fetchEmployeeAllowances,
  createEmployeeAllowance,
  updateEmployeeAllowance,
} = useEmployeeAllowances()

const formRef = ref(null)
const editInputRef = ref(null)
const allowances = ref([])
const loadError = ref(false)
const editingId = ref(null)
const editingDraft = ref('')

const form = ref({
  allowance_type: null,
  amount: null,
  effective_date: '',
})

const employeeName = computed(
  () =>
    `${props.employee?.user?.first_name || ''} ${props.employee?.user?.last_name || ''}`.trim() ||
    props.employee?.full_name ||
    props.employee?.user?.username ||
    'Unknown',
)

const employeePosition = computed(
  () => props.employee?.companies?.[0]?.position?.name || props.employee?.position?.name || '',
)

const employeeLine = computed(() =>
  employeePosition.value ? `${employeeName.value} · ${employeePosition.value}` : employeeName.value,
)

const allowanceTypeOptions = computed(() =>
  allowanceTypes.value.map((type) => ({
    id: type.id,
    name: type.name || `Type ${type.id}`,
  })),
)

const dateRule = (val) => {
  if (!val) return 'Effective date is required'
  return /^\d{4}-\d{2}-\d{2}$/.test(val) || 'Use YYYY-MM-DD'
}

async function load() {
  if (!companyId.value || !props.employee?.id) return
  loadError.value = false
  try {
    const { allowances: rows } = await fetchEmployeeAllowances(companyId.value, props.employee.id)
    allowances.value = (rows || []).map(normalizeEmployeeAllowance)
  } catch (e) {
    console.error('[EmployeeAllowanceModal] load ✖ error', e)
    allowances.value = []
    loadError.value = true
  }
}

async function loadTypes() {
  if (!companyId.value) return
  if (allowanceTypes.value.length) return
  try {
    await fetchAllowanceTypes()
  } catch {
    // The select simply stays empty; the value the user picks is checked on save.
  }
}

function resetForm() {
  form.value = {
    allowance_type: null,
    amount: null,
    effective_date: todayIso(),
  }
}

async function submitAdd() {
  const valid = await formRef.value?.validate()
  if (!valid) return
  if (!companyId.value || !props.employee?.id) {
    toast.error('Select a company before assigning an allowance', { icon: 'error' })
    return
  }
  try {
    await createEmployeeAllowance(companyId.value, {
      employee_id: props.employee.id,
      allowance_type: form.value.allowance_type,
      amount: String(form.value.amount),
      effective_date: form.value.effective_date,
    })
    toast.success('Allowance assigned', { icon: 'check_circle' })
    resetForm()
    formRef.value?.resetValidation()
    await load()
  } catch (e) {
    toast.error(extractErrorMessage(e, 'Failed to assign allowance'), { icon: 'error' })
  }
}

function startEdit(row) {
  editingId.value = row.id
  editingDraft.value = row.amountRaw
  nextTick(() => editInputRef.value?.select?.())
}

function cancelEdit() {
  editingId.value = null
  editingDraft.value = ''
}

async function saveEdit(row) {
  const draft = Number(editingDraft.value)
  if (!Number.isFinite(draft) || editingDraft.value === '') {
    toast.error('Enter a valid amount before saving', { icon: 'error' })
    return
  }
  try {
    await updateEmployeeAllowance(row.id, {
      id: row.id,
      amount: String(editingDraft.value),
      is_active: row.isActive,
    })
    toast.success(`Updated ${row.typeName}`, { icon: 'check_circle', timeout: 2500 })
    cancelEdit()
    await load()
  } catch (e) {
    toast.error(extractErrorMessage(e, 'Failed to update allowance'), { icon: 'error' })
  }
}

async function toggleActive(row, value) {
  const previous = row.isActive
  row.isActive = value
  try {
    await updateEmployeeAllowance(row.id, {
      id: row.id,
      amount: row.amountRaw,
      is_active: value,
    })
    toast.success(
      `${row.typeName} ${value ? 'activated' : 'deactivated'}`,
      { icon: 'check_circle', timeout: 2500 },
    )
    await load()
  } catch (e) {
    row.isActive = previous
    toast.error(extractErrorMessage(e, 'Failed to update allowance'), { icon: 'error' })
  }
}

function close() {
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
      loadTypes()
      load()
    } else {
      loadError.value = false
      allowances.value = []
      cancelEdit()
    }
  },
)
</script>

<style scoped>
.alw-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 34px 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

.alw-state--error {
  color: var(--dash-critical);
}

.alw-retry {
  color: var(--dash-accent);
  font-weight: 600;
}

/* ── Current allowances list ── */
.alw-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  overflow: hidden;
}

.alw-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--dash-line-soft);
  transition: background 0.12s ease;
}

.alw-row:last-child {
  border-bottom: none;
}

.alw-row--off {
  background: var(--dash-n-25);
}

.alw-row--off .alw-row__name,
.alw-row--off .alw-row__amount {
  color: var(--dash-ink-3);
}

.alw-row__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.alw-row__name {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alw-row__meta {
  font-size: 11.5px;
  color: var(--dash-ink-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alw-row__amount {
  flex: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
}

.alw-row__edit {
  display: flex;
  align-items: center;
  gap: 3px;
  flex: none;
}

.alw-row__edit-input {
  width: 132px;
}
.alw-row__edit-input :deep(.q-field__control) {
  height: 32px;
  min-height: 32px;
  border-radius: var(--dash-r-sm);
}

.alw-row__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: none;
}

.alw-row__icon {
  color: var(--dash-ink-4);
}
.alw-row__icon:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
}
.alw-row__icon--ok:hover {
  color: var(--dash-good);
  background: var(--dash-good-bg);
}

.alw-row__actions :deep(.q-toggle) {
  padding-right: 4px;
}

/* ── Empty state ── */
.alw-empty {
  padding: 22px 0;
  text-align: center;
}

.alw-empty__title {
  margin: 8px 0 2px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink-2);
}

.alw-empty__sub {
  margin: 0;
  font-size: 12.5px;
  color: var(--dash-ink-4);
}
</style>