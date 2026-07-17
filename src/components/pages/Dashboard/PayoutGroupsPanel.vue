<template>
  <div class="panel-card">
    <div class="panel-head">
      <span class="panel-title">Payout Groups</span>
      <q-btn flat dense round icon="more_vert" size="sm" class="panel-menu" />
    </div>
    <div class="panel-body">
      <div class="p-table-wrap">
        <table class="p-table">
          <thead>
            <tr>
              <th>Group</th>
              <th>Channel</th>
              <th class="num">Employees</th>
              <th class="num">Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(g, i) in groups" :key="i">
              <td>{{ g.group }}</td>
              <td>{{ g.channel }}</td>
              <td class="num">{{ g.employees }}</td>
              <td class="num">{{ fmtAmount(g.amount) }}</td>
              <td>
                <span class="status-pill" :class="`status--${g.status}`">
                  {{ statusLabel(g) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  groups: {
    type: Array,
    default: () => [
      {
        group: 'Operations',
        channel: 'Cash | Cash',
        employees: 18,
        amount: 284500,
        status: 'ready',
      },
      {
        group: 'Finance',
        channel: 'Bank | Bank',
        employees: 8,
        amount: 142300,
        status: 'disputes',
        disputes: 2,
      },
      {
        group: 'Admin',
        channel: 'Paytaca | Paytaca',
        employees: 10,
        amount: 188900,
        status: 'funded',
      },
      {
        group: 'Management',
        channel: 'Check | Check',
        employees: 4,
        amount: 126000,
        status: 'awaiting',
      },
    ],
  },
  fmtCurrency: { type: Function, default: (v) => `₱${Number(v).toLocaleString()}` },
})

function fmtAmount(val) {
  return props.fmtCurrency(val)
}

function statusLabel(g) {
  if (g.status === 'disputes' && g.disputes) return `${g.disputes} Disputes`
  return (
    {
      ready: 'Ready to Fund',
      funded: 'Funded',
      disputes: 'Disputed',
      awaiting: 'Awaiting Release',
    }[g.status] ?? g.status
  )
}
</script>

<style scoped>
.panel-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 20px;
  border-bottom: 1px solid #f1f3f5;
}
.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}
.panel-menu {
  color: #9ca3af;
}
.panel-body {
  padding: 0;
  flex: 1;
  overflow-y: auto;
}

.p-table-wrap {
  overflow-x: auto;
}
.p-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.p-table th {
  text-align: left;
  font-size: 10.5px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 9px 16px;
  border-bottom: 1px solid #e8ecf0;
  background: #f8f9fb;
}
.p-table td {
  padding: 10px 16px;
  color: #374151;
  border-bottom: 1px solid #f1f3f5;
}
.p-table tr:last-child td {
  border-bottom: none;
}
.p-table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.status-pill {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
}
.status--ready {
  background: #e8f5e9;
  color: #2e7d32;
}
.status--funded {
  background: #e0f7fa;
  color: #0e7490;
}
.status--disputes {
  background: #fdecea;
  color: #c62828;
}
.status--awaiting {
  background: #fff8e1;
  color: #f57f17;
}

@media (max-width: 1024px) {
  .p-table {
    font-size: 12px;
  }
  .p-table th,
  .p-table td {
    padding: 9px 12px;
  }
}
@media (max-width: 768px) {
  .p-table th,
  .p-table td {
    padding: 9px 14px;
    white-space: nowrap;
  }
}
</style>
