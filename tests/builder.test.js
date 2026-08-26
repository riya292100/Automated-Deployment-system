const assert = require('assert');
const builder = require('../build-server/builder');
const storage = require('../shared/storage');
const redis = require('../shared/redis-client');

async function runBuilderTests() {
  console.log('--- Testing Build Server Worker ---');

  const deploymentId = `test-build-${Date.now()}`;
  const projectSlug = 'test-sample-project';

  const result = await builder.executeBuild({
    deploymentId,
    projectSlug,
    templateId: 'modern-landing-page',
    branch: 'main',
  });

  assert.strictEqual(result.status, 'READY');
  assert.ok(result.fileCount > 0);
  assert.ok(result.totalBytes > 0);
  assert.ok(result.url.includes(projectSlug));
  console.log(`✔ builder.executeBuild completed with status: ${result.status} (${result.fileCount} files uploaded)`);

  // Verify asset in S3
  const s3Obj = await storage.getObject(`__outputs/${projectSlug}/index.html`);
  assert.ok(s3Obj.body.length > 0);
  console.log(`✔ Verified output in storage: __outputs/${projectSlug}/index.html`);

  // Verify route in Redis
  const cached = await redis.get(`project:${projectSlug}`);
  assert.ok(cached !== null);
  console.log(`✔ Verified route mapping in Redis: project:${projectSlug}`);

  console.log('✅ Build Worker tests passed!\n');
}

module.exports = runBuilderTests;

if (require.main === module) {
  runBuilderTests().catch(e => { console.error(e); process.exit(1); });
}
