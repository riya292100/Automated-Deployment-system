const express = require('express');
const { ZodError } = require('zod');
const builder = require('../../build-server/builder');
const logger = require('../../shared/logger').child('DeployRoute');
const redis = require('../../shared/redis-client');
const { deploySchema, directDeploySchema, redeployParamsSchema } = require('../schemas');
const { getBaseUrl, recordDeployment } = require('../helpers');

const router = express.Router();

/**
 * Trigger new project deployment with Zod schema validation
 * POST /api/deploy
 */
router.post('/deploy', async (req, res) => {
  try {
    const validatedData = deploySchema.parse(req.body);

    const {
      gitUrl,
      templateId,
      projectName,
      branch = 'main',
      buildCommand = '',
      installCommand = '',
      outputDir = 'dist',
    } = validatedData;

    const projectSlug = projectName
      ? projectName
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, '-')
          .replace(/-+/g, '-')
      : templateId || 'app-' + Math.random().toString(36).substring(2, 7);

    const deploymentId = `dep-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    recordDeployment('queued');

    const baseUrl = getBaseUrl(req);
    const hostHeader = (req.headers['x-forwarded-host'] || req.get('host') || 'localhost').split(
      ':'
    )[0];
    const previewUrl = `${baseUrl}/site/${projectSlug}/`;
    const subdomainUrl = `${req.protocol || 'http'}://${projectSlug}.${hostHeader}${req.get('host') && req.get('host').includes(':') ? ':' + req.get('host').split(':')[1] : ''}/`;

    const payload = {
      deploymentId,
      projectSlug,
      gitUrl: gitUrl || null,
      templateId: templateId || null,
      branch,
      buildCommand,
      installCommand,
      outputDir,
      baseUrl,
    };

    logger.info(`Received deployment request for [${projectSlug}] (ID: ${deploymentId})`, {
      payload,
    });

    builder
      .executeBuild(payload)
      .then(() => {
        recordDeployment('READY');
        logger.info(`Deployment ${deploymentId} finished successfully`);
      })
      .catch((err) => {
        recordDeployment('FAILED');
        logger.error(`Deployment ${deploymentId} failed: ${err.message}`);
      });

    return res.status(202).json({
      success: true,
      message: 'Deployment initialized and queued for containerized execution',
      deploymentId,
      projectSlug,
      status: 'IN_PROGRESS',
      logsUrl: `/api/logs/${deploymentId}`,
      previewUrl,
      subdomainUrl,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn('Invalid deployment payload', { issues: error.issues });
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input parameters for deployment',
        issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }

    logger.error('Failed to initialize deployment', { error: error.message });
    res.status(500).json({ error: 'Failed to initialize deployment', details: error.message });
  }
});

/**
 * Direct file / HTML code deployment with Zod schema validation
 * POST /api/deploy/direct
 */
router.post('/deploy/direct', async (req, res) => {
  try {
    const validatedData = directDeploySchema.parse(req.body);
    const { projectName, files, html, css, js } = validatedData;

    const projectSlug = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-');
    const deploymentId = `dep-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    recordDeployment('queued');

    const baseUrl = getBaseUrl(req);
    const hostHeader = (req.headers['x-forwarded-host'] || req.get('host') || 'localhost').split(
      ':'
    )[0];
    const previewUrl = `${baseUrl}/site/${projectSlug}/`;
    const subdomainUrl = `${req.protocol || 'http'}://${projectSlug}.${hostHeader}${req.get('host') && req.get('host').includes(':') ? ':' + req.get('host').split(':')[1] : ''}/`;

    const payload = {
      deploymentId,
      projectSlug,
      files,
      html,
      css,
      js,
      baseUrl,
    };

    logger.info(`Received direct deployment request for [${projectSlug}] (ID: ${deploymentId})`);

    builder
      .executeDirectDeploy(payload)
      .then(() => {
        recordDeployment('READY');
        logger.info(`Direct deployment ${deploymentId} completed successfully`);
      })
      .catch((err) => {
        recordDeployment('FAILED');
        logger.error(`Direct deployment ${deploymentId} failed: ${err.message}`);
      });

    return res.status(202).json({
      success: true,
      message: 'Direct deployment queued and processing',
      deploymentId,
      projectSlug,
      status: 'IN_PROGRESS',
      logsUrl: `/api/logs/${deploymentId}`,
      previewUrl,
      subdomainUrl,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn('Invalid direct deployment payload', { issues: error.issues });
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input parameters for direct deployment',
        issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }

    logger.error('Failed to process direct deployment', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Re-trigger deployment with parameter validation
 * POST /api/deployments/:deploymentId/redeploy
 */
router.post('/deployments/:deploymentId/redeploy', async (req, res) => {
  try {
    const { deploymentId } = redeployParamsSchema.parse(req.params);

    const raw = await redis.get(`deployment:${deploymentId}`);
    if (!raw) {
      return res.status(404).json({ error: 'Deployment not found' });
    }
    const old = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const newDeploymentId = `dep-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const payload = {
      deploymentId: newDeploymentId,
      projectSlug: old.projectSlug,
      gitUrl: old.gitUrl && !old.gitUrl.startsWith('template:') ? old.gitUrl : null,
      templateId:
        old.gitUrl && old.gitUrl.startsWith('template:')
          ? old.gitUrl.replace('template:', '')
          : null,
      branch: old.branch || 'main',
    };

    builder.executeBuild(payload);

    res.json({
      success: true,
      message: 'Redeployment triggered',
      deploymentId: newDeploymentId,
      projectSlug: old.projectSlug,
      logsUrl: `/api/logs/${newDeploymentId}`,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Validation Error', issues: error.issues });
    }
    logger.error('Error redeploying project', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
