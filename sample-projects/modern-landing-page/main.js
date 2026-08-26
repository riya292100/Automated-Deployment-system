// Interactive client script for deployed sample app
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Nexus Cloud] Automated Deployment System verification loaded.');

  // Jitter latency display to show live reactivity
  const latencyEl = document.getElementById('stat-latency');
  if (latencyEl) {
    setInterval(() => {
      const simulatedLatency = Math.floor(Math.random() * 6) + 8;
      latencyEl.textContent = `${simulatedLatency}ms`;
    }, 3000);
  }
});
