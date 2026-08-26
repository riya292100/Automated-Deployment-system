const EventEmitter = require('events');

class InMemoryRedis extends EventEmitter {
  constructor() {
    super();
    this.store = new Map();
    this.hashes = new Map();
    this.logsHistory = new Map(); // deploymentId -> Array of logs
    this.expirations = new Map();
    this.isEmulated = true;
    console.log(
      '[Redis] Running in High-Performance In-Memory Emulation Mode (Zero configuration required)'
    );
  }

  async ping() {
    return 'PONG';
  }

  async get(key) {
    if (this.expirations.has(key) && Date.now() > this.expirations.get(key)) {
      this.store.delete(key);
      this.expirations.delete(key);
      return null;
    }
    const val = this.store.get(key);
    return val !== undefined ? val : null;
  }

  async set(key, value, expireSeconds = null) {
    const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
    this.store.set(key, serialized);
    if (expireSeconds) {
      this.expirations.set(key, Date.now() + expireSeconds * 1000);
    }
    return 'OK';
  }

  async del(key) {
    this.expirations.delete(key);
    return this.store.delete(key) ? 1 : 0;
  }

  async hset(hashKey, field, value) {
    if (!this.hashes.has(hashKey)) {
      this.hashes.set(hashKey, new Map());
    }
    const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
    this.hashes.get(hashKey).set(field, serialized);
    return 1;
  }

  async hget(hashKey, field) {
    const hash = this.hashes.get(hashKey);
    if (!hash) return null;
    const val = hash.get(field);
    return val !== undefined ? val : null;
  }

  async hgetall(hashKey) {
    const hash = this.hashes.get(hashKey);
    if (!hash) return {};
    const result = {};
    for (const [k, v] of hash.entries()) {
      try {
        result[k] = JSON.parse(v);
      } catch (_e) {
        result[k] = v;
      }
    }
    return result;
  }

  async publish(channel, message) {
    const msgString = typeof message === 'object' ? JSON.stringify(message) : String(message);

    // Save log history if this is a log channel: logs:{id}
    if (channel.startsWith('logs:')) {
      const deployId = channel.replace('logs:', '');
      if (!this.logsHistory.has(deployId)) {
        this.logsHistory.set(deployId, []);
      }
      this.logsHistory.get(deployId).push({
        timestamp: new Date().toISOString(),
        message: msgString,
      });
    }

    this.emit(channel, msgString);
    this.emit('message', channel, msgString);
    return this.listenerCount(channel);
  }

  subscribe(channel, callback) {
    this.on(channel, callback);
  }

  unsubscribe(channel, callback) {
    this.off(channel, callback);
  }

  getLogs(deploymentId) {
    return this.logsHistory.get(deploymentId) || [];
  }

  async keys(pattern = '*') {
    const allKeys = Array.from(this.store.keys());
    if (pattern === '*') return allKeys;
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return allKeys.filter((k) => regex.test(k));
  }
}

const redisInstance = new InMemoryRedis();
module.exports = redisInstance;
