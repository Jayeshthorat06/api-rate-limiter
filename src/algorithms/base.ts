import type {
  AlgorithmConfig,
  RateLimitResult,
  RateLimiterAlgorithm,
  StorageAdapter,
} from '../types';

export abstract class BaseAlgorithm implements RateLimiterAlgorithm {
  abstract readonly name: RateLimiterAlgorithm['name'];

  constructor(protected readonly config: AlgorithmConfig) {}

  abstract consume(key: string, storage: StorageAdapter): Promise<RateLimitResult>;

  protected buildResult(
    allowed: boolean,
    count: number,
    resetAt: number
  ): RateLimitResult {
    const remaining = Math.max(0, this.config.limit - count);
    const retryAfter = allowed
      ? undefined
      : Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

    return {
      allowed,
      limit: this.config.limit,
      remaining: allowed ? remaining : 0,
      resetAt,
      retryAfter,
    };
  }
}
