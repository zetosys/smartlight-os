# Master PRD
## Goals
Multi-ULB streetlight management with device inventory, GIS, individual/group controls, scheduling, telemetry, alerts, maintenance tickets, energy analytics, reporting, secure administration, and CCCC integration APIs.
## Initial scope
4,608 virtual luminaires across Ganderbal (2,740) and Katra (1,868). Wattage mix: 35W 2,223; 70W 1,923; 110W 462.
## Functional requirements
FR01 identity/RBAC and ULB scoping; FR02 geographic hierarchy; FR03 pole/luminaire/feeder/controller registry; FR04 GIS and import; FR05 normalized telemetry and freshness; FR06 commands with lifecycle and idempotency; FR07 schedules and conflict rules; FR08 alarm rules/deduplication; FR09 maintenance ticket lifecycle; FR10 energy reports; FR11 audit trails; FR12 simulator management; FR13 adapter registration/capabilities; FR14 firmware lifecycle when OEM supports it; FR15 CCCC REST/JSON integration.
## Nonfunctional
Tender excerpt mentions >=99.5% cloud availability, >=98% monthly system uptime, India-resident MeitY-empanelled hosting, configurable polling to 30 minutes, MFA, and security measures. Confirm exact definitions, scope and evidence with bidder. Engineering stretch target 100,000 devices requires load validation.
## Acceptance examples
A scoped operator can control only authorized assets; command state records submitted/sent/acknowledged/confirmed/failed/timed-out; loss of connectivity generates a deduplicated alert; reports respect ULB boundaries; simulator can reproduce deterministic fault scenarios; all changes are auditable.
## Out of scope until confirmed
Physical device protocols, actual dimming support, firmware implementation, commercial SaaS billing, real cloud certification, hardware warranties.
