# REST API Specification v1

Base URL: `/api/v1`  
Authentication: `Authorization: Bearer <token>`  
Tenancy: Context provided via JWT and optional query parameter `?ulbId=<uuid>`

## Core Endpoints

### 1. Health & Status
- `GET /health`: Basic health check.
- `GET /api/v1/health`: Detailed component health (Database, Redis, MQTT, AdapterRegistry).

### 2. Authentication & MFA
- `POST /api/v1/auth/login`: Authenticate credentials. If user has MFA enabled, returns `{ mfaRequired: true, mfaChallengeToken, mfaMethod }`. If MFA is disabled, returns `{ accessToken, user }`.
- `POST /api/v1/auth/mfa/verify`: Submit 6-digit TOTP verification code with `mfaChallengeToken`. Returns `{ accessToken, user }`.
- `GET /api/v1/auth/me`: Retrieve current user profile, assigned roles, permissions, and allowed ULBs.
- `GET /api/v1/auth/ulbs`: List ULBs accessible to the authenticated user.
- `GET /api/v1/auth/accounts`: List seeded accounts for development/testing preview.

### 2.1 User & RBAC Administration
- `GET /api/v1/users`: List users (scoped to operator's ULB or all for platform admin). Requires `users.manage`.
- `GET /api/v1/users/roles/matrix`: Retrieve complete role-permission matrix across all 7 system roles.
- `GET /api/v1/users/:id`: Get detailed user record. Requires `users.manage`.
- `POST /api/v1/users`: Create a new user account with role and ULB assignment. Enforces server-side scoping (ULB admin cannot create platform admins or users for other ULBs). Requires `users.manage`.
- `PATCH /api/v1/users/:id`: Update user profile, role, or ULB assignment. Requires `users.manage`.
- `POST /api/v1/users/:id/toggle-active`: Activate or suspend user account. Requires `users.manage`.
- `POST /api/v1/users/:id/toggle-mfa`: Enforce or relax MFA policy on target user. Requires `users.manage`.

### 2.2 ULB Administration
- `GET /api/v1/ulbs`: List registered municipal corporations.
- `POST /api/v1/ulbs`: Register a new ULB. Requires `org.manage`.
- `PATCH /api/v1/ulbs/:id`: Update ULB details. Requires `org.manage`.

### 3. Dashboard
- `GET /api/v1/dashboard/overview?ulbId=<uuid>`: High-level KPIs (total luminaires, online/offline, active watts, open alerts).

### 4. Assets & Hierarchy
- `GET /api/v1/assets/hierarchy?ulbId=<uuid>`: Hierarchical tree of Zones -> Wards -> Streets.
- `GET /api/v1/assets/feeders?ulbId=<uuid>`: List of CCMS feeder panels with geospatial coordinates.
- `GET /api/v1/assets/poles?ulbId=<uuid>`: List of physical streetlight poles with coordinates and luminaire details.

### 5. Devices
- `GET /api/v1/devices?ulbId=<uuid>&page=1&limit=50`: Paginated device registry with desired vs reported state.
- `GET /api/v1/devices/:id`: Detailed device view with attached luminaire, feeder, and model specs.
- `GET /api/v1/devices/:id/telemetry?from=<iso>&to=<iso>`: Historical telemetry time series.

### 6. Commands
- `POST /api/v1/commands`: Submit a switching or configuration command.
  - Body: `{ deviceId: string, type: 'TURN_ON' | 'TURN_OFF' | 'GET_STATUS', idempotencyKey: string, payload?: object }`
  - Response (202 Accepted): `{ commandId: string, status: 'QUEUED' | 'SENT' | 'ACKNOWLEDGED', idempotencyKey: string }`
- `GET /api/v1/commands/:id`: Check command lifecycle state and execution attempt history.

### 7. Alerts & Maintenance
- `GET /api/v1/alerts?ulbId=<uuid>&status=OPEN`: List active system alerts.
- `POST /api/v1/alerts/:id/acknowledge`: Acknowledge an open alert.
- `GET /api/v1/tickets?ulbId=<uuid>`: List maintenance tickets.
- `POST /api/v1/tickets`: Create a new field maintenance ticket.

### 8. Simulator Lab
- `GET /api/v1/simulator/status`: Current simulation run parameters and seed status.
- `POST /api/v1/simulator/tick`: Manually advance simulation clock or trigger telemetry generation.
- `POST /api/v1/simulator/fault`: Inject virtual fault (e.g. `HIGH_VOLTAGE`, `LAMP_FAILURE`).
