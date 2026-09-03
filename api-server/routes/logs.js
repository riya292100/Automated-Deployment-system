const express = require('express');
const { ZodError } = require('zod');
const redis = require('../../shared/redis-client');
const { deploymentIdParamSchema } = require('../schemas');

const router = express.Router();

/**
 * Real-time Build Logs Stream via Server-Sent Events (SSE)
 * GET /api/logs/:deploymentId
 */
router.get('/logs/:deploymentId', (req, res) => {
  try {
    const { deploymentId } = deploymentIdParamSchema.parse(req.params);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // 1. Send past historical logs for this deployment
    const pastLogs = redis.getLogs(deploymentId);
    for (const logItem of pastLogs) {
      res.write(
        `data: ${typeof logItem.message === 'string' ? logItem.message : JSON.stringify(logItem)}\n\n`
      );
    }

    // 2. Real-time Pub/Sub listener for new log events
    const channel = `logs:${deploymentId}`;
    const logHandler = (msg) => {
      res.write(`data: ${msg}\n\n`);
    };

    redis.subscribe(channel, logHandler);

    // Heartbeat keep-alive every 15s
    const heartbeat = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      redis.unsubscribe(channel, logHandler);
      res.end();
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Validation Error', issues: error.issues });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * Historical Logs in JSON format
 * GET /api/logs/:deploymentId/history
 */
router.get('/logs/:deploymentId/history', (req, res) => {
  try {
    const { deploymentId } = deploymentIdParamSchema.parse(req.params);
    const logs = redis.getLogs(deploymentId);
    res.json({
      deploymentId,
      count: logs.length,
      logs,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Validation Error', issues: error.issues });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
