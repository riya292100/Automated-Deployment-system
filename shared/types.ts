/**
 * Core TypeScript Type Definitions
 * Automated Deployment System (ECS, S3, Redis, Reverse Proxy)
 */

export type DeploymentStatus = 'QUEUED' | 'IN_PROGRESS' | 'READY' | 'FAILED';

export type StorageMode = 'local' | 'aws';

export type LogType = 'info' | 'warn' | 'error' | 'success' | 'step' | 'system' | 'upload';

export type SupportedLanguage =
  | 'TypeScript'
  | 'JavaScript'
  | 'React 19'
  | 'React'
  | 'Vue 3'
  | 'Vue'
  | 'Svelte 5'
  | 'Python'
  | 'Rust / WASM'
  | 'Vite'
  | 'Next.js'
  | 'Node.js'
  | 'HTML5/Static';

export interface LogEntry {
  timestamp: string;
  type: LogType;
  message: string;
}

export interface DeploymentPayload {
  deploymentId: string;
  projectSlug: string;
  gitUrl?: string | null;
  templateId?: string | null;
  branch?: string;
  buildCommand?: string;
  installCommand?: string;
  outputDir?: string;
}

export interface DeploymentRecord {
  deploymentId: string;
  projectSlug: string;
  status: DeploymentStatus;
  url?: string;
  s3Prefix: string;
  fileCount?: number;
  totalBytes?: number;
  durationMs?: number;
  startedAt?: string;
  completedAt?: string;
  gitUrl?: string;
  branch?: string;
  error?: string;
  detectedLanguage?: SupportedLanguage;
}

export interface S3Object {
  body: Buffer;
  contentType: string;
  contentLength: number;
}

export interface StorageService {
  getMode(): StorageMode;
  setMode(
    mode: StorageMode,
    awsConfig?: { bucket?: string; region?: string; credentials?: object }
  ): void;
  putObject(key: string, body: Buffer | string, contentType?: string): Promise<{ key: string }>;
  getObject(key: string): Promise<S3Object>;
  listObjects(prefix?: string): Promise<string[]>;
  uploadDirectory(
    dirPath: string,
    s3Prefix: string,
    onProgress?: (key: string, size: number) => void
  ): Promise<string[]>;
}

export interface RedisClientInterface {
  isEmulated: boolean;
  ping(): Promise<string>;
  set(key: string, value: string | object): Promise<string>;
  get(key: string): Promise<string | object | null>;
  hset(hash: string, field: string, value: string | object): Promise<number>;
  hget(hash: string, field: string): Promise<string | object | null>;
  hgetall(hash: string): Promise<Record<string, string | object>>;
  publish(channel: string, message: string | object): Promise<number>;
  subscribe(channel: string, callback: (message: string) => void): Promise<void>;
  unsubscribe(channel: string, callback: (message: string) => void): Promise<void>;
  getLogs(deploymentId: string): LogEntry[];
}

export interface SystemAnalytics {
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  activeProjects: number;
  avgBuildTimeSeconds: string;
  storageUsedBytes: number;
  storageUsedFormatted: string;
  cacheHitRate: string;
  systemUptimeSeconds: number;
  storageMode: StorageMode;
}

export interface ComponentStatus {
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  [key: string]: unknown;
}

export interface HealthCheckResponse {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  timestamp: string;
  components: {
    apiServer: ComponentStatus;
    buildWorker: ComponentStatus;
    redisService: ComponentStatus;
    s3Storage: ComponentStatus;
    ecsOrchestrator: ComponentStatus;
  };
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  languages: SupportedLanguage[];
  icon: string;
  path: string;
}
