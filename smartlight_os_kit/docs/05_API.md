# REST API contract v1
All routes /api/v1; bearer session; request validation; 403 for scope violations; 409 for conflicting commands; 429 for rate limits.
GET /dashboard/overview?ulbId=; GET /assets?ulbId=&type=&page=; GET /assets/:id; GET /devices?ulbId=; GET /devices/:id/telemetry?from=&to=; POST /commands {deviceId,type,payload,idempotencyKey}; GET /commands/:id; POST /schedules; GET /alerts; POST /alerts/:id/acknowledge; POST /tickets; PATCH /tickets/:id; GET /reports; POST /reports/jobs; POST /simulator/runs; POST /simulator/runs/:id/faults.

Example POST /commands response (202): {"commandId":"uuid","status":"QUEUED","createdAt":"ISO-8601"}. The backend must check device capabilities, scope and current state before queueing. Report jobs and bulk commands must be asynchronous.
