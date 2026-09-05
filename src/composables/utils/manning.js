/**
 * Site manning — the shared reading of `GET /organization/sites/manning/{company_id}/`.
 *
 * The endpoint answers one question for one day: for every site and position,
 * how many people were meant to be there and how many actually are. A row is a
 * site + position pair, and inside it one entry per shift:
 *
 *   { site, position, has_requirement, total_quantity_needed, total_assigned,
 *     total_working, total_not_timed_in, total_awol, total_leave, total_cto,
 *     off_employees, shifts: [{ shift, quantity_needed, assigned_employees, … }] }
 *
 * Two things about the payload drive most of the code below.
 *
 * First, `has_requirement` is the switch on the quantity fields: when it is
 * false every quantity is null, so "required" is genuinely unknown rather than
 * zero. Printing a null as 0 would invent a fully-staffed position out of one
 * that simply has no target set, so the normaliser keeps null and the table
 * prints an em dash.
 *
 * Second, the counts are three different readings that are easy to conflate:
 * `needed` is the target, `assigned` is who the schedule put on the shift, and
 * `working` is who actually timed in. A position can be fully assigned and
 * still be empty on the floor, which is exactly the case a manning board exists
 * to surface — hence the two separate gaps below.
 *
 * These helpers live in utils rather than in the page because the table, the
 * card list and the summary tiles all have to agree on them; the same
 * derivation copied into three files is how a tile ends up disagreeing with the
 * column it summarises.
 */

/** A count. Anything unparseable is 0 — a missing count is not a missing person. */
export function num(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * A requirement quantity, which is legitimately absent.
 *
 * Kept apart from `num` on purpose: null means "no target set for this
 * position", and collapsing it to 0 would read as "nobody required".
 */
export function quantity(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * "09:00:00" becomes "9:00 AM".
 *
 * Shift times are a wall clock on the shift template, not an instant, so there
 * is no timezone to convert through — formatting them via `new Date()` would
 * pull the browser offset into a figure that has no date attached.
 */
export function formatShiftTime(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? '').trim())
  if (!match) return ''
  const hours = Number(match[1])
  const minutes = match[2]
  if (!Number.isFinite(hours)) return ''
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${minutes} ${suffix}`
}

/** "9:00 AM – 6:00 PM", the shift span. */
export function shiftSpanLabel(shift) {
  const start = formatShiftTime(shift?.default_start_time)
  const end = formatShiftTime(shift?.default_end_time)
  if (start && end) return `${start} – ${end}`
  return start || end || 'Shift'
}

/**
 * Whatever a shift name says beyond its own times and site.
 *
 * Names arrive generated — "09:00 AM - 06:00 PM - VG Admin Office" — while the
 * row already carries the site in its own column and the breakdown prints the
 * span beside the name, so printing the name whole states the same facts twice
 * over. Anything left after stripping the span and the site is a real label
 * worth showing; usually nothing is left and this returns an empty string.
 */
export function shiftDistinctName(shift, site) {
  const raw = String(shift?.name ?? '').trim()
  if (!raw) return ''

  let rest = raw.replace(
    /^\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\s*[-–—]\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\s*/i,
    '',
  )
  rest = rest.replace(/^\s*[-–—]\s*/, '').trim()

  const siteName = String(site ?? '').trim()
  if (!siteName) return rest
  if (rest.toLowerCase() === siteName.toLowerCase()) return ''
  // A trailing "… - VG Admin Office" on a name that also carries a real label.
  if (rest.toLowerCase().endsWith(siteName.toLowerCase())) {
    rest = rest
      .slice(0, rest.length - siteName.length)
      .replace(/[-–—\s]+$/, '')
      .trim()
  }
  return rest
}

/**
 * One shift inside a position row.
 *
 * Note there is no per-shift `off_employees`: a scheduled day off is not
 * attached to a shift, so it exists only at position level. The shift
 * breakdown therefore counts away as leave + CTO, and says so, rather than
 * borrowing the wider figure from its parent row.
 */
export function normalizeManningShift(raw, site, index = 0) {
  const shift = raw?.shift ?? {}
  const leave = num(raw?.leave_employees)
  const cto = num(raw?.cto_employees)

  return {
    id: shift.id ?? null,
    // The index is part of the key for the same reason the row's is: nothing in
    // the payload promises an id, and two id-less shifts sharing a span would
    // otherwise collide into one `:key` and drop a row from the render.
    key: `shift-${index}-${shift.id ?? shiftSpanLabel(shift)}`,
    name: String(shift.name ?? '').trim(),
    span: shiftSpanLabel(shift),
    distinctName: shiftDistinctName(shift, site),
    isGraveyard: Boolean(shift.is_graveyard),
    needed: quantity(raw?.quantity_needed),
    assigned: num(raw?.assigned_employees),
    working: num(raw?.working_employees),
    notTimedIn: num(raw?.not_timed_in_employees),
    awol: num(raw?.awol_employees),
    leave,
    cto,
    away: leave + cto,
  }
}

/** One site + position row, with its shifts. */
export function normalizeManningRow(raw, index = 0) {
  const site = String(raw?.site ?? '').trim() || 'Unassigned site'
  const position = String(raw?.position ?? '').trim() || 'Unassigned position'
  const hasRequirement = Boolean(raw?.has_requirement)
  const leave = num(raw?.total_leave)
  const cto = num(raw?.total_cto)
  const off = num(raw?.off_employees)

  const shifts = Array.isArray(raw?.shifts)
    ? raw.shifts.map((shift, shiftIndex) => normalizeManningShift(shift, site, shiftIndex))
    : []

  return {
    // The index is part of the key because nothing in the payload guarantees a
    // site + position pair appears once, and a duplicated `:key` silently drops
    // the second row from the render.
    key: `${site}::${position}::${index}`,
    site,
    position,
    hasRequirement,
    needed: hasRequirement ? quantity(raw?.total_quantity_needed) : null,
    assigned: num(raw?.total_assigned),
    working: num(raw?.total_working),
    notTimedIn: num(raw?.total_not_timed_in),
    awol: num(raw?.total_awol),
    leave,
    cto,
    off,
    // Accounted for, but not on site: on leave, on CTO, or scheduled off.
    away: leave + cto + off,
    shifts,
  }
}

/** The whole `site_manning` array, in the order the backend returned it. */
export function normalizeManning(payload) {
  const list = Array.isArray(payload?.site_manning)
    ? payload.site_manning
    : Array.isArray(payload)
      ? payload
      : []
  return list.map((raw, index) => normalizeManningRow(raw, index))
}

/**
 * People short of the target on the schedule — the planning gap.
 * Null when the position has no requirement to be short of.
 */
export function assignmentGap(row) {
  if (!row?.hasRequirement || row.needed === null) return null
  return Math.max(0, row.needed - num(row.assigned))
}

/**
 * People short of the target on the floor right now — the gap that matters
 * today. A position can be fully assigned and still be short here.
 */
export function floorGap(row) {
  if (!row?.hasRequirement || row.needed === null) return null
  return Math.max(0, row.needed - num(row.working))
}

/**
 * What "working" is measured against: the requirement where one is set, the
 * number assigned otherwise.
 *
 * Written once and shared because the position table, the shift breakdown and
 * the card list all colour a working figure by it, and three copies of the rule
 * would eventually disagree about what a green figure means. It works for a
 * shift as well as a position — a shift carries its own `quantity_needed`.
 */
export function mannedTarget(row) {
  const needed = row?.needed
  if (needed !== null && needed !== undefined && needed > 0) return needed
  return num(row?.assigned)
}

/**
 * The one tone rule for "how covered is this".
 *
 * Counted, not thresholded on a percentage. A percentage rule read 1 of 2 people
 * in as critical (50% is under any sensible threshold) while the same situation
 * described in words is plainly "half the team is here" — and it disagreed with
 * the figure printed beside it, which used the count. Whole people are what this
 * page counts, so: nobody in is critical, everybody in is good, anything between
 * needs a look.
 */
export function coverageToneFor(working, target) {
  if (!target) return 'neutral'
  if (num(working) >= target) return 'good'
  return num(working) === 0 ? 'critical' : 'warn'
}

/** The same rule applied to a row or a shift, which resolve their own target. */
export function workingTone(row) {
  return coverageToneFor(row?.working, mannedTarget(row))
}

/**
 * The single status a row reads as, in precedence order.
 *
 * AWOL leads because it is the only figure that names something going wrong
 * rather than something merely unfilled, and it needs a person regardless of
 * whether the headcount happens to work out.
 */
export function manningStatus(row) {
  const gapOnFloor = floorGap(row)
  const gapOnSchedule = assignmentGap(row)

  if (num(row?.awol) > 0) {
    return { key: 'awol', label: 'AWOL', tone: 'critical' }
  }
  if (gapOnFloor > 0) {
    return { key: 'understaffed', label: `Short ${gapOnFloor}`, tone: 'critical' }
  }
  if (gapOnSchedule > 0) {
    return { key: 'under-assigned', label: 'Under-assigned', tone: 'warn' }
  }
  if (num(row?.notTimedIn) > 0) {
    return { key: 'not-timed-in', label: 'Not timed in', tone: 'warn' }
  }
  if (num(row?.assigned) === 0) {
    return { key: 'unstaffed', label: 'None assigned', tone: 'neutral' }
  }
  return { key: 'manned', label: 'Fully manned', tone: 'good' }
}

/**
 * Everything about a row that needs a person, and nothing that does not.
 *
 * This replaces five columns — not timed in, AWOL, leave, CTO, off — that were
 * almost always zero. A grid of zeros is not information: it made the board
 * eight columns wide to carry, on a normal day, no facts at all, and the one
 * non-zero figure was lost among them. Here a state is only mentioned when
 * somebody is actually in it, so a row is silent when there is nothing to do
 * and reads as a sentence when there is.
 *
 * Order is by what the reader has to act on: a shortfall on the floor first, an
 * unfilled requirement next (that one is scheduling work, not chasing work),
 * then the accounted-for absences, which need nothing.
 */
export function attentionChips(row) {
  const chips = []

  const gapOnFloor = floorGap(row)
  if (gapOnFloor > 0) {
    chips.push({
      key: 'short',
      label: `Short ${gapOnFloor}`,
      tone: 'critical',
      hint: `${gapOnFloor} fewer people working than the requirement of ${row.needed}`,
    })
  }

  if (num(row?.awol) > 0) {
    chips.push({
      key: 'awol',
      label: `${row.awol} AWOL`,
      tone: 'critical',
      hint: 'Absent without leave',
    })
  }

  if (num(row?.notTimedIn) > 0) {
    chips.push({
      key: 'not-timed-in',
      label: `${row.notTimedIn} not timed in`,
      tone: 'warn',
      hint: 'Assigned to a shift today with no time in recorded yet',
    })
  }

  const gapOnSchedule = assignmentGap(row)
  if (gapOnSchedule > 0) {
    chips.push({
      key: 'unfilled',
      label: `${gapOnSchedule} unfilled`,
      tone: 'info',
      hint: `The schedule has ${gapOnSchedule} fewer people assigned than this position requires`,
    })
  }

  // Neutral on purpose: these are accounted for. Tinting them amber would put
  // three people on approved leave in the same visual bracket as an AWOL.
  if (num(row?.leave) > 0) {
    chips.push({ key: 'leave', label: `${row.leave} on leave`, tone: 'neutral' })
  }
  if (num(row?.cto) > 0) {
    chips.push({ key: 'cto', label: `${row.cto} on CTO`, tone: 'neutral' })
  }
  if (num(row?.off) > 0) {
    chips.push({ key: 'off', label: `${row.off} off`, tone: 'neutral', hint: 'Scheduled day off' })
  }

  return chips
}

/** The same reading for one shift. A shift has no `off` — a day off is not tied
 *  to a shift — and no requirement gap worth its own chip, since the shift's
 *  own quantity is shown in its Required cell. */
export function shiftAttentionChips(shift) {
  const chips = []
  if (num(shift?.awol) > 0) {
    chips.push({ key: 'awol', label: `${shift.awol} AWOL`, tone: 'critical' })
  }
  if (num(shift?.notTimedIn) > 0) {
    chips.push({ key: 'not-timed-in', label: `${shift.notTimedIn} not timed in`, tone: 'warn' })
  }
  if (num(shift?.leave) > 0) {
    chips.push({ key: 'leave', label: `${shift.leave} on leave`, tone: 'neutral' })
  }
  if (num(shift?.cto) > 0) {
    chips.push({ key: 'cto', label: `${shift.cto} on CTO`, tone: 'neutral' })
  }
  return chips
}

// Most urgent first. Used as a sort key so that one click on the Attention
// column brings the rows that need a person to the top.
const STATUS_SEVERITY = [
  'awol',
  'understaffed',
  'under-assigned',
  'not-timed-in',
  'unstaffed',
  'manned',
]

/**
 * How urgent a row is, as a number: 0 is the most urgent.
 *
 * A rank rather than a comparator because it is handed to QTable as a column
 * `field`, and QTable sorts ascending on the first click — so ascending has to
 * mean "worst first" for the obvious click to do the obvious thing.
 */
export function statusRank(row) {
  const rank = STATUS_SEVERITY.indexOf(manningStatus(row).key)
  return rank === -1 ? STATUS_SEVERITY.length : rank
}

/**
 * Totals over any set of rows — the whole board, or one site.
 *
 * `needed` stays null unless at least one row in the set carries a
 * requirement, so a summary tile cannot claim a target of 0 for a company that
 * has not set any.
 */
export function sumManning(rows = []) {
  const totals = {
    positions: rows.length,
    shifts: 0,
    needed: 0,
    assigned: 0,
    working: 0,
    notTimedIn: 0,
    awol: 0,
    leave: 0,
    cto: 0,
    off: 0,
    away: 0,
    withRequirement: 0,
    understaffed: 0,
  }
  const sites = new Set()
  let anyRequirement = false

  for (const row of rows) {
    sites.add(row.site)
    totals.shifts += row.shifts?.length ?? 0
    totals.assigned += num(row.assigned)
    totals.working += num(row.working)
    totals.notTimedIn += num(row.notTimedIn)
    totals.awol += num(row.awol)
    totals.leave += num(row.leave)
    totals.cto += num(row.cto)
    totals.off += num(row.off)
    totals.away += num(row.away)

    if (row.hasRequirement && row.needed !== null) {
      anyRequirement = true
      totals.withRequirement += 1
      totals.needed += row.needed
      if (num(row.working) < row.needed) totals.understaffed += 1
    }
  }

  return {
    ...totals,
    sites: sites.size,
    needed: anyRequirement ? totals.needed : null,
  }
}
