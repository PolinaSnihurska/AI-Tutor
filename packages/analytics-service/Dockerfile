# Multi-stage build for analytics-service
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/analytics-service/package*.json ./packages/analytics-service/
COPY packages/shared-types/package*.json ./packages/shared-types/

# Install dependencies
RUN npm ci --workspace=@ai-tutor/analytics-service --workspace=@ai-tutor/shared-types

# Copy source code
COPY packages/analytics-service ./packages/analytics-service
COPY packages/shared-types ./packages/shared-types
COPY tsconfig.json ./

# Build the application
RUN npm run build --workspace=@ai-tutor/analytics-service
RUN npm run build --workspace=@ai-tutor/shared-types

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/analytics-service/package*.json ./packages/analytics-service/
COPY packages/shared-types/package*.json ./packages/shared-types/

# Install production dependencies only
RUN npm ci --workspace=@ai-tutor/analytics-service --workspace=@ai-tutor/shared-types --omit=dev

# Copy built files from builder
COPY --from=builder /app/packages/analytics-service/dist ./packages/analytics-service/dist
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist

# Copy migration files
COPY packages/analytics-service/src/db/migrations ./packages/analytics-service/src/db/migrations

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "packages/analytics-service/dist/index.js"]
