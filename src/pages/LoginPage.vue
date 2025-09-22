<template>
  <q-page class="flex flex-center bg-gradient">
    <div class="login-container">
      <!-- Header -->
      <div class="text-center q-mb-lg q-mb-xl-md">
        <h3 class="login-title text-weight-bold text-grey-8 q-mb-sm">Welcome Back</h3>
        <p class="login-subtitle text-grey-6">Sign in to your account</p>
      </div>

      <!-- Login Form -->
      <q-form @submit="handleLogin" class="q-gutter-md">
        <q-input
          v-model="formData.username"
          outlined
          label="Username or Email"
          lazy-rules
          :rules="[(val) => !!val || 'Username is required']"
          autocomplete="username"
          :dense="$q.screen.xs"
        >
          <template v-slot:prepend>
            <q-icon name="person" :size="$q.screen.xs ? 'sm' : 'md'" />
          </template>
        </q-input>

        <q-input
          v-model="formData.password"
          outlined
          :type="showPassword ? 'text' : 'password'"
          label="Password"
          lazy-rules
          :rules="[(val) => !!val || 'Password is required']"
          autocomplete="current-password"
          :dense="$q.screen.xs"
        >
          <template v-slot:prepend>
            <q-icon name="lock" :size="$q.screen.xs ? 'sm' : 'md'" />
          </template>
          <template v-slot:append>
            <q-icon
              :name="showPassword ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="showPassword = !showPassword"
            />
          </template>
        </q-input>

        <!-- Options -->
        <div class="row justify-between items-center">
          <q-checkbox v-model="formData.rememberMe" label="Remember me" class="text-grey-7" />
          <q-btn flat dense color="primary" label="Forgot Password?" @click="goToForgotPassword" />
        </div>

        <!-- Login Button -->
        <q-btn
          type="submit"
          color="primary"
          label="Sign In"
          class="full-width q-mt-lg"
          rounded
          unelevated
          :loading="isSubmitting"
          :disable="!isFormValid"
        />
      </q-form>

      <!-- Register -->
      <div class="text-center q-mt-lg">
        <span class="text-grey-6">Don't have an account? </span>
        <q-btn flat dense color="primary" label="Sign Up" @click="goToRegister" />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import axios from 'axios'
import { useAuthStore } from 'src/boot/auth'

const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const authStore = useAuthStore()

const isSubmitting = ref(false)
const showPassword = ref(false)

const formData = ref({
  username: '',
  password: '',
  rememberMe: false,
})

const isFormValid = computed(() => formData.value.username && formData.value.password)

const showErrorNotification = (message) => {
  $q.notify({ type: 'negative', message, position: 'top', timeout: 3000, icon: 'error_outline' })
}

const showSuccessNotification = (message) => {
  $q.notify({ type: 'positive', message, position: 'top', timeout: 2000, icon: 'check_circle' })
}

const handleLogin = async () => {
  if (!isFormValid.value) return
  isSubmitting.value = true

  try {
    const loginPayload = {
      username: formData.value.username,
      password: formData.value.password,
    }

    const loginResponse = await axios.post(
      'https://staging.wageyapp.com/api/employee/login/',
      loginPayload,
    )

    const loginData = loginResponse.data
    const token = loginData.token || loginData.access_token || loginData.access

    if (!token) {
      showErrorNotification('Login succeeded but no token received.')
      return
    }

    // ✅ Store token only
    authStore.setToken(token)
    localStorage.setItem('authToken', token)

    showSuccessNotification('Login successful!')

    const redirectPath = route.query.redirect || '/dashboard'
    router.push(redirectPath)
  } catch (error) {
    console.error('Login error:', error)
    if (error.response) {
      showErrorNotification(error.response.data?.message || 'Invalid login credentials.')
    } else {
      showErrorNotification('Login failed. Please try again.')
    }
  } finally {
    isSubmitting.value = false
  }
}

const goToForgotPassword = () => router.push('/forgot-password')
const goToRegister = () => router.push('/register')
</script>

<style lang="scss" scoped>
.bg-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 0.5rem;

  @media (min-width: 600px) {
    padding: 1rem;
  }
}

.login-container {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);

  // Mobile-first padding
  padding: 1.5rem 1rem;

  // Tablet and up
  @media (min-width: 480px) {
    padding: 2rem 1.5rem;
  }

  // Desktop
  @media (min-width: 768px) {
    padding: 3rem 2rem;
  }

  // Ensure it doesn't get too wide on very large screens
  @media (min-width: 1200px) {
    max-width: 450px;
  }
}

// Mobile-optimized typography
.login-title {
  font-size: 1.5rem;
  line-height: 1.3;

  @media (min-width: 480px) {
    font-size: 1.75rem;
  }

  @media (min-width: 768px) {
    font-size: 2rem;
  }
}

.login-subtitle {
  font-size: 0.875rem;

  @media (min-width: 480px) {
    font-size: 1rem;
  }
}

// Mobile input optimizations
.mobile-input {
  .q-field__control {
    min-height: 48px; // Ensure good touch target size
  }

  @media (max-width: 599px) {
    .q-field__control {
      min-height: 44px;
    }
  }
}

// Mobile options container
.mobile-options-container {
  @media (max-width: 599px) {
    margin-top: 0.75rem;
    margin-bottom: 0.75rem;
  }
}

// Remember checkbox mobile styles
.remember-checkbox {
  font-size: 0.875rem;

  @media (max-width: 599px) {
    font-size: 0.8rem;
  }
}

.remember-checkbox-mobile {
  font-size: 0.8rem;
  align-self: flex-start;
}

// Forgot password button styles
.forgot-password-btn {
  font-size: 0.75rem;
  padding: 2px 4px;

  @media (min-width: 480px) {
    font-size: 0.8rem;
  }
}

.forgot-password-btn-mobile {
  font-size: 0.8rem;
  padding: 4px 8px;
}

// Login button mobile styles
.login-btn {
  height: 48px;
  font-weight: 600;

  @media (max-width: 599px) {
    height: 44px;
    font-size: 0.9rem;
  }

  @media (min-width: 768px) {
    height: 52px;
    font-size: 1rem;
  }
}

// Register section mobile styles
.register-section {
  margin-top: 1rem;

  @media (min-width: 480px) {
    margin-top: 1.5rem;
  }
}

.register-text-mobile {
  font-size: 0.875rem;

  .text-grey-6 {
    font-size: 0.875rem;
  }
}

.signup-btn-mobile {
  font-size: 0.9rem;
  padding: 6px 12px;
  min-height: 36px;
}

// Touch-friendly improvements
@media (max-width: 599px) {
  .q-btn--flat.q-btn--dense {
    padding: 4px 8px;
    min-height: 36px;
  }

  .q-checkbox {
    .q-checkbox__bg {
      width: 18px;
      height: 18px;
    }
  }
}

// Landscape mobile optimization
@media (max-height: 600px) and (orientation: landscape) {
  .login-container {
    padding: 1rem 1.5rem;
    max-height: 90vh;
    overflow-y: auto;
  }

  .login-title {
    font-size: 1.25rem;
    margin-bottom: 0.25rem;
  }

  .login-subtitle {
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
  }

  .q-form {
    .q-gutter-md > * + * {
      margin-top: 0.75rem;
    }
  }
}

// Very small screens (iPhone SE, etc.)
@media (max-width: 375px) {
  .bg-gradient {
    padding: 0.25rem;
  }

  .login-container {
    padding: 1.25rem 0.875rem;
    border-radius: 12px;
  }

  .login-title {
    font-size: 1.375rem;
  }

  .mobile-input {
    .q-field__control {
      min-height: 42px;
    }
  }

  .login-btn {
    height: 42px;
    font-size: 0.875rem;
  }
}

// Accessibility improvements
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

// High contrast mode support
@media (prefers-contrast: high) {
  .login-container {
    border: 2px solid #000;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }
}
</style>
