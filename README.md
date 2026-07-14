# API Platform

An OpenRouter-like API platform built with microservice architecture.

## Architecture

Five independently deployable services (currently running on PaaS free tiers):

| Service | Role | Tech | Deploy Target |
|---------|------|------|---------------|
| **Zitadel** | Auth / IAM | Go + PostgreSQL | Render (Web Service + DB) |
| **Bifrost** | AI Gateway | Go | Railway |
| **OptamusUI** | User Chat Frontend | SvelteKit (OpenWebUI Frontend) | Railway |
| **MainBackend** | Business Logic API | Python + FastAPI (OpenWebUI Backend) | Railway |
| **Admin Dashboard** | Admin Panel | React + Vite 6 + Ant Design 5 | Render (Static Site) |

## Domain Structure

- `app.optamus.cloud` — OptamusUI (user chat)
- `admin.optamus.cloud` — Admin Dashboard
- `api.optamus.cloud` — MainBackend + Bifrost (developer API)
- `auth.optamus.cloud` — Zitadel (OIDC login)

## Deployment (PaaS - Free Tier)

Since the project is deployed across Render and Railway on free tiers, standard deployment is managed via GitOps:

1. **Automatic Deployment**:
   Commit and push your changes to the `master` branch.
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin master
   ```
   Both Render and Railway are linked to the GitHub repository and will automatically build and deploy the services.

2. **Manual CLI Deployment (Optional)**:
   - For **Railway** services (`main-backend`, `optamusUI`, `bifrost`):
     Run `railway up --service <service_name>` inside the project root or specific directory.
   - For **Render** services (`admin-dashboard`, `zitadel`):
     Use the Render dashboard or CLI (e.g., `render deploys create <service_id>`).

## Local Development (Docker)

If you wish to run the entire stack locally:

```bash
# 1. Copy and configure environment
cp .env.example .env

# 2. Deploy all services locally using Docker Compose
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
