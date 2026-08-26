const builder = require('../build-server/builder');
const storage = require('../shared/storage');
const redis = require('../shared/redis-client');

describe('Build Server Worker', () => {
  const deploymentId = `jest-build-${Date.now()}`;
  const projectSlug = 'jest-landing-app';

  test('should execute full build process on starter template', async () => {
    const result = await builder.executeBuild({
      deploymentId,
      projectSlug,
      templateId: 'modern-landing-page',
      branch: 'main',
    });

    expect(result).toBeDefined();
    expect(result.status).toBe('READY');
    expect(result.fileCount).toBeGreaterThan(0);
    expect(result.totalBytes).toBeGreaterThan(0);
    expect(result.url).toContain(projectSlug);
  }, 15000);

  test('should persist build artifacts in storage with __outputs prefix', async () => {
    const obj = await storage.getObject(`__outputs/${projectSlug}/index.html`);
    expect(obj).toBeDefined();
    expect(obj.body.length).toBeGreaterThan(0);
  });

  test('should register project metadata in Redis routing table', async () => {
    const cached = await redis.get(`project:${projectSlug}`);
    expect(cached).toBeDefined();
    const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
    expect(parsed.status).toBe('READY');
    expect(parsed.projectSlug).toBe(projectSlug);
  });

  test('should reject invalid build with missing source', async () => {
    await expect(
      builder.executeBuild({
        deploymentId: 'fail-test',
        projectSlug: 'fail-test',
      })
    ).rejects.toThrow();
  });
});
