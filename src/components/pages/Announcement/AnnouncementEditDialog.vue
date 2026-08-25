<template>
  <q-dialog
    :model-value="modelValue"
    :maximized="$q.screen.lt.sm"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="ann-dlg">
      <q-card-section class="ann-dlg__head">
        <span class="ann-dlg__head-icon">
          <q-icon name="o_campaign" size="19px" />
        </span>
        <div class="ann-dlg__head-titles">
          <div class="ann-dlg__head-title">
            {{ isEditing ? 'Edit announcement' : 'New announcement' }}
          </div>
          <div class="ann-dlg__head-sub">{{ headSub }}</div>
        </div>
        <q-btn flat round dense icon="close" aria-label="Close" @click="close" />
      </q-card-section>

      <q-form class="ann-dlg__form" @submit="onSave">
        <q-card-section class="ann-dlg__body">
          <!-- ── What it says ─────────────────────────────────────────────── -->
          <div class="ann-field">
            <span class="ann-field__label">Title</span>
            <q-input
              v-model="localForm.title"
              outlined
              dense
              hide-bottom-space
              autofocus
              placeholder="Short line employees see first"
              class="dash-field"
              :rules="[(val) => !!val?.trim() || 'A title is required']"
            />
          </div>

          <div class="ann-field">
            <span class="ann-field__label">Message</span>
            <q-input
              v-model="localForm.message"
              type="textarea"
              outlined
              rows="5"
              hide-bottom-space
              placeholder="The announcement itself"
              class="dash-field ann-field__area"
              :rules="[(val) => !!val?.trim() || 'A message is required']"
            />
          </div>

          <div class="ann-row2">
            <div class="ann-field">
              <span class="ann-field__label">Type</span>
              <q-select
                v-model="localForm.announcement_type"
                :options="typeSelectOptions"
                outlined
                dense
                emit-value
                map-options
                hide-bottom-space
                popup-content-class="dash-popup"
                class="dash-field"
              >
                <template v-slot:prepend>
                  <span class="ann-type-dot" :style="{ background: currentTypeMark }" />
                </template>
              </q-select>
            </div>

            <!-- The switch reads as a state, not a checkbox: "Live" / "Switched
                 off" says what employees see, which "Active" on its own did
                 not. -->
            <div class="ann-field">
              <span class="ann-field__label">Visibility</span>
              <div class="ann-switch">
                <q-toggle v-model="localForm.is_active" dense class="ann-switch__toggle" />
                <span class="ann-switch__text">
                  {{ localForm.is_active ? 'Shown to employees' : 'Switched off' }}
                </span>
              </div>
            </div>
          </div>

          <!-- ── When ─────────────────────────────────────────────────────── -->
          <div class="ann-group">
            <div class="ann-group__head">
              <span class="ann-group__title">Schedule</span>
              <span class="ann-group__hint">{{ scheduleHint }}</span>
            </div>
            <div class="ann-row2">
              <div class="ann-field">
                <span class="ann-field__label">Starts</span>
                <q-input
                  v-model="localForm.start_at"
                  type="datetime-local"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field"
                />
              </div>
              <div class="ann-field">
                <span class="ann-field__label">Ends</span>
                <q-input
                  v-model="localForm.end_at"
                  type="datetime-local"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field"
                  :error="endsBeforeStart"
                  :error-message="'The end must come after the start'"
                />
              </div>
            </div>
          </div>

          <!-- ── Who ──────────────────────────────────────────────────────── -->
          <div class="ann-group">
            <div class="ann-group__head">
              <span class="ann-group__title">Audience</span>
            </div>

            <div class="ann-audience">
              <button
                v-for="option in audienceOptions"
                :key="option.value"
                type="button"
                class="ann-audience__opt"
                :class="{ 'is-on': localForm.target_everyone === option.value }"
                :aria-pressed="localForm.target_everyone === option.value"
                @click="setAudience(option.value)"
              >
                <q-icon :name="option.icon" size="17px" />
                <span class="ann-audience__opt-text">
                  <span class="ann-audience__opt-label">{{ option.label }}</span>
                  <span class="ann-audience__opt-sub">{{ option.sub }}</span>
                </span>
              </button>
            </div>

            <div v-if="!localForm.target_everyone" class="ann-targets">
              <!-- The picker comes first. The four filters below it only change
                   which employees it offers — they are not the audience, and
                   putting them above the picker made the one control that
                   matters the last thing in a scrolling dialog. -->
              <div class="ann-field">
                <div class="ann-people__head">
                  <span class="ann-field__label">Employees</span>
                  <span class="ann-people__meta">{{ peopleMeta }}</span>
                  <button
                    type="button"
                    class="ann-people__act"
                    :disabled="!offeredRecipients.length"
                    @click="selectAllOffered"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    class="ann-people__act"
                    :disabled="!localForm.target_users.length"
                    @click="clearSelection"
                  >
                    Clear
                  </button>
                </div>
                <!-- Typed filtering because the list runs to hundreds of names
                     even after the filters below have narrowed it. -->
                <q-select
                  v-model="localForm.target_users"
                  :options="pickerOptions"
                  :loading="loadingRecipients"
                  outlined
                  dense
                  multiple
                  use-chips
                  use-input
                  input-debounce="0"
                  emit-value
                  map-options
                  hide-bottom-space
                  popup-content-class="dash-popup"
                  placeholder="Search employees by name"
                  class="dash-field"
                  @filter="filterPeople"
                >
                  <template v-slot:option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section side>
                        <q-checkbox
                          dense
                          :model-value="scope.selected"
                          @update:model-value="scope.toggleOption(scope.opt)"
                        />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="ann-opt__label">{{ scope.opt.label }}</q-item-label>
                        <q-item-label v-if="scope.opt.caption" class="ann-opt__caption">
                          {{ scope.opt.caption }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="ann-dlg__no-option">
                        {{ noOptionText }}
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <!-- An empty picker used to look the same whether the company has
                   no matching employees or the request failed. -->
              <p v-if="recipientsError" class="ann-targets__error" role="alert">
                <q-icon name="o_error" size="15px" />
                <span class="ann-targets__error-text">{{ recipientsError }}</span>
                <button type="button" class="ann-people__act" @click="$emit('reload-recipients')">
                  Retry
                </button>
              </p>

              <div class="ann-narrow">
                <div class="ann-narrow__head">
                  <span class="ann-narrow__title">Narrow the list</span>
                  <span class="ann-narrow__hint">Optional — none of these are saved</span>
                  <button
                    v-if="hasContractFilters"
                    type="button"
                    class="ann-people__act"
                    @click="resetFilters"
                  >
                    Reset
                  </button>
                </div>

                <div class="ann-filters">
                  <div class="ann-field">
                    <span class="ann-field__label">Payroll group</span>
                    <q-select
                      v-model="filters.payrollGroupId"
                      :options="payrollGroupOptions"
                      :loading="loadingFilters"
                      outlined
                      dense
                      clearable
                      emit-value
                      map-options
                      hide-bottom-space
                      popup-content-class="dash-popup"
                      placeholder="Any"
                      class="dash-field"
                    />
                  </div>

                  <div class="ann-field">
                    <span class="ann-field__label">Department</span>
                    <q-select
                      v-model="filters.departmentId"
                      :options="departmentOptions"
                      :loading="loadingFilters"
                      outlined
                      dense
                      clearable
                      emit-value
                      map-options
                      hide-bottom-space
                      popup-content-class="dash-popup"
                      placeholder="Any"
                      class="dash-field"
                    />
                  </div>

                  <div class="ann-field">
                    <span class="ann-field__label">Position</span>
                    <q-select
                      v-model="filters.positionId"
                      :options="positionOptions"
                      :loading="loadingFilters"
                      outlined
                      dense
                      clearable
                      emit-value
                      map-options
                      hide-bottom-space
                      popup-content-class="dash-popup"
                      placeholder="Any"
                      class="dash-field"
                    />
                  </div>

                  <div class="ann-field">
                    <span class="ann-field__label">Pay type</span>
                    <q-select
                      v-model="filters.payType"
                      :options="payTypeOptions"
                      outlined
                      dense
                      clearable
                      emit-value
                      map-options
                      hide-bottom-space
                      popup-content-class="dash-popup"
                      placeholder="Any"
                      class="dash-field"
                    />
                  </div>
                </div>
              </div>

              <p v-if="noTargetsPicked" class="ann-targets__warn">
                <q-icon name="o_info" size="15px" />
                Pick at least one employee — otherwise nobody receives this.
              </p>
            </div>
          </div>

          <!-- ── Files ────────────────────────────────────── -->
          <div class="ann-group">
            <div class="ann-group__head">
              <span class="ann-group__title">Attachments</span>
              <span class="ann-group__hint">{{ attachmentHint }}</span>
            </div>

            <input
              ref="fileInput"
              type="file"
              multiple
              class="ann-files__input"
              @change="onFilesPicked"
            />

            <!-- Files already on the announcement. They come back as URLs, not
                 as the base64 the create payload takes, so they are listed
                 rather than re-sent. -->
            <ul v-if="existingAttachments.length" class="ann-files__list">
              <li v-for="file in existingAttachments" :key="file.url" class="ann-files__item">
                <q-icon name="o_description" size="16px" class="ann-files__icon" />
                <a :href="file.url" target="_blank" rel="noopener" class="ann-files__link">
                  {{ file.name }}
                </a>
                <span class="ann-files__note">already attached</span>
              </li>
            </ul>

            <ul v-if="localForm.attachments.length" class="ann-files__list">
              <li
                v-for="(file, index) in localForm.attachments"
                :key="`${file.name}-${index}`"
                class="ann-files__item"
              >
                <q-icon name="o_attach_file" size="16px" class="ann-files__icon" />
                <span class="ann-files__name">{{ file.name }}</span>
                <span class="ann-files__size">{{ formatBytes(file.size) }}</span>
                <q-btn
                  flat
                  dense
                  round
                  size="9px"
                  icon="close"
                  class="ann-files__drop"
                  :aria-label="`Remove ${file.name}`"
                  @click="removeAttachment(index)"
                />
              </li>
            </ul>

            <button type="button" class="ann-files__add" @click="openFilePicker">
              <q-icon name="o_attach_file" size="15px" />
              {{ localForm.attachments.length ? 'Add more files' : 'Add files' }}
            </button>
          </div>
        </q-card-section>

        <q-card-actions class="ann-dlg__foot">
          <q-btn flat no-caps label="Cancel" class="ann-dlg__cancel" @click="close" />
          <q-btn
            type="submit"
            unelevated
            no-caps
            :label="isEditing ? 'Save changes' : 'Post announcement'"
            class="ann-dlg__submit"
            :loading="saving"
            :disable="!canSave"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * Create and edit. The old version stacked three grey boxes titled
 * "Announcement Details", "Schedule" and "Targeting", each restating the field
 * names below it; here the fields carry their own labels and the two groups that
 * remain say something the field cannot — what an empty schedule means, and that
 * a targeted announcement with nothing picked reaches nobody.
 *
 * "Send to everyone" was a toggle whose off state silently revealed three more
 * selects. It is now two visible choices, so the second one is discoverable
 * before you flip anything.
 *
 * Targeting matches what the API accepts: one list of user ids. The dialog used
 * to send `target_positions` and `target_roles` as well, which the create
 * endpoint has no field for — the payroll group / department / position / pay
 * type selects now narrow the *employee list* instead (via
 * `employees-list/by-contract/`), and the people picked from it are what gets
 * saved.
 */
import { computed, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useToast } from 'src/composables/useToast'
import { fileToDataUrl } from '@/composables/page/useAnnouncements'
import { typeMeta } from './announcementStatus'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  editingAnnouncement: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  /** `{ value: userId, label, caption }` for the current filter combination. */
  recipients: { type: Array, default: () => [] },
  loadingRecipients: { type: Boolean, default: false },
  /** Set when the employee fetch failed, so an empty picker says why. */
  recipientsError: { type: String, default: '' },
  payrollGroupOptions: { type: Array, default: () => [] },
  departmentOptions: { type: Array, default: () => [] },
  positionOptions: { type: Array, default: () => [] },
  loadingFilters: { type: Boolean, default: false },
  typeSelectOptions: { type: Array, default: () => [] },
})

const emit = defineEmits([
  'update:modelValue',
  'save',
  'toggle-target-everyone',
  'recipient-filters',
  'reload-recipients',
])

const $q = useQuasar()
const toast = useToast()

// Each attachment is capped on its own rather than only in total, so one large
// file cannot use up the whole request on its own. Base64 adds about a third to
// whatever is picked, which is why the total sits well under a typical 20 MB
// body limit.
const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_TOTAL_BYTES = 12 * 1024 * 1024

const defaultForm = {
  title: '',
  message: '',
  announcement_type: 'general',
  is_active: true,
  start_at: '',
  end_at: '',
  target_everyone: true,
  target_users: [],
  attachments: [],
}

const localForm = ref({ ...defaultForm, target_users: [], attachments: [] })

// The contract filters are picker state, not announcement state — they are
// deliberately outside `localForm` so they never reach the payload.
const filters = reactive({
  payrollGroupId: null,
  departmentId: null,
  positionId: null,
  payType: null,
})

const payTypeOptions = [
  { label: 'Daily', value: 'daily' },
  { label: 'Monthly', value: 'monthly' },
]

const isEditing = computed(() => !!props.editingAnnouncement)

const headSub = computed(() =>
  isEditing.value
    ? 'Changes apply as soon as you save'
    : 'Employees see it on their dashboard and in notifications',
)

const currentTypeMark = computed(() => typeMeta(localForm.value.announcement_type).mark)

const audienceOptions = [
  {
    value: true,
    label: 'Everyone',
    sub: 'All employees in this company',
    icon: 'o_groups',
  },
  {
    value: false,
    label: 'Specific people',
    sub: 'Filter by group, then pick names',
    icon: 'o_person_search',
  },
]

const scheduleHint = computed(() => {
  const { start_at: start, end_at: end } = localForm.value
  if (!start && !end) return 'Leave both empty to run it until you switch it off'
  if (start && !end) return 'No end date — runs until you switch it off'
  if (!start && end) return 'Starts immediately'
  return ''
})

const endsBeforeStart = computed(() => {
  const { start_at: start, end_at: end } = localForm.value
  if (!start || !end) return false
  return new Date(end).getTime() <= new Date(start).getTime()
})

const noTargetsPicked = computed(
  () => !localForm.value.target_everyone && !localForm.value.target_users.length,
)

const canSave = computed(
  () =>
    !!localForm.value.title?.trim() &&
    !!localForm.value.message?.trim() &&
    !endsBeforeStart.value &&
    !noTargetsPicked.value,
)

// ── People picker ──
/**
 * Every recipient the dialog has seen, by id. The list the parent holds is
 * refetched whenever a filter changes, so without this the chips for people
 * picked under an earlier filter would fall back to printing raw ids.
 */
const knownRecipients = ref(new Map())

watch(
  () => props.recipients,
  (list) => {
    const merged = new Map(knownRecipients.value)
    for (const option of list || []) merged.set(option.value, option)
    knownRecipients.value = merged
  },
  { immediate: true, deep: true },
)

const offeredRecipients = computed(() => props.recipients || [])

const peopleTerm = ref('')

const pickerOptions = computed(() => {
  const term = peopleTerm.value.trim().toLowerCase()
  const offered = term
    ? offeredRecipients.value.filter((option) =>
        `${option.label} ${option.caption}`.toLowerCase().includes(term),
      )
    : offeredRecipients.value

  // Anything already picked stays in the list, so narrowing the filters never
  // silently drops a chip's name or lets a click un-tick something invisible.
  const shown = new Set(offered.map((option) => option.value))
  const selected = localForm.value.target_users
    .filter((id) => !shown.has(id))
    .map(
      (id) => knownRecipients.value.get(id) || { value: id, label: `Employee ${id}`, caption: '' },
    )

  return [...offered, ...selected]
})

const peopleMeta = computed(() => {
  if (props.loadingRecipients) return 'Loading employees…'
  const picked = localForm.value.target_users.length
  const available = offeredRecipients.value.length
  if (!picked) return `${available} ${available === 1 ? 'employee' : 'employees'} match`
  return `${picked} selected of ${available}`
})

const noOptionText = computed(() => {
  if (props.loadingRecipients) return 'Loading employees…'
  if (props.recipientsError) return 'Employee list unavailable'
  if (!offeredRecipients.value.length) {
    return hasContractFilters.value
      ? 'No employees match these filters'
      : 'No employees with an active contract'
  }
  return 'No employees match'
})

const filterPeople = (value, update) => {
  update(() => {
    peopleTerm.value = value || ''
  })
}

const selectAllOffered = () => {
  const merged = new Set(localForm.value.target_users)
  for (const option of offeredRecipients.value) merged.add(option.value)
  localForm.value.target_users = [...merged]
}

const clearSelection = () => {
  localForm.value.target_users = []
}

// A filter change is the parent's cue to refetch the list; the selection is left
// alone, so an admin can build one audience out of several filter passes.
watch(filters, () => {
  if (localForm.value.target_everyone) return
  emit('recipient-filters', { ...filters })
})

const hasContractFilters = computed(() =>
  Boolean(filters.payrollGroupId || filters.departmentId || filters.positionId || filters.payType),
)

const resetFilters = () => {
  filters.payrollGroupId = null
  filters.departmentId = null
  filters.positionId = null
  filters.payType = null
}

const setAudience = (everyone) => {
  if (localForm.value.target_everyone === everyone) return
  localForm.value.target_everyone = everyone
  // The parent loads the filter lists and the employee list lazily; it only
  // needs telling when the targeted branch is opened.
  emit('toggle-target-everyone', everyone)
}

// ── Attachments ──
const fileInput = ref(null)

const openFilePicker = () => fileInput.value?.click()

const attachedBytes = computed(() =>
  localForm.value.attachments.reduce((total, file) => total + file.size, 0),
)

const attachmentHint = computed(() => {
  if (!localForm.value.attachments.length) return `Up to ${formatBytes(MAX_FILE_BYTES)} per file`
  const count = localForm.value.attachments.length
  return `${count} ${count === 1 ? 'file' : 'files'} · ${formatBytes(attachedBytes.value)}`
})

/**
 * Read to `data:<mime>;base64,…` at pick time rather than on submit: the size
 * of what will actually be sent is knowable here, and a rejected file is
 * reported while the person still has the picker in mind.
 */
const onFilesPicked = async (event) => {
  const picked = [...(event.target.files || [])]
  event.target.value = ''
  if (!picked.length) return

  let running = attachedBytes.value
  for (const file of picked) {
    if (file.size > MAX_FILE_BYTES) {
      toast.warning(`${file.name} is larger than ${formatBytes(MAX_FILE_BYTES)}`)
      continue
    }
    if (running + file.size > MAX_TOTAL_BYTES) {
      toast.warning(`Attachments cannot exceed ${formatBytes(MAX_TOTAL_BYTES)} in total`)
      break
    }
    try {
      const data = await fileToDataUrl(file)
      localForm.value.attachments.push({
        name: file.name,
        size: file.size,
        type: file.type,
        data,
      })
      running += file.size
    } catch (error) {
      console.error('[AnnouncementEditDialog] could not read attachment:', error)
      toast.error(`Could not read ${file.name}`)
    }
  }
}

const removeAttachment = (index) => {
  localForm.value.attachments.splice(index, 1)
}

/**
 * Files already saved on the announcement. The list endpoint returns them as
 * URLs (or objects wrapping one), which cannot be fed back into the base64
 * `attachments` field, so they are shown read-only.
 */
const existingAttachments = computed(() => {
  const list = props.editingAnnouncement?.attachments
  if (!Array.isArray(list)) return []
  return list
    .map((item) => {
      const url = typeof item === 'string' ? item : item?.file || item?.url || item?.attachment
      if (!url || typeof url !== 'string') return null
      const name = (typeof item === 'object' && (item?.name || item?.filename)) || fileNameOf(url)
      return { url, name }
    })
    .filter(Boolean)
})

function fileNameOf(url) {
  const path = String(url).split('?')[0]
  return decodeURIComponent(path.slice(path.lastIndexOf('/') + 1)) || 'Attachment'
}

function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const close = () => emit('update:modelValue', false)

const onSave = () => {
  if (!canSave.value) return
  emit('save', {
    ...localForm.value,
    target_users: [...localForm.value.target_users],
    // The payload wants the data URIs alone; name and size are dialog-side.
    attachments: localForm.value.attachments.map((file) => file.data),
  })
}

/**
 * `datetime-local` needs `YYYY-MM-DDTHH:mm` in local time. The API returns an
 * ISO string in UTC, which the old dialog fed straight into the input; the
 * browser rejects the trailing `Z` and renders an empty field, so editing a
 * scheduled announcement would have opened with both dates blank and saving
 * would have cleared its schedule. Latent until now — nothing on the page could
 * open this dialog in edit mode.
 */
function toLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/** `target_users` may arrive as ids or as nested user objects. */
function idOf(value) {
  if (value && typeof value === 'object') return value.id ?? value.user_id ?? value.value
  return value
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    peopleTerm.value = ''
    resetFilters()
    const editing = props.editingAnnouncement
    if (!editing) {
      localForm.value = { ...defaultForm, target_users: [], attachments: [] }
      return
    }
    localForm.value = {
      title: editing.title || '',
      message: editing.message || '',
      announcement_type: editing.announcement_type || 'general',
      is_active: editing.is_active ?? true,
      start_at: toLocalInput(editing.start_at),
      end_at: toLocalInput(editing.end_at),
      target_everyone: editing.target_everyone ?? true,
      target_users: (editing.target_users || []).map(idOf).filter((id) => id != null),
      attachments: [],
    }
    // Reopening on a targeted announcement needs the employee list to render
    // its existing chips as names rather than raw ids.
    if (!localForm.value.target_everyone) emit('toggle-target-everyone', false)
  },
)
</script>

<style scoped>
.ann-dlg {
  width: 560px;
  max-width: 95vw;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  border-radius: var(--dash-r-lg);
  overflow: hidden;
}

/* ── Head ── */
.ann-dlg__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 18px;
  background: var(--dash-brand);
  flex-shrink: 0;
}
.ann-dlg__head-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}
.ann-dlg__head-titles {
  flex: 1;
  min-width: 0;
}
.ann-dlg__head-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.3;
}
/* The old subtitle was #6b7280 on the navy bar — grey text on a dark ground it
   could not carry. */
.ann-dlg__head-sub {
  margin-top: 1px;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.78);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ann-dlg__head :deep(.q-btn) {
  color: rgba(255, 255, 255, 0.8);
  flex: none;
}
.ann-dlg__head :deep(.q-btn:hover) {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.15);
}

/* ── Body ── */
/* The form is a flex child of the card, between it and the scrolling body. With
   no styling of its own it sized to its content, so the body never received a
   bounded height, `overflow-y: auto` below never engaged, and the card's
   `overflow: hidden` simply clipped everything past 92vh — the fields at the
   bottom could not be reached at all. It has to be a bounded flex column that
   clips, so the body inside it is the thing that scrolls. */
.ann-dlg__form {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.ann-dlg__body {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 18px;
  /* `min-height: 0` is what lets a flex child shrink below its content height —
     without it the auto minimum keeps the body at full height and nothing
     scrolls. */
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  background: var(--dash-surface);
  /* Scrollbar hidden by request. Scrolling itself is untouched — wheel,
     trackpad, touch, and Page Up/Down or arrows once the body has focus all
     still work; only the indicator is gone. The pinned footer is what tells a
     reader the panel above it continues. */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* legacy Edge */
}
.ann-dlg__body::-webkit-scrollbar {
  /* Chrome, Safari, current Edge */
  width: 0;
  height: 0;
}

.ann-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}
.ann-field__label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-2);
}
.ann-field :deep(.q-field__control) {
  min-height: 38px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.ann-field :deep(.q-field__native),
.ann-field :deep(textarea) {
  font-size: 13px;
  color: var(--dash-ink);
}
.ann-field :deep(.q-field__marginal) {
  color: var(--dash-ink-4);
}
.ann-field__area :deep(.q-field__control) {
  padding: 6px 12px;
}

.ann-row2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.ann-type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* Boxed to match the height of the select beside it, so the pair reads as one
   row rather than a control next to loose text. */
.ann-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 10px;
  border: 1px solid var(--dash-line-strong);
  border-radius: var(--dash-r-md);
}
.ann-switch__toggle :deep(.q-toggle__track) {
  background: var(--dash-n-300);
  opacity: 1;
}
.ann-switch__toggle.q-toggle--truthy :deep(.q-toggle__track) {
  background: var(--dash-brand);
  opacity: 1;
}
.ann-switch__toggle.q-toggle--truthy :deep(.q-toggle__thumb:after) {
  background: #ffffff;
}
.ann-switch__text {
  font-size: 12.5px;
  color: var(--dash-ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Groups ── */
.ann-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--dash-line);
}
.ann-group__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.ann-group__title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dash-ink);
}
.ann-group__hint {
  font-size: 11.5px;
  color: var(--dash-ink-4);
}

/* ── Audience picker ── */
.ann-audience {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.ann-audience__opt {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 11px;
  text-align: left;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  color: var(--dash-ink-3);
  cursor: pointer;
  transition:
    border-color var(--dash-fast) var(--dash-ease),
    background var(--dash-fast) var(--dash-ease);
}
.ann-audience__opt:hover {
  border-color: var(--dash-line-strong);
}
.ann-audience__opt.is-on {
  border-color: var(--dash-accent);
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
}
.ann-audience__opt:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--dash-accent-ring);
}
.ann-audience__opt-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.ann-audience__opt-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dash-ink);
}
.ann-audience__opt.is-on .ann-audience__opt-label {
  color: var(--dash-accent);
}
.ann-audience__opt-sub {
  font-size: 11px;
  color: var(--dash-ink-4);
  overflow: hidden;
  text-overflow: ellipsis;
}

.ann-targets {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: var(--dash-sunken);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
}
.ann-targets :deep(.q-field__control) {
  background: var(--dash-surface);
}
.ann-targets__warn {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--dash-warn);
}

/* ── Narrowing block ──
   Boxed and titled so it reads as a helper for the picker above it rather than
   as three more targeting fields. */
.ann-narrow {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding-top: 11px;
  border-top: 1px solid var(--dash-line);
}
.ann-narrow__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.ann-narrow__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--dash-ink-2);
}
.ann-narrow__hint {
  font-size: 11px;
  color: var(--dash-ink-4);
}
.ann-narrow__head .ann-people__act {
  margin-left: auto;
}

.ann-targets__error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 8px 10px;
  background: var(--dash-critical-bg);
  border: 1px solid var(--dash-critical-line);
  border-radius: var(--dash-r-md);
  font-size: 11.5px;
  color: var(--dash-critical);
}
.ann-targets__error-text {
  flex: 1;
  min-width: 0;
}
.ann-targets__error .ann-people__act {
  color: var(--dash-critical);
  font-weight: 600;
}

/* ── Contract filters ──
   Two by two: four selects on one line would each be under 120px inside a
   560px dialog once the sunken panel takes its padding. */
.ann-filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.ann-filters :deep(.q-field__native),
.ann-filters :deep(.q-field__input) {
  font-size: 12.5px;
}

/* ── People picker ── */
.ann-people__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 5px;
}
.ann-people__meta {
  font-size: 11.5px;
  color: var(--dash-ink-4);
  font-variant-numeric: tabular-nums;
}
/* The two bulk actions sit at the end of the label row rather than under the
   field: they belong to the list, not to the value. */
.ann-people__act {
  padding: 0;
  margin-left: auto;
  background: none;
  border: 0;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dash-accent);
  cursor: pointer;
}
.ann-people__act + .ann-people__act {
  margin-left: 0;
  padding-left: 8px;
  border-left: 1px solid var(--dash-line);
}
.ann-people__act:hover:not(:disabled) {
  text-decoration: underline;
}
.ann-people__act:disabled {
  color: var(--dash-ink-4);
  cursor: default;
}
.ann-people__act:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--dash-accent-ring);
  border-radius: 3px;
}

.ann-opt__label {
  font-size: 13px;
  color: var(--dash-ink);
  line-height: 1.3;
}
/* Position · department · pay type, so two people with the same name are
   distinguishable in the list. */
.ann-opt__caption {
  font-size: 11px;
  color: var(--dash-ink-4);
  line-height: 1.35;
}

/* ── Attachments ── */
.ann-files__input {
  display: none;
}

.ann-files__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ann-files__item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 7px 8px 7px 10px;
  background: var(--dash-sunken);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
}
.ann-files__icon {
  color: var(--dash-ink-4);
  flex: none;
}
.ann-files__name,
.ann-files__link {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ann-files__link {
  color: var(--dash-accent);
  text-decoration: none;
}
.ann-files__link:hover {
  text-decoration: underline;
}
.ann-files__size,
.ann-files__note {
  flex: none;
  font-size: 11.5px;
  color: var(--dash-ink-4);
  font-variant-numeric: tabular-nums;
}
.ann-files__drop {
  flex: none;
  color: var(--dash-ink-4);
}
.ann-files__drop:hover {
  color: var(--dash-critical);
}

.ann-files__add {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  align-self: flex-start;
  height: 32px;
  padding: 0 12px;
  background: var(--dash-surface);
  border: 1px dashed var(--dash-line-strong);
  border-radius: var(--dash-r-md);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-2);
  cursor: pointer;
  transition:
    border-color var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease);
}
.ann-files__add:hover {
  border-color: var(--dash-accent);
  color: var(--dash-accent);
}
.ann-files__add:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--dash-accent-ring);
}

.ann-dlg__no-option {
  font-size: 13px;
  color: var(--dash-ink-3);
}

/* ── Foot ── */
.ann-dlg__foot :deep(.q-btn + .q-btn) {
  /* Quasar spaces sibling buttons itself; the footer's own flex gap is the only
     spacing this wants. */
  margin-left: 0;
}
.ann-dlg__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  background: var(--dash-n-25);
  border-top: 1px solid var(--dash-line);
  flex-shrink: 0;
}
.ann-dlg__cancel {
  height: 36px;
  padding: 0 14px;
  border-radius: var(--dash-r-md);
  color: var(--dash-ink-2);
  font-size: 13px;
  font-weight: 500;
}
.ann-dlg__cancel:hover {
  background: var(--dash-n-100);
}
.ann-dlg__submit {
  height: 36px;
  padding: 0 16px;
  border-radius: var(--dash-r-md);
  background: var(--dash-brand);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
}
.ann-dlg__submit:hover {
  background: #193d5c;
}

/* Tablet: the paired rows stack rather than halving to 130px each. */
@media (max-width: 767px) {
  .ann-row2,
  .ann-audience,
  .ann-filters {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 599px) {
  .ann-dlg {
    width: 100%;
    height: 100%;
    max-height: 100%;
    border-radius: 0;
  }
  .ann-dlg__foot {
    flex-direction: column-reverse;
  }
  .ann-dlg__foot .q-btn {
    width: 100%;
    margin: 0;
  }
}
</style>
