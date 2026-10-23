# PostGIS Spatial Operations, Vector GeoJSON & 3-Phase Circuit Tracing

## 1. PostGIS Spatial Database Architecture

SmartLight OS models all municipal physical assets with native OpenGIS Consortium spatial types (`geometry(Point, 4326)` and `geometry(Polygon, 4326)`). This enables real-time vector queries across thousands of streetlights without raster tile pre-rendering.

### Spatial Views Schema (`007_gis_views_and_zones.sql`)
The PostgreSQL database exposes five pre-optimized spatial views:
1. **`v_poles_geojson`**: Streams poles with current reported switching state, active wattage, phase connection (`R`, `Y`, `B`), and active alarm status.
2. **`v_feeders_geojson`**: Feeder panel junction points with total downstream luminaire count and circuit breaker capacity.
3. **`v_gateways_geojson`**: IoT Gateway locations (LoRaWAN / Cellular CCMS concentrators) with coverage radius indicators.
4. **`v_zones_geojson`**: Municipal administrative boundary polygons with centroid tags.
5. **`v_fault_heatmap_geojson`**: Aggregated fault density clusters formatted for gradient heatmap rendering.

---

## 2. RFC 7946 GeoJSON Endpoint & Bounding Box Indexing

### API Query Interface
`GET /assets/geojson?ulbId=:ulbId&type=:type&bbox=minLng,minLat,maxLng,maxLat`

### Parameter Specifications
- `ulbId`: Scoped ULB identifier (e.g. `11111111-1111-1111-1111-111111111111` for Ganderbal).
- `type`: Asset filter (`poles`, `feeders`, `gateways`, `zones`, `heatmap`, or comma-separated `feeders,gateways`). Defaults to `'all'`.
- `bbox`: Standard 4-coordinate bounding box `minLng,minLat,maxLng,maxLat`.

### High-Performance PostGIS Bounding Box Query
```sql
SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(json_agg(feature), '[]'::json)
)
FROM (
    SELECT json_build_object(
        'type', 'Feature',
        'id', id,
        'geometry', ST_AsGeoJSON(geom)::json,
        'properties', json_build_object(
            'id', id,
            'code', code,
            'assetType', 'POLE',
            'phase', phase_connection,
            'wattage', wattage,
            'isOnline', is_online,
            'reportedOn', reported_on,
            'hasActiveAlert', has_active_alert
        )
    ) AS feature
    FROM poles
    WHERE ulb_id = $1
      AND geom && ST_MakeEnvelope($2, $3, $4, $5, 4326)
) q;
```
By leveraging PostGIS `&&` bounding box operators backed by a GiST index (`CREATE INDEX idx_poles_geom ON poles USING GIST(geom)`), spatial window queries complete in $< 10\text{ms}$ across the entire municipal dataset.

---

## 3. 3-Phase CCMS Electrical Circuit Tracing

Streetlights along municipal corridors are distributed cyclically across a 3-phase, 415V/230V AC distribution main (Phases R, Y, B):

```
CCMS Feeder Panel (3-Phase 415V AC)
  |--- Phase R (Red Wire)    ---> Pole 001 (35W)  ---> Pole 004 (70W)  ---> Pole 007 (35W)
  |--- Phase Y (Yellow Wire) ---> Pole 002 (70W)  ---> Pole 005 (35W)  ---> Pole 008 (110W)
  |--- Phase B (Blue Wire)   ---> Pole 003 (110W) ---> Pole 006 (70W)  ---> Pole 009 (70W)
```

### Phase Balancing Verification
To prevent neutral current overheating and transformer unbalance:
- Poles in Ganderbal (2,740 lights) and Katra (1,868 lights) are assigned in round-robin succession:
  - Phase R: 33.3% of fixtures (`#ef4444`)
  - Phase Y: 33.3% of fixtures (`#eab308`)
  - Phase B: 33.3% of fixtures (`#3b82f6`)
- In GIS inspections, operators can isolate a single phase to trace voltage drop across distant branch terminations or verify phase balancing during maintenance.

---

## 4. MapLibre GL Interactive Control Room Console

The web application ([`apps/web/src/app/gis/page.tsx`](file:///Users/kraanthi/Documents/365/SmartLight%20OS/apps/web/src/app/gis/page.tsx)) features an interactive vector canvas:
- **Canvas-Accelerated Vector Rendering**: Smooth 60 FPS panning, zooming, and tilting across 4,608 streetlight nodes.
- **Wattage-Scaled Halos**: 35W fixtures render compact halos; 70W and 110W luminaires render wider luminosity footprints.
- **Live Minimap Radar**: Provides contextual orientation across urban and suburban zones.
- **Quick Switching Action**: Direct command modal allows instant single-click luminaire ON/OFF toggle from the map popup.
- **Direct Work Order Dispatch**: Technicians can trigger an emergency maintenance ticket directly from a faulted streetlight pin.
