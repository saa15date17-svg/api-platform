# Architecture

## Documentation for Service Developers

| Service | Developer Docs |
|---------|---------------|
| Admin Dashboard | [docs/admin-dashboard/README.md](./admin-dashboard/README.md) |
| Admin Dashboard (Mocking) | [docs/admin-dashboard/MOCK_BACKEND.md](./admin-dashboard/MOCK_BACKEND.md) |
| Admin Dashboard (API Contract) | [docs/admin-dashboard/INTEGRATION_CONTRACT.md](./admin-dashboard/INTEGRATION_CONTRACT.md) |
| Cross-Service Integration | [docs/admin-dashboard/CROSS_SERVICE_INTEGRATION.md](./admin-dashboard/CROSS_SERVICE_INTEGRATION.md) |
| OptimusUI | [services/optamusUI/README.md](../services/optamusUI/README.md) |
| MainBackend | [services/main-backend/open_webui/README.md](../services/main-backend/open_webui/README.md) |

## Overview

```
                         ┌─────────────────────┐
                         │   Cloudflare Tunnel   │
                         │  (TLS termination)    │
                         └──────┬───┬───┬───┬──┘
                                │   │   │   │
              ┌─────────────────┘   │   │   └──────────────┐
              ▼                     ▼   ▼                  ▼
       ┌──────────┐        ┌────────────┐        ┌────────────────┐
       │  Zitadel  │◄──────►│ MainBackend│        │  Admin Dashboard│
       │  (Auth)   │ OIDC   │(Python+    │        │(React + Vite + Ant Design)│
       │  :8080    │        │  FastAPI)  │        │   :3001         │
       │           │        │  :9000     │        │                 │
       └──────────┘        └─────┬───┬───┘        └────────────────┘
              │                  │   │
              │     ┌────────────┘   └──────────────┐
              │     ▼                               ▼
              │  ┌────────────┐            ┌────────────────┐
              │  │  Bifrost   │◄──────────►│   OptamusUI     │
              │  │(AI Gateway)│  OpenAI     │  (User Chat)    │
              │  │ :8082      │  Compatible │   :3000         │
              │  └──────┬─────┘            └────────────────┘
              │         │
              │         ├── OpenAI / Anthropic / Gemini / etc.
              │         └── Local models
              │
              └──── OIDC Auth for all services ────
```

## Data Flow

### User Chat Flow
1. User visits `app.optamus.cloud`
2. OptamusUI redirects to Zitadel OIDC login (`auth.optamus.cloud`)
3. User authenticates, gets redirected back
4. User sends a chat message
5. OptamusUI calls MainBackend API (`api.optamus.cloud/v1/chat/completions`)
6. MainBackend validates auth, checks rate limits, forwards to Bifrost
7. Bifrost routes to the appropriate AI provider
8. Response flows back through the chain

### Developer API Flow
1. Developer sends `curl https://api.optamus.cloud/v1/chat/completions -H "Authorization: Bearer sk-..."`
2. MainBackend validates the API key
3. Checks rate limits and billing
4. Forwards request to Bifrost
5. Records usage for billing
6. Returns response

### Admin Flow
1. Admin visits `admin.optamus.cloud`
2. Logs in via Zitadel OIDC (or email/password)
3. Admin Dashboard calls MainBackend API for all operations
4. Manages users, API keys, monitors usage, configures billing

## Service Communication

| From | To | Protocol | Port |
|------|----|----------|------|
| Browser | Cloudflare | HTTPS | 443 |
| Cloudflare → Nginx | All services | HTTPS | 8443 |
| Nginx → OptamusUI | HTTP | 3000 |
| Nginx → Admin Dashboard | HTTP | 3001 |
| Nginx → MainBackend | HTTP | 9000 |
| Nginx → Zitadel | HTTP | 8080 |
| OptamusUI → Zitadel | OIDC | 8080 |
| OptamusUI → MainBackend | HTTP | 9000 |
| MainBackend → Zitadel | gRPC/HTTP | 8080 |
| MainBackend → Bifrost | HTTP | 8082 |
| MainBackend → PostgreSQL | SQL | 5432 |
