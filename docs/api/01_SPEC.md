# REST API Specification v1

Base URL: `/api/v1`  
Authentication: `Authorization: Bearer <token>`  
Tenancy: Context provided via JWT and optional query parameter `?ulbId=<uuid>`

## Core Endpoints

### 1. Health & Status
- `GET /health`: Basic health check.
- `GET /api/v1/health`: Detailed component health (Database, Redis, MQTT, AdapterRegistry).

### 2. Authentication & Context
- `POST /api/v1/auth/login`: Authenticate operator and retrieve JWT.
- `GET /api/v1/auth/me`: Retrieve current user profile, assigned roles, permissions, and allowed ULBs.
- `GET /api/v1/auth/ulbs`: List ULBs accessible to the authenticated user.

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
