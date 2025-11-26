import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 3000;

// Enhanced Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      process.env.ADMIN_FRONTEND_URL || 'http://localhost:5174',
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
}));

// Request size limiter
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiter
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP. Please try again later.',
    });
  },
});

app.use(globalRateLimiter);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// Service proxies
app.use(
  '/api/auth',
  createProxyMiddleware({
    target: `http://localhost:${process.env.AUTH_SERVICE_PORT || 3001}`,
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '' },
  })
);

app.use(
  '/api/users',
  createProxyMiddleware({
    target: `http://localhost:${process.env.USER_SERVICE_PORT || 3002}`,
    changeOrigin: true,
    pathRewrite: { '^/api/users': '' },
  })
);

app.use(
  '/api/ai',
  createProxyMiddleware({
    target: `http://localhost:${process.env.AI_SERVICE_PORT || 8000}`,
    changeOrigin: true,
    pathRewrite: { '^/api/ai': '' },
  })
);

app.use(
  '/api/tests',
  createProxyMiddleware({
    target: `http://localhost:${process.env.TEST_SERVICE_PORT || 3003}`,
    changeOrigin: true,
    pathRewrite: { '^/api/tests': '' },
  })
);

app.use(
  '/api/analytics',
  createProxyMiddleware({
    target: `http://localhost:${process.env.ANALYTICS_SERVICE_PORT || 3004}`,
    changeOrigin: true,
    pathRewrite: { '^/api/analytics': '' },
  })
);

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Proxying requests to backend services`);
});
