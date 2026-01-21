// quasar.config.js
// Configuration for your app (Webpack + CommonJS)

module.exports = function (ctx) {
  return {
    // eslint settings
    eslint: {
      warnings: true,
      errors: true,
    },

    // app boot files
    boot: ['pinia', 'auth', 'axios'],

    // CSS files
    css: ['app.scss'],

    // Quasar extras (icons, fonts)
    extras: ['roboto-font', 'material-icons'],

    // Build configuration
    build: {
      vueRouterMode: 'history', // 'hash' or 'history'
      esbuildTarget: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
        node: 'node20',
      },
      // webpackTranspile: false,
      // webpackTranspileDependencies: [],
    },

    // Development server
    devServer: {
      server: { type: 'http' },
      open: true,
      proxy: {
        '/api': {
          target: 'https://staging.wageyapp.com',
          changeOrigin: true,
          secure: false,
          logLevel: 'debug', // Add this to see proxy logs
        },
        '/user': {
          target: 'https://staging.wageyapp.com',
          changeOrigin: true,
          secure: false,
        },
        '/organization': {
          target: 'https://staging.wageyapp.com',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    // Framework configuration
    framework: {
      config: {},
      css: ['app'],
      plugins: ['Notify', 'Dialog'],
    },

    // Animations
    animations: [],

    // SSR configuration
    ssr: {
      prodPort: 3000,
      middlewares: ['render'],
      pwa: false,
    },

    // PWA configuration
    pwa: {
      workboxMode: 'GenerateSW',
    },

    // Cordova
    cordova: {
      // noIosLegacyBuildFlag: true
    },

    // Capacitor
    capacitor: {
      hideSplashscreen: true,
    },

    // Electron
    electron: {
      preloadScripts: ['electron-preload'],
      inspectPort: 5858,
      bundler: 'builder',
      nodeIntegration: false,
      packager: {
        // Optional packager settings
      },
      builder: {
        appId: 'wagey-admin',
      },
    },

    // Browser Extension (BEX)
    bex: {
      extraScripts: [],
    },
  }
}
