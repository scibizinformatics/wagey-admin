<template>
  <q-dialog :model-value="modelValue" @update:model-value="close">
    <q-card class="dash-modal dash-modal--xl">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="o_category" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Contribution types</div>
            <div class="dash-modal__sub">The schemes components belong to</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
      </q-card-section>

      <q-card-section ref="bodyRef" class="dash-modal__body">
        <!-- ── Add / edit ───────────────────────────────────────────────────────
             One form serves both. The list is inside this dialog rather than
             behind a second one, so editing loads a row back into the fields
             above rather than opening a dialog on top of this one. -->
        <div class="dash-modal__group">
          <p class="dash-modal__group-label">
            {{ editing ? 'Edit contribution type' : 'Add a contribution type' }}
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
                maxlength="100"
                placeholder="Social Security System"
              >
                <template v-slot:prepend><q-icon name="label" size="18px" /></template>
              </q-input>
            </label>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label">
                Code<span class="dash-modal__req">*</span>
              </span>
              <q-input
                v-model="draft.code"
                outlined
                dense
                hide-bottom-space
                class="dash-field ct-code-field"
                maxlength="30"
                placeholder="SSS"
              >
                <template v-slot:prepend><q-icon name="tag" size="18px" /></template>
              </q-input>
              <span class="dash-modal__field-hint">
                A short identifier, unique within the company.
              </span>
            </label>
          </div>

          <div class="ct-actions">
            <q-btn
              v-if="editing"
              flat
              no-caps
              label="Cancel"
              class="dash-modal__cancel ct-actions__btn"
              @click="cancelEdit"
            />
            <q-btn
              :label="editing ? 'Update type' : 'Add type'"
              :icon="editing ? 'save' : 'add'"
              type="button"
              no-caps
              unelevated
              class="dash-modal__submit ct-actions__btn"
              :loading="saving"
              @click="submit"
            />
          </div>
        </div>

        <!-- ── Existing ────────────────────────────────────────────────────── -->
        <div class="dash-modal__group">
          <div class="dash-modal__group-head">
            <p class="dash-modal__group-label">Current types</p>
            <span v-if="!loading && types.length" class="ct-count">
              {{ summaryLine }}
            </span>
          </div>

          <div v-if="loading" class="ct-state">
            <q-spinner size="18px" color="primary" />
            <span>Loading contribution types…</span>
          </div>

          <div v-else-if="!types.length" class="ct-state ct-state--empty">
            <q-icon name="o_category" size="20px" />
            <span>No contribution types yet — components can exist without one.</span>
          </div>

          <table v-else class="ct-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Code</th>
                <th>Components</th>
                <th class="ct-table__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="type in types"
                :key="type.id"
                :class="{ 'is-editing': sameId(editingId, type.id) }"
              >
                <td>
                  <span class="ct-name">{{ contributionTypeLabel(type) }}</span>
                </td>
                <td>
                  <code v-if="type.code" class="ct-code">{{ type.code }}</code>
                  <span v-else class="ct-muted">—</span>
                </td>
                <td>
                  <span class="ct-brackets">{{ bracketCountFor(type) }}</span>
                </td>
                <td class="ct-table__actions">
                  <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                    <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                      <q-list dense style="min-width: 170px">
                        <q-item
                          clickable
                          v-close-popup
                          class="dropdown-item"
                          @click="startEdit(type)"
                        >
                          <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                          <q-item-section>Edit type</q-item-section>
                        </q-item>
                        <q-item
                          clickable
                          v-close-popup
                          class="dropdown-item dropdown-item-danger"
                          @click="$emit('delete', type)"
                        >
                          <q-item-section side>
                            <q-icon name="delete" size="16px" color="negative" />
                          </q-item-section>
                          <q-item-section>Delete</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </td>
              </tr>
            </tbody>
          </table>

          <p class="ct-note">
            A type that still has components filed under it cannot be deleted — remove or move those
            components first. Deleting a type cannot be undone.
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
 * The company's contribution types, and the form that adds and edits them.
 *
 * State is owned by the panel rather than here, for the same reason
 * `CompensableSubcategoriesDialog` does it that way: the panel's table prints
 * the type of every component and filters by it, so a change made in here has to
 * be written where the panel can re-read it. A second composable instance would
 * leave that column naming a type the admin had already renamed.
 *
 * This dialog asks no question about its own deletes: it emits the row and the
 * panel opens its shared `ConfirmDialog` over this one. Keeping the question
 * there means one confirm chrome for the whole section rather than a second
 * nested in a modal.
 */
import { computed, ref, watch } from 'vue'
import {
  contributionTypeLabel,
  contributionTypeToForm,
  emptyContributionTypeForm,
  sameId,
} from 'src/composables/utils/contributionSettings'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Normalized contribution types for the active company. */
  types: { type: Array, default: () => [] },
  /** Normalized brackets, so each type can show how many it holds. */
  brackets: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  /** The type a Type-cell click asked to edit, when there was one. */
  selectedTypeId: { type: [Number, String], default: null },
})

const emit = defineEmits(['update:modelValue', 'create', 'update', 'delete'])

const draft = ref(emptyContributionTypeForm())
/** The row being edited, or null when the form is adding. */
const editing = ref(null)
const editingId = computed(() => editing.value?.id ?? null)

/** The dialog body, which is the scroll container. */
const bodyRef = ref(null)

const bracketCounts = computed(() => {
  const counts = new Map()
  for (const bracket of props.brackets) {
    const key = String(bracket.typeId)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
})

const summaryLine = computed(() => {
  const total = props.types.length
  const brackets = props.brackets.length
  return `${total} type${total === 1 ? '' : 's'} · ${brackets} component${brackets === 1 ? '' : 's'}`
})

function bracketCountFor(type) {
  const count = bracketCounts.value.get(String(type.id)) ?? 0
  return count === 0 ? 'None' : String(count)
}

// ─── Add / edit ──────────────────────────────────────────────────────────────

/**
 * Bring the form back into view after a row loads into it.
 *
 * Scrolls the one element that scrolls rather than `scrollIntoView()`, which
 * walks every scrollable ancestor including the document behind the modal.
 */
function scrollFormIntoView() {
  const el = bodyRef.value?.$el ?? bodyRef.value
  if (!el?.scrollTo) return
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  el.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
}

function startEdit(type) {
  editing.value = type
  draft.value = contributionTypeToForm(type)
  scrollFormIntoView()
}

function cancelEdit() {
  editing.value = null
  draft.value = emptyContributionTypeForm()
}

function close() {
  emit('update:modelValue', false)
}

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

// A deleted row cannot stay in the form: after the panel's confirm lands, the
// list prop loses it and the form would otherwise keep writing to a dead id.
watch(
  () => props.types,
  (types) => {
    if (!editing.value) return
    const stillThere = types.some((type) => String(type.id) === String(editing.value.id))
    if (!stillThere) cancelEdit()
  },
)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    cancelEdit()
    if (props.selectedTypeId == null) return
    const selected = props.types.find((type) => String(type.id) === String(props.selectedTypeId))
    if (selected) startEdit(selected)
  },
)
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

.ct-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

/* Both buttons in the row carry this, not just the submit: `dash-modal` puts a
   button's shape in `.dash-modal__foot`, so a button placed in the body — as
   this Cancel is — gets none of it and falls back to Quasar's rectangle. */
.ct-actions__btn {
  height: 34px;
  padding: 0 16px;
  border-radius: var(--dash-r-md);
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
}

.ct-count {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dash-ink-3);
  font-variant-numeric: tabular-nums;
}

.ct-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 18px 12px;
  font-size: 12.5px;
  color: var(--dash-ink-3);
}

.ct-state--empty {
  justify-content: center;
  text-align: center;
  border: 1px dashed var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
  color: var(--dash-ink-4);
}

.ct-table {
  width: 100%;
  border-collapse: collapse;
}

.ct-table th {
  padding: 10px 10px 8px;
  text-align: left;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--dash-ink-4);
  border-bottom: 1px solid var(--dash-line);
}

.ct-table td {
  padding: 9px 10px;
  font-size: 12.5px;
  color: var(--dash-ink-2);
  border-bottom: 1px solid var(--dash-line-soft);
  vertical-align: middle;
}

/* The row being edited is the one the form above is loaded from. */
.ct-table tbody tr.is-editing td {
  background: var(--dash-n-50);
}

.ct-table tbody tr:last-child td {
  border-bottom: none;
}

.ct-table__actions {
  width: 56px;
  text-align: right !important;
}

.ct-name {
  display: block;
  font-weight: 500;
  color: var(--dash-ink);
}

.ct-code {
  padding: 2px 7px;
  border-radius: var(--dash-r-sm);
  background: var(--dash-n-50);
  border: 1px solid var(--dash-line);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
  color: var(--dash-ink-2);
}

.ct-code-field :deep(.q-field__native) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.ct-brackets {
  font-variant-numeric: tabular-nums;
}

.ct-muted {
  color: var(--dash-ink-3);
}

.ct-note {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--dash-ink-4);
}

@media (max-width: 599px) {
  .dash-modal__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .ct-actions__btn {
    flex: 1;
  }
}
</style>
