/**
 * Automated Deployment System Dashboard Client Logic
 */

class DashboardApp {
  constructor() {
    this.apiBase = window.location.origin;
    this.currentDeploymentId = null;
    this.currentProjectSlug = null;
    this.eventSource = null;
    this.autoScroll = true;
    this.deployType = 'template';
    this.deployments = [];
    this.timerInterval = null;
    this.startTime = null;

    this.init();
  }

  init() {
    this.setupTabs();
    this.setupModal();
    this.loadAnalytics();
    this.loadDeployments();
    this.checkHealth();

    // Auto-refresh analytics and deployments every 10 seconds
    setInterval(() => {
      this.loadAnalytics();
      this.loadDeployments(true);
    }, 10000);
  }

  /* -------------------------------------------------------------
   * NAVIGATION & TABS
   * ------------------------------------------------------------- */
  setupTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabKey = btn.getAttribute('data-tab');
        this.switchTab(tabKey);
      });
    });
  }

  switchTab(tabKey) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

    const targetNav = document.querySelector(`.nav-item[data-tab="${tabKey}"]`);
    const targetPanel = document.getElementById(`tab-${tabKey}`);

    if (targetNav) targetNav.classList.add('active');
    if (targetPanel) targetPanel.classList.add('active');

    // Title updates
    const titles = {
      overview: { title: 'Deployments & System Overview', desc: 'Manage containerized builds, S3 distributions, and edge reverse-proxy routing' },
      architecture: { title: 'System Architecture & DFD Map', desc: 'Interactive High Level Design & Level 0/1 Data Flow Diagram across AWS ECS, S3, Redis, and Reverse Proxy' },
      terminal: { title: 'Live Container Build Terminal', desc: 'Real-time ANSI stream from isolated Docker/ECS build worker' },
      preview: { title: 'Live Site Preview & CDN Sandbox', desc: 'Zero-latency edge-routed preview directly from S3 Reverse Proxy' },
      settings: { title: 'Cloud Infrastructure Settings', desc: 'Configure AWS S3 credentials, AWS ECS parameters, and Redis endpoints' },
    };

    if (titles[tabKey]) {
      document.getElementById('page-title').textContent = titles[tabKey].title;
      document.getElementById('page-desc').textContent = titles[tabKey].desc;
    }
  }

  /* -------------------------------------------------------------
   * DATA FETCHING & TELEMETRY
   * ------------------------------------------------------------- */
  async loadAnalytics() {
    try {
      const res = await fetch(`${this.apiBase}/api/analytics`);
      const data = await res.json();

      document.getElementById('kpi-total-deploys').textContent = data.totalDeployments || 0;
      document.getElementById('kpi-active-projects').textContent = data.activeProjects || 0;
      document.getElementById('kpi-avg-build-time').textContent = `${data.avgBuildTimeSeconds || '0.0'}s`;
      document.getElementById('kpi-storage-used').textContent = data.storageUsedFormatted || '0.0 MB';
      document.getElementById('kpi-cache-hit').textContent = data.cacheHitRate || '99.8%';

      const storageTag = document.getElementById('storage-status-tag');
      if (storageTag) {
        storageTag.textContent = data.storageMode === 'aws' ? 'AWS S3 Cloud' : 'Local S3 (Sim)';
      }
    } catch (e) {
      console.warn('Failed to load analytics:', e);
    }
  }

  async loadDeployments(silent = false) {
    try {
      const res = await fetch(`${this.apiBase}/api/deployments`);
      const data = await res.json();
      this.deployments = data.deployments || [];
      this.renderDeploymentsTable();
    } catch (e) {
      if (!silent) console.warn('Failed to load deployments:', e);
    }
  }

  renderDeploymentsTable() {
    const tbody = document.getElementById('deployments-table-body');
    if (!this.deployments || this.deployments.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center empty-state">
            <div class="empty-box">
              <span class="empty-icon">📦</span>
              <p>No deployments yet. Click <strong>"New Deployment"</strong> or choose a 1-Click Starter above to launch!</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = this.deployments.map(item => {
      let statusClass = 'status-in-progress';
      if (item.status === 'READY') statusClass = 'status-ready';
      if (item.status === 'FAILED') statusClass = 'status-failed';

      const durationStr = item.durationMs ? `${(item.durationMs / 1000).toFixed(1)}s` : '-';
      const fileCountStr = item.fileCount ? `${item.fileCount} files` : '-';
      const deployedTime = item.completedAt || item.updatedAt ? new Date(item.completedAt || item.updatedAt).toLocaleTimeString() : 'In Progress';
      const previewUrl = item.url || `http://localhost:8000/site/${item.projectSlug}/`;

      return `
        <tr>
          <td>
            <strong>${item.projectSlug}</strong>
            <div style="font-size: 0.75rem; color: var(--text-dim); font-family: var(--font-mono);">${item.deploymentId}</div>
          </td>
          <td>
            <span class="status-badge ${statusClass}">
              ${item.status === 'IN_PROGRESS' ? '● Building' : (item.status === 'READY' ? '✔ Ready' : '✖ Failed')}
            </span>
          </td>
          <td>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${item.gitUrl || 'Starter Template'}</span>
          </td>
          <td>${durationStr}</td>
          <td>${fileCountStr}</td>
          <td>${deployedTime}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              ${item.status === 'READY' ? `
                <button class="btn btn-sm btn-outline" onclick="app.openSitePreview('${previewUrl}', '${item.projectSlug}')">Preview</button>
                <a href="${previewUrl}" target="_blank" class="btn btn-sm btn-secondary">Open ↗</a>
              ` : `
                <button class="btn btn-sm btn-outline" onclick="app.viewDeploymentLogs('${item.deploymentId}', '${item.projectSlug}')">Logs</button>
              `}
              <button class="btn btn-sm btn-secondary" onclick="app.redeploy('${item.deploymentId}')">Redeploy</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /* -------------------------------------------------------------
   * DEPLOYMENT ACTIONS & LIVE STREAMING
   * ------------------------------------------------------------- */
  async quickDeploy(templateId, projectName) {
    const defaultSlug = `${templateId}-${Math.random().toString(36).substring(2, 6)}`;
    await this.launchDeployment({
      templateId,
      projectName: defaultSlug,
    });
  }

  async launchDeployment(payload) {
    try {
      this.switchTab('terminal');
      this.resetTerminalView(payload.projectName || payload.templateId);

      const pulseBadge = document.getElementById('terminal-pulse');
      if (pulseBadge) pulseBadge.style.display = 'inline-block';

      const res = await fetch(`${this.apiBase}/api/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Deployment failed to dispatch');
      }

      this.currentDeploymentId = data.deploymentId;
      this.currentProjectSlug = data.projectSlug;

      document.getElementById('term-deploy-id').textContent = data.deploymentId;
      document.getElementById('term-project-slug').textContent = data.projectSlug;
      document.getElementById('console-title-text').textContent = `terminal@ecs-worker:${data.projectSlug}`;

      // Start elapsed timer
      this.startTime = Date.now();
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => {
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
        document.getElementById('term-duration').textContent = `${elapsed}s`;
      }, 100);

      // Connect to Real-time SSE Log Stream
      this.connectLogStream(data.deploymentId);
      this.loadDeployments();
      this.loadAnalytics();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  connectLogStream(deploymentId) {
    if (this.eventSource) {
      this.eventSource.close();
    }

    const streamUrl = `${this.apiBase}/api/logs/${deploymentId}`;
    this.eventSource = new EventSource(streamUrl);

    this.eventSource.onmessage = (e) => {
      if (!e.data || e.data.trim() === ': keepalive') return;

      try {
        const logObj = JSON.parse(e.data);
        this.appendLogLine(logObj);
      } catch (err) {
        this.appendRawLog(e.data);
      }
    };

    this.eventSource.onerror = () => {
      // Stream completed or closed
      const pulseBadge = document.getElementById('terminal-pulse');
      if (pulseBadge) pulseBadge.style.display = 'none';
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.loadDeployments();
      this.loadAnalytics();
    };
  }

  appendLogLine(logObj) {
    const consoleEl = document.getElementById('terminal-stream');
    const line = document.createElement('div');
    line.className = `log-line ${logObj.type || 'info'}`;
    line.textContent = `[${logObj.timestamp || ''}] ${logObj.message}`;
    consoleEl.appendChild(line);

    // Update build stepper states based on log text
    this.updateStepperFromLog(logObj.message);

    if (this.autoScroll) {
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
  }

  appendRawLog(text) {
    const consoleEl = document.getElementById('terminal-stream');
    const line = document.createElement('div');
    line.className = 'log-line info';
    line.textContent = text;
    consoleEl.appendChild(line);

    this.updateStepperFromLog(text);

    if (this.autoScroll) {
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
  }

  updateStepperFromLog(msg) {
    const badge = document.getElementById('stepper-status-badge');
    if (!badge) return;

    if (msg.includes('[Step 1/5]')) {
      this.setStepActive(1);
      badge.textContent = 'ACQUIRING SOURCE';
      badge.className = 'badge status-in-progress';
    } else if (msg.includes('[Step 2/5]')) {
      this.setStepCompleted(1);
      this.setStepActive(2);
      badge.textContent = 'CHECKING ENVIRONMENT';
    } else if (msg.includes('[Step 3/5]')) {
      this.setStepCompleted(2);
      this.setStepActive(3);
      badge.textContent = 'COMPILING CONTAINER';
    } else if (msg.includes('[Step 4/5]')) {
      this.setStepCompleted(3);
      this.setStepActive(4);
      badge.textContent = 'UPLOADING TO S3';
    } else if (msg.includes('[Step 5/5]')) {
      this.setStepCompleted(4);
      this.setStepActive(5);
      badge.textContent = 'ROUTING EDGE PROXY';
    } else if (msg.includes('[DEPLOYMENT SUCCESSFUL]')) {
      this.setStepCompleted(5);
      badge.textContent = 'DEPLOYED (READY)';
      badge.className = 'badge status-ready';
      if (this.timerInterval) clearInterval(this.timerInterval);

      // Auto enable site preview
      if (this.currentProjectSlug) {
        const previewUrl = `http://localhost:8000/site/${this.currentProjectSlug}/`;
        document.getElementById('preview-url-input').value = previewUrl;
        document.getElementById('preview-external-link').href = previewUrl;
      }
    } else if (msg.includes('[DEPLOYMENT FAILED]')) {
      badge.textContent = 'FAILED';
      badge.className = 'badge status-failed';
      if (this.timerInterval) clearInterval(this.timerInterval);
    }
  }

  setStepActive(stepNum) {
    for (let i = 1; i <= 5; i++) {
      const el = document.getElementById(`step-${i}`);
      if (i === stepNum) el.className = 'step-item active';
      else if (i < stepNum) el.className = 'step-item completed';
      else el.className = 'step-item';
    }
  }

  setStepCompleted(stepNum) {
    const el = document.getElementById(`step-${stepNum}`);
    if (el) el.className = 'step-item completed';
  }

  resetTerminalView(slug) {
    document.getElementById('terminal-stream').innerHTML = `
      <div class="log-line system">[System] Initializing new deployment workflow for ${slug}...</div>
    `;
    this.setStepActive(1);
    const badge = document.getElementById('stepper-status-badge');
    if (badge) {
      badge.textContent = 'INITIALIZING';
      badge.className = 'badge status-in-progress';
    }
  }

  viewDeploymentLogs(deploymentId, projectSlug) {
    this.switchTab('terminal');
    this.currentDeploymentId = deploymentId;
    this.currentProjectSlug = projectSlug;
    document.getElementById('term-deploy-id').textContent = deploymentId;
    document.getElementById('term-project-slug').textContent = projectSlug;
    document.getElementById('terminal-stream').innerHTML = '';
    this.connectLogStream(deploymentId);
  }

  async redeploy(deploymentId) {
    try {
      const res = await fetch(`${this.apiBase}/api/deployments/${deploymentId}/redeploy`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Redeploy failed');

      this.switchTab('terminal');
      this.resetTerminalView(data.projectSlug);
      this.connectLogStream(data.deploymentId);
    } catch (e) {
      alert(`Redeploy error: ${e.message}`);
    }
  }

  clearTerminal() {
    document.getElementById('terminal-stream').innerHTML = `
      <div class="log-line dim">Terminal console cleared.</div>
    `;
  }

  copyLogs() {
    const text = document.getElementById('terminal-stream').innerText;
    navigator.clipboard.writeText(text).then(() => {
      alert('Terminal logs copied to clipboard!');
    });
  }

  toggleAutoScroll() {
    this.autoScroll = !this.autoScroll;
    const btn = document.getElementById('btn-auto-scroll');
    btn.textContent = `📜 Auto-Scroll: ${this.autoScroll ? 'ON' : 'OFF'}`;
  }

  /* -------------------------------------------------------------
   * SITE PREVIEW
   * ------------------------------------------------------------- */
  openSitePreview(url, slug) {
    this.switchTab('preview');
    const input = document.getElementById('preview-url-input');
    const iframe = document.getElementById('site-preview-iframe');
    const link = document.getElementById('preview-external-link');

    input.value = url;
    iframe.src = url;
    link.href = url;
  }

  reloadPreview() {
    const iframe = document.getElementById('site-preview-iframe');
    iframe.src = iframe.src;
  }

  setDeviceWidth(width, btn) {
    document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('site-preview-iframe').style.width = width;
  }

  /* -------------------------------------------------------------
   * ARCHITECTURE ANIMATED FLOW
   * ------------------------------------------------------------- */
  simulateArchitectureFlow() {
    const connectors = [
      document.getElementById('conn-1'),
      document.getElementById('conn-2'),
      document.getElementById('conn-3'),
      document.getElementById('conn-4'),
      document.getElementById('conn-5'),
    ];

    const nodes = [
      document.getElementById('node-dev'),
      document.getElementById('node-api'),
      document.getElementById('node-builder'),
      document.getElementById('node-s3'),
      document.getElementById('node-proxy'),
      document.getElementById('node-client'),
    ];

    nodes.forEach(n => n && n.classList.remove('active-packet'));
    connectors.forEach(c => c && c.classList.remove('animating'));

    let current = 0;
    const interval = setInterval(() => {
      if (current > 0 && connectors[current - 1]) {
        connectors[current - 1].classList.remove('animating');
        nodes[current - 1].classList.remove('active-packet');
      }

      if (current < nodes.length) {
        nodes[current].classList.add('active-packet');
        if (connectors[current]) {
          connectors[current].classList.add('animating');
        }
        current++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          nodes.forEach(n => n && n.classList.remove('active-packet'));
          connectors.forEach(c => c && c.classList.remove('animating'));
        }, 1500);
      }
    }, 700);
  }

  /* -------------------------------------------------------------
   * MODAL & FORMS
   * ------------------------------------------------------------- */
  setupModal() {
    const nameInput = document.getElementById('deploy-project-name');
    nameInput.addEventListener('input', () => {
      const slug = nameInput.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      document.getElementById('slug-preview').textContent = `http://localhost:8000/site/${slug || 'your-slug'}/`;
    });

    const radioCards = document.querySelectorAll('.radio-card');
    radioCards.forEach(card => {
      card.addEventListener('click', () => {
        radioCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });
  }

  openDeployModal() {
    document.getElementById('deploy-modal').classList.add('active');
    document.getElementById('deploy-project-name').value = `project-${Math.random().toString(36).substring(2, 6)}`;
    document.getElementById('deploy-project-name').dispatchEvent(new Event('input'));
  }

  closeDeployModal() {
    document.getElementById('deploy-modal').classList.remove('active');
  }

  setDeployType(type) {
    this.deployType = type;
    document.getElementById('tab-btn-template').classList.toggle('active', type === 'template');
    document.getElementById('tab-btn-git').classList.toggle('active', type === 'git');
    document.getElementById('section-template-select').style.display = type === 'template' ? 'block' : 'none';
    document.getElementById('section-git-input').style.display = type === 'git' ? 'block' : 'none';
  }

  async submitDeployment(e) {
    e.preventDefault();
    const projectName = document.getElementById('deploy-project-name').value.trim();

    let payload = { projectName };

    if (this.deployType === 'template') {
      const templateChoice = document.querySelector('input[name="templateChoice"]:checked').value;
      payload.templateId = templateChoice;
    } else {
      const gitUrl = document.getElementById('deploy-git-url').value.trim();
      const branch = document.getElementById('deploy-git-branch').value.trim() || 'main';
      const outputDir = document.getElementById('deploy-output-dir').value.trim() || 'dist';
      const buildCommand = document.getElementById('deploy-build-cmd').value.trim();
      const installCommand = document.getElementById('deploy-install-cmd').value.trim();

      if (!gitUrl) {
        alert('Please provide a valid Git Repository URL.');
        return;
      }

      payload = {
        ...payload,
        gitUrl,
        branch,
        outputDir,
        buildCommand,
        installCommand,
      };
    }

    this.closeDeployModal();
    await this.launchDeployment(payload);
  }

  /* -------------------------------------------------------------
   * SETTINGS & HEALTH CHECK
   * ------------------------------------------------------------- */
  onStorageModeChange() {
    const mode = document.getElementById('setting-storage-mode').value;
    document.getElementById('aws-credentials-group').style.display = mode === 'aws' ? 'block' : 'none';
  }

  async saveSettings(e) {
    e.preventDefault();
    const mode = document.getElementById('setting-storage-mode').value;
    const bucket = document.getElementById('setting-s3-bucket').value.trim();
    const region = document.getElementById('setting-aws-region').value.trim();
    const accessKeyId = document.getElementById('setting-aws-key').value.trim();
    const secretAccessKey = document.getElementById('setting-aws-secret').value.trim();

    try {
      const res = await fetch(`${this.apiBase}/api/config/storage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          awsConfig: { bucket, region, accessKeyId, secretAccessKey }
        })
      });
      const data = await res.json();
      alert(`Settings saved: ${data.message}`);
      this.loadAnalytics();
    } catch (err) {
      alert(`Error saving settings: ${err.message}`);
    }
  }

  async checkHealth() {
    try {
      const res = await fetch(`${this.apiBase}/api/health`);
      const data = await res.json();
      console.log('[System Health]', data);
      const btn = document.getElementById('btn-health-check');
      if (btn) {
        btn.innerHTML = '<span>✔ All Healthy</span>';
        setTimeout(() => {
          btn.innerHTML = '<span>🔄 Health Check</span>';
        }, 2000);
      }
    } catch (e) {
      alert('Health check error: Cannot connect to API server.');
    }
  }
}

// Instantiate App
window.app = new DashboardApp();
