const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  detectLanguageAndFramework,
  copyDirectory,
  updateDeploymentStatus,
  resolveDeployedUrl,
  writeDirectFiles,
} = require('../build-server/detectFramework');

describe('BuildServer - Framework Detection & Utility Suite', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'detect-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should detect Rust / WASM project when Cargo.toml is present', () => {
    fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), '[package]\nname = "test"');
    const result = detectLanguageAndFramework(tempDir);
    expect(result.language).toBe('Rust / WASM');
    expect(result.framework).toBe('WebAssembly Micro-Engine');
    expect(result.summary).toContain('Rust');
  });

  test('should detect Python project when requirements.txt or app.py is present', () => {
    fs.writeFileSync(path.join(tempDir, 'app.py'), 'print("hello")');
    const result = detectLanguageAndFramework(tempDir);
    expect(result.language).toBe('Python');
    expect(result.framework).toBe('Pyodide Data Engine');
  });

  test('should detect TypeScript when tsconfig.json is present without package.json', () => {
    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');
    const result = detectLanguageAndFramework(tempDir);
    expect(result.language).toBe('TypeScript');
    expect(result.framework).toBe('Static Web App');
  });

  test('should detect React 19 + Vite project', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: { react: '^19.0.0' } })
    );
    fs.writeFileSync(path.join(tempDir, 'vite.config.js'), '// vite config');
    const result = detectLanguageAndFramework(tempDir);
    expect(result.framework).toBe('React 19 + Vite');
    expect(result.language).toBe('JavaScript');
  });

  test('should detect Vue 3 + Vite project with TypeScript', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: { vue: '^3.5.0' } })
    );
    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');
    fs.writeFileSync(path.join(tempDir, 'vite.config.ts'), '// vite');
    const result = detectLanguageAndFramework(tempDir);
    expect(result.language).toBe('TypeScript');
    expect(result.framework).toBe('Vue 3 + Vite');
  });

  test('should detect Svelte project', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: { svelte: '^5.0.0' } })
    );
    const result = detectLanguageAndFramework(tempDir);
    expect(result.framework).toBe('Svelte');
  });

  test('should detect Next.js 15 project', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: { next: '15.0.0' } })
    );
    const result = detectLanguageAndFramework(tempDir);
    expect(result.framework).toBe('Next.js 15');
  });

  test('should detect Astro 5 project', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: { astro: '5.0.0' } })
    );
    const result = detectLanguageAndFramework(tempDir);
    expect(result.framework).toBe('Astro 5');
  });

  test('should fallback to Node.js App when no UI framework is identified in package.json', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: { express: '4.18.0' } })
    );
    const result = detectLanguageAndFramework(tempDir);
    expect(result.framework).toBe('Node.js App');
  });

  test('should fallback to Static Web App when directory is empty', () => {
    const result = detectLanguageAndFramework(tempDir);
    expect(result.language).toBe('JavaScript');
    expect(result.framework).toBe('Static Web App');
  });

  test('should recursively copy directory and files', async () => {
    const srcDir = path.join(tempDir, 'source');
    const destDir = path.join(tempDir, 'dest');
    fs.mkdirSync(path.join(srcDir, 'sub'), { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'file1.txt'), 'hello');
    fs.writeFileSync(path.join(srcDir, 'sub', 'file2.txt'), 'world');

    await copyDirectory(srcDir, destDir);

    expect(fs.existsSync(path.join(destDir, 'file1.txt'))).toBe(true);
    expect(fs.existsSync(path.join(destDir, 'sub', 'file2.txt'))).toBe(true);
    expect(fs.readFileSync(path.join(destDir, 'file1.txt'), 'utf8')).toBe('hello');
  });

  test('should write direct upload files correctly', () => {
    const destDir = path.join(tempDir, 'direct-output');
    fs.mkdirSync(destDir, { recursive: true });

    const count = writeDirectFiles(
      destDir,
      null,
      '<h1>Hello</h1>',
      'body { color: red; }',
      'console.log("ok");'
    );
    expect(count).toBe(3);
    expect(fs.readFileSync(path.join(destDir, 'index.html'), 'utf8')).toBe('<h1>Hello</h1>');
    expect(fs.readFileSync(path.join(destDir, 'style.css'), 'utf8')).toBe('body { color: red; }');
    expect(fs.readFileSync(path.join(destDir, 'main.js'), 'utf8')).toBe('console.log("ok");');
  });

  test('should write custom files array with sanitized paths', () => {
    const destDir = path.join(tempDir, 'direct-files');
    fs.mkdirSync(destDir, { recursive: true });

    const files = [
      { path: 'index.html', content: '<html>Index</html>' },
      { path: 'assets/app.js', content: 'alert(1);' },
    ];

    const count = writeDirectFiles(destDir, files);
    expect(count).toBe(2);
    expect(fs.existsSync(path.join(destDir, 'assets/app.js'))).toBe(true);
  });

  test('should throw error when no files or html provided', () => {
    expect(() => writeDirectFiles(tempDir, [], null, null, null)).toThrow();
  });

  test('should resolve deployed URL correctly', () => {
    const url = resolveDeployedUrl('https://example.com', 'my-project');
    expect(url).toBe('https://example.com/site/my-project/');
  });

  test('should update deployment history in redis mockup', async () => {
    let mockStore = {};
    const mockRedis = {
      get: jest.fn().mockImplementation(async (key) => mockStore[key] || null),
      set: jest.fn().mockImplementation(async (key, val) => {
        mockStore[key] = JSON.stringify(val);
      }),
    };

    const item = await updateDeploymentStatus(mockRedis, 'dep-123', 'test-slug', 'READY', {
      durationMs: 450,
    });

    expect(item.status).toBe('READY');
    expect(item.durationMs).toBe(450);
    expect(mockRedis.set).toHaveBeenCalled();
  });
});
