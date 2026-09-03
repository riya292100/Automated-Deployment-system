require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('../shared/logger').child('APIServer');
const proxyApp = require('../s3-reverse-proxy/index');
const { requestMetrics } = require('./helpers');

// Modular Route Controllers
const deployRouter = require('./routes/deploy');
const logsRouter = require('./routes/logs');
const deploymentsRouter = require('./routes/deployments');
const systemRouter = require('./routes/system');

const app = express();
const PORT = process.env.API_PORT || 9000;

app.use(cors());
app.use(express.json());

// Edge Reverse Proxy for path-based deployments (/site/:slug/*) and custom subdomains
app.use((req, res, next) => {
  if (req.path.startsWith('/site/')) {
    return proxyApp.handleProxyRequest(req, res, next);
  }
  const host = req.hostname || req.headers.host || '';
  const hostParts = host.split('.');
  if (
    hostParts.length > 1 &&
    hostParts[0] !== 'localhost' &&
    hostParts[0] !== '127' &&
    !req.path.startsWith('/api')
  ) {
    return proxyApp.handleProxyRequest(req, res, next);
  }
  next();
});

// Serve Dashboard Web Application
app.use(express.static(path.resolve(__dirname, '../dashboard')));

// Global metrics middleware
app.use((req, _res, next) => {
  requestMetrics.totalRequests++;
  const route = `${req.method} ${req.path}`;
  requestMetrics.endpoints[route] = (requestMetrics.endpoints[route] || 0) + 1;
  next();
});

// Mount modular API routes
app.use('/api', deployRouter);
app.use('/api', logsRouter);
app.use('/api', deploymentsRouter);
app.use('/api', systemRouter);

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(
      `Automated Deployment System API listening on port ${PORT} (http://localhost:${PORT})`
    );
  });
}

module.exports = app;
