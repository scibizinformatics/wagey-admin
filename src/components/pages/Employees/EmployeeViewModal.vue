<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="52px" v-if="employee?.user?.picture_url">
            <img :src="employee.user.picture_url" :alt="fullName" />
          </q-avatar>
          <q-avatar v-else size="52px" class="avatar-fallback avatar-fallback-lg">
            {{ initials }}
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">{{ fullName }}</div>
            <div class="dash-modal__sub">
              <span :class="['dash-chip', statusClass]">
                <span class="dash-chip__dot"></span>{{ status }}
              </span>
            </div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" @click="close" />
      </q-card-section>

      <!-- Tabs -->
      <q-tabs
        v-model="tab"
        dense
        align="left"
        class="view-tabs"
        indicator-color="white"
        active-color="white"
      >
        <q-tab name="user" label="User info" />
        <q-tab name="personal" label="Personal" />
        <q-tab name="employment" label="Employment" />
      </q-tabs>

      <q-card-section class="dash-modal__body">
        <q-tab-panels v-model="tab" animated>
          <!-- User Info Tab -->
          <q-tab-panel name="user" class="q-pa-none">
            <div class="detail-grid-cards">
              <div class="detail-card">
                <div class="detail-card-label">Username</div>
                <div class="detail-card-value">{{ employee?.user?.username || 'N/A' }}</div>
              </div>
              <div class="detail-card">
                <div class="detail-card-label">Email</div>
                <div class="detail-card-value">{{ email }}</div>
              </div>
              <div class="detail-card">
                <div class="detail-card-label">Full name</div>
                <div class="detail-card-value">{{ fullName }}</div>
              </div>
              <div class="detail-card">
                <div class="detail-card-label">Role</div>
                <div class="detail-card-value">{{ role }}</div>
              </div>
              <div class="detail-card">
                <div class="detail-card-label">Status</div>
                <div class="detail-card-value">
                  <span :class="['dash-chip', statusClass]"
                    ><span class="dash-chip__dot"></span>{{ status }}</span
                  >
                </div>
              </div>
            </div>
          </q-tab-panel>

          <!-- Personal Tab -->
          <q-tab-panel name="personal" class="q-pa-none">
            <div class="detail-grid-cards">
              <div class="detail-card">
                <div class="detail-card-label">Civil status</div>
                <div class="detail-card-value">{{ civilStatus }}</div>
              </div>
              <div class="detail-card">
                <div class="detail-card-label">Birthday</div>
                <div class="detail-card-value">{{ formatDate(employee?.birthday) || 'N/A' }}</div>
              </div>
              <div class="detail-card">
                <div class="detail-card-label">Phone</div>
                <div class="detail-card-value">{{ phone }}</div>
              </div>
              <div class="detail-card">
                <div class="detail-card-label">Emergency contact</div>
                <div class="detail-card-value">{{ employee?.emergency_contact || 'N/A' }}</div>
              </div>
              <div class="detail-card detail-card-full">
                <div class="detail-card-label">Address</div>
                <div class="detail-card-value">{{ employee?.address || 'N/A' }}</div>
              </div>
            </div>
          </q-tab-panel>

          <!-- Employment Tab -->
          <q-tab-panel name="employment" class="q-pa-none">
            <div class="detail-grid-cards">
              <div class="detail-card">
                <div class="detail-card-label">Bank account</div>
                <div class="detail-card-value">{{ employee?.bank_acct || 'N/A' }}</div>
              </div>
              <div class="detail-card">
                <div class="detail-card-label">Timezone</div>
                <div class="detail-card-value">{{ employee?.timezone || 'N/A' }}</div>
              </div>
              <div class="detail-card">
                <div class="detail-card-label">Last updated</div>
                <div class="detail-card-value">
                  {{ formatDateTime(employee?.last_date_updated) || 'N/A' }}
                </div>
              </div>
              <div class="detail-card">
                <div class="detail-card-label">Updated by</div>
                <div class="detail-card-value">{{ employee?.updated_by || 'N/A' }}</div>
              </div>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn flat no-caps label="Close" class="dash-modal__cancel" @click="close" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  employee: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue'])

const tab = ref('user')

watch(
  () => props.modelValue,
  (val) => {
    if (val) tab.value = 'user'
  },
)

const fullName = computed(() => {
  if (!props.employee) return 'N/A'
  return (
    `${props.employee.user?.first_name || ''} ${props.employee.user?.last_name || ''}`.trim() ||
    props.employee.user?.username ||
    'N/A'
  )
})

const email = computed(() => props.employee?.user?.email || 'N/A')

const role = computed(() => {
  if (!props.employee) return 'N/A'
  if (props.employee.user_role_name) return String(props.employee.user_role_name)
  if (props.employee.user_role?.name) return String(props.employee.user_role.name)
  if (props.employee.companies?.length > 0) {
    const role = props.employee.companies[0].user_role
    return role?.name ? String(role.name) : 'N/A'
  }
  return 'N/A'
})

const status = computed(() => {
  if (!props.employee) return 'N/A'
  if (props.employee.status?.toLowerCase() === 'terminated') return 'Terminated'
  if (props.employee.is_active === false) return 'Terminated'
  const empStatus = props.employee.companies?.[0]?.employment_status
  if (empStatus?.toLowerCase() === 'terminated') return 'Terminated'
  return 'Active'
})

const statusClass = computed(() => {
  if (status.value === 'Active') return 'dash-chip--good'
  if (status.value === 'Terminated') return 'dash-chip--critical'
  return ''
})

const initials = computed(() => {
  const name = fullName.value
  return name && name !== 'N/A'
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'
})

const civilStatus = computed(() => props.employee?.civil_status || 'N/A')
const phone = computed(() => props.employee?.phone_number || 'N/A')

const formatDate = (dateString) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

const formatDateTime = (dateString) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const close = () => emit('update:modelValue', false)
</script>

<style scoped>
/* The card, header, body and chip are the shared `dash-modal` / `dash-chip`
   chrome. What is left here is this dialog's own furniture: the tab strip that
   sits under the navy header, the avatar fallback, and the read-only fact grid
   its three tabs are built from. */

/* A tab strip directly under the header continues the navy rather than starting
   a new surface, so the head reads as one block down to the first fact. */
.view-tabs {
  background: var(--dash-brand);
  padding: 0 18px;
  font-size: 13px;
  flex: none;
}
.view-tabs :deep(.q-tab) {
  color: rgba(255, 255, 255, 0.66);
  text-transform: none;
  font-weight: 500;
  min-height: 40px;
}
.view-tabs :deep(.q-tab--active) {
  color: #ffffff;
}
.view-tabs :deep(.q-tab__indicator) {
  background: #ffffff;
}

/* Shown only when the employee has no photo. */
.avatar-fallback {
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
  font-weight: 600;
  border-radius: var(--dash-r-pill);
  flex-shrink: 0;
}
.avatar-fallback :deep(.q-avatar__content) {
  font-size: 16px;
  line-height: 1;
}

/* ── Read-only fact grid ──
   A label over its value, in a tile, two to a row. The labels used to be 11px
   uppercase at 0.04em tracking — the one convention the design system calls out
   as the clearest tell of an older dashboard — and every colour here was a
   literal hex. */
.detail-grid-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.detail-card {
  padding: 10px 13px;
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  min-width: 0;
}

.detail-card-full {
  grid-column: 1 / -1;
}

.detail-card-label {
  margin-bottom: 3px;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  color: var(--dash-ink-3);
}

.detail-card-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  word-break: break-word;
}

@media (max-width: 768px) {
  .detail-grid-cards {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
