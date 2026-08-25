<template>
  <div class="inv-tbl">
    <!-- Loading. Built from `visibleColumns`, the same list the table below
         renders, so the placeholder's columns are the table's columns — at every
         width, including the one where "Sent" is dropped. -->
    <TableSkeleton v-if="loading" :columns="visibleColumns" :rows="6" flush />

    <!-- Empty -->
    <div v-else-if="!rows.length" class="dash-empty">
      <span class="dash-featured-icon">
        <q-icon :name="isFiltered ? 'filter_alt_off' : 'o_mark_email_read'" size="20px" />
      </span>
      <p class="dash-empty__title">
        {{ isFiltered ? 'Nothing matches this filter' : 'No invitations yet' }}
      </p>
      <p class="dash-empty__sub">
        {{
          isFiltered
            ? 'No invitation matches what you typed or the status you picked.'
            : 'Invite an employee and their invitation appears here with its join code and expiry.'
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
        class="inv-tbl__empty-btn"
        @click="$emit('clear-filters')"
      />
    </div>

    <!-- Grid -->
    <div v-else class="inv-tbl__scroll dash-scroll-x">
      <q-table
        :rows="rows"
        :columns="visibleColumns"
        row-key="id"
        flat
        hide-pagination
        :rows-per-page-options="[0]"
        class="dash-qtable inv-grid"
      >
        <template v-slot:header="props">
          <q-tr :props="props">
            <q-th key="recipient" :props="props">Recipient</q-th>
            <q-th key="role" :props="props">Role</q-th>
            <q-th key="code" :props="props">Join code</q-th>
            <q-th key="state" :props="props">Status</q-th>
            <q-th v-if="showSent" key="sent" :props="props">Sent</q-th>
            <q-th key="expires" :props="props">Expires</q-th>
            <q-th key="actions" :props="props" class="num">&nbsp;</q-th>
          </q-tr>
        </template>

        <template v-slot:body="props">
          <q-tr
            :props="props"
            class="dash-qtable__row dash-qtable__row--clickable inv-row"
            :class="{ 'dash-qtable__row--muted': isLapsed(props.row) }"
            tabindex="0"
            @click="$emit('view', props.row)"
            @keydown.enter.prevent="$emit('view', props.row)"
          >
            <q-td key="recipient" :props="props" class="strong">
              <div class="who">
                <span class="who__avatar">{{ inviteInitials(props.row.email) }}</span>
                <span class="who__text">
                  <span class="who__email">{{ props.row.email || '—' }}</span>
                  <span class="who__company">{{ props.row.company || companyFallback }}</span>
                </span>
              </div>
            </q-td>

            <q-td key="role" :props="props">
              <span class="role-tag">{{ props.row._role }}</span>
            </q-td>

            <!-- The code is the one thing on the row a person hands to someone
                 else, so copying it is a click rather than a select-and-drag
                 across a monospace run. -->
            <q-td key="code" :props="props">
              <button
                v-if="props.row.code"
                type="button"
                class="code"
                :aria-label="`Copy join code ${props.row.code}`"
                @click.stop="$emit('copy', props.row)"
              >
                <span class="code__text">{{ props.row.code }}</span>
                <q-icon name="o_content_copy" size="13px" class="code__icon" />
                <q-tooltip anchor="bottom middle" self="top middle">Copy code</q-tooltip>
              </button>
              <span v-else class="muted">—</span>
            </q-td>

            <q-td key="state" :props="props">
              <span class="dash-chip" :class="chipClass(props.row._state.tone)">
                <span class="dash-chip__dot" />
                {{ props.row._state.label }}
              </span>
            </q-td>

            <q-td v-if="showSent" key="sent" :props="props">
              <span class="stamp">{{ formatDate(props.row.created_at) }}</span>
              <span class="stamp__rel">{{ relativeDay(props.row.created_at) }}</span>
            </q-td>

            <q-td key="expires" :props="props">
              <template v-if="props.row.is_used">
                <span class="muted">Not applicable</span>
              </template>
              <template v-else>
                <span class="stamp">{{ formatDate(props.row.expires_at) }}</span>
                <span class="stamp__rel" :class="expiryClass(props.row)">
                  {{ relativeDay(props.row.expires_at) }}
                </span>
              </template>
            </q-td>

            <q-td key="actions" :props="props" class="num">
              <q-btn
                flat
                dense
                round
                size="sm"
                icon="o_visibility"
                class="row-action"
                :aria-label="`View invitation for ${props.row.email}`"
                @click.stop="$emit('view', props.row)"
              >
                <q-tooltip anchor="bottom right" self="top right">View details</q-tooltip>
              </q-btn>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </div>
  </div>
</template>

<script setup>
/**
 * Desktop and laptop view of the invitation queue. Below 1024px the page swaps
 * this for InviteCardList — seven columns inside a tablet's content width meant
 * a sideways scroll on every row.
 *
 * Rows arrive already carrying `_state` and `_role` from the page, so what a row
 * displays is the same value the page filtered and counted on.
 */
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import { chipClass, formatDate, inviteInitials, relativeDay, daysUntil } from './inviteStatus'

defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
  companyFallback: { type: String, default: '—' },
})

defineEmits(['view', 'copy', 'clear-filters'])

const $q = useQuasar()

const columns = [
  { name: 'recipient', label: 'Recipient', field: 'email', align: 'left' },
  { name: 'role', label: 'Role', field: '_role', align: 'left' },
  { name: 'code', label: 'Join code', field: 'code', align: 'left' },
  { name: 'state', label: 'Status', field: (row) => row._state.key, align: 'left' },
  { name: 'sent', label: 'Sent', field: 'created_at', align: 'left' },
  { name: 'expires', label: 'Expires', field: 'expires_at', align: 'left' },
  { name: 'actions', label: '', field: 'id', align: 'right' },
]

/**
 * Seven columns crowd below 1280, and "Sent" is the reading a person can lose:
 * an invite's age is implied by the expiry beside it, which stays.
 *
 * Driven from here rather than from a CSS `display: none`, because the skeleton
 * has to agree about which columns exist — with the rule in CSS, the loading
 * state drew a Sent column the table then didn't render.
 */
const showSent = computed(() => $q.screen.width >= 1280)

const visibleColumns = computed(() =>
  showSent.value ? columns : columns.filter((col) => col.name !== 'sent'),
)

/** Expired and cancelled rows dim — they are history, not work. */
const isLapsed = (row) => row._state.key === 'expired' || row._state.key === 'cancelled'

const expiryClass = (row) => {
  const left = daysUntil(row.expires_at)
  if (left === null) return ''
  if (left < 0) return 'stamp__rel--past'
  if (left <= 3) return 'stamp__rel--soon'
  return ''
}
</script>

<style scoped>
/* Horizontal only. Capping the height and pinning the header layered it over
   the toolbar above; the page scrolls instead. */
.inv-tbl__scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.inv-grid {
  width: 100%;
}

/* ── Recipient ── */
.who {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.who__avatar {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: 50%;
  background: var(--dash-n-100);
  border: 1px solid var(--dash-line);
  color: var(--dash-ink-2);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.who__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.who__email {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* Company rides under the address instead of holding its own column: it is the
   same value on every row for a single-company admin, and folding it here is
   what freed the width for the expiry reading. */
.who__company {
  font-size: 11.5px;
  color: var(--dash-ink-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Role ── */
.role-tag {
  display: inline-block;
  max-width: 150px;
  padding: 2px 8px;
  border-radius: var(--dash-r-sm);
  background: var(--dash-n-50);
  border: 1px solid var(--dash-line);
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dash-ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

/* ── Join code ── */
.code {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: 100%;
  padding: 3px 8px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-sm);
  background: var(--dash-n-50);
  font: inherit;
  cursor: pointer;
  transition:
    background var(--dash-fast) var(--dash-ease),
    border-color var(--dash-fast) var(--dash-ease);
}
.code:hover {
  background: var(--dash-surface);
  border-color: var(--dash-line-strong);
}
.code__text {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  letter-spacing: 0.02em;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.code__icon {
  flex: none;
  color: var(--dash-ink-4);
}
.code:hover .code__icon {
  color: var(--dash-accent);
}

/* ── Dates ── */
.stamp {
  display: block;
  font-size: 12.5px;
  color: var(--dash-ink-2);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.stamp__rel {
  display: block;
  margin-top: 1px;
  font-size: 11px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}
.stamp__rel--soon {
  color: var(--dash-warn);
  font-weight: 500;
}
.stamp__rel--past {
  color: var(--dash-ink-4);
}

.row-action {
  color: var(--dash-ink-4);
}
.row-action:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
}

.inv-tbl__empty-btn {
  margin-top: 4px;
  color: var(--dash-ink-2);
  border-color: var(--dash-line-strong);
}

/* ── Laptop ──
   Cell padding is stepped by `dash-qtable` for every table in the product; the
   dropped column is decided in script, so the skeleton agrees with the table. */
@media (max-width: 1279px) {
  .role-tag {
    max-width: 110px;
  }
}
</style>
