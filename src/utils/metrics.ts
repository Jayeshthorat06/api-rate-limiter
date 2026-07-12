import type { AlgorithmType, MetricsSnapshot } from '../types';

class MetricsCollector {
  private totalRequests = 0;
  private allowedRequests = 0;
  private blockedRequests = 0;
  private blockedByClient: Record<string, number> = {};
  private blockedByAlgorithm: Record<string, number> = {};
  private readonly startedAt = new Date().toISOString();

  recordRequest(allowed: boolean, clientKey: string, algorithm: AlgorithmType): void {
    this.totalRequests++;
    if (allowed) {
      this.allowedRequests++;
      return;
    }

    this.blockedRequests++;
    this.blockedByClient[clientKey] = (this.blockedByClient[clientKey] || 0) + 1;
    this.blockedByAlgorithm[algorithm] =
      (this.blockedByAlgorithm[algorithm] || 0) + 1;
  }

  getSnapshot(): MetricsSnapshot {
    return {
      totalRequests: this.totalRequests,
      allowedRequests: this.allowedRequests,
      blockedRequests: this.blockedRequests,
      blockedByClient: { ...this.blockedByClient },
      blockedByAlgorithm: { ...this.blockedByAlgorithm },
      startedAt: this.startedAt,
    };
  }

  reset(): void {
    this.totalRequests = 0;
    this.allowedRequests = 0;
    this.blockedRequests = 0;
    this.blockedByClient = {};
    this.blockedByAlgorithm = {};
  }
}

export const metrics = new MetricsCollector();

export function logBlockedRequest(
  clientKey: string,
  algorithm: AlgorithmType,
  path: string
): void {
  console.warn(
    `[RateLimiter] BLOCKED | client=${clientKey} | algorithm=${algorithm} | path=${path}`
  );
}
