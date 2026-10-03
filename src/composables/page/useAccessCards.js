import { computed, ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { extractErrorMessage } from 'src/composables/utils/http'
import {
  isWritableStatus,
  normalizeAccessCard,
  normalizeAccessCards,
  summarizeAccessCards,
} from 'src/composables/utils/accessCards'

/**
 * NFC access cards for the active workspace.
 *
 *   GET   /user/company/{company_id}/access-cards/      the roll of cards
 *   GET   /user/access-cards/{uid}/                     one card, in full
 *   PATCH /user/access-cards/{uid}/employee-assign/     who holds it
 *   PATCH /user/access-cards/{uid}/status/              whether it works
 *
 * Every reading is derived in `composables/utils/accessCards.js` and nothing is
 * computed in the components, so the table, the card list, the summary line and
 * the three dialogs cannot disagree about the same card.
 *
 * Two things about this API shape the composable.
 *
 * Only the list is company-scoped — it takes the company in the path. The detail,
 * assign and status routes are keyed by **uid alone**, with no company anywhere,
 * so a uid from one workspace is writable while another is selected. The page
 * never offers a uid it did not read from this company's list, and this
 * re-resolves the company on every request rather than capturing it at setup, so
 * a workspace switch that lands mid-flight cannot leave a stale id behind. The
 * detail payload does carry a `company`, and a mismatch there is surfaced rather
 * than quietly rendered.
 *
 * And **holder and status are two writes, not one**. `employee-assign` carries
 * both fields, but `status` is a separate endpoint of its own with its own
 * vocabulary — `WRITABLE_STATUSES`, four values, no `stolen` or `expired` — so a
 * card's status is never inferred from the holder change. That is why
 * `assignCard` still sends a status: the endpoint wants both keys, and sending
 * the card's *current* status is what makes a reassignment leave the status
 * exactly as it found it. `setCardStatus` is the only writer of a status the
 * reader chose, and it is the only one guarded against the four the endpoint
 * accepts.
 */

/** Ids cross the wire as numbers in some payloads and strings in others. */
function sameId(a, b) {
  if (a == null || b == null) return false
  return String(a) === String(b)
}

/** Trimmed string, or ''. Mirrors `accessCards.js`'s own helper rather than
 *  importing it, which is not exported: this file needs it for one guard. */
function text(value) {
  if (value == null) return ''
  return typeof value === 'string' ? value.trim() : String(value).trim()
}

export function useAccessCards() {
  const { companyId } = useCompany()

  const cards = ref([])
  const loading = ref(false)
  const saving = ref(false)
  /** The status write, tracked apart from `saving` — the two can be on screen
   *  together, and a spinner on the wrong one reports the wrong request. */
  const settingStatus = ref(false)
  const error = ref('')

  /** The company the rows on screen were actually fetched for. */
  const servedCompanyId = ref(null)

  // The workspace switcher and the refresh button both fire faster than this
  // endpoint answers, and a slower earlier response must not land on top of a
  // newer one — a table of another company's cards is the worst possible
  // outcome on a page that hands out credentials.
  let latestRequest = 0

  const summary = computed(() => summarizeAccessCards(cards.value))

  /**
   * Load every card in the active workspace.
   *
   * @returns {Promise<Array>} the normalised rows, or [] on failure.
   */
  async function fetchCards() {
    const company = companyId.value
    if (!company) {
      cards.value = []
      servedCompanyId.value = null
      // Named rather than left as an empty table: no workspace selected is a
      // different situation from a workspace with no cards issued.
      error.value = 'No company selected. Pick a workspace to see its access cards.'
      return []
    }

    const token = ++latestRequest
    loading.value = true
    error.value = ''

    try {
      const response = await api.get(`/user/company/${company}/access-cards/`)
      if (token !== latestRequest) return cards.value

      const payload = response.data
      const list = Array.isArray(payload)
        ? payload
        : (payload?.data ?? payload?.results ?? payload?.access_cards ?? [])

      cards.value = normalizeAccessCards(list)
      servedCompanyId.value = company
      return cards.value
    } catch (err) {
      if (token !== latestRequest) return cards.value
      cards.value = []
      servedCompanyId.value = null
      error.value = extractErrorMessage(err, 'Failed to load access cards')
      return []
    } finally {
      if (token === latestRequest) loading.value = false
    }
  }

  /**
   * One card in full — the fields the list leaves out (card type, the issued /
   * activated / deactivated / expires stamps, the label).
   *
   * Never cached: the dialog that opens it is the one place a person checks a
   * card's history right after changing it, and a cached answer there would show
   * them the state they just left.
   *
   * @param {string} uid
   * @param {object} [options]
   *   expectMissing — a 404 is a normal answer here ("no card with that UID"),
   *   not a failure, so the axios interceptor is told not to log it. The promise
   *   still rejects; only the console noise changes. Passed by the assign
   *   dialog's UID lookup, where being told a card is unknown is the point of
   *   asking, and never by the detail dialog, where the uid came off a row the
   *   list just returned and a 404 would be a real fault.
   * @returns {Promise<object>} the normalised card
   */
  async function fetchCard(uid, { expectMissing = false } = {}) {
    const response = await api.get(
      `/user/access-cards/${encodeURIComponent(uid)}/`,
      expectMissing ? { expectedStatuses: [404] } : undefined,
    )
    const payload = response.data?.data ?? response.data ?? {}
    const card = normalizeAccessCard(payload)

    // The route is keyed by uid alone, so nothing in the request said which
    // company we are in. When the payload names one and it is not ours, say so
    // rather than render another workspace's card as though it were on the list.
    const owner = payload?.company
    card.foreign = owner != null && companyId.value != null && !sameId(owner, companyId.value)
    return card
  }

  /**
   * Assign a card to an employee.
   *
   * `status` is not a decision this function makes and must not be allowed to
   * look like one — the caller passes the card's current status so that handing
   * a card to somebody leaves its working state untouched, which is the whole
   * point of splitting status out into its own endpoint. Passing something else
   * here would quietly re-enable a card that had been revoked.
   *
   * @param {string} uid
   * @param {{employeeId: string, status: string}} payload
   */
  async function assignCard(uid, { employeeId, status }) {
    saving.value = true
    try {
      const response = await api.patch(
        `/user/access-cards/${encodeURIComponent(uid)}/employee-assign/`,
        { employee_id: employeeId, status },
      )
      return response.data
    } finally {
      saving.value = false
    }
  }

  /**
   * Put a card into one of the four states the status endpoint accepts.
   *
   * Guarded rather than trusted: `WRITABLE_STATUSES` is the endpoint's
   * vocabulary, and `stolen` / `damaged` / `expired` can all arrive on a card
   * from a payload this app never chose. A guard on a form select protects
   * against a person; this protects against a stale value reappearing in one.
   * The reject is local and immediate, so it cannot half-apply.
   *
   * Its own `settingStatus` flag rather than `saving`, because the confirm dialog
   * and the assign form can both be on screen and a spinner on the wrong one
   * would report the wrong write in flight.
   *
   * @param {string} uid
   * @param {string} status one of `WRITABLE_STATUSES`
   */
  async function setCardStatus(uid, status) {
    if (!isWritableStatus(status)) {
      throw new Error(`"${text(status) || 'empty'}" is not a status this card can be put into.`)
    }
    settingStatus.value = true
    try {
      const response = await api.patch(`/user/access-cards/${encodeURIComponent(uid)}/status/`, {
        status: text(status).toLowerCase(),
      })
      return response.data
    } finally {
      settingStatus.value = false
    }
  }

  function clearError() {
    error.value = ''
  }

  /** Drop everything held for the previous workspace. A uid from one company is
   *  not a card in the next one, and the in-flight token is bumped so a response
   *  already on its way cannot repopulate the table. */
  function reset() {
    latestRequest += 1
    cards.value = []
    servedCompanyId.value = null
    error.value = ''
    loading.value = false
    settingStatus.value = false
  }

  return {
    // state
    cards,
    summary,
    loading,
    saving,
    settingStatus,
    error,
    servedCompanyId,
    // methods
    fetchCards,
    fetchCard,
    assignCard,
    setCardStatus,
    clearError,
    reset,
  }
}
