# SmartLight OS — Hardware-Agnostic Street Light Management and Control System (SLMCS)

**SmartLight OS** is an enterprise-grade municipal street light management and control platform built with a hardware-agnostic architecture and a simulated IoT communication layer. 
The system targets an initial fleet of **4,608 luminaires** deployed across two Urban Local Bodies (ULBs): **Ganderbal Municipal Council** and **Katra Municipal Committee**, with a luminaire wattage distribution of 2,223 × 35W, 1,923 × 70W, and 462 × 110W.

> [!WARNING]
> **Engineering Prototype Status & Tender Disclaimer:**  
> This implementation is an engineering baseline foundation (Prompt 0). **No OEM vendor protocols have been supplied.** All device communications in this phase operate through the simulated adapter contract. Claiming production tender compliance or physical hardware interoperability without prior laboratory certification and contractual validation is strictly prohibited.

---

## 1. Monorepo Architecture

This repository is organized as a unified `pnpm` monorepo:

```
SmartLight OS/
├── apps/
│   ├── web/                    # Next.js 14 App Router (Tailwind CSS, Control Room SCADA UX)
│   ├── api/                    # NestJS modular monolith (RBAC, ULB scoping, Command Lifecycle)
│   └── simulator/              # Deterministic IoT fleet simulation engine & runner
├── packages/
│   ├── shared-types/           # Domain interfaces, DTOs, Enums, Command types
│   ├── device-contracts/       # Hardware Abstraction Layer, DeviceAdapter, AdapterRegistry
│   ├── ui/                     # Control-room components (StatusBadge, SimulatedBadge, StateComparison)
│   └── config/                 # Base TypeScript and ESLint configurations
├── infra/
│   └── docker/                 # PostgreSQL 16 + PostGIS, Redis 7, Mosquitto MQTT broker
└── docs/
    ├── architecture/           # System overview, command lifecycle, adapter abstraction specs
    ├── api/                    # REST API v1 endpoints specification
    └── testing/                # Verification matrix and acceptance criteria
```

---

## 2. Core Architectural Principles

1. **Hardware Abstraction Layer (HAL)**: All interactions pass through the unified `DeviceAdapter` contract (`capabilities`, `sendCommand`, `getStatus`). Neither the web UI nor domain services contain vendor-specific protocols.
2. **Asynchronous Command State Machine**:
   $$\text{QUEUED} \longrightarrow \text{SENT} \longrightarrow \text{ACKNOWLEDGED} \longrightarrow \text{CONFIRMED}$$
   - `ACKNOWLEDGED`: Received by gateway/adapter; does **not** signify physical switching.
   - `CONFIRMED`: Verified when physical or virtual telemetry confirms reported state matches desired state.
   - `FAILED` / `TIMED_OUT`: Terminal error states with bounded backoff.
3. **Decoupled Desired vs. Reported State**: What the operator requests is tracked separately from what the luminaire reports.
4. **Tenant & ULB Scoping**: Every asset, user, command, and alarm is strictly bounded by `ulb_id`. Cross-ULB actions are blocked with HTTP 403 / 409.
5. **Idempotency & Auditing**: Command submissions enforce uniqueness on `(ulb_id, idempotency_key)` to avoid duplicate physical dispatches. Every action is recorded in immutable audit logs.

---

## 3. Quick Start & Execution Guide

### Prerequisites
- Node.js &ge; 20
- pnpm &ge; 9
- Docker & Docker Compose (for local database, Redis, and MQTT broker)

### Step 1: Environment Configuration
Copy the environment template:
```bash
cp .env.example .env
```

### Step 2: Start Local Infrastructure
Launch PostgreSQL with PostGIS, Redis, and Mosquitto:
```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

### Step 3: Install Dependencies
```bash
pnpm install
```

### Step 4: Run Database Migrations & Seeds
Apply core SQL schema and deterministic seed data (JKHUDD, Ganderbal, Katra, roles, sample lights):
```bash
pnpm --filter smartlight-api migrate
```
*(Note: If PostgreSQL is not active, the API gracefully runs in resilient memory-store mode pre-populated with deterministic seed data for rapid prototyping and unit testing).*

### Step 5: Start Development Servers
Start both backend API (port 4000) and Next.js frontend (port 3000):
```bash
# Terminal 1: Backend API
pnpm dev:api

# Terminal 2: Web Control Room Interface
pnpm dev:web

# Terminal 3 (Optional): Autonomous Simulator Loop
pnpm dev:simulator
```

Visit **http://localhost:3000** to access the control room interface.

---

## 4. Default Seeded Accounts

| Email | Role | ULB Scope | Password |
|---|---|---|---|
| `admin@smartlight.os` | `PLATFORM_ADMIN` | Global (All ULBs) | `SmartLight@2026!` |
| `operator.ganderbal@smartlight.os` | `CONTROL_OPERATOR` | Ganderbal Only | `SmartLight@2026!` |
| `operator.katra@smartlight.os` | `CONTROL_OPERATOR` | Katra Only | `SmartLight@2026!` |
| `tech.ganderbal@smartlight.os` | `TECHNICIAN` | Ganderbal Only | `SmartLight@2026!` |
| `auditor@smartlight.os` | `AUDITOR` | Read-Only | `SmartLight@2026!` |

---

## 5. Automated Verification & Testing

Run unit tests, contract validations, and ULB authorization checks across the monorepo:
```bash
pnpm test
```

Specific test suites:
- **API Tests**: `pnpm --filter smartlight-api test` (Auth & Scoped RBAC, Command State Machine & Idempotency, Health Checks)
- **Simulator Tests**: `pnpm --filter smartlight-simulator test` (Deterministic Telemetry, DeviceAdapter Contract compliance)
