# Build stage
FROM node:18-alpine as build-stage

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package.json package-lock.json ./

# Copy project files (needed BEFORE npm ci for Quasar to detect project type)
COPY . .

# Install dependencies (including devDependencies needed for build)
RUN npm ci

# Build the Quasar app for production (SPA mode)
RUN npx quasar build

# Runtime stage - serve the built SPA on port 8000
FROM node:18-alpine as production-stage

WORKDIR /app

# Copy built files and the minimal server
COPY --from=build-stage /app/dist/spa /app/dist/spa
COPY server.js /app/server.js

ENV NODE_ENV=production
ENV PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8000/ || exit 1

CMD ["node", "server.js"]