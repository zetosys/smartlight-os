# Architecture and integration boundaries
- Web: Next.js App Router, TypeScript, accessible responsive operations UI.
- API: NestJS modular monolith initially; separate command/telemetry workers.
- Persistence: PostgreSQL/PostGIS; telemetry partitioned by event timestamp; Redis queue for asynchronous work.
- Adapter boundary: capability discovery, send command, poll state, ingest telemetry; OEM-specific transport stays in adapter.
- Simulator: deterministic seeded virtual devices, fault injection, command latency, network partitions, feeder cascades.
- Security: OIDC/MFA-capable authentication, server-side authorization, scoped queries, secrets manager, TLS, immutable-style audit events.
- Observability: metrics, structured logs, tracing, command latency/error dashboards.
- Deploy: Docker images on eligible India-region infrastructure after compliance verification.

## Command state machine
QUEUED -> SENT -> ACKNOWLEDGED -> CONFIRMED; QUEUED/SENT/ACKNOWLEDGED -> FAILED or TIMED_OUT. ACKNOWLEDGED means accepted by device/gateway, not necessarily physical confirmation. CONFIRMED only on trustworthy reported state matching desired state.
## Failure policy
Retry only idempotent commands with bounded backoff; prevent stale schedule overrides; alert on repeated timeout; record actor, correlation ID, adapter and attempt history.
