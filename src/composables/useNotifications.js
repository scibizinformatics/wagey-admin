import { ref, computed, onUnmounted } from 'vue'
import { useWebSocket } from 'src/composables/useWebSocket'
import { api } from 'src/boot/axios'

// ─── Module routing tables ─────────────────────────────────────────────────────
// Maps a notification's notif_type field → data module
const NOTIF_TYPE_TO_MODULE = {
  attendance: 'attendance',
  schedule: 'schedule',
  leave: 'leave',
  leave_request: 'leave',
  overtime: 'overtime',
  overtime_request: 'overtime',
  swap: 'swap_request',
  swap_request: 'swap_request',
  shift_swap: 'swap_request',
}

// Maps a raw WS event name → data module (event-envelope style messages)
const EVENT_TO_MODULE = {
  attendance_created: 'attendance',
  attendance_updated: 'attendance',
  attendance_deleted: 'attendance',
  new_attendance: 'attendance',
  attendance: 'attendance',
  schedule_created: 'schedule',
  schedule_updated: 'schedule',
  schedule_deleted: 'schedule',
  schedule_published: 'schedule',
  new_schedule: 'schedule',
  schedule: 'schedule',
  leave_created: 'leave',
  leave_updated: 'leave',
  leave_approved: 'leave',
  leave_rejected: 'leave',
  leave_cancelled: 'leave',
  new_leave: 'leave',
  leave: 'leave',
  overtime_created: 'overtime',
  overtime_updated: 'overtime',
  overtime_approved: 'overtime',
  overtime_rejected: 'overtime',
  new_overtime: 'overtime',
  overtime: 'overtime',
  swap_request_created: 'swap_request',
  swap_request_updated: 'swap_request',
  swap_request_approved: 'swap_request',
  swap_request_rejected: 'swap_request',
  new_swap_request: 'swap_request',
  swap_request: 'swap_request',
}

// ─── Singleton state — lives at module level, shared by every caller ───────────
const notifications = ref([])
const isInitialLoad = ref(true)
const lastUpdateTime = ref(null)
const isMarkingAsRead = ref(false)

// Per-module subscriber lists
const _dataListeners = {
  attendance: [],
  schedule: [],
  leave: [],
  overtime: [],
  swap_request: [],
}

// Reactive last-event snapshot per module (watch() this for fine-grained control)
const lastDataEvent = ref({
  attendance: null,
  schedule: null,
  leave: null,
  overtime: null,
  swap_request: null,
})

// ─── Helpers ───────────────────────────────────────────────────────────────────
const getToken = () => sessionStorage.getItem('authToken') || localStorage.getItem('access_token')
const getCompanyId = () => {
  const stored = localStorage.getItem('companyId') || localStorage.getItem('selectedCompany')
  if (!stored) return null
  try {
    const parsed = JSON.parse(stored)
    return parsed?.id ?? parsed
  } catch {
    return stored
  }
}

// ─── Icon helpers (unchanged) ──────────────────────────────────────────────────
function getNotificationIcon(type) {
  const iconMap = {
    schedule: 'calendar_today',
    payroll: 'payments',
    attendance: 'access_time',
    leave: 'beach_access',
    system: 'settings',
    announcement: 'campaign',
    alert: 'warning',
    info: 'info',
    success: 'check_circle',
    default: 'notifications',
  }
  return iconMap[type] || iconMap.default
}

function getNotificationIconColor(type) {
  const colorMap = {
    schedule: 'blue',
    payroll: 'green',
    attendance: 'orange',
    leave: 'purple',
    system: 'grey',
    announcement: 'deep-purple',
    alert: 'red',
    info: 'light-blue',
    success: 'teal',
    default: 'primary',
  }
  return colorMap[type] || colorMap.default
}

// ─── Time formatter (unchanged) ───────────────────────────────────────────────
function formatTimeAgo(dateString) {
  try {
    const now = new Date()
    const time = new Date(dateString)
    const diffMs = now - time
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return time.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: time.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  } catch {
    return 'Unknown'
  }
}

// ─── Normalize raw notification (unchanged) ───────────────────────────────────
function processNotification(notification) {
  if (!notification || !notification.id) return null

  const type =
    notification.notif_type || notification.type || notification.notification_type || 'default'

  return {
    id: notification.id,
    title: notification.title || 'New Notification',
    message: notification.message || notification.body || 'No message available',
    timestamp:
      notification.created_at ||
      notification.timestamp ||
      notification.read_at ||
      new Date().toISOString(),
    read:
      notification.is_read !== undefined
        ? notification.is_read
        : notification.read !== undefined
          ? notification.read
          : false,
    type,
    icon: getNotificationIcon(type),
    iconColor: getNotificationIconColor(type),
    category: notification.category || null,
    metadata: notification.metadata || {},
    action_url: notification.redirect_url || notification.action_url || null,
    priority: notification.is_urgent ? 'high' : notification.priority || 'medium',
    delivery_method: notification.delivery_method || null,
  }
}

// ─── Data-event dispatcher ────────────────────────────────────────────────────
function _dispatchDataEvent(module, eventType, payload) {
  if (!module || !_dataListeners[module]) return
  lastDataEvent.value[module] = { event: eventType, payload, timestamp: Date.now() }
  _dataListeners[module].forEach((cb) => {
    try {
      cb(eventType, payload)
    } catch (err) {
      console.error(`[Notifications] dataListener error (${module}):`, err)
    }
  })
}

// ─── Notification list mutations (unchanged) ──────────────────────────────────
function addOrUpdateNotification(notification) {
  if (!notification?.id) return
  const idx = notifications.value.findIndex((n) => n.id === notification.id)
  idx !== -1 ? (notifications.value[idx] = notification) : notifications.value.unshift(notification)
  isInitialLoad.value = false
}

function updateNotification(notification) {
  if (!notification?.id) return
  const idx = notifications.value.findIndex((n) => n.id === notification.id)
  idx !== -1 ? (notifications.value[idx] = notification) : notifications.value.unshift(notification)
}

function removeNotification(notificationId) {
  if (!notificationId) return
  notifications.value = notifications.value.filter((n) => n.id !== notificationId)
}

// ─── WebSocket message router ─────────────────────────────────────────────────
function handleMessage(msg) {
  try {
    if (msg.message && !msg.event && !msg.data) return

    if (msg && typeof msg === 'object' && msg.event) {
      switch (msg.event) {
        case 'notification':
        case 'new_notification':
          if (msg.data) {
            const processed = processNotification(msg.data)
            if (processed) {
              addOrUpdateNotification(processed)
              lastUpdateTime.value = Date.now()
              // Fire data listeners so the dashboard can re-fetch
              const mod = NOTIF_TYPE_TO_MODULE[processed.type]
              if (mod) _dispatchDataEvent(mod, msg.event, msg.data)
            }
          }
          break

        case 'initial_data':
        case 'notification_list':
          if (Array.isArray(msg.data)) {
            notifications.value = msg.data.map(processNotification).filter(Boolean)
            isInitialLoad.value = false
            lastUpdateTime.value = Date.now()
          } else if (msg.data?.id) {
            const processed = processNotification(msg.data)
            if (processed) addOrUpdateNotification(processed)
          }
          break

        case 'update_notification':
          if (msg.data?.id) {
            const processed = processNotification(msg.data)
            if (processed) {
              updateNotification(processed)
              lastUpdateTime.value = Date.now()
            }
          }
          break

        case 'delete_notification':
          if (msg.data?.id) {
            removeNotification(msg.data.id)
            lastUpdateTime.value = Date.now()
          }
          break

        case 'mark_read':
          if (msg.data?.id) {
            const n = notifications.value.find((n) => n.id === msg.data.id)
            if (n) {
              n.read = true
              lastUpdateTime.value = Date.now()
            }
          }
          break

        case 'mark_all_read':
          notifications.value.forEach((n) => (n.read = true))
          lastUpdateTime.value = Date.now()
          break

        default: {
          // Direct data-module event (e.g. "attendance_updated") — no notification object
          const mod = EVENT_TO_MODULE[msg.event]
          if (mod) {
            _dispatchDataEvent(mod, msg.event, msg.data ?? msg.payload ?? null)
            lastUpdateTime.value = Date.now()
            return
          }
          // Fallback: treat as notification list update
          if (Array.isArray(msg.data)) {
            notifications.value = msg.data.map(processNotification).filter(Boolean)
          } else if (msg.data?.id) {
            const processed = processNotification(msg.data)
            if (processed) addOrUpdateNotification(processed)
          }
        }
      }
      return
    }

    if (Array.isArray(msg)) {
      notifications.value = msg.map(processNotification).filter(Boolean)
      isInitialLoad.value = false
      lastUpdateTime.value = Date.now()
      return
    }

    if (msg?.id) {
      const processed = processNotification(msg)
      if (processed) {
        addOrUpdateNotification(processed)
        lastUpdateTime.value = Date.now()
        const mod = NOTIF_TYPE_TO_MODULE[processed.type]
        if (mod) _dispatchDataEvent(mod, 'notification', msg)
      }
    }
  } catch (err) {
    console.error('[Notifications] Error handling WS message:', err)
  }
}

function handleOpen() {
  setTimeout(() => {
    if (notifications.value.length === 0) isInitialLoad.value = false
  }, 2000)
}

function handleError(error) {
  console.warn('[Notifications] WebSocket error (expected if WS not configured):', error)
}

function handleClose() {
  // auto-reconnect handled by useWebSocket
}

// ─── Singleton WebSocket — lazily initialised on first useNotifications() call ─
// useWebSocket() must be called inside a component's setup() so that its
// internal onUnmounted hook has a valid component instance to attach to.
// We store the returned controls in a module-level variable so every subsequent
// caller shares the same socket without reopening it.

const buildWebSocketUrl = () => {
  const token = getToken()
  const companyId = getCompanyId()
  if (!token || !companyId) {
    console.warn('[Notifications] Missing token or companyId', {
      token: !!token,
      companyId: !!companyId,
    })
    return null
  }
  return `ws/notifications/?token=${token}&company=${companyId}`
}

let _ws = null // populated on the first useNotifications() call

function _initWs() {
  if (_ws) return // already open — do nothing
  _ws = useWebSocket(buildWebSocketUrl, {
    autoConnect: true,
    debug: false,
    onMessage: handleMessage,
    onOpen: handleOpen,
    onError: handleError,
    onClose: handleClose,
  })
}

// ─── Mark-as-read (unchanged) ─────────────────────────────────────────────────
async function markAsRead(notificationId) {
  if (!notificationId) return Promise.reject(new Error('No notification ID provided'))

  const notification = notifications.value.find((n) => String(n.id) === String(notificationId))
  if (notification) notification.read = true // optimistic

  try {
    isMarkingAsRead.value = true
    const response = await api.patch(`communication/notifications/${notificationId}/read/`, {
      is_read: true,
    })
    if (response.data && notification) {
      const processed = processNotification(response.data)
      if (processed) Object.assign(notification, processed)
    }
    lastUpdateTime.value = Date.now()
    return true
  } catch (error) {
    if (notification) notification.read = false // revert
    console.error('[Notifications] Failed to mark as read:', error)
    throw error
  } finally {
    isMarkingAsRead.value = false
  }
}

async function markAllAsRead() {
  isMarkingAsRead.value = true
  const unreadIds = notifications.value.filter((n) => !n.read).map((n) => n.id)
  if (!unreadIds.length) {
    isMarkingAsRead.value = false
    return true
  }

  notifications.value.forEach((n) => (n.read = true)) // optimistic

  try {
    await api.patch('communication/notifications/mark-all-read/', { is_read: true })
  } catch {
    await Promise.allSettled(
      unreadIds.map((id) =>
        api.patch(`communication/notifications/${id}/read/`, { is_read: true }),
      ),
    )
  } finally {
    lastUpdateTime.value = Date.now()
    isMarkingAsRead.value = false
  }
  return true
}

function requestRefresh() {
  return _ws?.send({ action: 'refresh' })
}

function clearNotifications() {
  notifications.value = []
  isInitialLoad.value = true
}

// ─── Computed (unchanged) ─────────────────────────────────────────────────────
const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length)

const unreadNotifications = computed(() => notifications.value.filter((n) => !n.read))

const sortedNotifications = computed(() =>
  [...notifications.value].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1
    try {
      return new Date(b.timestamp) - new Date(a.timestamp)
    } catch {
      return 0
    }
  }),
)

// ─── Public composable ─────────────────────────────────────────────────────────
export function useNotifications() {
  // Initialise the singleton WebSocket now that we are inside setup().
  // If the socket already exists this is a no-op.
  _initWs()

  // Proxy ws controls from the singleton
  const {
    connectionState,
    isConnected,
    isConnecting,
    reconnectAttempts,
    lastError,
    send,
    connect,
    disconnect,
    reconnect,
    cleanup,
  } = _ws

  const connectionStatus = computed(() => ({
    state: connectionState.value,
    connected: isConnected.value,
    connecting: isConnecting.value,
    attempts: reconnectAttempts.value,
    hasError: lastError.value !== null,
    error: lastError.value,
  }))

  /**
   * Subscribe to real-time data-change events for a specific module.
   * The callback fires whenever a matching notification or event arrives
   * on the shared WebSocket, so the caller can re-fetch its own data.
   *
   * Supported modules:
   *   'attendance' | 'schedule' | 'leave' | 'overtime' | 'swap_request'
   *
   * @param {string}   module   - one of the five module names above
   * @param {Function} callback - (eventType: string, payload: any) => void
   * @returns {Function} unsubscribe — also called automatically on unmount
   */
  function onDataUpdate(module, callback) {
    if (!_dataListeners[module]) {
      console.warn(
        `[Notifications] Unknown module "${module}". Valid:`,
        Object.keys(_dataListeners),
      )
      return () => {}
    }
    _dataListeners[module].push(callback)

    const unsubscribe = () => {
      const idx = _dataListeners[module].indexOf(callback)
      if (idx !== -1) _dataListeners[module].splice(idx, 1)
    }

    // Auto-clean when the calling component unmounts
    onUnmounted(unsubscribe)

    return unsubscribe
  }

  return {
    // ── State (unchanged) ────────────────────────────────────────────────────
    notifications,
    isInitialLoad,
    lastUpdateTime,
    isMarkingAsRead,

    // ── Computed (unchanged) ─────────────────────────────────────────────────
    unreadCount,
    unreadNotifications,
    sortedNotifications,
    connectionStatus,

    // ── WebSocket state (unchanged) ──────────────────────────────────────────
    connectionState,
    isConnected,
    isConnecting,
    reconnectAttempts,
    lastError,

    // ── Methods (unchanged) ──────────────────────────────────────────────────
    markAsRead,
    markAllAsRead,
    removeNotification,
    send,
    connect,
    disconnect,
    reconnect,
    requestRefresh,
    clearNotifications,
    cleanup,

    // ── Utilities (unchanged) ────────────────────────────────────────────────
    getNotificationIcon,
    getNotificationIconColor,
    formatTimeAgo,

    // ── NEW: data subscriptions (Dashboard only) ─────────────────────────────
    onDataUpdate,
    lastDataEvent,
  }
}
