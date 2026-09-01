/**
 * Telemetry Stream Engine (TypeScript)
 * Cloud Analytics & Telemetry Dashboard
 */

export interface TelemetryRecord {
  id: string;
  timestamp: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  status: number;
  durationMs: number;
  region: string;
}

export interface MetricSummary {
  activeStreams: number;
  requestsPerSecond: number;
  avgLatencyMs: number;
  errorRatePercent: number;
}

export class TelemetryEngine {
  private records: TelemetryRecord[] = [];
  private listeners: Array<(records: TelemetryRecord[]) => void> = [];

  constructor() {
    this.seedInitialData();
    this.startStreaming();
  }

  private seedInitialData(): void {
    const endpoints = ['/api/deploy', '/api/logs/dep-412', '/site/react-app/', '/api/health', '/api/metrics'];
    const methods: ('GET' | 'POST')[] = ['GET', 'POST'];
    const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1', 'us-west-2'];

    for (let i = 0; i < 6; i++) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const method = methods[Math.floor(Math.random() * methods.length)];
      const region = regions[Math.floor(Math.random() * regions.length)];
      const durationMs = Math.floor(Math.random() * 45) + 5;

      this.records.push({
        id: `req-${Date.now()}-${i}`,
        timestamp: new Date(Date.now() - (6 - i) * 2000).toLocaleTimeString(),
        endpoint,
        method,
        status: 200,
        durationMs,
        region,
      });
    }
  }

  private startStreaming(): void {
    setInterval(() => {
      this.generateEvent();
    }, 3500);
  }

  public generateEvent(): TelemetryRecord {
    const endpoints = ['/api/deploy', '/api/metrics', '/site/react-app/assets/main.js', '/api/health'];
    const regions = ['us-east-1', 'eu-west-1', 'us-west-2'];
    const newRecord: TelemetryRecord = {
      id: `req-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
      method: 'GET',
      status: 200,
      durationMs: Math.floor(Math.random() * 40) + 6,
      region: regions[Math.floor(Math.random() * regions.length)],
    };

    this.records = [newRecord, ...this.records.slice(0, 7)];
    this.notify();
    return newRecord;
  }

  public subscribe(callback: (records: TelemetryRecord[]) => void): void {
    this.listeners.push(callback);
    callback(this.records);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.records);
    }
  }

  public getSummary(): MetricSummary {
    return {
      activeStreams: 18,
      requestsPerSecond: 284,
      avgLatencyMs: 14.6,
      errorRatePercent: 0.02,
    };
  }
}
