/**
 * System Architecture and DFD Interactive Flow Visualizer Module
 */
class ArchitectureVisualizer {
  simulateFlow() {
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

    nodes.forEach((n) => n && n.classList.remove('active-packet'));
    connectors.forEach((c) => c && c.classList.remove('animating'));

    let current = 0;
    const interval = setInterval(() => {
      if (current > 0 && connectors[current - 1]) {
        connectors[current - 1].classList.remove('animating');
        nodes[current - 1].classList.remove('active-packet');
      }

      if (current < nodes.length) {
        if (nodes[current]) nodes[current].classList.add('active-packet');
        if (connectors[current]) connectors[current].classList.add('animating');
        current++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          nodes.forEach((n) => n && n.classList.remove('active-packet'));
          connectors.forEach((c) => c && c.classList.remove('animating'));
        }, 1500);
      }
    }, 600);
  }
}

window.ArchitectureVisualizer = ArchitectureVisualizer;
