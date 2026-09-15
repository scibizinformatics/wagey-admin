<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @show="resetForm"
  >
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="o_contactless" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">{{ title }}</div>
            <div class="dash-modal__sub">{{ subtitle }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <!-- ── The card ──────────────────────────────────────────────────────
             Typed when the dialog was opened from the toolbar, fixed when it
             was opened from a row. Both paths end at the same PATCH, so this is
             one dialog with one field switched out rather than two dialogs that
             would drift apart. -->
        <label v-if="!uidLocked" class="dash-modal__field">
          <span class="dash-modal__field-label">
            Card UID<span class="dash-modal__req">*</span>
          </span>
          <q-input
            v-model="uid"
            outlined
            dense
            hide-bottom-space
            autofocus
            placeholder="e.g. 04 2163 019F 0403"
            class="dash-field acc-uid-input"
            :error="Boolean(lookupError)"
            :error-message="lookupError"
            @keydown.enter.prevent="requestLookup"
          >
            <template v-slot:prepend><q-icon name="o_contactless" size="18px" /></template>
            <template v-slot:append>
              <q-btn
                flat
                dense
                no-caps
                size="12px"
                label="Find card"
                class="acc-uid-find"
                :loading="lookupLoading"
                :disable="!cleanUid"
                @click="requestLookup"
              />
            </template>
          </q-input>
          <span class="dash-modal__field-hint">
            The number printed on the card, or the one it reported the first time it was tapped.
            Spaces, dashes and colons are ignored.
          </span>
        </label>

        <!-- Where the card stands now, so the change about to be made reads as a
             change rather than as a form filled from nothing. -->
        <div v-if="card" class="acc-now">
          <div v-if="!uidLocked" class="acc-now__row">
            <span class="acc-now__label">Card</span>
            <span class="acc-now__value dash-num">{{ formatUid(card.uid) }}</span>
          </div>
          <div class="acc-now__row">
            <span class="acc-now__label">Currently</span>
            <span v-if="card.assigned" class="acc-now__value">{{ card.employeeName }}</span>
            <span v-else class="acc-now__value acc-now__value--free">Not yet assigned</span>
          </div>
          <div class="acc-now__row">
            <span class="acc-now__label">Status</span>
            <span class="dash-chip" :class="chipClass(card.status?.tone)">
              <span class="dash-chip__dot" />
              {{ card.status?.label || '—' }}
            </span>
          </div>
          <div class="acc-now__row">
            <span class="acc-now__label">Last tap</span>
            <span class="acc-now__value acc-now__value--quiet">
              {{ card.lastTapDay ? `${card.lastTapDay} · ${card.lastTapTime}` : 'Never tapped' }}
            </span>
          </div>
        </div>

        <!-- A card belonging to somewhere else is readable by uid but must not
             be writable from here — the workspace switcher is the only thing
             that decides whose people this page hands credentials to. -->
        <div v-if="card?.foreign" class="acc-block" role="alert">
          <q-icon name="o_warning" size="16px" />
          <span>
            This card is registered to another company. Switch workspace to change who holds it.
          </span>
        </div>

        <!-- Until a card is in hand there is nothing to assign it to, so the two
             fields below are held closed rather than offered and then rejected
             on submit. -->
        <div v-if="!card && !uidLocked" class="acc-hint">
          <q-icon name="o_search" size="16px" />
          <span>
            Enter a card's UID and choose <strong>Find card</strong> to see who holds it now.
          </span>
        </div>

        <template v-if="card">
          <label class="dash-modal__field">
            <span class="dash-modal__field-label">
              Employee<span class="dash-modal__req">*</span>
            </span>
            <q-select
              v-model="employeeId"
              :options="visibleEmployees"
              option-value="value"
              option-label="label"
              emit-value
              map-options
              outlined
              dense
              use-input
              fill-input
              hide-selected
              input-debounce="200"
              hide-bottom-space
              :loading="loadingEmployees"
              :disable="card.foreign"
              class="dash-field"
              popup-content-class="dash-popup dash-popup--modal"
              @filter="onEmployeeFilter"
            >
              <template v-slot:prepend><q-icon name="o_person" size="18px" /></template>

              <!-- The face travels with the name here for the same reason it
                   does in the table: a company with two Marias is picked apart
                   by the photograph, not by the spelling. -->
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section avatar>
                    <q-avatar v-if="scope.opt.pictureUrl" size="26px">
                      <img :src="scope.opt.pictureUrl" :alt="scope.opt.label" />
                    </q-avatar>
                    <q-avatar v-else size="26px" :style="{ background: scope.opt.color }">
                      <span class="acc-opt__initials">{{ scope.opt.initials }}</span>
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ scope.opt.label }}</q-item-label>
                    <q-item-label v-if="scope.opt.caption" caption>
                      {{ scope.opt.caption }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </template>

              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey">
                    {{ loadingEmployees ? 'Loading employees…' : 'No employee matches that' }}
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
            <span class="dash-modal__field-hint">
              Whoever holds this card. Taps recorded by a reader are credited to them.
            </span>
          </label>

          <label class="dash-modal__field">
            <span class="dash-modal__field-label">Status</span>
            <q-select
              v-model="status"
              :options="STATUS_CHOICES"
              option-value="value"
              option-label="label"
              emit-value
              map-options
              outlined
              dense
              options-dense
              hide-bottom-space
              :disable="card.foreign"
              class="dash-field"
              popup-content-class="dash-popup dash-popup--modal"
            >
              <template v-slot:prepend>
                <q-icon :name="status === 'active' ? 'o_lock_open' : 'o_lock'" size="18px" />
              </template>
            </q-select>
            <span class="dash-modal__field-hint">{{ statusHint }}</span>
          </label>

          <!-- Said out loud because the endpoint's shape is not obvious from the
               form: this one request carries both fields, so leaving the status
               alone still writes the value shown above it. -->
          <p class="acc-note">
            <q-icon name="o_info" size="15px" />
            <span>
              The holder and the status are saved together in one change. Whatever is selected above
              is what the card will have when you save.
            </span>
          </p>
        </template>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" v-close-popup />
        <q-btn
          :label="submitLabel"
          no-caps
          class="dash-modal__submit"
          :loading="saving"
          :disable="!canSubmit"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * Who holds one NFC card, and whether it works.
 *
 * Two ways in, one dialog. A row's Assign button opens it with the card already
 * fixed; the toolbar's button opens it with a UID field, for a card you are
 * holding rather than one already on the list — a new card, or one that has been
 * tapped but not yet found on screen. They are the same dialog because they end
 * at the same PATCH: splitting them would be two forms to keep in step for one
 * request.
 *
 * Both halves of that request travel together — see `useAccessCards`'s module
 * header — so this always sends the employee and the status, seeding the status
 * from the card's current value. That is why there is no separate "activate"
 * control anywhere on the page: activating a card and handing it to somebody
 * are the same write, and two controls for one request would let a reader make
 * half a change.
 *
 * The UID path deliberately will not submit until a lookup has answered. The
 * API has no route that creates a card — one registers itself the first time it
 * is tapped on a reader — so a UID nobody has ever seen would PATCH into a 404,
 * and saying so before the round trip is more use than reporting it after.
 */
import { computed, ref, watch } from 'vue'
import { chipClass, formatUid, normalizeUidInput } from 'src/composables/utils/accessCards'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /**
   * The card being changed. Fixed for the row path; null for the UID path until
   * the lookup answers, which is what opens the rest of the form.
   */
  card: { type: Object, default: null },
  /** True when the dialog was opened from a row, so the card is not in question. */
  uidLocked: { type: Boolean, default: true },
  lookupLoading: { type: Boolean, default: false },
  lookupError: { type: String, default: '' },
  /** `{ value, label, caption, pictureUrl, initials, color }` per employee. */
  employeeOptions: { type: Array, default: () => [] },
  loadingEmployees: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  /**
   * The id of the employee currently holding the card, when the roster could
   * resolve their name. Null for a free card — or for a held one whose name the
   * roster could not place, where pre-filling somebody else would be worse than
   * pre-filling nobody.
   */
  currentEmployeeId: { type: [String, Number], default: null },
})

const emit = defineEmits(['update:modelValue', 'lookup', 'save'])

const STATUS_CHOICES = [
  { label: 'Active — accepted at readers', value: 'active' },
  { label: 'Inactive — refused at readers', value: 'inactive' },
]

const uid = ref('')
const employeeId = ref(null)
const status = ref('active')

/** What the API is keyed on, whatever separators were typed. */
const cleanUid = computed(() => normalizeUidInput(uid.value))

const title = computed(() => {
  if (!props.uidLocked) return 'Assign a card'
  return props.card?.assigned ? 'Reassign card' : 'Assign card'
})

const subtitle = computed(() => {
  if (props.card) return formatUid(props.card.uid)
  return 'Enter the UID printed on the card'
})

const submitLabel = computed(() => (props.card?.assigned ? 'Save changes' : 'Assign card'))

const canSubmit = computed(() => Boolean(props.card) && !props.card.foreign && !!employeeId.value)

const statusHint = computed(() =>
  status.value === 'active'
    ? 'The card opens what its holder is allowed to open.'
    : 'The card stays on record and on this list, but a reader turns it away.',
)

/**
 * The list the dropdown shows, narrowed by what has been typed.
 *
 * Filtered here rather than by QSelect's own matching so the search covers the
 * caption (the role) as well as the name — in a company with two people called
 * Maria, "Maria cashier" is the search a person actually types.
 */
const needle = ref('')

const visibleEmployees = computed(() => {
  const term = needle.value.trim().toLowerCase()
  if (!term) return props.employeeOptions
  return props.employeeOptions.filter((option) =>
    `${option.label} ${option.caption || ''}`.toLowerCase().includes(term),
  )
})

function onEmployeeFilter(value, update) {
  update(() => {
    needle.value = value || ''
  })
}

function requestLookup() {
  if (!cleanUid.value) return
  // Normalised back into the field as well as sent, so what is on screen is what
  // was asked about — a reader comparing the field with the card in their hand
  // should not have to account for the separators they typed.
  uid.value = cleanUid.value
  emit('lookup', cleanUid.value)
}

/** Seed the employee and status from whichever card is in hand. */
function seedFromCard() {
  employeeId.value = props.currentEmployeeId ?? null
  // An unassigned card is almost always being handed out to be used, so the
  // default is the state that makes that true. An assigned one keeps whatever
  // it already has, since this dialog is then a reassignment, not a decision
  // about access.
  status.value = props.card?.assigned ? props.card.status.key : 'active'
}

/**
 * Seed the form each time the dialog opens.
 *
 * On `@show` rather than on a watcher over `card`, because the page keeps the
 * selected row set while the dialog animates out — reseeding from a watcher
 * would blank the fields under the closing dialog.
 */
function resetForm() {
  uid.value = props.uidLocked ? (props.card?.uid ?? '') : ''
  needle.value = ''
  seedFromCard()
}

// A lookup landing is the UID path's equivalent of opening: it is the moment a
// card first exists for this form, so the two fields below it are seeded then.
watch(
  () => props.card?.uid,
  (next, previous) => {
    if (next && next !== previous) seedFromCard()
  },
)

function submit() {
  if (!canSubmit.value) return
  emit('save', {
    uid: props.card.uid,
    employeeId: employeeId.value,
    status: status.value,
  })
}
</script>

<style scoped>
/* ── UID entry ── */
/* Tabular figures and a little tracking, the same treatment the uid gets in the
   table — not a monospace face, which appears nowhere else in the app and would
   read as a code block dropped into a form. */
.acc-uid-input :deep(.q-field__native) {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.acc-uid-find {
  color: var(--dash-accent);
  font-weight: 600;
}

/* ── Current state ── */
.acc-now {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 11px 12px;
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
}
.acc-now__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 22px;
}
.acc-now__label {
  font-size: 12px;
  color: var(--dash-ink-3);
}
.acc-now__value {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dash-ink);
  text-align: right;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.acc-now__value--free {
  font-weight: 400;
  font-style: italic;
  color: var(--dash-ink-4);
}
.acc-now__value--quiet {
  font-weight: 400;
  color: var(--dash-ink-2);
}

/* ── Blocked / guidance ── */
.acc-block,
.acc-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 11px;
  border-radius: var(--dash-r-md);
  font-size: 12px;
  line-height: 1.45;
}
.acc-block {
  background: var(--dash-warn-bg);
  border: 1px solid var(--dash-warn-line);
  color: var(--dash-warn);
}
.acc-hint {
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
  color: var(--dash-ink-3);
}
.acc-block .q-icon,
.acc-hint .q-icon {
  flex: none;
  margin-top: 1px;
}

/* ── Option avatar ── */
.acc-opt__initials {
  font-size: 10.5px;
  font-weight: 600;
  color: #fff;
}

/* ── Note ── */
.acc-note {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dash-ink-3);
}
.acc-note .q-icon {
  flex: none;
  margin-top: 1px;
  color: var(--dash-ink-4);
}
</style>
