import { describe, it, expect, beforeEach } from 'vitest';
import { AssetsService } from '../src/modules/assets/assets.service';
import { DatabaseService } from '../src/database/database.service';

describe('GIS Spatial Network & Fleet Topology Operations', () => {
  let dbService: DatabaseService;
  let assetsService: AssetsService;

  const GBL_ULB = '11111111-1111-1111-1111-111111111111';
  const KTR_ULB = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    dbService = new DatabaseService();
    assetsService = new AssetsService(dbService);
  });

  describe('Full Fleet Spatial GeoJSON Generation (4,608 Streetlights)', () => {
    beforeEach(() => {
      // Deterministically seed the full 4,608 municipal streetlight fleet
      dbService.seedFullFleet(365);
    });

    it('generates exact streetlight count for Ganderbal Municipal Council (2,740 lights)', () => {
      const gblPoles = assetsService.getGeoJson(GBL_ULB, 'poles');
      expect(gblPoles.type).toBe('FeatureCollection');
      expect(gblPoles.features.length).toBe(2740);

      // Verify wattage breakdown
      const count110W = gblPoles.features.filter((f) => f.properties.wattage === 110).length;
      const count70W = gblPoles.features.filter((f) => f.properties.wattage === 70).length;
      const count35W = gblPoles.features.filter((f) => f.properties.wattage === 35).length;

      expect(count110W).toBe(339);
      expect(count70W).toBe(1542);
      expect(count35W).toBe(859);
      expect(count110W + count70W + count35W).toBe(2740);
    });

    it('generates exact streetlight count for Katra Municipal Committee (1,868 lights)', () => {
      const ktrPoles = assetsService.getGeoJson(KTR_ULB, 'poles');
      expect(ktrPoles.type).toBe('FeatureCollection');
      expect(ktrPoles.features.length).toBe(1868);

      const count110W = ktrPoles.features.filter((f) => f.properties.wattage === 110).length;
      const count70W = ktrPoles.features.filter((f) => f.properties.wattage === 70).length;
      const count35W = ktrPoles.features.filter((f) => f.properties.wattage === 35).length;

      expect(count110W).toBe(123);
      expect(count70W).toBe(381);
      expect(count35W).toBe(1364);
      expect(count110W + count70W + count35W).toBe(1868);
    });

    it('generates CCMS feeder panels (35 in Ganderbal, 25 in Katra)', () => {
      const gblFeeders = assetsService.getGeoJson(GBL_ULB, 'feeders');
      expect(gblFeeders.features.length).toBe(35);
      expect(gblFeeders.features.every((f) => f.properties.assetType === 'FEEDER')).toBe(true);

      const ktrFeeders = assetsService.getGeoJson(KTR_ULB, 'feeders');
      expect(ktrFeeders.features.length).toBe(25);
      expect(ktrFeeders.features.every((f) => f.properties.assetType === 'FEEDER')).toBe(true);
    });

    it('generates LoRaWAN gateways (12 in Ganderbal, 8 in Katra)', () => {
      const gblGateways = assetsService.getGeoJson(GBL_ULB, 'gateways');
      expect(gblGateways.features.length).toBe(12);
      expect(gblGateways.features.every((f) => f.properties.assetType === 'GATEWAY')).toBe(true);

      const ktrGateways = assetsService.getGeoJson(KTR_ULB, 'gateways');
      expect(ktrGateways.features.length).toBe(8);
      expect(ktrGateways.features.every((f) => f.properties.assetType === 'GATEWAY')).toBe(true);
    });

    it('generates administrative zone boundaries as GeoJSON Polygons', () => {
      const gblZones = assetsService.getGeoJson(GBL_ULB, 'zones');
      expect(gblZones.features.length).toBe(3);
      expect(gblZones.features.every((f) => f.geometry.type === 'Polygon')).toBe(true);
      expect(gblZones.features[0].properties.assetType).toBe('ZONE');

      const ktrZones = assetsService.getGeoJson(KTR_ULB, 'zones');
      expect(ktrZones.features.length).toBe(2);
      expect(ktrZones.features.every((f) => f.geometry.type === 'Polygon')).toBe(true);
    });
  });

  describe('Multi-Layer Filtering', () => {
    beforeEach(() => {
      dbService.seedFullFleet(365);
    });

    it('filters by combined layers using comma-separated selector', () => {
      const feederAndGw = assetsService.getGeoJson(GBL_ULB, 'feeders,gateways');
      expect(feederAndGw.features.length).toBe(35 + 12); // 35 feeders + 12 gateways = 47 features
      expect(feederAndGw.features.some((f) => f.properties.assetType === 'FEEDER')).toBe(true);
      expect(feederAndGw.features.some((f) => f.properties.assetType === 'GATEWAY')).toBe(true);
      expect(feederAndGw.features.some((f) => f.properties.assetType === 'POLE')).toBe(false);
    });

    it('supports alias "luminaires" for "poles"', () => {
      const luminaires = assetsService.getGeoJson(KTR_ULB, 'luminaires');
      expect(luminaires.features.length).toBe(1868);
      expect(luminaires.features[0].properties.assetType).toBe('POLE');
    });
  });

  describe('Spatial Bounding Box Filtering (WGS 84 EPSG:4326)', () => {
    beforeEach(() => {
      dbService.seedFullFleet(365);
    });

    it('spatially isolates Ganderbal valley corridor and excludes Katra', () => {
      // Ganderbal bounding box
      const gblBbox = '74.70,34.15,74.85,34.30';
      const result = assetsService.getGeoJson(undefined, 'all', gblBbox);

      expect(result.features.length).toBeGreaterThan(100);
      result.features.forEach((f) => {
        const [lng, lat] = f.geometry.coordinates;
        expect(lng).toBeGreaterThanOrEqual(74.70);
        expect(lng).toBeLessThanOrEqual(74.85);
        expect(lat).toBeGreaterThanOrEqual(34.15);
        expect(lat).toBeLessThanOrEqual(34.30);
      });
    });

    it('spatially isolates Katra Trikuta foothills corridor and excludes Ganderbal', () => {
      // Katra bounding box
      const ktrBbox = '74.88,32.95,74.98,33.05';
      const result = assetsService.getGeoJson(undefined, 'all', ktrBbox);

      expect(result.features.length).toBeGreaterThan(100);
      result.features.forEach((f) => {
        const [lng, lat] = f.geometry.coordinates;
        expect(lng).toBeGreaterThanOrEqual(74.88);
        expect(lng).toBeLessThanOrEqual(74.98);
        expect(lat).toBeGreaterThanOrEqual(32.95);
        expect(lat).toBeLessThanOrEqual(33.05);
      });
    });

    it('returns empty feature collection for out-of-bounds coordinates', () => {
      // Coordinates in the Indian Ocean
      const oceanBbox = '60.0,0.0,61.0,1.0';
      const result = assetsService.getGeoJson(undefined, 'all', oceanBbox);
      expect(result.features.length).toBe(0);
    });
  });

  describe('Electrical & Operational Metadata Enrichment', () => {
    beforeEach(() => {
      dbService.seedFullFleet(365);
    });

    it('enriches poles with 3-phase assignment and feeder panel correlation', () => {
      const gblPoles = assetsService.getGeoJson(GBL_ULB, 'poles');
      const first = gblPoles.features[0];

      expect(first.properties.feederPanelCode).toMatch(/^GBL-FP-\d{2}$/);
      expect(['R', 'Y', 'B']).toContain(first.properties.phaseConnection);
      expect([35, 70, 110]).toContain(first.properties.wattage);
      expect(first.properties.voltage).toBeGreaterThanOrEqual(220);
      expect(first.properties.currentAmps).toBeGreaterThanOrEqual(0);
      expect(first.properties.temperatureC).toBeDefined();
    });

    it('enriches feeders with aggregate connected luminaire count and active load kW', () => {
      const feeders = assetsService.getGeoJson(GBL_ULB, 'feeders');
      const fp1 = feeders.features[0];

      expect(fp1.properties.panelCode).toBe('GBL-FP-01');
      expect(fp1.properties.capacityKw).toBe(30.0);
      expect(fp1.properties.connectedLuminairesCount).toBeGreaterThan(50);
      expect(typeof fp1.properties.activeLoadKw).toBe('number');
      expect(fp1.properties.status).toBe('healthy');
    });

    it('correctly maps active alerts to luminaire status for GIS map symbology', () => {
      // Inject a critical alarm on a specific device
      const targetPole = dbService.memoryStore.poles[0];
      const deviceId = (targetPole as any).deviceExternalId || 'SIM-GBL-0001';

      dbService.memoryStore.alerts.push({
        id: 'test-critical-alert',
        ulb_id: GBL_ULB,
        device_id: deviceId,
        code: 'LAMP_FAILURE',
        message: 'Lamp open-circuit detected',
        severity: 'CRITICAL',
        status: 'OPEN',
        opened_at: new Date().toISOString(),
      });

      const result = assetsService.getGeoJson(GBL_ULB, 'poles');
      const matchingFeature = result.features.find(
        (f) => f.properties.deviceExternalId === deviceId || f.id === targetPole.id,
      );

      expect(matchingFeature).toBeDefined();
      expect(matchingFeature!.properties.status).toBe('critical_fault');
      expect(matchingFeature!.properties.activeAlertCount).toBeGreaterThanOrEqual(1);
      expect(matchingFeature!.properties.activeAlertSeverity).toBe('CRITICAL');
    });
  });
});
