# OptamusUI Backend Integration & API Specification Guide

This guide is designed for backend developers to implement the API services expected by the `optamusUI` frontend. It defines the endpoint paths, expected headers, request/response payloads, and WebSocket protocols based on the frontend specification.

---

## 🔒 Authentication & Headers

All authenticated API endpoints expect the following header layout:

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
```

---

## 🛜 Core API Endpoints

### 1. Application Configuration
Used during initial page boot to load feature flags and metadata.

* **URL**: `/api/config`
* **Method**: `GET`
* **Response Status**: `200 OK`
* **Response Payload (`application/json`)**:
  ```json
  {
    "status": true,
    "version": "0.10.2",
    "default_locale": "en-US",
    "features": {
      "auth": true,
      "enable_signup": true,
      "enable_login_form": true,
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

### 2. User Authentication

#### A. User Sign-in
Authenticates the user and returns the access token.

* **URL**: `/api/v1/auths/signin`
* **Method**: `POST`
* **Request Payload**:
  ```json
  {
    "email": "admin@optamus.cloud",
    "password": "admin123"
  }
  ```
* **Response Status**: `200 OK`
* **Response Payload**:
  ```json
  {
    "token": "mock-jwt-token-admin",
    "id": "admin-001",
    "name": "Admin",
    "email": "admin@optamus.cloud",
    "role": "admin",
    "profile_image_url": ""
  }
  ```

#### B. Get Current Session User
Verifies the JWT token and returns active session information.

* **URL**: `/api/v1/auths/`
* **Method**: `GET`
* **Response Status**: `200 OK`
* **Response Payload**:
  ```json
  {
    "id": "admin-001",
    "name": "Admin",
    "email": "admin@optamus.cloud",
    "role": "admin",
    "profile_image_url": "",
    "settings": {
      "ui": {
        "theme": "dark",
        "language": "en"
      }
    }
  }
  ```

#### C. Update User Timezone
* **URL**: `/api/v1/auths/update/timezone`
* **Method**: `POST`
* **Request Payload**:
  ```json
  {
    "timezone": "UTC"
  }
  ```
* **Response Status**: `200 OK`

---

### 3. Models
Retrieves the list of available LLM and generation models.

* **URL**: `/api/models`
* **Method**: `GET`
* **Response Status**: `200 OK`
* **Response Payload**:
  ```json
  [
    {
      "id": "stepfun/step-3.7-flash:free",
      "name": "Step 3.7 Flash",
      "owned_by": "stepfun"
    }
  ]
  ```

---

### 4. Changelog & Release Notes
* **URL**: `/api/changelog`
* **Method**: `GET`
* **Response Status**: `200 OK`
* **Response Payload**:
  ```json
  {
    "0.10.2": {
      "date": "2026-07-05",
      "added": ["Mock mode enabled", "Enterprise mocking approach"],
      "fixed": ["Splash screen rendering issue"]
    }
  }
  ```

---

### 5. Notes

#### A. Search & List Notes
* **URL**: `/api/v1/notes/search`
* **Method**: `GET`
* **Query Parameters**:
  - `query` (optional string): Search filter
  - `view_option` (optional string): e.g. `created`
  - `permission` (optional string)
  - `order_by` (optional string)
  - `page` (optional integer)
* **Response Status**: `200 OK`
* **Response Payload**:
  ```json
  {
    "items": [
      {
        "id": "note-001",
        "title": "My First Note",
        "data": { "content": [{ "type": "paragraph", "children": [{ "text": "Welcome to notes!" }] }] },
        "user_id": "admin-001",
        "meta": {},
        "access_grants": [],
        "pinned": false,
        "created_at": 1783242919379,
        "updated_at": 1783242919379
      }
    ],
    "total": 1
  }
  ```

---

### 6. Banners
Retrieves global system notification banners.

* **URL**: `/api/v1/configs/banners`
* **Method**: `GET`
* **Response Status**: `200 OK`
* **Response Payload**:
  ```json
  []
  ```

---

## 🔌 WebSockets (Socket.io)

The frontend initializes a Socket.io WebSocket connection to real-time events.

* **Path**: `/ws/socket.io/`
* **Query Params**: `EIO=4&transport=websocket`

### Connection Event Lifecycle
Upon client connection, the frontend sends a `user-join` payload:

* **Event**: `user-join`
* **Payload**:
  ```json
  {
    "auth": {
      "token": "<jwt_token>"
    }
  }
  ```
