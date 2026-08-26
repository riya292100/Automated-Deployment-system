const assert = require('assert');
const storage = require('../shared/storage');

async function runStorageTests() {
  console.log('--- Testing Storage Service ---');

  // Test 1: Put object
  const testKey = '__outputs/test-app/index.html';
  const testHtml = '<html><body><h1>Test S3 Content</h1></body></html>';
  await storage.putObject(testKey, testHtml, 'text/html');
  console.log('✔ storage.putObject successful');

  // Test 2: Get object
  const obj = await storage.getObject(testKey);
  assert.strictEqual(obj.body.toString(), testHtml);
  assert.ok(obj.contentType.includes('text/html'));
  console.log('✔ storage.getObject matched content and contentType');

  // Test 3: List objects
  const list = await storage.listObjects('__outputs/test-app');
  assert.ok(list.length > 0);
  assert.ok(list.some(item => item.key === testKey));
  console.log(`✔ storage.listObjects returned ${list.length} objects`);

  console.log('✅ Storage tests passed!\n');
}

module.exports = runStorageTests;

if (require.main === module) {
  runStorageTests().catch(e => { console.error(e); process.exit(1); });
}
