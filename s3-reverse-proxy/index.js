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
 * Main reverse proxy request handler (can be used as standalone middleware or mounted in unified server)
 */
async function handleProxyRequest(req, res, next) {
  try {
    let projectSlug = null;
    let filePath = req.path;

    // 1. Check path-based routing: /site/:slug/*
    if (filePath.startsWith('/site/')) {
      const parts = filePath.replace(/^\/site\//, '').split('/');
      projectSlug = parts[0];
      filePath = '/' + parts.slice(1).join('/');
    }
    // 2. Check subdomain routing: slug.localhost:8000 or slug.domain.com
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
}

app.use(handleProxyRequest);

function renderProxyWelcomePage() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>S3 Reverse Proxy - Vercel Cloud Platform</title>
  <style>
    body { background: #000000; color: #ededed; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #0a0a0a; border: 1px solid #222222; padding: 40px; border-radius: 12px; max-width: 540px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
    .logo { font-size: 2rem; margin-bottom: 8px; }
    h1 { color: #ffffff; font-size: 1.6rem; font-weight: 700; margin-bottom: 12px; letter-spacing: -0.02em; }
    p { color: #888888; line-height: 1.6; margin-bottom: 24px; font-size: 0.95rem; }
    a.btn { background: #ffffff; color: #000000; padding: 10px 22px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.9rem; display: inline-block; transition: all 0.2s; }
    a.btn:hover { background: #cccccc; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">▲</div>
    <h1>🌐 S3 Reverse Proxy Online</h1>
    <p>Zero-latency edge reverse proxy serving static deployments and single-page applications directly from S3 storage.</p>
    <a href="/" class="btn">Open Vercel Console &rarr;</a>
  </div>
</body>
</html>`;
}

function render404Page(projectSlug, requestedPath, projectInfo) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>404: NOT_FOUND - Vercel</title>
  <style>
    body { background: #000000; color: #ededed; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #0a0a0a; border: 1px solid #222222; padding: 40px; border-radius: 12px; max-width: 580px; text-align: center; }
    .tag { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; display: inline-block; margin-bottom: 16px; font-weight: 500; }
    h1 { font-size: 1.6rem; margin-bottom: 10px; color: #ffffff; letter-spacing: -0.02em; }
    p { color: #888888; line-height: 1.6; margin-bottom: 20px; font-size: 0.95rem; }
    .code-box { background: #000000; border: 1px solid #1f1f1f; padding: 14px; border-radius: 6px; font-family: monospace; color: #38bdf8; font-size: 0.85rem; margin-bottom: 24px; text-align: left; }
    a.btn { background: #ffffff; color: #000000; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.9rem; display: inline-block; }
  </style>
</head>
<body>
  <div class="card">
    <div class="tag">404: DEPLOYMENT NOT FOUND</div>
    <h1>Deployment Asset Not Found</h1>
    <p>The project <strong>${projectSlug}</strong> (${requestedPath}) could not be resolved from edge storage.</p>
    <div class="code-box">
      Project: ${projectSlug}<br>
      Path: ${requestedPath}<br>
      Status: ${projectInfo ? projectInfo.status : 'NOT_FOUND'}
    </div>
    <a href="/" class="btn">Return to Vercel Dashboard &rarr;</a>
  </div>
</body>
</html>`;
}

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`S3 Reverse Proxy server listening on port ${PORT} (http://localhost:${PORT})`);
  });
}

app.handleProxyRequest = handleProxyRequest;
module.exports = app;
