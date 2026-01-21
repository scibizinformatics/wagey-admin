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

# Production stage
FROM nginx:alpine as production-stage

# Copy built files from build stage
COPY --from=build-stage /app/dist/spa /usr/share/nginx/html

# Copy custom nginx configuration
# COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/default.conf

# Expose port 80
EXPOSE 90

# Health check - use correct localhost reference
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]