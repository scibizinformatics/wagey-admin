import { normaliseAssignmentHistory } from 'src/composables/utils/assignmentHistory'
import { createHistorySource } from 'src/composables/utils/historySource'

/**
 * Shift-assignment audit trail — `GET /audit/assignment/history/`.
 *
 * The fetching, the page walk, the company scoping and the stale-response guard
 * all live in `createHistorySource` (`composables/utils/historySource.js`),
 * shared with every other source on the audit page. This file is the thin half:
 * which endpoint, which row normaliser, and the words the error copy uses.
 *
 * The row shape and every reading taken from it live in
 * `composables/utils/assignmentHistory.js` — which is also what keeps the table
 * and the card list below 1024px from describing the same change differently.
 *
 * This sits alongside `useAuditLogs.js` rather than inside it. That composable
 * covers the cross-module admin write log (`/audit/admin/logs/`) and one
 * record's attendance revisions; this endpoint is a third, differently shaped
 * resource with its own page, and folding it in would have meant a third set of
 * unrelated refs in a composable whose consumers already have to pick which
 * `logs` they mean.
 *
 * See the factory's header for why the whole set is walked rather than paged,
 * and why the rows are narrowed against the local roster afterwards.
 */
export const useAssignmentHistory = createHistorySource({
  url: '/audit/assignment/history/',
  normalise: normaliseAssignmentHistory,
  subject: 'the assignment history',
  permission: 'the assignment history',
})
