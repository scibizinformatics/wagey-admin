<template>
  <DashPanel
    icon="flag"
    title="Needs action today"
    :subtitle="subtitle"
    :tone="items.length ? 'critical' : 'good'"
    :loading="loading"
    :empty="!items.length"
    empty-icon="check"
    empty-tone="good"
    empty-title="Nothing needs action today"
    empty-sub="Attendance and payroll are clear. Anything that comes up will land here."
    skeleton="table"
    :skeleton-rows="ROWS_PER_PAGE"
  >
    <DashTable
      :columns="columns"
      :rows="pagedItems"
      :min-width="640"
      row-clickable
      :row-label="rowLabel"
      @row-click="openAttendance"
    >
      <template #cell-employee="{ row }">
        <span class="emp">
          <!-- Same identity rule as every other staff table: the photograph
               when the name resolves to exactly one employee who has one,
               otherwise initials on that person's categorical colour. -->
          <q-avatar
            v-if="avatarOf(row).pictureUrl"
            size="24px"
            class="emp__avatar"
          >
            <img
              :src="avatarOf(row).pictureUrl"
              :alt="row.employee"
              loading="lazy"
              @error="onAvatarError(row)"
            />
          </q-avatar>
          <q-avatar v-else size="24px" :style="{ background: avatarOf(row).color }" class="emp__avatar">
            <span class="emp__initials">{{ avatarOf(row).initials }}</span>
          </q-avatar>
          <span class="emp__name">{{ row.employee }}</span>
        </span>
      </template>

      <template #cell-actionType="{ row }">
        <!-- These were rendered as buttons that did nothing. They are severity
             labels, so they are labelled as such — a label labels, a button acts. -->
        <span class="dash-chip" :class="impactClass(row.actionType)">
          <span class="dash-chip__dot" />
          {{ row.actionType }}
        </span>
      </template>

      <!-- The row is the control, so this is only the sign that it is one. It
           rides in on hover rather than sitting there permanently, which would
           put a column of arrows down a panel whose job is to be read. -->
      <template #cell-go>
        <q-icon name="chevron_right" size="16px" class="go" aria-hidden="true" />
      </template>
    </DashTable>

    <template #footer>
      <DashPager
        class="queue-pager"
        :page="page"
        :rows-per-page="ROWS_PER_PAGE"
        :total="items.length"
        @update:page="page = $event"
      />
    </template>
  </DashPanel>
</template>

<script setup>
/**
 * The Today tab's lead panel: the queue of things blocking payroll right now.
 *
 * Renamed from "Priority Items" to "Needs action today" — the old title named a
 * category, the new one names the job. Its tone flips to `critical` whenever the
 * queue is non-empty, so an admin can tell at a glance from the panel's edge
 * whether the day is clear without reading the rows.
 */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'
import DashPager from '@/components/pages/Dashboard/DashPager.vue'
import DashTable from '@/components/pages/Dashboard/DashTable.vue'
import { avatarFor } from '@/composables/utils/employee'

const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  /**
   * The day this queue was fetched for — the dashboard's date picker, not
   * necessarily today. It travels with the row into Attendance so the page
   * opens on the day the issue is about rather than on whatever day it is now.
   */
  date: { type: String, default: '' },
  /**
   * Name-indexed employee roster, built by the page from `useEmployees`. The
   * endpoint identifying a person by display name only, this is the one thing
   * that can put a face against the row.
   */
  employeeIndex: { type: Object, default: null },
})

const router = useRouter()

/**
 * Wide enough for the longest impact label plus the chip's dot, padding and
 * border. The set is fixed and short — "May Affect Payroll", "Attendance
 * Incomplete", "Affects Staffing", "Unauthorized Work" — so this is a real
 * measurement of a known worst case, not a guess at arbitrary content.
 */
const IMPACT_MIN_WIDTH = 208

const columns = [
  { key: 'employee', label: 'Employee', flex: 1.3, strong: true },
  { key: 'site', label: 'Site', flex: 0.9 },
  { key: 'issue', label: 'Issue', flex: 1.4 },
  // The impact chip is `white-space: nowrap` inside a cell that hides its
  // overflow, so a share of the spare space is not enough on its own — the
  // column has to be able to hold the longest label ("Attendance Incomplete")
  // whatever else is on the row, or the chip is quietly cut off mid-border.
  { key: 'actionType', label: 'Impact', flex: 1, minWidth: IMPACT_MIN_WIDTH },
  // Holds the hover chevron, and nothing else — as narrow as the glyph, so the
  // affordance costs the four reading columns as little as possible.
  { key: 'go', label: '', width: 16 },
]

/**
 * Open the row's employee on the Attendance page for the day in question.
 *
 * The queue is a list of attendance problems, and resolving one means editing
 * that person's punches — which lives on Attendance, not here. The link is by
 * employee *name*: this endpoint identifies people by display name only (it
 * sends no id), and Attendance's own employee filter is its search box, which
 * matches on name too, so the two meet where they already agree.
 */
function openAttendance(row) {
  if (!row?.employee) return
  router.push({
    name: 'attendance',
    query: {
      employee: row.employee,
      ...(props.date ? { date: props.date } : {}),
    },
  })
}

function rowLabel(row) {
  return `Open ${row.employee}'s attendance — ${row.issue}`
}

// The queue routinely runs to dozens of rows — three per employee with an
// incomplete day — which grew the panel far past everything beside it. It is
// paged instead, so the card keeps one height and the subtitle still says how
// much work is really queued.
const ROWS_PER_PAGE = 6
const page = ref(1)

const pagedItems = computed(() => {
  const start = (page.value - 1) * ROWS_PER_PAGE
  return props.items.slice(start, start + ROWS_PER_PAGE)
})

// A refetch or a company switch replaces the queue wholesale, and resolving
// items shortens it — either can strand the reader on a page that no longer
// exists, so clamp back into range whenever the length changes.
watch(
  () => props.items.length,
  (len) => {
    const lastPage = Math.max(1, Math.ceil(len / ROWS_PER_PAGE))
    if (page.value > lastPage) page.value = lastPage
  },
)

const subtitle = computed(() => {
  if (props.loading) return ''
  const n = props.items.length
  return n ? `${n} ${n === 1 ? 'item' : 'items'} to resolve` : ''
})

const IMPACT_TONE = {
  'May Affect Payroll': 'dash-chip--critical',
  'Attendance Incomplete': 'dash-chip--warn',
  'Affects Staffing': 'dash-chip--info',
}

function impactClass(impact) {
  return IMPACT_TONE[impact] ?? ''
}

/**
 * The row's face: `{ pictureUrl, initials, color }` from the shared name-index
 * lookup, with any photograph the browser has already refused dropped out so a
 * dead image cannot render as the broken-image glyph on every refetch. Names
 * that resolve to nobody — or to more than one person — keep the initials
 * avatar, the same call `avatarFor` itself makes.
 */
const brokenPictureUrls = ref(new Set())

function avatarOf(row) {
  const avatar = avatarFor(props.employeeIndex, row.employee)
  if (avatar.pictureUrl && brokenPictureUrls.value.has(avatar.pictureUrl)) {
    return { ...avatar, pictureUrl: '' }
  }
  return avatar
}

function onAvatarError(row) {
  const { pictureUrl } = avatarFor(props.employeeIndex, row.employee)
  if (pictureUrl) {
    brokenPictureUrls.value = new Set(brokenPictureUrls.value).add(pictureUrl)
  }
}
</script>

<style scoped>
/* DashTable insets its cells 10px inside the panel body, so the pager takes the
   same inset — otherwise its range read-out and its next/prev buttons sit 10px
   outside the first and last columns they page through. */
.queue-pager {
  padding: 0 10px;
}

.emp {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.emp__avatar {
  flex-shrink: 0;
}

.emp__initials {
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.02em;
}

.emp__name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Revealed on hover or when the row itself takes keyboard focus, so a keyboard
   reader gets the same sign a mouse reader does. Opacity rather than
   `display`, so the column never changes width under the pointer. */
.go {
  color: var(--dash-ink-4);
  opacity: 0;
  transition: opacity var(--dash-fast) var(--dash-ease);
}

.dash-table__row:hover .go,
.dash-table__row:focus-visible .go {
  opacity: 1;
}
</style>
