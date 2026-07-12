import type { AlgorithmConfig, AlgorithmType, RateLimiterAlgorithm } from '../types';
import { FixedWindowCounter } from './fixedWindow';
import { SlidingWindowLog } from './slidingWindowLog';
import { SlidingWindowCounter } from './slidingWindowCounter';
import { LeakyBucket } from './leakyBucket';
import { TokenBucket } from './tokenBucket';

export function createAlgorithm(
  type: AlgorithmType,
  config: AlgorithmConfig
): RateLimiterAlgorithm {
  switch (type) {
    case 'fixed-window':
      return new FixedWindowCounter(config);
    case 'sliding-window-log':
      return new SlidingWindowLog(config);
    case 'sliding-window-counter':
      return new SlidingWindowCounter(config);
    case 'leaky-bucket':
      return new LeakyBucket(config);
    case 'token-bucket':
      return new TokenBucket(config);
    default:
      throw new Error(`Unknown algorithm: ${type}`);
  }
}

export {
  FixedWindowCounter,
  SlidingWindowLog,
  SlidingWindowCounter,
  LeakyBucket,
  TokenBucket,
};
