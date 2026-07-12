import { BaseAlgorithm } from './base';
import type { RateLimitResult, StorageAdapter } from '../types';

interface LeakyBucketState {
  volume: number;
  lastLeakAt: number;
}

export class LeakyBucket extends BaseAlgorithm {
  readonly name = 'leaky-bucket' as const;

  async consume(key: string, storage: StorageAdapter): Promise<RateLimitResult> {
    const now = Date.now();
    const storageKey = `${this.config.keyPrefix}:leaky:${key}`;
    const leakRate = this.config.limit / this.config.window;

    let state = await storage.getJson<LeakyBucketState>(storageKey);
    if (!state) {
      state = { volume: 0, lastLeakAt: now };
    }

    const elapsed = now - state.lastLeakAt;
    const leaked = elapsed * leakRate;
    state.volume = Math.max(0, state.volume - leaked);
    state.lastLeakAt = now;

    if (state.volume + 1 > this.config.bucketSize) {
      const overflow = state.volume + 1 - this.config.bucketSize;
      const resetAt = now + Math.ceil(overflow / leakRate);
      await storage.setJson(storageKey, state, this.config.window * 2);
      return this.buildResult(false, Math.ceil(state.volume), resetAt);
    }

    state.volume += 1;
    await storage.setJson(storageKey, state, this.config.window * 2);

    const drainTime = Math.ceil(state.volume / leakRate);
    const resetAt = now + drainTime;
    return this.buildResult(true, Math.ceil(state.volume), resetAt);
  }
}
