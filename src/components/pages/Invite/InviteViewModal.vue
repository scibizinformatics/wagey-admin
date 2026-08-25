<template>
  <q-dialog
    :model-value="modelValue"
    :maximized="$q.screen.lt.sm"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="inv-view">
      <!-- ── Head ───────────────────────────────────────────────────────────
           The recipient is named here rather than in the body: the dialog opens
           from a table row, and once it covers the table nothing else on screen
           says whose invitation this is. -->
      <q-card-section class="inv-view__head">
        <span class="inv-view__avatar">{{ inviteInitials(invitation?.email) }}</span>
        <div class="inv-view__titles">
          <div class="inv-view__email">{{ invitation?.email || 'Invitation' }}</div>
          <div class="inv-view__sub">{{ invitation?.company || 'No company on record' }}</div>
        </div>
        <q-btn flat round dense icon="close" aria-label="Close" @click="close" />
      </q-card-section>

      <q-card-section class="inv-view__body">
        <!-- Status leads, with the sentence that explains what it means for this
             invite — a chip on its own answers "which state", not "so what". -->
        <div class="inv-view__status">
          <span class="dash-chip inv-view__chip" :class="chipClass(state.tone)">
            <span class="dash-chip__dot" />
            {{ state.label }}
          </span>
          <p class="inv-view__status-note">{{ statusNote }}</p>
        </div>

        <dl class="inv-view__facts">
          <div class="inv-view__fact">
            <dt>Role</dt>
            <dd>{{ invitation?._role || '—' }}</dd>
          </div>
          <div class="inv-view__fact">
            <dt>Sent</dt>
            <dd>
              {{ formatDate(invitation?.created_at) }}
              <span class="inv-view__rel">{{ relativeDay(invitation?.created_at) }}</span>
            </dd>
          </div>
          <div class="inv-view__fact">
            <dt>Expires</dt>
            <dd v-if="invitation?.is_used" class="inv-view__muted">
              Not applicable — already used
            </dd>
            <dd v-else>
              {{ formatDate(invitation?.expires_at) }}
              <span class="inv-view__rel">{{ relativeDay(invitation?.expires_at) }}</span>
            </dd>
          </div>
        </dl>

        <!-- The code sits last and largest: it is the thing a person opens this
             dialog to read out or paste into a message. -->
        <div class="inv-view__code-block">
          <div class="inv-view__code-label">Join code</div>
          <div class="inv-view__code-row">
            <code class="inv-view__code">{{ invitation?.code || 'No code issued' }}</code>
            <q-btn
              v-if="invitation?.code"
              flat
              dense
              no-caps
              size="12px"
              icon="o_content_copy"
              label="Copy"
              class="inv-view__copy"
              @click="$emit('copy', invitation)"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * One invitation in full. The old version laid eight grey tiles in a 2-column
 * grid, which repeated the email in the body under the email in the header and
 * gave "Used: No" the same weight as the join code. This orders it: state and
 * what it means, three facts, then the code.
 */
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import {
  chipClass,
  daysUntil,
  formatDate,
  inviteInitials,
  inviteState,
  relativeDay,
} from './inviteStatus'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  invitation: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'copy'])

const $q = useQuasar()

/** Rows arrive decorated from the page, but the state is recomputed here so the
 *  dialog still reads correctly if it is ever opened with a bare invite. */
const state = computed(() => props.invitation?._state ?? inviteState(props.invitation))

const statusNote = computed(() => {
  const invite = props.invitation
  if (!invite) return ''
  const left = daysUntil(invite.expires_at)
  switch (state.value.key) {
    case 'accepted':
      return 'This person has used the code and their account is active.'
    case 'expiring':
      return left === 0
        ? 'The code stops working at the end of today.'
        : `The code stops working in ${left} ${left === 1 ? 'day' : 'days'}.`
    case 'expired':
      return 'The code no longer works. Send a fresh invitation to re-invite them.'
    case 'declined':
      return 'This person declined the invitation.'
    case 'cancelled':
      return 'This invitation was withdrawn before it was used.'
    default:
      return left === null
        ? 'Waiting for this person to sign up with the code.'
        : `Waiting for this person to sign up. The code is good for ${left} more ${left === 1 ? 'day' : 'days'}.`
  }
})

const close = () => emit('update:modelValue', false)
</script>

<style scoped>
.inv-view {
  width: 460px;
  max-width: 95vw;
  border-radius: var(--dash-r-lg);
  overflow: hidden;
}

/* ── Head ── */
.inv-view__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 18px;
  background: var(--dash-brand);
}
.inv-view__avatar {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 600;
}
.inv-view__titles {
  flex: 1;
  min-width: 0;
}
.inv-view__email {
  font-size: 15.5px;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inv-view__sub {
  margin-top: 1px;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.78);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inv-view__head :deep(.q-btn) {
  color: rgba(255, 255, 255, 0.8);
  flex: none;
}
.inv-view__head :deep(.q-btn:hover) {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.15);
}

/* ── Body ── */
.inv-view__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  max-height: 68vh;
  overflow-y: auto;
}

.inv-view__status {
  display: flex;
  align-items: flex-start;
  gap: 11px;
}
.inv-view__chip {
  flex: none;
  margin-top: 1px;
}
.inv-view__status-note {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--dash-ink-2);
}

/* ── Facts ── */
.inv-view__facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 12px 14px;
  background: var(--dash-sunken);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
}
.inv-view__fact {
  min-width: 0;
}
.inv-view__fact dt {
  font-size: 10.5px;
  font-weight: 500;
  color: var(--dash-ink-4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.inv-view__fact dd {
  margin: 3px 0 0;
  font-size: 12.5px;
  color: var(--dash-ink);
  font-variant-numeric: tabular-nums;
  word-break: break-word;
}
.inv-view__rel {
  display: block;
  font-size: 11px;
  color: var(--dash-ink-4);
}
.inv-view__muted {
  color: var(--dash-ink-3) !important;
}

/* ── Code ── */
.inv-view__code-block {
  padding: 12px 14px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
}
.inv-view__code-label {
  font-size: 10.5px;
  font-weight: 500;
  color: var(--dash-ink-4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.inv-view__code-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}
.inv-view__code {
  flex: 1;
  min-width: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 15px;
  letter-spacing: 0.06em;
  color: var(--dash-ink);
  word-break: break-all;
}
.inv-view__copy {
  flex: none;
  color: var(--dash-accent);
  font-weight: 600;
}

@media (max-width: 599px) {
  .inv-view {
    width: 100%;
    border-radius: 0;
  }
  .inv-view__facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .inv-view__body {
    max-height: none;
  }
}
</style>
