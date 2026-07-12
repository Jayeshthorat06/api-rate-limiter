import { BaseAlgorithm } from './base';
import type { RateLimitResult, StorageAdapter } from '../types';

interface SlidingCounterState {
  currentWindow: number;
  currentCount: number;
  previousCount: number;
}

export class SlidingWindowCounter extends BaseAlgorithm {
  readonly name = 'sliding-window-counter' as const;

  async consume(key: string, storage: StorageAdapter): Promise<RateLimitResult> {
    const now = Date.now();
    const currentWindow = Math.floor(now / this.config.window);
    const storageKey = `${this.config.keyPrefix}:swc:${key}`;

    let state = await storage.getJson<SlidingCounterState>(storageKey);

    if (!state || state.currentWindow !== currentWindow) {
      state = {
        currentWindow,
        currentCount: 0,
        previousCount: state?.currentWindow === currentWindow - 1
          ? state.currentCount
          : 0,
      };
    }

    state.currentCount += 1;

    const windowElapsed = now - currentWindow * this.config.window;
    const weight = 1 - windowElapsed / this.config.window;
    const weightedCount =
      state.previousCount * weight + state.currentCount;

    await storage.setJson(storageKey, state, this.config.window * 2);

    const resetAt = (currentWindow + 1) * this.config.window;
    return this.buildResult(
      weightedCount <= this.config.limit,
      Math.ceil(weightedCount),
      resetAt
    );
  }
}
