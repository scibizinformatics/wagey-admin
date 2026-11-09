<template>
  <PageShell>
    <div class="dv-page">
      <!-- ── Page header ─────────────────────────────────────────────────── -->
      <header class="dv-head">
        <div class="dv-head__titles">
          <h1 class="dv-head__title">Devices</h1>
          <p class="dv-head__sub">{{ headerSummary }}</p>
        </div>

        <div class="dv-head__actions">
          <q-btn
            flat
            round
            icon="refresh"
            class="dv-head__refresh"
            :loading="loading"
            aria-label="Refresh devices"
            @click="refresh"
          >
            <q-tooltip>Refresh</q-tooltip>
          </q-btn>
        </div>
      </header>

      <!-- ── Error ───────────────────────────────────────────────────────── -->
      <div v-if="error" class="dv-alert" role="alert">
        <q-icon name="o_error" size="18px" class="dv-alert__icon" />
        <p class="dv-alert__text">{{ error }}</p>
        <q-btn
          flat
          dense
          no-caps
          size="12px"
          label="Retry"
          class="dv-alert__btn"
          @click="refresh"
        />
        <q-btn
          flat
          dense
          round
          size="sm"
          icon="close"
          aria-label="Dismiss"
          class="dv-alert__close"
          @click="clearError"
        />
      </div>

      <!-- ── Roll ────────────────────────────────────────────────────────── -->
      <section class="dash-panel dv-panel">
        <div class="dv-toolbar">
          <q-input
            ref="searchRef"
            v-model="search"
            placeholder="Search employee, device or UUID"
            dense
            outlined
            clearable
            hide-bottom-space
            debounce="200"
            class="dv-toolbar__search dash-field"
            aria-label="Search devices"
            @update:model-value="page = 1"
          >
            <template v-slot:prepend>
              <q-icon name="search" size="18px" />
            </template>
          </q-input>

          <q-select
            :model-value="statusFilter"
            :options="STATUS_FILTERS"
            emit-value
            map-options
            dense
            outlined
            hide-bottom-space
            popup-content-class="dash-popup"
            class="dv-toolbar__filter dash-field"
            aria-label="Filter by status"
            @update:model-value="onStatusFilter"
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
            class="dv-toolbar__filter dv-toolbar__filter--sort dash-field"
            aria-label="Sort devices"
            @update:model-value="page = 1"
          >
            <template v-slot:prepend>
              <q-icon name="o_swap_vert" size="16px" />
            </template>
          </q-select>

          <p class="dv-toolbar__count">
            <strong>{{ filteredRows.length.toLocaleString() }}</strong>
            {{ filteredRows.length === 1 ? 'device' : 'devices' }}
            <span v-if="isFiltered" class="dv-toolbar__count-of">
              of {{ devices.length.toLocaleString() }}
            </span>
          </p>
        </div>

        <!-- Cards below 1024px, table above — the same threshold the Access
             Cards and Audit pages switch on. -->
        <DeviceCardList
          v-if="$q.screen.lt.md"
          :rows="displayRows"
          :loading="loading"
          :is-filtered="isFiltered"
          @copy="copyUuid"
          @action="onRowAction"
          @clear-filters="clearFilters"
        />
        <DeviceTable
          v-else
          :rows="displayRows"
          :loading="loading"
          :is-filtered="isFiltered"
          @copy="copyUuid"
          @action="onRowAction"
          @clear-filters="clearFilters"
        />

        <footer v-if="!loading && filteredRows.length" class="dv-foot">
          <div class="dv-foot__left">
            <span class="dv-foot__range dash-num">
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
              class="dv-foot__size dash-field"
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
            class="dv-pager"
          />
        </footer>
      </section>
    </div>

    <DeviceDetailDialog
      v-model="showDetail"
      :row="selectedDevice"
      :avatar="selectedAvatar"
      :deactivating="deactivating"
      @copy="copyUuid"
      @deactivate="requestDeactivate"
    />

    <!-- The one thing in this feature that writes a device. The reason is
         required, so it is a bespoke dialog rather than ConfirmDialog — the
         gate, word for word, that PayslipRejectDialog established. -->
    <DeviceDeactivateDialog
      v-model="showDeactivate"
      :device="pendingDevice"
      :loading="deactivating"
      @confirm="commitDeactivate"
    />
  </PageShell>
</template>

<script setup>
/**
 * DEVICES
 * ----------------------------------------------------------------------------
 * The phones and browsers employees sign in to the Wagey app on, and whether
 * each one is still in use.
 *
 * The page reads one endpoint and writes one. Everything a row displays — the
 * owner, the type, the registered and last-seen instants, the deactivation
 * reason and its stamp — is in the list payload, so there is no second fetch
 * behind the detail dialog and no enrichment pass. The roster is the one
 * borrowed read, wanted only for the faces beside each owner, and it is joined
 * on `employee_id` — a uuid, which unlike the card roll names a row's person
 * without touching names at all.
 *
 * Deactivation is the single write, and it is **one-way**: no reactivate verb,
 * because only registering again from the app brings a device back. It carries
 * a reason, which makes it the same shape as rejecting a payslip dispute — a
 * decision that must collect input — so it wears the bespoke-gate pattern that
 * `PayslipRejectDialog` established rather than the slotless `ConfirmDialog`.
 *
 * Filtering, sorting and paging all happen here, in that order, over the
 * complete roll. That order is the point: "last seen first" has to mean the
 * newest report there is, not the newest on the page you happen to be looking
 * at, so the slice is always taken last.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useQuasar, copyToClipboard } from 'quasar'
import PageShell from '@/components/layout/PageShell.vue'
import DeviceTable from '@/components/pages/Devices/DeviceTable.vue'
import DeviceCardList from '@/components/pages/Devices/DeviceCardList.vue'
import DeviceDetailDialog from '@/components/pages/Devices/DeviceDetailDialog.vue'
import DeviceDeactivateDialog from '@/components/pages/Devices/DeviceDeactivateDialog.vue'
import { useDevices } from 'src/composables/page/useDevices'
import { useCompany } from 'src/composables/page/useCompany'
import { useEmployees } from 'src/composables/page/useEmployees'
import { useToast } from 'src/composables/useToast'
import { useLoadedToast } from 'src/composables/useLoadedToast'
import { extractErrorMessage } from 'src/composables/utils/http'
import {
  SORT_OPTIONS,
  SORTS,
  STATUS_FILTERS,
  deactivateReasonLabel,
  matchesSearch,
  matchesStatus,
  summarizeDevices,
} from 'src/composables/utils/devices'
import {
  avatarFor,
  buildEmployeeNameIndex,
  getAvatarColor,
  getFullName,
  getInitials,
} from 'src/composables/utils/employee'

const $q = useQuasar()
const toast = useToast()
const { notifyLoaded } = useLoadedToast()
const { companyId } = useCompany()

const { devices, loading, deactivating, error, deactivateDevice, fetchDevices, clearError, reset } =
  useDevices()

// The faces beside each owner. It runs alongside the roll rather than before
// it: a device's owner name is in the device payload, so the table is complete
// without this and waiting on it would delay the page for decoration. A
// failure is swallowed — the avatars stay as initials, which is decoration
// lost, not data lost.
const { employees, fetchEmployees } = useEmployees()

const searchRef = ref(null)

// ─── Filters ──────────────────────────────────────────────────────────────────
const search = ref('')
const statusFilter = ref('all')
const sortBy = ref('lastSeen')

const isFiltered = computed(
  () => Boolean((search.value || '').trim()) || statusFilter.value !== 'all',
)

const filteredRows = computed(() => {
  const term = (search.value || '').trim().toLowerCase()

  const narrowed = devices.value.filter((device) => {
    if (!matchesStatus(device, statusFilter.value)) return false
    return matchesSearch(device, term)
  })

  // Sorted after filtering and before the page slice below. `filter` already
  // returned a new array, so this sorts a copy and never mutates what the
  // composable published.
  return narrowed.sort(SORTS[sortBy.value] ?? SORTS.lastSeen)
})

function clearFilters() {
  search.value = ''
  statusFilter.value = 'all'
  page.value = 1
}

/** Any filter change returns to page 1 — narrowing forty devices to three while
 *  sitting on page 4 would otherwise show an empty table. */
function onStatusFilter(value) {
  statusFilter.value = value
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
// that returns fewer devices, say.
watch(totalPages, (max) => {
  if (page.value > max) page.value = max
})

// ─── Employees ────────────────────────────────────────────────────────────────

/** Name to employee record — the fallback join, used only when a device row
 *  arrives without the uuid. Ambiguous names resolve to null there, so the
 *  wrong photograph is never shown. */
const employeeIndex = computed(() => buildEmployeeNameIndex(employees.value))

/**
 * UUID to employee record — the primary join. `employee_id` on a device row is
 * a uuid the roster carries too, so this names a person without any name being
 * shared, and a uuid cannot be ambiguous: first wins, and if the backend ever
 * sends two records under one uuid that is its bug to say.
 */
const employeeIdIndex = computed(() => {
  const index = new Map()
  for (const employee of employees.value) {
    // `emp.uuid || emp.id` is the same pairing the Access Cards assign dialog
    // reads, because a roster record carries one or the other.
    const uuid = employee.uuid || employee.id
    if (uuid == null) continue
    const key = String(uuid)
    if (!index.has(key)) index.set(key, employee)
  }
  return index
})

function avatarForDevice(device) {
  const record = device.employeeUuid ? employeeIdIndex.value.get(device.employeeUuid) : null
  if (record) {
    const name = getFullName(record) || device.employeeName
    return {
      pictureUrl: record.user?.picture_url || '',
      initials: getInitials(name),
      color: getAvatarColor(name),
    }
  }
  return avatarFor(employeeIndex.value, device.employeeName)
}

/**
 * The page slice with a face attached, which is what both renderers read.
 *
 * Decorated here rather than at normalisation time for the reason the audit
 * trail does it: the roll can render before the roster has landed, and only the
 * rows actually on screen are touched.
 */
const displayRows = computed(() =>
  pagedRows.value.map((device) => ({
    ...device,
    avatar: avatarForDevice(device),
  })),
)

// ─── Header ───────────────────────────────────────────────────────────────────
const headerSummary = computed(() => {
  if (loading.value && !devices.value.length) return 'Loading devices…'
  if (!devices.value.length) return 'Devices registered to employees in this workspace'
  const { total, active, deactivated, unknown } = summarizeDevices(devices.value)
  const noun = total === 1 ? 'device' : 'devices'
  const notActive = deactivated + unknown
  const tail = notActive ? `${active} active · ${notActive} deactivated` : 'all active'
  return `${total.toLocaleString()} ${noun} · ${tail}`
})

// ─── Detail ───────────────────────────────────────────────────────────────────
const showDetail = ref(false)

/**
 * The dialog edits *the selected key* rather than holding a copy: the list row
 * is live, so a deactivation that refetches underneath the open dialog is
 * reflected the moment it lands, instead of leaving a green chip behind a toast
 * that said otherwise.
 */
const selectedKey = ref(null)
const selectedDevice = computed(
  () => devices.value.find((device) => device.key === selectedKey.value) ?? null,
)

const selectedAvatar = computed(() =>
  selectedDevice.value ? avatarForDevice(selectedDevice.value) : null,
)

function openDetail(device) {
  if (!device) return
  selectedKey.value = device.key
  showDetail.value = true
}

// ─── Deactivation ─────────────────────────────────────────────────────────────
const showDeactivate = ref(false)

/**
 * The write frozen inside the gate.
 *
 * Snapshotted at the moment the dialog opens rather than read off the row when
 * Confirm is pressed: the row underneath is live — a refetch while the gate is
 * open can replace it — and a write that re-read its subject could name a
 * device other than the one the reader was asked about.
 */
const pendingDevice = ref(null)

/**
 * First step of a deactivation: open the gate. Nothing is written here —
 * mirroring the status confirms on Access Cards, for the same reason: this verb
 * decides which device an employee's attendance is recorded against.
 */
function requestDeactivate(device) {
  if (!device) return
  // A second open while the first write is in flight, or a click on a menu
  // while the gate is up, would swap the subject under the dialog.
  if (deactivating.value || showDeactivate.value) return

  showDetail.value = false
  pendingDevice.value = device
  showDeactivate.value = true
}

/**
 * The confirmed deactivation.
 *
 * Reads only `pendingDevice`, never the row, so it deactivates exactly what the
 * gate described. The refetch is unconditional: a write that reported failure
 * may still have landed, and the list is the only thing that can say what the
 * device now states. On failure the gate stays open with the reason intact —
 * the contract ConfirmCard's `action` keeps — and only success closes it.
 */
async function commitDeactivate(reason) {
  const pending = pendingDevice.value
  if (!pending || deactivating.value) return

  const name = pending.deviceName || 'Unnamed device'
  const owner = pending.employeeName || 'Unknown employee'

  try {
    await deactivateDevice(pending.deviceUuid, reason)
    showDeactivate.value = false
    pendingDevice.value = null
    toast.success('Device deactivated', {
      caption: `${name} · ${owner} · ${deactivateReasonLabel(reason)}`,
      timeout: 3000,
    })
  } catch (err) {
    toast.error(extractErrorMessage(err, 'Failed to deactivate this device'), { timeout: 8000 })
  } finally {
    await fetchDevices()
  }
}

// Cancelling the gate drops its snapshot, so a half-decided device cannot be
// resubmitted by muscle memory against the next one the dialog opens on.
watch(showDeactivate, (open) => {
  if (!open) pendingDevice.value = null
})

// ─── Actions ──────────────────────────────────────────────────────────────────
function onRowAction(device, key) {
  if (key === 'view') openDetail(device)
  else if (key === 'deactivate') requestDeactivate(device)
  // The actions come from `deviceActionsFor`, so this is only reachable if the
  // vocabulary and a renderer drift apart — said in the console, not as a toast
  // somebody has to dismiss.
  else console.warn(`[Devices] unknown row action "${key}"`)
}

async function copyUuid(device) {
  if (!device?.deviceUuid) return
  try {
    // The raw uuid, not anything displayed — what gets pasted into a ticket or
    // a server log has to be the value the server keyed the device by.
    await copyToClipboard(device.deviceUuid)
    toast.success('Device UUID copied', { caption: device.deviceUuid, timeout: 2000 })
  } catch {
    toast.error('Could not copy the device UUID')
  }
}

// ─── Load ─────────────────────────────────────────────────────────────────────
/**
 * The roster, wanted only for the faces. Deliberately quiet: it raises no
 * "loaded" toast of its own and swallows its failures, because the devices are
 * complete without it — an error here would report a problem the reader cannot
 * act on.
 */
async function loadRoster() {
  try {
    await fetchEmployees()
  } catch {
    // Initials it is.
  }
}

async function load() {
  const [loaded] = await Promise.all([fetchDevices(), loadRoster()])
  notifyLoaded('Devices', loaded.length, { noun: 'device' })
}

function refresh() {
  clearError()
  load()
}

// ─── Company scoping ──────────────────────────────────────────────────────────
watch(companyId, (next, previous) => {
  if (next === previous) return
  reset()
  clearFilters()
  showDetail.value = false
  // A write frozen against a device from the workspace being left is the one
  // dialog that must not survive the switch: Confirm would patch a uuid
  // belonging to somebody else. `reset()` above drops the write flag with the
  // devices.
  showDeactivate.value = false
  pendingDevice.value = null
  selectedKey.value = null
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
.dv-page {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

/* ── Page header ── */
.dv-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.dv-head__titles {
  min-width: 0;
}

.dv-head__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--dash-ink);
  line-height: 1.2;
}

.dv-head__sub {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

.dv-head__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* The bordered round refresh the Access Cards header uses — no filled CTA,
   because there is no action a person takes here that the row menu cannot. */
.dv-head__refresh {
  width: 36px;
  height: 36px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  color: var(--dash-ink-3);
}
.dv-head__refresh:hover {
  color: var(--dash-ink);
  border-color: var(--dash-line-strong);
}

/* ── Error ── */
.dv-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 14px;
  border-radius: var(--dash-r-lg);
  background: var(--dash-critical-bg);
  border: 1px solid var(--dash-critical-line);
}
.dv-alert__icon {
  color: var(--dash-critical-mark);
  flex-shrink: 0;
}
.dv-alert__text {
  flex: 1;
  margin: 0;
  min-width: 0;
  font-size: 13px;
  color: var(--dash-critical);
}
.dv-alert__btn {
  color: var(--dash-critical);
  font-weight: 600;
  padding: 0 8px;
}
.dv-alert__close {
  color: var(--dash-critical);
}

/* ── Panel ── */
.dv-panel {
  /* Clipped so the last row and the footer cannot paint square over the panel's
     bottom radius. */
  overflow: hidden;
}

/* ── Toolbar ── */
.dv-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--dash-line);
  flex-wrap: wrap;
}

.dv-toolbar__search {
  flex: 1 1 200px;
  min-width: 0;
  max-width: 300px;
}
.dv-toolbar__search :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.dv-toolbar__search :deep(.q-field__native) {
  font-size: 13px;
  color: var(--dash-ink);
}
.dv-toolbar__search :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

.dv-toolbar__filter {
  width: 168px;
  flex-shrink: 0;
}
.dv-toolbar__filter--sort {
  width: 190px;
}
.dv-toolbar__filter :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.dv-toolbar__filter :deep(.q-field__native) {
  font-size: 12.5px;
  color: var(--dash-ink);
  min-height: 34px;
  padding: 0;
}
.dv-toolbar__filter :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

.dv-toolbar__count {
  margin: 0 0 0 auto;
  font-size: 12px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}
.dv-toolbar__count strong {
  color: var(--dash-ink);
  font-weight: 600;
}
.dv-toolbar__count-of {
  color: var(--dash-ink-4);
}

/* ── Footer ── */
.dv-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 16px;
  border-top: 1px solid var(--dash-line);
}

.dv-foot__left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dv-foot__range {
  font-size: 12px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}

.dv-foot__size {
  width: 140px;
}
.dv-foot__size :deep(.q-field__control) {
  height: 32px;
  min-height: 32px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.dv-foot__size :deep(.q-field__native) {
  font-size: 12px;
  color: var(--dash-ink-2);
  min-height: 32px;
  padding: 0;
}
.dv-foot__size :deep(.q-field__marginal) {
  height: 32px;
  color: var(--dash-ink-4);
}

.dv-pager :deep(.q-btn) {
  color: var(--dash-ink-3);
  font-weight: 500;
}
.dv-pager :deep(.q-btn--active) {
  color: var(--dash-accent);
  background: var(--dash-accent-bg);
}

@media (max-width: 1023px) {
  .dv-head__title {
    font-size: 20px;
  }
  .dv-head__actions {
    justify-content: flex-end;
  }
  .dv-toolbar {
    padding: 10px 12px;
  }
  .dv-toolbar__search {
    max-width: none;
  }
  .dv-toolbar__count {
    margin-left: 0;
  }
  .dv-foot {
    padding: 10px 12px;
  }
}
</style>
