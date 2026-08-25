<template>
  <div class="data-table-wrap">
    <div
      v-if="title || $slots['top-left'] || $slots['top-right'] || searchable || exportable"
      class="table-toolbar"
    >
      <div class="toolbar-left">
        <span v-if="title" class="table-title">{{ title }}</span>
        <slot name="top-left" />
      </div>
      <div class="toolbar-right">
        <q-input
          v-if="searchable"
          v-model="search"
          dense
          outlined
          placeholder="Search..."
          class="table-search"
          clearable
        >
          <template v-slot:prepend>
            <q-icon name="search" size="16px" />
          </template>
        </q-input>
        <q-btn
          v-if="exportable"
          flat
          dense
          no-caps
          icon="file_download"
          label="Export"
          size="11px"
          class="export-btn"
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
      flat
      dense
      class="dash-qtable dash-qtable--flush data-table"
      hide-no-data
      :hide-pagination="hidePagination"
      @request="onRequest"
    >
      <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
        <slot :name="name" v-bind="slotData" />
      </template>
      <template v-slot:no-data>
        <div class="dash-empty">
          <span class="dash-featured-icon">
            <q-icon name="o_inbox" size="20px" />
          </span>
          <p class="dash-empty__title">Nothing to show</p>
          <p class="dash-empty__sub">There are no rows for the current filter.</p>
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
  min-height: 56px;
  padding: 10px 14px;
  background: var(--dash-n-25);
  border-bottom: 1px solid var(--dash-line);
}
.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.table-title {
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.008em;
  color: var(--dash-ink);
}
.table-search {
  min-width: 180px;
  max-width: 300px;
}
.table-search :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.table-search :deep(.q-field__native) {
  font-size: 13px;
  color: var(--dash-ink);
}
.table-search :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}
.export-btn {
  color: var(--dash-ink-3);
  border-radius: var(--dash-r-sm);
}
.export-btn:hover {
  background: var(--dash-n-100);
  color: var(--dash-ink);
}
.data-table :deep(.q-table tbody tr:hover td) {
  background: var(--dash-n-50);
}
</style>
