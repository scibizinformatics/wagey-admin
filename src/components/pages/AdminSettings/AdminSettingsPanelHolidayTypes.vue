<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Holiday types</h2>
        <p class="table-subtitle">Kinds of holiday, and the leave they apply automatically</p>
      </div>
      <div class="table-actions">
        <q-btn
          color="primary"
          label="Add holiday type"
          icon="add"
          class="add-btn"
          @click="openDialog"
        />
      </div>
    </div>

    <div class="modern-table-container">
      <!-- Built from the live `columns`, so the placeholder shares the real
           table's columns, labels and alignment. -->
      <template v-if="loading">
        <TableSkeleton :columns="columns" :rows="5" />
      </template>
      <template v-else-if="!filteredHolidayTypes.length">
        <div class="dash-empty ht-empty">
          <span class="dash-featured-icon"><q-icon name="o_celebration" size="20px" /></span>
          <p class="dash-empty__title">
            {{ searchQuery ? 'No holiday types match' : 'No holiday types yet' }}
          </p>
          <p class="dash-empty__sub">
            {{
              searchQuery
                ? `Nothing here is called “${searchQuery}”.`
                : 'Add the kinds of holiday your calendar carries — regular, special non-working, special working.'
            }}
          </p>
          <q-btn
            v-if="!searchQuery"
            label="Add holiday type"
            icon="add"
            class="dash-modal__submit ht-empty__btn"
            unelevated
            @click="openDialog"
          />
        </div>
      </template>
      <template v-else>
        <q-table
          :rows="filteredHolidayTypes"
          :columns="columns"
          row-key="id"
          flat
          class="dash-qtable settings-table"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Holiday type</q-th>
              <q-th class="table-header-cell">Code</q-th>
              <q-th class="table-header-cell">Auto-apply</q-th>
              <q-th class="table-header-cell">Leave sources</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell">
                <span class="item-name">{{ props.row.name }}</span>
                <span v-if="props.row.description" class="ht-desc">{{
                  props.row.description
                }}</span>
              </q-td>

              <!-- The code is what a Holiday names to attach itself, so it is
                   set in the same face it is typed in elsewhere. -->
              <q-td class="table-body-cell">
                <code class="ht-code">{{ props.row.code || '—' }}</code>
              </q-td>

              <q-td class="table-body-cell">
                <span
                  class="status-badge"
                  :class="`ht-auto--${autoApplyFor(props.row).key}`"
                  :title="autoApplyFor(props.row).hint"
                >
                  {{ autoApplyFor(props.row).label }}
                </span>
              </q-td>

              <!-- The chain itself, not a count: which leave is tried first is
                   the fact somebody opens this table to check. -->
              <q-td class="table-body-cell">
                <button
                  type="button"
                  class="ht-chain-cell"
                  :class="{ 'ht-chain-cell--none': !summaryFor(props.row).enabled }"
                  @click="openPolicies(props.row)"
                  :aria-label="`Leave sources for ${props.row.name}`"
                >
                  <span class="ht-chain-primary">{{
                    chainLabelFor(props.row) || 'No sources'
                  }}</span>
                  <span class="ht-chain-secondary">{{ chainDetailFor(props.row) }}</span>
                </button>
              </q-td>

              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 170px">
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="openEditDialog(props.row)"
                      >
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit holiday type</q-item-section>
                      </q-item>
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="openPolicies(props.row)"
                      >
                        <q-item-section side
                          ><q-icon name="low_priority" size="16px"
                        /></q-item-section>
                        <q-item-section>Leave sources</q-item-section>
                      </q-item>
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item dropdown-item-danger"
                        @click="deleteHolidayType(props.row)"
                      >
                        <q-item-section side
                          ><q-icon name="delete" size="16px" color="negative"
                        /></q-item-section>
                        <q-item-section>Delete</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </q-td>
            </q-tr>
          </template>
        </q-table>
      </template>
    </div>

    <!-- ── Add / edit ───────────────────────────────────────────────────────-->
    <q-dialog v-model="dialog" persistent>
      <q-card class="dash-modal dash-modal--md">
        <q-card-section class="dash-modal__head">
          <div class="dash-modal__head-main">
            <q-avatar size="38px" class="dash-modal__head-icon">
              <q-icon name="celebration" size="22px" />
            </q-avatar>
            <div class="dash-modal__head-titles">
              <div class="dash-modal__title">
                {{ editing ? 'Edit holiday type' : 'Add holiday type' }}
              </div>
              <div class="dash-modal__sub">A kind of holiday, and what it grants</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
        </q-card-section>

        <q-form @submit.prevent="submit" class="dash-modal__form">
          <q-card-section class="dash-modal__body">
            <div class="dash-modal__group">
              <p class="dash-modal__group-label">Holiday type</p>

              <label class="dash-modal__field">
                <span class="dash-modal__field-label">
                  Name<span class="dash-modal__req">*</span>
                </span>
                <q-input
                  :model-value="form.name"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field"
                  placeholder="Special Non-Working Holiday"
                  @update:model-value="onNameInput"
                >
                  <template v-slot:prepend><q-icon name="label" size="18px" /></template>
                </q-input>
              </label>

              <label class="dash-modal__field">
                <span class="dash-modal__field-label">
                  Code<span class="dash-modal__req">*</span>
                </span>
                <q-input
                  :model-value="form.code"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field ht-code-field"
                  placeholder="special"
                  @update:model-value="onCodeInput"
                >
                  <template v-slot:prepend><q-icon name="tag" size="18px" /></template>
                </q-input>
                <span class="dash-modal__field-hint">
                  <template v-if="editing">
                    Holidays already attached to this type name it by its code — changing it
                    detaches them.
                  </template>
                  <template v-else>
                    A holiday attaches itself to this type by code, so it has to stay stable. It is
                    unique within the company.
                  </template>
                </span>
                <span class="ht-suggestions">
                  <button
                    v-for="suggestion in codeSuggestions"
                    :key="suggestion.value"
                    type="button"
                    class="ht-suggestion"
                    :class="{ 'is-active': form.code === suggestion.value }"
                    :title="suggestion.hint"
                    @click="useSuggestedCode(suggestion.value)"
                  >
                    {{ suggestion.label }}
                  </button>
                </span>
              </label>

              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Description</span>
                <q-input
                  v-model="form.description"
                  type="textarea"
                  rows="2"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field"
                  placeholder="When this kind of holiday applies"
                />
              </label>
            </div>

            <div class="dash-modal__group">
              <p class="dash-modal__group-label">Automatic leave</p>
              <div class="toggle-item">
                <q-toggle
                  v-model="form.auto_generate_leave"
                  color="primary"
                  size="md"
                  class="brand-toggle"
                  aria-label="Apply leave automatically"
                />
                <div class="toggle-label-group">
                  <div class="toggle-label">Apply leave automatically</div>
                  <div class="toggle-hint">
                    When a holiday of this type is created, eligible employees are granted approved
                    leave from the first source that can cover it.
                  </div>
                </div>
              </div>
            </div>

            <!-- ── First source, on create only ───────────────────────────────
                 The create endpoint saves the type and its policies in one
                 atomic call. Editing goes through the leave-sources dialog,
                 which has the whole chain in front of it — adding here would
                 append a duplicate rather than change what is already set. -->
            <div v-if="!editing" class="dash-modal__group">
              <div class="dash-modal__group-head">
                <p class="dash-modal__group-label">First leave source</p>
                <q-toggle
                  v-model="includeFirstPolicy"
                  color="primary"
                  size="sm"
                  class="brand-toggle"
                  label="Add one now"
                  aria-label="Add a leave source with this holiday type"
                />
              </div>

              <p v-if="!includeFirstPolicy" class="ht-hint">
                Without a source, a holiday of this type applies nothing even with automatic leave
                switched on. You can build the chain any time from the row menu.
              </p>

              <label v-else class="dash-modal__field">
                <span class="dash-modal__field-label">Leave type</span>
                <q-select
                  v-model="policyDraft.leave_type"
                  :options="leaveTypeOptions"
                  option-value="value"
                  option-label="label"
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
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey-7">
                        No leave types in this company yet
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
                <span class="dash-modal__field-hint">
                  It becomes the first link in the chain. Add the rest from the row menu.
                </span>
              </label>
            </div>
          </q-card-section>

          <q-card-actions class="dash-modal__foot">
            <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" v-close-popup />
            <q-btn
              :label="editing ? 'Update' : 'Save'"
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

    <!-- ── Leave sources ────────────────────────────────────────────────────-->
    <HolidayTypePoliciesDialog
      ref="policiesDialogRef"
      v-model="policiesDialog"
      :holiday-type="policiesFor"
      :policies="policies"
      :leave-types="leaveTypes"
      :loading="loadingPolicies"
      :loading-leave-types="loadingLeaveTypes"
      :saving="savingPolicy"
      :busy-policy-id="busyPolicyId"
      @assign="handleAssign"
      @toggle="handleToggle"
      @move="handleMove"
      @remove="handleRemove"
    />
  </div>
</template>

<script setup>
/**
 * Holiday types for the active company.
 *
 * The panel owns all three composables rather than letting the dialog hold its
 * own: every write to the chain has to refresh both the dialog's list and the
 * summary the table column prints. The leave types are here for the same
 * reason — the create dialog's first source and the chain dialog's picker both
 * offer them, and they are what resolves a policy's leave-type name.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import HolidayTypePoliciesDialog from './HolidayTypePoliciesDialog.vue'
import { useAdminHolidayTypes } from '@/composables/admin/useAdminHolidayTypes'
import { useAdminHolidayPolicies } from '@/composables/admin/useAdminHolidayPolicies'
import { useAdminLeaveTypes } from '@/composables/admin/useAdminLeaveTypes'
import { useCompany } from '@/composables/page/useCompany'
import {
  HOLIDAY_CODE_SUGGESTIONS,
  autoApplyState,
  emptyHolidayPolicyDraft,
  policyChainLabel,
  slugifyCode,
  summarizeHolidayPolicies,
} from '@/composables/utils/holidayTypes'

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

const $q = useQuasar()
const { companyId } = useCompany()

const {
  holidayTypes,
  loading,
  saving,
  dialog,
  editing,
  form,
  includeFirstPolicy,
  fetchHolidayTypes,
  holidayTypeById,
  openDialog,
  openEditDialog,
  saveHolidayType,
  deleteHolidayType,
} = useAdminHolidayTypes()

const {
  policies,
  loading: loadingPolicies,
  saving: savingPolicy,
  busyPolicyId,
  fetchPolicies,
  assignPolicy,
  setPolicyEnabled,
  movePolicy,
  deletePolicy,
} = useAdminHolidayPolicies()

// Only the list is used from here; this panel never opens the leave-type
// dialogs, which the Leave types section owns.
const { leaveTypes, loading: loadingLeaveTypes, fetchLeaveTypes } = useAdminLeaveTypes()

const codeSuggestions = HOLIDAY_CODE_SUGGESTIONS

const columns = [
  { name: 'name', label: 'Holiday type', field: 'name', align: 'left' },
  { name: 'code', label: 'Code', field: 'code', align: 'left' },
  { name: 'auto', label: 'Auto-apply', field: 'auto', align: 'left' },
  { name: 'sources', label: 'Leave sources', field: 'sources', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

// ─── Table ──────────────────────────────────────────────────────────────────

const filteredHolidayTypes = computed(() => {
  const query = (props.searchQuery || '').trim().toLowerCase()
  if (!query) return holidayTypes.value
  return holidayTypes.value.filter(
    (type) =>
      type.name.toLowerCase().includes(query) ||
      type.code.toLowerCase().includes(query) ||
      type.description.toLowerCase().includes(query) ||
      type.policies.some((policy) => (policy.leaveTypeName || '').toLowerCase().includes(query)),
  )
})

function autoApplyFor(type) {
  return autoApplyState(type)
}

function summaryFor(type) {
  return summarizeHolidayPolicies(type.policies)
}

function chainLabelFor(type) {
  return policyChainLabel(type.policies)
}

function chainDetailFor(type) {
  const summary = summaryFor(type)
  if (!summary.hasAny) return 'Grants nothing'
  const parts = [`${summary.enabled} enabled`]
  if (summary.disabled) parts.push(`${summary.disabled} off`)
  return parts.join(' · ')
}

// ─── Add / edit dialog ──────────────────────────────────────────────────────

const policyDraft = ref(emptyHolidayPolicyDraft())

watch(dialog, (open) => {
  if (open) policyDraft.value = emptyHolidayPolicyDraft()
})

const leaveTypeOptions = computed(() =>
  leaveTypes.value.map((type) => ({ value: type.id, label: type.name })),
)

/**
 * The code follows the name until an admin types one themselves.
 *
 * It is a stable identifier a Holiday points at, so it must not keep tracking
 * the name after that — renaming "Special" to "Special non-working" would
 * otherwise re-code the type and orphan every holiday attached to it.
 */
function onNameInput(value) {
  form.value.name = value
  if (!form.value.code_touched) form.value.code = slugifyCode(value)
}

function onCodeInput(value) {
  form.value.code = value
  form.value.code_touched = true
}

function useSuggestedCode(code) {
  form.value.code = code
  form.value.code_touched = true
}

async function submit() {
  // The draft is passed whenever the toggle is on, incomplete or not:
  // `saveHolidayType` validates it and says what is missing. Dropping it here
  // for a missing leave type is what used to report "Holiday type created"
  // about a type with no source attached.
  const draft = !editing.value && includeFirstPolicy.value ? policyDraft.value : null
  await saveHolidayType(draft)
}

// ─── Leave sources dialog ───────────────────────────────────────────────────

const policiesDialog = ref(false)
const policiesFor = ref(null)
const policiesDialogRef = ref(null)

async function openPolicies(type) {
  policiesFor.value = type
  policiesDialog.value = true
  await Promise.all([fetchPolicies(type.id), ensureLeaveTypes()])
}

/** Re-read the list so the table's chain column matches the dialog's. */
async function refreshAfterChainWrite(typeId) {
  await fetchHolidayTypes()
  policiesFor.value = holidayTypeById(typeId) || policiesFor.value
}

async function handleAssign(draft) {
  const typeId = policiesFor.value?.id
  const saved = await assignPolicy(typeId, draft)
  if (!saved) return
  policiesDialogRef.value?.resetDraft()
  await refreshAfterChainWrite(typeId)
}

async function handleToggle({ policy, isEnabled }) {
  const typeId = policiesFor.value?.id
  await setPolicyEnabled(typeId, policy, isEnabled)
  await refreshAfterChainWrite(typeId)
}

async function handleMove({ policy, direction }) {
  const typeId = policiesFor.value?.id
  await movePolicy(typeId, policy, direction)
  await refreshAfterChainWrite(typeId)
}

function handleRemove(policy) {
  const typeId = policiesFor.value?.id
  const name = policy.leaveTypeName || 'This leave type'
  $q.dialog({
    title: 'Remove this leave source?',
    message: `${name} is taken out of the chain, and holidays of this type stop drawing on it. The sources below it move up. Leave already granted is not affected.`,
    cancel: { label: 'Cancel', flat: true },
    ok: { label: 'Remove', color: 'negative', unelevated: true },
    persistent: true,
  }).onOk(async () => {
    await deletePolicy(typeId, policy)
    await refreshAfterChainWrite(typeId)
  })
}

// ─── Lookups ────────────────────────────────────────────────────────────────

/** Leave types are only needed by the two source pickers, so they load on demand. */
async function ensureLeaveTypes() {
  if (leaveTypes.value.length) return leaveTypes.value
  return fetchLeaveTypes()
}

watch(includeFirstPolicy, (on) => {
  if (on) ensureLeaveTypes()
})

// Ids from the previous workspace mean nothing in the next one.
watch(companyId, () => {
  policiesDialog.value = false
  policiesFor.value = null
  fetchHolidayTypes()
})

onMounted(fetchHolidayTypes)
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

.ht-desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 2px;
  font-size: 11.5px;
  line-height: 1.35;
  color: var(--dash-ink-4);
  max-width: 300px;
}

.ht-code {
  padding: 2px 7px;
  border-radius: var(--dash-r-sm);
  background: var(--dash-n-50);
  border: 1px solid var(--dash-line);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
  color: var(--dash-ink-2);
}

/* Three states, and only the middle one is a warning: a type with the gate on
   and nothing behind it looks configured and does nothing. */
.ht-auto--on {
  background: var(--dash-good-bg);
  border-color: var(--dash-good-line);
  color: var(--dash-good);
}

.ht-auto--no-source {
  background: var(--dash-warn-bg);
  border-color: var(--dash-warn-line);
  color: var(--dash-warn);
}

.ht-auto--off {
  background: var(--dash-neutral-bg);
  border-color: var(--dash-neutral-line);
  color: var(--dash-neutral);
}

.ht-chain-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 2px 6px 2px 0;
  max-width: 280px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  border-radius: var(--dash-r-sm);
}

.ht-chain-cell:hover .ht-chain-primary {
  text-decoration: underline;
}

.ht-chain-cell:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--dash-accent-ring);
}

.ht-chain-primary {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ht-chain-secondary {
  font-size: 11.5px;
  color: var(--dash-ink-4);
}

.ht-chain-cell--none .ht-chain-primary {
  font-weight: 400;
  color: var(--dash-ink-3);
}

.ht-code-field :deep(.q-field__native) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.ht-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 2px;
}

.ht-suggestion {
  padding: 2px 8px;
  background: var(--dash-n-50);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-pill);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  color: var(--dash-ink-3);
  cursor: pointer;
}

.ht-suggestion:hover {
  border-color: var(--dash-line-strong);
  color: var(--dash-ink);
}

.ht-suggestion.is-active {
  background: var(--dash-brand);
  border-color: var(--dash-brand);
  color: #ffffff;
}

.ht-hint {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--dash-ink-4);
}

.ht-empty {
  padding: 40px 20px;
}

.ht-empty__btn {
  margin-top: 14px;
  height: 34px;
  padding: 0 16px;
  border-radius: var(--dash-r-md);
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
}

@media (max-width: 1023px) {
  .ht-desc,
  .ht-chain-cell {
    max-width: 220px;
  }
}
</style>
