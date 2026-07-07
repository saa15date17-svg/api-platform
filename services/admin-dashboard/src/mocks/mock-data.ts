export const MOCK_USERS = [
  { id: 'user-001', name: 'Admin User', email: 'admin@optamus.cloud', role: 'admin', is_active: true, created_at: Math.floor(Date.now() / 1000) - 86400000 },
  { id: 'user-002', name: 'Alice Johnson', email: 'alice@example.com', role: 'user', is_active: true, created_at: Math.floor(Date.now() / 1000) - 172800000 },
  { id: 'user-003', name: 'Bob Smith', email: 'bob@example.com', role: 'user', is_active: true, created_at: Math.floor(Date.now() / 1000) - 259200000 },
  { id: 'user-004', name: 'Carol Lee', email: 'carol@example.com', role: 'user', is_active: false, created_at: Math.floor(Date.now() / 1000) - 345600000 },
  { id: 'user-005', name: 'David Kim', email: 'david@example.com', role: 'user', is_active: true, created_at: Math.floor(Date.now() / 1000) - 432000000 },
];

export const MOCK_KEYS = [
  { id: 'key-001', name: 'Production Key', key: 'sk-prod-...XXXX', created_at: Math.floor(Date.now() / 1000) - 86400000, last_used_at: Math.floor(Date.now() / 1000) - 3600 },
  { id: 'key-002', name: 'Development Key', key: 'sk-dev-...XXXX', created_at: Math.floor(Date.now() / 1000) - 172800000, last_used_at: Math.floor(Date.now() / 1000) - 7200 },
  { id: 'key-003', name: 'Testing Key', key: 'sk-test-...XXXX', created_at: Math.floor(Date.now() / 1000) - 259200000, last_used_at: null },
];

export const MOCK_USAGE_STATS = {
  total_requests: 12847,
  total_cost: 342.56,
  period: 'today',
};

export const MOCK_USAGE_HISTORY = [
  { date: '2025-07-05', requests: 1543, cost: 41.23, model: 'gpt-4o' },
  { date: '2025-07-04', requests: 2103, cost: 56.18, model: 'claude-3.5-sonnet' },
  { date: '2025-07-03', requests: 1876, cost: 49.87, model: 'gemini-2.0-flash' },
  { date: '2025-07-02', requests: 2341, cost: 62.44, model: 'gpt-4o' },
  { date: '2025-07-01', requests: 1987, cost: 52.92, model: 'claude-3.5-sonnet' },
];

export const MOCK_BILLING = {
  plan: 'enterprise',
  balance: 1500.00,
  monthly_spend: 342.56,
  billing_cycle: '2025-07-01 to 2025-07-31',
  invoices: [
    { id: 'inv-001', date: '2025-07-01', amount: 290.34, status: 'paid' },
    { id: 'inv-002', date: '2025-06-01', amount: 425.10, status: 'paid' },
    { id: 'inv-003', date: '2025-05-01', amount: 198.75, status: 'paid' },
  ],
};

export const MOCK_CONFIG = {
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
};
