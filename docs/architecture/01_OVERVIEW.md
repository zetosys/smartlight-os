# SmartLight OS — Architecture Overview

## 1. System Mission & Scope
**SmartLight OS** is a hardware-agnostic, multi-tenant Street Light Management and Control System (SLMCS) engineered for municipal corporations, Urban Local Bodies (ULBs), and smart city concessionaires. The platform provides real-time supervisory control, automated astronomical scheduling, continuous electrical telemetry ingestion, fault diagnosis, closed-loop maintenance workflows, and GIS spatial operations.

The baseline municipal deployment targets **4,608 streetlights** distributed across two distinct Urban Local Bodies in Jammu & Kashmir, India:
- **Ganderbal Municipal Council (`ULB-GBL`)**: 2,740 luminaires across 3 zones (North Valley, Central Market, South Suburb), 35 CCMS feeder panels, 12 IoT gateways, and 35 wards/streets.
  - *Wattage Allocation*: 859 × 35W, 1,542 × 70W, 339 × 110W.
- **Katra Municipal Committee (`ULB-KTR`)**: 1,868 luminaires across 2 zones (Shrine Corridor, Transit Hub), 25 CCMS feeder panels, 8 IoT gateways, and 25 wards/streets.
  - *Wattage Allocation*: 1,364 × 35W, 381 × 70W, 123 × 110W.
- **Total Fleet Portfolio**: 4,608 luminaires (2,223 × 35W, 1,923 × 70W, 462 × 110W), 60 CCMS feeder panels, 20 IoT gateways.

---

## 2. High-Level Architecture Diagram

```
+---------------------------------------------------------------------------------------+
|                                  Presentation Layer                                   |
|   Next.js 14 App Router (apps/web) - Control Room UI, PostGIS Vector GIS, Work Orders |
|   - Multi-tenant ULB Context Switcher (Ganderbal / Katra / All)                       |
|   - Dark/Light Theme Control Room Visual Language                                     |
|   - Real-Time Fleet KPIs, Command Console, Fault Heatmaps                             |
+-------------------------------------------+-------------------------------------------+
                                            | HTTP REST /api/v1 (JWT + ULB Scoping)
                                            v
+---------------------------------------------------------------------------------------+
|                                Core Application Layer                                 |
|   NestJS Enterprise Modular Engine (apps/api)                                         |
|   - Identity & RBAC: Multi-Factor Authentication (TOTP), Session Tokens, Role Guards   |
|   - Multi-Tenant Boundary: @UlbScoped decorator, Strict Tenant Separation             |
|   - Command Lifecycle Engine: Idempotent Command Submission, Batch Feeder Dispatch   |
|   - Astronomical Ephemeris: NOAA/Meeus Solar Calculation & Eco-Dimming Schedules      |
|   - Anomaly Engine: Real-time Rule-Based Fault Tripping & Severity Classification      |
|   - Work Orders & Maintenance: Closed-loop ticket resolution & Spare parts deduction  |
|   - GIS Spatial Engine: RFC 7946 GeoJSON endpoints with Bounding Box BBox filtering   |
+---------------------+-------------------------------------+---------------------------+
                      |                                     |
           Adapter Interface Contract              Transactional Store
                      |                                     |
                      v                                     v
+---------------------------------------+   +-------------------------------------------+
|      Hardware Abstraction Layer       |   |          Data Persistence Layer           |
|   (@smartlight/device-contracts)      |   |   - PostgreSQL 16 + PostGIS 3.4           |
|   - AdapterRegistry Pattern           |   |     (Asset Hierarchy, Spatial Indices,    |
|   - SimulatorAdapter (Deterministic)  |   |      Pre-computed GeoJSON Views)          |
|   - [Future OEM Modbus/LoRaWAN/MQTT]  |   |   - Monthly Telemetry Range Partitioning  |
+---------------------+-----------------+   |   - Redis 7 & BullMQ Task Queue           |
                      |                     +-------------------------------------------+
       Simulated Wire / Virtual MQTT
                      v
+---------------------------------------------------------------------------------------+
|                      Simulated IoT Municipal Fleet (apps/simulator)                   |
|   - 4,608 Virtual Streetlight Controllers with 3-Phase CCMS Feeders & LoRaWAN Gateways|
|   - Realistic Electrical Physics: Voltage, Current, Power Factor, Reactive Harmonics  |
|   - Anomaly & Fault Injection: Lamp Burnouts, Day Burning, Overvoltage, Comm Timeouts |
+---------------------------------------------------------------------------------------+
```

---

## 3. Core Architectural Principles

### 3.1 Strict Hardware Agnosticism
Neither the frontend control room nor the core application services contain vendor-specific protocols, proprietary byte encodings, AT commands, or manufacturer payload quirks. All hardware communication is mediated through the strongly typed `DeviceAdapter` contract. When an OEM vendor (e.g. Philips, Bajaj, Havells, Crompton) is onboarded, engineers implement only an adapter module that satisfies `capabilities()`, `sendCommand()`, and `getStatus()`.

### 3.2 Decoupled Desired vs. Reported State
The system explicitly separates an operator or schedule's **Desired State** (`desiredOn`, `desiredBrightness`, `desiredDimmingPercent`) from the physical field controller's **Reported State** (`reportedOn`, `reportedBrightness`, `voltage`, `powerWatts`). The system operates on an asynchronous eventual-consistency model: commands mark the desired state, while incoming telemetry streams validate and transition commands into `CONFIRMED` status.

### 3.3 Multi-Tenant ULB Scoping & Isolation
Municipal boundaries are strictly enforced at every level:
- Global Administrators (`PLATFORM_ADMIN`) possess cross-ULB authority (`allowedUlbIds: ['*']`).
- Municipal Engineers and Control Operators are strictly bound to their assigned ULB (`allowedUlbIds: ['11111111-1111-1111-1111-111111111111']`).
- Any attempt to query, inspect, dispatch commands, or modify assets belonging to another ULB is rejected with `403 Forbidden` at the NestJS guard level.

### 3.4 Idempotency & Immutability
Every switching or dimming operation requires a client-generated `idempotencyKey` that is unique within the ULB context. Replay attempts within the deduplication window return the original command receipt without queuing duplicate physical messages or cycling feeder contactors. All lifecycle transitions and administrative mutations generate immutable records in the `audit_logs` table.

### 3.5 Spatially Indexed Topology & Partitioned Telemetry
Every luminaire pole, CCMS feeder panel, and IoT gateway is geolocated with PostGIS geometries (`SRID 4326`). Spatial bounding box indices (`GIST(geom)`) enable sub-millisecond GeoJSON rendering of thousands of fixtures. Telemetry storage is range-partitioned by month (`telemetry_readings_yYYYYmMM`) to guarantee bounded index sizes and linear query latency regardless of fleet lifetime.
