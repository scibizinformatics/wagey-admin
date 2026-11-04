import { ref, watch } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { useToast } from 'src/composables/useToast'
import { extractErrorMessage } from 'src/composables/utils/http'
import { createRequestToken } from 'src/composables/utils/requestToken'
import {
  contributionAccountPayload,
  normalizeContributionAccounts,
  validateContributionAccountForm,
} from 'src/composables/utils/contributionAccounts'

/**
 * Employee contribution account numbers for the active company.
 *
 *   GET    /payroll/contributions/accounts/{company_id}/
 *   POST   /payroll/contributions/accounts/{company_id}/
 *   GET    /payroll/contributions/accounts/{company_id}/{id}/
 *   PATCH  /payroll/contributions/accounts/{company_id}/{id}/
 *
 * `PATCH` accepts `is_active` and nothing else — the account number itself is
 * immutable. Changing a number is therefore two writes: deactivate the old row,
 * then create the new one. `replaceContributionAccount` owns that pair because
 * the failure between them is the interesting case: the old number is already
 * off, no rollback exists, and the admin has to be told to add the new one
 * again rather than being shown a generic "save failed".
 *
 * A row's `employee_company` is a membership id while `POST` wants the roster
 * UUID; the panel resolves that with `employeeUuidForAccount` before opening
 * the replace dialog, and the dialog lets the admin pick when it cannot.
 */
export function useAdminContributionAccounts() {
  const toast = useToast()
  const { companyId } = useCompany()

  const accounts = ref([])
  const loading = ref(false)
  const saving = ref(false)

  const listGuard = createRequestToken()

  watch(companyId, () => {
    // Invalidate an in-flight response even if nothing re-fetches: its rows
    // belong to the workspace that was active when it was sent.
    listGuard.next()
    accounts.value = []
  })

  function collectionPath() {
    return `/payroll/contributions/accounts/${companyId.value}/`
  }

  function memberPath(id) {
    return `${collectionPath()}${id}/`
  }

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchContributionAccounts() {
    if (!companyId.value) {
      accounts.value = []
      loading.value = false
      return []
    }
    const token = listGuard.next()
    const askedFor = String(companyId.value)
    loading.value = true
    try {
      const response = await api.get(collectionPath())
      if (!listGuard.isCurrent(token)) return accounts.value
      accounts.value = normalizeContributionAccounts(response.data).filter(
        (account) => account.companyId == null || String(account.companyId) === askedFor,
      )
      return accounts.value
    } catch (error) {
      console.error('Error fetching contribution accounts:', error)
      if (listGuard.isCurrent(token)) {
        accounts.value = []
        toast.error(extractErrorMessage(error, 'Failed to load employee account numbers'))
      }
      return []
    } finally {
      if (listGuard.isCurrent(token)) loading.value = false
    }
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async function createContributionAccount(form) {
    const invalid = validateContributionAccountForm(form)
    if (invalid) {
      toast.warning(invalid)
      return false
    }
    if (!companyId.value) {
      toast.error('Please select a company first')
      return false
    }

    saving.value = true
    try {
      await api.post(collectionPath(), contributionAccountPayload(form))
      toast.success('Account number added')
      await fetchContributionAccounts()
      return true
    } catch (error) {
      console.error('Error creating contribution account:', error)
      toast.error(extractErrorMessage(error, 'Failed to add account number'), { timeout: 6000 })
      return false
    } finally {
      saving.value = false
    }
  }

  // ─── Deactivate ────────────────────────────────────────────────────────────

  /**
   * Retire one number. A partial PATCH rather than a full body: `is_active` is
   * the only writable field, and the number must not travel back at all.
   */
  async function deactivateContributionAccount(account) {
    if (account?.id == null) {
      toast.error('That account number could not be found any more')
      return false
    }

    saving.value = true
    try {
      await api.patch(memberPath(account.id), { is_active: false })
      toast.success('Account number deactivated')
      await fetchContributionAccounts()
      return true
    } catch (error) {
      console.error('Error deactivating contribution account:', error)
      toast.error(extractErrorMessage(error, 'Failed to deactivate account number'), {
        timeout: 6000,
      })
      return false
    } finally {
      saving.value = false
    }
  }

  // ─── Replace ───────────────────────────────────────────────────────────────

  /**
   * Change a number: deactivate the old row, then create the new one.
   *
   * The two writes are deliberately not wrapped in one `try`: the second can
   * fail after the first has landed, and that state is not a normal error. It
   * is reported as what it is, and the list is re-read so the old row shows as
   * inactive while the admin adds the replacement again.
   */
  async function replaceContributionAccount(account, form) {
    const invalid = validateContributionAccountForm(form)
    if (invalid) {
      toast.warning(invalid)
      return false
    }
    if (account?.id == null) {
      toast.error('That account number could not be found any more')
      return false
    }
    if (!companyId.value) {
      toast.error('Please select a company first')
      return false
    }

    saving.value = true
    try {
      try {
        await api.patch(memberPath(account.id), { is_active: false })
      } catch (error) {
        console.error('Error deactivating contribution account for replacement:', error)
        toast.error(extractErrorMessage(error, 'Failed to deactivate the current account number'), {
          timeout: 6000,
        })
        return false
      }

      try {
        await api.post(collectionPath(), contributionAccountPayload(form))
      } catch (error) {
        console.error('Error creating replacement contribution account:', error)
        const detail = extractErrorMessage(error, '')
        toast.error(
          detail
            ? `The old number was deactivated, but the new one could not be saved. Add it again from "Add account". ${detail}`
            : 'The old number was deactivated, but the new one could not be saved. Add it again from "Add account".',
          { timeout: 9000 },
        )
        await fetchContributionAccounts()
        return false
      }

      toast.success('Account number replaced')
      await fetchContributionAccounts()
      return true
    } finally {
      saving.value = false
    }
  }

  return {
    accounts,
    loading,
    saving,
    fetchContributionAccounts,
    createContributionAccount,
    deactivateContributionAccount,
    replaceContributionAccount,
  }
}
