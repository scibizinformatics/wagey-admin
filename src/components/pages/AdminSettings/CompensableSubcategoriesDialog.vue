<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="dash-modal dash-modal--xl">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="account_tree" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Subcategories</div>
            <div class="dash-modal__sub">{{ category?.name || 'Category' }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
      </q-card-section>

      <q-card-section ref="bodyRef" class="dash-modal__body">
        <!-- ── Add / edit ───────────────────────────────────────────────────
             One form serves both. The subcategories list is inside this dialog
             rather than behind a second one, so editing loads a row back into
             the fields above rather than opening a dialog on top of this one. -->
        <div class="dash-modal__group">
          <p class="dash-modal__group-label">
            {{ editing ? 'Edit subcategory' : 'Add a subcategory' }}
          </p>

          <div class="dash-modal__grid">
            <label class="dash-modal__field">
              <span class="dash-modal__field-label">
                Name<span class="dash-modal__req">*</span>
              </span>
              <q-input
                v-model="draft.name"
                outlined
                dense
                hide-bottom-space
                class="dash-field"
                placeholder="Regular day off"
              >
                <template v-slot:prepend><q-icon name="label" size="18px" /></template>
              </q-input>
            </label>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Active</span>
              <div class="ct-sub-active">
                <q-toggle
                  v-model="draft.is_active"
                  color="primary"
                  size="md"
                  class="brand-toggle"
                />
                <span class="ct-sub-active__text">{{
                  draft.is_active ? 'Offered to employees' : 'Hidden from employees'
                }}</span>
              </div>
              <span class="dash-modal__field-hint">
                An inactive subcategory keeps its settings but cannot be filed.
              </span>
            </label>

            <label class="dash-modal__field dash-modal__span-2">
              <span class="dash-modal__field-label">Description</span>
              <q-input
                v-model="draft.description"
                type="textarea"
                rows="2"
                outlined
                dense
                hide-bottom-space
                class="dash-field"
                placeholder="What this compensable time is used for"
              />
            </label>

            <label class="dash-modal__field dash-modal__span-2">
              <span class="dash-modal__field-label">Default allowance types</span>
              <q-select
                v-model="draft.allowance_type_ids"
                :options="allowanceOptions"
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
                :loading="loadingAllowanceTypes"
                hide-bottom-space
                class="dash-field"
                popup-content-class="dash-popup dash-popup--modal"
              >
                <template v-slot:prepend>
                  <q-icon name="card_giftcard" size="18px" />
                </template>
                <template v-slot:no-option>
                  <q-item>
                    <q-item-section class="text-grey-7">
                      No allowance types in this company yet
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
              <span class="dash-modal__field-hint">
                Applied to a compensable time request filed under this subcategory when the employee
                picks nothing themselves.
              </span>
            </label>
          </div>

          <div class="ct-sub-actions">
            <q-btn
              v-if="editing"
              flat
              no-caps
              label="Cancel"
              class="dash-modal__cancel ct-sub-actions__btn"
              @click="cancelEdit"
            />
            <q-btn
              :label="editing ? 'Update subcategory' : 'Add subcategory'"
              :icon="editing ? 'save' : 'add'"
              type="button"
              no-caps
              unelevated
              class="dash-modal__submit ct-sub-actions__btn"
              :loading="saving"
              @click="submit"
            />
          </div>
        </div>

        <!-- ── Existing ────────────────────────────────────────────────────── -->
        <div class="dash-modal__group">
          <div class="dash-modal__group-head">
            <p class="dash-modal__group-label">Current subcategories</p>
            <span v-if="!loading && subcategories.length" class="ct-sub-count">
              {{ summaryLine }}
            </span>
          </div>

          <div v-if="loading" class="ct-sub-state">
            <q-spinner size="18px" color="primary" />
            <span>Loading subcategories…</span>
          </div>

          <div v-else-if="!subcategories.length" class="ct-sub-state ct-sub-state--empty">
            <q-icon name="o_account_tree" size="20px" />
            <span>No subcategories yet — this category cannot be filed under.</span>
          </div>

          <table v-else class="ct-sub-table">
            <thead>
              <tr>
                <th>Subcategory</th>
                <th>Allowance types</th>
                <th>Status</th>
                <th class="ct-sub-table__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="subcategory in subcategories"
                :key="subcategory.id"
                :class="{ 'is-editing': editingId === subcategory.id }"
              >
                <td>
                  <span class="ct-sub-name">{{ subcategory.name || 'Unnamed' }}</span>
                  <span v-if="subcategory.description" class="ct-sub-desc">
                    {{ subcategory.description }}
                  </span>
                </td>
                <td>
                  <div v-if="allowanceNamesFor(subcategory).length" class="ct-sub-allowances">
                    <span
                      v-for="name in allowanceNamesFor(subcategory)"
                      :key="name"
                      class="ct-sub-allowance"
                    >
                      {{ name }}
                    </span>
                  </div>
                  <span v-else class="ct-sub-muted">None</span>
                </td>
                <td>
                  <span
                    :class="[
                      'status-badge',
                      subcategory.isActive ? 'status-active' : 'status-inactive',
                    ]"
                  >
                    {{ subcategory.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="ct-sub-table__actions">
                  <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                    <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                      <q-list dense style="min-width: 170px">
                        <q-item
                          clickable
                          v-close-popup
                          class="dropdown-item"
                          @click="startEdit(subcategory)"
                        >
                          <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                          <q-item-section>Edit subcategory</q-item-section>
                        </q-item>
                        <q-item
                          clickable
                          v-close-popup
                          class="dropdown-item"
                          @click="$emit('toggle', subcategory, !subcategory.isActive)"
                        >
                          <q-item-section side>
                            <q-icon
                              :name="subcategory.isActive ? 'visibility_off' : 'visibility'"
                              size="16px"
                            />
                          </q-item-section>
                          <q-item-section>
                            {{ subcategory.isActive ? 'Deactivate' : 'Activate' }}
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </td>
              </tr>
            </tbody>
          </table>

          <p class="ct-sub-note">
            The API offers no delete for a subcategory, so one that should stop being used is
            deactivated instead — which keeps its allowance defaults and can be undone.
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
 * The subcategories of one compensable time category, and the form that adds and
 * edits them.
 *
 * State is owned by the panel rather than here, for the same reason
 * `LeaveTypePoliciesDialog` does it that way: the panel's table may print a
 * count of these, so a change made in here has to be written where the panel
 * can re-read it. A second composable instance would leave that column showing
 * pre-write figures until a reload.
 *
 * There is no delete row action because the API documents none — only list,
 * create and update. See `useAdminCompensableSubcategories`.
 */
import { computed, ref, watch } from 'vue'
import {
  allowanceTypeNames,
  emptySubcategoryForm,
  subcategoryToForm,
} from '@/composables/utils/compensableTime'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** The normalized category these subcategories belong to. */
  category: { type: Object, default: null },
  /** Normalized subcategories for `category`, from the panel's composable. */
  subcategories: { type: Array, default: () => [] },
  /** The company's allowance types, for naming `default_allowance_types`. */
  allowanceTypes: { type: Array, default: () => [] },
  loadingAllowanceTypes: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'create', 'update', 'toggle'])

const draft = ref(emptySubcategoryForm())
/** The row being edited, or null when the form is adding. */
const editing = ref(null)
const editingId = computed(() => editing.value?.id ?? null)

/**
 * The dialog body, which is the scroll container.
 *
 * `dash-modal__body` is `overflow-y: auto` with `flex: 1; min-height: 0`, so it —
 * not the dialog and not the window — is what scrolls. It is a `QCardSection`, so
 * the node to scroll is its `$el`.
 */
const bodyRef = ref(null)

const allowanceOptions = computed(() =>
  props.allowanceTypes
    .filter((type) => type?.id != null)
    .map((type) => ({ value: type.id, label: type.name || `Type ${type.id}` })),
)

const summaryLine = computed(() => {
  const total = props.subcategories.length
  if (!total) return ''
  const active = props.subcategories.filter((subcategory) => subcategory.isActive).length
  return `${active} active · ${total - active} inactive`
})

function allowanceNamesFor(subcategory) {
  return allowanceTypeNames(subcategory.allowanceTypeIds, props.allowanceTypes)
}

// ─── Add / edit ──────────────────────────────────────────────────────────────

/**
 * Bring the form back into view after a row loads into it.
 *
 * Scrolling the one element that scrolls, rather than `scrollIntoView()` on the
 * form itself: `scrollIntoView` walks up *every* scrollable ancestor including the
 * document, so it can nudge the page sitting behind the modal, where setting
 * `scrollTop` on the body cannot. Guarded, so a body ref that has not resolved
 * yet is a no-op rather than a crash.
 *
 * Stepped down to instant under `prefers-reduced-motion`, matching how this
 * codebase's own CSS treats motion.
 */
function scrollFormIntoView() {
  const el = bodyRef.value?.$el ?? bodyRef.value
  if (!el?.scrollTo) return
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  el.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
}

/**
 * Load a row into the form and show the form.
 *
 * The scroll is part of this and not of the row menu: the add/edit form sits
 * *above* the list in the same scroll container, so clicking Edit on a row near
 * the bottom populated a form that was off-screen and the click looked like it had
 * done nothing. The row itself is already marked (`is-editing`), so once the body
 * is back at the top the reviewer can see both the loaded values and which row
 * they came from.
 *
 * No `nextTick` is needed — the form is always in the DOM; only its heading text
 * changes from "Add" to "Edit", which is not a height the container waits on.
 */
function startEdit(subcategory) {
  editing.value = subcategory
  draft.value = subcategoryToForm(subcategory)
  scrollFormIntoView()
}

function cancelEdit() {
  editing.value = null
  draft.value = emptySubcategoryForm()
}

/**
 * Emits rather than writes: the panel owns the composable, so the dialog does
 * not know what company or category is in play. A draft abandoned on one
 * subcategory is replaced on the next open, never carried.
 */
function submit() {
  if (props.saving) return
  if (editing.value) {
    emit('update', editing.value, { ...draft.value })
    return
  }
  emit('create', { ...draft.value })
}

// The panel clears the form by telling us the write landed, rather than us
// guessing from a changed list length — a refetch returning the same count
// (a failed save followed by a reload) must not look like success.
defineExpose({
  resetDraft() {
    cancelEdit()
  },
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) cancelEdit()
  },
)
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

.ct-sub-active {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 40px;
}

.ct-sub-active__text {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink);
}

.ct-sub-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

/* Both buttons in the row carry this, not just the submit: `dash-modal` puts a
   button's shape in `.dash-modal__foot`, so a button placed in the body — as
   this Cancel is — gets none of it and falls back to Quasar's `.q-btn--rectangle`
   3px corners and 14px label while its neighbour is on `--dash-r-md` at 13px.
   This restates the footer's metrics so a body row reads as one pair. */
.ct-sub-actions__btn {
  height: 34px;
  padding: 0 16px;
  border-radius: var(--dash-r-md);
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
}

.ct-sub-count {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dash-ink-3);
  font-variant-numeric: tabular-nums;
}

.ct-sub-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 18px 12px;
  font-size: 12.5px;
  color: var(--dash-ink-3);
}

.ct-sub-state--empty {
  justify-content: center;
  text-align: center;
  border: 1px dashed var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
  color: var(--dash-ink-4);
}

.ct-sub-table {
  width: 100%;
  border-collapse: collapse;
}

.ct-sub-table th {
  padding: 10px 10px 8px;
  text-align: left;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--dash-ink-4);
  border-bottom: 1px solid var(--dash-line);
}

.ct-sub-table td {
  padding: 9px 10px;
  font-size: 12.5px;
  color: var(--dash-ink-2);
  border-bottom: 1px solid var(--dash-line-soft);
  vertical-align: middle;
}

/* The row being edited is the one the form above is loaded from, so it is
   marked — otherwise the top of the dialog says "Edit" and the table below
   gives no hint which row that is. */
.ct-sub-table tbody tr.is-editing td {
  background: var(--dash-n-50);
}

.ct-sub-table tbody tr:last-child td {
  border-bottom: none;
}

.ct-sub-table__actions {
  width: 56px;
  text-align: right !important;
}

.ct-sub-name {
  display: block;
  font-weight: 500;
  color: var(--dash-ink);
}

.ct-sub-desc {
  display: block;
  margin-top: 1px;
  font-size: 11px;
  line-height: 1.35;
  color: var(--dash-ink-4);
  max-width: 280px;
}

.ct-sub-allowances {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 260px;
}

.ct-sub-allowance {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--dash-r-pill);
  background: var(--dash-neutral-bg);
  border: 1px solid var(--dash-neutral-line);
  color: var(--dash-neutral);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.ct-sub-muted {
  color: var(--dash-ink-3);
}

.ct-sub-note {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--dash-ink-4);
}

@media (max-width: 599px) {
  .dash-modal__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .ct-sub-actions__btn {
    flex: 1;
  }
}
</style>
