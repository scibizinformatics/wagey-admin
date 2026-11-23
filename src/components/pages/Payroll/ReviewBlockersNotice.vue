<template>
  <div v-if="visible" class="review-blockers" role="status">
    <q-icon name="o_gpp_maybe" size="18px" class="review-blockers__icon" />

    <div class="review-blockers__body">
      <p class="review-blockers__title">{{ title }}</p>
      <p class="review-blockers__text">{{ sentence }}</p>
      <p v-if="message" class="review-blockers__text review-blockers__text--quiet">
        {{ message }}
      </p>
      <p v-if="warning" class="review-blockers__warning">{{ warning }}</p>
    </div>

    <div class="review-blockers__actions">
      <q-btn
        v-for="link in links"
        :key="link.key"
        unelevated
        no-caps
        dense
        :label="link.label"
        :to="link.to"
        class="review-blockers__btn"
      />
      <q-btn
        v-if="!checking"
        flat
        no-caps
        dense
        icon="o_refresh"
        label="Recheck"
        class="review-blockers__recheck"
        :loading="loading"
        @click="$emit('recheck')"
      />
    </div>
  </div>
</template>

<script setup>
/**
 * Why the Review step cannot move, with the way to fix it.
 *
 * The counts come from two places — the leave/overtime queues read ahead of the
 * action, and the server's own blocker payload when a write is refused — so the
 * component takes a flat list of `{ key, label, count }` and never decides what
 * is a blocker. It only words and links it.
 *
 * Sentences are built here rather than in the page for the same reason the
 * confirm builders live beside their dialogs: the strip is the one surface that
 * has to agree with the disabled buttons and the confirm notes about how many
 * people are held and why.
 */
import { computed } from 'vue'
import { blockerCountsSentence, canonicalBlockerType } from 'src/composables/utils/reviewBlockers'

const props = defineProps({
  /** `{ key, label, count }` — label is the singular noun, e.g. "leave request". */
  counts: { type: Array, default: () => [] },
  /** Employees the server pinned that the pre-emptive counts do not explain. */
  heldCount: { type: Number, default: 0 },
  /** The server's own refusal sentence, when it sent one. */
  message: { type: String, default: '' },
  /** A failed check, worded by the page. Shown without pretending the run is clear. */
  warning: { type: String, default: '' },
  /** The first check is still in flight; the actions are held until it answers. */
  checking: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

defineEmits(['recheck'])

const ROUTES = {
  leave: { label: 'Open leave', tab: 'leave' },
  overtime: { label: 'Open overtime', tab: 'overtime' },
  compensable: { label: 'Open compensable', tab: 'compensable' },
  cash_advance: { label: 'Open advances', tab: 'cash_advance' },
  schedule_swap: { label: 'Open swaps', tab: 'swap' },
  attendance: { label: 'Open attendance', path: '/app/attendance' },
}

const title = computed(() => {
  if (props.checking && !props.counts.length && !props.heldCount && !props.warning) {
    return 'Checking pending approvals'
  }
  if (props.warning && !props.counts.length && !props.heldCount) {
    return 'Could not check pending approvals'
  }
  return 'Payslips on hold'
})

const sentence = computed(() => {
  const phrase = blockerCountsSentence(props.counts)
  if (phrase) {
    const verb =
      props.counts.reduce((sum, entry) => sum + (Number(entry?.count) || 0), 0) > 1
        ? 'need'
        : 'needs'
    return `Reviewing and releasing are on hold: ${phrase} ${verb} a decision for employees in this run. Settle them, then recheck.`
  }
  if (props.heldCount > 0) {
    const noun = props.heldCount === 1 ? 'employee' : 'employees'
    return `${props.heldCount} ${noun} in this run ${props.heldCount === 1 ? 'is' : 'are'} on hold — the server reported pending requests when the last action was attempted.`
  }
  if (props.checking) {
    return 'Checking leave and overtime requests for pending approvals…'
  }
  return ''
})

const links = computed(() => {
  const seen = new Set()
  const result = []
  for (const entry of props.counts) {
    const route = ROUTES[canonicalBlockerType(entry?.key)]
    if (!route) continue
    const to = route.tab
      ? { path: '/app/requests', query: { tab: route.tab } }
      : { path: route.path }
    const key = `${to.path}|${route.tab ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ key, label: route.label, to })
  }
  return result
})

const visible = computed(() =>
  Boolean(
    props.checking || props.counts.length || props.heldCount > 0 || props.warning || props.message,
  ),
)
</script>

<style scoped>
/* Same construction as the shell's cash-advance pause notice: a state of the
   step rather than an error, so the quiet warn surface carries it and the
   actions wear the app's navy button. */
.review-blockers {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--dash-warn-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-warn-bg);
  font-size: 13px;
  color: var(--dash-ink-2);
}

.review-blockers__icon {
  color: var(--dash-warn-mark);
  flex-shrink: 0;
  margin-top: 1px;
}

.review-blockers__body {
  flex: 1;
  min-width: 0;
}

.review-blockers__title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
}

.review-blockers__text {
  margin: 2px 0 0;
  line-height: 1.45;
}

/* The server's own sentence can be long; it recedes under the counts so the
   reader leads with the number they have to act on. */
.review-blockers__text--quiet {
  font-size: 12.5px;
  color: var(--dash-ink-3);
}

.review-blockers__warning {
  margin: 4px 0 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--dash-warn-mark);
}

.review-blockers__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.review-blockers__btn {
  height: 30px;
  padding: 0 12px;
  border-radius: var(--dash-r-md);
  background: var(--dash-brand);
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs);
}
.review-blockers__btn:hover {
  background: #193d5c;
}

.review-blockers__recheck {
  height: 30px;
  padding: 0 8px;
  border-radius: var(--dash-r-md);
  color: var(--dash-ink-3);
  font-size: 12.5px;
  font-weight: 500;
}
.review-blockers__recheck:hover {
  background: rgba(146, 64, 14, 0.08);
  color: var(--dash-ink);
}

@media (max-width: 900px) {
  .review-blockers {
    flex-wrap: wrap;
  }
  .review-blockers__actions {
    width: 100%;
    padding-left: 28px;
  }
}
</style>
