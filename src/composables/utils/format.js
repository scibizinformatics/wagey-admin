export function formatCurrency(val) {
  const n = Number(val ?? 0)
  return '\u20B1' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Hours as a fixed two-decimal string — `"4.85"`, `"0.00"`.
 *
 * The one place the app decides what a decimal hour looks like, shared by the
 * attendance table, the card-taps duration column and the access-cards monthly
 * total. Three pages quoting the same unit must not each invent their own
 * rounding, or a reader comparing them finds figures that differ for no reason.
 *
 * Fixed rather than trimmed so the column aligns: `4.50` and `4.85` are the same
 * width under `dash-num`'s tabular figures, and payroll reads these column-wise.
 * The trailing zero is the format, not noise.
 *
 * A missing figure is `''` rather than `"0.00"` — only the caller knows what an
 * absent duration should look like (`—` beside a tap row, blank in a card cell),
 * and guessing here would silently turn "we could not read this" into "no hours".
 * Note the explicit `''` test: `Number('')` is `0`, so a blank would otherwise
 * format as a real zero.
 *
 * Rounding is done on the scaled integer rather than by `toFixed`, because
 * `toFixed` reads the *stored* double and the stored double is not the number
 * that was computed. A hundredth of an hour is 36 seconds, and durations here
 * come from whole seconds — so exact ties are not a measure-zero curiosity, they
 * arrive every 36 seconds. 3690s is exactly 1.025h, but as a double it is
 * 1.0249999999999999112, and `toFixed(2)` faithfully prints `1.02`: a hundredth
 * low, 36 seconds of a worker's day quietly missing. Nudging by one epsilon
 * *scaled to the value* rescues the genuine ties and leaves everything else
 * alone, since it moves a number by ~1e-14 where a real sub-tie value is at
 * least 1e-4 away.
 *
 * @param {number|null|undefined} hours
 * @returns {string}
 */
export function decimalHoursLabel(hours) {
  if (hours == null || hours === '') return ''
  const n = Number(hours)
  if (!Number.isFinite(n)) return ''
  const scaled = n * 100
  const nudged = scaled + Number.EPSILON * Math.abs(scaled)
  return (Math.round(nudged) / 100).toFixed(2)
}
