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

  test('should detect and build upgraded React 19 Vite TypeScript starter project', async () => {
    const reactDeploymentId = `jest-react-${Date.now()}`;
    const reactSlug = 'jest-react-app';

    const result = await builder.executeBuild({
      deploymentId: reactDeploymentId,
      projectSlug: reactSlug,
      templateId: 'react-vite-app',
      branch: 'main',
    });

    expect(result).toBeDefined();
    expect(result.status).toBe('READY');
    expect(result.language).toBe('TypeScript');
    expect(result.framework).toContain('React');
    expect(result.fileCount).toBeGreaterThan(0);
    expect(result.totalBytes).toBeGreaterThan(0);

    const obj = await storage.getObject(`__outputs/${reactSlug}/index.html`);
    expect(obj).toBeDefined();
    expect(obj.body.toString()).toContain('React 19');
  }, 15000);

  test('should detect and build upgraded Vue 3 Vite TypeScript starter project', async () => {
    const vueDeploymentId = `jest-vue-${Date.now()}`;
    const vueSlug = 'jest-vue-app';

    const result = await builder.executeBuild({
      deploymentId: vueDeploymentId,
      projectSlug: vueSlug,
      templateId: 'vue-vite-app',
      branch: 'main',
    });

    expect(result).toBeDefined();
    expect(result.status).toBe('READY');
    expect(result.language).toBe('TypeScript');
    expect(result.framework).toContain('Vue');
    expect(result.fileCount).toBeGreaterThan(0);

    const obj = await storage.getObject(`__outputs/${vueSlug}/index.html`);
    expect(obj).toBeDefined();
    expect(obj.body.toString()).toContain('Vue 3.5');
  }, 15000);

  test('should detect and build Python WebAssembly Data App starter project', async () => {
    const pyDeploymentId = `jest-py-${Date.now()}`;
    const pySlug = 'jest-python-app';

    const result = await builder.executeBuild({
      deploymentId: pyDeploymentId,
      projectSlug: pySlug,
      templateId: 'python-web-app',
      branch: 'main',
    });

    expect(result).toBeDefined();
    expect(result.status).toBe('READY');
    expect(result.language).toBe('Python');
    expect(result.framework).toContain('Pyodide');
    expect(result.fileCount).toBeGreaterThan(0);

    const obj = await storage.getObject(`__outputs/${pySlug}/index.html`);
    expect(obj).toBeDefined();
    expect(obj.body.toString()).toContain('Python 3.12');
  }, 15000);

  test('should detect and build Rust WebAssembly Micro-Engine starter project', async () => {
    const rustDeploymentId = `jest-rust-${Date.now()}`;
    const rustSlug = 'jest-rust-app';

    const result = await builder.executeBuild({
      deploymentId: rustDeploymentId,
      projectSlug: rustSlug,
      templateId: 'rust-wasm-app',
      branch: 'main',
    });

    expect(result).toBeDefined();
    expect(result.status).toBe('READY');
    expect(result.language).toBe('Rust / WASM');
    expect(result.framework).toContain('WebAssembly');
    expect(result.fileCount).toBeGreaterThan(0);

    const obj = await storage.getObject(`__outputs/${rustSlug}/index.html`);
    expect(obj).toBeDefined();
    expect(obj.body.toString()).toContain('Rust 2021');
  }, 15000);

  test('should reject invalid build with missing source', async () => {
    await expect(
      builder.executeBuild({
        deploymentId: 'fail-test',
        projectSlug: 'fail-test',
      })
    ).rejects.toThrow();
  });
});
