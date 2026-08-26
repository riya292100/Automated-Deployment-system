const storage = require('../shared/storage');

describe('Storage Service', () => {
  const testKey = '__outputs/jest-test-app/index.html';
  const testHtml = '<!DOCTYPE html><html><body><h1>Jest Storage Test</h1></body></html>';

  test('should put an object into storage with correct MIME type', async () => {
    const result = await storage.putObject(testKey, testHtml, 'text/html');
    expect(result).toBeDefined();
    expect(result.Key || result.ETag).toBeDefined();
  });

  test('should retrieve the object from storage matching content and contentType', async () => {
    const obj = await storage.getObject(testKey);
    expect(obj).toBeDefined();
    expect(obj.body.toString()).toBe(testHtml);
    expect(obj.contentType).toContain('text/html');
    expect(obj.contentLength).toBeGreaterThan(0);
  });

  test('should throw error when fetching non-existent key', async () => {
    await expect(storage.getObject('__outputs/non-existent/file.xyz')).rejects.toThrow();
  });

  test('should list objects with given prefix', async () => {
    const list = await storage.listObjects('__outputs/jest-test-app');
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((item) => item.key === testKey)).toBe(true);
  });

  test('should support mode inspection and switching', () => {
    const currentMode = storage.getMode();
    expect(['local', 'aws']).toContain(currentMode);

    storage.setMode('local');
    expect(storage.getMode()).toBe('local');
  });
});
