/**
 * "Data loaded" confirmations.
 *
 * Every page that pulls the rows it renders from the backend raises one of these
 * once its table data has landed, so a long fetch ends with an explicit
 * acknowledgement instead of the spinner just disappearing:
 *
 *   import { useLoadedToast } from 'src/composables/useLoadedToast'
 *   const { notifyLoaded } = useLoadedToast()
 *   notifyLoaded('Attendance', rows.length)
 *
 * Only the primary data set of a page should announce itself — filter option
 * lookups and background enrichment passes stay silent, otherwise opening a
 * page would fire a column of near-identical cards.
 */
import { useToast } from 'src/composables/useToast'

// Load confirmations are the least important thing on screen, so they leave
// sooner than a save or an error would.
const TIMEOUT = 2200

// A page whose filters fire twice in quick succession (a watcher plus an
// explicit refresh, say) would otherwise announce the same load twice.
const MIN_GAP_MS = 700
const lastShownAt = new Map()

export function useLoadedToast() {
  const toast = useToast()

  /**
   * @param {string} label   what was loaded, e.g. 'Attendance' or 'Employees'
   * @param {number|null} count  how many rows arrived; omit when not countable
   * @param {object} options
   *   noun / nounPlural — unit for the caption, defaults to record/records
   *   caption           — replaces the generated count caption outright
   *   allowEmpty        — announce a zero-row load too (pages usually have
   *                       their own "nothing found" notice for that case)
   */
  function notifyLoaded(label, count = null, options = {}) {
    const { noun = 'record', nounPlural = `${noun}s`, caption, allowEmpty = false } = options

    const total = Number.isFinite(count) ? count : null
    if (total === 0 && !allowEmpty) return

    const now = Date.now()
    const previous = lastShownAt.get(label)
    if (previous && now - previous < MIN_GAP_MS) return
    lastShownAt.set(label, now)

    toast.success(`${label} loaded`, {
      caption: caption ?? (total === null ? '' : `${total} ${total === 1 ? noun : nounPlural}`),
      icon: 'cloud_done',
      timeout: TIMEOUT,
    })
  }

  return { notifyLoaded }
}
