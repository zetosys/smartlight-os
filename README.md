# SmartLight OS — Hardware-Agnostic Street Light Management and Control System (SLMCS)

[![Codacy Badge](https://app.codacy.com/project/badge/Grade/e5dacba3f08441249352427d899ad24b)](https://app.codacy.com/gh/zetosys/smartlight-os/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2_App_Router-black.svg)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.3-red.svg)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_+_PostGIS_3.4-336791.svg)](https://postgis.net/)
[![Tests](https://img.shields.io/badge/Tests-111_Passed-brightgreen.svg)](docs/testing/01_STRATEGY.md)

**SmartLight OS** is a hardware-agnostic, multi-tenant Street Light Management and Control System (SLMCS) engineered for municipal corporations, Urban Local Bodies (ULBs), and smart city concessionaires. The system provides unified supervisory control, automated astronomical scheduling, continuous telemetry ingestion, fault diagnosis, closed-loop maintenance workflows, and GIS spatial operations across heterogeneous field hardware.

The initial reference municipal deployment manages **4,608 streetlights** distributed across two Urban Local Bodies in Jammu & Kashmir, India:
- **Ganderbal Municipal Council (`ULB-GBL`)**: 2,740 luminaires (859 × 35W, 1,542 × 70W, 339 × 110W), 35 CCMS feeder panels, 12 IoT gateways, 3 zones.
- **Katra Municipal Committee (`ULB-KTR`)**: 1,868 luminaires (1,364 × 35W, 381 × 70W, 123 × 110W), 25 CCMS feeder panels, 8 IoT gateways, 2 zones.
- **Combined Municipal Portfolio**: 4,608 luminaires (2,223 × 35W, 1,923 × 70W, 462 × 110W), 60 CCMS feeder panels, 20 IoT gateways.

> [!WARNING]
> **Engineering Prototype Status & Tender Disclaimer:**  
> This implementation is an enterprise baseline foundation. **No proprietary OEM vendor protocols have been supplied.** All device communications in this phase operate through the strongly-typed `DeviceAdapter` contract and the deterministic `SimulatorAdapter`. Claiming tender compliance or physical hardware interoperability without prior laboratory certification, electromagnetic compatibility (EMC) testing, and contractual validation is strictly prohibited.

---

## 1. Monorepo Architecture

Organized as an enterprise `pnpm` monorepo with strict separation of presentation, domain services, IoT simulation, and hardware abstraction:

```
SmartLight OS/
├── apps/
│   ├── web/                     # Next.js 14 App Router (Tailwind CSS, MapLibre GL, Control Room SCADA UX)
│   ├── api/                     # NestJS modular monolith (RBAC, MFA, Solar Ephemeris, PostGIS, Maintenance)
│   └── simulator/               # Deterministic IoT fleet simulation engine & telemetry runner
├── packages/
│   ├── shared-types/            # Canonical domain models, DTOs, Enums, Command & Telemetry contracts
│   ├── device-contracts/        # Hardware Abstraction Layer (HAL), DeviceAdapter interface, AdapterRegistry
│   ├── ui/                      # Control-room components (StatusBadge, SimulatedBadge, StateComparison)
│   └── config/                  # Shared TypeScript and ESLint configuration presets
├── infra/
│   └── docker/                  # PostgreSQL 16 + PostGIS, Redis 7, Mosquitto MQTT broker
└── docs/
    ├── architecture/            # Detailed system, lifecycle, adapter, ephemeris, and GIS specs
    ├── api/                     # Exhaustive REST API v1 specification
    └── testing/                 # Comprehensive QA testing strategy & 111-test execution matrix
```

---

## 2. Core Architectural Capabilities

### 2.1 Hardware Abstraction Layer (HAL)
All field communication is governed by the `DeviceAdapter` contract (`capabilities`, `sendCommand`, `getStatus`). Neither the web UI nor domain logic contains vendor-specific AT commands, hexadecimal protocols, or proprietary framing. New OEMs (e.g. Havells, Bajaj, Philips) are integrated by implementing the adapter interface without altering application logic.

### 2.2 Asynchronous Command Lifecycle & Idempotency
Commands progress through a formal 6-stage lifecycle:
$$\text{QUEUED} \longrightarrow \text{SENT} \longrightarrow \text{ACKNOWLEDGED} \longrightarrow \text{CONFIRMED} \quad (\text{or } \text{FAILED} / \text{TIMED\_OUT})$$
- Enforces compound uniqueness on `(ulb_id, idempotency_key)`.
- Batch CCMS switching supports bulk relay actuation across entire feeder panels with safe replay idempotency.

### 2.3 Astronomical Ephemeris & Eco-Dimming Schedules
- Built-in **NOAA / Jean Meeus solar algorithm** computes exact civil twilight (sunrise, sunset, civil dawn, civil dusk) for municipal coordinates:
  - Ganderbal: `34.2165° N, 74.7725° E`
  - Katra: `32.9925° N, 74.9318° E`
- Multi-tier automated dimming curves conserve energy throughout the night:
  - Nightfall: 100% Brightness $\rightarrow$ 22:00: 80% $\rightarrow$ 00:00: 60% $\rightarrow$ 04:00: 40% $\rightarrow$ Daybreak: OFF.

### 2.4 Partitioned Telemetry & Rollups
- PostgreSQL declarative **monthly range partitioning** on `telemetry_readings` (`PARTITION BY RANGE (observed_at)`).
- Continuous rollups (5-minute, hourly, daily) support instant dashboard KPI rendering, feeder phase load profiling, and contract SLA availability tracking ($\ge 98.5\%$).

### 2.5 Real-Time Anomaly Detection & Closed-Loop Work Orders
- Evaluates 5 operational fault rules: **Lamp Failure / Burnout**, **Day Burning**, **Grid Voltage Sag/Surge** ($< 185\text{V}$ or $> 260\text{V}$), **Degraded Power Factor** ($< 0.80$), and **Gateway Timeout**.
- Tripped alarms escalate directly into maintenance tickets with priority mapping.
- Ticket resolution automatically deducts spare parts (e.g. 10kV SPDs, LED drivers) from municipal inventory and updates alarm statuses.

### 2.6 PostGIS Vector GIS & 3-Phase Electrical Tracing
- High-performance RFC 7946 GeoJSON streaming with bounding-box spatial indexing (`GIST(geom)`).
- 3-Phase electrical distribution visualization: Streetlights cyclically mapped across Phase R (`#ef4444`), Phase Y (`#eab308`), and Phase B (`#3b82f6`) for load balancing analysis.
- MapLibre GL control room console with wattage-scaled halos, live radar minimap, and direct maintenance dispatch.

---

## 3. Quick Start & Execution Guide

### Prerequisites
- Node.js &ge; 20
- pnpm &ge; 9
- Docker & Docker Compose (optional: API runs in resilient in-memory mode if DB is not active)

### Step 1: Environment Configuration
Copy the environment template files:
```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/simulator/.env.example apps/simulator/.env
```

### Step 2: Start Local Infrastructure (Optional)
Launch PostgreSQL 16 with PostGIS, Redis 7, and Mosquitto MQTT:
```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

### Step 3: Install Dependencies
```bash
pnpm install
```

### Step 4: Run Type Checks & Automated Tests
Validate zero TypeScript compilation errors and run all 111 unit, integration, and E2E tests:
```bash
# Verify TypeScript across all workspaces
pnpm typecheck

# Run full monorepo test suite (111 tests in 14 test suites)
pnpm test
```

### Step 5: Start Development Services
```bash
# Terminal 1: Backend API (port 4000)
pnpm dev:api

# Terminal 2: Web Control Room Interface (port 3000)
pnpm dev:web

# Terminal 3 (Optional): Continuous IoT Simulator Loop
pnpm dev:simulator
```

Visit **http://localhost:3000** to access the control room interface.

---

## 4. Default Seeded Credentials

The database seeds four realistic municipal roles with multi-tenant scoping and optional TOTP MFA:

| Email | Role | ULB Scope | Password | MFA Code |
| :--- | :--- | :--- | :--- | :---: |
| `admin@smartlight.os` | `PLATFORM_ADMIN` | Global (All ULBs) | `SmartLight@2026!` | `123456` |
| `operator.ganderbal@smartlight.os` | `CONTROL_OPERATOR` | Ganderbal Only | `SmartLight@2026!` | *None* |
| `operator.katra@smartlight.os` | `CONTROL_OPERATOR` | Katra Only | `SmartLight@2026!` | *None* |
| `tech.ganderbal@smartlight.os` | `TECHNICIAN` | Ganderbal Only | `SmartLight@2026!` | *None* |
| `auditor@smartlight.os` | `AUDITOR` | Global (Read-Only) | `SmartLight@2026!` | *None* |

---

## 5. Verification & Test Summary

| Scope | Test Suites | Tests | Status |
| :--- | :---: | :---: | :---: |
| **Simulator Fleet & Adapter** | 2 | 17 | **PASSED** |
| **API Domain Services & RBAC** | 11 | 79 | **PASSED** |
| **Master System Lifecycle E2E**| 1 | 15 | **PASSED** |
| **TOTAL MONOREPO** | **14** | **111** | **ALL PASSED (100%)** |

For detailed test coverage and acceptance criteria, see [`docs/testing/01_STRATEGY.md`](docs/testing/01_STRATEGY.md).
