# Admin Dashboard — Onboarding Guide

> New contributor guide for the Admin Dashboard service. Covers setup, first PR, and common workflows.

---

## 5-Minute Setup

```bash
# 1. Clone and enter the project
cd /home/devagent/API_PLATFORM

# 2. Install dependencies
cd services/admin-dashboard
npm install

# 3. Start dev server
npm run dev
# → Opens http://localhost:3001

# 4. Log in
# Email: admin@optamus.cloud
# Password: admin123
```

That's it. You should see the Dashboard page with stat cards populated from MSW mocks.

---

## What Just Happened?

When you ran `npm run dev`:

1. **Vite** started a dev server on port 3001
2. **MSW** registered a Service Worker that intercepts `fetch()` calls
3. **React** rendered the app, checked for a token in `localStorage`
4. **No token found?** → Redirected to `/login`
5. **You logged in** → Token stored, Dashboard shown
6. **Dashboard fetched data** → MSW returned mock data

No backend, no database, no Docker required. Everything is mocked.

---

## Making Your First Change

### Example: Add a New Page

1. **Create page component:**

   ```bash
   # src/pages/Reports/index.tsx
   import React, { useState, useEffect } from 'react';
   import { Card, Typography, Spin } from 'antd';
   import { api from '../../api/client';

   const Reports: React.FC = () => {
     const [data, setData] = useState(null);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
       api.get('/api/v1/reports').then(setData).finally(() => setLoading(false));
     }, []);

     return (
       <div>
         <Typography.Title level={4}>Reports</Typography.Title>
         <Spin spinning={loading}>
           <Card>{JSON.stringify(data, null, 2)}</Card>
         </Spin>
       </div>
     );
   };

   export default Reports;
   ```

2. **Add route:**

   ```tsx
   // src/App.tsx
   import Reports from './pages/Reports';
   // ...
   <Route path="/reports" element={<Reports />} />
   ```

3. **Add nav item:**

   ```tsx
   // src/components/AppLayout.tsx
   import { FileTextOutlined } from '@ant-design/icons';
   // ...
   { key: '/reports', icon: <FileTextOutlined />, label: 'Reports' },
   ```

4. **Add mock handler:**

   ```ts
   // src/mocks/handlers.ts
   http.get('/api/v1/reports', async () => {
     return HttpResponse.json({ items: [], total: 0 });
   });
   ```

---

## Project Structure Refresher

```
src/
├── main.tsx                  # MSW bootstrap → React render
├── App.tsx                   # Router + auth gate
├── api/
│   └── client.ts             # fetch() wrapper with auth
├── components/
│   └── AppLayout.tsx         # Sidebar + header shell
├── pages/
│   ├── Login/                # Authentication page
│   ├── Dashboard/            # Stats overview
│   ├── Users/                # User management
│   ├── ApiKeys/              # API key management
│   ├── Usage/                # Usage analytics
│   ├── Billing/              # Billing & invoices
│   └── Settings/             # Platform settings
└── mocks/                    # MSW: dev-only mocks
    ├── browser.ts            # Worker setup
    ├── handlers.ts           # Request handlers
    ├── mock-data.ts          # Mock data constants
    └── index.ts              # Public API
```

---

## When to Use MSW vs Vite Middleware

| Situation | Use |
|-----------|-----|
| Developing a new page offline | MSW handler in `handlers.ts` |
| Testing against real backend | Vite proxy (MSW bypass) |
| Production | Neither (real API) |
| Prototyping fast | MSW (no backend needed) |
| Debugging API issues | Vite proxy + real backend |

---

## Common Tasks

### Add a New API Endpoint

1. Add handler to `src/mocks/handlers.ts`
2. Add mock data to `src/mocks/mock-data.ts` (if needed)
3. Call it from your page component via `api.get('/api/v1/new-endpoint')`

### Change Login Credentials (Mock)

In `src/mocks/handlers.ts`:

```ts
http.post('/api/v1/auths/signin', async ({ request }) => {
  const body = (await request.json()) as { email: string; password: string };
  if (body.email === 'new@email.com' && body.password === 'newpass') {
    // ...
  }
});
```

### Test Without MSW (Real Backend)

```bash
# In another terminal, start the real backend
cd services/main-backend
uvicorn open_webui.main:app --port 9000

# The admin-dashboard dev proxy will detect it and pass through
npm run dev
```

Disable MSW entirely by editing `src/main.tsx`:

```ts
// Comment out the MSW block
// if (import.meta.env.DEV) { ... }
```

---

## Key Conventions

### Naming

- **Files:** PascalCase for pages (`Users/index.tsx`), camelCase for utilities (`client.ts`)
- **Components:** PascalCase (`UserTable.tsx`)
- **API endpoints:** kebab-case in URLs (`/api/v1/users/all`)

### Imports

- Components: `import { Card } from 'antd'`
- Icons: `import { UserOutlined } from '@ant-design/icons'`
- API: `import { api } from '../api/client'`

### Error Handling

```ts
try {
  const data = await api.get('/api/v1/endpoint');
  setData(data);
} catch (err) {
  const msg = err instanceof Error ? err.message : 'Failed';
  message.error(msg);
}
```

---

## Prerequisites for Production Testing

To test against the real backend before deploying:

1. **Start MainBackend:**
   ```bash
   cd services/main-backend
   pip install -r requirements.txt
   uvicorn open_webui.main:app --port 9000
   ```

2. **Build the admin dashboard:**
   ```bash
   npm run build
   ```

3. **Serve the `dist/` directory through Nginx** (see `services/admin-dashboard/nginx.conf`)

4. **Verify** at `http://localhost:3001` (dev) or behind Nginx (prod)

---

## Common Issues

| Issue | Fix |
|-------|-----|
| MSW not intercepting | Check `DevTools → Application → Service Workers` |
| CORS error | Ensure Vite proxy is configured in `vite.config.ts` |
| 401 redirect loop | Clear `localStorage`, re-login |
| TypeScript errors | Run `npx tsc --noEmit` |
| Build fails | Run `npm install`, check `npm run build` output |

---

## Getting Help

- [Mock Backend Guide](./MOCK_BACKEND.md)
- [API Integration Contract](./INTEGRATION_CONTRACT.md)
- [Cross-Service Integration](./CROSS_SERVICE_INTEGRATION.md)
- [Architecture Docs](../../docs/architecture.md)
- [API Spec](../../api-spec/openapi.json)

---

## Related Documentation

- [Admin Dashboard Developer Docs](./README.md)
- [Mock Backend Guide](./MOCK_BACKEND.md)
- [API Integration Contract](./INTEGRATION_CONTRACT.md)
- [Cross-Service Integration Guide](./CROSS_SERVICE_INTEGRATION.md)
