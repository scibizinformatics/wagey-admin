<template>
  <q-page class="admin-dashboard">
    <div class="dashboard-container">
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
    </div>

  </q-page>
</template>

<script setup>
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

<style>
/* ============================================
   BASE LAYOUT
   ============================================ */
.admin-dashboard {
  background: #f4f6f9;
  min-height: 100vh;
  padding: 0;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* ============================================
   PAGE HEADER — matches EmployeesPage exactly
   ============================================ */
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

.header-left {
  flex: 1;
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

.header-search {
  min-width: 200px;
  max-width: 260px;
}

.header-search :deep(.q-field__control) {
  border-radius: 8px;
  height: 36px;
}

.search-icon {
  color: #9ca3af;
}

/* ============================================
   SITE DIALOG STYLES
   ============================================ */
.dialog-header {
  padding: 16px 20px 12px;
}

.form-section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #6b7280;
  margin-bottom: 10px;
  margin-top: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid #f0f0f0;
}

.toggles-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.toggle-item {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 10px;
}

.toggle-label-group {
  display: flex;
  flex-direction: column;
}

.toggle-label {
  font-size: 13px;
  font-weight: 500;
  color: #1a202c;
  line-height: 1.2;
}

.toggle-hint {
  font-size: 11px;
  color: #9ca3af;
  line-height: 1.2;
}

/* ============================================
   TABS
   ============================================ */
.tabs-wrapper {
  background: white;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  margin-bottom: 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.subtabs-wrapper {
  background: white;
  border-radius: 10px;
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

/* ============================================
   TABLE SECTION — matches EmployeesPage exactly
   ============================================ */
.table-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
  margin-bottom: 0;
}

.table-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f1f3f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.table-title-section {
  flex: 1;
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 2px 0;
}

.table-subtitle {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.add-btn {
  height: 36px;
  border-radius: 8px;
  font-weight: 500;
  text-transform: none;
  white-space: nowrap;
  padding: 0 16px;
  font-size: 13px;
}

/* ============================================
   TABLE STYLES — matches EmployeesPage exactly
   ============================================ */
.modern-table-container {
  overflow-x: auto;
}

.settings-table {
  width: 100%;
  min-width: 700px;
}

.table-header-row {
  background: #f8fafc;
}

.table-header-cell {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #6b7280 !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 11px 16px !important;
  border-bottom: 1px solid #e8ecf0 !important;
  text-align: left !important;
}

.table-body-row {
  transition: background 0.15s ease;
}

.table-body-row:hover .table-body-cell {
  background: #f9fafb;
}

.table-body-cell {
  font-size: 13px;
  color: #374151;
  padding: 12px 16px !important;
  border-bottom: 1px solid #f1f3f5 !important;
  vertical-align: middle;
  text-align: left !important;
}

.item-name {
  font-weight: 600;
  color: #111827;
  font-size: 13px;
}

/* ============================================
   STATUS & OWNERSHIP BADGES
   ============================================ */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.status-active {
  background: #f0fdf4;
  color: #16a34a;
}

.status-inactive {
  background: #f3f4f6;
  color: #6b7280;
}

.status-pending {
  background: #fef3c7;
  color: #d97706;
}

.status-graveyard {
  background: #ede9fe;
  color: #7c3aed;
}

.status-regular {
  background: #e0f2fe;
  color: #0369a1;
}

.ownership-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  text-transform: capitalize;
  white-space: nowrap;
}

.owned-badge {
  background: #dbeafe;
  color: #1d4ed8;
}

.leased-badge {
  background: #ffedd5;
  color: #c2410c;
}

/* ============================================
   ACTION BUTTONS — matches EmployeesPage exactly
   ============================================ */
.actions-cell {
  text-align: center !important;
  width: 60px;
}

.actions-header {
  text-align: center !important;
  width: 60px;
}

/* Force Quasar th inner span to also center */
.actions-header .q-table__sort-icon,
.actions-header span {
  text-align: center !important;
  justify-content: center !important;
}

.action-menu-btn {
  color: #6b7280 !important;
  border-radius: 6px !important;
}

.action-menu-btn:hover {
  background: #f3f4f6 !important;
  color: #374151 !important;
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

.dropdown-item-danger {
  color: #dc2626 !important;
}

.dropdown-item-danger:hover {
  background: #fef2f2 !important;
}

/* Legacy icon-button actions (kept for backward compat) */
.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
  flex-wrap: nowrap;
}

.action-btn {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 6px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.view-btn {
  background: #dbeafe;
  color: #3b82f6;
}

.view-btn:hover {
  background: #bfdbfe;
}

.edit-btn {
  background: #fef3c7;
  color: #d97706;
}

.edit-btn:hover {
  background: #fde68a;
}

.pdf-btn {
  background: #fee2e2;
  color: #dc2626;
}

.pdf-btn:hover {
  background: #fecaca;
}

.delete-btn {
  background: #fee2e2;
  color: #dc2626;
}

.delete-btn:hover {
  background: #fecaca;
}

/* ============================================
   PERMISSIONS
   ============================================ */
.permissions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 320px;
}

.permission-chip {
  font-size: 11px;
  border-radius: 4px;
  margin: 0;
}

/* ============================================
   RESPONSIVE — 1024px
   ============================================ */
@media (max-width: 1024px) {
  .dashboard-container {
    padding: 14px;
  }

  .page-header {
    padding: 14px;
  }

  .page-title {
    font-size: 18px;
  }

  .table-title {
    font-size: 16px;
  }

  .modern-table-container {
    margin: 0 12px 12px 12px;
  }
}

/* ============================================
   RESPONSIVE — 768px (Tablet)
   ============================================ */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 12px;
  }

  .page-header {
    padding: 14px;
    margin-bottom: 12px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .header-actions {
    flex-direction: column;
    gap: 8px;
  }

  .header-search {
    max-width: 100%;
    width: 100%;
  }

  .table-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .table-actions {
    width: 100%;
  }

  .add-btn {
    width: 100%;
    justify-content: center;
  }

  .modern-table-container {
    margin: 0 10px 10px 10px;
    overflow-x: auto;
  }

  .settings-table {
    min-width: 700px;
  }

  .table-header-cell,
  .table-body-cell {
    padding: 10px 8px;
    font-size: 12px;
  }

  .actions-cell {
    width: 90px;
    min-width: 90px;
  }

  .action-btn {
    width: 30px;
    height: 30px;
    min-width: 30px;
  }
}

/* ============================================
   RESPONSIVE — 480px (Small Mobile)
   ============================================ */
@media (max-width: 480px) {
  .dashboard-container {
    padding: 10px;
  }

  .page-header {
    padding: 12px;
    border-radius: 10px;
  }

  .page-title {
    font-size: 17px;
  }

  .table-section {
    border-radius: 10px;
  }

  .table-title {
    font-size: 15px;
  }

  .table-subtitle {
    font-size: 11px;
  }

  .modern-table-container {
    margin: 0 8px 8px 8px;
  }

  .settings-table {
    min-width: 600px;
  }

  .table-header-cell,
  .table-body-cell {
    font-size: 11px;
    padding: 8px 6px;
  }

  .status-badge,
  .ownership-badge {
    font-size: 10px;
    padding: 3px 7px;
  }

  .action-btn {
    width: 28px;
    height: 28px;
    min-width: 28px;
  }
}
.rules-preview-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rules-preview-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

/* ============================================
   SITE MAP PICKER
   ============================================ */
.map-picker-wrapper {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  background: #f8fafc;
}

.map-picker-toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
}

.map-toggle-btn {
  border-radius: 8px;
  font-weight: 500;
}

.map-coords-hint {
  font-size: 11px;
  color: #64748b;
  font-family: monospace;
}

.site-map-wrapper {
  position: relative;
  width: 100%;
}

.site-map-container {
  height: 300px;
  width: 100%;
  z-index: 0;
}

/* Ensure Leaflet popups render above q-dialog overlay */
.leaflet-pane,
.leaflet-top,
.leaflet-bottom {
  z-index: 1000 !important;
}

.q-dialog__inner .leaflet-container {
  z-index: 0;
}

/* ============================================
   ADMIN MODAL — matches EmployeesPage style
   ============================================ */
.admin-modal-card {
  border-radius: 16px !important;
  width: 560px;
  max-width: 95vw !important;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
}

.admin-modal-header {
  background: #2563eb !important;
  border-bottom: none !important;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 24px;
  flex-shrink: 0;
}

.admin-modal-header .modal-close-btn {
  color: rgba(255, 255, 255, 0.8) !important;
}

.admin-modal-header .modal-close-btn:hover {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.15) !important;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-avatar-icon {
  border-radius: 10px !important;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.2) !important;
  color: #ffffff !important;
}

.admin-modal-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.admin-modal-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}

.admin-modal-content {
  padding: 20px !important;
  overflow-y: auto;
  flex: 1;
  background: #f9fafb;
  scrollbar-width: thin;
  scrollbar-color: #e2e8f0 transparent;
}

.admin-modal-content::-webkit-scrollbar {
  width: 4px;
}

.admin-modal-content::-webkit-scrollbar-track {
  background: transparent;
}

.admin-modal-content::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 4px;
}

.admin-modal-content :deep(.q-field__control) {
  background: #ffffff !important;
}

.admin-modal-footer {
  padding: 12px 20px !important;
  border-top: 1px solid #e8ecf0;
  background: #ffffff;
  flex-shrink: 0;
}

/* ============================================
   CUSTOM MULTIPLIERS
   ============================================ */
.multipliers-body {
  padding: 24px;
}

.multipliers-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

@media (max-width: 700px) {
  .multipliers-grid {
    grid-template-columns: 1fr;
  }
}

.multiplier-card {
  background: #ffffff;
  border: 1px solid #e8ecf4;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.05);
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.multiplier-card:hover {
  box-shadow: 0 4px 18px rgba(37, 99, 235, 0.1);
  border-color: #c7d7f8;
}

.multiplier-card-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.multiplier-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.multiplier-icon--overtime {
  background: #eff6ff;
  color: #2563eb;
}

.multiplier-icon--night {
  background: #f5f3ff;
  color: #7c3aed;
}

.multiplier-icon--regular {
  background: #fff7ed;
  color: #ea580c;
}

.multiplier-icon--special {
  background: #f0fdf4;
  color: #16a34a;
}

.multiplier-icon--regular-ot {
  background: #fef3c7;
  color: #d97706;
}

.multiplier-icon--special-ot {
  background: #fce7f3;
  color: #db2777;
}

.multiplier-icon--undertime {
  background: #f3f4f6;
  color: #4b5563;
}

.multiplier-card-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.3;
}

.multiplier-card-desc {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
  line-height: 1.4;
}

.multiplier-input :deep(.q-field__control) {
  background: #f8faff !important;
  border-radius: 10px !important;
}

.multiplier-input :deep(.q-field__native) {
  font-size: 18px !important;
  font-weight: 700 !important;
  color: #1e293b !important;
}

.multiplier-prefix {
  font-size: 18px;
  font-weight: 700;
  color: #94a3b8;
  margin-right: 4px;
}

/* Custom Multipliers Save Warning Dialog */
.custom-multipliers-save-dialog .q-dialog__title {
  color: #92400e;
  font-weight: 600;
  font-size: 18px;
}

.custom-multipliers-save-dialog .q-dialog__message {
  font-size: 14px;
  line-height: 1.5;
}

.custom-multipliers-save-dialog .q-card {
  max-width: 520px;
  border-radius: 12px;
}

/* ── Table Skeleton Loading ── */
.table-skeleton {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}
.skeleton-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8f9fb;
  border-bottom: 1px solid #e8ecf0;
}
.skeleton-header-cell {
  flex: 1;
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.skeleton-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #f1f3f5;
}
.skeleton-row:last-child {
  border-bottom: none;
}
.skeleton-cell {
  flex: 1;
  display: flex;
  align-items: center;
}
</style>
