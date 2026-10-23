# SmartLight OS — REST API Specification v1.0

Base URL: `/api/v1`  
Authentication: `Authorization: Bearer <jwt-token>`  
Tenant Context: Provided via JWT payload and optional query parameter `?ulbId=<uuid>`

---

## 1. System Health & Diagnostics

### `GET /health` & `GET /api/v1/health`
Checks system availability and critical subsystem dependencies.
- **Access**: Public
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "timestamp": "2026-10-23T12:00:00.000Z",
  "version": "1.0.0",
  "checks": {
    "database": { "status": "up", "latencyMs": 2 },
    "memoryStore": { "status": "up", "devicesCount": 4608 },
    "adapterRegistry": { "status": "up", "adapters": ["SIMULATOR"] }
  }
}
```

---

## 2. Authentication, MFA & Session Management

### `POST /api/v1/auth/login`
Initial username and password authentication.
- **Request Body**:
```json
{
  "email": "admin@smartlight.os",
  "password": "SmartLight@2026!"
}
```
- **Response `200 OK` (MFA Enforced)**:
```json
{
  "mfaRequired": true,
  "mfaChallengeToken": "mfa-challenge-jwt-token...",
  "mfaMethod": "TOTP"
}
```
- **Response `200 OK` (Standard Login / MFA Disabled)**:
```json
{
  "accessToken": "ey...",
  "expiresIn": 86400,
  "user": {
    "id": "40000000-0000-0000-0000-000000000002",
    "email": "operator.ganderbal@smartlight.os",
    "firstName": "Tariq",
    "lastName": "Ahmad",
    "roles": [{ "roleCode": "CONTROL_OPERATOR", "ulbId": "11111111-1111-1111-1111-111111111111" }],
    "allowedUlbIds": ["11111111-1111-1111-1111-111111111111"],
    "isGlobalAdmin": false
  }
}
```

### `POST /api/v1/auth/mfa/verify`
Submits 6-digit TOTP verification code to complete two-factor authentication.
- **Request Body**:
```json
{
  "mfaChallengeToken": "mfa-challenge-jwt-token...",
  "code": "123456"
}
```
- **Response `200 OK`**: `{ "accessToken": "ey...", "user": { ... } }`

### `GET /api/v1/auth/me`
Retrieves authenticated profile, permissions array, and scoped ULB context.

---

## 3. Assets, Hierarchy & GIS Spatial Layer

### `GET /api/v1/assets/hierarchy?ulbId=:ulbId`
Returns complete spatial tree: Zones $\rightarrow$ Wards $\rightarrow$ Streets $\rightarrow$ Poles.

### `GET /api/v1/assets/feeders?ulbId=:ulbId`
Returns all CCMS feeder panels with geospatial coordinates and connected luminaire counts.

### `GET /api/v1/assets/poles?ulbId=:ulbId`
Returns all streetlight poles, electrical phase connection (`R`, `Y`, `B`), and fixture wattage.

### `GET /api/v1/assets/geojson?ulbId=:ulbId&type=:type&bbox=minLng,minLat,maxLng,maxLat`
Streams RFC 7946 GeoJSON FeatureCollection with spatial bounding-box indexing.
- **Query Parameters**:
  - `ulbId`: Municipal ULB UUID.
  - `type`: `poles`, `feeders`, `gateways`, `zones`, `heatmap`, or `all`.
  - `bbox`: `minLng,minLat,maxLng,maxLat` (e.g. `74.70,34.15,74.85,34.30`).
- **Response `200 OK`**:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "pole-gbl-0001",
      "geometry": { "type": "Point", "coordinates": [74.7725, 34.2165] },
      "properties": {
        "id": "pole-gbl-0001",
        "code": "POL-GBL-0001",
        "assetType": "POLE",
        "phase": "R",
        "wattage": 70,
        "isOnline": true,
        "reportedOn": true,
        "hasActiveAlert": false
      }
    }
  ]
}
```

---

## 4. Commands & Bulk CCMS Switching

### `POST /api/v1/commands`
Submits an individual switching or dimming command with idempotency validation.
- **Request Body**:
```json
{
  "deviceId": "dev-gbl-0001",
  "type": "TURN_ON",
  "idempotencyKey": "cmd-manual-001",
  "payload": { "brightness": 100 }
}
```
- **Response `202 Accepted`**:
```json
{
  "commandId": "cmd-179274...",
  "status": "CONFIRMED",
  "deviceId": "dev-gbl-0001",
  "idempotencyKey": "cmd-manual-001"
}
```

### `POST /api/v1/commands/batch`
Executes bulk switching across an entire CCMS feeder panel or municipal zone.
- **Request Body**:
```json
{
  "ulbId": "11111111-1111-1111-1111-111111111111",
  "targetType": "FEEDER",
  "targetId": "fdr-gbl-001",
  "type": "TURN_ON",
  "idempotencyKey": "batch-feeder-001"
}
```
- **Response `200 OK`**:
```json
{
  "batchId": "batch-179274...",
  "targetType": "FEEDER",
  "targetId": "fdr-gbl-001",
  "targetCount": 78,
  "confirmedCount": 78,
  "isIdempotentReplay": false
}
```

---

## 5. Controls & Astronomical Scheduling

### `GET /api/v1/scheduling/schedules?ulbId=:ulbId`
Lists active automated schedules with target counts and dimming curves.

### `GET /api/v1/scheduling/ephemeris?ulbId=:ulbId&date=YYYY-MM-DD`
Calculates exact NOAA astronomical twilight times for target municipal coordinates.
- **Response `200 OK`**:
```json
{
  "date": "2026-10-23",
  "latitude": 34.2165,
  "longitude": 74.7725,
  "sunrise": "06:42",
  "sunset": "17:48",
  "dawnCivil": "06:17",
  "duskCivil": "18:13",
  "solarNoon": "12:15",
  "dayLengthMinutes": 666
}
```

### `POST /api/v1/scheduling/evaluate`
Manually triggers schedule evaluation against current clock.

---

## 6. Telemetry Ingestion & Aggregated Analytics

### `POST /api/v1/telemetry/ingest`
Batch ingestion endpoint for field gateways and IoT simulators.
- **Request Body**:
```json
{
  "readings": [
    {
      "deviceId": "dev-gbl-0001",
      "observedAt": "2026-10-23T12:00:00.000Z",
      "voltage": 230.5,
      "currentAmp": 0.49,
      "powerWatts: 70.2,
      "powerFactor": 0.98,
      "frequency": 50.01,
      "temperature": 32.5,
      "energyKwh": 142.1,
      "burningHours": 1240,
      "online": true,
      "reportedOn": true,
      "faultCodes": [],
      "source": "SIMULATOR"
    }
  ]
}
```

### `GET /api/v1/telemetry/kpis?ulbId=:ulbId`
Returns live operational KPIs (active wattage, online count, energy saved).

### `GET /api/v1/telemetry/timeseries?ulbId=:ulbId&resolution=5m&from=...&to=...`
Streams aggregated electrical time-series points.

---

## 7. Alerts, Maintenance Work Orders & Spare Parts

### `GET /api/v1/alerts?ulbId=:ulbId&status=OPEN`
Returns active system alerts with severity levels.

### `POST /api/v1/alerts/:id/ticket`
Converts an alert into a formal maintenance work order.

### `GET /api/v1/maintenance/tickets?ulbId=:ulbId`
Lists maintenance work orders.

### `PATCH /api/v1/maintenance/tickets/:id`
Updates ticket status, assigns technician, or records spare parts deduction.
- **Request Body**:
```json
{
  "status": "RESOLVED",
  "resolutionNotes": "Replaced burnt MOV surge protector.",
  "sparePartsUsed": [
    { "partId": "part-spd-10kv", "partCode": "PART-SPD-10KV", "partName": "10kV SPD", "quantity": 1 }
  ]
}
```

---

## 8. Simulator Lab Administration

### `GET /api/v1/simulator/status`
Returns fleet generation metrics, active simulated devices, and seed parameter.

### `POST /api/v1/simulator/seed`
Generates or reseeds the deterministic municipal fleet: `{ "seed": 365 }`.

### `POST /api/v1/simulator/tick`
Advances simulation time and triggers batch telemetry emission.

### `POST /api/v1/simulator/fault`
Injects controlled electrical anomaly (`LAMP_FAILURE`, `VOLTAGE_ANOMALY`, `DAY_BURNING`).
