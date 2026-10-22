# SmartLight OS — Development Kit v1.0
Hardware-agnostic SLMCS, initial simulated fleet: 4,608 luminaires (2,223 × 35W; 1,923 × 70W; 462 × 110W). ULBs: Ganderbal and Katra.

## Status
Engineering starter, **not a completed or certified application**. No OEM protocols have been supplied. Tender-specific compliance must be verified against the full procurement document and contractual scope.

## Architecture
Next.js web → NestJS API → PostgreSQL/PostGIS; command queue → DeviceAdapter → simulator or future OEM adapter; MQTT transport optional behind adapter; Redis/BullMQ workers; partitioned telemetry.

## Run order
1. Review docs/01_PRD.md and docs/02_ARCHITECTURE.md.
2. Apply sql/001_core.sql on PostgreSQL with PostGIS available.
3. Implement the adapter contracts in contracts/device.ts.
4. Run simulator/demo.py to inspect deterministic sample telemetry.
5. Paste antigravity/00_foundation.md into Antigravity; continue prompts sequentially after gates pass.
6. Use docs/08_TESTING.md for acceptance and regression testing.

## Important
Never equate a queued or acknowledged command with physical switching. Distinguish desired state from reported state. A simulator cannot establish real hardware interoperability.
