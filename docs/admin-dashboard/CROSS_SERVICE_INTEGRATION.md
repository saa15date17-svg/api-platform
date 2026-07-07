# Optimus Platform — Integration Guide for Other Services

> Audience: Developers working on `optamusUI`, `main-backend`, or any service that needs to integrate with the Admin Dashboard or share the same API layer.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Shared API Contract](#shared-api-contract)
3. [Authentication Integration](#authentication-integration)
4. [Frontend Integration (OptimusUI)](#frontend-integration-optimusui)
5. [Backend Integration (MainBackend)](#backend-integration-mainbackend)
6. [Cross-Service Communication](#cross-service-communication)
7. [Environment Configuration](#environment-configuration)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Cloudflare Tunnel                    │
│                  (TLS termination at edge)                │
└───────┬─────────────┬─────────────┬─────────────┬───────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
  app.optamus   admin.optamus   api.optamus   auth.optamus
  .cloud        .cloud          .cloud        .cloud
       │            │              │              │
       ▼            ▼              ▼              ▼
  ┌─────────┐ ┌──────────┐  ┌───────────┐  ┌─────────┐
  │OptimusUI│ │Admin Dash│  │MainBackend│  │ Zitadel │
  │ :3000   │ │ :3001    │  │ :9000     │  │ :8080   │
  │(Svelte) │ │ (React)  │  │ (FastAPI) │  │ (Go)    │
  └────┬────┘ └────┬─────┘  └─────┬─────┘  └────┬────┘
       │           │              │              │
       └───────────┴──────────────┴──────────────┘
                   Internal Network (bridge)
       ┌───────────┴──────────────┴──────────────┐
       │                                             │
       ▼                                             ▼
  ┌────────────┐                              ┌──────────┐
  │ PostgreSQL │                              │ Bifrost  │
  │   :5432    │                              │  :8082   │
  │            │                              │(AI Gateway)
  └────────────┘                              └─────┬────┘
                                                   │
                            ┌──────────────────────┼──────────────────────┐
                            ▼                      ▼                      ▼
                      OpenAI API            Anthropic API         Ollama / Local
```

---

## Shared API Contract

The canonical API specification lives at:

```
API_PLATFORM/api-spec/openapi.json
```

This is the **single source of truth** for all API contracts. All services must adhere to it.

### Who Should Read This

| Service | Why |
|---------|-----|
| **OptimusUI** | Consumes the `/api/v1/...` REST API and `/ws/socket.io` WebSocket |
| **MainBackend** | Implements the `/api/v1/...` REST API endpoints |
| **Admin Dashboard** | Consumes the `/api/v1/...` REST API |
| **Bifrost** | Receives OpenAI-compatible requests from MainBackend |
| **Zitadel** | Provides OIDC authentication for all services |

---

## Authentication Integration

### OIDC Flow (Zitadel)

All services authenticate via Zitadel at `https://auth.optamus.cloud`.

#### Client Registration

Zitadel has four OAuth clients configured:

| Client ID | Purpose | Used By |
|-----------|---------|---------|
| `openwebui@your-project` | OptimusUI OIDC login | OptimusUI |
| `admin-dashboard@your-project` | Admin Dashboard OIDC login | Admin Dashboard |
| `main-backend@your-project` | Service-to-service auth | MainBackend |

#### Environment Variables

```bash
# Zitadel OIDC configuration (required for all services)
ZITADEL_OIDC_URL=https://auth.optamus.cloud
ZITADEL_OPENWEBUI_CLIENT_ID=openwebui@your-project
ZITADEL_OPENWEBUI_CLIENT_SECRET=<secret>
ZITADEL_ADMIN_CLIENT_ID=admin-dashboard@your-project
ZITADEL_ADMIN_CLIENT_SECRET=<secret>
MAINBACKEND_ZITADEL_CLIENT_ID=main-backend@your-project
MAINBACKEND_ZITADEL_CLIENT_SECRET=<secret>
```

#### JWT Token Format

The Admin Dashboard expects JWT tokens with these claims:

```json
{
  "sub": "user-001",
  "email": "admin@optamus.cloud",
  "name": "Admin User",
  "role": "admin",
  "exp": 1720324000,
  "iat": 1720230400
}
```

- Signed with HS256 using the shared `JWT_SECRET`
- Expiry is in seconds since epoch (`exp * 1000` for JavaScript `Date.now()`)

---

## Frontend Integration (OptimusUI)

### MSW Mocking

OptimusUI already uses MSW v2 for mock-driven development. The Admin Dashboard follows the **exact same pattern**.

If OptimusUI needs to call new Admin Dashboard endpoints, follow this pattern:

```ts
// src/lib/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Existing handlers...

  // Mock Admin Dashboard endpoint
  http.get('/api/admin/stats', async () => {
    return HttpResponse.json({
      totalUsers: 42,
      activeKeys: 12,
    });
  }),
];
```

### Shared API Client

OptimusUI and Admin Dashboard both use the same `fetch`-based API client. To keep them consistent:

1. **Do not duplicate** the API client logic — extract shared types/interfaces if cross-service typing is needed.
2. **Use the same endpoint conventions**: `/api/v1/` prefix for REST, `/v1/` prefix for OpenAI-compatible endpoints.
3. **Use the same error format**: `{ "detail": "message" }` on non-2xx responses.

### OptimusUI → Admin Dashboard Navigation

If OptimusUI needs to link to the Admin Dashboard:

```ts
const ADMIN_URL = 'https://admin.optamus.cloud';
window.open(`${ADMIN_URL}/users`, '_blank');
```

---

## Backend Integration (MainBackend)

### Implementing Admin Dashboard Endpoints

MainBackend is a forked/embedded OpenWebUI backend. The Admin Dashboard expects these endpoints to be implemented under the existing FastAPI router structure.

#### Route Registration

In `services/main-backend/open_webui/routers/`:

```python
# routers/admin.py (new file)
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from open_webui.internal.db import get_async_session
from open_webui.utils.auth import get_verified_user

router = APIRouter()

@router.get("/api/v1/users/all")
async def list_all_users(
    session: AsyncSession = Depends(get_async_session),
    user = Depends(get_verified_user),
):
    # Implement user listing
    pass

@router.post("/api/v1/users/{user_id}/update")
async def update_user(
    user_id: str,
    session: AsyncSession = Depends(get_async_session),
    user = Depends(get_verified_user),
):
    # Implement user update
    pass
```

Then register in `open_webui/main.py`:

```python
from open_webui.routers import admin

app.include_router(admin.router)
```

#### Response Format Compliance

All responses MUST match the contract in [INTEGRATION_CONTRACT.md](./INTEGRATION_CONTRACT.md).

Key rules:
- Success: return the object(s) directly with HTTP 200
- Failure: return `{"detail": "message"}` with appropriate HTTP status
- Timestamps: use Unix timestamps in **seconds** (not milliseconds)

### OpenAPI Spec Sync

Whenever a new endpoint is added to MainBackend:

1. Run FastAPI dev server
2. Verify `/openapi.json` includes the new endpoint
3. Update `API_PLATFORM/api-spec/openapi.json` if the contract has changed
4. Ensure the Admin Dashboard mock handlers reflect the new endpoint

---

## Cross-Service Communication

### Admin Dashboard → MainBackend

The Admin Dashboard calls MainBackend directly via HTTP:

```
admin-dashboard (3001)
  → nginx proxy (/api/ → main-backend:9000)
    → main-backend FastAPI
```

No service-to-service authentication is needed because they share the internal Docker network.

### MainBackend → Bifrost

MainBackend proxies AI requests to Bifrost:

```python
# In MainBackend
BIFROST_URL = "http://bifrost:8080/v1"
```

### MainBackend → Zitadel

MainBackend validates JWTs issued by Zitadel:

```python
from jose import jwt
from open_webui.env import JWT_SECRET

payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
```

### OptimusUI → MainBackend

OptimusUI calls the OpenAI-compatible endpoints:

```
POST /v1/chat/completions
GET /v1/models
```

These are proxied through Nginx to MainBackend, which validates the request and forwards to Bifrost.

---

## Environment Configuration

### Shared Environment Variables

These must be **identical** across services for auth to work:

```bash
# .env (root of API_PLATFORM)
JWT_SECRET=<same-value-everywhere>
ZITADEL_OIDC_URL=https://auth.optamus.cloud
ZITADEL_OPENWEBUI_CLIENT_ID=openwebui@your-project
ZITADEL_OPENWEBUI_CLIENT_SECRET=<same-value-everywhere>
ZITADEL_ADMIN_CLIENT_ID=admin-dashboard@your-project
ZITADEL_ADMIN_CLIENT_SECRET=<same-value-everywhere>
MAINBACKEND_ZITADEL_CLIENT_ID=main-backend@your-project
MAINBACKEND_ZITADEL_CLIENT_SECRET=<same-value-everywhere>
```

### Service-Specific Variables

```bash
# MainBackend
MAINBACKEND_DATABASE_URL=postgresql://postgres:password@postgres:5432/api_platform
OPENAI_API_KEY=sk-...
OPENAI_API_BASE_URL=http://bifrost:8080/v1

# OptimusUI
WEBUI_SECRET_KEY=<random-secret>
OPENAI_API_KEY=sk-...  # Must match MainBackend's OPENAI_API_KEY
OPENAI_API_BASE_URL=http://bifrost:8080/v1

# Admin Dashboard
API_BASE_URL=        # Empty in production (proxied by Nginx)
AUTH_BASE_URL=https://auth.optamus.cloud
ZITADEL_CLIENT_ID=admin-dashboard@your-project
ZITADEL_CLIENT_SECRET=<same-value-everywhere>
```

### CORS Configuration

Backend CORS must allow the Admin Dashboard origin:

```bash
# MainBackend .env
CORS_ALLOW_ORIGIN=https://app.optamus.cloud;https://admin.optamus.cloud;https://optamus.cloud;https://www.optamus.cloud
```

---

## Quick Start for New Contributors

### If You're Working on the Admin Dashboard

1. Read [Admin Dashboard README](./README.md)
2. Run `npm install && npm run dev`
3. Log in with `admin@optamus.cloud` / `admin123`
4. Extend mocks in `src/mocks/handlers.ts`
5. Add pages in `src/pages/`

### If You're Working on MainBackend

1. Read [Integration Contract](./INTEGRATION_CONTRACT.md)
2. Implement missing endpoints in `open_webui/routers/`
3. Register routes in `main.py`
4. Verify against `/openapi.json`

### If You're Working on OptimusUI

1. Follow the existing MSW pattern in `src/lib/mocks/`
2. Use the same API client conventions
3. Do NOT duplicate the API client — import shared types

### If You're Integrating Any Service with Zitadel

1. Register a new OAuth client in Zitadel admin
2. Add env vars to `.env`
3. Implement OIDC flow using `authlib`
4. Verify JWT validation works across services

---

## Related Documentation

- [Admin Dashboard Developer Docs](./admin-dashboard/README.md)
- [Admin Dashboard Mock Guide](./admin-dashboard/MOCK_BACKEND.md)
- [Admin Dashboard Integration Contract](./admin-dashboard/INTEGRATION_CONTRACT.md)
- [API Specification](../../api-spec/openapi.json)
- [Architecture Overview](../../docs/architecture.md)
- [Deployment Guide](../../docs/deployment.md)
- [OptimusUI README](../../optamusUI/README.md)
- [MainBackend README](../../main-backend/open_webui/README.md)
