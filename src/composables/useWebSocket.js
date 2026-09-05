// composables/useWebSocket.js
import { ref, onUnmounted } from 'vue'

const WS_BASE_URL =
  process.env.VITE_WS_URL ||
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`

// Floor between two browser-triggered immediate retries (see `retryNow`).
const IMMEDIATE_RETRY_INTERVAL = 3000

export const CONNECTION_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
  // Retries are exhausted and nothing further is scheduled. Distinct from
  // DISCONNECTED, which is also what a deliberate `disconnect()` leaves behind:
  // a caller showing connection state has to be able to tell "still trying"
  // from "stopped trying", because only the second one needs a person to act.
  GAVE_UP: 'gave_up',
}

export function useWebSocket(urlOrBuilder, options = {}) {
  const {
    autoConnect = true,
    debug = false,
    // Retried until the socket comes back rather than a fixed ten times. The
    // delay is capped at `maxReconnectDelay`, so an unreachable server costs
    // one handshake every 30s — cheap next to the previous behaviour, where ten
    // attempts exhausted in about five minutes and the bell then stayed dead
    // until the reader happened to reload the whole app. Pass a finite number
    // for a socket that genuinely should give up.
    maxReconnectAttempts = Infinity,
    reconnectDelay = 2000,
    reconnectBackoffMultiplier = 1.5,
    maxReconnectDelay = 30000,
    onMessage,
    onOpen,
    onError,
    onClose,
  } = options

  const connectionState = ref(CONNECTION_STATES.DISCONNECTED)
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const reconnectAttempts = ref(0)
  const lastError = ref(null)

  let ws = null
  let reconnectTimer = null
  let shouldReconnect = true

  const log = (...args) => {
    if (debug) console.log('[useWebSocket]', ...args)
  }

  const logError = (...args) => {
    console.warn('[useWebSocket]', ...args)
  }

  function buildUrl() {
    const path = typeof urlOrBuilder === 'function' ? urlOrBuilder() : urlOrBuilder
    if (!path) return null
    if (path.startsWith('ws://') || path.startsWith('wss://')) return path
    return `${WS_BASE_URL}/${path.replace(/^\//, '')}`
  }

  function connect() {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      log('Already connected or connecting')
      return
    }

    const url = buildUrl()
    if (!url) {
      log('Cannot connect: no URL available')
      return
    }

    log('Connecting to', url)
    connectionState.value = CONNECTION_STATES.CONNECTING
    isConnecting.value = true
    isConnected.value = false

    try {
      ws = new WebSocket(url)

      ws.onopen = () => {
        log('Connected')
        connectionState.value = CONNECTION_STATES.CONNECTED
        isConnected.value = true
        isConnecting.value = false
        reconnectAttempts.value = 0
        lastError.value = null
        onOpen?.()
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          log('Message received:', data)
          onMessage?.(data)
        } catch {
          log('Failed to parse message:', event.data)
          onMessage?.(event.data)
        }
      }

      ws.onerror = (event) => {
        logError('WebSocket error:', event)
        lastError.value = event
        connectionState.value = CONNECTION_STATES.ERROR
        onError?.(event)
      }

      ws.onclose = (event) => {
        log('Connection closed:', event.code, event.reason)
        isConnected.value = false
        isConnecting.value = false
        onClose?.(event)

        if (shouldReconnect) {
          log('Scheduling reconnect...')
          scheduleReconnect()
        } else {
          connectionState.value = CONNECTION_STATES.DISCONNECTED
        }
      }
    } catch (err) {
      logError('Failed to create WebSocket:', err)
      lastError.value = err
      connectionState.value = CONNECTION_STATES.ERROR
      isConnecting.value = false
      if (shouldReconnect) scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer)

    // The cap is enforced here rather than at the call sites, so every path
    // that loses the socket — a close, a failed construction — reaches the same
    // decision and leaves the same state behind.
    if (reconnectAttempts.value >= maxReconnectAttempts) {
      connectionState.value = CONNECTION_STATES.GAVE_UP
      logError(`Giving up after ${reconnectAttempts.value} reconnect attempts`)
      return
    }

    connectionState.value = CONNECTION_STATES.RECONNECTING
    reconnectAttempts.value++

    // A timer is wasted work while the browser knows it has no network: every
    // attempt fails instantly and does nothing but inflate the backoff, so a
    // laptop that spends ten minutes offline comes back with the delay already
    // pinned at its ceiling. Wait for the `online` event to drive the retry.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      log('Offline — deferring reconnect until the browser reports a network')
      return
    }

    const delay = Math.min(
      reconnectDelay * Math.pow(reconnectBackoffMultiplier, reconnectAttempts.value - 1),
      maxReconnectDelay,
    )

    log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.value}/${maxReconnectAttempts})`)

    reconnectTimer = setTimeout(() => {
      if (shouldReconnect) connect()
    }, delay)
  }

  /**
   * Retry now, from a clean backoff.
   *
   * Two moments make a pending timer the wrong thing to wait for: the network
   * coming back, and a tab being looked at again after the machine slept
   * through an outage (which can leave a dead socket with no timer pending at
   * all, since a sleeping tab's `setTimeout` does not fire on schedule). Both
   * are the browser telling us the situation changed, so the backoff is reset
   * and the attempt made immediately — this is also the one path that revives
   * a socket that has already given up.
   */
  let lastImmediateRetry = 0

  function retryNow(reason) {
    if (!shouldReconnect) return
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return
    // Both triggers can fire repeatedly — a flapping connection raises `online`
    // more than once, and switching tabs raises `visibilitychange` every time.
    // Since each call resets the backoff to zero, an unthrottled version would
    // turn that into a handshake per event against a server that is still down,
    // which is precisely what the backoff exists to avoid.
    const now = Date.now()
    if (now - lastImmediateRetry < IMMEDIATE_RETRY_INTERVAL) {
      log(`${reason} — ignored, retried moments ago`)
      return
    }
    lastImmediateRetry = now

    log(`${reason} — reconnecting immediately`)
    clearTimeout(reconnectTimer)
    reconnectAttempts.value = 0
    connect()
  }

  const handleOnline = () => retryNow('Browser reports it is back online')
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') retryNow('Tab is visible again')
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)
  }

  function disconnect() {
    shouldReconnect = false
    clearTimeout(reconnectTimer)

    if (ws) {
      ws.onopen = null
      ws.onmessage = null
      ws.onerror = null
      ws.onclose = null
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, 'Manual disconnect')
      }
      ws = null
    }

    connectionState.value = CONNECTION_STATES.DISCONNECTED
    isConnected.value = false
    isConnecting.value = false
  }

  function reconnect() {
    shouldReconnect = true
    reconnectAttempts.value = 0
    disconnect()
    // Stored in `reconnectTimer` like every other timer here, so `cleanup()`'s
    // clearTimeout covers it. Unstored, an unmount inside this 100ms window let
    // the callback run afterwards and open a socket owned by nothing — whose
    // onclose then scheduled its own retries, with no one left to stop them.
    reconnectTimer = setTimeout(() => {
      shouldReconnect = true
      connect()
    }, 100)
  }

  function send(data) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      log('Cannot send: WebSocket not open', ws?.readyState)
      return false
    }

    try {
      const payload = typeof data === 'string' ? data : JSON.stringify(data)
      ws.send(payload)
      return true
    } catch (err) {
      if (err.message?.includes('message channel closed')) {
        log('Message channel closed, attempting reconnect')
        reconnect()
        return false
      }
      log('Failed to send:', err)
      return false
    }
  }

  function cleanup() {
    shouldReconnect = false
    clearTimeout(reconnectTimer)
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
    disconnect()
  }

  if (autoConnect) {
    connect()
  }

  onUnmounted(() => {
    cleanup()
  })

  return {
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
  }
}
