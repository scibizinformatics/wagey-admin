<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Sites</h2>
        <p class="table-subtitle">Manage site locations and configurations</p>
      </div>
      <div class="table-actions">
        <q-btn
          color="primary"
          label="Add site"
          icon="add"
          class="add-btn"
          @click="openSiteDialog"
        />
      </div>
    </div>

    <div class="modern-table-container">
      <!-- Built from the live `siteColumns`, so the placeholder shares the
           real table's columns, labels and alignment. -->
      <template v-if="loadingSites">
        <TableSkeleton :columns="siteColumns" :rows="5" />
      </template>
      <template v-else>
        <q-table
          :rows="filteredSites"
          :columns="siteColumns"
          row-key="id"
          flat
          no-data-label="No sites found"
          class="dash-qtable settings-table"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Site Name</q-th>
              <q-th class="table-header-cell">Address</q-th>
              <q-th class="table-header-cell">Ownership</q-th>
              <q-th class="table-header-cell">Requirements</q-th>
              <q-th class="table-header-cell">Status</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell"
                ><span class="item-name">{{ props.row.name }}</span></q-td
              >
              <q-td class="table-body-cell">{{ props.row.location }}</q-td>
              <q-td class="table-body-cell">
                <div
                  :class="[
                    'ownership-badge',
                    props.row.ownership_type === 'owned' ? 'owned-badge' : 'leased-badge',
                  ]"
                >
                  {{ props.row.ownership_type }}
                </div>
              </q-td>
              <!-- The endpoint answers per site, so this column is a batch of
                   one request each; until it lands the cell shimmers rather
                   than claiming the site has nothing set. -->
              <q-td class="table-body-cell">
                <span v-if="loadingRequirements" class="dash-shimmer req-shimmer" />
                <template v-else-if="requirementSummary(props.row)?.hasAny">
                  <button
                    type="button"
                    class="req-cell"
                    @click="openRequirements(props.row)"
                    :aria-label="`Position requirements for ${props.row.name}`"
                  >
                    <span class="req-primary"
                      >{{ requirementSummary(props.row).positions }}
                      {{ requirementSummary(props.row).positions === 1 ? 'position' : 'positions' }}
                    </span>
                    <span class="req-secondary"
                      >{{ requirementSummary(props.row).headcount }} needed</span
                    >
                  </button>
                </template>
                <span v-else class="req-none" aria-label="No position requirements set">—</span>
              </q-td>
              <q-td class="table-body-cell">
                <div
                  :class="[
                    'status-badge',
                    props.row.is_active ? 'status-active' : 'status-inactive',
                  ]"
                >
                  {{ props.row.is_active ? 'Active' : 'Inactive' }}
                </div>
              </q-td>
              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 150px">
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="editSite(props.row)"
                      >
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit site</q-item-section>
                      </q-item>
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="openRequirements(props.row)"
                      >
                        <q-item-section side><q-icon name="groups" size="16px" /></q-item-section>
                        <q-item-section>Position requirements</q-item-section>
                      </q-item>
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item dropdown-item-danger"
                        @click="deleteSite(props.row)"
                      >
                        <q-item-section side
                          ><q-icon name="delete" size="16px" color="negative"
                        /></q-item-section>
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
      <q-card class="dash-modal dash-modal--md">
        <q-card-section class="dash-modal__head">
          <div class="dash-modal__head-main">
            <q-avatar size="38px" class="dash-modal__head-icon"
              ><q-icon name="location_on" size="22px"
            /></q-avatar>
            <div class="dash-modal__head-titles">
              <div class="dash-modal__title">{{ editingSite ? 'Edit site' : 'Add Site' }}</div>
              <div class="dash-modal__sub">Manage site locations and configurations</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
        </q-card-section>

        <q-card-section class="dash-modal__body">
          <div class="form-section-label">Basic Information</div>
          <div class="row q-col-gutter-md q-mb-sm">
            <div class="col-12">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label"
                  >Site Name<span class="dash-modal__req">*</span></span
                >
                <q-input
                  v-model="siteForm.name"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field"
                >
                  <template v-slot:prepend><q-icon name="business" size="18px" /></template>
                </q-input>
              </label>
            </div>
            <div class="col-12">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Brand Name</span>
                <q-input
                  v-model="siteForm.brand_name"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field"
                >
                  <template v-slot:prepend><q-icon name="label" size="18px" /></template>
                </q-input>
              </label>
            </div>
          </div>

          <div class="form-section-label">Location Details</div>
          <div class="row q-col-gutter-md q-mb-sm">
            <div class="col-12">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label"
                  >Location / Address<span class="dash-modal__req">*</span></span
                >
                <q-input
                  v-model="siteForm.location"
                  outlined
                  dense
                  :loading="mapSearchLoading"
                  @update:model-value="onLocationInput"
                  hide-bottom-space
                  class="dash-field"
                >
                  <template v-slot:prepend><q-icon name="map" size="18px" /></template>
                  <template v-slot:hint>Type an address to auto-pin on the map</template>
                </q-input>
              </label>
            </div>
            <input type="hidden" v-model="siteForm.latitude" />
            <input type="hidden" v-model="siteForm.longitude" />
            <div class="col-12" v-show="showSiteMap">
              <div class="map-picker-wrapper">
                <div v-if="siteForm.latitude && siteForm.longitude" class="map-picker-toggle-row">
                  <span class="map-coords-hint"
                    >📍 {{ Number(siteForm.latitude).toFixed(6) }},
                    {{ Number(siteForm.longitude).toFixed(6) }}</span
                  >
                </div>
                <div class="site-map-wrapper">
                  <div ref="siteMapContainer" class="site-map-container" />
                </div>
              </div>
            </div>
            <div class="col-6">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Radius (meters)</span>
                <q-input
                  v-model.number="siteForm.radius_meters"
                  type="number"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field"
                >
                  <template v-slot:prepend
                    ><q-icon name="radio_button_unchecked" size="18px"
                  /></template>
                </q-input>
              </label>
            </div>
            <div class="col-6">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Ownership Type</span>
                <q-select
                  v-model="siteForm.ownership_type"
                  :options="ownershipOptions"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field"
                  popup-content-class="dash-popup dash-popup--modal"
                >
                  <template v-slot:prepend><q-icon name="home_work" size="18px" /></template>
                </q-select>
              </label>
            </div>
          </div>

          <div class="form-section-label">Site Settings</div>
          <div class="toggles-grid q-mb-sm">
            <div class="toggle-item">
              <q-toggle v-model="siteForm.is_active" color="primary" class="brand-toggle" />
              <div class="toggle-label-group">
                <span class="toggle-label">Active</span>
                <span class="toggle-hint">Site is currently operational</span>
              </div>
            </div>
            <div class="toggle-item">
              <q-toggle v-model="siteForm.requires_otp" color="primary" class="brand-toggle" />
              <div class="toggle-label-group">
                <span class="toggle-label">Requires OTP</span>
                <span class="toggle-hint">Enable OTP verification</span>
              </div>
            </div>
            <div class="toggle-item">
              <q-toggle
                v-model="siteForm.allow_manual_attendance"
                color="primary"
                class="brand-toggle"
              />
              <div class="toggle-label-group">
                <span class="toggle-label">Manual Attendance</span>
                <span class="toggle-hint">Allow manual clock-in/out</span>
              </div>
            </div>
            <div class="toggle-item">
              <q-toggle
                v-model="siteForm.allow_service_charge"
                color="primary"
                class="brand-toggle"
              />
              <div class="toggle-label-group">
                <span class="toggle-label">Service Charge</span>
                <span class="toggle-hint">Include service charge</span>
              </div>
            </div>
            <div class="toggle-item">
              <q-toggle
                v-model="siteForm.multiply_nd_by_holiday"
                color="primary"
                class="brand-toggle"
              />
              <div class="toggle-label-group">
                <span class="toggle-label">Multiply ND by Holiday</span>
                <span class="toggle-hint">Apply holiday multiplier</span>
              </div>
            </div>
          </div>

          <div class="form-section-label">Additional</div>
          <div class="row q-mb-md">
            <div class="col-12">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Extended Shift Days</span>
                <q-input
                  v-model="siteForm.extended_shift_days"
                  outlined
                  dense
                  placeholder="e.g. Mon,Tue,Wed"
                  hide-bottom-space
                  class="dash-field"
                >
                  <template v-slot:prepend><q-icon name="date_range" size="18px" /></template>
                  <template v-slot:hint>Comma-separated days for extended shifts</template>
                </q-input>
              </label>
            </div>
          </div>
        </q-card-section>

        <q-card-actions class="dash-modal__foot">
          <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" v-close-popup />
          <q-btn
            :label="editingSite ? 'Update Site' : 'Save Site'"
            no-caps
            class="dash-modal__submit"
            :loading="savingSite"
            @click="saveSite"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <SitePositionRequirementsDialog
      v-model="requirementsDialog"
      :site="requirementsSite"
      :requirements="requirementsForOpenSite"
      :positions="positions"
      :loading="loadingSiteRequirements"
      :loading-positions="loadingPositions"
      :saving="savingRequirement"
      @add="addRequirement"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import SitePositionRequirementsDialog from './SitePositionRequirementsDialog.vue'
import { useAdminSites } from '@/composables/admin/useAdminSites'
import { useAdminSitePositionRequirements } from '@/composables/admin/useAdminSitePositionRequirements'

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
  { name: 'requirements', label: 'Requirements', field: 'requirements', align: 'left' },
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

// ─── Position requirements ─────────────────────────────────────────────────
/*
 * How many of each position a site is meant to have — the targets the manning
 * board is read against. The endpoint is per site, so the table column is a
 * batch of one request each, issued once the sites themselves land and again
 * whenever that list changes (a company switch, an add, a delete).
 */
const {
  positions,
  loadingPositions,
  loadingSummary: loadingRequirements,
  loadingSite: loadingSiteRequirements,
  saving: savingRequirement,
  bySite: requirementsBySite,
  summaryFor,
  fetchAll: fetchAllRequirements,
  fetchForSite: fetchSiteRequirements,
  createRequirement,
} = useAdminSitePositionRequirements()

const requirementsDialog = ref(false)
const requirementsSite = ref(null)

const requirementsForOpenSite = computed(() => {
  const id = requirementsSite.value?.id
  return id == null ? [] : (requirementsBySite.value[id] ?? [])
})

function requirementSummary(site) {
  return summaryFor(site.id)
}

async function openRequirements(site) {
  requirementsSite.value = site
  requirementsDialog.value = true
  // Re-read on open rather than trusting the column's batch: the dialog is the
  // place a stale count is actually acted on.
  await fetchSiteRequirements(site.id)
}

async function addRequirement({ positionId, quantityNeeded }) {
  const site = requirementsSite.value
  if (!site) return
  await createRequirement({ siteId: site.id, positionId, quantityNeeded })
}

watch(
  sites,
  (list) => {
    fetchAllRequirements((list || []).map((site) => site.id))
  },
  { immediate: false },
)

onMounted(fetchSites)
</script>

<style scoped lang="scss">
/* The panel's local block used to redeclare `.item-name`, `.status-badge`,
   `.status-active` / `.status-inactive` and the two ownership badges verbatim
   after this import, which overrode the shared file and meant a badge here
   drifted from the same badge on every other panel. The shared definitions are
   the only ones now. */
@import './AdminSettingsPanelShared.scss';

/* ── Requirements column ─────────────────────────────────────────────────────
   Two readings of one figure — how many positions carry a target, and how many
   people those targets add up to — so the count never has to be guessed at from
   the headcount. The cell is a button because it opens the same dialog the row
   menu does; a number you can already read is the most direct handle for it. */
.req-cell {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 2px 6px;
  margin: -2px -6px;
  background: none;
  border: none;
  border-radius: var(--dash-r-sm);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--dash-fast) var(--dash-ease);
}

.req-cell:hover,
.req-cell:focus-visible {
  background: var(--dash-n-100);
}

.req-primary {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  font-variant-numeric: tabular-nums;
}

/* Separated by a dot rather than a second badge: the ownership and status
   columns already carry pills, and a third one turned the row into a row of
   chips with no hierarchy left. */
.req-secondary {
  font-size: 11.5px;
  color: var(--dash-ink-3);
  font-variant-numeric: tabular-nums;
}

.req-secondary::before {
  content: '·';
  margin-right: 6px;
  color: var(--dash-ink-4);
}

/* No target set is not a target of zero — the em dash says the question was
   never answered for this site. */
.req-none {
  color: var(--dash-ink-4);
}

.req-shimmer {
  display: inline-block;
  width: 76px;
  height: 11px;
  border-radius: var(--dash-r-sm);
  vertical-align: middle;
}
</style>
