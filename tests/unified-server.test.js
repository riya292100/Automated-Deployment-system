const request = require('supertest');
const apiApp = require('../api-server/index');
const builder = require('../build-server/builder');

describe('Unified Vercel Server & Direct Deployment Suite', () => {
  const directSlug = 'test-direct-vercel-app';

  beforeAll(async () => {
    // Deploy a test site via direct deploy
    await builder.executeDirectDeploy({
      deploymentId: 'dep-direct-test-1',
      projectSlug: directSlug,
      html: '<!DOCTYPE html><html><head><title>Direct App</title></head><body><h1>Hello Vercel Clone</h1></body></html>',
      css: 'body { background: black; color: white; }',
      baseUrl: 'http://localhost:3000',
    });
  });

  describe('GET /api/system/public-info', () => {
    test('should return system platform details and features', async () => {
      const res = await request(apiApp).get('/api/system/public-info');
      expect(res.status).toBe(200);
      expect(res.body.name).toContain('Vercel');
      expect(res.body.features.directDropDeploy).toBe(true);
      expect(res.body.features.gitDeploy).toBe(true);
    });
  });

  describe('POST /api/deploy/direct', () => {
    test('should reject direct deployment without projectName', async () => {
      const res = await request(apiApp).post('/api/deploy/direct').send({ html: '<h1>Test</h1>' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('projectName');
    });

    test('should reject direct deployment without files or html', async () => {
      const res = await request(apiApp)
        .post('/api/deploy/direct')
        .send({ projectName: 'empty-project' });
      expect(res.status).toBe(400);
    });

    test('should accept direct deployment with html string', async () => {
      const res = await request(apiApp).post('/api/deploy/direct').send({
        projectName: 'my-direct-html-app',
        html: '<!DOCTYPE html><html><body><h1>Instant Live Deploy</h1></body></html>',
      });
      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.projectSlug).toBe('my-direct-html-app');
      expect(res.body.previewUrl).toContain('/site/my-direct-html-app/');
    });

    test('should accept direct deployment with files array', async () => {
      const res = await request(apiApp)
        .post('/api/deploy/direct')
        .send({
          projectName: 'my-direct-files-app',
          files: [
            {
              path: 'index.html',
              content: '<!DOCTYPE html><html><body><h1>Files App</h1></body></html>',
            },
            { path: 'style.css', content: 'body { margin: 0; }' },
          ],
        });
      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.projectSlug).toBe('my-direct-files-app');
    });
  });

  describe('Unified Reverse Proxy Routing (/site/:projectSlug/*)', () => {
    test('should serve deployed assets directly on unified server /site/:slug/', async () => {
      const res = await request(apiApp).get(`/site/${directSlug}/index.html`);
      expect(res.status).toBe(200);
      expect(res.text).toContain('Hello Vercel Clone');
      expect(res.headers['x-proxy-origin']).toBeDefined();
    });

    test('should serve CSS asset from deployed project', async () => {
      const res = await request(apiApp).get(`/site/${directSlug}/style.css`);
      expect(res.status).toBe(200);
      expect(res.text).toContain('background: black');
    });

    test('should trigger SPA fallback to index.html for non-asset deep routes', async () => {
      const res = await request(apiApp).get(`/site/${directSlug}/dashboard/analytics`);
      expect(res.status).toBe(200);
      expect(res.text).toContain('Hello Vercel Clone');
      expect(res.headers['x-proxy-origin']).toContain('SPA-Fallback');
    });

    test('should return 404 page for missing project or asset', async () => {
      const res = await request(apiApp).get('/site/non-existent-random-project-xyz/test.js');
      expect(res.status).toBe(404);
      expect(res.text).toContain('404: DEPLOYMENT NOT FOUND');
    });
  });
});
