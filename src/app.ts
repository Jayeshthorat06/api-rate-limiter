import 'dotenv/config';
import express, { Request, Response } from 'express';
import { rateLimiter } from './middleware/rateLimiter';
import type { AlgorithmType, StorageType } from './types';

const PORT = parseInt(process.env.PORT || '3000', 10);
const ALGORITHM = (process.env.ALGORITHM || 'fixed-window') as AlgorithmType;
const STORAGE = (process.env.STORAGE || 'memory') as StorageType;

const app = express();
app.use(express.json());

const limiter = rateLimiter({
  algorithm: ALGORITHM,
  limit: parseInt(process.env.LIMIT || '10', 10),
  window: parseInt(process.env.WINDOW_MS || '60000', 10),
  bucketSize: parseInt(process.env.BUCKET_SIZE || '10', 10),
  refillRate: parseFloat(process.env.REFILL_RATE || '1'),
  storage: STORAGE,
  redisUrl: process.env.REDIS_URL,
  clientIdentifier: 'ip',
  enableMetrics: true,
  skip: (req) => req.path === '/health' || req.path === '/metrics',
});

app.use(limiter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/data', (_req: Request, res: Response) => {
  res.json({
    message: 'Request allowed',
    data: { id: 1, value: 'sample' },
  });
});

app.get('/metrics', (_req: Request, res: Response) => {
  res.json({
    algorithm: ALGORITHM,
    storage: STORAGE,
    ...limiter.getMetrics(),
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'API Rate Limiter Demo',
    algorithm: ALGORITHM,
    storage: STORAGE,
    endpoints: {
      health: 'GET /health',
      data: 'GET /api/data (rate limited)',
      metrics: 'GET /metrics',
    },
    headers: {
      'X-RateLimit-Limit': 'Max requests per window',
      'X-RateLimit-Remaining': 'Remaining requests',
      'X-RateLimit-Reset': 'Window reset (unix timestamp)',
      'Retry-After': 'Seconds to wait (on 429)',
    },
    clientIdentification: ['ip (default)', 'x-api-key header', 'x-user-id header'],
    algorithms: [
      'fixed-window',
      'sliding-window-log',
      'sliding-window-counter',
      'leaky-bucket',
      'token-bucket',
    ],
  });
});

app.listen(PORT, () => {
  console.log(`Rate limiter server running on http://localhost:${PORT}`);
  console.log(`Algorithm: ${ALGORITHM} | Storage: ${STORAGE}`);
  console.log(`Limit: ${process.env.LIMIT || 10} req / ${process.env.WINDOW_MS || 60000}ms`);
});

process.on('SIGINT', async () => {
  await limiter.close();
  process.exit(0);
});
