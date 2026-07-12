import { MemoryStorage } from './memory';
import { RedisStorage } from './redis';
import type { StorageAdapter, StorageType } from '../types';

export async function createStorage(
  type: StorageType,
  redisUrl?: string
): Promise<StorageAdapter> {
  if (type === 'redis') {
    if (!redisUrl) {
      throw new Error('redisUrl is required when storage is "redis"');
    }
    const storage = new RedisStorage(redisUrl);
    await storage.connect();
    return storage;
  }
  return new MemoryStorage();
}

export { MemoryStorage, RedisStorage };
