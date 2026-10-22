# SmartLight OS — Architecture Overview

## 1. System Mission & Scope
SmartLight OS is a hardware-agnostic, multi-tenant Street Light Management and Control System (SLMCS) designed for municipal corporations and Urban Local Bodies (ULBs). 
The initial deployment target oversees **4,608 streetlights** distributed across two ULBs:
- **Ganderbal Municipal Council** (2,740 luminaires: 859 × 35W, 1,542 × 70W, 339 × 110W)
- **Katra Municipal Committee** (1,868 luminaires: 1,364 × 35W, 381 × 70W, 123 × 110W)

## 2. High-Level Architecture Diagram

```
+---------------------------------------------------------------------------------+
|                               Presentation Layer                                |
|    Next.js 14 App Router (apps/web) - Control Room Interface, GIS, Alarms       |
+---------------------------------------+-----------------------------------------+
                                        | HTTP REST /api/v1 (JWT + ULB Context)
                                        v
+---------------------------------------------------------------------------------+
|                           Core Application Layer                                |
|    NestJS Modular Monolith (apps/api)                                           |
|    - ULB Scoping & RBAC Guards (@UlbScoped, @RequirePermissions)                |
|    - Command Lifecycle Orchestration & Idempotency Validator                    |
|    - Assets, Hierarchy, Telemetry & Audit Service                               |
+-------------------+-----------------------------------+-------------------------+
                    |                                   |
         Adapter Interface Contract            Transactional Store
                    |                                   |
                    v                                   v
+-------------------------------------+   +---------------------------------------+
|     Hardware Abstraction Layer      |   |        Data Persistence Layer         |
|  (@smartlight/device-contracts)     |   |  - PostgreSQL 16 + PostGIS            |
|  - AdapterRegistry                  |   |    (Asset Hierarchy, Spatial Queries) |
|  - SimulatorAdapter                 |   |  - Partitioned Telemetry Readings     |
|  - [Future Vendor OEM Adapters]     |   |  - Redis 7 (Queues & BullMQ)          |
+-------------------+-----------------+   +---------------------------------------+
                    |
     In-Memory / Simulated MQTT Wire
                    v
+---------------------------------------------------------------------------------+
|                     Simulated IoT Field Fleet (apps/simulator)                  |
|    Virtual CCMS & Luminaires (35W, 70W, 110W) with realistic telemetry         |
+---------------------------------------------------------------------------------+
```

## 3. Core Architectural Principles

1. **Strict Hardware Agnosticism**: Neither the frontend UI nor the core domain models contain vendor-specific protocols, byte encodings, or AT commands. All hardware communication passes through the unified `DeviceAdapter` contract.
2. **Desired State vs. Reported State**: What the operator requests (`desiredOn`, `desiredBrightness`) is explicitly decoupled from what the physical or virtual controller reports (`reportedOn`, `reportedBrightness`, `powerWatts`).
3. **Multi-ULB Scoping**: All queries, mutations, commands, alarms, and tickets are strictly bounded by `ulb_id`. Operators in ULB A can never inspect or command assets belonging to ULB B.
4. **Idempotency & Audit Trail**: Every command requires a client-generated `idempotencyKey` unique within the ULB. Replay attempts return the existing command record without duplicating physical actions. Every transition is captured in immutable audit logs.
5. **Partitioned Telemetry**: High-frequency telemetry is partitioned by event observation timestamp to support scale.
