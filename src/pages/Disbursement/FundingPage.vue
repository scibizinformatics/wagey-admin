<template>
  <PageShell>
    <div class="funding-card">
      <PayoutGroupStepperHeader :group-id="groupId" :key="stepperKey" />

      <div class="stats-bar">
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-total"></span>
            Total Gross Pay
          </div>
          <div class="stats-segment-value">₱{{ parseAmount(amounts?.total_gross_pay) }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-deductions"></span>
            Deductions
          </div>
          <div class="stats-segment-value">₱{{ parseAmount(amounts?.total_deductions) }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-ca"></span>
            Cash Advances
          </div>
          <div class="stats-segment-value">₱{{ parseAmount(amounts?.total_cash_advances) }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-funding"></span>
            Net Funding Required
          </div>
          <div class="stats-segment-value">₱{{ parseAmount(amounts?.net_funding_required) }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-employees"></span>
            Employees
          </div>
          <div class="stats-segment-value">{{ allEarners.length ?? 0 }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-status"></span>
            Group Status
          </div>
          <div class="stats-segment-value">{{ amounts?.group_status || '-' }}</div>
        </div>
      </div>

      <div class="content-row">
        <div class="content-col">
          <div class="funding-form-section">
            <div class="funding-form-card">
              <div class="funding-form-header">
                <div class="funding-form-header-icon">
                  <q-icon name="account_balance_wallet" size="18px" />
                </div>
                <div>
                  <h2 class="funding-form-title">Add Funds</h2>
                  <p class="funding-form-subtitle">Record a new funding entry for a disbursement log</p>
                </div>
              </div>

              <div class="funding-divider" />

              <div class="funding-section-label">Payment Details</div>
              <div class="funding-form-grid">
                <div class="funding-form-field">
                  <label class="funding-field-label">Funding Source</label>
                  <q-select
                    v-model="form.funding_source"
                    outlined
                    dense
                    emit-value
                    map-options
                    :options="sourceOptions"
                    placeholder="Select source"
                    no-error-icon
                  >
                    <template v-slot:prepend><q-icon name="account_balance" size="16px" color="grey-6" /></template>
                  </q-select>
                </div>

                <div class="funding-form-field">
                  <label class="funding-field-label">Reference No.</label>
                  <q-input v-model="form.reference_no" outlined dense placeholder="e.g. 125436345" no-error-icon>
                    <template v-slot:prepend><span style="font-size: 13px; color: #9ca3af">#</span></template>
                  </q-input>
                </div>

                <div class="funding-form-field funding-form-field-full">
                  <label class="funding-field-label">Amount</label>
                  <q-input v-model="form.amount" outlined dense type="number" placeholder="0.00" no-error-icon>
                    <template v-slot:prepend><span style="font-size: 13px; font-weight: 600; color: #374151">₱</span></template>
                  </q-input>
                  <div class="funding-amount-helper">
                    Total Gross Pay: ₱{{ parseAmount(amounts?.total_gross_pay) }} | Net Funding Required: ₱{{ parseAmount(amounts?.net_funding_required) }}
                  </div>
                </div>
              </div>

              <div class="funding-section-label">
                Notes <span class="funding-optional">(optional)</span>
              </div>
              <div class="funding-form-field" style="margin-bottom: 20px">
                <q-input v-model="form.notes" outlined dense placeholder="Add a note about this funding entry..." no-error-icon />
              </div>

              <div class="funding-divider" />

              <div class="funding-form-actions">
                <q-btn unelevated label="Add Funds" icon="add" no-caps :loading="submitting"
                  :disable="!form.amount || submitting" @click="submitFunding" class="funding-submit-btn header-add-btn" />
              </div>
            </div>
          </div>
        </div>
        <div class="content-col">
          <div class="funding-form-section">
            <div class="funding-form-card">
              <div class="funding-top-earners-header">
              <div class="funding-form-header-icon funding-top-earners-icon">
                <q-icon name="leaderboard" size="18px" />
              </div>
              <div>
                <h3 class="funding-top-earners-title">All Earners</h3>
                <p class="funding-form-subtitle">All employees in this group sorted by net pay</p>
              </div>
            </div>

            <div class="funding-divider" />

            <div class="table-block">
               <q-table
                :rows="allEarners"
                :columns="earnerColumns"
                :pagination="{ rowsPerPage: 0 }"
                flat
                dense
                hide-pagination
                hide-no-data
                class="funding-table"
              >
                <template #body-cell-net_pay="props">
                  <q-td :props="props" class="text-right">₱{{ parseFloat(props.row.net_pay || 0).toLocaleString('en-PH') }}</q-td>
                </template>
                <template #no-data>
                  <div class="empty-state">
                    <q-icon name="inbox" size="28px" color="grey-4" />
                    <div class="empty-text">No data found</div>
                  </div>
                </template>
              </q-table>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageShell>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import PayoutGroupStepperHeader from 'src/components/pages/Payroll/PayoutGroupStepperHeader.vue'
import PageShell from 'src/components/layout/PageShell.vue'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { useAuthStore } from 'src/boot/auth'

const route = useRoute()
const $q = useQuasar()
const authStore = useAuthStore()
const groupId = route.params.id
const stepperKey = ref(0)
  const { fetchPayoutGroupInstanceAmounts, fetchEmployeePayslips, createPgiFunding } = useDisbursementApi()

  const loading = ref(true)
  const submitting = ref(false)
  const amounts = ref(null)
  const allEarners = ref([])

const form = ref({
  funding_source: null,
  amount: '',
  reference_no: '',
  notes: '',
})

const sourceOptions = [
  { label: 'Bank Transfer', value: 'Bank Transfer' },
  { label: 'Check', value: 'Check' },
  { label: 'Paytaca', value: 'Paytaca' },
]

  const earnerColumns = [
    { name: 'employee', label: 'Employee', field: 'employee', align: 'left', sortable: true },
    { name: 'position_name', label: 'Position', field: 'position_name', align: 'left' },
    { name: 'net_pay', label: 'Net Pay', field: 'net_pay', align: 'right', sortable: true },
    { name: 'payslip_status', label: 'Status', field: 'payslip_status', align: 'left', sortable: true },
  ]

function parseAmount(val) {
  return parseFloat(val || 0).toLocaleString('en-PH')
}

  onMounted(async () => {
    try {
      const [amt, earners] = await Promise.all([
        fetchPayoutGroupInstanceAmounts(groupId),
        fetchEmployeePayslips(groupId),
      ])
      amounts.value = amt
      allEarners.value = (earners || []).sort((a, b) => parseFloat(b.net_pay || 0) - parseFloat(a.net_pay || 0))
    } catch (err) {
      console.error('[FundingPage] fetch failed:', err)
    } finally {
      loading.value = false
    }
  })

async function submitFunding() {
  if (!form.value.amount) return
  submitting.value = true
  const employeeUuid = authStore.user?.employee_uuid
  try {
    await createPgiFunding(groupId, {
      funding_source: form.value.funding_source,
      amount: String(Number(form.value.amount)),
      reference_no: form.value.reference_no || '',
      prepared_by_employee_id: employeeUuid,
      custodian_employee_id: employeeUuid,
      notes: form.value.notes || '',
    })
    stepperKey.value++
    $q.notify({ type: 'positive', message: 'Funding added successfully!', position: 'top' })
      const [amt, earners] = await Promise.all([
        fetchPayoutGroupInstanceAmounts(groupId),
        fetchEmployeePayslips(groupId),
      ])
      amounts.value = amt
      allEarners.value = (earners || []).sort((a, b) => parseFloat(b.net_pay || 0) - parseFloat(a.net_pay || 0))
    form.value = { funding_source: null, amount: '', reference_no: '', notes: '' }
  } catch (err) {
    console.error('[FundingPage] submitFunding error:', err)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.funding-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}

.stats-bar {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border-bottom: 1px solid #f1f3f5;
  padding: 10px 24px;
  gap: 0;
}

.stats-segment {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stats-divider {
  width: 1px;
  height: 20px;
  background: #e2e8f0;
  margin: 0 20px;
  flex-shrink: 0;
}

.stats-segment-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  white-space: nowrap;
}

.stats-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.stats-dot-total { background: #6366f1; }
.stats-dot-deductions { background: #f59e0b; }
.stats-dot-ca { background: #ef4444; }
.stats-dot-funding { background: #06b6d4; }
.stats-dot-employees { background: #6366f1; }
.stats-dot-status { background: #8b5cf6; }

.stats-segment-value {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.content-row {
  display: flex;
  gap: 0;
}

.content-col {
  flex: 1;
  min-width: 0;
}

.content-col:first-child {
  border-right: 1px solid #f1f3f5;
}

.funding-form-section {
  padding: 16px 24px;
}

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
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
  margin-bottom: 16px;
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
  border-radius: 10px !important;
  font-weight: 500;
  font-size: 13px;
  padding: 0 18px;
  height: 36px;
}

.header-add-btn {
  background: #102335 !important;
  color: #ffffff !important;
}

.header-add-btn:hover {
  background: #193d5c !important;
}

.funding-top-earners-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.funding-top-earners-icon {
  background: #f5f3ff;
  color: #7c3aed;
}

.funding-top-earners-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.table-block {
}

.funding-table :deep(.q-table thead th) {
  font-size: 10.5px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 4px 10px;
  background: #f8f9fb;
  border-bottom: 1px solid #e8ecf0;
}

.funding-table :deep(.q-table tbody td) {
  padding: 8px 10px;
  font-size: 12.5px;
  color: #374151;
  border-bottom: 1px solid #f1f3f5;
  vertical-align: middle;
}

.funding-table :deep(.q-table tbody tr:last-child td) {
  border-bottom: none;
}

.funding-table :deep(.q-table tbody tr:hover td) {
  background: #f8fafc;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 0;
}

.empty-text {
  font-size: 13px;
  color: #9ca3af;
}

@media (max-width: 1440px) {
  .funding-card { border-radius: 14px; }
  .funding-form-section { padding: 16px 20px; }
  .stats-bar { padding: 10px 20px; }
  .stats-divider { margin: 0 16px; }
}

@media (max-width: 1024px) {
  .funding-form-section { padding: 16px 16px; }
  .stats-bar {
    padding: 10px 16px;
    flex-wrap: wrap;
    gap: 10px;
  }
  .stats-divider { margin: 0 12px; }
  .stats-segment-value { font-size: 14px; }
}

@media (max-width: 768px) {
  .stats-bar {
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 16px;
  }
  .stats-divider { display: none; }
}
</style>
