# Admin Dashboard — Developer Documentation

> Audience: Frontend engineers, QA, and platform developers working on `services/admin-dashboard`.
> Related services: `services/main-backend`, `services/optamusUI`, `services/bifrost`, `services/zitadel`.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Local Development](#local-development)
4. [Project Structure](#project-structure)
5. [Mock Service Worker (MSW)](#mock-service-worker-msw)
6. [API Client](#api-client)
7. [Routing & Auth](#routing--auth)
8. [Pages & Components](#pages--components)
9. [Build & Deploy](#build--deploy)
10. [Integration Contract for Backend Developers](#integration-contract-for-backend-developers)
11. [Integration Contract for Other Frontend Developers](#integration-contract-for-other-frontend-developers)
12. [Testing](#testing)
13. [Troubleshooting](#troubleshooting)

---

## Overview

The Admin Dashboard is a **React Single Page Application (SPA)** served at `https://admin.optamus.cloud`. It provides platform administrators with a control plane to manage users, API keys, usage, billing, and platform settings.

It runs in a dedicated Docker container (port `3001` internal, exposed as port `80` in the container) behind the Nginx reverse proxy.

### Domain

| URL | Purpose |
|-----|---------|
| `https://admin.optamus.cloud` | Admin Dashboard (user-facing) |
| `https://api.optamus.cloud` | MainBackend + Bifrost API |

### Network Path

```
Browser
  → Cloudflare Tunnel (TLS termination)
    → Nginx (127.0.0.1:8081)
      → Admin Dashboard (127.0.0.1:3001)
      → MainBackend (127.0.0.1:9000)
        → Bifrost (127.0.0.1:8082)
        → PostgreSQL (127.0.0.1:5432)
        → Zitadel (127.0.0.1:8080)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Library | React 18 |
| Styling | Ant Design 5 |
| Routing | React Router DOM v6 |
| Bundler | Vite 6 |
| Language | TypeScript |
| HTTP Client | Native `fetch` (no axios) |
| Mocking | MSW (Mock Service Worker) v2 |
| Container | Nginx (Alpine) |
| Package Manager | npm |
| State Management | React Context (Auth) + useState/useReducer |
| Error Handling | React Error Boundaries + Graceful Degradation |
| Performance | React.lazy + Suspense (route splitting), useMemo/useCallback |
| Patterns | Feature-based architecture, Reusable shared components |

---

## Local Development

### Prerequisites

- Node.js `>= 18.13.0 <= 22.x.x`
- npm `>= 6.0.0`

### Install Dependencies

```bash
cd services/admin-dashboard
npm install
```

This installs:
- Runtime deps: `react`, `react-dom`, `react-router-dom`, `antd`, `@ant-design/icons`, `msw`
- Dev deps: `@vitejs/plugin-react`, `typescript`, `vite`

### Start Dev Server

```bash
npm run dev
```

This runs `vite` on **port 3001** with:
- MSW worker activated in development mode
- Vite dev server middleware fallback for `/api/v1/*` endpoints
- Hot Module Replacement (HMR) enabled
- OpenAPI spec proxy to `http://127.0.0.1:9000` when available

> **Note:** The dev server intercepts API calls through two layers:
> 1. MSW browser worker (high-fidelity mocks for offline/replay development)
> 2. Vite dev middleware proxy fallback (proxies to real backend on `:9000` when available)

See [MOCK_BACKEND.md](./MOCK_BACKEND.md) for details on how to extend mocks.

### TypeScript Check

```bash
npx tsc --noEmit
```

### Build Production Bundle

```bash
npm run build
```

Output: `dist/` directory with static assets.

### Preview Production Build

```bash
npm run preview
```

---

## Project Structure

```
services/admin-dashboard/
├── Dockerfile                    # Multi-stage: Node build → Nginx runtime
├── nginx.conf                    # Nginx config: SPA routing + API proxy
├── package.json                  # Scripts + dependencies
├── tsconfig.json                 # TS config: ESNext, bundler resolution
├── vite.config.ts                # Vite config + mock backend plugin
├── index.html                    # SPA entry point
├── static/                       # MSW worker script (runtime)
│   └── mockServiceWorker.js
├── dist/                         # Production build output
├── src/
│   ├── main.tsx                  # Bootstrap: MSW startup → ReactDOM.render
│   ├── App.tsx                   # Root router + AuthProvider + ErrorBoundary + lazy routes
│   ├── vite-env.d.ts             # Vite client types
│   ├── api/
│   │   └── client.ts             # Centralized fetch wrapper with auth + error handling
│   ├── hooks/
│   │   ├── index.ts              # Re-exports
│   │   └── useAuth.tsx           # Auth context hook with user state
│   ├── components/
│   │   ├── index.ts              # Re-exports
│   │   ├── AppLayout.tsx         # Sidebar layout + header (dark theme)
│   │   ├── ErrorBoundary.tsx     # React error boundary with retry
│   │   ├── PageHeader.tsx        # Standardized page header with breadcrumbs
│   │   ├── StatCard.tsx          # Dashboard stat card wrapper
│   │   ├── ConfirmDialog.tsx     # Confirmation modal for destructive actions
│   │   └── DataTable.tsx         # Enterprise data table component
│   ├── pages/
│   │   ├── Login/
│   │   │   └── index.tsx         # Email/password login form
│   │   ├── Dashboard/
│   │   │   └── index.tsx         # Stats cards + StatCard + parallel fetches + ErrorBoundary
│   │   ├── Users/
│   │   │   └── index.tsx         # User management with sorting/filtering + ConfirmDialog
│   │   ├── ApiKeys/
│   │   │   └── index.tsx         # API key CRUD with StatCard overview + ConfirmDialog
│   │   ├── Usage/
│   │   │   └── index.tsx         # Usage analytics with StatCard + ErrorBoundary
│   │   ├── Billing/
│   │   │   └── index.tsx         # Billing plans + StatCard overview
│   │   └── Settings/
│   │       └── index.tsx         # Platform configuration + StatCard status
│   └── mocks/                    # MSW setup (dev-only)
│       ├── browser.ts            # setupWorker(...handlers)
│       ├── handlers.ts           # MSW request handlers
│       ├── index.ts              # Re-export worker
│       └── mock-data.ts          # Mock data constants
```

---

## Mock Service Worker (MSW)

### Why MSW?

MSW intercepts HTTP requests at the **network layer** — the app code calls `fetch('/api/...')` identically in dev and production. No conditional logic in components, no stubbed modules, no dependency injection. This means:

- The same `api` client code runs in dev (mocked) and prod (real).
- Backend can be completely absent during UI development.
- Switching from mock to real is an environment toggle, not a code rewrite.

### How It's Wired

1. **`src/mocks/browser.ts`** creates the worker with `setupWorker(...handlers)`.
2. **`src/main.tsx`** starts the worker on app boot when `import.meta.env.DEV` is true:
   ```ts
   if (import.meta.env.DEV) {
     const { worker } = await import('./mocks');
     await worker.start({ onUnhandledRequest: 'bypass' });
   }
   ```
3. **`vite.config.ts`** serves `mockServiceWorker.js` as a static asset and provides Vite middleware fallbacks for key endpoints.

### Worker Lifecycle

```
Browser loads
  → main.tsx runs
    → DEV mode: import('./mocks') → worker.start()
      → Service Worker registers at /mockServiceWorker.js
      → Intercepts fetch() calls matching handler predicates
      → Routes to MSW handler → returns mock HttpResponse
    → PROD mode: no MSW, all fetch() goes to real backend
```

### Fallback Behavior

If MSW is not running (e.g., production build), all `fetch()` calls go directly to the backend via the `api` client's `API_BASE` URL.

---

## API Client

Located at `src/api/client.ts`.

### Base URL

```ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
```

In production, `VITE_API_BASE_URL` is empty because the Nginx container proxies `/api/` to the backend.

### Authentication

- Token stored in `localStorage` key `token`.
- Every request includes `Authorization: Bearer <token>` header if token exists.
- On `401 Unauthorized`: token is cleared, user is redirected to `/login`.

### Token Expiry Check

Client-side JWT decode is used to proactively redirect expired sessions:

```ts
function isTokenExpired(token: string): boolean {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload.exp * 1000 < Date.now();
}
```

### Available Methods

```ts
api.get<T>(endpoint: string): Promise<T>
api.post<T>(endpoint: string, data?: unknown): Promise<T>
api.put<T>(endpoint: string, data?: unknown): Promise<T>
api.delete<T>(endpoint: string): Promise<T>
api.signout(): Promise<void>
```

---

## Routing & Auth

### Routes

| Path | Component | Auth Required | Description |
|------|-----------|---------------|-------------|
| `/login` | `Login` | No | Email/password authentication |
| `/dashboard` | `Dashboard` | Yes | Platform stats overview |
| `/users` | `Users` | Yes | User management |
| `/api-keys` | `ApiKeys` | Yes | API key CRUD |
| `/usage` | `Usage` | Yes | Usage analytics |
| `/billing` | `Billing` | Yes | Billing + invoices |
| `/settings` | `Settings` | Yes | Platform config |
| `*` | Redirect → `/login` or `/dashboard` | — | Catch-all |

### Auth Architecture

The app uses a **React Context-based auth system** (`src/hooks/useAuth.tsx`):

- **`AuthProvider`** wraps the entire application
- **`useAuth`** hook exposes:
  - `user` — Current logged-in user object
  - `loading` — Auth state loading flag
  - `isAuthenticated` — Boolean auth status
  - `hasRole(role)` — Role checking utility
  - `isAdmin` — Quick admin check
  - `login(token)` / `logout()` — Auth state management

### Auth Gate Logic (`App.tsx`)

```tsx
<AuthProvider>
  <ErrorBoundary>
    <AppRoutes />
  </ErrorBoundary>
</AuthProvider>
```

`AppRoutes` checks `useAuth()` state conditionally:
- Loading → show fallback
- Not authenticated → render `/login` route only
- Authenticated → render `AppLayout` with protected routes

All routes are **lazy loaded** with `React.lazy()` + `Suspense` for optimal code splitting.

### Token Expiry

Client-side JWT decode is used to proactively redirect expired sessions:

```ts
function isTokenExpired(token: string): boolean {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload.exp * 1000 < Date.now();
}
```

### Default Login Credentials (Mock)

| Field | Value |
|-------|-------|
| Email | `admin@optamus.cloud` |
| Password | `admin123` |

> In production, credentials are validated by the MainBackend. See [Integration Contract](#integration-contract-for-backend-developers).

---

## Pages & Components

### Shared Components

The app uses **reusable shared components** for consistency and maintainability:

| Component | Purpose |
|-----------|---------|
| `ErrorBoundary` | Catches render errors with retry UI, prevents white-screens |
| `StatCard` | Dashboard stat cards with value, prefix, suffix, precision, and color styling |
| `ConfirmDialog` | Modal confirmation for destructive actions (delete, revoke) |
| `DataTable` | Enterprise table wrapper with sort, filter, search, row actions |
| `PageHeader` | Standardized page header with breadcrumbs, title, and action buttons |

### Login (`pages/Login/index.tsx`)

- Form fields: `email`, `password`
- Submits `POST /api/v1/auths/signin`
- On success: stores `token` in `localStorage`, redirects to `/dashboard`
- On failure: shows error message

### Dashboard (`pages/Dashboard/index.tsx`)

- Parallel fetches:
  - `GET /api/v1/users` → total users count
  - `GET /api/v1/keys` → active keys count
  - `GET /api/v1/usage/stats` → requests today + revenue
- Displays 4 stat cards using `StatCard` shared component
- Wrapped in `ErrorBoundary` for graceful degradation
- Uses `useCallback` for memoized fetch functions

### Users (`pages/Users/index.tsx`)

- Fetches `GET /api/v1/users/all`
- Features:
  - Search/filter with debounced input
  - Sortable columns (email, name, role, active status, created date)
  - Role filter tags
  - Promote/Demote: `POST /api/v1/users/{userId}/update` `{ role }`
  - Delete: `DELETE /api/v1/users/{userId}` via `ConfirmDialog`
- Wrapped in `ErrorBoundary` for graceful degradation

### ApiKeys (`pages/ApiKeys/index.tsx`)

- List: `GET /api/v1/keys`
- Create: `POST /api/v1/keys` `{ name, user_id, spending_limit }`
- Delete: `DELETE /api/v1/keys/{id}` via `ConfirmDialog`
- StatCard overview: Total Keys, Active Keys, Revoked Keys
- Wrapped in `ErrorBoundary` for graceful degradation

### Usage (`pages/Usage/index.tsx`)

- Stats: `GET /api/v1/usage/stats`
- StatCard cards with icons and color-coded values
- Refresh button for manual data reload
- Wrapped in `ErrorBoundary` for graceful degradation

### Billing (`pages/Billing/index.tsx`)

- Overview: `GET /api/v1/billing/plans`
- StatCard summary: Total Plans, Paid Plans
- Table with plan details

### Settings (`pages/Settings/index.tsx`)

- Platform config: `GET/POST /api/v1/configs/ui`
- Form validation with Ant Design Form
- StatCard showing configuration status
- Last saved timestamp display

---

## Enterprise Architecture Patterns

This section documents the production-grade patterns implemented in the Admin Dashboard for scalability, maintainability, and reliability.

### 1. Code Splitting & Route-Based Lazy Loading

All page routes are lazy-loaded using `React.lazy()` + `Suspense`:

```tsx
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));

<Routes>
  <Route path="/dashboard" element={
    <Suspense fallback={<PageFallback />}>
      <Dashboard />
    </Suspense>
  } />
  {/* ... */}
</Routes>
```

Benefits:
- Reduces initial bundle size
- Only loads code for visited routes
- Shared components are split into their own chunks
- Icons are split into separate chunks

### 2. Error Boundaries

React Error Boundaries are applied at multiple levels:

- **App-level**: Wraps the entire app in `App.tsx`
- **Page-level**: Each page wrapped in its own `ErrorBoundary`
- **Component-level**: Critical components wrapped individually

```tsx
<ErrorBoundary>
  <Dashboard />
</ErrorBoundary>
```

Features:
- Catches JavaScript errors in component tree
- Displays user-friendly error message with retry button
- Prevents white-screen crashes
- Logs errors to console for debugging

### 3. Shared Component Library

Reusable components eliminate duplication and ensure UI consistency:

| Component | Pattern |
|-----------|---------|
| `StatCard` | Consistent dashboard card with prefix/suffix/precision |
| `ConfirmDialog` | Destructive action confirmation with consistent styling |
| `PageHeader` | Standardized page header with breadcrumbs and actions |
| `DataTable` | Enterprise table with built-in sort, filter, search |

### 4. Performance Optimizations

- **useMemo**: Memoizes filtered/sorted data to prevent unnecessary recalculations
- **useCallback**: Stabilizes function references for child components
- **React.lazy**: Route-level code splitting
- **Parallel fetches**: Uses `Promise.all()` for independent API calls
- **Icon splitting**: Ant Design icons are lazy-loaded by Vite

### 5. RBAC & Authorization

Ready for Role-Based Access Control extension:

- **`AuthProvider`**: Centralized auth context
- **`useAuth` hook**: Easy access to auth state throughout the app
- **Role checking**: `hasRole('admin')` utility method
- **Token management**: Centralized login/logout with token lifecycle

Future implementation:
```tsx
import { useAuth } from '@hooks';
const { isAdmin, hasRole } = useAuth();

// Component-level RBAC
{isAdmin && <Button>Delete User</Button>}

// Route-level RBAC
{authRoles.includes('admin') && <Route path="/settings" element={<Settings />} />}
```

### 6. State Management Patterns

- **Client state**: `useState` / `useReducer` for local UI state
- **Server state**: Direct `fetch` with caching via React Query (future enhancement)
- **Auth state**: React Context (`AuthProvider`)
- **URL state**: React Router for navigation state

### 7. Error Handling & Resilience

- **Network errors**: Caught and displayed to user via `message.error()`
- **API errors**: Parsed and shown with `Alert` component
- **Render errors**: Caught by `ErrorBoundary` with retry UI
- **401 Unauthorized**: Token cleared, redirected to login
- **Empty states**: Handled with empty state messages in tables

### 8. Development Workflow

- **MSW**: Network-layer mocking for offline development
- **Vite HMR**: Hot reload for fast iteration
- **TypeScript**: Full type safety with `strict: true`
- **ESLint/Biome**: Code quality enforcement
- **Conventional commits**: Git workflow standardization

---

## Build & Deploy

### Docker Build

```bash
docker build -t admin-dashboard:latest .
```

### Docker Compose

```bash
docker compose -f infrastructure/docker-compose.prod.yml up -d admin-dashboard
```

### Nginx Configuration (`nginx.conf`)

SPA routing: `try_files $uri $uri/ /index.html;`

API proxy: `/api/` → `http://main-backend:9000`

---

## Integration Contract for Backend Developers

This section documents the **exact API endpoints, request/response schemas, and auth requirements** that the Admin Dashboard expects from the MainBackend service.

### Authentication

All endpoints require a **Bearer JWT token** in the `Authorization` header:

```
Authorization: Bearer <jwt-token>
```

Token is obtained via `POST /api/v1/auths/signin` with `{ email, password }`.

Response:
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "id": "user-001",
  "name": "Admin User",
  "email": "admin@optamus.cloud",
  "role": "admin"
}
```

### Endpoint Catalog

#### POST `/api/v1/auths/signin`

Request:
```json
{ "email": "string", "password": "string" }
```

Success (200):
```json
{ "token": "string", "id": "string", "name": "string", "email": "string", "role": "string" }
```

Failure (401):
```json
{ "detail": "Invalid email or password" }
```

---

#### GET `/api/v1/users/all`

Response:
```json
{
  "users": [
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "role": "string",
      "is_active": true,
      "created_at": 1720224000
    }
  ]
}
```

---

#### POST `/api/v1/users/{userId}/update`

Request:
```json
{ "role": "admin" }
```

Success (200): empty or `{ "success": true }`

---

#### DELETE `/api/v1/users/{userId}`

Success (200): empty or `{ "success": true }`

---

#### GET `/api/v1/keys`

Response:
```json
{
  "keys": [
    {
      "id": "string",
      "name": "string",
      "key": "sk-...XXXX",
      "created_at": 1720224000,
      "last_used_at": 1720300000
    }
  ]
}
```

---

#### POST `/api/v1/keys`

Request:
```json
{ "name": "string" }
```

Success (200):
```json
{
  "id": "string",
  "name": "string",
  "key": "sk-new-...",
  "created_at": 1720224000,
  "last_used_at": null
}
```

---

#### DELETE `/api/v1/keys`

Request:
```json
{ "id": "string" }
```

Success (200): empty or `{ "success": true }`

---

#### GET `/api/v1/usage/stats`

Response:
```json
{
  "total_requests": 12847,
  "total_cost": 342.56,
  "period": "today"
}
```

---

#### GET `/api/v1/usage`

Response:
```json
{
  "usage": [
    {
      "date": "2025-07-05",
      "requests": 1543,
      "cost": 41.23,
      "model": "gpt-4o"
    }
  ]
}
```

---

#### GET `/api/v1/billing`

Response:
```json
{
  "plan": "enterprise",
  "balance": 1500.00,
  "monthly_spend": 342.56,
  "billing_cycle": "2025-07-01 to 2025-07-31",
  "invoices": [
    {
      "id": "string",
      "date": "2025-07-01",
      "amount": 290.34,
      "status": "paid"
    }
  ]
}
```

---

#### GET `/api/v1/config`

Response:
```json
{
  "status": true,
  "version": "1.0.0",
  "defaultModel": "stepfun/step-3.7-flash:free",
  "features": {
    "auth": true,
    "enable_signup": false,
    "enable_login_form": false,
    "enable_oauth_signup": true,
    "enable_web_search": true,
    "enable_image_generation": true,
    "enable_community_sharing": true,
    "enable_message_rating": true,
    "enable_admin_export": true,
    "enable_admin_chat_access": true
  }
}
```

---

### Error Response Format

Standardized across all endpoints:

```json
{ "detail": "Error message string" }
```

HTTP status codes used:
- `200` — Success
- `401` — Unauthorized (missing/invalid token)
- `403` — Forbidden (insufficient permissions)
- `404` — Not found
- `500` — Internal server error

---

## Integration Contract for Other Frontend Developers

If you are working on `optamusUI` or other frontend services that need to integrate with the Admin Dashboard or share the same API layer:

### 1. Use the Shared API Client Pattern

The Admin Dashboard's `src/api/client.ts` is self-contained. Other services should implement an equivalent wrapper.

```ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}
```

### 2. Auth Contract

- **Token Storage:** `localStorage` key `token`
- **Token Format:** JWT with standard claims (`exp`, `sub`, `email`, `role`)
- **401 Handling:** Clear token, redirect to `/login`
- **Expiry Check:** Decode `payload.exp * 1000 < Date.now()`

### 3. Endpoint Naming Convention

All Admin Dashboard endpoints use the `/api/v1/` prefix:

```
/api/v1/auths/...
/api/v1/users/...
/api/v1/keys
/api/v1/usage/...
/api/v1/billing
/api/v1/config
```

### 4. CORS

The production `CORS_ALLOW_ORIGIN` in `.env.example` is:

```
https://app.optamus.cloud;https://admin.optamus.cloud;https://optamus.cloud;https://www.optamus.cloud
```

In development, Vite's dev server proxy handles CORS by proxying `/api` to `localhost:9000`.

### 5. MSW Mock Portability

If another frontend service wants to use MSW with the same patterns:

1. Install `msw`: `npm install msw`
2. Copy `static/mockServiceWorker.js` from this service
3. Create `src/mocks/browser.ts`:

   ```ts
   import { setupWorker } from 'msw/browser';
   import { handlers } from './handlers';
   export const worker = setupWorker(...handlers);
   ```

4. Start worker in `main.tsx`:

   ```ts
   if (import.meta.env.DEV) {
     const { worker } = await import('./mocks');
     await worker.start({ onUnhandledRequest: 'bypass' });
   }
   ```

5. Serve worker in `vite.config.ts`:

   ```ts
   server.middlewares.use('/mockServiceWorker.js', (req, res) => {
     const content = readFileSync('./static/mockServiceWorker.js');
     res.setHeader('Content-Type', 'application/javascript');
     res.end(content);
   });
   ```

6. Add `"msw": { "workerDirectory": "static" }` to `package.json`

### 6. Shared OpenAPI Spec

The canonical API contract is at `api-spec/openapi.json`. All frontend services should reference this spec for:
- Endpoint paths and methods
- Request/response schemas
- Auth requirements (`BearerAuth`, `ApiKeyAuth`)

Backend developers should ensure the real implementation matches this spec. Frontend developers can use this spec to generate typed clients with tools like `orval` or `openapi-typescript`.

---

## Testing

### Manual Testing

1. Start the dev server: `npm run dev`
2. Open `http://localhost:3001`
3. Log in with `admin@optamus.cloud` / `admin123`
4. Navigate through all pages; verify data loads from MSW mocks

### MSW Inspector

Use the MSW browser extension or check the Network tab to verify intercepted requests.

### Type Checking

```bash
npx tsc --noEmit
```

### Production Smoke Test

```bash
npm run build
npm run preview
# Open http://localhost:4173
# Verify all pages load without MSW (real backend required)
```

---

## Troubleshooting

### MSW Not Intercepting Requests

Ensure:
1. `npm run dev` is running (not just `npm run build`)
2. Service Worker is registered: check `DevTools → Application → Service Workers`
3. The Vite middleware is serving `/mockServiceWorker.js` (check Network tab)

### CORS Errors in Dev

The Vite proxy should handle this. If you see CORS errors:
- Ensure `vite.config.ts` has the `/api` proxy configured
- Check that the target backend is running on `:9000`

### 401 Redirect Loop

- Token may be malformed or expired. Clear `localStorage` and re-login.
- Verify the JWT secret matches between MainBackend and Zitadel.

### Build Fails with "Missing script: build"

Run `npm install` to ensure all dependencies are installed.

### MSW Types Error (TS2305)

The project uses MSW v2. The correct import is `from 'msw'`. If TypeScript complains:
- Ensure `skipLibCheck: true` is set in `tsconfig.json`
- The handlers file uses `// @ts-nocheck` to suppress known MSW type issues

---

## Related Documentation

- [MainBackend Developer Docs](../../main-backend/open_webui/README.md)
- [OptimusUI Developer Docs](../../optamusUI/README.md)
- [API Specification](../../api-spec/openapi.json)
- [Deployment Guide](../deployment.md)
- [Architecture Overview](../architecture.md)
