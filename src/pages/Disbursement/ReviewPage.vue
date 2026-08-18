<template>
  <PageShell>
    <DisbursementStepShell
      :group-id="groupId"
      :step="1"
      :group-name="groupName"
      subtitle="Check attendance and pay before payslips go out."
      :status="pgiStatus"
      :stepper-key="stepperKey"
    >
      <DisbursementStatRow :tiles="statTiles" :loading="loading" />

      <DisbursementTableCard
        v-model:search="searchTerm"
        v-model:page="page"
        v-model:page-size="pageSize"
        title="Attendance review"
        :total="filteredData.length"
        :page-size-options="pageSizeOptions"
        :loading="loading"
        searchable
        search-placeholder="Search name, position or department"
        unit-label="employee"
        unit-label-plural="employees"
      >
        <!-- The step's action sits beside search, so it is on screen the moment
             the page loads rather than below the table. -->
        <template #actions>
          <span class="action-note dash-num">{{ reviewedIds.length }}/{{ reviewData.length }} reviewed</span>
          <q-btn
            unelevated
            no-caps
            dense
            icon="o_send"
            label="Release payslips"
            class="btn-primary"
            :loading="releasing"
            :disable="!reviewedIds.length || releasing"
            @click="releaseAll"
          >
            <q-tooltip v-if="!reviewedIds.length">
              Mark at least one employee reviewed first
            </q-tooltip>
          </q-btn>
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
          <template #body-cell-status="props">
            <q-td :props="props">
              <StatusPill :status="props.row.status" />
            </q-td>
          </template>

          <template #body-cell-issues="props">
            <q-td :props="props">
              <!-- Issues are what this step exists to surface, so they read as
                   warnings rather than as plain grey chips. "None" is stated
                   rather than left blank, so a clean row is visibly clean. -->
              <span v-if="!props.row.issues?.length" class="no-issues">None</span>
              <span v-else class="issues">
                <span v-for="(issue, i) in props.row.issues" :key="i" class="dash-chip dash-chip--warn">
                  {{ issue }}
                </span>
              </span>
            </q-td>
          </template>

          <template #body-cell-action="props">
            <q-td :props="props" class="text-center">
              <q-btn flat round dense icon="more_horiz" size="11px" class="row-btn">
                <q-menu anchor="bottom right" self="top right" :offset="[0, 6]" class="disb-menu">
                  <q-list dense class="disb-menu__list">
                    <q-item
                      v-close-popup
                      clickable
                      class="disb-menu__item"
                      :disable="reviewedIds.includes(props.row.id) || reviewingId === props.row.id"
                      @click="reviewEmployee(props.row)"
                    >
                      <q-item-section avatar>
                        <q-spinner v-if="reviewingId === props.row.id" size="15px" />
                        <q-icon v-else name="o_check_circle" size="17px" />
                      </q-item-section>
                      <q-item-section>
                        {{ reviewedIds.includes(props.row.id) ? 'Reviewed' : 'Mark reviewed' }}
                      </q-item-section>
                    </q-item>

                    <q-item
                      v-if="reviewedIds.includes(props.row.id)"
                      v-close-popup
                      clickable
                      class="disb-menu__item"
                      :disable="releasingId === props.row.id"
                      @click="releaseEmployee(props.row)"
                    >
                      <q-item-section avatar>
                        <q-spinner v-if="releasingId === props.row.id" size="15px" />
                        <q-icon v-else name="o_send" size="17px" />
                      </q-item-section>
                      <q-item-section>Release payslip</q-item-section>
                    </q-item>

                    <q-separator class="disb-menu__sep" />

                    <q-item v-close-popup clickable class="disb-menu__item" @click="viewEmployee(props.row)">
                      <q-item-section avatar><q-icon name="o_visibility" size="17px" /></q-item-section>
                      <q-item-section>View details</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </q-td>
          </template>

          <template #no-data>
            <div v-if="!loading" class="dash-empty">
              <span class="dash-featured-icon">
                <q-icon :name="searchTerm ? 'filter_alt_off' : 'o_fact_check'" size="20px" />
              </span>
              <p class="dash-empty__title">
                {{ searchTerm ? 'No employees match this search' : 'Nothing to review' }}
              </p>
              <p class="dash-empty__sub">
                {{
                  searchTerm
                    ? 'Try a different name, position or department.'
                    : 'This payout group has no employees to review.'
                }}
              </p>
            </div>
          </template>
        </q-table>
      </DisbursementTableCard>
    </DisbursementStepShell>

    <EmployeeDetailDialog v-model="detailDialogOpen" :employee-id="selectedEmployeeId" />
  </PageShell>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import StatusPill from 'src/components/common/StatusPill.vue'
import PageShell from 'src/components/layout/PageShell.vue'
import DisbursementStepShell from 'src/components/pages/Payroll/DisbursementStepShell.vue'
import DisbursementStatRow from 'src/components/pages/Payroll/DisbursementStatRow.vue'
import DisbursementTableCard from 'src/components/pages/Payroll/DisbursementTableCard.vue'
import EmployeeDetailDialog from 'src/components/pages/Payroll/EmployeeDetailDialog.vue'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'

const route = useRoute()
const $q = useQuasar()
const groupId = route.params.id
// Bumped after releasing payslips so the progress header refetches.
const stepperKey = ref(0)
const { fetchReviewOverview, fetchAttendanceSummary, reviewToReady, releasePayslips } = useDisbursementApi()

// The shell shows the run's identity and status. pgi_status arrives as a query
// param from the list page; the stepper falls back to its progress endpoint when
// it is absent, so a deep link still resolves.
const pgiStatus = computed(() => route.query.pgi_status || '')

const loading = ref(true)
const releasing = ref(false)
const reviewingId = ref(null)
const releasingId = ref(null)
const reviewedIds = ref([])
const overview = ref(null)
const reviewData = ref([])
const searchTerm = ref('')
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]
const detailDialogOpen = ref(false)
const selectedEmployeeId = ref(null)

// Attendance figures are right-aligned so the columns read as numbers; they were
// centre-aligned, which left a column of digits ragged on both sides.
const columns = [
  { name: 'employee', label: 'Employee', field: 'employee', align: 'left', sortable: true },
  { name: 'position', label: 'Position', field: 'position', align: 'left', sortable: true },
  { name: 'department', label: 'Department', field: 'department', align: 'left', sortable: true },
  { name: 'days_worked', label: 'Days', field: 'days_worked', align: 'right', sortable: true },
  { name: 'undertime', label: 'Undertime', field: 'undertime', align: 'right' },
  { name: 'late', label: 'Late', field: 'late', align: 'right', sortable: true },
  { name: 'absent', label: 'Absent', field: 'absent', align: 'right', sortable: true },
  { name: 'ot_hours', label: 'OT hours', field: 'ot_hours', align: 'right' },
  { name: 'issues', label: 'Issues', field: 'issues', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left', sortable: true },
  { name: 'action', label: '', field: 'action', align: 'center' },
]

/**
 * Marks follow what each figure means rather than a decorative sequence: the two
 * that need a person are warn and critical, the settled one is good.
 */
const statTiles = computed(() => [
  {
    key: 'total',
    label: 'Employees',
    value: reviewData.value.length ?? 0,
    mark: 'var(--dash-cat-1)',
  },
  {
    key: 'reviewed',
    label: 'Reviewed',
    value: overview.value?.reviewed ?? 0,
    mark: 'var(--dash-good-mark)',
  },
  {
    key: 'attention',
    label: 'Needs attention',
    value: overview.value?.needs_attention ?? 0,
    mark: 'var(--dash-critical-mark)',
  },
  {
    key: 'missing',
    label: 'Missing date',
    value: overview.value?.missing_date ?? 0,
    mark: 'var(--dash-warn-mark)',
  },
  {
    key: 'na',
    label: 'Not applicable',
    value: overview.value?.not_applicable ?? 0,
    mark: 'var(--dash-neutral-mark)',
  },
])

const groupName = computed(
  () =>
    overview.value?.payout_group_name ||
    overview.value?.group_name ||
    route.query.group ||
    '',
)

// Narrowing or resizing the list while on a later page would otherwise leave the
// reader on a page that no longer exists.
watch([searchTerm, pageSize], () => {
  page.value = 1
})

const filteredData = computed(() => {
  if (!searchTerm.value.trim()) return reviewData.value
  const term = searchTerm.value.toLowerCase()
  return reviewData.value.filter((e) => {
    return (
      (e.employee || '').toLowerCase().includes(term) ||
      (e.department || '').toLowerCase().includes(term) ||
      (e.position || '').toLowerCase().includes(term)
    )
  })
})

const paginatedData = computed(() => {
  if (!filteredData.value) return []
  const start = (page.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

onMounted(async () => {
  try {
    const [ov, att] = await Promise.all([
      fetchReviewOverview(groupId),
      fetchAttendanceSummary(groupId),
    ])
    overview.value = ov
    reviewData.value = att?.employees || []
    reviewedIds.value = (att?.employees || []).filter((e) => e.status === 'reviewed').map((e) => e.id)
  } catch (err) {
    console.error('[ReviewPage] fetch failed:', err)
  } finally {
    loading.value = false
  }
})

function viewEmployee(row) {
  selectedEmployeeId.value = row.id
  detailDialogOpen.value = true
}

async function reviewEmployee(row) {
  reviewingId.value = row.id
  try {
    await reviewToReady(groupId, [row.id])
    if (!reviewedIds.value.includes(row.id)) {
      reviewedIds.value.push(row.id)
    }
  } catch (err) {
    console.error('[ReviewPage] reviewEmployee ✖ error:', err)
    $q.notify({
      type: 'negative',
      message: 'Failed to review employee.',
      icon: 'error',
      timeout: 3000,
      position: 'top',
    })
  } finally {
    reviewingId.value = null
  }
}

async function releaseAll() {
  releasing.value = true
  try {
    const epIds = reviewData.value
      .filter((e) => reviewedIds.value.includes(e.id))
      .map((e) => e.id)
    if (!epIds.length) {
      $q.notify({
        type: 'warning',
        message: 'No reviewed employees to release.',
        icon: 'warning',
        timeout: 2000,
        position: 'top',
      })
      return
    }
    await releasePayslips(groupId, epIds)

    stepperKey.value++
    const [ov, att] = await Promise.all([
      fetchReviewOverview(groupId),
      fetchAttendanceSummary(groupId),
    ])
    overview.value = ov
    reviewData.value = att?.employees || []
    $q.notify({
      type: 'positive',
      message: `Payslips released for ${epIds.length} employee${epIds.length > 1 ? 's' : ''}.`,
      icon: 'check_circle',
      timeout: 3000,
      position: 'top',
    })
  } catch (err) {
    console.error('[ReviewPage] releaseAll ✖ error:', err)
  } finally {
    releasing.value = false
  }
}

async function releaseEmployee(row) {
  releasingId.value = row.id
  try {
    await releasePayslips(groupId, [row.id])

    const [ov, att] = await Promise.all([
      fetchReviewOverview(groupId),
      fetchAttendanceSummary(groupId),
    ])
    overview.value = ov
    reviewData.value = att?.employees || []
    $q.notify({
      type: 'positive',
      message: `Payslip released for ${row.employee}.`,
      icon: 'check_circle',
      timeout: 2000,
      position: 'top',
    })
  } catch (err) {
    console.error('[ReviewPage] releaseEmployee ✖ error:', err)
    $q.notify({
      type: 'negative',
      message: 'Failed to release payslip.',
      icon: 'error',
      timeout: 3000,
      position: 'top',
    })
  } finally {
    releasingId.value = null
  }
}
</script>

<style scoped>
/* ============================================================================
   Step-local styles only.
   ----------------------------------------------------------------------------
   The page frame comes from DisbursementStepShell, the figures strip from
   DisbursementStatRow, and the list card and its table from
   DisbursementTableCard. What used to be ~400 lines of per-page CSS — header,
   stats bar, section header, table, pagination — is now shared, leaving only
   what is genuinely specific to this step.
   ========================================================================== */
.btn-primary {
  height: 34px;
  padding: 0 16px;
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
.btn-primary:disabled,
.btn-primary[disabled] {
  background: var(--dash-n-200);
  color: var(--dash-ink-4);
  box-shadow: none;
}


/* Sits immediately left of the toolbar action, so the button's precondition is
   readable beside the button rather than only in a disabled tooltip. Hidden on
   narrow viewports, where the toolbar needs its width for search and the action
   itself. */
.action-note {
  font-size: 12.5px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}

@media (max-width: 1023px) {
  .action-note {
    display: none;
  }
}

.row-btn {
  color: var(--dash-ink-4);
}
.row-btn:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
}

.issues {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.no-issues {
  color: var(--dash-ink-4);
}
</style>

<style>
/* Row menus teleport to the body. Shared by the disbursement steps. */
.disb-menu {
  border-radius: var(--dash-r-md) !important;
  border: 1px solid var(--dash-line);
  box-shadow: var(--dash-shadow-lg) !important;
}
.disb-menu__list {
  min-width: 196px;
  padding: 5px;
}
.disb-menu__item {
  min-height: 34px;
  padding: 0 9px;
  border-radius: var(--dash-r-sm);
  font-size: 13px;
  color: var(--dash-ink-2);
}
.disb-menu__item:hover {
  background: var(--dash-n-50);
  color: var(--dash-ink);
}
.disb-menu__item .q-item__section--avatar {
  min-width: 26px;
  padding-right: 10px;
  color: var(--dash-ink-4);
}
.disb-menu__sep {
  margin: 4px 0;
  background: var(--dash-line-soft);
}

/* Page-size selects inside DisbursementTableCard. */
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
