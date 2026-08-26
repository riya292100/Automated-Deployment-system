const runStorageTests = require('./storage.test');
const runRedisTests = require('./redis.test');
const runBuilderTests = require('./builder.test');
const runApiAndProxyTests = require('./api.test');

async function runTestSuite() {
  console.log('================================================================');
  console.log('         AUTOMATED DEPLOYMENT SYSTEM - TEST SUITE RUNNER        ');
  console.log('================================================================\n');

  const startTime = Date.now();

  try {
    await runStorageTests();
    await runRedisTests();
    await runBuilderTests();
    await runApiAndProxyTests();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('================================================================');
    console.log(`🎉 ALL TESTS PASSED SUCCESSFULLY in ${elapsed}s!`);
    console.log('================================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    process.exit(1);
  }
}

runTestSuite();
