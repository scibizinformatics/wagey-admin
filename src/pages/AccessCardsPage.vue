<template>
  <PageShell>
    <div class="acc-page">
      <!-- ── Page header ─────────────────────────────────────────────────── -->
      <header class="acc-head">
        <div class="acc-head__titles">
          <h1 class="acc-head__title">Access cards</h1>
          <p class="acc-head__sub">{{ headerSummary }}</p>
        </div>

        <div class="acc-head__actions">
          <q-btn
            flat
            round
            icon="refresh"
            class="acc-head__refresh"
            :loading="loading"
            aria-label="Refresh access cards"
            @click="refresh"
          >
            <q-tooltip>Refresh</q-tooltip>
          </q-btn>
          <!-- The way in for a card you are holding rather than one already on
               the table — a new card, or one tapped somewhere you cannot see.
               Without it the page can only act on rows it already has, which is
               no help at all on the first card of a new workspace. -->
          <q-btn
            unelevated
            no-caps
            icon="o_add_card"
            label="Assign a card"
            class="acc-head__cta"
            @click="openAssignByUid"
          />
        </div>
      </header>

      <!-- ── Error ───────────────────────────────────────────────────────── -->
      <div v-if="error" class="acc-alert" role="alert">
        <q-icon name="o_error" size="18px" class="acc-alert__icon" />
        <p class="acc-alert__text">{{ error }}</p>
        <q-btn
          flat
          dense
          no-caps
          size="12px"
          label="Retry"
          class="acc-alert__btn"
          @click="refresh"
        />
        <q-btn
          flat
          dense
          round
          size="sm"
          icon="close"
          aria-label="Dismiss"
          class="acc-alert__close"
          @click="clearError"
        />
      </div>

      <!-- The two states that are neither working nor deliberately put away.
           Offered as a filter rather than just counted: the point of naming
           them is that somebody can go and settle them. -->
      <button
        v-if="summary.alerts && !loading && assignmentFilter !== 'alert'"
        type="button"
        class="acc-note"
        @click="onFilterChange('assignment', 'alert')"
      >
        <q-icon name="o_warning" size="17px" class="acc-note__icon" />
        <span class="acc-note__text">
          {{ summary.alerts }}
          {{ summary.alerts === 1 ? 'card needs' : 'cards need' }} attention — a live card with no
          holder, or somebody carrying one a reader will refuse.
        </span>
        <span class="acc-note__cta">Show them</span>
      </button>

      <!-- ── Roll ────────────────────────────────────────────────────────── -->
      <section class="dash-panel acc-panel">
        <div class="acc-toolbar">
          <q-input
            ref="searchRef"
            v-model="search"
            placeholder="Search UID, employee or status"
            dense
            outlined
            clearable
            hide-bottom-space
            debounce="200"
            class="acc-toolbar__search dash-field"
            aria-label="Search access cards"
            @update:model-value="page = 1"
          >
            <template v-slot:prepend>
              <q-icon name="search" size="18px" />
            </template>
          </q-input>

          <q-select
            :model-value="assignmentFilter"
            :options="ASSIGNMENT_FILTERS"
            emit-value
            map-options
            dense
            outlined
            hide-bottom-space
            popup-content-class="dash-popup"
            class="acc-toolbar__filter dash-field"
            aria-label="Filter by who holds the card"
            @update:model-value="(value) => onFilterChange('assignment', value)"
          >
            <template v-slot:prepend>
              <q-icon name="o_person_search" size="16px" />
            </template>
          </q-select>

          <q-select
            :model-value="statusFilter"
            :options="STATUS_FILTERS"
            emit-value
            map-options
            dense
            outlined
            hide-bottom-space
            popup-content-class="dash-popup"
            class="acc-toolbar__filter dash-field"
            aria-label="Filter by status"
            @update:model-value="(value) => onFilterChange('status', value)"
          >
            <template v-slot:prepend>
              <q-icon name="o_filter_alt" size="16px" />
            </template>
          </q-select>

          <q-select
            v-model="sortBy"
            :options="SORT_OPTIONS"
            emit-value
            map-options
            dense
            outlined
            hide-bottom-space
            popup-content-class="dash-popup"
            class="acc-toolbar__filter acc-toolbar__filter--sort dash-field"
            aria-label="Sort cards"
          >
            <template v-slot:prepend>
              <q-icon name="o_swap_vert" size="16px" />
            </template>
          </q-select>

          <p class="acc-toolbar__count">
            <strong>{{ filteredRows.length.toLocaleString() }}</strong>
            {{ filteredRows.length === 1 ? 'card' : 'cards' }}
            <span v-if="isFiltered" class="acc-toolbar__count-of">
              of {{ cards.length.toLocaleString() }}
            </span>
          </p>
        </div>

        <!-- Cards below 1024px, table above — the same threshold Attendance,
             Invitations and the Audit trail switch on. -->
        <AccessCardCardList
          v-if="$q.screen.lt.md"
          :rows="displayRows"
          :loading="loading"
          :is-filtered="isFiltered"
          @view="openDetail"
          @assign="openAssign"
          @copy="copyUid"
          @status="requestStatusChange"
          @clear-filters="clearFilters"
        />
        <AccessCardTable
          v-else
          :rows="displayRows"
          :loading="loading"
          :is-filtered="isFiltered"
          @view="openDetail"
          @assign="openAssign"
          @copy="copyUid"
          @status="requestStatusChange"
          @clear-filters="clearFilters"
        />

        <footer v-if="!loading && filteredRows.length" class="acc-foot">
          <div class="acc-foot__left">
            <span class="acc-foot__range dash-num">
              {{ (page - 1) * pageSize + 1 }}–{{
                Math.min(page * pageSize, filteredRows.length)
              }}
              of {{ filteredRows.length.toLocaleString() }}
            </span>
            <q-select
              v-model="pageSize"
              :options="pageSizeOptions"
              emit-value
              map-options
              dense
              outlined
              hide-bottom-space
              class="acc-foot__size dash-field"
              aria-label="Rows per page"
              @update:model-value="page = 1"
            />
          </div>
          <q-pagination
            v-model="page"
            :max="totalPages"
            :max-pages="$q.screen.lt.md ? 3 : 6"
            boundary-numbers
            direction-links
            :ripple="false"
            icon-prev="chevron_left"
            icon-next="chevron_right"
            icon-first="first_page"
            icon-last="last_page"
            class="acc-pager"
          />
        </footer>
      </section>
    </div>

    <AccessCardDetailDialog
      v-model="showDetail"
      :row="selectedCard"
      :detail="detailCard"
      :avatar="selectedAvatar"
      :loading="detailLoading"
      :error="detailError"
      @assign="openAssign"
      @copy="copyUid"
      @retry="loadDetail"
      @status="requestStatusChange"
    />

    <AccessCardAssignDialog
      v-model="showAssign"
      :card="selectedCard"
      :uid-locked="assignUidLocked"
      :lookup-loading="lookupLoading"
      :lookup-error="lookupError"
      :employee-options="employeeOptions"
      :loading-employees="loadingEmployees"
      :saving="saving"
      :current-employee-id="currentHolderId"
      @lookup="lookupUid"
      @save="saveAssignment"
    />

    <!-- Sits above whichever opened it — the table's row menu or the detail
         dialog — and is the only thing in this feature that writes a status. -->
    <AccessCardStatusConfirmDialog
      v-model="showStatusConfirm"
      :confirm="statusConfirm"
      :loading="settingStatus"
      @confirm="commitStatusChange"
    />
  </PageShell>
</template>

<script setup>
/**
 * ACCESS CARDS
 * ----------------------------------------------------------------------------
 * The NFC cards registered to this workspace, and who holds each one.
 *
 * **Two writes, and they are deliberately separate.** One PATCH sets a card's
 * holder (`employee-assign`); another sets whether the card works at all
 * (`/status/`, four values). They used to be a single form, which meant
 * "switch this card off" rode along with a reassignment — or, worse, a status a
 * reader had chosen for one card arrived in the body of a request about a
 * different card's holder. Now the status has its own verb list
 * (`statusActionsFor`), its own confirmation (`AccessCardStatusConfirmDialog`,
 * worded in `statusConfirm.js`) and its own guarded writer (`setCardStatus`).
 *
 * The third read is borrowed: the tap log, wanted only for the per-card hours
 * column, because the card payload carries no hours at all. Every reading on
 * screen is derived in `composables/utils/accessCards.js`, so the table, the card
 * list, the header line and all three dialogs cannot disagree about a card.
 *
 * Filtering, sorting and paging all happen here, in that order, over the
 * complete roll. That order is the point: "least recently tapped" has to mean
 * the oldest tap there is, not the oldest on the page you happen to be looking
 * at, so the slice is always taken last.
 *
 * The employee list is read for two things — the faces beside each holder, and
 * the dropdown in the assign dialog. It is also the only way to get from a row
 * to a person at all: the card payload names its holder and carries no id, so
 * an id for the write has to come from matching that name against the roster.
 * A name shared by two employees resolves to nobody (see
 * `buildEmployeeNameIndex`), which leaves the assign dialog's employee field
 * empty rather than pre-filled with the wrong colleague.
 *
 * That same limit is what the hours column inherits. The tap log and the card
 * roll are joined on name because it is the only thing they share, so a holder
 * whose name is ambiguous gets a dash rather than one of the two colleagues'
 * figures — see `monthlyHoursByCard`.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useQuasar, copyToClipboard } from 'quasar'
import PageShell from '@/components/layout/PageShell.vue'
import AccessCardTable from '@/components/pages/AccessCards/AccessCardTable.vue'
import AccessCardCardList from '@/components/pages/AccessCards/AccessCardCardList.vue'
import AccessCardAssignDialog from '@/components/pages/AccessCards/AccessCardAssignDialog.vue'
import AccessCardDetailDialog from '@/components/pages/AccessCards/AccessCardDetailDialog.vue'
import AccessCardStatusConfirmDialog from '@/components/pages/AccessCards/AccessCardStatusConfirmDialog.vue'
import { buildStatusConfirm } from '@/components/pages/AccessCards/statusConfirm'
import { useAccessCards } from 'src/composables/page/useAccessCards'
import { useCardTaps } from 'src/composables/page/useCardTaps'
import { useCompany } from 'src/composables/page/useCompany'
import { useEmployees } from 'src/composables/page/useEmployees'
import { useToast } from 'src/composables/useToast'
import { useLoadedToast } from 'src/composables/useLoadedToast'
import { extractErrorMessage } from 'src/composables/utils/http'
import {
  ASSIGNMENT_FILTERS,
  SORTS,
  SORT_OPTIONS,
  STATUS_FILTERS,
  matchesAssignment,
  matchesSearch,
  monthlyHoursByCard,
  statusLabel,
  tapAgo,
  WRITABLE_STATUSES,
} from 'src/composables/utils/accessCards'
import { decimalHoursLabel } from 'src/composables/utils/format'
import { monthStartIso, todayIso } from 'src/composables/utils/calendarDate'
import {
  avatarFor,
  buildEmployeeNameIndex,
  employeeByName,
  getAvatarColor,
  getFullName,
  getInitials,
  getRole,
} from 'src/composables/utils/employee'

const $q = useQuasar()
const toast = useToast()
const { notifyLoaded } = useLoadedToast()
const { companyId } = useCompany()

const {
  cards,
  summary,
  loading,
  saving,
  error,
  fetchCards,
  fetchCard,
  assignCard,
  setCardStatus,
  settingStatus,
  clearError,
  reset,
} = useAccessCards()

const { employees, fetchEmployees } = useEmployees()

/**
 * The tap log, read only for the per-card hours total — the card payload has no
 * hours of its own.
 *
 * `error` is read for exactly one thing: telling a log that never arrived from a
 * log that arrived empty, which the hours column has to get right (see
 * `loadTaps`). It is never surfaced — a tap log that will not load is a missing
 * column, not a broken page, and putting its failure into this page's error
 * banner would be alarming about a reading nobody was required. `loading` stays
 * unused: while the log is in flight the column shows a dash either way, so
 * nothing would render differently for it.
 */
const { rows: tapRows, error: tapsError, fetchCardTaps, reset: resetTaps } = useCardTaps()

/** Whether the tap log actually *answered*. `false` means "no reading" — still in
 *  flight, or a fetch that failed — never "none worked"; see
 *  `monthlyHoursByCard`, which withholds the figure either way. */
const tapsLoaded = ref(false)

const searchRef = ref(null)

// ─── Filters ──────────────────────────────────────────────────────────────────
const search = ref('')
const assignmentFilter = ref('all')
const statusFilter = ref('all')
const sortBy = ref('recent')

const isFiltered = computed(
  () =>
    Boolean((search.value || '').trim()) ||
    assignmentFilter.value !== 'all' ||
    statusFilter.value !== 'all',
)

const filteredRows = computed(() => {
  const term = (search.value || '').trim().toLowerCase()

  const narrowed = cards.value.filter((card) => {
    if (!matchesAssignment(card, assignmentFilter.value)) return false
    if (statusFilter.value !== 'all' && card.status.key !== statusFilter.value) return false
    return matchesSearch(card, term)
  })

  // Sorted after filtering and before the page slice below. `filter` already
  // returned a new array, so this sorts a copy and never mutates what the
  // composable published.
  return narrowed.sort(SORTS[sortBy.value] ?? SORTS.recent)
})

function clearFilters() {
  search.value = ''
  assignmentFilter.value = 'all'
  statusFilter.value = 'all'
  page.value = 1
}

/**
 * Any filter change returns to page 1.
 *
 * Without this, narrowing 400 cards to 6 while sitting on page 5 leaves the
 * table empty and the pager pointing past the end — which reads as "no results"
 * when there are six.
 */
function onFilterChange(which, value) {
  if (which === 'assignment') assignmentFilter.value = value
  else if (which === 'status') statusFilter.value = value
  page.value = 1
}

// ─── Paging ───────────────────────────────────────────────────────────────────
const pageSizeOptions = [
  { label: '25 per page', value: 25 },
  { label: '50 per page', value: 50 },
  { label: '100 per page', value: 100 },
]

const page = ref(1)
const pageSize = ref(25)

const totalPages = computed(() => Math.ceil(filteredRows.value.length / pageSize.value) || 1)

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

// A shrinking list can strand the pager even under a stable filter — a refresh
// that returns fewer cards, say.
watch(totalPages, (max) => {
  if (page.value > max) page.value = max
})

// ─── Employees ────────────────────────────────────────────────────────────────
const loadingEmployees = ref(false)

/**
 * Name to employee record. A name held by two employees resolves to null, which
 * both consumers below treat as "cannot say who this is" — one colleague's face
 * or one colleague's id against another's card is worse than neither.
 */
const employeeIndex = computed(() => buildEmployeeNameIndex(employees.value))

/** The assign dialog's dropdown. The value is the uuid the write endpoint wants;
 *  `emp.uuid || emp.id` is the same pairing the Attendance and Schedule pages
 *  use, because a roster record carries one or the other depending on how it was
 *  fetched. */
const employeeOptions = computed(() =>
  employees.value
    .map((employee) => {
      const value = employee.uuid || employee.id
      if (!value) return null
      const name = getFullName(employee)
      const role = getRole(employee)
      return {
        value,
        label: name,
        caption: role && role !== 'N/A' ? role : '',
        pictureUrl: employee.user?.picture_url || '',
        initials: getInitials(name),
        color: getAvatarColor(name),
      }
    })
    .filter(Boolean),
)

/**
 * This calendar month's hours per card, keyed by uid.
 *
 * The window is the 1st of the current month through today, and it is computed
 * here rather than held in a ref so it cannot go stale: a tab left open across
 * a month boundary re-reads `todayIso()` on the next fetch instead of continuing
 * to total September. Older history stays on the Card Taps page, which is where
 * the full tap log lives.
 */
const hoursByCard = computed(() => {
  const today = todayIso()
  return monthlyHoursByCard(cards.value, tapsLoaded.value ? tapRows.value : null, {
    index: employeeIndex.value,
    from: monthStartIso(today),
    to: today,
  })
})

/**
 * The page slice with a face attached, which is what both renderers read.
 *
 * Decorated here rather than at normalisation time for the same reasons the
 * audit trail does it: the roll can render before the employee list has landed,
 * and only the rows actually on screen are touched. `lastTapAgo` is computed
 * here too, since it is relative to now rather than to anything in the payload.
 *
 * `hoursSeconds` stays nullable on purpose, so the two renderers can tell "0.00"
 * from a figure we could not read; `hoursLabel` is the formatted decimal, or ''
 * when there is no reading to format.
 */
const displayRows = computed(() =>
  pagedRows.value.map((card) => {
    const hoursSeconds = hoursByCard.value.get(card.uid) ?? null
    return {
      ...card,
      avatar: card.assigned ? avatarFor(employeeIndex.value, card.employeeName) : null,
      lastTapAgo: tapAgo(card.lastTapMs),
      hoursSeconds,
      hoursLabel: hoursSeconds === null ? '' : decimalHoursLabel(hoursSeconds / 3600),
    }
  }),
)

// ─── Header ───────────────────────────────────────────────────────────────────
const headerSummary = computed(() => {
  if (loading.value && !cards.value.length) return 'Loading access cards…'
  if (!cards.value.length) return 'NFC cards registered to this workspace'
  const { total, assigned, unassigned } = summary.value
  const noun = total === 1 ? 'card' : 'cards'
  const tail = unassigned
    ? `${assigned} assigned · ${unassigned} unassigned`
    : 'every card assigned'
  return `${total.toLocaleString()} ${noun} · ${tail}`
})

// ─── Dialogs ──────────────────────────────────────────────────────────────────
const showDetail = ref(false)
const showAssign = ref(false)
const selectedCard = ref(null)
const detailCard = ref(null)
const detailLoading = ref(false)
const detailError = ref('')

/** False only for the toolbar's "Assign a card", where the card is typed in
 *  rather than clicked on and the dialog has to ask which one it is. */
const assignUidLocked = ref(true)
const lookupLoading = ref(false)
const lookupError = ref('')

const selectedAvatar = computed(() => {
  const name = detailCard.value?.employeeName || selectedCard.value?.employeeName
  return name ? avatarFor(employeeIndex.value, name) : null
})

/**
 * The id of whoever currently holds the selected card, when the roster can place
 * their name. Null otherwise, which leaves the assign dialog's employee field
 * empty — a reassignment starting from the wrong colleague is a mistake nobody
 * would catch before saving.
 */
const currentHolderId = computed(() => {
  const match = employeeByName(employeeIndex.value, selectedCard.value?.employeeName)
  return match ? (match.uuid ?? match.id ?? null) : null
})

function openDetail(card) {
  selectedCard.value = card
  detailCard.value = null
  detailError.value = ''
  showDetail.value = true
  loadDetail()
}

async function loadDetail() {
  const uid = selectedCard.value?.uid
  if (!uid) return
  detailLoading.value = true
  detailError.value = ''
  try {
    const card = await fetchCard(uid)
    // The dialog can be closed, or moved to another card, while this is out.
    if (selectedCard.value?.uid !== uid) return
    detailCard.value = card
  } catch (err) {
    if (selectedCard.value?.uid !== uid) return
    // The list row is already on screen, so this is a missing *extra*, not a
    // missing card — said in the dialog rather than raised as a toast.
    detailError.value = extractErrorMessage(err, 'Could not load the rest of this card')
  } finally {
    detailLoading.value = false
  }
}

function openAssign(card) {
  if (!card) return
  selectedCard.value = card
  assignUidLocked.value = true
  lookupError.value = ''
  showDetail.value = false
  showAssign.value = true
}

/**
 * The other way in: a card in somebody's hand, identified by the UID printed on
 * it rather than by a row on screen.
 *
 * The dialog opens with no card at all and gets one from `lookupUid` below. It
 * has to exist because the table can only offer cards this workspace has already
 * been told about — a card that has just been tapped for the first time, or one
 * an admin is holding before it has ever been near a reader, is reachable no
 * other way.
 */
function openAssignByUid() {
  selectedCard.value = null
  assignUidLocked.value = false
  lookupError.value = ''
  showDetail.value = false
  showAssign.value = true
}

/**
 * Resolve a typed UID to a card.
 *
 * The list is asked first and answers for free — a UID already on screen needs
 * no request, and the row carries everything the dialog shows. Only an unknown
 * one goes to the detail endpoint, where a 404 is the answer rather than a
 * fault: there is no route that creates a card, so "not registered" is a real
 * state with a real next step, and it is said here rather than left to a failed
 * PATCH afterwards.
 */
async function lookupUid(uid) {
  lookupError.value = ''
  selectedCard.value = null
  if (!uid) return

  const known = cards.value.find((card) => card.uid === uid)
  if (known) {
    selectedCard.value = known
    return
  }

  lookupLoading.value = true
  try {
    selectedCard.value = await fetchCard(uid, { expectMissing: true })
  } catch (err) {
    lookupError.value =
      err?.response?.status === 404
        ? 'No card with that UID is registered. A card registers itself the first time it is tapped on a reader.'
        : extractErrorMessage(err, 'Could not look up that card')
  } finally {
    lookupLoading.value = false
  }
}

/**
 * Hand a card to somebody.
 *
 * The status is passed but not chosen: `employee-assign` carries the field, and
 * the card's *current* status is the only value that leaves the working state
 * untouched — which is the whole reason status has its own endpoint now. It used
 * to be a form select seeded to the card's status, so this is exactly the request
 * the dialog used to send when only the holder changed.
 *
 * It does differ in one case, deliberately. The old dialog defaulted an
 * *unassigned* card to `active`, so handing a revoked card to somebody quietly
 * re-enabled it; now a card that is not active stays that way until somebody says
 * so with a status verb.
 */
async function saveAssignment({ uid, employeeId }) {
  const card = selectedCard.value
  if (!card) return
  const wasAssigned = card.assigned

  // The status this write carries over. Verbatim, so a reassignment cannot
  // change whether the card works — including a `stolen` or `expired` this app
  // cannot write itself, because substituting something writable there would
  // quietly resurrect a card somebody had already reported. The one exception is
  // a payload that named no status at all: there is nothing to preserve, and a
  // card being handed to somebody is being handed to be used, which is the
  // `active` the old dialog's select defaulted to.
  const assignStatus =
    card.status?.key && card.status.key !== 'unknown' ? card.status.key : 'active'

  try {
    await assignCard(uid, { employeeId, status: assignStatus })
    showAssign.value = false
    const name = employeeOptions.value.find((option) => option.value === employeeId)?.label
    toast.success(
      wasAssigned
        ? `Card reassigned${name ? ` to ${name}` : ''}`
        : `Card assigned${name ? ` to ${name}` : ''}`,
      {
        caption: `${uid} · ${statusLabel(assignStatus)}`,
        timeout: 3000,
      },
    )
  } catch (err) {
    toast.error(extractErrorMessage(err, 'Failed to assign the card'), { timeout: 8000 })
  } finally {
    // Unconditional: a write that failed may still have landed, and the list is
    // the only thing that can say what the card now holds.
    await fetchCards()
  }
}

// ─── Card status ──────────────────────────────────────────────────────────────

/**
 * The confirmation waiting to be confirmed, and the write frozen inside it.
 *
 * `pendingStatus` is snapshotted at the moment the confirm opens rather than read
 * off the row when Confirm is pressed. The row underneath is live — a refresh,
 * a filter change or the detail payload landing can all replace it while the
 * dialog is open, and a confirm that re-read its subject would then describe a
 * card other than the one it revokes.
 */
const showStatusConfirm = ref(false)
const statusConfirm = ref(null)
const pendingStatus = ref(null)

/**
 * First step of a status change: work out what it would do, then ask. Nothing is
 * written here — mirroring the contract-update confirm on Employees and the
 * shift reassign confirm on Schedule, for the same reason: these verbs decide
 * what a physical door does with a card somebody is carrying.
 */
function requestStatusChange(card, status) {
  // A second submit while the first is still in flight would write the same
  // status again, and a click on a row menu while the confirm is open would
  // leave `pendingStatus` describing a card the dialog is not showing.
  if (settingStatus.value || showStatusConfirm.value) return

  const confirm = buildStatusConfirm(card, status)
  if (!confirm) {
    // The card changed state under a menu that was open when it did not — the
    // verb is no longer one this card can take. Nothing is lost, so this is a
    // console note rather than a toast somebody has to dismiss.
    console.warn(`[Access cards] no status confirmation for "${status}"`)
    return
  }

  pendingStatus.value = { uid: card.uid, status }
  statusConfirm.value = confirm
  showStatusConfirm.value = true
}

/**
 * The confirmed status change.
 *
 * Reads only `pendingStatus`, never the row, so it writes exactly what the
 * confirmation described. The refetch is unconditional and happens after the
 * toast, for the assign write's reason: a write that reported failure may still
 * have landed, and the list is the only thing that can say what the card is now.
 */
async function commitStatusChange() {
  const pending = pendingStatus.value
  if (!pending || settingStatus.value) return

  // Held in locals because the `finally` below clears the ref the confirm reads,
  // and the refetch at the end of it needs to know which card it was about.
  const { uid, status } = pending
  // The verb's own past tense, so the toast reads as the thing that happened
  // rather than as the field that was written.
  const done = WRITABLE_STATUSES[status]?.doneLabel || status
  const label = statusLabel(status)

  try {
    await setCardStatus(uid, status)
    toast.success(`Card ${done}`, { caption: uid, timeout: 3000 })
  } catch (err) {
    toast.error(extractErrorMessage(err, `Failed to change this card to ${label.toLowerCase()}`), {
      timeout: 8000,
    })
  } finally {
    showStatusConfirm.value = false
    statusConfirm.value = null
    pendingStatus.value = null
    await fetchCards()
    // The detail dialog keeps its own normalised copy of the card rather than
    // pointing at the list row, so the refetch above does not reach it — a card
    // revoked from inside that dialog would still be showing a green "Active"
    // chip behind the toast that said otherwise. Re-read it when that is the
    // dialog that is open on this card.
    if (showDetail.value && selectedCard.value?.uid === uid) await loadDetail()
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────
async function copyUid(card) {
  if (!card?.uid) return
  try {
    // The raw uid, not the spaced form on screen — what gets pasted into a door
    // controller or a ticket has to be the value the reader sends.
    await copyToClipboard(card.uid)
    toast.success(`UID ${card.uid} copied`, { timeout: 2000 })
  } catch {
    toast.error('Could not copy the UID')
  }
}

/**
 * The employee list, wanted for the faces and for the assign dropdown.
 *
 * It runs alongside the roll rather than before it: a card's uid, holder name
 * and status are all in the card payload, so the table is complete without this
 * and waiting on it would delay the page for decoration. A failure is reported
 * quietly — the avatars stay as initials, but the assign dialog would have
 * nobody to offer, which is worth saying.
 */
async function loadEmployees() {
  loadingEmployees.value = true
  try {
    await fetchEmployees()
  } catch {
    toast.warning(
      'Employee list did not load — you will not be able to assign a card until it does',
    )
  } finally {
    loadingEmployees.value = false
  }
}

/**
 * The tap log, for the hours column.
 *
 * Never rejects and never raises a toast: `fetchCardTaps` swallows its own
 * failures, so all this has to do is record whether an answer came back. The
 * flag is what separates "this card's holder worked no hours" from "we could not
 * read the tap log", and the page shows a dash for the second — which is why the
 * flag has to mean *answered*, not *called*.
 *
 * It used to be set unconditionally, and that made a failed fetch report 0.00 on
 * every card: `fetchCardTaps` returns `[]` on failure exactly as it does on
 * success, so an absent log looked like an empty one, and `monthlyHoursByCard`
 * read that as a real zero. A company whose tap endpoint was down would have been
 * told, in a column of settled figures, that nobody had worked a minute this
 * month. `error` is the only thing that tells the two apart, and it is cleared
 * when a fetch starts, so a successful call leaves it empty.
 */
async function loadTaps() {
  await fetchCardTaps()
  tapsLoaded.value = !tapsError.value
}

async function load() {
  const [loaded] = await Promise.all([fetchCards(), loadEmployees(), loadTaps()])
  notifyLoaded('Access cards', loaded.length, { noun: 'card' })
}

function refresh() {
  clearError()
  load()
}

// ─── Company scoping ──────────────────────────────────────────────────────────
watch(companyId, (next, previous) => {
  if (next === previous) return
  reset()
  // A tap log is per-employee and per-day, so the previous workspace's hours have
  // to go with its cards — and the in-flight guard bumped here is what stops a
  // slower response for the old company landing on the new one's table.
  resetTaps()
  tapsLoaded.value = false
  clearFilters()
  showDetail.value = false
  showAssign.value = false
  // A confirmation frozen against a card from the workspace being left is the one
  // dialog that must not survive the switch: Confirm would write a uid belonging
  // to somebody else. `reset()` above drops the write flag with the cards.
  showStatusConfirm.value = false
  statusConfirm.value = null
  pendingStatus.value = null
  selectedCard.value = null
  detailCard.value = null
  if (next) load()
})

// ─── "/" focuses search, matching the other list pages ────────────────────────
function onGlobalKey(event) {
  if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
  const tag = event.target?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return
  event.preventDefault()
  searchRef.value?.focus()
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKey)
  load()
})

onUnmounted(() => window.removeEventListener('keydown', onGlobalKey))
</script>

<style scoped>
.acc-page {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

/* ── Page header ── */
.acc-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.acc-head__titles {
  min-width: 0;
}

.acc-head__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--dash-ink);
  line-height: 1.2;
}

.acc-head__sub {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

.acc-head__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* Same pair of controls as the Invitations header, at the same metrics — a
   quiet bordered refresh beside the one filled action on the page. */
.acc-head__refresh {
  width: 36px;
  height: 36px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  color: var(--dash-ink-3);
}
.acc-head__refresh:hover {
  color: var(--dash-ink);
  border-color: var(--dash-line-strong);
}

/* The one filled control on the page, so the primary move is unambiguous. */
.acc-head__cta {
  height: 36px;
  padding: 0 14px;
  border-radius: var(--dash-r-md);
  background: var(--dash-brand);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.005em;
}
.acc-head__cta:hover {
  background: #193d5c;
}

/* ── Error ── */
.acc-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 14px;
  border-radius: var(--dash-r-lg);
  background: var(--dash-critical-bg);
  border: 1px solid var(--dash-critical-line);
}
.acc-alert__icon {
  color: var(--dash-critical-mark);
  flex-shrink: 0;
}
.acc-alert__text {
  flex: 1;
  margin: 0;
  min-width: 0;
  font-size: 13px;
  color: var(--dash-critical);
}
.acc-alert__btn {
  color: var(--dash-critical);
  font-weight: 600;
  padding: 0 8px;
}
.acc-alert__close {
  color: var(--dash-critical);
}

/* ── Attention notice ──
   A button, because its whole purpose is to be the way into the filter it
   describes; a banner that only counted them would leave the reader to find
   the control themselves. */
.acc-note {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  text-align: left;
  padding: 9px 12px;
  border-radius: var(--dash-r-lg);
  background: var(--dash-warn-bg);
  border: 1px solid var(--dash-warn-line);
  cursor: pointer;
  transition: border-color var(--dash-fast) var(--dash-ease);
}
/* Hover deepens the hairline rather than flooding the band with a stronger
   yellow — the tint is what makes it readable, and a saturated fill under
   thirteen-pixel text is not. */
.acc-note:hover {
  border-color: var(--dash-warn-mark);
}
.acc-note__icon {
  color: var(--dash-warn);
  flex-shrink: 0;
}
.acc-note__text {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--dash-warn);
}
.acc-note__cta {
  flex: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--dash-warn);
  text-decoration: underline;
}

/* ── Panel ── */
.acc-panel {
  /* Clipped so the last row and the footer cannot paint square over the panel's
     bottom radius. */
  overflow: hidden;
}

/* ── Toolbar ── */
.acc-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--dash-line);
  flex-wrap: wrap;
}

.acc-toolbar__search {
  flex: 1 1 200px;
  min-width: 0;
  max-width: 300px;
}
.acc-toolbar__search :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.acc-toolbar__search :deep(.q-field__native) {
  font-size: 13px;
  color: var(--dash-ink);
}
.acc-toolbar__search :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

.acc-toolbar__filter {
  width: 168px;
  flex-shrink: 0;
}
.acc-toolbar__filter--sort {
  width: 190px;
}
.acc-toolbar__filter :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.acc-toolbar__filter :deep(.q-field__native) {
  font-size: 12.5px;
  color: var(--dash-ink);
  min-height: 34px;
  padding: 0;
}
.acc-toolbar__filter :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

.acc-toolbar__count {
  margin: 0 0 0 auto;
  font-size: 12px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}
.acc-toolbar__count strong {
  color: var(--dash-ink);
  font-weight: 600;
}
.acc-toolbar__count-of {
  color: var(--dash-ink-4);
}

/* ── Footer ── */
.acc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 16px;
  border-top: 1px solid var(--dash-line);
}

.acc-foot__left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.acc-foot__range {
  font-size: 12px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}

.acc-foot__size {
  width: 140px;
}
.acc-foot__size :deep(.q-field__control) {
  height: 32px;
  min-height: 32px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.acc-foot__size :deep(.q-field__native) {
  font-size: 12px;
  color: var(--dash-ink-2);
  min-height: 32px;
  padding: 0;
}
.acc-foot__size :deep(.q-field__marginal) {
  height: 32px;
  color: var(--dash-ink-4);
}

.acc-pager :deep(.q-btn) {
  color: var(--dash-ink-3);
  font-weight: 500;
}
.acc-pager :deep(.q-btn--active) {
  color: var(--dash-accent);
  background: var(--dash-accent-bg);
}

@media (max-width: 1023px) {
  .acc-head__title {
    font-size: 20px;
  }
  .acc-head__actions {
    justify-content: flex-end;
  }
  .acc-toolbar {
    padding: 10px 12px;
  }
  .acc-toolbar__search {
    max-width: none;
  }
  .acc-toolbar__count {
    margin-left: 0;
  }
  .acc-foot {
    padding: 10px 12px;
  }
}
</style>
