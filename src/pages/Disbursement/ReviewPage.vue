<template>
  <PageShell>
    <DisbursementStepShell
      :group-id="groupId"
      :step="1"
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
        title="Requests and deductions"
        :total="filteredData.length"
        :page-size-options="pageSizeOptions"
        :loading="loading"
        searchable
        search-placeholder="Search employee"
        unit-label="employee"
        unit-label-plural="employees"
      >
        <!-- The step's action sits beside search, so it is on screen the moment
             the page loads rather than below the table. -->
        <template #actions>
          <span class="action-note dash-num">{{ reviewedNote }}</span>

          <!-- Reviewing the rest in one go, beside reviewing them one at a time
               from the row menu. It disappears once there is nobody left to
               review rather than sitting there disabled. Both routes ask first —
               see `ConfirmDialog` at the end of the template. -->
          <q-btn
            v-if="!reviewClosed && unreviewedIds.length"
            outline
            no-caps
            dense
            icon="o_done_all"
            :label="reviewedIds.length ? 'Review the rest' : 'Review all'"
            class="btn-outline"
            :loading="reviewingAll"
            :disable="reviewingAll"
            @click="requestReviewAll"
          >
            <q-tooltip>
              Reviews the {{ unreviewedIds.length }} employee{{
                unreviewedIds.length === 1 ? '' : 's'
              }}
              not reviewed yet
            </q-tooltip>
          </q-btn>

          <q-btn
            unelevated
            no-caps
            dense
            icon="o_send"
            label="Release payslips"
            class="btn-primary"
            :loading="releasing"
            :disable="!releasableIds.length || releasing"
            @click="requestReleaseAll"
          >
            <q-tooltip v-if="releaseClosed">
              Payslips for this run have already been released
            </q-tooltip>
            <q-tooltip v-else-if="!releasableIds.length">
              Review at least one employee first
            </q-tooltip>
            <q-tooltip v-else-if="unreviewedIds.length">
              Releases the {{ releasableIds.length }} reviewed employee{{
                releasableIds.length === 1 ? '' : 's'
              }}; the {{ unreviewedIds.length }} still unreviewed
              {{ unreviewedIds.length === 1 ? 'is' : 'are' }} left out
            </q-tooltip>
          </q-btn>
        </template>

        <!-- First paint only, when there is nothing to keep on screen: built from
             the same `columns` the table renders, so the placeholder shares its
             column edges, labels and alignment and nothing shifts when the rows
             land. A refresh after an action keeps its rows and only runs the
             table's progress bar, so it deliberately does not raise this. -->
        <TableSkeleton
          v-if="loading"
          :columns="columns"
          :rows="pageSize"
          aria-label="Loading employees to review"
          wrap-class="dash-page-body"
        />

        <!-- Empty. `hide-no-data` was on the table alongside this markup, and it
             suppresses Quasar's no-data branch outright — so the state was never
             drawn and an empty result showed a bare header strip. Rendered here
             instead, and without the loading guard it no longer needs: this branch
             is only reached once the fetch has answered. -->
        <div v-else-if="!paginatedData.length" class="dash-empty dash-page-body">
          <span class="dash-featured-icon">
            <q-icon :name="searchTerm ? 'filter_alt_off' : 'o_fact_check'" size="20px" />
          </span>
          <p class="dash-empty__title">
            {{ searchTerm ? 'No employees match this search' : 'Nothing to review' }}
          </p>
          <p class="dash-empty__sub">
            {{
              searchTerm ? 'Try a different name.' : 'This payout group has no employees to review.'
            }}
          </p>
        </div>

        <q-table
          v-else
          :rows="paginatedData"
          :columns="columns"
          :loading="refreshing"
          :pagination="{ rowsPerPage: 0 }"
          row-key="epi_id"
          flat
          hide-pagination
        >
          <!-- The employee is the row's subject, so its cell leads with a face:
               a photograph when the name resolves to exactly one roster employee
               who has one, otherwise the person's initials on their identity
               colour — the same construction as the Request tables and the
               disbursement list's cash-advance view. -->
          <template #body-cell-employee="props">
            <q-td :props="props">
              <div class="identity">
                <q-avatar
                  v-if="avatarOf(props.row.employee).pictureUrl"
                  size="30px"
                  class="identity-avatar"
                >
                  <img
                    :src="avatarOf(props.row.employee).pictureUrl"
                    :alt="props.row.employee || 'Employee'"
                  />
                </q-avatar>
                <q-avatar
                  v-else
                  size="30px"
                  class="identity-avatar"
                  :style="{ background: avatarOf(props.row.employee).color }"
                >
                  <span class="identity-initials">{{ avatarOf(props.row.employee).initials }}</span>
                </q-avatar>
                <span class="identity-name">{{ props.row.employee }}</span>
              </div>
            </q-td>
          </template>

          <!-- Counts. Most rows are zero, so a zero is muted and only a real
               figure carries full ink — the exceptions are what this step is
               looking for. -->
          <template #body-cell-leave_request_count="props">
            <q-td :props="props">
              <span class="dash-num" :class="{ 'num-zero': !props.row.leave_request_count }">
                {{ props.row.leave_request_count ?? 0 }}
              </span>
            </q-td>
          </template>

          <template #body-cell-ot_request="props">
            <q-td :props="props">
              <span class="dash-num" :class="{ 'num-zero': !props.row.ot_request }">
                {{ props.row.ot_request ?? 0 }}
              </span>
            </q-td>
          </template>

          <!-- Attendance that needs a person. Suspicious and flagged days each
               read as `resolved/total`, so the pair that only means something
               together stays in one cell instead of the resolved half sitting in
               a column of its own. A zero is muted like any other count; a row
               with something still outstanding is not merely inked but toned —
               amber for days the system found odd, red for days already flagged
               — because this is the one place on the row where a number is a
               problem rather than an amount. Once every day has been dealt with
               the tone drops away: the figure is history, not work. A manual
               entry is a fact about how the day was recorded, not a fault, so it
               stays neutral. -->
          <template #body-cell-suspicious_attendance_count="props">
            <q-td :props="props">
              <span class="dash-num" :class="pairTone(props.row, 'suspicious', 'num-warn')">
                <template v-if="attendancePair(props.row, 'suspicious').total">
                  <span class="count-pair__done">{{
                    attendancePair(props.row, 'suspicious').resolved
                  }}</span
                  ><span class="count-pair__sep">/</span
                  >{{ attendancePair(props.row, 'suspicious').total }}
                </template>
                <template v-else>0</template>
              </span>
              <q-tooltip v-if="attendancePair(props.row, 'suspicious').total" :delay="400">
                {{ pairTitle(props.row, 'suspicious', 'suspicious') }}
              </q-tooltip>
            </q-td>
          </template>

          <template #body-cell-flagged_attendance_count="props">
            <q-td :props="props">
              <span class="dash-num" :class="pairTone(props.row, 'flagged', 'num-critical')">
                <template v-if="attendancePair(props.row, 'flagged').total">
                  <span class="count-pair__done">{{
                    attendancePair(props.row, 'flagged').resolved
                  }}</span
                  ><span class="count-pair__sep">/</span
                  >{{ attendancePair(props.row, 'flagged').total }}
                </template>
                <template v-else>0</template>
              </span>
              <q-tooltip v-if="attendancePair(props.row, 'flagged').total" :delay="400">
                {{ pairTitle(props.row, 'flagged', 'flagged') }}
              </q-tooltip>
            </q-td>
          </template>

          <template #body-cell-manual_attendance_count="props">
            <q-td :props="props">
              <span class="dash-num" :class="{ 'num-zero': !props.row.manual_attendance_count }">
                {{ props.row.manual_attendance_count ?? 0 }}
              </span>
            </q-td>
          </template>

          <template #body-cell-requested_cash_advance="props">
            <q-td :props="props">
              <span
                class="dash-num"
                :class="{ 'num-zero': !amount(props.row.requested_cash_advance) }"
              >
                {{ formatCurrency(props.row.requested_cash_advance) }}
              </span>
            </q-td>
          </template>

          <!-- Approved short of requested is the case an admin has to decide on,
               so it is toned rather than left as one more number in the row. -->
          <template #body-cell-approved_cash_advance="props">
            <q-td :props="props">
              <span
                class="dash-num"
                :class="{
                  'num-zero':
                    !amount(props.row.approved_cash_advance) && !isCashAdvanceShort(props.row),
                  'num-warn': isCashAdvanceShort(props.row),
                }"
              >
                {{ formatCurrency(props.row.approved_cash_advance) }}
              </span>
              <q-tooltip v-if="isCashAdvanceShort(props.row)">
                {{ formatCurrency(props.row.requested_cash_advance) }} requested
              </q-tooltip>
            </q-td>
          </template>

          <!-- The contribution's own status rides under its amount rather than in
               a column of its own: two status pills per row would compete with
               the review status, which is the one the step acts on.

               The cell is the way into the breakdown, where a contribution that
               did not come off automatically can be deducted by hand. It opens
               even on a zero amount, since zero is exactly the case where a
               deduction is missing. -->
          <template #body-cell-contribution="props">
            <q-td :props="props">
              <button type="button" class="figure-link" @click="viewContributions(props.row)">
                <span
                  class="dash-num figure-link__amount"
                  :class="{ 'figure-link__amount--zero': !amount(props.row.contribution) }"
                >
                  {{ formatCurrencyPrecise(props.row.contribution) }}
                </span>
                <span v-if="showsContributionStatus(props.row)" class="figure-link__sub">
                  {{ props.row.contribution_status }}
                </span>
                <q-tooltip :delay="400">View contributions</q-tooltip>
              </button>
            </q-td>
          </template>

          <!-- Hours worked against the hours the cutoff expects, as one
               `worked / needed` reading for the same reason the attendance
               pairs above are one cell: neither figure means much alone, and two
               columns would put "13.10" and "88.00" far enough apart to be read
               against the wrong employees.

               The achieved half recedes and the requirement carries the ink, so
               the eye lands on what is still owed — and the cell is toned while
               the hours are short, dropping to plain once they are made up, the
               way the attendance cells behave. A row with no hours expected of
               it is not behind, so it is not tinted and the pair collapses to
               what was worked. -->
          <template #body-cell-work_hours="props">
            <q-td :props="props">
              <span class="dash-num" :class="workHoursTone(props.row)">
                <template v-if="workHoursPair(props.row).hasNeeded">
                  <span class="count-pair__done">{{
                    decimalHoursLabel(props.row.work_hours_worked)
                  }}</span
                  ><span class="count-pair__sep">/</span
                  >{{ decimalHoursLabel(props.row.work_hours_needed) }}
                </template>
                <template v-else>{{
                  decimalHoursLabel(props.row.work_hours_worked) || '—'
                }}</template>
              </span>
              <q-tooltip v-if="workHoursPair(props.row).hasNeeded" :delay="400">
                {{ workHoursTitle(props.row) }}
              </q-tooltip>
            </q-td>
          </template>

          <!-- Money, like every other figure on the row: 2 dp through the app's
               standard formatter and receded at zero, rather than given a
               format of its own to disagree with.

               The figure is the way into what produced it, on the same
               construction as the contribution cell above: net pay is the
               number the run exists to settle and the one that explains nothing
               by itself, so the days, rates and money behind it live one click
               away. It opens on a zero net pay too — nothing paid is exactly the
               case worth asking about, and the dialog says whether the run
               recorded no days or the days came to nothing. -->
          <template #body-cell-net_pay="props">
            <q-td :props="props">
              <button
                type="button"
                class="figure-link"
                :aria-label="`View salary breakdown for ${props.row.employee}`"
                @click="viewBreakdown(props.row)"
              >
                <span
                  class="dash-num figure-link__amount"
                  :class="{ 'figure-link__amount--zero': !amount(props.row.net_pay) }"
                >
                  {{ formatCurrency(props.row.net_pay) }}
                </span>
                <q-tooltip :delay="400">View salary breakdown</q-tooltip>
              </button>
            </q-td>
          </template>

          <!-- The pill names the provenance as well as the state: a review the server
             already had reads "Reviewed earlier", so a row that was signed off before
             this page opened cannot be mistaken for one this visit settled. The
             status is still passed through untouched — the tone stays the settled
             green either way, and the server's own value is what the column sorts
             on. -->

          <!-- And it carries the explanation, because the label alone invites the one
               reading it must not have: that the app reviewed the row by itself. The
               tooltip says plainly that this predates the current visit, and that no
               reviewer or timestamp is recorded — because none is. `review_status` is
               a bare read-only string on the payload and the audit log carries no
               review entries, so there is no who to show. Saying so is the honest
               answer; inventing one would be worse. -->
          <template #body-cell-review_status="props">
            <q-td :props="props">
              <span class="review-status-cell">
                <StatusPill
                  :status="props.row.review_status"
                  :label="isReviewedEarlier(props.row) ? 'Reviewed earlier' : null"
                />
                <q-tooltip v-if="isReviewedEarlier(props.row)">
                  {{ REVIEWED_EARLIER_HINT }}
                </q-tooltip>
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
                      :disable="
                        reviewedIds.includes(props.row.epi_id) ||
                        reviewClosed ||
                        reviewingId === props.row.epi_id
                      "
                      @click="requestReviewOne(props.row)"
                    >
                      <q-item-section avatar>
                        <q-spinner v-if="reviewingId === props.row.epi_id" size="15px" />
                        <q-icon v-else name="o_check_circle" size="17px" />
                      </q-item-section>
                      <q-item-section>
                        {{ reviewLabel(props.row) }}
                      </q-item-section>
                      <q-tooltip v-if="reviewClosed && !reviewedIds.includes(props.row.epi_id)">
                        Review closed when the run moved on — payslips are the next step
                      </q-tooltip>
                      <q-tooltip v-else-if="isReviewedEarlier(props.row)">
                        Reviewed before this run was opened — nothing to decide here
                      </q-tooltip>
                    </q-item>

                    <q-item
                      v-if="
                        (reviewedIds.includes(props.row.epi_id) || reviewClosed) && !releaseClosed
                      "
                      v-close-popup
                      clickable
                      class="disb-menu__item"
                      :disable="releasingId === props.row.epi_id"
                      @click="releaseEmployee(props.row)"
                    >
                      <q-item-section avatar>
                        <q-spinner v-if="releasingId === props.row.epi_id" size="15px" />
                        <q-icon v-else name="o_send" size="17px" />
                      </q-item-section>
                      <q-item-section>Release payslip</q-item-section>
                    </q-item>

                    <q-separator class="disb-menu__sep" />

                    <q-item
                      v-close-popup
                      clickable
                      class="disb-menu__item"
                      @click="viewContributions(props.row)"
                    >
                      <q-item-section avatar>
                        <q-icon name="o_account_balance" size="17px" />
                      </q-item-section>
                      <q-item-section>Contributions</q-item-section>
                    </q-item>

                    <q-item
                      v-close-popup
                      clickable
                      class="disb-menu__item"
                      @click="viewBreakdown(props.row)"
                    >
                      <q-item-section avatar>
                        <q-icon name="o_receipt_long" size="17px" />
                      </q-item-section>
                      <q-item-section>Salary breakdown</q-item-section>
                    </q-item>

                    <q-item
                      v-close-popup
                      clickable
                      class="disb-menu__item"
                      @click="viewEmployee(props.row)"
                    >
                      <q-item-section avatar
                        ><q-icon name="o_visibility" size="17px"
                      /></q-item-section>
                      <q-item-section>View details</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </DisbursementTableCard>
    </DisbursementStepShell>

    <EmployeeDetailDialog
      v-model="detailDialogOpen"
      :employee-id="selectedEmployeeId"
      :employee-index="employeeIndex"
    />

    <!-- Deducting a contribution moves the row's contribution figures and can
         move its status, so the table refetches when the dialog reports one. -->
    <EmployeeContributionsDialog
      v-model="contributionsDialogOpen"
      :pgi-id="groupId"
      :epi-id="selectedEpiId"
      :employee-name="selectedEmployeeName"
      :employee-index="employeeIndex"
      @deducted="refreshAfterDeduct"
    />

    <!-- How the net pay in this row was arrived at, day by day. Read-only, and the
         same dialog the Funding step opens from its earners table — one endpoint,
         one reader, one reconciliation, so the two steps cannot describe a
         person's payroll differently. -->
    <SalaryBreakdownDialog
      v-model="breakdownDialogOpen"
      :employee-id="selectedEpiId"
      :employee-name="selectedEmployeeName"
      :net-pay="selectedNetPay"
      :employee-index="employeeIndex"
    />

    <!-- The gate in front of every write this step makes: reviewing one employee,
         reviewing everyone outstanding, and releasing the payslips that follow.
         One dialog for all three, the wording built in `reviewConfirm.js`, and the
         writes live behind `@confirm` so `:loading` sits on the button that starts
         them. -->
    <ConfirmDialog
      v-model="showConfirm"
      :confirm="confirm"
      :loading="confirmBusy"
      @confirm="commitPending"
    />
  </PageShell>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import StatusPill from 'src/components/common/StatusPill.vue'
import TableSkeleton from 'src/components/common/TableSkeleton.vue'
import ConfirmDialog from 'src/components/common/ConfirmDialog.vue'
import PageShell from 'src/components/layout/PageShell.vue'
import DisbursementStepShell from 'src/components/pages/Payroll/DisbursementStepShell.vue'
import DisbursementStatRow from 'src/components/pages/Payroll/DisbursementStatRow.vue'
import DisbursementTableCard from 'src/components/pages/Payroll/DisbursementTableCard.vue'
import EmployeeDetailDialog from 'src/components/pages/Payroll/EmployeeDetailDialog.vue'
import EmployeeContributionsDialog from 'src/components/pages/Payroll/EmployeeContributionsDialog.vue'
import SalaryBreakdownDialog from 'src/components/pages/Payroll/SalaryBreakdownDialog.vue'
import {
  buildReleaseConfirm,
  buildReviewAllConfirm,
  buildReviewOneConfirm,
} from 'src/components/pages/Payroll/reviewConfirm'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { usePayoutGroupIdentity } from 'src/composables/disbursement/usePayoutGroupIdentity'
import { PGI_STATUS_MAP } from 'src/constants/pgiStatus'
import {
  formatCurrency,
  formatCurrencyPrecise,
  decimalHoursLabel,
} from 'src/composables/utils/format'
import { avatarFor, buildEmployeeNameIndex } from 'src/composables/utils/employee'
import { useEmployees } from 'src/composables/page/useEmployees'
import { useLoadedToast } from 'src/composables/useLoadedToast'
import { useToast } from 'src/composables/useToast'

const route = useRoute()
const groupId = route.params.id
const { identity, resolveQuietly } = usePayoutGroupIdentity()
// Bumped after releasing payslips so the progress header refetches.
const stepperKey = ref(0)
const {
  fetchReviewOverview,
  fetchEmployeeReviewSummary,
  fetchPayoutGroupProgress,
  reviewToReady,
  releasePayslips,
  invalidateCache,
} = useDisbursementApi()
const { notifyLoaded } = useLoadedToast()
const { employees, fetchEmployees } = useEmployees()

// Puts a face beside each name. The review payload names an employee but
// carries no photograph, so the roster is the only thing that can supply one —
// the same construction as the disbursement list's cash-advance view, including
// its refusal to guess when a name belongs to two people.
const employeeIndex = computed(() => buildEmployeeNameIndex(employees.value))
const avatarOf = (name) => avatarFor(employeeIndex.value, name)
const toast = useToast()

// The shell shows the run's identity and status. pgi_status arrives as a query
// param from the list page, but it is a snapshot from whenever that page last
// loaded, so `load()` overwrites it with what the run reports now — a deep link
// or a run that moved on in another tab still resolves to the real status.
const pgiStatus = ref(route.query.pgi_status || '')

const loading = ref(true)
// A refresh after an action keeps the rows on screen and only runs the table's
// progress bar; `loading` is the first paint, when there is nothing to keep.
const refreshing = ref(false)
const releasing = ref(false)
// Set when the server rejects a review for being out of status: the run moved on
// behind our back, and every remaining row would be rejected the same way.
const reviewRejectedByServer = ref(false)
// Ids the server accepted a review for during this visit. `load()` re-seeds the
// table from the summary endpoint, which can still report the row as needing
// attention a beat after the transition it just accepted, so these are replayed
// onto the refreshed rows rather than letting the pill fall back to its old
// status.
const sessionReviewedIds = ref([])
// The employees already signed off before this page loaded, and the latch that
// records it once.
//
// `review_status` is a stored column the backend set at some earlier point, not a
// record of this visit — `POST pgi/<id>/review-to-ready/` is the only thing in the
// API that writes it, and it has already run by the time these rows arrive. So a row
// can come back "Reviewed" before the reader has clicked anything, and every
// surface that counts a review then reads as though the page did it. Naming the
// split lets the page say which is which without disputing either: the review
// happened, it just was not this visit's.
//
// Seeded from the first `load()` that answers, never re-seeded. The flag is
// separate from the value because `load()` runs again after every action, and
// re-seeding then would relabel the employees reviewed during this visit as
// earlier ones.
const preReviewedIds = ref([])
let seededPreReviewed = false
const reviewingId = ref(null)
const reviewingAll = ref(false)
const releasingId = ref(null)
const reviewedIds = ref([])
const overview = ref(null)
const summary = ref(null)
const reviewData = ref([])
const searchTerm = ref('')
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]
const detailDialogOpen = ref(false)
const selectedEmployeeId = ref(null)
const contributionsDialogOpen = ref(false)
const selectedEpiId = ref(null)
const selectedEmployeeName = ref('')
// The breakdown's own open flag and the one figure it reconciles against. The id
// and name are shared with the contributions dialog rather than duplicated: both
// are read only at open, and each opener writes them before opening, so a second
// selection trio on this page would be three ways of naming the same row.
const breakdownDialogOpen = ref(false)
const selectedNetPay = ref(null)

// The confirmation gate. `pendingIds` and `pendingEmployee` are snapshotted rather
// than re-read on confirm, so the dialog describes the review that was asked about
// even though the table behind it is live and a refresh can replace those rows at
// any moment — the same reasoning `DisbursePage` keeps its `pendingRows` for.
const showConfirm = ref(false)
const confirm = ref(null)
// 'reviewAll' | 'reviewOne' | 'releaseAll' — the one key `commitPending` switches
// on, naming which write the dialog's button starts.
const pendingAction = ref(null)
const pendingIds = ref([])
const pendingEmployee = ref(null)

// The dialog's button is the loading guard, so it has to cover all three writes —
// each of which owns its own flag for the toolbar and row-menu spinners.
const confirmBusy = computed(
  () => reviewingAll.value || reviewingId.value !== null || releasing.value,
)

/** Decimal strings ("0.00") arrive from the API; compare and sort them as numbers. */
function amount(val) {
  return Number(val ?? 0)
}

/**
 * Suspicious and flagged attendance each arrive as two numbers: how many days
 * the run found, and how many of those somebody has already resolved. Neither
 * says much alone — nine suspicious days matter or not depending on whether
 * they have been looked at — so the table shows them as one `resolved/total`
 * reading and derives everything else here: `outstanding` is what still needs a
 * person, and drives both the column's sort and its tone.
 *
 * `resolved` is clamped to the total so a payload that over-counts resolutions
 * cannot produce a negative outstanding and sort itself above the rows that do
 * need attention.
 */
function attendancePair(row, kind) {
  const total = amount(row[`${kind}_attendance_count`])
  const resolved = Math.min(amount(row[`resolved_${kind}_attendance_count`]), total)
  return { total, resolved, outstanding: total - resolved }
}

/** Tone the cell only while days are outstanding: muted at zero, plain once cleared. */
function pairTone(row, kind, toneClass) {
  const { total, outstanding } = attendancePair(row, kind)
  if (!total) return 'num-zero'
  return outstanding ? toneClass : ''
}

/** Spells the ratio out, which is quicker to trust than reading "2/9" as a fraction. */
function pairTitle(row, kind, noun) {
  const { total, resolved, outstanding } = attendancePair(row, kind)
  const days = total === 1 ? 'day' : 'days'
  if (!outstanding) return `All ${total} ${noun} ${days} resolved`
  return `${resolved} of ${total} ${noun} ${days} resolved — ${outstanding} still open`
}

/**
 * Work hours for one employee: what the cutoff expects of them, and what they
 * actually worked. Both arrive as decimal strings ("88.00", "13.10").
 *
 * The two figures only mean something together — 13.10 hours is a whole cutoff
 * for somebody contracted for a dozen and a shortfall worth a look for somebody
 * who needed 88 — so the table shows them as one `worked / needed` reading, for
 * the same reason the attendance pairs are one cell rather than two columns.
 *
 * `shortfall` is what is still to be made up and drives the column's sort and
 * tone, floored at zero so a payload that over-reports hours cannot produce a
 * negative gap and sort itself above the rows that do need attention. Clamping
 * here rather than at the server is what `attendancePair` does with `resolved`,
 * and for the same reason.
 *
 * `hasNeeded` reads the raw field rather than the coerced number, so a genuinely
 * absent requirement reads as "no figure" rather than as a real `0.00` — a
 * missing figure and a zero hour are not the same statement.
 */
function workHoursPair(row) {
  const needed = amount(row.work_hours_needed)
  const worked = amount(row.work_hours_worked)
  return {
    needed,
    worked,
    hasNeeded: row.work_hours_needed != null && row.work_hours_needed !== '',
    shortfall: Math.max(0, needed - worked),
  }
}

/**
 * Amber while the hours are still short; plain once made up, and plain when
 * there is no requirement to meet — with nothing expected of them, an employee
 * who worked hours is not behind, so their figure is not tinted.
 */
function workHoursTone(row) {
  const { hasNeeded, shortfall } = workHoursPair(row)
  return hasNeeded && shortfall > 0 ? 'num-warn' : ''
}

/** Spells the pair out, which is quicker to trust than reading "13.10 / 88.00". */
function workHoursTitle(row) {
  const { needed, worked, shortfall } = workHoursPair(row)
  const workedLabel = decimalHoursLabel(worked)
  const neededLabel = decimalHoursLabel(needed)
  if (!shortfall) return `${workedLabel} of ${neededLabel} hours`
  return `${workedLabel} of ${neededLabel} hours — ${decimalHoursLabel(shortfall)} still needed`
}

/**
 * Figures are right-aligned so a column of them reads as numbers.
 *
 * The money columns sort through a `field` function that coerces to Number: the
 * API sends decimals as strings ("1500.00"), and sorting those as text puts
 * "900.00" above "1500.00".
 */
const columns = [
  { name: 'employee', label: 'Employee', field: 'employee', align: 'left', sortable: true },
  {
    name: 'leave_request_count',
    label: 'Leave',
    field: (row) => amount(row.leave_request_count),
    align: 'right',
    sortable: true,
  },
  {
    name: 'ot_request',
    label: 'OT req.',
    field: (row) => amount(row.ot_request),
    align: 'right',
    sortable: true,
  },
  {
    name: 'requested_cash_advance',
    label: 'CA requested',
    field: (row) => amount(row.requested_cash_advance),
    align: 'right',
    sortable: true,
  },
  {
    name: 'approved_cash_advance',
    label: 'CA approved',
    field: (row) => amount(row.approved_cash_advance),
    align: 'right',
    sortable: true,
  },
  {
    name: 'contribution',
    label: 'Contribution',
    field: (row) => amount(row.contribution),
    align: 'right',
    sortable: true,
  },
  // Attendance the run could not take at face value. Each is its own column
  // rather than one total, because they call for different things: a suspicious
  // day is worth a look, a flagged one has already been called out, and a manual
  // entry was typed in by somebody. Sortable, so a run can be read worst-first —
  // and for the two that carry a resolved count, worst means what is still
  // outstanding rather than what the run originally found, so a row whose days
  // have all been dealt with sorts down among the quiet ones.
  {
    name: 'suspicious_attendance_count',
    label: 'Suspicious',
    field: (row) => attendancePair(row, 'suspicious').outstanding,
    align: 'right',
    sortable: true,
  },
  {
    name: 'flagged_attendance_count',
    label: 'Flagged',
    field: (row) => attendancePair(row, 'flagged').outstanding,
    align: 'right',
    sortable: true,
  },
  {
    name: 'manual_attendance_count',
    label: 'Manual',
    field: (row) => amount(row.manual_attendance_count),
    align: 'right',
    sortable: true,
  },
  // Hours worked against the hours the cutoff expects of them, as one cell for
  // the reason the attendance pairs are one cell. Sorted by what is still
  // outstanding rather than by what was worked, so a run can be read furthest
  // behind first — and an employee with no hours expected of them sorts with
  // the quiet rows rather than at the top.
  {
    name: 'work_hours',
    label: 'Work hours',
    field: (row) => workHoursPair(row).shortfall,
    align: 'right',
    sortable: true,
  },
  // The figure the whole run exists to settle, so it sits with the other money
  // columns rather than being left to the detail dialog.
  {
    name: 'net_pay',
    label: 'Net pay',
    field: (row) => amount(row.net_pay),
    align: 'right',
    sortable: true,
  },
  {
    name: 'review_status',
    label: 'Review status',
    field: 'review_status',
    align: 'left',
    sortable: true,
  },
  { name: 'action', label: '', field: 'action', align: 'center' },
]

function isCashAdvanceShort(row) {
  const requested = amount(row.requested_cash_advance)
  return requested > 0 && amount(row.approved_cash_advance) < requested
}

/** "Not Applicable" -> "not_applicable", so a label compares regardless of casing. */
function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

/**
 * "Not applicable" against a zero contribution says nothing the empty amount has
 * not already said, so it is left off; anything else — pending, incomplete, paid —
 * is a state the reader needs.
 */
function showsContributionStatus(row) {
  const status = normalize(row.contribution_status)
  return Boolean(status) && status !== 'not_applicable'
}

function isReviewed(row) {
  return normalize(row.review_status) === 'reviewed'
}

/**
 * Review-to-ready is a gate on the *run*, not on the row: the backend only
 * accepts it while the run sits in `review_required` and answers 400 —
 * "PGI must be in 'review_required' status" — once the run has moved past it.
 * So the action is offered only while the run is still on step 0. An unknown or
 * missing status leaves it open rather than locking the page on a guess.
 */
const reviewClosed = computed(() => {
  if (reviewRejectedByServer.value) return true
  const mapping = PGI_STATUS_MAP[pgiStatus.value]
  return Boolean(mapping) && mapping.currentStep > 0
})

/** Everyone still waiting on a decision — what "review all" acts on. */
const unreviewedIds = computed(() =>
  reviewData.value.filter((e) => !reviewedIds.value.includes(e.epi_id)).map((e) => e.epi_id),
)

/**
 * The reviewed rows that were signed off before this visit, narrowed to the rows
 * still on screen and to those this visit did not review.
 *
 * Narrowing by what is present, not by what was seeded: a refresh can replace the
 * table under us, and a row that is no longer there must not go on counting in the
 * figures. And `sessionReviewedIds` is subtracted even though the two sets cannot
 * overlap — a row already reviewed is refused by the review handlers — so a payload
 * that arrived contradicting them costs one row's wording rather than two claims.
 */
const reviewedEarlierIds = computed(() => {
  const present = new Set(reviewData.value.map((e) => e.epi_id))
  return preReviewedIds.value.filter(
    (id) => present.has(id) && !sessionReviewedIds.value.includes(id),
  )
})

/** One row's provenance, for the pill and the row menu to agree on. */
function isReviewedEarlier(row) {
  return preReviewedIds.value.includes(row.epi_id) && !sessionReviewedIds.value.includes(row.epi_id)
}

// What the pill cannot say for itself. The reader's first question about a green
// "Reviewed earlier" is "did this app just do that?", and the answer has to be no,
// explicitly — a review is irreversible, so an unexplained one is the worst kind
// of surprise on a payroll. It also has to own the gap: nobody asked *who*, and
// the honest answer is that the API does not record it, rather than leaving the
// reader to assume the page forgot to show it.
const REVIEWED_EARLIER_HINT =
  'Signed off before this run was opened, so it was not reviewed here. ' +
  'This app records no reviewer or timestamp for it, so it cannot show who.'

/**
 * The count beside the table's actions.
 *
 * "Reviewed" here means reviewed on this run, not reviewed by this visit, so the
 * part that was already signed off is named beside it — otherwise the tally reads
 * as work the reader just did, on a run they have only just opened.
 */
const reviewedNote = computed(() => {
  const tally = `${reviewedIds.value.length}/${reviewData.value.length} reviewed`
  if (!reviewedEarlierIds.value.length) return tally
  return `${tally} · ${reviewedEarlierIds.value.length} earlier`
})

function reviewLabel(row) {
  if (isReviewedEarlier(row)) return 'Reviewed earlier'
  if (reviewedIds.value.includes(row.epi_id)) return 'Reviewed'
  return reviewClosed.value ? 'Review closed' : 'Mark reviewed'
}

/**
 * Payslips are still this step's business while the run sits on the payslip step
 * — a run awaiting acknowledgement can still have latecomers released. Past it
 * (funding onwards) the step is history and the button only earns a 400.
 */
const releaseClosed = computed(() => {
  const mapping = PGI_STATUS_MAP[pgiStatus.value]
  return Boolean(mapping) && mapping.currentStep > 1
})

/**
 * A release covers the employees that have been reviewed, and nobody else.
 * An unreviewed employee is one whose requests and deductions nobody has
 * settled, so their payslip is not a document to send — they stay in this step
 * until they are reviewed, rather than riding along with the batch.
 */
const releasableIds = computed(() => (releaseClosed.value ? [] : reviewedIds.value))

/**
 * The run's own status, only when it is one this app knows how to place.
 *
 * Deliberately narrow about where it will read one. A bare `status` on a step
 * payload is ambiguous — on the progress endpoint it describes a *step*, and
 * "completed" there would read here as a finished run and lock the page. Only
 * keys that can mean nothing else are trusted.
 */
function readPgiStatus(payload) {
  const raw =
    payload?.pgi_status ?? payload?.payout_status ?? payload?.payout_group_instance?.status
  const status = normalize(raw)
  return PGI_STATUS_MAP[status] ? status : ''
}

/**
 * The server explains these refusals well; say what it said, not "failed".
 *
 * Deliberately *not* `extractErrorMessage`, which is the shared formatter
 * everywhere else: this returns `''` when the body carried no sentence worth
 * quoting, and every caller depends on that emptiness — a reviewed/blocked
 * summary falls back to its own wording via `reason || '…'`. The shared
 * formatter always resolves to something (a status line, a fallback), so
 * swapping it in here would make those fallbacks unreachable.
 */
function serverMessage(err) {
  return err?.response?.data?.message || err?.response?.data?.detail || ''
}

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
    // The figure is the server's and stays untouched; the sub-line is what keeps
    // it from reading as this visit's work when part of it predates the page.
    note: reviewedEarlierIds.value.length ? `${reviewedEarlierIds.value.length} earlier` : '',
  },
  {
    key: 'attention',
    label: 'Needs attention',
    value: overview.value?.needs_attention ?? 0,
    mark: 'var(--dash-critical-mark)',
  },
  {
    key: 'missing',
    // Spelled to match the row, not the counter it reads. The overview keys this
    // bucket `missing_date`, but a row in it arrives as `review_status:
    // "Missing Data"`, and the pill prints the row's own words — so a tile
    // reading "Missing date" above rows reading "Missing data" made the same
    // condition look like two.
    label: 'Missing data',
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
    identity.value?.name ||
    '',
)

// The review payload names the cutoff this run belongs to, so the header can say
// which period is being settled rather than leaving the reader to infer it.
const subtitle = computed(() => {
  const purpose = 'Settle requests and deductions before payslips go out.'
  const cutoff = summary.value?.cutoff_name || route.query.cutoff || identity.value?.cutoff
  return cutoff ? `${cutoff} · ${purpose}` : purpose
})

// Narrowing or resizing the list while on a later page would otherwise leave the
// reader on a page that no longer exists.
watch([searchTerm, pageSize], () => {
  page.value = 1
})

const filteredData = computed(() => {
  if (!searchTerm.value.trim()) return reviewData.value
  const term = searchTerm.value.toLowerCase()
  // Employee only. Position and department are no longer columns here, and a
  // row matching on something the reader cannot see reads as a wrong result.
  return reviewData.value.filter((e) => (e.employee || '').toLowerCase().includes(term))
})

const paginatedData = computed(() => {
  if (!filteredData.value) return []
  const start = (page.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

// Actions can land faster than their refreshes return; a token per call keeps an
// older response from painting over a newer one.
let loadToken = 0

/**
 * Rows are keyed by `epi_id` — the employee payroll item — which is the id that
 * review, release and the detail dialog all address, so no translation is needed
 * between the table and the actions taken on it.
 */
async function load() {
  const token = ++loadToken
  const [ov, rev, progress] = await Promise.all([
    fetchReviewOverview(groupId),
    fetchEmployeeReviewSummary(groupId),
    // Only for the run's status, so a stale or absent query param cannot leave
    // the page offering a transition the run has already made. Its failure must
    // not take the table down with it.
    fetchPayoutGroupProgress(groupId).catch(() => null),
  ])
  if (token !== loadToken) return
  overview.value = ov
  summary.value = rev
  reviewData.value = rev?.employees || []
  reviewData.value.forEach((row) => {
    if (sessionReviewedIds.value.includes(row.epi_id)) row.review_status = 'reviewed'
  })
  reviewedIds.value = reviewData.value.filter(isReviewed).map((e) => e.epi_id)

  // Only ever the first load that answers, and after the token guard so a
  // superseded response cannot set it. On that load `sessionReviewedIds` is still
  // empty — nothing has been reviewed yet — so what is captured here is exactly
  // what the server already had, which is the point.
  if (!seededPreReviewed) {
    // Copied rather than aliased: `reviewedIds` is rebuilt from scratch on every
    // later load, and the two are not meant to be the same list.
    preReviewedIds.value = [...reviewedIds.value]
    seededPreReviewed = true
  }

  const status = readPgiStatus(progress) || readPgiStatus(ov) || readPgiStatus(rev)
  if (status) {
    pgiStatus.value = status
    reviewRejectedByServer.value = false
  }
}

/**
 * What every action on this step ends with. Reviewing or releasing moves a row's
 * status, the tiles' counts, and often the run's own status in the header and
 * stepper — none of which an optimistic local edit can be trusted to have got
 * right — so the page refetches rather than guesses. The cached dashboard and
 * payout-group lists are dropped for the same reason: the run they describe has
 * moved.
 *
 * The action itself has already succeeded and said so, so a failed refresh is
 * logged and left there: the table is stale, not wrong, and a second red toast
 * contradicting the first helps nobody.
 */
async function refresh() {
  refreshing.value = true
  try {
    invalidateCache()
    await load()
    // Remounts the stepper, which reads the run's progress once on mount.
    stepperKey.value++
  } catch (err) {
    console.error('[ReviewPage] refresh failed:', err)
  } finally {
    refreshing.value = false
  }
}

onMounted(async () => {
  // The list page hands the run's name, cutoff and status over in the query, and
  // no step endpoint returns any of them — but the query is a snapshot from
  // whenever that page last loaded, so on a refresh its status can be several
  // steps behind. The run is resolved by its id every time and its status wins,
  // unless an action has already moved the page on in the meantime.
  const openedWith = pgiStatus.value
  resolveQuietly(groupId).then((run) => {
    if (run?.status && pgiStatus.value === openedWith) pgiStatus.value = run.status
  })
  fetchEmployees().catch(() => null)
  try {
    await load()
    notifyLoaded('Payroll review', reviewData.value.length, {
      noun: 'employee',
      nounPlural: 'employees',
    })
  } catch (err) {
    console.error('[ReviewPage] fetch failed:', err)
  } finally {
    loading.value = false
  }
})

function viewEmployee(row) {
  selectedEmployeeId.value = row.epi_id
  detailDialogOpen.value = true
}

function viewContributions(row) {
  selectedEpiId.value = row.epi_id
  selectedEmployeeName.value = row.employee || ''
  contributionsDialogOpen.value = true
}

/**
 * The salary breakdown behind a row's net pay.
 *
 * Snapshotted off the row rather than read off it on render — the same reasoning
 * FundingPage keeps its selection for: this table is refetched after every
 * deduction, so a dialog left open across a write would otherwise re-point itself
 * at whatever row took that id next.
 *
 * `net_pay` travels with it so the dialog can reconcile the days against the
 * figure this row was listed at. Two of the three fields are already on the page
 * for the contributions dialog, which is why it does not get its own selection.
 */
function viewBreakdown(row) {
  selectedEpiId.value = row?.epi_id ?? null
  selectedEmployeeName.value = row?.employee || ''
  selectedNetPay.value = row?.net_pay ?? null
  breakdownDialogOpen.value = true
}

/** A deduction moves the row's contribution status and the run's figures. */
async function refreshAfterDeduct() {
  await refresh()
}

/**
 * Reviewing is per employee here and in bulk from the toolbar, and both go the
 * same way: `pgi/<id>/review-to-ready/` takes a list of employee payroll items,
 * so one employee is a list of one and the whole run is a list of all of them.
 *
 * Shared by both so the two paths cannot drift — the same optimistic row move,
 * the same handling of a run that has left review, the same refresh.
 */
/**
 * `review-to-ready` does two things and reports only the second.
 *
 * It marks the employee payroll items in `epi_ids` as reviewed — that part is
 * saved — and then tries to move the run to payslip release, which it can only
 * do once *every* employee on the run is reviewed. When some are not, it answers
 * 400 with "Cannot mark PGI as ready for payslip release. 1 of 3 EPIs still need
 * review." and `unreviewed_count`. The employees in that request were still
 * reviewed; the run simply is not ready yet.
 *
 * So reviewing one employee out of three *always* comes back 400 until the last
 * one goes in. Reading that as a failure is what made individual review look
 * broken: the review had landed, and the page reported an error and stopped.
 *
 * @returns {{reviewed: number, unreviewed: number}|null} the run's tally when
 *          this is that partial-progress answer, null when it is a real refusal.
 */
function reviewProgress(err) {
  const data = err?.response?.data
  if (!data) return null
  const unreviewed = Number(data.unreviewed_count)
  const looksPartial =
    (Number.isFinite(unreviewed) && unreviewed > 0) ||
    /still need review/i.test(String(data.message || ''))
  if (!looksPartial) return null
  return { reviewed: Number(data.reviewed_count) || 0, unreviewed: unreviewed || 0 }
}

/**
 * The other 400: the run has left review entirely — "PGI must be in
 * 'review_required' status" — so nobody on it can be reviewed again. This one
 * really does close the step, and it is the only one that does.
 */
function isRunOutOfReview(err) {
  return /pgi must be in|review_required/i.test(serverMessage(err))
}

/** "1 employee still to review", for the note under a partial review. */
function remainingNote(unreviewed) {
  if (!unreviewed) return ''
  const noun = unreviewed === 1 ? 'employee' : 'employees'
  return `${unreviewed} ${noun} still to review before payslips can go out.`
}

/** Moves the rows now; the refresh that follows replaces the guess with truth. */
function markRowsReviewed(epiIds) {
  epiIds.forEach((id) => {
    if (!sessionReviewedIds.value.includes(id)) sessionReviewedIds.value.push(id)
  })
  reviewData.value.forEach((row) => {
    if (epiIds.includes(row.epi_id)) row.review_status = 'reviewed'
  })
}

/**
 * Reports a refusal and says which kind it was: 'run' when the step itself is
 * over, 'employee' when the server declined these employees in particular.
 * `quiet` suppresses only the employee-level notice, for a caller that will sum
 * several attempts up itself.
 */
function reportReviewError(err, { quiet = false } = {}) {
  console.error('[ReviewPage] review ✖ error:', err)
  const message = serverMessage(err)
  if (err?.response?.status === 400 && isRunOutOfReview(err)) {
    reviewRejectedByServer.value = true
    toast.warning('This run has already passed review.', { caption: message || undefined })
    return 'run'
  }
  if (!quiet) toast.error(message || 'This employee could not be reviewed.')
  return 'employee'
}

/**
 * Reviewing is per employee from the row menu and in bulk from the toolbar, and
 * both go the same way: `pgi/<id>/review-to-ready/` takes a list of employee
 * payroll items, so one employee is a list of one and the run is a list of all.
 */
async function sendReview(epiIds, describe) {
  if (!epiIds.length || reviewClosed.value) return false
  try {
    await reviewToReady(groupId, epiIds)
    markRowsReviewed(epiIds)
    toast.success(describe(epiIds.length))
    await refresh()
    return true
  } catch (err) {
    // The review landed; the run just is not ready to move yet.
    const progress = err?.response?.status === 400 ? reviewProgress(err) : null
    if (progress) {
      markRowsReviewed(epiIds)
      toast.success(describe(epiIds.length), {
        caption: remainingNote(progress.unreviewed) || undefined,
      })
      await refresh()
      return true
    }
    if (reportReviewError(err) === 'run') await refresh()
    return false
  }
}

/**
 * Ask before reviewing one employee, from the row menu. Writes nothing.
 *
 * Review is the gate before payslips and there is no endpoint that takes one back,
 * so this is a question rather than a click. It still asks on the last employee
 * outstanding, where the answer is the one that moves the run on.
 */
function requestReviewOne(row) {
  // A second open while one is already up would leave the snapshot describing a row
  // the reader has since moved on from.
  if (showConfirm.value || confirmBusy.value) return
  if (!row?.epi_id || reviewClosed.value || reviewedIds.value.includes(row.epi_id)) return
  pendingEmployee.value = row
  pendingIds.value = [row.epi_id]
  confirm.value = buildReviewOneConfirm({
    employee: row.employee,
    groupName: groupName.value,
    alreadyReviewed: reviewedIds.value.length,
    stillToReview: unreviewedIds.value.length - 1,
  })
  pendingAction.value = 'reviewOne'
  showConfirm.value = true
}

/**
 * Ask before reviewing everyone still outstanding, from the toolbar.
 *
 * Reviewing closes the run's review for everyone marked — and anyone left unmarked
 * never gets another chance at it, which is the part worth saying out loud before
 * it happens. So the batch is asked about even though it is only the people who were
 * deliberately left out that it covers.
 *
 * Writes nothing. The wording, including that warning, lives in `reviewConfirm.js`.
 */
function requestReviewAll() {
  if (showConfirm.value || confirmBusy.value) return
  const epiIds = [...unreviewedIds.value]
  if (!epiIds.length || reviewClosed.value) return
  pendingIds.value = epiIds
  pendingEmployee.value = null
  confirm.value = buildReviewAllConfirm({
    count: epiIds.length,
    alreadyReviewed: reviewedIds.value.length,
    groupName: groupName.value,
  })
  pendingAction.value = 'reviewAll'
  showConfirm.value = true
}

/**
 * The one button in the dialog, dispatching on what was asked.
 *
 * Every write on this step is reachable only from here, which is what puts
 * `:loading` on the button that starts them and stops a second write being recorded
 * against the same snapshot.
 */
function commitPending() {
  if (pendingAction.value === 'reviewAll') commitReviewAll()
  else if (pendingAction.value === 'reviewOne') commitReviewOne()
  else if (pendingAction.value === 'releaseAll') commitReleaseAll()
}

// Cancelling must clear the snapshot as surely as confirming does: a stale
// `pendingIds` left behind is a review the next dialog's button would fire.
watch(showConfirm, (open) => {
  if (open) return
  confirm.value = null
  pendingAction.value = null
  pendingIds.value = []
  pendingEmployee.value = null
})

/** One employee, confirmed from the row menu. */
async function commitReviewOne() {
  const row = pendingEmployee.value
  if (!row || reviewClosed.value || reviewedIds.value.includes(row.epi_id)) return
  showConfirm.value = false
  reviewingId.value = row.epi_id
  try {
    await sendReview([row.epi_id], () => `${row.employee || 'Employee'} reviewed.`)
  } finally {
    reviewingId.value = null
  }
}

/**
 * Everyone still outstanding, confirmed from the toolbar.
 *
 * One request for the lot, then — if the server declines it for a reason that is
 * not the run being over — one request each. A single employee the server will
 * not take fails the whole batch, and the rest should not go unreviewed on their
 * account.
 */
async function commitReviewAll() {
  // Snapshotted before the dialog closes, because the close is what clears it.
  const epiIds = pendingIds.value
  if (!epiIds.length || reviewClosed.value) return
  showConfirm.value = false
  reviewingAll.value = true
  try {
    try {
      await reviewToReady(groupId, epiIds)
      markRowsReviewed(epiIds)
      toast.success(`${epiIds.length} employee${epiIds.length === 1 ? '' : 's'} reviewed.`)
      await refresh()
      return
    } catch (err) {
      const progress = err?.response?.status === 400 ? reviewProgress(err) : null
      if (progress) {
        markRowsReviewed(epiIds)
        toast.success(`${epiIds.length} employee${epiIds.length === 1 ? '' : 's'} reviewed.`, {
          caption: remainingNote(progress.unreviewed) || undefined,
        })
        await refresh()
        return
      }
      if (reportReviewError(err, { quiet: true }) === 'run') {
        await refresh()
        return
      }
    }

    const reviewed = []
    let reason = ''
    for (const epiId of epiIds) {
      try {
        await reviewToReady(groupId, [epiId])
        reviewed.push(epiId)
      } catch (err) {
        if (err?.response?.status === 400 && reviewProgress(err)) {
          // Reviewed; the run is still short of others. Keep going.
          reviewed.push(epiId)
          continue
        }
        if (reportReviewError(err, { quiet: true }) === 'run') break
        reason = reason || serverMessage(err)
      }
    }

    const blocked = epiIds.length - reviewed.length
    if (reviewed.length) markRowsReviewed(reviewed)
    if (reviewed.length && blocked) {
      toast.warning(`${reviewed.length} reviewed, ${blocked} could not be.`, {
        caption: reason || undefined,
      })
    } else if (reviewed.length) {
      toast.success(`${reviewed.length} employee${reviewed.length === 1 ? '' : 's'} reviewed.`)
    } else {
      toast.error(reason || 'None of these employees could be reviewed.')
    }
    await refresh()
  } finally {
    reviewingAll.value = false
  }
}

/**
 * Releasing leaves the unreviewed behind, which is easy to miss from a button
 * labelled "Release payslips" — so when the batch is partial it says who is in
 * it and who is not before it goes.
 *
 * A complete release is not asked about: there is nobody to warn about, and a
 * confirmation with nothing in it is a click that teaches people to click through
 * the ones that matter.
 */
function requestReleaseAll() {
  const going = releasableIds.value.length
  const staying = unreviewedIds.value.length
  if (showConfirm.value || confirmBusy.value) return
  if (!going) return
  if (!staying) {
    // Nothing to warn about, so no dialog — but the batch is still snapshotted,
    // because this is the one route into the release that does not go through one.
    pendingIds.value = releasableIds.value
    commitReleaseAll()
    return
  }
  pendingIds.value = releasableIds.value
  pendingEmployee.value = null
  confirm.value = buildReleaseConfirm({ going, staying, groupName: groupName.value })
  pendingAction.value = 'releaseAll'
  showConfirm.value = true
}

/** The payslips for everyone reviewed so far, confirmed from the toolbar. */
async function commitReleaseAll() {
  // Snapshotted before the dialog closes, because the close is what clears it.
  const releasable = new Set(pendingIds.value)
  showConfirm.value = false
  releasing.value = true
  try {
    const epiIds = reviewData.value.filter((e) => releasable.has(e.epi_id)).map((e) => e.epi_id)
    if (!epiIds.length) {
      toast.warning('No reviewed employees to release.')
      return
    }
    await releasePayslips(groupId, epiIds)
    // The header, its badge and the stepper all read this status, and no step
    // endpoint reports it — so a release that covered the whole run records the
    // move here rather than waiting for a refresh that may not carry it, and
    // the progress bar advances without a trip back to the list. `load()`
    // overwrites it whenever the run does report its own status. A partial
    // release leaves it alone: employees still to review keep the run here.
    if (epiIds.length === reviewData.value.length) {
      pgiStatus.value = 'awaiting_acknowledgement'
    }
    toast.success(`Payslips released for ${epiIds.length} employee${epiIds.length > 1 ? 's' : ''}.`)
    await refresh()
  } catch (err) {
    console.error('[ReviewPage] commitReleaseAll ✖ error:', err)
    toast.error(serverMessage(err) || 'Failed to release payslips.')
  } finally {
    releasing.value = false
  }
}

async function releaseEmployee(row) {
  releasingId.value = row.epi_id
  try {
    await releasePayslips(groupId, [row.epi_id])
    toast.success(`Payslip released for ${row.employee}.`)
    await refresh()
  } catch (err) {
    console.error('[ReviewPage] releaseEmployee ✖ error:', err)
    toast.error(serverMessage(err) || 'Failed to release payslip.')
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
/* The two toolbar actions are a pair, not rivals: reviewing the rest is a step
   towards releasing, so it carries the same shape at a lower weight. */
.btn-outline {
  height: 34px;
  padding: 0 14px;
  border-radius: var(--dash-r-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink-2);
}

.btn-outline :deep(.q-btn__content) {
  gap: 6px;
}

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

/* A cutoff where nothing was requested is almost all zeros. Receding them lets
   the few rows that do carry a request read straight off the column. */
.num-zero {
  color: var(--dash-ink-4);
}

.num-warn {
  color: var(--dash-warn);
  font-weight: 600;
}

/* The pill needs an element to hang the tooltip off, and wrapping it must not
   change how the cell lays out: inline-flex keeps the chip at its own size and on
   the same baseline as before, rather than letting the wrapper stretch it to the
   cell's full width or push the row's line-height around. */
.review-status-cell {
  display: inline-flex;
  align-items: center;
}

/* The resolved half of a `resolved/total` cell. It recedes rather than taking a
   colour of its own: the eye should land on the days still outstanding, and the
   pair has to stay legible under either tone, so it borrows whatever the cell is
   inked in. */
.count-pair__done,
.count-pair__sep {
  opacity: 0.5;
  font-weight: 500;
}
.count-pair__sep {
  padding: 0 1px;
}

/* Days already flagged, which is the strongest signal on the row. Same weight as
   .num-warn so the two attendance columns read as a pair at a glance, one step
   up in urgency. */
.num-critical {
  color: var(--dash-critical);
  font-weight: 600;
}

/* A figure that opens something. Inline-flex so the hover tint hugs the figure
   instead of washing the whole column, and a plain button so it is reachable by
   keyboard — both of these amounts used to be inert text.

   Named for the affordance rather than for the first column that wanted it:
   Contribution and Net pay both open a dialog off the figure itself, and they
   must read as the same kind of thing. */
.figure-link {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  margin: -4px -6px;
  padding: 4px 6px;
  border: 0;
  border-radius: var(--dash-r-sm);
  background: none;
  font: inherit;
  color: inherit;
  text-align: right;
  cursor: pointer;
  transition: background 0.12s ease;
}

.figure-link:hover {
  background: var(--dash-accent-bg);
}

.figure-link:focus-visible {
  outline: 2px solid var(--dash-accent);
  outline-offset: 1px;
}

/* Link-toned and underlined at rest, not only on hover: a reader scanning the
   column has to be able to tell the amount opens something without hovering it
   first. Underline rather than a trailing chevron so the digits still end on a
   common right edge and the column reads as numbers. */
.figure-link__amount {
  color: var(--dash-accent);
  font-weight: 600;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
  /* A softened --dash-accent: the underline should mark the amount as a link
     without competing with the digits it sits under. */
  text-decoration-color: rgba(46, 79, 212, 0.4);
  transition: text-decoration-color 0.12s ease;
}

.figure-link:hover .figure-link__amount {
  text-decoration-color: var(--dash-accent);
}

/* A zero recedes as it does in the other figure columns, but keeps the underline
   — zero is the case most likely to need opening, so it must not read as inert.
   A zero net pay earns this too: nothing paid is exactly the row worth asking
   about, and the dialog says whether the run recorded no days or the days came to
   nothing. */
.figure-link__amount--zero {
  color: var(--dash-ink-4);
  font-weight: 400;
  text-decoration-color: var(--dash-n-300, #d0d5dd);
}

.figure-link:hover .figure-link__amount--zero {
  color: var(--dash-accent);
  text-decoration-color: var(--dash-accent);
}

/* The second line under a figure — only the contribution cell has one, where the
   contribution's own status rides under its amount. */
.figure-link__sub {
  font-size: 11px;
  line-height: 1.3;
  color: var(--dash-ink-4);
}

/* The employee cell: a 30px face (or the person's initials on their identity
   colour) beside the name. Same construction as the Request tables. */
.identity {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.identity-avatar {
  flex-shrink: 0;
  border: 1px solid var(--dash-line);
}
.identity-avatar :deep(img) {
  object-fit: cover;
}
.identity-initials {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}
.identity-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
