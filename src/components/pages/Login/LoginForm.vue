<template>
  <section class="card" :class="{ 'card--shake': shake, 'card--done': signedIn }">
    <!-- A slowly rotating conic gradient, clipped to a 1px ring, so the card
         edge catches the light the way the stage behind it does. -->
    <span class="card__ring" aria-hidden="true"></span>

    <header class="card__head">
      <img :src="markWhite" alt="Wagey" class="brandmark" :class="{ 'brandmark--lit': signedIn }" />
      <h1 class="card__title">Sign in to Wagey</h1>
      <p class="card__sub">Use your admin credentials to reach the payroll console.</p>
    </header>

    <form class="form" novalidate @submit.prevent="handleLogin">
      <div class="field" style="--d: 60ms">
        <label class="field__label" for="login-username">Username</label>
        <div class="input" :class="{ 'input--filled': !!formData.username }">
          <q-icon name="person_outline" size="18px" class="input__icon" />
          <input
            id="login-username"
            v-model.trim="formData.username"
            type="text"
            class="input__el"
            autocomplete="username"
            spellcheck="false"
            placeholder="your.username"
            :disabled="busy"
          />
        </div>
      </div>

      <div class="field" style="--d: 120ms">
        <label class="field__label" for="login-password">Password</label>
        <div class="input" :class="{ 'input--filled': !!formData.password }">
          <q-icon name="lock_outline" size="18px" class="input__icon" />
          <input
            id="login-password"
            ref="passwordEl"
            v-model="formData.password"
            :type="showPassword ? 'text' : 'password'"
            class="input__el"
            autocomplete="current-password"
            placeholder="••••••••"
            :disabled="busy"
            @keyup="trackCapsLock"
            @keydown="trackCapsLock"
          />
          <button
            type="button"
            class="input__reveal"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            <q-icon :name="showPassword ? 'visibility_off' : 'visibility'" size="18px" />
          </button>
        </div>
        <!-- A quiet, useful detail: most failed sign-ins are a stuck Caps Lock. -->
        <transition name="hint">
          <p v-if="capsLock" class="field__hint">
            <q-icon name="keyboard_capslock" size="14px" />
            Caps Lock is on
          </p>
        </transition>
      </div>

      <div class="row" style="--d: 180ms">
        <label class="check">
          <input v-model="formData.rememberMe" type="checkbox" class="check__input" />
          <span class="check__box"><q-icon name="check" size="12px" /></span>
          <span class="check__label">Keep me signed in</span>
        </label>
        <a href="#" class="link" @click.prevent="goToForgotPassword">Forgot password?</a>
      </div>

      <button
        type="submit"
        class="submit"
        style="--d: 240ms"
        :class="{ 'submit--busy': loading, 'submit--done': signedIn }"
        :disabled="!isFormValid || busy"
      >
        <span class="submit__shine" aria-hidden="true"></span>
        <span class="submit__label">
          <template v-if="signedIn">
            <q-icon name="check" size="18px" />
            Signed in
          </template>
          <template v-else-if="loading">
            <q-spinner size="16px" />
            Signing in…
          </template>
          <template v-else>
            Sign in
            <q-icon name="arrow_forward" size="16px" class="submit__arrow" />
          </template>
        </span>
      </button>
    </form>

    <footer class="card__foot" style="--d: 300ms">
      <span class="card__rule"></span>
      <p class="card__note">
        Admin accounts are created by your organisation. Ask your administrator for an invite.
      </p>
    </footer>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from 'boot/auth'
import { useCompanyStore } from '@/stores/company'
import { useAuth } from '@/composables/page/useAuth'
import { useToast } from 'src/composables/useToast'
import markWhite from '@/assets/wagey_mark.png'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const companyStore = useCompanyStore()
const toast = useToast()

const { loading, login, fetchCurrentUserCompanies, fetchUserProfile } = useAuth()

const showPassword = ref(false)
const capsLock = ref(false)
const shake = ref(false)
// Held true from a successful sign-in until the route actually changes, so the
// button can show its confirmation instead of flicking back to "Sign in".
const signedIn = ref(false)

const formData = ref({
  username: '',
  password: '',
  rememberMe: false,
})

const isFormValid = computed(() => !!formData.value.username && !!formData.value.password)
const busy = computed(() => loading.value || signedIn.value)

function trackCapsLock(event) {
  if (typeof event.getModifierState !== 'function') return
  capsLock.value = event.getModifierState('CapsLock')
}

function fail(message) {
  toast.error(message)
  shake.value = true
  setTimeout(() => (shake.value = false), 480)
}

const handleLogin = async () => {
  if (!isFormValid.value || busy.value) return

  try {
    const loginData = await login({
      username: formData.value.username,
      password: formData.value.password,
    })

    const { access, refresh } = loginData

    if (!access) {
      fail('Login succeeded but no access token received.')
      return
    }

    authStore.setToken(access)
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)

    const companiesData = await fetchCurrentUserCompanies(access)

    if (!companiesData || companiesData.length === 0) {
      fail('No company associated with this account.')
      return
    }

    const firstCompany = companiesData[0]
    const companyId = firstCompany.company?.id ?? firstCompany.company

    let profileData = null
    let employeeUuid = null
    try {
      profileData = await fetchUserProfile(access)
      employeeUuid = profileData?.profile?.id || null
      if (profileData?.user_type === 'business_owner' && profileData?.profile?.id) {
        localStorage.setItem('business_owner_uuid', profileData.profile.id)
      }
    } catch {
      // non-critical — will be null if this endpoint fails
    }

    const accountUuid = firstCompany.id || employeeUuid
    const userId = firstCompany.user?.id ?? profileData?.user_id

    if (!accountUuid) {
      fail('Failed to get account UUID after login.')
      return
    }

    // Store full company object with country context
    const companyPayload = {
      id: companyId,
      name: firstCompany.company?.name || firstCompany.company_name || '',
      logo: firstCompany.company?.logo || firstCompany.company_logo || null,
      country: firstCompany.company?.country || firstCompany.country || '',
      country_name: firstCompany.company?.country_name || firstCompany.country_name || '',
    }
    companyStore.setCompany(companyPayload)

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
      employee_uuid: employeeUuid,
      uuid: accountUuid,
      userId: userId,
      companyId: companyId,
    })

    toast.success('Welcome back', { caption: displayName })

    // Let the button land on its confirmed state before the route swaps out.
    signedIn.value = true
    const redirectPath = route.query.redirect || '/app'
    setTimeout(() => router.push(redirectPath), 420)
  } catch (error) {
    console.error('Login error:', error)
    if (error.response) {
      const errorMessage =
        error.response.data?.detail || error.response.data?.message || 'Invalid login credentials.'
      fail(errorMessage)
    } else {
      fail('Login failed. Please try again.')
    }
  }
}

const goToForgotPassword = () => router.push('/forgot-password')
</script>

<style lang="scss" scoped>
// ── Card ────────────────────────────────────────────────────────────────────
.card {
  position: relative;
  width: 100%;
  max-width: 404px;
  padding: 32px 30px 26px;
  border-radius: var(--lg-r);
  // Opaque panel, no backdrop blur: this is a solid surface sitting on the
  // stage, not a pane of glass in front of it. Depth comes from the hairline
  // border, a single top-edge highlight, and one deep soft shadow.
  background: var(--lg-card);
  border: 1px solid var(--lg-card-line);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    0 24px 64px -20px rgba(2, 6, 14, 0.85);
  animation: cardIn 0.72s var(--lg-ease) both;
  transition:
    box-shadow var(--lg-slow) var(--lg-ease),
    border-color var(--lg-slow) var(--lg-ease);

  @media (max-width: 480px) {
    padding: 26px 20px 22px;
  }

  &--shake {
    animation: shake 0.44s cubic-bezier(0.36, 0.07, 0.19, 0.97);
  }

  &--done {
    border-color: rgba(23, 178, 106, 0.42);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.07),
      0 0 0 4px rgba(23, 178, 106, 0.12),
      0 24px 64px -20px rgba(2, 6, 14, 0.85);
  }
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.985);
    filter: blur(6px);
  }
  to {
    opacity: 1;
    transform: none;
    filter: blur(0);
  }
}

@keyframes shake {
  10%,
  90% {
    transform: translateX(-2px);
  }
  20%,
  80% {
    transform: translateX(4px);
  }
  30%,
  50%,
  70% {
    transform: translateX(-7px);
  }
  40%,
  60% {
    transform: translateX(7px);
  }
}

// The ring: a full-bleed conic gradient masked down to the border box, so only
// the 1px edge shows. `mask-composite` subtracts the inner rectangle.
//
// Guarded behind @supports on purpose. Every browser in this project's
// browserslist handles it, so autoprefixer emits no `-webkit-` fallback; on
// anything older the mask cannot be hollowed out and the conic gradient would
// wash across the whole card face. No ring at all beats a bright sweep over the
// form, so the effect is opt-in for engines that can cut the hole.
.card__ring {
  display: none;
}

@supports (mask-composite: exclude) {
  .card__ring {
    display: block;
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: conic-gradient(
      from var(--ring-angle, 0deg),
      transparent 0deg,
      rgba(255, 255, 255, 0.5) 42deg,
      rgba(120, 150, 255, 0.75) 66deg,
      transparent 120deg,
      transparent 360deg
    );
    mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    mask-composite: exclude;
    opacity: 0.55;
    pointer-events: none;
    animation: spinRing 9s linear infinite;
  }
}

@property --ring-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

@keyframes spinRing {
  to {
    --ring-angle: 360deg;
  }
}

// ── Head ────────────────────────────────────────────────────────────────────
.card__head {
  text-align: center;
  margin-bottom: 22px;
}

// The bare mark, with no plate or ring behind it. Sizes here are the mark's real
// visual size because `wagey_mark.png` is trimmed to the glyph — the untrimmed
// `wagey_icon(White).png` carries ~69% transparent padding, so a 46px box of it
// drew a 14px logo.
.brandmark {
  display: block;
  width: 30px;
  height: auto;
  margin: 0 auto 14px;
  // With the plate gone, the glow is the only thing making the mark read as lit
  // rather than pasted on, so it does the work the box used to do.
  filter: drop-shadow(0 0 11px rgba(126, 158, 255, 0.42));
  animation: markIn 0.8s var(--lg-ease) 0.08s both;
  transition: filter var(--lg-slow) var(--lg-ease);

  @media (max-width: 480px) {
    width: 27px;
  }

  &--lit {
    filter: drop-shadow(0 0 14px rgba(23, 178, 106, 0.52));
  }
}

@keyframes markIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.78);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.card__title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 600;
  // Declared, not inherited: Quasar's base typography gives `h1` a 6rem line
  // height, which on a 20px title opens a ~96px line box and blows the whole
  // header apart. Any heading in this card has to set its own.
  line-height: 1.3;
  letter-spacing: -0.02em;
  color: var(--lg-ink);
  animation: riseIn 0.6s var(--lg-ease) 0.14s both;
}

.card__sub {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--lg-ink-3);
  animation: riseIn 0.6s var(--lg-ease) 0.2s both;
}

// ── Fields ──────────────────────────────────────────────────────────────────
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  animation: riseIn 0.6s var(--lg-ease) var(--d, 0ms) both;
}

.field__label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--lg-ink-2);
}

.input {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 46px;
  padding: 0 12px;
  border-radius: 9px;
  background: var(--lg-field);
  border: 1px solid var(--lg-line);
  transition:
    border-color var(--lg-fast) var(--lg-ease),
    background var(--lg-fast) var(--lg-ease),
    box-shadow var(--lg-fast) var(--lg-ease);

  &:hover {
    background: var(--lg-field-hover);
    border-color: var(--lg-line-strong);
  }

  // A soft halo rather than a hard outline, so it doesn't fight the hairlines.
  &:focus-within {
    background: var(--lg-field-hover);
    border-color: rgba(120, 150, 255, 0.72);
    box-shadow: 0 0 0 4px rgba(88, 120, 255, 0.16);

    .input__icon {
      color: rgba(160, 185, 255, 0.95);
    }
  }

  &--filled .input__icon {
    color: var(--lg-ink-2);
  }
}

.input__icon {
  flex-shrink: 0;
  color: var(--lg-ink-4);
  transition: color var(--lg-fast) var(--lg-ease);
}

.input__el {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--lg-ink);
  font-family: inherit;
  font-size: 14px;
  letter-spacing: -0.005em;

  &::placeholder {
    color: rgba(255, 255, 255, 0.26);
  }

  &:disabled {
    color: var(--lg-ink-2);
  }

  // Chrome paints its own yellow autofill plate, which would blow a hole in the
  // glass. The inset shadow trick repaints it in the card's own colour.
  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus {
    -webkit-text-fill-color: #ffffff;
    -webkit-box-shadow: 0 0 0 100px #14243a inset;
    caret-color: #ffffff;
  }
}

.input__reveal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--lg-ink-4);
  cursor: pointer;
  transition:
    color var(--lg-fast) var(--lg-ease),
    background var(--lg-fast) var(--lg-ease);

  &:hover {
    color: var(--lg-ink);
    background: rgba(255, 255, 255, 0.08);
  }
}

.field__hint {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 6px 0 0;
  font-size: 11.5px;
  color: #fdb022;
}

.hint-enter-active,
.hint-leave-active {
  transition:
    opacity var(--lg-fast) var(--lg-ease),
    transform var(--lg-fast) var(--lg-ease);
}

.hint-enter-from,
.hint-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}

// ── Options row ─────────────────────────────────────────────────────────────
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 2px;
  animation: riseIn 0.6s var(--lg-ease) var(--d, 0ms) both;
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.check__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.check__box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 5px;
  border: 1px solid var(--lg-line-strong);
  background: var(--lg-field);
  color: transparent;
  transition:
    background var(--lg-fast) var(--lg-ease),
    border-color var(--lg-fast) var(--lg-ease),
    color var(--lg-fast) var(--lg-ease);
}

.check__input:checked + .check__box {
  background: var(--lg-accent-soft);
  border-color: var(--lg-accent-soft);
  color: #ffffff;
}

.check__input:focus-visible + .check__box {
  box-shadow: 0 0 0 4px rgba(88, 120, 255, 0.22);
}

.check__label {
  font-size: 12.5px;
  color: var(--lg-ink-2);
}

.link {
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(150, 178, 255, 0.92);
  text-decoration: none;
  transition: color var(--lg-fast) var(--lg-ease);

  &:hover {
    color: #ffffff;
  }
}

// ── Submit ──────────────────────────────────────────────────────────────────
.submit {
  position: relative;
  overflow: hidden;
  height: 46px;
  margin-top: 6px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 9px;
  background: linear-gradient(180deg, #3f61e8 0%, #2a45c4 100%);
  color: #ffffff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  animation: riseIn 0.6s var(--lg-ease) var(--d, 0ms) both;
  transition:
    transform var(--lg-fast) var(--lg-ease),
    box-shadow var(--lg-slow) var(--lg-ease),
    background var(--lg-slow) var(--lg-ease),
    opacity var(--lg-fast) var(--lg-ease);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 8px 20px -8px rgba(46, 79, 212, 0.7);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      0 12px 26px -8px rgba(46, 79, 212, 0.85);

    .submit__shine {
      transform: translateX(220%);
    }

    .submit__arrow {
      transform: translateX(3px);
    }
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.22),
      0 0 0 4px rgba(88, 120, 255, 0.34);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
  }

  &--busy {
    opacity: 0.9;
  }

  &--done {
    background: linear-gradient(180deg, #17b26a 0%, #0f9155 100%);
    opacity: 1;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.24),
      0 8px 22px -8px rgba(23, 178, 106, 0.7);
  }
}

.submit__shine {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -60%;
  width: 44%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.32), transparent);
  transform: translateX(0);
  transition: transform 0.62s var(--lg-ease);
  pointer-events: none;
}

.submit__label {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

.submit__arrow {
  transition: transform var(--lg-slow) var(--lg-ease);
}

// ── Foot ────────────────────────────────────────────────────────────────────
.card__foot {
  margin-top: 20px;
  animation: riseIn 0.6s var(--lg-ease) var(--d, 0ms) both;
}

.card__rule {
  display: block;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--lg-line), transparent);
}

.card__note {
  margin: 14px 0 0;
  font-size: 11.5px;
  line-height: 1.55;
  text-align: center;
  color: var(--lg-ink-4);
}

@keyframes riseIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card,
  .card__ring,
  .card__title,
  .card__sub,
  .brandmark,
  .field,
  .row,
  .submit,
  .card__foot {
    animation: none;
  }

  .card--shake {
    animation: none;
  }
}
</style>
