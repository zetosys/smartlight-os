# SmartLight OS — Quality Assurance & Testing Strategy

## 1. Testing Philosophy & Pyramid

SmartLight OS enforces rigorous automated test coverage across all architectural layers. Given the critical municipal nature of public streetlighting infrastructure, the test strategy emphasizes deterministic repeatability, multi-tenant isolation, idempotent safety, and closed-loop lifecycle verification.

```
                  / \
                 /   \
                / E2E \       Master System Lifecycle Spec (15 tests)
               /-------\
              /  Domain \     Integration Test Suites (96 tests)
             / Integration\   - RBAC, MFA, Assets, PostGIS GIS, Commands, Telemetry, Maintenance
            /---------------\
           /   Unit & Seed   \  Simulator & Contract Verification (17 tests)
          /-------------------\
```

---

## 2. Test Suite Matrix (111 Passing Tests Across Monorepo)

| Test File | Layer / Component | Test Count | Key Invariants Validated |
| :--- | :--- | :---: | :--- |
| **`e2e-system-lifecycle.spec.ts`** | Master E2E System Spec | **15** | 8-stage complete lifecycle: Login $\rightarrow$ MFA $\rightarrow$ RBAC $\rightarrow$ 4,608 Fleet $\rightarrow$ Solar Ephemeris $\rightarrow$ Feeder Batch Switching $\rightarrow$ Telemetry Ingestion $\rightarrow$ Anomaly Tripping $\rightarrow$ Ticket Resolution $\rightarrow$ Spare Parts $\rightarrow$ PostGIS BBox. |
| **`health.spec.ts`** | Infrastructure | **1** | Deep health checks for database, memory store, and adapter registry. |
| **`auth-and-rbac.spec.ts`** | Security & RBAC | **5** | Password hashing, JWT token generation, role guards, tenant isolation. |
| **`mfa-identity.spec.ts`** | Two-Factor Auth | **5** | TOTP generation, challenge tokens, recovery fallback, wrong-code rejection. |
| **`user-admin.spec.ts`** | User Administration | **7** | User CRUD, role matrix, ULB assignment scoping, account deactivation. |
| **`assets-registry.spec.ts`** | Geographic Topology | **12** | Exact Ganderbal (2,740) & Katra (1,868) counts, pole wattage allocations, ward hierarchy. |
| **`commands-lifecycle.spec.ts`** | Command State Machine | **3** | Transition from `QUEUED` $\rightarrow$ `CONFIRMED`, single-device idempotency replay. |
| **`controls-and-scheduling.spec.ts`** | Schedules & Solar | **8** | NOAA ephemeris algorithm, feeder batch fan-out, automated nightfall execution. |
| **`telemetry-ingestion.spec.ts`** | Telemetry Pipeline | **8** | Batch ingestion, reported state updating, live buffer management, basic anomaly tripping. |
| **`telemetry-partitioning-and-rollups.spec.ts`**| Data Rollups & SLA | **10** | Monthly range partition DDL, 5m/1h rollups, SLA availability $\ge 98.5\%$, phase balancing. |
| **`alerts-and-maintenance.spec.ts`** | Anomaly & Work Orders | **7** | Burnout & overvoltage detection, alert-to-ticket escalation, spare parts inventory deduction. |
| **`gis-spatial.spec.ts`** | PostGIS & GIS Vector | **13** | RFC 7946 GeoJSON, Bounding Box filtering (`bbox`), multi-layer filters, 3-phase balancing. |
| **`simulator.spec.ts`** | Hardware Adapter | **7** | `SimulatorAdapter` contract conformance, deterministic wattage, fault injection. |
| **`fleet-generator.spec.ts`** | Fleet Synthesis Engine | **10** | Deterministic seed generation (seed: 365), exact municipal wattage distribution (35W/70W/110W). |
| **TOTAL MONOREPO SUITE** | **14 Test Suites** | **111** | **100% Pass Rate Across All Packages & Services** |

---

## 3. Deterministic Seed Methodology

To prevent flaky tests caused by randomized data, all tests utilize a deterministic PRNG seeded with integer `365`:
```typescript
db.seedFullFleet(365);
```
- **Ganderbal Municipal Council**: Always seeds exactly 2,740 poles (859 × 35W, 1,542 × 70W, 339 × 110W), 35 feeders, 12 gateways.
- **Katra Municipal Committee**: Always seeds exactly 1,868 poles (1,364 × 35W, 381 × 70W, 123 × 110W), 25 feeders, 8 gateways.
- **Phase Balances**: 3-phase electrical distribution is strictly interleaved (Phase R, Y, B) within $\pm 1$ luminaire.

---

## 4. Execution Commands

```bash
# 1. Run all 111 unit, integration, and E2E tests across monorepo
pnpm test

# 2. Run NestJS API backend test suite specifically (94 tests)
pnpm --filter smartlight-api test

# 3. Run Simulator test suite specifically (17 tests)
pnpm --filter smartlight-simulator test

# 4. Run the Master End-to-End System Lifecycle specification
pnpm --filter smartlight-api test test/e2e-system-lifecycle.spec.ts

# 5. Type-check all packages and applications with zero TypeScript errors
pnpm typecheck

# 6. Production build compilation across entire monorepo
pnpm build
```
