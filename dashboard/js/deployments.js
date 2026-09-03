/**
 * Deployments List, Modals, and Action Dispatcher Module
 */
class DeploymentsManager {
  constructor(apiBase, onDeployTriggered, onViewPreview, onViewLogs) {
    this.apiBase = apiBase;
    this.onDeployTriggered = onDeployTriggered;
    this.onViewPreview = onViewPreview;
    this.onViewLogs = onViewLogs;
    this.deployments = [];
    this.deployType = 'template';
  }

  async loadDeployments(silent = false) {
    try {
      const res = await fetch(`${this.apiBase}/api/deployments`);
      const data = await res.json();
      this.deployments = data.deployments || [];
      this.renderTable();
    } catch (e) {
      if (!silent) console.warn('[Deployments] Failed to load history:', e);
    }
  }

  renderTable() {
    this.renderVercelProjectCards();

    const tbody = document.getElementById('deployments-table-body');
    if (!tbody) return;

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

    tbody.innerHTML = this.deployments
      .map((item) => {
        let statusClass = 'status-in-progress';
        if (item.status === 'READY') statusClass = 'status-ready';
        if (item.status === 'FAILED') statusClass = 'status-failed';

        const durationStr = item.durationMs ? `${(item.durationMs / 1000).toFixed(1)}s` : '-';
        const fileCountStr = item.fileCount ? `${item.fileCount} files` : '-';
        const deployedTime =
          item.completedAt || item.updatedAt
            ? new Date(item.completedAt || item.updatedAt).toLocaleTimeString()
            : 'In Progress';
        const previewUrl =
          item.url && !item.url.includes('localhost:8000')
            ? item.url
            : `${window.location.origin}/site/${item.projectSlug}/`;

        return `
        <tr>
          <td>
            <strong>${item.projectSlug}</strong>
            <div style="font-size: 0.75rem; color: var(--text-dim); font-family: var(--font-mono);">${item.deploymentId}</div>
          </td>
          <td>
            <span class="status-badge ${statusClass}">
              ${item.status === 'IN_PROGRESS' ? '● Building' : item.status === 'READY' ? '✔ Ready' : '✖ Failed'}
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
              ${
                item.status === 'READY'
                  ? `
                <button class="btn btn-sm btn-outline" onclick="app.openSitePreview('${previewUrl}', '${item.projectSlug}')">Preview</button>
                <a href="${previewUrl}" target="_blank" class="btn btn-sm btn-secondary">Open ↗</a>
              `
                  : `
                <button class="btn btn-sm btn-outline" onclick="app.viewDeploymentLogs('${item.deploymentId}', '${item.projectSlug}')">Logs</button>
              `
              }
              <button class="btn btn-sm btn-secondary" onclick="app.redeploy('${item.deploymentId}')">Redeploy</button>
            </div>
          </td>
        </tr>
      `;
      })
      .join('');
  }

  renderVercelProjectCards() {
    const container = document.getElementById('vercel-project-cards');
    if (!container) return;

    if (!this.deployments || this.deployments.length === 0) {
      container.innerHTML = `
        <div class="empty-project-placeholder">
          <div class="empty-icon">▲</div>
          <h3>No Projects Deployed Yet</h3>
          <p>Deploy a 1-Click Starter, link a Git repository, or drop files below to create your first Vercel live deployment.</p>
        </div>`;
      return;
    }

    // Group deployments by projectSlug, taking latest deployment per project
    const projectsMap = new Map();
    for (const d of this.deployments) {
      if (!projectsMap.has(d.projectSlug)) {
        projectsMap.set(d.projectSlug, d);
      }
    }

    const projects = Array.from(projectsMap.values());
    container.innerHTML = projects
      .map((proj) => {
        let icon = '🌐';
        const stackLower = (proj.stack || proj.framework || '').toLowerCase();
        if (stackLower.includes('react')) icon = '⚛️';
        else if (stackLower.includes('vue')) icon = '💚';
        else if (stackLower.includes('python')) icon = '🐍';
        else if (stackLower.includes('rust')) icon = '🦀';
        else if (stackLower.includes('next')) icon = '▲';
        else if (stackLower.includes('analytics')) icon = '📈';

        const previewUrl =
          proj.url && !proj.url.includes('localhost:8000')
            ? proj.url
            : `${window.location.origin}/site/${proj.projectSlug}/`;

        let statusDotClass = 'status-dot online';
        let statusText = 'Ready';
        if (proj.status === 'IN_PROGRESS') {
          statusDotClass = 'status-dot building';
          statusText = 'Building...';
        } else if (proj.status === 'FAILED') {
          statusDotClass = 'status-dot error';
          statusText = 'Failed';
        }

        const timeStr = proj.completedAt
          ? new Date(proj.completedAt).toLocaleTimeString()
          : 'Just now';

        return `
        <div class="vercel-project-card">
          <div class="project-card-header">
            <div class="project-card-title-group">
              <span class="project-framework-icon">${icon}</span>
              <div>
                <h3 class="project-card-name">${proj.projectSlug}</h3>
                <a href="${previewUrl}" target="_blank" class="project-domain-link">
                  ${window.location.host}/site/${proj.projectSlug}/ ↗
                </a>
              </div>
            </div>
            <div class="project-status-pill">
              <span class="${statusDotClass}"></span>
              <span>${statusText}</span>
            </div>
          </div>

          <div class="project-card-meta">
            <div class="meta-pill git-pill">
              <span>🌿 ${proj.branch || 'main'}</span>
            </div>
            <div class="meta-pill stack-pill">
              <span>${proj.framework || proj.stack || 'Static Web App'}</span>
            </div>
            <div class="meta-pill time-pill">
              <span>⏱️ ${timeStr}</span>
            </div>
          </div>

          <div class="project-card-actions">
            ${
              proj.status === 'READY'
                ? `
              <button class="btn btn-sm btn-outline" onclick="app.openSitePreview('${previewUrl}', '${proj.projectSlug}')">
                👁️ Preview
              </button>
              <a href="${previewUrl}" target="_blank" class="btn btn-sm btn-primary">
                Visit ↗
              </a>
            `
                : ''
            }
            <button class="btn btn-sm btn-secondary" onclick="app.viewDeploymentLogs('${proj.deploymentId}', '${proj.projectSlug}')">
              Logs 📜
            </button>
            <button class="btn btn-sm btn-secondary" onclick="app.redeploy('${proj.deploymentId}')">
              Redeploy 🔄
            </button>
          </div>
        </div>
      `;
      })
      .join('');
  }

  async quickDeploy(templateId) {
    const defaultSlug = `${templateId}-${Math.random().toString(36).substring(2, 6)}`;
    await this.launchDeployment({
      templateId,
      projectName: defaultSlug,
    });
  }

  async launchDeployment(payload) {
    try {
      if (typeof this.onDeployTriggered === 'function') {
        this.onDeployTriggered(payload);
      }

      const res = await fetch(`${this.apiBase}/api/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.message ||
            (data.issues ? data.issues.map((i) => i.message).join(', ') : 'Deployment failed')
        );
      }

      this.loadDeployments();
      return data;
    } catch (err) {
      alert(`Deployment Error: ${err.message}`);
      throw err;
    }
  }

  async launchDirectDeployment(payload) {
    try {
      if (typeof this.onDeployTriggered === 'function') {
        this.onDeployTriggered(payload);
      }

      const res = await fetch(`${this.apiBase}/api/deploy/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Direct deployment failed');
      }

      this.loadDeployments();
      return data;
    } catch (err) {
      alert(`Direct Deployment Error: ${err.message}`);
      throw err;
    }
  }

  async redeploy(deploymentId) {
    try {
      const res = await fetch(`${this.apiBase}/api/deployments/${deploymentId}/redeploy`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Redeploy failed');

      if (typeof this.onDeployTriggered === 'function') {
        this.onDeployTriggered({ projectName: data.projectSlug });
      }
      return data;
    } catch (e) {
      alert(`Redeploy error: ${e.message}`);
    }
  }

  setupModal() {
    const nameInput = document.getElementById('deploy-project-name');
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        const slug = nameInput.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
        const prev = document.getElementById('slug-preview');
        if (prev) prev.textContent = `${window.location.origin}/site/${slug || 'your-slug'}/`;
      });
    }

    const radioCards = document.querySelectorAll('.radio-card');
    radioCards.forEach((card) => {
      card.addEventListener('click', () => {
        radioCards.forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });

    // Direct drag-and-drop dropzone setup
    this.uploadedFiles = [];
    const dropzone = document.getElementById('dropzone-area');
    const fileInput = document.getElementById('direct-file-input');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          this.handleFiles(e.dataTransfer.files);
        }
      });

      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files.length) {
          this.handleFiles(fileInput.files);
        }
      });
    }
  }

  handleFiles(fileList) {
    const statusBox = document.getElementById('dropzone-file-status');
    this.uploadedFiles = [];
    const promises = [];

    for (const file of fileList) {
      promises.push(
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            this.uploadedFiles.push({
              path: file.webkitRelativePath || file.name,
              name: file.name,
              content: e.target.result,
            });
            resolve();
          };
          reader.readAsText(file);
        })
      );
    }

    Promise.all(promises).then(() => {
      if (statusBox) {
        statusBox.innerHTML = `✔ Ready to deploy <strong>${this.uploadedFiles.length} file(s)</strong> (${this.uploadedFiles
          .map((f) => f.name)
          .slice(0, 3)
          .join(', ')}${this.uploadedFiles.length > 3 ? '...' : ''})`;
        statusBox.style.display = 'block';
      }
    });
  }

  openDeployModal() {
    const modal = document.getElementById('deploy-modal');
    if (modal) modal.classList.add('active');
    const nameInput = document.getElementById('deploy-project-name');
    if (nameInput) {
      nameInput.value = `project-${Math.random().toString(36).substring(2, 6)}`;
      nameInput.dispatchEvent(new Event('input'));
    }
  }

  closeDeployModal() {
    const modal = document.getElementById('deploy-modal');
    if (modal) modal.classList.remove('active');
  }

  setDeployType(type) {
    this.deployType = type;
    const tabTemplate = document.getElementById('tab-btn-template');
    const tabGit = document.getElementById('tab-btn-git');
    const tabDirect = document.getElementById('tab-btn-direct');

    const secTemplate = document.getElementById('section-template-select');
    const secGit = document.getElementById('section-git-input');
    const secDirect = document.getElementById('section-direct-input');

    if (tabTemplate) tabTemplate.classList.toggle('active', type === 'template');
    if (tabGit) tabGit.classList.toggle('active', type === 'git');
    if (tabDirect) tabDirect.classList.toggle('active', type === 'direct');

    if (secTemplate) secTemplate.style.display = type === 'template' ? 'block' : 'none';
    if (secGit) secGit.style.display = type === 'git' ? 'block' : 'none';
    if (secDirect) secDirect.style.display = type === 'direct' ? 'block' : 'none';
  }

  async submitDeployment(e) {
    e.preventDefault();
    const projectName = document.getElementById('deploy-project-name').value.trim();

    if (this.deployType === 'direct') {
      const pasteHtml = document.getElementById('direct-html-input')
        ? document.getElementById('direct-html-input').value.trim()
        : '';
      const files = this.uploadedFiles || [];

      if (!files.length && !pasteHtml) {
        alert('Please drop files or enter HTML code to deploy directly.');
        return;
      }

      this.closeDeployModal();
      await this.launchDirectDeployment({
        projectName,
        files: files.length ? files : undefined,
        html: !files.length && pasteHtml ? pasteHtml : undefined,
      });
      return;
    }

    let payload = { projectName };

    if (this.deployType === 'template') {
      const choice = document.querySelector('input[name="templateChoice"]:checked');
      payload.templateId = choice ? choice.value : 'modern-landing-page';
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
}

window.DeploymentsManager = DeploymentsManager;
