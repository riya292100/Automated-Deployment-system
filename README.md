# ⚡ Automated Deployment System

> **Autonomous Cloud Deployment Platform using Docker, AWS ECS Fargate, Amazon S3, Redis, and Reverse Proxy**

[![CI Pipeline](https://github.com/riya292100/Automated-Deployment-system/actions/workflows/ci.yml/badge.svg)](https://github.com/riya292100/Automated-Deployment-system/actions/workflows/ci.yml)
[![Coverage Status](https://img.shields.io/badge/Coverage-79%25-brightgreen.svg?style=flat-square)](https://github.com/riya292100/Automated-Deployment-system)
[![Validation: Zod](https://img.shields.io/badge/Validation-Zod-3068b7.svg?style=flat-square&logo=zod)](https://zod.dev)
[![Code Style: Prettier](https://img.shields.io/badge/Code_Style-Prettier-ff69b4.svg?style=flat-square&logo=prettier)](https://prettier.io)
[![Linter: ESLint](https://img.shields.io/badge/Linter-ESLint-4B32C3.svg?style=flat-square&logo=eslint)](https://eslint.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## 📖 Executive Summary

The **Automated Deployment System** is an end-to-end cloud platform engineered to simplify, accelerate, and automate the build and release lifecycle of modern web applications. Similar to architectures employed by Vercel and Render, the system seamlessly coordinates:

- **API Server Orchestrator**: Manages build dispatch, deployments lifecycle, Zod schema validation, and Server-Sent Events (SSE) log streaming.
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
                                               (2. Validate & Dispatch Task)
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

### 1. Setup Environment Configuration

```bash
# Clone the repository
git clone https://github.com/riya292100/Automated-Deployment-system.git
cd Automated-Deployment-system

# Install dependencies
npm ci

# Copy environment configuration
cp .env.example .env
```

### 2. Start All Services

```bash
npm start
```

### 3. Access the Applications

| Service | URL | Description |
| :--- | :--- | :--- |
| **Cloud Dashboard** | `http://localhost:9000` | Deployment management, live terminal, and visualizer |
| **S3 Reverse Proxy** | `http://localhost:8000` | Dynamic edge router and static asset CDN |
| **API Endpoints** | `http://localhost:9000/api/*` | REST API, SSE streaming, and analytics |
| **Observability Metrics** | `http://localhost:9000/api/metrics` | Prometheus & JSON telemetry metrics |

---

## 🧪 Testing & Code Quality

The repository includes a full Jest test suite with coverage enforcement (>70%) and static analysis tooling:

```bash
# Run unit & integration tests
npm test

# Run test suite with coverage report
npm run test:coverage

# Run ESLint linter
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format
```

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
*Validated via Zod schema. Returns `400 Bad Request` with validation issues on failure.*

### 2. Live Log Stream (SSE)
`GET /api/logs/:deploymentId`
*Returns real-time Server-Sent Events (SSE) connected to Redis channel `logs:{deploymentId}`.*

### 3. System Analytics
`GET /api/analytics`
*Returns system telemetry including active deployments, S3 bytes transferred, average build duration, and cache hit rates.*

### 4. Prometheus / JSON Metrics
`GET /api/metrics`
*Returns memory heap, RSS, uptime, and request counters in JSON or Prometheus format.*

### 5. Health Diagnostics
`GET /api/health`
*Returns health status of API Server, ECS Worker, S3 Storage, and Redis.*

---

## 📂 Project Structure

```
automated-deployment-system/
├── .github/
│   ├── workflows/ci.yml         # GitHub Actions CI workflow (lint, test, coverage, audit)
│   └── dependabot.yml           # Automated dependency freshness tracking
├── api-server/
│   ├── index.js                 # REST API & Web Dashboard Server (Port 9000)
│   └── schemas.js               # Zod input validation schemas
├── build-server/
│   ├── builder.js               # Containerized Builder & S3 Uploader
│   └── Dockerfile               # Build Server container definition
├── s3-reverse-proxy/
│   └── index.js                 # Dynamic Edge Reverse Proxy (Port 8000)
├── dashboard/                   # Glassmorphic Dark-Mode UI & Interactive Map
│   ├── index.html
│   ├── style.css
│   ├── app.js                   # Main dashboard controller
│   └── js/                      # Modular client components (telemetry, terminal, deployments, etc.)
├── shared/
│   ├── logger.js                # Structured logger with log levels
│   ├── storage.js               # S3 & Local Storage abstraction
│   └── redis-client.js          # Redis Pub/Sub & Key-Value store
├── tests/                       # Jest unit & integration test suite (>70% coverage)
├── .env.example                 # Documented template for all 15 environment variables
├── eslint.config.mjs            # ESLint flat configuration
├── jest.config.js               # Jest configuration & coverage thresholds
├── CHANGELOG.md                 # Semantic versioning history
├── CONTRIBUTING.md              # Contribution and PR guidelines
├── docker-compose.yml           # Multi-container orchestration
├── start-all.js                 # Unified single-command launcher
└── package.json                 # Project manifest & npm scripts
```
