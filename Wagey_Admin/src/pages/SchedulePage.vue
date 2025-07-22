<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Weekly Schedule</div>
    <div class="scheduler-grid">
      <div class="scheduler-header-row">
        <div class="scheduler-header-cell user-col">First Name</div>
        <div v-for="(day, i) in days" :key="i" class="scheduler-header-cell">
          {{ day }}
        </div>
      </div>
      <div v-for="user in users" :key="user.id" class="scheduler-row">
        <div class="scheduler-user-cell user-col">
          <q-avatar size="32px" class="q-mr-sm">
            <img :src="user.avatar" alt="avatar" />
          </q-avatar>
          <span>{{ user.name }}</span>
        </div>
        <div v-for="(day, dayIdx) in days" :key="dayIdx" class="scheduler-cell">
          <draggable
            :list="getShifts(user.id, dayIdx)"
            :group="'shifts'"
            class="draggable-list"
            item-key="id"
            @add="onAdd($event, user.id, dayIdx)"
          >
            <template #item="{ element }">
              <q-chip
                :color="positionColors[element.position] || 'grey'"
                text-color="white"
                class="q-mb-xs q-mr-xs"
                style="min-width: 70px"
              >
                {{ element.time }}<br />{{ element.position }}
              </q-chip>
            </template>
          </draggable>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import draggable from 'vuedraggable'

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const users = [
  { id: 1, name: 'Abbie Janssen', avatar: 'https://randomuser.me/api/portraits/women/1.jpg' },
  { id: 2, name: 'Al Hollie', avatar: 'https://randomuser.me/api/portraits/men/2.jpg' },
  { id: 3, name: 'Andrea Kinzing', avatar: 'https://randomuser.me/api/portraits/women/3.jpg' },
  { id: 4, name: 'Arjun Patel', avatar: 'https://randomuser.me/api/portraits/men/4.jpg' },
]
const positionColors = {
  SERVER: 'teal',
  BUSSER: 'green',
  'LINE COOK': 'blue',
  CHEF: 'deep-orange',
  MANAGER: 'brown',
  HOST: 'yellow-8',
  POSITION: 'grey',
}
const shifts = ref([
  { id: 1, userId: 1, day: 0, time: '11a - 7p', position: 'SERVER' },
  { id: 2, userId: 1, day: 2, time: '8a - 4p', position: 'SERVER' },
  { id: 3, userId: 2, day: 0, time: '3p - 11p', position: 'MANAGER' },
  { id: 4, userId: 2, day: 1, time: '8a - 4p', position: 'BUSSER' },
  { id: 5, userId: 3, day: 3, time: '8a - 4p', position: 'CHEF' },
  { id: 6, userId: 4, day: 4, time: '8a - 4p', position: 'HOST' },
])

function getShifts(userId, dayIdx) {
  // Return a reference to the array of shifts for this cell
  return shifts.value.filter((s) => s.userId === userId && s.day === dayIdx)
}

function onAdd(evt, userId, dayIdx) {
  // evt.item is the DOM element, evt.newIndex is the new index in the list
  // evt.clone is the shift object being moved
  // Find the shift in the main array and update its userId and day
  const shift = evt.item.__vue__?.element || evt.clone
  if (shift) {
    const idx = shifts.value.findIndex((s) => s.id === shift.id)
    if (idx !== -1) {
      shifts.value[idx].userId = userId
      shifts.value[idx].day = dayIdx
    }
  }
}
</script>

<style scoped>
.scheduler-grid {
  display: flex;
  flex-direction: column;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow-x: auto;
  background: #fff;
}
.scheduler-header-row,
.scheduler-row {
  display: flex;
}
.scheduler-header-cell,
.scheduler-cell {
  flex: 1 1 120px;
  min-width: 120px;
  padding: 8px;
  border-bottom: 1px solid #e0e0e0;
  text-align: center;
  font-weight: 600;
}
.user-col {
  flex: 0 0 180px;
  min-width: 180px;
  text-align: left;
  font-weight: 600;
}
.scheduler-user-cell {
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #e0e0e0;
}
.draggable-list {
  min-height: 40px;
}
</style>
