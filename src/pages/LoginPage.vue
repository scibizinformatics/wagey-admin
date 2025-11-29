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

    const loginResponse = await axios.post(
      'https://staging.wageyapp.com/api/employee/login/',
      loginPayload,
    )

    const { access, refresh } = loginResponse.data
    if (!access) {
      showErrorNotification('Login succeeded but no access token received.')
      return
    }

    authStore.setToken(access)
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)

    const companiesResponse = await axios.get(
      'https://staging.wageyapp.com/user/current-user-companies/',
      {
        headers: { Authorization: `Bearer ${access}` },
      },
    )

    const companiesData = companiesResponse.data

    if (!companiesData || companiesData.length === 0) {
      showErrorNotification('No company associated with this account.')
      return
    }

    const firstCompany = companiesData[0]
    const companyId = firstCompany.company?.id || firstCompany.id
    const accountUuid = firstCompany.id
    const userId = firstCompany.user?.id

    if (!accountUuid) {
      showErrorNotification('Failed to get account UUID after login.')
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
  padding: 1rem;
}

.brand-logo {
  height: 45px;
  width: 45px;

  @media (min-width: 768px) {
    height: 50px;
    width: 50px;
  }

  @media (min-width: 1024px) {
    height: 55px;
    width: 55px;
  }

  @media (min-width: 1440px) {
    height: 60px;
    width: 60px;
  }
}

.auth-container {
  display: flex;
  width: 100%;
  max-width: 400px;
  min-height: 500px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  flex-direction: column;

  @media (min-width: 768px) {
    flex-direction: row;
    max-width: 750px;
    min-height: 520px;
    border-radius: 20px;
    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.12);
  }

  @media (min-width: 1024px) {
    max-width: 900px;
    min-height: 560px;
    border-radius: 22px;
  }

  @media (min-width: 1440px) {
    max-width: 1100px;
    min-height: 600px;
    border-radius: 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  }
}

// Form Section (Left Side)
.form-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  background: white;

  @media (min-width: 768px) {
    padding: 2.5rem 2rem;
  }

  @media (min-width: 1024px) {
    padding: 3rem 2.5rem;
  }

  @media (min-width: 1440px) {
    padding: 3.5rem 3rem;
  }
}

.form-content {
  width: 100%;
  max-width: 100%;

  @media (min-width: 768px) {
    max-width: 340px;
  }

  @media (min-width: 1024px) {
    max-width: 380px;
  }

  @media (min-width: 1440px) {
    max-width: 420px;
  }
}

.form-header {
  text-align: center;
  margin-bottom: 1.5rem;

  @media (min-width: 768px) {
    margin-bottom: 1.75rem;
  }

  @media (min-width: 1024px) {
    margin-bottom: 2rem;
  }

  @media (min-width: 1440px) {
    margin-bottom: 2.25rem;
  }

  .form-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0.75rem 0 0.5rem 0;
    letter-spacing: -0.5px;

    @media (min-width: 768px) {
      font-size: 1.75rem;
      margin: 1rem 0 0.5rem 0;
    }

    @media (min-width: 1024px) {
      font-size: 2rem;
    }

    @media (min-width: 1440px) {
      font-size: 2.25rem;
    }
  }

  .form-subtitle {
    font-size: 0.85rem;
    color: #757575;
    margin: 0;
    font-weight: 400;

    @media (min-width: 768px) {
      font-size: 0.9rem;
    }

    @media (min-width: 1024px) {
      font-size: 0.95rem;
    }

    @media (min-width: 1440px) {
      font-size: 1rem;
    }
  }
}

// Form Inputs
.login-form {
  .input-group {
    margin-bottom: 1rem;

    @media (min-width: 768px) {
      margin-bottom: 1.25rem;
    }

    @media (min-width: 1440px) {
      margin-bottom: 1.5rem;
    }

    .input-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: #424242;
      margin-bottom: 0.5rem;

      @media (min-width: 768px) {
        font-size: 0.9rem;
      }

      @media (min-width: 1440px) {
        font-size: 0.95rem;
      }
    }
  }

  .custom-input {
    :deep(.q-field__control) {
      border-radius: 10px;
      height: 46px;
      background: #f8f9fa;
      border: 2px solid transparent;

      @media (min-width: 768px) {
        height: 50px;
        border-radius: 12px;
      }

      @media (min-width: 1440px) {
        height: 54px;
        border-radius: 14px;
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
        box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
      }
    }

    :deep(.q-field__native) {
      padding-left: 1rem;
      font-size: 0.9rem;
      color: #1a1a1a;

      @media (min-width: 768px) {
        font-size: 0.95rem;
      }

      @media (min-width: 1440px) {
        font-size: 1rem;
      }
    }

    :deep(.q-field__prepend) {
      padding-left: 1rem;

      .input-icon {
        color: #9e9e9e;
      }
    }

    :deep(.q-field__append) {
      padding-right: 1rem;

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
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 0.5rem;

  @media (min-width: 768px) {
    margin-bottom: 1.5rem;
    flex-wrap: nowrap;
  }

  @media (min-width: 1440px) {
    margin-bottom: 2rem;
  }

  .remember-checkbox {
    font-size: 0.85rem;
    color: #616161;

    @media (min-width: 768px) {
      font-size: 0.9rem;
    }

    @media (min-width: 1440px) {
      font-size: 0.95rem;
    }

    :deep(.q-checkbox__bg) {
      border-radius: 6px;
    }
  }

  .forgot-link {
    font-size: 0.85rem;
    color: #757575;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;

    @media (min-width: 768px) {
      font-size: 0.9rem;
    }

    @media (min-width: 1440px) {
      font-size: 0.95rem;
    }

    &:hover {
      color: #667eea;
    }
  }
}

.submit-btn {
  width: 100%;
  height: 46px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;

  @media (min-width: 768px) {
    height: 50px;
    border-radius: 12px;
    font-size: 0.95rem;
  }

  @media (min-width: 1440px) {
    height: 54px;
    font-size: 1rem;
    border-radius: 14px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(102, 126, 234, 0.4);
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
    padding: 2.5rem 2rem;
  }

  @media (min-width: 1024px) {
    flex: 1.1;
    padding: 3rem 2.5rem;
  }

  @media (min-width: 1440px) {
    flex: 1.2;
    padding: 4rem 3rem;
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
    max-width: 400px;
  }

  @media (min-width: 1440px) {
    max-width: 450px;
  }

  .welcome-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: white;
    margin: 0 0 1rem 0;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    line-height: 1.3;

    @media (min-width: 1024px) {
      font-size: 2.25rem;
      margin: 0 0 1.25rem 0;
    }

    @media (min-width: 1440px) {
      font-size: 2.75rem;
      margin: 0 0 1.5rem 0;
    }
  }

  .welcome-text {
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
    font-weight: 400;
    line-height: 1.6;

    @media (min-width: 1024px) {
      font-size: 1.05rem;
    }

    @media (min-width: 1440px) {
      font-size: 1.15rem;
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
