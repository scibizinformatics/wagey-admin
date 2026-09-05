/**
 * Last-write-wins protection for a fetch that publishes into shared state.
 *
 * The problem this exists for: a page control that changes faster than the API
 * answers — an attendance date, a schedule week, a contributions cutoff — issues
 * a request per change, and responses do not have to come back in the order they
 * were sent. Without a guard, request A (slow) can land *after* request B (fast)
 * and overwrite B's rows, leaving the table showing one day while the picker
 * reads another. Nothing errors, and the screen looks settled.
 *
 * Take a token before the request and check it before committing:
 *
 *   const guard = createRequestToken()
 *
 *   async function load(date) {
 *     const token = guard.next()
 *     const rows = await api.get(…)
 *     if (!guard.isCurrent(token)) return   // a newer call already answered
 *     data.value = rows
 *   }
 *
 * One guard per piece of published state, not one per composable: two
 * independent data sets should not invalidate each other.
 *
 * `usePayroll.js` solves the same problem the other way, with a per-key
 * `AbortController` that cancels the superseded request outright. Prefer that
 * when the in-flight work is expensive enough to be worth cancelling, and this
 * when the response is cheap or shared through a cache (as in `useAttendance`,
 * where a second caller may legitimately be waiting on the same request and
 * cancelling it would strand them).
 */
export function createRequestToken() {
  let latest = 0

  return {
    /** Claim the next token. Call immediately before issuing the request. */
    next() {
      latest += 1
      return latest
    },

    /** True only while `token` is still the most recently claimed one. */
    isCurrent(token) {
      return token === latest
    },
  }
}
