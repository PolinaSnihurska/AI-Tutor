# Multi-stage build for admin-frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/admin-frontend/package*.json ./packages/admin-frontend/

# Install dependencies
RUN npm ci --workspace=@ai-tutor/admin-frontend

# Copy source code
COPY packages/admin-frontend ./packages/admin-frontend
COPY tsconfig.json ./

# Build the application
RUN npm run build --workspace=@ai-tutor/admin-frontend

# Production stage with nginx
FROM nginx:alpine

# Copy custom nginx config
COPY packages/admin-frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/packages/admin-frontend/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S nginx-user -u 1001

# Set proper permissions
RUN chown -R nginx-user:nginx-user /usr/share/nginx/html && \
    chown -R nginx-user:nginx-user /var/cache/nginx && \
    chown -R nginx-user:nginx-user /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx-user:nginx-user /var/run/nginx.pid

USER nginx-user

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
