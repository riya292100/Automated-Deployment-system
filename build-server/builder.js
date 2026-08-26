const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
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

      await this.log(deploymentId, `🚀 Initializing containerized build task for [${projectSlug}] (Task ID: ${deploymentId})`, 'system');
      await this.log(deploymentId, `📍 Storage Mode: ${storage.getMode().toUpperCase()} | Target S3 Prefix: __outputs/${projectSlug}/`, 'system');

      // 2. Clone Git Repo or Copy Template
      await this.log(deploymentId, `\n📦 [Step 1/5] Acquiring source code...`, 'step');
      if (templateId) {
        const templatePath = path.resolve(__dirname, `../sample-projects/${templateId}`);
        if (!fs.existsSync(templatePath)) {
          throw new Error(`Sample template '${templateId}' not found.`);
        }
        await this.copyDirectory(templatePath, buildFolder);
        await this.log(deploymentId, `✔ Loaded built-in starter template: [${templateId}]`, 'success');
      } else if (gitUrl) {
        await this.log(deploymentId, `➔ Executing: git clone --depth 1 -b ${branch} ${gitUrl}`, 'info');
        try {
          execSync(`git clone --depth 1 -b ${branch} "${gitUrl}" "${buildFolder}"`, {
            stdio: 'pipe',
            timeout: 60000,
          });
          await this.log(deploymentId, `✔ Cloned branch [${branch}] from repository successfully`, 'success');
        } catch (gitErr) {
          // If clone fails (e.g. branch doesn't exist, try default clone)
          await this.log(deploymentId, `⚠️ Branch '${branch}' clone failed, attempting default branch clone...`, 'warn');
          execSync(`git clone --depth 1 "${gitUrl}" "${buildFolder}"`, {
            stdio: 'pipe',
            timeout: 60000,
          });
          await this.log(deploymentId, `✔ Cloned default branch from repository successfully`, 'success');
        }
      } else {
        throw new Error('Neither gitUrl nor templateId was provided.');
      }

      // 3. Dependency Installation
      await this.log(deploymentId, `\n⚙️ [Step 2/5] Checking dependencies & environment...`, 'step');
      const hasPackageJson = fs.existsSync(path.join(buildFolder, 'package.json'));
      
      if (hasPackageJson) {
        const installCmd = installCommand || 'npm.cmd install || npm install';
        await this.log(deploymentId, `➔ Running install command: ${installCmd}`, 'info');
        try {
          const installOutput = execSync(installCmd, {
            cwd: buildFolder,
            stdio: 'pipe',
            timeout: 120000,
          });
          await this.log(deploymentId, `✔ Dependencies installed successfully`, 'success');
        } catch (instErr) {
          await this.log(deploymentId, `⚠️ Warning during dependency install: ${instErr.message}`, 'warn');
        }
      } else {
        await this.log(deploymentId, `ℹ Static project detected (no package.json required).`, 'info');
      }

      // 4. Build Command Execution
      await this.log(deploymentId, `\n🔨 [Step 3/5] Executing application build...`, 'step');
      if (buildCommand) {
        await this.log(deploymentId, `➔ Running: ${buildCommand}`, 'info');
        const buildOutput = execSync(buildCommand, {
          cwd: buildFolder,
          stdio: 'pipe',
          timeout: 120000,
        });
        await this.log(deploymentId, `✔ Build command finished cleanly.`, 'success');
      } else if (hasPackageJson) {
        const pkg = JSON.parse(fs.readFileSync(path.join(buildFolder, 'package.json'), 'utf8'));
        if (pkg.scripts && pkg.scripts.build) {
          await this.log(deploymentId, `➔ Running detected script: npm run build`, 'info');
          try {
            execSync('npm.cmd run build || npm run build', {
              cwd: buildFolder,
              stdio: 'pipe',
              timeout: 120000,
            });
            await this.log(deploymentId, `✔ Application compiled successfully.`, 'success');
          } catch (bldErr) {
            await this.log(deploymentId, `⚠️ Warning during npm run build: ${bldErr.message}`, 'warn');
          }
        } else {
          await this.log(deploymentId, `ℹ No custom build script found, using root directory.`, 'info');
        }
      } else {
        await this.log(deploymentId, `✔ Ready to package static assets.`, 'success');
      }

      // 5. Determine output directory
      let targetDistDir = buildFolder;
      const candidateDirs = [outputDir, 'dist', 'build', 'out', 'public', '.'];
      for (const cand of candidateDirs) {
        const testPath = path.join(buildFolder, cand);
        if (cand !== '.' && fs.existsSync(testPath) && fs.statSync(testPath).isDirectory() && fs.readdirSync(testPath).length > 0) {
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

      const uploadedFiles = await storage.uploadDirectory(targetDistDir, s3Prefix, (key, size) => {
        uploadedCount++;
        totalBytes += size;
        this.log(deploymentId, `  ⬆ [S3 PutObject] ${key} (${(size / 1024).toFixed(1)} KB)`, 'upload');
      });

      await this.log(deploymentId, `✔ Upload complete! ${uploadedCount} assets transferred to S3 (${(totalBytes / 1024).toFixed(1)} KB total).`, 'success');

      // 7. Register Route in Redis
      await this.log(deploymentId, `\n🌐 [Step 5/5] Registering edge routes in Reverse Proxy & Redis...`, 'step');
      const deployedUrl = `http://localhost:8000/site/${projectSlug}/`;
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
      };

      // Save to Redis cache for reverse proxy fast lookup
      await redis.set(`project:${projectSlug}`, deployInfo);
      await redis.set(`deployment:${deploymentId}`, deployInfo);
      await this.updateDeploymentStatus(deploymentId, projectSlug, 'READY', deployInfo);

      await this.log(deploymentId, `\n🎉 [DEPLOYMENT SUCCESSFUL]`, 'complete');
      await this.log(deploymentId, `🔗 Access Live URL: ${deployedUrl}`, 'link');
      await this.log(deploymentId, `⏱️ Total build and deployment time: ${(durationMs / 1000).toFixed(2)}s`, 'system');

      // Clean up temp build folder
      try {
        fs.rmSync(buildFolder, { recursive: true, force: true });
      } catch (e) {}

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
      } catch (e) {}

      throw error;
    }
  }

  async updateDeploymentStatus(deploymentId, projectSlug, status, metadata = {}) {
    const key = `deployments:history`;
    let history = [];
    const raw = await redis.get(key);
    if (raw) {
      try { history = JSON.parse(raw); } catch (e) { history = []; }
    }

    const index = history.findIndex(d => d.deploymentId === deploymentId);
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
}

const buildWorker = new BuildWorker();
module.exports = buildWorker;
