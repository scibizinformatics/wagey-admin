<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="groups" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Position requirements</div>
            <div class="dash-modal__sub">{{ site?.name || 'Site' }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <!-- ── Add ─────────────────────────────────────────────────────────── -->
        <div class="form-section-label">Add a requirement</div>
        <div class="spr-add-row">
          <label class="dash-modal__field">
            <span class="dash-modal__field-label"
              >Position<span class="dash-modal__req">*</span></span
            >
            <q-select
              v-model="positionId"
              :options="positionOptions"
              option-value="value"
              option-label="label"
              emit-value
              map-options
              outlined
              dense
              options-dense
              :loading="loadingPositions"
              @keyup.enter="submit"
              hide-bottom-space
              class="dash-field"
              popup-content-class="dash-popup dash-popup--modal"
            >
              <template v-slot:prepend><q-icon name="badge" size="18px" /></template>
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey-7"
                    >No positions in this company yet</q-item-section
                  >
                </q-item>
              </template>
            </q-select>
          </label>
          <label class="dash-modal__field">
            <span class="dash-modal__field-label"
              >Headcount<span class="dash-modal__req">*</span></span
            >
            <q-input
              v-model.number="quantityNeeded"
              type="number"
              min="1"
              step="1"
              outlined
              dense
              @keyup.enter="submit"
              hide-bottom-space
              class="dash-field"
            >
              <template v-slot:prepend><q-icon name="pin" size="18px" /></template>
            </q-input>
          </label>
          <q-btn
            label="Add"
            icon="add"
            class="dash-modal__submit spr-add-btn"
            unelevated
            :loading="saving"
            :disable="!canSubmit"
            @click="submit"
          />
        </div>
        <p class="spr-add-hint">
          The site is expected to have this many people in the position on any given day. The
          manning board reads these as its targets.
        </p>

        <!-- ── Existing ────────────────────────────────────────────────────── -->
        <div class="form-section-label spr-list-label">
          Current requirements
          <span v-if="summary?.hasAny" class="spr-list-count"
            >{{ summary.positions }} in force · {{ summary.headcount }} needed</span
          >
        </div>

        <div v-if="loading" class="spr-state">
          <q-spinner size="18px" color="primary" />
          <span>Loading requirements…</span>
        </div>

        <div v-else-if="!requirements.length" class="spr-state spr-state--empty">
          <q-icon name="o_assignment" size="20px" />
          <span>No position requirements set for this site yet.</span>
        </div>

        <table v-else class="spr-table">
          <thead>
            <tr>
              <th>Position</th>
              <th class="spr-num">Needed</th>
              <th>Effective</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="req in requirements"
              :key="req.id ?? `${req.positionId}-${req.effectiveFrom}`"
            >
              <td>
                <span
                  class="spr-position"
                  :class="{ 'spr-position--missing': req.positionMissing }"
                >
                  {{ req.positionName }}
                </span>
              </td>
              <td class="spr-num spr-needed">{{ req.quantityNeeded }}</td>
              <td class="spr-window">{{ formatEffectiveWindow(req) }}</td>
              <td>
                <span
                  class="status-badge"
                  :class="req.effective ? 'status-active' : 'status-inactive'"
                >
                  {{ req.effective ? 'In force' : req.isActive ? 'Out of window' : 'Inactive' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn flat label="Close" color="grey-7" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * The requirements a site is held to, and the one form that adds to them.
 *
 * State is owned by the Sites panel rather than here: the same composable feeds
 * the table's summary column, so adding a requirement through this dialog has
 * to refresh the cache the column reads. A second composable instance in here
 * would have left the column showing the pre-add figures until a reload.
 */
import { computed, ref, watch } from 'vue'
import {
  formatEffectiveWindow,
  summarizeRequirements,
} from '@/composables/utils/positionRequirements'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  site: { type: Object, default: null },
  /** Normalized rows for `site`, from `useAdminSitePositionRequirements`. */
  requirements: { type: Array, default: () => [] },
  positions: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  loadingPositions: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'add'])

const positionId = ref(null)
const quantityNeeded = ref(1)

const summary = computed(() => summarizeRequirements(props.requirements))

/**
 * Positions already required at this site are still offered — the backend dates
 * requirements, so adding the same position again is how a target is revised
 * rather than a duplicate. The count says which ones already have a line.
 */
const positionOptions = computed(() =>
  props.positions.map((position) => {
    const existing = props.requirements.find(
      (r) => String(r.positionId) === String(position.id) && r.effective,
    )
    return {
      value: position.id,
      label: existing ? `${position.name} — currently ${existing.quantityNeeded}` : position.name,
    }
  }),
)

const canSubmit = computed(
  () =>
    positionId.value != null &&
    Number.isInteger(Number(quantityNeeded.value)) &&
    Number(quantityNeeded.value) >= 1,
)

function submit() {
  if (!canSubmit.value || props.saving) return
  emit('add', { positionId: positionId.value, quantityNeeded: Number(quantityNeeded.value) })
}

// A fresh form each time the dialog opens, and after a successful add the
// parent clears `positionId` by way of the requirements list changing — so the
// reset lives on open, where it cannot fight an in-flight save.
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    positionId.value = null
    quantityNeeded.value = 1
  },
)

// After a successful add the row appears in the list; drop the picked position
// so the form is ready for the next one rather than re-offering the last.
watch(
  () => props.requirements.length,
  () => {
    positionId.value = null
    quantityNeeded.value = 1
  },
)
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';

.spr-add-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 130px auto;
  align-items: start;
  gap: 10px;
}

.spr-add-btn {
  height: 38px;
  padding: 0 16px;
  border-radius: var(--dash-r-md);
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
}

.spr-add-hint {
  margin: 8px 0 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--dash-ink-4);
}

.spr-list-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-top: 20px;
}

.spr-list-count {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  color: var(--dash-ink-3);
  font-variant-numeric: tabular-nums;
}

.spr-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 18px 12px;
  font-size: 12.5px;
  color: var(--dash-ink-3);
}

.spr-state--empty {
  justify-content: center;
  border: 1px dashed var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
  color: var(--dash-ink-4);
}

.spr-table {
  width: 100%;
  border-collapse: collapse;
}

.spr-table th {
  padding: 10px 10px 8px;
  text-align: left;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--dash-ink-4);
  border-bottom: 1px solid var(--dash-line);
}

.spr-table td {
  padding: 9px 10px;
  font-size: 12.5px;
  color: var(--dash-ink-2);
  border-bottom: 1px solid var(--dash-line-soft);
  vertical-align: middle;
}

.spr-table tbody tr:last-child td {
  border-bottom: none;
}

.spr-num {
  width: 90px;
  text-align: right !important;
  font-variant-numeric: tabular-nums;
}

.spr-needed {
  font-weight: 500;
  color: var(--dash-ink);
}

.spr-position {
  font-weight: 500;
  color: var(--dash-ink);
}

/* A requirement can name a position that has since been deleted. Saying so
   quietly beats printing a bare id, which reads as a rendering bug. */
.spr-position--missing {
  color: var(--dash-ink-4);
  font-style: italic;
  font-weight: 400;
}

.spr-window {
  color: var(--dash-ink-3);
}

@media (max-width: 599px) {
  .spr-add-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .spr-add-btn {
    width: 100%;
  }
}
</style>
