// composables/useWebSocket.js
import { ref, onUnmounted } from 'vue'

const WS_BASE_URL =
  import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`

export const CONNECTION_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
}

export function useWebSocket(urlOrBuilder, options = {}) {
  const {
    autoConnect = true,
    debug = false,
    maxReconnectAttempts = 10,
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
        } catch (e) {
          log('Failed to parse message:', event.data)
          onMessage?.(event.data)
        }
      }

      ws.onerror = (event) => {
        log('WebSocket error:', event)
        lastError.value = event
        connectionState.value = CONNECTION_STATES.ERROR
        onError?.(event)
      }

      ws.onclose = (event) => {
        log('Connection closed:', event.code, event.reason)
        isConnected.value = false
        isConnecting.value = false
        onClose?.(event)

        if (shouldReconnect && reconnectAttempts.value < maxReconnectAttempts) {
          scheduleReconnect()
        } else {
          connectionState.value = CONNECTION_STATES.DISCONNECTED
        }
      }
    } catch (err) {
      log('Failed to create WebSocket:', err)
      lastError.value = err
      connectionState.value = CONNECTION_STATES.ERROR
      isConnecting.value = false
      if (shouldReconnect) scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    connectionState.value = CONNECTION_STATES.RECONNECTING
    reconnectAttempts.value++

    const delay = Math.min(
      reconnectDelay * Math.pow(reconnectBackoffMultiplier, reconnectAttempts.value - 1),
      maxReconnectDelay,
    )

    log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.value}/${maxReconnectAttempts})`)

    reconnectTimer = setTimeout(() => {
      if (shouldReconnect) connect()
    }, delay)
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
    setTimeout(() => {
      shouldReconnect = true
      connect()
    }, 100)
  }

  function send(data) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      log('Cannot send: WebSocket not open')
      return false
    }

    try {
      const payload = typeof data === 'string' ? data : JSON.stringify(data)
      ws.send(payload)
      return true
    } catch (err) {
      log('Failed to send:', err)
      return false
    }
  }

  function cleanup() {
    shouldReconnect = false
    clearTimeout(reconnectTimer)
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
