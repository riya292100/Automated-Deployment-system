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
        const previewUrl = item.url || `http://localhost:8000/site/${item.projectSlug}/`;

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
        if (prev) prev.textContent = `http://localhost:8000/site/${slug || 'your-slug'}/`;
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
    const secTemplate = document.getElementById('section-template-select');
    const secGit = document.getElementById('section-git-input');

    if (tabTemplate) tabTemplate.classList.toggle('active', type === 'template');
    if (tabGit) tabGit.classList.toggle('active', type === 'git');
    if (secTemplate) secTemplate.style.display = type === 'template' ? 'block' : 'none';
    if (secGit) secGit.style.display = type === 'git' ? 'block' : 'none';
  }

  async submitDeployment(e) {
    e.preventDefault();
    const projectName = document.getElementById('deploy-project-name').value.trim();
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
