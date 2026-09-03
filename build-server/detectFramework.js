const fs = require('fs');
const path = require('path');

/**
 * Detect modern programming languages and frameworks in workspace
 * @param {string} buildFolder Directory containing project source code
 * @returns {{ language: string, framework: string, summary: string }}
 */
function detectLanguageAndFramework(buildFolder) {
  const hasPackageJson = fs.existsSync(path.join(buildFolder, 'package.json'));
  const hasTsConfig = fs.existsSync(path.join(buildFolder, 'tsconfig.json'));
  const hasCargo =
    fs.existsSync(path.join(buildFolder, 'Cargo.toml')) ||
    fs.existsSync(path.join(buildFolder, 'Cargo.lock'));
  const hasPython =
    fs.existsSync(path.join(buildFolder, 'requirements.txt')) ||
    fs.existsSync(path.join(buildFolder, 'pyproject.toml')) ||
    fs.existsSync(path.join(buildFolder, 'app.py')) ||
    fs.existsSync(path.join(buildFolder, 'main.py'));
  const hasVite =
    fs.existsSync(path.join(buildFolder, 'vite.config.js')) ||
    fs.existsSync(path.join(buildFolder, 'vite.config.ts')) ||
    fs.existsSync(path.join(buildFolder, 'vite.config.mjs'));
  const hasNext =
    fs.existsSync(path.join(buildFolder, 'next.config.js')) ||
    fs.existsSync(path.join(buildFolder, 'next.config.ts')) ||
    fs.existsSync(path.join(buildFolder, 'next.config.mjs'));

  let framework = 'Static Web App';
  let language = 'JavaScript';

  if (hasCargo) {
    language = 'Rust / WASM';
    framework = 'WebAssembly Micro-Engine';
    return { language, framework, summary: `${language} (${framework})` };
  }

  if (hasPython) {
    language = 'Python';
    framework = 'Pyodide Data Engine';
    return { language, framework, summary: `${language} (${framework})` };
  }

  if (hasTsConfig) {
    language = 'TypeScript';
  }

  if (hasPackageJson) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(buildFolder, 'package.json'), 'utf8'));
      const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (allDeps.react) {
        const reactVer = allDeps.react.includes('19') ? 'React 19' : 'React';
        framework = hasVite ? `${reactVer} + Vite` : reactVer;
      } else if (allDeps.vue) {
        framework = hasVite ? 'Vue 3 + Vite' : 'Vue 3';
      } else if (allDeps.svelte) {
        framework = hasVite ? 'Svelte 5 + Vite' : 'Svelte';
      } else if (hasNext || allDeps.next) {
        framework = 'Next.js 15';
      } else if (allDeps.astro) {
        framework = 'Astro 5';
      } else if (hasVite) {
        framework = 'Vite Modern SPA';
      } else {
        framework = 'Node.js App';
      }
    } catch (_e) {
      framework = 'Node.js App';
    }
  }

  return {
    language,
    framework,
    summary: `${language} (${framework})`,
  };
}

/**
 * Recursively copy a directory and its contents
 * @param {string} source
 * @param {string} destination
 */
async function copyDirectory(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }
  const entries = fs.readdirSync(source, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Record and persist deployment history into Redis
 */
async function updateDeploymentStatus(redis, deploymentId, projectSlug, status, metadata = {}) {
  const key = 'deployments:history';
  let history = [];
  const raw = await redis.get(key);
  if (raw) {
    try {
      history = JSON.parse(raw);
    } catch (_e) {
      history = [];
    }
  }

  const index = history.findIndex((d) => d.deploymentId === deploymentId);
  const item = {
    deploymentId,
    projectSlug,
    status,
    updatedAt: new Date().toISOString(),
    ...metadata,
  };

  if (index >= 0) {
    history[index] = { ...history[index], ...item };
  } else {
    history.unshift(item);
  }

  await redis.set(key, history);
  return item;
}

/**
 * Determine canonical base and deployed URL for a deployment
 */
function resolveDeployedUrl(baseUrl, projectSlug) {
  const isUnified =
    process.env.UNIFIED_SERVER === 'true' ||
    process.env.PORT ||
    !process.env.PROXY_PORT ||
    process.env.PROXY_PORT === process.env.API_PORT;
  const base =
    baseUrl ||
    process.env.BASE_URL ||
    (isUnified ? '' : `http://localhost:${process.env.PROXY_PORT || 8000}`);
  return `${base.replace(/\/$/, '')}/site/${projectSlug}/`;
}

/**
 * Write direct upload payload files to build directory
 */
function writeDirectFiles(buildFolder, files, html, css, js) {
  let count = 0;
  if (Array.isArray(files) && files.length > 0) {
    for (const file of files) {
      const safeRelPath = (file.path || file.name || 'index.html')
        .replace(/^(\.\.[/\\])+/, '')
        .replace(/^\/+/, '');
      const destPath = path.join(buildFolder, safeRelPath);
      const dir = path.dirname(destPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(destPath, file.content || '');
      count++;
    }
  } else if (html) {
    fs.writeFileSync(path.join(buildFolder, 'index.html'), html);
    count++;
    if (css) {
      fs.writeFileSync(path.join(buildFolder, 'style.css'), css);
      count++;
    }
    if (js) {
      fs.writeFileSync(path.join(buildFolder, 'main.js'), js);
      count++;
    }
  } else {
    throw new Error('No files or HTML content provided for direct deployment.');
  }
  return count;
}

module.exports = {
  detectLanguageAndFramework,
  copyDirectory,
  updateDeploymentStatus,
  resolveDeployedUrl,
  writeDirectFiles,
};
