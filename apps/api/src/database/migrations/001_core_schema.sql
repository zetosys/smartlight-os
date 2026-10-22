-- Migration: 001_core_schema.sql
-- Description: Core database schema for SmartLight OS (Prompt 0)
-- Based on sql/001_core.sql with production hardening: foreign key indexes, constraints, gateways, adapter registry, and auditability.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

-- Migration tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    checksum VARCHAR(64)
);

-- Organizations & Multi-tenancy
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ulbs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'Jammu and Kashmir',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, name)
);

-- Geographic Hierarchy
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ulb_id UUID NOT NULL REFERENCES ulbs(id) ON DELETE CASCADE,
    code TEXT,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(ulb_id, name)
);

CREATE TABLE IF NOT EXISTS wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    ward_number INTEGER,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(zone_id, name)
);

CREATE TABLE IF NOT EXISTS streets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    street_type TEXT DEFAULT 'LOCAL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asset Network: Feeders, Gateways, Poles, Luminaires
CREATE TABLE IF NOT EXISTS feeders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ulb_id UUID NOT NULL REFERENCES ulbs(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    panel_code TEXT,
    capacity_kw NUMERIC(8, 2),
    meter_number TEXT,
    location geography(Point, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(ulb_id, panel_code)
);

CREATE TABLE IF NOT EXISTS gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ulb_id UUID NOT NULL REFERENCES ulbs(id) ON DELETE RESTRICT,
    feeder_id UUID REFERENCES feeders(id) ON DELETE SET NULL,
    external_code TEXT NOT NULL,
    name TEXT NOT NULL,
    ip_address TEXT,
    protocol TEXT DEFAULT 'MQTT',
    is_online BOOLEAN NOT NULL DEFAULT true,
    location geography(Point, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(ulb_id, external_code)
);

CREATE TABLE IF NOT EXISTS poles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ulb_id UUID NOT NULL REFERENCES ulbs(id) ON DELETE RESTRICT,
    street_id UUID REFERENCES streets(id) ON DELETE SET NULL,
    external_code TEXT NOT NULL,
    height_meters NUMERIC(4, 2) DEFAULT 8.0,
    pole_type TEXT DEFAULT 'OCTAGONAL_STEEL',
    location geography(Point, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(ulb_id, external_code)
);

CREATE TABLE IF NOT EXISTS luminaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ulb_id UUID NOT NULL REFERENCES ulbs(id) ON DELETE RESTRICT,
    pole_id UUID REFERENCES poles(id) ON DELETE CASCADE,
    feeder_id UUID REFERENCES feeders(id) ON DELETE SET NULL,
    wattage INTEGER NOT NULL CHECK (wattage > 0),
    lamp_type TEXT NOT NULL DEFAULT 'LED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Device Models & Adapter Catalog
CREATE TABLE IF NOT EXISTS device_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer TEXT NOT NULL,
    model TEXT NOT NULL,
    capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(manufacturer, model)
);

CREATE TABLE IF NOT EXISTS adapters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    version TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Devices (Physical or Virtual Controllers attached to Luminaires/Feeders)
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ulb_id UUID NOT NULL REFERENCES ulbs(id) ON DELETE RESTRICT,
    luminaire_id UUID REFERENCES luminaires(id) ON DELETE CASCADE,
    feeder_id UUID REFERENCES feeders(id) ON DELETE SET NULL,
    gateway_id UUID REFERENCES gateways(id) ON DELETE SET NULL,
    model_id UUID REFERENCES device_models(id) ON DELETE RESTRICT,
    adapter_key TEXT NOT NULL,
    external_id TEXT NOT NULL,
    desired_on BOOLEAN,
    reported_on BOOLEAN,
    desired_brightness NUMERIC(5, 2) DEFAULT 100.0,
    reported_brightness NUMERIC(5, 2),
    is_online BOOLEAN NOT NULL DEFAULT true,
    last_seen_at TIMESTAMPTZ,
    simulated BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(adapter_key, external_id)
);

-- Users, Roles and ULB-Scoped Permissions
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_subject TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    first_name TEXT,
    last_name TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_role_assignments (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    ulb_id UUID REFERENCES ulbs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY(user_id, role_id, ulb_id)
);

-- Asynchronous Command Lifecycle
CREATE TABLE IF NOT EXISTS device_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ulb_id UUID NOT NULL REFERENCES ulbs(id) ON DELETE RESTRICT,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
    command_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('QUEUED','SENT','ACKNOWLEDGED','CONFIRMED','FAILED','TIMED_OUT')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(ulb_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS command_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_id UUID NOT NULL REFERENCES device_commands(id) ON DELETE CASCADE,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    result TEXT NOT NULL,
    transport_reference TEXT
);

-- Partitioned Telemetry Readings
CREATE TABLE IF NOT EXISTS telemetry_readings (
    device_id UUID NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    power_watts NUMERIC(8, 2),
    voltage NUMERIC(6, 2),
    current_amp NUMERIC(6, 2),
    energy_kwh NUMERIC(12, 3),
    burning_hours NUMERIC(10, 2),
    online BOOLEAN NOT NULL DEFAULT true,
    reported_on BOOLEAN,
    fault_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    source TEXT NOT NULL DEFAULT 'SIMULATOR',
    PRIMARY KEY(device_id, observed_at)
) PARTITION BY RANGE (observed_at);

CREATE TABLE IF NOT EXISTS telemetry_default PARTITION OF telemetry_readings DEFAULT;

-- Schedules and Controls
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ulb_id UUID NOT NULL REFERENCES ulbs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    rule JSONB NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule_targets (
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    PRIMARY KEY(schedule_id, device_id)
);

-- Alerts & Maintenance Tickets
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ulb_id UUID NOT NULL REFERENCES ulbs(id) ON DELETE RESTRICT,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    message TEXT,
    severity TEXT NOT NULL CHECK(severity IN ('CRITICAL','MAJOR','MINOR','WARNING','INFO')),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','ACKNOWLEDGED','RESOLVED','CLOSED')),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS maintenance_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ulb_id UUID NOT NULL REFERENCES ulbs(id) ON DELETE RESTRICT,
    alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','IN_PROGRESS','WAITING_PARTS','RESOLVED','CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutable Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ulb_id UUID REFERENCES ulbs(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Simulation Scenario Runs
CREATE TABLE IF NOT EXISTS simulation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ulb_id UUID REFERENCES ulbs(id) ON DELETE SET NULL,
    scenario TEXT NOT NULL,
    seed INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'CREATED' CHECK(status IN ('CREATED','RUNNING','PAUSED','COMPLETED','FAILED')),
    started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for Fast Querying and PostGIS Operations
CREATE INDEX IF NOT EXISTS idx_feeders_geo ON feeders USING gist(location);
CREATE INDEX IF NOT EXISTS idx_gateways_geo ON gateways USING gist(location);
CREATE INDEX IF NOT EXISTS idx_poles_geo ON poles USING gist(location);
CREATE INDEX IF NOT EXISTS idx_devices_ulb ON devices(ulb_id);
CREATE INDEX IF NOT EXISTS idx_devices_luminaire ON devices(luminaire_id);
CREATE INDEX IF NOT EXISTS idx_commands_device_time ON device_commands(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commands_ulb_status ON device_commands(ulb_id, status);
CREATE INDEX IF NOT EXISTS idx_alerts_ulb_status ON alerts(ulb_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_ulb_status ON maintenance_tickets(ulb_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_ulb_time ON audit_logs(ulb_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_assignments_lookup ON user_role_assignments(user_id, ulb_id);
