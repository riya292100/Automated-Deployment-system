# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-09-03

### Added

- **Modular Route Controllers**: Decomposed monolithic `api-server/index.js` into focused routers (`routes/deploy.js`, `routes/logs.js`, `routes/deployments.js`, `routes/system.js`), bringing main entrypoint down to under 65 LOC.
- **Framework Detection Engine Module**: Extracted `build-server/detectFramework.js` containing stack detection heuristics, recursive copy helpers, and asset writer utilities, bringing `builder.js` down to under 485 LOC.
- **Strict Zod Direct Deployment Validation**: Added `directDeploySchema` and `deploymentIdParamSchema` ensuring comprehensive request sanitization on drag & drop file uploads and route params.
- **Sentry & Error Tracking Hook**: Added structured error forwarding to `shared/logger.js` supporting `SENTRY_DSN` and dynamic callback hooks (`logger.setErrorHook`).
- **Comprehensive Test Breadth**: Added 4 new test suites (`tests/builder-detect.test.js`, `tests/proxy.test.js`, `tests/logger.test.js`, `tests/deployments.test.js`), bringing test suite to 10 spec files and 92 passing unit tests.
- **Enforced Coverage Threshold**: Configured Jest coverage thresholds at global 70% lines, 70% statements, 60% branches, and 60% functions with build-gate failure.
- **Environment Completeness**: Fully populated `.env.example` with all 14 previously undocumented environment variables and added offline test documentation to `README.md`.

### Changed

- **CI/CD Offline Test Verification**: Added an explicit offline test step in `.github/workflows/ci.yml` verifying zero-cloud isolation by unsetting all AWS and Redis credentials.

## [1.2.0] - 2026-09-01

### Added

- **TypeScript Infrastructure & Type Safety**: Added root `tsconfig.json` with strict type checking, ambient domain type definitions (`shared/types.ts`), and CI-gated `npm run typecheck` (`tsc --noEmit`).
- **React 19 + TypeScript + Vite Starter Application**: Upgraded `sample-projects/react-vite-app` to a production-grade React 19 application with Vite 6, TypeScript typings, interactive telemetry state hooks, and pre-compiled production build bundle.
- **Vue 3.5 + TypeScript + Vite Starter Application**: Added `sample-projects/vue-vite-app` with Vue 3 Composition API, reactive state management, typed cluster telemetry, and production build bundle.
- **Python 3.12+ WebAssembly Data App**: Added `sample-projects/python-web-app` featuring client-side scientific computing, Gaussian distribution analysis, and percentile calculations powered by Pyodide.
- **Rust 2021 + WebAssembly Micro-Engine**: Added `sample-projects/rust-wasm-app` with near-native execution speed, FNV-1a cryptographic hashing, and prime compute sieve benchmark.
- **Modern TypeScript Analytics Dashboard**: Upgraded `sample-projects/analytics-dashboard` with TypeScript telemetry streaming engine (`src/dashboard.ts`) and ES module reactive cards.
- **Polyglot Build Engine Intelligence**: Enhanced `build-server/builder.js` to dynamically detect language and framework stacks (TypeScript, React 19, Vue 3, Svelte 5, Next.js 15, Python 3.12, Rust/WASM, Astro 5), log stack signatures in Redis streams, and optimize deployment with an asset fast-path.
- **Starter Template Catalog Endpoint**: Added `GET /api/templates` returning rich metadata for all supported languages and frameworks.
- **Modernized UI Starter Templates**: Updated dashboard cards and deployment modal dialogs with badges and 1-click deploy support for React 19, Vue 3, Python, Rust, and TypeScript.

### Changed

- **Container Base Images Upgraded**: Migrated Dockerfiles across `build-server`, `api-server`, and `s3-reverse-proxy` to `node:22-alpine` (Node.js 22 LTS).
- **CI/CD Pipeline Matrix**: Updated `.github/workflows/ci.yml` matrix to test on Node `22.x` and `24.x`, integrating strict TypeScript type checking before lint and test steps.
- **Test Suite Expansion**: Added automated tests validating containerized builds, stack detection, and S3 asset delivery for React 19, Vue 3, Python, and Rust WASM starter projects.

## [1.1.0] - 2026-08-26

### Added

- **Zod Input Validation**: Schema validation at all API boundaries (`api-server/schemas.js`) with structured error issues.
- **Jest Test Suite & Coverage**: Migrated from custom assert scripts to Jest with `supertest`, coverage threshold enforcement (>70%), and 35+ test cases.
- **GitHub Actions CI Workflow**: Multi-node matrix (20.x, 22.x) CI pipeline for linting, formatting checks, test coverage, and `npm audit`.
- **Dependabot Configuration**: Automated weekly dependency and lockfile freshness checks.
- **Structured Logger & Observability**: Added `shared/logger.js` supporting log levels and Prometheus metrics endpoint (`GET /api/metrics`).
- **Environment Variable Template**: Added `.env.example` covering all 15 environment variables.
- **Code Cleanliness**: Configured ESLint (flat config) and Prettier; modularized `dashboard/app.js` into focused sub-modules under `dashboard/js/`.

### Changed

- Refactored `start-all.js`, `api-server/index.js`, and `s3-reverse-proxy/index.js` to load configuration via `dotenv`.
- Enhanced Reverse Proxy SPA router and error handling.

## [1.0.0] - 2026-08-26

### Added

- Initial release of Automated Deployment System.
- Express REST API orchestrator (`port 9000`).
- Containerized build worker with S3 uploader and Redis Pub/Sub log streaming.
- S3 Reverse Proxy engine (`port 8000`) with subdomain and path-based routing.
- High-performance zero-configuration local S3 and Redis in-memory emulators.
- Glassmorphic dark-mode web console with live ANSI streaming terminal, site previewer, and architecture visualizer.
- Built-in 1-click starter templates (Landing Page, React Vite SPA, Analytics Dashboard).
- AWS Cloud ECS Task definitions, CodePipeline configs, and Docker Compose orchestration.
