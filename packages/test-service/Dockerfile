# Multi-stage build for test-service
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/test-service/package*.json ./packages/test-service/
COPY packages/shared-types/package*.json ./packages/shared-types/

# Install dependencies
RUN npm ci --workspace=@ai-tutor/test-service --workspace=@ai-tutor/shared-types

# Copy source code
COPY packages/test-service ./packages/test-service
COPY packages/shared-types ./packages/shared-types
COPY tsconfig.json ./

# Build the application
RUN npm run build --workspace=@ai-tutor/test-service
RUN npm run build --workspace=@ai-tutor/shared-types

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/test-service/package*.json ./packages/test-service/
COPY packages/shared-types/package*.json ./packages/shared-types/

# Install production dependencies only
RUN npm ci --workspace=@ai-tutor/test-service --workspace=@ai-tutor/shared-types --omit=dev

# Copy built files from builder
COPY --from=builder /app/packages/test-service/dist ./packages/test-service/dist
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "packages/test-service/dist/index.js"]
