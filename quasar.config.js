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

    boot: ['pinia', 'auth', 'axios'],
    css: ['app.scss'],
    extras: ['roboto-font', 'material-icons'],

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
        },
        {
          context: ['/communication'],
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
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
