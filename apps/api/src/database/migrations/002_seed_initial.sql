-- Migration: 002_seed_initial.sql
-- Description: Deterministic seed data for two ULBs (Ganderbal & Katra), RBAC roles, permissions, users and assets.

-- 1. Insert Organization
INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Jammu & Kashmir Housing and Urban Development Department (JKHUDD)')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert ULBs (Ganderbal and Katra)
INSERT INTO ulbs (id, organization_id, code, name, state, timezone, latitude, longitude)
VALUES 
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'ULB-GBL', 'Ganderbal Municipal Council', 'Jammu and Kashmir', 'Asia/Kolkata', 34.2165, 74.7725),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'ULB-KTR', 'Katra Municipal Committee', 'Jammu and Kashmir', 'Asia/Kolkata', 32.9925, 74.9318)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Roles
INSERT INTO roles (id, code, description) VALUES
  ('10000000-0000-0000-0000-000000000001', 'PLATFORM_ADMIN', 'Global system administrator across all ULBs'),
  ('10000000-0000-0000-0000-000000000002', 'ULB_ADMIN', 'ULB administrator with asset and user management for assigned ULB'),
  ('10000000-0000-0000-0000-000000000003', 'OPERATIONS_MANAGER', 'Operations oversight and scheduling supervisor'),
  ('10000000-0000-0000-0000-000000000004', 'CONTROL_OPERATOR', 'Operator with switching and control console access'),
  ('10000000-0000-0000-0000-000000000005', 'MAINTENANCE_SUPERVISOR', 'Maintenance and field work supervisor'),
  ('10000000-0000-0000-0000-000000000006', 'TECHNICIAN', 'Field technician for maintenance tickets'),
  ('10000000-0000-0000-0000-000000000007', 'AUDITOR', 'Read-only auditor with access to logs and reports')
ON CONFLICT (code) DO NOTHING;

-- 4. Insert Permissions
INSERT INTO permissions (code, description) VALUES
  ('org.manage', 'Manage organizations and tenant settings'),
  ('users.manage', 'Create and manage user accounts and role assignments'),
  ('assets.read', 'View geographic hierarchy, poles, feeders, and luminaires'),
  ('assets.write', 'Create and modify physical assets and locations'),
  ('devices.read', 'View device registry and real-time state'),
  ('devices.configure', 'Update device parameters and threshold configs'),
  ('devices.command', 'Issue switching, dimming, and reboot commands'),
  ('schedules.manage', 'Create, update, and toggle automated lighting schedules'),
  ('alerts.read', 'View active and historical system alerts'),
  ('alerts.acknowledge', 'Acknowledge and triage system alerts'),
  ('tickets.read', 'View maintenance tickets'),
  ('tickets.create', 'Create maintenance work orders'),
  ('tickets.assign', 'Assign maintenance tickets to technicians'),
  ('tickets.resolve', 'Resolve and close maintenance tickets'),
  ('reports.read', 'View energy, operational, and uptime reports'),
  ('reports.export', 'Export audit and compliance reports in CSV/PDF'),
  ('simulator.manage', 'Control simulator scenarios, speeds, and fault injections'),
  ('audit.read', 'View immutable audit log trail'),
  ('integrations.manage', 'Manage CCCC and external API integrations')
ON CONFLICT (code) DO NOTHING;

-- 5. Seed Adapters
INSERT INTO adapters (id, name, description, version, is_enabled) VALUES
  ('SIMULATOR', 'SmartLight Built-in Simulator Adapter', 'Deterministic virtual streetlight adapter for lab and staging', '1.0.0', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Device Models
INSERT INTO device_models (id, manufacturer, model, capabilities) VALUES
  ('30000000-0000-0000-0000-000000000001', 'SmartLight OEM Ref', 'SL-LED-35W-V1', '{"switching": true, "dimming": false, "scheduling": true, "firmware": false, "telemetryFields": ["voltage","current","powerWatts","energyKwh","burningHours"]}'::jsonb),
  ('30000000-0000-0000-0000-000000000002', 'SmartLight OEM Ref', 'SL-LED-70W-V1', '{"switching": true, "dimming": false, "scheduling": true, "firmware": false, "telemetryFields": ["voltage","current","powerWatts","energyKwh","burningHours"]}'::jsonb),
  ('30000000-0000-0000-0000-000000000003', 'SmartLight OEM Ref', 'SL-LED-110W-V1', '{"switching": true, "dimming": false, "scheduling": true, "firmware": false, "telemetryFields": ["voltage","current","powerWatts","energyKwh","burningHours"]}'::jsonb)
ON CONFLICT (manufacturer, model) DO NOTHING;

-- 7. Seed Seed Users (Password: SmartLight@2026!)
-- Hash: $2b$10$wT0lqf.M13/9n8uQk5d1pOfXv/e4f71M4c1p9eK2X3kY7V1m7VbC.
INSERT INTO users (id, external_subject, email, password_hash, first_name, last_name, active) VALUES
  ('40000000-0000-0000-0000-000000000001', 'sub-platform-admin', 'admin@smartlight.os', '$2b$10$wT0lqf.M13/9n8uQk5d1pOfXv/e4f71M4c1p9eK2X3kY7V1m7VbC.', 'Global', 'Administrator', true),
  ('40000000-0000-0000-0000-000000000002', 'sub-op-ganderbal', 'operator.ganderbal@smartlight.os', '$2b$10$wT0lqf.M13/9n8uQk5d1pOfXv/e4f71M4c1p9eK2X3kY7V1m7VbC.', 'Tariq', 'Ahmad', true),
  ('40000000-0000-0000-0000-000000000003', 'sub-op-katra', 'operator.katra@smartlight.os', '$2b$10$wT0lqf.M13/9n8uQk5d1pOfXv/e4f71M4c1p9eK2X3kY7V1m7VbC.', 'Rajesh', 'Sharma', true),
  ('40000000-0000-0000-0000-000000000004', 'sub-tech-ganderbal', 'tech.ganderbal@smartlight.os', '$2b$10$wT0lqf.M13/9n8uQk5d1pOfXv/e4f71M4c1p9eK2X3kY7V1m7VbC.', 'Mohammad', 'Iqbal', true),
  ('40000000-0000-0000-0000-000000000005', 'sub-auditor', 'auditor@smartlight.os', '$2b$10$wT0lqf.M13/9n8uQk5d1pOfXv/e4f71M4c1p9eK2X3kY7V1m7VbC.', 'Sunil', 'Verma', true)
ON CONFLICT (email) DO NOTHING;

-- 8. Assign Roles to Users
INSERT INTO user_role_assignments (user_id, role_id, ulb_id) VALUES
  -- admin is PLATFORM_ADMIN globally (ulb_id = NULL)
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', NULL),
  -- operator.ganderbal is CONTROL_OPERATOR for Ganderbal
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111'),
  -- operator.katra is CONTROL_OPERATOR for Katra
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222'),
  -- tech.ganderbal is TECHNICIAN for Ganderbal
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111'),
  -- auditor is AUDITOR globally
  ('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000007', NULL)
ON CONFLICT DO NOTHING;

-- 9. Seed Geographic Hierarchy for Ganderbal
INSERT INTO zones (id, ulb_id, code, name) VALUES
  ('50000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'GBL-Z1', 'Zone 1 - Main Town'),
  ('50000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'GBL-Z2', 'Zone 2 - Duderhama')
ON CONFLICT (id) DO NOTHING;

INSERT INTO wards (id, zone_id, ward_number, name) VALUES
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 1, 'Ward 1 - Beehama'),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 2, 'Ward 2 - Saloora')
ON CONFLICT (id) DO NOTHING;

INSERT INTO streets (id, ward_id, name, street_type) VALUES
  ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Srinagar-Leh Highway (NH-1D)', 'HIGHWAY'),
  ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'Beehama Main Market Road', 'ARTERIAL')
ON CONFLICT (id) DO NOTHING;

-- 10. Seed Feeders & Gateways for Ganderbal
INSERT INTO feeders (id, ulb_id, name, panel_code, capacity_kw, meter_number, location) VALUES
  ('80000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Feeder Panel FP-01 Beehama', 'GBL-FP-01', 25.0, 'JKPDD-MTR-90812', ST_SetSRID(ST_MakePoint(74.7725, 34.2165), 4326))
ON CONFLICT (id) DO NOTHING;

INSERT INTO gateways (id, ulb_id, feeder_id, external_code, name, ip_address, is_online, location) VALUES
  ('85000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '80000000-0000-0000-0000-000000000001', 'GW-GBL-01', 'CCMS Gateway 01 Beehama', '10.14.20.101', true, ST_SetSRID(ST_MakePoint(74.7725, 34.2165), 4326))
ON CONFLICT (id) DO NOTHING;

-- 11. Seed Poles & Luminaires & Devices for Ganderbal (Deterministic test lights)
INSERT INTO poles (id, ulb_id, street_id, external_code, height_meters, location) VALUES
  ('90000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000001', 'GBL-POLE-001', 9.0, ST_SetSRID(ST_MakePoint(74.7721, 34.2168), 4326)),
  ('90000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000001', 'GBL-POLE-002', 9.0, ST_SetSRID(ST_MakePoint(74.7728, 34.2170), 4326)),
  ('90000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000002', 'GBL-POLE-003', 7.5, ST_SetSRID(ST_MakePoint(74.7735, 34.2175), 4326))
ON CONFLICT (id) DO NOTHING;

INSERT INTO luminaires (id, ulb_id, pole_id, feeder_id, wattage, lamp_type) VALUES
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 110, 'LED'),
  ('a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '90000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', 70, 'LED'),
  ('a0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '90000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000001', 35, 'LED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO devices (id, ulb_id, luminaire_id, feeder_id, gateway_id, model_id, adapter_key, external_id, desired_on, reported_on, is_online, last_seen_at, simulated) VALUES
  ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '85000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'SIMULATOR', 'SIM-GBL-0001', true, true, true, now(), true),
  ('b0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', '85000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'SIMULATOR', 'SIM-GBL-0002', true, true, true, now(), true),
  ('b0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000001', '85000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'SIMULATOR', 'SIM-GBL-0003', false, false, true, now(), true)
ON CONFLICT (adapter_key, external_id) DO NOTHING;

-- 12. Seed Geographic Hierarchy & Assets for Katra
INSERT INTO zones (id, ulb_id, code, name) VALUES
  ('50000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'KTR-Z1', 'Zone 1 - Shrine Route')
ON CONFLICT (id) DO NOTHING;

INSERT INTO wards (id, zone_id, ward_number, name) VALUES
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', 1, 'Ward 1 - Bus Stand & Banganga Road')
ON CONFLICT (id) DO NOTHING;

INSERT INTO streets (id, ward_id, name, street_type) VALUES
  ('70000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000003', 'Banganga Pilgrimage Track Road', 'ARTERIAL')
ON CONFLICT (id) DO NOTHING;

INSERT INTO feeders (id, ulb_id, name, panel_code, capacity_kw, meter_number, location) VALUES
  ('80000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Feeder Panel FP-01 Katra Banganga', 'KTR-FP-01', 30.0, 'JKPDD-MTR-81723', ST_SetSRID(ST_MakePoint(74.9318, 32.9925), 4326))
ON CONFLICT (id) DO NOTHING;

INSERT INTO gateways (id, ulb_id, feeder_id, external_code, name, ip_address, is_online, location) VALUES
  ('85000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '80000000-0000-0000-0000-000000000002', 'GW-KTR-01', 'CCMS Gateway 01 Katra', '10.14.30.101', true, ST_SetSRID(ST_MakePoint(74.9318, 32.9925), 4326))
ON CONFLICT (id) DO NOTHING;

INSERT INTO poles (id, ulb_id, street_id, external_code, height_meters, location) VALUES
  ('90000000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', '70000000-0000-0000-0000-000000000003', 'KTR-POLE-001', 9.0, ST_SetSRID(ST_MakePoint(74.9320, 32.9930), 4326)),
  ('90000000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', '70000000-0000-0000-0000-000000000003', 'KTR-POLE-002', 8.0, ST_SetSRID(ST_MakePoint(74.9325, 32.9935), 4326))
ON CONFLICT (id) DO NOTHING;

INSERT INTO luminaires (id, ulb_id, pole_id, feeder_id, wattage, lamp_type) VALUES
  ('a0000000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', '90000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000002', 70, 'LED'),
  ('a0000000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', '90000000-0000-0000-0000-000000000005', '80000000-0000-0000-0000-000000000002', 35, 'LED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO devices (id, ulb_id, luminaire_id, feeder_id, gateway_id, model_id, adapter_key, external_id, desired_on, reported_on, is_online, last_seen_at, simulated) VALUES
  ('b0000000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000002', '85000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'SIMULATOR', 'SIM-KTR-0001', true, true, true, now(), true),
  ('b0000000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000005', '80000000-0000-0000-0000-000000000002', '85000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'SIMULATOR', 'SIM-KTR-0002', false, false, true, now(), true)
ON CONFLICT (adapter_key, external_id) DO NOTHING;

-- Record migrations in tracking table
INSERT INTO schema_migrations (version, name) VALUES
  ('001', '001_core_schema.sql'),
  ('002', '002_seed_initial.sql')
ON CONFLICT (version) DO NOTHING;
