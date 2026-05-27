<template>
  <q-page class="payroll-dashboard">
    <div class="dashboard-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">Disbursements</h1>
          </div>
          <div class="header-actions">
            <q-input
              v-model="disbursementSearch"
              dense
              outlined
              placeholder="Search disbursements..."
              class="header-search"
              clearable
            >
              <template v-slot:prepend><q-icon name="search" class="search-icon" /></template>
            </q-input>
            <q-btn
              v-if="activeTab === 'logs'"
              unelevated
              icon="add"
              label="Add Disbursements"
              color="positive"
              class="export-btn"
              no-caps
              @click="openCreateRunDialog"
            />
            <q-btn
              v-if="activeTab === 'funding'"
              unelevated
              icon="add"
              label="Add Funds"
              color="primary"
              class="export-btn"
              no-caps
              @click="scrollToFundingForm"
            />
            <q-btn
              unelevated
              icon="file_download"
              label="Export All"
              color="primary"
              class="export-btn"
              no-caps
              @click="exportToPDF"
            />
          </div>
        </div>
      </div>

      <!-- Stats Cards — always visible, outside tab panels -->
      <div class="stats-section">
        <div class="stats-card">
          <div class="stats-icon-wrapper stats-icon-blue">
            <q-icon name="people" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ totalEmployees }}</div>
            <div class="stats-label">Total Employees</div>
          </div>
        </div>
        <div class="stats-card">
          <div class="stats-icon-wrapper stats-icon-amber">
            <q-icon name="attach_money" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ formatCurrency(totalGrossPay) }}</div>
            <div class="stats-label">Total Gross Pay</div>
          </div>
        </div>
        <div class="stats-card">
          <div class="stats-icon-wrapper stats-icon-green">
            <q-icon name="account_balance_wallet" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ formatCurrency(totalNetPay) }}</div>
            <div class="stats-label">Total Net Pay</div>
          </div>
        </div>
        <div class="stats-card">
          <div class="stats-icon-wrapper stats-icon-purple">
            <q-icon name="receipt_long" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ totalPayrollRuns }}</div>
            <div class="stats-label">Total Payroll Runs</div>
          </div>
        </div>
      </div>

      <!-- Tabs (below stats) — pill style matching RequestPage -->
      <div class="tabs-section">
        <div class="tab-pills">
          <button
            :class="['tab-pill', { active: activeTab === 'logs' }]"
            @click="activeTab = 'logs'"
          >
            <q-icon name="receipt_long" class="tab-pill-icon" />
            <span>Logs</span>
          </button>
          <button
            :class="['tab-pill', { active: activeTab === 'funding' }]"
            @click="activeTab = 'funding'"
          >
            <q-icon name="account_balance" class="tab-pill-icon" />
            <span>Funding</span>
          </button>
        </div>
      </div>

      <!-- Tab Panels -->
      <q-tab-panels v-model="activeTab" animated class="tab-panels">
        <!-- ===================== LOGS TAB ===================== -->
        <q-tab-panel name="logs" class="tab-panel-content">
          <!-- Logs Table -->
          <div class="table-section" style="margin-bottom: 16px">
            <div class="table-header">
              <div class="table-title-section">
                <h2 class="table-title">Logs</h2>
                <div class="table-info">{{ payrollRunsSummary.length }} runs</div>
              </div>
              <q-btn
                flat
                round
                icon="refresh"
                class="header-btn"
                @click="fetchPayrollRunsSummary()"
                :loading="isLoading('fetchingPayrollRunsSummary')"
              />
            </div>

            <!-- Loading state -->
            <div v-if="isLoading('fetchingPayrollRunsSummary')" class="loading-state">
              <q-spinner color="primary" size="32px" />
            </div>

            <!-- Empty state -->
            <div v-else-if="!payrollRunsSummary.length" class="loading-state">
              <span class="text-grey-5">No payroll runs found</span>
            </div>

            <!-- One card per payroll run, with collapsible employees panel -->
            <div v-else class="runs-list">
              <div v-for="run in payrollRunsSummary" :key="run.id" class="run-card">
                <!-- Run header row - CLICKABLE to expand/collapse -->
                <div
                  class="run-card-header"
                  :class="{ expanded: selectedRun?.id === run.id }"
                  @click="toggleRunExpanded(run)"
                  style="cursor: pointer; user-select: none"
                >
                  <!-- Single row: [chevron + name/date] ---- [stat cols] ---- [action btn] -->
                  <div class="run-header-stats-row">
                    <!-- LEFT: expand chevron + stacked name + date -->
                    <div class="run-header-name-group">
                      <q-icon
                        name="expand_more"
                        :style="{
                          transform: selectedRun?.id === run.id ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s ease',
                        }"
                        size="18px"
                        class="expand-icon"
                      />
                      <div class="run-name-stack">
                        <div class="run-name">
                          {{ getRunBaseName(run) }}
                          <q-badge
                            v-if="run.__optimistic"
                            color="orange"
                            label="syncing…"
                            class="q-ml-xs"
                            style="font-size: 10px"
                          >
                            <q-tooltip>Waiting for server confirmation</q-tooltip>
                          </q-badge>
                        </div>
                        <div class="run-period-tag" v-if="getRunPeriod(run)">
                          {{ getRunPeriod(run) }}
                        </div>
                      </div>
                    </div>

                    <!-- CENTER: stat columns -->
                    <div class="run-header-stat-cols">
                      <div class="run-header-stat-col">
                        <span class="run-header-stat-label">Employees</span>
                        <span class="run-header-stat-val">{{ run.number_of_employee ?? '—' }}</span>
                      </div>
                      <div class="run-header-stat-col">
                        <span class="run-header-stat-label">Calculated</span>
                        <span class="run-header-stat-val">{{
                          formatCurrency(run.calculated_amount)
                        }}</span>
                      </div>
                      <div class="run-header-stat-col">
                        <span class="run-header-stat-label">Total Net Pay</span>
                        <span class="run-header-stat-val">{{
                          formatCurrency(run.total_net_pay)
                        }}</span>
                      </div>
                      <div class="run-header-stat-col">
                        <span class="run-header-stat-label">Funded</span>
                        <span class="run-header-stat-val">{{
                          formatCurrency(run.funded ?? 0)
                        }}</span>
                      </div>
                      <div class="run-header-stat-col">
                        <span class="run-header-stat-label">Released</span>
                        <span class="run-header-stat-val">{{
                          formatCurrency(run.released ?? 0)
                        }}</span>
                      </div>
                      <div class="run-header-stat-col">
                        <span class="run-header-stat-label">Status</span>
                        <span class="run-header-stat-val">
                          <span :class="['run-status-chip', `run-status-${run.status}`]">
                            {{ getStageLabel(run.status) }}
                          </span>
                        </span>
                      </div>
                    </div>

                    <!-- RIGHT: action button, always flush to the right edge -->
                    <div class="run-header-action" @click.stop>
                      <!-- Expanded draft run with a ready-for-payment employee selected → Disburse -->
                      <q-btn
                        v-if="
                          selectedRun?.id === run.id &&
                          workflowStage === 'draft' &&
                          hasReadyForPaymentSelected &&
                          !isRunFullyDisbursed(run)
                        "
                        unelevated
                        no-caps
                        size="sm"
                        icon="payments"
                        color="teal"
                        label="Disburse"
                        class="run-action-btn"
                        :loading="isSaving('disbursing') && selectedRun?.id === run.id"
                        @click="selectAndDisburse(run)"
                      />
                      <q-btn
                        v-else-if="
                          selectedRun?.id === run.id &&
                          allEmployeesReadyForPayment &&
                          !isRunFullyDisbursed(run)
                        "
                        unelevated
                        no-caps
                        size="sm"
                        icon="payments"
                        color="teal"
                        label="Disburse"
                        class="run-action-btn"
                        :loading="isSaving('disbursing') && selectedRun?.id === run.id"
                        @click="selectAndDisburse(run)"
                      />
                      <q-btn
                        v-else-if="
                          run.status === 'draft' ||
                          (selectedRun?.id === run.id && workflowStage === 'draft')
                        "
                        unelevated
                        no-caps
                        size="sm"
                        icon="send"
                        color="orange"
                        label="Release"
                        class="run-action-btn"
                        :loading="isSaving('bulkReleasing') && selectedRun?.id === run.id"
                        @click="bulkReleaseAll(run)"
                      />
                      <div v-else-if="run.status === 'pending_review'" class="run-await-chip">
                        <q-icon name="hourglass_top" size="13px" />
                        <span>Awaiting Acknowledgement</span>
                      </div>
                      <q-btn
                        v-else-if="run.status === 'ready_for_payment' && !isRunFullyDisbursed(run)"
                        unelevated
                        no-caps
                        size="sm"
                        icon="payments"
                        color="teal"
                        label="Disburse"
                        class="run-action-btn"
                        :loading="isSaving('disbursing') && selectedRun?.id === run.id"
                        @click="selectAndDisburse(run)"
                      />
                      <div
                        v-else-if="['disbursed', 'completed', 'closed'].includes(run.status)"
                        class="run-done-chip"
                      >
                        <q-icon name="task_alt" size="18px" color="positive" />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Employees panel — only visible when run is expanded -->
                <div v-if="selectedRun?.id === run.id" class="employees-panel">
                  <!-- Panel header / merged action toolbar -->
                  <div class="employees-panel-header">
                    <div class="employees-panel-title">
                      <q-icon name="people" size="16px" color="primary" />
                      <span>Employees</span>
                      <span class="employees-panel-count">{{
                        run.id === selectedRun?.id ? payrollRunEmployees.length : '—'
                      }}</span>
                      <span
                        v-if="selectedEmployees.length && run.id === selectedRun?.id"
                        class="employees-panel-selected"
                      >
                        · {{ selectedEmployees.length }} selected
                      </span>
                    </div>
                    <div class="employees-panel-actions">
                      <q-input
                        dense
                        outlined
                        v-model="employeeSearchQuery"
                        placeholder="Search employees..."
                        class="employee-search-input"
                        clearable
                        style="min-width: 180px"
                      >
                        <template v-slot:prepend><q-icon name="search" size="16px" /></template>
                      </q-input>
                      <q-checkbox
                        v-model="selectAll"
                        label="Select All"
                        dense
                        @update:model-value="toggleSelectAll"
                        :disable="getActionableEmployees(workflowStage).length === 0"
                        class="select-all-checkbox"
                      />
                      <!-- Step 4: Bulk Release (draft → pending_review) -->
                      <q-btn
                        v-if="
                          run.id === selectedRun?.id &&
                          workflowStage === 'draft' &&
                          selectedEmployees.length > 0
                        "
                        unelevated
                        dense
                        no-caps
                        size="sm"
                        icon="send"
                        color="orange"
                        :label="releaseBtnLabel"
                        :loading="isSaving('bulkReleasing')"
                        @click="handleBulkAction"
                      />
                      <!-- Early disbursal in draft stage: some employees already acknowledged while others are still draft -->
                      <q-btn
                        v-if="
                          run.id === selectedRun?.id &&
                          workflowStage === 'draft' &&
                          getActionableEmployees('pending_review').length > 0 &&
                          selectedEmployees.length > 0
                        "
                        unelevated
                        dense
                        no-caps
                        size="sm"
                        icon="payments"
                        color="teal"
                        label="Disburse Ready"
                        :loading="isSaving('disbursing')"
                        @click="handleBulkDisburse"
                      />
                      <!-- Step 9: Disburse (ready_for_payment → disbursed/completed) -->
                      <q-btn
                        v-if="
                          run.id === selectedRun?.id &&
                          workflowStage === 'ready_for_payment' &&
                          selectedEmployees.length > 0
                        "
                        unelevated
                        dense
                        no-caps
                        size="sm"
                        icon="payments"
                        color="teal"
                        label="Disburse Selected"
                        :loading="isSaving('disbursing')"
                        @click="handleBulkDisburse"
                      />
                      <!-- Early disbursal: pending_review stage but some employees already acknowledged -->
                      <q-btn
                        v-if="
                          run.id === selectedRun?.id &&
                          workflowStage === 'pending_review' &&
                          selectedEmployees.length > 0
                        "
                        unelevated
                        dense
                        no-caps
                        size="sm"
                        icon="payments"
                        color="teal"
                        :label="`Disburse ${selectedEmployees.length === getActionableEmployees('pending_review').length ? 'All Acknowledged' : 'Selected'} (${selectedEmployees.length})`"
                        :loading="isSaving('disbursing')"
                        @click="handleBulkDisburse"
                      />
                    </div>
                  </div>

                  <!-- Loading employees -->
                  <div
                    v-if="isLoading('fetchingPayrollRunEmployees') && run.id === selectedRun?.id"
                    style="display: flex; align-items: center; gap: 10px; padding: 20px 24px"
                  >
                    <q-spinner color="primary" size="20px" />
                    <span style="font-size: 13px; color: #6b7280">Loading employees...</span>
                  </div>

                  <!-- Early disbursal info banner: shown in pending_review when some already acknowledged -->
                  <div
                    v-if="
                      run.id === selectedRun?.id &&
                      workflowStage === 'pending_review' &&
                      getActionableEmployees('pending_review').length > 0
                    "
                    style="
                      display: flex;
                      align-items: center;
                      gap: 10px;
                      padding: 10px 16px;
                      background: #f0fdf4;
                      border-left: 3px solid #14b8a6;
                      margin: 8px 14px 0;
                      border-radius: 6px;
                      font-size: 13px;
                      color: #0f766e;
                    "
                  >
                    <q-icon name="payments" size="16px" color="teal" />
                    <span>
                      <strong
                        >{{ getActionableEmployees('pending_review').length }} employee(s)</strong
                      >
                      have acknowledged their payslip and can be disbursed early. Select them
                      individually or use <strong>Select All</strong> to release their salary now.
                    </span>
                  </div>

                  <!-- Early disbursal info banner: shown in draft when some employees already acknowledged while others are still draft -->
                  <div
                    v-if="
                      run.id === selectedRun?.id &&
                      workflowStage === 'draft' &&
                      getActionableEmployees('pending_review').length > 0
                    "
                    style="
                      display: flex;
                      align-items: center;
                      gap: 10px;
                      padding: 10px 16px;
                      background: #f0fdf4;
                      border-left: 3px solid #14b8a6;
                      margin: 8px 14px 0;
                      border-radius: 6px;
                      font-size: 13px;
                      color: #0f766e;
                    "
                  >
                    <q-icon name="payments" size="16px" color="teal" />
                    <span>
                      <strong
                        >{{ getActionableEmployees('pending_review').length }} employee(s)</strong
                      >
                      have acknowledged their payslip and can be disbursed early. Select them
                      individually to disburse their salary now.
                    </span>
                  </div>

                  <!-- Virtual Scrolled Employees Table -->
                  <div class="employees-table-container" v-if="run.id === selectedRun?.id">
                    <!-- Table Header -->
                    <div class="employees-table-header">
                      <div class="employees-th"></div>
                      <div class="employees-th">Employee</div>
                      <div class="employees-th">Status</div>
                      <div class="employees-th">Gross Pay</div>
                      <div class="employees-th">Net Pay</div>
                      <div class="employees-th">Total Hours</div>
                      <div class="employees-th">Actions</div>
                    </div>

                    <!-- Virtual Scroll Container -->
                    <div v-if="filteredEmployees.length > 0" class="virtual-scroll-container">
                      <q-virtual-scroll
                        :items="filteredEmployees"
                        virtual-scroll-slice-size="50"
                        virtual-scroll-item-size="72"
                        class="employee-virtual-scroll"
                        style="max-height: 600px"
                      >
                        <template v-slot="{ item: emp }">
                          <div
                            class="employees-table-row"
                            :class="{
                              'selected-row': isEmployeeSelected(emp.employee_id),
                              'failed-row': emp.lastError,
                            }"
                            :key="`${selectedRun?.id || 'no-run'}-${emp.employee_id || emp.payslip_id || emp.id || 'idx'}-${emp.status || 'unknown'}`"
                          >
                            <div class="employees-td">
                              <!-- Employees still awaiting acknowledgement — locked, not actionable -->
                              <q-checkbox
                                v-if="
                                  workflowStage === 'pending_review' &&
                                  emp.status === 'pending_review'
                                "
                                :model-value="false"
                                disable
                                dense
                                checked-icon="hourglass_top"
                                color="orange"
                              >
                                <q-tooltip>Waiting for employee acknowledgement</q-tooltip>
                              </q-checkbox>

                              <!-- Normal actionable checkbox for draft/ready_for_payment stages -->
                              <q-checkbox
                                v-else-if="isEmployeeActionable(emp)"
                                :model-value="isEmployeeSelected(emp.employee_id)"
                                @update:model-value="toggleEmployeeSelection(emp.employee_id)"
                                dense
                              >
                                <q-tooltip v-if="workflowStage === 'pending_review'">
                                  Acknowledged — select to disburse early
                                </q-tooltip>
                              </q-checkbox>

                              <!-- Completed/disbursement completed -->
                              <q-icon
                                v-else-if="['disbursed', 'completed'].includes(emp.status)"
                                name="task_alt"
                                color="positive"
                                size="20px"
                              />

                              <!-- Non-actionable -->
                              <span v-else class="text-grey-5">—</span>
                            </div>
                            <div class="employees-td employee-cell">
                              <div class="employee-info">
                                <q-avatar size="32px" class="avatar-fallback">{{
                                  getInitials(emp.employee_name || emp.employee)
                                }}</q-avatar>
                                <div class="employee-details">
                                  <div class="employee-name">
                                    {{ emp.employee_name || emp.employee }}
                                  </div>
                                  <div class="employee-id">{{ emp.employee_id || 'N/A' }}</div>
                                </div>
                              </div>
                            </div>
                            <div class="employees-td">
                              <q-badge
                                :color="getStatusColor(emp.status)"
                                :label="getStatusLabel(emp.status)"
                              />
                              <q-tooltip v-if="emp.lastError" class="bg-negative">{{
                                emp.lastError
                              }}</q-tooltip>
                            </div>
                            <div class="employees-td amount-cell">
                              <div class="amount-display">{{ formatCurrency(emp.gross_pay) }}</div>
                              <div class="amount-progress">
                                <div
                                  class="amount-bar gross-bar"
                                  :style="{
                                    width:
                                      getPayPercentage(emp.gross_pay, maxGrossPayComputed) + '%',
                                  }"
                                ></div>
                              </div>
                            </div>
                            <div class="employees-td amount-cell">
                              <div class="amount-display">{{ formatCurrency(emp.net_pay) }}</div>
                              <div class="amount-progress">
                                <div
                                  class="amount-bar net-bar"
                                  :style="{
                                    width: getPayPercentage(emp.net_pay, maxNetPayComputed) + '%',
                                  }"
                                ></div>
                              </div>
                            </div>
                            <div class="employees-td">
                              <div class="hours-badge">
                                {{ emp.breakdown?.attendance?.total_hours_worked || 0 }}h
                              </div>
                            </div>
                            <div class="employees-td actions-cell">
                              <div class="workflow-actions-cell">
                                <q-btn
                                  v-if="emp.lastError"
                                  flat
                                  dense
                                  icon="refresh"
                                  color="negative"
                                  size="sm"
                                  @click.stop="retryEmployeeAction(emp)"
                                  round
                                  ><q-tooltip>Retry</q-tooltip></q-btn
                                >
                                <q-btn
                                  flat
                                  round
                                  dense
                                  icon="more_horiz"
                                  class="action-menu-btn"
                                  @click.stop
                                >
                                  <!-- FIX: menu lives inside the button so Quasar anchors it correctly -->
                                  <q-menu
                                    anchor="bottom right"
                                    self="top right"
                                    class="action-dropdown"
                                    @before-show="menuEmployee = emp"
                                  >
                                    <q-list dense style="min-width: 180px">
                                      <q-item
                                        v-if="menuEmployee?.status === 'draft'"
                                        clickable
                                        v-close-popup
                                        @click="handleMenuAction('release')"
                                        class="dropdown-item"
                                      >
                                        <q-item-section avatar>
                                          <q-icon name="send" size="16px" color="orange" />
                                        </q-item-section>
                                        <q-item-section>Release for Review</q-item-section>
                                      </q-item>
                                      <q-item
                                        v-if="menuEmployee?.status === 'pending_review'"
                                        clickable
                                        v-close-popup
                                        @click="handleMenuAction('acknowledge')"
                                        class="dropdown-item"
                                      >
                                        <q-item-section avatar>
                                          <q-icon name="fact_check" size="16px" color="blue" />
                                        </q-item-section>
                                        <q-item-section>View &amp; Acknowledge</q-item-section>
                                      </q-item>
                                      <q-item
                                        v-if="
                                          menuEmployee?.status === 'ready_for_payment' &&
                                          menuEmployee?.review_status !== 'pending'
                                        "
                                        clickable
                                        v-close-popup
                                        @click="handleMenuAction('disburse')"
                                        class="dropdown-item"
                                      >
                                        <q-item-section avatar>
                                          <q-icon name="payments" size="16px" color="teal" />
                                        </q-item-section>
                                        <q-item-section>Disburse</q-item-section>
                                      </q-item>
                                      <q-item
                                        v-if="
                                          menuEmployee?.status === 'disbursed' &&
                                          menuEmployee?.payment_method === 'cash'
                                        "
                                        clickable
                                        v-close-popup
                                        @click="handleMenuAction('markComplete')"
                                        class="dropdown-item"
                                      >
                                        <q-item-section avatar>
                                          <q-icon name="handshake" size="16px" color="positive" />
                                        </q-item-section>
                                        <q-item-section>Confirm Money Received</q-item-section>
                                      </q-item>
                                      <q-item
                                        v-if="
                                          menuEmployee?.status === 'disbursed' &&
                                          menuEmployee?.payment_method !== 'cash'
                                        "
                                        disable
                                        class="dropdown-item"
                                      >
                                        <q-item-section avatar>
                                          <q-icon name="hourglass_top" size="16px" color="grey" />
                                        </q-item-section>
                                        <q-item-section class="text-grey-6"
                                          >Processing bank transfer…</q-item-section
                                        >
                                      </q-item>
                                      <q-separator
                                        v-if="!['completed'].includes(menuEmployee?.status)"
                                        spaced
                                      />
                                      <q-item
                                        clickable
                                        v-close-popup
                                        @click="handleMenuAction('view')"
                                        class="dropdown-item"
                                      >
                                        <q-item-section avatar>
                                          <q-icon name="visibility" size="16px" />
                                        </q-item-section>
                                        <q-item-section>View details</q-item-section>
                                      </q-item>
                                      <q-item
                                        clickable
                                        v-close-popup
                                        @click="handleMenuAction('download')"
                                        class="dropdown-item"
                                      >
                                        <q-item-section avatar>
                                          <q-icon name="description" size="16px" />
                                        </q-item-section>
                                        <q-item-section>Download payslip</q-item-section>
                                      </q-item>
                                    </q-list>
                                  </q-menu>
                                </q-btn>
                              </div>
                            </div>
                          </div>
                        </template>
                      </q-virtual-scroll>
                    </div>

                    <!-- Empty state -->
                    <div v-else-if="!isLoading('fetchingPayrollRunEmployees')" class="empty-state">
                      <span class="text-grey-5">No employees found</span>
                    </div>

                    <!-- Click to load state -->
                    <div
                      v-else
                      class="empty-state"
                      @click="loadRunEmployees(run)"
                      style="cursor: pointer; color: #3b82f6"
                    >
                      <q-icon name="refresh" size="14px" /> Click to load employees
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <!-- ===================== FUNDING TAB ===================== -->
        <q-tab-panel name="funding" class="tab-panel-funding">
          <div class="funding-layout">
            <!-- LEFT: Add Funds Form -->
            <div class="funding-form-card" ref="fundingFormRef">
              <div class="funding-form-header">
                <div class="funding-form-header-icon">
                  <q-icon name="account_balance_wallet" size="18px" />
                </div>
                <div>
                  <h2 class="funding-form-title">Add Funds</h2>
                  <p class="funding-form-subtitle">
                    Record a new funding entry for a disbursement log
                  </p>
                </div>
              </div>

              <div class="funding-divider" />

              <div class="funding-section-label">Disbursement Log</div>
              <div class="funding-form-field" style="margin-bottom: 16px">
                <q-select
                  v-model="fundingForm.logId"
                  outlined
                  dense
                  emit-value
                  map-options
                  :options="runOptions"
                  placeholder="Select a disbursement log"
                  no-error-icon
                  @update:model-value="onFundingLogChange"
                >
                  <template v-slot:prepend
                    ><q-icon name="receipt_long" size="16px" color="grey-6"
                  /></template>
                </q-select>
              </div>

              <div class="funding-section-label">Payment Details</div>
              <div class="funding-form-grid">
                <div class="funding-form-field">
                  <label class="funding-field-label">Date</label>
                  <q-input v-model="fundingForm.date" outlined dense type="date" no-error-icon />
                </div>

                <div class="funding-form-field">
                  <label class="funding-field-label">Type</label>
                  <q-select
                    v-model="fundingForm.type"
                    outlined
                    dense
                    emit-value
                    map-options
                    :options="[
                      { label: 'Check', value: 'check' },
                      { label: 'Bank Transfer', value: 'bank_transfer' },
                    ]"
                    no-error-icon
                  />
                </div>

                <div class="funding-form-field">
                  <label class="funding-field-label">Reference #</label>
                  <q-input
                    v-model="fundingForm.reference"
                    outlined
                    dense
                    placeholder="e.g. 125436345"
                    no-error-icon
                  >
                    <template v-slot:prepend
                      ><span style="font-size: 13px; color: #9ca3af">#</span></template
                    >
                  </q-input>
                </div>

                <div class="funding-form-field">
                  <label class="funding-field-label">Source</label>
                  <q-select
                    v-model="fundingForm.source"
                    outlined
                    dense
                    emit-value
                    map-options
                    :options="fundingSources"
                    :disable="!fundingForm.logId || fundingSources.length === 0"
                    :placeholder="
                      !fundingForm.logId
                        ? 'Select a log first'
                        : !payrollRunsSummary.find((r) => r.id === fundingForm.logId)?.department_id
                          ? 'Log has no department'
                          : fundingSources.length === 0
                            ? 'No bank accounts found'
                            : 'Select bank account'
                    "
                    no-error-icon
                  />
                </div>

                <div class="funding-form-field funding-form-field-full">
                  <label class="funding-field-label">Amount</label>
                  <q-input
                    v-model="fundingForm.amount"
                    outlined
                    dense
                    type="number"
                    placeholder="0.00"
                    no-error-icon
                  >
                    <template v-slot:prepend
                      ><span style="font-size: 13px; font-weight: 600; color: #374151"
                        >₱</span
                      ></template
                    >
                  </q-input>
                  <div v-if="fundingForm.logId" class="funding-amount-helper">
                    Total Gross Pay: {{ formatCurrency(selectedRunGrossPay) }} | Total Net Pay:
                    {{ formatCurrency(selectedRunNetPay) }}
                  </div>
                </div>
              </div>

              <div class="funding-section-label" style="margin-top: 4px">
                Notes <span class="funding-optional">(optional)</span>
              </div>
              <div class="funding-form-field" style="margin-bottom: 20px">
                <q-input
                  v-model="fundingForm.notes"
                  outlined
                  dense
                  placeholder="Add a note about this funding entry..."
                  no-error-icon
                />
              </div>

              <div class="funding-divider" />

              <div class="funding-form-actions">
                <q-btn
                  unelevated
                  color="primary"
                  label="Add Funds"
                  icon="add"
                  no-caps
                  :loading="savingFunding"
                  @click="submitFunding"
                  class="funding-submit-btn"
                />
              </div>
            </div>

            <!-- RIGHT: Funding History -->
            <div class="funding-history-section">
              <div class="funding-history-header">
                <div class="funding-form-header-icon funding-history-icon">
                  <q-icon name="history" size="18px" />
                </div>
                <div>
                  <h3 class="funding-history-title">History</h3>
                  <p class="funding-form-subtitle">All funding entries across logs</p>
                </div>
              </div>

              <div class="funding-divider" />

              <div v-if="fundingHistoryLoading" class="funding-empty-state">
                <q-spinner color="primary" size="24px" />
                <span class="funding-empty-text">Loading history...</span>
              </div>

              <div v-else-if="filteredFundingHistory.length === 0" class="funding-empty-state">
                <q-icon
                  :name="fundingForm.logId ? 'inbox' : 'receipt_long'"
                  size="36px"
                  color="grey-4"
                />
                <span class="funding-empty-text">
                  {{
                    fundingForm.logId
                      ? 'No funding entries for this log yet'
                      : 'No funding entries found'
                  }}
                </span>
              </div>

              <div v-else class="funding-history-table-wrap">
                <table class="funding-history-table">
                  <thead>
                    <tr>
                      <th>Log</th>
                      <th>Source</th>
                      <th style="text-align: right">Amount</th>
                      <th style="text-align: right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="entry in filteredFundingHistory" :key="entry.id">
                      <td>
                        <div class="fh-log-name">{{ entry.logName }}</div>
                        <div class="fh-log-period">{{ entry.period }}</div>
                      </td>
                      <td>
                        <span class="fh-source-badge">{{ entry.source }}</span>
                      </td>
                      <td class="fh-amount" style="text-align: right">
                        {{ formatCurrency(entry.amount) }}
                      </td>
                      <td class="fh-actions" style="text-align: right">
                        <q-btn
                          flat
                          dense
                          no-caps
                          size="sm"
                          label="View"
                          color="primary"
                          @click="viewFundingEntry(entry)"
                        />
                        <span class="fh-sep">|</span>
                        <q-btn
                          flat
                          dense
                          no-caps
                          size="sm"
                          label="Edit"
                          color="grey-7"
                          @click="editFundingEntry(entry)"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div class="funding-history-footer">
                  <q-btn
                    flat
                    no-caps
                    size="sm"
                    label="View all funding logs"
                    color="primary"
                    icon="open_in_new"
                  />
                  <span class="fh-page-info">Page 1 of {{ fundingTotalPages }}</span>
                </div>
              </div>
            </div>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <!-- ======================== CREATE PAYROLL RUN DIALOG ======================== -->
    <q-dialog v-model="showCreateRunDialog" persistent>
      <q-card style="min-width: 420px; max-width: 95vw; border-radius: 14px">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon">
              <q-icon name="add_circle" size="22px" />
            </q-avatar>
            <div>
              <div class="modal-title">New Payroll Run</div>
              <div class="modal-subtitle">Create and compute a new payroll run</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-content">
          <div class="q-gutter-sm">
            <q-select
              v-model="createRunForm.type"
              label="Payroll Type *"
              outlined
              dense
              emit-value
              map-options
              :options="[
                { label: 'Salary', value: 'salary' },
                { label: 'Hourly', value: 'hourly' },
                { label: '13th Month', value: '13th_month' },
              ]"
              no-error-icon
            >
              <template v-slot:prepend><q-icon name="payments" /></template>
            </q-select>
            <q-select
              v-model="createRunForm.department_id"
              label="Department"
              outlined
              dense
              clearable
              emit-value
              map-options
              :options="departmentOptions"
              :loading="!departments?.length && !!companyId"
              hint="Optional"
              no-error-icon
            >
              <template v-slot:prepend><q-icon name="account_tree" /></template>
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey-5">No departments found</q-item-section>
                </q-item>
              </template>
            </q-select>
            <q-input
              v-model="createRunForm.start_date"
              label="Start Date *"
              outlined
              dense
              type="date"
              hint="e.g. 2026-05-01"
            />
            <q-input
              v-model="createRunForm.end_date"
              label="End Date *"
              outlined
              dense
              type="date"
              hint="e.g. 2026-05-15"
            />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Cancel" v-close-popup class="dialog-btn" no-caps />
          <q-btn
            unelevated
            color="positive"
            label="Create & Compute"
            icon="play_arrow"
            :loading="createRunLoading"
            @click="submitCreatePayrollRun"
            class="dialog-btn primary-btn"
            no-caps
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ======================== DETAIL MODAL ======================== -->
    <q-dialog v-model="showDetailModal" persistent>
      <q-card class="detail-modal-card">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon">
              <q-icon name="receipt_long" size="22px" />
            </q-avatar>
            <div>
              <div class="modal-title">Payroll Details</div>
              <div class="modal-subtitle" v-if="selectedRecord">{{ selectedRecord.employee }}</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" @click="closeDetailModal" />
        </q-card-section>

        <q-separator />

        <q-card-section class="modal-content" v-if="selectedRecord">
          <div class="modal-section-title">Employee information</div>
          <div class="detail-grid-cards">
            <div class="detail-card">
              <div class="detail-card-label">Name</div>
              <div class="detail-card-value">{{ selectedRecord.employee }}</div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Employee ID</div>
              <div class="detail-card-value">{{ selectedRecord.employee_id || 'N/A' }}</div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Period</div>
              <div class="detail-card-value">{{ selectedRecord.period }}</div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Run</div>
              <div class="detail-card-value">#{{ selectedRecord.run }}</div>
            </div>
          </div>
          <div class="modal-section-title">Pay information</div>
          <div class="detail-grid-cards">
            <div class="detail-card">
              <div class="detail-card-label">Gross Pay</div>
              <div class="detail-card-value amount-green">
                {{ formatCurrency(selectedRecord.gross_pay) }}
              </div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Net Pay</div>
              <div class="detail-card-value amount-blue">
                {{ formatCurrency(selectedRecord.net_pay) }}
              </div>
            </div>
            <div class="detail-card detail-card-full">
              <div class="detail-card-label">Deductions</div>
              <div class="detail-card-value amount-red">
                {{ formatCurrency(selectedRecord.gross_pay - selectedRecord.net_pay) }}
              </div>
            </div>
          </div>
          <div class="modal-section-title">Hours breakdown</div>
          <div class="detail-grid-cards">
            <div class="detail-card">
              <div class="detail-card-label">Regular</div>
              <div class="detail-card-value">
                {{ selectedRecord.breakdown?.attendance?.regular_hours || 0 }}h
              </div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Overtime</div>
              <div class="detail-card-value amount-amber">
                {{ selectedRecord.breakdown?.attendance?.overtime_hours || 0 }}h
              </div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Holiday</div>
              <div class="detail-card-value amount-purple">
                {{ selectedRecord.breakdown?.attendance?.holiday_hours || 0 }}h
              </div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Total</div>
              <div class="detail-card-value">
                {{ selectedRecord.breakdown?.attendance?.total_hours_worked || 0 }}h
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Close" @click="closeDetailModal" class="dialog-btn" no-caps />
          <q-btn
            color="primary"
            label="Download Payslip"
            @click="downloadPayslip(selectedRecord)"
            class="dialog-btn primary-btn"
            no-caps
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ========= STEP 5/6: EMPLOYEE PAYSLIP PREVIEW + ACKNOWLEDGE DIALOG ========= -->
    <q-dialog v-model="showAcknowledgeDialog" persistent>
      <q-card style="min-width: 460px; max-width: 95vw; border-radius: 14px">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon" color="blue-1">
              <q-icon name="fact_check" size="22px" color="blue" />
            </q-avatar>
            <div>
              <div class="modal-title">Payslip Review &amp; Acknowledge</div>
              <div class="modal-subtitle" v-if="acknowledgeTarget">
                {{ acknowledgeTarget.employee_name || acknowledgeTarget.employee }}
              </div>
            </div>
          </div>
          <q-btn
            icon="close"
            flat
            round
            dense
            class="modal-close-btn"
            @click="showAcknowledgeDialog = false"
          />
        </q-card-section>

        <q-separator />

        <q-card-section class="modal-content" v-if="acknowledgeTarget">
          <!-- Loading spinner while fetching full payslip (Step 5) -->
          <div
            v-if="acknowledgeDialogLoading"
            style="display: flex; align-items: center; gap: 10px; padding: 16px 0"
          >
            <q-spinner color="primary" size="20px" />
            <span style="font-size: 13px; color: #6b7280">Loading payslip details…</span>
          </div>

          <template v-else>
            <!-- Status banner -->
            <div
              style="
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 14px;
                background: #eff6ff;
                border-radius: 8px;
                margin-bottom: 16px;
              "
            >
              <q-icon name="info" color="blue" size="18px" />
              <span style="font-size: 13px; color: #1d4ed8">
                Review the payslip details below. The employee must acknowledge before payment can
                be released.
              </span>
            </div>

            <!-- Pay summary -->
            <div class="modal-section-title">Pay summary</div>
            <div class="detail-grid-cards">
              <div class="detail-card">
                <div class="detail-card-label">Net Pay</div>
                <div class="detail-card-value amount-blue">
                  {{ formatCurrency(acknowledgeTarget.net_pay) }}
                </div>
              </div>
              <div class="detail-card">
                <div class="detail-card-label">Payment Method</div>
                <div class="detail-card-value">
                  {{ acknowledgeTarget.payment_method || '—' }}
                </div>
              </div>
              <div class="detail-card">
                <div class="detail-card-label">Current Status</div>
                <div class="detail-card-value">
                  <q-badge
                    :color="getStatusColor(acknowledgeTarget.status)"
                    :label="getStatusLabel(acknowledgeTarget.status)"
                  />
                </div>
              </div>
              <div class="detail-card">
                <div class="detail-card-label">Review Status</div>
                <div class="detail-card-value">
                  {{ acknowledgeTarget.review_status || 'pending' }}
                </div>
              </div>
            </div>

            <!-- Note -->
            <div
              style="
                font-size: 12px;
                color: #6b7280;
                margin-top: 12px;
                padding: 8px 12px;
                background: #f9fafb;
                border-radius: 6px;
              "
            >
              Once acknowledged, the payslip moves to <strong>Ready for Payment</strong> and the
              admin will be able to disburse it.
            </div>
          </template>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn
            flat
            label="Cancel"
            no-caps
            @click="showAcknowledgeDialog = false"
            class="dialog-btn"
          />
          <q-btn
            unelevated
            color="blue"
            label="Acknowledge Payslip"
            icon="check_circle"
            no-caps
            :loading="acknowledgeLoading"
            :disable="acknowledgeTarget?.status !== 'pending_review'"
            @click="submitAcknowledge"
            class="dialog-btn primary-btn"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useQuasar } from 'quasar'
import { usePayroll } from 'src/composables/page/usePayroll'
import { useCompany } from 'src/composables/page/useCompany'
import { useAdminDepartments } from 'src/composables/admin/useAdminDepartments'
import { useAdminCostCenters } from 'src/composables/admin/useAdminCostCenters'

const $q = useQuasar()
const { companyId } = useCompany()
const {
  payrollRunsSummary,
  fetchPayrollRunsSummary: _fetchPayrollRunsSummary,
  payrollRunId,
  workflowStage,
  payrollRunEmployees,
  // Per-operation loading states (replaces global loading/saving/workflowLoading)
  isLoading,
  isSaving,
  // New flow API functions
  bulkReleasePayslips,
  addDisbursementFunding,
  fetchDisbursementFundings,
  disbursePayslips,
  fetchPayrollRunEmployees,
  createPayrollRun,
  // Step 5: employee view payslips
  //employeePayslips,//
  fetchEmployeePayslips,
  // Step 6: employee acknowledge payslip
  acknowledgePayslip,
  // Step 10: employee confirm money received
  confirmMoneyReceived,
  // Cost-center bank accounts by log
  fetchDisbursementLogBankAccounts,
  // Retry utility
  retryWithBackoff,
} = usePayroll()

// ─── Departments (for the Add Disbursement dialog) ────────────────────────────
const { departments, fetchDepartments } = useAdminDepartments()

// ─── Cost Centers (for funding source bank accounts) ───────────────────────────
const { costCenters, fetchCostCenters } = useAdminCostCenters()

// ─── Resolve company ID (handles plain string and JSON object in storage) ─────
function getResolvedCompanyId() {
  const raw = companyId.value
  if (raw && typeof raw !== 'object') {
    const n = Number(raw)
    if (!Number.isNaN(n) && n > 0) return n
  }
  // Fallback: try parsing localStorage keys that may hold JSON objects
  const keys = ['selectedCompany', 'company_id', 'companyId']
  for (const key of keys) {
    const stored = localStorage.getItem(key)
    if (!stored) continue
    try {
      const parsed = JSON.parse(stored)
      const id = parsed?.id ?? parsed
      const n = Number(id)
      if (!Number.isNaN(n) && n > 0) return n
    } catch {
      const n = Number(stored)
      if (!Number.isNaN(n) && n > 0) return n
    }
  }
  console.warn('[PayrollPage] No valid company ID resolved')
  return null
}

// ─── Always pass company_id to summary fetches ────────────────────────────────
// fetchPayrollRunsSummary (from usePayroll) accepts a params object.
// Wrapping it here means every call site automatically includes company_id
// without having to remember to pass it manually everywhere.
const fetchPayrollRunsSummary = (extraParams = {}) => {
  const cid = getResolvedCompanyId()
  const params = cid ? { company_id: cid, ...extraParams } : extraParams
  console.debug('[PayrollPage] fetchPayrollRunsSummary params:', params)
  return _fetchPayrollRunsSummary(params)
}

// ─── Tab State ───────────────────────────────────────────────────────────────
const activeTab = ref('logs')
const disbursementSearch = ref('')

watch(activeTab, (tab) => {
  if (tab === 'funding') {
    loadAllFundingHistory()
  }
})

// ─── Funding Tab State ────────────────────────────────────────────────────────
const fundingFormRef = ref(null)
const savingFunding = ref(false)
const fundingHistoryLoading = ref(false)
//const fundingPage = ref(1)
const fundingPageSize = 7

const fundingForm = ref({
  logId: null,
  date: new Date().toISOString().split('T')[0],
  type: 'check',
  reference: '',
  source: null,
  amount: '',
  notes: '',
})

// Funding sources — populated dynamically from the selected log's department cost center
const fundingSources = ref([])

  // All funding history entries (loaded globally, filtered per log when selected)
const allFundingHistory = ref([])

const filteredFundingHistory = computed(() => {
  return allFundingHistory.value
})

const fundingTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredFundingHistory.value.length / fundingPageSize)),
)

// Computed totals for the currently selected payroll run (used in Add Funds form)
const selectedRunGrossPay = computed(() => {
  const run = payrollRunsSummary.value.find((r) => r.id === fundingForm.value.logId)
  return Number(run?.calculated_amount ?? 0)
})

const selectedRunNetPay = computed(() => {
  const run = payrollRunsSummary.value.find((r) => r.id === fundingForm.value.logId)
  return Number(run?.total_net_pay ?? 0)
})

// Step 8: load all funding entries globally
const loadAllFundingHistory = async () => {
  fundingHistoryLoading.value = true
  try {
    const entries = await fetchDisbursementFundings()
    allFundingHistory.value = entries.map((h) => {
      const run = payrollRunsSummary.value.find((r) => r.id === h.log)
      return {
        id: h.id,
        logId: h.log,
        logName: h.log_name ?? run?.name ?? '—',
        period: run?.period ?? '',
        source: h.source_bank_name ?? h.source ?? '—',
        amount: Number(h.amount ?? 0),
        date: h.date ?? '',
        type: h.type ?? '',
        type_display: h.type_display ?? h.type ?? '',
        reference: h.reference_num ?? '',
        notes: h.notes ?? '',
      }
    })
  } catch (err) {
    console.error('[Funding] Error loading all funding history:', err)
    allFundingHistory.value = []
  } finally {
    fundingHistoryLoading.value = false
  }
}

// Fetch bank accounts for the selected log (used by Add Funds form)
const onFundingLogChange = async (logId) => {
  if (!logId) {
    fundingForm.value.amount = ''
    fundingSources.value = []
    fundingForm.value.source = null
    return
  }
  fundingSources.value = []
  fundingForm.value.source = null

  try {
    const run = payrollRunsSummary.value.find((r) => r.id === logId)
    console.log('[Funding] logId:', logId, 'run:', run)

    // Auto-fill amount with total net pay of the selected run
    fundingForm.value.amount = Number(run?.total_net_pay ?? 0) || ''

    // ─── Primary: use the dedicated endpoint ───────────────────────────────
    const bankAccounts = await fetchDisbursementLogBankAccounts(logId)
    console.log('[Funding] endpoint returned accounts:', bankAccounts)

    if (bankAccounts.length > 0) {
      fundingSources.value = bankAccounts.map((b) => ({
        label: b.name ?? 'Unnamed Account',
        value: b.id,
      }))
      console.log('[Funding] built sources from endpoint:', fundingSources.value)
    } else {
      // ─── Fallback: manual lookup via department → cost center ────────────
      console.warn('[Funding] Endpoint returned empty — falling back to manual lookup')
      const departmentId = run?.department_id
      const dept = departments.value.find((d) => String(d.id) === String(departmentId))
      const costCenterId = dept?.cost_center
      console.log('[Funding] fallback dept:', dept, 'costCenterId:', costCenterId)

      if (costCenterId) {
        const cc = costCenters.value.find((c) => String(c.id) === String(costCenterId))
        const accounts = (cc?.bank_accounts ?? []).filter((b) => b.is_active !== false)
        fundingSources.value = accounts.map((b) => {
          const fullName = `${b.bank_name} – ${b.bank_account_name} – ${b.bank_account_number}`
          return {
            label: fullName,
            value: b.id,
          }
        })
        console.log('[Funding] built sources from fallback:', fundingSources.value)
      } else if (!dept) {
        console.warn('[Funding] No department found for run.department_id:', departmentId)
      } else if (!costCenterId) {
        console.warn('[Funding] Department found but has no cost_center:', dept)
      }
    }
  } catch (err) {
    console.error('[Funding] Error loading funding data:', err)
    fundingSources.value = []
  }
}

const scrollToFundingForm = () => {
  activeTab.value = 'funding'
  setTimeout(() => {
    fundingFormRef.value?.$el?.scrollIntoView({ behavior: 'smooth' })
  }, 100)
}

const submitFunding = async () => {
  if (!fundingForm.value.logId || !fundingForm.value.amount) {
    $q.notify({ type: 'warning', message: 'Please fill in Log and Amount' })
    return
  }
  savingFunding.value = true
  try {
    // Build payload — backend expects 'source' (not 'source_bank_name')
    // and 'reference_num' is a required field (send empty string if blank)
    const payload = {
      log: fundingForm.value.logId,
      date: fundingForm.value.date,
      type: fundingForm.value.type,
      source: fundingForm.value.source,
      reference_num: fundingForm.value.reference || '',
      amount: Number(fundingForm.value.amount) || 0,
    }
    if (fundingForm.value.notes) {
      payload.notes = fundingForm.value.notes
    }
    // Step 7: POST /payroll/admin/disbursement-fundings/
    await addDisbursementFunding(payload)
    $q.notify({ type: 'positive', message: 'Funds added successfully!' })
    // Refresh funding history and summary
    await loadAllFundingHistory()
    await fetchPayrollRunsSummary()
    // Re-sync selectedRun so the expanded log card shows the new funded amount immediately
    const refreshedRun = payrollRunsSummary.value.find(
      (r) => String(r.id) === String(fundingForm.value.logId),
    )
    if (refreshedRun) {
      selectedRun.value = refreshedRun
    }
    // Reset form (keep logId so history stays visible)
    const keepLogId = fundingForm.value.logId
    fundingForm.value = {
      logId: keepLogId,
      date: new Date().toISOString().split('T')[0],
      type: 'check',
      reference: '',
      source: null,
      amount: '',
      notes: '',
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.response?.data?.message || 'Failed to add funds' })
  } finally {
    savingFunding.value = false
  }
}

const viewFundingEntry = (entry) => {
  $q.dialog({
    title: 'Funding Entry',
    message: `Log: ${entry.logName}\nAmount: ${formatCurrency(entry.amount)}\nSource: ${entry.source}`,
    ok: { label: 'Close', flat: true },
  })
}

const editFundingEntry = (entry) => {
  // Pre-fill the form with the entry data for editing
  fundingForm.value = {
    logId: entry.logId,
    date: entry.date || new Date().toISOString().split('T')[0],
    type: entry.type || 'check',
    reference: entry.reference || '',
    source: entry.source || null,
    amount: entry.amount || '',
    notes: entry.notes || '',
  }
  fundingFormRef.value?.$el?.scrollIntoView({ behavior: 'smooth' })
}

const showCreateRunDialog = ref(false)
const createRunForm = ref({
  company_id: '',
  department_id: null,
  start_date: '',
  end_date: '',
  type: 'salary',
})
const createRunLoading = ref(false)

const openCreateRunDialog = () => {
  const cid = getResolvedCompanyId()
  if (!cid) {
    $q.notify({ type: 'warning', message: 'Please select a company first' })
    return
  }
  createRunForm.value = {
    company_id: cid,
    department_id: null,
    start_date: '',
    end_date: '',
    type: 'salary',
  }
  showCreateRunDialog.value = true
  fetchDepartments(cid)
}

const submitCreatePayrollRun = async () => {
  const cid = getResolvedCompanyId()
  if (!cid || !createRunForm.value.start_date || !createRunForm.value.end_date) {
    $q.notify({ type: 'warning', message: 'Please fill in Company, Start Date, and End Date.' })
    return
  }
  try {
    createRunLoading.value = true
    // Step 1: POST /admin/generate-payslip/
    const payload = {
      company_id: cid,
      start_date: createRunForm.value.start_date,
      end_date: createRunForm.value.end_date,
      type: createRunForm.value.type || 'salary',
    }
    // Only include department_id if it's a real non-zero ID
    const deptId = Number(createRunForm.value.department_id)
    if (deptId) {
      payload.department_id = deptId
    }
    const result = await createPayrollRun(payload)
    $q.notify({
      type: 'positive',
      message: result?.message || `Generated ${result?.generated_count ?? 0} payslip(s)!`,
    })
    showCreateRunDialog.value = false

    // ─── Optimistic UI update ─────────────────────────────────────────────
    // The backend may have read-after-write lag. We immediately inject a
    // synthetic run object so the user sees it right away, then retry the
    // real summary fetch until the backend catches up.
    const optimisticId = result?.disbursement_log_id ?? Date.now()
    const optimisticRun = {
      id: optimisticId,
      name:
        result?.name ??
        `Payroll Run | ${payload.type} | ${payload.start_date} - ${payload.end_date}`,
      period: `${payload.start_date} - ${payload.end_date}`,
      status: 'draft',
      status_display: 'Draft',
      calculated_amount: '0.00',
      total_net_pay: '0.00',
      funded: '0.00',
      released: '0.00',
      number_of_employee: result?.generated_count ?? 0,
      completed_employees_count: 0,
      department_id: payload.department_id ?? null,
      __optimistic: true,
      __optimisticAt: Date.now(),
    }
    payrollRunsSummary.value = [optimisticRun, ...payrollRunsSummary.value]

    // ─── Immediately expand the new run and load its employees ─────────────────
    selectedRun.value = optimisticRun
    payrollRunId.value = optimisticId
    clearSelection()
    selectAll.value = false
    try {
      await fetchPayrollRunEmployees(optimisticId)
      selectedRunForData.value = optimisticId
    } catch {
      // Real errors already logged by composable
    }

    // ─── Retry summary fetch with exponential backoff until backend confirms ──
    try {
      await retryWithBackoff(async () => {
        await fetchPayrollRunsSummary()
        // Smart merge in usePayroll replaces optimistic runs with real data.
        // If the backend hasn't returned this ID yet, the optimistic run still
        // exists and we throw to trigger another retry.
        const confirmed = payrollRunsSummary.value.some(
          (r) => r.id === optimisticId && !r.__optimistic,
        )
        if (!confirmed) throw new Error('Not yet synced')
      })
      console.debug('[PayrollPage] New run confirmed in summary')
      // Auto-expand the newly created run and load its employees
      const confirmedRun = payrollRunsSummary.value.find(
        (r) => r.id === optimisticId && !r.__optimistic,
      )
      if (confirmedRun) {
        selectedRun.value = confirmedRun
        payrollRunId.value = confirmedRun.id
        clearSelection()
        selectAll.value = false
        try {
          await fetchPayrollRunEmployees(confirmedRun.id)
          selectedRunForData.value = confirmedRun.id
        } catch {
          // Real errors already logged by composable
        }
      }
    } catch {
      $q.notify({
        type: 'warning',
        message:
          'Payroll run created, but the server summary is still updating. It will appear fully once the sync completes.',
        timeout: 6000,
      })
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to generate payslips',
    })
  } finally {
    createRunLoading.value = false
  }
}

onMounted(async () => {
  // Pre-load departments and cost centers so funding source dropdown works immediately
  // Ensure companyId is resolved first — both composables depend on it
  const resolvedCompanyId = getResolvedCompanyId()
  if (resolvedCompanyId) {
    try {
      await Promise.all([fetchDepartments(), fetchCostCenters()])
      console.log(
        '[PayrollPage] Preloaded departments:',
        departments.value.length,
        'costCenters:',
        costCenters.value.length,
      )
    } catch (err) {
      console.error('[PayrollPage] Failed to preload departments/cost centers:', err)
    }
  } else {
    console.warn('[PayrollPage] No companyId resolved — skipping department/cost center preload')
  }

  try {
    await fetchPayrollRunsSummary()
    // Pre-load all funding history so the Funding tab shows global entries immediately
    await loadAllFundingHistory()
  } catch (err) {
    console.error('[PayrollPage] Initial summary fetch failed:', err)
    $q.notify({
      type: 'warning',
      message:
        'Could not load payroll logs. The server may be busy. You can still create new runs.',
      timeout: 6000,
    })
  }
  const firstRun = payrollRunsSummary.value?.[0]
  if (firstRun && !firstRun.__optimistic) {
    await loadRunEmployees(firstRun)
  }
})

onUnmounted(() => {
  // Clean up debounce timer
  clearTimeout(searchDebounceTimer)
})

// Inline run selection state
const selectedRun = ref(null)

const loadRunEmployees = async (run) => {
  if (selectedRun.value && selectedRun.value.id === run.id) return
  selectedRun.value = run
  payrollRunId.value = run.id
  clearSelection()
  selectAll.value = false
  await fetchPayrollRunEmployees(run.id)
  selectedRunForData.value = run.id
  // Don't call fetchPayrollData() - it causes unnecessary refresh
}

// Toggle run expansion - click header to expand/collapse
const toggleRunExpanded = async (run) => {
  if (selectedRun.value?.id === run.id) {
    // Collapse — also clear payrollRunId so stale logId isn't used by row actions
    selectedRun.value = null
    payrollRunId.value = null
  } else {
    // Expand and load only this run's employees (no full table refresh)
    selectedRun.value = run
    payrollRunId.value = run.id
    clearSelection()
    selectAll.value = false
    try {
      await fetchPayrollRunEmployees(run.id)
      selectedRunForData.value = run.id
    } catch {
      // Real (non-cancellation) errors are already logged by the composable.
      // Prevent unhandled rejections from bubbling here.
    }
  }
}

// Quick-action from the run-header button: load employees then disburse
const selectAndDisburse = async (run) => {
  selectedRun.value = run
  payrollRunId.value = run.id
  await fetchPayrollRunEmployees(run.id)
  const readyCount = payrollRunEmployees.value.filter(
    (e) => e.status === 'ready_for_payment' && e.review_status !== 'pending',
  ).length
  if (!readyCount) {
    $q.notify({ type: 'warning', message: 'No employees are ready for payment yet' })
    return
  }
  await handleBulkDisburse()
  await fetchPayrollRunsSummary()
  // Refresh selectedRun so the header status chip & action button update immediately
  const refreshedRun = payrollRunsSummary.value.find((r) => String(r.id) === String(run.id))
  if (refreshedRun) {
    selectedRun.value = refreshedRun
  }
}

const employeeSearchQuery = ref('')

// Debounced search query for better performance
let searchDebounceTimer = null
watch(employeeSearchQuery, (newVal) => {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    employeeSearchDebounce.value = newVal
    employeePage.value = 1 // Reset to first page on search
  }, 300) // 300ms debounce
})

// Optimized filtered employees with debounced search
const filteredEmployees = computed(() => {
  const employees = payrollRunEmployees.value
  if (!Array.isArray(employees) || employees.length === 0) {
    return []
  }

  const q = employeeSearchDebounce.value?.toLowerCase()?.trim() || ''
  if (!q) return employees

  // Pre-compute search terms for better performance
  return employees.filter((e) => {
    const name = (e.employee_name || e.employee || '').toLowerCase()
    const id = (e.employee_id || '').toString().toLowerCase()
    return name.includes(q) || id.includes(q)
  })
})

// Step 4: Bulk release draft payslips → pending_review
const bulkReleaseAll = async (run) => {
  selectedRun.value = run
  payrollRunId.value = run.id
  const draftIds = payrollRunEmployees.value
    .filter((e) => e.status === 'draft')
    .map((e) => e.employee_id)
  if (!draftIds.length) {
    $q.notify({ type: 'info', message: 'No draft employees to release' })
    return
  }
  $q.dialog({
    title: 'Bulk Release for Review',
    message: `Release ${draftIds.length} payslip(s) for employee review?`,
    ok: { label: 'Release', color: 'orange', unelevated: true },
    cancel: { label: 'Cancel', flat: true },
  }).onOk(async () => {
    try {
      const result = await bulkReleasePayslips(run.id, draftIds)
      $q.notify({
        type: 'positive',
        message: `Released ${result?.summary?.updated_to_pending_review ?? draftIds.length} payslip(s)!`,
      })
      await fetchPayrollRunEmployees(run.id)
      await fetchPayrollRunsSummary()
      clearSelection()
      selectAll.value = false
    } catch (err) {
      $q.notify({ type: 'negative', message: err?.response?.data?.message || 'Release failed' })
    }
  })
}

// Selection state for bulk operations - Use Set for O(1) lookups
const selectedEmployeeIds = ref(new Set())
const selectAll = ref(false)

// Backward-compatible computed for template usage
const selectedEmployees = computed(() => Array.from(selectedEmployeeIds.value))

// True when the current selection includes at least one ready_for_payment employee
const hasReadyForPaymentSelected = computed(() => {
  if (!selectedEmployees.value.length) return false
  return payrollRunEmployees.value.some(
    (e) =>
      selectedEmployeeIds.value.has(e.employee_id) &&
      e.status === 'ready_for_payment' &&
      e.review_status !== 'pending',
  )
})

// True when ALL employees in the expanded run are ready_for_payment
const allEmployeesReadyForPayment = computed(() => {
  const employees = payrollRunEmployees.value
  if (!employees || employees.length === 0) return false
  return employees.every((e) => e.status === 'ready_for_payment' && e.review_status !== 'pending')
})

// Check if run is fully disbursed (backend status OR all employees disbursed)
const isRunFullyDisbursed = (run) => {
  // Backend check: run-level status
  if (['disbursed', 'completed', 'closed'].includes(run.status)) return true

  // Frontend check: all employees disbursed
  const employees = payrollRunEmployees.value
  if (!employees || employees.length === 0) return false
  return employees.every((e) => e.status === 'disbursed')
}

// Helper functions for Set-based selection
const isEmployeeSelected = (id) => selectedEmployeeIds.value.has(id)

const toggleEmployeeSelection = (employeeId) => {
  const newSet = new Set(selectedEmployeeIds.value)
  if (newSet.has(employeeId)) {
    newSet.delete(employeeId)
  } else {
    newSet.add(employeeId)
  }
  selectedEmployeeIds.value = newSet

  // Update selectAll state
  const actionable = getActionableEmployees(workflowStage.value)
  const actionableIds = new Set(actionable.map((e) => e.employee_id))
  selectAll.value =
    actionableIds.size > 0 && Array.from(actionableIds).every((id) => newSet.has(id))
}

const clearSelection = () => {
  selectedEmployeeIds.value = new Set()
  selectAll.value = false
}

const selectAllActionable = () => {
  const actionable = getActionableEmployees(workflowStage.value)
  selectedEmployeeIds.value = new Set(actionable.map((e) => e.employee_id))
}

// Per-row menu state — set via @before-show on the inline <q-menu>
const menuEmployee = ref(null)

const handleMenuAction = async (action) => {
  const emp = menuEmployee.value
  if (!emp) return

  // Execute action based on type
  switch (action) {
    case 'release':
      await handleWorkflowAction(emp, 'release')
      break
    case 'acknowledge':
      openAcknowledgeDialog(emp)
      break
    case 'disburse':
      await handleWorkflowAction(emp, 'disburse')
      break
    case 'markComplete':
      await handleMarkComplete(emp)
      break
    case 'view':
      viewDetails(emp)
      break
    case 'download':
      downloadPayslip(emp)
      break
  }
}

// Computed: Group employees by status (no mutations during render)
const actionableEmployeesByStage = computed(() => {
  const employees = payrollRunEmployees.value
  if (!Array.isArray(employees)) {
    return {
      draft: [],
      pending_review: [],
      ready_for_payment: [],
      disbursed: [],
    }
  }

  return {
    draft: employees.filter((e) => e.status === 'draft'),
    pending_review: employees.filter((e) => e.status === 'pending_review'),
    ready_for_payment: employees.filter((e) => e.status === 'ready_for_payment'),
    disbursed: employees.filter((e) => e.status === 'disbursed'),
  }
})

// Pure function to get actionable employees (no side effects)
const getActionableEmployees = (currentStage) => {
  return actionableEmployeesByStage.value[currentStage] || []
}

// Pagination for employee table
const employeePage = ref(1)
const employeeSearchDebounce = ref('')

// Computed properties for dynamic approve button labels

// Computed label for the bulk release button
const releaseBtnLabel = computed(() => {
  if (selectedEmployeeIds.value.size === 0) return null
  const actionableCount = getActionableEmployees(workflowStage.value).length
  return selectedEmployeeIds.value.size === actionableCount ? 'Release All' : 'Release'
})

// Data — derived directly from payrollRunEmployees already in memory.
// No second API call needed; eliminates the double-fetch freeze.
const selectedRunForData = ref(null)

const payrollData = computed(() =>
  (Array.isArray(payrollRunEmployees.value) ? payrollRunEmployees.value : []).map((r, i) => ({
    id: r.payslip_id ?? `payroll-${i}`,
    employee: r.employee_name ?? 'Unknown',
    employee_id: r.employee_id ?? null,
    period: r.period ?? null,
    run: selectedRunForData.value,
    gross_pay: Number(r.gross_pay ?? 0),
    total_deductions: Number(r.total_deductions ?? 0),
    net_pay: Number(r.net_pay ?? 0),
    status: r.status ?? 'draft',
    breakdown: r.breakdown ?? {},
  })),
)

// Detail modal
const showDetailModal = ref(false)
const selectedRecord = ref(null)

const safeArray = (arr) => (Array.isArray(arr) ? arr : [])

// Strips the trailing date range from a run name so we can show it separately.
// e.g. "Veloso - Veloso | Salary | 2026-05-01 - 2026-05-31" → "Veloso - Veloso | Salary"
const getRunBaseName = (run) => {
  if (!run?.name) return '—'
  // Remove the trailing date range from the name (e.g. "| 2026-05-01 - 2026-05-31")
  return run.name.replace(/\s*\|?\s*\d{4}-\d{2}-\d{2}\s*-\s*\d{4}-\d{2}-\d{2}\s*$/, '').trim()
}

const getRunPeriod = (run) => {
  // Prefer the explicit period field
  if (run?.period) return run.period
  if (!run?.name) return ''
  // Extract date range from the name itself
  const match = run.name.match(/(\d{4}-\d{2}-\d{2}\s*-\s*\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : ''
}

// Cached dropdown options (computed once, not on every render)
const runOptions = computed(() =>
  payrollRunsSummary.value.map((r) => ({ label: r.name, value: r.id })),
)

const departmentOptions = computed(() =>
  (departments.value ?? []).map((d) => ({ label: d.name, value: d.id })),
)

const totalEmployees = computed(() =>
  safeArray(payrollRunsSummary.value).reduce(
    (sum, r) => sum + Number(r.number_of_employee || 0),
    0,
  ),
)
const totalGrossPay = computed(() =>
  safeArray(payrollRunsSummary.value).reduce((sum, r) => sum + Number(r.calculated_amount || 0), 0),
)
const totalNetPay = computed(() =>
  safeArray(payrollRunsSummary.value).reduce((sum, r) => sum + Number(r.total_net_pay || 0), 0),
)
const totalPayrollRuns = computed(() => safeArray(payrollRunsSummary.value).length)

const formatCurrency = (val) => {
  const n = Number(val ?? 0)
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const getInitials = (name) => {
  if (!name) return '?'
  return name
    .toString()
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Optimized computed properties using payrollRunEmployees directly
const maxGrossPayComputed = computed(() => {
  const employees = payrollRunEmployees.value
  if (!Array.isArray(employees) || employees.length === 0) return 1

  let max = 0
  for (const emp of employees) {
    const val = Number(emp.gross_pay || 0)
    if (val > max) max = val
  }
  return max > 0 ? max : 1
})

const maxNetPayComputed = computed(() => {
  const employees = payrollRunEmployees.value
  if (!Array.isArray(employees) || employees.length === 0) return 1

  let max = 0
  for (const emp of employees) {
    const val = Number(emp.net_pay || 0)
    if (val > max) max = val
  }
  return max > 0 ? max : 1
})

// Memoized percentage calculation
const payPercentageCache = new Map()
const getPayPercentage = (value, max) => {
  if (max <= 0) return 0
  const cacheKey = `${value}-${max}`
  if (payPercentageCache.has(cacheKey)) {
    return payPercentageCache.get(cacheKey)
  }
  const result = Math.round(((value || 0) / max) * 100)
  // Limit cache size to prevent memory leaks
  if (payPercentageCache.size > 1000) {
    payPercentageCache.clear()
  }
  payPercentageCache.set(cacheKey, result)
  return result
}

const exportToPDF = () => {
  const arr = safeArray(payrollData.value)
  if (!arr.length) {
    $q.notify({ type: 'warning', message: 'No payroll data to export' })
    return
  }
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text('Payroll Report', 14, 20)
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)
  autoTable(doc, {
    startY: 35,
    head: [['#', 'Employee', 'Period', 'Run', 'Gross Pay', 'Net Pay', 'Hours']],
    body: arr.map((r, i) => [
      i + 1,
      r.employee ?? 'N/A',
      r.period ?? '-',
      `#${r.run ?? ''}`,
      formatCurrency(r.gross_pay),
      formatCurrency(r.net_pay),
      `${r.breakdown?.attendance?.total_hours_worked ?? 0}h`,
    ]),
  })
  doc.save(`Payroll_Report_${new Date().toISOString().split('T')[0]}.pdf`)
  $q.notify({ type: 'positive', message: 'Payroll exported as PDF!' })
}

const downloadPayslip = (record) => {
  const rec = record ?? selectedRecord.value
  if (!rec) {
    $q.notify({ type: 'negative', message: 'No record selected to download' })
    return
  }

  // ─── Resolve fields from either the table row shape or the modal shape ───
  const employeeName = rec.employee_name ?? rec.employee ?? 'N/A'
  const employeeId = rec.employee_id ?? 'N/A'
  const position = rec.position ?? rec.job_title ?? '—'
  const employmentType = rec.employment_type ?? '—'
  const empStatus = rec.employment_status ?? '—'
  const runName = rec.period ?? selectedRun.value?.name ?? '—'
  const fmtDate = (d) => {
    if (!d || d === '—') return '—'
    try {
      return new Date(d).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return d
    }
  }
  const payDate = fmtDate(rec.pay_date ?? rec.released_at)
  const payslipNo = rec.payslip_no ?? `PS-${rec.payslip_id ?? rec.id ?? ''}`

  // Employer / company info — pulled exclusively from API data, never from Wagey defaults
  const companyName = selectedRun.value?.company_name ?? rec.company_name ?? ''
  const companyAddress = selectedRun.value?.company_address ?? rec.company_address ?? ''
  const companyTin = selectedRun.value?.company_tin ?? rec.company_tin ?? ''

  // Work summary
  const bd = rec.breakdown ?? {}
  const att = bd.attendance ?? {}
  const daysWorked = att.days_worked ?? rec.days_worked ?? '—'
  const daysAbsent = att.days_absent ?? rec.days_absent ?? 0
  const vlUsed = att.vacation_leave ?? rec.vacation_leave ?? 0
  const slUsed = att.sick_leave ?? rec.sick_leave ?? 0
  const totalHoursW = att.total_hours_worked ?? rec.total_hours_worked ?? 0
  const otHours = att.overtime_hours ?? rec.overtime_hours ?? 0
  const ndHours = att.night_diff_hours ?? rec.night_diff_hours ?? 0
  const restDays = att.rest_days_worked ?? rec.rest_days_worked ?? 0
  const holidayDays = att.holidays_worked ?? rec.holidays_worked ?? 0

  // Rate basis
  const monthlyRate = Number(rec.monthly_rate ?? rec.rate ?? 0)
  const dailyRate = Number(rec.daily_rate ?? (monthlyRate ? monthlyRate / 22 : 0))
  const hourlyRate = Number(rec.hourly_rate ?? (dailyRate ? dailyRate / 8 : 0))

  // Earnings
  const basicPay = Number(rec.basic_pay ?? rec.gross_pay ?? 0)
  const earnings = Array.isArray(rec.earnings) ? rec.earnings : []

  // Separate earning categories
  const premiumItems = earnings.filter((e) =>
    ['overtime', 'night_differential', 'holiday', 'rest_day'].includes(e.type),
  )
  const allowances = earnings.filter((e) => e.type === 'allowance')
  const incentives = earnings.filter((e) => e.type === 'incentive')
  const adjAdditions = earnings.filter((e) => e.type === 'adjustment_add')

  // Fall back to top-level fields if earnings array is empty
  const overtimePay =
    premiumItems.find((e) => e.type === 'overtime')?.amount ?? Number(rec.overtime_pay ?? 0)
  const nightDiffPay =
    premiumItems.find((e) => e.type === 'night_differential')?.amount ??
    Number(rec.night_diff_pay ?? 0)
  const holidayPay =
    premiumItems.find((e) => e.type === 'holiday')?.amount ?? Number(rec.holiday_pay ?? 0)
  const grossPay = Number(rec.gross_pay ?? 0)

  // Deductions
  const deductions = Array.isArray(rec.deductions) ? rec.deductions : []
  const withholdingTax = Number(
    rec.withholding_tax ?? deductions.find((d) => d.type === 'withholding_tax')?.amount ?? 0,
  )
  const sssContrib = Number(rec.sss ?? deductions.find((d) => d.type === 'sss')?.amount ?? 0)
  const philhealth = Number(
    rec.philhealth ?? deductions.find((d) => d.type === 'philhealth')?.amount ?? 0,
  )
  const pagibig = Number(rec.pagibig ?? deductions.find((d) => d.type === 'pagibig')?.amount ?? 0)
  const sssLoan = Number(rec.sss_loan ?? deductions.find((d) => d.type === 'sss_loan')?.amount ?? 0)
  const pagibigLoan = Number(
    rec.pagibig_loan ?? deductions.find((d) => d.type === 'pagibig_loan')?.amount ?? 0,
  )
  const cashAdvance = Number(
    rec.cash_advance ?? deductions.find((d) => d.type === 'cash_advance')?.amount ?? 0,
  )
  const companyLoan = Number(
    rec.company_loan ?? deductions.find((d) => d.type === 'company_loan')?.amount ?? 0,
  )
  const absenceDeduct = Number(
    rec.absence_deduction ??
      deductions.find((d) => d.type === 'absence')?.amount ??
      (daysAbsent > 0 ? dailyRate * daysAbsent : 0),
  )
  const lateDeduct = Number(
    rec.late_deduction ?? deductions.find((d) => d.type === 'late')?.amount ?? 0,
  )
  const totalDeductions = Number(rec.total_deductions ?? grossPay - Number(rec.net_pay ?? 0))
  const netPay = Number(rec.net_pay ?? 0)

  // Payment / loan / 13th month
  const paymentMethod = rec.payment_method ?? rec.disbursement_type ?? '—'
  const paymentStatus = rec.status ?? '—'
  const dateReleased = fmtDate(rec.released_at ?? rec.pay_date)
  const loans = Array.isArray(rec.loans)
    ? rec.loans
    : companyLoan
      ? [
          {
            type: 'Company Loan',
            total: rec.total_loan_amount ?? 0,
            deduction: companyLoan,
            balance: rec.loan_balance ?? 0,
          },
        ]
      : []
  const thirteenthAccrual = Number(rec.thirteenth_month_accrual ?? rec.month_accrual ?? 0)
  const thirteenthYtd = Number(rec.thirteenth_month_ytd ?? rec.ytd_accrual ?? 0)

  // ─── PDF construction ────────────────────────────────────────────────────
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const PW = 210 // page width mm
  const ML = 15 // margin left
  const MR = 193 // margin right — 15mm from right edge keeps amounts inside printable area
  let y = 14

  // ── Helpers ──
  // ₱ is unsupported by jsPDF built-in Helvetica; use "PHP" prefix for PDF output
  const fc = (v) => {
    const n = Number(v ?? 0)
    return (
      'PHP ' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    )
  }
  const line = (x1, yy, x2) => {
    doc.setDrawColor(200, 200, 200)
    doc.line(x1, yy, x2, yy)
  }
  const sectionTitle = (title, yy) => {
    doc.setFillColor(240, 244, 255)
    doc.rect(ML, yy - 4.5, MR - ML, 6.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(50, 60, 120)
    doc.text(title.toUpperCase(), ML + 2, yy)
    doc.setTextColor(30, 30, 30)
    return yy + 5
  }
  const dotRow = (label, val, yy, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(80, 80, 80)
    doc.text(label, ML + 2, yy)
    // dotted leader
    doc.setTextColor(180, 180, 180)
    const dotStart = ML + 2 + doc.getTextWidth(label) + 1
    const dotEnd = MR - doc.getTextWidth(val) - 1
    if (dotEnd > dotStart) {
      let dx = dotStart
      while (dx < dotEnd) {
        doc.text('.', dx, yy)
        dx += 1.6
      }
    }
    doc.setTextColor(bold ? 20 : 40, bold ? 20 : 40, bold ? 20 : 40)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.text(val, MR, yy, { align: 'right' })
    return yy + 5.2
  }
  const kv = (label, val, yy) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(100, 100, 100)
    doc.text(label + ':', ML + 2, yy)
    doc.setTextColor(20, 20, 20)
    doc.setFont('helvetica', 'bold')
    doc.text(String(val), ML + 45, yy)
    doc.setFont('helvetica', 'normal')
    return yy + 5
  }

  // ══════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════
  doc.setFillColor(37, 56, 120)
  doc.rect(0, 0, PW, 22, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text('OFFICIAL PAYSLIP', PW / 2, 9, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  if (companyName) doc.text(companyName, PW / 2, 15, { align: 'center' })
  if (companyAddress) doc.text(companyAddress, PW / 2, 19, { align: 'center' })
  y = 28

  // Company meta row
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  if (companyTin) {
    doc.text(`TIN: ${companyTin}`, ML, y)
  }
  doc.text(`Payslip No.: ${payslipNo}`, MR, y, { align: 'right' })
  y += 5
  doc.text(`Payroll Period: ${runName}`, ML, y)
  doc.text(`Pay Date: ${payDate}`, MR, y, { align: 'right' })
  y += 3
  line(ML, y, MR)
  y += 5

  // ══════════════════════════════════════════════
  // EMPLOYEE INFORMATION
  // ══════════════════════════════════════════════
  y = sectionTitle('Employee Information', y)
  y += 1
  y = kv('Full Name', employeeName, y)
  y = kv('Employee ID', employeeId, y)
  y = kv('Position', position, y)
  y = kv('Employment Type', employmentType, y)
  y = kv('Status', empStatus, y)
  y += 2
  line(ML, y, MR)
  y += 5

  // ══════════════════════════════════════════════
  // WORK SUMMARY
  // ══════════════════════════════════════════════
  y = sectionTitle('Work Summary', y)
  y += 1
  const workRows = [
    ['Days Worked', String(daysWorked)],
    ['Days Absent', String(daysAbsent)],
    ['Vacation Leave (VL)', String(vlUsed)],
    ['Sick Leave (SL)', String(slUsed)],
    ['Total Hours Worked', `${totalHoursW}h`],
    ['Overtime Hours', `${otHours}h`],
    ['Night Differential Hrs', `${ndHours}h`],
    ['Rest Days Worked', String(restDays)],
    ['Holidays Worked', String(holidayDays)],
  ]
  workRows.forEach(([l, v]) => {
    y = dotRow(l, v, y)
  })
  y += 2
  line(ML, y, MR)
  y += 5

  // ══════════════════════════════════════════════
  // RATE BASIS  (only shown when rates are available)
  // ══════════════════════════════════════════════
  if (monthlyRate > 0 || dailyRate > 0 || hourlyRate > 0) {
    y = sectionTitle('Rate Basis', y)
    y += 1
    if (monthlyRate > 0) y = dotRow('Monthly Rate', fc(monthlyRate), y)
    if (dailyRate > 0) y = dotRow('Daily Rate', fc(dailyRate), y)
    if (hourlyRate > 0) y = dotRow('Hourly Rate', fc(hourlyRate), y)
    y += 2
    line(ML, y, MR)
    y += 5
  }

  // ══════════════════════════════════════════════
  // EARNINGS
  // ══════════════════════════════════════════════
  y = sectionTitle('Earnings', y)
  y += 1
  y = dotRow('Basic Pay', fc(basicPay), y)

  // Premium Pay
  const hasPremium =
    overtimePay > 0 || nightDiffPay > 0 || holidayPay > 0 || premiumItems.length > 0
  if (hasPremium) {
    doc.setFont('helvetica', 'bolditalic')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text('Premium Pay', ML + 2, y)
    y += 4.5
    if (overtimePay > 0) y = dotRow('Overtime Pay', fc(overtimePay), y, false)
    if (nightDiffPay > 0) y = dotRow('Night Differential Pay', fc(nightDiffPay), y, false)
    if (holidayPay > 0) y = dotRow('Holiday Pay', fc(holidayPay), y, false)
    premiumItems
      .filter((e) => !['overtime', 'night_differential', 'holiday'].includes(e.type))
      .forEach((e) => {
        y = dotRow(e.label ?? e.type, fc(e.amount), y, false)
      })
  }

  // Allowances
  if (allowances.length > 0) {
    doc.setFont('helvetica', 'bolditalic')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text('Allowances', ML + 2, y)
    y += 4.5
    allowances.forEach((a) => {
      y = dotRow(a.label ?? a.type, fc(a.amount), y)
    })
  }

  // Incentives
  if (incentives.length > 0) {
    doc.setFont('helvetica', 'bolditalic')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text('Incentives', ML + 2, y)
    y += 4.5
    incentives.forEach((a) => {
      y = dotRow(a.label ?? a.type, fc(a.amount), y)
    })
  }

  // Adjustments (additions)
  doc.setFont('helvetica', 'bolditalic')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Adjustments (Additions)', ML + 2, y)
  y += 4.5
  if (adjAdditions.length > 0) {
    adjAdditions.forEach((a) => {
      y = dotRow(a.label ?? a.type, fc(a.amount), y)
    })
  } else {
    y = dotRow('—', fc(0), y)
  }

  // Gross Pay total bar
  doc.setFillColor(37, 56, 120)
  doc.rect(ML, y - 1, MR - ML, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('GROSS PAY', ML + 3, y + 4)
  doc.text(fc(grossPay), MR - 2, y + 4, { align: 'right' })
  y += 11
  doc.setTextColor(30, 30, 30)

  // ══════════════════════════════════════════════
  // DEDUCTIONS
  // ══════════════════════════════════════════════
  y = sectionTitle('Deductions', y)
  y += 1

  doc.setFont('helvetica', 'bolditalic')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Government Contributions', ML + 2, y)
  y += 4.5
  if (withholdingTax > 0) y = dotRow('Withholding Tax', fc(withholdingTax), y)
  if (sssContrib > 0) y = dotRow('SSS Contribution', fc(sssContrib), y)
  if (philhealth > 0) y = dotRow('PhilHealth', fc(philhealth), y)
  if (pagibig > 0) y = dotRow('Pag-IBIG', fc(pagibig), y)

  doc.setFont('helvetica', 'bolditalic')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Government Loans', ML + 2, y)
  y += 4.5
  y = dotRow('SSS Loan', fc(sssLoan), y)
  y = dotRow('Pag-IBIG Loan', fc(pagibigLoan), y)

  doc.setFont('helvetica', 'bolditalic')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Company Deductions', ML + 2, y)
  y += 4.5
  if (cashAdvance > 0) y = dotRow('Cash Advance', fc(cashAdvance), y)
  if (companyLoan > 0) y = dotRow('Company Loan', fc(companyLoan), y)

  doc.setFont('helvetica', 'bolditalic')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Attendance Deductions', ML + 2, y)
  y += 4.5
  y = dotRow(`Absence (${daysAbsent} day${daysAbsent !== 1 ? 's' : ''})`, fc(absenceDeduct), y)
  y = dotRow('Late / Undertime', fc(lateDeduct), y)

  // Other deductions from array
  const otherDeductions = deductions.filter(
    (d) =>
      ![
        'withholding_tax',
        'sss',
        'philhealth',
        'pagibig',
        'sss_loan',
        'pagibig_loan',
        'cash_advance',
        'company_loan',
        'absence',
        'late',
      ].includes(d.type),
  )
  if (otherDeductions.length > 0) {
    doc.setFont('helvetica', 'bolditalic')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text('Other Deductions', ML + 2, y)
    y += 4.5
    otherDeductions.forEach((d) => {
      y = dotRow(d.label ?? d.type, fc(d.amount), y)
    })
  } else {
    doc.setFont('helvetica', 'bolditalic')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text('Other Deductions', ML + 2, y)
    y += 4.5
    y = dotRow('—', fc(0), y)
  }

  // Total Deductions bar
  doc.setFillColor(180, 30, 30)
  doc.rect(ML, y - 1, MR - ML, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL DEDUCTIONS', ML + 3, y + 4)
  doc.text(fc(totalDeductions), MR - 2, y + 4, { align: 'right' })
  y += 10
  doc.setTextColor(30, 30, 30)

  // ══════════════════════════════════════════════
  // NET PAY
  // ══════════════════════════════════════════════
  doc.setFillColor(22, 101, 52)
  doc.rect(ML, y, MR - ML, 12, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text('NET PAY', ML + 4, y + 8)
  doc.setFontSize(13)
  doc.text(fc(netPay), MR - 2, y + 8, { align: 'right' })
  y += 17
  doc.setTextColor(30, 30, 30)

  // ══════════════════════════════════════════════
  // Check for new page before optional sections
  // ══════════════════════════════════════════════
  const checkPage = (needed) => {
    if (y + needed > 280) {
      doc.addPage()
      y = 14
    }
  }

  // ── PAYMENT DETAILS ──
  checkPage(30)
  y = sectionTitle('Payment Details', y)
  y += 1
  y = kv('Payment Method', paymentMethod, y)
  y = kv('Status', paymentStatus, y)
  y = kv('Date Released', dateReleased, y)
  y += 2
  line(ML, y, MR)
  y += 5

  // ── LOAN DISCLOSURE ──
  if (loans.length > 0) {
    checkPage(30)
    y = sectionTitle('Loan Disclosure', y)
    y += 1
    loans.forEach((loan) => {
      y = kv('Loan Type', loan.type ?? '—', y)
      y = kv('Total Loan Amount', fc(loan.total ?? 0), y)
      y = kv('Deduction This Period', fc(loan.deduction ?? 0), y)
      y = kv('Remaining Balance', fc(loan.balance ?? 0), y)
      y += 2
    })
    line(ML, y, MR)
    y += 5
  }

  // ── 13TH MONTH TRACKING ──
  if (thirteenthAccrual > 0 || thirteenthYtd > 0) {
    checkPage(20)
    y = sectionTitle('13th Month Tracking', y)
    y += 1
    y = kv('This Period Accrual', fc(thirteenthAccrual), y)
    y = kv('Year-to-Date Accrual', fc(thirteenthYtd), y)
    y += 2
    line(ML, y, MR)
    y += 5
  }

  // ── CERTIFICATION ──
  checkPage(30)
  y = sectionTitle('Certification', y)
  y += 3
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(60, 60, 60)
  doc.text('I acknowledge receipt of the amount stated above.', ML + 2, y)
  y += 10
  doc.line(ML + 2, y, ML + 70, y)
  doc.text('Employee Signature', ML + 2, y + 4)
  doc.line(MR - 68, y, MR, y)
  doc.text('Date', MR - 12, y + 4)
  y += 12

  // ── Footer ──
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text(`Page ${i} of ${pageCount}`, PW / 2, 292, { align: 'center' })
    doc.text('This is a system-generated payslip.', PW / 2, 296, { align: 'center' })
  }

  // ── Save ──
  const safeName = employeeName.replace(/\s+/g, '_')
  doc.save(`Payslip_${safeName}_${runName.replace(/\s+/g, '_')}.pdf`)
  $q.notify({ type: 'positive', message: `Payslip downloaded for ${employeeName}` })
}

const viewDetails = (record) => {
  // Normalize emp fields from the nested table to the modal format
  selectedRecord.value = {
    employee: record.employee_name || record.employee,
    employee_id: record.employee_id,
    period: record.period,
    run: record.run ?? selectedRun.value?.id,
    gross_pay: record.gross_pay,
    net_pay: record.net_pay,
    breakdown: record.breakdown,
  }
  showDetailModal.value = true
}
const closeDetailModal = () => {
  showDetailModal.value = false
  selectedRecord.value = null
}

const toggleSelectAll = () => {
  if (selectAll.value) {
    selectAllActionable()
  } else {
    clearSelection()
  }
}

const isEmployeeActionable = (emp) => {
  const stage = workflowStage.value
  switch (stage) {
    case 'draft':
      // Allow selection of both drafts (to release) AND ready employees (to disburse early)
      // Guard: ready employees must not have review_status === 'pending'
      if (emp.status === 'draft') return true
      if (emp.status === 'ready_for_payment') return emp.review_status !== 'pending'
      return false
    case 'pending_review':
      // Employees who already acknowledged can be disbursed early
      return emp.status === 'ready_for_payment' && emp.review_status !== 'pending'
    case 'ready_for_payment':
      return emp.status === 'ready_for_payment' && emp.review_status !== 'pending'
    default:
      return false
  }
}

// Per-employee action from the row dropdown menu
const handleWorkflowAction = async (employee, action) => {
  const logId = payrollRunId.value
  if (!logId) {
    $q.notify({ type: 'warning', message: 'Please select a disbursement log first' })
    return
  }
  const employeeId = employee.employee_id || employee.id

  // Step 4: release a single draft employee
  if (action === 'release') {
    $q.dialog({
      title: 'Release for Review',
      message: `Release payslip for ${employee.employee_name || employee.employee}?`,
      ok: { label: 'Release', color: 'orange', unelevated: true },
      cancel: { label: 'Cancel', flat: true },
    }).onOk(async () => {
      try {
        await bulkReleasePayslips(logId, [employeeId])
        $q.notify({
          type: 'positive',
          message: `Released: ${employee.employee_name || employee.employee}`,
        })
        await fetchPayrollRunEmployees(logId)
        await fetchPayrollRunsSummary()
        clearSelection()
        selectAll.value = false
      } catch (err) {
        $q.notify({ type: 'negative', message: err?.response?.data?.message || 'Release failed' })
      }
    })
    return
  }

  // Step 9: disburse a single ready_for_payment employee
  if (action === 'disburse') {
    if (employee.review_status === 'pending') {
      $q.notify({
        type: 'warning',
        message: 'This employee is still under review and cannot be disbursed yet.',
      })
      return
    }
    $q.dialog({
      title: 'Disburse',
      message: `Disburse payment for ${employee.employee_name || employee.employee}?`,
      ok: { label: 'Disburse', color: 'positive', unelevated: true },
      cancel: { label: 'Cancel', flat: true },
    }).onOk(async () => {
      try {
        await disbursePayslips(logId, [employeeId])
        $q.notify({
          type: 'positive',
          message: `Disbursed: ${employee.employee_name || employee.employee}`,
        })
        await fetchPayrollRunEmployees(logId)
        await fetchPayrollRunsSummary()
        clearSelection()
        selectAll.value = false
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err?.response?.data?.message || 'Disbursement failed',
        })
      }
    })
    return
  }
}

// Bulk release selected draft employees (Step 4)
const handleBulkAction = async () => {
  const logId = payrollRunId.value
  if (!logId) {
    $q.notify({ type: 'warning', message: 'Please select a disbursement log first' })
    return
  }
  const employeeIds =
    selectedEmployeeIds.value.size > 0
      ? selectedEmployees.value
      : getActionableEmployees('draft').map((e) => e.employee_id)
  if (!employeeIds.length) {
    $q.notify({ type: 'info', message: 'No draft employees to release' })
    return
  }
  $q.dialog({
    title: 'Bulk Release for Review',
    message: `Release ${employeeIds.length} payslip(s) for employee review?`,
    ok: { label: 'Release', color: 'orange', unelevated: true },
    cancel: { label: 'Cancel', flat: true },
  }).onOk(async () => {
    try {
      const result = await bulkReleasePayslips(logId, employeeIds)
      $q.notify({
        type: 'positive',
        message: `Released ${result?.summary?.updated_to_pending_review ?? employeeIds.length} payslip(s)!`,
      })
      await fetchPayrollRunEmployees(logId)
      await fetchPayrollRunsSummary()
      clearSelection()
      selectAll.value = false
    } catch {
      $q.notify({ type: 'negative', message: 'Bulk release failed' })
    }
  })
}

// ─── Step 10: Confirm Money Received (cash only) ──────────────────────────
// Called from the employee-row menu when status === 'disbursed'.
// This calls PATCH /employee/payslips/<id>/money-received/ on behalf of the
// employee (e.g. admin confirms physical handoff), moving the payslip to
// 'completed'. If you want strict employee-only flow, remove this handler
// and keep the menu item read-only.
const handleMarkComplete = (employee) => {
  const payslipId = employee.payslip_id
  if (!payslipId) {
    $q.notify({ type: 'warning', message: 'No payslip ID found for this employee' })
    return
  }

  $q.dialog({
    title: 'Confirm Money Received',
    message: `Confirm that ${employee.employee_name || employee.employee} has physically received their cash payment? This will mark their payslip as Completed.`,
    ok: { label: 'Confirm Received', color: 'positive', unelevated: true },
    cancel: { label: 'Cancel', flat: true },
  }).onOk(async () => {
    try {
      const result = await confirmMoneyReceived(payslipId)
      $q.notify({
        type: 'positive',
        message: `Marked as received for ${employee.employee_name || employee.employee}.${result?.disbursement_log_closed ? ' Disbursement log is now closed.' : ''}`,
      })
      const logId = payrollRunId.value
      if (logId) {
        await fetchPayrollRunEmployees(logId)
        await fetchPayrollRunsSummary()
      }
    } catch (err) {
      $q.notify({
        type: 'negative',
        message:
          err?.response?.data?.message ||
          'Failed to confirm receipt. Employee may need to confirm via the app.',
      })
    }
  })
}

// ─── Step 5 & 6: Employee Payslip Preview + Acknowledge ──────────────────
// Opens a dialog showing the employee's payslip with an Acknowledge button.
// Calls GET /employee/payslips/ (Step 5) to load full data, then
// PATCH /employee/payslips/<id>/acknowledge/ (Step 6) to acknowledge.
const showAcknowledgeDialog = ref(false)
const acknowledgeTarget = ref(null)
const acknowledgeLoading = ref(false)
const acknowledgeDialogLoading = ref(false)

const openAcknowledgeDialog = async (employee) => {
  acknowledgeTarget.value = employee
  showAcknowledgeDialog.value = true
  // Step 5: fetch the employee's own payslip list to get full payslip details
  acknowledgeDialogLoading.value = true
  try {
    const payslips = await fetchEmployeePayslips(getResolvedCompanyId())
    // Merge full payslip data into acknowledgeTarget if we find a match
    const full = payslips.find((p) => p.id === employee.payslip_id)
    if (full) {
      acknowledgeTarget.value = { ...employee, ...full, payslip_id: full.id ?? employee.payslip_id }
    }
  } catch {
    // Non-fatal — dialog still shows with partial data from the employee row
  } finally {
    acknowledgeDialogLoading.value = false
  }
}

const submitAcknowledge = async () => {
  const emp = acknowledgeTarget.value
  if (!emp?.payslip_id) return
  acknowledgeLoading.value = true
  try {
    const result = await acknowledgePayslip(emp.payslip_id, 'web')
    $q.notify({
      type: 'positive',
      message: `Payslip acknowledged for ${emp.employee_name || emp.employee}. Status: ${result?.new_status ?? 'ready_for_payment'}.`,
    })
    showAcknowledgeDialog.value = false
    acknowledgeTarget.value = null
    const logId = payrollRunId.value
    if (logId) {
      await fetchPayrollRunEmployees(logId)
      await fetchPayrollRunsSummary()
    }
  } catch (err) {
    const status = err?.response?.status
    const msg =
      status === 403
        ? 'Permission denied — this action must be completed by the employee in their own app.'
        : err?.response?.data?.message || 'Acknowledge failed'
    $q.notify({ type: 'negative', message: msg })
  } finally {
    acknowledgeLoading.value = false
  }
}

// Step 9: bulk disburse selected ready_for_payment employees
const handleBulkDisburse = async () => {
  const logId = payrollRunId.value
  if (!logId) {
    $q.notify({ type: 'warning', message: 'Please select a disbursement log first' })
    return
  }
  const readyIds =
    selectedEmployeeIds.value.size > 0
      ? payrollRunEmployees.value
          .filter(
            (e) =>
              selectedEmployeeIds.value.has(e.employee_id) &&
              e.status === 'ready_for_payment' &&
              e.review_status !== 'pending',
          )
          .map((e) => e.employee_id)
      : payrollRunEmployees.value
          .filter((e) => e.status === 'ready_for_payment' && e.review_status !== 'pending')
          .map((e) => e.employee_id)

  if (!readyIds.length) {
    $q.notify({ type: 'warning', message: 'No employees are ready for payment' })
    return
  }

  $q.dialog({
    title: 'Disburse Payslips',
    message: `Disburse payment for ${readyIds.length} employee(s)? Cash employees will move to "Disbursed", bank employees will move to "Completed".`,
    ok: { label: 'Disburse', color: 'positive', unelevated: true },
    cancel: { label: 'Cancel', flat: true },
  }).onOk(async () => {
    try {
      const result = await disbursePayslips(logId, readyIds)
      const summary = result?.summary ?? {}
      $q.notify({
        type: 'positive',
        message: `Done! Cash: ${summary.disbursed_cash ?? 0}, Bank: ${summary.completed_bank ?? 0}`,
      })
      await fetchPayrollRunEmployees(logId)
      await fetchPayrollRunsSummary()
      // Refresh selectedRun so the header status chip & action button update immediately
      const refreshedRun = payrollRunsSummary.value.find((r) => String(r.id) === String(logId))
      if (refreshedRun) {
        selectedRun.value = refreshedRun
      }
      clearSelection()
      selectAll.value = false
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: err?.response?.data?.message || 'Disbursement failed',
      })
    }
  })
}

const getStageLabel = (status) => {
  const labels = {
    pending: 'Pending',
    draft: 'Draft',
    pending_review: 'Pending Review',
    ready_for_payment: 'Ready for Payment',
    disbursed: 'Disbursed',
    completed: 'Completed',
    closed: 'Completed',
  }
  return labels[status] || status
}

const getStatusColor = (status) => {
  const colors = {
    draft: 'grey',
    pending_review: 'orange',
    ready_for_payment: 'teal',
    disbursed: 'amber',
    completed: 'positive',
  }
  return colors[status] || 'grey'
}

const getStatusLabel = (status) => {
  const labels = {
    draft: 'Draft',
    pending_review: 'Pending Review',
    ready_for_payment: 'Ready for Payment',
    disbursed: 'Disbursed',
    completed: 'Completed',
  }
  return labels[status] || status
}

const retryEmployeeAction = async (emp) => {
  const logId = payrollRunId.value
  if (!logId) return
  try {
    emp.lastError = null
    if (emp.status === 'draft') {
      await bulkReleasePayslips(logId, [emp.employee_id])
    } else if (emp.status === 'ready_for_payment') {
      await disbursePayslips(logId, [emp.employee_id])
    } else if (emp.status === 'disbursed' && emp.payment_method === 'cash' && emp.payslip_id) {
      // Step 10 retry: cash employee failed to confirm receipt
      await confirmMoneyReceived(emp.payslip_id)
    }
    $q.notify({ type: 'positive', message: `Retried: ${emp.employee_name || emp.employee}` })
    await fetchPayrollRunEmployees(logId)
  } catch (err) {
    emp.lastError = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: 'Retry failed' })
  }
}
</script>

<style scoped>
/* ==============================
   DISBURSEMENT TABS
============================== */
.disbursement-tab-bar {
  font-size: 14px;
  min-height: 36px;
}

.tab-panel-logs,
.tab-panel-funding {
  padding: 0 0 20px;
}

/* ==============================
   RUN CARD HEADER — DISBURSEMENT COLUMNS
============================== */
.run-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e0e7ef;
  flex-wrap: wrap;
  transition: all 0.2s ease;
}

.run-period {
  font-size: 11px;
  color: #9ca3af;
}

.run-header-stats {
  display: flex;
  gap: 20px;
  flex: 1;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.run-stat-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 80px;
}

.run-stat-label {
  font-size: 10px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 500;
  margin-bottom: 2px;
}

.run-stat-value {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

/* ==============================
   FUNDING LAYOUT (two-column)
============================== */
.funding-layout {
  display: grid;
  grid-template-columns: minmax(0, 400px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

/* ==============================
   FUNDING FORM CARD
============================== */
.funding-form-card {
  background: #ffffff;
  border: 1px solid #e8ecf0;
  border-radius: 12px;
  padding: 20px;
  min-width: 0;
  overflow: hidden;
}

.funding-form-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.funding-form-header-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #eff6ff;
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.funding-history-icon {
  background: #f5f3ff;
  color: #7c3aed;
}

.funding-form-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.funding-form-subtitle {
  font-size: 12px;
  color: #9ca3af;
  margin: 2px 0 0;
}

.funding-divider {
  height: 1px;
  background: #f1f3f5;
  margin: 0 0 14px;
}

.funding-section-label {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}

.funding-optional {
  font-weight: 400;
  color: #9ca3af;
  text-transform: none;
  letter-spacing: 0;
}

.funding-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.funding-form-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.funding-form-field-full {
  grid-column: 1 / -1;
}

.funding-field-label {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
}

.funding-amount-helper {
  font-size: 11px;
  color: #6b7280;
  margin-top: 4px;
}

.funding-form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.funding-submit-btn {
  border-radius: 8px !important;
  font-weight: 500;
  font-size: 13px;
  padding: 0 18px;
  height: 36px;
}

/* ==============================
   FUNDING HISTORY
============================== */
.funding-history-section {
  background: #ffffff;
  border: 1px solid #e8ecf0;
  border-radius: 12px;
  padding: 20px;
  min-width: 0;
  overflow: hidden;
}

.funding-history-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.funding-history-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.funding-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  gap: 10px;
}

.funding-empty-text {
  font-size: 13px;
  color: #9ca3af;
  text-align: center;
}

.funding-history-table-wrap {
  overflow-x: auto;
}

.funding-history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  border: 1px solid #e8ecf0;
  border-radius: 8px;
  overflow: hidden;
}

.funding-history-table th {
  background: #f8fafc;
  text-align: left;
  padding: 9px 14px;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #e8ecf0;
}

.funding-history-table td {
  padding: 10px 14px;
  border-bottom: 1px solid #f1f3f5;
  color: #374151;
  vertical-align: middle;
}

.funding-history-table tr:last-child td {
  border-bottom: none;
}

.funding-history-table tr:hover td {
  background: #f9fafb;
}

.fh-log-name {
  font-weight: 600;
  font-size: 13px;
  color: #111827;
}

.fh-log-period {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 1px;
}

.fh-source-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.fh-amount {
  font-weight: 600;
  font-size: 13px;
  color: #111827;
}

.fh-actions {
  white-space: nowrap;
}

.fh-sep {
  font-size: 11px;
  color: #d1d5db;
  margin: 0 2px;
}

.funding-history-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #f1f3f5;
}

.fh-page-info {
  font-size: 12px;
  color: #6b7280;
}

/* ==============================
   BASE
============================== */
.payroll-dashboard {
  background: #f4f6f9;
  min-height: 100vh;
  padding: 0;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* ==============================
   RUN CARDS (always-visible layout)
============================== */
.runs-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.run-card {
  background: #ffffff;
  border: 1px solid #e0e7ef;
  border-radius: 12px;
  overflow: hidden;
}

.run-card-header {
  display: block;
  width: 100%;
  background: #eef3fb;
  border-bottom: 1px solid #d8e4f0;
  transition: all 0.2s ease;
}

.run-card-header:hover {
  background: #e6eef8;
}

.run-card-header.expanded {
  background: #deeaf8;
  border-bottom-color: #bfdbfe;
}

/* Single row: name LEFT | stats CENTER | action RIGHT */
.run-header-stats-row {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  gap: 16px;
  flex-wrap: nowrap;
  width: 100%;
  box-sizing: border-box;
}

/* LEFT: chevron + name/date — grows to fill available space */
.run-header-name-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
}

/* Stacked name + period */
.run-name-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  overflow: hidden;
}

/* CENTER: stat columns — fixed size, don't grow or shrink */
.run-header-stat-cols {
  display: flex;
  align-items: center;
  gap: 0;
  flex: 0 0 auto;
}

.run-header-stat-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  padding: 0 12px;
  border-right: 1px solid #d1dce8;
}

.run-header-stat-col:first-child {
  padding-left: 0;
}

.run-header-stat-col:last-of-type {
  border-right: none;
}

.run-header-stat-label {
  font-size: 10px;
  font-weight: 600;
  color: #8a9ab5;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.run-header-stat-val {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
}

.run-header-action {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  padding-left: 16px;
  border-left: 1px solid #d1dce8;
}

.run-action-btn {
  border-radius: 8px !important;
  font-weight: 600;
  padding: 0 18px !important;
  height: 38px;
}

.run-await-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: #92400e;
}

.run-done-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 50%;
}

.run-period-tag {
  font-size: 11px;
  font-weight: 400;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.run-status-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.run-status-pending,
.run-status-draft {
  background: #fff7ed;
  color: #c2410c;
}

.run-status-pending_review {
  background: #fef3c7;
  color: #92400e;
}

.run-status-ready_for_payment {
  background: #ecfdf5;
  color: #065f46;
}

.run-status-disbursed,
.run-status-completed,
.run-status-closed {
  background: #f0fdf4;
  color: #166534;
}

.expand-icon {
  flex-shrink: 0;
  color: #6b7280;
  transition: transform 0.3s ease;
}

.run-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.run-header-amounts {
  display: flex;
  gap: 24px;
}

.run-amount-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.run-amount-label {
  font-size: 11px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 500;
}

.run-amount-value {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

/* ==============================
   HEADER
============================== */
.page-header {
  background: #ffffff;
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 16px;
  border: 1px solid #e8ecf0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.refresh-btn {
  height: 36px;
  width: 36px;
  border-radius: 8px;
  color: #6b7280 !important;
}

.refresh-btn:hover {
  background: #f3f4f6 !important;
  color: #374151 !important;
}

.header-search {
  min-width: 200px;
  max-width: 260px;
  flex: 1;
}

.header-search :deep(.q-field__control) {
  border-radius: 8px;
  height: 36px;
}

.search-icon {
  color: #9ca3af;
}

.export-btn {
  height: 36px;
  border-radius: 8px !important;
  font-weight: 500;
  font-size: 13px;
  text-transform: none;
  padding: 0 16px;
}

/* ==============================
   STATS CARDS
============================== */
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stats-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px 18px;
  border: 1px solid #e8ecf0;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  transition: box-shadow 0.2s ease;
}

.stats-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
}

.stats-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stats-icon {
  font-size: 20px;
}
.stats-icon-blue {
  background: #eff6ff;
  color: #3b82f6;
}
.stats-icon-amber {
  background: #fefce8;
  color: #ca8a04;
}
.stats-icon-green {
  background: #f0fdf4;
  color: #22c55e;
}
.stats-icon-purple {
  background: #f5f3ff;
  color: #8b5cf6;
}

.stats-content {
  min-width: 0;
}

.stats-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 2px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stats-amount {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
}

/* ==============================
   TABS - pill style (matches RequestPage)
============================== */
.tabs-section {
  background: #ffffff;
  border-radius: 12px;
  margin-bottom: 16px;
  border: 1px solid #e8ecf0;
  padding: 10px 14px;
}

.tab-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tab-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;
}

.tab-pill:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}

.tab-pill.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.tab-pill-icon {
  font-size: 15px;
}

.tab-panels {
  background: transparent;
}

.tab-panel-content {
  padding: 0;
}

/* ==============================
   FILTERS SECTION
============================== */
.filters-section {
  margin-bottom: 16px;
}

.filters-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px 20px;
  border: 1px solid #e8ecf0;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.filters-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.view-toggle {
  display: flex;
  gap: 4px;
  background: #f3f4f6;
  border-radius: 8px;
  padding: 3px;
}

.toggle-btn {
  border-radius: 6px !important;
  font-weight: 500;
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  text-transform: none;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.filter-input :deep(.q-field__control) {
  border-radius: 8px;
}

/* ==============================
   TABLE SECTION
============================== */
.table-section {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
  margin-bottom: 16px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f3f5;
  flex-wrap: wrap;
  gap: 8px;
}

.table-title-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.table-info {
  font-size: 12px;
  color: #9ca3af;
}

.table-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.modern-table-container {
  overflow-x: auto;
  margin: 0 16px 16px;
}

.table-wrapper {
  overflow-x: auto;
}

.payroll-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  background: white;
}

.table-header-row {
  background: #f8fafc;
}

.table-header-cell {
  padding: 11px 16px !important;
  text-align: left;
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #6b7280 !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e8ecf0 !important;
  white-space: nowrap;
}

.table-header-cell.sortable {
  cursor: pointer;
  user-select: none;
}
.table-header-cell.sortable:hover {
  background: #f1f5f9;
  color: #374151;
}

.table-body-row {
  border-bottom: 1px solid #f1f3f5;
  transition: background 0.15s;
}

.table-body-row:hover .table-body-cell {
  background: #f9fafb;
}

.table-body-cell {
  padding: 12px 16px !important;
  color: #374151;
  font-size: 13px;
  vertical-align: middle;
  border-bottom: 1px solid #f1f3f5 !important;
}

.highlight-row .table-body-cell {
  background: #f0fdf4;
}

/* ==============================
   AVATAR — matches EmployeesPage exactly
============================== */
.avatar-fallback {
  background: #e0e7ff !important;
  color: #4338ca !important;
  font-weight: 700 !important;
  min-width: 40px !important;
  width: 40px !important;
  height: 40px !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
}

.avatar-fallback :deep(.q-avatar__content) {
  font-size: 13px !important;
  line-height: 1 !important;
}

/* ==============================
   EMPLOYEE CELL
============================== */
.employee-cell {
  min-width: 200px;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.employee-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.employee-name {
  font-weight: 600;
  color: #0f172a;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.employee-id {
  font-size: 11.5px;
  color: #94a3b8;
  font-family: monospace;
  letter-spacing: 0.02em;
}

/* ==============================
   BADGES
============================== */
.period-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
  white-space: nowrap;
}

.run-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  background: #f5f3ff;
  color: #6d28d9;
  border: 1px solid #ddd6fe;
  white-space: nowrap;
}

.hours-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
  white-space: nowrap;
}

/* ==============================
   AMOUNT CELLS
============================== */
.amount-cell {
  min-width: 120px;
}

.amount-display {
  font-weight: 600;
  color: #111827;
  font-size: 13px;
  margin-bottom: 4px;
}

.amount-progress {
  height: 3px;
  background: #f1f3f5;
  border-radius: 2px;
  overflow: hidden;
}

.amount-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.gross-bar {
  background: #f59e0b;
}
.net-bar {
  background: #22c55e;
}

/* ==============================
   ACTIONS
============================== */
.actions-cell {
  text-align: center;
  width: 60px;
}

.action-menu-btn {
  color: #6b7280 !important;
  border-radius: 6px !important;
}
.action-menu-btn:hover {
  background: #f3f4f6 !important;
}
.action-dropdown {
  border-radius: 8px !important;
  border: 1px solid #e5e7eb !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
}

.dropdown-item {
  font-size: 13px !important;
  color: #374151 !important;
  min-height: 36px !important;
  padding: 0 12px !important;
}
.dropdown-item:hover {
  background: #f9fafb !important;
}

/* ==============================
   TABLE FOOTER
============================== */
.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  flex-wrap: wrap;
  gap: 8px;
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #6b7280;
}
.total-label {
  font-weight: 600;
  color: #374151;
}
.total-records {
  color: #6b7280;
}
.total-amount {
  color: #16a34a;
  font-weight: 600;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pagination-btn {
  color: #6b7280;
  border-radius: 6px !important;
}
.pagination-btn:hover {
  background: #f3f4f6 !important;
}
.page-info {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
  min-width: 90px;
  text-align: center;
}

/* ==============================
   CARDS VIEW
============================== */
.cards-section {
  margin-bottom: 16px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.payroll-card {
  background: #ffffff;
  border: 1px solid #e8ecf0;
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.payroll-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e8ecf0;
}

.employee-avatar-large {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e0e7ff;
  color: #4338ca;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.employee-info-card {
  flex: 1;
  min-width: 0;
}
.card-employee-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-employee-id {
  font-size: 11px;
  color: #9ca3af;
  margin: 0;
}
.card-actions {
  display: flex;
  gap: 4px;
}
.card-action-btn {
  color: #6b7280 !important;
  width: 30px;
  height: 30px;
  border-radius: 6px !important;
}
.card-action-btn:hover {
  background: #f3f4f6 !important;
}

.card-body {
  padding: 14px 16px;
}

.pay-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f3f5;
}

.pay-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.pay-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.pay-value {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}
.pay-value.net {
  color: #16a34a;
}

.hours-section {
  margin-bottom: 12px;
}

.hours-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.hours-item {
  background: #f8fafc;
  border-radius: 8px;
  padding: 8px;
  text-align: center;
}
.hours-label {
  font-size: 10px;
  color: #9ca3af;
  font-weight: 500;
  display: block;
  margin-bottom: 3px;
  text-transform: uppercase;
}
.hours-value {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
}
.hours-value.overtime {
  color: #f59e0b;
}
.hours-value.holiday {
  color: #8b5cf6;
}
.hours-value.total {
  color: #3b82f6;
}

.card-footer {
  padding-top: 10px;
  border-top: 1px solid #f1f3f5;
}
.period-info {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.cards-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 4px;
  flex-wrap: wrap;
  gap: 8px;
}
.pagination-info {
  font-size: 13px;
  color: #6b7280;
}

/* ==============================
   PAYROLL RUN DIALOG
============================== */
.run-dialog-card {
  display: flex;
  flex-direction: column;
  background: #f4f6f9;
}

.run-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px !important;
  background: #ffffff;
  border-bottom: 1px solid #e8ecf0;
}

.run-dialog-title-section {
  display: flex;
  align-items: center;
  gap: 14px;
}

.run-dialog-icon {
  background: #eff6ff !important;
  color: #3b82f6 !important;
  border-radius: 10px !important;
  flex-shrink: 0;
}

.run-dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.run-dialog-subtitle {
  display: flex;
  align-items: center;
  gap: 6px;
}

.run-dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px !important;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.run-dialog-footer {
  background: #ffffff;
  border-top: 1px solid #e8ecf0;
  padding: 12px 20px !important;
}

/* ==============================
   WORKFLOW SECTION (inside dialog)
============================== */
.workflow-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e8ecf0;
}

.workflow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.workflow-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workflow-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.workflow-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #6b7280;
}
.workflow-stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.workflow-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 12px 0;
  overflow-x: auto;
}

.stepper-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
  min-width: 80px;
  flex: 1;
}

.step-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  color: #9ca3af;
  transition: all 0.3s;
  position: relative;
  z-index: 1;
}

.stepper-step.step-active .step-icon {
  background: #3b82f6;
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}
.stepper-step.step-completed .step-icon {
  background: #22c55e;
  color: white;
}
.stepper-step.step-pending .step-icon {
  background: #f3f4f6;
  color: #d1d5db;
}

.step-label {
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  text-align: center;
  white-space: nowrap;
}
.stepper-step.step-active .step-label {
  color: #3b82f6;
  font-weight: 600;
}
.stepper-step.step-completed .step-label {
  color: #22c55e;
  font-weight: 600;
}

.step-connector {
  position: absolute;
  top: 20px;
  left: calc(50% + 20px);
  right: calc(-50% + 20px);
  height: 2px;
  background: #e5e7eb;
  z-index: 0;
}
.stepper-step.step-completed .step-connector {
  background: #22c55e;
}

.workflow-actions {
  margin-bottom: 4px;
}
.action-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.action-hint {
  font-size: 12px;
  color: #9ca3af;
}

/* ==============================
   WORKFLOW TABLE (inside dialog)
============================== */
.workflow-table-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}

.workflow-actions-cell {
  display: flex;
  gap: 4px;
  align-items: center;
}
.disbursement-btns {
  display: flex;
  gap: 4px;
}

/* ==============================
   EMPLOYEES PANEL (inline under run row)
============================== */
.employees-panel {
  background: #f4f7fb;
  border-top: 1px solid #dde3ec;
  border-left: 4px solid #3b82f6;
  margin-left: 0;
}

.employees-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 20px 10px 20px;
  background: #eef2f9;
  border-bottom: 1px solid #dde3ec;
}

.employees-panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.employees-panel-count {
  background: #3b82f6;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  padding: 1px 7px;
  line-height: 1.6;
}

.employees-panel-selected {
  font-size: 12px;
  font-weight: 400;
  color: #6b7280;
}

.employees-panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.employee-search-input {
  font-size: 13px;
}

.select-all-checkbox {
  font-size: 13px;
  color: #374151;
}

.employees-nested-table {
  width: 100%;
  border-collapse: collapse;
}

.employees-nested-table .table-header-row th {
  background: #eef2f9 !important;
}

.employees-nested-table .table-body-row:last-child td {
  border-bottom: none;
}

/* ==============================
   INLINE RUN DETAIL (legacy, kept for compatibility)
============================== */

.inline-run-detail {
  background: #f8fafc;
  border-bottom: 1px solid #e0e7ef;
  padding-bottom: 16px;
}

/* ==============================
   SELECTION STATES
============================== */
.selected-row .table-body-cell {
  background: #f0f9ff !important;
}
.selected-row:hover .table-body-cell {
  background: #e0f2fe !important;
}
.failed-row .table-body-cell {
  background: #fef2f2 !important;
}

/* ==============================
   DETAIL MODAL
============================== */
.detail-modal-card {
  width: 560px;
  max-width: 95vw;
  max-height: 90vh;
  border-radius: 14px !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px !important;
  background: #ffffff;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-avatar-icon {
  background: #eff6ff !important;
  color: #3b82f6 !important;
  border-radius: 10px !important;
  flex-shrink: 0;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}
.modal-subtitle {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}
.modal-close-btn {
  color: #9ca3af !important;
  flex-shrink: 0;
}
.modal-close-btn:hover {
  background: #f3f4f6 !important;
  color: #374151 !important;
}

.modal-content {
  padding: 20px !important;
  overflow-y: auto;
  flex: 1;
}

.modal-section-title {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 16px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f1f3f5;
}
.modal-section-title:first-child {
  margin-top: 0;
}

.detail-grid-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.detail-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px 14px;
  border: 1px solid #f1f3f5;
}
.detail-card-full {
  grid-column: 1 / -1;
}
.detail-card-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
.detail-card-value {
  font-size: 13px;
  font-weight: 500;
  color: #111827;
  word-break: break-word;
}

.amount-green {
  color: #16a34a;
}
.amount-blue {
  color: #2563eb;
}
.amount-red {
  color: #dc2626;
}
.amount-amber {
  color: #d97706;
}
.amount-purple {
  color: #7c3aed;
}

.dialog-btn {
  border-radius: 8px !important;
  font-size: 13px;
  text-transform: none;
}
.primary-btn {
  font-weight: 500;
}

/* ==============================
   MISC
============================== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 20px;
  gap: 14px;
}

.text-center {
  text-align: center;
}
.text-grey-5 {
  color: #b0b8c1;
  font-size: 12px;
}
.text-caption {
  font-size: 11px;
}

/* ==============================
   RESPONSIVE
============================== */

/* ---- 1440px and above: wide-screen optimisations ---- */
@media (min-width: 1440px) {
  .dashboard-container {
    max-width: 1600px;
    padding: 20px;
  }

  .stats-section {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }

  .stats-card {
    padding: 20px 22px;
  }

  .stats-icon-wrapper {
    width: 52px;
    height: 52px;
  }

  .stats-icon {
    font-size: 24px;
  }

  .page-header {
    padding: 18px 28px;
  }

  .header-search {
    min-width: 280px;
    max-width: 360px;
  }

  .export-btn {
    height: 40px;
    padding: 0 20px;
    font-size: 14px;
  }

  .tabs-section {
    padding: 12px 18px;
  }

  .tab-pill {
    padding: 9px 18px;
    font-size: 14px;
  }

  .run-header-stats-row {
    padding: 16px 24px;
  }

  .run-header-stat-col {
    padding: 0 16px;
  }

  .run-header-stat-label {
    font-size: 11px;
  }

  .run-header-stat-val {
    font-size: 15px;
  }

  .filters-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }

  .employees-panel-header {
    padding: 14px 20px;
  }

  .table-header {
    padding: 18px 24px;
  }

  .employees-table-header,
  .employees-table-row {
    padding: 16px 24px;
    min-width: 900px;
  }
}

/* ---- 1024px: medium screens / small laptops ---- */
@media (max-width: 1024px) {
  .dashboard-container {
    max-width: 100%;
    padding: 14px;
  }

  .funding-layout {
    grid-template-columns: 1fr;
  }

  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .stats-card {
    padding: 14px 16px;
  }

  .header-search {
    min-width: 180px;
    max-width: 220px;
  }

  .modern-table-container {
    margin: 0 14px 14px 14px;
  }

  .filters-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  /* Stat columns inside run cards: hide lower-priority columns */
  .run-header-stat-cols {
    gap: 0;
  }

  .run-header-stat-col {
    padding: 0 10px;
  }

  .run-header-stat-label {
    font-size: 9px;
  }

  .run-header-stat-val {
    font-size: 13px;
  }

  /* Hide "Funded" and "Released" columns on medium screens to reduce crowding */
  .run-header-stat-col:nth-child(4),
  .run-header-stat-col:nth-child(5) {
    display: none;
  }

  .run-header-stats-row {
    padding: 12px 16px;
    gap: 12px;
  }

  /* Cards view */
  .cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }

  /* Employees panel actions wrap on smaller laptops */
  .employees-panel-actions {
    flex-wrap: wrap;
    gap: 6px;
  }

  .employee-search-input {
    min-width: 150px !important;
  }
}

/* ---- 768px: tablets ---- */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 12px;
  }

  /* Header */
  .page-header {
    padding: 12px 14px;
    margin-bottom: 12px;
    border-radius: 10px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .header-left {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-actions {
    flex-direction: row;
    gap: 8px;
    flex-wrap: wrap;
    width: 100%;
  }

  .header-search {
    max-width: 100%;
    width: 100%;
    flex: 1 1 120px;
    min-width: 0;
  }

  .export-btn {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 12px;
    padding: 0 10px;
  }

  /* Stats */
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }

  .stats-card {
    padding: 12px 14px;
    gap: 10px;
    border-radius: 10px;
  }

  .stats-icon-wrapper {
    width: 38px;
    height: 38px;
    font-size: 18px;
  }

  .stats-amount {
    font-size: 22px;
  }

  /* Tabs */
  .tabs-section {
    padding: 8px 10px;
    margin-bottom: 12px;
    border-radius: 10px;
  }

  .tab-pills {
    gap: 5px;
  }

  .tab-pill {
    padding: 7px 12px;
    font-size: 12px;
    flex: 1;
    justify-content: center;
  }

  /* Run cards: stack stat cols below name on tablet */
  .run-header-stats-row {
    flex-wrap: wrap;
    padding: 12px 14px;
    gap: 10px;
  }

  .run-header-name-group {
    flex: 1 1 100%;
    min-width: 0;
  }

  .run-header-stat-cols {
    flex: 1 1 auto;
    overflow-x: auto;
    padding-bottom: 2px;
    /* Show all columns again in scroll mode */
  }

  .run-header-stat-col:nth-child(4),
  .run-header-stat-col:nth-child(5) {
    display: flex;
  }

  .run-header-stat-col {
    padding: 0 8px;
  }

  .run-header-action {
    flex: 0 0 auto;
    padding-left: 10px;
  }

  .run-action-btn {
    height: 32px;
    padding: 0 12px !important;
    font-size: 12px;
  }

  /* Await / done chips smaller */
  .run-await-chip,
  .run-done-chip {
    padding: 4px 6px;
  }

  /* Employees panel */
  .employees-panel-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
  }

  .employees-panel-actions {
    width: 100%;
    flex-wrap: wrap;
    gap: 6px;
  }

  .employee-search-input {
    flex: 1 1 100% !important;
    min-width: 0 !important;
  }

  /* Filters */
  .filters-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .filters-card {
    padding: 12px 14px;
    border-radius: 10px;
  }

  /* Detail grid */
  .detail-grid-cards {
    grid-template-columns: 1fr;
  }

  .detail-card-full {
    grid-column: span 1;
  }

  /* Table */
  .modern-table-container {
    margin: 0 10px 10px;
  }

  .table-header {
    padding: 12px 14px;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .table-actions {
    width: 100%;
    justify-content: flex-end;
  }

  /* Hours grid */
  .hours-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  /* Workflow stepper */
  .workflow-stepper {
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
  }

  .step-connector {
    display: none;
  }

  .stepper-step {
    min-width: 60px;
  }

  .workflow-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  /* Dialogs */
  .run-dialog-body {
    padding: 14px !important;
  }

  /* Cards grid */
  .cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 10px;
  }

  /* Funding table footer */
  .table-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
  }

  .pagination-controls {
    width: 100%;
    justify-content: flex-end;
  }
}

/* ---- 480px: small phones ---- */
@media (max-width: 480px) {
  .dashboard-container {
    padding: 8px;
  }

  .page-title {
    font-size: 18px;
  }

  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  .stats-card {
    padding: 10px 12px;
    gap: 8px;
  }

  .stats-amount {
    font-size: 20px;
  }

  .stats-label {
    font-size: 11px;
  }

  .stats-icon-wrapper {
    width: 32px;
    height: 32px;
    font-size: 16px;
    border-radius: 8px;
  }

  /* Hide text labels in tab pills, show icons only */
  .tab-pill span:not(.tab-badge) {
    display: none;
  }

  .tab-pill-icon {
    font-size: 16px;
  }

  .tab-pill {
    padding: 8px 14px;
  }

  /* Run cards: full-width vertical layout */
  .run-header-stats-row {
    flex-direction: column;
    align-items: flex-start;
    padding: 10px 12px;
    gap: 8px;
  }

  .run-header-name-group {
    width: 100%;
  }

  .run-header-stat-cols {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .run-header-action {
    width: 100%;
    border-left: none;
    border-top: 1px solid #d1dce8;
    padding-left: 0;
    padding-top: 8px;
    justify-content: flex-end;
  }

  .export-btn {
    font-size: 11px;
    height: 32px;
  }

  /* Cards grid: single column */
  .cards-grid {
    grid-template-columns: 1fr;
  }

  /* Employees panel */
  .employees-panel-header {
    padding: 8px 10px;
  }

  /* Table margins tighter */
  .modern-table-container {
    margin: 0 6px 10px;
  }

  .runs-list {
    padding: 10px;
    gap: 10px;
  }
}

/* Virtual Scrolled Table Styles */
.employees-table-container {
  width: 100%;
  overflow: hidden;
}

.employees-table-header {
  display: flex;
  background: #f1f5f9;
  border-bottom: 2px solid #e2e8f0;
  padding: 14px 20px;
  font-weight: 700;
  font-size: 11px;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  min-width: 700px;
}

/* Base cell — overridden per-column below */
.employees-th {
  padding: 0 12px;
  text-align: left;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

/* Col 1 — checkbox */
.employees-th:nth-child(1) {
  flex: 0 0 44px;
  padding: 0;
  text-align: center;
}
/* Col 2 — Employee name + ID */
.employees-th:nth-child(2) {
  flex: 3 1 220px;
}
/* Col 3 — Status badge */
.employees-th:nth-child(3) {
  flex: 0 0 165px;
}
/* Col 4 — Gross Pay */
.employees-th:nth-child(4) {
  flex: 1.5 1 130px;
}
/* Col 5 — Net Pay */
.employees-th:nth-child(5) {
  flex: 1.5 1 130px;
}
/* Col 6 — Total Hours */
.employees-th:nth-child(6) {
  flex: 0 0 100px;
  text-align: center;
}
/* Col 7 — Actions */
.employees-th:nth-child(7) {
  flex: 0 0 80px;
  text-align: center;
}

.virtual-scroll-container {
  width: 100%;
}

.employee-virtual-scroll {
  width: 100%;
}

.employees-table-row {
  display: flex;
  padding: 16px 20px;
  border-bottom: 1px solid #edf0f4;
  transition: background-color 0.15s ease;
  min-height: 72px;
  align-items: center;
  min-width: 700px;
}

.employees-table-row:hover {
  background-color: #f8fafc;
}

.employees-table-row.selected-row {
  background-color: #eff6ff;
}

.employees-table-row.failed-row {
  background-color: #fef2f2;
}

/* Base cell */
.employees-td {
  padding: 0 12px;
  font-size: 13.5px;
  color: #1e293b;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  flex: 1;
}

/* Col 1 — checkbox */
.employees-td:nth-child(1) {
  flex: 0 0 44px;
  justify-content: center;
  padding: 0;
}
/* Col 2 — Employee */
.employees-td:nth-child(2) {
  flex: 3 1 220px;
}
/* Col 3 — Status */
.employees-td:nth-child(3) {
  flex: 0 0 165px;
  overflow: visible;
}
/* Col 4 — Gross Pay */
.employees-td:nth-child(4) {
  flex: 1.5 1 130px;
}
/* Col 5 — Net Pay */
.employees-td:nth-child(5) {
  flex: 1.5 1 130px;
}
/* Col 6 — Total Hours */
.employees-td:nth-child(6) {
  flex: 0 0 100px;
  justify-content: center;
}
/* Col 7 — Actions */
.employees-td:nth-child(7) {
  flex: 0 0 72px;
  justify-content: center;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
}

/* Scroll horizontally on small screens instead of hiding columns */
.employees-table-container {
  overflow-x: auto;
}

/* Employees table horizontal scroll per breakpoint */
@media (max-width: 1024px) {
  .employees-table-header,
  .employees-table-row {
    min-width: 720px;
  }
}

@media (max-width: 768px) {
  .employees-table-header,
  .employees-table-row {
    min-width: 600px;
  }

  /* Narrower employee name to fit tablet */
  .employees-th:nth-child(2),
  .employees-td:nth-child(2) {
    flex: 2 1 140px;
  }

  /* Compact Gross Pay column on tablet */
  .employees-th:nth-child(4),
  .employees-td:nth-child(4) {
    flex: 1.2 1 100px;
  }

  /* Compact Net Pay column on tablet */
  .employees-th:nth-child(5),
  .employees-td:nth-child(5) {
    flex: 1.2 1 100px;
  }
}

@media (max-width: 480px) {
  .employees-table-header,
  .employees-table-row {
    min-width: 580px;
  }

  /* Compact the hours column on mobile */
  .employees-th:nth-child(6),
  .employees-td:nth-child(6) {
    flex: 0 0 70px;
  }
}
</style>
