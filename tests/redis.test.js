const redis = require('../shared/redis-client');

describe('Redis Client & Pub/Sub Service', () => {
  test('should respond to ping with PONG', async () => {
    const ping = await redis.ping();
    expect(ping).toBe('PONG');
  });

  test('should set and get string and JSON values', async () => {
    const payload = { service: 'jest-test', timestamp: Date.now() };
    await redis.set('jest:key', payload);

    const valRaw = await redis.get('jest:key');
    expect(valRaw).toBeDefined();
    const parsed = JSON.parse(valRaw);
    expect(parsed.service).toBe('jest-test');
  });

  test('should publish and subscribe to channel events', (done) => {
    const channel = 'logs:jest-pubsub';
    const testMsg = { step: 'build', status: 'OK' };

    const handler = (msg) => {
      expect(msg).toBeDefined();
      redis.unsubscribe(channel, handler);
      done();
    };

    redis.subscribe(channel, handler);
    redis.publish(channel, testMsg);
  });

  test('should maintain log history per deployment channel', async () => {
    const deployId = 'jest-deploy-hist';
    const channel = `logs:${deployId}`;

    await redis.publish(channel, { message: 'Step 1: Init' });
    await redis.publish(channel, { message: 'Step 2: Done' });

    const logs = redis.getLogs(deployId);
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  test('should handle hashes with hset, hget, and hgetall', async () => {
    await redis.hset('jest:hash', 'field1', { count: 42 });
    const val = await redis.hget('jest:hash', 'field1');
    expect(JSON.parse(val).count).toBe(42);

    const all = await redis.hgetall('jest:hash');
    expect(all.field1).toBeDefined();
  });
});
