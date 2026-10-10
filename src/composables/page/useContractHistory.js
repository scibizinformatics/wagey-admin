import { normaliseContractHistory } from 'src/composables/utils/contractHistory'
import { createHistorySource } from 'src/composables/utils/historySource'

/**
 * Contract audit trail — `GET /audit/contracts/history/`.
 *
 * The sibling of `useAssignmentHistory.js`, and deliberately shaped the same way:
 * the page switches between the two with a dropdown and drives both renderers
 * from one descriptor, so a difference in their public surface would surface as
 * a blank table on one tab rather than as a compile error.
 *
 * All of the fetching — the page walk, the company scoping against the local
 * roster, the stale-response guard — is `createHistorySource`
 * (`composables/utils/historySource.js`). This file names the endpoint, the
 * normaliser and the error copy.
 *
 * ── Why it has its own normaliser when the fields are the same ────────────────
 * Today `/audit/contracts/history/` answers with the same six fields as the
 * assignment endpoint, so the two normalisers read the same keys. They are still
 * separate files: the shift payload's `new_shift` / `previous_shift` are shift
 * names, and a contract payload that carries contract terms under those names is
 * a backend change this side should absorb without the table noticing. One
 * shared reader over two endpoints that are documented separately is how a
 * contract row starts rendering a shift.
 *
 * See `composables/utils/contractHistory.js` for the reading itself, and
 * `composables/utils/auditSources.js` for the vocabulary that differs between
 * the two sources.
 */
export const useContractHistory = createHistorySource({
  url: '/audit/contracts/history/',
  normalise: normaliseContractHistory,
  subject: 'the contract history',
  permission: 'the contract history',
})
