<template>
  <section :class="['dash-panel', toneClass]">
    <header v-if="title || $slots.actions" class="dash-panel__head">
      <q-icon v-if="icon" :name="icon" size="17px" class="dash-panel__icon" />
      <div class="dash-panel__titles">
        <h3 class="dash-title dash-panel__heading">{{ title }}</h3>
        <p v-if="subtitle" class="dash-panel__subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="dash-panel__actions">
        <slot name="actions" />
      </div>
    </header>

    <div :class="['dash-panel__body', bodyClass]">
      <!-- Loading takes precedence over empty: an empty state shown while data is
           still in flight reads as 'there is nothing', which is a lie. -->
      <slot v-if="loading" name="skeleton">
        <DashSkeleton :variant="skeleton" :rows="skeletonRows" />
      </slot>

      <div v-else-if="empty" class="dash-empty">
        <span class="dash-featured-icon" :class="emptyTone ? `dash-featured-icon--${emptyTone}` : ''">
          <q-icon :name="emptyIcon" size="20px" />
        </span>
        <p class="dash-empty__title">{{ emptyTitle }}</p>
        <p v-if="emptySub" class="dash-empty__sub">{{ emptySub }}</p>
        <slot name="empty-action" />
      </div>

      <slot v-else />
    </div>

    <!-- The footer is chrome for the body's rows — a total or a pager — so it
         goes away with them rather than sitting under a skeleton or an empty
         state, where it would state a figure for rows that are not there. -->
    <footer v-if="$slots.footer && !loading && !empty" class="dash-panel__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script setup>
/**
 * The single card chrome every dashboard surface is built from.
 *
 * Before this existed each of the ~25 panels under components/pages/Dashboard/
 * repeated its own `.panel / .panel-head / .panel-icon / .panel-title /
 * .panel-body` block with literal hex values, plus its own copy of the skeleton
 * keyframes and its own empty state. This centralises all four.
 *
 * `tone` is semantic, not decorative: it drives the head icon colour and a 2px
 * top edge rule. The default `neutral` tone draws no rule at all — a panel that
 * carries no signal should not look like it does.
 */
import { computed } from 'vue'
import DashSkeleton from '@/components/pages/Dashboard/DashSkeleton.vue'

const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: '' },
  /** neutral | accent | good | warn | critical */
  tone: { type: String, default: 'neutral' },
  loading: { type: Boolean, default: false },
  /** Render the empty state instead of the default slot. */
  empty: { type: Boolean, default: false },
  emptyIcon: { type: String, default: 'inbox' },
  emptyTitle: { type: String, default: 'Nothing to show' },
  emptySub: { type: String, default: '' },
  /** '' | 'good' — tints the featured icon when empty is the *desired* state. */
  emptyTone: { type: String, default: '' },
  /** Skeleton shape while loading: lines | table | chart | tiles */
  skeleton: { type: String, default: 'lines' },
  skeletonRows: { type: Number, default: 5 },
  /** Drop body padding — for panels whose child owns its own edges (tables). */
  flush: { type: Boolean, default: false },
  /** Let the body scroll rather than grow the panel. */
  scroll: { type: Boolean, default: false },
})

const toneClass = computed(() => `dash-panel--${props.tone}`)
const bodyClass = computed(() => ({
  'dash-panel__body--flush': props.flush,
  'dash-panel__body--scroll': props.scroll,
}))
</script>

<style scoped>
/* The panel chrome itself lives in src/css/dashboard.scss so that child panels
   can compose against the same classes. Only the heading reset is local. */
.dash-panel__heading {
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dash-panel__subtitle {
  margin: 0;
}
</style>
