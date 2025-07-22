<template>
  <q-page class="flex flex-center">
    <q-card class="q-pa-lg" style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Login</div>
      </q-card-section>
      <q-card-section>
        <q-form @submit.prevent="onSubmit">
          <q-input
            v-model="username"
            label="Username"
            outlined
            dense
            class="q-mb-md"
            autofocus
            required
          />
          <q-input
            v-model="password"
            label="Password"
            type="password"
            outlined
            dense
            class="q-mb-md"
            required
          />
          <q-btn type="submit" label="Login" color="primary" class="full-width" />
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'

const $q = useQuasar()
const router = useRouter()
const username = ref('')
const password = ref('')

function onSubmit() {
  if (!username.value || !password.value) {
    $q.notify({ type: 'negative', message: 'Please enter both username and password.' })
    return
  }
  // Redirect to dashboard after login
  router.push({ name: 'dashboard' })
}
</script>

<style scoped>
.q-card {
  width: 100%;
  max-width: 400px;
}
</style>
