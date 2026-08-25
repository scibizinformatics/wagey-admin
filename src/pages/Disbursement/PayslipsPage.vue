<template>
  <PageShell>
    <DisbursementStepShell
      :group-id="groupId"
      :step="2"
      :group-name="groupName"
      :subtitle="subtitle"
      :status="pgiStatus"
      :stepper-key="stepperKey"
    >
      <DisbursementStatRow :tiles="statTiles" :loading="loading" />

      <DisbursementTableCard
        v-model:search="searchTerm"
        v-model:page="page"
        v-model:page-size="pageSize"
        title="Employee payslips"
        :total="filteredData.length"
        :page-size-options="pageSizeOptions"
        :loading="loading"
        searchable
        search-placeholder="Search employee"
        unit-label="payslip"
        unit-label-plural="payslips"
      >
        <!-- Beside search, so it is reachable without scrolling past the table. -->
        <template #actions>
          <span class="action-note dash-num">
            {{ acknowledgedCount }}/{{ payslipsSent }} acknowledged
          </span>

          <!-- Funding is money leaving the company against payslips the people
               being paid have not yet agreed to. The step stays shut until they
               have, and says what it is waiting for rather than showing a
               button that would be wrong to press. -->
          <q-btn
            v-if="allAcknowledged"
            unelevated
            no-caps
            dense
            icon-right="o_arrow_forward"
            label="Continue to funding"
            class="btn-primary"
            @click="goToFunding"
          />
          <span v-else class="action-wait">
            <q-icon name="o_schedule" size="15px" />
            Funding opens once everyone has acknowledged
          </span>
        </template>

        <!-- Filter tabs live inside the list card, under its toolbar, because
             they scope the list — they used to sit above the progress stepper,
             which put a list control above the page's own navigation. -->
        <template #tabs>
          <div class="tabs">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              type="button"
              class="tab"
              :class="{ 'tab--active': activeTab === tab.value }"
              :aria-pressed="activeTab === tab.value"
              @click="setTab(tab.value)"
            >
              <q-icon :name="tab.icon" size="15px" />
              <span class="tab__label">{{ tab.label }}</span>
              <span v-if="tab.count" class="tab__count dash-num">{{ tab.count }}</span>
            </button>
          </div>
        </template>

        <q-table
          :rows="paginatedData"
          :columns="columns"
          :loading="loading"
          :pagination="{ rowsPerPage: 0 }"
          row-key="id"
          flat
          hide-no-data
          hide-pagination
        >
          <template #body-cell-payslip_status="props">
            <q-td :props="props">
              <StatusPill :status="props.row.payslip_status" />
            </q-td>
          </template>

          <template #body-cell-actions="props">
            <q-td :props="props" class="text-right">
              <!-- Only a disputed payslip can be acted on here. Other rows show
                   nothing rather than a dash, so the column reads as "actions
                   where there are any". -->
              <span v-if="isDisputed(props.row)" class="row-actions">
                <q-btn
                  outline
                  dense
                  no-caps
                  size="11px"
                  icon="o_check"
                  label="Resolve"
                  class="btn-outline btn-outline--good"
                  :disable="processing"
                  @click="resolve(props.row)"
                />
                <q-btn
                  outline
                  dense
                  no-caps
                  size="11px"
                  icon="o_close"
                  label="Reject"
                  class="btn-outline btn-outline--danger"
                  :disable="processing"
                  @click="reject(props.row)"
                />
              </span>
            </q-td>
          </template>

          <template #no-data>
            <div v-if="!loading" class="dash-empty">
              <span class="dash-featured-icon">
                <q-icon :name="isFiltered ? 'filter_alt_off' : 'o_receipt_long'" size="20px" />
              </span>
              <p class="dash-empty__title">
                {{ isFiltered ? 'No payslips match this view' : 'No payslips yet' }}
              </p>
              <p class="dash-empty__sub">
                {{
                  isFiltered
                    ? 'Try another tab, or clear the search.'
                    : 'Payslips appear here once they are released in the review step.'
                }}
              </p>
              <q-btn
                v-if="isFiltered"
                outline
                no-caps
                dense
                size="12px"
                icon="filter_alt_off"
                label="Show all"
                class="btn-outline"
                @click="clearFilters"
              />
            </div>
          </template>
        </q-table>
      </DisbursementTableCard>
    </DisbursementStepShell>
  </PageShell>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import StatusPill from 'src/components/common/StatusPill.vue'
import PageShell from 'src/components/layout/PageShell.vue'
import DisbursementStepShell from 'src/components/pages/Payroll/DisbursementStepShell.vue'
import DisbursementStatRow from 'src/components/pages/Payroll/DisbursementStatRow.vue'
import DisbursementTableCard from 'src/components/pages/Payroll/DisbursementTableCard.vue'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { usePayoutGroupIdentity } from 'src/composables/disbursement/usePayoutGroupIdentity'
import { useLoadedToast } from 'src/composables/useLoadedToast'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const groupId = route.params.id
const { identity, resolveQuietly } = usePayoutGroupIdentity()
const stepperKey = ref(0)
const { fetchPayslipOverview, fetchEmployeePayslips, fetchPayslipIssues, resolveIssue, rejectIssue } = useDisbursementApi()
const { notifyLoaded } = useLoadedToast()

const loading = ref(true)
const processing = ref(false)
const overview = ref(null)
const payslips = ref([])
const activeTab = ref('all')
const searchTerm = ref('')
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]

const columns = [
  { name: 'employee', label: 'Employee', field: 'employee', align: 'left', sortable: true },
  { name: 'position_name', label: 'Position', field: 'position_name', align: 'left', sortable: true },
  { name: 'net_pay', label: 'Net pay', field: 'net_pay', align: 'right', sortable: true, format: (v) => `\u20B1${parseFloat(v || 0).toLocaleString('en-PH')}` },
  { name: 'payslip_status', label: 'Status', field: 'payslip_status', align: 'left', sortable: true },
  { name: 'acknowledged_on', label: 'Acknowledged', field: 'acknowledged_on', align: 'left' },
  { name: 'dispute_status', label: 'Dispute', field: 'dispute_status', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

// The resolved run first: `pgi_status` in the query is a snapshot from whenever
// the list page last loaded, so on a refresh it can name a step the run has long
// since left. It stands in only until the run itself answers.
const pgiStatus = computed(() => identity.value?.status || route.query.pgi_status || '')

const groupName = computed(
  () =>
    overview.value?.payout_group_name ||
    overview.value?.group_name ||
    route.query.group ||
    identity.value?.name ||
    '',
)

// The period this run settles, from whichever of the three knows it. Naming it
// in the header saves opening the run to find out which cutoff you are looking
// at — every step page said only what the step was for.
const cutoffName = computed(
  () => overview.value?.cutoff_name || route.query.cutoff || identity.value?.cutoff || '',
)

const subtitle = computed(() => {
  const purpose = 'Track who has seen and acknowledged their payslip.'
  return cutoffName.value ? `${cutoffName.value} · ${purpose}` : purpose
})

/**
 * Tabs carry their own counts, which is what the figures strip was duplicating —
 * it listed acknowledged / pending / disputed and so did the tabs. The strip
 * keeps the totals that are not selectable as a view.
 */
const tabs = computed(() => [
  { value: 'all', label: 'All', icon: 'o_list', count: payslips.value.length },
  {
    value: 'acknowledged',
    label: 'Acknowledged',
    icon: 'o_check_circle',
    count: overview.value?.acknowledged ?? 0,
  },
  { value: 'pending', label: 'Pending', icon: 'o_schedule', count: overview.value?.pending ?? 0 },
  { value: 'disputed', label: 'Disputed', icon: 'o_report', count: overview.value?.disputed ?? 0 },
])

const acknowledgedCount = computed(() => overview.value?.acknowledged ?? 0)
const payslipsSent = computed(() => overview.value?.payslip_sent ?? 0)

/**
 * Whether this step is finished. Zero payslips sent is not "all acknowledged" —
 * it is a run that has not released yet, and it must not open funding.
 */
const allAcknowledged = computed(
  () => payslipsSent.value > 0 && acknowledgedCount.value >= payslipsSent.value,
)

const statTiles = computed(() => [
  {
    key: 'sent',
    label: 'Payslips sent',
    value: overview.value?.payslip_sent ?? 0,
    mark: 'var(--dash-cat-1)',
  },
  {
    key: 'ack',
    label: 'Acknowledged',
    value: overview.value?.acknowledged ?? 0,
    mark: 'var(--dash-good-mark)',
  },
  {
    key: 'pending',
    label: 'Pending',
    value: overview.value?.pending ?? 0,
    mark: 'var(--dash-warn-mark)',
  },
  {
    key: 'disputed',
    label: 'Disputed',
    value: overview.value?.disputed ?? 0,
    mark: 'var(--dash-critical-mark)',
  },
  {
    key: 'failed',
    label: 'Failed delivery',
    value: overview.value?.failed_delivery ?? 0,
    mark: 'var(--dash-critical-mark)',
  },
])

const isFiltered = computed(() => activeTab.value !== 'all' || !!searchTerm.value?.trim())

const isDisputed = (row) => String(row.payslip_status || '').toLowerCase() === 'disputed'

function clearFilters() {
  activeTab.value = 'all'
  searchTerm.value = ''
}

function goToFunding() {
  router.push({ path: `/app/payroll/funding/${groupId}`, query: route.query })
}


const filteredData = computed(() => {
  let result = payslips.value
  if (activeTab.value !== 'all') {
    const statusMap = { acknowledged: 'Acknowledged', pending: 'Pending', disputed: 'Disputed' }
    result = result.filter((p) => p.payslip_status === (statusMap[activeTab.value] || activeTab.value))
  }
  if (searchTerm.value.trim()) {
    const term = searchTerm.value.toLowerCase()
    result = result.filter((p) => {
      return (p.employee || '').toLowerCase().includes(term)
    })
  }
  return result
})

const paginatedData = computed(() => {
  if (!filteredData.value) return []
  const start = (page.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

onMounted(async () => {
  // The list page hands the run's name, cutoff and status over in the query, and
  // no step endpoint returns any of them — but a deep link arrives with none of
  // them and a refresh can arrive with a stale status, so the run is resolved by
  // its id either way.
  resolveQuietly(groupId)
  try {
    const [ov, data] = await Promise.all([
      fetchPayslipOverview(groupId),
      fetchEmployeePayslips(groupId),
    ])
    overview.value = ov
    payslips.value = data || []
    notifyLoaded('Payslips', payslips.value.length, {
      noun: 'payslip',
      nounPlural: 'payslips',
    })
  } catch (err) {
    console.error('[PayslipsPage] fetch failed:', err)
  } finally {
    loading.value = false
  }
})

function setTab(tab) {
  activeTab.value = tab
}

// Narrowing the list while on a later page would strand the reader on a page that
// no longer exists.
watch([searchTerm, activeTab, pageSize], () => {
  page.value = 1
})

async function processIssue(row, action) {
  processing.value = true
  try {
    const issues = await fetchPayslipIssues(row.epi_id)
    const issueIds = Array.isArray(issues) ? issues.map((i) => i.id) : []
    if (!issueIds.length) {
      $q.notify({ type: 'warning', message: 'No issues found for this payslip.', position: 'top' })
      processing.value = false
      return
    }
    const fn = action === 'resolve' ? resolveIssue : rejectIssue
    await Promise.all(issueIds.map((id) => fn(id, { admin_notes: '' })))
    stepperKey.value++
    const [ov, data] = await Promise.all([
      fetchPayslipOverview(groupId),
      fetchEmployeePayslips(groupId),
    ])
    overview.value = ov
    payslips.value = data || []
    $q.notify({ type: 'positive', message: `Issue${issueIds.length > 1 ? 's' : ''} ${action}d successfully.`, position: 'top' })
  } catch (err) {
    console.error(`[PayslipsPage] ${action} ✖ error:`, err)
    $q.notify({ type: 'negative', message: `Failed to ${action} issue. Please try again.`, position: 'top' })
  } finally {
    processing.value = false
  }
}

async function resolve(row) {
  await processIssue(row, 'resolve')
}

async function reject(row) {
  await processIssue(row, 'reject')
}
</script>

<style scoped>
/* ============================================================================
   Payslips step — local styles only. Frame, figures strip and table chrome are
   shared (DisbursementStepShell / DisbursementStatRow / DisbursementTableCard).
   ========================================================================== */

/* Toolbar buttons match the 34px search field beside them, so the row shares one
   baseline rather than stepping up and down. */
.btn-primary {
  height: 34px;
  padding: 0 14px;
  border-radius: var(--dash-r-md);
  background: var(--dash-brand);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs);
}
.btn-primary:hover {
  background: #193d5c;
}

.btn-outline {
  height: 34px;
  padding: 0 11px;
  border-radius: var(--dash-r-md);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-2);
}

/* Row-level resolve / reject sit inside a cell, so they are smaller than the
   toolbar's actions. */
.row-actions {
  display: inline-flex;
  gap: 6px;
  justify-content: flex-end;
}
.row-actions .btn-outline {
  height: 28px;
  padding: 0 9px;
  font-size: 12px;
}
.btn-outline--good {
  color: var(--dash-good);
}
.btn-outline--danger {
  color: var(--dash-critical);
}

.action-note {
  font-size: 12.5px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}

/* Stands where the action would, at the action's height, so the toolbar keeps
   its shape while the step waits — but muted, because it is a statement about
   the run rather than something to press. */
.action-wait {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: 1px dashed var(--dash-line);
  border-radius: var(--dash-r-md);
  font-size: 12.5px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}

/* ── Filter tabs ──
   A recessed segmented control, the same language as the dashboard's view
   toggle and the schedule's grouping switch. Was a row of custom pills with
   their own palette. */
.tabs {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-n-100);
  min-width: min-content;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border: none;
  border-radius: var(--dash-r-sm);
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-3);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease), box-shadow var(--dash-fast) var(--dash-ease);
}
.tab:hover {
  color: var(--dash-ink-2);
}
.tab--active {
  background: var(--dash-surface);
  color: var(--dash-ink);
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs);
}
.tab:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--dash-n-100), 0 0 0 4px var(--dash-accent-ring);
}

.tab .q-icon {
  color: var(--dash-ink-4);
  flex-shrink: 0;
}
.tab--active .q-icon {
  color: var(--dash-accent);
}

/* The count is a figure on the tab, not a badge shouting for attention. */
.tab__count {
  padding: 1px 6px;
  border-radius: var(--dash-r-pill);
  background: var(--dash-n-200);
  font-size: 11px;
  font-weight: 600;
  color: var(--dash-ink-2);
}
.tab--active .tab__count {
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
}

@media (max-width: 1023px) {
  .action-note {
    display: none;
  }
  /* The wait note keeps its words but drops the frame, so the row stays short. */
  .action-wait {
    padding: 0;
    border: none;
  }
  .tab__label {
    display: none;
  }
  /* Collapsed to icon plus count, the active tab keeps its label so the current
     view is still named. */
  .tab--active .tab__label {
    display: inline;
  }
}
</style>

<style>
.disb-popup {
  border-radius: var(--dash-r-md) !important;
  border: 1px solid var(--dash-line);
  box-shadow: var(--dash-shadow-lg) !important;
  padding: 4px;
}
.disb-popup .q-item {
  min-height: 32px;
  padding: 0 9px;
  border-radius: var(--dash-r-sm);
  font-size: 12.5px;
  color: var(--dash-ink-2);
}
.disb-popup .q-item:hover {
  background: var(--dash-n-50);
  color: var(--dash-ink);
}
.disb-popup .q-item--active {
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
  font-weight: 600;
}
</style>
