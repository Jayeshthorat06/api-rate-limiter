import { BaseAlgorithm } from './base';
import type { RateLimitResult, StorageAdapter } from '../types';

interface TokenBucketState {
  tokens: number;
  lastRefillAt: number;
}

export class TokenBucket extends BaseAlgorithm {
  readonly name = 'token-bucket' as const;

  async consume(key: string, storage: StorageAdapter): Promise<RateLimitResult> {
    const now = Date.now();
    const storageKey = `${this.config.keyPrefix}:token:${key}`;

    let state = await storage.getJson<TokenBucketState>(storageKey);
    if (!state) {
      state = {
        tokens: this.config.bucketSize,
        lastRefillAt: now,
      };
    }

    const elapsed = now - state.lastRefillAt;
    const refilled = (elapsed / 1000) * this.config.refillRate;
    state.tokens = Math.min(this.config.bucketSize, state.tokens + refilled);
    state.lastRefillAt = now;

    if (state.tokens < 1) {
      const tokensNeeded = 1 - state.tokens;
      const waitMs = Math.ceil((tokensNeeded / this.config.refillRate) * 1000);
      const resetAt = now + waitMs;
      await storage.setJson(storageKey, state, this.config.window * 2);
      return this.buildResult(false, 0, resetAt);
    }

    state.tokens -= 1;
    await storage.setJson(storageKey, state, this.config.window * 2);

    const tokensToFull = this.config.bucketSize - state.tokens;
    const resetAt =
      tokensToFull > 0
        ? now + Math.ceil((tokensToFull / this.config.refillRate) * 1000)
        : now + this.config.window;

    return this.buildResult(
      true,
      this.config.limit - Math.ceil(this.config.bucketSize - state.tokens),
      resetAt
    );
  }
}
