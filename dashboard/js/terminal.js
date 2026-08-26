/**
 * Real-Time Build Terminal & SSE Log Streamer Module
 */
class TerminalManager {
  constructor(apiBase, onDeploymentComplete) {
    this.apiBase = apiBase;
    this.onDeploymentComplete = onDeploymentComplete;
    this.eventSource = null;
    this.autoScroll = true;
    this.timerInterval = null;
    this.startTime = null;
  }

  startBuildStream(deploymentId, projectSlug) {
    this.resetTerminalView(projectSlug);
    this.connectLogStream(deploymentId, projectSlug);

    const pulse = document.getElementById('terminal-pulse');
    if (pulse) pulse.style.display = 'inline-block';

    const deployIdEl = document.getElementById('term-deploy-id');
    const slugEl = document.getElementById('term-project-slug');
    const titleEl = document.getElementById('console-title-text');

    if (deployIdEl) deployIdEl.textContent = deploymentId;
    if (slugEl) slugEl.textContent = projectSlug;
    if (titleEl) titleEl.textContent = `terminal@ecs-worker:${projectSlug}`;

    this.startTime = Date.now();
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      const durEl = document.getElementById('term-duration');
      if (durEl) durEl.textContent = `${elapsed}s`;
    }, 100);
  }

  connectLogStream(deploymentId, projectSlug) {
    if (this.eventSource) {
      this.eventSource.close();
    }

    const streamUrl = `${this.apiBase}/api/logs/${deploymentId}`;
    this.eventSource = new EventSource(streamUrl);

    this.eventSource.onmessage = (e) => {
      if (!e.data || e.data.trim() === ': keepalive') return;
      try {
        const logObj = JSON.parse(e.data);
        this.appendLogLine(logObj, projectSlug);
      } catch (_err) {
        this.appendRawLog(e.data, projectSlug);
      }
    };

    this.eventSource.onerror = () => {
      const pulse = document.getElementById('terminal-pulse');
      if (pulse) pulse.style.display = 'none';
      if (this.timerInterval) clearInterval(this.timerInterval);
    };
  }

  appendLogLine(logObj, projectSlug) {
    const consoleEl = document.getElementById('terminal-stream');
    if (!consoleEl) return;

    const line = document.createElement('div');
    line.className = `log-line ${logObj.type || 'info'}`;
    line.textContent = `[${logObj.timestamp || ''}] ${logObj.message}`;
    consoleEl.appendChild(line);

    this.updateStepperFromLog(logObj.message, projectSlug);

    if (this.autoScroll) {
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
  }

  appendRawLog(text, projectSlug) {
    const consoleEl = document.getElementById('terminal-stream');
    if (!consoleEl) return;

    const line = document.createElement('div');
    line.className = 'log-line info';
    line.textContent = text;
    consoleEl.appendChild(line);

    this.updateStepperFromLog(text, projectSlug);

    if (this.autoScroll) {
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
  }

  updateStepperFromLog(msg, projectSlug) {
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

      if (typeof this.onDeploymentComplete === 'function') {
        this.onDeploymentComplete(projectSlug);
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
      if (!el) continue;
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
    const consoleEl = document.getElementById('terminal-stream');
    if (consoleEl) {
      consoleEl.innerHTML = `
        <div class="log-line system">[System] Initializing new deployment workflow for ${slug}...</div>
      `;
    }
    this.setStepActive(1);
    const badge = document.getElementById('stepper-status-badge');
    if (badge) {
      badge.textContent = 'INITIALIZING';
      badge.className = 'badge status-in-progress';
    }
  }

  clearTerminal() {
    const consoleEl = document.getElementById('terminal-stream');
    if (consoleEl) {
      consoleEl.innerHTML = '<div class="log-line dim">Terminal console cleared.</div>';
    }
  }

  copyLogs() {
    const consoleEl = document.getElementById('terminal-stream');
    if (!consoleEl) return;
    navigator.clipboard.writeText(consoleEl.innerText).then(() => {
      alert('Terminal logs copied to clipboard!');
    });
  }

  toggleAutoScroll() {
    this.autoScroll = !this.autoScroll;
    const btn = document.getElementById('btn-auto-scroll');
    if (btn) btn.textContent = `📜 Auto-Scroll: ${this.autoScroll ? 'ON' : 'OFF'}`;
  }
}

window.TerminalManager = TerminalManager;
