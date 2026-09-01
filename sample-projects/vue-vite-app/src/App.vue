<script setup lang="ts">
import { ref, computed } from 'vue';

interface NodeTelemetry {
  id: string;
  name: string;
  status: 'ONLINE' | 'STANDBY' | 'SYNCING';
  latencyMs: number;
  requestsHandled: number;
}

const deployVersion = ref<string>('v3.5.13-enterprise');
const deploymentStatus = ref<string>('PRODUCTION READY');
const clusterNodes = ref<NodeTelemetry[]>([
  { id: 'node-us-east', name: 'US-East Edge (Virginia)', status: 'ONLINE', latencyMs: 14, requestsHandled: 124800 },
  { id: 'node-eu-west', name: 'EU-West Edge (Frankfurt)', status: 'ONLINE', latencyMs: 28, requestsHandled: 98400 },
  { id: 'node-ap-south', name: 'AP-South Edge (Mumbai)', status: 'ONLINE', latencyMs: 42, requestsHandled: 76300 },
]);

const burstCount = ref<number>(0);

const totalRequests = computed(() => {
  return clusterNodes.value.reduce((sum, n) => sum + n.requestsHandled, 0) + burstCount.value * 500;
});

const triggerBurst = () => {
  burstCount.value++;
  clusterNodes.value.forEach(node => {
    node.latencyMs = Math.max(8, Math.round(node.latencyMs + (Math.random() * 6 - 3)));
  });
};
</script>

<template>
  <div class="vue-container">
    <header class="vue-header">
      <div class="badge-row">
        <span class="badge vue-badge">Vue 3.5</span>
        <span class="badge ts-badge">TypeScript 5.8</span>
        <span class="badge vite-badge">Vite 6</span>
      </div>
      <h1>💚 Cloud Edge Micro-App (Vue 3 + TypeScript)</h1>
      <p class="subtitle">
        Enterprise reactive frontend powered by Vue 3 Composition API, reactive state management, and edge proxy distribution.
      </p>
    </header>

    <div class="metrics-grid">
      <div class="metric-card">
        <span class="metric-label">Status</span>
        <span class="metric-value status-ready">{{ deploymentStatus }}</span>
        <span class="metric-sub">Zero-downtime deployment</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Total Requests Handled</span>
        <span class="metric-value">{{ totalRequests.toLocaleString() }}</span>
        <span class="metric-sub">Across 3 distributed edges</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Framework Engine</span>
        <span class="metric-value">{{ deployVersion }}</span>
        <span class="metric-sub">TypeScript Composition API</span>
      </div>
    </div>

    <div class="cluster-section">
      <h3>Active Edge Node Clusters</h3>
      <div class="node-list">
        <div v-for="node in clusterNodes" :key="node.id" class="node-item">
          <div class="node-info">
            <span class="node-name">{{ node.name }}</span>
            <span class="node-status">{{ node.status }}</span>
          </div>
          <div class="node-meta">
            <span>Latency: <strong>{{ node.latencyMs }}ms</strong></span>
            <span>Requests: <strong>{{ (node.requestsHandled + (burstCount * 150)).toLocaleString() }}</strong></span>
          </div>
        </div>
      </div>
      <div class="action-row">
        <button class="btn btn-primary" @click="triggerBurst">⚡ Simulate Traffic Spike</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vue-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #f8fafc;
}
.vue-header {
  text-align: center;
  margin-bottom: 40px;
}
.badge-row {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 16px;
}
.badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 9999px;
  text-transform: uppercase;
}
.vue-badge { background: rgba(66, 184, 131, 0.2); color: #42b883; border: 1px solid #42b883; }
.ts-badge { background: rgba(49, 120, 198, 0.2); color: #60a5fa; border: 1px solid #3178c6; }
.vite-badge { background: rgba(189, 52, 254, 0.2); color: #c084fc; border: 1px solid #bd34fe; }
.subtitle { color: #94a3b8; font-size: 1.1rem; max-width: 650px; margin: 12px auto 0; }
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 36px;
}
.metric-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
}
.metric-label { font-size: 0.85rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
.metric-value { font-size: 1.8rem; font-weight: 800; color: #f8fafc; margin: 8px 0; }
.status-ready { color: #42b883; }
.metric-sub { font-size: 0.8rem; color: #64748b; }
.cluster-section {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 24px;
}
.node-list { display: flex; flex-direction: column; gap: 14px; margin: 18px 0; }
.node-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #0f172a;
  padding: 16px 20px;
  border-radius: 8px;
  border: 1px solid #334155;
}
.node-name { font-weight: 600; color: #f1f5f9; }
.node-status { color: #42b883; font-size: 0.8rem; font-weight: 700; margin-left: 10px; }
.node-meta { display: flex; gap: 20px; color: #94a3b8; font-size: 0.9rem; }
.node-meta strong { color: #f8fafc; }
.action-row { text-align: center; margin-top: 20px; }
.btn {
  background: #42b883;
  color: #0f172a;
  border: none;
  padding: 10px 24px;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn:hover { opacity: 0.9; }
</style>
