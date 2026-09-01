// Modern ES2022+ client script for deployed sample app
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Nexus Cloud] Automated Deployment System verification loaded (ES2022+).');

  // Jitter latency display to show live reactivity with optional chaining
  const latencyEl = document.getElementById('stat-latency');
  if (latencyEl) {
    setInterval(() => {
      const simulatedLatency = Math.floor(Math.random() * 6) + 8;
      latencyEl?.replaceChildren(document.createTextNode(`${simulatedLatency}ms`));
    }, 3000);
  }
});

