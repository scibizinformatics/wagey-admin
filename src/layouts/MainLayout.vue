<template>
  <q-layout view="LHh Lpr lFf">
    <!-- ═══ Header ═══════════════════════════════════════════════════════════ -->
    <q-header class="app-header">
      <div class="app-header__inner">
        <q-btn
          flat
          dense
          round
          icon="menu"
          class="app-header__menu lt-md"
          aria-label="Open navigation"
          @click="leftDrawerOpen = !leftDrawerOpen"
        />

        <!-- Workspace switcher. Each company the user belongs to is a tab; the
             active one is the scope every API call on the page is made against. -->
        <div ref="tabsWrapperRef" class="workspaces" role="tablist" aria-label="Companies">
          <button
            v-for="company in companyOptions"
            :key="company.siteId"
            type="button"
            role="tab"
            class="workspace"
            :class="{ 'workspace--active': selectedCompany === company.siteId }"
            :aria-selected="selectedCompany === company.siteId"
            @click="onCompanyChange(company.siteId)"
          >
            <img
              v-if="company.logo"
              :src="company.logo"
              class="workspace__logo"
              alt=""
              @error="company.logo = null"
            />
            <span v-else class="workspace__logo workspace__logo--fallback">
              <q-icon name="business" size="13px" />
            </span>
            <span class="workspace__name">{{ company.siteName }}</span>
          </button>

          <div v-if="loadingCompanies" class="workspace workspace--loading">
            <q-spinner size="14px" />
            <span class="workspace__name">Loading…</span>
          </div>

          <div v-if="showOverflowHint" class="workspaces__fade" />
        </div>

        <!-- ── Right cluster ── -->
        <div class="app-header__right">
          <q-btn flat round dense class="icon-btn" aria-label="Notifications">
            <q-icon name="notifications" size="20px" />
            <span v-if="unreadCount > 0" class="icon-btn__badge">
              {{ unreadCount > 9 ? '9+' : unreadCount }}
            </span>
            <q-tooltip>Notifications</q-tooltip>

            <q-menu
              v-model="notifModal"
              anchor="bottom right"
              self="top right"
              :offset="[0, 10]"
              class="notif-menu"
              transition-show="jump-down"
              transition-hide="jump-up"
            >
              <div class="notif">
                <header class="notif__head">
                  <div class="notif__head-left">
                    <h2 class="notif__title">Notifications</h2>
                    <span v-if="unreadCount > 0" class="dash-chip dash-chip--info">
                      {{ unreadCount }} unread
                    </span>
                  </div>
                  <div class="notif__head-actions">
                    <q-btn
                      v-if="unreadCount > 0"
                      flat
                      dense
                      no-caps
                      size="12px"
                      label="Mark all read"
                      class="notif__link"
                      :loading="isMarkingAsRead"
                      @click="handleMarkAllRead"
                    />
                    <q-btn
                      flat
                      round
                      dense
                      icon="refresh"
                      size="11px"
                      class="notif__icon-btn"
                      :loading="isInitialLoad"
                      @click="requestRefresh"
                    >
                      <q-tooltip>Refresh</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="close"
                      size="11px"
                      class="notif__icon-btn"
                      aria-label="Close"
                      @click="notifModal = false"
                    />
                  </div>
                </header>

                <q-scroll-area class="notif__scroll">
                  <ul v-if="sortedNotifications.length" class="notif__list">
                    <li
                      v-for="notif in sortedNotifications"
                      :key="notif.id"
                      class="notif__item"
                      :class="{ 'notif__item--unread': !notif.read }"
                      @click="handleMarkAsRead(notif)"
                    >
                      <span class="notif__avatar" :style="{ background: notifTint(notif) }">
                        <q-icon :name="notif.icon" size="17px" />
                      </span>

                      <div class="notif__body">
                        <p class="notif__item-title">{{ notif.title }}</p>
                        <p class="notif__item-text">{{ notif.message }}</p>
                        <p class="notif__item-time">
                          <q-icon name="schedule" size="12px" />
                          {{ formatTimeAgo(notif.timestamp) }}
                        </p>
                      </div>

                      <div class="notif__aside">
                        <span
                          v-if="notif.priority === 'high'"
                          class="dash-chip dash-chip--critical notif__urgent"
                        >
                          Urgent
                        </span>
                        <span v-if="!notif.read" class="notif__dot" aria-label="Unread" />
                      </div>
                    </li>
                  </ul>

                  <div v-else class="dash-empty notif__empty">
                    <span class="dash-featured-icon">
                      <q-icon name="notifications_none" size="20px" />
                    </span>
                    <p class="dash-empty__title">
                      {{ isConnected ? "You're all caught up" : 'Reconnecting…' }}
                    </p>
                    <p class="dash-empty__sub">
                      {{
                        isConnected
                          ? 'New notifications will appear here as they arrive.'
                          : 'Waiting for the connection to come back.'
                      }}
                    </p>
                  </div>
                </q-scroll-area>

                <footer v-if="!isConnected && !isConnecting" class="notif__foot">
                  <q-btn
                    flat
                    dense
                    no-caps
                    size="12px"
                    icon="wifi"
                    label="Reconnect"
                    class="notif__link"
                    @click="reconnect"
                  />
                </footer>
              </div>
            </q-menu>
          </q-btn>

          <span class="app-header__rule" />

          <div class="user">
            <q-avatar v-if="currentUserPicture" size="30px" class="user__avatar">
              <img :src="currentUserPicture" alt="" @error="handleImageError" />
            </q-avatar>
            <q-avatar v-else size="30px" class="user__avatar" :style="{ background: avatarColor }">
              <span class="user__initials">{{ avatarInitials }}</span>
            </q-avatar>
            <span class="user__name">{{ currentUsername }}</span>
            <q-tooltip>{{ currentUsername }}</q-tooltip>
          </div>
        </div>
      </div>
    </q-header>

    <!-- ═══ Navigation rail ══════════════════════════════════════════════════ -->
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      side="left"
      class="app-nav"
      :width="drawerWidth"
      :mini="isCollapsed"
      :mini-width="72"
      :breakpoint="0"
    >
      <div class="app-nav__brand" :class="{ 'app-nav__brand--mini': isCollapsed }">
        <div class="app-nav__logo">
          <img :src="logo" alt="Wagey" />
        </div>
        <span v-if="!isCollapsed" class="app-nav__wordmark">Wagey</span>

        <!-- Tablet and below only: on desktop the rail is always full width, so
             the control is absent rather than present-but-disabled — a disabled
             affordance still asks to be understood.

             It lives in the rail's own header. It used to be a floating
             half-circle SVG pinned to the drawer's outer edge, whose position
             had to be re-derived in CSS at every breakpoint. -->
        <q-btn
          v-if="canCollapse"
          flat
          dense
          round
          size="11px"
          class="app-nav__collapse"
          :icon="isCollapsed ? 'chevron_right' : 'chevron_left'"
          :aria-label="isCollapsed ? 'Expand navigation' : 'Collapse navigation'"
          @click="toggleMini"
        >
          <q-tooltip anchor="center right" self="center left" :offset="[10, 0]" class="nav-tooltip">
            {{ isCollapsed ? 'Expand' : 'Collapse' }}
          </q-tooltip>
        </q-btn>
      </div>

      <nav class="app-nav__body" :class="{ 'app-nav__body--mini': isCollapsed }" aria-label="Main">
        <div v-for="group in navGroups" :key="group.label" class="nav-group">
          <!-- Collapsed, the group labels go and the groups are separated by
               space alone — dividers would cut the rail into boxes. -->
          <p v-if="!isCollapsed" class="nav-group__label">{{ group.label }}</p>

          <ul class="nav-list">
            <li v-for="link in group.items" :key="link.label">
              <router-link
                :to="link.to"
                class="nav-item"
                :class="{ 'nav-item--active': isActive(link), 'nav-item--mini': isCollapsed }"
                :aria-current="isActive(link) ? 'page' : undefined"
              >
                <q-icon :name="navIcon(link)" size="19px" class="nav-item__icon" />
                <span v-if="!isCollapsed" class="nav-item__label">{{ link.label }}</span>
                <q-tooltip
                  v-if="isCollapsed"
                  anchor="center right"
                  self="center left"
                  :offset="[12, 0]"
                  class="nav-tooltip"
                >
                  {{ link.label }}
                </q-tooltip>
              </router-link>
            </li>
          </ul>
        </div>
      </nav>

      <div class="app-nav__foot" :class="{ 'app-nav__foot--mini': isCollapsed }">
        <button
          type="button"
          class="nav-item nav-item--button"
          :class="{ 'nav-item--mini': isCollapsed }"
          @click="logout"
        >
          <q-icon name="o_logout" size="19px" class="nav-item__icon" />
          <span v-if="!isCollapsed" class="nav-item__label">Sign out</span>
          <q-tooltip
            v-if="isCollapsed"
            anchor="center right"
            self="center left"
            :offset="[12, 0]"
            class="nav-tooltip"
          >
            Sign out
          </q-tooltip>
        </button>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'

// ─── Composables ──────────────────────────────────────────────────────────────
import { useOrganization } from '@/composables/page/useOrganization'
import { useNotifications } from '@/composables/useNotifications'
import { useCompanyStore } from '@/stores/company'
import { api } from 'src/boot/axios'

// The mark trimmed to the glyph. The untrimmed `wagey_icon(White).png` carries
// ~69% transparent padding, so a 34px box of it drew an 11px logo.
import wageyLogo from 'src/assets/wagey_mark.png'

const $q = useQuasar()
const router = useRouter()
const route = useRoute()

// ─── Static assets ────────────────────────────────────────────────────────────
const logo = wageyLogo

// ─── Nav links (grouped) ───────────────────────────────────────────────────────
const navGroups = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', icon: 'dashboard', to: '/app' }],
  },
  {
    label: 'Workforce',
    items: [
      { label: 'Employees', icon: 'groups', to: '/app/employees' },
      { label: 'Attendance', icon: 'event_available', to: '/app/attendance' },
      { label: 'Schedule', icon: 'calendar_month', to: '/app/schedule' },
    ],
  },
  {
    label: 'Payroll',
    items: [
      { label: 'Disbursement', icon: 'paid', to: '/app/payroll' },
      { label: 'Deductions', icon: 'money_off', to: '/app/deductions' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { label: 'Requests', icon: 'mark_email_unread', to: '/app/requests' },
      { label: 'Invite', icon: 'email', to: '/app/employees/invite' },
      { label: 'Announcement', icon: 'announcement', to: '/app/announcements' },
    ],
  },
  {
    label: 'Administration',
    items: [{ label: 'Admin Settings', icon: 'settings', to: '/app/admin-settings' }],
  },
]

// ─── Nav item state ───────────────────────────────────────────────────────────
function isActive(link) {
  return route.path === link.to
}

/**
 * Outlined glyph for an inactive item, filled for the active one.
 *
 * The `o_` prefix resolves to the material-icons-outlined webfont, registered in
 * quasar.config.js `extras`. This is what lets the rail mark selection by the
 * weight of the icon itself instead of by a highlight block behind it — which
 * matters most when the rail is collapsed and the glyph is all there is.
 */
function navIcon(link) {
  return isActive(link) ? link.icon : `o_${link.icon}`
}

// ─── UI state ─────────────────────────────────────────────────────────────────
const leftDrawerOpen = ref(true)
const miniPref = ref(false)
const notifModal = ref(false)

const tabsWrapperRef = ref(null)
const showOverflowHint = ref(false)

// ─── Company state ────────────────────────────────────────────────────────────
const selectedCompany = ref(null)
const companyOptions = ref([])
const loadingCompanies = ref(false)

// ─── User state ───────────────────────────────────────────────────────────────
const currentUsername = ref('')
const currentUserPicture = ref('')

// ─── Notifications (WebSocket-powered) ───────────────────────────────────────
const {
  sortedNotifications,
  unreadCount,
  isInitialLoad,
  isMarkingAsRead,
  isConnected,
  isConnecting,
  markAsRead,
  markAllAsRead,
  requestRefresh,
  reconnect,
  cleanup: cleanupNotifications,
  formatTimeAgo,
} = useNotifications()

// ─── Computed ─────────────────────────────────────────────────────────────────
const avatarInitials = computed(() => {
  const name = currentUsername.value
  if (!name) return '?'
  if (name.includes('@')) return name.slice(0, 2).toUpperCase()
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
})

// Avatars draw from the design system's categorical ramp rather than a private
// list of pastels, so identity colour is consistent with the rest of the app.
const AVATAR_COLORS = [
  'var(--dash-cat-1)',
  'var(--dash-cat-2)',
  'var(--dash-cat-3)',
  'var(--dash-cat-4)',
  'var(--dash-cat-5)',
  'var(--dash-cat-6)',
]

const avatarColor = computed(() => {
  const name = currentUsername.value || '?'
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
})

// Notification avatars: the composable supplies a Quasar colour name, which is
// no longer part of this design system. Map the few it emits onto status tints
// and fall back to neutral for anything unrecognised.
const NOTIF_TINTS = {
  red: 'var(--dash-critical-mark)',
  negative: 'var(--dash-critical-mark)',
  orange: 'var(--dash-warn-mark)',
  amber: 'var(--dash-warn-mark)',
  warning: 'var(--dash-warn-mark)',
  green: 'var(--dash-good-mark)',
  positive: 'var(--dash-good-mark)',
  blue: 'var(--dash-info-mark)',
  primary: 'var(--dash-info-mark)',
  info: 'var(--dash-info-mark)',
  purple: 'var(--dash-cat-4)',
}

function notifTint(notif) {
  const key = String(notif.iconColor || '').split('-')[0]
  return NOTIF_TINTS[key] ?? 'var(--dash-neutral-mark)'
}

// Breakpoints: <768 mobile (overlay), 768-1023 tablet, 1024-1439 desktop, >=1440 large desktop
const drawerWidth = computed(() => {
  const w = $q.screen.width
  if (w < 768) return 272
  if (w < 1024) return 240
  if (w < 1440) return 264
  return 284
})

// ─── Collapsing the rail ──────────────────────────────────────────────────────
// Offered on tablet and below only (Quasar's `lt.md` is < 1024px, matching the
// breakpoints above). On desktop there is room for the full rail, so trading
// legible labels for horizontal space nobody needs back is a bad deal — and the
// collapse control is hidden there rather than merely disabled.
const canCollapse = computed(() => $q.screen.lt.md)

// `miniPref` is what the user asked for; `isCollapsed` is whether it currently
// applies. Keeping the two separate means a tablet user who collapses the rail
// and then rotates to a wider viewport gets the full rail back automatically —
// and still finds it collapsed when they rotate back, rather than having the
// preference silently reset under them.
const isCollapsed = computed(() => miniPref.value && canCollapse.value)

function toggleMini() {
  if (!canCollapse.value) return
  miniPref.value = !miniPref.value
}

// ─── Notification handlers ────────────────────────────────────────────────────
async function handleMarkAsRead(notif) {
  if (notif.read) return
  try {
    await markAsRead(notif.id)
  } catch {
    $q.notify({ type: 'negative', message: 'Could not mark notification as read', position: 'top' })
  }
}

async function handleMarkAllRead() {
  try {
    await markAllAsRead()
    $q.notify({ type: 'positive', message: 'All notifications marked as read', position: 'top' })
  } catch {
    $q.notify({ type: 'negative', message: 'Could not mark all as read', position: 'top' })
  }
}

// ─── Companies ────────────────────────────────────────────────────────────────
const { fetchCurrentUserCompanies } = useOrganization()
const companyStore = useCompanyStore()

async function fetchCompanies() {
  loadingCompanies.value = true
  try {
    const companiesData = await fetchCurrentUserCompanies()
    if (!Array.isArray(companiesData) || companiesData.length === 0) {
      $q.notify({
        type: 'warning',
        message: 'No companies found for your account',
        position: 'top',
      })
      return
    }
    companyOptions.value = companiesData.map((company) => ({
      siteId: String(company.company?.id ?? company.company ?? company.id),
      siteName: company.company?.name || company.company_name || `Company ${company.id}`,
      logo: company.company?.logo || company.company_logo || null,
      country: company.company?.country || company.country || '',
      country_name: company.company?.country_name || company.country_name || '',
    }))
    companyStore.setCompanies(companiesData)
  } catch (err) {
    const data = err.response?.data
    console.error('[fetchCompanies] backend error:', data)
    let msg = 'Failed to load companies'
    if (data && typeof data === 'object') {
      const first = Object.values(data)[0]
      msg = Array.isArray(first) ? first[0] : data.detail || data.message || msg
    } else if (typeof data === 'string' && !data.startsWith('<')) {
      msg = data
    }
    $q.notify({
      type: 'negative',
      message: msg,
      position: 'top',
    })
  } finally {
    loadingCompanies.value = false
  }
}

function setSelectedCompany(siteId) {
  const match = companyOptions.value.find((opt) => String(opt.siteId) === String(siteId))
  selectedCompany.value = String(siteId)
  if (match) {
    companyStore.setCompany({
      id: match.siteId,
      name: match.siteName,
      logo: match.logo,
      country: match.country,
      country_name: match.country_name,
    })
  } else {
    companyStore.setCompany({
      id: String(siteId),
      name: '',
      logo: null,
      country: '',
      country_name: '',
    })
  }
}

function loadSavedCompany() {
  companyStore.hydrate()
  const savedCompany = companyStore.company
  if (savedCompany) {
    const match = companyOptions.value.find((opt) => String(opt.siteId) === String(savedCompany.id))
    if (match) {
      selectedCompany.value = String(match.siteId)
      return
    }
  }
  if (companyOptions.value.length > 0) setSelectedCompany(companyOptions.value[0].siteId)
}

function onCompanyChange(siteId) {
  setSelectedCompany(siteId)
  window.location.reload()
}

function scrollToActiveTab() {
  if (!tabsWrapperRef.value) return
  const activeEl = tabsWrapperRef.value.querySelector('.workspace--active')
  if (activeEl) {
    activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
  }
}

function updateOverflowHint() {
  const el = tabsWrapperRef.value
  if (!el) return
  const hasOverflow = el.scrollWidth > el.clientWidth
  const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
  showOverflowHint.value = hasOverflow && !atEnd
}

function handleImageError() {
  currentUserPicture.value = ''
  // Keep localStorage cache intact so a page refresh may recover a temporary failure
}

// ─── Current user ─────────────────────────────────────────────────────────────
async function loadCurrentUser() {
  const cached = localStorage.getItem('cached_username')
  if (cached) currentUsername.value = cached

  try {
    const token = localStorage.getItem('access_token')
    if (!token) return
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload?.email) {
      currentUsername.value = payload.email
      localStorage.setItem('cached_username', payload.email)
    }
  } catch {
    // keep cached value
  }

  // Primary: fetch avatar from profile endpoint
  try {
    const response = await api.get('/user/check-type/')
    const pictureUrl =
      response.data?.picture_url ||
      response.data?.profile?.picture_url ||
      response.data?.profile?.profile_picture ||
      response.data?.profile?.user?.picture_url ||
      response.data?.user?.picture_url ||
      response.data?.employee?.picture_url ||
      ''
    if (pictureUrl) {
      currentUserPicture.value = pictureUrl
      localStorage.setItem('cached_user_picture', pictureUrl)
      return
    }
  } catch {
    // silent — proceed to fallback
  }

  // Fallback: use cached picture if API fails or returns nothing
  const cachedPicture = localStorage.getItem('cached_user_picture')
  if (cachedPicture) currentUserPicture.value = cachedPicture
}

// ─── Logout ───────────────────────────────────────────────────────────────────
function logout() {
  cleanupNotifications()
  companyStore.clear()
  localStorage.removeItem('access_token')
  localStorage.removeItem('username')
  localStorage.removeItem('cached_user_picture')
  router.push({ name: 'login' }).then(() => window.location.reload())
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  const token = localStorage.getItem('access_token')
  if (!token) {
    console.warn('[MainLayout] No access_token found; skipping fetchCompanies')
    loadingCompanies.value = false
  } else {
    await fetchCompanies()
  }
  await nextTick()
  updateOverflowHint()
  loadSavedCompany()
  await nextTick()
  scrollToActiveTab()
  reconnect() // Re-connect WS now that companyId is resolved
  await loadCurrentUser()

  window.addEventListener('resize', updateOverflowHint)
  if (tabsWrapperRef.value) {
    tabsWrapperRef.value.addEventListener('scroll', updateOverflowHint)
  }
})

onUnmounted(() => {
  cleanupNotifications()
  window.removeEventListener('resize', updateOverflowHint)
  if (tabsWrapperRef.value) {
    tabsWrapperRef.value.removeEventListener('scroll', updateOverflowHint)
  }
})
</script>

<style scoped>
/* Hide scrollbars throughout the shell — the drawer and the workspace strip
   both scroll, and visible bars break the flush edges. */
:deep(*) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
:deep(*::-webkit-scrollbar) {
  display: none;
}

/* ═══ Header ═══════════════════════════════════════════════════════════════
   A hairline bottom border instead of a Material drop shadow. The shadow made
   the bar look like it hovered over the page; the rule just separates them. */
.app-header {
  background: var(--dash-surface);
  border-bottom: 1px solid var(--dash-line);
  box-shadow: none;
  color: var(--dash-ink);
  z-index: 1001;
}

.app-header__inner {
  display: flex;
  align-items: center;
  gap: 14px;
  height: var(--header-h);
  padding: 0 18px;
}

.app-header__menu {
  color: var(--dash-ink-2);
  flex-shrink: 0;
}

/* ── Workspace switcher ── */
.workspaces {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
}

.workspace {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  scroll-snap-align: start;
  max-width: 190px;
  padding: 6px 12px;
  border-radius: var(--dash-r-md);
  border: 1px solid var(--dash-line);
  background: var(--dash-surface);
  color: var(--dash-ink-2);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  transition: background var(--dash-fast) var(--dash-ease),
    border-color var(--dash-fast) var(--dash-ease), color var(--dash-fast) var(--dash-ease);
}
.workspace:hover {
  background: var(--dash-n-50);
  color: var(--dash-ink);
}
.workspace:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--dash-surface), 0 0 0 4px var(--dash-accent-ring);
}

/* Selection is a tinted, ringed chip rather than a filled navy pill with a
   glow. It still reads unmistakably as "you are here" without turning the
   busiest strip in the app into the highest-contrast thing on screen. */
.workspace--active {
  background: var(--dash-accent-bg);
  border-color: var(--dash-info-line);
  color: var(--dash-accent);
  font-weight: 600;
}
.workspace--active:hover {
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
}

.workspace--loading {
  cursor: default;
  color: var(--dash-ink-3);
}

.workspace__logo {
  width: 18px;
  height: 18px;
  border-radius: var(--dash-r-xs);
  object-fit: cover;
  flex-shrink: 0;
}
.workspace__logo--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--dash-n-100);
  color: var(--dash-ink-3);
}

.workspace__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspaces__fade {
  position: sticky;
  right: 0;
  align-self: stretch;
  width: 36px;
  margin-left: -36px;
  flex-shrink: 0;
  pointer-events: none;
  background: linear-gradient(to right, rgba(255, 255, 255, 0), var(--dash-surface));
}

/* ── Right cluster ── */
.app-header__right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.app-header__rule {
  width: 1px;
  height: 22px;
  background: var(--dash-line);
}

.icon-btn {
  position: relative;
  color: var(--dash-ink-3);
  width: 34px;
  height: 34px;
  border-radius: var(--dash-r-md);
  transition: color var(--dash-fast) var(--dash-ease),
    background var(--dash-fast) var(--dash-ease);
}
.icon-btn:hover {
  color: var(--dash-ink);
  background: var(--dash-n-50);
}

/* Count badge with a surface-coloured ring, so it stays legible where it
   overlaps the bell glyph. */
.icon-btn__badge {
  position: absolute;
  top: 2px;
  right: 1px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: var(--dash-r-pill);
  background: var(--dash-critical-mark);
  border: 2px solid var(--dash-surface);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  line-height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-variant-numeric: tabular-nums;
}

.user {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  padding: 3px 4px;
  border-radius: var(--dash-r-md);
}

.user__avatar {
  flex-shrink: 0;
}

.user__initials {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.02em;
}

.user__name {
  font-size: 13px;
  color: var(--dash-ink-2);
  max-width: 190px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ═══ Navigation rail ══════════════════════════════════════════════════════ */
.app-nav {
  overflow-x: hidden;
}
.app-nav :deep(.q-drawer__content) {
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
}

/* ── Brand ──────────────────────────────────────────────────────────────────
   The rail's masthead, and deliberately the largest type in the drawer: a 21px
   mark beside a 19px wordmark against 13px nav labels. Padding is horizontal
   only so `min-height` can hold the block to exactly the header's height and
   the two line up across the seam. */
.app-nav__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid var(--nav-line);
  flex-shrink: 0;
  min-height: var(--header-h);
}
/* Collapsed: logo over the collapse control, both centred, and no rule beneath
   — the rail reads as one continuous dark surface with a column of glyphs. */
.app-nav__brand--mini {
  flex-direction: column;
  gap: 10px;
  padding: 16px 0 14px;
  border-bottom: none;
}

/* The asset is trimmed to the glyph, so the box IS the mark's visual size and
   there is no transparent padding to compensate for. Height is what is set —
   width follows the mark's own 1.09:1 aspect — and 21px puts the mark's mass at
   roughly the height of the whole word beside it, so the two read as one
   lockup. Both are centred on the same line box; the mark's centre lands on the
   wordmark's cap-height midpoint, so no optical nudge is needed. */
.app-nav__logo {
  height: 21px;
  display: flex;
  align-items: center;
  /* Collapsed the brand is a column, so the box stretches the rail's width and
     the mark has to centre itself inside it. */
  justify-content: center;
  flex-shrink: 0;
}
.app-nav__logo img {
  display: block;
  height: 100%;
  width: auto;
}
/* Collapsed, the mark is alone in a 72px rail and carries the brand by itself,
   so it steps up. */
.app-nav__brand--mini .app-nav__logo {
  height: 26px;
}

.app-nav__wordmark {
  flex: 1;
  min-width: 0;
  font-size: 19px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--nav-ink);
  white-space: nowrap;
}

.app-nav__collapse {
  color: var(--nav-ink-3);
  flex-shrink: 0;
  transition: color var(--dash-fast) var(--dash-ease),
    background var(--dash-fast) var(--dash-ease);
}
.app-nav__collapse:hover {
  color: var(--nav-ink);
  background: var(--nav-hover);
}

/* ── Groups ── */
.app-nav__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 12px 8px;
}
/* Collapsed, the rail is a single centred column of glyphs. */
.app-nav__body--mini {
  padding: 10px 0 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.nav-group {
  margin-bottom: 14px;
  width: 100%;
}
.nav-group:last-child {
  margin-bottom: 0;
}

/* Sentence case, matching the rest of the system. Uppercase letter-spaced
   section headers are the clearest single tell of an older dashboard. */
.nav-group__label {
  margin: 0 0 4px;
  padding: 0 10px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--nav-ink-3);
  white-space: nowrap;
}

.nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.app-nav__body--mini .nav-list {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ── Items ──────────────────────────────────────────────────────────────────
   Selection is carried by the icon (outlined when inactive, filled when active,
   see navIcon()), the label going white and semibold, and a blue bar pinned to
   the row's left edge. There is still no highlight block behind the active item
   — the bar marks the row without painting a shape around it, so the rail stays
   quiet. Hover is the only thing that draws a surface. */
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 38px;
  padding: 7px 11px;
  margin-bottom: 2px;
  border: none;
  background: transparent;
  border-radius: var(--dash-r-lg);
  color: var(--nav-ink-2);
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
  transition: background var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease);
}
.nav-item--button {
  text-align: left;
}

/* Collapsed: a circular hit area, so the hover surface is a disc centred on the
   glyph rather than a wide rounded rectangle in a 72px rail.

   Held at 44px even though the glyph inside is only 19px. Collapsing is offered
   below 1024px only, which is exactly where the rail is being touched rather
   than clicked, so this is the one place in the shell where the target should
   not shrink with its icon. */
.nav-item--mini {
  width: 44px;
  height: 44px;
  min-height: 0;
  padding: 0;
  margin-bottom: 4px;
  gap: 0;
  justify-content: center;
  border-radius: var(--dash-r-pill);
}

.nav-item:hover {
  background: var(--nav-hover);
  color: var(--nav-ink);
}

.nav-item--active {
  background: transparent;
  color: var(--nav-ink);
}
.nav-item--active:hover {
  background: var(--nav-hover);
}

/* The selection bar. Full row height rather than a short centred tick, so it
   reads as the row being marked rather than as a bullet next to it, and it is
   inset flush with the item's own left edge so it lines up with the group
   labels above it instead of floating in the rail's padding. */
.nav-item--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--nav-accent);
}

/* Collapsed, the row is a 44px disc, so the bar moves out of the item and sits
   in the rail's gutter, keeping the glyph centred. */
.nav-item--mini.nav-item--active::before {
  left: -10px;
  top: 50%;
  bottom: auto;
  height: 22px;
  transform: translateY(-50%);
}

.nav-item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--nav-bg), 0 0 0 4px var(--nav-ring);
}

.nav-item__icon {
  flex-shrink: 0;
  color: inherit;
}

.nav-item__label {
  min-width: 0;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: -0.006em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: inherit;
}
.nav-item--active .nav-item__label {
  font-weight: 600;
}

/* ── Foot ── */
.app-nav__foot {
  flex-shrink: 0;
  padding: 8px 12px 14px;
  border-top: 1px solid var(--nav-line);
}
.app-nav__foot--mini {
  display: flex;
  justify-content: center;
  padding: 8px 0 14px;
}

/* ═══ Notifications ════════════════════════════════════════════════════════ */
.notif {
  width: 384px;
  max-width: 94vw;
  display: flex;
  flex-direction: column;
  background: var(--dash-surface);
}

.notif__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 13px 14px;
  border-bottom: 1px solid var(--dash-line);
}

.notif__head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.notif__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--dash-ink);
}

.notif__head-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.notif__link {
  color: var(--dash-accent);
  font-weight: 500;
}

.notif__icon-btn {
  color: var(--dash-ink-4);
}
.notif__icon-btn:hover {
  color: var(--dash-ink-2);
}

.notif__scroll {
  height: 384px;
  width: 100%;
}

.notif__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.notif__item {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--dash-line-soft);
  cursor: pointer;
  transition: background var(--dash-fast) var(--dash-ease);
}
.notif__item:last-child {
  border-bottom: none;
}
.notif__item:hover {
  background: var(--dash-n-50);
}

/* Unread is marked by a dot and a faint tint, never by tint alone. */
.notif__item--unread {
  background: var(--dash-accent-bg);
}
.notif__item--unread:hover {
  background: #e3eaff;
}

.notif__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--dash-r-md);
  color: #fff;
  flex-shrink: 0;
}

.notif__body {
  flex: 1;
  min-width: 0;
}

.notif__item-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
  letter-spacing: -0.006em;
}

.notif__item-text {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--dash-ink-2);
  line-height: 1.45;
}

.notif__item-time {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 5px 0 0;
  font-size: 12px;
  color: var(--dash-ink-4);
}

.notif__aside {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.notif__urgent {
  font-size: 11px;
  padding: 1px 7px;
}

.notif__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--dash-accent);
}

.notif__empty {
  min-height: 300px;
}

.notif__foot {
  display: flex;
  justify-content: center;
  padding: 9px 14px;
  border-top: 1px solid var(--dash-line);
  background: var(--dash-n-25);
}

/* ═══ Responsive ═══════════════════════════════════════════════════════════ */
@media (max-width: 1024px) {
  .app-header__inner {
    gap: 10px;
    padding: 0 12px;
  }
  .workspace {
    max-width: 150px;
    font-size: 12.5px;
    padding: 5px 10px;
  }
  .app-nav__body {
    padding: 10px 10px 6px;
  }
  .nav-group {
    margin-bottom: 10px;
  }
  /* One step tighter again on tablet, with the masthead scaled to match so the
     size relationship between the two holds at every width. */
  .app-nav__logo {
    width: 32px;
    height: 32px;
  }
  .app-nav__wordmark {
    font-size: 18px;
  }
  .nav-item {
    min-height: 36px;
    padding: 6px 10px;
    gap: 11px;
  }
  .nav-item__label {
    font-size: 12.5px;
  }
}

/* The user's email is the first thing to go when the bar gets tight — the
   avatar still identifies the account, and the tooltip still names it. */
@media (max-width: 900px) {
  .user__name,
  .app-header__rule {
    display: none;
  }
}
</style>

<style>
/* Tooltips inside the dark rail. Unscoped because Quasar teleports QTooltip to
   the body, out of this component's scope. */
.nav-tooltip {
  background: #1c3346;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--dash-r-sm);
  padding: 5px 10px;
  box-shadow: var(--dash-shadow-lg);
}

/* Same for the notification menu's popup surface. */
.notif-menu {
  border-radius: var(--dash-r-lg) !important;
  border: 1px solid var(--dash-line);
  box-shadow: var(--dash-shadow-lg) !important;
  overflow: hidden;
}
</style>
