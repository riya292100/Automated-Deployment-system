const assert = require('assert');
const http = require('http');
const apiApp = require('../api-server/index');
const proxyApp = require('../s3-reverse-proxy/index');

async function runApiAndProxyTests() {
  console.log('--- Testing API Server & Reverse Proxy ---');

  // Start test servers
  const apiServer = apiApp.listen(9099);
  const proxyServer = proxyApp.listen(8099);

  const request = (port, path, method = 'GET', body = null) => {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const req = http.request({
        hostname: 'localhost',
        port,
        path,
        method,
        headers: payload ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        } : {}
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          let parsed = data;
          try { parsed = JSON.parse(data); } catch(e) {}
          resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: data });
        });
      });
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  };

  try {
    // 1. Health check
    const health = await request(9099, '/api/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.status, 'HEALTHY');
    console.log('✔ API /api/health returned 200 HEALTHY');

    // 2. Analytics
    const analytics = await request(9099, '/api/analytics');
    assert.strictEqual(analytics.status, 200);
    assert.ok(analytics.data.cacheHitRate);
    console.log('✔ API /api/analytics returned 200');

    // 3. Reverse Proxy Route Test
    const proxyRes = await request(8099, '/site/test-sample-project/index.html');
    assert.strictEqual(proxyRes.status, 200);
    assert.ok(proxyRes.headers['content-type'].includes('text/html'));
    console.log('✔ Reverse Proxy /site/test-sample-project/ returned 200 with HTML content');

    // 4. Reverse Proxy SPA Fallback Test
    const spaRes = await request(8099, '/site/test-sample-project/dashboard/settings');
    assert.strictEqual(spaRes.status, 200);
    assert.ok(spaRes.headers['x-proxy-origin'].includes('Fallback'));
    console.log('✔ Reverse Proxy SPA Fallback correctly served index.html on deep client route');

    console.log('✅ API & Reverse Proxy tests passed!\n');
  } finally {
    apiServer.close();
    proxyServer.close();
  }
}

module.exports = runApiAndProxyTests;

if (require.main === module) {
  runApiAndProxyTests().catch(e => { console.error(e); process.exit(1); });
}
