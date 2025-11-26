import { Request, Response, NextFunction } from 'express';
import { dbQueryDuration, httpRequestDuration } from './monitoring';
import { log } from './logger';

// Performance timing utility
export class PerformanceTimer {
  private startTime: number;
  private marks: Map<string, number>;

  constructor() {
    this.startTime = Date.now();
    this.marks = new Map();
  }

  mark(name: string): void {
    this.marks.set(name, Date.now());
  }

  measure(name: string, startMark?: string): number {
    const endTime = Date.now();
    const startTime = startMark ? this.marks.get(startMark) || this.startTime : this.startTime;
    const duration = endTime - startTime;
    
    log.debug(`Performance: ${name}`, { duration });
    return duration;
  }

  getDuration(): number {
    return Date.now() - this.startTime;
  }

  getMarks(): Record<string, number> {
    const marks: Record<string, number> = {};
    this.marks.forEach((time, name) => {
      marks[name] = time - this.startTime;
    });
    return marks;
  }
}

// Middleware to track API response times
export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const timer = new PerformanceTimer();
  (req as any).perfTimer = timer;

  // Track response time
  res.on('finish', () => {
    const duration = timer.getDuration();
    const route = req.route?.path || req.path;
    
    // Log slow requests
    if (duration > 2000) {
      log.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        route,
        duration,
        userId: (req as any).user?.id,
      });
    }
    
    // Track in Prometheus
    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode,
      },
      duration / 1000
    );
  });

  next();
}

// Database query performance tracking
export async function trackQuery<T>(
  operation: string,
  table: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    
    // Log slow queries
    if (duration > 1000) {
      log.warn('Slow database query', {
        operation,
        table,
        duration,
      });
    }
    
    // Track in Prometheus
    dbQueryDuration.observe({ operation, table }, duration / 1000);
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    dbQueryDuration.observe({ operation, table }, duration / 1000);
    throw error;
  }
}

// Custom performance event tracking
export interface PerformanceEvent {
  name: string;
  duration: number;
  metadata?: Record<string, any>;
}

export function trackPerformanceEvent(event: PerformanceEvent): void {
  log.info('Performance event', {
    event: event.name,
    duration: event.duration,
    ...event.metadata,
  });
  
  // Send to analytics if needed
  if (event.duration > 5000) {
    log.warn('Long-running operation', {
      event: event.name,
      duration: event.duration,
      ...event.metadata,
    });
  }
}

// Real User Monitoring (RUM) data collection
export interface RUMData {
  pageLoadTime?: number;
  domContentLoaded?: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  timeToInteractive?: number;
  resourceTimings?: Array<{
    name: string;
    duration: number;
    size: number;
  }>;
  userAgent: string;
  url: string;
  userId?: string;
}

export function collectRUMData(req: Request, res: Response) {
  const rumData: RUMData = req.body;
  
  log.info('RUM data collected', {
    url: rumData.url,
    pageLoadTime: rumData.pageLoadTime,
    userId: rumData.userId,
    userAgent: rumData.userAgent,
  });
  
  // Log slow page loads
  if (rumData.pageLoadTime && rumData.pageLoadTime > 3000) {
    log.warn('Slow page load', {
      url: rumData.url,
      pageLoadTime: rumData.pageLoadTime,
      userId: rumData.userId,
    });
  }
  
  res.status(200).json({ success: true });
}

// API endpoint performance summary
export interface EndpointPerformance {
  endpoint: string;
  method: string;
  avgResponseTime: number;
  p50: number;
  p95: number;
  p99: number;
  requestCount: number;
  errorRate: number;
}

// Memory usage tracking
export function trackMemoryUsage(): void {
  const usage = process.memoryUsage();
  
  log.debug('Memory usage', {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024),
    rss: Math.round(usage.rss / 1024 / 1024),
  });
  
  // Warn on high memory usage
  const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;
  if (heapUsedPercent > 90) {
    log.warn('High memory usage detected', {
      heapUsedPercent: heapUsedPercent.toFixed(2),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    });
  }
}

// CPU usage tracking
export function trackCPUUsage(): void {
  const usage = process.cpuUsage();
  
  log.debug('CPU usage', {
    user: usage.user,
    system: usage.system,
  });
}

// Event loop lag monitoring
let lastCheck = Date.now();
export function trackEventLoopLag(): void {
  const now = Date.now();
  const lag = now - lastCheck - 1000; // Expected 1 second interval
  lastCheck = now;
  
  if (lag > 100) {
    log.warn('Event loop lag detected', { lag });
  }
}

// Start periodic monitoring
export function startPerformanceMonitoring(interval: number = 60000): NodeJS.Timeout {
  return setInterval(() => {
    trackMemoryUsage();
    trackCPUUsage();
    trackEventLoopLag();
  }, interval);
}
