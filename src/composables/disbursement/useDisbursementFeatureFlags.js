import { reactive, computed } from 'vue'

const flags = reactive({
  list: false,
  review: false,
  payslips: false,
  funding: false,
  disburse: false,
  complete: false,
})

const PAGE_NAMES = {
  list: 'List',
  review: 'Review',
  payslips: 'Payslips',
  funding: 'Funding',
  disburse: 'Disburse',
  complete: 'Complete',
}

export function useDisbursementFeatureFlags() {
  function setFlag(page, value) {
    if (page in flags) {
      flags[page] = value
    }
  }

  const migrationProgress = computed(() => {
    const total = Object.keys(flags).length
    const completed = Object.values(flags).filter(Boolean).length
    return {
      total,
      completed,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  })

  return {
    flags,
    setFlag,
    migrationProgress,
    pageNames: PAGE_NAMES,
  }
}
