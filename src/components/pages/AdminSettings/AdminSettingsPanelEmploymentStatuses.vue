<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Employment statuses</h2>
        <p class="table-subtitle">
          The statuses an employee can be moved between — retiring one keeps the employees already
          on it
        </p>
      </div>
      <div class="table-actions">
        <q-select
          v-model="categoryFilter"
          :options="categoryFilters"
          option-value="value"
          option-label="label"
          emit-value
          map-options
          dense
          outlined
          hide-bottom-space
          popup-content-class="dash-popup"
          class="dash-field es-filter"
          aria-label="Filter by category"
        />
        <q-btn
          color="primary"
          label="Add employment status"
          icon="add"
          class="add-btn"
          @click="openDialog"
        />
      </div>
    </div>

    <div class="modern-table-container">
      <template v-if="loading">
        <TableSkeleton :columns="columns" />
      </template>
      <template v-else-if="!filteredStatuses.length">
        <div class="dash-empty">
          <span class="dash-featured-icon">
            <q-icon name="o_how_to_reg" size="20px" />
          </span>
          <p class="dash-empty__title">
            {{ hasFilters ? 'No employment statuses match' : 'No employment statuses yet' }}
          </p>
          <p class="dash-empty__sub">
            {{
              hasFilters
                ? 'Nothing here matches the current search and category filter.'
                : 'Add the statuses this company moves employees between, such as Resigned or Retired.'
            }}
          </p>
        </div>
      </template>
      <template v-else>
        <q-table
          :rows="filteredStatuses"
          :columns="columns"
          row-key="id"
          flat
          no-data-label="No employment statuses found"
          class="dash-qtable settings-table"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Status</q-th>
              <q-th class="table-header-cell">Code</q-th>
              <q-th class="table-header-cell">Category</q-th>
              <q-th class="table-header-cell">Employees</q-th>
              <q-th class="table-header-cell">Availability</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell">
                <span class="item-name">{{ props.row.name }}</span>
                <span v-if="props.row.isSystem" class="es-lock">
                  <q-icon name="o_lock" size="13px" aria-label="System status" />
                  <q-tooltip>System status — its code and category are fixed</q-tooltip>
                </span>
              </q-td>
              <q-td class="table-body-cell">
                <span class="es-code">{{ props.row.code || '—' }}</span>
              </q-td>
              <q-td class="table-body-cell">
                <div :class="['status-badge', categoryClass(props.row.category)]">
                  {{ categoryLabel(props.row.category) }}
                </div>
              </q-td>
              <q-td class="table-body-cell">
                <span class="es-count">{{ props.row.employeeCount ?? '—' }}</span>
              </q-td>
              <q-td class="table-body-cell">
                <div v-if="props.row.isDefault" class="status-badge owned-badge">Default</div>
                <div v-else-if="!props.row.isSelectable" class="status-badge status-inactive">
                  Retired
                </div>
                <div v-else class="status-badge status-active">Selectable</div>
              </q-td>
              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 190px">
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        :disable="savingId === props.row.id"
                        @click="openEditDialog(props.row)"
                      >
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit status</q-item-section>
                      </q-item>
                      <q-item
                        v-if="canMakeDefault(props.row)"
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        :disable="savingId === props.row.id"
                        @click="makeDefault(props.row)"
                      >
                        <q-item-section side>
                          <q-icon name="o_star" size="16px" />
                        </q-item-section>
                        <q-item-section>Make default</q-item-section>
                      </q-item>
                      <q-item
                        v-if="!props.row.isSelectable"
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        :disable="savingId === props.row.id"
                        @click="restoreStatus(props.row)"
                      >
                        <q-item-section side>
                          <q-icon name="o_check_circle" size="16px" />
                        </q-item-section>
                        <q-item-section>Make selectable</q-item-section>
                      </q-item>
                      <q-item
                        v-if="canRetire(props.row)"
                        clickable
                        v-close-popup
                        class="dropdown-item dropdown-item-danger"
                        :disable="savingId === props.row.id"
                        @click="requestRetire(props.row)"
                      >
                        <q-item-section side><q-icon name="o_block" size="16px" /></q-item-section>
                        <q-item-section>Retire status</q-item-section>
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

    <!-- Create / edit. `is_default` is deliberately absent: the API refuses to
         unset a default, so which status is the default is changed only from the
         row menu's "Make default" action. -->
    <q-dialog v-model="dialog" persistent>
      <q-card class="dash-modal dash-modal--md">
        <q-card-section class="dash-modal__head">
          <div class="dash-modal__head-main">
            <q-avatar size="38px" class="dash-modal__head-icon">
              <q-icon name="o_how_to_reg" size="22px" />
            </q-avatar>
            <div class="dash-modal__head-titles">
              <div class="dash-modal__title">
                {{ editing ? 'Edit employment status' : 'Add employment status' }}
              </div>
              <div class="dash-modal__sub">
                Applies to every employee in this company who can be moved to it
              </div>
            </div>
          </div>
          <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
        </q-card-section>

        <q-card-section class="dash-modal__body">
          <div class="dash-modal__grid">
            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Name<span class="dash-modal__req">*</span></span
              >
              <q-input
                :model-value="form.name"
                outlined
                dense
                hide-bottom-space
                placeholder="Resigned"
                class="dash-field"
                @update:model-value="onNameInput"
              />
            </label>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Code</span>
              <q-input
                :model-value="form.code"
                outlined
                dense
                hide-bottom-space
                placeholder="resigned"
                maxlength="64"
                class="dash-field"
                :disable="editing && form.isSystem"
                @update:model-value="onCodeInput"
              />
              <span class="dash-modal__field-hint">{{ codeHint }}</span>
            </label>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Category<span class="dash-modal__req">*</span></span
              >
              <q-select
                v-model="form.category"
                :options="categoryOptions"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                dense
                outlined
                hide-bottom-space
                placeholder="Choose a category"
                popup-content-class="dash-popup"
                class="dash-field"
                :disable="editing && form.isSystem"
              />
              <span class="dash-modal__field-hint">{{ categoryHint }}</span>
            </label>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Sort order</span>
              <q-input
                v-model.number="form.sortOrder"
                type="number"
                outlined
                dense
                hide-bottom-space
                class="dash-field"
              />
              <span class="dash-modal__field-hint">Lower numbers appear first.</span>
            </label>

            <label class="dash-modal__field dash-modal__span-2">
              <span class="dash-modal__field-label">Description</span>
              <q-input
                v-model="form.description"
                outlined
                dense
                hide-bottom-space
                autogrow
                type="textarea"
                placeholder="What this status means, and when to use it"
                class="dash-field"
              />
            </label>
          </div>

          <div class="es-toggles">
            <q-toggle
              v-model="form.isSelectable"
              label="Can be assigned to employees"
              color="primary"
              class="brand-toggle"
              :disable="editing && form.isDefault"
            />
            <span v-if="editing && form.isDefault" class="dash-modal__field-hint">
              The default status cannot be retired. Make another status the default first.
            </span>
          </div>
        </q-card-section>

        <q-card-actions class="dash-modal__foot">
          <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" v-close-popup />
          <q-btn
            :label="editing ? 'Update' : 'Save'"
            no-caps
            class="dash-modal__submit"
            :loading="saving"
            @click="saveStatus"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Retiring keeps the row and the employees on it, so the question says so
         rather than borrowing the delete wording. -->
    <ConfirmDialog
      v-model="showRetireConfirm"
      :confirm="retireConfirm"
      :loading="retiring"
      @confirm="commitRetire"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { buildEmploymentStatusRetireConfirm } from './employmentStatusConfirm.js'
import { useAdminEmploymentStatuses } from '@/composables/admin/useAdminEmploymentStatuses'
import { useCompany } from '@/composables/page/useCompany'
import {
  EMPLOYMENT_STATUS_CATEGORIES,
  categoryLabel,
  suggestStatusCode,
} from '@/composables/utils/employmentStatuses'

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

const { companyId } = useCompany()

const {
  statuses,
  loading,
  saving,
  savingId,
  dialog,
  editing,
  form,
  retireTarget,
  showRetireConfirm,
  retiring,
  fetchStatuses,
  openDialog,
  openEditDialog,
  saveStatus,
  makeDefault,
  restoreStatus,
  requestRetire,
  retireStatus,
} = useAdminEmploymentStatuses()

// Passed to TableSkeleton as well as the live table, so the placeholder and the
// loaded grid share their column edges and labels.
const columns = [
  { name: 'name', label: 'Status', field: 'name', align: 'left' },
  { name: 'code', label: 'Code', field: 'code', align: 'left' },
  { name: 'category', label: 'Category', field: 'category', align: 'left' },
  { name: 'employees', label: 'Employees', field: 'employeeCount', align: 'left' },
  { name: 'availability', label: 'Availability', field: 'isSelectable', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'center' },
]

const categoryOptions = EMPLOYMENT_STATUS_CATEGORIES.map(({ value, label, hint }) => ({
  value,
  label,
  hint,
}))

const categoryFilters = [{ value: '', label: 'All categories' }, ...categoryOptions]

const categoryFilter = ref('')

const categoryHint = computed(
  () =>
    categoryOptions.find((option) => option.value === form.value.category)?.hint ||
    'Choose the category this status belongs to.',
)

// The code is optional: on create it is derived from the name, and on edit a
// blank field keeps whatever the status already has. A system status's code is
// fixed and cannot be sent at all.
const codeHint = computed(() => {
  if (editing.value && form.value.isSystem) {
    return 'A system status keeps its code and category.'
  }
  if (editing.value) {
    return 'Optional — leave blank to keep the current code.'
  }
  return 'Optional — generated from the name if left blank. Lowercase letters, numbers and underscores.'
})

/**
 * The code follows the name until an admin types one themselves. It is the
 * status's identity, so renaming must not silently re-code it.
 */
function onNameInput(value) {
  form.value.name = value
  if (!form.value.codeTouched) form.value.code = suggestStatusCode(value)
}

function onCodeInput(value) {
  form.value.code = value
  form.value.codeTouched = true
}

function categoryClass(category) {
  if (category === 'active') return 'status-active'
  if (category === 'separated') return 'es-cat--separated'
  return 'status-inactive'
}

/** A separated status cannot be the default (the endpoint refuses it). */
function canMakeDefault(status) {
  return !status.isDefault && status.isSelectable && status.category !== 'separated'
}

/** The default status cannot be retired, and a retired one has nothing to retire. */
function canRetire(status) {
  return status.isSelectable && !status.isDefault
}

const hasFilters = computed(() => Boolean(props.searchQuery.trim() || categoryFilter.value))

const filteredStatuses = computed(() => {
  const term = props.searchQuery.trim().toLowerCase()
  return statuses.value.filter((status) => {
    if (categoryFilter.value && status.category !== categoryFilter.value) return false
    if (!term) return true
    return (
      status.name.toLowerCase().includes(term) ||
      status.code.toLowerCase().includes(term) ||
      status.description.toLowerCase().includes(term) ||
      categoryLabel(status.category).toLowerCase().includes(term)
    )
  })
})

const retireConfirm = computed(() =>
  retireTarget.value ? buildEmploymentStatusRetireConfirm(retireTarget.value) : null,
)

function commitRetire() {
  if (retireTarget.value) retireStatus(retireTarget.value)
}

// A dialog or question open on one workspace's row must not carry into the next.
watch(companyId, () => {
  dialog.value = false
  showRetireConfirm.value = false
  retireTarget.value = null
  categoryFilter.value = ''
  fetchStatuses()
})

onMounted(fetchStatuses)
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

.es-filter {
  width: 158px;
}
.es-filter :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.es-filter :deep(.q-field__native) {
  font-size: 12.5px;
  color: var(--dash-ink-2);
}
.es-filter :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

.es-code {
  font-family: var(--dash-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 12px;
  letter-spacing: 0.03em;
  color: var(--dash-ink-2);
}

.es-count {
  font-variant-numeric: tabular-nums;
  color: var(--dash-ink-2);
}

/* The one category the shared badge set has no tone for. Separated is not a
   failure, so it is the amber note rather than the red one. */
.es-cat--separated {
  background: var(--dash-warn-bg);
  border-color: var(--dash-warn-line);
  color: var(--dash-warn);
}

.es-lock {
  display: inline-flex;
  align-items: center;
  margin-left: 5px;
  color: var(--dash-ink-4);
  vertical-align: -1px;
}

.es-toggles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 14px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--dash-line-soft);
}

@media (max-width: 1023px) {
  /* The category filter is a second control in a header the shared rules make
     full-width at this breakpoint; wrapping keeps the two from splitting the
     row between them. */
  .table-actions {
    flex-wrap: wrap;
  }
}

@media (max-width: 599px) {
  .es-filter {
    width: 100%;
  }
}
</style>
