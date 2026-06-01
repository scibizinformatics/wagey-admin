<template>
  <PageShell>
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Admin Settings</h1>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="tabs-wrapper">
        <q-tabs
          v-model="activeTab"
          dense
          class="settings-tabs"
          active-color="primary"
          indicator-color="primary"
          align="left"
        >
          <q-tab name="companies" label="Companies" class="settings-tab" />
          <q-tab name="sites" label="Sites" class="settings-tab" />
          <q-tab name="roles" label="Permissions" class="settings-tab" />
          <q-tab name="shifts" label="Shifts" class="settings-tab" />
          <q-tab name="departments" label="Departments" class="settings-tab" />
          <q-tab name="positions" label="Positions" class="settings-tab" />
          <q-tab name="contract-types" label="Contract Types" class="settings-tab" />
          <q-tab name="cost-centers" label="Cost Centers" class="settings-tab" />
          <q-tab name="custom-multipliers" label="Custom Multipliers" class="settings-tab" />
        </q-tabs>
      </div>

      <!-- Tab Panels -->
      <q-tab-panels v-model="activeTab" animated class="transparent-panels">
        <!-- ===================== COMPANIES ===================== -->
        <q-tab-panel name="companies" class="q-pa-none">
          <AdminSettingsPanelCompanies :search-query="searchQuery" />
        </q-tab-panel>

        <!-- ===================== SITES ===================== -->
        <q-tab-panel name="sites" class="q-pa-none">
          <AdminSettingsPanelSites :search-query="searchQuery" />
        </q-tab-panel>

        <!-- ===================== ROLES ===================== -->
        <q-tab-panel name="roles" class="q-pa-none">
          <AdminSettingsPanelRoles :search-query="searchQuery" />
        </q-tab-panel>

        <!-- ===================== SHIFTS ===================== -->
        <q-tab-panel name="shifts" class="q-pa-none">
          <AdminSettingsPanelShifts :search-query="searchQuery" />
        </q-tab-panel>

        <!-- ===================== DEPARTMENTS ===================== -->
        <q-tab-panel name="departments" class="q-pa-none">
          <AdminSettingsPanelDepartments :search-query="searchQuery" />
        </q-tab-panel>

        <!-- ===================== POSITIONS ===================== -->
        <q-tab-panel name="positions" class="q-pa-none">
          <AdminSettingsPanelPositions :search-query="searchQuery" />
        </q-tab-panel>

        <!-- ===================== CONTRACT TYPES ===================== -->
        <q-tab-panel name="contract-types" class="q-pa-none">
          <AdminSettingsPanelContractTypes :search-query="searchQuery" />
        </q-tab-panel>

        <!-- ===================== CUSTOM MULTIPLIERS ===================== -->
        <q-tab-panel name="custom-multipliers" class="q-pa-none">
          <AdminSettingsPanelCustomMultipliers />
        </q-tab-panel>

        <!-- ===================== COST CENTERS ===================== -->
        <q-tab-panel name="cost-centers" class="q-pa-none">
          <AdminSettingsPanelCostCenters :search-query="searchQuery" />
        </q-tab-panel>
      </q-tab-panels>

  </PageShell>
</template>

<script setup>
import PageShell from '@/components/layout/PageShell.vue'
import { ref } from 'vue'

import AdminSettingsPanelCompanies from '@/components/pages/AdminSettings/AdminSettingsPanelCompanies.vue'
import AdminSettingsPanelSites from '@/components/pages/AdminSettings/AdminSettingsPanelSites.vue'
import AdminSettingsPanelRoles from '@/components/pages/AdminSettings/AdminSettingsPanelRoles.vue'
import AdminSettingsPanelShifts from '@/components/pages/AdminSettings/AdminSettingsPanelShifts.vue'
import AdminSettingsPanelDepartments from '@/components/pages/AdminSettings/AdminSettingsPanelDepartments.vue'
import AdminSettingsPanelPositions from '@/components/pages/AdminSettings/AdminSettingsPanelPositions.vue'
import AdminSettingsPanelContractTypes from '@/components/pages/AdminSettings/AdminSettingsPanelContractTypes.vue'
import AdminSettingsPanelCustomMultipliers from '@/components/pages/AdminSettings/AdminSettingsPanelCustomMultipliers.vue'
import AdminSettingsPanelCostCenters from '@/components/pages/AdminSettings/AdminSettingsPanelCostCenters.vue'

const activeTab = ref('companies')
const searchQuery = ref('')
</script>

<style scoped>
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

.tabs-wrapper {
  background: white;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  margin-bottom: 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.settings-tabs {
  padding: 0 8px;
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

@media (max-width: 1024px) {
  .page-header {
    padding: 14px;
  }

  .page-title {
    font-size: 18px;
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 14px;
    margin-bottom: 12px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: 12px;
    border-radius: 10px;
  }

  .page-title {
    font-size: 17px;
  }
}
</style>
