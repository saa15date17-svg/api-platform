# Admin Dashboard — API Integration Contract

> Audience: Backend developers working on `services/main-backend` and related services.
> Purpose: Defines the exact HTTP API surface the Admin Dashboard requires.

---

## Table of Contents

1. [Base URL & Transport](#base-url--transport)
2. [Authentication](#authentication)
3. [Error Format](#error-format)
4. [CORS Requirements](#cors-requirements)
5. [Endpoint Specifications](#endpoint-specifications)
6. [Response Schema Reference](#response-schema-reference)
7. [CI Enforcement](#ci-enforcement)

---

## Base URL & Transport

The Admin Dashboard communicates with the MainBackend at:

```
https://api.optamus.cloud/api/v1/...
```

In development:
```
http://localhost:9000/api/v1/...
```

All endpoints expect:
- `Content-Type: application/json` for request/response bodies
- UTF-8 encoding
- Standard HTTP methods: `GET`, `POST`, `PUT`, `DELETE`

---

## Authentication

All endpoints require **Bearer JWT** authentication except signin:

```
Authorization: Bearer <jwt-token>
```

### Signin Flow

Request:
```json
POST /api/v1/auths/signin
{
  "email": "admin@optamus.cloud",
  "password": "admin123"
}
```

Success Response (200):
```json
{
  "token": "eyJhbGc...",
  "id": "user-001",
  "name": "Admin User",
  "email": "admin@optamus.cloud",
  "role": "admin"
}
```

Failure Response (401):
```json
{
  "detail": "Invalid email or password"
}
```

### Token Validation

The JWT must contain:
- Standard claims: `exp`, `iat`, `sub`
- Custom claims: `email`, `role`, `id`, `name`
- Signed with the shared `JWT_SECRET` (HS256)

---

## Error Format

All errors use this format:

```json
{
  "detail": "Human-readable error message"
}
```

Status codes used by the Admin Dashboard:

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET/POST/PUT/DELETE |
| 201 | Created | Resource created (optional, treat as 200 if not used) |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient role permissions |
| 404 | Not Found | Resource does not exist |
| 500 | Internal Server Error | Unexpected server error |

---

## CORS Requirements

The Admin Dashboard makes cross-origin requests from `https://admin.optamus.cloud` to `https://api.optamus.cloud`.

Backend must allow these origins:

```
https://admin.optamus.cloud
https://app.optamus.cloud
```

Minimum CORS headers:

```
Access-Control-Allow-Origin: https://admin.optamus.cloud
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

Preflight (`OPTIONS`) requests must return `204 No Content` with the above headers.

---

## Endpoint Specifications

### 1. POST `/api/v1/auths/signin`

Authenticate admin user.

**Request:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Success (200):**
```json
{
  "token": "string (JWT)",
  "id": "string",
  "name": "string",
  "email": "string",
  "role": "string"
}
```

**Failure (401):**
```json
{ "detail": "Invalid email or password" }
```

---

### 2. POST `/api/v1/auths/signout`

Invalidate current session. No request body.

**Success (200):**
```json
{ "success": true }
```

---

### 3. GET `/api/v1/auths/admin/details`

Get current admin user details.

**Success (200):**
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "role": "string"
}
```

---

### 4. GET `/api/v1/users/all`

Get all users in the platform.

**Success (200):**
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

**Notes:**
- `created_at` is a Unix timestamp in seconds
- `is_active` indicates whether the user can log in
- `role` is either `"admin"` or `"user"`

---

### 5. POST `/api/v1/users/{userId}/update`

Update user properties.

**Request:**
```json
{
  "role": "string"  // optional: "admin" | "user"
}
```

**Success (200):**
```json
{ "success": true }
```

---

### 6. DELETE `/api/v1/users/{userId}`

Delete a user account.

**Success (200):**
```json
{ "success": true }
```

---

### 7. GET `/api/v1/keys`

List all API keys.

**Success (200):**
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

**Notes:**
- `key` should be masked except at creation time
- `last_used_at` is nullable (null if never used)

---

### 8. POST `/api/v1/keys`

Create a new API key.

**Request:**
```json
{
  "name": "string"  // optional, defaults to "New API Key"
}
```

**Success (200):**
```json
{
  "id": "string",
  "name": "string",
  "key": "sk-new-...",  // full key, shown once
  "created_at": 1720224000,
  "last_used_at": null
}
```

---

### 9. DELETE `/api/v1/keys`

Delete an API key.

**Request:**
```json
{
  "id": "string"  // required
}
```

**Success (200):**
```json
{ "success": true }
```

---

### 10. GET `/api/v1/usage/stats`

Get usage summary statistics.

**Success (200):**
```json
{
  "total_requests": 12847,
  "total_cost": 342.56,
  "period": "today"
}
```

**Notes:**
- `period` can be `"today"`, `"week"`, `"month"`
- `total_cost` is in USD with 2 decimal places

---

### 11. GET `/api/v1/usage`

Get detailed usage history.

**Success (200):**
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

**Notes:**
- `date` is ISO format `YYYY-MM-DD`
- Response is ordered from newest to oldest

---

### 12. GET `/api/v1/billing`

Get billing information.

**Success (200):**
```json
{
  "plan": "enterprise",
  "balance": 1500.00,
  "monthly_spend": 342.56,
  "billing_cycle": "2025-07-01 to 2025-07-31",
  "invoices": [
    {
      "id": "inv-001",
      "date": "2025-07-01",
      "amount": 290.34,
      "status": "paid"
    }
  ]
}
```

**Notes:**
- `plan` values: `"free"`, `"pro"`, `"enterprise"`
- `status` values: `"paid"`, `"pending"`, `"failed"`

---

### 13. GET `/api/v1/config`

Get global platform configuration.

**Success (200):**
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

## Response Schema Reference

### Common Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | UUID or ULID identifier |
| `created_at` | `number` | Unix timestamp (seconds) |
| `name` | `string` | Display name |
| `email` | `string` | Email address |

### User Object

```ts
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: number; // Unix timestamp
}
```

### API Key Object

```ts
interface ApiKey {
  id: string;
  name: string;
  key: string; // Masked: "sk-...XXXX"
  created_at: number;
  last_used_at: number | null;
}
```

### Usage Record

```ts
interface UsageRecord {
  date: string; // ISO date: "2025-07-05"
  requests: number;
  cost: number; // USD
  model: string;
}
```

### Billing Info

```ts
interface BillingInfo {
  plan: 'free' | 'pro' | 'enterprise';
  balance: number;
  monthly_spend: number;
  billing_cycle: string;
  invoices: Invoice[];
}

interface Invoice {
  id: string;
  date: string; // ISO date
  amount: number;
  status: 'paid' | 'pending' | 'failed';
}
```

---

## CI Enforcement

### Validation Strategy

1. **Contract test** the real backend against `api-spec/openapi.json` using [Schemathesis](https://schemathesis.readthedocs.io/):

   ```bash
   schemathesis run http://localhost:9000/openapi.json --checks all
   ```

2. **Diff check**: In CI, compare the `/openapi.json` served by the running backend against the committed `api-spec/openapi.json`. If they diverge, the build fails.

3. **Smoke test**: After deployment, run an authenticated smoke test against all endpoints listed above.

### OpenAPI Spec Location

```
API_PLATFORM/
└── api-spec/
    └── openapi.json    # Canonical contract — DO NOT BREAK
```

Backend service must ensure its generated `/openapi.json` matches or extends this spec without removing or renaming endpoints used by the Admin Dashboard.

---

## Quick Reference for Backend Developers

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/auths/signin` | POST | No | Login |
| `/api/v1/auths/signout` | POST | Yes | Logout |
| `/api/v1/auths/admin/details` | GET | Yes | Admin info |
| `/api/v1/users/all` | GET | Yes | List users |
| `/api/v1/users/{userId}/update` | POST | Yes | Update user |
| `/api/v1/users/{userId}` | DELETE | Yes | Delete user |
| `/api/v1/keys` | GET | Yes | List API keys |
| `/api/v1/keys` | POST | Yes | Create API key |
| `/api/v1/keys` | DELETE | Yes | Delete API key |
| `/api/v1/usage/stats` | GET | Yes | Usage summary |
| `/api/v1/usage` | GET | Yes | Usage history |
| `/api/v1/billing` | GET | Yes | Billing info |
| `/api/v1/config` | GET | Yes | Platform config |

---

## Testing Your Integration

### Manual

```bash
# 1. Get a token
curl -X POST https://api.optamus.cloud/api/v1/auths/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@optamus.cloud","password":"admin123"}'

# 2. Use the token
TOKEN="eyJhbGc..."

curl https://api.optamus.cloud/api/v1/users/all \
  -H "Authorization: Bearer $TOKEN"
```

### Automated

Run the Admin Dashboard dev server against your real backend:

```bash
# Terminal 1: Start MainBackend
cd services/main-backend
uvicorn open_webui.main:app --port 9000

# Terminal 2: Start Admin Dashboard
cd services/admin-dashboard
npm run dev
```

The Vite dev middleware will detect the real backend and proxy requests through, bypassing MSW mocks.

---

## Related Documentation

- [Admin Dashboard Developer Docs](./README.md)
- [Mock Backend Guide](./MOCK_BACKEND.md)
- [API Specification](../../api-spec/openapi.json)
- [Architecture Overview](../../docs/architecture.md)
