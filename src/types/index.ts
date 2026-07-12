import type { Request } from 'express';

export type AlgorithmType =
  | 'fixed-window'
  | 'sliding-window-log'
  | 'sliding-window-counter'
  | 'leaky-bucket'
  | 'token-bucket';

export type StorageType = 'memory' | 'redis';

export type ClientIdentifierType = 'ip' | 'apiKey' | 'userId';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export interface RateLimiterOptions {
  algorithm: AlgorithmType;
  limit?: number;
  window?: number;
  bucketSize?: number;
  refillRate?: number;
  storage?: StorageType;
  redisUrl?: string;
  keyPrefix?: string;
  clientIdentifier?: ClientIdentifierType;
  keyGenerator?: (req: Request) => string;
  onBlocked?: (req: Request, result: RateLimitResult) => void;
  enableMetrics?: boolean;
  skip?: (req: Request) => boolean;
}

export interface AlgorithmConfig {
  limit: number;
  window: number;
  bucketSize: number;
  refillRate: number;
  keyPrefix: string;
}

export interface MetricsSnapshot {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  blockedByClient: Record<string, number>;
  blockedByAlgorithm: Record<string, number>;
  startedAt: string;
}

export interface RateLimiterAlgorithm {
  readonly name: AlgorithmType;
  consume(key: string, storage: StorageAdapter): Promise<RateLimitResult>;
}

export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  getJson<T>(key: string): Promise<T | null>;
  setJson<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  close(): Promise<void>;
}
