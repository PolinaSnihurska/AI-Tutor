import { Request, Response, NextFunction } from 'express';
import { HealthCheckResult } from '@ai-tutor/shared-types';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import client from 'prom-client';

// Initialize Prometheus metrics
const register = new client.Registry();

// Default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

export const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const cacheHitRate = new client.Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'result'],
  registers: [register],
});

// Initialize Sentry
export function initializeSentry(dsn?: string) {
  if (!dsn) {
    console.warn('Sentry DSN not provided, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: undefined as any }),
      new ProfilingIntegration(),
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });

  console.log('Sentry initialized successfully');
}

// Sentry request handler middleware
export function sentryRequestHandler() {
  return Sentry.Handlers.requestHandler();
}

// Sentry tracing middleware
export function sentryTracingHandler() {
  return Sentry.Handlers.tracingHandler();
}

// Sentry error handler middleware
export function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler();
}

// Prometheus metrics middleware
export function metricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    activeConnections.inc();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.path;
      
      httpRequestDuration.observe(
        {
          method: req.method,
          route,
          status_code: res.statusCode,
        },
        duration
      );

      httpRequestTotal.inc({
        method: req.method,
        route,
        status_code: res.statusCode,
      });

      activeConnections.dec();
    });

    next();
  };
}

// Expose metrics endpoint
export function getMetrics() {
  return register.metrics();
}

// Database query tracking
export async function trackDbQuery<T>(
  operation: string,
  table: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await queryFn();
    const duration = (Date.now() - start) / 1000;
    dbQueryDuration.observe({ operation, table }, duration);
    return result;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    dbQueryDuration.observe({ operation, table }, duration);
    throw error;
  }
}

// Cache operation tracking
export function trackCacheOperation(operation: 'get' | 'set' | 'del', result: 'hit' | 'miss' | 'success' | 'error') {
  cacheHitRate.inc({ operation, result });
}

// Health check utility
export async function performHealthCheck(
  serviceName: string,
  version: string,
  checks: {
    [key: string]: () => Promise<{ status: 'pass' | 'fail'; message?: string; responseTime?: number }>;
  }
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const checkResults: HealthCheckResult['checks'] = {};
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  for (const [name, checkFn] of Object.entries(checks)) {
    try {
      const checkStart = Date.now();
      const result = await checkFn();
      checkResults[name] = {
        ...result,
        responseTime: Date.now() - checkStart,
      };

      if (result.status === 'fail') {
        overallStatus = overallStatus === 'healthy' ? 'degraded' : 'unhealthy';
      }
    } catch (error) {
      checkResults[name] = {
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - checkStart,
      };
      overallStatus = 'unhealthy';
    }
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    service: serviceName,
    version,
    uptime: process.uptime(),
    checks: checkResults,
  };
}

// Capture exception with context
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
}

// Capture message
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}
