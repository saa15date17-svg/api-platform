# Admin Dashboard — Mock Backend Guide

> How MSW mocking works in the Admin Dashboard, how to add new mocks, and how to transition from mock to real backend.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Adding New Endpoints](#adding-new-endpoints)
3. [Mock Data Patterns](#mock-data-patterns)
4. [Transitioning from Mock to Real](#transitioning-from-mock-to-real)
5. [MSW Setup Reference](#msw-setup-reference)

---

## Architecture

The Admin Dashboard uses a **two-layer mock strategy**:

```
fetch('/api/v1/users')
  → MSW Service Worker intercepts? → Yes → return mock response
                                 → No  → Vite dev middleware proxy
                                           → try real backend (:9000)
                                           → if fails, return empty fallback
```

### Layer 1: MSW Service Worker (Primary)

- Runs as a browser Service Worker registered at `/mockServiceWorker.js`
- Intercepts all `fetch()` calls matching defined handlers
- Returns realistic mock data immediately
- Active ONLY in development (`import.meta.env.DEV`)

### Layer 2: Vite Dev Middleware (Fallback)

- Handles requests that MSW doesn't match
- Proxies to `http://127.0.0.1:9000` (real MainBackend)
- Falls back to empty/mock responses if backend is unavailable
- Provides CORS headers for local development

### Production

- MSW is completely inactive
- All `fetch()` calls go directly to the real backend
- Nginx proxy handles routing and CORS

---

## Adding New Endpoints

### Step 1: Add the Handler

Edit `src/mocks/handlers.ts`:

```ts
import { http, HttpResponse, delay } from 'msw';

export const handlers = [
  // ... existing handlers

  // GET /api/v1/settings
  http.get('/api/v1/settings', async () => {
    return HttpResponse.json({
      platformName: 'Optimus AI',
      enableSignup: false,
      defaultModel: 'stepfun/step-3.7-flash:free',
    });
  }),

  // POST /api/v1/settings
  http.post('/api/v1/settings', async ({ request }) => {
    const body = (await request.json()) as { platformName?: string; enableSignup?: boolean };
    return HttpResponse.json({
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),
];
```

### Step 2: Add Mock Data (Optional)

For complex data, add constants to `src/mocks/mock-data.ts`:

```ts
export const MOCK_SETTINGS = {
  platformName: 'Optimus AI',
  enableSignup: false,
  defaultModel: 'stepfun/step-3.7-flash:free',
};
```

Then import in `handlers.ts`:

```ts
import { MOCK_SETTINGS } from './mock-data';

http.get('/api/v1/settings', async () => {
  return HttpResponse.json(MOCK_SETTINGS);
});
```

### Step 3: Add Vite Middleware Fallback (Optional)

In `vite.config.ts`, add a fallback to the Vite `mock-backend` plugin:

```ts
server.middlewares.use('/api/v1/settings', async (req, res) => {
  try {
    const proxyRes = await fetch('http://127.0.0.1:9000/api/v1/settings', {
      signal: AbortSignal.timeout(2000),
    });
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return;
    }
  } catch {}
  // Fallback
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(MOCK_SETTINGS));
});
```

> **Note:** The Vite middleware fallback is a safety net. Most development should rely on MSW.

---

## Mock Data Patterns

### Static Responses

```ts
http.get('/api/v1/config', async () => {
  return HttpResponse.json({
    status: true,
    version: '1.0.0',
  });
});
```

### Dynamic Responses Based on Request Body

```ts
http.post('/api/v1/auths/signin', async ({ request }) => {
  const body = (await request.json()) as { email: string; password: string };

  if (body.email === 'admin@optamus.cloud' && body.password === 'admin123') {
    return HttpResponse.json({
      token: 'mock-jwt-token-admin',
      id: 'user-001',
      name: 'Admin User',
      email: 'admin@optamus.cloud',
      role: 'admin',
    });
  }

  return HttpResponse.json(
    { detail: 'Invalid email or password' },
    { status: 401 }
  );
});
```

### Streaming Responses (SSE)

```ts
http.post('/api/chat/completions', async ({ request }) => {
  const stream = new ReadableStream({
    start(controller) {
      const chunks = ['Hello', ' world', '!'];
      let i = 0;
      const interval = setInterval(() => {
        if (i < chunks.length) {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunks[i] } }] })}\n\n`));
          i++;
        } else {
          clearInterval(interval);
          controller.close();
        }
      }, 100);
    },
  });

  return new HttpResponse(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
});
```

### Error Simulations

```ts
http.get('/api/v1/users/:id', async ({ params }) => {
  if (params.id === 'not-found') {
    return HttpResponse.json(
      { detail: 'User not found' },
      { status: 404 }
    );
  }
  return HttpResponse.json({ id: params.id, name: 'User' });
});
```

---

## Transitioning from Mock to Real

### The Environment Toggle Pattern

The Admin Dashboard is designed so that **zero code changes** are needed to switch from mocks to the real backend.

#### Development (`npm run dev`)

1. `main.tsx` loads MSW worker:
   ```ts
   if (import.meta.env.DEV) {
     const { worker } = await import('./mocks');
     await worker.start({ onUnhandledRequest: 'bypass' });
   }
   ```
2. MSW intercepts matching requests → returns mocks
3. Non-matching requests → Vite proxy → real backend (if available)

#### Production (`npm run build`)

1. `import.meta.env.DEV` is `false`
2. MSW worker is never loaded
3. All `fetch()` calls go directly to real backend via `API_BASE`

### Per-Endpoint Cutover

To flip a specific endpoint from mock to real during development:

```ts
// In src/mocks/handlers.ts
http.get('/api/v1/users/all', async () => {
  // Comment out the mock, let MSW bypass to the real backend:
  // return HttpResponse.json(MOCK_USERS);

  // Option 1: Remove the handler entirely
  // Option 2: Use MSW's passthrough()
  // (requires import { passthrough } from 'msw')
  return passthrough();
}));
```

Or in `vite.config.ts`, remove the middleware fallback for that endpoint.

### Verifying the Transition

1. **With MSW active (dev):**
   - Open DevTools → Network tab
   - Look for `Service-Worker` header on API requests
   - Status shows `200` with mock data

2. **Without MSW (production build):**
   - Build: `npm run build`
   - Preview: `npm run preview`
   - Check Network tab → requests go directly to backend
   - Status shows actual backend responses

### Contract Testing

When the real backend is ready, verify against the contract documented in [INTEGRATION_CONTRACT.md](./INTEGRATION_CONTRACT.md):

- Response shapes match exactly
- HTTP status codes are correct
- Error response format is `{ "detail": "..." }`
- Auth header requirements are met

---

## MSW Setup Reference

### Files Involved

```
src/
├── main.tsx          # Worker bootstrap (DEV only)
├── mocks/
│   ├── index.ts      # Public re-export
│   ├── browser.ts    # setupWorker(...handlers)
│   ├── handlers.ts   # Route handlers
│   └── mock-data.ts  # Mock data constants
static/
└── mockServiceWorker.js  # Service Worker runtime (committed, not generated)
```

### Worker Registration

```ts
// src/main.tsx
if (import.meta.env.DEV) {
  const { worker } = await import('./mocks');
  await worker.start({
    onUnhandledRequest: 'bypass', // Let non-mocked requests through
  });
}
```

### Handler Definition

```ts
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/endpoint', () => {
    return HttpResponse.json({ data: 'value' });
  }),

  http.post('/api/endpoint', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 'new-id', ...body });
  }),
];
```

### Worker Setup

```ts
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
export const worker = setupWorker(...handlers);
```

### Public Export

```ts
// src/mocks/index.ts
export { worker } from './browser';
```

### Package.json Config

```json
{
  "msw": {
    "workerDirectory": "static"
  }
}
```

This tells MSW where to output/locate the service worker file.

---

## Quick Reference: Common MSW Patterns

| Pattern | Example |
|---------|---------|
| Return JSON | `HttpResponse.json({ id: '1' })` |
| Return status | `HttpResponse.json({}, { status: 404 })` |
| Read request body | `const body = await request.json()` |
| Path params | `http.get('/users/:id', ({ params }) => ...)` |
| Query params | `const url = new URL(request.url); const q = url.searchParams.get('q')` |
| Delay (realistic) | `await delay(300)` |
| Error response | `HttpResponse.json({ detail: 'Error' }, { status: 500 })` |
| Passthrough | `return passthrough()` (requires import) |
