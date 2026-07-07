// @ts-nocheck - MSW types are intentionally loose for browser interop
import { http, HttpResponse, delay } from 'msw';

const MOCK_USERS = [
  { id: 'user-001', name: 'Admin User', email: 'admin@optamus.cloud', role: 'admin', is_active: true, created_at: Math.floor(Date.now() / 1000) - 86400000 },
  { id: 'user-002', name: 'Alice Johnson', email: 'alice@example.com', role: 'user', is_active: true, created_at: Math.floor(Date.now() / 1000) - 172800000 },
  { id: 'user-003', name: 'Bob Smith', email: 'bob@example.com', role: 'user', is_active: true, created_at: Math.floor(Date.now() / 1000) - 259200000 },
  { id: 'user-004', name: 'Carol Lee', email: 'carol@example.com', role: 'user', is_active: false, created_at: Math.floor(Date.now() / 1000) - 345600000 },
  { id: 'user-005', name: 'David Kim', email: 'david@example.com', role: 'user', is_active: true, created_at: Math.floor(Date.now() / 1000) - 432000000 },
];

const MOCK_KEYS = [
  { id: 'key-001', name: 'Production Key', key: 'sk-prod-...XXXX', created_at: Math.floor(Date.now() / 1000) - 86400000, last_used_at: Math.floor(Date.now() / 1000) - 3600, is_active: true, spending_limit: null },
  { id: 'key-002', name: 'Development Key', key: 'sk-dev-...XXXX', created_at: Math.floor(Date.now() / 1000) - 172800000, last_used_at: Math.floor(Date.now() / 1000) - 7200, is_active: true, spending_limit: 50 },
  { id: 'key-003', name: 'Testing Key', key: 'sk-test-...XXXX', created_at: Math.floor(Date.now() / 1000) - 259200000, last_used_at: null, is_active: false, spending_limit: null },
];

export const handlers = [
  http.post('/api/v1/auths/signin', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email === 'admin@optamus.cloud' && body.password === 'admin123') {
      return HttpResponse.json({
        token: 'mock-jwt-token-admin',
        id: 'user-001',
        name: 'Admin User',
        email: 'admin@optamus.cloud',
        role: 'admin',
        profile_image_url: '',
      });
    }
    return HttpResponse.json({ detail: 'Invalid email or password' }, { status: 401 });
  }),

  http.post('/api/v1/auths/signout', async () => {
    return HttpResponse.json({ success: true });
  }),

  http.get('/api/v1/auths/admin/details', async () => {
    return HttpResponse.json({
      name: 'Admin',
      role: 'admin',
      id: 'user-001',
      email: 'admin@optamus.cloud',
      totalUsers: 42,
    });
  }),

  http.get('/api/v1/users/me', async () => {
    return HttpResponse.json({
      user: {
        id: 'user-001',
        name: 'Admin User',
        email: 'admin@optamus.cloud',
        role: 'admin',
        is_active: true,
        created_at: Math.floor(Date.now() / 1000) - 86400000,
      },
    });
  }),

  http.get('/api/v1/users/all', async () => {
    return HttpResponse.json({ users: MOCK_USERS });
  }),

  http.get('/api/v1/users', async () => {
    return HttpResponse.json({ users: MOCK_USERS });
  }),

  http.get('/api/v1/users/:id', async ({ params }) => {
    const user = MOCK_USERS.find(u => u.id === params.id);
    if (user) {
      return HttpResponse.json({ user });
    }
    return HttpResponse.json({ detail: 'User not found' }, { status: 404 });
  }),

  http.post('/api/v1/users/:id/update', async ({ params, request }) => {
    const body = (await request.json()) as { role?: string };
    const index = MOCK_USERS.findIndex(u => u.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ detail: 'User not found' }, { status: 404 });
    }
    if (body.role) {
      MOCK_USERS[index] = { ...MOCK_USERS[index], role: body.role };
    }
    return HttpResponse.json({ success: true });
  }),

  http.delete('/api/v1/users/:id', async ({ params }) => {
    const index = MOCK_USERS.findIndex(u => u.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ detail: 'User not found' }, { status: 404 });
    }
    MOCK_USERS.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),

  http.get('/api/v1/keys', async () => {
    return HttpResponse.json({ keys: MOCK_KEYS });
  }),

  http.post('/api/v1/keys', async ({ request }) => {
    const body = (await request.json()) as { name?: string; user_id?: string; spending_limit?: number };
    const newKey = {
      id: `key-${Date.now()}`,
      name: body?.name || 'New API Key',
      key: `sk-new-${Math.random().toString(36).slice(2, 10)}`,
      key_prefix: `sk-new-${Math.random().toString(36).slice(2, 6)}`,
      created_at: Math.floor(Date.now() / 1000),
      last_used_at: null,
      is_active: true,
      spending_limit: body?.spending_limit || null,
    };
    MOCK_KEYS.push(newKey);
    return HttpResponse.json(newKey, { status: 200 });
  }),

  http.delete('/api/v1/keys/:id', async ({ params }) => {
    const index = MOCK_KEYS.findIndex(k => k.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ detail: 'Key not found' }, { status: 404 });
    }
    MOCK_KEYS.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),

  http.get('/api/v1/usage/stats', async () => {
    return HttpResponse.json({
      total_requests: 12847,
      total_cost: 342.56,
      period: 'today',
    });
  }),

  http.get('/api/v1/usage', async () => {
    return HttpResponse.json({
      usage: [
        { date: '2025-07-05', requests: 1543, cost: 41.23, model: 'gpt-4o' },
        { date: '2025-07-04', requests: 2103, cost: 56.18, model: 'claude-3.5-sonnet' },
        { date: '2025-07-03', requests: 1876, cost: 49.87, model: 'gemini-2.0-flash' },
        { date: '2025-07-02', requests: 2341, cost: 62.44, model: 'gpt-4o' },
        { date: '2025-07-01', requests: 1987, cost: 52.92, model: 'claude-3.5-sonnet' },
      ],
    });
  }),

  http.get('/api/v1/billing', async () => {
    return HttpResponse.json({
      plan: 'enterprise',
      balance: 1500.00,
      monthly_spend: 342.56,
      billing_cycle: '2025-07-01 to 2025-07-31',
      invoices: [
        { id: 'inv-001', date: '2025-07-01', amount: 290.34, status: 'paid' },
        { id: 'inv-002', date: '2025-06-01', amount: 425.10, status: 'paid' },
        { id: 'inv-003', date: '2025-05-01', amount: 198.75, status: 'paid' },
      ],
    });
  }),

  http.get('/api/v1/billing/plans', async () => {
    return HttpResponse.json({
      plans: [
        { key: 'free', name: 'Free', price: '$0', rpm: 10, tpm: '10K', tpd: '100K' },
        { key: 'pro', name: 'Pro', price: '$29', rpm: 60, tpm: '100K', tpd: '1M' },
        { key: 'enterprise', name: 'Enterprise', price: '$199', rpm: 300, tpm: '500K', tpd: '10M' },
      ],
    });
  }),

  http.get('/api/v1/config', async () => {
    return HttpResponse.json({
      status: true,
      version: '1.0.0',
      defaultModel: 'stepfun/step-3.7-flash:free',
      features: {
        auth: true,
        enable_signup: false,
        enable_login_form: false,
        enable_oauth_signup: true,
        enable_web_search: true,
        enable_image_generation: true,
        enable_community_sharing: false,
        enable_message_rating: true,
        enable_admin_export: true,
        enable_admin_chat_access: true,
      },
    });
  }),

  http.get('/api/v1/configs/ui', async () => {
    return HttpResponse.json({
      platform_name: 'API Platform',
      support_email: 'support@optamus.cloud',
    });
  }),

  http.post('/api/v1/configs/ui', async ({ request }) => {
    const body = (await request.json()) as Record<string, any>;
    return HttpResponse.json({ ...body, success: true });
  }),
];
