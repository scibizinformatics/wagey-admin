<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="modal-card" style="max-width: 520px">
      <q-card-section class="modal-header">
        <div class="modal-title">
          {{ reassignData.isDualShift ? 'Update Dual Shift' : 'Update Shift Assignment' }}
        </div>
        <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
      </q-card-section>
      <q-card-section class="modal-body">
        <div class="quick-info">
          <div class="info-item">
            <q-icon name="person" size="20px" />
            <span>{{ employeeName }}</span>
          </div>
          <div class="info-item">
            <q-icon name="event" size="20px" />
            <span>{{ reassignData.date }}</span>
          </div>
        </div>
        <q-form @submit.prevent="onSubmit" class="schedule-form">
          <!-- ── SINGLE SHIFT ── -->
          <template v-if="!reassignData.isDualShift">
            <div class="shift-row">
              <div class="shift-row-header">
                <span class="row-label"><q-icon name="edit" size="16px" /> Select Shift Template</span>
              </div>
              <div class="shift-fields">
                <q-select
                  :model-value="reassignData.shiftTemplateId"
                  @update:model-value="updateField('shiftTemplateId', $event)"
                  :options="shiftTemplateOptions"
                  option-value="value"
                  option-label="label"
                  :display-value="selectedTemplateLabel"
                  label="Shift Template"
                  outlined dense emit-value map-options
                  class="form-field"
                  :rules="[(val) => !!val || 'Shift template is required']"
                >
                  <template #option="scope">
                    <q-item v-bind="scope.itemProps" style="min-width: 0; max-width: 100%">
                      <q-item-section>
                        <template v-if="scope.opt.label && scope.opt.label.includes(' / ')">
                          <q-item-label
                            v-for="(part, i) in scope.opt.label.split(' / ')"
                            :key="i"
                            style="font-size: 13px; line-height: 1.5"
                          >{{ part }}</q-item-label>
                        </template>
                        <q-item-label v-else style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px">
                          {{ scope.opt.label }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <div class="shift-row-header" style="margin-top: 16px">
                <span class="row-label"><q-icon name="history" size="16px" /> Current Shift</span>
              </div>
              <div class="current-shift-info">
                <div style="font-size: 13px; color: #374151">
                  <div style="margin-bottom: 6px"><strong>Template:</strong> {{ reassignData.originalTemplateName || 'N/A' }}</div>
                  <div style="margin-bottom: 6px"><strong>Site:</strong> {{ reassignData.originalSiteName || 'N/A' }}</div>
                  <div style="margin-bottom: 6px"><strong>Time:</strong> {{ reassignData.originalTime || 'N/A' }}</div>
                  <div v-if="reassignData.originalDuration"><strong>Duration:</strong> {{ reassignData.originalDuration }}</div>
                </div>
              </div>

              <div v-if="showNewPreview" class="new-shift-info">
                <div style="font-size: 11px; color: #d97706; margin-bottom: 8px; font-weight: 600; text-transform: uppercase;">
                  ⚠️ This will replace your current shift
                </div>
                <div style="font-size: 13px; color: #374151">
                  <div style="margin-bottom: 6px"><strong>Template:</strong> {{ newPreviewName || 'N/A' }}</div>
                  <template v-if="!newPreviewIsDual">
                    <div style="margin-bottom: 6px"><strong>Site:</strong> {{ newPreviewSite || 'N/A' }}</div>
                    <div style="margin-bottom: 6px"><strong>Time:</strong> {{ newPreviewTime || 'N/A' }}</div>
                  </template>
                  <template v-else>
                    <div v-for="(sub, si) in newPreviewShifts" :key="si" style="margin-bottom: 6px; padding: 6px 8px; background: rgba(0,0,0,0.04); border-radius: 6px;">
                      <div><strong>Shift {{ si + 1 }} Site:</strong> {{ sub.site?.name || sub.siteName || 'N/A' }}</div>
                      <div><strong>Time:</strong> {{ sub.start_time || 'N/A' }} - {{ sub.end_time || 'N/A' }}</div>
                    </div>
                  </template>
                </div>
              </div>

              <div v-if="reassignData.shiftTemplateId !== reassignData.originalTemplateId" style="margin-top: 12px">
                <q-btn
                  flat size="sm" color="grey-7" icon="refresh" label="Back to Original"
                  @click="$emit('back-to-original')"
                />
              </div>
            </div>
          </template>

          <!-- ── DUAL SHIFT ── -->
          <template v-else>
            <div class="shift-row">
              <div class="shift-row-header">
                <span class="row-label"><q-icon name="edit" size="16px" /> Select Shift Template</span>
              </div>
              <div class="shift-fields">
                <q-select
                  :model-value="reassignData.shiftTemplateId"
                  @update:model-value="updateField('shiftTemplateId', $event)"
                  :options="shiftTemplateOptions"
                  option-value="value"
                  option-label="label"
                  :display-value="selectedTemplateLabel"
                  label="Shift Template"
                  outlined dense emit-value map-options
                  class="form-field"
                  :rules="[(val) => !!val || 'Shift template is required']"
                >
                  <template #option="scope">
                    <q-item v-bind="scope.itemProps" style="min-width: 0; max-width: 100%">
                      <q-item-section>
                        <template v-if="scope.opt.label && scope.opt.label.includes(' / ')">
                          <q-item-label v-for="(part, i) in scope.opt.label.split(' / ')" :key="i" style="font-size: 13px; line-height: 1.5">{{ part }}</q-item-label>
                        </template>
                        <q-item-label v-else style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px">{{ scope.opt.label }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <div class="shift-row-header" style="margin-top: 16px">
                <span class="row-label"><q-icon name="history" size="16px" /> Current Shifts</span>
              </div>
              <div v-for="(sub, idx) in reassignData.dualShifts" :key="idx" class="current-shift-info">
                <div style="font-size: 13px; color: #374151">
                  <div style="font-weight: 600; margin-bottom: 4px; color: #4b5563">Shift {{ idx + 1 }}: {{ sub.startTime }} - {{ sub.endTime }}</div>
                  <div style="margin-bottom: 6px"><strong>Template:</strong> {{ sub.originalTemplateName || 'N/A' }}</div>
                  <div style="margin-bottom: 6px"><strong>Site:</strong> {{ sub.originalSiteName || 'N/A' }}</div>
                </div>
              </div>

              <div v-if="showNewPreview" class="new-shift-info">
                <div style="font-size: 11px; color: #d97706; margin-bottom: 8px; font-weight: 600; text-transform: uppercase;">
                  ⚠️ This will replace your current shifts
                </div>
                <div style="font-size: 13px; color: #374151">
                  <div style="margin-bottom: 6px"><strong>Template:</strong> {{ newPreviewName || 'N/A' }}</div>
                  <template v-if="!newPreviewIsDual">
                    <div style="margin-bottom: 6px"><strong>Site:</strong> {{ newPreviewSite || 'N/A' }}</div>
                    <div style="margin-bottom: 6px"><strong>Time:</strong> {{ newPreviewTime || 'N/A' }}</div>
                  </template>
                  <template v-else>
                    <div v-for="(sub, si) in newPreviewShifts" :key="si" style="margin-bottom: 6px; padding: 6px 8px; background: rgba(0,0,0,0.04); border-radius: 6px;">
                      <div><strong>Shift {{ si + 1 }} Site:</strong> {{ sub.site?.name || sub.siteName || 'N/A' }}</div>
                      <div><strong>Time:</strong> {{ sub.start_time || 'N/A' }} - {{ sub.end_time || 'N/A' }}</div>
                    </div>
                  </template>
                </div>
              </div>

              <div v-if="reassignData.shiftTemplateId !== reassignData.originalTemplateId" style="margin-top: 12px">
                <q-btn flat size="sm" color="grey-7" icon="refresh" label="Back to Original" @click="$emit('back-to-original')" />
              </div>
            </div>
          </template>

          <div class="modal-actions">
            <q-btn flat label="Cancel" @click="$emit('update:modelValue', false)" class="cancel-btn" />
            <q-btn
              type="submit"
              color="primary"
              :label="reassignData.isDualShift ? 'Update Both Shifts' : 'Update Shift'"
              unelevated
              class="submit-btn"
              :loading="saving"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  reassignData: {
    type: Object,
    default: () => ({
      assignmentId: null,
      shiftTemplateId: null,
      originalTemplateId: null,
      originalTemplateName: null,
      originalSiteName: null,
      originalTime: null,
      originalDuration: null,
      currentEmployee: null,
      date: null,
      day: null,
      isDualShift: false,
      dualShifts: [],
    }),
  },
  shiftTemplateOptions: { type: Array, default: () => [] },
  employeeName: { type: String, default: '' },
  saving: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'update:reassignData', 'submit', 'back-to-original']);

const selectedTemplateLabel = computed(() => {
  return props.shiftTemplateOptions.find((o) => o.value === props.reassignData.shiftTemplateId)?.label || '';
});

const selectedTemplate = computed(() => {
  const id = props.reassignData.shiftTemplateId;
  if (!id) return null;
  const n = typeof id === 'number' ? id : parseInt(id);
  return props.shiftTemplateOptions.find((t) => t.value === n) || null;
});

const showNewPreview = computed(() => {
  return props.reassignData.shiftTemplateId !== props.reassignData.originalTemplateId && selectedTemplate.value;
});

const newPreviewName = computed(() => selectedTemplate.value?.label || '');
const newPreviewIsDual = computed(() => {
  const t = selectedTemplate.value;
  if (!t) return false;
  // Check if template has multiple shifts
  return false; // Simplified — parent can pass computed preview data if needed
});
const newPreviewSite = computed(() => '');
const newPreviewTime = computed(() => '');
const newPreviewShifts = computed(() => []);

function updateField(key, value) {
  emit('update:reassignData', { ...props.reassignData, [key]: value });
}

function onSubmit() {
  emit('submit');
}
</script>

<style scoped>
.modal-card {
  border-radius: 14px !important;
  width: 500px !important;
  min-width: 500px !important;
  max-width: 95vw !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.modal-header {
  background: #ffffff;
  border-bottom: 1px solid #e8ecf0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}
.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}
.modal-body {
  padding: 20px;
  overflow-y: auto;
  max-height: 70vh;
}
.schedule-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.shift-row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.row-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.shift-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.form-field {
  width: 100%;
}
.current-shift-info {
  padding: 12px;
  background: #e5e7eb;
  border-radius: 8px;
  margin-bottom: 12px;
}
.new-shift-info {
  padding: 12px;
  background: #fef3c7;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #f59e0b;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f1f3f5;
}
.cancel-btn {
  color: #6b7280;
}
.submit-btn {
  background: #3b82f6;
  color: white;
  padding: 6px 16px;
  border-radius: 8px !important;
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
}
.submit-btn:hover {
  background: #2563eb;
}
.quick-info {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e8ecf0;
}
.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
@media (max-width: 768px) {
  .modal-card {
    min-width: unset !important;
    max-width: calc(100vw - 20px) !important;
  }
}
</style>
