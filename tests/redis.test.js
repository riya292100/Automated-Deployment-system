const assert = require('assert');
const redis = require('../shared/redis-client');

async function runRedisTests() {
  console.log('--- Testing Redis Service ---');

  // Test 1: Ping
  const ping = await redis.ping();
  assert.strictEqual(ping, 'PONG');
  console.log('✔ redis.ping returned PONG');

  // Test 2: Set & Get
  await redis.set('test:key', { name: 'deployment-system', status: 'OK' });
  const valRaw = await redis.get('test:key');
  const val = JSON.parse(valRaw);
  assert.strictEqual(val.name, 'deployment-system');
  assert.strictEqual(val.status, 'OK');
  console.log('✔ redis.set and redis.get working');

  // Test 3: Pub/Sub
  let receivedMessage = null;
  const channel = 'logs:test-deploy';
  const handler = (msg) => {
    receivedMessage = msg;
  };

  redis.subscribe(channel, handler);
  await redis.publish(channel, { message: 'Deploy step 1 finished' });
  
  assert.ok(receivedMessage !== null);
  console.log('✔ redis.publish and redis.subscribe delivered event');

  // Test 4: Logs history retention
  const history = redis.getLogs('test-deploy');
  assert.ok(history.length > 0);
  console.log(`✔ redis.getLogs preserved ${history.length} log entry`);

  redis.unsubscribe(channel, handler);
  console.log('✅ Redis tests passed!\n');
}

module.exports = runRedisTests;

if (require.main === module) {
  runRedisTests().catch(e => { console.error(e); process.exit(1); });
}
