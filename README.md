# Wagey Web Admin (wagey-admin)

Web admin for Wagey

## Install the dependencies
```bash
yarn
# or
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)
```bash
quasar dev
```


### Lint the files
```bash
yarn lint
# or
npm run lint
```


### Format the files
```bash
yarn format
# or
npm run format
```


### Build the app for production
```bash
quasar build
```

### Serve the production build on port 8000

```bash
npm run build
PORT=8000 npm start
```

### Docker (serves on port 8000)

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

### Customize the configuration
See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-webpack/quasar-config-js).
