# ▲ Vercel Cloud Clone - Autonomous Deployment Platform

> **Full-Stack Autonomous Cloud Deployment Platform using Docker, AWS ECS Fargate, Amazon S3, Redis, and Reverse Proxy — with 1-Click Free Global Publishing**

[![CI Pipeline](https://github.com/riya292100/Automated-Deployment-system/actions/workflows/ci.yml/badge.svg)](https://github.com/riya292100/Automated-Deployment-system/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178c6.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D22%20LTS-339933.svg?style=flat-square&logo=nodedotjs)](https://nodejs.org)
[![Coverage Status](https://img.shields.io/badge/Coverage-100%25%20Passing-brightgreen.svg?style=flat-square)](https://github.com/riya292100/Automated-Deployment-system)
[![Validation: Zod](https://img.shields.io/badge/Validation-Zod-3068b7.svg?style=flat-square&logo=zod)](https://zod.dev)
[![Code Style: Prettier](https://img.shields.io/badge/Code_Style-Prettier-ff69b4.svg?style=flat-square&logo=prettier)](https://prettier.io)
[![Linter: ESLint](https://img.shields.io/badge/Linter-ESLint-4B32C3.svg?style=flat-square&logo=eslint)](https://eslint.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## 🌟 Overview & What's New

The **Vercel Cloud Clone** is a complete, production-grade automated deployment engine that replicates the core developer experience of **Vercel**:
- **▲ Vercel-Grade Cloud Dashboard**: Modern dark-theme console with Active Project Cards, live ANSI build terminal streaming via Redis SSE, interactive architecture telemetry, and responsive device previewers (Desktop, Tablet, Mobile).
- **🚀 100% Free Public Live Publishing**: Instantly share your running Vercel Clone publicly with zero fees, zero credit cards, and zero manual port forwarding via `npm run live`.
- **☁️ Cloud Free-Tier Ready (Single-Port Architecture)**: Run on Render, Koyeb, Railway, Fly.io, or Docker with the unified server entry point (`server.js`) that automatically binds API, Web Console, and Reverse Proxy on a single `$PORT`.
- **📂 Instant Drag & Drop Deployments**: Drop any static folder, production dist bundle, or paste HTML/CSS/JS directly to launch a live website in 1 second.
- **🌐 Dynamic Edge Reverse Proxy**: Dynamic path-based routing (`/site/:slug/*`) and subdomain routing (`:slug.domain.com`) with automated Single Page Application (SPA) fallback to `index.html`.
- **⚡ Polyglot Build Worker**: Automatic detection and compilation of modern frameworks (React 19 Vite, Vue 3.5 Vite, Python Pyodide WASM, Rust WASM, and ES2022+).

---

## 🌐 Publish 100% Free Online

You can publish this Vercel Clone live to the internet for free using any of the three methods below:

### Method 1: Instant Encrypted HTTPS Tunnel (0 Setup, 0 Signup)

Run one command in your terminal to start the platform and generate a public HTTPS link:

```bash
npm run live
```
or
```bash
npm run tunnel
```

**Output:**
```
================================================================
       🎉 YOUR VERCEL CLONE IS LIVE AND ONLINE FOR FREE!        
================================================================

  🌐 Public Live URL:      https://xxxx.loca.lt
  📊 Cloud Console:        https://xxxx.loca.lt/
  ⚡ Live Edge Previews:   https://xxxx.loca.lt/site/:slug/
  🔌 REST API Endpoints:   https://xxxx.loca.lt/api/health

  🔒 SSL Encrypted • Zero Cost • Ready to share with anyone!
```

---

### Method 2: Deploy to Render Free Web Service (24/7 Hosting)

The repository includes a ready-to-use [`render.yaml`](render.yaml) blueprint:

1. Push this repository to your GitHub account:
   ```bash
   git push origin main
   ```
2. Go to [dashboard.render.com](https://dashboard.render.com) &rarr; **New** &rarr; **Blueprint**.
3. Connect your GitHub repository. Render automatically reads `render.yaml` and provisions a Free Web Service.
4. Set the environment variable:
   - `UNIFIED_SERVER=true`
   - `NODE_ENV=production`
   - `STORAGE_MODE=local`
5. Click **Apply**. Within ~2 minutes, your Vercel clone is live at `https://<your-subdomain>.onrender.com`!

---

### Method 3: Deploy to Koyeb, Railway, or Fly.io (Docker)

Use the optimized multi-stage production [`Dockerfile`](Dockerfile):

```bash
# Build Docker image
docker build -t vercel-clone .

# Run container on port 3000
docker run -p 3000:3000 -e UNIFIED_SERVER=true vercel-clone
```

Or connect directly to Koyeb using [`koyeb.yaml`](koyeb.yaml) for a free containerized cloud instance.

---

## 🏗️ Architecture & Component Topology

```
+-----------------------------------------------------------------------------------+
|                        ▲ VERCEL CLONE PLATFORM TOPOLOGY                           |
+-----------------------------------------------------------------------------------+

     [Developer / User]
             │
             ├──(1. Drag & Drop Files / Paste HTML / Git Push)──┐
             │                                                 │
             ▼                                                 ▼
   [Unified Cloud Server: server.js]                  [Public Edge Tunnel]
   ├── API Orchestrator (/api/*)                      (Cloudflare / Localtunnel)
   ├── Web Management Console (/)                               │
   └── Edge Reverse Proxy (/site/:slug/*) <─────────────────────┘
             │
             ├──(2. Dispatch Containerized Build Worker)
             ▼
     [Build Server Worker (builder.js)]
             │
             ├──(3. Stream Real-Time ANSI Logs)────────> [Redis Pub/Sub Layer]
             │                                                     │
             └──(4. Persist Optimized Production Assets)          ▼
                     │                                   [Live Log Stream (SSE)]
                     ▼                                             │
         [Amazon S3 / Local Bucket Storage]                        ▼
                     │                                   [Vercel Cloud Console]
                     └──(5. Serve with SPA Fallback)───────────────┘
```

---

## ⚡ Supported Modern Languages & Starter Templates

| Language / Stack          | Framework           | Template ID           | Description                                                               |
| :------------------------ | :------------------ | :-------------------- | :------------------------------------------------------------------------ |
| **TypeScript / React 19** | Vite 6              | `react-vite-app`      | Enterprise Single Page App with typed hooks and real-time state telemetry |
| **TypeScript / Vue 3.5**  | Vite 6              | `vue-vite-app`        | Composition API reactive frontend with distributed edge node telemetry    |
| **Python 3.12+**          | Pyodide WebAssembly | `python-web-app`      | Scientific computing, Gaussian distribution analysis, and quantiles       |
| **Rust 2021**             | WebAssembly         | `rust-wasm-app`       | High-speed cryptographic hash generator and prime compute sieve benchmark |
| **TypeScript 5.8**        | ES Modules          | `analytics-dashboard` | Real-time telemetry engine with typed event streams and metrics charts    |
| **ES2022+ / HTML5**       | CSS3                | `modern-landing-page` | High-converting dark-theme landing page with animations                   |

---

## 🚀 Local Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Unified Mode (Single Port 3000)
```bash
npm run server
```
Access the Vercel console at `http://localhost:3000`.

### 3. Run in Dual-Port Development Mode
```bash
npm start
```
- Web Console & API: `http://localhost:9000`
- S3 Reverse Proxy: `http://localhost:8000`

---

## 🧪 Testing & Code Quality

The repository features 100% passing tests across 5 test suites covering API endpoints, reverse proxy routing, builder workers, storage, and Redis emulation:

```bash
# Run full automated test suite
npm test

# Run tests with test coverage reporting
npm run test:coverage

# TypeScript typecheck
npm run typecheck

# ESLint inspection & auto-fix
npm run lint
npm run lint:fix

# Format with Prettier
npm run format
```

---

## 🔌 API Reference

### 1. Direct 1-Click Deployment
`POST /api/deploy/direct`
```json
{
  "projectName": "my-cool-site",
  "html": "<!DOCTYPE html><html><body><h1>Hello World</h1></body></html>",
  "files": [
    { "path": "index.html", "content": "..." },
    { "path": "style.css", "content": "..." }
  ]
}
```
**Response (202 Accepted):**
```json
{
  "success": true,
  "deploymentId": "dep-xxx",
  "projectSlug": "my-cool-site",
  "previewUrl": "http://localhost:3000/site/my-cool-site/"
}
```

### 2. Git & Starter Template Deployment
`POST /api/deploy`
```json
{
  "gitUrl": "https://github.com/user/my-app.git",
  "templateId": "react-vite-app",
  "projectName": "my-react-store",
  "buildCommand": "npm run build",
  "outputDir": "dist"
}
```

### 3. Live Log Stream (SSE)
`GET /api/logs/:deploymentId`
_Connects to real-time Server-Sent Events (SSE) log stream._

### 4. System Public Info
`GET /api/system/public-info`
_Returns platform version, storage mode, available starters, and feature flags._

### 5. Health Diagnostics
`GET /api/health`
_Returns health status of API Server, ECS Worker, S3 Storage, and Redis._

---

## 📂 Project Structure

```
automated-deployment-system/
├── server.js                    # Unified Single-Port Production Entry Point
├── render.yaml                  # Render.com Blueprint for 1-Click Free Hosting
├── koyeb.yaml                   # Koyeb.com Deployment Configuration
├── Dockerfile                   # Multi-Stage Production Container Image
├── scripts/
│   └── publish-free.js          # CLI helper for instant free public live URLs
├── api-server/
│   ├── index.js                 # REST API, Direct Deploy, and Web Console Server
│   └── schemas.js               # Zod input validation schemas
├── build-server/
│   ├── builder.js               # Containerized Builder, Direct Deployer & S3 Uploader
│   └── Dockerfile               # Build Server worker container definition
├── s3-reverse-proxy/
│   └── index.js                 # Edge Reverse Proxy middleware with SPA fallback
├── dashboard/                   # ▲ Vercel Glassmorphic Dark-Theme UI
│   ├── index.html               # Main Console, Vercel Projects Grid, Publish Tab
│   ├── style.css                # Vercel Design System CSS tokens & micro-animations
│   ├── app.js                   # Application state manager & dynamic URLs
│   └── js/                      # Modular components (deployments, terminal, preview, telemetry)
├── shared/
│   ├── logger.js                # Structured logger with log levels
│   ├── storage.js               # S3 & Local Storage abstraction
│   └── redis-client.js          # Redis Pub/Sub & Key-Value store
├── tests/                       # Jest unit & integration test suites (100% passing)
│   ├── unified-server.test.js   # Unified single-port & direct deploy tests
│   ├── api.test.js              # API Server & Reverse Proxy integration tests
│   ├── builder.test.js          # Builder worker & starter template tests
│   ├── storage.test.js          # S3 storage tests
│   └── redis.test.js            # Redis client tests
├── start-all.js                 # Multi-mode launcher (cloud auto-detection)
└── package.json                 # Project manifest & npm scripts
```

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more details.
