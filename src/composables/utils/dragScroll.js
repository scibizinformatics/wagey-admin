/**
 * Mouse drag-to-pan for a horizontally scrolling region — "click the table and
 * drag it left and right", rather than hunting for the 8px scrollbar.
 *
 *   const { dragging, handlers } = createDragScroll(() => scrollEl.value)
 *
 *   <div ref="scrollEl" :class="{ 'is-dragging': dragging }" v-on="handlers">
 *
 * Pass a *getter* rather than the element, and return `null` from it when the
 * behaviour is not wanted on this page: every handler then bails on its first
 * line, and the caller does not have to conditionally unbind four listeners.
 *
 * Four decisions in here are deliberate and would look like bugs to a reader
 * tidying up:
 *
 *  - **Pointer capture is taken after the drag threshold, not on pointerdown.**
 *    Capture retargets `pointerup`, and the browser dispatches the click at the
 *    common ancestor of `pointerdown`/`pointerup` — so capturing on every press
 *    turns a plain click on a sortable header into a click on the container and
 *    the column silently stops sorting. Below the threshold nothing is captured,
 *    so clicks land exactly where they always did.
 *  - **4px before anything happens.** A press that does not move is a click: a
 *    sortable header sorts, a row menu opens, a name can be double-clicked. Only
 *    movement turns the same press into a pan.
 *  - **Text selection is cleared when the threshold is crossed, not prevented on
 *    pointerdown.** Calling `preventDefault()` on the press would also stop the
 *    region taking focus, and would make the table's text unselectable for good.
 *    Dropping the range that the press already started keeps both.
 *  - **The click that follows a drag is swallowed once.** Without it, panning
 *    across a row that opens on click navigates on pointerup. The guard is armed
 *    for a single click and disarms itself on a timer, because a drag released
 *    outside any click target produces no click at all, and a guard left armed
 *    would eat the next unrelated one.
 *
 * Mouse only (`pointerType === 'mouse'`): touch and pen already scroll with
 * native momentum, and capturing those would replace a good gesture with a worse
 * one. Vertical movement is ignored — this is a horizontal pan, and a drag that
 * also nudged the page would feel broken.
 */
import { ref } from 'vue'

/** Movement, in px, that separates a click from a pan. */
const DRAG_THRESHOLD_PX = 4

/** How long the trailing-click guard stays armed without a click to eat. Long
 *  enough to cover the click that lands right after the release, short enough
 *  that the next deliberate click is never the one it eats. */
const CLICK_GUARD_MS = 150

/**
 * Whatever a press on it should keep doing instead of panning: links, form
 * controls, menu triggers. `.q-*` entries cover Quasar's own widgets, which are
 * mostly divs and therefore invisible to a tag-name test.
 */
const INTERACTIVE = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  'label',
  '[role="button"]',
  '[contenteditable="true"]',
  '.q-btn',
  '.q-checkbox',
  '.q-toggle',
  '.q-field',
  '.q-menu',
].join(',')

/**
 * Development only: say out loud which guard turned a press down.
 *
 * A refused press and a broken handler look identical from the outside — the
 * table simply does not move — and every guess about which one it was costs a
 * round trip. Three refusals remain after the guards above were trimmed, and each
 * now names itself in the console. Stripped from production by `pure_funcs`, and
 * deletable once the behaviour has been confirmed in the field.
 */
const DEBUG = process.env.DEV

function refuse(reason) {
  if (DEBUG) console.warn(`[dragScroll] press ignored: ${reason}`)
}

/**
 * The element that actually scrolls, given the container the class is on.
 *
 * Quasar's QTable renders its own scrollport: `div.q-table__middle` carrying
 * Quasar's `scroll` utility (`overflow: auto`) and `max-width: 100%`. The table's
 * overflow is absorbed there, so the wrapper the card puts `dash-scroll-x` on
 * never overflows and writing `scrollLeft` to it does nothing — the table visibly
 * refuses to move. `TableSkeleton` has the same shape in `.dash-tskel`.
 *
 * Exported because the caller needs to measure the same element to decide whether
 * the grab cursor is honest.
 */
const SCROLLPORT = '.q-table__middle, .dash-tskel'

export function resolveScrollport(container) {
  return container?.querySelector(SCROLLPORT) ?? container ?? null
}

export function createDragScroll(getElement) {
  const dragging = ref(false)

  let pointerId = null
  let scroller = null
  let startX = 0
  let startScrollLeft = 0
  let moved = false
  let clickGuardTimer = null
  let clickGuard = null

  function disarmClickGuard() {
    if (clickGuard) {
      window.removeEventListener('click', clickGuard, true)
      clickGuard = null
    }
    clearTimeout(clickGuardTimer)
    clickGuardTimer = null
  }

  function armClickGuard() {
    disarmClickGuard()
    clickGuard = (event) => {
      event.preventDefault()
      event.stopPropagation()
      disarmClickGuard()
    }
    window.addEventListener('click', clickGuard, true)
    clickGuardTimer = setTimeout(disarmClickGuard, CLICK_GUARD_MS)
  }

  function reset() {
    const el = getElement()
    if (el && pointerId !== null && el.hasPointerCapture?.(pointerId)) {
      el.releasePointerCapture(pointerId)
    }
    pointerId = null
    scroller = null
    moved = false
    dragging.value = false
  }

  function onPointerDown(event) {
    const container = getElement()
    // Not the page that asked for this behaviour: stay silent.
    if (!container) return
    if (event.button !== 0) return refuse(`button ${event.button}`)
    if (event.pointerType !== 'mouse') return refuse(`pointerType ${event.pointerType}`)

    // Nothing used to be checked here about overflow, and nothing should be: a
    // `scrollLeft` write clamps at both ends, so a drag on a table that fits is
    // already a no-op. Gating the gesture on `scrollWidth > clientWidth` meant a
    // single stale measurement — the skeleton still on screen, a column set one
    // render behind — silently disabled panning altogether, with no way to tell
    // it apart from the handler never running. The overflow test belongs on the
    // cursor (`.is-pannable`), not on the press.
    //
    // The scrollbar strip is not tested either: a press on a scrollbar does not
    // dispatch to the element at all, so a `clientHeight` comparison here only
    // ever refused presses on the last row.

    if (event.target instanceof Element && event.target.closest(INTERACTIVE)) {
      return refuse('press landed on an interactive element')
    }

    const box = resolveScrollport(container)
    if (!box) return refuse('no scrollport found')

    pointerId = event.pointerId
    scroller = box
    startX = event.clientX
    startScrollLeft = box.scrollLeft
    moved = false
  }

  function onPointerMove(event) {
    if (event.pointerId !== pointerId || scroller === null) return
    const container = getElement()
    // A pointerup we never saw — released over another window, or swallowed by an
    // alt-tab. Ending here beats staying stuck in a pan with no button held.
    if ((event.buttons & 1) === 0) {
      reset()
      return
    }

    const dx = event.clientX - startX

    if (!moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX) return
      moved = true
      dragging.value = true
      // The press has been selecting row text for the last few pixels.
      window.getSelection()?.removeAllRanges()
      if (DEBUG) {
        // Names the element being panned and prints the numbers that decide
        // whether it had anywhere to go. "It did not move" is ambiguous between
        // the wrong element, a scrollport with no overflow, and no handler at
        // all; this line answers all three.
        console.warn('[dragScroll] panning', {
          scroller: scroller.className,
          scrollWidth: scroller.scrollWidth,
          clientWidth: scroller.clientWidth,
        })
      }
      // Capture keeps the pan alive once the pointer leaves the table, but it is
      // an optimisation, not the pan itself. It can throw — a browser may refuse
      // it, and it rejects a pointer that is no longer active — so it is wrapped:
      // it must never be able to stand between "the reader is dragging" and "the
      // table moves", which would show a frozen table under a `grabbing` cursor.
      try {
        container?.setPointerCapture?.(event.pointerId)
      } catch {
        // Pan without capture: still works while the pointer stays over the table.
      }
    }

    scroller.scrollLeft = startScrollLeft - dx
  }

  function onPointerUp(event) {
    if (event.pointerId !== pointerId) return
    const wasDragging = moved
    reset()
    if (wasDragging) armClickGuard()
  }

  function onPointerCancel(event) {
    if (event.pointerId !== pointerId) return
    reset()
  }

  return {
    dragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  }
}
