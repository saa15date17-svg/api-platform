# API Platform

An OpenRouter-like API platform built with microservice architecture.

## Architecture

Five independently deployable services:

| Service | Role | Tech | Deploy |
|---------|------|------|--------|
| **Zitadel** | Auth / IAM | Go + PostgreSQL | Official container |
| **Bifrost** | AI Gateway | Go | Official container |
| **OptamusUI** | User Chat Frontend | Python + Svelte | Custom Docker image |
| **MainBackend** | Business Logic API | Python + FastAPI | Custom Docker image |
| **Admin Dashboard** | Admin Panel | React + Vite 6 + Ant Design 5 | Custom Docker image |

## Domain Structure

- `app.optamus.cloud` — OptamusUI (user chat)
- `admin.optamus.cloud` — Admin Dashboard
- `api.optamus.cloud` — MainBackend + Bifrost (developer API)
- `auth.optamus.cloud` — Zitadel (OIDC login)

## Quick Start

```bash
# 1. Copy and configure environment
cp .env.example .env

# 2. Deploy all services
bash infrastructure/scripts/deploy.sh
```

## Development

### MainBackend (Python + FastAPI)

```bash
cd services/main-backend
pip install -r requirements.txt
uvicorn main:app --reload --port 9000
```

### Admin Dashboard (React + Vite)

```bash
cd services/admin-dashboard
npm install
npm run dev
```

## Documentation

| Service | Docs |
|---------|------|
| Admin Dashboard | [docs/admin-dashboard/README.md](./docs/admin-dashboard/README.md) |
| Admin Dashboard Mocking | [docs/admin-dashboard/MOCK_BACKEND.md](./docs/admin-dashboard/MOCK_BACKEND.md) |
| Admin Dashboard API Contract | [docs/admin-dashboard/INTEGRATION_CONTRACT.md](./docs/admin-dashboard/INTEGRATION_CONTRACT.md) |
| Cross-Service Integration | [docs/admin-dashboard/CROSS_SERVICE_INTEGRATION.md](./docs/admin-dashboard/CROSS_SERVICE_INTEGRATION.md) |
| Admin Dashboard Onboarding | [docs/admin-dashboard/ONBOARDING.md](./docs/admin-dashboard/ONBOARDING.md) |
| OptimusUI | [services/optamusUI/README.md](../services/optamusUI/README.md) |
| MainBackend | [services/main-backend/open_webui/README.md](../services/main-backend/open_webui/README.md) |

## Deployment

See [docs/deployment.md](docs/deployment.md) for full deployment instructions.
