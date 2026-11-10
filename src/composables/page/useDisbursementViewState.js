import { watch, onMounted, onBeforeUnmount } from 'vue'
import { useCompany } from 'src/composables/page/useCompany'

// ── Module-level view memory for the disbursement pages ──────────────────────
// Route components unmount on navigation — there is no keep-alive, deliberately,
// and every list page recreates its refs at setup — so leaving a paginated step
// and coming back used to drop the reader on page 1 with every filter reset.
// These two maps hold that state where the unmounted component cannot: keyed by
// company, outliving the page, and dying with the tab (a reload or a company
// switch starts clean). Same lifetime policy as the app's other module caches,
// just of view state rather than data.
const snapshots = new Map()
const scrollByKey = new Map()

/** A fresh copy of a default value, so a snapshot can never alias page state. */
function cloneValue(value) {
  return value !== null && typeof value === 'object' ? { ...value } : value
}

/**
 * Remembers one disbursement page's table state and scroll position while the
 * reader is elsewhere, and hands it back on return.
 *
 * Takes the page's own refs rather than creating them, so declarations, their
 * comments and every template binding stay exactly where they are:
 *
 *   const page = ref(1)
 *   const { restoreScroll } = useDisbursementViewState(`review:${groupId}`, {
 *     page, pageSize, searchTerm,
 *   })
 *
 * Seeding happens synchronously during setup — before the page's watchers and
 * deep-link handling run — so a restored value is indistinguishable from one the
 * reader just chose, and the reset-to-page-1 watchers never see it as a change.
 *
 * `logicalKey` is page-local (`'list'`, `` `review:${groupId}` ``); the company
 * prefix is added here, because every module-level cache in this app is keyed by
 * company and the rule should not depend on each call site remembering it.
 *
 * @param {string} logicalKey
 * @param {Record<string, import('vue').Ref>} stateRefs refs to seed and persist
 * @returns {{ restoreScroll: () => void }}
 */
export function useDisbursementViewState(logicalKey, stateRefs) {
  const { companyId } = useCompany()
  const key = `disbursement:${companyId.value ?? ''}:${logicalKey}`

  // ── Seed ──
  const saved = snapshots.get(key)
  if (saved) {
    for (const name of Object.keys(stateRefs)) {
      if (name in saved && saved[name] !== undefined) {
        stateRefs[name].value = cloneValue(saved[name])
      }
    }
  }

  // ── Persist ──
  // Written on change rather than at unmount: a change made in the same tick as
  // a navigation would never reach onBeforeUnmount, and the payload is a
  // handful of primitives. Sync flush, so the write cannot lag the interaction
  // that caused it.
  const names = Object.keys(stateRefs)
  if (names.length) {
    watch(
      () => names.map((name) => stateRefs[name].value),
      () => {
        const snapshot = {}
        for (const name of names) snapshot[name] = stateRefs[name].value
        snapshots.set(key, snapshot)
      },
      { deep: true, flush: 'sync' },
    )
  }

  // ── Scroll ──
  // The full-window layout scrolls the document — router/index.js's
  // scrollBehavior speaks in window coordinates for the same reason — so the
  // remembered position is a window one. Recorded continuously rather than at
  // unmount: by the time the route change unmounts this page, the router's own
  // scroll-to-top may already have run.
  let onScroll = null
  onMounted(() => {
    onScroll = () => scrollByKey.set(key, window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
  })
  onBeforeUnmount(() => {
    if (onScroll) window.removeEventListener('scroll', onScroll)
    onScroll = null
  })

  /**
   * Puts the window back where the reader left it. Call once the page's own
   * load has finished (`loading.value = false`): the table only reaches its
   * remembered height after the rows render, so this retries across frames and
   * settles for whatever height exists rather than scrolling forever.
   */
  function restoreScroll() {
    const y = scrollByKey.get(key) ?? 0
    if (!y) return
    let tries = 0
    const apply = () => {
      if (window.scrollY === y) return
      if (document.documentElement.scrollHeight - window.innerHeight < y && tries++ < 30) {
        requestAnimationFrame(apply)
        return
      }
      window.scrollTo({ top: y, behavior: 'auto' })
    }
    requestAnimationFrame(apply)
  }

  return { restoreScroll }
}
