const express = require('express');
const { ZodError } = require('zod');
const logger = require('../../shared/logger').child('DeploymentsRoute');
const redis = require('../../shared/redis-client');
const { deploymentIdParamSchema } = require('../schemas');

const router = express.Router();

/**
 * Get all deployments history
 * GET /api/deployments
 */
router.get('/deployments', async (req, res) => {
  try {
    const raw = await redis.get('deployments:history');
    let history = [];
    if (raw) {
      try {
        history = JSON.parse(raw);
      } catch (_e) {
        history = [];
      }
    }
    res.json({ deployments: history });
  } catch (error) {
    logger.error('Error fetching deployments', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get single deployment status
 * GET /api/deployments/:deploymentId
 */
router.get('/deployments/:deploymentId', async (req, res) => {
  try {
    const { deploymentId } = deploymentIdParamSchema.parse(req.params);
    const data = await redis.get(`deployment:${deploymentId}`);
    if (!data) {
      return res.status(404).json({ error: 'Deployment not found' });
    }
    res.json({ deployment: typeof data === 'string' ? JSON.parse(data) : data });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Validation Error', issues: error.issues });
    }
    logger.error('Error fetching deployment details', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
