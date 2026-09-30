import { MemoryStorage } from '../storage/memory';
import { createAlgorithm } from '../algorithms';
import type { AlgorithmConfig, AlgorithmType } from '../types';

const config: AlgorithmConfig = {
  limit: 3,
  window: 1000,
  bucketSize: 3,
  refillRate: 3,
  keyPrefix: 'test',
};

const algorithms: AlgorithmType[] = [
  'fixed-window',
  'sliding-window-log',
  'sliding-window-counter',
  'leaky-bucket',
  'token-bucket',
];

async function testAlgorithm(type: AlgorithmType): Promise<void> {
  const storage = new MemoryStorage();
  const algorithm = createAlgorithm(type, config);
  const key = `client-${type}`;

  let allowed = 0;
  let blocked = 0;

  for (let i = 0; i < 5; i++) {
    const result = await algorithm.consume(key, storage);
    if (result.allowed) allowed++;
    else blocked++;
  }

  console.log(
    `[${type}] allowed=${allowed}, blocked=${blocked} (expected: 3 allowed, 2 blocked)`
  );

  const pass = allowed === 3 && blocked === 2;
  if (!pass) {
    throw new Error(`Algorithm ${type} failed: got ${allowed}/${blocked}`);
  }

  await storage.close();
}

async function runTests(): Promise<void> {
  console.log('Running rate limiter algorithm tests...\n');

  for (const type of algorithms) {
    await testAlgorithm(type);
  }

  console.log('\nAll tests passed.');
}

runTests().catch((err) => {
  console.error('Tests failed:', err.message);
  process.exit(1);
});


// This is for demo