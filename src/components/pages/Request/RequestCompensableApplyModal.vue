<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="work_history" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Apply compensable time</div>
            <div class="dash-modal__sub">File compensable time on someone's behalf</div>
          </div>
        </div>
        <q-btn
          icon="close"
          flat
          round
          dense
          aria-label="Close"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <div class="form-section">
          <div class="dash-modal__section-title">Request details</div>
          <div class="dash-modal__grid">
            <label class="dash-modal__field dash-modal__span-2">
              <span class="dash-modal__field-label"
                >Employees<span class="dash-modal__req">*</span></span
              >
              <q-select
                outlined
                :model-value="form.employee_ids"
                @update:model-value="form.employee_ids = $event"
                :options="employeeOptions"
                use-input
                use-chips
                multiple
                @filter="onFilter"
                :rules="[(val) => (val && val.length > 0) || 'At least one employee is required']"
                class="dash-field dash-modal__span-2"
                :input-debounce="0"
                option-value="id"
                option-label="name"
                emit-value
                map-options
                dense
                hide-bottom-space
                popup-content-class="dash-popup dash-popup--modal"
              >
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey-6"> No employees found </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </label>

            <!--
              Category then Subcategory, rather than one flat list of every
              subcategory in the company. The subcategories are only reachable per
              category, so a single dropdown would mean a request per category on
              every open; the pair asks for two and teaches the model the admin is
              already configuring in Admin Settings.
            -->
            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Category<span class="dash-modal__req">*</span></span
              >
              <q-select
                outlined
                :model-value="form.category"
                @update:model-value="setCategory"
                :options="categoryOptions"
                option-value="id"
                option-label="name"
                emit-value
                map-options
                :rules="[(val) => !!val || 'Category is required']"
                class="dash-field"
                dense
                hide-bottom-space
                popup-content-class="dash-popup dash-popup--modal"
              >
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey-6"> No categories found </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </label>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Subcategory<span class="dash-modal__req">*</span></span
              >
              <q-select
                outlined
                :model-value="form.sub_category"
                @update:model-value="form.sub_category = $event"
                :options="subcategoryOptions"
                :disable="!form.category || !subcategories.length"
                option-value="id"
                option-label="name"
                emit-value
                map-options
                :rules="[(val) => !!val || 'Subcategory is required']"
                class="dash-field"
                dense
                hide-bottom-space
                popup-content-class="dash-popup dash-popup--modal"
              >
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey-6">
                      {{
                        !form.category
                          ? 'Choose a category first'
                          : subcategories.length
                            ? 'No subcategories found'
                            : 'This category has no active subcategories'
                      }}
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </label>

            <label class="dash-modal__field dash-modal__span-2">
              <span class="dash-modal__field-label">Notes</span>
              <q-input
                outlined
                :model-value="form.notes"
                @update:model-value="form.notes = $event"
                type="textarea"
                rows="2"
                class="dash-field"
                dense
                hide-bottom-space
              />
            </label>
          </div>
        </div>

        <!--
          The dates the request books, one entry each.

          Picked on a calendar in **multiple** mode: compensable time is usually a
          handful of scattered days — a rest day worked, a holiday worked — so
          clicking them off a month beats typing an ISO day one at a time, and a
          start/end pair would be actively wrong, since expanding one files every
          day in between.

          The calendar stays in a popup, so it floats over the list beneath it
          while open. That is deliberate: the field carries the count and the list
          is where the per-day detail lives, so the calendar is a picker and
          nothing else — closing it by clicking outside is always safe, because
          every day it picked is already in the list behind it.
        -->
        <div class="form-section">
          <div class="dash-modal__section-title">Dates</div>

          <div class="ct-add-row">
            <q-input
              :model-value="dateFieldLabel"
              readonly
              outlined
              dense
              placeholder="Select dates"
              :error="Boolean(dateError)"
              hide-bottom-space
              class="dash-field ct-add-field"
            >
              <template v-slot:append>
                <q-icon name="o_event" size="18px" class="cursor-pointer">
                  <q-popup-proxy
                    transition-show="scale"
                    transition-hide="scale"
                    popup-content-class="dash-popup"
                  >
                    <q-date v-model="selectedDates" multiple mask="YYYY-MM-DD" />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>
          <div v-if="dateError" class="ct-error">{{ dateError }}</div>

          <div v-if="!dateRows.length" class="day-list__empty">
            Pick the dates this time was worked. Each one becomes its own entry.
          </div>

          <div v-else class="day-list ct-day-list">
            <div v-for="row in dateRows" :key="row.date" class="day-list__row ct-day-row">
              <div class="day-list__date">
                <q-icon name="event" size="16px" class="day-list__date-icon" />
                <span>{{ longLabel(row.date) }}</span>
              </div>

              <DayPartToggle
                :model-value="dayPartOf(row)"
                :options="DAY_PART_OPTIONS"
                @update:model-value="setDayPart(row.date, $event)"
                :aria-label="'Day part for ' + row.date"
              />

              <!--
                The excess field is hidden on a plain Full/Half row rather than
                sitting there reading "excess 0" on every date. An Excess-only row
                always shows it (it has no base, so the hours are the whole entry);
                a Full/Half row reveals it on demand, which is what keeps
                "full day + excess" and "half day + excess" reachable without the
                dead field.
              -->
              <q-btn
                v-if="!excessVisible(row)"
                flat
                dense
                no-caps
                class="ct-excess-add"
                label="+ excess"
                :aria-label="'Add excess hours on ' + row.date"
                @click="revealExcess(row.date)"
              />

              <q-input
                v-else
                :model-value="row.excess_hours"
                @update:model-value="setExcessHours(row.date, $event)"
                type="number"
                step="0.25"
                min="0"
                dense
                outlined
                hide-bottom-space
                :error="excessHoursMissing(row)"
                class="ct-hours"
                :aria-label="'Excess hours on ' + row.date"
              >
                <template #prepend>
                  <span class="ct-hours__label">excess</span>
                </template>
              </q-input>

              <q-btn
                flat
                dense
                round
                icon="close"
                size="sm"
                class="ct-remove"
                :aria-label="'Remove ' + row.date"
                @click="removeDate(row.date)"
              >
                <q-tooltip>Remove this date</q-tooltip>
              </q-btn>
            </div>
          </div>
          <div v-if="excessHoursError" class="ct-error ct-error--below-list">
            {{ excessHoursError }}
          </div>
        </div>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn
          flat
          label="Cancel"
          class="dash-modal__cancel"
          @click="$emit('update:modelValue', false)"
        />
        <q-btn
          unelevated
          label="File request"
          class="dash-modal__submit"
          :loading="submitting"
          :disable="!canSubmit"
          @click="onSubmit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * Files a compensable time application on one or more employees' behalf.
 *
 * Dumb by design, like the other apply dialogs on this page: it holds the draft,
 * collects it, and hands it upward. The page owns the roster, the categories and
 * the write — which is why asking for a category's subcategories travels out as
 * `select-category` and the answer comes back as a prop, the same round trip
 * `filter-employees` has always made.
 *
 * The form opens empty every time. The dialog is reused for each request and
 * nothing cleared the draft between visits, so a second application would arrive
 * pre-filled with the first one's employees and dates — and a mistaken submit
 * books a duplicate against real people.
 */
import { reactive, computed, ref, watch } from 'vue'
import { longLabel } from 'src/composables/utils/calendarDate'
import DayPartToggle from './DayPartToggle.vue'
import { MAX_COMPENSABLE_DATES, compensableDateEntry } from 'src/composables/utils/compensableTime'

const props = defineProps({
  modelValue: Boolean,
  // Option value is the employee's uuid, which is what the body wants — not the
  // roster's own pk. The page builds these.
  employeeOptions: { type: Array, default: () => [] },
  // Normalized and already filtered to the active rows.
  categories: { type: Array, default: () => [] },
  subcategories: { type: Array, default: () => [] },
  submitting: Boolean,
})

const emit = defineEmits(['update:modelValue', 'submit', 'filter-employees', 'select-category'])

const emptyForm = () => ({
  employee_ids: [],
  category: null,
  sub_category: null,
  notes: '',
})

const form = reactive(emptyForm())

/**
 * The days ticked on the calendar — the calendar's own model, and the only
 * record of *which* days the request books.
 */
const selectedDates = ref([])
const dateError = ref('')

/**
 * The half-day flag and excess hours for each picked day, keyed by ISO date.
 *
 * This is the whole point of the control being a map and not a field on each row:
 * an earlier version kept both in one array and rebuilt that array from the
 * calendar's bare date strings on every selection change, so a half day or a
 * typed hours figure survived only while an object-identity lookup against the
 * previous list happened to hit — and ticking one more day quietly returned the
 * others to full days with no hours.
 *
 * Here the detail is never reconstructed. A selection change only *prunes* keys
 * for days that were unticked and *seeds* keys for days newly picked, so
 * anything the admin entered is untouched by whatever they do next.
 */
const dayDetail = reactive({})

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    Object.assign(form, emptyForm())
    selectedDates.value = []
    for (const date of Object.keys(dayDetail)) delete dayDetail[date]
    dateError.value = ''
    // Clears the subcategories left over from the last category, so reopening the
    // dialog does not offer types belonging to a category nothing has chosen yet.
    emit('select-category', null)
  },
)

const categoryOptions = computed(() =>
  props.categories.map((row) => ({ id: row.id, name: row.name })),
)

const subcategoryOptions = computed(() =>
  props.subcategories.map((row) => ({ id: row.id, name: row.name })),
)

/**
 * The rows the list renders and the payload is built from.
 *
 * Derived rather than stored, so a day cannot appear in one and not the other.
 * Sorted chronologically: an admin ticking days off a month reads a chronology,
 * and a quarter of the payroll year reads better in order than in click order.
 */
const dateRows = computed(() =>
  [...selectedDates.value].sort().map((date) => ({
    date,
    is_half_day: dayDetail[date]?.is_half_day === true,
    is_excess_only: dayDetail[date]?.is_excess_only === true,
    excess_hours: dayDetail[date]?.excess_hours ?? 0,
  })),
)

/** What the read-only field says. The days themselves are the list's to show. */
const dateFieldLabel = computed(() => {
  const count = dateRows.value.length
  if (!count) return ''
  return `${count} date${count === 1 ? '' : 's'} selected`
})

/**
 * A category change invalidates the subcategory that went with the old one — a
 * subcategory belongs to exactly one category, so keeping it would file the
 * request under a type the admin is no longer looking at.
 */
const setCategory = (value) => {
  form.category = value
  form.sub_category = null
  emit('select-category', value)
}

/**
 * Prune and seed. Deliberately never rewrites a day that is still selected.
 */
watch(selectedDates, (next) => {
  // Over the cap: revert the selection rather than trim it. Silently dropping
  // days somebody just clicked is worse than refusing the one that broke it.
  if (next.length > MAX_COMPENSABLE_DATES) {
    dateError.value = `A request cannot carry more than ${MAX_COMPENSABLE_DATES} dates.`
    selectedDates.value = [...selectedDates.value].slice(0, -1)
    return
  }
  dateError.value = ''

  const picked = new Set(next)
  for (const date of Object.keys(dayDetail)) {
    if (!picked.has(date)) delete dayDetail[date]
  }
  for (const date of next) {
    // Seeded from the shared builder so "a day nobody has filled in yet" is one
    // shape, defined once beside the payload it turns into.
    if (!dayDetail[date]) dayDetail[date] = compensableDateEntry(date)
  }
})

/**
 * The three states a compensable date can be in, in fixed order.
 *
 * The `excess` segment is specific to this dialog: the endpoint books a day that
 * is **only** extra hours — a rest day, say — and neither `is_half_day` nor
 * `excess_hours` alone can say "no base". The leave dialog keeps the default
 * Full/Half pair, so this list is passed in rather than baked into the control.
 */
const DAY_PART_OPTIONS = [
  { value: 'full', label: 'Full' },
  { value: 'half', label: 'Half' },
  { value: 'excess', label: 'Excess' },
]

/** The day-part the control shows, read off the row's two flags. */
const dayPartOf = (row) => (row.is_excess_only ? 'excess' : row.is_half_day ? 'half' : 'full')

/**
 * Whether the row shows the excess-hours field.
 *
 * An Excess-only row always does — the hours are the whole entry. A Full/Half row
 * does only once the admin has revealed it, so a plain full day is not cluttered
 * with a field reading zero. `excess_revealed` is transient UI state on
 * `dayDetail`, keyed by date like the flags beside it, and is deliberately never
 * part of `dateRows` or the payload.
 */
const excessVisible = (row) => row.is_excess_only || dayDetail[row.date]?.excess_revealed === true

const revealExcess = (date) => {
  if (dayDetail[date]) dayDetail[date].excess_revealed = true
}

/**
 * Keyed by date, never by position — a removal or a reorder cannot misfile it.
 *
 * `is_half_day` and `is_excess_only` are the two halves of one decision, so they
 * are written together: "excess" clears the half flag and "half" clears the
 * excess flag, and neither can be left set from a previous choice.
 */
const setDayPart = (date, value) => {
  const detail = dayDetail[date]
  if (!detail) return
  detail.is_half_day = value === 'half'
  detail.is_excess_only = value === 'excess'
}

const setExcessHours = (date, value) => {
  if (dayDetail[date]) dayDetail[date].excess_hours = value
}

/**
 * An excess-only day with no hours recorded is a day that contributes nothing —
 * the base is already dropped, so there is literally no time left to credit. It
 * is blocked rather than filed as a no-op against a real employee.
 */
const excessHoursMissing = (row) => row.is_excess_only && !(Number(row.excess_hours) > 0)

const excessHoursError = computed(() =>
  dateRows.value.some(excessHoursMissing) ? 'Excess-only dates need hours recorded.' : '',
)

/**
 * Removing a row also unticks it on the calendar.
 *
 * One source, not two: the row's close button and the calendar's own tick must
 * agree, or reopening the picker shows a day as selected that the list has
 * dropped. The detail for that day is pruned by the watcher above.
 */
const removeDate = (date) => {
  selectedDates.value = selectedDates.value.filter((picked) => picked !== date)
}

const canSubmit = computed(
  () =>
    form.employee_ids.length > 0 &&
    form.category != null &&
    form.sub_category != null &&
    dateRows.value.length > 0 &&
    !excessHoursError.value &&
    !props.submitting,
)

const onFilter = (val, update) => {
  emit('filter-employees', val)
  update(() => {})
}

const onSubmit = () => {
  if (!canSubmit.value) return
  emit('submit', {
    employeeIds: [...form.employee_ids],
    subCategory: form.sub_category,
    // Snapshotted out of the computed: the page builds the payload
    // asynchronously, and a list that can still change underneath it would send
    // something other than what the admin saw.
    dates: dateRows.value.map((row) => ({ ...row })),
    notes: form.notes || '',
  })
}
</script>

<style scoped src="./requestModal.css"></style>

<style scoped>
/* ===== The date list =====
   `day-list` and `day-list__row` come from requestModal.css and carry the rail,
   the dividers and the scroll box; only the three extra controls on each row are
   compensable-time specific, so they live here. */
.ct-add-row {
  display: flex;
  align-items: center;
  gap: 8px;
  /* The field and the list are two things the admin reads separately, so they
     get room between them rather than butting together like one control. */
  margin-bottom: 12px;
}
.ct-add-field {
  max-width: 220px;
}
.ct-error {
  margin-top: -4px;
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--dash-critical);
}
/* The date list carries no bottom margin of its own, so the error beneath it needs
   its own separation — the base rule's -4px is tuned to follow `.ct-add-row`,
   which already ends in 12px. */
.ct-error--below-list {
  margin-top: 8px;
}
/* The header is kept, not hidden. It is Quasar's `q-date` chrome that every other
   date picker in the app already wears — the dashboard, attendance, card taps and
   Manning all show it — and it reads the brand navy from `--q-primary`, which
   `dashboard.scss` re-points at `--dash-brand` for `.q-date`. Hiding it here made
   the one multi-select picker in the app the only one that looked like a bare grid.
   In `multiple` mode it echoes the selection: one day prints "Thu, Oct 15", several
   print the span and "N Days", and none print a pair of dashes. The list beneath is
   still where the per-day detail lives; the header just names the pick. */
/* The date, the day-part control, and — on an Excess row or one the admin
   revealed — the hours field: more than the leave list's single control, so the
   row stops stretching to its content and lays them out instead. */
.ct-day-row {
  gap: 10px;
}
.ct-hours {
  /* Bounded rather than elastic: the figure is rarely more than two digits
     ("2", "0.25"), so a wide field just pushes the toggle and the remove button
     around. */
  width: 96px;
  flex-shrink: 0;
}
.ct-hours :deep(.q-field__control) {
  height: 30px;
  min-height: 30px;
  padding: 0 8px;
  border-radius: var(--dash-r-sm);
  background: var(--dash-surface);
}
.ct-hours :deep(.q-field__prepend) {
  padding-right: 4px;
}
/* Kept to the word alone: the label says what the figure is, and the unit is
   hours by the field's step and the hint it carries. */
.ct-hours__label {
  font-size: 11px;
  color: var(--dash-ink-4);
}
.ct-hours :deep(.q-field__native) {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  font-variant-numeric: tabular-nums;
}
/* The reveal affordance that stands in for the hours field on a Full/Half row.
   Sized and placed where the field will appear, so clicking it does not shift the
   rest of the row. Muted by default — it is an offer, not the primary action. */
.ct-excess-add {
  min-height: 30px;
  padding: 0 10px;
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-4);
  border-radius: var(--dash-r-sm);
}
.ct-excess-add:hover {
  background: var(--dash-n-100);
  color: var(--dash-ink-2);
}
.ct-remove {
  width: 26px;
  height: 26px;
  min-width: 26px;
  min-height: 26px;
  flex-shrink: 0;
  color: var(--dash-ink-4);
}
.ct-remove:hover {
  background: var(--dash-critical-bg);
  color: var(--dash-critical);
}

@media (max-width: 599px) {
  .ct-add-row {
    flex-wrap: wrap;
  }
  .ct-add-field {
    max-width: none;
  }
  /* A third segment in the day-part control plus the hours field and the remove
     button no longer fit one line, so the row wraps rather than overflowing. */
  .ct-day-row {
    flex-wrap: wrap;
  }
  .ct-hours {
    width: 84px;
  }
}
</style>
