<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--lg docs">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="o_contact_page" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Identity documents</div>
            <div class="dash-modal__sub">{{ employeeLine }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" @click="close" />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <div v-if="fetching" class="docs-state">
          <q-spinner size="20px" />
          <span>Loading documents…</span>
        </div>

        <div v-else-if="loadError" class="docs-state docs-state--error">
          <q-icon name="o_error_outline" size="20px" />
          <span>Could not load this employee's documents.</span>
          <q-btn flat dense no-caps label="Try again" class="docs-retry" @click="load" />
        </div>

        <template v-else>
          <div class="dash-modal__group">
            <div class="dash-modal__group-head">
              <p class="dash-modal__group-label">
                On file<span v-if="documents.length" class="dash-num">
                  ({{ documents.length }})</span
                >
              </p>
            </div>

            <ul v-if="documents.length" class="docs-list">
              <li
                v-for="doc in documents"
                :key="doc.id"
                class="docs-row"
                :class="{
                  'docs-row--off': !doc.isActive,
                  'docs-row--expired': isExpired(doc),
                }"
              >
                <div class="docs-row__main">
                  <span class="docs-row__name">{{ doc.typeName }}</span>
                  <span class="docs-row__meta">
                    <span>{{ doc.number || 'No number' }}</span>
                    <span aria-hidden="true">·</span>
                    <span :class="{ 'docs-row__expiry--expired': isExpired(doc) }">
                      {{ documentExpiryLabel(doc) }}
                    </span>
                    <template v-if="doc.attachment">
                      <span aria-hidden="true">·</span>
                      <a
                        :href="doc.attachment"
                        target="_blank"
                        rel="noopener"
                        class="docs-row__link"
                        >Attachment</a
                      >
                    </template>
                  </span>
                </div>

                <div class="docs-row__actions">
                  <span class="dash-chip" :class="doc.isVerified ? 'dash-chip--good' : ''">
                    {{ doc.isVerified ? 'Verified' : 'Not verified' }}
                  </span>
                  <q-toggle
                    :model-value="doc.isVerified"
                    size="sm"
                    :loading="savingId === doc.id"
                    :aria-label="
                      doc.isVerified
                        ? `Mark ${doc.typeName} as not verified`
                        : `Verify ${doc.typeName}`
                    "
                    @update:model-value="(value) => toggleVerified(doc, value)"
                  />
                  <q-btn
                    flat
                    round
                    dense
                    size="12px"
                    class="docs-row__icon"
                    :icon="doc.isActive ? 'o_visibility_off' : 'o_visibility'"
                    :disable="savingId === doc.id"
                    :aria-label="
                      doc.isActive ? `Deactivate ${doc.typeName}` : `Reactivate ${doc.typeName}`
                    "
                    @click="toggleActive(doc)"
                  />
                </div>
              </li>
            </ul>

            <div v-else class="docs-empty">
              <span class="dash-featured-icon">
                <q-icon name="o_contact_page" size="18px" />
              </span>
              <p class="docs-empty__title">No documents on file</p>
              <p class="docs-empty__sub">Add the first one below.</p>
            </div>
          </div>

          <div class="dash-modal__group">
            <p class="dash-modal__group-label">Add or replace a document</p>

            <div v-if="!loadingTypes && !typeOptions.length" class="docs-notice">
              <q-icon name="o_info" size="17px" />
              <div class="docs-notice__body">
                <span>
                  No active document types are configured. A document is always filed against one,
                  so a type has to exist first.
                </span>
                <q-btn
                  flat
                  dense
                  no-caps
                  icon-right="o_arrow_forward"
                  label="Open document types"
                  class="docs-notice__action"
                  @click="openDocumentTypes"
                />
              </div>
            </div>

            <q-form v-else ref="formRef" @submit="submit" class="dash-modal__form">
              <div class="dash-modal__grid">
                <label class="dash-modal__field dash-modal__span-2">
                  <span class="dash-modal__field-label"
                    >Document type<span class="dash-modal__req">*</span></span
                  >
                  <q-select
                    v-model="form.typeId"
                    :options="typeOptions"
                    option-value="id"
                    option-label="name"
                    emit-value
                    map-options
                    outlined
                    dense
                    :loading="loadingTypes"
                    :rules="[(val) => !!val || 'Document type is required']"
                    hide-bottom-space
                    class="dash-field"
                    popup-content-class="dash-popup dash-popup--modal"
                  >
                    <template v-slot:option="scope">
                      <q-item v-bind="scope.itemProps">
                        <q-item-section>
                          <q-item-label>{{ scope.opt.name }}</q-item-label>
                          <q-item-label caption>
                            {{ scope.opt.code }}
                            <template v-if="scope.opt.isRequired"> · required</template>
                          </q-item-label>
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                  <span v-if="existingForType" class="docs-hint">
                    This employee already has a {{ existingForType.typeName }} on file. Saving
                    replaces it.
                  </span>
                </label>

                <label class="dash-modal__field">
                  <span class="dash-modal__field-label">Document number</span>
                  <q-input
                    v-model="form.number"
                    outlined
                    dense
                    hide-bottom-space
                    placeholder="123-456-789"
                    class="dash-field"
                  />
                </label>

                <label class="dash-modal__field">
                  <span class="dash-modal__field-label">Issued on</span>
                  <q-input
                    v-model="form.issuedAt"
                    mask="####-##-##"
                    outlined
                    dense
                    placeholder="YYYY-MM-DD"
                    hide-bottom-space
                    class="dash-field"
                  >
                    <template v-slot:append>
                      <q-icon name="o_event" size="18px" class="cursor-pointer">
                        <q-popup-proxy transition-show="scale" transition-hide="scale">
                          <q-date v-model="form.issuedAt" mask="YYYY-MM-DD" />
                        </q-popup-proxy>
                      </q-icon>
                    </template>
                  </q-input>
                </label>

                <label v-if="selectedRequiresExpiry" class="dash-modal__field">
                  <span class="dash-modal__field-label"
                    >Expires on<span class="dash-modal__req">*</span></span
                  >
                  <q-input
                    v-model="form.expiresAt"
                    mask="####-##-##"
                    outlined
                    dense
                    placeholder="YYYY-MM-DD"
                    hide-bottom-space
                    :rules="[
                      (val) =>
                        !!val || `${selectedTypeName || 'This document type'} needs an expiry date`,
                    ]"
                    class="dash-field"
                  >
                    <template v-slot:append>
                      <q-icon name="o_event" size="18px" class="cursor-pointer">
                        <q-popup-proxy transition-show="scale" transition-hide="scale">
                          <q-date v-model="form.expiresAt" mask="YYYY-MM-DD" />
                        </q-popup-proxy>
                      </q-icon>
                    </template>
                  </q-input>
                </label>

                <!-- A div, not a label: a label click would reach the file input
                     through the label as well as through QFile's own handler. -->
                <div class="dash-modal__field dash-modal__span-2">
                  <span class="dash-modal__field-label">Attachment</span>
                  <q-file
                    v-model="form.attachment"
                    outlined
                    dense
                    hide-bottom-space
                    accept="image/*,.pdf"
                    class="dash-field"
                    label="Choose a file (optional)"
                  >
                    <template v-slot:prepend>
                      <q-icon name="o_attach_file" size="18px" />
                    </template>
                  </q-file>
                  <span class="docs-hint">
                    Sending a file uploads it as multipart; without one the document saves as JSON.
                  </span>
                </div>
              </div>
            </q-form>
          </div>
        </template>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn flat no-caps label="Close" class="dash-modal__cancel" @click="close" />
        <q-btn
          v-if="!fetching && !loadError && typeOptions.length"
          no-caps
          unelevated
          :icon="existingForType ? 'o_sync' : 'o_add'"
          :label="existingForType ? 'Replace document' : 'Add document'"
          class="dash-modal__submit"
          :loading="saving"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * One employee's identity documents, reached from the Actions menu on the
 * Employees page. The row the menu was opened from supplies `employee.id`, which
 * is the id every `/employees/{employee_id}/` endpoint in this app keys by —
 * this dialog never asks the reader to pick the employee again.
 *
 * The `POST` is an upsert per document type, so re-saving a type replaces the
 * document rather than filing a second one; the hint under the type select says
 * so before the write, and the response's `replaced` / `unchanged` flags word
 * the toast afterwards.
 */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCompany } from 'src/composables/page/useCompany'
import { useEmployeeIdentityDocuments } from 'src/composables/page/useEmployeeIdentityDocuments'
import { fetchIdentityDocumentTypeList } from 'src/composables/admin/useAdminIdentityDocumentTypes'
import {
  documentExpiryLabel,
  identityDocumentBody,
  isExpired,
} from 'src/composables/utils/identityDocuments'
import { extractErrorMessage } from 'src/composables/utils/http'
import { useToast } from 'src/composables/useToast'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** The employee row the menu was opened from. Its `id` is the UUID the API keys by. */
  employee: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue'])

const toast = useToast()
const router = useRouter()
const { companyId } = useCompany()
const { fetching, saving, savingId, fetchDocuments, saveDocument, patchDocument } =
  useEmployeeIdentityDocuments()

const formRef = ref(null)
const documents = ref([])
const documentTypes = ref([])
const loadingTypes = ref(false)
const loadError = ref(false)

function emptyForm() {
  return { typeId: null, number: '', issuedAt: '', expiresAt: '', attachment: null }
}

const form = ref(emptyForm())

const employeeId = computed(() => props.employee?.id ?? props.employee?.uuid ?? null)

const employeeName = computed(
  () =>
    `${props.employee?.user?.first_name || ''} ${props.employee?.user?.last_name || ''}`.trim() ||
    props.employee?.full_name ||
    props.employee?.user?.username ||
    'Unknown',
)

const employeePosition = computed(
  () => props.employee?.companies?.[0]?.position?.name || props.employee?.position?.name || '',
)

const employeeLine = computed(() =>
  employeePosition.value ? `${employeeName.value} · ${employeePosition.value}` : employeeName.value,
)

/** Only an active type can be filed; a retired one still prints on existing rows. */
const typeOptions = computed(() => documentTypes.value.filter((type) => type.isActive))

const selectedType = computed(
  () => documentTypes.value.find((type) => type.id === form.value.typeId) || null,
)

const selectedTypeName = computed(() => selectedType.value?.name || '')

const selectedRequiresExpiry = computed(() => selectedType.value?.requiresExpiry === true)

const existingForType = computed(() =>
  form.value.typeId
    ? documents.value.find((doc) => doc.typeId === form.value.typeId && doc.isActive) || null
    : null,
)

// One dialog instance serves every employee the reader opens in sequence, so an
// earlier employee's response must not land on the later one's list.
let loadToken = 0

async function load() {
  if (!companyId.value || !employeeId.value) return
  const token = ++loadToken
  loadError.value = false
  try {
    const rows = await fetchDocuments(companyId.value, employeeId.value)
    if (token !== loadToken) return
    documents.value = rows
  } catch (error) {
    if (token !== loadToken) return
    console.error('[EmployeeIdentityDocumentsDialog] load ✖ error', error)
    documents.value = []
    loadError.value = true
  }
}

async function loadTypes() {
  if (!companyId.value) return
  loadingTypes.value = true
  try {
    documentTypes.value = await fetchIdentityDocumentTypeList(companyId.value)
  } catch (error) {
    console.error('[EmployeeIdentityDocumentsDialog] types ✖ error', error)
    toast.error(extractErrorMessage(error, 'Failed to load document types'))
  } finally {
    loadingTypes.value = false
  }
}

// Opening the dialog fetches both halves. The type list is re-read every time:
// an admin can add or retire a type in another tab, and a stale list here would
// hide the type they just created.
watch(
  () => [props.modelValue, employeeId.value],
  ([open]) => {
    if (!open) return
    form.value = emptyForm()
    formRef.value?.resetValidation?.()
    load()
    loadTypes()
  },
  { immediate: true },
)

/**
 * Selecting a type that is already on file pre-fills its row, so changing an
 * expiry date is an edit rather than a retype. The attachment is deliberately
 * not carried over: the file input starts empty, so saving does not silently
 * re-upload a file the admin did not choose.
 */
function prefillFromExisting(typeId) {
  const existing = documents.value.find((doc) => doc.typeId === typeId)
  if (!existing) {
    form.value = { ...emptyForm(), typeId }
    return
  }
  form.value = {
    typeId,
    number: existing.number,
    issuedAt: existing.issuedAt || '',
    expiresAt: existing.expiresAt || '',
    attachment: null,
  }
}

watch(
  () => form.value.typeId,
  (typeId) => {
    if (typeId) prefillFromExisting(typeId)
  },
)

async function submit() {
  const valid = await formRef.value?.validate()
  if (!valid) return
  if (!companyId.value || !employeeId.value) {
    toast.error('Select an employee before saving a document')
    return
  }

  try {
    const result = await saveDocument(
      companyId.value,
      employeeId.value,
      identityDocumentBody({
        typeId: form.value.typeId,
        number: form.value.number,
        issuedAt: form.value.issuedAt,
        expiresAt: form.value.expiresAt,
        attachment: form.value.attachment,
      }),
    )

    if (result?.unchanged) {
      toast.info('That document is already on file — nothing changed')
    } else if (result?.replaced) {
      toast.success('Document replaced')
    } else {
      toast.success('Document saved')
    }

    form.value = emptyForm()
    formRef.value?.resetValidation?.()
    await load()
  } catch (error) {
    console.error('[EmployeeIdentityDocumentsDialog] save ✖ error', error)
    toast.error(extractErrorMessage(error, 'Failed to save the document'))
  }
}

async function toggleVerified(doc, value) {
  const previous = doc.isVerified
  doc.isVerified = value
  try {
    await patchDocument(companyId.value, employeeId.value, doc.id, { is_verified: value })
    toast.success(value ? `${doc.typeName} marked verified` : `${doc.typeName} marked not verified`)
  } catch (error) {
    doc.isVerified = previous
    console.error('[EmployeeIdentityDocumentsDialog] verify ✖ error', error)
    toast.error(extractErrorMessage(error, 'Failed to change the verification'))
  }
}

async function toggleActive(doc) {
  const next = !doc.isActive
  const previous = doc.isActive
  doc.isActive = next
  try {
    await patchDocument(companyId.value, employeeId.value, doc.id, { is_active: next })
    toast.success(`${doc.typeName} ${next ? 'reactivated' : 'deactivated'}`)
  } catch (error) {
    doc.isActive = previous
    console.error('[EmployeeIdentityDocumentsDialog] toggle ✖ error', error)
    toast.error(extractErrorMessage(error, 'Failed to change the document'))
  }
}

function close() {
  emit('update:modelValue', false)
}

/**
 * Types are company configuration living on another screen, so the empty state
 * hands the reader the way there rather than naming a menu path. The dialog is
 * closed before navigating: it is mounted on the Employees page, and leaving it
 * open across a route change strands a modal over a page nobody is on.
 */
function openDocumentTypes() {
  close()
  router.push({ path: '/app/admin-settings', query: { tab: 'identity-documents' } })
}
</script>

<style scoped>
.docs-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 2px;
  font-size: 13px;
  color: var(--dash-ink-3);
}

.docs-state--error {
  color: var(--dash-critical);
}

.docs-retry {
  color: var(--dash-critical);
  font-size: 12px;
  text-decoration: underline;
}

.docs-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.docs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}

/* A deactivated document stays listed — it is history, not a hidden row — so it
   is dimmed rather than dropped. */
.docs-row--off {
  background: var(--dash-n-25);
}

.docs-row--off .docs-row__main {
  opacity: 0.6;
}

.docs-row__main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.docs-row__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
}

.docs-row__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0 5px;
  font-size: 11.5px;
  color: var(--dash-ink-3);
}

.docs-row__expiry--expired {
  color: var(--dash-critical);
  font-weight: 600;
}

.docs-row__link {
  color: var(--dash-brand);
  text-decoration: none;
}

.docs-row__link:hover {
  text-decoration: underline;
}

.docs-row__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

.docs-row__icon {
  color: var(--dash-ink-4);
}

.docs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 22px 12px;
  text-align: center;
  border: 1px dashed var(--dash-line-strong);
  border-radius: var(--dash-r-md);
}

.docs-empty__title {
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
}

.docs-empty__sub {
  margin: 0;
  font-size: 12px;
  color: var(--dash-ink-3);
}

.docs-notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--dash-ink-2);
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
}

.docs-notice__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.docs-notice__action {
  margin-left: -8px;
  color: var(--dash-brand);
  font-size: 12.5px;
  font-weight: 600;
}

.docs-hint {
  display: block;
  margin-top: 4px;
  font-size: 11.5px;
  line-height: 1.4;
  color: var(--dash-ink-4);
}
</style>
