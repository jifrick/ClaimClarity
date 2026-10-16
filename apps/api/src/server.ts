import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config.js';
import { router as apiRouter } from './routes/api.js';

const app = express();

// 1. HTTP Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", env.FRONTEND_ORIGIN || '*'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// 2. Strict CORS Configuration
app.use(cors({
  origin: env.FRONTEND_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-demo-user-id'],
  credentials: true,
}));

// 3. Global Rate Limiter to prevent DoS & abuse
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please wait before making further requests.',
  },
});
app.use('/api/', limiter);

// Strict Body Parsing Limits
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Mount versioned API routes
app.use('/api/v1', apiRouter);

// Centralized safe error handler (Redacts internal stack traces in response)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API Error]:', err.message || err);
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred during processing.',
  });
});

import { getStorage } from './services/storage/index.js';

export function validateStartupConfig(): void {
  // Validate storage adapter initialization (prevents unsafe demo fallback in production)
  const storage = getStorage();
  console.log(`[Storage]: Initialized adapter "${storage.name}" (persistent=${storage.isPersistent})`);
}

if (process.env.NODE_ENV !== 'test') {
  try {
    validateStartupConfig();
    app.listen(env.PORT, () => {
      console.log(`ClaimClarity API Server listening securely on port ${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV} | AI Provider: ${env.AI_PROVIDER} | Storage: ${env.STORAGE_MODE}`);
    });
  } catch (err: any) {
    console.error('[CRITICAL STARTUP FAILURE]:', err.message);
    process.exit(1);
  }
}

export default app;
