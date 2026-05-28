<template>
  <div class="row">
    <div class="col-12">
      <div class="row items-center">
        <div class="col-12 col-sm-7 q-pr-md">
          <div class="row items-center">
            <div class="col-12">
              <div class="text-h6 text-weight-bold">
                <q-icon name="fas fa-calendar" class="q-mr-sm" />
                Attendance
              </div>
            </div>
            <div class="col-12 q-pt-sm">
              <div class="row items-center">
                <div class="col-auto">
                  <q-btn icon="fas fa-chevron-left" dense flat :disable="disablePrev" @click="$emit('prev')" />
                </div>
                <div class="col-auto">
                  <q-btn no-caps color="indigo" dense rounded unelevated class="q-px-lg">
                    <span class="text-caption">
                      {{ selectedDateStr }}
                    </span>
                    <q-menu auto-close>
                      <q-date
                        minimal
                        mask="YYYY-MM-DD"
                        :model-value="selectedDate"
                        @update:model-value="$emit('date-change', $event)"
                      />
                    </q-menu>
                  </q-btn>
                </div>
                <div class="col-auto">
                  <q-btn icon="fas fa-chevron-right" dense flat :disable="disableNext" @click="$emit('next')" />
                </div>
                <div class="col-auto">
                  <q-btn
                    color="indigo"
                    class="q-ml-sm"
                    dense
                    flat
                    rounded
                    icon="fas fa-calendar-range"
                    label="Date Range"
                    @click="$emit('range')"
                  />
                </div>
                <div class="col-auto">
                  <q-btn
                    color="indigo"
                    dense
                    flat
                    rounded
                    icon="fas fa-undo"
                    label="Today"
                    class="q-ml-sm"
                    @click="$emit('today')"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-12 col-sm-5 q-mt-sm q-mt-sm-none text-right">
          <q-btn
            v-if="canCreateAttendance"
            color="indigo"
            push
            no-caps
            label="Add Attendance"
            icon="fas fa-plus"
            @click="$emit('add')"
          />
        </div>
      </div>
    </div>
    <div class="col-12 q-pt-md">
      <div class="row items-center">
        <div class="col-12 col-sm-8">
          <q-select
            v-model="localCostCenter"
            :options="costCenterOptions"
            option-label="name"
            option-value="id"
            label="Cost Center"
            multiple
            filled
            dense
            emit-value
            map-options
            clearable
            @update:model-value="$emit('filter')"
          />
        </div>
        <div class="col-12 col-sm-4 q-mt-sm q-mt-sm-none text-right">
          <q-btn
            color="grey-14"
            outline
            no-caps
            label="Clear"
            class="q-ml-sm"
            icon="fas fa-eraser"
            @click="$emit('clear')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  selectedDate: { type: String, default: '' },
  disablePrev: { type: Boolean, default: false },
  disableNext: { type: Boolean, default: false },
  canCreateAttendance: { type: Boolean, default: false },
  costCenter: { type: Array, default: () => [] },
  costCenterOptions: { type: Array, default: () => [] },
});

const emit = defineEmits(['prev','next','date-change','range','today','add','filter','clear']);

const localCostCenter = computed({
  get: () => props.costCenter,
  set: (val) => emit('filter', val),
});

const selectedDateStr = computed(() => {
  if (!props.selectedDate) return '';
  const d = new Date(props.selectedDate);
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
});
</script>
