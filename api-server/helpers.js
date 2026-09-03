/**
 * Shared API Server Helpers & Metrics
 */

const requestMetrics = {
  totalRequests: 0,
  endpoints: {},
};

let totalDeploymentsCount = 0;
let successfulDeploymentsCount = 0;
let failedDeploymentsCount = 0;

function getBaseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  const isUnified =
    process.env.UNIFIED_SERVER === 'true' ||
    process.env.PORT ||
    !process.env.PROXY_PORT ||
    process.env.PROXY_PORT === process.env.API_PORT;

  if (isUnified) {
    return `${req.protocol || 'http'}://${req.get('host') || 'localhost:3000'}`;
  }
  const proxyPort = process.env.PROXY_PORT || 8000;
  return `${req.protocol || 'http'}://${(req.hostname || 'localhost').split(':')[0]}:${proxyPort}`;
}

function recordDeployment(status) {
  totalDeploymentsCount++;
  if (status === 'READY' || status === 'success') {
    successfulDeploymentsCount++;
  } else if (status === 'FAILED' || status === 'error') {
    failedDeploymentsCount++;
  }
}

function getDeploymentCounts() {
  return {
    total: totalDeploymentsCount,
    successful: successfulDeploymentsCount,
    failed: failedDeploymentsCount,
  };
}

module.exports = {
  requestMetrics,
  getBaseUrl,
  recordDeployment,
  getDeploymentCounts,
};
