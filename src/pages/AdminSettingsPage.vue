<template>
  <PageShell>
    <div class="admin-card">
      <div class="tabs-section">
        <q-tabs
          v-model="activeTab"
          dense
          class="settings-tabs"
          active-color="#102335"
          indicator-color="#102335"
          align="left"
        >
          <q-tab name="sites" label="Sites" class="settings-tab" />
          <q-tab name="roles" label="Permissions" class="settings-tab" />
          <q-tab name="shifts" label="Shifts" class="settings-tab" />
          <q-tab name="departments" label="Departments" class="settings-tab" />
          <q-tab name="positions" label="Positions" class="settings-tab" />
          <q-tab name="contract-types" label="Contract Types" class="settings-tab" />
          <q-tab name="cost-centers" label="Cost Centers" class="settings-tab" />
          <q-tab name="custom-multipliers" label="Custom Multipliers" class="settings-tab" />
          <q-tab name="payroll-groups" label="Payroll Groups" class="settings-tab" />
        </q-tabs>
      </div>

      <q-tab-panels v-model="activeTab" animated class="transparent-panels">
        <q-tab-panel name="sites" class="q-pa-none">
          <AdminSettingsPanelSites :search-query="searchQuery" />
        </q-tab-panel>
        <q-tab-panel name="roles" class="q-pa-none">
          <AdminSettingsPanelRoles :search-query="searchQuery" />
        </q-tab-panel>
        <q-tab-panel name="shifts" class="q-pa-none">
          <AdminSettingsPanelShifts :search-query="searchQuery" />
        </q-tab-panel>
        <q-tab-panel name="departments" class="q-pa-none">
          <AdminSettingsPanelDepartments :search-query="searchQuery" />
        </q-tab-panel>
        <q-tab-panel name="positions" class="q-pa-none">
          <AdminSettingsPanelPositions :search-query="searchQuery" />
        </q-tab-panel>
        <q-tab-panel name="contract-types" class="q-pa-none">
          <AdminSettingsPanelContractTypes :search-query="searchQuery" />
        </q-tab-panel>
        <q-tab-panel name="custom-multipliers" class="q-pa-none">
          <AdminSettingsPanelCustomMultipliers />
        </q-tab-panel>
        <q-tab-panel name="cost-centers" class="q-pa-none">
          <AdminSettingsPanelCostCenters :search-query="searchQuery" />
        </q-tab-panel>
        <q-tab-panel name="payroll-groups" class="q-pa-none">
          <AdminSettingsPanelPayrollGroups :search-query="searchQuery" />
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </PageShell>
</template>

<script setup>
import PageShell from '@/components/layout/PageShell.vue'
import { ref } from 'vue'

import AdminSettingsPanelSites from '@/components/pages/AdminSettings/AdminSettingsPanelSites.vue'
import AdminSettingsPanelRoles from '@/components/pages/AdminSettings/AdminSettingsPanelRoles.vue'
import AdminSettingsPanelShifts from '@/components/pages/AdminSettings/AdminSettingsPanelShifts.vue'
import AdminSettingsPanelDepartments from '@/components/pages/AdminSettings/AdminSettingsPanelDepartments.vue'
import AdminSettingsPanelPositions from '@/components/pages/AdminSettings/AdminSettingsPanelPositions.vue'
import AdminSettingsPanelContractTypes from '@/components/pages/AdminSettings/AdminSettingsPanelContractTypes.vue'
import AdminSettingsPanelCustomMultipliers from '@/components/pages/AdminSettings/AdminSettingsPanelCustomMultipliers.vue'
import AdminSettingsPanelCostCenters from '@/components/pages/AdminSettings/AdminSettingsPanelCostCenters.vue'
import AdminSettingsPanelPayrollGroups from '@/components/pages/AdminSettings/AdminSettingsPanelPayrollGroups.vue'

const activeTab = ref('sites')
const searchQuery = ref('')
</script>

<style scoped>
.admin-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}
.tabs-section {
  padding: 0 24px;
  border-bottom: 1px solid #f1f3f5;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.settings-tabs {
  min-width: max-content;
}
.settings-tab {
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
  color: #616161;
  padding: 12px 16px;
  white-space: nowrap;
}
.transparent-panels {
  background: transparent;
}
@media (max-width: 1440px) {
  .admin-card { border-radius: 14px; }
}
@media (max-width: 1024px) {
  .tabs-section { padding: 0 16px; }
}
@media (max-width: 768px) {
  .tabs-section { padding: 0 12px; }
}
</style>
