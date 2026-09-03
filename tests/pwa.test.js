const fs = require('fs');
const path = require('path');

describe('Mobile App & PWA Infrastructure Suite', () => {
  const dashboardDir = path.join(__dirname, '..', 'dashboard');

  test('should have a valid Web App Manifest (manifest.json)', () => {
    const manifestPath = path.join(dashboardDir, 'manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.short_name).toBeDefined();
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
  });

  test('should have a functional Service Worker (sw.js)', () => {
    const swPath = path.join(dashboardDir, 'sw.js');
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, 'utf8');
    expect(swContent).toContain("addEventListener('install'");
    expect(swContent).toContain("addEventListener('fetch'");
  });

  test('should have high-resolution mobile app icons', () => {
    const iconsDir = path.join(dashboardDir, 'icons');
    expect(fs.existsSync(path.join(iconsDir, 'icon.svg'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'icon-192.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'icon-512.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'icon-maskable.png'))).toBe(true);

    const stat192 = fs.statSync(path.join(iconsDir, 'icon-192.png'));
    expect(stat192.size).toBeGreaterThan(100);
  });

  test('should have valid Capacitor and TWA packaging manifests', () => {
    const capPath = path.join(__dirname, '..', 'capacitor.config.json');
    const twaPath = path.join(__dirname, '..', 'twa-manifest.json');

    expect(fs.existsSync(capPath)).toBe(true);
    expect(fs.existsSync(twaPath)).toBe(true);

    const cap = JSON.parse(fs.readFileSync(capPath, 'utf8'));
    const twa = JSON.parse(fs.readFileSync(twaPath, 'utf8'));

    expect(cap.appId).toBe('com.vercelclone.app');
    expect(twa.packageId).toBe('com.vercelclone.twa');
  });
});
