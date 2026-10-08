<template>
  <!-- Loading. A hairline placeholder rather than nothing, so the column keeps
       its rhythm across a page that is still asking for its issues and does not
       jump when the text lands. -->
  <span v-if="loading" class="dispute-skeleton" aria-hidden="true" />

  <!-- Something was reported. The reason reads in full; only the thumbnail and
       the count are collapsed. -->
  <div v-else-if="first" class="dispute">
    <button
      v-if="attachmentUrl"
      type="button"
      class="dispute__thumb"
      :aria-label="`View attachment for ${employeeLabel}`"
      @click="onView"
    >
      <img :src="attachmentUrl" :alt="`Attachment for ${employeeLabel}`" loading="lazy" />
    </button>

    <span class="dispute__reason" :title="first.description || undefined">
      {{ first.description || 'No description given' }}
    </span>

    <span v-if="extra" class="dispute__more">+{{ extra }}</span>
  </div>

  <!-- No open issue. The server's own dispute_status is shown when it carries
       something real, and the cell is otherwise empty rather than a column of
       dashes — a run with nothing disputed should not read as one full of
       problems. -->
  <span v-else-if="fallback" class="dispute__status">{{ fallback }}</span>
</template>

<script setup>
/**
 * The Dispute column: why a payslip was disputed, and the photograph the
 * employee sent with it.
 *
 * Neither of those lives on the payslip row. The table is read from
 * `GET /payroll/admin/employee-payslips/{pgi_id}/`, which carries only a
 * `dispute_status` string; the reason and the attachment come from a second
 * call per payslip, `GET /payroll/admin/employee-payslips/{epi_id}/issues/`. The
 * page fetches those for the rows currently on screen and hands them down here.
 *
 * One payslip can carry several issues — that is why `processIssue` decides them
 * one by one — so this cell shows the first and counts the rest rather than
 * silently dropping them. Resolved and rejected issues are filtered out, which
 * is what makes the cell clear itself after a decision without the page having to
 * remember to blank it.
 *
 * The thumbnail follows `AttendancePunchCell`: a real `<button>` so it is
 * focusable and announces itself, a dashed placeholder in place of the image
 * when there is none, and the accent hover the rest of the tables use.
 */
import { computed } from 'vue'

const props = defineProps({
  /** Every issue on this payslip, pending and decided alike. */
  issues: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  /** The row's own `dispute_status`, used only while there is nothing better. */
  status: { type: [String, Number], default: '' },
  /** The person's name, for the thumbnail's accessible label. */
  employee: { type: String, default: '' },
})

const emit = defineEmits(['view-attachment'])

// An absent status counts as open: the endpoint may simply not report one, and a
// reported dispute with no status must not vanish from the column.
const pending = computed(() =>
  props.issues.filter((issue) => {
    const status = String(issue?.status ?? '').trim().toLowerCase()
    return status === '' || status === 'pending'
  }),
)

const first = computed(() => pending.value[0] ?? null)
const extra = computed(() => Math.max(pending.value.length - 1, 0))

// The endpoint types `attachments` as a single string holding one URL, so there
// is nothing to split or parse here — only to ignore when it is blank.
const attachmentUrl = computed(() => {
  const raw = first.value?.attachments
  if (typeof raw !== 'string') return ''
  const url = raw.trim()
  return url && url !== '-' ? url : ''
})

// The payload's own placeholder for "nothing here", which the stub data and any
// list endpoint that never computed the column both send.
const fallback = computed(() => {
  const text = String(props.status ?? '').trim()
  return text && text !== '-' ? text : ''
})

const employeeLabel = computed(() => props.employee || 'this payslip')

function onView() {
  if (!attachmentUrl.value) return
  emit('view-attachment', {
    url: attachmentUrl.value,
    title: props.employee ? `${props.employee}'s dispute` : 'Dispute attachment',
    subtitle: first.value?.description || 'Sent with the dispute',
  })
}
</script>

<style scoped>
.dispute {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

/* ── Attachment ── */
.dispute__thumb {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-sm);
  background: var(--dash-n-50);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color var(--dash-fast) var(--dash-ease);
}
.dispute__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.dispute__thumb:hover {
  border-color: var(--dash-accent);
}
.dispute__thumb:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--dash-surface),
    0 0 0 4px var(--dash-accent-ring);
}

.dispute__reason {
  font-size: 13px;
  color: var(--dash-ink-2);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* More issues than the cell has room for. A figure, not an alarm — the reason
   beside it is already the alarming part. */
.dispute__more {
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: var(--dash-r-pill);
  background: var(--dash-n-200);
  font-size: 11px;
  font-weight: 600;
  color: var(--dash-ink-3);
}

.dispute__status {
  font-size: 13px;
  color: var(--dash-ink-3);
}

.dispute-skeleton {
  display: block;
  width: 120px;
  height: 12px;
  border-radius: var(--dash-r-sm);
  background: var(--dash-n-100);
}
</style>