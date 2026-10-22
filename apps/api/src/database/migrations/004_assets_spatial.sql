-- Migration: 004_assets_spatial.sql
-- Description: Spatial views and extended electrical topology for GIS asset registry.

-- 1. Extend feeders and luminaires with phase information
ALTER TABLE feeders ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT '3-PHASE' CHECK (phase IN ('3-PHASE', 'SINGLE-PHASE'));
ALTER TABLE luminaires ADD COLUMN IF NOT EXISTS phase_connection TEXT DEFAULT 'R' CHECK (phase_connection IN ('R', 'Y', 'B'));

-- 2. Spatial Index on Gateway coordinates
CREATE INDEX IF NOT EXISTS idx_gateways_location ON gateways USING gist(location);

-- 3. GeoJSON Views for high-performance spatial queries
CREATE OR REPLACE VIEW v_poles_geojson AS
SELECT 
    p.id,
    p.ulb_id,
    p.external_code,
    p.height_meters,
    p.pole_type,
    ST_Y(p.location::geometry) as latitude,
    ST_X(p.location::geometry) as longitude,
    jsonb_build_object(
        'type', 'Feature',
        'id', p.id,
        'geometry', ST_AsGeoJSON(p.location)::jsonb,
        'properties', jsonb_build_object(
            'id', p.id,
            'externalCode', p.external_code,
            'ulbId', p.ulb_id,
            'heightMeters', p.height_meters,
            'poleType', p.pole_type,
            'streetId', p.street_id,
            'wattage', l.wattage,
            'lampType', l.lamp_type,
            'deviceExternalId', d.external_id,
            'isOnline', COALESCE(d.is_online, true),
            'reportedOn', d.reported_on,
            'desiredOn', d.desired_on
        )
    ) as feature
FROM poles p
LEFT JOIN luminaires l ON l.pole_id = p.id
LEFT JOIN devices d ON d.luminaire_id = l.id;

CREATE OR REPLACE VIEW v_feeders_geojson AS
SELECT 
    f.id,
    f.ulb_id,
    f.panel_code,
    f.name,
    f.capacity_kw,
    f.meter_number,
    f.phase,
    ST_Y(f.location::geometry) as latitude,
    ST_X(f.location::geometry) as longitude,
    jsonb_build_object(
        'type', 'Feature',
        'id', f.id,
        'geometry', ST_AsGeoJSON(f.location)::jsonb,
        'properties', jsonb_build_object(
            'id', f.id,
            'name', f.name,
            'panelCode', f.panel_code,
            'ulbId', f.ulb_id,
            'capacityKw', f.capacity_kw,
            'meterNumber', f.meter_number,
            'phase', f.phase
        )
    ) as feature
FROM feeders f;

-- 4. Record migration in schema_migrations
INSERT INTO schema_migrations (version, name) VALUES
  ('004', '004_assets_spatial.sql')
ON CONFLICT (version) DO NOTHING;
