const request = require('supertest');
const app = require('../api-server/index');
const redis = require('../shared/redis-client');

describe('API Server - Deployments & Direct Deploy Route Suite', () => {
  const testDepId = 'dep-test-deployments-lifecycle';
  const testProjectSlug = 'test-lifecycle-app';

  beforeAll(async () => {
    const record = {
      deploymentId: testDepId,
      projectSlug: testProjectSlug,
      status: 'READY',
      url: `http://localhost:3000/site/${testProjectSlug}/`,
      gitUrl: 'template:react-vite-app',
      branch: 'main',
      completedAt: new Date().toISOString(),
    };
    await redis.set(`deployment:${testDepId}`, record);
    await redis.set('deployments:history', [record]);
  });

  afterAll(async () => {
    await redis.del(`deployment:${testDepId}`);
  });

  test('GET /api/deployments should return deployments list', async () => {
    const res = await request(app).get('/api/deployments').expect(200);
    expect(res.body).toHaveProperty('deployments');
    expect(Array.isArray(res.body.deployments)).toBe(true);
    expect(res.body.deployments.length).toBeGreaterThan(0);
  });

  test('GET /api/deployments/:id should return single deployment details', async () => {
    const res = await request(app).get(`/api/deployments/${testDepId}`).expect(200);
    expect(res.body).toHaveProperty('deployment');
    expect(res.body.deployment.deploymentId).toBe(testDepId);
    expect(res.body.deployment.projectSlug).toBe(testProjectSlug);
  });

  test('GET /api/deployments/:id should return 404 for unknown deployment', async () => {
    const res = await request(app).get('/api/deployments/dep-does-not-exist').expect(404);
    expect(res.body).toHaveProperty('error', 'Deployment not found');
  });

  test('POST /api/deploy/direct with valid HTML should queue deployment with 202 Accepted', async () => {
    const res = await request(app)
      .post('/api/deploy/direct')
      .send({
        projectName: 'My Quick Drop App',
        html: '<h1>Drag and Drop App</h1>',
        css: 'body { background: #111; }',
      })
      .expect(202);

    expect(res.body.success).toBe(true);
    expect(res.body.projectSlug).toBe('my-quick-drop-app');
    expect(res.body.status).toBe('IN_PROGRESS');
  });

  test('POST /api/deploy/direct without projectName should return 400 Zod validation error', async () => {
    const res = await request(app)
      .post('/api/deploy/direct')
      .send({
        html: '<h1>No Project Name</h1>',
      })
      .expect(400);

    expect(res.body.error).toBe('Validation Error');
  });

  test('POST /api/deploy/direct without files or html should return 400 validation error', async () => {
    const res = await request(app)
      .post('/api/deploy/direct')
      .send({
        projectName: 'EmptyApp',
      })
      .expect(400);

    expect(res.body.error).toBe('Validation Error');
  });

  test('POST /api/deployments/:id/redeploy should re-trigger deployment', async () => {
    const res = await request(app).post(`/api/deployments/${testDepId}/redeploy`).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Redeployment triggered');
    expect(res.body.projectSlug).toBe(testProjectSlug);
    expect(res.body.deploymentId).toBeDefined();
  });

  test('POST /api/deployments/:id/redeploy on non-existent id should return 404', async () => {
    await request(app).post('/api/deployments/dep-ghost-non-existent/redeploy').expect(404);
  });

  test('GET /api/logs/:id/history should return array of log lines', async () => {
    const res = await request(app).get(`/api/logs/${testDepId}/history`).expect(200);

    expect(res.body).toHaveProperty('deploymentId', testDepId);
    expect(res.body).toHaveProperty('logs');
    expect(Array.isArray(res.body.logs)).toBe(true);
  });
});
