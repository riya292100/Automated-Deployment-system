require('dotenv').config();

// If running in cloud environment (single PORT provided) or UNIFIED_SERVER set, delegate to server.js
if (process.env.PORT || process.env.UNIFIED_SERVER === 'true') {
  module.exports = require('./server');
  return;
}

const apiApp = require('./api-server/index');
const proxyApp = require('./s3-reverse-proxy/index');
const builder = require('./build-server/builder');
const logger = require('./shared/logger').child('Launcher');

const API_PORT = process.env.API_PORT || 9000;
const PROXY_PORT = process.env.PROXY_PORT || 8000;

console.log('================================================================');
console.log('       ▲ VERCEL CLOUD CLONE - PLATFORM LAUNCHER                 ');
console.log('       Docker • AWS ECS • Amazon S3 • Redis • Reverse Proxy     ');
console.log('================================================================\n');

// 1. Start S3 Reverse Proxy Server on Port 8000
const proxyServer = proxyApp.listen(PROXY_PORT, () => {
  logger.info(`Reverse Proxy listening at: http://localhost:${PROXY_PORT}`);
  logger.info(`Edge Routing available at: http://localhost:${PROXY_PORT}/site/:projectSlug/`);
});

// 2. Start API Orchestrator & Dashboard on Port 9000
const apiServer = apiApp.listen(API_PORT, async () => {
  logger.info(`API Server listening at: http://localhost:${API_PORT}`);
  logger.info(`Web Dashboard available at: http://localhost:${API_PORT}`);
  logger.info('All microservices synchronized and operational.\n');

  // Auto-deploy initial sample project for instant out-of-the-box readiness
  try {
    logger.info('Deploying sample landing page for initial demo...');
    await builder.executeBuild({
      deploymentId: `init-${Date.now().toString(36)}`,
      projectSlug: 'nexus-landing',
      templateId: 'modern-landing-page',
      branch: 'main',
    });
    logger.info('Initial deployment ready at: http://localhost:8000/site/nexus-landing/\n');
  } catch (err) {
    logger.warn('Warning on initial bootstrap build', { error: err.message });
  }
});

// Handle graceful termination
process.on('SIGINT', () => {
  logger.info('Stopping all Automated Deployment System services...');
  proxyServer.close();
  apiServer.close();
  process.exit(0);
});
