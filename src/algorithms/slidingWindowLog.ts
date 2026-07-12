import { BaseAlgorithm } from './base';
import type { RateLimitResult, StorageAdapter } from '../types';

export class SlidingWindowLog extends BaseAlgorithm {
  readonly name = 'sliding-window-log' as const;

  async consume(key: string, storage: StorageAdapter): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - this.config.window;
    const storageKey = `${this.config.keyPrefix}:swl:${key}`;

    const timestamps = (await storage.getJson<number[]>(storageKey)) || [];
    const validTimestamps = timestamps.filter((ts) => ts > windowStart);

    if (validTimestamps.length >= this.config.limit) {
      const oldest = validTimestamps[0];
      const resetAt = oldest + this.config.window;
      return this.buildResult(false, validTimestamps.length, resetAt);
    }

    validTimestamps.push(now);
    await storage.setJson(storageKey, validTimestamps, this.config.window);

    const resetAt = validTimestamps[0] + this.config.window;
    return this.buildResult(true, validTimestamps.length, resetAt);
  }
}
