#!/usr/bin/env node
/**
 * Vercel Cloud Clone - Instant Free Publishing Tool
 * Launches the unified platform and opens an instant, free global HTTPS tunnel.
 */
require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');

process.env.UNIFIED_SERVER = 'true';
const PORT = process.env.PORT || 3000;

console.clear ? console.clear() : console.log('\n');
console.log('================================================================');
console.log('       ▲ VERCEL CLOUD CLONE - INSTANT FREE PUBLISHING           ');
console.log('       Zero Signup • Zero Cost • Encrypted Global HTTPS URL      ');
console.log('================================================================\n');

console.log(`[1/3] 🚀 Initializing Unified Vercel Platform on local port ${PORT}...`);

// Start the unified server
const server = require('../server');

setTimeout(() => {
  console.log(`[2/3] 🌐 Connecting free global HTTPS tunnel...`);
  console.log(`      Requesting public edge endpoint from Localtunnel / Cloudflare...\n`);

  const npmCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const tunnelProcess = spawn(npmCmd, ['-y', 'localtunnel', '--port', String(PORT)], {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
  });

  let publicUrl = null;

  tunnelProcess.stdout.on('data', (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[^\s]+/);
    if (match && !publicUrl) {
      publicUrl = match[0];
      process.env.BASE_URL = publicUrl;

      console.log('================================================================');
      console.log('       🎉 YOUR VERCEL CLONE IS LIVE AND ONLINE FOR FREE!        ');
      console.log('================================================================\n');
      console.log(`  🌐 Public Live URL:      ${publicUrl}`);
      console.log(`  📊 Cloud Console:        ${publicUrl}/`);
      console.log(`  ⚡ Live Edge Previews:   ${publicUrl}/site/:slug/`);
      console.log(`  🔌 REST API Endpoints:   ${publicUrl}/api/health\n`);
      console.log('  👉 Share this URL with anyone in the world to test your live deployments!');
      console.log('  🔒 SSL Encrypted • Zero Cost • Active while this terminal is open.\n');
      console.log('  Press Ctrl+C to terminate the live session.');
      console.log('================================================================\n');
    }
  });

  tunnelProcess.stderr.on('data', (data) => {
    const errText = data.toString();
    if (!publicUrl && errText.includes('error')) {
      console.log(`\n⚠️ Tunnel notice: ${errText.trim()}`);
    }
  });

  tunnelProcess.on('close', (code) => {
    if (!publicUrl) {
      console.log('\nℹ️ Tunnel closed. Platform remains accessible locally at:');
      console.log(`   http://localhost:${PORT}`);
    }
  });

  // Fallback notification after 10s if tunnel network is slow
  setTimeout(() => {
    if (!publicUrl) {
      console.log(`[3/3] ℹ️ Local Vercel Clone is running at: http://localhost:${PORT}`);
      console.log(`      If tunnel is still connecting, you can also deploy to Render Free Tier (see render.yaml).\n`);
    }
  }, 10000);
}, 1500);
