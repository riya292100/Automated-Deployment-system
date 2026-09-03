const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const storage = require('../shared/storage');
const redis = require('../shared/redis-client');

class BuildWorker {
  constructor() {
    this.tempWorkspaceDir = path.resolve(__dirname, '../temp-builds');
    if (!fs.existsSync(this.tempWorkspaceDir)) {
      fs.mkdirSync(this.tempWorkspaceDir, { recursive: true });
    }
  }

  /**
   * Log message to console and publish to Redis Pub/Sub stream
   */
  async log(deploymentId, message, type = 'info') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logPayload = {
      timestamp,
      type,
      message,
    };
    console.log(`[BuildWorker:${deploymentId}] ${message}`);
    await redis.publish(`logs:${deploymentId}`, logPayload);
  }

  /**
   * Detect modern languages and frameworks in workspace
   */
  detectLanguageAndFramework(buildFolder) {
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
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
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
   * Execute build process for a deployment
   */
  async executeBuild(deploymentPayload) {
    const {
      deploymentId,
      projectSlug,
      gitUrl,
      templateId,
      branch = 'main',
      buildCommand,
      installCommand,
      outputDir = 'dist',
    } = deploymentPayload;

    const startTime = Date.now();
    const buildFolder = path.join(this.tempWorkspaceDir, deploymentId);

    try {
      // 1. Initial status update
      await this.updateDeploymentStatus(deploymentId, projectSlug, 'IN_PROGRESS', {
        startedAt: new Date().toISOString(),
        gitUrl: gitUrl || `template:${templateId}`,
        branch,
      });

      await this.log(
        deploymentId,
        `🚀 Initializing containerized build task for [${projectSlug}] (Task ID: ${deploymentId})`,
        'system'
      );
      await this.log(
        deploymentId,
        `📍 Storage Mode: ${storage.getMode().toUpperCase()} | Target S3 Prefix: __outputs/${projectSlug}/`,
        'system'
      );

      // 2. Clone Git Repo or Copy Template
      await this.log(deploymentId, `\n📦 [Step 1/5] Acquiring source code...`, 'step');
      if (templateId) {
        const templatePath = path.resolve(__dirname, `../sample-projects/${templateId}`);
        if (!fs.existsSync(templatePath)) {
          throw new Error(`Sample template '${templateId}' not found.`);
        }
        await this.copyDirectory(templatePath, buildFolder);
        await this.log(
          deploymentId,
          `✔ Loaded built-in starter template: [${templateId}]`,
          'success'
        );
      } else if (gitUrl) {
        await this.log(
          deploymentId,
          `➔ Executing: git clone --depth 1 -b ${branch} ${gitUrl}`,
          'info'
        );
        try {
          execSync(`git clone --depth 1 -b ${branch} "${gitUrl}" "${buildFolder}"`, {
            stdio: 'pipe',
            timeout: 60000,
          });
          await this.log(
            deploymentId,
            `✔ Cloned branch [${branch}] from repository successfully`,
            'success'
          );
        } catch (_gitErr) {
          // If clone fails (e.g. branch doesn't exist, try default clone)
          await this.log(
            deploymentId,
            `⚠️ Branch '${branch}' clone failed, attempting default branch clone...`,
            'warn'
          );
          execSync(`git clone --depth 1 "${gitUrl}" "${buildFolder}"`, {
            stdio: 'pipe',
            timeout: 60000,
          });
          await this.log(
            deploymentId,
            `✔ Cloned default branch from repository successfully`,
            'success'
          );
        }
      } else {
        throw new Error('Neither gitUrl nor templateId was provided.');
      }

      // 3. Dependency Installation & Language Stack Detection
      await this.log(
        deploymentId,
        `\n⚙️ [Step 2/5] Inspecting language stack & environment...`,
        'step'
      );
      const stack = this.detectLanguageAndFramework(buildFolder);
      await this.log(deploymentId, `⚡ Detected Language & Framework: [${stack.summary}]`, 'info');
      const hasPackageJson = fs.existsSync(path.join(buildFolder, 'package.json'));
      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const prebuiltDist = path.join(buildFolder, outputDir || 'dist');
      const hasPrebuiltBundle =
        !buildCommand &&
        !installCommand &&
        fs.existsSync(prebuiltDist) &&
        fs.statSync(prebuiltDist).isDirectory() &&
        fs.readdirSync(prebuiltDist).length > 0;

      if (hasPrebuiltBundle) {
        await this.log(
          deploymentId,
          `✔ Pre-compiled production bundle detected in ./${outputDir || 'dist'} (optimized fast-path deployment).`,
          'success'
        );
      } else if (hasPackageJson) {
        const installCmd =
          installCommand || `${npmCmd} install --prefer-offline --no-audit --no-fund`;
        await this.log(deploymentId, `➔ Running install command: ${installCmd}`, 'info');
        try {
          execSync(installCmd, {
            cwd: buildFolder,
            stdio: 'pipe',
            timeout: 120000,
          });
          await this.log(deploymentId, `✔ Dependencies installed successfully`, 'success');
        } catch (instErr) {
          await this.log(
            deploymentId,
            `⚠️ Warning during dependency install: ${instErr.message}`,
            'warn'
          );
        }
      } else {
        await this.log(
          deploymentId,
          `ℹ Static project detected (no package.json required).`,
          'info'
        );
      }

      // 4. Build Command Execution
      await this.log(deploymentId, `\n🔨 [Step 3/5] Executing application build...`, 'step');
      if (buildCommand) {
        await this.log(deploymentId, `➔ Running: ${buildCommand}`, 'info');
        execSync(buildCommand, {
          cwd: buildFolder,
          stdio: 'pipe',
          timeout: 120000,
        });
        await this.log(deploymentId, `✔ Build command finished cleanly.`, 'success');
      } else if (hasPrebuiltBundle) {
        await this.log(
          deploymentId,
          `✔ Production bundle verified and ready for packaging.`,
          'success'
        );
      } else if (hasPackageJson) {
        const pkg = JSON.parse(fs.readFileSync(path.join(buildFolder, 'package.json'), 'utf8'));
        if (pkg.scripts && pkg.scripts.build) {
          await this.log(deploymentId, `➔ Running detected script: npm run build`, 'info');
          try {
            execSync(`${npmCmd} run build`, {
              cwd: buildFolder,
              stdio: 'pipe',
              timeout: 120000,
            });
            await this.log(deploymentId, `✔ Application compiled successfully.`, 'success');
          } catch (bldErr) {
            await this.log(
              deploymentId,
              `⚠️ Warning during npm run build: ${bldErr.message}`,
              'warn'
            );
          }
        } else {
          await this.log(
            deploymentId,
            `ℹ No custom build script found, using root directory.`,
            'info'
          );
        }
      } else {
        await this.log(deploymentId, `✔ Ready to package static assets.`, 'success');
      }

      // 5. Determine output directory
      let targetDistDir = buildFolder;
      const candidateDirs = [outputDir, 'dist', 'build', 'out', 'public', '.'];
      for (const cand of candidateDirs) {
        const testPath = path.join(buildFolder, cand);
        if (
          cand !== '.' &&
          fs.existsSync(testPath) &&
          fs.statSync(testPath).isDirectory() &&
          fs.readdirSync(testPath).length > 0
        ) {
          targetDistDir = testPath;
          await this.log(deploymentId, `🔍 Located build output directory at: ./${cand}`, 'info');
          break;
        }
      }

      // 6. Upload to S3 Storage
      await this.log(deploymentId, `\n☁️ [Step 4/5] Uploading assets to S3 Storage...`, 'step');
      const s3Prefix = `__outputs/${projectSlug}`;
      let uploadedCount = 0;
      let totalBytes = 0;

      await storage.uploadDirectory(targetDistDir, s3Prefix, (key, size) => {
        uploadedCount++;
        totalBytes += size;
        this.log(
          deploymentId,
          `  ⬆ [S3 PutObject] ${key} (${(size / 1024).toFixed(1)} KB)`,
          'upload'
        );
      });

      await this.log(
        deploymentId,
        `✔ Upload complete! ${uploadedCount} assets transferred to S3 (${(totalBytes / 1024).toFixed(1)} KB total).`,
        'success'
      );

      // 7. Register Route in Redis
      await this.log(
        deploymentId,
        `\n🌐 [Step 5/5] Registering edge routes in Reverse Proxy & Redis...`,
        'step'
      );
      const isUnified =
        process.env.UNIFIED_SERVER === 'true' ||
        process.env.PORT ||
        !process.env.PROXY_PORT ||
        process.env.PROXY_PORT === process.env.API_PORT;
      const base =
        deploymentPayload.baseUrl ||
        process.env.BASE_URL ||
        (isUnified ? '' : `http://localhost:${process.env.PROXY_PORT || 8000}`);
      const deployedUrl = `${base.replace(/\/$/, '')}/site/${projectSlug}/`;
      const durationMs = Date.now() - startTime;

      const deployInfo = {
        deploymentId,
        projectSlug,
        status: 'READY',
        url: deployedUrl,
        s3Prefix,
        fileCount: uploadedCount,
        totalBytes,
        durationMs,
        completedAt: new Date().toISOString(),
        gitUrl: gitUrl || `template:${templateId}`,
        branch,
        stack: stack.summary,
        language: stack.language,
        framework: stack.framework,
      };

      // Save to Redis cache for reverse proxy fast lookup
      await redis.set(`project:${projectSlug}`, deployInfo);
      await redis.set(`deployment:${deploymentId}`, deployInfo);
      await this.updateDeploymentStatus(deploymentId, projectSlug, 'READY', deployInfo);

      await this.log(deploymentId, `\n🎉 [DEPLOYMENT SUCCESSFUL]`, 'complete');
      await this.log(deploymentId, `🔗 Access Live URL: ${deployedUrl}`, 'link');
      await this.log(
        deploymentId,
        `⏱️ Total build and deployment time: ${(durationMs / 1000).toFixed(2)}s`,
        'system'
      );

      // Clean up temp build folder
      try {
        fs.rmSync(buildFolder, { recursive: true, force: true });
      } catch (_e) {}

      return deployInfo;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      await this.log(deploymentId, `\n❌ [DEPLOYMENT FAILED]: ${error.message}`, 'error');

      const failedInfo = {
        deploymentId,
        projectSlug,
        status: 'FAILED',
        error: error.message,
        durationMs,
        completedAt: new Date().toISOString(),
      };

      await redis.set(`deployment:${deploymentId}`, failedInfo);
      await this.updateDeploymentStatus(deploymentId, projectSlug, 'FAILED', failedInfo);

      // Clean up
      try {
        fs.rmSync(buildFolder, { recursive: true, force: true });
      } catch (_e) {}

      throw error;
    }
  }

  async updateDeploymentStatus(deploymentId, projectSlug, status, metadata = {}) {
    const key = `deployments:history`;
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
  }

  async copyDirectory(source, destination) {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }
    const entries = fs.readdirSync(source, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Directly deploy uploaded files or code snippet (Vercel Drag & Drop style)
   */
  async executeDirectDeploy(payload) {
    const {
      deploymentId,
      projectSlug,
      files = [],
      html,
      css,
      js,
      baseUrl,
    } = payload;

    const startTime = Date.now();
    const buildFolder = path.join(this.tempWorkspaceDir, deploymentId);

    try {
      if (!fs.existsSync(buildFolder)) {
        fs.mkdirSync(buildFolder, { recursive: true });
      }

      await this.updateDeploymentStatus(deploymentId, projectSlug, 'IN_PROGRESS', {
        startedAt: new Date().toISOString(),
        gitUrl: 'direct-upload',
        branch: 'main',
      });

      await this.log(
        deploymentId,
        `🚀 Direct Deploy Task initialized for [${projectSlug}] (ID: ${deploymentId})`,
        'system'
      );
      await this.log(
        deploymentId,
        `📍 Storage Mode: ${storage.getMode().toUpperCase()} | Prefix: __outputs/${projectSlug}/`,
        'system'
      );

      // Step 1: Write files
      await this.log(deploymentId, `\n📦 [Step 1/4] Processing direct files...`, 'step');
      let writtenFilesCount = 0;

      if (Array.isArray(files) && files.length > 0) {
        for (const file of files) {
          const safeRelPath = (file.path || file.name || 'index.html')
            .replace(/^(\.\.[\/\\])+/, '')
            .replace(/^\/+/, '');
          const destPath = path.join(buildFolder, safeRelPath);
          const dir = path.dirname(destPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(destPath, file.content || '');
          writtenFilesCount++;
        }
      } else if (html) {
        fs.writeFileSync(path.join(buildFolder, 'index.html'), html);
        writtenFilesCount++;
        if (css) {
          fs.writeFileSync(path.join(buildFolder, 'style.css'), css);
          writtenFilesCount++;
        }
        if (js) {
          fs.writeFileSync(path.join(buildFolder, 'main.js'), js);
          writtenFilesCount++;
        }
      } else {
        throw new Error('No files or HTML content provided for direct deployment.');
      }

      await this.log(
        deploymentId,
        `✔ Wrote ${writtenFilesCount} source files into workspace.`,
        'success'
      );

      // Step 2: Language detection
      await this.log(deploymentId, `\n⚙️ [Step 2/4] Inspecting deployment stack...`, 'step');
      const stack = this.detectLanguageAndFramework(buildFolder);
      await this.log(deploymentId, `⚡ Stack: [${stack.summary}]`, 'info');

      // Step 3: S3 Upload
      await this.log(deploymentId, `\n☁️ [Step 3/4] Uploading assets to S3 edge storage...`, 'step');
      const s3Prefix = `__outputs/${projectSlug}`;
      let uploadedCount = 0;
      let totalBytes = 0;

      await storage.uploadDirectory(buildFolder, s3Prefix, (key, size) => {
        uploadedCount++;
        totalBytes += size;
        this.log(
          deploymentId,
          `  ⬆ [S3 PutObject] ${key} (${(size / 1024).toFixed(1)} KB)`,
          'upload'
        );
      });

      await this.log(
        deploymentId,
        `✔ Upload complete! ${uploadedCount} assets transferred to S3 (${(totalBytes / 1024).toFixed(1)} KB total).`,
        'success'
      );

      // Step 4: Register route
      await this.log(
        deploymentId,
        `\n🌐 [Step 4/4] Registering edge routes in Reverse Proxy & Redis...`,
        'step'
      );
      const isUnified =
        process.env.UNIFIED_SERVER === 'true' ||
        process.env.PORT ||
        !process.env.PROXY_PORT ||
        process.env.PROXY_PORT === process.env.API_PORT;
      const base =
        baseUrl ||
        process.env.BASE_URL ||
        (isUnified ? '' : `http://localhost:${process.env.PROXY_PORT || 8000}`);
      const deployedUrl = `${base.replace(/\/$/, '')}/site/${projectSlug}/`;
      const durationMs = Date.now() - startTime;

      const deployInfo = {
        deploymentId,
        projectSlug,
        status: 'READY',
        url: deployedUrl,
        s3Prefix,
        fileCount: uploadedCount,
        totalBytes,
        durationMs,
        completedAt: new Date().toISOString(),
        gitUrl: 'direct-upload',
        branch: 'main',
        stack: stack.summary,
        language: stack.language,
        framework: stack.framework,
      };

      await redis.set(`project:${projectSlug}`, deployInfo);
      await redis.set(`deployment:${deploymentId}`, deployInfo);
      await this.updateDeploymentStatus(deploymentId, projectSlug, 'READY', deployInfo);

      await this.log(deploymentId, `\n🎉 [DEPLOYMENT SUCCESSFUL]`, 'complete');
      await this.log(deploymentId, `🔗 Access Live URL: ${deployedUrl}`, 'link');
      await this.log(
        deploymentId,
        `⏱️ Total deployment time: ${(durationMs / 1000).toFixed(2)}s`,
        'system'
      );

      try {
        fs.rmSync(buildFolder, { recursive: true, force: true });
      } catch (_e) {}

      return deployInfo;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      await this.log(deploymentId, `\n❌ [DEPLOYMENT FAILED]: ${error.message}`, 'error');

      const failedInfo = {
        deploymentId,
        projectSlug,
        status: 'FAILED',
        error: error.message,
        durationMs,
        completedAt: new Date().toISOString(),
      };

      await redis.set(`deployment:${deploymentId}`, failedInfo);
      await this.updateDeploymentStatus(deploymentId, projectSlug, 'FAILED', failedInfo);

      try {
        fs.rmSync(buildFolder, { recursive: true, force: true });
      } catch (_e) {}

      throw error;
    }
  }
}

const buildWorker = new BuildWorker();
module.exports = buildWorker;
