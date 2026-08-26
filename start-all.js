require('dotenv').config();
const http = require('http');
const apiApp = require('./api-server/index');
const proxyApp = require('./s3-reverse-proxy/index');
const builder = require('./build-server/builder');

const API_PORT = process.env.API_PORT || 9000;
const PROXY_PORT = process.env.PROXY_PORT || 8000;

console.log('================================================================');
console.log('       🚀 AUTOMATED DEPLOYMENT SYSTEM - PLATFORM LAUNCHER       ');
console.log('       Docker • AWS ECS • Amazon S3 • Redis • Reverse Proxy     ');
console.log('================================================================\n');

// 1. Start S3 Reverse Proxy Server on Port 8000
const proxyServer = proxyApp.listen(PROXY_PORT, () => {
  console.log(`[Reverse Proxy]  Listening at: http://localhost:${PROXY_PORT}`);
  console.log(`                 Edge Routing: http://localhost:${PROXY_PORT}/site/:projectSlug/`);
});

// 2. Start API Orchestrator & Dashboard on Port 9000
const apiServer = apiApp.listen(API_PORT, async () => {
  console.log(`[API Server]     Listening at: http://localhost:${API_PORT}`);
  console.log(`[Web Dashboard]  Available at: http://localhost:${API_PORT}`);
  console.log('\n[System Ready]   All microservices synchronized and operational.\n');

  // Auto-deploy initial sample project for instant out-of-the-box readiness
  try {
    console.log('[Auto-Bootstrap] Deploying sample landing page for initial demo...');
    await builder.executeBuild({
      deploymentId: `init-${Date.now().toString(36)}`,
      projectSlug: 'nexus-landing',
      templateId: 'modern-landing-page',
      branch: 'main',
    });
    console.log('[Auto-Bootstrap] Initial deployment ready at: http://localhost:8000/site/nexus-landing/\n');
  } catch (err) {
    console.warn('[Auto-Bootstrap] Warning on initial build:', err.message);
  }
});

// Handle graceful termination
process.on('SIGINT', () => {
  console.log('\n[Shutdown] Stopping all Automated Deployment System services...');
  proxyServer.close();
  apiServer.close();
  process.exit(0);
});
