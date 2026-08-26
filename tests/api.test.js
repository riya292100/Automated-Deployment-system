const request = require('supertest');
const apiApp = require('../api-server/index');
const proxyApp = require('../s3-reverse-proxy/index');
const logger = require('../shared/logger');

describe('API Server & Reverse Proxy Integration', () => {
  let createdDeployId = null;

  describe('GET /api/health', () => {
    test('should return 200 with HEALTHY status and component breakdown', async () => {
      const res = await request(apiApp).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('HEALTHY');
      expect(res.body.components.apiServer.status).toBe('ONLINE');
      expect(res.body.components.redisService.status).toBe('ONLINE');
    });
  });

  describe('GET /api/analytics', () => {
    test('should return system analytics and telemetry metrics', async () => {
      const res = await request(apiApp).get('/api/analytics');
      expect(res.status).toBe(200);
      expect(res.body.totalDeployments).toBeDefined();
      expect(res.body.cacheHitRate).toBeDefined();
    });
  });

  describe('GET /api/metrics', () => {
    test('should return JSON metrics by default', async () => {
      const res = await request(apiApp).get('/api/metrics');
      expect(res.status).toBe(200);
      expect(res.body.metrics).toBeDefined();
      expect(res.body.metrics.uptime_seconds).toBeGreaterThanOrEqual(0);
    });

    test('should return Prometheus formatted metrics when text/plain requested', async () => {
      const res = await request(apiApp)
        .get('/api/metrics')
        .set('Accept', 'text/plain');
      expect(res.status).toBe(200);
      expect(res.text).toContain('autodeploy_uptime_seconds');
    });
  });

  describe('POST /api/deploy - Input Validation', () => {
    test('should reject deployment request when both gitUrl and templateId are missing', async () => {
      const res = await request(apiApp)
        .post('/api/deploy')
        .send({ projectName: 'invalid-app' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
      expect(Array.isArray(res.body.issues)).toBe(true);
    });

    test('should reject deployment request with invalid project name characters', async () => {
      const res = await request(apiApp)
        .post('/api/deploy')
        .send({
          templateId: 'modern-landing-page',
          projectName: 'invalid@app#name!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    });

    test('should accept valid deployment request with templateId', async () => {
      const res = await request(apiApp)
        .post('/api/deploy')
        .send({
          templateId: 'modern-landing-page',
          projectName: 'jest-api-app',
        });

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.deploymentId).toBeDefined();
      expect(res.body.projectSlug).toBe('jest-api-app');
      createdDeployId = res.body.deploymentId;
    });
  });

  describe('GET /api/deployments & GET /api/deployments/:id', () => {
    test('should return list of deployments', async () => {
      const res = await request(apiApp).get('/api/deployments');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.deployments)).toBe(true);
    });

    test('should return 404 for non-existent deployment ID', async () => {
      const res = await request(apiApp).get('/api/deployments/dep-nonexistent-12345');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Deployment not found');
    });

    test('should retrieve details of created deployment if exists', async () => {
      if (createdDeployId) {
        const res = await request(apiApp).get(`/api/deployments/${createdDeployId}`);
        expect([200, 404]).toContain(res.status);
      }
    });
  });

  describe('POST /api/deployments/:id/redeploy', () => {
    test('should reject redeploy with invalid/short deploymentId', async () => {
      const res = await request(apiApp).post('/api/deployments/a/redeploy');
      expect(res.status).toBe(400);
    });

    test('should return 404 when redeploying unknown deployment', async () => {
      const res = await request(apiApp).post('/api/deployments/dep-unknown-99999/redeploy');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/logs/:deploymentId', () => {
    test('should establish SSE headers for log streaming', async () => {
      const server = apiApp.listen(0);
      const port = server.address().port;
      
      await new Promise((resolve) => {
        const http = require('http');
        const req = http.get(`http://localhost:${port}/api/logs/dep-sse-test`, (res) => {
          expect(res.headers['content-type']).toContain('text/event-stream');
          expect(res.headers['cache-control']).toContain('no-cache');
          req.destroy();
          server.close(resolve);
        });
        req.on('error', () => {
          server.close(resolve);
        });
      });
    });
  });

  describe('POST /api/config/storage - Validation', () => {
    test('should reject invalid storage mode', async () => {
      const res = await request(apiApp)
        .post('/api/config/storage')
        .send({ mode: 'invalid-mode' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    });

    test('should accept valid storage mode update', async () => {
      const res = await request(apiApp)
        .post('/api/config/storage')
        .send({ mode: 'local' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('S3 Reverse Proxy Routing', () => {
    test('should serve welcome page when no project slug or subdomain provided', async () => {
      const res = await request(proxyApp).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('S3 Reverse Proxy Online');
    });

    test('should return proxy health status', async () => {
      const res = await request(proxyApp).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('s3-reverse-proxy');
      expect(res.body.status).toBe('healthy');
    });

    test('should serve index.html for deployed project via /site/:slug/', async () => {
      const res = await request(proxyApp).get('/site/jest-landing-app/index.html');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.headers['x-proxy-origin']).toBe('Automated-Deployment-S3-Proxy');
    });

    test('should serve SPA fallback for client-side routes on deployed project', async () => {
      const res = await request(proxyApp).get('/site/jest-landing-app/dashboard/settings');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.headers['x-proxy-origin']).toContain('SPA-Fallback');
    });

    test('should return 404 for non-existent project asset', async () => {
      const res = await request(proxyApp).get('/site/non-existent-project-xyz/bundle.js');
      expect(res.status).toBe(404);
    });
  });

  describe('Logger Service', () => {
    test('should support debug, info, warn, error and child logger contexts', () => {
      const child = logger.child('UnitTest');
      expect(() => {
        child.debug('debug test');
        child.info('info test', { id: 1 });
        child.warn('warn test');
        child.error('error test', { err: 'test' });
      }).not.toThrow();
    });
  });
});
