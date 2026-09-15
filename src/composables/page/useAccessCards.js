import { computed, ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { extractErrorMessage } from 'src/composables/utils/http'
import {
  normalizeAccessCard,
  normalizeAccessCards,
  summarizeAccessCards,
} from 'src/composables/utils/accessCards'

/**
 * NFC access cards for the active workspace.
 *
 *   GET   /user/company/{company_id}/access-cards/      the roll of cards
 *   GET   /user/access-cards/{uid}/                     one card, in full
 *   PATCH /user/access-cards/{uid}/employee-assign/     who holds it, and whether it works
 *
 * Every reading is derived in `composables/utils/accessCards.js` and nothing is
 * computed in the components, so the table, the card list, the summary line and
 * the two dialogs cannot disagree about the same card.
 *
 * Two things about this API shape the composable.
 *
 * Only the list is company-scoped — it takes the company in the path. The detail
 * and assign routes are keyed by **uid alone**, with no company anywhere, so a
 * uid from one workspace is writable while another is selected. The page never
 * offers a uid it did not read from this company's list, and this re-resolves
 * the company on every request rather than capturing it at setup, so a workspace
 * switch that lands mid-flight cannot leave a stale id behind. The detail
 * payload does carry a `company`, and a mismatch there is surfaced rather than
 * quietly rendered.
 *
 * And a write is a PATCH that takes **both** the employee and the status
 * together, so "activate this card" and "give this card to somebody" are the
 * same request. That is why the assign dialog always sends both fields, holding
 * the current employee when only the status is being changed — sending a partial
 * body would be asking the server to infer the half we left out.
 */

/** Ids cross the wire as numbers in some payloads and strings in others. */
function sameId(a, b) {
  if (a == null || b == null) return false
  return String(a) === String(b)
}

export function useAccessCards() {
  const { companyId } = useCompany()

  const cards = ref([])
  const loading = ref(false)
  const saving = ref(false)
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
   * Assign a card to an employee, and set whether it works.
   *
   * Both halves travel together because that is the endpoint's shape — see the
   * module header. The caller passes the employee it wants the card to end up
   * with, including when the only thing changing is the status.
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
  }

  return {
    // state
    cards,
    summary,
    loading,
    saving,
    error,
    servedCompanyId,
    // methods
    fetchCards,
    fetchCard,
    assignCard,
    clearError,
    reset,
  }
}
