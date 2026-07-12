import { BaseAlgorithm } from './base';
import type { RateLimitResult, StorageAdapter } from '../types';

export class FixedWindowCounter extends BaseAlgorithm {
  readonly name = 'fixed-window' as const;

  async consume(key: string, storage: StorageAdapter): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = Math.floor(now / this.config.window) * this.config.window;
    const resetAt = windowStart + this.config.window;
    const storageKey = `${this.config.keyPrefix}:fixed:${key}:${windowStart}`;

    const count = await storage.incr(storageKey);

    if (count === 1) {
      await storage.set(storageKey, '1', this.config.window);
    }

    return this.buildResult(count <= this.config.limit, count, resetAt);
  }
}
