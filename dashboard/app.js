/**
 * Automated Deployment System - Main Dashboard Controller
 */
class DashboardApp {
  constructor() {
    this.apiBase = window.location.origin;

    // Sub-managers
    this.telemetry = new window.TelemetryManager(this.apiBase);
    this.preview = new window.PreviewManager();
    this.architecture = new window.ArchitectureVisualizer();
    this.terminal = new window.TerminalManager(this.apiBase, (slug) => {
      const url = `http://localhost:8000/site/${slug}/`;
      this.preview.openPreview(url, slug);
      this.telemetry.loadAnalytics();
      this.deployments.loadDeployments(true);
    });

    this.deployments = new window.DeploymentsManager(
      this.apiBase,
      (payload) => {
        this.switchTab('terminal');
        this.terminal.startBuildStream('pending', payload.projectName || payload.templateId);
      },
      (url, slug) => this.openSitePreview(url, slug),
      (deployId, slug) => this.viewDeploymentLogs(deployId, slug)
    );

    this.init();
  }

  init() {
    this.setupTabs();
    this.deployments.setupModal();
    this.telemetry.loadAnalytics();
    this.deployments.loadDeployments();
    this.telemetry.checkHealth();

    setInterval(() => {
      this.telemetry.loadAnalytics();
      this.deployments.loadDeployments(true);
    }, 10000);
  }

  setupTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tabKey = btn.getAttribute('data-tab');
        this.switchTab(tabKey);
      });
    });
  }

  switchTab(tabKey) {
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));

    const targetNav = document.querySelector(`.nav-item[data-tab="${tabKey}"]`);
    const targetPanel = document.getElementById(`tab-${tabKey}`);

    if (targetNav) targetNav.classList.add('active');
    if (targetPanel) targetPanel.classList.add('active');

    const titles = {
      overview: {
        title: 'Deployments & System Overview',
        desc: 'Manage containerized builds, S3 distributions, and edge reverse-proxy routing',
      },
      architecture: {
        title: 'System Architecture & DFD Map',
        desc: 'Interactive High Level Design & Level 0/1 Data Flow Diagram across AWS ECS, S3, Redis, and Reverse Proxy',
      },
      terminal: {
        title: 'Live Container Build Terminal',
        desc: 'Real-time ANSI stream from isolated Docker/ECS build worker',
      },
      preview: {
        title: 'Live Site Preview & CDN Sandbox',
        desc: 'Zero-latency edge-routed preview directly from S3 Reverse Proxy',
      },
      settings: {
        title: 'Cloud Infrastructure Settings',
        desc: 'Configure AWS S3 credentials, AWS ECS parameters, and Redis endpoints',
      },
    };

    if (titles[tabKey]) {
      const t = document.getElementById('page-title');
      const d = document.getElementById('page-desc');
      if (t) t.textContent = titles[tabKey].title;
      if (d) d.textContent = titles[tabKey].desc;
    }
  }

  // Proxies for inline HTML onclick handlers
  checkHealth() {
    return this.telemetry.checkHealth();
  }
  loadDeployments() {
    return this.deployments.loadDeployments();
  }
  quickDeploy(templateId, name) {
    return this.deployments.quickDeploy(templateId, name);
  }
  openDeployModal() {
    return this.deployments.openDeployModal();
  }
  closeDeployModal() {
    return this.deployments.closeDeployModal();
  }
  setDeployType(t) {
    return this.deployments.setDeployType(t);
  }
  submitDeployment(e) {
    return this.deployments.submitDeployment(e);
  }
  redeploy(id) {
    return this.deployments.redeploy(id);
  }
  clearTerminal() {
    return this.terminal.clearTerminal();
  }
  copyLogs() {
    return this.terminal.copyLogs();
  }
  toggleAutoScroll() {
    return this.terminal.toggleAutoScroll();
  }
  reloadPreview() {
    return this.preview.reloadPreview();
  }
  setDeviceWidth(w, btn) {
    return this.preview.setDeviceWidth(w, btn);
  }
  simulateArchitectureFlow() {
    return this.architecture.simulateFlow();
  }
  onStorageModeChange() {
    return this.telemetry.onStorageModeChange();
  }
  saveSettings(e) {
    return this.telemetry.saveSettings(e);
  }

  openSitePreview(url, slug) {
    this.switchTab('preview');
    this.preview.openPreview(url, slug);
  }

  viewDeploymentLogs(deploymentId, projectSlug) {
    this.switchTab('terminal');
    this.terminal.startBuildStream(deploymentId, projectSlug);
  }
}

window.app = new DashboardApp();
