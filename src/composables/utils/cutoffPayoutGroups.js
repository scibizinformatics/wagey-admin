/**
 * Which payout groups the Current Cutoff tab is actually showing.
 *
 * Two components need the same answer and must not each work it out: the table
 * renders the rows, and the panel around it decides whether to render an empty
 * state *instead* of the table. A private copy in each is how a panel ends up
 * showing "no payout groups match this view" over a table that has rows in it,
 * or an empty grid with a header strip and a pager under it.
 *
 * `hide completed` and the stage rail's selection are separate narrowings and
 * compose: a reader can hide completed groups *and* select a stage, and the
 * table shows what survives both.
 */
export function filterCutoffPayoutGroups(groups, options = {}) {
  const { hideCompleted = false, statusFilter = null } = options
  let list = Array.isArray(groups) ? groups : []
  if (hideCompleted) list = list.filter((g) => g.status !== 'complete')
  if (statusFilter) list = list.filter((g) => g.status === statusFilter)
  return list
}

/**
 * Why the table is empty, which decides what the empty state is allowed to say.
 *
 *   'none'     — the cutoff has no payout groups at all. Nothing to clear; the
 *                only honest message is that there is nothing here yet.
 *   'filtered' — groups exist but the reader's own narrowing hid them all. That
 *                is recoverable, so the empty state offers the way back.
 */
export function cutoffEmptyReason(groups, options = {}) {
  const total = Array.isArray(groups) ? groups.length : 0
  if (!total) return 'none'
  return filterCutoffPayoutGroups(groups, options).length ? null : 'filtered'
}
