<template>
  <q-page class="auth-page">
    <div class="auth-container">
      <!-- Left Side - Login Form -->
      <div class="form-section">
        <div class="form-content">
          <!-- Header -->
          <div class="form-header">
            <img src="../assets/wagey_logo.png" alt="Logo" class="brand-logo" />
            <h1 class="form-title">Sign In</h1>
            <p class="form-subtitle">Welcome back! Please enter your details</p>
          </div>
          <!-- Login Form -->
          <q-form @submit="handleLogin" class="login-form">
            <div class="input-group">
              <label class="input-label">Email</label>
              <q-input
                v-model="formData.username"
                outlined
                placeholder="Enter your email"
                lazy-rules
                :rules="[(val) => !!val || 'Email is required']"
                autocomplete="username"
                class="custom-input"
                hide-bottom-space
              >
                <template v-slot:prepend>
                  <q-icon name="email" size="20px" class="input-icon" />
                </template>
              </q-input>
            </div>

            <div class="input-group">
              <label class="input-label">Password</label>
              <q-input
                v-model="formData.password"
                outlined
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter your password"
                lazy-rules
                :rules="[(val) => !!val || 'Password is required']"
                autocomplete="current-password"
                class="custom-input"
                hide-bottom-space
              >
                <template v-slot:prepend>
                  <q-icon name="lock" size="20px" class="input-icon" />
                </template>
                <template v-slot:append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer toggle-password"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>
            </div>

            <div class="form-options">
              <q-checkbox
                v-model="formData.rememberMe"
                label="Remember me"
                class="remember-checkbox"
              />
              <a href="#" @click.prevent="goToForgotPassword" class="forgot-link">
                Forget Your Password?
              </a>
            </div>

            <q-btn
              type="submit"
              class="submit-btn"
              unelevated
              no-caps
              :loading="isSubmitting"
              :disable="!isFormValid"
            >
              SIGN IN
            </q-btn>
          </q-form>
        </div>
      </div>

      <!-- Right Side - Welcome Panel -->
      <div class="welcome-section">
        <div class="welcome-background">
          <img src="../assets/wiggly.svg" alt="Welcome" class="background-image" />
        </div>
        <div class="welcome-overlay"></div>
        <div class="welcome-content">
          <h2 class="welcome-title">Welcome to Wagey</h2>
          <p class="welcome-text">Manage your workforce efficiently and securely</p>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { useAuthStore } from 'boot/auth'

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
  })
}

const showSuccessNotification = (message) => {
  $q.notify({
    type: 'positive',
    message,
    position: 'top',
    timeout: 2000,
    icon: 'check_circle',
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
    const loginResponse = await api.post(
      'https://staging.wageyapp.com/api/employee/login/',
      loginPayload,
    )

    console.log('Login response:', loginResponse.data)

    const { access, refresh } = loginResponse.data
    if (!access) {
      showErrorNotification('Login succeeded but no access token received.')
      return
    }

    authStore.setToken(access)
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)

    const companiesResponse = await api.get(
      'https://staging.wageyapp.com/user/current-user-companies/',
      {
        headers: { Authorization: `Bearer ${access}` },
      },
    )

    console.log('Companies response:', companiesResponse.data)

    const companiesData = companiesResponse.data

    if (!companiesData || companiesData.length === 0) {
      showErrorNotification('No company associated with this account.')
      return
    }

    const firstCompany = companiesData[0]
    console.log('First company:', firstCompany)

    const companyId = firstCompany.company?.id || firstCompany.id
    const accountUuid = firstCompany.id
    const userId = firstCompany.user?.id

    console.log('Extracted values:', { companyId, accountUuid, userId })

    if (!accountUuid) {
      showErrorNotification('Failed to get account UUID after login.')
      console.error('Missing accountUuid. firstCompany data:', firstCompany)
      return
    }

    localStorage.setItem('account_uuid', accountUuid)
    localStorage.setItem('user_id', userId)
    localStorage.setItem('company_id', companyId)

    authStore.setAuth(access, {
      uuid: accountUuid,
      userId: userId,
      companyId: companyId,
    })

    showSuccessNotification('Login successful!')

    const redirectPath = route.query.redirect || '/dashboard'
    router.push(redirectPath)
  } catch (error) {
    console.error('Login error:', error)
    if (error.response) {
      console.error('Error response data:', error.response.data)
      const errorMessage =
        error.response.data?.detail || error.response.data?.message || 'Invalid login credentials.'
      showErrorNotification(errorMessage)
    } else {
      showErrorNotification('Login failed. Please try again.')
    }
  } finally {
    isSubmitting.value = false
  }
}

const goToForgotPassword = () => router.push('/forgot-password')
</script>

<style lang="scss" scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
  padding: 0.75rem;

  @media (min-width: 640px) {
    padding: 1rem;
  }
}

.brand-logo {
  height: 36px;
  width: 36px;

  @media (min-width: 640px) {
    height: 40px;
    width: 40px;
  }

  @media (min-width: 1024px) {
    height: 44px;
    width: 44px;
  }

  @media (min-width: 1440px) {
    height: 48px;
    width: 48px;
  }
}

.auth-container {
  display: flex;
  width: 100%;
  max-width: 360px;
  min-height: 440px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  flex-direction: column;

  @media (min-width: 640px) {
    max-width: 420px;
    min-height: 460px;
    border-radius: 14px;
  }

  @media (min-width: 768px) {
    flex-direction: row;
    max-width: 720px;
    min-height: 480px;
    border-radius: 16px;
  }

  @media (min-width: 1024px) {
    max-width: 840px;
    min-height: 520px;
    border-radius: 18px;
  }

  @media (min-width: 1440px) {
    max-width: 960px;
    min-height: 540px;
    border-radius: 20px;
  }
}

// Form Section (Left Side)
.form-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 1.25rem;
  background: white;

  @media (min-width: 640px) {
    padding: 1.75rem 1.5rem;
  }

  @media (min-width: 768px) {
    padding: 2rem 1.75rem;
  }

  @media (min-width: 1024px) {
    padding: 2.25rem 2rem;
  }

  @media (min-width: 1440px) {
    padding: 2.5rem 2.25rem;
  }
}

.form-content {
  width: 100%;
  max-width: 100%;

  @media (min-width: 640px) {
    max-width: 320px;
  }

  @media (min-width: 768px) {
    max-width: 300px;
  }

  @media (min-width: 1024px) {
    max-width: 340px;
  }

  @media (min-width: 1440px) {
    max-width: 360px;
  }
}

.form-header {
  text-align: center;
  margin-bottom: 1.25rem;

  @media (min-width: 640px) {
    margin-bottom: 1.5rem;
  }

  @media (min-width: 1024px) {
    margin-bottom: 1.75rem;
  }

  .form-title {
    font-size: 1.35rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0.5rem 0 0.35rem 0;
    letter-spacing: -0.5px;

    @media (min-width: 640px) {
      font-size: 1.5rem;
      margin: 0.6rem 0 0.4rem 0;
    }

    @media (min-width: 1024px) {
      font-size: 1.75rem;
      margin: 0.75rem 0 0.5rem 0;
    }

    @media (min-width: 1440px) {
      font-size: 1.85rem;
    }
  }

  .form-subtitle {
    font-size: 0.8rem;
    color: #757575;
    margin: 0;
    font-weight: 400;

    @media (min-width: 640px) {
      font-size: 0.85rem;
    }

    @media (min-width: 1024px) {
      font-size: 0.9rem;
    }

    @media (min-width: 1440px) {
      font-size: 0.95rem;
    }
  }
}

// Form Inputs
.login-form {
  .input-group {
    margin-bottom: 0.85rem;

    @media (min-width: 640px) {
      margin-bottom: 1rem;
    }

    @media (min-width: 1024px) {
      margin-bottom: 1.15rem;
    }

    @media (min-width: 1440px) {
      margin-bottom: 1.25rem;
    }

    .input-label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      color: #424242;
      margin-bottom: 0.4rem;

      @media (min-width: 640px) {
        font-size: 0.85rem;
        margin-bottom: 0.45rem;
      }

      @media (min-width: 1024px) {
        font-size: 0.875rem;
      }

      @media (min-width: 1440px) {
        font-size: 0.9rem;
      }
    }
  }

  .custom-input {
    :deep(.q-field__control) {
      border-radius: 8px;
      height: 42px;
      background: #f8f9fa;
      border: 2px solid transparent;

      @media (min-width: 640px) {
        height: 44px;
        border-radius: 9px;
      }

      @media (min-width: 1024px) {
        height: 46px;
        border-radius: 10px;
      }

      @media (min-width: 1440px) {
        height: 48px;
        border-radius: 11px;
      }

      &:before {
        border: none;
      }

      &:hover {
        background: #f1f3f5;
      }
    }

    :deep(.q-field--focused) {
      .q-field__control {
        background: white;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }
    }

    :deep(.q-field__native) {
      padding-left: 0.85rem;
      font-size: 0.85rem;
      color: #1a1a1a;

      @media (min-width: 640px) {
        font-size: 0.875rem;
      }

      @media (min-width: 1024px) {
        font-size: 0.9rem;
      }

      @media (min-width: 1440px) {
        font-size: 0.95rem;
      }
    }

    :deep(.q-field__prepend) {
      padding-left: 0.85rem;

      .input-icon {
        color: #9e9e9e;
      }
    }

    :deep(.q-field__append) {
      padding-right: 0.85rem;

      .toggle-password {
        color: #9e9e9e;
      }
    }
  }
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.4rem;

  @media (min-width: 640px) {
    margin-bottom: 1.15rem;
    gap: 0.5rem;
  }

  @media (min-width: 768px) {
    flex-wrap: nowrap;
    margin-bottom: 1.25rem;
  }

  @media (min-width: 1440px) {
    margin-bottom: 1.5rem;
  }

  .remember-checkbox {
    font-size: 0.8rem;
    color: #616161;

    @media (min-width: 640px) {
      font-size: 0.825rem;
    }

    @media (min-width: 1024px) {
      font-size: 0.85rem;
    }

    @media (min-width: 1440px) {
      font-size: 0.875rem;
    }

    :deep(.q-checkbox__bg) {
      border-radius: 5px;
    }
  }

  .forgot-link {
    font-size: 0.8rem;
    color: #757575;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;

    @media (min-width: 640px) {
      font-size: 0.825rem;
    }

    @media (min-width: 1024px) {
      font-size: 0.85rem;
    }

    @media (min-width: 1440px) {
      font-size: 0.875rem;
    }

    &:hover {
      color: #667eea;
    }
  }
}

.submit-btn {
  width: 100%;
  height: 42px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;

  @media (min-width: 640px) {
    height: 44px;
    border-radius: 9px;
    font-size: 0.875rem;
  }

  @media (min-width: 1024px) {
    height: 46px;
    border-radius: 10px;
    font-size: 0.9rem;
  }

  @media (min-width: 1440px) {
    height: 48px;
    font-size: 0.95rem;
    border-radius: 11px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.35);
  }

  &:active {
    transform: translateY(0);
  }
}

// Welcome Section (Right Side)
.welcome-section {
  display: none;
  position: relative;
  overflow: hidden;

  @media (min-width: 768px) {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: 2rem 1.5rem;
  }

  @media (min-width: 1024px) {
    flex: 1.1;
    padding: 2.5rem 2rem;
  }

  @media (min-width: 1440px) {
    flex: 1.2;
    padding: 3rem 2.5rem;
  }
}

.welcome-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #2862a8 0%, #1e4d8b 100%);
  z-index: 0;

  &::before {
    content: '';
    position: absolute;
    width: 200%;
    height: 200%;
    background-image:
      radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.06) 0%, transparent 50%),
      radial-gradient(circle at 40% 20%, rgba(102, 126, 234, 0.1) 0%, transparent 50%);
    animation: drift 60s linear infinite;
  }

  &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    background:
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 50px,
        rgba(255, 255, 255, 0.03) 50px,
        rgba(255, 255, 255, 0.03) 51px
      ),
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 50px,
        rgba(255, 255, 255, 0.03) 50px,
        rgba(255, 255, 255, 0.03) 51px
      );
  }
}

@keyframes drift {
  from {
    transform: translate(0, 0) rotate(0deg);
  }
  to {
    transform: translate(30px, 30px) rotate(360deg);
  }
}

.welcome-content {
  text-align: center;
  position: relative;
  z-index: 1;
  max-width: 100%;

  @media (min-width: 1024px) {
    max-width: 360px;
  }

  @media (min-width: 1440px) {
    max-width: 400px;
  }

  .welcome-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: white;
    margin: 0 0 0.85rem 0;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    line-height: 1.3;

    @media (min-width: 1024px) {
      font-size: 1.85rem;
      margin: 0 0 1rem 0;
    }

    @media (min-width: 1440px) {
      font-size: 2.15rem;
      margin: 0 0 1.15rem 0;
    }
  }

  .welcome-text {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
    font-weight: 400;
    line-height: 1.6;

    @media (min-width: 1024px) {
      font-size: 0.95rem;
    }

    @media (min-width: 1440px) {
      font-size: 1.05rem;
    }
  }
}

// Accessibility
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
