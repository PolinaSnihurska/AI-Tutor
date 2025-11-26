import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger';
import morgan from 'morgan';

// Custom Morgan token for user ID
morgan.token('user-id', (req: Request) => {
  return (req as any).user?.id || 'anonymous';
});

// Custom Morgan token for request body (sanitized)
morgan.token('body', (req: Request) => {
  if (req.body) {
    const sanitized = { ...req.body };
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.refreshToken;
    return JSON.stringify(sanitized);
  }
  return '-';
});

// Morgan format for HTTP logging
export const httpLogger = morgan(
  ':method :url :status :response-time ms - :user-id - :body',
  {
    stream: {
      write: (message: string) => {
        log.http(message.trim());
      },
    },
  }
);

// Request logging middleware with context
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Log request
  log.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.id,
  });
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    
    log[logLevel]('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userId: (req as any).user?.id,
    });
  });
  
  next();
}

// Error logging middleware
export function errorLogger(err: any, req: Request, res: Response, next: NextFunction) {
  log.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    userId: (req as any).user?.id,
    body: req.body,
  });
  
  next(err);
}

// Audit logging for sensitive operations
export function auditLog(action: string, details?: any) {
  log.info('Audit log', {
    action,
    timestamp: new Date().toISOString(),
    ...details,
  });
}
