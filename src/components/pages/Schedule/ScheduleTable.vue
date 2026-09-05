<template>
  <div class="grid-wrap" :class="{ 'is-loading': loading }">
    <div v-if="loading" class="grid-loading">
      <q-spinner size="34px" :style="{ color: 'var(--dash-accent)' }" />
    </div>

    <div class="grid" :style="gridStyle" role="table" aria-label="Weekly schedule">
      <!-- ── Header: day name, date, and that day's totals ────────────────── -->
      <div class="grid__corner cell cell--head" role="columnheader">
        <span class="grid__corner-label">Employee</span>
      </div>

      <div
        v-for="(day, i) in days"
        :key="`h-${i}`"
        class="cell cell--head day-head"
        :class="{ 'day-head--today': isToday(i), 'day-head--weekend': isWeekend(i) }"
        role="columnheader"
      >
        <div class="day-head__top">
          <span class="day-head__name">{{ day }}</span>
          <span class="day-head__date dash-num">{{ dateNumber(i) }}</span>
        </div>
        <!-- Per-day roll-up. A scheduler's first question is "is Thursday
             covered?", which a bare column of day names cannot answer. -->
        <div class="day-head__totals">
          <span v-if="dayTotals[i].shifts">
            {{ dayTotals[i].shifts }} {{ dayTotals[i].shifts === 1 ? 'shift' : 'shifts' }}
            <span class="day-head__hours dash-num">· {{ formatHours(dayTotals[i].hours) }}</span>
          </span>
          <span v-else class="day-head__empty">Unassigned</span>
        </div>
      </div>

      <!-- ── Rows ─────────────────────────────────────────────────────────── -->
      <template v-for="user in users" :key="user.id">
        <div class="cell cell--who" role="rowheader">
          <q-avatar v-if="avatarOf(user)" size="30px" class="who__avatar">
            <img :src="avatarOf(user)" alt="" loading="lazy" @error="onAvatarError(user)" />
          </q-avatar>
          <q-avatar v-else size="30px" class="who__avatar" :style="{ background: getAvatarColor(user.name) }">
            <span class="who__initials">{{ getInitials(user.name) }}</span>
          </q-avatar>
          <div class="who__block">
            <span class="who__name" :title="user.name">{{ user.name }}</span>
            <span class="who__total dash-num">
              {{ userTotals[user.id]?.shifts || 0 }} ·
              {{ formatHours(userTotals[user.id]?.hours || 0) }}
            </span>
          </div>
          <q-spinner
            v-if="refreshingRowUserId === user.id"
            size="13px"
            class="who__spinner"
            :style="{ color: 'var(--dash-accent)' }"
          />
        </div>

        <div
          v-for="(day, dayIdx) in days"
          :key="`${user.id}-${dayIdx}`"
          class="cell cell--day"
          :class="{ 'cell--today': isToday(dayIdx), 'cell--weekend': isWeekend(dayIdx) }"
          role="cell"
        >
          <!-- Leave and day off -->
          <div
            v-for="element in cellFor(user.id, dayIdx).special"
            :key="element.id"
            class="chip"
            :class="element.isLeave ? 'chip--leave' : 'chip--off'"
          >
            <template v-if="element.isLeave">
              <div class="chip__row">
                <q-icon name="o_beach_access" size="13px" />
                <span class="chip__title">{{ element.leaveTypeName }}</span>
              </div>
            </template>
            <template v-else>
              <div class="chip__row">
                <q-icon name="o_event_busy" size="13px" />
                <span class="chip__title">Day off</span>
              </div>
              <div class="chip__tools">
                <q-btn flat dense round icon="o_swap_horiz" size="9px" class="chip__tool" @click="$emit('open-reassign', element)">
                  <q-tooltip>Reassign day off</q-tooltip>
                </q-btn>
              </div>
            </template>
          </div>

          <!-- One card per day, however many shifts it holds. A two-shift day
               merges into a single chip that lists both legs, so the cell holds
               one object rather than two competing ones — and the dual-shift
               edge colour plus the second leg both say "twice today".

               Each leg prints its own time and site. The shift type's name is
               left off: it is typically the same range written another way
               ("10am-2pm (4 Hours, No Break)"), which alongside 10:00–14:00 said
               one thing twice. It stays in the tooltip when informative. -->
          <div
            v-if="cellFor(user.id, dayIdx).working.length"
            class="chip chip--shift"
            :style="shiftChipTone(isDualCell(user.id, dayIdx))"
          >
            <div
              v-for="(shift, si) in cellFor(user.id, dayIdx).working"
              :key="shift.id"
              class="leg"
              :class="{ 'leg--next': si > 0 }"
            >
              <span class="chip__time dash-num">{{ shift.startTime }}–{{ shift.endTime }}</span>
              <span v-if="siteName(shift.site, shift)" class="chip__site">
                <q-icon name="o_location_on" size="11px" />
                <span class="chip__site-name">{{ siteName(shift.site, shift) }}</span>
              </span>
            </div>

            <!-- Also carries full site names, which the card truncates in a
                 narrow day column. -->
            <q-tooltip v-if="cellDetail(user.id, dayIdx)" :delay="350" class="chip-tip">
              {{ cellDetail(user.id, dayIdx) }}
            </q-tooltip>

            <div class="chip__tools">
              <q-btn
                flat dense round icon="o_swap_horiz" size="9px" class="chip__tool"
                @click="onReassign(user.id, dayIdx)"
              >
                <q-tooltip>
                  {{ isDualCell(user.id, dayIdx) ? 'Update shifts' : 'Update shift' }}
                </q-tooltip>
              </q-btn>
              <q-btn
                flat dense round icon="o_event_busy" size="9px" class="chip__tool"
                :loading="assigningDayOffId === cellTargetId(user.id, dayIdx)"
                :disable="assigningDayOffId === cellTargetId(user.id, dayIdx)"
                @click.stop="onDayOff(user.id, dayIdx)"
              >
                <q-tooltip>
                  {{
                    isDualCell(user.id, dayIdx) ? 'Assign day off (both)' : 'Assign day off'
                  }}
                </q-tooltip>
              </q-btn>
            </div>
          </div>

          <!-- Empty day: one quiet target that reveals the three ways to fill
               it. The previous grid stacked all three buttons permanently in
               every empty cell, which on a 20 x 7 grid meant up to 420 buttons
               competing with the shifts they surrounded. -->
          <template v-if="!hasShifts(user.id, dayIdx)">
            <button
              type="button"
              class="add"
              :class="{ 'add--busy': quickActionLoading?.startsWith(`${user.id}-${dayIdx}-`) }"
              :aria-label="`Add for ${user.name} on ${days[dayIdx]}`"
            >
              <q-spinner v-if="quickActionLoading?.startsWith(`${user.id}-${dayIdx}-`)" size="13px" />
              <q-icon v-else name="add" size="15px" />

              <q-menu anchor="bottom middle" self="top middle" :offset="[0, 4]" class="add-menu">
                <q-list dense class="add-menu__list">
                  <q-item v-close-popup clickable class="add-menu__item" @click="$emit('open-quick-add', user.id, dayIdx)">
                    <q-item-section avatar><q-icon name="o_more_time" size="16px" /></q-item-section>
                    <q-item-section>Add shift</q-item-section>
                  </q-item>

                  <q-item v-close-popup clickable class="add-menu__item" @click="$emit('quick-direct-assign', user.id, dayIdx, 'dayoff')">
                    <q-item-section avatar><q-icon name="o_event_busy" size="16px" /></q-item-section>
                    <q-item-section>Day off</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </button>
          </template>
        </div>
      </template>

      <!-- ── Empty ─────────────────────────────────────────────────────────── -->
      <div v-if="!users.length && !loading" class="grid__empty">
        <div class="dash-empty">
          <span class="dash-featured-icon">
            <q-icon :name="isFiltered ? 'filter_alt_off' : 'o_calendar_month'" size="20px" />
          </span>
          <p class="dash-empty__title">
            {{ isFiltered ? 'No employees match these filters' : 'No employees to schedule' }}
          </p>
          <!-- Filtering by payout group only matches employees whose active
               contract names that group, so saying so turns a blank week from a
               apparent bug into an explanation. -->
          <p class="dash-empty__sub">
            {{
              isFiltered
                ? 'Only employees whose active contract is assigned to this payout group appear here. Clear the filter to see everyone.'
                : 'Add employees before building a week.'
            }}
          </p>
          <q-btn
            v-if="isFiltered"
            outline
            no-caps
            dense
            size="12px"
            icon="filter_alt_off"
            label="Clear filters"
            class="empty-btn"
            @click="$emit('clear-filters')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * The weekly scheduler grid — employees down, days across.
 *
 * Props and emits are unchanged from the previous table so the 1600-line page
 * driving it did not have to be rewired; what changed is everything the grid
 * shows and how it is laid out:
 *
 *  - CSS grid with a sticky employee column and sticky header, instead of a
 *    plain <table> that scrolled the names out of view along with the days.
 *  - Day headers carry the date and that day's shift/hour totals.
 *  - The employee column carries each person's weekly total.
 *  - Shift cards are tinted by shift type, so one job reads as one colour down
 *    a column.
 *  - Empty cells offer a single hover target rather than three stacked buttons.
 */
import { computed, reactive } from 'vue'
import {
  shiftHours,
  formatHours,
  isDayOff,
  splitDayShifts,
  getInitials,
  getAvatarColor,
  shiftChipTone,
  isSameDate,
} from '@/composables/utils/schedule'

const props = defineProps({
  users: { type: Array, default: () => [] },
  shifts: { type: Array, default: () => [] },
  days: { type: Array, default: () => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  /** Seven Date objects for the week on screen, Monday first. */
  weekDates: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  quickActionLoading: { type: String, default: null },
  assigningDayOffId: { type: String, default: null },
  sites: { type: Array, default: () => [] },
  shiftTypes: { type: Array, default: () => [] },
  refreshingRowUserId: { type: [Number, String], default: null },
  /** Drives which empty state to show when no employees match. */
  isFiltered: { type: Boolean, default: false },
})

const emit = defineEmits([
  'open-quick-add',
  'open-reassign',
  'assign-dayoff',
  'assign-dual-dayoff',
  'quick-direct-assign',
  'clear-filters',
])

// ─── Avatars ────────────────────────────────────────────────────────────────
// A photo that 404s renders as an empty circle, and down a column of them that
// reads as broken layout rather than as a missing picture. The first failure for
// a given URL drops that row back to its initials, which is what the rest of the
// app already shows for someone with no photo at all.
const brokenAvatars = reactive(new Set())

const avatarOf = (user) => (user.photo && !brokenAvatars.has(user.photo) ? user.photo : '')

function onAvatarError(user) {
  if (user.photo) brokenAvatars.add(user.photo)
}

const gridStyle = computed(() => ({
  gridTemplateColumns: `var(--who-w) repeat(${props.days.length}, minmax(var(--day-w), 1fr))`,
}))

// ─── Lookups ────────────────────────────────────────────────────────────────
const positionName = (id) => props.shiftTypes.find((p) => p.id === id)?.name || id || '—'

function siteName(siteId, shift = null) {
  if (!siteId) return null
  if (shift?.siteName) return shift.siteName
  const id = typeof siteId === 'number' ? siteId : parseInt(siteId)
  return props.sites.find((s) => s.id === id)?.name || null
}

const dayOff = (shift) => isDayOff(shift, positionName(shift?.position))

/**
 * Shift type and site, for the card's tooltip.
 *
 * The type name is skipped when it is just the same times in another format —
 * "10am-2pm (4 Hours, No Break)" against a 10:00–14:00 card adds nothing. The
 * test is loose on purpose: any name that leads with a clock time is treated as
 * a restatement.
 */
const looksLikeTimeRange = (name) => /^\s*\d{1,2}\s*(:\d{2})?\s*(am|pm)?\s*[-–—]/i.test(name ?? '')

function shiftDetail(shift) {
  const parts = []
  const type = positionName(shift.position)
  if (type && type !== '—' && !looksLikeTimeRange(type)) parts.push(type)
  const site = siteName(shift.site, shift)
  if (site) parts.push(site)
  return parts.join(' · ')
}

// ─── Cell-level actions ─────────────────────────────────────────────────────
// A day's card acts on the whole day. For two shifts that means the group
// element, which is what openReassignModal's dual branch and assignDualDayOff
// both require — they read `.shifts` off it. Passing a lone shift there would
// silently fall through to the single-shift path and lose the dual editor.
function cellTarget(userId, dayIdx) {
  const cell = cellFor(userId, dayIdx)
  return cell.group ?? cell.working[0] ?? null
}

const isDualCell = (userId, dayIdx) => cellFor(userId, dayIdx).working.length > 1
const cellTargetId = (userId, dayIdx) => cellTarget(userId, dayIdx)?.id ?? null

function onReassign(userId, dayIdx) {
  const target = cellTarget(userId, dayIdx)
  if (target) emit('open-reassign', target)
}

function onDayOff(userId, dayIdx) {
  const cell = cellFor(userId, dayIdx)
  if (cell.group) emit('assign-dual-dayoff', cell.group)
  else if (cell.working[0]) emit('assign-dayoff', cell.working[0])
}

/** Tooltip for the whole card: each leg's detail, deduplicated. */
function cellDetail(userId, dayIdx) {
  const seen = []
  for (const shift of cellFor(userId, dayIdx).working) {
    const detail = shiftDetail(shift)
    if (detail && !seen.includes(detail)) seen.push(detail)
  }
  return seen.join(' / ')
}

// ─── Shift indexing ─────────────────────────────────────────────────────────
// One pass into a `${userId}-${day}` map. The old grid ran a full filter over
// every shift for each of the 140 cells it rendered.
const byCell = computed(() => {
  const map = new Map()
  for (const shift of props.shifts) {
    const key = `${shift.userId}-${shift.day}`
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(shift)
  }
  return map
})

const cellShifts = (userId, dayIdx) => byCell.value.get(`${userId}-${dayIdx}`) ?? []
const hasShifts = (userId, dayIdx) => cellShifts(userId, dayIdx).length > 0

// Split once per cell and memoised for the render pass. The template reads this
// several times per cell (working list, its length, the group action), and
// re-splitting on each read would repeat the sort 140+ times a frame.
const cellCache = computed(() => {
  const map = new Map()
  for (const user of props.users) {
    for (let dayIdx = 0; dayIdx < props.days.length; dayIdx++) {
      const key = `${user.id}-${dayIdx}`
      map.set(key, splitDayShifts(byCell.value.get(key) ?? [], positionName))
    }
  }
  return map
})

const EMPTY_CELL = { special: [], working: [], group: null }
const cellFor = (userId, dayIdx) => cellCache.value.get(`${userId}-${dayIdx}`) ?? EMPTY_CELL

// ─── Totals ─────────────────────────────────────────────────────────────────
/** Working shifts only — leave and days off are not coverage. */
function isWorking(shift) {
  return !shift.isLeave && !dayOff(shift)
}

const dayTotals = computed(() =>
  props.days.map((_, dayIdx) => {
    let shiftCount = 0
    let hours = 0
    for (const shift of props.shifts) {
      if (shift.day !== dayIdx || !isWorking(shift)) continue
      shiftCount += 1
      hours += shiftHours(shift)
    }
    return { shifts: shiftCount, hours }
  }),
)

const userTotals = computed(() => {
  const out = {}
  for (const user of props.users) out[user.id] = { shifts: 0, hours: 0 }
  for (const shift of props.shifts) {
    const bucket = out[shift.userId]
    if (!bucket || !isWorking(shift)) continue
    bucket.shifts += 1
    bucket.hours += shiftHours(shift)
  }
  return out
})

// ─── Dates ──────────────────────────────────────────────────────────────────
const todayDate = new Date()

const dateNumber = (i) => props.weekDates[i]?.getDate() ?? ''
const isToday = (i) => (props.weekDates[i] ? isSameDate(props.weekDates[i], todayDate) : false)
const isWeekend = (i) => {
  const d = props.weekDates[i]
  if (!d) return false
  const dow = d.getDay()
  return dow === 0 || dow === 6
}

// Chip class and rail are applied directly in the template now that the three
// kinds render from separate loops — `special` knows it is leave or a day off,
// and a working card's rail depends only on how many shifts share its cell.
</script>

<style scoped>
/* ── Frame ──────────────────────────────────────────────────────────────────
   Horizontal scrolling only. The grid has no height cap, so it grows to show
   every row the page size asks for — 20 per page renders 20 rows — and the page
   scrolls rather than an inner scrollbar hiding most of them.

   The employee column stays pinned while the days scroll sideways, which is the
   part of the pinning that matters: it keeps the row you are reading identified
   across a wide week. */
.grid-wrap {
  position: relative;
  overflow-x: auto;
  --who-w: 208px;
  --day-w: 132px;
}
.grid-wrap.is-loading {
  min-height: 220px;
}

.grid-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.68);
  z-index: 6;
}

.grid {
  display: grid;
  min-width: min-content;
}

/* ── Cells ── */
.cell {
  min-width: 0;
  border-right: 1px solid var(--dash-line-soft);
  border-bottom: 1px solid var(--dash-line-soft);
}
.cell:last-child {
  border-right: none;
}

/* No `top: 0` sticky here: with the grid unconstrained in height it never
   scrolls vertically, so a vertical sticky would be inert. */
.cell--head {
  background: var(--dash-surface);
  border-bottom: 1px solid var(--dash-line);
}

/* The corner sits in the header row and is pinned left, so it has to outrank the
   day headers it slides over. */
.grid__corner {
  position: sticky;
  left: 0;
  z-index: 4;
  display: flex;
  align-items: flex-end;
  padding: 10px 14px;
  background: var(--dash-surface);
  border-bottom: 1px solid var(--dash-line);
}
.grid__corner-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--dash-ink-3);
}

/* ── Day header ── */
.day-head {
  padding: 9px 12px 10px;
  text-align: center;
}
.day-head--weekend {
  background: var(--dash-n-25);
}
.day-head--today {
  background: var(--dash-accent-bg);
  box-shadow: inset 0 -2px 0 var(--dash-accent);
}

.day-head__top {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
}
.day-head__name {
  font-size: 12px;
  font-weight: 500;
  color: var(--dash-ink-3);
}
.day-head--today .day-head__name {
  color: var(--dash-accent);
}
.day-head__date {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--dash-ink);
}
.day-head--today .day-head__date {
  color: var(--dash-accent);
}

.day-head__totals {
  margin-top: 3px;
  font-size: 11px;
  color: var(--dash-ink-4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.day-head__hours {
  color: var(--dash-ink-3);
}
.day-head__empty {
  color: var(--dash-n-400);
}

/* ── Employee column ── */
.cell--who {
  position: sticky;
  left: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--dash-surface);
  border-right: 1px solid var(--dash-line);
}

.who__avatar {
  flex-shrink: 0;
}
.who__avatar img {
  width: 100%;
  height: 100%;
  /* Cover, not contain: a portrait that does not match the circle should be
     cropped rather than letterboxed against the card behind it. */
  object-fit: cover;
}
.who__initials {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}

.who__block {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.who__name {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* The week total per person, which is what makes over- and under-scheduling
   visible without adding a column. */
.who__total {
  font-size: 11.5px;
  color: var(--dash-ink-4);
}

.who__spinner {
  flex-shrink: 0;
}

/* ── Day cells ── */
.cell--day {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  min-height: 64px;
}
.cell--weekend {
  background: var(--dash-n-25);
}
.cell--today {
  background: rgba(46, 79, 212, 0.035);
}

/* ── Shift chips ──────────────────────────────────────────────────────────────
   A softly tinted card whose whole edge carries the colour, rather than a rail
   down the leading edge only. A left-edge rail was easy to read as a divider or
   as part of the cell next door; enclosing the card means the colour is
   unambiguously about this card, whichever column it lands in.

   The edge is a soft mix of the hue, not the hue itself, and the fill is a
   fainter mix of the same — see shiftChipTone(). A full-strength 1px outline
   repeated across this grid vibrates as the week scrolls, which is tiring to
   look at; the tint carries the same identity as a block of colour the eye can
   rest on. Text stays in ink at every tint — see shiftChipTone() for why colour
   never lands on 11px type here. */
.chip {
  /* The height of a one-shift card: a 15px time line over a 14px site line,
     6px of padding either side and the 1px border — 44px. It is a floor, not a
     fixed height, so a two-shift card still grows. */
  --chip-min-h: 44px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px 9px;
  border-radius: var(--dash-r-sm);
  border: 1px solid var(--chip-edge, var(--dash-line));
  background: var(--chip-tint, var(--dash-surface));
  min-width: 0;
  transition: box-shadow var(--dash-fast) var(--dash-ease);
}
/* Hover washes the whole card a touch darker instead of adding a ring or
   swapping the edge colour. The wash is hue-agnostic, so one rule deepens an
   indigo, rust, violet or grey card by the same amount, and nothing sharpens
   under the pointer. */
.chip:hover {
  box-shadow: inset 0 0 0 100px rgba(16, 24, 40, 0.03);
}

.chip__time {
  font-size: 12px;
  line-height: 15px;
  font-weight: 600;
  color: var(--dash-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip__site {
  display: flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
  font-size: 11px;
  line-height: 14px;
  color: var(--dash-ink-3);
}
.chip__site .q-icon {
  flex-shrink: 0;
  color: var(--dash-ink-4);
}
.chip__site-name {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip__row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  color: var(--dash-ink);
}
.chip__title {
  font-size: 12px;
  line-height: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Leave keeps one identity colour on its rail — it is an absence with a reason,
   so it stays distinguishable from a day off. */
.chip--leave {
  --chip-edge: var(--dash-cat-4-soft);
  --chip-tint: var(--dash-cat-4-tint);
  min-height: var(--chip-min-h);
  justify-content: center;
}
.chip--leave .chip__row .q-icon {
  color: var(--dash-cat-4);
}

/* A day off is not a warning. It used to be an amber card with uppercase amber
   type, which made every rest day the loudest thing in the week; it now recedes
   so the shifts around it are what the eye lands on. */
.chip--off {
  --chip-edge: var(--dash-line);
  --chip-tint: var(--dash-n-25);
  border-style: dashed;
}
.chip--off .chip__row {
  color: var(--dash-ink-3);
}
.chip--off .chip__title {
  font-weight: 500;
}

/* No `.chip--merged` and no `.chip__sub`: a merged card is a normal shift card
   with the dual-shift edge colour and a single time span, so it needs neither
   its own chrome nor a nested list of per-shift rows. */

.chip--shift {
  padding: 6px 9px;
  min-height: var(--chip-min-h);
  justify-content: center;
}

/* One leg per shift inside the card. The second is separated by a hairline
   rather than by a gap, so the two read as parts of one day rather than as two
   cards that happen to touch. */
.leg {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.leg--next {
  margin-top: 5px;
  padding-top: 5px;
  border-top: 1px solid var(--dash-line-soft);
}

/* ── Chip tools ──
   Revealed on hover or keyboard focus. Unlike the add button these are
   destructive-ish actions on an existing shift, so they stay out of the way
   until the card is engaged. */
.chip__tools {
  position: absolute;
  top: 3px;
  right: 3px;
  display: flex;
  gap: 1px;
  padding: 2px;
  border-radius: var(--dash-r-sm);
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  box-shadow: var(--dash-shadow-sm);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--dash-fast) var(--dash-ease);
}
.chip:hover .chip__tools,
.chip:focus-within .chip__tools {
  opacity: 1;
  pointer-events: auto;
}

.chip__tool {
  color: var(--dash-ink-3);
}
.chip__tool:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
}

/* The separate "Day off · both" button is gone: with the day back to one card,
   that action belongs in the card's own tools, which is also where the original
   grid had it. */

/* ── Add button ── */
.add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 40px;
  flex: 1;
  border: 1px dashed transparent;
  border-radius: var(--dash-r-sm);
  background: none;
  color: var(--dash-n-400);
  cursor: pointer;
  transition: border-color var(--dash-fast) var(--dash-ease),
    background var(--dash-fast) var(--dash-ease), color var(--dash-fast) var(--dash-ease);
}
.cell--day:hover .add {
  border-color: var(--dash-line-strong);
}
.add:hover {
  border-color: var(--dash-accent);
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
}
.add:focus-visible {
  outline: none;
  border-color: var(--dash-accent);
  box-shadow: 0 0 0 3px var(--dash-accent-ring);
}
.add--busy {
  border-color: var(--dash-line-strong);
  color: var(--dash-accent);
}

/* ── Empty ── */
.grid__empty {
  grid-column: 1 / -1;
}

.empty-btn {
  margin-top: 6px;
  padding: 0 12px;
  height: 32px;
  border-radius: var(--dash-r-md);
  font-weight: 500;
  color: var(--dash-ink-2);
}

/* ── Responsive ── */
@media (min-width: 1600px) {
  .grid-wrap {
    --who-w: 232px;
    --day-w: 150px;
  }
}

@media (max-width: 1279px) {
  .grid-wrap {
    --who-w: 176px;
    --day-w: 116px;
  }
  .cell--who {
    padding: 9px 10px;
  }
  .day-head {
    padding: 8px 8px 9px;
  }
  .cell--day {
    padding: 5px;
  }
}

/* Tablet: the week no longer fits, so it scrolls horizontally — but with the
   employee column pinned, which is what makes that scroll usable. */
@media (max-width: 1023px) {
  .grid-wrap {
    --who-w: 152px;
    --day-w: 112px;
  }
  .who__name {
    font-size: 12.5px;
  }
  .day-head__date {
    font-size: 15px;
  }
  .day-head__totals {
    font-size: 10.5px;
  }
}
</style>

<style>
/* QTooltip teleports to the body, so the shift card's detail tip is styled here.
   It carries the shift type and site that the card itself no longer prints. */
.chip-tip {
  background: var(--dash-ink);
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--dash-r-sm);
  padding: 5px 9px;
  box-shadow: var(--dash-shadow-lg);
}
</style>
