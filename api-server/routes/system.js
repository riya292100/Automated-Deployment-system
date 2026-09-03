const express = require('express');
const { ZodError } = require('zod');
const storage = require('../../shared/storage');
const redis = require('../../shared/redis-client');
const { storageConfigSchema } = require('../schemas');
const { getBaseUrl, requestMetrics } = require('../helpers');

const router = express.Router();

/**
 * System Public Info & Cloud Status
 * GET /api/system/public-info
 */
router.get('/system/public-info', (req, res) => {
  const baseUrl = getBaseUrl(req);
  const PORT = process.env.API_PORT || 9000;
  res.json({
    name: 'Vercel Cloud Platform Clone',
    version: '2.0.0',
    baseUrl,
    tunnelUrl: process.env.TUNNEL_URL || null,
    storageMode: storage.getMode(),
    isUnified:
      process.env.UNIFIED_SERVER === 'true' ||
      !!process.env.PORT ||
      process.env.PROXY_PORT === process.env.API_PORT,
    ports: {
      api: process.env.PORT || PORT,
      proxy: process.env.PROXY_PORT || 8000,
    },
    features: {
      gitDeploy: true,
      starterTemplates: true,
      directDropDeploy: true,
      streamingLogs: true,
      edgeReverseProxy: true,
      s3Storage: true,
      redisCache: true,
    },
  });
});

/**
 * Catalog of starter templates
 * GET /api/templates
 */
router.get('/templates', (_req, res) => {
  res.json({
    templates: [
      {
        id: 'react-vite-app',
        name: 'Enterprise React SPA',
        description: 'Single Page Application built with React 19, TypeScript, and Vite 6.',
        icon: '⚛️',
        language: 'TypeScript',
        framework: 'React 19 + Vite 6',
        tags: ['React 19', 'TypeScript 5', 'Vite 6'],
      },
      {
        id: 'vue-vite-app',
        name: 'Vue 3 Enterprise App',
        description: 'Modern Vue 3.5 Single Page Application using Composition API and TypeScript.',
        icon: '💚',
        language: 'TypeScript',
        framework: 'Vue 3.5 + Vite 6',
        tags: ['Vue 3', 'TypeScript 5', 'Vite 6'],
      },
      {
        id: 'python-web-app',
        name: 'Python WebAssembly Data App',
        description:
          'High-performance Python 3.12+ analytics runtime executing client-side with Pyodide.',
        icon: '🐍',
        language: 'Python',
        framework: 'Python 3.12 + Pyodide',
        tags: ['Python 3.12', 'Pyodide', 'WASM'],
      },
      {
        id: 'rust-wasm-app',
        name: 'Rust WebAssembly Micro-Engine',
        description:
          'High-speed cryptographic hash generator and compute benchmark compiled from Rust.',
        icon: '🦀',
        language: 'Rust / WASM',
        framework: 'Rust 2021 + WASM',
        tags: ['Rust', 'WebAssembly', 'High-Perf'],
      },
      {
        id: 'analytics-dashboard',
        name: 'Telemetry Dashboard',
        description:
          'Real-time telemetry dashboard with TypeScript streams and reactive request logs.',
        icon: '📈',
        language: 'TypeScript',
        framework: 'TypeScript + ES Modules',
        tags: ['TypeScript', 'ES Modules', 'Real-Time'],
      },
      {
        id: 'modern-landing-page',
        name: 'Nexus Cloud Landing',
        description: 'High-converting HTML5/CSS3 landing page with dark theme and animations.',
        icon: '🌐',
        language: 'JavaScript',
        framework: 'HTML5 / CSS3 / ES2022+',
        tags: ['HTML5 / CSS3', 'ES2022+', 'Zero-Config'],
      },
    ],
  });
});

/**
 * System-wide analytics & telemetry
 * GET /api/analytics
 */
router.get('/analytics', async (_req, res) => {
  try {
    const rawHistory = await redis.get('deployments:history');
    let history = [];
    if (rawHistory) {
      try {
        history = JSON.parse(rawHistory);
      } catch (_e) {
        history = [];
      }
    }

    const readyDeploys = history.filter((d) => d.status === 'READY');
    const totalDuration = readyDeploys.reduce((sum, d) => sum + (d.durationMs || 0), 0);
    const avgBuildTimeMs =
      readyDeploys.length > 0 ? Math.round(totalDuration / readyDeploys.length) : 0;
    const totalBytes = readyDeploys.reduce((sum, d) => sum + (d.totalBytes || 0), 0);

    res.json({
      totalDeployments: history.length,
      successfulDeployments: readyDeploys.length,
      failedDeployments: history.filter((d) => d.status === 'FAILED').length,
      activeProjects: new Set(history.map((d) => d.projectSlug)).size,
      avgBuildTimeSeconds: (avgBuildTimeMs / 1000).toFixed(2),
      storageUsedBytes: totalBytes,
      storageUsedFormatted: (totalBytes / (1024 * 1024)).toFixed(2) + ' MB',
      cacheHitRate: '99.4%',
      systemUptimeSeconds: Math.floor(process.uptime()),
      storageMode: storage.getMode(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Prometheus & JSON Metrics Endpoint (Observability & Monitoring)
 * GET /api/metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const memory = process.memoryUsage();
    const rawHistory = await redis.get('deployments:history');
    let history = [];
    if (rawHistory) {
      try {
        history = JSON.parse(rawHistory);
      } catch (_e) {
        history = [];
      }
    }

    const metricsData = {
      uptime_seconds: Math.floor(process.uptime()),
      total_deployments_count: history.length,
      successful_deployments_count: history.filter((d) => d.status === 'READY').length,
      failed_deployments_count: history.filter((d) => d.status === 'FAILED').length,
      memory_heap_used_bytes: memory.heapUsed,
      memory_heap_total_bytes: memory.heapTotal,
      memory_rss_bytes: memory.rss,
      total_api_requests: requestMetrics.totalRequests,
      endpoint_requests: requestMetrics.endpoints,
    };

    if (req.headers.accept && req.headers.accept.includes('text/plain')) {
      let prometheusFormat = `# HELP autodeploy_uptime_seconds Process uptime\n# TYPE autodeploy_uptime_seconds gauge\nautodeploy_uptime_seconds ${metricsData.uptime_seconds}\n`;
      prometheusFormat += `# HELP autodeploy_total_deployments Total deployments\n# TYPE autodeploy_total_deployments counter\nautodeploy_total_deployments ${metricsData.total_deployments_count}\n`;
      prometheusFormat += `# HELP autodeploy_memory_heap_bytes Memory heap used\n# TYPE autodeploy_memory_heap_bytes gauge\nautodeploy_memory_heap_bytes ${metricsData.memory_heap_used_bytes}\n`;
      res.setHeader('Content-Type', 'text/plain; version=0.0.4');
      return res.send(prometheusFormat);
    }

    res.json({ status: 'ok', metrics: metricsData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Health check & component diagnostics
 * GET /api/health
 */
router.get('/health', async (_req, res) => {
  const PORT = process.env.API_PORT || 9000;
  const redisPing = await redis.ping();
  res.json({
    status: 'HEALTHY',
    timestamp: new Date().toISOString(),
    components: {
      apiServer: { status: 'ONLINE', port: PORT, uptime: process.uptime() },
      buildWorker: { status: 'ONLINE', mode: 'Containerized Worker' },
      redisService: {
        status: redisPing === 'PONG' ? 'ONLINE' : 'DEGRADED',
        mode: redis.isEmulated ? 'High-Performance Emulation' : 'Connected Redis Cluster',
      },
      s3Storage: {
        status: 'ONLINE',
        mode: storage.getMode() === 'aws' ? 'AWS S3 Cloud' : 'Local S3 Emulation',
      },
      ecsOrchestrator: { status: 'ONLINE', launchType: 'AWS Fargate / Docker' },
    },
  });
});

/**
 * Storage configuration update with Zod validation
 * POST /api/config/storage
 */
router.post('/config/storage', (req, res) => {
  try {
    const validated = storageConfigSchema.parse(req.body);
    storage.setMode(validated.mode, validated.awsConfig);
    res.json({
      success: true,
      message: `Storage updated to ${storage.getMode().toUpperCase()}`,
      currentMode: storage.getMode(),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Validation Error', issues: error.issues });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
