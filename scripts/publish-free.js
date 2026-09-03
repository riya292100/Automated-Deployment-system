#!/usr/bin/env node
/**
 * Vercel Cloud Clone - Instant Free Publishing Tool
 * Launches the unified platform and opens an instant, free global HTTPS tunnel.
 */
require('dotenv').config();
const http = require('http');
const { spawn } = require('child_process');

process.env.UNIFIED_SERVER = 'true';
const PORT = process.env.PORT || 3000;

console.clear ? console.clear() : console.log('\n');
console.log('================================================================');
console.log('       ▲ VERCEL CLOUD CLONE - INSTANT FREE PUBLISHING           ');
console.log('       Zero Signup • Zero Cost • Encrypted Global HTTPS URL      ');
console.log('================================================================\n');

function checkServerRunning(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function printSuccessBanner(publicUrl) {
  console.log('\n================================================================');
  console.log('       🎉 YOUR VERCEL CLONE IS LIVE AND ONLINE FOR FREE!        ');
  console.log('================================================================\n');
  console.log(`  🌐 Public Live URL:      ${publicUrl}`);
  console.log(`  📊 Cloud Console:        ${publicUrl}/`);
  console.log(`  ⚡ Live Edge Previews:   ${publicUrl}/site/nexus-landing/`);
  console.log(`  🔌 REST API Endpoints:   ${publicUrl}/api/health\n`);
  console.log('  👉 Share this URL with anyone in the world to test your live deployments!');
  console.log('  🔒 SSL Encrypted • Zero Cost • Active while this process is running.\n');
  console.log('================================================================\n');
}

async function startPlatformAndTunnel() {
  console.log(`[1/3] 🔍 Checking local platform on port ${PORT}...`);
  const isRunning = await checkServerRunning(PORT);

  if (isRunning) {
    console.log(`✔ Detected active Vercel Clone server already running on port ${PORT}.`);
  } else {
    console.log(`🚀 Booting Unified Vercel Platform on local port ${PORT}...`);
    try {
      require('../server');
    } catch (err) {
      if (err.code !== 'EADDRINUSE') {
        console.error('Failed to start server:', err);
      }
    }
  }

  console.log(`\n[2/3] 🌐 Connecting free global HTTPS tunnel...`);
  console.log(`      Requesting public edge endpoint from global edge network...\n`);

  let publicUrl = null;

  // Primary: Fast SSH Tunnel (localhost.run)
  const sshProcess = spawn(
    'ssh',
    [
      '-o',
      'StrictHostKeyChecking=no',
      '-o',
      'ServerAliveInterval=30',
      '-R',
      `80:localhost:${PORT}`,
      'nokey@localhost.run',
    ],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );

  sshProcess.stdout.on('data', (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9.-]+\.lhr\.life/);
    if (match && !publicUrl) {
      publicUrl = match[0];
      process.env.BASE_URL = publicUrl;
      printSuccessBanner(publicUrl);
    }
  });

  sshProcess.stderr.on('data', (_data) => {
    // Suppress ssh banner notices
  });

  sshProcess.on('error', () => {
    // Fallback to localtunnel if ssh is unavailable
    if (!publicUrl) {
      startLocaltunnelFallback();
    }
  });

  function startLocaltunnelFallback() {
    console.log('ℹ️ Attempting secondary edge tunnel (Localtunnel)...');
    const npmCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const ltProcess = spawn(npmCmd, ['-y', 'localtunnel', '--port', String(PORT)], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    ltProcess.stdout.on('data', (data) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-zA-Z0-9.-]+\.loca\.lt/);
      if (match && !publicUrl) {
        publicUrl = match[0];
        process.env.BASE_URL = publicUrl;
        printSuccessBanner(publicUrl);
      }
    });
  }

  // Backup fallback trigger after 5 seconds if SSH hasn't returned a URL
  setTimeout(() => {
    if (!publicUrl) {
      startLocaltunnelFallback();
    }
  }, 5000);

  // Status check notification
  setTimeout(() => {
    console.log(`[3/3] 📍 Local Vercel Clone Console: http://localhost:${PORT}`);
    console.log(
      `      Initial Demo Deployment:      http://localhost:${PORT}/site/nexus-landing/\n`
    );
    if (!publicUrl) {
      console.log(`      ⏳ Establishing public tunnel edge route...\n`);
    }
  }, 2000);
}

startPlatformAndTunnel();
