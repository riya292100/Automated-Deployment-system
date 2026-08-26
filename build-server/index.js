const builder = require('./builder');

async function run() {
  const deploymentPayload = {
    deploymentId: process.env.DEPLOYMENT_ID || `deploy-${Date.now()}`,
    projectSlug: process.env.PROJECT_SLUG || 'sample-app',
    gitUrl: process.env.GIT_REPOSITORY_URL || '',
    templateId: process.env.TEMPLATE_ID || '',
    branch: process.env.GIT_BRANCH || 'main',
    buildCommand: process.env.BUILD_COMMAND || '',
    installCommand: process.env.INSTALL_COMMAND || '',
    outputDir: process.env.OUTPUT_DIR || 'dist',
  };

  console.log('[Build Server] Starting build task with payload:', deploymentPayload);

  try {
    const result = await builder.executeBuild(deploymentPayload);
    console.log('[Build Server] Build task completed successfully:', result);
    process.exit(0);
  } catch (err) {
    console.error('[Build Server] Build task failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}

module.exports = builder;
