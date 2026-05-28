<template>
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

    <div v-if="loading" class="funding-empty-state">
      <q-spinner color="primary" size="24px" />
      <span class="funding-empty-text">Loading history...</span>
    </div>

    <div v-else-if="entries.length === 0" class="funding-empty-state">
      <q-icon name="receipt_long" size="36px" color="grey-4" />
      <span class="funding-empty-text">No funding entries found</span>
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
          <tr v-for="entry in entries" :key="entry.id">
            <td>
              <div class="fh-log-name">{{ entry.logName }}</div>
              <div class="fh-log-period">{{ entry.period }}</div>
            </td>
            <td><span class="fh-source-badge">{{ entry.source }}</span></td>
            <td class="fh-amount" style="text-align: right">{{ formatCurrency(entry.amount) }}</td>
            <td class="fh-actions" style="text-align: right">
              <q-btn flat dense no-caps size="sm" label="View" color="primary" @click="$emit('view-entry', entry)" />
              <span class="fh-sep">|</span>
              <q-btn flat dense no-caps size="sm" label="Edit" color="grey-7" @click="$emit('edit-entry', entry)" />
            </td>
          </tr>
        </tbody>
      </table>

      <div class="funding-history-footer">
        <q-btn flat no-caps size="sm" label="View all funding logs" color="primary" icon="open_in_new" />
        <span class="fh-page-info">Page 1 of {{ totalPages }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  entries: { type: Array, default: () => [] },
  totalPages: { type: Number, default: 1 },
})

defineEmits(['view-entry', 'edit-entry'])

const formatCurrency = (val) => {
  const n = Number(val ?? 0)
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
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

.funding-form-header-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.funding-history-icon {
  background: #f5f3ff;
  color: #7c3aed;
}

.funding-history-title {
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
</style>
