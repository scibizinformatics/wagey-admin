<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Companies</h2>
        <p class="table-subtitle">Manage company information and branding</p>
      </div>
      <div class="table-actions">
        <q-btn color="primary" label="Add Company" icon="add" class="add-btn" @click="openCompanyDialog" />
      </div>
    </div>

    <div class="modern-table-container">
      <template v-if="loadingCompanies">
        <div class="table-skeleton">
          <div class="skeleton-header">
            <div class="skeleton-header-cell" style="flex: 0 0 48px">Logo</div>
            <div class="skeleton-header-cell">Company Name</div>
            <div class="skeleton-header-cell" style="flex: 0 0 60px">Actions</div>
          </div>
          <div class="skeleton-row" v-for="n in 4" :key="n">
            <div class="skeleton-cell" style="flex: 0 0 48px"><q-skeleton type="circle" size="36px" /></div>
            <div class="skeleton-cell"><q-skeleton type="text" /></div>
            <div class="skeleton-cell" style="flex: 0 0 60px"><q-skeleton type="text" width="40px" /></div>
          </div>
        </div>
      </template>
      <template v-else>
        <q-table :rows="filteredCompanies" :columns="companyColumns" row-key="id" flat no-data-label="No companies found" class="settings-table" hide-pagination :rows-per-page-options="[0]">
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Logo</q-th>
              <q-th class="table-header-cell">Company Name</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell">
                <q-avatar size="36px" v-if="props.row.logo"><img :src="props.row.logo" /></q-avatar>
                <q-avatar v-else size="36px" color="primary" text-color="white"><q-icon name="business" /></q-avatar>
              </q-td>
              <q-td class="table-body-cell"><span class="item-name">{{ props.row.name }}</span></q-td>
              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 150px">
                      <q-item clickable v-close-popup class="dropdown-item" @click="viewCompany(props.row)">
                        <q-item-section side><q-icon name="visibility" size="16px" /></q-item-section>
                        <q-item-section>View Details</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup class="dropdown-item" @click="editCompany(props.row)">
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit Company</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup class="dropdown-item dropdown-item-danger" @click="deleteCompany(props.row)">
                        <q-item-section side><q-icon name="delete" size="16px" color="negative" /></q-item-section>
                        <q-item-section>Delete</q-item-section>
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

    <q-dialog v-model="companyDialog" persistent>
      <q-card class="admin-modal-card">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add"><q-icon name="business" size="22px" /></q-avatar>
            <div>
              <div class="admin-modal-title">{{ editingCompany ? 'Edit Company' : 'Add Company' }}</div>
              <div class="admin-modal-subtitle">Manage company information and branding</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>

        <q-card-section class="admin-modal-content q-gutter-md">
          <q-input v-model="companyForm.name" label="Company Name *" outlined dense />

          <div>
            <div class="text-subtitle2 q-mb-sm">Logo</div>

            <q-btn-toggle v-model="logoUploadMethod" spread no-caps dense unelevated toggle-color="primary" color="grey-3" text-color="grey-8" toggle-text-color="white" :options="[
              { label: 'Upload File', value: 'file' },
              { label: 'Paste URL', value: 'url' },
            ]" class="q-mb-md" />

            <div v-if="logoUploadMethod === 'file'">
              <q-file v-model="logoFile" label="Choose logo image" outlined dense accept=".jpg,.jpeg,.png,.svg,.webp" max-file-size="2097152" @update:model-value="onLogoFileSelected" @rejected="onFileRejected">
                <template v-slot:prepend><q-icon name="attach_file" /></template>
                <template v-slot:append v-if="logoFile"><q-icon name="close" class="cursor-pointer" @click.stop="clearLogoFile" /></template>
              </q-file>
              <div class="text-caption text-grey q-mt-xs">Max 2MB · JPG, PNG, SVG, WEBP</div>
            </div>

            <div v-if="logoUploadMethod === 'url'">
              <q-input v-model="companyForm.logo" label="Logo URL" outlined dense placeholder="https://example.com/logo.png" @update:model-value="logoPreview = companyForm.logo || null">
                <template v-slot:prepend><q-icon name="link" /></template>
                <template v-slot:append v-if="companyForm.logo"><q-icon name="close" class="cursor-pointer" @click="clearLogoUrl" /></template>
              </q-input>
            </div>

            <div v-if="logoPreview" class="q-mt-md flex items-center q-gutter-sm">
              <div class="text-caption text-grey">Preview:</div>
              <q-avatar size="56px" square style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden">
                <img :src="logoPreview" @error="handleImageError" style="object-fit: contain" />
              </q-avatar>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn color="primary" :label="editingCompany ? 'Update Company' : 'Save Company'" :loading="savingCompany" @click="saveCompany" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAdminCompanies } from '@/composables/admin/useAdminCompanies'

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

const {
  companies,
  loading: loadingCompanies,
  saving: savingCompany,
  dialog: companyDialog,
  editing: editingCompany,
  form: companyForm,
  logoUploadMethod,
  logoFile,
  logoPreview,
  fetchCompanies,
  openDialog: openCompanyDialog,
  openEditDialog: editCompany,
  onLogoFileSelected,
  clearLogoFile,
  clearLogoUrl,
  onFileRejected,
  handleImageError,
  saveCompany,
  deleteCompany,
} = useAdminCompanies()

const viewCompany = (r) => editCompany(r)

const companyColumns = [
  { name: 'name', label: 'Company Name', field: 'name', align: 'left', sortable: true },
  { name: 'logo', label: 'Logo', field: 'logo', align: 'center' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const filteredCompanies = computed(() => {
  if (!props.searchQuery) return companies.value
  const q = props.searchQuery.toLowerCase()
  return companies.value.filter(
    (c) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.contact || '').toLowerCase().includes(q),
  )
})

onMounted(fetchCompanies)
</script>

<style scoped>
@import './AdminSettingsPanelShared.css';
</style>
