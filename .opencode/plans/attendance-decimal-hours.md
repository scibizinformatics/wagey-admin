# Attendance duration: show decimal hours instead of `4h 51m`

## Goal

The Duration column shows decimal hours — `4.85`, `4.50`, `4.25`, `4.75` — where it
shows `4h 51m` today. Decimal is the right unit for this column on three counts:

- The product already keeps durations in decimal hours: shift templates store `total_hours`
  and `break_hours` as decimals (`AdminSettingsPanelShifts.vue:843,850`), including the 1-hour
  break (`workingHours >= 9 ? 1 : 0`, `:827`). The attendance column is the odd one out.
- The backend's `duration` arrives in exactly this form (`7.75` = 7h45m), so the column can
  show the figure payroll is computed from instead of a re-derived approximation of it.
- A payroll reader compares against a decimal on the payslip; `4.85` is the number they will
  be checking.

## Decisions taken

- Column label: **Worked Hours (Decimal)**.
- Cell shows the decimal; the `4h 51m` reading stays available **on hover** as a `q-tooltip`.
- The Add dialog's **Elapsed** preview stays in `h/m` — it is a pre-save estimate that cannot
  know the break, and looking different from the table's net figure is the point.
- Rounding: **nearest minute**, not floor (see below).

## The one non-obvious change: where rounding happens

Today `attendanceDurationLabelOf` floors to whole minutes. Flooring is invisible when the
figure is printed as `4h 51m`, but it is *not* invisible once the same number is printed as a
decimal — 4h51m29s floored is 291 minutes = `4.85`, while rounded is 291 too, but 4h51m31s
floors to `4.85` and rounds to `4.86`. Two places that round differently produce a cell that
disagrees with its own tooltip and with the sort order.

So: **one rounding point.** Whole minutes are the unit of record (a terminal stamps seconds,
payroll counts minutes), and the decimal, its `h/m` tooltip and the sort all derive from that
one value. This does change the existing `h/m` reading from floor to nearest minute — intended,
and it makes the two renderings agree by construction.

## Changes

### 1. `src/composables/utils/attendance.js`

Replace `attendanceDurationLabelOf` (currently `:469`) with the minutes source of truth plus
the decimal formatters. Nothing above it changes — `attendanceNetDurationMs` and its guards
stay exactly as they are.

```js
/**
 * Worked time in whole minutes — the single rounding point for the page.
 *
 * Minutes are the unit of record: a terminal stamps seconds, and rounding once
 * here is what lets the decimal figure, its h/m tooltip and the sort order agree
 * about the last minute of a shift. Flooring — what this used to do — survives
 * being printed as `4h 51m` and does not survive being printed as `4.85`.
 */
export function attendanceWorkedMinutesOf(row) {
  const ms = attendanceDurationOf(row)
  if (ms == null) return null
  return Math.round(ms / 60000)
}

/**
 * Worked hours as a decimal, or null when the row cannot answer.
 *
 * Decimal because that is the unit this product keeps durations in, and because
 * the backend's own `duration` arrives in exactly this form.
 */
export function attendanceDecimalHoursOf(row) {
  const minutes = attendanceWorkedMinutesOf(row)
  if (minutes == null) return null
  return minutes / 60
}

/**
 * `"4.85"` — two decimals, always.
 *
 * Fixed rather than trimmed so the column aligns: `4.50` and `4.85` are the same
 * width under `dash-num`'s tabular figures, and payroll reads these column-wise.
 * The trailing zero is the format, not noise.
 */
export function attendanceDecimalHoursLabelOf(row) {
  const hours = attendanceDecimalHoursOf(row)
  if (hours == null) return '—'
  return hours.toFixed(2)
}

/** `"4h 51m"` for the same minutes — the hover reading of the cell above. */
export function attendanceDurationLabelOf(row) {
  const minutes = attendanceWorkedMinutesOf(row)
  if (minutes == null) return '—'
  return formatMinutes(minutes)
}
```

`attendanceDurationLabel(timeIn, timeOut)` — the elapsed pair helper the Add dialog uses — is
untouched, as is everything about the net/elapsed fallback.

### 2. `src/components/pages/Attendance/AttendanceTable.vue`

- Import `attendanceDecimalHoursLabelOf` and `attendanceDecimalHoursOf`; keep
  `attendanceDurationLabelOf` for the tooltip and `attendanceDurationOf` for `hasDuration`.
- `:266` — the cell value becomes decimal; add a sibling helper for the tooltip:

```js
const decimalOf = (row) => attendanceDecimalHoursLabelOf(row)
const hoursTooltipOf = (row) => attendanceDurationLabelOf(row)
const hasDuration = (row) => attendanceDurationOf(row) != null
```

- `:120-124` — the cell. The tooltip goes **directly inside the `<q-td>`**, not wrapped around
  the value span: Quasar anchors a tooltip to its parent element, so this way the whole cell is
  the hit area rather than the 40px of text.

```html
<q-td key="duration" :props="props" class="att-table__td">
  <q-tooltip v-if="hasDuration(props.row)" :delay="300">
    {{ hoursTooltipOf(props.row) }}
  </q-tooltip>
  <span class="duration dash-num" :class="{ 'duration--none': !hasDuration(props.row) }">
    {{ decimalOf(props.row) }}
  </span>
</q-td>
```

- `:352` column definition: `label: 'Worked Hours (Decimal)'`,
  `field: (row) => attendanceDecimalHoursOf(row)` (still numeric, still monotonic),
  `width` 104 → 132, plus `headerClasses: 'att-table__th--wrap'`. Keep `name: 'duration'` — it
  is the sort key `sortValueFor` and `onSortChange` switch on, so renaming it would reach into
  the page's sort plumbing for no gain.
- Add the wrap override to the component's `<style scoped>`, after `.duration--none`:

```scss
/* `dash-qtable` sets `white-space: nowrap` on every header cell
   (src/css/dashboard.scss:1861) and this is now the longest label in the table.
   Wrapping to two lines keeps the column narrow enough for the 1024-1279 layout,
   where Work type has already dropped and the remaining columns are meant to fit
   without a sideways scroll. Widening to fit the label instead would spend ~64px
   the page has already budgeted elsewhere. */
.att-table :deep(.att-table__th--wrap) {
  white-space: normal;
}
```

- Update the component docstring at `:188`, which currently describes duration as reading
  "the backend's worked hours".

### 3. `src/components/pages/Attendance/AttendanceCardList.vue`

`:224` becomes `attendanceDecimalHoursLabelOf`, and the `:142` slot label becomes
`Worked Hours`.

No tooltip here, deliberately: `q-tooltip` is hover-only, so on the touch widths this component
exists for, the `h/m` reading would simply be unavailable. Say so in the comment rather than
leaving a reader to wonder why the card view lost it — the decimal is the figure that matters,
and the card has room for it alone.

### 4. `src/pages/AttendancePage.vue`

`sortValueFor`'s `'duration'` case (`:941`) reads the same minutes value, so the sort cannot
order by a different duration than the cell displays:

```js
    case 'duration': {
      const minutes = attendanceWorkedMinutesOf(row)
      if (minutes == null) return ''
      return String(minutes).padStart(7, '0')
    }
```

Import swap: `attendanceDurationOf` → `attendanceWorkedMinutesOf`. Padding is still 7 chars;
minutes are non-negative so the string comparator orders them numerically.

Also update the responsive comment block at `:2297-2309`, which lists `duration` as one of the
six columns.

### 5. Housekeeping

`.opencode/plans/attendance-duration-unit-fix.md` is implemented — delete it with this one when
done. Per AGENTS.md these files are historical, not specs.

## Verification

`npm run lint` (build gate). Prettier on the four touched files only.

Resolver assertions, using the requested examples: 4h51m → `4.85`, 4h30m → `4.50`,
4h15m → `4.25`, 4h45m → `4.75`; plus the rounding boundary (4h51m29s → `4.85`,
4h51m31s → `4.86`), `0` on a completed record → `0.00`, a record with one punch → `—`, and
every guard case from the unit work still falling back to elapsed rather than to a number.

Then on staging, at 1280px and again at 1024px: the header wraps rather than pushing a
horizontal scrollbar; ascending and descending sorts agree with what the cells show; hovering a
cell gives `4h 51m`; below 1024px the card list shows the decimal.

## Non-goals

- The Add dialog's `Elapsed` preview — stays `h/m`, by decision.
- `attendanceDurationLabel(timeIn, timeOut)` — the elapsed pair helper, still h/m.
- The net/elapsed fallback, the span guards, `DURATION_UNIT`, and the no-`duration`-on-write
  behaviour — all unchanged.