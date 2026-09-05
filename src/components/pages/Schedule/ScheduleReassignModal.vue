<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--sm">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon"><q-icon name="swap_horiz" size="20px" /></span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">
              {{ reassignData.isDualShift ? 'Update dual shift' : 'Update Shift Assignment' }}
            </div>
          </div>
        </div>
        <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
      </q-card-section>
      <q-form @submit.prevent="onSubmit" class="dash-modal__form">
        <q-card-section class="dash-modal__body">
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

          <!-- ── SINGLE SHIFT ── -->
          <template v-if="!reassignData.isDualShift">
            <div class="dash-modal__group shift-row">
              <div class="dash-modal__group-head">
                <span class="row-label"
                  ><q-icon name="edit" size="16px" /> Select Shift Template</span
                >
              </div>
              <div class="shift-fields">
                <label class="dash-modal__field">
                  <span class="dash-modal__field-label">Shift template</span>
                  <q-select
                    :model-value="reassignData.shiftTemplateId"
                    @update:model-value="updateField('shiftTemplateId', $event)"
                    :options="shiftTemplateOptions"
                    option-value="value"
                    option-label="label"
                    :display-value="selectedTemplateLabel"
                    outlined
                    dense
                    emit-value
                    map-options
                    class="dash-field form-field"
                    :rules="[(val) => !!val || 'Shift template is required']"
                    hide-bottom-space
                    popup-content-class="dash-popup dash-popup--modal"
                  >
                    <template #option="scope">
                      <q-item v-bind="scope.itemProps" style="min-width: 0; max-width: 100%">
                        <q-item-section>
                          <template v-if="scope.opt.label && scope.opt.label.includes(' / ')">
                            <q-item-label
                              v-for="(part, i) in scope.opt.label.split(' / ')"
                              :key="i"
                              style="font-size: 13px; line-height: 1.5"
                              >{{ part }}</q-item-label
                            >
                          </template>
                          <q-item-label
                            v-else
                            style="
                              white-space: nowrap;
                              overflow: hidden;
                              text-overflow: ellipsis;
                              font-size: 13px;
                            "
                          >
                            {{ scope.opt.label }}
                          </q-item-label>
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                </label>
              </div>

              <div class="dash-modal__group-head" style="margin-top: 16px">
                <span class="row-label"><q-icon name="history" size="16px" /> Current Shift</span>
              </div>
              <div class="current-shift-info">
                <div class="rsm-preview__facts">
                  <div style="margin-bottom: 6px">
                    <strong>Template:</strong> {{ reassignData.originalTemplateName || 'N/A' }}
                  </div>
                  <div style="margin-bottom: 6px">
                    <strong>Site:</strong> {{ reassignData.originalSiteName || 'N/A' }}
                  </div>
                  <div style="margin-bottom: 6px">
                    <strong>Time:</strong> {{ reassignData.originalTime || 'N/A' }}
                  </div>
                  <div v-if="reassignData.originalDuration">
                    <strong>Duration:</strong> {{ reassignData.originalDuration }}
                  </div>
                </div>
              </div>

              <div v-if="showNewPreview" class="new-shift-info">
                <div class="rsm-preview__flag">
                  <q-icon name="o_swap_horiz" size="15px" />
                  Replaces the current shift
                </div>
                <div class="rsm-preview__facts">
                  <div style="margin-bottom: 6px">
                    <strong>Template:</strong> {{ newPreviewName || 'N/A' }}
                  </div>
                  <template v-if="!newPreviewIsDual">
                    <div style="margin-bottom: 6px">
                      <strong>Site:</strong> {{ newPreviewSite || 'N/A' }}
                    </div>
                    <div style="margin-bottom: 6px">
                      <strong>Time:</strong> {{ newPreviewTime || 'N/A' }}
                    </div>
                  </template>
                  <template v-else>
                    <div
                      v-for="(sub, si) in newPreviewShifts"
                      :key="si"
                      style="
                        margin-bottom: 6px;
                        padding: 6px 8px;
                        background: rgba(0, 0, 0, 0.04);
                        border-radius: 6px;
                      "
                    >
                      <div>
                        <strong>Shift {{ si + 1 }} Site:</strong> {{ sub.siteName || 'N/A' }}
                      </div>
                      <div><strong>Time:</strong> {{ sub.timeLabel || 'N/A' }}</div>
                    </div>
                  </template>
                </div>
              </div>

              <div
                v-if="reassignData.shiftTemplateId !== reassignData.originalTemplateId"
                style="margin-top: 12px"
              >
                <q-btn
                  flat
                  size="sm"
                  color="grey-7"
                  icon="refresh"
                  label="Back to original"
                  @click="$emit('back-to-original')"
                />
              </div>
            </div>
          </template>

          <!-- ── DUAL SHIFT ── -->
          <template v-else>
            <div class="dash-modal__group shift-row">
              <div class="dash-modal__group-head">
                <span class="row-label"
                  ><q-icon name="edit" size="16px" /> Select Shift Template</span
                >
              </div>
              <div class="shift-fields">
                <label class="dash-modal__field">
                  <span class="dash-modal__field-label">Shift template</span>
                  <q-select
                    :model-value="reassignData.shiftTemplateId"
                    @update:model-value="updateField('shiftTemplateId', $event)"
                    :options="shiftTemplateOptions"
                    option-value="value"
                    option-label="label"
                    :display-value="selectedTemplateLabel"
                    outlined
                    dense
                    emit-value
                    map-options
                    class="dash-field form-field"
                    :rules="[(val) => !!val || 'Shift template is required']"
                    hide-bottom-space
                    popup-content-class="dash-popup dash-popup--modal"
                  >
                    <template #option="scope">
                      <q-item v-bind="scope.itemProps" style="min-width: 0; max-width: 100%">
                        <q-item-section>
                          <template v-if="scope.opt.label && scope.opt.label.includes(' / ')">
                            <q-item-label
                              v-for="(part, i) in scope.opt.label.split(' / ')"
                              :key="i"
                              style="font-size: 13px; line-height: 1.5"
                              >{{ part }}</q-item-label
                            >
                          </template>
                          <q-item-label
                            v-else
                            style="
                              white-space: nowrap;
                              overflow: hidden;
                              text-overflow: ellipsis;
                              font-size: 13px;
                            "
                            >{{ scope.opt.label }}</q-item-label
                          >
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                </label>
              </div>

              <div class="dash-modal__group-head" style="margin-top: 16px">
                <span class="row-label"><q-icon name="history" size="16px" /> Current Shifts</span>
              </div>
              <div
                v-for="(sub, idx) in reassignData.dualShifts"
                :key="idx"
                class="current-shift-info"
              >
                <div class="rsm-preview__facts">
                  <div style="font-weight: 600; margin-bottom: 4px; color: #4b5563">
                    Shift {{ idx + 1 }}: {{ sub.startTime }} - {{ sub.endTime }}
                  </div>
                  <div style="margin-bottom: 6px">
                    <strong>Template:</strong> {{ sub.originalTemplateName || 'N/A' }}
                  </div>
                  <div style="margin-bottom: 6px">
                    <strong>Site:</strong> {{ sub.originalSiteName || 'N/A' }}
                  </div>
                </div>
              </div>

              <div v-if="showNewPreview" class="new-shift-info">
                <div class="rsm-preview__flag">
                  <q-icon name="o_swap_horiz" size="15px" />
                  Replaces the current shifts
                </div>
                <div class="rsm-preview__facts">
                  <div style="margin-bottom: 6px">
                    <strong>Template:</strong> {{ newPreviewName || 'N/A' }}
                  </div>
                  <template v-if="!newPreviewIsDual">
                    <div style="margin-bottom: 6px">
                      <strong>Site:</strong> {{ newPreviewSite || 'N/A' }}
                    </div>
                    <div style="margin-bottom: 6px">
                      <strong>Time:</strong> {{ newPreviewTime || 'N/A' }}
                    </div>
                  </template>
                  <template v-else>
                    <div
                      v-for="(sub, si) in newPreviewShifts"
                      :key="si"
                      style="
                        margin-bottom: 6px;
                        padding: 6px 8px;
                        background: rgba(0, 0, 0, 0.04);
                        border-radius: 6px;
                      "
                    >
                      <div>
                        <strong>Shift {{ si + 1 }} Site:</strong> {{ sub.siteName || 'N/A' }}
                      </div>
                      <div><strong>Time:</strong> {{ sub.timeLabel || 'N/A' }}</div>
                    </div>
                  </template>
                </div>
              </div>

              <div
                v-if="reassignData.shiftTemplateId !== reassignData.originalTemplateId"
                style="margin-top: 12px"
              >
                <q-btn
                  flat
                  size="sm"
                  color="grey-7"
                  icon="refresh"
                  label="Back to original"
                  @click="$emit('back-to-original')"
                />
              </div>
            </div>
          </template>
        </q-card-section>
        <q-card-actions class="dash-modal__foot">
          <q-btn
            flat
            label="Cancel"
            @click="$emit('update:modelValue', false)"
            class="dash-modal__cancel"
          />
          <q-btn
            type="submit"
            :label="reassignData.isDualShift ? 'Update both shifts' : 'Update Shift'"
            unelevated
            class="dash-modal__submit"
            :loading="saving"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'

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
})

const emit = defineEmits(['update:modelValue', 'update:reassignData', 'submit', 'back-to-original'])

const selectedTemplateLabel = computed(() => {
  return (
    props.shiftTemplateOptions.find((o) => o.value === props.reassignData.shiftTemplateId)?.label ||
    ''
  )
})

const selectedTemplate = computed(() => {
  const id = props.reassignData.shiftTemplateId
  if (!id) return null
  const n = typeof id === 'number' ? id : parseInt(id)
  return props.shiftTemplateOptions.find((t) => t.value === n) || null
})

const showNewPreview = computed(() => {
  return (
    props.reassignData.shiftTemplateId !== props.reassignData.originalTemplateId &&
    selectedTemplate.value
  )
})

// The preview reads the selected option's own description of the template —
// site, times and, for a split template, each segment. These four used to be
// hardcoded to '' / false / [], which is why the replacement panel printed
// "Site: N/A" and "Time: N/A" for every template no matter what it scheduled.
const newPreviewName = computed(() => selectedTemplate.value?.label || '')
const newPreviewIsDual = computed(() => selectedTemplate.value?.isMulti === true)
const newPreviewSite = computed(() => selectedTemplate.value?.siteName || '')
const newPreviewTime = computed(() => selectedTemplate.value?.timeLabel || '')
const newPreviewShifts = computed(() => selectedTemplate.value?.segments || [])

function updateField(key, value) {
  emit('update:reassignData', { ...props.reassignData, [key]: value })
}

function onSubmit() {
  emit('submit')
}
</script>

<style scoped>
.row-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink-2);
}
.shift-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.form-field {
  width: 100%;
}
/* What the shift is now, and what it would become. The pair reads as before /
   after, so only the second one is tinted: the change is the news. */
.current-shift-info {
  padding: 12px;
  margin-bottom: 12px;
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
}
.new-shift-info {
  padding: 12px;
  margin-bottom: 16px;
  background: var(--dash-warn-bg);
  border: 1px solid var(--dash-warn-line);
  border-radius: var(--dash-r-md);
}
.quick-info {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--dash-n-25);
  border-radius: var(--dash-r-md);
  border: 1px solid var(--dash-line);
}
.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
/* The line that says what the new template does to the existing assignment.
   It was an emoji over 11px uppercase text in an inline style; the icon and the
   warn tone come from the system now, and it keeps sentence case. */
.rsm-preview__flag {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--dash-warn);
}

.rsm-preview__facts {
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--dash-ink-2);
}
</style>
