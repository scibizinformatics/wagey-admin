<template>
  <PageShell>
    <div class="ann-page">
      <!-- ── Page header ───────────────────────────────────────────────────
           Title and summary sit on the canvas rather than inside the card, the
           same as the other redesigned pages: the card holds the board, the
           canvas says what the board is. -->
      <header class="ann-head">
        <div class="ann-head__titles">
          <h1 class="ann-head__title">Announcements</h1>
          <p class="ann-head__sub">
            <template v-if="companyName">
              <span>{{ companyName }}</span>
              <span class="ann-head__dot" aria-hidden="true">·</span>
            </template>
            <span :class="{ 'ann-head__live': counts.live > 0 }">{{ headSummary }}</span>
          </p>
        </div>

        <div class="ann-head__actions">
          <q-btn
            flat
            round
            icon="refresh"
            class="ann-head__refresh"
            :loading="loading"
            aria-label="Refresh announcements"
            @click="loadAnnouncements"
          >
            <q-tooltip>Refresh</q-tooltip>
          </q-btn>
          <q-btn
            unelevated
            no-caps
            icon="add"
            label="New announcement"
            class="ann-head__cta"
            @click="openCreateDialog"
          />
        </div>
      </header>

      <!-- ── Error ─────────────────────────────────────────────────────────
           One line in the critical tone with a retry. A failed fetch used to
           surface only as a console error and an empty table. -->
      <div v-if="loadError" class="ann-alert" role="alert">
        <q-icon name="o_error" size="18px" class="ann-alert__icon" />
        <p class="ann-alert__text">{{ loadError }}</p>
        <q-btn
          flat
          dense
          no-caps
          size="12px"
          label="Retry"
          class="ann-alert__btn"
          @click="loadAnnouncements"
        />
      </div>

      <!-- ── Board ─────────────────────────────────────────────────────────
           Toolbar band, then the table on laptops and up, then the card list
           below 1024px where six columns scrolled sideways. -->
      <section class="ann-surface">
        <div class="ann-toolbar">
          <q-input
            v-model="searchQuery"
            placeholder="Search title or message"
            dense
            outlined
            clearable
            hide-bottom-space
            class="ann-toolbar__search dash-field"
            aria-label="Search announcements"
          >
            <template v-slot:prepend>
              <q-icon name="search" size="18px" />
            </template>
          </q-input>

          <q-select
            v-model="statusFilter"
            :options="statusFilterOptions"
            emit-value
            map-options
            dense
            outlined
            hide-bottom-space
            popup-content-class="dash-popup"
            class="ann-toolbar__filter dash-field"
            aria-label="Filter by status"
          >
            <template v-slot:prepend>
              <q-icon name="o_filter_alt" size="16px" />
            </template>
          </q-select>

          <q-select
            v-model="typeFilter"
            :options="typeFilterOptions"
            emit-value
            map-options
            dense
            outlined
            hide-bottom-space
            popup-content-class="dash-popup"
            class="ann-toolbar__filter dash-field"
            aria-label="Filter by type"
          >
            <template v-slot:prepend>
              <q-icon name="o_label" size="16px" />
            </template>
          </q-select>

          <!-- ── Audience filters ──
               Server-side, unlike the status and type filters beside them: the
               four contract params go to the list endpoint, which resolves them
               against each announcement's audience. Behind one button because
               four more selects would not fit the band, and because they are
               the less-used pair. -->
          <q-btn
            flat
            no-caps
            dense
            icon="o_tune"
            :label="audienceFilterLabel"
            class="ann-toolbar__more"
            :class="{ 'is-on': activeAudienceCount > 0 }"
            aria-label="Filter by audience"
            @click="onAudienceMenuOpen"
          >
            <q-badge v-if="activeAudienceCount" floating class="ann-toolbar__badge">
              {{ activeAudienceCount }}
            </q-badge>
            <q-menu anchor="bottom right" self="top right" class="ann-more">
              <div class="ann-more__panel">
                <div class="ann-more__head">
                  <span class="ann-more__title">Audience</span>
                  <button
                    v-if="activeAudienceCount"
                    type="button"
                    class="ann-more__reset"
                    @click="resetAudienceFilters"
                  >
                    Reset
                  </button>
                </div>

                <div class="ann-more__field">
                  <span class="ann-more__label">Payroll group</span>
                  <q-select
                    v-model="audienceFilter.payrollGroupId"
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

                <div class="ann-more__field">
                  <span class="ann-more__label">Department</span>
                  <q-select
                    v-model="audienceFilter.departmentId"
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

                <div class="ann-more__field">
                  <span class="ann-more__label">Position</span>
                  <q-select
                    v-model="audienceFilter.positionId"
                    :options="positions"
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

                <div class="ann-more__field">
                  <span class="ann-more__label">Pay type</span>
                  <q-select
                    v-model="audienceFilter.payType"
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
            </q-menu>
          </q-btn>

          <p class="ann-toolbar__count">
            <strong>{{ visibleAnnouncements.length }}</strong>
            {{ visibleAnnouncements.length === 1 ? 'announcement' : 'announcements' }}
            <span v-if="isClientFiltered" class="ann-toolbar__count-of">
              of {{ announcements.length }}
            </span>
            <span v-if="activeAudienceCount" class="ann-toolbar__count-of">
              · {{ audienceFilterSummary }}
            </span>
          </p>
        </div>

        <AnnouncementCardList
          v-if="isNarrow"
          :rows="visibleAnnouncements"
          :loading="loading"
          :is-filtered="isFiltered"
          @edit="openEditDialog"
          @delete="openDeleteDialog"
          @clear-filters="clearFilters"
        />
        <AnnouncementTable
          v-else
          :rows="visibleAnnouncements"
          :loading="loading"
          :is-filtered="isFiltered"
          @edit="openEditDialog"
          @delete="openDeleteDialog"
          @clear-filters="clearFilters"
        />
      </section>
    </div>

    <AnnouncementEditDialog
      v-model="showDialog"
      :editing-announcement="editingAnnouncement"
      :saving="saving"
      :recipients="recipients"
      :loading-recipients="loadingRecipients"
      :recipients-error="recipientError"
      :payroll-group-options="payrollGroupOptions"
      :department-options="departmentOptions"
      :position-options="positions"
      :loading-filters="loadingFilters"
      :type-select-options="typeOptions"
      @save="saveAnnouncement"
      @toggle-target-everyone="onTargetEveryoneToggle"
      @recipient-filters="onRecipientFilters"
      @reload-recipients="retryRecipients"
    />

    <AnnouncementDeleteDialog
      v-model="showDeleteDialog"
      :announcement-title="announcementToDelete?.title || ''"
      :deleting="deleting"
      @confirm="confirmDeleteAction"
    />
  </PageShell>
</template>

<script setup>
import PageShell from '@/components/layout/PageShell.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useToast } from 'src/composables/useToast'
import {
  NO_COMPANY,
  targetsWereDropped,
  useAnnouncements,
} from '@/composables/page/useAnnouncements'
import { useCompany } from '@/composables/page/useCompany'
import { extractErrorMessage } from '@/composables/utils/http'
import { useCompanyStore } from '@/stores/company'
import { useRolesAndPositions } from '@/composables/page/useRolesAndPositions'
import { useAdminDepartments } from '@/composables/admin/useAdminDepartments'
import { useAdminPayrollGroups } from '@/composables/admin/useAdminPayrollGroups'
import AnnouncementTable from '@/components/pages/Announcement/AnnouncementTable.vue'
import AnnouncementCardList from '@/components/pages/Announcement/AnnouncementCardList.vue'
import AnnouncementEditDialog from '@/components/pages/Announcement/AnnouncementEditDialog.vue'
import AnnouncementDeleteDialog from '@/components/pages/Announcement/AnnouncementDeleteDialog.vue'
import {
  announcementState,
  audienceSummary,
  hasTargeting,
  typeMeta,
} from '@/components/pages/Announcement/announcementStatus'

const $q = useQuasar()
const toast = useToast()

// ─── Composables ──────────────────────────────────────────────────────────────
const {
  announcements,
  loading,
  saving,
  recipients,
  loadingRecipients,
  fetchAnnouncements,
  fetchRecipients,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = useAnnouncements()
const { company } = useCompany()
const companyStore = useCompanyStore()
// The position, role and employee lists were fetched by three page-local
// functions that hand-built `Authorization` headers and passed the raw
// `selectedCompany` JSON string as the `company` query param. These composables
// already do it correctly.
const { fetchPositions, fetchUserRoles } = useRolesAndPositions()
// Payroll groups and departments back the dialog's contract filters, which
// narrow the employee list an announcement can be addressed to.
const { fetchDepartments } = useAdminDepartments()
const { fetchPayrollGroups } = useAdminPayrollGroups()

// ─── UI state ─────────────────────────────────────────────────────────────────
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const editingAnnouncement = ref(null)
const announcementToDelete = ref(null)
const searchQuery = ref('')
const typeFilter = ref('all')
const statusFilter = ref('all')
/** The four server-side audience filters. Changing one refetches the board. */
const audienceFilter = ref({
  payrollGroupId: null,
  departmentId: null,
  positionId: null,
  payType: null,
})
const deleting = ref(false)
const loadError = ref('')
/** A failed employee fetch is reported inside the dialog, next to the empty
 *  picker it explains, rather than as a toast that has gone by the time anyone
 *  wonders why there is nobody to pick. */
const recipientError = ref('')

// ─── Lookup data ──────────────────────────────────────────────────────────────
/** Positions and roles are display-only now — `target_positions` and
 *  `target_roles` are not part of the create payload, but announcements saved
 *  before that was true still carry them, and the audience column has to name
 *  them. Positions double as the dialog's position filter. */
const positions = ref([])
const roles = ref([])
const departmentOptions = ref([])
const payrollGroupOptions = ref([])
const loadingLookups = ref(false)
const loadingFilterOptions = ref(false)
const loadingFilters = computed(() => loadingLookups.value || loadingFilterOptions.value)
/** Fetched once per visit: they back both the table's audience names and the
 *  dialog's filters. */
const lookupsRequested = ref(false)
const filterOptionsRequested = ref(false)

/**
 * Every employee any recipient fetch has returned, so the audience column can
 * still name someone who has since been filtered out of the picker's list.
 */
const users = ref([])
watch(recipients, (list) => {
  const byId = new Map(users.value.map((user) => [user.value, user]))
  for (const option of list || []) byId.set(option.value, option)
  users.value = [...byId.values()]
})

// The card list takes over from the table below 1024px, the same breakpoint the
// contributions page switches on.
const isNarrow = computed(() => $q.screen.lt.md)

const companyName = computed(() => company.value?.name || '')

const typeOptions = [
  { label: 'General', value: 'general' },
  { label: 'Urgent', value: 'urgent' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Policy', value: 'policy' },
]

const typeFilterOptions = [{ label: 'All types', value: 'all' }, ...typeOptions]

const payTypeOptions = [
  { label: 'Daily', value: 'daily' },
  { label: 'Monthly', value: 'monthly' },
]

const statusFilterOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Live', value: 'live' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Ended', value: 'ended' },
  { label: 'Inactive', value: 'inactive' },
]

// ─── Derived rows ─────────────────────────────────────────────────────────────
/**
 * Each row carries its resolved state, type palette and audience summary from
 * here, so the tiles, the filters and the row a person reads all agree on one
 * value instead of each component deriving its own.
 */
const decorated = computed(() => {
  const lookups = { positions: positions.value, roles: roles.value, users: users.value }
  return announcements.value.map((announcement) => ({
    ...announcement,
    _state: announcementState(announcement),
    _type: typeMeta(announcement.announcement_type),
    _audience: audienceSummary(announcement, lookups),
  }))
})

const counts = computed(() => {
  const tally = { live: 0, scheduled: 0, ended: 0, inactive: 0, urgent: 0, urgentLive: 0 }
  for (const row of decorated.value) {
    tally[row._state.key] = (tally[row._state.key] ?? 0) + 1
    if (row.announcement_type === 'urgent') {
      tally.urgent += 1
      if (row._state.key === 'live') tally.urgentLive += 1
    }
  }
  return tally
})

const headSummary = computed(() => {
  if (loading.value && !announcements.value.length) return 'Loading announcements…'
  if (!announcements.value.length) return 'Nothing posted yet'
  const parts = []
  parts.push(`${counts.value.live} live`)
  if (counts.value.scheduled > 0) parts.push(`${counts.value.scheduled} scheduled`)
  return parts.join(' · ')
})

/** Search, status and type are applied to the rows already in hand — they are
 *  the only ones the "of N" count can talk about. */
const isClientFiltered = computed(
  () => !!searchQuery.value?.trim() || typeFilter.value !== 'all' || statusFilter.value !== 'all',
)

const activeAudienceCount = computed(
  () => Object.values(audienceFilter.value).filter(Boolean).length,
)

const audienceFilterLabel = computed(() =>
  activeAudienceCount.value ? 'Audience' : 'Audience filters',
)

/** Named, not counted, so the row says which filter is hiding announcements. */
const audienceFilterSummary = computed(() => {
  const { payrollGroupId, departmentId, positionId, payType } = audienceFilter.value
  const parts = []
  if (payrollGroupId) parts.push(optionLabelFrom(payrollGroupOptions.value, payrollGroupId))
  if (departmentId) parts.push(optionLabelFrom(departmentOptions.value, departmentId))
  if (positionId) parts.push(optionLabelFrom(positions.value, positionId))
  if (payType) parts.push(payType === 'daily' ? 'Daily paid' : 'Monthly paid')
  return parts.join(' · ')
})

function optionLabelFrom(options, value) {
  return options.find((option) => option.value === value)?.label || `#${value}`
}

const isFiltered = computed(() => isClientFiltered.value || activeAudienceCount.value > 0)

const visibleAnnouncements = computed(() => {
  const term = (searchQuery.value || '').trim().toLowerCase()
  return decorated.value.filter((row) => {
    if (statusFilter.value !== 'all' && row._state.key !== statusFilter.value) return false
    if (typeFilter.value !== 'all' && row.announcement_type !== typeFilter.value) return false
    if (!term) return true
    return [row.title, row.message].some((field) =>
      String(field ?? '')
        .toLowerCase()
        .includes(term),
    )
  })
})

// ─── Data loading ─────────────────────────────────────────────────────────────
const loadAnnouncements = async () => {
  loadError.value = ''
  // Before the switcher has settled — first login, or a reload mid-hydration —
  // there is no company to scope to. Fetching anyway returned an unscoped board.
  if (!companyStore.companyId) {
    announcements.value = []
    loadError.value = 'Select a company to see its announcements'
    return
  }
  try {
    await fetchAnnouncements(audienceFilter.value)
    // Only worth the extra requests if some announcement actually names an
    // audience — on a board that only ever posts to everyone, the lists would
    // be fetched and never read.
    if (announcements.value.some(hasTargeting)) {
      loadLookups()
      if (announcements.value.some((row) => row.target_users?.length)) loadRecipients()
    }
  } catch (error) {
    loadError.value = extractErrorMessage(error, 'Failed to load announcements')
  }
}

/** Loads the position and role name lists once, in parallel. Safe to call
 *  repeatedly. */
const loadLookups = () => {
  if (lookupsRequested.value) return
  lookupsRequested.value = true

  loadingLookups.value = true
  Promise.allSettled([fetchPositions(), fetchUserRoles()])
    .then(([positionResult, roleResult]) => {
      if (positionResult.status === 'fulfilled') {
        positions.value = toOptions(
          positionResult.value,
          (item) => item.name || item.title || item.position_name,
        )
      } else {
        lookupsRequested.value = false
        notifyLookupFailure(positionResult.reason, 'positions')
      }
      if (roleResult.status === 'fulfilled') {
        roles.value = toOptions(
          roleResult.value,
          (item) => item.name || item.role_name || item.title,
        )
      } else {
        lookupsRequested.value = false
        notifyLookupFailure(roleResult.reason, 'roles')
      }
    })
    .finally(() => {
      loadingLookups.value = false
    })
}

/** Payroll groups and departments for the dialog's contract filters. Positions
 *  come from `loadLookups`, which the dialog needs anyway. */
const loadFilterOptions = () => {
  if (filterOptionsRequested.value) return
  filterOptionsRequested.value = true

  loadingFilterOptions.value = true
  Promise.allSettled([fetchPayrollGroups(), fetchDepartments()])
    .then(([groups, departments]) => {
      if (groups.status === 'fulfilled') {
        payrollGroupOptions.value = toOptions(groups.value, (item) => item.name)
      }
      if (departments.status === 'fulfilled') {
        departmentOptions.value = toOptions(departments.value, (item) => item.name)
      }
      // Both composables surface their own failure toast; the flag stays set so
      // a failed fetch is not retried on every interaction with the dialog.
    })
    .finally(() => {
      loadingFilterOptions.value = false
    })
}

/**
 * The employee list an announcement can be addressed to. Refetched whenever the
 * dialog's filters change — the backend does the filtering, so a payroll group
 * with 800 people never has to come down in full.
 */
let loadedRecipientKey = null
let lastRecipientFilters = {}

const loadRecipients = (filters = {}) => {
  const key = JSON.stringify([
    filters.payrollGroupId ?? '',
    filters.departmentId ?? '',
    filters.positionId ?? '',
    filters.payType ?? '',
  ])
  if (key === loadedRecipientKey) return
  loadedRecipientKey = key
  lastRecipientFilters = { ...filters }
  recipientError.value = ''

  fetchRecipients(filters).catch((error) => {
    loadedRecipientKey = null
    console.error('[AnnouncementPage] failed to load employees:', error)
    recipientError.value = extractErrorMessage(error, 'Could not load the employee list')
  })
}

const retryRecipients = () => {
  loadedRecipientKey = null
  loadRecipients(lastRecipientFilters)
}

/**
 * The positions and roles composables return `response.data.data ?? response.data`,
 * which is an array on some deployments and a paginated `{ results: [...] }`
 * envelope on others. Both shapes have to survive the mapping below.
 */
function toArray(value) {
  if (Array.isArray(value)) return value
  return value?.results ?? value?.data ?? []
}

function toOptions(list, labelOf) {
  return toArray(list)
    .map((item) => ({ value: item.id, label: labelOf(item) || `#${item.id}` }))
    .filter((option) => option.value !== undefined && option.value !== null)
}

function notifyLookupFailure(error, noun) {
  console.error(`[AnnouncementPage] failed to load ${noun}:`, error)
  toast.warning(`Could not load ${noun}`)
}

// ─── Dialogs ──────────────────────────────────────────────────────────────────
const openCreateDialog = () => {
  editingAnnouncement.value = null
  showDialog.value = true
}

/** Reachable for the first time in this pass — the table had no edit control,
 *  so `editingAnnouncement` was only ever set to null. */
const openEditDialog = (row) => {
  editingAnnouncement.value = row
  showDialog.value = true
}

const openDeleteDialog = (row) => {
  announcementToDelete.value = row
  showDeleteDialog.value = true
}

const onTargetEveryoneToggle = (targetEveryone) => {
  if (targetEveryone) return
  loadLookups()
  loadFilterOptions()
  loadRecipients()
}

const onRecipientFilters = (filters) => loadRecipients(filters)

const clearFilters = () => {
  searchQuery.value = ''
  typeFilter.value = 'all'
  statusFilter.value = 'all'
  resetAudienceFilters()
}

function resetAudienceFilters() {
  if (!activeAudienceCount.value) return
  audienceFilter.value = {
    payrollGroupId: null,
    departmentId: null,
    positionId: null,
    payType: null,
  }
}

/** The option lists are only worth fetching once someone reaches for them. */
const onAudienceMenuOpen = () => {
  loadLookups()
  loadFilterOptions()
}

// Server-side, so a change means a refetch rather than a recompute.
watch(audienceFilter, () => loadAnnouncements(), { deep: true })

/**
 * Switching workspace currently reloads the window, but the company also
 * arrives late on first login — the switcher fetches the list, then picks one,
 * by which time this page has already mounted and fetched nothing. Everything
 * held here is company-scoped, so all of it is dropped and refetched rather
 * than left to mix ids from two workspaces.
 */
watch(
  () => companyStore.companyId,
  (next, previous) => {
    if (next === previous) return

    announcements.value = []
    recipients.value = []
    users.value = []
    positions.value = []
    roles.value = []
    departmentOptions.value = []
    payrollGroupOptions.value = []
    lookupsRequested.value = false
    filterOptionsRequested.value = false
    loadedRecipientKey = null
    recipientError.value = ''
    showDialog.value = false
    editingAnnouncement.value = null

    // The audience filters hold ids belonging to the company being left. Their
    // own watcher does the refetch when it clears them; otherwise do it here.
    if (activeAudienceCount.value) resetAudienceFilters()
    else loadAnnouncements()
  },
)

// ─── Save (create or update) ──────────────────────────────────────────────────
const saveAnnouncement = async (form) => {
  try {
    const targetEveryone = form.target_everyone ?? true
    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      announcement_type:
        typeof form.announcement_type === 'object'
          ? form.announcement_type.value
          : form.announcement_type || 'general',
      is_active: form.is_active ?? true,
      target_everyone: targetEveryone,
    }

    if (form.start_at) payload.start_at = new Date(form.start_at).toISOString()
    if (form.end_at) payload.end_at = new Date(form.end_at).toISOString()

    // One targeting field, matching the create endpoint: user ids. The dialog's
    // payroll group / department / position / pay type selects filter the list
    // it offers, they are not sent.
    if (!targetEveryone) payload.target_users = form.target_users.map(idOf)

    if (form.attachments?.length) payload.attachments = form.attachments

    if (editingAnnouncement.value) {
      await updateAnnouncement(editingAnnouncement.value.id, payload)
      toast.success('Announcement updated')
    } else {
      const created = await createAnnouncement(payload)
      // A 201 with an empty `target_users` means it reached nobody. Saying
      // "Announcement posted" for that is worse than saying nothing.
      if (targetsWereDropped(payload, created)) {
        toast.warning('Posted, but the server recorded no recipients', {
          caption: 'The selected employees were not saved — see the console for the ids sent',
        })
      } else {
        toast.success('Announcement posted')
      }
    }

    showDialog.value = false
    await loadAnnouncements()
  } catch (error) {
    console.error('[AnnouncementPage] save failed:', error)
    toast.error(saveErrorMessage(error))
  }
}

const idOf = (value) => (typeof value === 'object' ? (value?.id ?? value?.value) : value)

// ─── Delete ───────────────────────────────────────────────────────────────────
const confirmDeleteAction = async () => {
  if (!announcementToDelete.value) return
  deleting.value = true
  try {
    await deleteAnnouncement(announcementToDelete.value.id)
    toast.success('Announcement deleted')
    showDeleteDialog.value = false
    announcementToDelete.value = null
    await loadAnnouncements()
  } catch (error) {
    console.error('[AnnouncementPage] delete failed:', error)
    toast.error(extractErrorMessage(error, 'Failed to delete announcement'))
  } finally {
    deleting.value = false
  }
}

// ─── Errors ───────────────────────────────────────────────────────────────────
/**
 * `extractErrorMessage` already reads DRF's `{ field: ["message"] }` shape,
 * prefers a named key over a positional one, and refuses an HTML error page —
 * everything the hand-rolled version here used to do, and the markup guard it
 * only half did. All this adds is the one refusal the server never sees, since
 * it is raised before the request goes out.
 */
function saveErrorMessage(error) {
  if (error?.message === NO_COMPANY) return 'Select a company before posting an announcement'
  return extractErrorMessage(error, 'Failed to save announcement')
}

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(loadAnnouncements)
</script>

<style scoped>
.ann-page {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

/* ── Header ── */
.ann-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.ann-head__titles {
  min-width: 0;
}

.ann-head__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.2;
  color: var(--dash-ink);
}

/* Every page header in the app carries the same title metrics, including the
   one step down at tablet width. See EmployeesPage's .emp-head__title. */
@media (max-width: 1023px) {
  .ann-head__title {
    font-size: 20px;
  }
}

.ann-head__sub {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0 6px;
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

.ann-head__dot {
  color: var(--dash-n-300);
}

.ann-head__live {
  color: var(--dash-good);
  font-weight: 500;
}

.ann-head__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.ann-head__refresh {
  width: 36px;
  height: 36px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  color: var(--dash-ink-3);
}
.ann-head__refresh:hover {
  color: var(--dash-ink);
  border-color: var(--dash-line-strong);
}

/* The one filled control on the page, so the primary move is unambiguous. */
.ann-head__cta {
  height: 36px;
  padding: 0 14px;
  border-radius: var(--dash-r-md);
  background: var(--dash-brand);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.005em;
}
.ann-head__cta:hover {
  background: #193d5c;
}

/* ── Error ── */
.ann-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 14px;
  border-radius: var(--dash-r-lg);
  background: var(--dash-critical-bg);
  border: 1px solid var(--dash-critical-line);
}
.ann-alert__icon {
  color: var(--dash-critical-mark);
  flex-shrink: 0;
}
.ann-alert__text {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 13px;
  color: var(--dash-critical);
}
.ann-alert__btn {
  color: var(--dash-critical);
  font-weight: 600;
  padding: 0 8px;
}

/* ── Board surface ── */
.ann-surface {
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  box-shadow: var(--dash-shadow-xs);
  overflow: hidden;
}

.ann-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 56px;
  padding: 10px 14px;
  background: var(--dash-n-25);
  border-bottom: 1px solid var(--dash-line);
}

.ann-toolbar__search {
  flex: 1 1 200px;
  min-width: 0;
  max-width: 300px;
}
.ann-toolbar__search :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.ann-toolbar__search :deep(.q-field__native) {
  font-size: 13px;
  color: var(--dash-ink);
}
.ann-toolbar__search :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

.ann-toolbar__filter {
  width: 150px;
  flex-shrink: 0;
}
.ann-toolbar__filter :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  padding: 0 8px 0 10px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.ann-toolbar__filter :deep(.q-field__native) {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink);
  padding: 0;
  min-height: 34px;
}
.ann-toolbar__filter :deep(.q-field__marginal) {
  height: 34px;
  min-width: 0;
  padding: 0;
  color: var(--dash-ink-4);
}
.ann-toolbar__filter :deep(.q-field__prepend) {
  padding-right: 7px;
}
.ann-toolbar__filter :deep(.q-field__append) {
  padding-left: 2px;
}

/* ── Audience filter button ──
   Same height and hairline as the two selects beside it, so the band reads as
   one row of controls rather than a button bolted onto two fields. */
.ann-toolbar__more {
  height: 34px;
  padding: 0 11px;
  flex-shrink: 0;
  border: 1px solid var(--dash-line-strong);
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
  color: var(--dash-ink-2);
  font-size: 12.5px;
  font-weight: 500;
}
.ann-toolbar__more :deep(.q-icon) {
  font-size: 16px;
}
.ann-toolbar__more:hover {
  color: var(--dash-ink);
  border-color: var(--dash-ink-4);
}
.ann-toolbar__more.is-on {
  border-color: var(--dash-accent);
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
}
.ann-toolbar__badge {
  top: -5px;
  right: -5px;
  padding: 1px 5px;
  min-height: 0;
  background: var(--dash-accent);
  color: #ffffff;
  font-size: 10px;
  font-weight: 600;
  border-radius: 999px;
}

.ann-more__panel {
  display: flex;
  flex-direction: column;
  gap: 11px;
  width: 240px;
  padding: 13px;
  background: var(--dash-surface);
}
.ann-more__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.ann-more__title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dash-ink);
}
.ann-more__reset {
  margin-left: auto;
  padding: 0;
  background: none;
  border: 0;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dash-accent);
  cursor: pointer;
}
.ann-more__reset:hover {
  text-decoration: underline;
}
.ann-more__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ann-more__label {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dash-ink-3);
}
.ann-more__field :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
}
.ann-more__field :deep(.q-field__native) {
  font-size: 12.5px;
  color: var(--dash-ink);
  min-height: 34px;
}
.ann-more__field :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

.ann-toolbar__count {
  margin: 0 0 0 auto;
  padding-left: 8px;
  font-size: 12.5px;
  color: var(--dash-ink-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.ann-toolbar__count strong {
  color: var(--dash-ink);
  font-weight: 600;
}
.ann-toolbar__count-of {
  color: var(--dash-ink-4);
}

/* ── Laptop ──
   Two filters plus a search field and a count is more than fits on one line at
   this width once the sidebar takes its share; the count wraps under. */
@media (max-width: 1279px) {
  .ann-toolbar {
    flex-wrap: wrap;
  }
  .ann-toolbar__search {
    max-width: none;
  }
}

/* ── Tablet ── */
@media (max-width: 1023px) {
  .ann-head {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .ann-head__actions {
    justify-content: flex-end;
  }
  .ann-toolbar {
    padding: 10px 12px;
  }
  .ann-toolbar__filter {
    flex: 1 1 140px;
    width: auto;
  }
  .ann-toolbar__count {
    width: 100%;
    margin: 0;
    padding-left: 0;
  }
}

@media (max-width: 599px) {
  .ann-head__cta {
    flex: 1;
  }
  .ann-toolbar__search,
  .ann-toolbar__filter,
  .ann-toolbar__more {
    flex: 1 1 100%;
  }
}
</style>
