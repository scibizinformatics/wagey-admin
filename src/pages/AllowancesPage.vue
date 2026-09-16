<template>
  <PageShell>
    <div class="all-page">
      <!-- ── Page header: identity and the one primary action ────────────── -->
      <header class="all-head">
        <div class="all-head__titles">
          <h1 class="all-head__title">Allowances</h1>
          <p class="all-head__sub">{{ headSummary }}</p>
        </div>
        <q-btn
          unelevated
          no-caps
          icon="add"
          label="Add allowance"
          class="btn-primary"
          @click="openAdd"
        />
      </header>

      <!-- ── List card ──────────────────────────────────────────────────── -->
      <section class="dash-panel all-list">
        <div class="all-toolbar">
          <q-input
            ref="searchRef"
            v-model="search"
            placeholder="Search allowance type"
            dense
            outlined
            clearable
            class="all-search dash-field"
            @focus="searchFocused = true"
            @blur="searchFocused = false"
          >
            <template v-slot:prepend>
              <q-icon name="search" size="18px" />
            </template>
            <!-- Press / to jump here. Hidden once the field has focus or text,
                 so the hint never sits on top of what you are typing. -->
            <template v-slot:append>
              <kbd v-if="showSearchHint" class="all-kbd">/</kbd>
            </template>
          </q-input>

          <span class="all-toolbar__count">
            {{ filteredAllowances.length }}
            {{ filteredAllowances.length === 1 ? 'allowance type' : 'allowance types' }}
          </span>
        </div>

        <!-- What is currently narrowing the list, and how to undo it. -->
        <div v-if="search" class="all-applied">
          <span class="all-applied__label">Filtered by</span>
          <button type="button" class="all-applied__chip" @click="search = ''">
            <span class="all-applied__chip-text">“{{ search }}”</span>
            <q-icon name="close" size="13px" />
          </button>
        </div>

        <!-- Cards below 1024px, table above. -->
        <AllowanceCardList
          v-if="$q.screen.lt.md"
          :allowances="filteredAllowances"
          :loading="loading"
          :is-filtered="search.length > 0"
          @edit="openEdit"
          @clear-filters="search = ''"
        />
        <AllowanceTable
          v-else
          :allowances="filteredAllowances"
          :loading="loading"
          :is-filtered="search.length > 0"
          @edit="openEdit"
          @clear-filters="search = ''"
        />
      </section>
    </div>

    <!-- Add / edit share one dialog; the row being edited decides its mode. -->
    <AllowanceFormDialog
      v-model="showDialog"
      :allowance="editingAllowance"
      :saving="saving"
      @submit="handleSubmit"
      @cancel="showDialog = false"
    />
  </PageShell>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import PageShell from '@/components/layout/PageShell.vue'
import { useCompany } from '@/composables/page/useCompany'
import { useAllowances } from '@/composables/page/useAllowances'

import AllowanceTable from '@/components/pages/Allowances/AllowanceTable.vue'
import AllowanceCardList from '@/components/pages/Allowances/AllowanceCardList.vue'
import AllowanceFormDialog from '@/components/pages/Allowances/AllowanceFormDialog.vue'

const $q = useQuasar()
const { companyId } = useCompany()
const {
  allowanceTypes,
  loading,
  saving,
  fetchAllowanceTypes,
  createAllowanceType,
  updateAllowanceType,
} = useAllowances()

const search = ref('')
const searchRef = ref(null)
const searchFocused = ref(false)
const showDialog = ref(false)
const editingAllowance = ref(null)

const filteredAllowances = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return allowanceTypes.value
  return allowanceTypes.value.filter((row) =>
    String(row.name ?? '').toLowerCase().includes(q),
  )
})

const taxableCount = computed(
  () => allowanceTypes.value.filter((row) => row.is_taxable).length,
)

const headSummary = computed(() => {
  if (loading.value && !allowanceTypes.value.length) return 'Loading allowance types…'
  const total = allowanceTypes.value.length
  if (!total) return 'No allowance types on record yet'
  return `${total} on record · ${taxableCount.value} taxable`
})

const showSearchHint = computed(() => !searchFocused.value && !search.value.trim())

function openAdd() {
  if (!companyId.value) return
  editingAllowance.value = null
  showDialog.value = true
}

function openEdit(allowance) {
  editingAllowance.value = allowance
  showDialog.value = true
}

async function handleSubmit(payload) {
  const target = editingAllowance.value
  const ok = target
    ? await updateAllowanceType(target.id, payload)
    : await createAllowanceType(payload)
  if (ok) showDialog.value = false
}

// "/" focuses search, matching the other list pages.
function onGlobalKey(e) {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
  const tag = e.target?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
  e.preventDefault()
  searchRef.value?.focus()
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKey)
  fetchAllowanceTypes()
})

onUnmounted(() => window.removeEventListener('keydown', onGlobalKey))
</script>

<style scoped>
.all-page {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

/* ── Page header ── */
.all-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.all-head__titles {
  min-width: 0;
}

.all-head__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--dash-ink);
  line-height: 1.2;
}

@media (max-width: 1023px) {
  .all-head__title {
    font-size: 20px;
  }
}

.all-head__sub {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

.btn-primary {
  height: 38px;
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

/* ── List card ── */
.all-list {
  overflow: hidden;
}

.all-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--dash-line);
}

.all-search {
  width: 280px;
}
.all-search :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.all-search :deep(.q-field__native) {
  font-size: 13px;
  color: var(--dash-ink);
}
.all-search :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

.all-kbd {
  font-family: inherit;
  font-size: 11px;
  line-height: 1;
  padding: 3px 6px;
  border-radius: var(--dash-r-sm);
  border: 1px solid var(--dash-line);
  background: var(--dash-n-25);
  color: var(--dash-ink-4);
}

.all-toolbar__count {
  margin-left: auto;
  font-size: 12px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}

/* ── Applied filter chip ── */
.all-applied {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  padding: 8px 16px;
  border-bottom: 1px solid var(--dash-line-soft);
  background: var(--dash-n-25);
}

.all-applied__label {
  font-size: 11.5px;
  color: var(--dash-ink-4);
}

.all-applied__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-pill);
  background: var(--dash-surface);
  color: var(--dash-ink-2);
  font-size: 12px;
  cursor: pointer;
}
.all-applied__chip:hover {
  border-color: var(--dash-line-strong);
  color: var(--dash-ink);
}

.all-applied__chip-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

@media (max-width: 1023px) {
  .all-toolbar {
    padding: 10px 14px;
  }
  .all-search {
    flex: 1;
    width: auto;
  }
}

@media (max-width: 768px) {
  .all-head {
    align-items: stretch;
  }
  .all-head .btn-primary {
    width: 100%;
  }
}
</style>