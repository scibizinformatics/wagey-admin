<template>
  <section class="card" :class="{ 'card--shake': shake, 'card--done': signedIn }">
    <header class="card__head">
      <img :src="markWhite" alt="Wagey" class="brandmark" :class="{ 'brandmark--lit': signedIn }" />
      <h1 class="card__title">Sign in</h1>
      <p class="card__sub">Use your admin credentials to reach the Wagey console.</p>
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
        <div class="field__top">
          <label class="field__label" for="login-password">Password</label>
          <a href="#" class="link" @click.prevent="goToForgotPassword">Forgot password?</a>
        </div>
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

      <label class="check" style="--d: 180ms">
        <input v-model="formData.rememberMe" type="checkbox" class="check__input" />
        <span class="check__box"><q-icon name="check" size="12px" /></span>
        <span class="check__label">Keep me signed in on this device</span>
      </label>

      <button
        type="submit"
        class="submit"
        style="--d: 240ms"
        :class="{ 'submit--busy': loading, 'submit--done': signedIn }"
        :disabled="!isFormValid || busy"
      >
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
      <p class="card__note">
        Admin accounts are created by your organization. Ask your administrator for an invite.
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
  max-width: 392px;
  padding: 30px 30px 24px;
  border-radius: var(--lg-r);
  // Opaque panel, no backdrop blur: a solid surface sitting on the stage, not a
  // pane of glass in front of it. Depth is a hairline border, one top-edge
  // highlight, and a single deep shadow — nothing else.
  background: var(--lg-card);
  border: 1px solid var(--lg-card-line);
  // Two shadows, doing different jobs: a tight one that seats the card on the
  // ground, and a wide soft one that gives it real distance from it. On a dark
  // surface a single shadow is nearly invisible, which is what leaves a card
  // looking pasted flat onto the background.
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    0 2px 8px rgba(0, 0, 0, 0.4),
    0 34px 80px -28px rgba(0, 0, 0, 0.95);
  animation: cardIn 0.6s var(--lg-ease) both;
  transition:
    box-shadow var(--lg-slow) var(--lg-ease),
    border-color var(--lg-slow) var(--lg-ease);

  // The light in the stage arrives from above, so the card's top edge catches
  // it: a hairline that fades out towards both corners. One inset highlight
  // alone is uniform across the whole width, which is not how an edge behaves
  // under a point source.
  &::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 16px;
    right: 16px;
    height: 1px;
    border-radius: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.34) 50%, transparent);
    pointer-events: none;
  }

  @media (max-width: 480px) {
    padding: 26px 22px 22px;
  }

  &--shake {
    animation: shake 0.44s cubic-bezier(0.36, 0.07, 0.19, 0.97);
  }

  &--done {
    border-color: rgba(23, 178, 106, 0.4);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.07),
      0 0 0 4px rgba(23, 178, 106, 0.1),
      0 34px 80px -28px rgba(0, 0, 0, 0.95);
  }
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.99);
  }

  to {
    opacity: 1;
    transform: none;
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
    transform: translateX(-6px);
  }

  40%,
  60% {
    transform: translateX(6px);
  }
}

// ── Head ────────────────────────────────────────────────────────────────────
// Centred: the mark, the title and the subtitle share the card's vertical axis,
// and the fields below keep their own left edge. The subtitle is held to a
// narrower measure than the card so it breaks into balanced lines instead of
// running the full width and leaving a short orphan on the second line.
.card__head {
  margin-bottom: 24px;
  text-align: center;
}

// The bare mark, with no plate or ring behind it. The size here is the mark's
// real visual size because `wagey_mark.png` is trimmed to the glyph — the
// untrimmed asset carries ~69% transparent padding, so a 46px box of it drew a
// 14px logo.
.brandmark {
  display: block;
  width: 26px;
  height: auto;
  margin: 0 auto 16px;
  // With no plate, the glow is what makes the mark read as lit rather than
  // pasted on.
  filter: drop-shadow(0 0 10px rgba(126, 158, 255, 0.4));
  animation: markIn 0.7s var(--lg-ease) 0.06s both;
  transition: filter var(--lg-slow) var(--lg-ease);

  &--lit {
    filter: drop-shadow(0 0 13px rgba(23, 178, 106, 0.5));
  }
}

@keyframes markIn {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.82);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.card__title {
  margin: 0 0 6px;
  font-size: 22px;
  // Declared, not inherited: Quasar's base typography gives `h1` a 6rem line
  // height, which on a 22px title opens a ~105px line box and blows the whole
  // header apart. Any heading in this card has to set its own.
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--lg-ink);
  animation: riseIn 0.55s var(--lg-ease) 0.12s both;
}

.card__sub {
  margin: 0 auto;
  max-width: 30ch;
  font-size: 13px;
  line-height: 1.55;
  color: var(--lg-ink-3);
  animation: riseIn 0.55s var(--lg-ease) 0.18s both;
}

// ── Fields ──────────────────────────────────────────────────────────────────
.form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.field {
  animation: riseIn 0.55s var(--lg-ease) var(--d, 0ms) both;
}

.field__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.field__label {
  display: block;
  margin-bottom: 7px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--lg-ink-2);
}

.input {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 44px;
  padding: 0 12px;
  border-radius: 8px;
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
    border-color: rgba(120, 150, 255, 0.7);
    box-shadow: 0 0 0 4px rgba(88, 120, 255, 0.15);

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
    color: rgba(255, 255, 255, 0.24);
  }

  // The browser default selection blue is a different blue from the product's.
  &::selection {
    background: rgba(88, 120, 255, 0.34);
  }

  &:disabled {
    color: var(--lg-ink-2);
  }

  // Chrome paints its own yellow autofill plate over the field. The inset
  // shadow trick repaints it in the card's own colour.
  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus {
    -webkit-text-fill-color: #ffffff;
    -webkit-box-shadow: 0 0 0 100px #16273a inset;
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
    background: rgba(255, 255, 255, 0.07);
  }

  &:focus-visible {
    outline: none;
    color: var(--lg-ink);
    box-shadow: 0 0 0 3px rgba(88, 120, 255, 0.22);
  }
}

.field__hint {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 7px 0 0;
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

// ── Remember ────────────────────────────────────────────────────────────────
.check {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-top: 1px;
  cursor: pointer;
  user-select: none;
  animation: riseIn 0.55s var(--lg-ease) var(--d, 0ms) both;
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

.check:hover .check__box {
  border-color: rgba(255, 255, 255, 0.3);
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

// ── Submit ──────────────────────────────────────────────────────────────────
// A flat brand fill with one top-edge highlight. No sweeping shine on hover: a
// light streak crossing the primary action is the kind of decoration that makes
// a console look like a landing page.
.submit {
  position: relative;
  height: 44px;
  margin-top: 5px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: linear-gradient(180deg, #3c5ee4 0%, #2a45c4 100%);
  color: #ffffff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  animation: riseIn 0.55s var(--lg-ease) var(--d, 0ms) both;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 6px 18px -8px rgba(46, 79, 212, 0.7);
  transition:
    background var(--lg-fast) var(--lg-ease),
    box-shadow var(--lg-slow) var(--lg-ease),
    opacity var(--lg-fast) var(--lg-ease);

  &:hover:not(:disabled) {
    background: linear-gradient(180deg, #4667ef 0%, #2f4cd2 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.26),
      0 10px 24px -8px rgba(46, 79, 212, 0.8);

    .submit__arrow {
      transform: translateX(3px);
    }
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      0 0 0 4px rgba(88, 120, 255, 0.3);
  }

  &:disabled {
    cursor: not-allowed;
    color: var(--lg-ink-4);
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--lg-line);
    box-shadow: none;
  }

  &--busy {
    opacity: 0.92;
  }

  &--done {
    background: linear-gradient(180deg, #17b26a 0%, #0f9155 100%);
    opacity: 1;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.22),
      0 6px 20px -8px rgba(23, 178, 106, 0.7);
  }
}

.submit__label {
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
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid var(--lg-line);
  animation: riseIn 0.55s var(--lg-ease) var(--d, 0ms) both;
}

.card__note {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--lg-ink-4);
}

@keyframes riseIn {
  from {
    opacity: 0;
    transform: translateY(9px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card,
  .card__title,
  .card__sub,
  .brandmark,
  .field,
  .check,
  .submit,
  .card__foot {
    animation: none;
  }

  .card--shake {
    animation: none;
  }
}
</style>
