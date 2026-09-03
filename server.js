require('dotenv').config();
const apiApp = require('./api-server/index');
const builder = require('./build-server/builder');
const logger = require('./shared/logger').child('VercelServer');

// In unified mode, single port handles API, Web Dashboard, and Reverse Proxy
process.env.UNIFIED_SERVER = 'true';
const PORT = process.env.PORT || process.env.API_PORT || 3000;

console.log('================================================================');
console.log('       ▲ VERCEL CLOUD CLONE - UNIFIED PLATFORM SERVER          ');
console.log('   Autonomous Deployments • S3 Edge Storage • Live Telemetry    ');
console.log('================================================================\n');

const server = apiApp.listen(PORT, async () => {
  logger.info(`Vercel Clone unified server listening on port ${PORT}`);
  logger.info(`Dashboard Web Console: http://localhost:${PORT}`);
  logger.info(`API Endpoints:         http://localhost:${PORT}/api/*`);
  logger.info(`Edge Deployments:      http://localhost:${PORT}/site/:projectSlug/\n`);

  // Auto-deploy initial sample project if needed
  try {
    const redis = require('./shared/redis-client');
    const existing = await redis.get('project:nexus-landing');
    if (!existing) {
      logger.info('Deploying initial starter landing page for instant demo readiness...');
      await builder.executeBuild({
        deploymentId: `init-${Date.now().toString(36)}`,
        projectSlug: 'nexus-landing',
        templateId: 'modern-landing-page',
        branch: 'main',
        baseUrl: `http://localhost:${PORT}`,
      });
      logger.info(`Initial deployment online at: http://localhost:${PORT}/site/nexus-landing/\n`);
    }
  } catch (err) {
    logger.warn('Initial bootstrap build completed with warning', { error: err.message });
  }
});

// Handle graceful termination
process.on('SIGINT', () => {
  logger.info('Shutting down Vercel Clone server...');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server...');
  server.close(() => process.exit(0));
});

module.exports = server;
