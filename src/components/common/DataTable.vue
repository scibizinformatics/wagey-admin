<template>
  <div class="data-table-wrap">
    <div v-if="title || $slots['top-left'] || $slots['top-right'] || searchable || exportable" class="table-toolbar">
      <div class="toolbar-left">
        <span v-if="title" class="table-title">{{ title }}</span>
        <slot name="top-left" />
      </div>
      <div class="toolbar-right">
        <q-input
          v-if="searchable"
          v-model="search"
          dense outlined placeholder="Search..."
          class="table-search"
          clearable
        >
          <template v-slot:prepend>
            <q-icon name="search" size="16px" />
          </template>
        </q-input>
        <q-btn
          v-if="exportable"
          flat dense no-caps icon="file_download" label="Export"
          size="11px" class="export-btn"
          @click="$emit('export')"
        />
        <slot name="top-right" />
      </div>
    </div>
    <q-table
      :rows="rows"
      :columns="columns"
      :row-key="rowKey"
      :filter="search"
      :loading="loading"
      :pagination="pagination"
      :rows-per-page-options="rowsPerPageOptions"
      flat dense
      class="data-table"
      hide-no-data
      :hide-pagination="hidePagination"
      @request="onRequest"
    >
      <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
        <slot :name="name" v-bind="slotData" />
      </template>
      <template v-slot:no-data>
        <div class="empty-state">
          <q-icon name="inbox" size="28px" color="grey-4" />
          <div class="empty-text">No data found</div>
        </div>
      </template>
    </q-table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  searchable: { type: Boolean, default: true },
  exportable: { type: Boolean, default: false },
  title: { type: String, default: '' },
  rowKey: { type: String, default: 'id' },
  rowsPerPageOptions: { type: Array, default: () => [5, 10, 15] },
  hidePagination: { type: Boolean, default: false },
})

const emit = defineEmits(['export', 'update:pagination'])

const search = ref('')

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  sortBy: null,
  descending: false,
  rowsNumber: 0,
})

const rowsNumber = computed(() => props.rows.length)

function onRequest(pp) {
  pagination.value = { ...pagination.value, ...pp.pagination, rowsNumber: rowsNumber.value }
  emit('update:pagination', pagination.value)
}
</script>

<style scoped>
.data-table-wrap {
  display: flex;
  flex-direction: column;
}
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid #f1f3f5;
}
.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.table-title {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}
.table-search {
  min-width: 180px;
}
.table-search :deep(.q-field__control) {
  border-radius: 8px;
  min-height: 32px;
}
.table-search :deep(.q-field__native) {
  font-size: 12px;
}
.export-btn {
  color: #6b7280;
}
.data-table :deep(.q-table thead th) {
  font-size: 10.5px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 8px 8px;
  background: #f8f9fb;
  border-bottom: 1px solid #e8ecf0;
}
.data-table :deep(.q-table tbody td) {
  padding: 8px 8px;
  font-size: 12.5px;
  color: #374151;
  border-bottom: 1px solid #f1f3f5;
}
.data-table :deep(.q-table tbody tr:last-child td) {
  border-bottom: none;
}
.data-table :deep(.q-table tbody tr:hover td) {
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
</style>
