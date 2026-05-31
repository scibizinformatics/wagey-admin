export function formatCurrency(val) {
  const n = Number(val ?? 0)
  return '\u20B1' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
