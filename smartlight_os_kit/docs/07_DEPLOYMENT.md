# Deployment and operational readiness
Local: PostgreSQL/PostGIS, Redis, MQTT broker, API, web, simulator, workers via Docker Compose.
Production: confirm bidder-approved MeitY-empanelled CSP, India data residency, IAM, MFA, network segmentation, encrypted backups, restoration testing, monitoring, alerts, DR targets, and audit retention.
Environment keys (placeholders only): DATABASE_URL, REDIS_URL, MQTT_URL, AUTH_ISSUER, AUTH_AUDIENCE, ENCRYPTION_KEY_REF, SIMULATOR_ENABLED, MAP_STYLE_URL, LOG_LEVEL.
CI: lint, typecheck, tests, migrations in ephemeral DB, container scans, build, staging deployment, smoke test. No production credentials in repository.
