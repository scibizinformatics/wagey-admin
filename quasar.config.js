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

  return {
    eslint: {
      warnings: true,
      errors: false,
    },

    boot: ['pinia', 'auth', 'axios'],
    css: ['app.scss'],
    extras: ['roboto-font', 'material-icons'],

    build: {
      vueRouterMode: 'history',
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
          context: ['/payroll'],
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
