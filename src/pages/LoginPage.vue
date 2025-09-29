<template>
  <q-page class="flex flex-center bg-white">
    <div class="login-container">
      <!-- Header with Logo/Branding -->
      <div class="text-center q-mb-lg">
        <div class="brand-logo q-mb-sm">
          <q-icon name="diamond" size="28px" color="primary" />
        </div>
        <h2 class="login-title text-weight-light text-grey-9 q-ma-none q-mb-xs">Sign In</h2>
        <p class="login-subtitle text-grey-6 q-ma-none">Sign in to stay connected</p>
      </div>

      <!-- Login Form -->
      <q-form @submit="handleLogin" class="login-form">
        <!-- Email Input -->
        <div class="q-mb-md">
          <label class="input-label text-grey-7 text-weight-medium">Email</label>
          <q-input
            v-model="formData.username"
            outlined
            placeholder="Enter your email"
            lazy-rules
            :rules="[(val) => !!val || 'Email is required']"
            autocomplete="username"
            class="modern-input"
            hide-bottom-space
          />
        </div>

        <!-- Password Input -->
        <div class="q-mb-md">
          <label class="input-label text-grey-7 text-weight-medium">Password</label>
          <q-input
            v-model="formData.password"
            outlined
            :type="showPassword ? 'text' : 'password'"
            placeholder="Enter your password"
            lazy-rules
            :rules="[(val) => !!val || 'Password is required']"
            autocomplete="current-password"
            class="modern-input"
            hide-bottom-space
          >
            <template v-slot:append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer text-grey-5"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>
        </div>

        <!-- Options Row -->
        <div class="row justify-between items-center q-mb-lg">
          <q-checkbox
            v-model="formData.rememberMe"
            label="Remember me?"
            class="remember-checkbox text-grey-7"
          />
          <q-btn
            flat
            no-caps
            color="primary"
            label="Forgot Password?"
            @click="goToForgotPassword"
            class="forgot-btn"
          />
        </div>

        <!-- Sign In Button -->
        <q-btn
          type="submit"
          color="primary"
          label="Sign in"
          class="full-width sign-in-btn"
          unelevated
          no-caps
          :loading="isSubmitting"
          :disable="!isFormValid"
        />
      </q-form>

      <!-- Sign Up Link -->
      <div class="text-center q-mt-lg">
        <span class="text-grey-6">Don't have an account? </span>
        <q-btn
          flat
          no-caps
          color="primary"
          label="Click here to sign up."
          @click="goToRegister"
          class="signup-link"
        />
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
  $q.notify({
    type: 'negative',
    message,
    position: 'top',
    timeout: 3000,
    icon: 'error_outline',
    classes: 'modern-notification',
  })
}

const showSuccessNotification = (message) => {
  $q.notify({
    type: 'positive',
    message,
    position: 'top',
    timeout: 2000,
    icon: 'check_circle',
    classes: 'modern-notification',
  })
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

    // ✅ Save token
    authStore.setToken(token)
    localStorage.setItem('authToken', token)

    // ✅ Save user info
    if (loginData.user) {
      localStorage.setItem('user_id', loginData.user.id)
      localStorage.setItem('selectedCompany', loginData.user.company)
    }

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

// Social login placeholders - removed

const goToForgotPassword = () => router.push('/forgot-password')
const goToRegister = () => router.push('/register')
</script>

<style lang="scss" scoped>
.bg-white {
  background: #ffffff;
  min-height: 100vh;
  padding: 1rem;

  // Desktop and larger screens
  @media (min-width: 1024px) {
    padding: 2rem;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  }

  @media (min-width: 1440px) {
    padding: 3rem;
  }
}

.login-container {
  background: white;
  border-radius: 0;
  width: 100%;
  max-width: 320px;
  padding: 1rem 0;

  @media (min-width: 768px) {
    padding: 1.5rem 0;
    max-width: 340px;
  }

  // Enhanced desktop styling
  @media (min-width: 1024px) {
    background: white;
    border-radius: 12px;
    padding: 1.5rem 1.5rem;
    max-width: 360px;
    box-shadow:
      0 10px 25px rgba(0, 0, 0, 0.08),
      0 4px 15px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(0, 0, 0, 0.04);
  }

  @media (min-width: 1440px) {
    padding: 2rem 2rem;
    max-width: 380px;
    box-shadow:
      0 15px 35px rgba(0, 0, 0, 0.1),
      0 6px 20px rgba(0, 0, 0, 0.08);
  }

  // Ultra-wide screens
  @media (min-width: 1920px) {
    padding: 2.5rem 2.5rem;
    max-width: 400px;
  }
}

// Brand and Header
.brand-logo {
  .q-icon {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 8px;
    padding: 8px;

    @media (min-width: 1024px) {
      border-radius: 12px;
      padding: 12px;
    }
  }
}

.login-title {
  font-size: 1.75rem;
  font-weight: 300;
  letter-spacing: -0.4px;

  @media (max-width: 599px) {
    font-size: 1.5rem;
  }

  @media (min-width: 1024px) {
    font-size: 1.9rem;
    letter-spacing: -0.5px;
  }

  @media (min-width: 1440px) {
    font-size: 2rem;
    letter-spacing: -0.6px;
  }
}

.login-subtitle {
  font-size: 0.85rem;
  font-weight: 400;

  @media (min-width: 1024px) {
    font-size: 0.9rem;
  }

  @media (min-width: 1440px) {
    font-size: 0.95rem;
  }
}

// Form Styling
.login-form {
  .input-label {
    display: block;
    margin-bottom: 6px;
    font-size: 0.8rem;
    font-weight: 500;

    @media (min-width: 1024px) {
      font-size: 0.85rem;
      margin-bottom: 8px;
    }

    @media (min-width: 1440px) {
      font-size: 0.9rem;
      margin-bottom: 10px;
    }
  }
}

.modern-input {
  :deep(.q-field__control) {
    border-radius: 6px;
    min-height: 42px;
    border-color: #e0e0e0;

    @media (min-width: 1024px) {
      min-height: 46px;
      border-radius: 8px;
    }

    @media (min-width: 1440px) {
      min-height: 48px;
      border-radius: 10px;
    }

    &:before {
      border-color: #e0e0e0;
    }

    &:hover:before {
      border-color: #bdbdbd;
    }
  }

  :deep(.q-field__native) {
    padding-left: 14px;
    font-size: 0.9rem;

    @media (min-width: 1024px) {
      padding-left: 16px;
      font-size: 0.95rem;
    }

    @media (min-width: 1440px) {
      padding-left: 18px;
      font-size: 1rem;
    }
  }

  :deep(.q-placeholder) {
    color: #9e9e9e;
  }

  :deep(.q-field--focused) {
    .q-field__control:before {
      border-color: #1976d2;
      border-width: 2px;
    }
  }

  :deep(.q-field__append) {
    padding-right: 14px;

    @media (min-width: 1024px) {
      padding-right: 16px;
    }

    @media (min-width: 1440px) {
      padding-right: 18px;
    }
  }
}

// Options Row
.remember-checkbox {
  font-size: 0.875rem;

  @media (min-width: 1024px) {
    font-size: 1rem;
  }

  @media (min-width: 1440px) {
    font-size: 1.1rem;
  }

  :deep(.q-checkbox__bg) {
    border-radius: 4px;

    @media (min-width: 1024px) {
      border-radius: 6px;
      width: 20px;
      height: 20px;
    }
  }
}

.forgot-btn {
  font-size: 0.875rem;
  padding: 4px 8px;
  font-weight: 400;

  @media (min-width: 1024px) {
    font-size: 1rem;
    padding: 8px 12px;
  }

  @media (min-width: 1440px) {
    font-size: 1.1rem;
    padding: 10px 16px;
  }

  &:hover {
    background: rgba(25, 118, 210, 0.04);
  }
}

// Sign In Button
.sign-in-btn {
  height: 42px;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  text-transform: none;
  box-shadow: none;

  @media (min-width: 1024px) {
    height: 46px;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
  }

  @media (min-width: 1440px) {
    height: 48px;
    border-radius: 10px;
    font-size: 1.05rem;
  }

  &:hover {
    box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);

    @media (min-width: 1024px) {
      box-shadow: 0 3px 12px rgba(25, 118, 210, 0.35);
    }
  }

  @media (max-width: 599px) {
    height: 40px;
    font-size: 0.9rem;
  }
}

// Sign Up Link
.signup-link {
  font-size: 0.875rem;
  padding: 2px 4px;
  font-weight: 400;
  text-decoration: underline;

  @media (min-width: 1024px) {
    font-size: 1rem;
    padding: 6px 8px;
  }

  @media (min-width: 1440px) {
    font-size: 1.1rem;
    padding: 8px 12px;
  }

  &:hover {
    background: rgba(25, 118, 210, 0.04);
  }
}

// Desktop-specific enhancements
@media (min-width: 1024px) {
  .q-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }

  // Add subtle animations for desktop
  .login-container {
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow:
        0 25px 70px rgba(0, 0, 0, 0.12),
        0 10px 30px rgba(0, 0, 0, 0.08);
    }
  }

  .modern-input {
    transition: all 0.2s ease;

    &:hover {
      :deep(.q-field__control:before) {
        border-color: #9e9e9e;
      }
    }
  }

  .sign-in-btn {
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-1px);
    }
  }
}

// Mobile Optimizations
@media (max-width: 599px) {
  .bg-white {
    padding: 0.5rem;
  }

  .login-container {
    padding: 1.5rem 0;
  }

  .brand-logo .q-icon {
    font-size: 28px;
    padding: 6px;
  }

  .modern-input :deep(.q-field__control) {
    min-height: 44px;
  }

  .social-buttons .social-btn {
    width: 36px;
    height: 36px;
  }
}

// Very small screens
@media (max-width: 375px) {
  .login-title {
    font-size: 1.5rem;
  }

  .login-container {
    padding: 1rem 0;
  }
}

// Accessibility
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

// Custom notification styling
:deep(.modern-notification) {
  border-radius: 8px;
  font-weight: 500;
}

// Focus styles for better accessibility
.modern-input:focus-within {
  :deep(.q-field__control) {
    box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
  }
}

.sign-in-btn:focus {
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.3);
}
</style>
