import type { NextFunction, Request, Response } from 'express';
import { createAlgorithm } from '../algorithms';
import { createStorage } from '../storage';
import { getClientKey } from '../utils/clientIdentifier';
import { logBlockedRequest, metrics } from '../utils/metrics';
import type {
  AlgorithmConfig,
  RateLimiterOptions,
  StorageAdapter,
} from '../types';

export interface RateLimiterMiddleware {
  (req: Request, res: Response, next: NextFunction): Promise<void>;
  getMetrics: () => ReturnType<typeof metrics.getSnapshot>;
  close: () => Promise<void>;
}

const DEFAULTS = {
  limit: 100,
  window: 60_000,
  bucketSize: 100,
  refillRate: 1,
  keyPrefix: 'ratelimit',
  storage: 'memory' as const,
  clientIdentifier: 'ip' as const,
  enableMetrics: true,
};

export async function createRateLimiter(
  options: RateLimiterOptions
): Promise<RateLimiterMiddleware> {
  const config: AlgorithmConfig = {
    limit: options.limit ?? DEFAULTS.limit,
    window: options.window ?? DEFAULTS.window,
    bucketSize: options.bucketSize ?? options.limit ?? DEFAULTS.bucketSize,
    refillRate: options.refillRate ?? DEFAULTS.refillRate,
    keyPrefix: options.keyPrefix ?? DEFAULTS.keyPrefix,
  };

  const storage: StorageAdapter = await createStorage(
    options.storage ?? DEFAULTS.storage,
    options.redisUrl
  );

  const algorithm = createAlgorithm(options.algorithm, config);

  const middleware = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (options.skip?.(req)) {
      return next();
    }

    const clientKey = options.keyGenerator
      ? options.keyGenerator(req)
      : getClientKey(req, options.clientIdentifier ?? DEFAULTS.clientIdentifier);

    try {
      const result = await algorithm.consume(clientKey, storage);

      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

      if (options.enableMetrics ?? DEFAULTS.enableMetrics) {
        metrics.recordRequest(result.allowed, clientKey, options.algorithm);
      }

      if (!result.allowed) {
        if (result.retryAfter) {
          res.setHeader('Retry-After', result.retryAfter);
        }

        logBlockedRequest(clientKey, options.algorithm, req.path);
        options.onBlocked?.(req, result);

        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: result.retryAfter,
          limit: result.limit,
          resetAt: result.resetAt,
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  middleware.getMetrics = () => metrics.getSnapshot();
  middleware.close = () => storage.close();

  return middleware;
}

export function rateLimiter(options: RateLimiterOptions): RateLimiterMiddleware {
  let initPromise: Promise<RateLimiterMiddleware> | null = null;
  let instance: RateLimiterMiddleware | null = null;

  const getInstance = (): Promise<RateLimiterMiddleware> => {
    if (instance) return Promise.resolve(instance);
    if (!initPromise) {
      initPromise = createRateLimiter(options).then((mw) => {
        instance = mw;
        return mw;
      });
    }
    return initPromise;
  };

  const wrapper = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const mw = await getInstance();
    return mw(req, res, next);
  };

  wrapper.getMetrics = () => {
    if (!instance) {
      return metrics.getSnapshot();
    }
    return instance.getMetrics();
  };

  wrapper.close = async () => {
    if (instance) {
      await instance.close();
      instance = null;
      initPromise = null;
    }
  };

  return wrapper;
}
