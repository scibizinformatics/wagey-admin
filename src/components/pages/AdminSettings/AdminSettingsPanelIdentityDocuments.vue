<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Identity documents</h2>
        <p class="table-subtitle">
          The kinds of ID an employee can file — the documents themselves live on each employee
        </p>
      </div>
      <div class="table-actions">
        <q-btn
          color="primary"
          label="Add document type"
          icon="add"
          class="add-btn"
          @click="openDialog"
        />
      </div>
    </div>

    <div class="modern-table-container">
      <template v-if="loading">
        <TableSkeleton :columns="columns" />
      </template>
      <template v-else-if="!filteredTypes.length">
        <div class="dash-empty">
          <span class="dash-featured-icon">
            <q-icon name="o_contact_page" size="20px" />
          </span>
          <p class="dash-empty__title">
            {{ searchQuery ? 'No document types match' : 'No document types yet' }}
          </p>
          <p class="dash-empty__sub">
            {{
              searchQuery
                ? `Nothing here is called “${searchQuery}”.`
                : 'Add the IDs this company expects from employees, such as a passport or TIN.'
            }}
          </p>
        </div>
      </template>
      <template v-else>
        <q-table
          :rows="filteredTypes"
          :columns="columns"
          row-key="id"
          flat
          no-data-label="No document types found"
          class="dash-qtable settings-table"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Name</q-th>
              <q-th class="table-header-cell">Code</q-th>
              <q-th class="table-header-cell">Expiry</q-th>
              <q-th class="table-header-cell">Required</q-th>
              <q-th class="table-header-cell">Status</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell">
                <span class="item-name">{{ props.row.name }}</span>
              </q-td>
              <q-td class="table-body-cell">
                <span class="doc-code">{{ props.row.code || '—' }}</span>
              </q-td>
              <q-td class="table-body-cell">
                {{ props.row.requiresExpiry ? 'Expiry required' : 'No expiry' }}
              </q-td>
              <q-td class="table-body-cell">
                {{ props.row.isRequired ? 'Required' : 'Optional' }}
              </q-td>
              <q-td class="table-body-cell">
                <div
                  :class="[
                    'status-badge',
                    props.row.isActive ? 'status-active' : 'status-inactive',
                  ]"
                >
                  {{ props.row.isActive ? 'Active' : 'Inactive' }}
                </div>
              </q-td>
              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 170px">
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="openEditDialog(props.row)"
                      >
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit document type</q-item-section>
                      </q-item>
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        :disable="savingId === props.row.id"
                        @click="setDocumentTypeActive(props.row, !props.row.isActive)"
                      >
                        <q-item-section side>
                          <q-icon
                            :name="props.row.isActive ? 'o_block' : 'o_check_circle'"
                            size="16px"
                          />
                        </q-item-section>
                        <q-item-section>
                          {{ props.row.isActive ? 'Deactivate' : 'Activate' }}
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </q-td>
            </q-tr>
          </template>
        </q-table>
      </template>
    </div>

    <!-- Create / edit. `is_active` is on the form because a type is retired
         rather than deleted — the API documents no delete route. -->
    <q-dialog v-model="dialog" persistent>
      <q-card class="dash-modal dash-modal--md">
        <q-card-section class="dash-modal__head">
          <div class="dash-modal__head-main">
            <q-avatar size="38px" class="dash-modal__head-icon">
              <q-icon name="o_contact_page" size="22px" />
            </q-avatar>
            <div class="dash-modal__head-titles">
              <div class="dash-modal__title">
                {{ editing ? 'Edit document type' : 'Add document type' }}
              </div>
              <div class="dash-modal__sub">
                Applies to every employee's document list in this company
              </div>
            </div>
          </div>
          <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
        </q-card-section>

        <q-card-section class="dash-modal__body">
          <div class="dash-modal__grid">
            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Name<span class="dash-modal__req">*</span></span
              >
              <q-input
                v-model="form.name"
                outlined
                dense
                hide-bottom-space
                placeholder="Philippine Passport"
                class="dash-field"
              />
            </label>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Code<span class="dash-modal__req">*</span></span
              >
              <q-input
                v-model="form.code"
                outlined
                dense
                hide-bottom-space
                placeholder="PASSPORT"
                maxlength="32"
                class="dash-field"
              />
              <span class="doc-hint">
                Saved uppercase. A document keeps its type by this code.
              </span>
            </label>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Sort order</span>
              <q-input
                v-model.number="form.sortOrder"
                type="number"
                outlined
                dense
                hide-bottom-space
                class="dash-field"
              />
            </label>
          </div>

          <div class="doc-toggles">
            <q-toggle
              v-model="form.isRequired"
              label="Required for every employee"
              color="primary"
              class="brand-toggle"
            />
            <q-toggle
              v-model="form.requiresExpiry"
              label="Needs an expiry date"
              color="primary"
              class="brand-toggle"
            />
            <q-toggle v-model="form.isActive" label="Active" color="primary" class="brand-toggle" />
          </div>
        </q-card-section>

        <q-card-actions class="dash-modal__foot">
          <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" v-close-popup />
          <q-btn
            :label="editing ? 'Update' : 'Save'"
            no-caps
            class="dash-modal__submit"
            :loading="saving"
            @click="saveDocumentType"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import { useAdminIdentityDocumentTypes } from '@/composables/admin/useAdminIdentityDocumentTypes'

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

const {
  documentTypes,
  loading,
  saving,
  savingId,
  dialog,
  editing,
  form,
  fetchDocumentTypes,
  openDialog,
  openEditDialog,
  saveDocumentType,
  setDocumentTypeActive,
} = useAdminIdentityDocumentTypes()

// Passed to TableSkeleton as well as the live table, so the placeholder and the
// loaded grid share their column edges and labels.
const columns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left' },
  { name: 'code', label: 'Code', field: 'code', align: 'left' },
  { name: 'expiry', label: 'Expiry', field: 'requiresExpiry', align: 'left' },
  { name: 'required', label: 'Required', field: 'isRequired', align: 'left' },
  { name: 'is_active', label: 'Status', field: 'isActive', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'center' },
]

const filteredTypes = computed(() => {
  const term = props.searchQuery.trim().toLowerCase()
  if (!term) return documentTypes.value
  return documentTypes.value.filter(
    (type) => type.name.toLowerCase().includes(term) || type.code.toLowerCase().includes(term),
  )
})

onMounted(fetchDocumentTypes)
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

.doc-code {
  font-family: var(--dash-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--dash-ink-2);
}

.doc-hint {
  display: block;
  margin-top: 4px;
  font-size: 11.5px;
  line-height: 1.4;
  color: var(--dash-ink-4);
}

.doc-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 22px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--dash-line-soft);
}
</style>
