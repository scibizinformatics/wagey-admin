/**
 * Parsing the bulk address box, shared by the invite modal (which reports what
 * it found before a send) and the Invite page (which checks the sent addresses
 * against the refreshed list afterwards) so both agree on what one address is.
 *
 * The box accepts however a person happens to have the addresses to hand — one
 * per line out of a spreadsheet column, comma-separated out of a mail client,
 * or semicolons out of Outlook — because the alternative is asking them to
 * reformat a list they already have. Whitespace inside a paste is a separator
 * too, so a wrapped line does not become one malformed address.
 */

/** Everything that can sit between two addresses in a pasted list. */
const SEPARATORS = /[\s,;]+/

/** Deliberately the same shape the single-email field validates against, so
 *  one address is not accepted in one mode and refused in the other. */
const EMAIL_SHAPE = /.+@.+\..+/

/** The form an address is compared in, never the form it is sent in — a mail
 *  server does not distinguish case, and the API may hand an address back
 *  lowercased, so every comparison in this feature goes through here. */
export const normalizeEmail = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

export const isEmailShaped = (value) => EMAIL_SHAPE.test(String(value ?? '').trim())

/**
 * Split a pasted blob into what will be sent, what cannot be, and what was
 * already there.
 *
 * The three are reported separately rather than folded into a single count
 * because they need different answers from the reader: a duplicate is nothing
 * to fix (it is dropped and the send is still complete), while a malformed
 * address is a typo that would otherwise be silently discarded — someone would
 * be left off the list with nothing on screen ever having said so.
 *
 * @param {string} raw
 * @returns {{ valid: string[], invalid: string[], duplicates: string[] }}
 *   `valid` keeps each address exactly as it was typed, in the order it was
 *   written, with later repeats of one address dropped.
 */
export function parseEmailList(raw) {
  const tokens = String(raw ?? '')
    .split(SEPARATORS)
    .map((token) => token.trim())
    .filter(Boolean)

  const valid = []
  const invalid = []
  const duplicates = []
  const seen = new Set()

  for (const token of tokens) {
    if (!isEmailShaped(token)) {
      // Kept as typed, not normalised: it is echoed back for the person to
      // correct, and lowercasing their typo would make it harder to spot.
      if (!invalid.includes(token)) invalid.push(token)
      continue
    }
    // Compared case-insensitively but kept as typed: the address goes to the
    // server the way the person wrote it, while `Ana@x.com` after `ana@x.com`
    // is still recognised as the same invitation.
    const key = normalizeEmail(token)
    if (seen.has(key)) {
      if (!duplicates.includes(token)) duplicates.push(token)
      continue
    }
    seen.add(key)
    valid.push(token)
  }

  return { valid, invalid, duplicates }
}
