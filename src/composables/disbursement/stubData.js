export function getStubDashboardSummary() {
  return {
    open_payout_groups: 5,
    review_required: 2,
    awaiting_acknowledgement: 1,
    ready_for_funding: 1,
    ready_for_funding_amount: '45000.00',
    funded: 1,
    funded_amount: '32000.00',
    disbursing: 0,
    disbursing_amount: '0.00',
    completed_this_cutoff: 0,
  }
}

export function getStubPayoutGroupInstances() {
  return [
    {
      id: 473,
      payout_group_name: 'Admin',
      cutoff_instance_name: 'May 16 - 31, 2026',
      payout_method_name: 'Cash',
      employees: 8,
      cash_advance_amount: '0.00',
      net_amount: '40481.57',
      final_amount: '40481.57',
      payout_status: 'review_required',
      payout_status_display: 'Review Required',
      cash_advance_status: 'na',
      cash_advance_status_display: 'N/A',
      status_display: 'Overdue - Review Required',
    },
    {
      id: 474,
      payout_group_name: 'Maintenance',
      cutoff_instance_name: 'Jul 1 - 15, 2026',
      payout_method_name: 'Cash',
      employees: 3,
      cash_advance_amount: '0.00',
      net_amount: '16000.00',
      final_amount: '16000.00',
      payout_status: 'review_required',
      payout_status_display: 'Review Required',
      cash_advance_status: 'na',
      cash_advance_status_display: 'N/A',
      status_display: 'Review Required',
    },
  ]
}

export function getStubPayoutGroupProgress() {
  return {
    payout_group_instance_id: 510,
    payout_group_name: 'Maintenance',
    current_progress: 'review',
    progress: [
      { step: 1, name: 'review', status: 'in_progress' },
      { step: 2, name: 'payslips', status: 'locked' },
      { step: 3, name: 'funding', status: 'locked' },
      { step: 4, name: 'disbursement', status: 'locked' },
      { step: 5, name: 'complete', status: 'locked' },
    ],
  }
}

export function getStubReviewOverview() {
  return {
    total_employee: 3,
    reviewed: 0,
    needs_attention: 0,
    missing_date: 0,
    not_applicable: 3,
  }
}

export function getStubAttendanceSummary() {
  return {
    payout_group_instance_id: 510,
    cutoff_name: 'July 1 - 15, 2026',
    start_date: '2026-07-01',
    end_date: '2026-07-15',
    employees: [
      {
        id: 710,
        employee: 'Edgar Loberos',
        position: 'House Help',
        department: 'Maintenance Team',
        days_worked: 11,
        undertime: '0h 0m',
        late: 0,
        absent: 0,
        ot_hours: '0.00',
        issues: '-',
        status: 'not_applicable',
      },
      {
        id: 709,
        employee: 'Lorenzo Sanchez',
        position: 'House Help',
        department: 'Maintenance Team',
        days_worked: 11,
        undertime: '0h 0m',
        late: 0,
        absent: 0,
        ot_hours: '0.00',
        issues: '-',
        status: 'not_applicable',
      },
    ],
  }
}

export function getStubEmployeePayrollItem() {
  return {
    id: 766,
    full_name: 'Nenita Del Pilar',
    position: 'Service Crew',
    employee_id: 'df38d8a9-0e2c-48e5-9cc5-35996fc3be59',
    summary: {
      days_worked: 15,
      absent_days: 3,
      total_undertime: '9h 39m',
      late: 1,
      total_overtime: '0h 0m',
      leaves: [],
    },
    issues: [
      { type: 'undertime', description: '3h 59m', date: 'July 16, 2026' },
      { type: 'absent', description: null, date: 'July 16, 2026' },
    ],
    attendance: [
      {
        date: 'July 16, 2026',
        hours_worked: '4h 41m',
        undertime: '3h 59m',
        late: '0h 0m',
        overtime: '0h 0m',
        work_type: 'Work',
      },
    ],
  }
}

export function getStubPayslipOverview() {
  return {
    payslip_sent: 3,
    acknowledged: 0,
    pending: 3,
    disputed: 0,
    failed_delivery: 0,
  }
}

export function getStubEmployeePayslips() {
  return [
    { employee: 'Edgar Loberos', position_name: 'House Help', net_pay: '5500.00', payslip_status: 'Pending', acknowledged_on: '-', dispute_status: '-' },
    { employee: 'Lorenzo Sanchez', position_name: 'House Help', net_pay: '5500.00', payslip_status: 'Pending', acknowledged_on: '-', dispute_status: '-' },
    { employee: 'Recardo Durano', position_name: 'House Help', net_pay: '5000.00', payslip_status: 'Pending', acknowledged_on: '-', dispute_status: '-' },
  ]
}

export function getStubPayoutGroupInstanceAmounts() {
  return {
    total_gross_pay: '16000.00',
    total_deductions: '0.00',
    total_cash_advances: '0.00',
    net_funding_required: '16000.00',
    employees: 3,
    group_status: 'Review Required',
  }
}

export function getStubTopEarners() {
  return [
    { employee: 'Lorenzo Sanchez', position_name: 'House Help', net_pay: '5500.00', payslip_status: 'Pending' },
    { employee: 'Edgar Loberos', position_name: 'House Help', net_pay: '5500.00', payslip_status: 'Pending' },
    { employee: 'Recardo Durano', position_name: 'House Help', net_pay: '5000.00', payslip_status: 'Pending' },
  ]
}

export function getStubPayoutGroupInstanceSummary() {
  return {
    net_funded_amount: '16000.00',
    released: 0,
    pending_claim: 3,
    failed: 0,
    cash_on_hand_remaining: '16000.00',
    group_status: 'Review Required',
  }
}

export function getStubDisbursementEmployees() {
  return [
    { employee: 'Edgar Loberos', position: 'House Help', net_pay: '5500.00', payout_method: 'Cash', claim_status: 'Pending', claimed_on: null, proof_of_payment: null, reference_no: null },
    { employee: 'Lorenzo Sanchez', position: 'House Help', net_pay: '5500.00', payout_method: 'Cash', claim_status: 'Pending', claimed_on: null, proof_of_payment: null, reference_no: null },
    { employee: 'Recardo Durano', position: 'House Help', net_pay: '5000.00', payout_method: 'Cash', claim_status: 'Pending', claimed_on: null, proof_of_payment: null, reference_no: null },
  ]
}

export function getStubPayoutGroupCompletion() {
  return {
    net_payroll_amount: '16000.00',
    total_employees_paid: 3,
    employees_paid: 0,
    total_payouts: 0,
    total_fees: '0.00',
    completion_date: null,
  }
}

export function getStubPayoutSummaryByEmployee() {
  return [
    { employee: 'Edgar Loberos', position: 'House Help', payment_method: 'Cash', reference_no: null, net_pay: '5500.00', status: 'Pending', released_on: null, received_by: null },
    { employee: 'Lorenzo Sanchez', position: 'House Help', payment_method: 'Cash', reference_no: null, net_pay: '5500.00', status: 'Pending', released_on: null, received_by: null },
    { employee: 'Recardo Durano', position: 'House Help', payment_method: 'Cash', reference_no: null, net_pay: '5000.00', status: 'Pending', released_on: null, received_by: null },
  ]
}
