// quasar.config.js
import { fileURLToPath } from 'url'
import path, { dirname } from 'path'
import { defineConfig } from '#q-app/wrappers'
import webpack from 'webpack'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig((ctx) => {
  // Resolve API base at build time — never reaches the browser as process.env
  const apiBaseUrl = process.env.API_BASE_URL || 'https://staging.wageyapp.com'
  const wsUrl = process.env.VITE_WS_URL || 'wss://staging.wageyapp.com'

  return {
    eslint: {
      warnings: true,
      errors: true,
    },

    boot: ['pinia', 'auth', 'axios', 'toast', 'suppressExtensionErrors', 'dialogA11y'],
    css: ['app.scss'],
    // `material-icons-outlined` backs the `o_` icon prefix. The navigation rail
    // uses it for inactive items and swaps to the filled variant for the active
    // one, so selection is carried by the glyph's weight rather than by a
    // highlight behind it. Without this extra, every `o_*` icon renders blank.
    extras: ['roboto-font', 'material-icons', 'material-icons-outlined'],

    babel: {
      presets: [['@quasar/babel-preset-app', {}]],
    },

    build: {
      vueRouterMode: 'hash',
      esbuildTarget: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
        node: 'node20',
        favicon: 'favicon.ico',
      },
      chainWebpack(chain) {
        chain.resolve.alias.set('@', path.resolve(__dirname, 'src'))

        // ── DefinePlugin: replaces process.env.API_BASE_URL with a string
        // literal at compile time so `process` never reaches the browser.
        // JSON.stringify is required — it turns the value into a quoted string
        // in the bundle: process.env.API_BASE_URL → "https://staging.wageyapp.com"
        chain.plugin('define-env').use(webpack.DefinePlugin, [
          {
            'process.env.API_BASE_URL': JSON.stringify(apiBaseUrl),
            'process.env.VITE_WS_URL': JSON.stringify(wsUrl),
          },
        ])
      },
    },

    devServer: {
      server: { type: 'http' },
      open: true,
      // ── Error overlay filter ──
      // "ResizeObserver loop completed with undelivered notifications" is a
      // browser-level notice, not an application error: Quasar's own
      // QResizeObserver (QTable, QScrollArea, QSelect, QTabs) can settle a
      // layout over two observation passes, and the browser reports the second
      // pass this way. webpack-dev-server surfaces every window `error` as a
      // full-screen overlay, so this benign notice was blanking the app in dev.
      // Filtered here rather than globally so real runtime errors still stop us.
      client: {
        overlay: {
          runtimeErrors: (error) => !/ResizeObserver loop/i.test(error?.message ?? ''),
        },
      },
      proxy: [
        {
          context: ['/api'],
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
          logLevel: 'debug',
        },
        {
          context: ['/ws/notifications'],
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        {
          context: ['/user'],
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },
        {
          context: ['/organization'],
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
          logLevel: 'debug',
        },
        {
          context: ['/communication'],
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
          logLevel: 'debug',
        },
        {
          context: ['/attendance'],
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },
        {
          // Only proxy actual API calls — not the bare /payroll SPA route.
          // Without this, refreshing /app/payroll forwards the request to
          // Django instead of letting Quasar's history-mode router handle it.
          context: [
            '/payroll/admin',
            '/payroll/payroll-components',
            '/payroll/payroll-component-types',
            '/payroll/pay-structures',
            '/payroll/cost-centers',
            '/payroll/overtime-list',
            '/payroll/overtime-categories',
            '/payroll/overtime-approve',
            '/payroll/contributions',
            '/payroll/annual-contributions',
            '/payroll/employee-contributions',
            '/payroll/department-contributions',
            '/payroll/payroll-groups',
            '/payroll/payment-methods',
          ],
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },
        {
          context: ['/cash_advance'],
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },
        {
          context: ['/contracts'],
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },
        {
          context: ['/access'],
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },
        {
          context: ['/admin'],
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },
      ],
    },

    framework: {
      config: {},
      css: ['app'],
      plugins: ['Notify', 'Dialog'],
    },

    animations: [],

    ssr: {
      prodPort: 3000,
      middlewares: ['render'],
      pwa: false,
    },

    pwa: {
      workboxMode: 'GenerateSW',
    },

    cordova: {},

    capacitor: {
      hideSplashscreen: true,
    },

    electron: {
      preloadScripts: ['electron-preload'],
      inspectPort: 5858,
      bundler: 'builder',
      nodeIntegration: false,
      packager: {},
      builder: {
        appId: 'wagey-admin',
      },
    },

    bex: {
      extraScripts: [],
    },
  }
})
