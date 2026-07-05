# Payroll Page Redesign Plan

## Problem Statement
The current PayrollPage.vue has design inconsistencies with EmployeesPage.vue and is missing key action buttons that existed in the original implementation.

## Current Issues Identified

### 1. Design Mismatch with EmployeesPage
- Container structure differs (missing `q-page` wrapper)
- Header layout and styling not matching
- Stats cards section structure different
- Table implementation uses custom HTML instead of Quasar `q-table`
- Action buttons are inline instead of dropdown menu pattern
- Missing blue header modal design pattern

### 2. Missing Actions in Current File
The following actions exist in the ORIGINAL file but were intended to be preserved:
- **View Details** - Opens employee payroll details modal
- **Download Payslip** - Downloads individual employee payslip PDF
- **Export to PDF** - Export entire payroll run to PDF (was in header)

### 3. File State Issue
The file was not properly updated with the rewritten version. The current file still contains:
- 2,584 lines (old structure)
- "Payroll Runs Table" section
- "Payroll Overview" section  
- "Card View" section
- Multiple redundant tables

## Proposed Solution

### Complete File Rewrite to Match EmployeesPage Design

#### Template Structure Changes:
1. **Add `q-page` wrapper** with `employee-dashboard` class
2. **Match header exactly:**
   - Title: "Payroll" 
   - Primary button: "Export Payroll" (when on runs list) or "Back to Runs" (when viewing employees)
   - Search input (only when viewing employees)
   - Same CSS classes: `page-header`, `header-content`, `page-title`, `header-actions`, `add-employee-btn`, `header-search`

3. **Stats cards:** 3-column grid matching EmployeesPage pattern
   - Total Runs/Employees
   - Total Gross Pay
   - Total Net Pay

4. **Unified Table using `q-table` component:**
   - **View 1:** Payroll Runs list
     - Columns: Run ID, Name, Status, Period, Calculated, Final Amount, Employees, Actions
     - Actions dropdown: View Run, Export to PDF
   - **View 2:** Employees in selected run
     - Columns: Employee, Status, Gross Pay, Net Pay, Actions
     - Actions dropdown with ALL workflow actions:
       - Approve Admin (if status=draft)
       - Approve Owner (if status=approved_admin)
       - Release Payslip (if status=approved_owner)
       - Cash Disbursement (if status=funded)
       - Bank Transfer (if status=funded)
       - **View Details** (always available)
       - **Download Payslip** (always available)

5. **Employee Details Modal:**
   - Blue header (#2563eb)
   - White text
   - Avatar icon with receipt icon
   - Information cards grid
   - Actions: Close button, Download Payslip button

#### Script Changes:
- Use `setup` script syntax
- Import `usePayroll` composable
- Maintain all existing workflow action methods
- Add `viewEmployeeDetails()` method
- Add `downloadPayslip()` method
- Add `exportRunToPDF()` method

#### CSS Changes:
- Copy all CSS classes from EmployeesPage.vue:
  - `.employee-dashboard`
  - `.dashboard-container`
  - `.page-header` and child classes
  - `.stats-section` and `.stats-card`
  - `.table-section` and related classes
  - `.action-menu-btn`, `.action-dropdown`, `.dropdown-item`
  - `.modal-card`, `.modal-header`, `.modal-content`
  - All responsive breakpoints

## Action Items

### Phase 1: Complete File Rewrite
- [ ] Rewrite entire PayrollPage.vue to match EmployeesPage structure
- [ ] Implement two-view system (Runs list → Employees list)
- [ ] Add all workflow actions in dropdown menu
- [ ] Ensure View Details and Download Payslip are included in dropdown

### Phase 2: Preserve All Original Functionality
- [ ] Verify all workflow actions work (approve, release, disburse)
- [ ] Verify modal opens with employee details
- [ ] Verify PDF download functionality
- [ ] Verify export functionality

### Phase 3: Design Verification
- [ ] Compare header pixel-by-pixel with EmployeesPage
- [ ] Compare stats cards styling
- [ ] Compare table header/row styling
- [ ] Compare dropdown menu styling
- [ ] Compare modal design (blue header)

## Expected Result
- Single unified table (no redundant sections)
- Visual match with EmployeesPage
- All original actions preserved (View Details, Download Payslip)
- Cleaner UX with dropdown menus
- ~600 lines (down from 2,584)

## Questions for User

1. **Do you want BOTH "View Details" AND "Download Payslip" in the dropdown menu, or should one be a primary button?**

2. **Should the "Export Payroll" button in the header export ALL runs, or should there be an export option per run in the dropdown?**

3. **Do you want a "Fund Run" bulk action button somewhere (since that was in the original workflow)?**

4. **Should I proceed with this complete rewrite plan?**
