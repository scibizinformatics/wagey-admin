# Attendance duration: add the missing span floor, then pin the unit to hours

## Why

The Duration column showed `0h 8m` where it should have shown `8h 0m`. Diagnosis, for a
9h elapsed shift whose backend net is 8h after a 1h break:

| backend sends | read as | renders            |
| ------------- | ------- | ------------------ |
| `8`           | hours   | `8h 0m`            |
| `8`           | minutes | `0h 8m`  ← seen    |
| `480`         | minutes | `8h 0m`            |

"Only minutes, no hours" means `Math.floor(minutes / 60)` is always `0`, i.e. the figure is
single-digit, i.e. `duration` is in **hours**. `DURATION_UNIT` was pinned to `'minutes'`
without verification, so 8 became 8 minutes.

**The real defect is the guard, not the constant.** `attendanceNetDurationMs` only rejected
figures that were *too large* (`ms > elapsedMs`). A wrong-unit figure comes out too *small*
— 8h misread as minutes is 2.5% of a 9h span — and sailed straight through, rendering a
plausible-looking wrong number with nothing to notice it by. A one-sided guard is not a guard.

## Order matters

Guard first, flip second. Never flip before the floor exists, or there is a window where a
wrong guess renders wrong numbers. With the floor in place, a wrong pin degrades to elapsed
time plus a console warning — never a wrong number in the column.

## Changes — all in `src/composables/utils/attendance.js`

Single file. No component changes: the table, card list and sort already route through
`attendanceDurationOf`.

### 1. Add the span floor (`:296-358`, replace the whole block)

```js
// ── Backend duration ─────────────────────────────────────────────────────────
// The attendance endpoint returns a numeric `duration` per record, already net
// of the unpaid break — it is the figure payroll is built from, and the one the
// reader is reconciling their own hours against.
//
// The unit is stated nowhere in the payload or its docs, so it is pinned here
// and nowhere else. `hours` is this product's convention for a plain numeric
// duration — shift templates carry `total_hours`, contracts carry
// `work_hours_per_week` — and a completed record reports `8` for an eight-hour
// net shift. If that ever changes, flip this one constant: the span checks
// below mean a wrong pin degrades to elapsed time and a console warning, never
// to a wrong number in the column.
const DURATION_UNIT = 'hours'

const MS_PER_UNIT = { seconds: 1000, minutes: 60000, hours: 3600000 }
const MS_PER_DURATION_UNIT = MS_PER_UNIT[DURATION_UNIT] || MS_PER_UNIT.hours

/**
 * How much of its own shift a record's worked time must account for.
 *
 * The upper bound (worked <= elapsed) is not enough on its own: a figure read in
 * the wrong unit comes out *small*, and passes it — which is how a correct
 * eight-hour net shift rendered as `0h 8m`, a plausible-looking wrong number
 * with nothing to notice it by. A break is not 80% of a day, so a record whose
 * worked time is under a fifth of its elapsed span is a misread figure, not a
 * very short shift. Deliberately generous: this has to catch orders-of-magnitude
 * errors, not adjudicate a genuine split shift with a long unpaid gap.
 */
const MIN_NET_FRACTION_OF_ELAPSED = 0.2

/** Below this span the fraction says nothing — a 5-minute clock-in/clock-out
 *  is 100% of itself, and must not be second-guessed. */
const MIN_ELAPSED_FOR_FRACTION_MS = 30 * 60 * 1000

/** Warned once per reason, so a wrong unit is noticed rather than read as truth. */
const warnedAboutDuration = new Set()

function warnAboutDuration(row, raw, reason) {
  if (warnedAboutDuration.has(reason)) return
  warnedAboutDuration.add(reason)
  console.warn(
    `[attendance] Backend duration unusable (${reason}); showing elapsed time instead.`,
    { id: row?.id, duration: raw },
  )
}

/**
 * The API's own `duration` for one record, in milliseconds, or null when the
 * row cannot answer.
 *
 * Four things make a stored figure untrustworthy, and each falls back to null
 * rather than to a number nobody can defend:
 *
 *   - absent, null, blank, non-numeric or negative — nothing was computed;
 *   - a `0` on a record that is still open — an open record has no worked time
 *     to report, and zero is what an uncomputed field carries;
 *   - more time than the punches actually span — stale, or the wrong unit;
 *   - a fraction of that span too small to be a shorter shift — the wrong unit.
 *
 * `0` on a *completed* record is kept: two punches seconds apart is a real
 * answer, and flattening it to "unknown" would hide a short shift.
 */
export function attendanceNetDurationMs(row) {
  const raw = row?.duration
  if (raw == null || raw === '') return null

  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) {
    warnAboutDuration(row, raw, `not a usable figure (${typeof raw})`)
    return null
  }

  if (value === 0 && !isRecordComplete(row)) return null

  const ms = value * MS_PER_DURATION_UNIT
  const elapsedMs = attendanceDurationMs(row?.time_in, row?.time_out)

  if (elapsedMs != null) {
    if (ms > elapsedMs) {
      warnAboutDuration(row, raw, 'more time than the punches span')
      return null
    }
    if (
      elapsedMs >= MIN_ELAPSED_FOR_FRACTION_MS &&
      ms < elapsedMs * MIN_NET_FRACTION_OF_ELAPSED
    ) {
      warnAboutDuration(
        row,
        raw,
        `too small a fraction of the punches span (${Math.round((ms / elapsedMs) * 100)}%)`,
      )
      return null
    }
  }

  return ms
}
```

Note the `warnedAboutDuration` boolean becomes a `Set` keyed by reason, so an upper-bound
failure and a lower-bound failure are both visible instead of one masking the other.

### 2. Verify

`npm run lint` (build gate — `eslint-webpack-plugin` runs in dev and build).
Prettier: this file only (`npx prettier --write src/composables/utils/attendance.js`).

Re-run the resolver assertions against a 9h span with `duration: 8` → expect `8h 0m`; add
the misread cases → `duration: 480` (hours reading) falls back to `9h 0m`, `duration: 0.08`
falls back to `9h 0m`, `duration: 7.75` on a 9h span (86%) is kept as `7h 45m`, a genuine
`duration: 2` of a 4h span (50%) is kept. Existing cases must not regress: absent/null/blank/
negative/garbage → elapsed, `0` on an open record → `—`, `0` on a completed record kept,
overnight spans intact.

## Verification on staging

Reload `/app/attendance` with the console open:

- **Quiet console + `8h 0m` on a row whose punches span `9h`** → hours confirmed, done.
- **A warn on a completed row** → the unit is minutes after all. Flip
  `DURATION_UNIT` back to `'minutes'` (one line). Nothing was displayed wrongly in the
  meantime: the floor sent those rows to elapsed.

## Worth raising with the backend owner

The unit of `duration` is stated in neither the payload nor its docs, which is why it was
guessable at all. Having the endpoint document it — or return it as `duration_hours`
alongside — deletes `DURATION_UNIT` entirely.