<template>
  <div class="guide">
    <button
      type="button"
      class="guide__toggle dash-focusable"
      :aria-expanded="open"
      aria-controls="today-guide-terms"
      @click="open = !open"
    >
      <q-icon :name="open ? 'expand_less' : 'expand_more'" size="15px" />
      <span>What these figures mean</span>
    </button>

    <q-slide-transition>
      <dl v-show="open" id="today-guide-terms" class="guide__terms">
        <div v-for="term in TERMS" :key="term.name" class="guide__term">
          <dt class="guide__name">
            <span class="dash-swatch" :style="{ background: term.color }" />
            {{ term.name }}
          </dt>
          <dd class="guide__desc">{{ term.desc }}</dd>
        </div>
      </dl>
    </q-slide-transition>
  </div>
</template>

<script setup>
/**
 * Glossary for the Today tab's headline figures.
 *
 * This used to occupy a full panel slot in the grid, equal in weight to the
 * live data beside it — a static legend competing with the work. It is a
 * footnote, so it now reads as one: a collapsed strip at the foot of the tab
 * that expands on demand. No content was dropped.
 */
import { ref } from 'vue'

const open = ref(false)

const TERMS = [
  { name: 'Scheduled', color: 'var(--dash-cat-1)', desc: 'Employees expected on shift today.' },
  { name: 'Clocked in', color: 'var(--dash-cat-2)', desc: 'Employees who have recorded a time in.' },
  { name: 'Needs attention', color: 'var(--dash-warn-mark)', desc: 'Items waiting on your review.' },
  { name: 'Pending requests', color: 'var(--dash-cat-4)', desc: 'Open leave, overtime and cash advance requests.' },
  { name: 'Est. payroll', color: 'var(--dash-cat-3)', desc: "Projected payroll cost for today's attendance." },
]
</script>

<style scoped>
.guide {
  border-top: 1px solid var(--dash-line);
  padding-top: 10px;
}

.guide__toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  padding: 2px 0;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-3);
  transition: color var(--dash-fast) var(--dash-ease);
}
.guide__toggle:hover {
  color: var(--dash-ink-2);
}

.guide__terms {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 8px 22px;
  margin: 10px 0 0;
}

.guide__term {
  min-width: 0;
}

.guide__name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dash-ink);
  margin: 0;
}

.guide__desc {
  margin: 2px 0 0 16px;
  font-size: 12.5px;
  color: var(--dash-ink-3);
  line-height: 1.5;
}
</style>
