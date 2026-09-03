const request = require('supertest');
const proxyApp = require('../s3-reverse-proxy/index');
const storage = require('../shared/storage');
const redis = require('../shared/redis-client');

describe('S3 Reverse Proxy & Edge Router Suite', () => {
  const testSlug = 'proxy-test-site';

  beforeAll(async () => {
    // Seed test files into storage and Redis
    await storage.putObject(
      `__outputs/${testSlug}/index.html`,
      '<h1>Welcome to Proxy Test</h1>',
      'text/html'
    );
    await storage.putObject(`__outputs/${testSlug}/style.css`, 'body { margin: 0; }', 'text/css');
    await storage.putObject(
      `__outputs/${testSlug}/app.js`,
      'console.log("active");',
      'application/javascript'
    );

    await redis.set(`project:${testSlug}`, {
      projectSlug: testSlug,
      status: 'READY',
      s3Prefix: `__outputs/${testSlug}`,
    });
  });

  afterAll(async () => {
    await redis.del(`project:${testSlug}`);
  });

  test('GET /site/:slug/index.html should serve static HTML with 200 OK', async () => {
    const res = await request(proxyApp).get(`/site/${testSlug}/index.html`).expect(200);

    expect(res.text).toContain('Welcome to Proxy Test');
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.headers['x-proxy-origin']).toBe('Automated-Deployment-S3-Proxy');
  });

  test('GET /site/:slug/style.css should serve CSS with correct Content-Type', async () => {
    const res = await request(proxyApp).get(`/site/${testSlug}/style.css`).expect(200);

    expect(res.text).toBe('body { margin: 0; }');
    expect(res.headers['content-type']).toContain('text/css');
  });

  test('GET /site/:slug/ should automatically serve index.html', async () => {
    const res = await request(proxyApp).get(`/site/${testSlug}/`).expect(200);

    expect(res.text).toContain('Welcome to Proxy Test');
  });

  test('SPA Fallback: non-asset route should fallback to index.html', async () => {
    const res = await request(proxyApp)
      .get(`/site/${testSlug}/dashboard/settings/profile`)
      .expect(200);

    expect(res.text).toContain('Welcome to Proxy Test');
    expect(res.headers['x-proxy-origin']).toBe('Automated-Deployment-S3-Proxy-SPA-Fallback');
  });

  test('GET /site/non-existent-site/ should return 404 deployment error page', async () => {
    const res = await request(proxyApp).get('/site/non-existent-site/index.html').expect(404);

    expect(res.text).toContain('404: DEPLOYMENT NOT FOUND');
    expect(res.text).toContain('non-existent-site');
  });

  test('Subdomain routing: should resolve site from host header or x-project-slug', async () => {
    const res = await request(proxyApp).get('/').set('x-project-slug', testSlug).expect(200);

    expect(res.text).toContain('Welcome to Proxy Test');
  });

  test('GET / on standalone proxy without slug should return welcome page', async () => {
    const res = await request(proxyApp).get('/').expect(200);

    expect(res.text).toContain('S3 Reverse Proxy Online');
  });
});
