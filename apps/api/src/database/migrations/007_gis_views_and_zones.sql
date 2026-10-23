-- Migration: 007_gis_views_and_zones.sql
-- Description: High-performance GeoJSON spatial views for LoRaWAN gateways, administrative zones, and real-time fault heatmaps.

-- 1. LoRaWAN Gateways GeoJSON View
CREATE OR REPLACE VIEW v_gateways_geojson AS
SELECT 
    g.id,
    g.ulb_id,
    g.external_code,
    g.name,
    g.ip_address,
    g.is_online,
    ST_Y(g.location::geometry) as latitude,
    ST_X(g.location::geometry) as longitude,
    jsonb_build_object(
        'type', 'Feature',
        'id', g.id,
        'geometry', ST_AsGeoJSON(g.location)::jsonb,
        'properties', jsonb_build_object(
            'assetType', 'GATEWAY',
            'id', g.id,
            'name', g.name,
            'externalCode', g.external_code,
            'ipAddress', g.ip_address,
            'isOnline', g.is_online,
            'status', CASE WHEN g.is_online THEN 'online' ELSE 'offline' END,
            'feederId', g.feeder_id
        )
    ) as feature
FROM gateways g;

-- 2. Administrative Zones GeoJSON View
CREATE OR REPLACE VIEW v_zones_geojson AS
SELECT 
    z.id,
    z.ulb_id,
    z.code,
    z.name,
    jsonb_build_object(
        'type', 'Feature',
        'id', z.id,
        'geometry', ST_AsGeoJSON(z.boundary)::jsonb,
        'properties', jsonb_build_object(
            'assetType', 'ZONE',
            'id', z.id,
            'name', z.name,
            'code', z.code,
            'ulbId', z.ulb_id
        )
    ) as feature
FROM zones z;

-- 3. Spatial Real-Time Fault Heatmap View
CREATE OR REPLACE VIEW v_fault_heatmap_geojson AS
SELECT 
    p.id as pole_id,
    p.ulb_id,
    p.external_code,
    a.id as alert_id,
    a.code as alert_code,
    a.severity as alert_severity,
    a.status as alert_status,
    ST_Y(p.location::geometry) as latitude,
    ST_X(p.location::geometry) as longitude,
    jsonb_build_object(
        'type', 'Feature',
        'id', p.id,
        'geometry', ST_AsGeoJSON(p.location)::jsonb,
        'properties', jsonb_build_object(
            'assetType', 'POLE',
            'poleCode', p.external_code,
            'alertId', a.id,
            'alertCode', a.code,
            'severity', a.severity,
            'status', a.status,
            'openedAt', a.opened_at
        )
    ) as feature
FROM poles p
JOIN luminaires l ON l.pole_id = p.id
JOIN devices d ON d.luminaire_id = l.id
JOIN alerts a ON a.device_id = d.id
WHERE a.status IN ('OPEN', 'ACKNOWLEDGED');

-- 4. Record migration in schema_migrations
INSERT INTO schema_migrations (version, name) VALUES
  ('007', '007_gis_views_and_zones.sql')
ON CONFLICT (version) DO NOTHING;
