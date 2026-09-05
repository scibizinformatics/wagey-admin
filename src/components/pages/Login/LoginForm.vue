<template>
  <section class="card" :class="{ 'card--shake': shake, 'card--done': signedIn }">
    <header class="card__head">
      <img :src="markWhite" alt="Wagey" class="brandmark" :class="{ 'brandmark--lit': signedIn }" />
      <h1 class="card__title">{{ heading.title }}</h1>
      <p class="card__sub">{{ heading.sub }}</p>
    </header>

    <!-- Numbered because the reset genuinely is a sequence of three: the code
         cannot be asked for after it is entered, and the password cannot be set
         before the code is verified. Sign-in is not part of it and shows no
         rail. -->
    <ol v-if="resetStep" class="steps" aria-label="Password reset progress">
      <li
        v-for="s in RESET_STEPS"
        :key="s.index"
        class="step"
        :class="{ 'step--done': s.index < resetStep, 'step--now': s.index === resetStep }"
        :aria-current="s.index === resetStep ? 'step' : undefined"
      >
        <span class="step__mark">
          <q-icon v-if="s.index < resetStep" name="check" size="11px" />
          <template v-else>{{ s.index }}</template>
        </span>
        <span class="step__label">{{ s.label }}</span>
      </li>
    </ol>

    <!-- ═══ Sign in ═══════════════════════════════════════════════════════ -->
    <form v-if="view === 'signin'" class="form" novalidate @submit.prevent="handleLogin">
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
          <button type="button" class="link" :disabled="busy" @click="openReset">
            Forgot password?
          </button>
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

    <!-- ═══ Reset · 1 of 3 — where to send the code ════════════════════════ -->
    <form v-else-if="view === 'email'" class="form" novalidate @submit.prevent="handleRequestCode">
      <div class="field" style="--d: 60ms">
        <label class="field__label" for="reset-email">Work email</label>
        <div class="input" :class="{ 'input--filled': !!reset.email }">
          <q-icon name="mail_outline" size="18px" class="input__icon" />
          <input
            id="reset-email"
            ref="emailEl"
            v-model.trim="reset.email"
            type="email"
            class="input__el"
            autocomplete="email"
            spellcheck="false"
            placeholder="you@company.com"
            :disabled="busy"
          />
        </div>
        <p class="field__hint field__hint--quiet">
          The email on your admin account — not your username.
        </p>
      </div>

      <button
        type="submit"
        class="submit"
        style="--d: 140ms"
        :class="{ 'submit--busy': loading }"
        :disabled="!emailLooksValid || busy"
      >
        <span class="submit__label">
          <template v-if="loading">
            <q-spinner size="16px" />
            Sending code…
          </template>
          <template v-else>
            Send code
            <q-icon name="arrow_forward" size="16px" class="submit__arrow" />
          </template>
        </span>
      </button>
    </form>

    <!-- ═══ Reset · 2 of 3 — the emailed code ══════════════════════════════ -->
    <form v-else-if="view === 'otp'" class="form" novalidate @submit.prevent="handleVerifyCode">
      <p class="sentto" style="--d: 40ms">
        <q-icon name="mark_email_read" size="15px" />
        <span class="sentto__text">Sent to <strong>{{ reset.email }}</strong></span>
        <button type="button" class="link" :disabled="busy" @click="editEmail">Change</button>
      </p>

      <div class="field" style="--d: 90ms">
        <label class="field__label" for="reset-otp">6-digit code</label>
        <div class="input" :class="{ 'input--filled': !!reset.otp }">
          <q-icon name="dialpad" size="18px" class="input__icon" />
          <!-- `:value` with an explicit handler rather than v-model: the handler
               strips anything that is not a digit, so a pasted "123 456" or a
               code copied with stray punctuation still lands correctly. -->
          <input
            id="reset-otp"
            ref="otpEl"
            :value="reset.otp"
            type="text"
            class="input__el input__el--code"
            inputmode="numeric"
            autocomplete="one-time-code"
            spellcheck="false"
            placeholder="000000"
            :disabled="busy"
            @input="onOtpInput"
          />
        </div>
      </div>

      <button
        type="submit"
        class="submit"
        style="--d: 160ms"
        :class="{ 'submit--busy': loading }"
        :disabled="!otpComplete || busy"
      >
        <span class="submit__label">
          <template v-if="loading">
            <q-spinner size="16px" />
            Checking code…
          </template>
          <template v-else>
            Verify code
            <q-icon name="arrow_forward" size="16px" class="submit__arrow" />
          </template>
        </span>
      </button>

      <p class="resend" style="--d: 220ms" aria-live="polite">
        <template v-if="resendIn > 0">
          Didn't get it? You can ask for a new code in {{ resendIn }}s
        </template>
        <template v-else>
          Didn't get it?
          <button type="button" class="link" :disabled="busy" @click="handleResend">
            Send a new code
          </button>
        </template>
      </p>
    </form>

    <!-- ═══ Reset · 3 of 3 — the new password ══════════════════════════════ -->
    <form v-else class="form" novalidate @submit.prevent="handleResetPassword">
      <div class="field" style="--d: 60ms">
        <label class="field__label" for="reset-new">New password</label>
        <div class="input" :class="{ 'input--filled': !!reset.password }">
          <q-icon name="lock_outline" size="18px" class="input__icon" />
          <input
            id="reset-new"
            ref="newPasswordEl"
            v-model="reset.password"
            :type="showNewPassword ? 'text' : 'password'"
            class="input__el"
            autocomplete="new-password"
            placeholder="••••••••"
            :disabled="busy"
            @keyup="trackCapsLock"
            @keydown="trackCapsLock"
          />
          <button
            type="button"
            class="input__reveal"
            :aria-label="showNewPassword ? 'Hide password' : 'Show password'"
            :aria-pressed="showNewPassword"
            @click="showNewPassword = !showNewPassword"
          >
            <q-icon :name="showNewPassword ? 'visibility_off' : 'visibility'" size="18px" />
          </button>
        </div>
      </div>

      <div class="field" style="--d: 110ms">
        <label class="field__label" for="reset-confirm">Confirm new password</label>
        <!-- The mismatch tint is on the field itself as well as in the checklist
             below: at this point the two rows look identical, and the person is
             comparing two things they cannot read. -->
        <div
          class="input"
          :class="{
            'input--filled': !!reset.confirm,
            'input--mismatch': reset.confirm.length > 0 && !rules.match,
          }"
        >
          <q-icon name="lock_reset" size="18px" class="input__icon" />
          <input
            id="reset-confirm"
            v-model="reset.confirm"
            :type="showConfirmPassword ? 'text' : 'password'"
            class="input__el"
            autocomplete="new-password"
            placeholder="••••••••"
            :disabled="busy"
            :aria-invalid="reset.confirm.length > 0 && !rules.match"
            @keyup="trackCapsLock"
            @keydown="trackCapsLock"
          />
          <!-- Its own toggle, not one shared with the field above: revealing
               both at once is the whole point of a confirm field you cannot
               read. -->
          <button
            type="button"
            class="input__reveal"
            :aria-label="showConfirmPassword ? 'Hide password' : 'Show password'"
            :aria-pressed="showConfirmPassword"
            @click="showConfirmPassword = !showConfirmPassword"
          >
            <q-icon :name="showConfirmPassword ? 'visibility_off' : 'visibility'" size="18px" />
          </button>
        </div>
      </div>

      <ul class="rules" style="--d: 160ms" aria-live="polite">
        <li class="rule" :class="{ 'rule--ok': rules.long }">
          <q-icon
            :name="rules.long ? 'check_circle' : 'radio_button_unchecked'"
            size="14px"
            class="rule__mark"
          />
          At least {{ MIN_PASSWORD_LENGTH }} characters
        </li>
        <li
          class="rule"
          :class="{ 'rule--ok': rules.match, 'rule--bad': reset.confirm.length > 0 && !rules.match }"
        >
          <q-icon :name="matchIcon" size="14px" class="rule__mark" />
          {{ matchLabel }}
        </li>
      </ul>

      <transition name="hint">
        <p v-if="capsLock" class="field__hint">
          <q-icon name="keyboard_capslock" size="14px" />
          Caps Lock is on
        </p>
      </transition>

      <button
        type="submit"
        class="submit"
        style="--d: 220ms"
        :class="{ 'submit--busy': loading, 'submit--done': passwordChanged }"
        :disabled="!canSubmitPassword || busy || passwordChanged"
      >
        <span class="submit__label">
          <template v-if="passwordChanged">
            <q-icon name="check" size="18px" />
            Password updated
          </template>
          <template v-else-if="loading">
            <q-spinner size="16px" />
            Updating…
          </template>
          <template v-else>
            Update password
            <q-icon name="arrow_forward" size="16px" class="submit__arrow" />
          </template>
        </span>
      </button>
    </form>

    <footer class="card__foot" style="--d: 300ms">
      <p v-if="view === 'signin'" class="card__note">
        Admin accounts are created by your organization. Ask your administrator for an invite.
      </p>
      <button v-else type="button" class="back" :disabled="busy" @click="backToSignIn">
        <q-icon name="arrow_back" size="15px" />
        Back to sign in
      </button>
    </footer>
  </section>
</template>

<script setup>
import { computed, nextTick, onUnmounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from 'boot/auth'
import { useCompanyStore } from '@/stores/company'
import { useAuth } from '@/composables/page/useAuth'
import { useToast } from 'src/composables/useToast'
import { writeStored } from 'src/composables/utils/storage'
import { extractErrorMessage } from 'src/composables/utils/http'
import markWhite from '@/assets/wagey_mark.png'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const companyStore = useCompanyStore()
const toast = useToast()

const {
  loading,
  login,
  fetchCurrentUserCompanies,
  fetchUserProfile,
  requestPasswordReset,
  verifyResetOtp,
  resetPassword,
} = useAuth()

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

// ═══ Password reset ════════════════════════════════════════════════════════
//
// One card, four views. The reset is not a separate page: the person is already
// looking at the thing they are trying to get into, and sending them somewhere
// else to fix it loses that context. `view` is the whole state machine.
//
// Three steps rather than two because the OTP is exchanged for a short-lived
// token (`/user/verify-otp/`) and it is that token which authorises the new
// password (`/user/reset-password/`). A practical consequence: the code stops
// being held in component state the moment it is verified.
const RESET_STEPS = [
  { index: 1, label: 'Email' },
  { index: 2, label: 'Code' },
  { index: 3, label: 'Password' },
]
const STEP_OF_VIEW = { email: 1, otp: 2, password: 3 }

const MIN_PASSWORD_LENGTH = 8
const RESEND_COOLDOWN_SECONDS = 45

// Enough to catch a missing @ or a trailing comma, and nothing more: the server
// is the only thing that knows whether an address exists, and a stricter
// pattern here only ever rejects valid addresses.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** 'signin' | 'email' | 'otp' | 'password' */
const view = ref('signin')

const reset = ref({ email: '', otp: '', token: '', password: '', confirm: '' })
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const passwordChanged = ref(false)

const resendIn = ref(0)
let resendTimer = null
// The confirmation hold before the card swaps back. Tracked so unmounting
// inside that window cannot leave it to fire on a dead component — the same
// mistake `useWebSocket.reconnect()` was making.
let settleTimer = null

const emailEl = ref(null)
const otpEl = ref(null)
const newPasswordEl = ref(null)

const resetStep = computed(() => STEP_OF_VIEW[view.value] ?? 0)

const heading = computed(
  () =>
    ({
      signin: {
        title: 'Sign in',
        sub: 'Use your admin credentials to reach the Wagey console.',
      },
      email: {
        title: 'Reset your password',
        sub: 'We will email you a one-time code to confirm it is you.',
      },
      otp: {
        title: 'Enter your code',
        sub: 'Type the 6-digit code from the email we just sent.',
      },
      password: {
        title: 'Choose a new password',
        sub: 'Enter it twice so a typo cannot lock you out.',
      },
    })[view.value],
)

const emailLooksValid = computed(() => EMAIL_SHAPE.test(reset.value.email))
const otpComplete = computed(() => reset.value.otp.length === 6)

const rules = computed(() => ({
  long: reset.value.password.length >= MIN_PASSWORD_LENGTH,
  match: reset.value.password.length > 0 && reset.value.password === reset.value.confirm,
}))
const canSubmitPassword = computed(() => rules.value.long && rules.value.match)

// Three states, not two: an empty confirm field has not failed yet, and saying
// so would scold someone mid-keystroke.
const matchIcon = computed(() => {
  if (rules.value.match) return 'check_circle'
  if (reset.value.confirm.length > 0) return 'cancel'
  return 'radio_button_unchecked'
})
const matchLabel = computed(() =>
  reset.value.confirm.length > 0 && !rules.value.match
    ? 'Both entries must match'
    : 'Both entries match',
)

function clearResendTimer() {
  if (resendTimer) clearInterval(resendTimer)
  resendTimer = null
  resendIn.value = 0
}

function startResendCooldown() {
  clearResendTimer()
  resendIn.value = RESEND_COOLDOWN_SECONDS
  resendTimer = setInterval(() => {
    resendIn.value -= 1
    if (resendIn.value <= 0) clearResendTimer()
  }, 1000)
}

/** Move to a view and put the cursor in the field that view is asking about. */
async function goToView(next) {
  view.value = next
  await nextTick()
  const target = { email: emailEl, otp: otpEl, password: newPasswordEl }[next]
  target?.value?.focus()
}

function openReset() {
  // Carry nothing over from a previous attempt, but do keep the username if it
  // happens to look like an email — it usually is, and retyping it is friction
  // at the exact moment someone is already stuck.
  const guess = formData.value.username
  reset.value = {
    email: EMAIL_SHAPE.test(guess) ? guess : '',
    otp: '',
    token: '',
    password: '',
    confirm: '',
  }
  passwordChanged.value = false
  showNewPassword.value = false
  showConfirmPassword.value = false
  capsLock.value = false
  clearResendTimer()
  goToView('email')
}

function backToSignIn() {
  // Wiped rather than left in place: this object holds a reset token and two
  // plaintext passwords, and none of it has any business outliving the flow.
  reset.value = { email: '', otp: '', token: '', password: '', confirm: '' }
  passwordChanged.value = false
  showNewPassword.value = false
  showConfirmPassword.value = false
  capsLock.value = false
  clearResendTimer()
  view.value = 'signin'
}

function editEmail() {
  reset.value.otp = ''
  reset.value.token = ''
  clearResendTimer()
  goToView('email')
}

/**
 * Digits only, six at most — so a code pasted as "123 456" still lands.
 *
 * Deliberately no `maxlength="6"` on the input: the browser applies it to the
 * *raw* value before this handler runs, so pasting "123 456" would be cut to
 * "123 45" and arrive here as five digits. The cap belongs after the strip.
 */
function onOtpInput(event) {
  const digits = event.target.value.replace(/\D/g, '').slice(0, 6)
  reset.value.otp = digits
  // The input is bound with :value, so a rejected character would otherwise
  // stay on screen until the next render that happens to change the value.
  if (event.target.value !== digits) event.target.value = digits
}

const handleRequestCode = async () => {
  if (!emailLooksValid.value || busy.value) return
  try {
    await requestPasswordReset(reset.value.email)
    // The same message either way. An endpoint that says "no such account" is
    // an account-enumeration oracle, and it would be this screen that leaked
    // it, so the wording here never confirms whether the address is registered.
    toast.success('Check your email', {
      caption: `If ${reset.value.email} has an account, a code is on its way.`,
    })
    startResendCooldown()
    goToView('otp')
  } catch (error) {
    fail(extractErrorMessage(error, 'Could not send the code. Try again.'))
  }
}

const handleResend = async () => {
  if (busy.value || resendIn.value > 0) return
  try {
    await requestPasswordReset(reset.value.email)
    reset.value.otp = ''
    toast.info('A new code is on its way')
    startResendCooldown()
    await nextTick()
    otpEl.value?.focus()
  } catch (error) {
    fail(extractErrorMessage(error, 'Could not send a new code. Try again.'))
  }
}

const handleVerifyCode = async () => {
  if (!otpComplete.value || busy.value) return
  try {
    reset.value.token = await verifyResetOtp(reset.value.email, reset.value.otp)
    // The code has done its job; holding it any longer serves nothing.
    reset.value.otp = ''
    clearResendTimer()
    goToView('password')
  } catch (error) {
    fail(extractErrorMessage(error, 'That code was not accepted. Check it and try again.'))
  }
}

const handleResetPassword = async () => {
  if (!canSubmitPassword.value || busy.value || passwordChanged.value) return
  if (!reset.value.token) {
    // Only reachable if the token was lost between steps; without this the
    // request would fail server-side with a message about a field the person
    // never saw.
    fail('Your reset session expired. Ask for a new code.')
    editEmail()
    return
  }
  try {
    await resetPassword(reset.value.token, reset.value.password)
    passwordChanged.value = true
    toast.success('Password updated', { caption: 'Sign in with your new password.' })
    // Let the button land on its confirmed state before the card swaps back,
    // the way the sign-in button does.
    clearTimeout(settleTimer)
    settleTimer = setTimeout(backToSignIn, 900)
  } catch (error) {
    fail(extractErrorMessage(error, 'Could not update your password. Try again.'))
  }
}

onUnmounted(() => {
  clearResendTimer()
  clearTimeout(settleTimer)
})

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

    // Both halves of the pair go into the auth store, which persists them. The
    // refresh token used to be written straight to localStorage from here and
    // then read by nobody: the access token simply expired mid-session and every
    // request failed. `boot/axios.js` now spends it, and it is credential
    // material, so it belongs behind the store like the access token rather than
    // in a loose key. A null-ish value is fine — the login response does not
    // always carry one, and `persist()` removes the key rather than storing the
    // *string* "undefined", the bad value that used to break the store's own
    // rehydration.
    authStore.setToken(access)
    authStore.setRefreshToken(refresh)

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
        writeStored('business_owner_uuid', profileData.profile.id)
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

    writeStored('account_uuid', accountUuid)
    writeStored('user_id', userId)
    // Read back by `resolvedCompanyId()`, so a stringified `undefined` here would
    // reach request URLs as a company id.
    writeStored('company_id', companyId)
    writeStored('username', formData.value.username)

    const displayName =
      firstCompany.user?.full_name ||
      `${firstCompany.user?.first_name || ''} ${firstCompany.user?.last_name || ''}`.trim() ||
      firstCompany.user?.username ||
      formData.value.username
    writeStored('cached_username', displayName)

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
</script>

<style lang="scss" scoped>
// ── Card ────────────────────────────────────────────────────────────────────
.card {
  // Status tints for the reset flow. The app's own --dash-good-mark (#17b26a)
  // and --dash-critical-mark (#f04438) are tuned for white surfaces and go
  // muddy on this navy, so these are the same hues re-levelled for a dark
  // ground — the same adjustment --nav-accent makes for the navigation rail.
  --lg-ok: #5fdca0;
  --lg-bad: #ff9f97;

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

  // Edge/Chromium draw their own reveal control inside a password field the
  // moment it has characters, and Safari adds an auto-fill key — either one
  // lands next to `.input__reveal` and the field shows two eyes while typing.
  // The field already owns a reveal button, so the built-in ones are removed.
  &::-ms-reveal,
  &::-ms-clear {
    display: none;
  }

  // Not `-webkit-textfield-decoration-container` — that shadow node wraps the
  // editing area itself, and hiding it blanks the field in Safari.
  &::-webkit-credentials-auto-fill-button,
  &::-webkit-strong-password-auto-fill-button {
    visibility: hidden;
    pointer-events: none;
    width: 0;
    margin: 0;
  }

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

// Used as both an <a> and a <button> — the reset flow's links are buttons,
// because they change what the card shows rather than navigating anywhere.
.link {
  padding: 0;
  border: 0;
  background: none;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(150, 178, 255, 0.92);
  text-decoration: none;
  cursor: pointer;
  transition: color var(--lg-fast) var(--lg-ease);

  &:hover:not(:disabled) {
    color: #ffffff;
  }

  &:focus-visible {
    outline: 2px solid rgba(120, 150, 255, 0.75);
    outline-offset: 3px;
    border-radius: 3px;
  }

  &:disabled {
    color: var(--lg-ink-4);
    cursor: default;
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

// ── Back out of the reset flow ──────────────────────────────────────────────
.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: none;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--lg-ink-3);
  cursor: pointer;
  transition: color var(--lg-fast) var(--lg-ease);

  &:hover:not(:disabled) {
    color: var(--lg-ink);
  }

  &:focus-visible {
    outline: 2px solid rgba(120, 150, 255, 0.75);
    outline-offset: 3px;
    border-radius: 3px;
  }

  &:disabled {
    color: var(--lg-ink-4);
    cursor: default;
  }
}

// ── Step rail ───────────────────────────────────────────────────────────────
// A real sequence, so it is numbered. Quiet by construction: the marks carry
// the state and the labels stay at label weight, because this is orientation,
// not the thing being read.
.steps {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 20px;
  padding: 0;
  list-style: none;
  animation: riseIn 0.55s var(--lg-ease) both;
}

.step {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 11px;

  // Hairline connector, drawn after every step but the last.
  &:not(:last-child)::after {
    content: '';
    flex: 1;
    min-width: 10px;
    height: 1px;
    margin-left: 2px;
    background: var(--lg-line-strong);
  }
}

.step__mark {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid var(--lg-line-strong);
  background: transparent;
  color: var(--lg-ink-4);
  font-size: 10.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  transition:
    color var(--lg-fast) var(--lg-ease),
    border-color var(--lg-fast) var(--lg-ease),
    background var(--lg-fast) var(--lg-ease);
}

.step__label {
  color: var(--lg-ink-4);
  white-space: nowrap;
  transition: color var(--lg-fast) var(--lg-ease);
}

// A soft tint, not a saturated fill — three of these sit in one short row.
.step--now {
  .step__mark {
    border-color: rgba(120, 150, 255, 0.8);
    background: rgba(88, 120, 255, 0.16);
    color: #ffffff;
  }

  .step__label {
    color: var(--lg-ink);
    font-weight: 500;
  }
}

.step--done {
  .step__mark {
    border-color: rgba(95, 220, 160, 0.5);
    background: rgba(95, 220, 160, 0.14);
    color: var(--lg-ok);
  }

  .step__label {
    color: var(--lg-ink-3);
  }
}

// ── "Sent to …" line ───────────────────────────────────────────────────────
.sentto {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid var(--lg-line);
  background: rgba(255, 255, 255, 0.03);
  font-size: 12.5px;
  color: var(--lg-ink-2);
  animation: riseIn 0.55s var(--lg-ease) var(--d, 0ms) both;

  .q-icon {
    flex-shrink: 0;
    color: var(--lg-ok);
  }
}

// The address is the long part, so it is the part that truncates — the icon and
// the Change control must stay reachable.
.sentto__text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  strong {
    font-weight: 600;
    color: var(--lg-ink);
  }
}

// ── One-time code ───────────────────────────────────────────────────────────
.input__el--code {
  font-size: 16px;
  font-weight: 600;
  // Tabular figures so the six digits hold a fixed rhythm as they are typed,
  // and wide tracking so a code can be read back over the phone.
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.34em;

  &::placeholder {
    letter-spacing: 0.34em;
    font-weight: 500;
  }
}

.resend {
  margin: 0;
  font-size: 11.5px;
  color: var(--lg-ink-4);
  animation: riseIn 0.55s var(--lg-ease) var(--d, 0ms) both;
}

// ── Mismatched confirmation ─────────────────────────────────────────────────
// Tinted, not outlined: it is a state the person is mid-way through fixing,
// not an error they have committed.
.input--mismatch {
  border-color: rgba(255, 159, 151, 0.55);
  background: rgba(255, 159, 151, 0.07);

  .input__icon {
    color: var(--lg-bad);
  }

  &:focus-within {
    border-color: rgba(255, 159, 151, 0.8);
    box-shadow: 0 0 0 4px rgba(255, 159, 151, 0.14);
  }
}

// ── Password checklist ──────────────────────────────────────────────────────
.rules {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: -2px 0 0;
  padding: 0;
  list-style: none;
  animation: riseIn 0.55s var(--lg-ease) var(--d, 0ms) both;
}

.rule {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  color: var(--lg-ink-4);
  transition: color var(--lg-fast) var(--lg-ease);
}

.rule__mark {
  flex-shrink: 0;
  color: var(--lg-ink-4);
  transition: color var(--lg-fast) var(--lg-ease);
}

.rule--ok {
  color: var(--lg-ink-2);

  .rule__mark {
    color: var(--lg-ok);
  }
}

.rule--bad {
  color: var(--lg-bad);

  .rule__mark {
    color: var(--lg-bad);
  }
}

// A hint that is guidance rather than a warning, so it does not borrow the
// amber that `.field__hint` uses for Caps Lock.
.field__hint--quiet {
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
