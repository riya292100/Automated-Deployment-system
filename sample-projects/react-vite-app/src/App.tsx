import React, { useState, useEffect } from 'react';

interface MetricItem {
  id: string;
  label: string;
  value: string | number;
  change: string;
  icon: string;
}

export const App: React.FC = () => {
  const [counter, setCounter] = useState<number>(142);
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'network'>('overview');
  const [logs, setLogs] = useState<string[]>([
    'Vite 6 HMR engine initialized',
    'React 19 virtual DOM mounted cleanly',
    'Edge proxy connected to S3 storage bucket',
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCounter((prev) => prev + Math.floor(Math.random() * 3) + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = (actionName: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${actionName} triggered`, ...prev.slice(0, 5)]);
  };

  const metrics: MetricItem[] = [
    { id: '1', label: 'Live Traffic Req/s', value: counter, change: '+14.2%', icon: '⚡' },
    { id: '2', label: 'Edge Cache Hit Rate', value: '99.8%', change: '+0.4%', icon: '🚀' },
    { id: '3', label: 'P99 TTFB Latency', value: '18ms', change: '-3.1ms', icon: '⏱️' },
    { id: '4', label: 'Language & Framework', value: 'React 19 + TS', change: 'Vite 6', icon: '⚛️' },
  ];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={styles.logoIcon}>⚛️</span>
          <div>
            <h1 style={styles.title}>Enterprise React Portal</h1>
            <span style={styles.badge}>React 19 • TypeScript • Vite 6</span>
          </div>
        </div>
        <div style={styles.nav}>
          {(['overview', 'metrics', 'network'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tabBtn,
                ...(activeTab === tab ? styles.tabBtnActive : {}),
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.grid}>
          {metrics.map((m) => (
            <div key={m.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.metricLabel}>{m.label}</span>
                <span style={styles.metricIcon}>{m.icon}</span>
              </div>
              <div style={styles.metricValue}>{m.value}</div>
              <span style={styles.metricChange}>{m.change}</span>
            </div>
          ))}
        </div>

        <div style={styles.actionPanel}>
          <h2 style={styles.sectionTitle}>Interactive TypeScript State Engine</h2>
          <p style={styles.subtext}>
            Built with React 19, TypeScript type safety, and deployed via the Automated Deployment System.
          </p>
          <div style={styles.buttonGroup}>
            <button
              style={styles.primaryBtn}
              onClick={() => {
                setCounter((c) => c + 10);
                handleAction('Batch 10 Requests Injected');
              }}
            >
              🚀 Simulate Traffic Burst (+10)
            </button>
            <button
              style={styles.secondaryBtn}
              onClick={() => {
                setCounter(100);
                handleAction('State Counter Reset');
              }}
            >
              🔄 Reset Counter
            </button>
            <button
              style={styles.secondaryBtn}
              onClick={() => handleAction('Cache Invalidation Event Dispatched')}
            >
              🧹 Purge Edge Cache
            </button>
          </div>
        </div>

        <div style={styles.logCard}>
          <div style={styles.logHeader}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>
              REAL-TIME EVENT STREAM
            </span>
            <span style={styles.statusDot}>● Live</span>
          </div>
          <div style={styles.logList}>
            {logs.map((log, idx) => (
              <div key={idx} style={styles.logItem}>
                <span style={{ color: '#6366f1' }}>➔</span> {log}
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        <span>Automated Deployment System • S3 Edge Proxy • Production Build Artifact</span>
      </footer>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0a0d14',
    color: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 36px',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #1e293b',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  logoIcon: {
    fontSize: '2rem',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  badge: {
    fontSize: '0.75rem',
    color: '#818cf8',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    padding: '2px 8px',
    borderRadius: '12px',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    fontWeight: 600,
  },
  nav: {
    display: 'flex',
    gap: '8px',
  },
  tabBtn: {
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid transparent',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    backgroundColor: '#1e293b',
    color: '#ffffff',
    borderColor: '#334155',
  },
  main: {
    flex: 1,
    padding: '36px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '28px',
  },
  card: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '14px',
    padding: '20px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  metricLabel: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 600,
  },
  metricIcon: {
    fontSize: '1.25rem',
  },
  metricValue: {
    fontSize: '2rem',
    fontWeight: 800,
    color: '#f8fafc',
    marginBottom: '6px',
  },
  metricChange: {
    fontSize: '0.8rem',
    color: '#10b981',
    fontWeight: 600,
  },
  actionPanel: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '14px',
    padding: '28px',
    marginBottom: '28px',
  },
  sectionTitle: {
    margin: '0 0 8px 0',
    fontSize: '1.3rem',
    fontWeight: 700,
  },
  subtext: {
    margin: '0 0 20px 0',
    color: '#94a3b8',
    fontSize: '0.95rem',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
    color: '#ffffff',
    border: 'none',
    padding: '10px 22px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  secondaryBtn: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    border: '1px solid #334155',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  logCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '14px',
    padding: '20px',
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '10px',
  },
  statusDot: {
    fontSize: '0.8rem',
    color: '#10b981',
    fontWeight: 600,
  },
  logList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
  },
  logItem: {
    color: '#cbd5e1',
  },
  footer: {
    padding: '24px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '0.85rem',
    borderTop: '1px solid #1e293b',
  },
};

export default App;
