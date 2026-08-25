<template>
  <PageShell>
    <div class="inv-page">
      <!-- ── Page header ───────────────────────────────────────────────────
           Title and summary sit out on the canvas rather than inside the card,
           matching the rest of the redesigned pages: the card holds the queue,
           the canvas says what the queue is. -->
      <header class="inv-head">
        <div class="inv-head__titles">
          <h1 class="inv-head__title">Invitations</h1>
          <p class="inv-head__sub">
            <template v-if="companyName">
              <span>{{ companyName }}</span>
              <span class="inv-head__dot" aria-hidden="true">·</span>
            </template>
            <span :class="{ 'inv-head__waiting': pendingCount > 0 }">{{ pendingSummary }}</span>
          </p>
        </div>

        <div class="inv-head__actions">
          <q-btn
            flat
            round
            icon="refresh"
            class="inv-head__refresh"
            :loading="loading"
            aria-label="Refresh invitations"
            @click="loadInvitations"
          >
            <q-tooltip>Refresh</q-tooltip>
          </q-btn>
          <q-btn
            unelevated
            no-caps
            icon="add"
            label="Invite employee"
            class="inv-head__cta"
            @click="openInviteModal"
          />
        </div>
      </header>

      <!-- ── Error ─────────────────────────────────────────────────────────
           One line in the critical tone with a retry, rather than a banner with
           an avatar slot — the message is never longer than a sentence. -->
      <div v-if="loadError" class="inv-alert" role="alert">
        <q-icon name="o_error" size="18px" class="inv-alert__icon" />
        <p class="inv-alert__text">{{ loadError }}</p>
        <q-btn
          flat
          dense
          no-caps
          size="12px"
          label="Retry"
          class="inv-alert__btn"
          @click="loadInvitations"
        />
      </div>

      <!-- ── Queue ─────────────────────────────────────────────────────────
           Toolbar band, then the table on laptops and up, then the card list
           below 1024px where seven columns would have scrolled sideways. -->
      <section class="inv-surface">
        <div class="inv-toolbar">
          <q-input
            v-model="searchTerm"
            placeholder="Search email, role or code"
            dense
            outlined
            clearable
            hide-bottom-space
            class="inv-toolbar__search dash-field"
            aria-label="Search invitations"
          >
            <template v-slot:prepend>
              <q-icon name="search" size="18px" />
            </template>
          </q-input>

          <q-select
            v-model="statusFilter"
            :options="statusOptions"
            emit-value
            map-options
            dense
            outlined
            hide-bottom-space
            popup-content-class="dash-popup"
            class="inv-toolbar__filter dash-field"
            aria-label="Filter by status"
          >
            <template v-slot:prepend>
              <q-icon name="o_filter_alt" size="16px" />
            </template>
          </q-select>

          <p class="inv-toolbar__count">
            <strong>{{ visibleInvites.length }}</strong>
            {{ visibleInvites.length === 1 ? 'invitation' : 'invitations' }}
            <span v-if="isFiltered" class="inv-toolbar__count-of">of {{ invites.length }}</span>
          </p>
        </div>

        <InviteCardList
          v-if="isNarrow"
          :rows="visibleInvites"
          :loading="loading"
          :is-filtered="isFiltered"
          @view="openViewModal"
          @copy="copyCode"
          @clear-filters="clearFilters"
        />
        <InviteTable
          v-else
          :rows="visibleInvites"
          :loading="loading"
          :is-filtered="isFiltered"
          :company-fallback="companyName || '—'"
          @view="openViewModal"
          @copy="copyCode"
          @clear-filters="clearFilters"
        />
      </section>
    </div>

    <InviteInviteModal
      v-model="showInviteModal"
      :user-role-options="userRoleOptions"
      :loading-roles="loadingRoles"
      :saving="saving"
      @send="sendInvitation"
    />

    <InviteViewModal v-model="showViewModal" :invitation="selectedInvitation" @copy="copyCode" />

    <InviteSuccessDialog
      v-model="showSuccessDialog"
      :sent-to-email="sentToEmail"
      @send-another="sendAnother"
    />
  </PageShell>
</template>

<script setup>
import PageShell from '@/components/layout/PageShell.vue'
import { computed, onMounted, ref } from 'vue'
import { useQuasar, copyToClipboard } from 'quasar'
import { useInvites } from '@/composables/page/useInvites'
import { useCompany } from '@/composables/page/useCompany'
import InviteTable from '@/components/pages/Invite/InviteTable.vue'
import InviteCardList from '@/components/pages/Invite/InviteCardList.vue'
import InviteInviteModal from '@/components/pages/Invite/InviteInviteModal.vue'
import InviteViewModal from '@/components/pages/Invite/InviteViewModal.vue'
import InviteSuccessDialog from '@/components/pages/Invite/InviteSuccessDialog.vue'
import { inviteState, roleLabel } from '@/components/pages/Invite/inviteStatus'

const $q = useQuasar()

// ─── Composables ──────────────────────────────────────────────────────────────
const { invites, loading, saving, fetchInvites, sendInvite, fetchUserRoles } = useInvites()
const { company, companyId } = useCompany()

// ─── UI state ─────────────────────────────────────────────────────────────────
const showInviteModal = ref(false)
const showViewModal = ref(false)
const showSuccessDialog = ref(false)
const sentToEmail = ref('')
const searchTerm = ref('')
const statusFilter = ref('all')
const selectedInvitation = ref(null)
const loadError = ref('')

// ─── Roles state (local to this page) ────────────────────────────────────────
const userRoleOptions = ref([])
const loadingRoles = ref(false)

// The card list takes over from the table below 1024px, the same breakpoint the
// contributions page switches on.
const isNarrow = computed(() => $q.screen.lt.md)

const companyName = computed(() => company.value?.name || '')

const statusOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Expiring soon', value: 'expiring' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Expired', value: 'expired' },
]

// ─── Derived rows ─────────────────────────────────────────────────────────────
/**
 * Each invite carries its resolved lifecycle state and role name from here, so
 * the tiles, the filter and the row a person reads all agree on one value
 * instead of three components deriving it separately.
 */
const decorated = computed(() =>
  invites.value.map((invite) => ({
    ...invite,
    _state: inviteState(invite),
    _role: roleLabel(invite.role ?? invite.user_role, userRoleOptions.value),
  })),
)

const counts = computed(() => {
  const tally = { accepted: 0, pending: 0, expiring: 0, expired: 0 }
  for (const row of decorated.value) {
    const key = row._state.key
    if (key === 'accepted') tally.accepted += 1
    // "Awaiting acceptance" counts both quiet and expiring invites — they are
    // the same outstanding work; `expiring` is reported alongside as its subset.
    else if (key === 'pending') tally.pending += 1
    else if (key === 'expiring') {
      tally.pending += 1
      tally.expiring += 1
    } else if (key === 'expired' || key === 'cancelled' || key === 'declined') tally.expired += 1
  }
  return tally
})

const pendingCount = computed(() => counts.value.pending)

const pendingSummary = computed(() => {
  if (loading.value && !invites.value.length) return 'Loading invitations…'
  if (!invites.value.length) return 'No invitations sent yet'
  if (pendingCount.value === 0) return 'Every invitation has been answered'
  const noun = pendingCount.value === 1 ? 'invitation' : 'invitations'
  return `${pendingCount.value} ${noun} awaiting acceptance`
})

const isFiltered = computed(() => !!searchTerm.value?.trim() || statusFilter.value !== 'all')

const visibleInvites = computed(() => {
  const term = (searchTerm.value || '').trim().toLowerCase()
  return decorated.value.filter((row) => {
    if (statusFilter.value !== 'all' && row._state.key !== statusFilter.value) return false
    if (!term) return true
    return [row.email, row.company, row._role, row.code, row._state.label].some((field) =>
      String(field ?? '')
        .toLowerCase()
        .includes(term),
    )
  })
})

// ─── Data loading ─────────────────────────────────────────────────────────────
const loadInvitations = async () => {
  loadError.value = ''
  try {
    await fetchInvites()
  } catch (error) {
    loadError.value = errorMessage(error, 'Failed to load invitations')
  }
}

const loadUserRoles = async () => {
  try {
    loadingRoles.value = true
    const rolesRaw = await fetchUserRoles()
    userRoleOptions.value = rolesRaw
      .map((r) => ({
        label: r.name || r.role_name || r.title || `Role ${r.id}`,
        value: Number(r.id) || Number(r.role_id) || null,
      }))
      .filter((o) => o.value !== null)
  } catch (error) {
    userRoleOptions.value = []
    $q.notify({
      type: 'negative',
      message: errorMessage(error, 'Failed to load roles'),
      position: 'top',
      timeout: 4000,
    })
  } finally {
    loadingRoles.value = false
  }
}

// ─── Row actions ──────────────────────────────────────────────────────────────
const openViewModal = (row) => {
  selectedInvitation.value = row
  showViewModal.value = true
}

const copyCode = async (row) => {
  if (!row?.code) return
  try {
    await copyToClipboard(row.code)
    $q.notify({
      type: 'positive',
      message: `Join code ${row.code} copied`,
      position: 'top',
      timeout: 2000,
    })
  } catch {
    $q.notify({ type: 'negative', message: 'Could not copy the code', position: 'top' })
  }
}

const clearFilters = () => {
  searchTerm.value = ''
  statusFilter.value = 'all'
}

// ─── Send ─────────────────────────────────────────────────────────────────────
const openInviteModal = () => {
  showInviteModal.value = true
}

const sendAnother = () => {
  showSuccessDialog.value = false
  showInviteModal.value = true
}

const sendInvitation = async (formData) => {
  try {
    const payload = {
      emails: [formData.email],
      user_role: Number(formData.user_role),
      company_id: Number(companyId.value),
    }

    await sendInvite(payload)

    sentToEmail.value = formData.email
    showInviteModal.value = false
    showSuccessDialog.value = true

    await loadInvitations()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: errorMessage(error, 'Failed to send invitation'),
      position: 'top',
      timeout: 10000,
    })
  }
}

function errorMessage(error, fallback) {
  return error?.response?.data?.detail || error?.response?.data?.message || fallback
}

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  // Roles first: the table renders a role name per row, and without the lookup
  // every row would briefly print a raw id.
  await loadUserRoles()
  await loadInvitations()
})
</script>

<style scoped>
.inv-page {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

/* ── Header ── */
.inv-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.inv-head__titles {
  min-width: 0;
}

.inv-head__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.2;
  color: var(--dash-ink);
}

.inv-head__sub {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0 6px;
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

.inv-head__dot {
  color: var(--dash-n-300);
}

.inv-head__waiting {
  color: var(--dash-warn);
  font-weight: 500;
}

.inv-head__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.inv-head__refresh {
  width: 36px;
  height: 36px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  color: var(--dash-ink-3);
}
.inv-head__refresh:hover {
  color: var(--dash-ink);
  border-color: var(--dash-line-strong);
}

/* The one filled control on the page, so the primary move is unambiguous. */
.inv-head__cta {
  height: 36px;
  padding: 0 14px;
  border-radius: var(--dash-r-md);
  background: var(--dash-brand);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.005em;
}
.inv-head__cta:hover {
  background: #193d5c;
}

/* ── Error ── */
.inv-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 14px;
  border-radius: var(--dash-r-lg);
  background: var(--dash-critical-bg);
  border: 1px solid var(--dash-critical-line);
}
.inv-alert__icon {
  color: var(--dash-critical-mark);
  flex-shrink: 0;
}
.inv-alert__text {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 13px;
  color: var(--dash-critical);
}
.inv-alert__btn {
  color: var(--dash-critical);
  font-weight: 600;
  padding: 0 8px;
}

/* ── Queue surface ── */
.inv-surface {
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  box-shadow: var(--dash-shadow-xs);
  overflow: hidden;
}

.inv-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 56px;
  padding: 10px 14px;
  background: var(--dash-n-25);
  border-bottom: 1px solid var(--dash-line);
}

.inv-toolbar__search {
  flex: 1 1 220px;
  min-width: 0;
  max-width: 320px;
}
.inv-toolbar__search :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.inv-toolbar__search :deep(.q-field__native) {
  font-size: 13px;
  color: var(--dash-ink);
}
.inv-toolbar__search :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

.inv-toolbar__filter {
  width: 162px;
  flex-shrink: 0;
}
.inv-toolbar__filter :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  padding: 0 8px 0 10px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.inv-toolbar__filter :deep(.q-field__native) {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink);
  padding: 0;
  min-height: 34px;
}
.inv-toolbar__filter :deep(.q-field__marginal) {
  height: 34px;
  min-width: 0;
  padding: 0;
  color: var(--dash-ink-4);
}
.inv-toolbar__filter :deep(.q-field__prepend) {
  padding-right: 7px;
}
.inv-toolbar__filter :deep(.q-field__append) {
  padding-left: 2px;
}

.inv-toolbar__count {
  margin: 0 0 0 auto;
  padding-left: 8px;
  font-size: 12.5px;
  color: var(--dash-ink-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.inv-toolbar__count strong {
  color: var(--dash-ink);
  font-weight: 600;
}
.inv-toolbar__count-of {
  color: var(--dash-ink-4);
}

@media (min-width: 1440px) {
  .inv-head__title {
    font-size: 24px;
  }
}

/* ── Tablet ──
   Header stacks, actions take the full width, and the toolbar's three parts go
   to two rows: search and filter share a line, the count sits under them. */
@media (max-width: 1023px) {
  .inv-head {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .inv-head__actions {
    justify-content: flex-end;
  }
  .inv-head__cta {
    flex: 0 1 auto;
  }
  .inv-toolbar {
    flex-wrap: wrap;
    padding: 10px 12px;
  }
  .inv-toolbar__search {
    max-width: none;
  }
  .inv-toolbar__count {
    width: 100%;
    margin: 0;
    padding-left: 0;
  }
}

@media (max-width: 599px) {
  .inv-head__title {
    font-size: 20px;
  }
  .inv-head__actions {
    justify-content: stretch;
  }
  .inv-head__cta {
    flex: 1;
  }
  .inv-toolbar__filter {
    width: 100%;
  }
}
</style>
