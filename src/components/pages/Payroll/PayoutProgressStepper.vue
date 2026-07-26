<template>
  <div class="payout-stepper">
    <div
      v-for="(step, i) in steps"
      :key="step.name"
      class="step-node"
    >
      <div
        :class="['step-circle', `step-${step.state}`, { clickable: step.state !== 'locked' }]"
        @click="goToStep(i)"
      >
        <q-icon :name="step.state === 'completed' ? 'check' : stepIcons[i]" size="11px" />
      </div>
      <div v-if="i < steps.length - 1" :class="['step-line', `line-${step.state}`]" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'

const router = useRouter()
const { fetchPayoutGroupProgress } = useDisbursementApi()

const props = defineProps({
  groupId: { type: [Number, String], required: true },
})
const stepIcons = ['check', 'description', 'account_balance', 'send', 'check_circle']
const ROUTES = ['review', 'payslips', 'funding', 'disburse', 'complete']

const progressData = ref(null)
const loading = ref(true)

const steps = computed(() => {
  if (!progressData.value) return []
  return progressData.value.progress.map((p) => {
    let state = 'pending'
    if (p.status === 'in_progress') state = 'active'
    else if (p.status === 'completed') state = 'done'
    else if (p.status === 'locked') state = 'pending'
    return { ...p, state }
  })
})

onMounted(async () => {
  try {
    progressData.value = await fetchPayoutGroupProgress(props.groupId)
  } catch (err) {
    console.error('[PayoutProgressStepper] fetch failed:', err)
  } finally {
    loading.value = false
  }
})

function goToStep(index) {
  if (steps.value[index].state === 'pending') return
  if (ROUTES[index]) {
    router.push(`/app/payroll/${ROUTES[index]}/${props.groupId}`)
  }
}
</script>

<style scoped>
.payout-stepper {
  display: inline-flex;
  align-items: center;
  gap: 0;
}

.step-node {
  display: flex;
  align-items: center;
  gap: 0;
}

.step-circle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  transition: all 0.2s;
  flex-shrink: 0;
}

.step-line {
  width: 14px;
  height: 0;
  margin: 0 2px;
  border-top: 2px solid transparent;
  transition: border-color 0.2s;
}

.step-circle.step-pending {
  background: #ffffff;
  color: #d1d5db;
  border: 1.5px solid #d1d5db;
}

.line-pending {
  border-color: #d1d5db;
  border-style: dashed;
}

.step-circle.step-active {
  background: #16a34a;
  color: #ffffff;
}

.line-active {
  border-color: #16a34a;
}

.step-circle.step-done {
  background: #16a34a;
  color: #ffffff;
}

.line-done {
  border-color: #16a34a;
}

.clickable {
  cursor: pointer;
}
.clickable:hover {
  transform: scale(1.15);
}
</style>
