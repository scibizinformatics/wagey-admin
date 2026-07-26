<template>
  <div v-if="overdue" class="overdue-banner">
    <div class="banner-left">
      <q-icon name="warning" size="20px" class="banner-icon" />
      <div class="banner-text">
        <div class="banner-title">Overdue Cutoff Alert</div>
        <div class="banner-message">
          {{ overdue.cutoff_range }} still has {{ overdue.groups_count }} payout group(s) awaiting disbursement.
        </div>
      </div>
    </div>
    <q-btn
      label="Open Previous Cutoff"
      no-caps
      dense
      unelevated
      color="warning"
      text-color="white"
      size="12px"
      class="banner-btn"
      @click="$emit('openCutoff', overdue)"
    />
  </div>
</template>

<script setup>
defineProps({
  overdue: { type: Object, default: null },
})

defineEmits(['openCutoff'])
</script>

<style scoped>
.overdue-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  padding: 12px 18px;
  flex-wrap: wrap;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.banner-icon {
  color: #d97706;
  flex-shrink: 0;
}

.banner-text {
  min-width: 0;
}

.banner-title {
  font-size: 13px;
  font-weight: 700;
  color: #92400e;
}

.banner-message {
  font-size: 12px;
  color: #b45309;
  margin-top: 1px;
}

.banner-btn {
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .overdue-banner {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }
  .banner-left {
    flex-direction: column;
    text-align: center;
  }
  .banner-btn {
    align-self: center;
  }
}
</style>
