export const STATUS_COLORS = {
  draft: { bg: '#f3f4f6', text: '#6b7280', dot: '#9ca3af' },
  needs_attention: { bg: '#fff8e1', text: '#b45309', dot: '#f59e0b' },
  pending_review: { bg: '#fff8e1', text: '#b45309', dot: '#f59e0b' },
  under_review: { bg: '#e8f0fe', text: '#1a56db', dot: '#3b82f6' },
  reviewed: { bg: '#e6f7ed', text: '#0a7a3e', dot: '#22c55e' },
  approved: { bg: '#e6f7ed', text: '#0a7a3e', dot: '#22c55e' },
  awaiting_acknowledgment: { bg: '#f0f0ff', text: '#5b21b6', dot: '#8b5cf6' },
  acknowledged: { bg: '#e6f7ed', text: '#0a7a3e', dot: '#22c55e' },
  ready_for_funding: { bg: '#ede9fe', text: '#5b21b6', dot: '#8b5cf6' },
  funded: { bg: '#e6f7ed', text: '#0a7a3e', dot: '#22c55e' },
  pending: { bg: '#f8fafc', text: '#6b7280', dot: '#9ca3af' },
  disbursing: { bg: '#fffbeb', text: '#b45309', dot: '#f59e0b' },
  disbursed: { bg: '#e6f7ed', text: '#0a7a3e', dot: '#22c55e' },
  complete: { bg: '#e6f7ed', text: '#0a7a3e', dot: '#22c55e' },
  disputed: { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444' },
  failed: { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444' },
}

export function statusColor(status) {
  return STATUS_COLORS[status] ?? { bg: '#f3f4f6', text: '#6b7280', dot: '#9ca3af' }
}
