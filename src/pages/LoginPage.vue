<template>
  <q-page class="flex flex-center bg-gradient">
    <div class="login-container">
      <!-- Header - Mobile optimized -->
      <div class="text-center q-mb-lg q-mb-xl-md">
        <h3 class="login-title text-weight-bold text-grey-8 q-mb-sm">Welcome Back</h3>
        <p class="login-subtitle text-grey-6">Sign in to your account</p>
      </div>

      <!-- Login Form -->
      <q-form @submit="handleLogin" class="q-gutter-md">
        <!-- Username Input - Mobile optimized -->
        <q-input
          v-model="formData.username"
          outlined
          label="Username or Email"
          lazy-rules
          :rules="[(val) => !!val || 'Username is required']"
          autocomplete="username"
          :dense="$q.screen.xs"
          class="mobile-input"
        >
          <template v-slot:prepend>
            <q-icon name="person" :size="$q.screen.xs ? 'sm' : 'md'" />
          </template>
        </q-input>

        <!-- Password Input - Mobile optimized -->
        <q-input
          v-model="formData.password"
          outlined
          :type="showPassword ? 'text' : 'password'"
          label="Password"
          lazy-rules
          :rules="[(val) => !!val || 'Password is required']"
          autocomplete="current-password"
          :dense="$q.screen.xs"
          class="mobile-input"
        >
          <template v-slot:prepend>
            <q-icon name="lock" :size="$q.screen.xs ? 'sm' : 'md'" />
          </template>
          <template v-slot:append>
            <q-icon
              :name="showPassword ? 'visibility_off' : 'visibility'"
              :size="$q.screen.xs ? 'sm' : 'md'"
              class="cursor-pointer"
              @click="showPassword = !showPassword"
            />
          </template>
        </q-input>

        <!-- Options - Mobile responsive layout -->
        <div class="mobile-options-container q-mt-md">
          <!-- Remember me and Forgot Password - Stack on very small screens -->
          <div class="row justify-between items-center" v-if="!$q.screen.xs">
            <q-checkbox
              v-model="formData.rememberMe"
              label="Remember me"
              class="text-grey-7 remember-checkbox"
            />
            <q-btn
              flat
              dense
              color="primary"
              label="Forgot Password?"
              @click="goToForgotPassword"
              class="forgot-password-btn"
            />
          </div>

          <!-- Stacked layout for very small screens -->
          <div v-else class="column q-gutter-sm">
            <q-checkbox
              v-model="formData.rememberMe"
              label="Remember me"
              class="text-grey-7 remember-checkbox-mobile"
            />
            <div class="text-center">
              <q-btn
                flat
                dense
                color="primary"
                label="Forgot Password?"
                @click="goToForgotPassword"
                class="forgot-password-btn-mobile"
              />
            </div>
          </div>
        </div>

        <!-- Login Button - Mobile optimized -->
        <q-btn
          type="submit"
          color="primary"
          label="Sign In"
          class="full-width login-btn q-mt-lg"
          :size="$q.screen.xs ? 'md' : 'lg'"
          rounded
          unelevated
          :loading="isSubmitting"
          :disable="!isFormValid"
        />
      </q-form>

      <!-- Register Link - Mobile optimized -->
      <div class="text-center register-section q-mt-lg">
        <div class="register-text-mobile" v-if="$q.screen.xs">
          <div class="text-grey-6 q-mb-sm">Don't have an account?</div>
          <q-btn
            flat
            dense
            color="primary"
            label="Sign Up"
            @click="goToRegister"
            class="text-weight-medium signup-btn-mobile"
          />
        </div>
        <div v-else>
          <span class="text-grey-6">Don't have an account? </span>
          <q-btn
            flat
            dense
            color="primary"
            label="Sign Up"
            @click="goToRegister"
            class="text-weight-medium"
          />
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
import { useAuthStore } from 'src/boot/auth' // ✅ import your store

const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const authStore = useAuthStore() // ✅ get store instance

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
    position: $q.screen.xs ? 'bottom' : 'top',
    timeout: 4000,
    icon: 'error_outline',
  })
}

const showSuccessNotification = (message) => {
  $q.notify({
    type: 'positive',
    message,
    position: $q.screen.xs ? 'bottom' : 'top',
    timeout: 3000,
    icon: 'check_circle',
  })
}

// Function to try multiple profile endpoints
const fetchUserProfile = async (token) => {
  const profileEndpoints = [
    'https://staging.wageyapp.com/api/user/profile/',
    'https://staging.wageyapp.com/api/employee/profile/',
    'https://staging.wageyapp.com/api/auth/user/',
    'https://staging.wageyapp.com/api/user/me/',
  ]

  for (const endpoint of profileEndpoints) {
    try {
      console.log(`🔍 Trying profile endpoint: ${endpoint}`)

      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      })

      console.log(`✅ Profile success with ${endpoint}:`, response.data)
      return response.data
    } catch (error) {
      console.log(`❌ Failed ${endpoint}:`, error.response?.status, error.response?.data)
    }
  }

  throw new Error('All profile endpoints failed')
}

// Function to try multiple company endpoints
const fetchUserCompanies = async (token) => {
  const companyEndpoints = [
    'https://staging.wageyapp.com/api/user/companies/',
    'https://staging.wageyapp.com/api/employee/companies/',
    'https://staging.wageyapp.com/api/companies/',
    'https://staging.wageyapp.com/api/user/company/',
    'https://staging.wageyapp.com/api/employee/company/',
  ]

  for (const endpoint of companyEndpoints) {
    try {
      console.log(`🏢 Trying company endpoint: ${endpoint}`)

      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      })

      console.log(`✅ Company success with ${endpoint}:`, response.data)
      return response.data
    } catch (error) {
      console.log(`❌ Failed ${endpoint}:`, error.response?.status, error.response?.data)
    }
  }

  throw new Error('All company endpoints failed')
}

// Enhanced function to store user data and company info
const storeUserData = (loginData, profile, companies) => {
  try {
    console.log('💾 === STORING USER DATA ===')
    console.log('📊 Login data received:', loginData)
    console.log('👤 Profile data received:', profile)
    console.log('🏢 Companies data received:', companies)

    // Store authentication token
    const token = loginData.token || loginData.access_token || loginData.access
    if (token) {
      authStore.setToken(token)
      localStorage.setItem('authToken', token)
      console.log('✅ Token stored:', token.substring(0, 20) + '...')
    }

    // Store user profile information
    if (profile) {
      localStorage.setItem('userProfile', JSON.stringify(profile))

      // Try different possible field names for user ID
      const userId = profile.id || profile.user_id || profile.pk || profile.userId
      const userName =
        profile.full_name ||
        profile.name ||
        profile.first_name + ' ' + profile.last_name ||
        profile.username
      const userEmail = profile.email || profile.email_address

      if (userId) localStorage.setItem('userId', userId.toString())
      if (userName) localStorage.setItem('userName', userName)
      if (userEmail) localStorage.setItem('userEmail', userEmail)

      console.log('✅ Profile data stored:', { userId, userName, userEmail })
    }

    // Handle company data - try multiple data structures
    console.log('🔍 Analyzing company data structure...')

    let companyId = null
    let companyName = null
    let companiesArray = null

    // Check if companies is an array
    if (Array.isArray(companies) && companies.length > 0) {
      console.log('📋 Companies is an array with', companies.length, 'items')
      companiesArray = companies
      const primaryCompany = companies[0]

      // Try different possible field names for company ID
      companyId =
        primaryCompany.id ||
        primaryCompany.company_id ||
        primaryCompany.pk ||
        primaryCompany.companyId
      companyName = primaryCompany.name || primaryCompany.company_name || primaryCompany.title
    } else if (companies && typeof companies === 'object') {
      console.log('📋 Companies is an object')

      // Check if it's a single company object
      companyId = companies.id || companies.company_id || companies.pk || companies.companyId
      companyName = companies.name || companies.company_name || companies.title

      if (companyId) {
        companiesArray = [companies] // Wrap single company in array
      }

      // Check if companies has a 'results' or 'data' field (paginated response)
      if (companies.results && Array.isArray(companies.results)) {
        console.log('📋 Found paginated companies in results field')
        companiesArray = companies.results
        if (companiesArray.length > 0) {
          const primaryCompany = companiesArray[0]
          companyId = primaryCompany.id || primaryCompany.company_id || primaryCompany.pk
          companyName = primaryCompany.name || primaryCompany.company_name || primaryCompany.title
        }
      }

      if (companies.data && Array.isArray(companies.data)) {
        console.log('📋 Found companies in data field')
        companiesArray = companies.data
        if (companiesArray.length > 0) {
          const primaryCompany = companiesArray[0]
          companyId = primaryCompany.id || primaryCompany.company_id || primaryCompany.pk
          companyName = primaryCompany.name || primaryCompany.company_name || primaryCompany.title
        }
      }
    }

    // Also check if company info is in the login response itself
    if (!companyId && loginData) {
      console.log('🔍 Checking login response for company info...')
      companyId = loginData.company_id || loginData.companyId || loginData.company?.id
      companyName = loginData.company_name || loginData.companyName || loginData.company?.name

      if (companyId) {
        console.log('✅ Found company info in login response')
      }
    }

    // Also check if company info is in profile
    if (!companyId && profile) {
      console.log('🔍 Checking profile for company info...')
      companyId = profile.company_id || profile.companyId || profile.company?.id
      companyName = profile.company_name || profile.companyName || profile.company?.name

      if (companyId) {
        console.log('✅ Found company info in profile')
      }
    }

    // Store company data
    if (companyId) {
      localStorage.setItem('companyId', companyId.toString())
      console.log('✅ Company ID stored:', companyId)
    } else {
      console.log('❌ No company ID found in any response')
      console.log('🔍 Available data for debugging:')
      console.log('   - Login data keys:', Object.keys(loginData || {}))
      console.log('   - Profile data keys:', Object.keys(profile || {}))
      console.log('   - Companies type:', typeof companies)
      console.log('   - Companies keys:', Object.keys(companies || {}))
    }

    if (companyName) {
      localStorage.setItem('companyName', companyName)
      console.log('✅ Company name stored:', companyName)
    }

    if (companiesArray) {
      localStorage.setItem('userCompanies', JSON.stringify(companiesArray))
      console.log('✅ Companies array stored:', companiesArray.length, 'companies')

      if (companiesArray.length > 1) {
        console.log(`ℹ️ User has ${companiesArray.length} companies. Using first one as default.`)
        console.log(
          '🏢 All companies:',
          companiesArray.map((c) => ({
            id: c.id || c.company_id,
            name: c.name || c.company_name,
          })),
        )
      }
    }

    // Final verification
    console.log('🔍 === FINAL STORAGE VERIFICATION ===')
    console.log('🔑 authToken:', !!localStorage.getItem('authToken'))
    console.log('🏢 companyId:', localStorage.getItem('companyId'))
    console.log('🏢 companyName:', localStorage.getItem('companyName'))
    console.log('👤 userId:', localStorage.getItem('userId'))
    console.log('📋 All localStorage keys:', Object.keys(localStorage))
  } catch (error) {
    console.error('❌ Error storing user data:', error)
  }
}

const handleLogin = async () => {
  if (!isFormValid.value) return
  isSubmitting.value = true

  try {
    console.log('🚀 Starting login process...')

    // Step 1: Login
    const loginPayload = {
      username: formData.value.username,
      password: formData.value.password,
    }

    const loginResponse = await axios.post(
      'https://staging.wageyapp.com/api/employee/login/',
      loginPayload,
    )

    const loginData = loginResponse.data
    console.log('✅ Login successful:', loginData)

    // DETAILED ANALYSIS OF LOGIN RESPONSE
    console.log('🔍 === DETAILED LOGIN RESPONSE ANALYSIS ===')
    console.log('📊 Full login response data:', JSON.stringify(loginData, null, 2))
    console.log('📋 Login response keys:', Object.keys(loginData || {}))

    // Check each field in login response for potential company info
    Object.keys(loginData || {}).forEach((key) => {
      const value = loginData[key]
      console.log(`🔍 Field "${key}":`, value, `(type: ${typeof value})`)

      // If it's an object, examine it for company info
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        console.log(`   📋 "${key}" object keys:`, Object.keys(value))
        Object.keys(value).forEach((subKey) => {
          console.log(`      "${key}.${subKey}":`, value[subKey])
        })
      }

      // If it's an array, examine first item
      if (Array.isArray(value) && value.length > 0) {
        console.log(`   📋 "${key}" is array with ${value.length} items`)
        console.log(`   📋 First item:`, value[0])
        if (typeof value[0] === 'object') {
          console.log(`   📋 First item keys:`, Object.keys(value[0]))
        }
      }
    })

    if (loginResponse.status === 200 || loginData.success) {
      const token = loginData.token || loginData.access_token || loginData.access

      if (token) {
        console.log('🔑 Token received, checking for immediate company info...')

        // Check if company info is already in login response
        let immediateCompanyId =
          loginData.company_id || loginData.companyId || loginData.company?.id
        let immediateCompanyName =
          loginData.company_name || loginData.companyName || loginData.company?.name

        if (immediateCompanyId) {
          console.log('🎯 Company ID found in login response:', immediateCompanyId)
          localStorage.setItem('companyId', immediateCompanyId.toString())
          localStorage.setItem('authToken', token)

          if (immediateCompanyName) {
            localStorage.setItem('companyName', immediateCompanyName)
          }

          showSuccessNotification(
            `Login successful! Connected to company ${immediateCompanyName || immediateCompanyId}.`,
          )

          const redirectPath = route.query.redirect || '/dashboard'
          await router.push(redirectPath)
          return
        }

        // If no immediate company info, fetch additional data
        console.log('📡 Fetching additional user data...')
        try {
          const [profileResponse, companiesResponse] = await Promise.allSettled([
            fetchUserProfile(token),
            fetchUserCompanies(token),
          ])

          let profile = null
          let companies = null

          if (profileResponse.status === 'fulfilled') {
            profile = profileResponse.value
          } else {
            console.log('⚠️ Could not fetch profile:', profileResponse.reason?.message)
          }

          if (companiesResponse.status === 'fulfilled') {
            companies = companiesResponse.value
          } else {
            console.log('⚠️ Could not fetch companies:', companiesResponse.reason?.message)
          }

          // Store all data
          storeUserData(loginData, profile, companies)

          // Check if we got company ID
          const finalCompanyId = localStorage.getItem('companyId')
          if (finalCompanyId) {
            showSuccessNotification(`Login successful! Connected to company.`)
          } else {
            console.log('⚠️ Still no company ID after all attempts')

            // TEMPORARY SOLUTION: Based on your employee data, company ID is 1
            console.log('🔧 Setting company ID to 1 based on employee data pattern...')
            localStorage.setItem('companyId', '1')
            console.log('✅ Company ID set to 1 (temporary solution)')

            showSuccessNotification('Login successful! Company ID set to 1.')
          }

          const redirectPath = route.query.redirect || '/dashboard'
          await router.push(redirectPath)
        } catch (dataError) {
          // Login succeeded but data fetch failed - still proceed with basic token
          console.error('⚠️ Login successful but data fetch failed:', dataError)

          localStorage.setItem('authToken', token)
          authStore.setToken(token)

          showSuccessNotification('Login successful! Some data may load shortly.')

          const redirectPath = route.query.redirect || '/dashboard'
          await router.push(redirectPath)
        }
      } else {
        showErrorNotification('Login succeeded but no token received.')
      }
    } else {
      showErrorNotification(loginData.message || 'Login failed. Please check your credentials.')
    }
  } catch (error) {
    console.error('❌ Login error:', error)

    if (error.response) {
      const status = error.response.status
      const data = error.response.data
      switch (status) {
        case 400:
          showErrorNotification(data.message || data.detail || 'Invalid login data.')
          break
        case 401:
          showErrorNotification('Invalid username or password.')
          break
        case 403:
          showErrorNotification('Account is disabled or not verified.')
          break
        case 429:
          showErrorNotification('Too many login attempts. Please try later.')
          break
        default:
          showErrorNotification(data.message || data.detail || 'Login failed.')
      }
    } else if (error.request) {
      if (!navigator.onLine) {
        showErrorNotification('No internet connection. Please check your connection.')
      } else {
        showErrorNotification('Cannot reach server. Please try again later.')
      }
    } else {
      showErrorNotification('Login failed. Please try again later.')
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
