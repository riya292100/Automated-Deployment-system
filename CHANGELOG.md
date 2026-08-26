# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
