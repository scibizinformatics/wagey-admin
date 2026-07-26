<template>
  <div class="stepper-header">
    <div
      v-for="(step, i) in steps"
      :key="i"
      class="step-node"
      :class="[step.state, { clickable: step.state !== 'locked' }]"
    >
      <router-link
        v-if="step.state !== 'locked'"
        :to="step.route"
        class="step-link"
      >
        <div class="step-circle">
          <q-icon v-if="step.state === 'completed'" name="check" size="14px" />
          <span v-else>{{ i + 1 }}</span>
        </div>
        <div class="step-label">{{ step.label }}</div>
      </router-link>
      <div v-else class="step-link">
        <div class="step-circle">
          <span>{{ i + 1 }}</span>
        </div>
        <div class="step-label">{{ step.label }}</div>
      </div>
      <div v-if="i < steps.length - 1" class="step-line" :class="{ 'line-done': step.state === 'completed' }" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'

const { fetchPayoutGroupProgress } = useDisbursementApi()

const props = defineProps({
  groupId: { type: [String, Number], required: true },
})

const BASE_PATH = '/app/payroll'

const stepDefs = [
  { label: 'Review Employees', routeKey: 'review' },
  { label: 'Payslips', routeKey: 'payslips' },
  { label: 'Funding', routeKey: 'funding' },
  { label: 'Disbursement', routeKey: 'disburse' },
  { label: 'Complete', routeKey: 'complete' },
]

const progressData = ref(null)

const steps = computed(() => {
  if (!progressData.value) return []
  return stepDefs.map((def, i) => {
    const prog = progressData.value.progress[i]
    let state = 'upcoming'
    if (prog) {
      if (prog.status === 'completed') state = 'completed'
      else if (prog.status === 'in_progress') state = 'current'
      else if (prog.status === 'locked') state = 'locked'
    }
    return {
      ...def,
      route: `${BASE_PATH}/${def.routeKey}/${props.groupId}`,
      state,
    }
  })
})

onMounted(async () => {
  try {
    progressData.value = await fetchPayoutGroupProgress(props.groupId)
  } catch (err) {
    console.error('[PayoutGroupStepperHeader] fetch failed:', err)
  }
})
</script>

<style scoped>
.stepper-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
  gap: 0;
}
.step-node {
  display: flex;
  align-items: center;
  gap: 0;
}
.step-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-decoration: none;
}
.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  transition: all 0.2s;
}
.step-label {
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
  color: #6b7280;
  transition: color 0.2s;
}
.step-line {
  width: 48px;
  height: 2px;
  background: #e8ecf0;
  margin: 0 4px;
  margin-bottom: 22px;
  transition: background 0.2s;
}

.locked .step-circle {
  background: #f3f4f6;
  color: #d1d5db;
  border: 2px solid #e5e7eb;
}
.locked .step-label {
  color: #d1d5db;
}
.locked .step-line {
  background: #e8ecf0;
}

.current .step-circle {
  background: #1a73e8;
  color: #ffffff;
}
.current .step-label {
  color: #1a73e8;
}

.completed .step-circle {
  background: #16a34a;
  color: #ffffff;
}
.completed .step-label {
  color: #16a34a;
}
.line-done {
  background: #16a34a !important;
}

.upcoming .step-circle {
  background: #ffffff;
  color: #9ca3af;
  border: 2px solid #d1d5db;
}
.upcoming .step-label {
  color: #9ca3af;
}

.clickable .step-link {
  cursor: pointer;
}
.clickable:hover .step-circle {
  transform: scale(1.08);
}
</style>
