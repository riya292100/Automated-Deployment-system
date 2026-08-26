# ⚡ Automated Deployment System

> **Autonomous Cloud Deployment Platform using Docker, AWS ECS Fargate, Amazon S3, Redis, and Reverse Proxy**

![Platform Status](https://img.shields.io/badge/System-Healthy-10b981?style=for-the-badge)
![AWS ECS](https://img.shields.io/badge/AWS-ECS%20Fargate-FF9900?style=for-the-badge&logo=amazonaws)
![Amazon S3](https://img.shields.io/badge/Amazon-S3%20Distribution-569A31?style=for-the-badge&logo=amazons3)
![Redis](https://img.shields.io/badge/Redis-Pub%2FSub%20%26%20Cache-DC382D?style=for-the-badge&logo=redis)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker)

---

## 📖 Executive Summary

The **Automated Deployment System** is an end-to-end cloud platform engineered to simplify, accelerate, and automate the build and release lifecycle of modern web applications. Similar to architectures employed by Vercel and Render, the system seamlessly coordinates:

- **API Server Orchestrator**: Manages build dispatch, deployments lifecycle, and Server-Sent Events (SSE) log streaming.
- **Containerized Build Worker**: Executes Git cloning, package installation, compilation, and automated artifact extraction.
- **Amazon S3 Storage**: Encapsulates and persists static production assets in isolated namespaces (`__outputs/{project-slug}/`).
- **S3 Reverse Proxy Engine**: Resolves custom subdomains (`http://{slug}.localhost:8000`) and path-based URLs (`http://localhost:8000/site/{slug}/`) with single-page application (SPA) routing fallbacks.
- **Redis In-Memory Layer**: Coordinates real-time ANSI terminal build logs and sub-millisecond route resolution.
- **Interactive Dashboard**: Sleek dark-mode console with live terminal streaming, 1-click sandbox starters, responsive viewport previewers, and animated architecture telemetry diagrams.

---

## 🏗️ Architecture & Component Topology

```
+-----------------------------------------------------------------------------------+
|                           AUTOMATED DEPLOYMENT TOPOLOGY                           |
+-----------------------------------------------------------------------------------+

     [Developer] ──(1. Git Push / Launch)──> [API Server Orchestrator (Port 9000)]
                                                         │
                                               (2. Dispatch Build Task)
                                                         ▼
                                             [Docker / AWS ECS Worker]
                                                         │
                         ┌───────────────────────────────┴───────────────────────────────┐
                         ▼                                                               ▼
        (3. Stream Real-time ANSI Logs)                                 (4. Upload Dist Output Files)
                         ▼                                                               ▼
       [Redis Pub/Sub & Metadata Cache]                                  [Amazon S3 Storage Bucket]
                         │                                                               │
                         └───────────────────────────────┬───────────────────────────────┘
                                                         │
                                                (5. Route & Serve)
                                                         ▼
                                            [S3 Reverse Proxy (Port 8000)]
                                                         │
                                             (6. Zero-Latency Delivery)
                                                         ▼
                                                    [End User]
```

---

## 🚀 Quick Start (Zero Setup Required)

The system is equipped with high-performance zero-configuration local emulators for Amazon S3 and Redis, allowing you to run and test everything immediately out of the box.

### 1. Start All Services

```bash
node start-all.js
```

### 2. Access the Applications

| Service              | URL                           | Description                                          |
| :------------------- | :---------------------------- | :--------------------------------------------------- |
| **Cloud Dashboard**  | `http://localhost:9000`       | Deployment management, live terminal, and visualizer |
| **S3 Reverse Proxy** | `http://localhost:8000`       | Dynamic edge router and static asset CDN             |
| **API Endpoints**    | `http://localhost:9000/api/*` | REST API, SSE streaming, and analytics               |

---

## 🧪 Running Automated Tests

A comprehensive unit and integration test suite is included:

```bash
npm test
# or
node tests/run-all-tests.js
```

The test runner validates:

1. **Storage Service**: Object put, get, binary integrity, MIME types, and folder synchronization.
2. **Redis Service**: Ping, key-value storage, real-time Pub/Sub channels, and log history retention.
3. **Build Worker**: Repository/template ingestion, compilation, S3 bucket upload, and route registration.
4. **API Server & S3 Reverse Proxy**: REST endpoints, health diagnostics, subdomain resolution, and SPA routing fallbacks.

---

## 🐳 Docker & Multi-Container Deployment

To deploy using Docker Compose:

```bash
docker compose up --build
```

Services defined in `docker-compose.yml`:

- `api-server` (Port 9000)
- `s3-reverse-proxy` (Port 8000)
- `redis-service` (Port 6379)

---

## ☁️ AWS Cloud Infrastructure Configuration

To run directly against live AWS cloud resources:

1. Open the **Cloud Settings** tab in the Dashboard (`http://localhost:9000`).
2. Switch **Storage Backend Mode** to **AWS Cloud Mode**.
3. Input your **AWS Access Key ID**, **AWS Secret Access Key**, **Region**, and **S3 Bucket Name**.
4. AWS ECS Task definitions and CodePipeline configurations are provided in:
   - `aws-config/ecs-task-definition.json` (ECS Fargate Task Definition)
   - `aws-config/buildspec.yml` (AWS CodeBuild Configuration)
   - `aws-config/codepipeline-config.json` (AWS CodePipeline CI/CD definition)

---

## 📡 REST API Reference

### 1. Deploy Project

`POST /api/deploy`

```json
{
  "templateId": "modern-landing-page",
  "projectName": "my-cool-site",
  "gitUrl": "https://github.com/user/repo",
  "branch": "main",
  "buildCommand": "npm run build",
  "outputDir": "dist"
}
```

### 2. Live Log Stream (SSE)

`GET /api/logs/:deploymentId`
_Returns real-time Server-Sent Events (SSE) connected to Redis channel `logs:{deploymentId}`._

### 3. System Analytics

`GET /api/analytics`
_Returns system telemetry including active deployments, S3 bytes transferred, average build duration, and cache hit rates._

### 4. Health Diagnostics

`GET /api/health`
_Returns health status of API Server, ECS Worker, S3 Storage, and Redis._

---

## 📂 Project Structure

```
automated-deployment-system/
├── api-server/                  # REST API & Web Dashboard Server (Port 9000)
├── build-server/                # Containerized Builder & S3 Uploader
├── s3-reverse-proxy/            # Dynamic Edge Reverse Proxy (Port 8000)
├── dashboard/                   # Glassmorphic Dark-Mode UI & Interactive Map
├── sample-projects/             # 1-Click Starter Demo Projects
├── shared/                      # S3 Storage & Redis Pub/Sub client modules
├── aws-config/                  # AWS ECS, ECR, CodePipeline, & BuildSpec files
├── tests/                       # Unit & Integration test suite
├── docker-compose.yml           # Multi-container orchestration
├── start-all.js                 # Unified single-command launcher
└── package.json                 # Project manifest & npm scripts
```
