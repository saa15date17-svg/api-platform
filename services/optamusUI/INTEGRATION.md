# OptamusUI — Integration Guide

## Architecture Overview

OptamusUI is a **SvelteKit SPA** (Single Page Application) that serves as the chat frontend for the Optamus AI platform. It is a rebranded fork of Open WebUI.

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER (SPA)                           │
│                                                                 │
│  OptamusUI (SvelteKit)  ─── runs on port 5173 (dev)            │
│  Serves: index.html + JS/CSS bundles                            │
│  Auth: Zitadel OIDC (cookie-based session)                      │
│                                                                 │
│  All API calls use fetch() with Bearer token or cookies         │
└──────────────┬──────────────────────────────────────────────────┘
               │
               │  HTTP requests (same-origin in production, proxied in dev)
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX REVERSE PROXY (:8081)                  │
│                                                                 │
│  app.optamus.cloud    → OptamusUI static files (:3000)          │
│  admin.optamus.cloud  → Admin Dashboard (:3001)                 │
│  api.optamus.cloud    → MainBackend API (:9000)                 │
│  auth.optamus.cloud   → Zitadel (:8080)                         │
│                                                                 │
│  Proxies: /api/* → main-backend:9000                            │
│           /ws/*  → main-backend:9000 (WebSocket)                │
│           /ollama/* → main-backend:9000                         │
│           /openai/* → main-backend:9000                         │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MAIN BACKEND (Python/FastAPI :9000)            │
│                                                                 │
│  /api/v1/*     → Auth, Users, Chats, Models, Files, etc.        │
│  /api/models   → Merged model list from all providers           │
│  /api/chat/completions → Chat completion (streaming)            │
│  /ws/socket.io → Real-time events (chat, tools, code exec)      │
│                                                                 │
│  Fetches models from providers via HTTP:                        │
│    - OpenAI-compatible: GET {url}/v1/models                     │
│    - Ollama: GET {url}/api/tags                                 │
│  Stores config in PostgreSQL (config table)                     │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PROVIDERS                                  │
│                                                                 │
│  OpenAI-compatible APIs (e.g., Kilocode Gateway, OpenRouter)    │
│    - stepfun/step-3.7-flash:free                                │
│    - Base URL: https://kilocode-gateway.machinegenerative.workers.dev/v1 │
│    - Key: sk_proxy_mykey                                        │
│                                                                 │
│  Ollama (local)                                                 │
│    - http://localhost:11434                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Service Ports

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| PostgreSQL | 5432 | TCP | Database (native) |
| Zitadel | 8080 | HTTP | Auth/Identity (Docker) |
| Bifrost | 8082 | HTTP | AI Gateway (Docker) |
| Main Backend | 9000 | HTTP | API Server (native) |
| OptamusUI | 5173 | HTTP | Chat Frontend (native dev) |
| Admin Dashboard | 3001 | HTTP | Admin Panel (native dev) |
| Nginx | 8081 | HTTP | Reverse Proxy (native) |

## How OptamusUI Connects to Other Services

### 1. Backend API Connection

In **dev mode**, OptamusUI uses the Vite dev server proxy:

```
Browser → http://localhost:5173/api/v1/* → Vite proxy → http://127.0.0.1:9000/api/v1/*
Browser → http://localhost:5173/ws/*     → Vite proxy (WebSocket) → http://127.0.0.1:9000/ws/*
Browser → http://localhost:5173/ollama/* → Vite proxy → http://127.0.0.1:9000/ollama/*
Browser → http://localhost:5173/openai/* → Vite proxy → http://127.0.0.1:9000/openai/*
```

In **production**, everything is same-origin via Nginx:

```
Browser → https://app.optamus.cloud/api/v1/* → Nginx → main-backend:9000
Browser → https://app.optamus.cloud/ws/*     → Nginx → main-backend:9000
```

The proxy is configured in `vite.config.ts`:
```typescript
server: {
  proxy: {
    '/api': 'http://127.0.0.1:9000',
    '/ws': { target: 'http://127.0.0.1:9000', ws: true },
    '/ollama': 'http://127.0.0.1:9000',
    '/openai': 'http://127.0.0.1:9000'
  }
}
```

### 2. Authentication (Zitadel OIDC)

OptamusUI authenticates via Zitadel (port 8080):

1. User clicks "Sign in" → redirected to `auth.optamus.cloud`
2. Zitadel authenticates user → redirects back with auth code
3. Main backend exchanges code for JWT → stores session cookie
4. Subsequent requests include session cookie → backend validates

**Auth endpoints used by OptamusUI:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/auths/` | GET | Get current session user |
| `/api/v1/auths/signin` | POST | Email/password sign-in |
| `/api/v1/auths/signup` | POST | Create new account |
| `/api/v1/auths/signout` | POST | Sign out |

### 3. Model Management

Models are **admin-configurable** (like OpenRouter):

1. **Admin configures provider** via `POST /openai/config/update`:
   ```json
   {
     "ENABLE_OPENAI_API": true,
     "OPENAI_API_BASE_URLS": ["https://kilocode-gateway.machinegenerative.workers.dev/v1"],
     "OPENAI_API_KEYS": ["sk_proxy_mykey"],
     "OPENAI_API_CONFIGS": {
       "0": {
         "enable": true,
         "prefix_id": "kilocode",
         "connection_type": "external"
       }
     }
   }
   ```

2. **Backend fetches models** from provider:
   - `GET https://kilocode-gateway.../v1/models` with API key
   - Returns list of available models

3. **Frontend displays models** via `GET /api/models`:
   ```json
   {
     "data": [
       {
         "id": "kilocode.stepfun/step-3.7-flash:free",
         "name": "stepfun/step-3.7-flash:free",
         "owned_by": "kilocode",
         "connection_type": "external"
       }
     ]
   }
   ```

4. **User selects model** in chat → chat request includes model ID → backend routes to correct provider

### 4. Chat Flow (End-to-End)

```
User types message → OptamusUI
  → POST /api/chat/completions (streaming SSE)
  → Main Backend resolves model → provider URL
  → Main Backend forwards to provider (e.g., Kilocode Gateway)
  → Streaming response back through Main Backend → OptamusUI
  → Rendered in chat UI
```

## Running OptamusUI Natively (Development)

### Prerequisites
- Node.js >= 18.13.0 (installed: v22.23.0)
- npm >= 6.0.0 (installed: 10.9.8)

### Steps

```bash
cd /home/devagent/API_PLATFORM/services/optamusUI

# Install dependencies
npm install

# Start dev server (runs on port 5173, proxies API to port 9000)
npm run dev
```

### Environment Variables

Create `.env` from `.env.example`:
```bash
cp .env.example .env
```

Key variables:
| Variable | Default | Purpose |
|----------|---------|---------|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama backend URL |
| `CORS_ALLOW_ORIGIN` | `https://app.optamus.cloud;...` | Allowed CORS origins |
| `FORWARDED_ALLOW_IPS` | `*` | Trusted proxy IPs |

### Dev Mode Behavior

- Frontend runs on `http://localhost:5173`
- API calls are proxied to `http://127.0.0.1:9000` via Vite proxy
- WebSocket connections are proxied via Vite's WS proxy
- Hot Module Replacement (HMR) enabled for live development

## Complete API Endpoint Map

### Core Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/config` | GET | Backend configuration |
| `/api/models` | GET | All available models (merged) |
| `/api/chat/completions` | POST | Chat completion (streaming) |
| `/api/chat/completed` | POST | Mark chat as completed |
| `/ws/socket.io` | WS | Real-time events |

### Auth
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/auths/` | GET | Session user |
| `/api/v1/auths/signin` | POST | Sign in |
| `/api/v1/auths/signup` | POST | Sign up |
| `/api/v1/auths/signout` | POST | Sign out |

### Chats
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/chats/` | GET/DELETE | List/delete all chats |
| `/api/v1/chats/new` | POST | Create new chat |
| `/api/v1/chats/{id}` | GET/POST/DELETE | Get/update/delete chat |
| `/api/v1/chats/{id}/share` | POST | Share chat |
| `/api/v1/chats/{id}/archive` | POST | Archive chat |
| `/api/v1/chats/search` | GET | Search chats |
| `/api/v1/chats/list/user/{userId}` | GET | User's chats |

### Models
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/models/list` | GET | List all models |
| `/api/v1/models/create` | POST | Create workspace model |
| `/api/v1/models/model` | GET | Get model details |
| `/api/v1/models/model/update` | POST | Update model |
| `/api/v1/models/model/delete` | POST | Delete model |
| `/openai/models` | GET | OpenAI-compatible models |

### Files
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/files/` | GET/POST | List/upload files |
| `/api/v1/files/{id}` | GET/DELETE | Get/delete file |
| `/api/v1/files/{id}/content` | GET | File content |

### Knowledge (RAG)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/knowledge/` | GET | List knowledge bases |
| `/api/v1/knowledge/create` | POST | Create knowledge base |
| `/api/v1/knowledge/{id}/file/add` | POST | Add file to KB |
| `/api/v1/retrieval/query/doc` | POST | Query documents |
| `/api/v1/retrieval/query/web` | POST | Query web |

### Admin Config
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/configs/models` | GET/POST | Model config (providers) |
| `/api/v1/configs/connections` | GET/POST | Provider connections |
| `/api/v1/openai/config/update` | POST | Update OpenAI provider config |
| `/api/v1/ollama/config/update` | POST | Update Ollama provider config |

### Users
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/users/` | GET | List users |
| `/api/v1/users/{userId}` | DELETE | Delete user |
| `/api/v1/users/user/settings` | GET | User settings |
| `/api/v1/users/user/settings/update` | POST | Update settings |

### Other
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/prompts/` | GET | List prompts |
| `/api/v1/tools/` | GET | List tools |
| `/api/v1/functions/` | GET | List functions |
| `/api/v1/skills/` | GET | List skills |
| `/api/v1/memories/` | GET | List memories |
| `/api/v1/notes/` | GET | List notes |
| `/api/v1/channels/` | GET | List channels |
| `/api/v1/automations/` | GET | List automations |
| `/api/v1/calendar/` | GET | List calendars |
| `/api/v1/folders/` | GET | List folders |
| `/api/v1/groups/` | GET | List groups |

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/constants.ts` | API base URLs, app config |
| `src/lib/apis/index.ts` | Core API functions (models, config, chat) |
| `src/lib/apis/auths/index.ts` | Auth API functions |
| `src/lib/apis/chats/index.ts` | Chat CRUD API functions |
| `src/lib/apis/models/index.ts` | Model API functions |
| `src/lib/apis/files/index.ts` | File upload/management API |
| `src/lib/apis/knowledge/index.ts` | Knowledge base API |
| `src/routes/+layout.svelte` | Root layout (auth, socket, i18n) |
| `src/routes/(app)/+layout.svelte` | Main app layout (sidebar) |
| `src/routes/(app)/+page.svelte` | Chat page |
| `vite.config.ts` | Vite config with API proxy |
| `nginx.conf` | Production Nginx config |
