<template>
  <q-page class="auth-page">
    <div class="auth-container">
      <!-- Left Side - Branding Panel -->
      <div class="brand-section">
        <!-- Geometric background shapes -->
        <div class="geo-bg">
          <div class="geo-circle geo-circle--1"></div>
          <div class="geo-circle geo-circle--2"></div>
          <div class="geo-line geo-line--1"></div>
          <div class="geo-line geo-line--2"></div>
          <div class="geo-dot-grid"></div>
        </div>

        <div class="brand-inner">
          <!-- Badge -->
          <div class="brand-badge">
            <span class="badge-dot"></span>
            <span class="badge-label">WAGEY ADMIN</span>
          </div>

          <!-- Headline -->
          <div class="brand-hero">
            <h1 class="brand-headline">
              Welcome<br />
              <span class="brand-name">Back.</span>
            </h1>
            <p class="brand-desc">
              Your payroll dashboard awaits.<br />
              Secure, fast, and always in sync.
            </p>
          </div>

          <!-- Stats strip -->
          <div class="brand-stats">
            <div class="stat-item">
              <span class="stat-value">99.9%</span>
              <span class="stat-label">Uptime</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-value">256-bit</span>
              <span class="stat-label">Encryption</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-value">Real-time</span>
              <span class="stat-label">Payroll sync</span>
            </div>
          </div>

          <!-- Mascot -->
          <div class="mascot-wrap">
            <img src="../assets/wagey_mascot.png" alt="Wagey mascot" class="mascot-img" />
          </div>
        </div>
      </div>

      <!-- Right Side - Form -->
      <div class="form-section">
        <div class="form-card">
          <!-- Logo -->
          <div class="form-logo">
            <img src="../assets/wagey_logo.png" alt="Wagey" class="logo-img" />
          </div>

          <div class="form-header">
            <h2 class="form-title">Sign in</h2>
            <p class="form-subtitle">Enter your credentials to continue</p>
          </div>

          <q-form @submit="handleLogin" class="login-form">
            <!-- Username -->
            <div class="field-wrap">
              <label class="field-label">Username</label>
              <q-input
                v-model="formData.username"
                outlined
                placeholder="your.username"
                lazy-rules
                :rules="[(val) => !!val || 'Username is required']"
                autocomplete="username"
                class="wagey-input"
                hide-bottom-space
              >
                <template v-slot:prepend>
                  <q-icon name="person_outline" size="18px" class="field-icon" />
                </template>
              </q-input>
            </div>

            <!-- Password -->
            <div class="field-wrap">
              <label class="field-label">Password</label>
              <q-input
                v-model="formData.password"
                outlined
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                lazy-rules
                :rules="[(val) => !!val || 'Password is required']"
                autocomplete="current-password"
                class="wagey-input"
                hide-bottom-space
              >
                <template v-slot:prepend>
                  <q-icon name="lock_outline" size="18px" class="field-icon" />
                </template>
                <template v-slot:append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer toggle-icon"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>
            </div>

            <!-- Options Row -->
            <div class="options-row">
              <q-checkbox
                v-model="formData.rememberMe"
                label="Remember me"
                class="wagey-checkbox"
                color="primary"
              />
              <a href="#" @click.prevent="goToForgotPassword" class="forgot-link">
                Forgot password?
              </a>
            </div>

            <!-- Submit -->
            <q-btn
              type="submit"
              class="sign-in-btn"
              unelevated
              no-caps
              :loading="loading"
              :disable="!isFormValid"
            >
              <span class="btn-text">Sign In</span>
              <q-icon name="arrow_forward" size="16px" class="btn-icon" />
            </q-btn>
          </q-form>

          <div class="divider-row">
            <span class="divider-line"></span>
            <span class="divider-text">secure login</span>
            <span class="divider-line"></span>
          </div>

          <p class="signup-text">
            Don't have an account?
            <a href="#" class="signup-link">Create one</a>
          </p>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'boot/auth'
import { useAuth } from '@/composables/page/useAuth'

const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const authStore = useAuthStore()

const { loading, login, fetchCurrentUserCompanies } = useAuth()

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

  try {
    const loginData = await login({
      username: formData.value.username,
      password: formData.value.password,
    })

    const { access, refresh } = loginData

    if (!access) {
      showErrorNotification('Login succeeded but no access token received.')
      return
    }

    authStore.setToken(access)
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)

    const companiesData = await fetchCurrentUserCompanies(access)

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
    localStorage.setItem('username', formData.value.username)

    const displayName =
      firstCompany.user?.full_name ||
      `${firstCompany.user?.first_name || ''} ${firstCompany.user?.last_name || ''}`.trim() ||
      firstCompany.user?.username ||
      formData.value.username
    localStorage.setItem('cached_username', displayName)

    authStore.setAuth(access, {
      uuid: accountUuid,
      userId: userId,
      companyId: companyId,
    })

    showSuccessNotification('Login successful!')

    const redirectPath = route.query.redirect || '/app'
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
  }
}

const goToForgotPassword = () => router.push('/forgot-password')
</script>

<style lang="scss" scoped>
// ─── Tokens ──────────────────────────────────────────────
$blue-deep: #0b1f4a;
$blue-mid: #1648a0;
$blue-bright: #2563eb;
$blue-light: #dbeafe;
$blue-pale: #eff6ff;
$text-dark: #0d1b2e;
$text-mid: #3d5578;
$text-muted: #8a97ab;
$white: #ffffff;

// ─── Breakpoints ─────────────────────────────────────────
// Mobile-first: base styles = <768px
// $bp-md  = 768px  (tablet portrait — brand panel appears)
// $bp-lg  = 1024px (tablet landscape / small desktop)
// $bp-xl  = 1440px (wide desktop)

// ─── Page ────────────────────────────────────────────────
.auth-page {
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: stretch;
  background: $blue-pale;
}

.auth-container {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

// ─── Left / Brand panel ──────────────────────────────────
// Hidden on mobile (<768px), visible from tablet up
.brand-section {
  display: none;

  // 768px — brand panel appears, compact layout
  @media (min-width: 768px) {
    display: flex;
    flex: 1;
    height: 100vh;
    position: relative;
    overflow: hidden;
    background: $blue-deep;
    min-width: 0;
  }
}

// ─── Geometric background ────────────────────────────────
.geo-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.geo-circle {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.07);

  &--1 {
    width: 380px;
    height: 380px;
    right: -120px;
    bottom: -60px;
    border-width: 1.5px;
    animation: rotateSlow 40s linear infinite;

    @media (min-width: 1024px) {
      width: 480px;
      height: 480px;
      right: -140px;
      bottom: -70px;
    }

    @media (min-width: 1440px) {
      width: 580px;
      height: 580px;
      right: -160px;
      bottom: -80px;
    }
  }

  &--2 {
    width: 220px;
    height: 220px;
    right: -40px;
    bottom: 20px;
    border-color: rgba(37, 99, 235, 0.25);
    animation: rotateSlow 28s linear infinite reverse;

    @media (min-width: 1024px) {
      width: 270px;
      height: 270px;
      right: -50px;
      bottom: 30px;
    }

    @media (min-width: 1440px) {
      width: 320px;
      height: 320px;
      right: -60px;
      bottom: 40px;
    }
  }
}

.geo-line {
  position: absolute;
  background: rgba(255, 255, 255, 0.04);

  &--1 {
    width: 100%;
    height: 1px;
    top: 38%;
    transform: rotate(-12deg) scaleX(1.5);
    transform-origin: left center;
  }

  &--2 {
    width: 100%;
    height: 1px;
    top: 62%;
    transform: rotate(-12deg) scaleX(1.5);
    transform-origin: left center;
  }
}

.geo-dot-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: linear-gradient(
    to bottom right,
    transparent 30%,
    rgba(0, 0, 0, 0.4) 60%,
    transparent 90%
  );

  @media (min-width: 1024px) {
    background-size: 28px 28px;
  }
}

@keyframes rotateSlow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// ─── Brand inner ─────────────────────────────────────────
.brand-inner {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  overflow: hidden;

  // 768px — tighter padding, content fits compact panel
  padding: 2rem 1.75rem 0;

  @media (min-width: 1024px) {
    padding: 2.75rem 2.5rem 0;
  }

  @media (min-width: 1440px) {
    padding: 3.5rem 3.5rem 0;
  }
}

// ─── Badge ───────────────────────────────────────────────
.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(37, 99, 235, 0.18);
  border: 1px solid rgba(37, 99, 235, 0.32);
  border-radius: 100px;
  padding: 0.3rem 0.75rem;
  width: fit-content;
  margin-bottom: 1.25rem;
  animation: fadeSlideDown 0.6s ease both;
  flex-shrink: 0;

  @media (min-width: 1024px) {
    padding: 0.35rem 0.85rem;
    margin-bottom: 1.5rem;
  }

  @media (min-width: 1440px) {
    margin-bottom: 2rem;
  }

  .badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: $blue-bright;
    box-shadow: 0 0 6px rgba(37, 99, 235, 0.8);
    animation: pulseDot 2.5s ease-in-out infinite;
  }

  .badge-label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;

    @media (min-width: 1024px) {
      font-size: 0.68rem;
    }
  }
}

@keyframes pulseDot {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.8);
  }
}

// ─── Headline ────────────────────────────────────────────
.brand-hero {
  margin-bottom: 0.75rem;
  animation: fadeSlideUp 0.65s ease 0.1s both;
  flex-shrink: 0;

  @media (min-width: 1024px) {
    margin-bottom: 1rem;
  }

  @media (min-width: 1440px) {
    margin-bottom: 1.5rem;
  }
}

.brand-headline {
  font-weight: 800;
  color: $white;
  margin: 0 0 0.6rem;
  line-height: 1.08;
  letter-spacing: -0.03em;

  // 768px — smaller to fit narrower panel
  font-size: 1.7rem;

  @media (min-width: 1024px) {
    font-size: 2.8rem;
    margin: 0 0 1rem;
  }

  @media (min-width: 1440px) {
    font-size: clamp(3rem, 3.2vw, 3.8rem);
  }
}

.brand-name {
  background: linear-gradient(135deg, #60a5fa 0%, #93c5fd 60%, #bfdbfe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-desc {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.42);
  line-height: 1.7;
  margin: 0;
  font-weight: 400;

  @media (min-width: 1024px) {
    font-size: 0.88rem;
  }

  @media (min-width: 1440px) {
    font-size: 0.92rem;
    line-height: 1.75;
  }
}

// ─── Stats strip ─────────────────────────────────────────
.brand-stats {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.8rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  width: fit-content;
  flex-shrink: 0;
  animation: fadeSlideUp 0.65s ease 0.2s both;
  backdrop-filter: blur(6px);

  @media (min-width: 1024px) {
    gap: 0.85rem;
    padding: 0.6rem 1rem;
    border-radius: 10px;
  }

  @media (min-width: 1440px) {
    gap: 1.1rem;
    padding: 0.7rem 1.1rem;
    border-radius: 11px;
  }
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.stat-value {
  font-size: 0.7rem;
  font-weight: 700;
  color: $white;
  letter-spacing: -0.01em;

  @media (min-width: 1024px) {
    font-size: 0.75rem;
  }

  @media (min-width: 1440px) {
    font-size: 0.8rem;
  }
}

.stat-label {
  font-size: 0.55rem;
  color: rgba(255, 255, 255, 0.38);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.06em;

  @media (min-width: 1024px) {
    font-size: 0.58rem;
  }

  @media (min-width: 1440px) {
    font-size: 0.6rem;
  }
}

.stat-divider {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.1);

  @media (min-width: 1024px) {
    height: 20px;
  }

  @media (min-width: 1440px) {
    height: 22px;
  }
}

// ─── Mascot ──────────────────────────────────────────────
.mascot-wrap {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  animation: fadeSlideUp 0.7s ease 0.3s both;
}

.mascot-img {
  width: auto;
  height: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: bottom center;
  filter: drop-shadow(0 20px 48px rgba(11, 31, 74, 0.5));
  animation: floatMascot 5s ease-in-out infinite;
}

@keyframes floatMascot {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-12px);
  }
}

// ─── Keyframes ───────────────────────────────────────────
@keyframes fadeSlideDown {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ─── Right / Form panel ──────────────────────────────────
.form-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $blue-pale;
  height: 100vh;
  overflow: hidden;
  padding: 1.25rem;

  // 768px — share space with brand panel, fixed width
  @media (min-width: 768px) {
    flex: 0 0 48%;
    max-width: 48%;
    padding: 1.25rem;
  }

  // 1024px — slightly narrower form side
  @media (min-width: 1024px) {
    flex: 0 0 44%;
    max-width: 44%;
    padding: 1.5rem;
  }

  // 1440px — narrower form column, more breathing room
  @media (min-width: 1440px) {
    flex: 0 0 38%;
    max-width: 38%;
    padding: 2rem;
  }
}

// ─── Form card ───────────────────────────────────────────
.form-card {
  background: $white;
  border-radius: 20px;
  width: 100%;
  box-shadow:
    0 1px 3px rgba(11, 31, 74, 0.06),
    0 8px 24px rgba(11, 31, 74, 0.09),
    0 32px 64px rgba(11, 31, 74, 0.07);
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: fadeSlideUp 0.55s ease 0.05s both;

  // Mobile
  padding: 1.5rem 1.35rem;
  max-width: 100%;

  // 768px
  @media (min-width: 768px) {
    padding: 1.6rem 1.6rem;
    border-radius: 22px;
    max-width: 380px;
  }

  // 1024px
  @media (min-width: 1024px) {
    padding: 2rem 2rem;
    border-radius: 24px;
    max-width: 400px;
  }

  // 1440px
  @media (min-width: 1440px) {
    padding: 2.5rem 2.5rem;
    max-width: 420px;
  }
}

// ─── Logo ────────────────────────────────────────────────
.form-logo {
  background: $blue-pale;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
  border: 1.5px solid $blue-light;

  width: 42px;
  height: 42px;

  @media (min-width: 1024px) {
    width: 46px;
    height: 46px;
    margin-bottom: 0.85rem;
  }

  @media (min-width: 1440px) {
    width: 50px;
    height: 50px;
    border-radius: 14px;
    margin-bottom: 1rem;
  }

  .logo-img {
    object-fit: contain;
    height: 24px;
    width: 24px;

    @media (min-width: 1024px) {
      height: 26px;
      width: 26px;
    }

    @media (min-width: 1440px) {
      height: 28px;
      width: 28px;
    }
  }
}

// ─── Form header ─────────────────────────────────────────
.form-header {
  text-align: center;
  width: 100%;
  margin-bottom: 1rem;

  @media (min-width: 1024px) {
    margin-bottom: 1.1rem;
  }

  @media (min-width: 1440px) {
    margin-bottom: 1.4rem;
  }

  .form-title {
    font-weight: 700;
    color: $text-dark;
    margin: 0 0 0.3rem;
    letter-spacing: -0.02em;
    font-size: 1.35rem;

    @media (min-width: 1024px) {
      font-size: 1.5rem;
      margin: 0 0 0.35rem;
    }

    @media (min-width: 1440px) {
      font-size: 1.6rem;
    }
  }

  .form-subtitle {
    font-size: 0.8rem;
    color: $text-muted;
    margin: 0;
    font-weight: 400;

    @media (min-width: 1440px) {
      font-size: 0.84rem;
    }
  }
}

// ─── Form & fields ───────────────────────────────────────
.login-form {
  width: 100%;
}

.field-wrap {
  margin-bottom: 0.75rem;

  @media (min-width: 1024px) {
    margin-bottom: 0.85rem;
  }

  @media (min-width: 1440px) {
    margin-bottom: 1rem;
  }
}

.field-label {
  display: block;
  font-size: 0.73rem;
  font-weight: 600;
  color: $text-dark;
  letter-spacing: 0.01em;
  margin-bottom: 0.35rem;
  padding-left: 1px;

  @media (min-width: 1024px) {
    font-size: 0.76rem;
    margin-bottom: 0.4rem;
  }
}

.wagey-input {
  width: 100%;

  :deep(.q-field__control) {
    border-radius: 10px;
    height: 46px;
    background: #f8fafd;
    transition: background 0.18s ease;

    @media (min-width: 1024px) {
      border-radius: 11px;
      height: 48px;
    }

    &:before {
      border: 1.5px solid #e5ecf7;
      border-radius: 10px;
      transition: border-color 0.18s ease;

      @media (min-width: 1024px) {
        border-radius: 11px;
      }
    }

    &:hover:before {
      border-color: #b8ceea;
    }
  }

  :deep(.q-field--focused .q-field__control) {
    background: $white;

    &:before {
      border-color: $blue-bright !important;
      border-width: 2px;
    }

    &:after {
      display: none;
    }
  }

  :deep(.q-field__native) {
    font-size: 0.85rem;
    color: $text-dark;
    padding-left: 0.4rem;

    @media (min-width: 1024px) {
      font-size: 0.875rem;
    }

    &::placeholder {
      color: #b8c4d4;
    }
  }

  :deep(.q-field__prepend) {
    padding-left: 0.85rem;
    padding-right: 0.2rem;
  }

  :deep(.q-field__append) {
    padding-right: 0.85rem;
  }

  .field-icon {
    color: #a8b6cc;
  }

  .toggle-icon {
    color: #a8b6cc;
    font-size: 18px;
    transition: color 0.15s ease;

    &:hover {
      color: $blue-bright;
    }
  }
}

// ─── Options row ─────────────────────────────────────────
.options-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;

  @media (min-width: 1024px) {
    margin-bottom: 1.1rem;
  }

  @media (min-width: 1440px) {
    margin-bottom: 1.25rem;
  }

  .wagey-checkbox {
    :deep(.q-checkbox__label) {
      font-size: 0.78rem;
      color: $text-mid;

      @media (min-width: 1024px) {
        font-size: 0.8rem;
      }
    }

    :deep(.q-checkbox__bg) {
      border-radius: 5px;
    }
  }

  .forgot-link {
    font-size: 0.78rem;
    color: $blue-bright;
    font-weight: 600;
    text-decoration: none;
    transition: opacity 0.15s ease;

    @media (min-width: 1024px) {
      font-size: 0.8rem;
    }

    &:hover {
      opacity: 0.72;
    }
  }
}

// ─── Sign In button ──────────────────────────────────────
.sign-in-btn {
  width: 100%;
  background: $blue-deep;
  color: $white;
  border-radius: 10px;
  font-weight: 700;
  letter-spacing: 0.01em;
  transition:
    background 0.2s ease,
    transform 0.15s ease,
    box-shadow 0.2s ease;

  height: 46px;
  font-size: 0.88rem;

  @media (min-width: 1024px) {
    height: 50px;
    font-size: 0.9rem;
    border-radius: 11px;
  }

  @media (min-width: 1440px) {
    height: 52px;
    font-size: 0.92rem;
  }

  .btn-text {
    font-weight: 700;
  }

  .btn-icon {
    transition: transform 0.2s ease;
    opacity: 0.65;
    margin-left: 4px;
  }

  &:hover:not(.disabled) {
    background: $blue-mid;
    box-shadow: 0 8px 24px rgba(22, 72, 160, 0.32);
    transform: translateY(-1px);

    .btn-icon {
      transform: translateX(3px);
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(0);
    box-shadow: none;
  }

  :deep(.q-btn__content) {
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

// ─── Divider ─────────────────────────────────────────────
.divider-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  margin-top: 0.85rem;

  @media (min-width: 1024px) {
    margin-top: 1rem;
  }
}

.divider-line {
  flex: 1;
  height: 1px;
  background: #eef1f7;
}

.divider-text {
  font-size: 0.65rem;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 500;
  white-space: nowrap;

  @media (min-width: 1024px) {
    font-size: 0.68rem;
  }
}

// ─── Sign up text ─────────────────────────────────────────
.signup-text {
  margin-top: 0.65rem;
  font-size: 0.78rem;
  color: $text-muted;
  text-align: center;

  @media (min-width: 1024px) {
    margin-top: 0.75rem;
    font-size: 0.8rem;
  }

  .signup-link {
    color: $blue-bright;
    font-weight: 600;
    text-decoration: none;
    margin-left: 0.2rem;
    transition: opacity 0.15s ease;

    &:hover {
      opacity: 0.72;
    }
  }
}

// ─── Accessibility ────────────────────────────────────────
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
