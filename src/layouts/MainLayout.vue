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

        <!-- Workspace switcher. Each company the user belongs to is a segment
             of one control, and the active one is the scope every API call on
             the page is made against. They share a single inset track instead
             of each carrying its own outlined box: five outlined boxes read as
             five competing buttons, where one track reads as one choice. -->
        <div
          v-if="companyOptions.length || loadingCompanies"
          ref="tabsWrapperRef"
          class="workspaces"
          role="tablist"
          aria-label="Companies"
        >
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
              <q-icon name="business" size="12px" />
            </span>
            <span class="workspace__name">{{ company.siteName }}</span>
          </button>

          <div v-if="loadingCompanies" class="workspace workspace--loading">
            <q-spinner size="13px" />
            <span class="workspace__name">Loading workspaces…</span>
          </div>

          <div v-if="showOverflowHint" class="workspaces__fade" />
        </div>

        <!-- ── Right cluster ── -->
        <div class="app-header__right">
          <q-btn flat round dense class="icon-btn" aria-label="Notifications">
            <q-icon name="o_notifications" size="19px" />
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
                  <h2 class="notif__title">Notifications</h2>
                  <div class="notif__head-actions">
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

                <!-- Scope and bulk action share one thin row, so the title row
                     stays a title row. The scope control borrows the header's
                     segmented switcher so the two read as the same kind of
                     choice in the same bar. -->
                <div class="notif__tools">
                  <div class="notif__filters" role="tablist" aria-label="Filter notifications">
                    <button
                      v-for="tab in NOTIF_FILTERS"
                      :key="tab.value"
                      type="button"
                      role="tab"
                      class="notif__filter"
                      :class="{ 'notif__filter--active': notifFilter === tab.value }"
                      :aria-selected="notifFilter === tab.value"
                      @click="notifFilter = tab.value"
                    >
                      {{ tab.label }}
                      <span
                        v-if="tab.value === 'unread' && unreadCount > 0"
                        class="notif__filter-n"
                      >
                        {{ unreadCount }}
                      </span>
                    </button>
                  </div>

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
                </div>

                <q-scroll-area class="notif__scroll">
                  <ul v-if="visibleNotifications.length" class="notif__list">
                    <li
                      v-for="notif in visibleNotifications"
                      :key="notif.id"
                      class="notif__item"
                      :class="{ 'notif__item--unread': !notif.read }"
                      @click="handleMarkAsRead(notif)"
                    >
                      <span class="notif__icon" :style="{ color: notifTint(notif) }">
                        <q-icon :name="notif.icon" size="16px" />
                      </span>

                      <div class="notif__body">
                        <div class="notif__line">
                          <p class="notif__item-title">{{ notif.title }}</p>
                          <span class="notif__time">{{ formatTimeAgo(notif.timestamp) }}</span>
                        </div>
                        <p class="notif__item-text">{{ notif.message }}</p>
                        <span v-if="notif.priority === 'high'" class="notif__flag">Urgent</span>
                      </div>

                      <span v-if="!notif.read" class="notif__dot" aria-label="Unread" />
                    </li>
                  </ul>

                  <div v-else class="dash-empty notif__empty">
                    <span class="dash-featured-icon">
                      <q-icon name="o_notifications" size="20px" />
                    </span>
                    <p class="dash-empty__title">{{ emptyTitle }}</p>
                    <p class="dash-empty__sub">{{ emptySub }}</p>
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

          <!-- The account control is a real button rather than a label with a
               tooltip: the identity it shows is also where you leave, so the
               chevron promises a menu and the menu delivers one. -->
          <button
            type="button"
            class="account"
            :class="{ 'account--open': accountMenu }"
            aria-label="Account"
          >
            <q-avatar v-if="currentUserPicture" size="28px" class="account__avatar">
              <img :src="currentUserPicture" alt="" @error="handleImageError" />
            </q-avatar>
            <q-avatar
              v-else
              size="28px"
              class="account__avatar"
              :style="{ background: avatarColor }"
            >
              <span class="account__initials">{{ avatarInitials }}</span>
            </q-avatar>
            <span class="account__name">{{ displayName }}</span>
            <q-icon name="expand_more" size="16px" class="account__chevron" />

            <q-menu
              v-model="accountMenu"
              anchor="bottom right"
              self="top right"
              :offset="[0, 10]"
              class="account-menu"
              transition-show="jump-down"
              transition-hide="jump-up"
            >
              <div class="acct">
                <div class="acct__head">
                  <q-avatar v-if="currentUserPicture" size="36px" class="acct__avatar">
                    <img :src="currentUserPicture" alt="" @error="handleImageError" />
                  </q-avatar>
                  <q-avatar
                    v-else
                    size="36px"
                    class="acct__avatar"
                    :style="{ background: avatarColor }"
                  >
                    <span class="account__initials">{{ avatarInitials }}</span>
                  </q-avatar>
                  <div class="acct__id">
                    <p class="acct__name">{{ displayName }}</p>
                    <p v-if="accountEmail" class="acct__email">{{ accountEmail }}</p>
                    <p v-if="activeCompanyName" class="acct__scope">
                      <q-icon name="business" size="12px" />
                      {{ activeCompanyName }}
                    </p>
                  </div>
                </div>

                <div class="acct__foot">
                  <button type="button" class="acct__item" @click="logout">
                    <q-icon name="o_logout" size="17px" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            </q-menu>
          </button>
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
        <!-- The mark is a white glyph, so on the navy it needs a surface of its
             own to sit on or it reads as a loose sticker. The tile gives it
             one and is the single place the brand blue appears at full
             strength in the rail. -->
        <div class="app-nav__mark">
          <img :src="logo" alt="Wagey" />
        </div>
        <span v-if="!isCollapsed" class="app-nav__lockup">
          <span class="app-nav__wordmark">Wagey</span>
          <span class="app-nav__tagline">Admin console</span>
        </span>
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

    <!-- Tablet and below only: on desktop the rail is always full width, so the
         control is absent rather than present-but-disabled — a disabled
         affordance still asks to be understood.

         It is a sibling of the drawer, not a child of it: the rail's content
         area scrolls vertically, and a box that scrolls on one axis cannot let
         a child overflow the other, so nothing inside the drawer can straddle
         its edge. Hence fixed positioning, with the one number it needs — the
         rail's current width — handed to it from `railWidth`. -->
    <q-btn
      v-if="canCollapse && leftDrawerOpen"
      unelevated
      dense
      round
      size="11px"
      class="app-nav__collapse"
      :style="{ left: railWidth + 'px' }"
      :icon="isCollapsed ? 'chevron_right' : 'chevron_left'"
      :aria-label="isCollapsed ? 'Expand navigation' : 'Collapse navigation'"
      @click="toggleMini"
    >
      <q-tooltip anchor="center right" self="center left" :offset="[10, 0]" class="nav-tooltip">
        {{ isCollapsed ? 'Expand' : 'Collapse' }}
      </q-tooltip>
    </q-btn>

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
const accountMenu = ref(false)

// Notification scope. Unread-only is the view people actually want when the
// badge is what brought them here, so it is one click away rather than a mental
// filter applied to a list of six.
const NOTIF_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
]
const notifFilter = ref('all')

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

const visibleNotifications = computed(() =>
  notifFilter.value === 'unread'
    ? sortedNotifications.value.filter((n) => !n.read)
    : sortedNotifications.value,
)

// The empty state answers the question the current scope raises: an empty
// unread list is good news, an empty inbox is a different sentence, and neither
// is true if the socket is down.
const emptyTitle = computed(() => {
  if (!isConnected.value) return 'Reconnecting…'
  return notifFilter.value === 'unread' ? 'Nothing unread' : "You're all caught up"
})

const emptySub = computed(() => {
  if (!isConnected.value) return 'Waiting for the connection to come back.'
  return notifFilter.value === 'unread'
    ? 'Everything here has been read.'
    : 'New notifications will appear here as they arrive.'
})

// The header shows the shortest thing that still identifies the account, and
// the menu carries the full address underneath it. When the stored identity is
// an email that means the local part on the bar and the address in the menu;
// when it is already a plain username there is no second line to show.
const displayName = computed(() => {
  const name = currentUsername.value
  if (!name) return 'Account'
  return name.includes('@') ? name.split('@')[0] : name
})

const accountEmail = computed(() =>
  currentUsername.value.includes('@') ? currentUsername.value : '',
)

// Named in the account menu so the workspace the app is currently reading and
// writing is legible even when the switcher has scrolled the active segment
// out of view.
const activeCompanyName = computed(
  () => companyOptions.value.find((c) => c.siteId === selectedCompany.value)?.siteName || '',
)

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

// What the rail actually measures right now — the collapse handle is pinned to
// this so it rides the drawer's edge instead of being re-derived per breakpoint
// in CSS, which is what the previous floating control did.
const railWidth = computed(() => (isCollapsed.value ? 72 : drawerWidth.value))

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

/* ── Workspace switcher ──
   One inset track holding every workspace, sized to its contents and capped at
   the space the bar can spare. Selection is the only raised surface in it, so
   the eye finds the active workspace by elevation before it reads a word. */
.workspaces {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  max-width: 100%;
  /* 4px, so the raised chip's drop shadow lands inside the track's own padding
     box — a horizontal scroller clips its children at that edge, and 3px would
     shave the outer ring of the shadow off. */
  padding: 4px;
  border: 1px solid var(--dash-line);
  border-radius: 10px;
  background: var(--dash-n-100);
  overflow-x: auto;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
}

.workspace {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  scroll-snap-align: start;
  max-width: 180px;
  padding: 4px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--dash-ink-3);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  letter-spacing: -0.005em;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  transition:
    background var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease),
    box-shadow var(--dash-fast) var(--dash-ease);
}

/* Hairline between neighbours, carried on the right-hand segment of each pair.
   It retracts around the raised chip and around whatever is hovered, so a
   divider never runs into an edge that already separates. */
.workspace + .workspace::before {
  content: '';
  position: absolute;
  left: -2px;
  top: 5px;
  bottom: 5px;
  width: 1px;
  background: var(--dash-n-300);
  transition: opacity var(--dash-fast) var(--dash-ease);
}
.workspace--active::before,
.workspace--active + .workspace::before,
.workspace:hover::before,
.workspace:hover + .workspace::before {
  opacity: 0;
}

.workspace:hover {
  background: rgba(255, 255, 255, 0.65);
  color: var(--dash-ink);
}
.workspace:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--dash-n-100),
    0 0 0 4px var(--dash-accent-ring);
}

/* The chip lifts off the track on its own white surface. Elevation and ink
   weight carry the selection; no fill, no ring, no second accent colour in the
   busiest strip of the app. */
.workspace--active,
.workspace--active:hover {
  background: var(--dash-surface);
  color: var(--dash-ink);
  font-weight: 600;
  box-shadow:
    0 1px 2px rgba(16, 24, 40, 0.06),
    0 1px 3px rgba(16, 24, 40, 0.1);
}

.workspace--loading {
  cursor: default;
  color: var(--dash-ink-3);
}

/* 16px, not 17: the logo is the tallest thing in a segment, so it sets the
   height of the whole control — at 16 the track lands on exactly 34px, the same
   as the bell button and the avatar cluster beside it. */
.workspace__logo {
  width: 16px;
  height: 16px;
  border-radius: var(--dash-r-xs);
  object-fit: cover;
  flex-shrink: 0;
}
.workspace__logo--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--dash-n-200);
  color: var(--dash-ink-3);
}
.workspace--active .workspace__logo--fallback {
  background: var(--dash-n-100);
}

.workspace__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Fades against the track, not the header, since the overflow happens inside
   the track now. */
.workspaces__fade {
  position: sticky;
  right: -4px;
  align-self: stretch;
  width: 28px;
  margin-left: -28px;
  flex-shrink: 0;
  pointer-events: none;
  background: linear-gradient(to right, rgba(242, 244, 247, 0), var(--dash-n-100) 65%);
}

/* ── Right cluster ── */
.app-header__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
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
  transition:
    color var(--dash-fast) var(--dash-ease),
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

/* ── Account control ── */
.account {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 3px 6px 3px 3px;
  border: 0;
  border-radius: var(--dash-r-md);
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  transition: background var(--dash-fast) var(--dash-ease);
}
.account:hover,
.account--open {
  background: var(--dash-n-50);
}
.account:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--dash-surface),
    0 0 0 4px var(--dash-accent-ring);
}

.account__avatar {
  flex-shrink: 0;
}

.account__initials {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.02em;
}

.account__name {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink-2);
  max-width: 170px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.account:hover .account__name,
.account--open .account__name {
  color: var(--dash-ink);
}

.account__chevron {
  color: var(--dash-ink-4);
  flex-shrink: 0;
  transition:
    transform var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease);
}
.account:hover .account__chevron {
  color: var(--dash-ink-3);
}
.account--open .account__chevron {
  transform: rotate(180deg);
  color: var(--dash-ink-3);
}

/* ── Account menu ── */
.acct {
  width: 248px;
  background: var(--dash-surface);
}

.acct__head {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 14px;
}

.acct__avatar {
  flex-shrink: 0;
}

.acct__id {
  min-width: 0;
}

.acct__name {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--dash-ink);
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acct__email {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--dash-ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* The workspace every request on the page is scoped to, restated where it can't
   be scrolled out of sight. */
.acct__scope {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 7px 0 0;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dash-ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acct__foot {
  padding: 6px;
  border-top: 1px solid var(--dash-line);
  background: var(--dash-n-25);
}

.acct__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 8px;
  border: 0;
  border-radius: var(--dash-r-sm);
  background: transparent;
  color: var(--dash-ink-2);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition:
    background var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease);
}
.acct__item:hover {
  background: var(--dash-n-100);
  color: var(--dash-ink);
}

/* ═══ Navigation rail ══════════════════════════════════════════════════════ */
.app-nav {
  overflow-x: hidden;
}
/* The navy is unchanged; what sits on top of it is not. A cool wash falls from
   the masthead and the floor darkens slightly, so the rail has a light source
   instead of being one flat fill, and the brand blue bleeds a few hundred
   pixels down from the top rather than stopping at the tile. All of it is far
   below the threshold where it would read as a second colour — Quasar paints
   `background-color` here itself, so these are layered as images over it. */
.app-nav :deep(.q-drawer__content) {
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  background-image:
    radial-gradient(120% 46% at 6% 0%, rgba(91, 140, 255, 0.16) 0%, rgba(91, 140, 255, 0) 60%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.035) 0%, rgba(255, 255, 255, 0) 22%),
    linear-gradient(180deg, rgba(0, 0, 0, 0) 62%, rgba(0, 0, 0, 0.22) 100%);
}

/* ── Brand ──────────────────────────────────────────────────────────────────
   A masthead, not a line of text: the mark bare on the navy beside a two-line
   lockup that names the product and then what this particular surface is. Padding is horizontal only so `min-height` can hold the block to exactly
   the header's height and the two line up across the seam. */
.app-nav__brand {
  display: flex;
  align-items: center;
  gap: 11px;
  /* Left padding is not 16px by taste: a 28.4px-wide mark starting at 18px puts
     its centre at 32.2px, and the nav icon column's centre is at 32.5px, so the
     masthead and the rail below it share one vertical axis. */
  padding: 0 16px 0 18px;
  border-bottom: 1px solid var(--nav-line);
  flex-shrink: 0;
  min-height: var(--header-h);
}
/* Collapsed: the mark alone, centred, with no rule beneath — the rail reads as
   one continuous dark surface with a column of glyphs. The collapse handle is
   no longer part of this block; it rides the rail's edge. */
.app-nav__brand--mini {
  justify-content: center;
  gap: 0;
  padding: 0;
  border-bottom: none;
}

/* No tile — the mark sits bare on the navy, which is what it was drawn for.
   The asset is trimmed to the glyph, so this box IS the mark's visual size and
   there is no transparent padding to compensate for. Height is what is set;
   width follows the mark's own 1.09:1 aspect, giving 28.4px.

   26px rather than something nearer the wordmark's own size because the text
   beside it is now two lines: the mark has to span that block to read as part
   of the same lockup, not as a glyph parked next to the first line. */
.app-nav__mark {
  height: 26px;
  display: flex;
  align-items: center;
  /* Collapsed the mark is alone in the rail and centres itself in it. */
  justify-content: center;
  flex-shrink: 0;
}
.app-nav__mark img {
  display: block;
  height: 100%;
  width: auto;
}
/* Collapsed, the mark is alone in a 72px rail and carries the brand by itself,
   so it steps up. */
.app-nav__brand--mini .app-nav__mark {
  height: 30px;
}

.app-nav__lockup {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

/* Dropped from 19px: the second line now shares the masthead's weight, so the
   word no longer has to shout to hold it alone, and 16px sits in proportion to
   the 26px mark beside it. */
.app-nav__wordmark {
  font-size: 16px;
  line-height: 1.15;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--nav-ink);
  white-space: nowrap;
}

/* The second line does the work the wordmark used to do alone — it says which
   surface of the product this is, and gives the lockup a base to sit on so the
   masthead reads as a block rather than as one floating word. */
.app-nav__tagline {
  font-size: 11px;
  line-height: 1.2;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--nav-ink-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* A solid accent disc straddling the rail's edge, centred on the border line so
   half of it sits on the navy and half on the page. It appears on tablet only,
   which is where the rail is being touched rather than clicked, so it has to
   look like a button you can hit — a bare chevron tucked inside the masthead
   reads as decoration at that size.

   `left` comes from `railWidth` in the script and is nudged back by half the
   disc; `top` is half the header's height, which is where the masthead's own
   centre line falls, so the handle lines up with the wordmark beside it. Both
   axes are then corrected by the translate. It is the only saturated thing on
   the rail, which is what makes a 26px disc findable at all. */
.app-nav__collapse.q-btn {
  position: fixed;
  top: calc(var(--header-h) / 2);
  transform: translate(-50%, -50%);
  z-index: 2001;
  width: 26px;
  height: 26px;
  min-width: 26px;
  min-height: 26px;
  padding: 0;
  color: #fff;
  background: linear-gradient(145deg, var(--nav-accent) 0%, var(--nav-accent-deep) 100%);
  /* The ring is the rail's own navy, so the disc reads as punched through the
     edge rather than laid over it. */
  box-shadow:
    0 0 0 3px var(--nav-bg),
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 2px 8px rgba(16, 31, 45, 0.45);
  /* Rides the drawer's own open/collapse animation. */
  transition:
    left 0.24s var(--dash-ease),
    filter var(--dash-fast) var(--dash-ease),
    box-shadow var(--dash-fast) var(--dash-ease);
}
/* The chevron is the whole content of a 26px disc, so it is sized here rather
   than left to the `size` prop, which also drives the button's own box. */
.app-nav__collapse :deep(.q-icon) {
  font-size: 16px;
}
/* Quasar tints round buttons on hover through this overlay; the disc is already
   a solid fill, so the tint would only muddy it. */
.app-nav__collapse :deep(.q-focus-helper) {
  display: none;
}
.app-nav__collapse.q-btn:hover {
  filter: brightness(1.12);
  box-shadow:
    0 0 0 3px var(--nav-bg),
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    0 3px 11px rgba(16, 31, 45, 0.55);
}
.app-nav__collapse.q-btn:active {
  transform: translate(-50%, -50%) scale(0.92);
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
  margin-bottom: 18px;
  width: 100%;
}
.nav-group:last-child {
  margin-bottom: 0;
}

/* Sentence case, matching the rest of the system. Uppercase letter-spaced
   section headers are the clearest single tell of an older dashboard. */
.nav-group__label {
  margin: 0 0 6px;
  padding: 0 11px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.004em;
  color: rgba(255, 255, 255, 0.34);
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
  transition:
    background var(--dash-fast) var(--dash-ease),
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

/* The selected row now carries a wash of the accent rather than nothing at all.
   It is a tint over the navy — light enough that a column of rows never turns
   into a column of blue blocks, strong enough that the eye finds the current
   page without reading a single label. */
.nav-item--active {
  background: var(--nav-accent-soft);
  color: var(--nav-ink);
}
.nav-item--active:hover {
  background: rgba(91, 140, 255, 0.19);
}
/* Active glyphs take the accent; the label stays white, so the row is marked
   twice without either signal getting loud. */
.nav-item--active .nav-item__icon {
  color: #a9c4ff;
}

/* The selection bar. Now that the row itself is washed, the bar moves out of
   the item and into the rail's gutter, flush with the drawer's own left edge —
   inside the row it would have to follow the pill's 12px corner and come out a
   thin crescent. Centred and short rather than full height, because it is now
   the second mark on the row, not the only one. */
.nav-item--active::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 50%;
  transform: translateY(-50%);
  height: 20px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--nav-accent);
}

/* Collapsed the row is a 44px disc centred in a 72px rail, so the offset is
   larger — but it resolves to the same place: flush with the rail's edge. */
.nav-item--mini.nav-item--active::before {
  left: -14px;
  height: 22px;
}

.nav-item:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--nav-bg),
    0 0 0 4px var(--nav-ring);
}

/* Idle glyphs sit a step below their labels, so a scan of the rail reads as a
   list of words with icons supporting them rather than two columns competing.
   Hover and selection bring them back up. */
.nav-item__icon {
  flex-shrink: 0;
  color: var(--nav-ink-3);
  transition: color var(--dash-fast) var(--dash-ease);
}
.nav-item:hover .nav-item__icon {
  color: var(--nav-ink-2);
}
/* Beats the hover rule above, which would otherwise dim an active row's glyph
   on the way past it. */
.nav-item--active:hover .nav-item__icon {
  color: #a9c4ff;
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

/* ═══ Notifications ════════════════════════════════════════════════════════
   The old panel gave every row a blue card, a saturated icon block, an outlined
   Urgent pill and a dot — four signals for two facts, and with everything
   unread the whole panel turned blue. Here the row is a row: read items recede,
   unread items sit on a barely-there wash with one dot, and colour appears only
   as a soft tint behind the glyph. */
.notif {
  width: 392px;
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
  padding: 12px 10px 12px 16px;
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

/* ── Scope row ── */
.notif__tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 10px 11px 16px;
  border-bottom: 1px solid var(--dash-line);
}

.notif__filters {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--dash-line);
  border-radius: 9px;
  background: var(--dash-n-100);
}

.notif__filter {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dash-ink-3);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease),
    box-shadow var(--dash-fast) var(--dash-ease);
}
.notif__filter:hover {
  color: var(--dash-ink);
}
.notif__filter--active,
.notif__filter--active:hover {
  background: var(--dash-surface);
  color: var(--dash-ink);
  font-weight: 600;
  box-shadow:
    0 1px 2px rgba(16, 24, 40, 0.06),
    0 1px 3px rgba(16, 24, 40, 0.1);
}

.notif__filter-n {
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--dash-accent);
}

/* ── List ── */
.notif__scroll {
  height: 396px;
  width: 100%;
}

.notif__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.notif__item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 11px 16px 12px;
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

/* A wash faint enough that six unread rows still read as a list rather than a
   blue block, with the dot doing the actual work. Read rows are the ones that
   change: their text steps back a level, so emphasis falls out of the item
   losing weight rather than the unread one shouting. */
.notif__item--unread {
  background: rgba(46, 79, 212, 0.035);
}
.notif__item--unread:hover {
  background: rgba(46, 79, 212, 0.06);
}

.notif__item:not(.notif__item--unread) .notif__item-title {
  color: var(--dash-ink-2);
  font-weight: 500;
}
.notif__item:not(.notif__item--unread) .notif__icon {
  opacity: 0.6;
}

/* Colour arrives as a tint of itself behind the glyph — `currentColor` at low
   alpha on an underlay — so the category still reads without six saturated
   blocks stacked down the panel. */
.notif__icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--dash-r-md);
  flex-shrink: 0;
}
.notif__icon::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: currentColor;
  opacity: 0.11;
}
.notif__icon .q-icon {
  position: relative;
}

.notif__body {
  flex: 1;
  min-width: 0;
}

/* Title and time share a baseline row, so the timestamp stops being a third
   line under every message. */
.notif__line {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.notif__item-title {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
  letter-spacing: -0.006em;
}

.notif__time {
  flex-shrink: 0;
  font-size: 11.5px;
  color: var(--dash-ink-4);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* Two lines of the message, then an ellipsis. The full text is in the record the
   row links to; the panel's job is to let you scan six of them. */
.notif__item-text {
  margin: 3px 0 0;
  font-size: 12.5px;
  color: var(--dash-ink-3);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Soft tint, no outline: an outlined red pill repeated down the panel was the
   loudest thing in it. */
.notif__flag {
  display: inline-block;
  margin: 7px 0 0;
  padding: 1px 7px;
  border-radius: var(--dash-r-pill);
  background: var(--dash-critical-bg);
  color: var(--dash-critical);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

/* Sits on the title row's optical centre, level with the timestamp beside it,
   rather than on the icon's centre lower down. */
.notif__dot {
  width: 6px;
  height: 6px;
  margin-top: 7px;
  border-radius: 50%;
  background: var(--dash-accent);
  flex-shrink: 0;
}

.notif__empty {
  min-height: 320px;
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
    max-width: 148px;
    font-size: 12.5px;
    padding: 4px 9px;
    gap: 6px;
  }
  .app-nav__body {
    padding: 10px 10px 6px;
  }
  .nav-group {
    margin-bottom: 10px;
  }
  /* One step tighter again on tablet, with the masthead scaled to match so the
     size relationship between the two holds at every width. */
  /* The same axis one step down: a 24px mark is 26.2px wide, so 16px of padding
     puts its centre at 29.1px against the tablet icon column's 29.5px. */
  .app-nav__brand {
    gap: 10px;
    padding: 0 14px 0 16px;
  }
  .app-nav__mark {
    height: 24px;
  }
  .app-nav__wordmark {
    font-size: 15px;
  }
  .app-nav__tagline {
    font-size: 10.5px;
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
  .account__name,
  .account__chevron,
  .app-header__rule {
    display: none;
  }
  .account {
    padding: 3px;
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

/* Same for the notification and account menus' popup surfaces. */
.notif-menu,
.account-menu {
  border-radius: var(--dash-r-lg) !important;
  border: 1px solid var(--dash-line);
  box-shadow: var(--dash-shadow-lg) !important;
  overflow: hidden;
}
</style>
