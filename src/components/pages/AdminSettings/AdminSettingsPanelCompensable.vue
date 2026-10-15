<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Compensable time</h2>
        <p class="table-subtitle">Categories, and the subcategories filed under each</p>
      </div>
      <div class="table-actions">
        <q-btn
          color="primary"
          label="Add category"
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
        <TableSkeleton :columns="columns" />
      </template>
      <template v-else-if="!filteredCategories.length">
        <!-- A header strip over an empty grid reads as a table that failed to
             load; the centred state says which of the two it is and, when the
             search is what hid the rows, offers the way back. -->
        <div class="dash-empty ct-empty">
          <span class="dash-featured-icon"><q-icon name="o_hourglass_top" size="20px" /></span>
          <p class="dash-empty__title">
            {{ searchQuery ? 'No categories match' : 'No compensable categories yet' }}
          </p>
          <p class="dash-empty__sub">
            {{
              searchQuery
                ? `Nothing here is called “${searchQuery}”.`
                : 'Add the kinds of compensable time people can be given — overtime, a rest day worked, a holiday worked.'
            }}
          </p>
          <q-btn
            v-if="!searchQuery"
            label="Add category"
            icon="add"
            class="dash-modal__submit ct-empty__btn"
            unelevated
            @click="openDialog"
          />
        </div>
      </template>
      <template v-else>
        <q-table
          :rows="filteredCategories"
          :columns="columns"
          row-key="id"
          flat
          class="dash-qtable settings-table"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Category</q-th>
              <q-th class="table-header-cell">Subcategories</q-th>
              <q-th class="table-header-cell">Status</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell">
                <span class="item-name">{{ props.row.name }}</span>
                <span v-if="props.row.description" class="ct-desc">
                  {{ props.row.description }}
                </span>
              </q-td>

              <!-- The figure and the way to act on it are the same control, so
                   an admin can open a category's subcategories from the row
                   without hunting the menu for it. -->
              <q-td class="table-body-cell">
                <button
                  type="button"
                  class="ct-subs-cell"
                  @click="openSubcategories(props.row)"
                  :aria-label="`Manage subcategories of ${props.row.name}`"
                >
                  <span class="ct-subs-primary">{{ subcategoryLabel(props.row) }}</span>
                  <span class="ct-subs-secondary">Allowance defaults per kind</span>
                </button>
              </q-td>

              <q-td class="table-body-cell">
                <span
                  :class="[
                    'status-badge',
                    props.row.isActive ? 'status-active' : 'status-inactive',
                  ]"
                >
                  {{ props.row.isActive ? 'Active' : 'Inactive' }}
                </span>
              </q-td>

              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 180px">
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="openEditDialog(props.row)"
                      >
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit category</q-item-section>
                      </q-item>
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="openSubcategories(props.row)"
                      >
                        <q-item-section side>
                          <q-icon name="account_tree" size="16px" />
                        </q-item-section>
                        <q-item-section>Manage subcategories</q-item-section>
                      </q-item>
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="setCategoryActive(props.row, !props.row.isActive)"
                      >
                        <q-item-section side>
                          <q-icon
                            :name="props.row.isActive ? 'visibility_off' : 'visibility'"
                            size="16px"
                          />
                        </q-item-section>
                        <q-item-section>
                          {{ props.row.isActive ? 'Deactivate' : 'Activate' }}
                        </q-item-section>
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

    <!-- ── Add / edit category ────────────────────────────────────────────────
         The API documents no delete for a category, so there is none here:
         `is_active` is the documented way to stop one being offered, and it
         is reversible. -->
    <q-dialog v-model="dialog" persistent>
      <q-card class="dash-modal dash-modal--md">
        <q-card-section class="dash-modal__head">
          <div class="dash-modal__head-main">
            <q-avatar size="38px" class="dash-modal__head-icon">
              <q-icon name="hourglass_top" size="22px" />
            </q-avatar>
            <div class="dash-modal__head-titles">
              <div class="dash-modal__title">
                {{ editing ? 'Edit category' : 'Add category' }}
              </div>
              <div class="dash-modal__sub">A kind of compensable time</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
        </q-card-section>

        <q-form @submit.prevent="submit" class="dash-modal__form">
          <q-card-section class="dash-modal__body">
            <div class="dash-modal__group">
              <p class="dash-modal__group-label">Category</p>
              <div class="dash-modal__grid">
                <label class="dash-modal__field dash-modal__span-2">
                  <span class="dash-modal__field-label">
                    Name<span class="dash-modal__req">*</span>
                  </span>
                  <q-input
                    v-model="form.name"
                    outlined
                    dense
                    hide-bottom-space
                    class="dash-field"
                    placeholder="Rest day worked"
                  >
                    <template v-slot:prepend><q-icon name="label" size="18px" /></template>
                  </q-input>
                </label>

                <label class="dash-modal__field dash-modal__span-2">
                  <span class="dash-modal__field-label">Description</span>
                  <q-input
                    v-model="form.description"
                    type="textarea"
                    rows="2"
                    outlined
                    dense
                    hide-bottom-space
                    class="dash-field"
                    placeholder="What this compensable time covers"
                  />
                </label>

                <label class="dash-modal__field dash-modal__span-2">
                  <span class="dash-modal__field-label">Active</span>
                  <div class="ct-active">
                    <q-toggle
                      v-model="form.is_active"
                      color="primary"
                      size="md"
                      class="brand-toggle"
                    />
                    <span class="ct-active__text">{{
                      form.is_active ? 'Offered to employees' : 'Hidden from employees'
                    }}</span>
                  </div>
                  <span class="dash-modal__field-hint">
                    An inactive category keeps its subcategories and allowance defaults but cannot
                    be filed.
                  </span>
                </label>
              </div>
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

    <CompensableSubcategoriesDialog
      ref="subcategoriesDialogRef"
      v-model="subcategoriesDialog"
      :category="subcategoriesFor"
      :subcategories="subcategories"
      :allowance-types="allowanceTypes"
      :loading-allowance-types="loadingAllowanceTypes"
      :loading="loadingSubcategories"
      :saving="savingSubcategory"
      @create="handleCreateSubcategory"
      @update="handleUpdateSubcategory"
      @toggle="setSubcategoryActive"
    />
  </div>
</template>

<script setup>
/**
 * Compensable time categories for the active company.
 *
 * The panel owns both sub-resource composables rather than letting the
 * subcategories dialog hold its own: a subcategory write has to refresh the
 * dialog's list *and* anything the table prints about it, and two instances
 * would leave that stale until a reload. The same reason the allowance-type
 * lookup lives here — only the subcategory form offers it, and only while that
 * dialog is open.
 */
import { computed, onMounted, ref, watch } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import CompensableSubcategoriesDialog from './CompensableSubcategoriesDialog.vue'
import { useAdminCompensableCategories } from '@/composables/admin/useAdminCompensableCategories'
import { useAdminCompensableSubcategories } from '@/composables/admin/useAdminCompensableSubcategories'
import { useAllowances } from '@/composables/page/useAllowances'
import { useCompany } from '@/composables/page/useCompany'
import { subcategorySummary } from '@/composables/utils/compensableTime'

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

const { companyId } = useCompany()

const {
  categories,
  loading,
  saving,
  dialog,
  editing,
  form,
  fetchCategories,
  openDialog,
  openEditDialog,
  saveCategory,
  setCategoryActive,
} = useAdminCompensableCategories()

const {
  subcategories,
  loading: loadingSubcategories,
  saving: savingSubcategory,
  fetchSubcategories,
  createSubcategory,
  updateSubcategory,
  setSubcategoryActive,
} = useAdminCompensableSubcategories()

const { allowanceTypes, loading: loadingAllowanceTypes, fetchAllowanceTypes } = useAllowances()

const columns = [
  { name: 'name', label: 'Category', field: 'name', align: 'left' },
  { name: 'subcategories', label: 'Subcategories', field: 'subcategories', align: 'left' },
  { name: 'status', label: 'Status', field: 'isActive', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

// ─── Table ──────────────────────────────────────────────────────────────────

const filteredCategories = computed(() => {
  const query = (props.searchQuery || '').trim().toLowerCase()
  if (!query) return categories.value
  return categories.value.filter(
    (category) =>
      category.name.toLowerCase().includes(query) ||
      (category.description || '').toLowerCase().includes(query),
  )
})

/**
 * The count only when the categories route embedded the subcategories — the
 * documented list shape carries none, so most rows print the action rather than
 * a figure this panel cannot know without a request per row.
 */
function subcategoryLabel(category) {
  return subcategorySummary(category)?.text ?? 'Manage subcategories'
}

// ─── Add / edit dialog ──────────────────────────────────────────────────────

async function submit() {
  await saveCategory()
}

// ─── Subcategories dialog ───────────────────────────────────────────────────

const subcategoriesDialog = ref(false)
const subcategoriesFor = ref(null)
const subcategoriesDialogRef = ref(null)

/**
 * The allowance-type lookup is only needed by the subcategory form, so it loads
 * on open rather than with the panel — a company with no subcategories never
 * pays for the request.
 */
async function ensureAllowanceTypes() {
  if (allowanceTypes.value.length) return allowanceTypes.value
  return fetchAllowanceTypes()
}

async function openSubcategories(category) {
  subcategoriesFor.value = category
  subcategoriesDialog.value = true
  await Promise.all([fetchSubcategories(category.id), ensureAllowanceTypes()])
}

async function handleCreateSubcategory(draft) {
  const categoryId = subcategoriesFor.value?.id
  if (categoryId == null) return
  const saved = await createSubcategory(categoryId, draft)
  if (saved) subcategoriesDialogRef.value?.resetDraft()
}

async function handleUpdateSubcategory(subcategory, draft) {
  const saved = await updateSubcategory(subcategory, draft)
  if (saved) subcategoriesDialogRef.value?.resetDraft()
}

// Ids from the previous workspace mean nothing in the next one, so the
// subcategories and the dialog are dropped and the list re-read on a switch.
// The allowance-type list is not cleared here — `useAllowances` watches the
// company itself and owns that.
watch(companyId, () => {
  subcategoriesDialog.value = false
  subcategoriesFor.value = null
  fetchCategories()
})

onMounted(fetchCategories)
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

/* A description is context for the name above it, not a paragraph — two lines
   is the most a table row can carry without the rows losing their rhythm. */
.ct-desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  /* QTable's `wrap-cells` default leaves the table `q-table--no-wrap`, which
     puts `white-space: nowrap` on every cell; the span inherits it and the
     clamp above never engages. Only the `max-width` below has been holding this
     column down. See `.pos-desc` in AdminSettingsPanelPositions.vue. */
  white-space: normal;
  margin-top: 2px;
  font-size: 11.5px;
  line-height: 1.35;
  color: var(--dash-ink-4);
  max-width: 320px;
}

.ct-subs-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 2px 6px 2px 0;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  border-radius: var(--dash-r-sm);
}

.ct-subs-cell:hover .ct-subs-primary {
  text-decoration: underline;
}

.ct-subs-cell:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--dash-accent-ring);
}

.ct-subs-primary {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
}

.ct-subs-secondary {
  font-size: 11.5px;
  color: var(--dash-ink-4);
}

.ct-active {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 40px;
}

.ct-active__text {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink);
}

.ct-empty {
  padding: 40px 20px;
}

.ct-empty__btn {
  margin-top: 14px;
  height: 34px;
  padding: 0 16px;
  border-radius: var(--dash-r-md);
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
}

@media (max-width: 1023px) {
  .ct-desc {
    max-width: 220px;
  }
}
</style>
