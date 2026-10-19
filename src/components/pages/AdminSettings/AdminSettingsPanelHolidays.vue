<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Holidays</h2>
        <p class="table-subtitle">The dates your calendar observes, and the kind of each</p>
      </div>
      <div class="table-actions">
        <q-btn color="primary" label="Add holiday" icon="add" class="add-btn" @click="openDialog" />
      </div>
    </div>

    <div class="modern-table-container">
      <!-- Built from the live `columns`, so the placeholder shares the real
           table's columns, labels and alignment. -->
      <template v-if="loading">
        <TableSkeleton :columns="columns" />
      </template>
      <template v-else-if="!filteredHolidays.length">
        <div class="dash-empty hd-empty">
          <span class="dash-featured-icon"><q-icon name="o_event_available" size="20px" /></span>
          <p class="dash-empty__title">
            {{ searchQuery ? 'No holidays match' : 'No holidays yet' }}
          </p>
          <p class="dash-empty__sub">
            {{
              searchQuery
                ? `Nothing here is called “${searchQuery}”.`
                : 'Add the dates your calendar observes — a name, a day, and the kind of holiday it is.'
            }}
          </p>
          <q-btn
            v-if="!searchQuery"
            label="Add holiday"
            icon="add"
            class="dash-modal__submit hd-empty__btn"
            unelevated
            @click="openDialog"
          />
        </div>
      </template>
      <template v-else>
        <q-table
          :rows="filteredHolidays"
          :columns="columns"
          row-key="id"
          flat
          class="dash-qtable settings-table"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Holiday</q-th>
              <q-th class="table-header-cell">Date</q-th>
              <q-th class="table-header-cell">Type</q-th>
              <q-th class="table-header-cell">Repeats</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell">
                <span class="item-name">{{ props.row.name }}</span>
              </q-td>

              <!-- Long form, not the ISO the payload carries: this is the
                   column a reader scans to place a holiday in the year. -->
              <q-td class="table-body-cell">
                <span class="hd-date">{{ props.row.date ? longLabel(props.row.date) : '—' }}</span>
              </q-td>

              <!-- A holiday names its type by code. The name is what a reader
                   knows it by; the code is shown when no type carries it, since
                   that is the fact worth seeing rather than a blank. -->
              <q-td class="table-body-cell">
                <span
                  class="hd-type"
                  :class="{ 'hd-type--orphan': typeFor(props.row).isOrphan }"
                  :title="
                    typeFor(props.row).isOrphan
                      ? 'No holiday type carries this code any more'
                      : undefined
                  "
                >
                  {{ typeFor(props.row).label }}
                </span>
              </q-td>

              <q-td class="table-body-cell">
                <span class="hd-repeats">{{ recurringLabel(props.row.isRecurring) }}</span>
              </q-td>

              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 150px">
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="openEditDialog(props.row)"
                      >
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit holiday</q-item-section>
                      </q-item>
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item dropdown-item-danger"
                        @click="openDeleteHoliday(props.row)"
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

    <!-- ── Add / edit ────────────────────────────────────────────────────────-->
    <HolidayDialog
      v-model="dialog"
      :holiday="editingHoliday"
      :holiday-types="holidayTypes"
      :saving="saving"
      @submit="requestSubmit"
    />

    <!-- Leave gate. Reached only when the chosen type can actually grant leave —
         the panel decides that, because it is a question about the type rather
         than a sentence. Same shared chrome as the delete below. -->
    <ConfirmDialog
      v-model="showLeaveWarning"
      :confirm="leaveWarning"
      :loading="saving"
      @confirm="commitSubmit"
    />

    <!-- Delete gate. `ConfirmDialog` is the shared chrome — the same head, card
         and footer an admin meets on Requests and Schedule — and it is why the
         wording lives in `holidayConfirm.js` rather than in a message here. -->
    <ConfirmDialog
      v-model="showDeleteConfirm"
      :confirm="deleteConfirm"
      :loading="isDeletingHoliday"
      @confirm="commitDeleteHoliday"
    />
  </div>
</template>

<script setup>
/**
 * The dated holidays for the active company.
 *
 * Two composables, and the second one is the point of the panel: a holiday
 * carries only the *code* of its type, so the names a reader knows the types by
 * are already loaded by `useAdminHolidayTypes` and reused here rather than
 * fetched twice. That is the same borrowing the Holiday types panel does for
 * leave types.
 */
import { computed, onMounted, ref, watch } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import HolidayDialog from './HolidayDialog.vue'
import { buildHolidayDeleteConfirm, buildHolidayLeaveWarning } from './holidayConfirm.js'
import { useAdminHolidays } from '@/composables/admin/useAdminHolidays'
import { useAdminHolidayTypes } from '@/composables/admin/useAdminHolidayTypes'
import { useCompany } from '@/composables/page/useCompany'
import { longLabel } from '@/composables/utils/calendarDate'
import { holidayTypeLabel, recurringLabel } from '@/composables/utils/holidays'
import { autoApplyState } from '@/composables/utils/holidayTypes'

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

const { companyId } = useCompany()

const {
  holidays,
  loading,
  saving,
  dialog,
  editingHoliday,
  fetchHolidays,
  openDialog,
  openEditDialog,
  saveHoliday,
  deleteHoliday,
} = useAdminHolidays()

// For the Add dialog's picker and for the Type column's names.
const { holidayTypes, fetchHolidayTypes } = useAdminHolidayTypes()

const columns = [
  { name: 'name', label: 'Holiday', field: 'name', align: 'left' },
  { name: 'date', label: 'Date', field: 'date', align: 'left' },
  { name: 'type', label: 'Type', field: 'holidayTypeCode', align: 'left' },
  { name: 'repeats', label: 'Repeats', field: 'isRecurring', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

// ─── Table ──────────────────────────────────────────────────────────────────

/**
 * Search reaches the resolved type name, not just the stored code, so typing
 * "special" finds the holidays whose type is *called* Special even though the
 * row carries `special`.
 */
const filteredHolidays = computed(() => {
  const query = (props.searchQuery || '').trim().toLowerCase()
  if (!query) return holidays.value
  return holidays.value.filter((holiday) => {
    if (holiday.name.toLowerCase().includes(query)) return true
    if ((holiday.date || '').toLowerCase().includes(query)) return true
    return typeFor(holiday).label.toLowerCase().includes(query)
  })
})

function typeFor(holiday) {
  return holidayTypeLabel(holiday.holidayTypeCode, holidayTypes.value)
}

// ─── Leave warning ───────────────────────────────────────────────────────────

/**
 * The form the reader submitted, frozen, and the question asked about it.
 *
 * The same shape as the delete below and for the same reason: the dialog behind
 * this one stays editable while the warning is up, so a commit that re-read the
 * form would write something other than what was agreed to.
 */
const showLeaveWarning = ref(false)
const pendingSubmit = ref(null)

const leaveWarning = computed(() => {
  const form = pendingSubmit.value
  if (!form) return null
  return buildHolidayLeaveWarning({
    name: form.name,
    date: form.date,
    type: holidayTypes.value.find((type) => type.code === form.holiday_type) || null,
    editing: Boolean(editingHoliday.value),
  })
})

watch(showLeaveWarning, (open) => {
  // Cleared on the close rather than on the write, so the ref means "a question is
  // on screen". Never while the write is in flight: `commitSubmit` closes this
  // itself, and clearing under it would leave `saveHoliday` nothing to write.
  if (open || saving.value) return
  pendingSubmit.value = null
})

/**
 * The gate. Opens the question only when credits are really about to move.
 *
 * `autoApplyState` already separates the three states worth telling apart, and
 * only its `on` key means a source will actually pay out: with the gate off
 * nothing is granted, and with the gate on but no enabled source it is configured,
 * listed, and does nothing. A warning printed for either would be about money
 * that never moves, which is how people learn to click through warnings.
 */
async function requestSubmit(form) {
  const type = holidayTypes.value.find((row) => row.code === form.holiday_type) || null
  if (autoApplyState(type).key !== 'on') {
    await saveHoliday(form)
    return
  }
  pendingSubmit.value = form
  showLeaveWarning.value = true
}

/** The confirmed save. The write lives here so `:loading` blocks a second click. */
async function commitSubmit() {
  const form = pendingSubmit.value
  if (!form || saving.value) return
  try {
    await saveHoliday(form)
  } finally {
    showLeaveWarning.value = false
    pendingSubmit.value = null
  }
}

// ─── Delete confirmation ─────────────────────────────────────────────────────

/**
 * The row the question was asked about, frozen — and the write it froze, the
 * pair `SchedulePage` keeps for its day-off confirm and for the same reason: the
 * list under the dialog is live, so a confirm that re-read its subject would
 * describe one holiday while deleting another.
 */
const showDeleteConfirm = ref(false)
const pendingDelete = ref(null)
const isDeletingHoliday = ref(false)

const deleteConfirm = computed(() =>
  pendingDelete.value
    ? buildHolidayDeleteConfirm(pendingDelete.value, typeFor(pendingDelete.value).label)
    : null,
)

// Cancel is the only exit the shared confirm offers, and it clears nothing by
// itself — so a frozen write describing a holiday nobody agreed to would outlive
// the dialog that asked about it. Clearing on the close, not on the write, keeps
// the refs meaning "a question is on screen".
watch(showDeleteConfirm, (open) => {
  if (open || isDeletingHoliday.value) return
  pendingDelete.value = null
})

/** Opens the question. The write lives in `commitDeleteHoliday`, below. */
function openDeleteHoliday(holiday) {
  pendingDelete.value = holiday
  showDeleteConfirm.value = true
}

async function commitDeleteHoliday() {
  const pending = pendingDelete.value
  if (!pending || isDeletingHoliday.value) return

  isDeletingHoliday.value = true
  try {
    await deleteHoliday(pending)
  } finally {
    // Clears whether the write landed or not: the composable's toast says which,
    // and the row either way is no longer the one the dialog was about.
    isDeletingHoliday.value = false
    showDeleteConfirm.value = false
    pendingDelete.value = null
  }
}

// ─── Load ───────────────────────────────────────────────────────────────────

// The two fetches run together: neither depends on the other, and the Type
// column needs both halves — a holiday with no types loaded resolves every code
// to itself.
async function load() {
  await Promise.all([fetchHolidays(), fetchHolidayTypes()])
}

watch(companyId, () => {
  load()
})

onMounted(load)
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

.hd-date {
  font-size: 13px;
  color: var(--dash-ink-2);
  white-space: nowrap;
}

.hd-type {
  font-size: 13px;
  color: var(--dash-ink-2);
}

/* A code no type carries — the type was deleted, or the holiday names one that
   was never configured. Shown as itself in monospace rather than hidden: it is
   the one thing wrong with the row, and a blank cell would read as a bug here. */
.hd-type--orphan {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
  color: var(--dash-ink-4);
}

.hd-repeats {
  font-size: 13px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}

.hd-empty {
  padding: 40px 20px;
}

.hd-empty__btn {
  margin-top: 14px;
  height: 34px;
  padding: 0 16px;
  border-radius: var(--dash-r-md);
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
}
</style>
