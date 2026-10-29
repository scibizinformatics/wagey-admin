<template>
  <div class="issues">
    <!-- ── Head ─────────────────────────────────────────────────────────── -->
    <header class="issues__head">
      <div class="issues__head-row">
        <div class="issues__heading">
          <p class="issues__eyebrow">
            <span
              class="issues__eyebrow-dot"
              :class="{ 'issues__eyebrow-dot--alert': criticalCount || sourceErrors.length }"
            />
            Admin inbox
          </p>
          <h2 class="issues__title">Needs attention</h2>
          <p class="issues__sub">{{ subtitle }}</p>
        </div>

        <div class="issues__head-actions">
          <q-btn
            flat
            round
            dense
            icon="o_refresh"
            size="14px"
            class="issues__icon-btn"
            aria-label="Refresh needs attention"
            :loading="loading"
            @click="emit('refresh')"
          >
            <q-tooltip>Refresh</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            dense
            icon="o_close"
            size="14px"
            class="issues__icon-btn"
            aria-label="Close needs attention"
            @click="emit('close')"
          >
            <q-tooltip>Close</q-tooltip>
          </q-btn>
        </div>
      </div>

      <div
        v-if="criticalCount || warnCount || infoCount || sourceErrors.length"
        class="issues__chips"
      >
        <span v-if="sourceErrors.length" class="dash-chip dash-chip--critical">
          <span class="dash-chip__dot" />
          {{ sourceErrors.length === 1 ? 'Check Failed' : `${sourceErrors.length} Checks Failed` }}
        </span>
        <span v-if="criticalCount" class="dash-chip dash-chip--critical">
          <span class="dash-chip__dot" />
          {{ criticalCount }} may affect payroll
        </span>
        <span v-if="warnCount" class="dash-chip dash-chip--warn">
          <span class="dash-chip__dot" />
          {{ warnCount }} need review
        </span>
        <span v-if="infoCount" class="dash-chip dash-chip--info">
          <span class="dash-chip__dot" />
          {{ infoCount }} affecting staffing
        </span>
      </div>
    </header>

    <!-- ── Body ─────────────────────────────────────────────────────────── -->
    <div class="issues__body">
      <div v-if="sourceErrors.length" class="issues__errors" role="alert">
        <div class="issues__errors-head">
          <q-icon name="o_error" size="18px" />
          <span>
            {{ sourceErrors.length === 1 ? 'One check' : `${sourceErrors.length} checks` }} could
            not run
          </span>
          <q-btn
            flat
            dense
            no-caps
            size="11px"
            label="Retry"
            class="issues__error-retry"
            :loading="loading"
            @click="emit('refresh')"
          />
        </div>
        <ul class="issues__error-list">
          <li v-for="error in sourceErrors" :key="error.key">
            <span class="issues__error-label">{{ error.label }}</span>
            <span class="issues__error-msg">{{ error.message }}</span>
          </li>
        </ul>
      </div>

      <div v-if="showSkeleton" class="issues__skeleton" aria-label="Checking the workspace">
        <div v-for="n in 4" :key="n" class="issues__skeleton-row">
          <span class="issues__skeleton-icon" />
          <span class="issues__skeleton-lines">
            <span class="issues__skeleton-line" />
            <span class="issues__skeleton-line issues__skeleton-line--short" />
          </span>
        </div>
      </div>

      <div v-else-if="showEmpty" class="issues__empty">
        <span class="issues__empty-icon">
          <q-icon name="o_check_circle" size="28px" />
        </span>
        <p class="issues__empty-title">Nothing needs you</p>
        <p class="issues__empty-sub">
          Attendance, schedule, requests, payroll and access cards are clear.
        </p>
      </div>

      <section v-for="section in sections" :key="section.key" class="issues__section">
        <h3 class="issues__section-head">
          <span class="issues__section-label">
            <q-icon :name="section.icon" size="14px" />
            {{ section.label }}
          </span>
          <span class="issues__section-count">{{ section.count }}</span>
        </h3>

        <button
          v-for="item in visibleItems(section)"
          :key="item.key"
          type="button"
          class="issues__item"
          @click="emit('navigate', item)"
        >
          <span class="issues__item-icon" :class="`issues__item-icon--${item.tone}`">
            <q-icon :name="item.icon" size="17px" />
          </span>
          <span class="issues__item-text">
            <span class="issues__item-title">{{ item.title }}</span>
            <span class="issues__item-sub">{{ item.subtitle }}</span>
          </span>
          <span class="dash-chip issues__item-chip" :class="item.chipClass">
            <span class="dash-chip__dot" />
            {{ item.impact }}
          </span>
          <q-icon name="o_chevron_right" size="16px" class="issues__item-chevron" />
        </button>

        <button
          v-if="section.viewAll"
          type="button"
          class="issues__view-all"
          @click="emit('navigate', { to: section.viewAll.to })"
        >
          <span>{{ section.viewAll.label }}</span>
          <q-icon name="o_arrow_forward" size="14px" />
        </button>
      </section>
    </div>

    <!-- ── Foot ─────────────────────────────────────────────────────────── -->
    <footer class="issues__foot">
      <span class="issues__stamp">
        <q-icon name="o_schedule" size="13px" />
        {{ lastCheckedLabel }}
      </span>
      <button
        type="button"
        class="issues__refresh-link"
        :disabled="loading"
        @click="emit('refresh')"
      >
        {{ loading ? 'Checking…' : 'Refresh' }}
      </button>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const MAX_ITEMS = 4

const props = defineProps({
  sections: { type: Array, default: () => [] },
  sourceErrors: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  hasDetails: { type: Boolean, default: false },
  lastUpdated: { type: Number, default: null },
})

const emit = defineEmits(['close', 'refresh', 'navigate'])

/**
 * Attendance and manning cap the visible rows at four and offer the rest
 * through "View all". The grouped sections (requests, payroll, access cards)
 * have no such link — hiding a whole group there would hide its count with it,
 * so they render every group and let the body scroll.
 */
function visibleItems(section) {
  return section.viewAll ? section.items.slice(0, MAX_ITEMS) : section.items
}

const totalCount = computed(() => props.sections.reduce((sum, section) => sum + section.count, 0))

function countTone(items, tone) {
  return items.reduce((sum, item) => (item.tone === tone ? sum + (item.count ?? 1) : sum), 0)
}

const criticalCount = computed(() =>
  props.sections.reduce((sum, section) => sum + countTone(section.items, 'critical'), 0),
)
const warnCount = computed(() =>
  props.sections.reduce((sum, section) => sum + countTone(section.items, 'warn'), 0),
)
const infoCount = computed(() =>
  props.sections.reduce((sum, section) => sum + countTone(section.items, 'info'), 0),
)

const subtitle = computed(() => {
  if (!props.hasDetails) {
    return props.loading
      ? 'Checking attendance, schedule, requests, payroll and access cards…'
      : 'Open to check the workspace.'
  }

  const parts = []
  if (totalCount.value) parts.push(`${totalCount.value} open`)
  if (criticalCount.value) parts.push(`${criticalCount.value} may affect payroll`)
  if (props.sourceErrors.length) {
    parts.push(
      `${props.sourceErrors.length} ${props.sourceErrors.length === 1 ? 'check' : 'checks'} failed`,
    )
  }
  if (props.loading) parts.push('Refreshing…')
  if (!parts.length) return 'Everything is clear.'
  return parts.join(' · ')
})

const showSkeleton = computed(() => props.loading && (!props.hasDetails || !props.sections.length))
const showEmpty = computed(
  () => !props.loading && props.hasDetails && !props.sections.length && !props.sourceErrors.length,
)

const lastCheckedLabel = computed(() => {
  if (!props.lastUpdated) return 'Not checked yet'
  const time = new Date(props.lastUpdated).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `Checked ${time}`
})
</script>

<style scoped>
.issues {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: var(--nav-ink);
}

/* ── Head ──────────────────────────────────────────────────────────────── */
.issues__head {
  flex-shrink: 0;
  padding: 18px 16px 14px;
  border-bottom: 1px solid var(--nav-line);
}

.issues__head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.issues__heading {
  min-width: 0;
}

.issues__eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 5px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--nav-ink-3);
}

.issues__eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--nav-accent);
  flex-shrink: 0;
}

.issues__eyebrow-dot--alert {
  background: var(--dash-critical-mark);
}

.issues__title {
  margin: 0;
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--nav-ink);
}

.issues__sub {
  margin: 5px 0 0;
  max-width: 300px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--nav-ink-2);
}

.issues__head-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.issues__icon-btn.q-btn {
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  padding: 0;
  color: var(--nav-ink-3);
}

.issues__icon-btn.q-btn:hover {
  color: var(--nav-ink);
  background: var(--nav-hover);
}

.issues__icon-btn :deep(.q-focus-helper) {
  display: none;
}

.issues__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

/* ── Body ──────────────────────────────────────────────────────────────── */
.issues__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 16px 18px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
}

.issues__body::-webkit-scrollbar {
  width: 6px;
}

.issues__body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
}

/* ── Failed checks ─────────────────────────────────────────────────────── */
.issues__errors {
  margin-bottom: 12px;
  padding: 10px 11px;
  border-radius: 8px;
  border: 1px solid rgba(240, 68, 56, 0.34);
  background: rgba(194, 47, 36, 0.16);
}

.issues__errors-head {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
  color: #ffd7d3;
}

.issues__errors-head .q-icon {
  flex-shrink: 0;
  color: var(--dash-critical-mark);
}

.issues__error-retry {
  margin-left: auto;
  color: #ffd7d3;
  font-weight: 600;
}

.issues__error-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.issues__error-list li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 25px;
  font-size: 11.5px;
  line-height: 1.4;
}

.issues__error-label {
  color: var(--nav-ink);
  font-weight: 600;
}

.issues__error-msg {
  color: var(--nav-ink-2);
  overflow-wrap: anywhere;
}

/* ── Sections ──────────────────────────────────────────────────────────── */
.issues__section {
  padding-top: 14px;
  margin-top: 14px;
  border-top: 1px solid var(--nav-line);
}

.issues__section:first-of-type {
  padding-top: 0;
  margin-top: 0;
  border-top: 0;
}

.issues__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 0 0 8px;
}

.issues__section-label {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--nav-ink-3);
}

.issues__section-count {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--nav-ink-2);
  font-size: 10.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* ── Items ─────────────────────────────────────────────────────────────── */
.issues__item {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 16px;
  grid-template-areas:
    'icon text chevron'
    'icon chip chevron';
  gap: 2px 10px;
  width: calc(100% + 12px);
  margin: 0 -6px;
  padding: 8px 6px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s var(--dash-ease);
}

.issues__item:hover {
  background: var(--nav-hover);
}

.issues__item:focus-visible {
  outline: 2px solid var(--nav-accent);
  outline-offset: 1px;
}

.issues__item-icon {
  grid-area: icon;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--nav-ink-2);
  align-self: start;
}

.issues__item-icon--critical {
  color: var(--dash-critical-mark);
  background: rgba(240, 68, 56, 0.13);
}

.issues__item-icon--warn {
  color: var(--dash-warn-mark);
  background: rgba(245, 158, 11, 0.13);
}

.issues__item-icon--info {
  color: var(--dash-info-mark);
  background: rgba(59, 130, 246, 0.13);
}

.issues__item-text {
  grid-area: text;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.issues__item-title {
  overflow: hidden;
  color: var(--nav-ink);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.issues__item-sub {
  display: -webkit-box;
  overflow: hidden;
  color: var(--nav-ink-2);
  font-size: 11.5px;
  line-height: 1.4;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.issues__item-chip {
  grid-area: chip;
  justify-self: start;
  margin-top: 4px;
  max-width: 100%;
}

.issues__item-chevron {
  grid-area: chevron;
  align-self: center;
  color: var(--nav-ink-3);
}

.issues__view-all {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  margin-top: 5px;
  padding: 8px 6px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--nav-accent);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.issues__view-all:hover {
  background: var(--nav-hover);
}

.issues__view-all:focus-visible {
  outline: 2px solid var(--nav-accent);
  outline-offset: 1px;
}

/* ── Empty / loading ───────────────────────────────────────────────────── */
.issues__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 46px 18px 34px;
  text-align: center;
}

.issues__empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.14);
  color: var(--dash-good-mark);
}

.issues__empty-title {
  margin: 3px 0 0;
  color: var(--nav-ink);
  font-size: 14px;
  font-weight: 600;
}

.issues__empty-sub {
  max-width: 230px;
  margin: 0;
  color: var(--nav-ink-2);
  font-size: 12px;
  line-height: 1.45;
}

.issues__skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 2px;
}

.issues__skeleton-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 6px;
}

.issues__skeleton-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.07);
}

.issues__skeleton-lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  padding-top: 2px;
}

.issues__skeleton-line {
  width: 64%;
  height: 9px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.09);
  animation: issues-pulse 1.4s ease-in-out infinite;
}

.issues__skeleton-line--short {
  width: 38%;
}

@keyframes issues-pulse {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 0.9;
  }
}

@media (prefers-reduced-motion: reduce) {
  .issues__skeleton-line {
    animation: none;
  }
}

/* ── Foot ──────────────────────────────────────────────────────────────── */
.issues__foot {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 16px;
  border-top: 1px solid var(--nav-line);
  background: rgba(0, 0, 0, 0.12);
  color: var(--nav-ink-3);
  font-size: 11px;
}

.issues__stamp {
  display: flex;
  align-items: center;
  gap: 5px;
}

.issues__refresh-link {
  padding: 4px 6px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--nav-ink-2);
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.issues__refresh-link:hover:not(:disabled) {
  color: var(--nav-ink);
  background: var(--nav-hover);
}

.issues__refresh-link:disabled {
  opacity: 0.55;
  cursor: default;
}
</style>
