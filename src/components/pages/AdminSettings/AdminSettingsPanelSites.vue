<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Sites</h2>
        <p class="table-subtitle">Manage site locations and configurations</p>
      </div>
      <div class="table-actions">
        <q-btn color="primary" label="Add Site" icon="add" class="add-btn" @click="openSiteDialog" />
      </div>
    </div>

    <div class="modern-table-container">
      <template v-if="loadingSites">
        <div class="table-skeleton">
          <div class="skeleton-header">
            <div class="skeleton-header-cell">Site Name</div>
            <div class="skeleton-header-cell">Address</div>
            <div class="skeleton-header-cell">Ownership</div>
            <div class="skeleton-header-cell">Status</div>
            <div class="skeleton-header-cell" style="flex: 0 0 60px">Actions</div>
          </div>
          <div class="skeleton-row" v-for="n in 4" :key="n">
            <div class="skeleton-cell"><q-skeleton type="text" /></div>
            <div class="skeleton-cell"><q-skeleton type="text" /></div>
            <div class="skeleton-cell"><q-skeleton type="text" width="80px" /></div>
            <div class="skeleton-cell"><q-skeleton type="text" width="60px" /></div>
            <div class="skeleton-cell" style="flex: 0 0 60px"><q-skeleton type="text" width="40px" /></div>
          </div>
        </div>
      </template>
      <template v-else>
        <q-table :rows="filteredSites" :columns="siteColumns" row-key="id" flat no-data-label="No sites found" class="settings-table" hide-pagination :rows-per-page-options="[0]">
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Site Name</q-th>
              <q-th class="table-header-cell">Address</q-th>
              <q-th class="table-header-cell">Ownership</q-th>
              <q-th class="table-header-cell">Status</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell"><span class="item-name">{{ props.row.name }}</span></q-td>
              <q-td class="table-body-cell">{{ props.row.location }}</q-td>
              <q-td class="table-body-cell">
                <div :class="['ownership-badge', props.row.ownership_type === 'owned' ? 'owned-badge' : 'leased-badge']">{{ props.row.ownership_type }}</div>
              </q-td>
              <q-td class="table-body-cell">
                <div :class="['status-badge', props.row.is_active ? 'status-active' : 'status-inactive']">{{ props.row.is_active ? 'Active' : 'Inactive' }}</div>
              </q-td>
              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 150px">
                      <q-item clickable v-close-popup class="dropdown-item" @click="editSite(props.row)">
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit Site</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup class="dropdown-item dropdown-item-danger" @click="deleteSite(props.row)">
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

    <q-dialog v-model="siteDialog" persistent @before-show="onDialogOpen">
      <q-card class="admin-modal-card" style="max-width: 620px; width: 620px">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add"><q-icon name="location_on" size="22px" /></q-avatar>
            <div>
              <div class="admin-modal-title">{{ editingSite ? 'Edit Site' : 'Add Site' }}</div>
              <div class="admin-modal-subtitle">Manage site locations and configurations</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>

        <q-card-section class="admin-modal-content">
          <div class="form-section-label">Basic Information</div>
          <div class="row q-col-gutter-md q-mb-sm">
            <div class="col-12">
              <q-input v-model="siteForm.name" label="Site Name *" outlined dense>
                <template v-slot:prepend><q-icon name="business" size="18px" /></template>
              </q-input>
            </div>
            <div class="col-12">
              <q-input v-model="siteForm.brand_name" label="Brand Name" outlined dense>
                <template v-slot:prepend><q-icon name="label" size="18px" /></template>
              </q-input>
            </div>
          </div>

          <div class="form-section-label">Location Details</div>
          <div class="row q-col-gutter-md q-mb-sm">
            <div class="col-12">
              <q-input v-model="siteForm.location" label="Location / Address *" outlined dense :loading="mapSearchLoading" @update:model-value="onLocationInput">
                <template v-slot:prepend><q-icon name="map" size="18px" /></template>
                <template v-slot:hint>Type an address to auto-pin on the map</template>
              </q-input>
            </div>
            <input type="hidden" v-model="siteForm.latitude" />
            <input type="hidden" v-model="siteForm.longitude" />
            <div class="col-12" v-show="showSiteMap">
              <div class="map-picker-wrapper">
                <div v-if="siteForm.latitude && siteForm.longitude" class="map-picker-toggle-row">
                  <span class="map-coords-hint">📍 {{ Number(siteForm.latitude).toFixed(6) }}, {{ Number(siteForm.longitude).toFixed(6) }}</span>
                </div>
                <div class="site-map-wrapper">
                  <div ref="siteMapContainer" class="site-map-container" />
                </div>
              </div>
            </div>
            <div class="col-6">
              <q-input v-model.number="siteForm.radius_meters" label="Radius (meters)" type="number" outlined dense>
                <template v-slot:prepend><q-icon name="radio_button_unchecked" size="18px" /></template>
              </q-input>
            </div>
            <div class="col-6">
              <q-select v-model="siteForm.ownership_type" :options="ownershipOptions" label="Ownership Type" outlined dense>
                <template v-slot:prepend><q-icon name="home_work" size="18px" /></template>
              </q-select>
            </div>
          </div>

          <div class="form-section-label">Site Settings</div>
          <div class="toggles-grid q-mb-sm">
            <div class="toggle-item">
              <q-toggle v-model="siteForm.is_active" color="primary" />
              <div class="toggle-label-group">
                <span class="toggle-label">Active</span>
                <span class="toggle-hint">Site is currently operational</span>
              </div>
            </div>
            <div class="toggle-item">
              <q-toggle v-model="siteForm.requires_otp" color="primary" />
              <div class="toggle-label-group">
                <span class="toggle-label">Requires OTP</span>
                <span class="toggle-hint">Enable OTP verification</span>
              </div>
            </div>
            <div class="toggle-item">
              <q-toggle v-model="siteForm.allow_manual_attendance" color="primary" />
              <div class="toggle-label-group">
                <span class="toggle-label">Manual Attendance</span>
                <span class="toggle-hint">Allow manual clock-in/out</span>
              </div>
            </div>
            <div class="toggle-item">
              <q-toggle v-model="siteForm.allow_service_charge" color="primary" />
              <div class="toggle-label-group">
                <span class="toggle-label">Service Charge</span>
                <span class="toggle-hint">Include service charge</span>
              </div>
            </div>
            <div class="toggle-item">
              <q-toggle v-model="siteForm.multiply_nd_by_holiday" color="primary" />
              <div class="toggle-label-group">
                <span class="toggle-label">Multiply ND by Holiday</span>
                <span class="toggle-hint">Apply holiday multiplier</span>
              </div>
            </div>
          </div>

          <div class="form-section-label">Additional</div>
          <div class="row q-mb-md">
            <div class="col-12">
              <q-input v-model="siteForm.extended_shift_days" label="Extended Shift Days" outlined dense placeholder="e.g. Mon,Tue,Wed">
                <template v-slot:prepend><q-icon name="date_range" size="18px" /></template>
                <template v-slot:hint>Comma-separated days for extended shifts</template>
              </q-input>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn color="primary" :label="editingSite ? 'Update Site' : 'Save Site'" :loading="savingSite" @click="saveSite" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useAdminSites } from '@/composables/admin/useAdminSites'

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

const {
  sites,
  loading: loadingSites,
  saving: savingSite,
  dialog: siteDialog,
  editing: editingSite,
  form: siteForm,
  fetchSites,
  openDialog: openSiteDialog,
  openEditDialog: editSite,
  saveSite,
  deleteSite,
} = useAdminSites()

const ownershipOptions = ['owned', 'leased', 'partnership']

const siteColumns = ref([
  { name: 'name', label: 'Site Name', field: 'name', align: 'left', sortable: true },
  { name: 'location', label: 'Location', field: 'location', align: 'left' },
  { name: 'ownership_type', label: 'Ownership', field: 'ownership_type', align: 'left' },
  { name: 'is_active', label: 'Status', field: 'is_active', align: 'center' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
])

const filteredSites = computed(() => {
  if (!props.searchQuery) return sites.value
  const q = props.searchQuery.toLowerCase()
  return sites.value.filter(
    (s) =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.address || '').toLowerCase().includes(q) ||
      (s.ownership_type || '').toLowerCase().includes(q),
  )
})

// ─── Leaflet Map Picker ────────────────────────────────────────────
const showSiteMap = ref(false)
const siteMapContainer = ref(null)
let leafletMap = null
let leafletMarker = null
let leafletLoaded = false

const mapSearchLoading = ref(false)
let locationDebounceTimer = null

async function loadLeaflet() {
  if (leafletLoaded) return
  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link')
    link.id = 'leaflet-css'
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
  }
  if (!window.L) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }
  leafletLoaded = true
}

async function initSiteMap() {
  await loadLeaflet()
  await nextTick()
  if (!siteMapContainer.value) return
  if (leafletMap) {
    leafletMap.remove()
    leafletMap = null
    leafletMarker = null
  }
  const lat = parseFloat(siteForm.value?.latitude) || 14.5995
  const lng = parseFloat(siteForm.value?.longitude) || 120.9842
  leafletMap = window.L.map(siteMapContainer.value).setView([lat, lng], 13)
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(leafletMap)
  if (siteForm.value?.latitude && siteForm.value?.longitude) {
    leafletMarker = window.L.marker([lat, lng], { draggable: true }).addTo(leafletMap)
    leafletMarker.bindPopup('📍 Site Location').openPopup()
    leafletMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng()
      siteForm.value.latitude = pos.lat.toFixed(7)
      siteForm.value.longitude = pos.lng.toFixed(7)
    })
  }
  leafletMap.on('click', (e) => {
    const { lat: clickLat, lng: clickLng } = e.latlng
    siteForm.value.latitude = clickLat.toFixed(7)
    siteForm.value.longitude = clickLng.toFixed(7)
    if (leafletMarker) {
      leafletMarker.setLatLng([clickLat, clickLng])
    } else {
      leafletMarker = window.L.marker([clickLat, clickLng], { draggable: true }).addTo(leafletMap)
      leafletMarker.bindPopup('📍 Site Location').openPopup()
      leafletMarker.on('dragend', (ev) => {
        const pos = ev.target.getLatLng()
        siteForm.value.latitude = pos.lat.toFixed(7)
        siteForm.value.longitude = pos.lng.toFixed(7)
      })
    }
    leafletMarker.bindPopup(`📍 ${clickLat.toFixed(5)}, ${clickLng.toFixed(5)}`).openPopup()
  })
  setTimeout(() => leafletMap && leafletMap.invalidateSize(), 300)
}

function onLocationInput(value) {
  clearTimeout(locationDebounceTimer)
  if (!value || value.trim().length < 3) return
  locationDebounceTimer = setTimeout(async () => {
    mapSearchLoading.value = true
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } },
      )
      const data = await res.json()
      if (!data.length) return
      const result = data[0]
      const lat = parseFloat(result.lat)
      const lng = parseFloat(result.lon)
      siteForm.value.latitude = lat.toFixed(7)
      siteForm.value.longitude = lng.toFixed(7)
      if (!showSiteMap.value) {
        showSiteMap.value = true
        await initSiteMap()
      }
      if (leafletMap) {
        leafletMap.setView([lat, lng], 16)
        if (leafletMarker) {
          leafletMarker.setLatLng([lat, lng])
        } else {
          leafletMarker = window.L.marker([lat, lng], { draggable: true }).addTo(leafletMap)
          leafletMarker.on('dragend', (e) => {
            const pos = e.target.getLatLng()
            siteForm.value.latitude = pos.lat.toFixed(7)
            siteForm.value.longitude = pos.lng.toFixed(7)
          })
        }
        leafletMarker.bindPopup(`📍 ${result.display_name}`).openPopup()
      }
    } catch (e) {
      console.error('Geocode error:', e)
    } finally {
      mapSearchLoading.value = false
    }
  }, 600)
}

function onDialogOpen() {
  showSiteMap.value = false
}

// Reset map state when dialog closes
watch(siteDialog, (val) => {
  if (!val) {
    showSiteMap.value = false
    clearTimeout(locationDebounceTimer)
    mapSearchLoading.value = false
    if (leafletMap) {
      leafletMap.remove()
      leafletMap = null
      leafletMarker = null
    }
  }
})

onMounted(fetchSites)
</script>
