require('dotenv').config();
const express = require('express');
const cors = require('cors');
const storage = require('../shared/storage');
const redis = require('../shared/redis-client');
const logger = require('../shared/logger').child('ReverseProxy');

const app = express();
const PORT = process.env.PROXY_PORT || 8000;

app.use(cors());

// Request logger for reverse proxy
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

/**
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
  res.json({
    service: 's3-reverse-proxy',
    status: 'healthy',
    storageMode: storage.getMode(),
    uptime: process.uptime(),
  });
});

/**
 * Main reverse proxy router (Catch-all for all methods & paths)
 */
app.use(async (req, res) => {
  try {
    let projectSlug = null;
    let filePath = req.path;

    // 1. Check path-based routing: /site/:slug/*
    if (filePath.startsWith('/site/')) {
      const parts = filePath.replace(/^\/site\//, '').split('/');
      projectSlug = parts[0];
      filePath = '/' + parts.slice(1).join('/');
    }
    // 2. Check subdomain routing: slug.localhost:8000
    else {
      const host = req.hostname || req.headers.host || '';
      const hostParts = host.split('.');
      if (hostParts.length > 1 && hostParts[0] !== 'localhost' && hostParts[0] !== '127') {
        projectSlug = hostParts[0];
      } else if (req.headers['x-project-slug']) {
        projectSlug = req.headers['x-project-slug'];
      }
    }

    // Default root path to index.html
    if (!filePath || filePath === '/' || filePath === '') {
      filePath = '/index.html';
    }

    if (!projectSlug) {
      return res.status(200).send(renderProxyWelcomePage());
    }

    // Lookup project metadata from Redis
    let projectInfo = null;
    const cachedData = await redis.get(`project:${projectSlug}`);
    if (cachedData) {
      try {
        projectInfo = JSON.parse(cachedData);
      } catch (_e) {
        projectInfo = cachedData;
      }
    }

    const s3Prefix =
      projectInfo && projectInfo.s3Prefix ? projectInfo.s3Prefix : `__outputs/${projectSlug}`;
    const cleanFilePath = filePath.replace(/^\/+/, '');
    let targetKey = `${s3Prefix}/${cleanFilePath}`;

    try {
      // Attempt to fetch requested file from S3
      const fileData = await storage.getObject(targetKey);

      res.setHeader('Content-Type', fileData.contentType);
      res.setHeader('Content-Length', fileData.contentLength);
      res.setHeader('X-Proxy-Origin', 'Automated-Deployment-S3-Proxy');
      res.setHeader('X-Storage-Mode', storage.getMode());
      res.setHeader(
        'Cache-Control',
        cleanFilePath.endsWith('.html') ? 'no-cache' : 'public, max-age=86400'
      );

      return res.status(200).send(fileData.body);
    } catch (_err) {
      // SPA Fallback: If not found and not a direct file asset, try index.html
      const isDirectAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|json|woff2|woff|ttf|map)$/i.test(
        cleanFilePath
      );

      if (!isDirectAsset) {
        try {
          const fallbackKey = `${s3Prefix}/index.html`;
          const fallbackData = await storage.getObject(fallbackKey);

          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('X-Proxy-Origin', 'Automated-Deployment-S3-Proxy-SPA-Fallback');
          res.setHeader('X-Storage-Mode', storage.getMode());

          return res.status(200).send(fallbackData.body);
        } catch (_fallbackErr) {
          // If even index.html does not exist
          return res.status(404).send(render404Page(projectSlug, cleanFilePath, projectInfo));
        }
      }

      return res.status(404).send(render404Page(projectSlug, cleanFilePath, projectInfo));
    }
  } catch (error) {
    logger.error('Reverse Proxy Internal Error', { error: error.message });
    res.status(500).json({ error: 'Reverse Proxy Internal Error', message: error.message });
  }
});

function renderProxyWelcomePage() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>S3 Reverse Proxy - Automated Deployment System</title>
  <style>
    body { background: #0b0f19; color: #f1f5f9; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #131b2e; border: 1px solid #1e293b; padding: 40px; border-radius: 16px; max-width: 540px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    h1 { color: #38bdf8; font-size: 1.8rem; margin-bottom: 12px; }
    p { color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
    a.btn { background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🌐 S3 Reverse Proxy Online</h1>
    <p>This edge proxy automatically routes subdomain and path-based requests to S3 static bucket storage with in-memory Redis caching.</p>
    <a href="http://localhost:9000" class="btn">Go to Deployment Dashboard &rarr;</a>
  </div>
</body>
</html>`;
}

function render404Page(projectSlug, requestedPath, projectInfo) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>404 - Project or Asset Not Found</title>
  <style>
    body { background: #090d16; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #121826; border: 1px solid #1e293b; padding: 40px; border-radius: 16px; max-width: 580px; text-align: center; }
    .tag { background: rgba(239, 68, 68, 0.15); color: #f87171; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; display: inline-block; margin-bottom: 16px; }
    h1 { font-size: 1.8rem; margin-bottom: 12px; }
    p { color: #94a3b8; line-height: 1.6; margin-bottom: 20px; font-size: 0.95rem; }
    .code-box { background: #080b12; padding: 12px; border-radius: 8px; font-family: monospace; color: #38bdf8; font-size: 0.85rem; margin-bottom: 24px; text-align: left; }
    a.btn { background: #3b82f6; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; }
  </style>
</head>
<body>
  <div class="card">
    <div class="tag">404 Asset Not Found</div>
    <h1>Deployment Asset Not Found</h1>
    <p>The requested target <strong>${projectSlug}</strong> (${requestedPath}) could not be resolved from storage.</p>
    <div class="code-box">
      Target Slug: ${projectSlug}<br>
      Path: ${requestedPath}<br>
      Status: ${projectInfo ? projectInfo.status : 'NOT_FOUND'}
    </div>
    <a href="http://localhost:9000" class="btn">Return to Deployment Console &rarr;</a>
  </div>
</body>
</html>`;
}

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`S3 Reverse Proxy server listening on port ${PORT} (http://localhost:${PORT})`);
  });
}

module.exports = app;
