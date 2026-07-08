<template>
  <PageShell>
    <div class="deductions-card">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-titles">
            <h1 class="page-title">Contributions</h1>
          </div>
          <div class="header-actions">
            <q-select
              v-model="period.year"
              :options="yearOptions"
              label="Year"
              dense
              outlined
              class="period-select"
              emit-value
              map-options
            />
            <q-select
              v-model="period.month"
              :options="monthOptions"
              label="Month"
              dense
              outlined
              class="period-select"
              emit-value
              map-options
            />
          </div>
        </div>
      </div>

      <DeductionsTabPills v-model="activeTab" />

      <q-banner
        v-if="error"
        class="error-banner"
        rounded
      >
        <template v-slot:avatar>
          <q-icon name="error_outline" size="20px" class="error-banner-icon" />
        </template>
        <span class="error-banner-text">{{ error }}</span>
        <template v-slot:action>
          <q-btn flat dense icon="close" size="sm" class="error-banner-close" @click="clearError" />
        </template>
      </q-banner>

      <q-tab-panels v-model="activeTab" animated class="tab-panels">
        <q-tab-panel name="annual" class="tab-panel-content">
          <AnnualSummaryTable :rows="annualContributions" :loading="loading" />
        </q-tab-panel>

        <q-tab-panel name="employee" class="tab-panel-content">
          <EmployeeSummaryTable :rows="employeeContributions" :loading="loading" />
        </q-tab-panel>

        <q-tab-panel name="department" class="tab-panel-content">
          <DepartmentSummaryTable :rows="departmentContributions" :loading="loading" />
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </PageShell>
</template>

<script setup>
import { ref, reactive, watch, computed, onMounted } from 'vue'
import { useCompany } from 'src/composables/page/useCompany'
import { useDeductions } from 'src/composables/page/useDeductions'
import PageShell from '@/components/layout/PageShell.vue'
import DeductionsTabPills from '@/components/pages/Deductions/DeductionsTabPills.vue'
import AnnualSummaryTable from '@/components/pages/Deductions/AnnualSummaryTable.vue'
import EmployeeSummaryTable from '@/components/pages/Deductions/EmployeeSummaryTable.vue'
import DepartmentSummaryTable from '@/components/pages/Deductions/DepartmentSummaryTable.vue'

const { companyId } = useCompany()
const {
  annualContributions,
  employeeContributions,
  departmentContributions,
  loading,
  error,
  clearError,
  fetchAnnualContributions,
  fetchEmployeeContributions,
  fetchDepartmentContributions,
} = useDeductions()

const activeTab = ref('annual')

const now = new Date()
const period = reactive({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
})

const currentYear = now.getFullYear()
const years = []
for (let y = currentYear; y >= currentYear - 10; y--) {
  years.push(y)
}

const yearOptions = computed(() =>
  years.map((y) => ({ label: String(y), value: y })),
)

const monthOptions = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
]

function cid() {
  return Number(companyId.value)
}

function fetchAllData() {
  const id = cid()
  if (!id) return
  console.log('[Contributions] Fetching all for year:', period.year, 'month:', period.month)
  fetchAnnualContributions(id, period.year)
  fetchEmployeeContributions(id, period.year, period.month)
  fetchDepartmentContributions(id, period.year, period.month)
}

function fetchActiveTabData() {
  const id = cid()
  if (!id) return
  console.log('[Contributions] Tab switch - fetching', activeTab.value, 'for year:', period.year, 'month:', period.month)
  switch (activeTab.value) {
    case 'annual':
      fetchAnnualContributions(id, period.year)
      break
    case 'employee':
      fetchEmployeeContributions(id, period.year, period.month)
      break
    case 'department':
      fetchDepartmentContributions(id, period.year, period.month)
      break
  }
}

watch([() => companyId.value, () => period.year, () => period.month], () => {
  fetchAllData()
})

watch(activeTab, () => {
  fetchActiveTabData()
})

onMounted(() => {
  if (cid()) {
    fetchAllData()
  }
})
</script>

<style scoped>
.deductions-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}

.page-header {
  padding: 8px 24px;
  border-bottom: 1px solid #f1f3f5;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.period-select {
  min-width: 120px;
}

.period-select :deep(.q-field__control) {
  border-radius: 10px;
  height: 36px;
  background: #f8fafc;
  border-color: #e2e8f0;
}

.period-select :deep(.q-field__control:hover) {
  border-color: #cbd5e1;
}

.tab-panels {
  background: transparent;
}

.tab-panel-content {
  padding: 0;
}

.error-banner {
  margin: 12px 16px 0;
  background: #fef2f2;
  border: 1px solid #fecaca;
  padding: 8px 14px;
}

.error-banner-icon {
  color: #ef4444;
}

.error-banner-text {
  font-size: 13px;
  color: #991b1b;
  line-height: 1.4;
}

.error-banner-close {
  color: #991b1b;
}

@media (max-width: 1440px) {
  .deductions-card {
    border-radius: 14px;
  }
  .page-header {
    padding: 8px 20px;
  }
}

@media (max-width: 1024px) {
  .page-header {
    padding: 8px 16px;
  }
  .page-title {
    font-size: 19px;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: stretch;
  }
  .header-actions {
    flex-direction: column;
    gap: 8px;
  }
  .period-select {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 18px;
  }
  .page-header {
    padding: 6px 12px;
  }
  .period-select {
    min-width: 0;
  }
}
</style>
