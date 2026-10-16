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

if (process.env.NODE_ENV !== 'test') {
  app.listen(env.PORT, () => {
    console.log(`ClaimClarity API Server listening securely on port ${env.PORT}`);
    console.log(`Environment: ${env.NODE_ENV} | AI Provider Mode: ${env.AI_PROVIDER}`);
  });
}

export default app;
