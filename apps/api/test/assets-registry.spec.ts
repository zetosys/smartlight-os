import { describe, it, expect, beforeEach } from 'vitest';
import { AssetsService } from '../src/modules/assets/assets.service';
import { DatabaseService } from '../src/database/database.service';
import { AuthContextUser, CreateFeederDto, CreatePoleDto, BulkImportDto } from '@smartlight/shared-types';
import { ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('Assets & Geographic Hierarchy Registry', () => {
  let assetsService: AssetsService;
  let dbService: DatabaseService;

  const adminUser: AuthContextUser = {
    id: 'user-admin',
    email: 'admin@smartlight.os',
    name: 'Admin',
    roles: [{ roleCode: 'PLATFORM_ADMIN', ulbId: null }],
    permissions: ['assets.write', 'assets.read'],
    allowedUlbIds: ['*'],
    isGlobalAdmin: true,
  };

  const ganderbalOperator: AuthContextUser = {
    id: 'user-ganderbal',
    email: 'operator.ganderbal@smartlight.os',
    name: 'Ganderbal Operator',
    roles: [{ roleCode: 'CONTROL_OPERATOR', ulbId: '11111111-1111-1111-1111-111111111111' }],
    permissions: ['assets.write', 'assets.read'],
    allowedUlbIds: ['11111111-1111-1111-1111-111111111111'],
    isGlobalAdmin: false,
  };

  const katraOperator: AuthContextUser = {
    id: 'user-katra',
    email: 'operator.katra@smartlight.os',
    name: 'Katra Operator',
    roles: [{ roleCode: 'CONTROL_OPERATOR', ulbId: '22222222-2222-2222-2222-222222222222' }],
    permissions: ['assets.write', 'assets.read'],
    allowedUlbIds: ['22222222-2222-2222-2222-222222222222'],
    isGlobalAdmin: false,
  };

  beforeEach(() => {
    dbService = new DatabaseService();
    assetsService = new AssetsService(dbService);
  });

  describe('Administrative Hierarchy', () => {
    it('retrieves nested hierarchy structure for all ULBs or scoped ULB', () => {
      const allHierarchy = assetsService.getHierarchy();
      expect(allHierarchy.length).toBe(2); // Ganderbal and Katra zones
      expect(allHierarchy[0].wards).toBeDefined();
      expect(allHierarchy[0].wards[0].streets).toBeDefined();
      expect(allHierarchy[0].wards[0].streets[0].poles).toBeDefined();
      expect(allHierarchy[0].wards[0].streets[0].poles[0].luminaires).toBeDefined();

      const gblOnly = assetsService.getHierarchy('11111111-1111-1111-1111-111111111111');
      expect(gblOnly.length).toBe(1);
      expect(gblOnly[0].ulb_id).toBe('11111111-1111-1111-1111-111111111111');
    });

    it('retrieves feeders and poles with enriched electrical topology metadata', () => {
      const gblFeeders = assetsService.getFeeders('11111111-1111-1111-1111-111111111111');
      expect(gblFeeders.length).toBeGreaterThan(0);
      expect(gblFeeders[0].panel_code).toBe('GBL-FP-01');

      const gblPoles = assetsService.getPoles('11111111-1111-1111-1111-111111111111');
      expect(gblPoles.length).toBe(3);
      expect(gblPoles[0].luminaireWattage).toBeDefined();
      expect(gblPoles[0].feederPanelCode).toBe('GBL-FP-01');
      expect(gblPoles[0].deviceExternalId).toBeDefined();
    });
  });

  describe('Spatial GeoJSON Generation & Bounding Box Queries', () => {
    it('generates valid RFC 7946 GeoJSON FeatureCollection', () => {
      const geojson = assetsService.getGeoJson('11111111-1111-1111-1111-111111111111');
      expect(geojson.type).toBe('FeatureCollection');
      expect(Array.isArray(geojson.features)).toBe(true);
      expect(geojson.features.length).toBeGreaterThan(0);

      const firstFeature = geojson.features[0];
      expect(firstFeature.type).toBe('Feature');
      expect(firstFeature.geometry.type).toBe('Point');
      expect(firstFeature.geometry.coordinates.length).toBe(2);
      expect(firstFeature.properties).toBeDefined();
    });

    it('filters GeoJSON features by layer type (poles vs feeders)', () => {
      const polesOnly = assetsService.getGeoJson('11111111-1111-1111-1111-111111111111', 'poles');
      expect(polesOnly.features.every((f) => f.properties.assetType === 'POLE')).toBe(true);

      const feedersOnly = assetsService.getGeoJson('11111111-1111-1111-1111-111111111111', 'feeders');
      expect(feedersOnly.features.every((f) => f.properties.assetType === 'FEEDER')).toBe(true);
    });

    it('filters GeoJSON features by geographic bounding box [minLng, minLat, maxLng, maxLat]', () => {
      // Ganderbal coordinates are around ~74.77, 34.21
      // Katra coordinates are around ~74.93, 32.99
      const ganderbalBbox = '74.75,34.20,74.80,34.25';
      const resultGbl = assetsService.getGeoJson(undefined, 'all', ganderbalBbox);
      expect(resultGbl.features.length).toBeGreaterThan(0);
      resultGbl.features.forEach((f) => {
        const [lng, lat] = f.geometry.coordinates;
        expect(lng).toBeGreaterThanOrEqual(74.75);
        expect(lng).toBeLessThanOrEqual(74.80);
        expect(lat).toBeGreaterThanOrEqual(34.20);
        expect(lat).toBeLessThanOrEqual(34.25);
      });

      // Katra bounding box should not match Ganderbal
      const emptyBbox = '0,0,1,1';
      const resultEmpty = assetsService.getGeoJson(undefined, 'all', emptyBbox);
      expect(resultEmpty.features.length).toBe(0);
    });
  });

  describe('Feeder & Pole Creation with ULB Scoping & Audit Logging', () => {
    it('creates a feeder panel with audit log and enforces unique panelCode in ULB', () => {
      const dto: CreateFeederDto = {
        ulbId: '11111111-1111-1111-1111-111111111111',
        name: 'Feeder Panel FP-02 Town Hall',
        panelCode: 'GBL-FP-02',
        capacityKw: 35.0,
        meterNumber: 'JKPDD-MTR-90999',
        phase: '3-PHASE',
      };

      const feeder = assetsService.createFeeder(dto, ganderbalOperator);
      expect(feeder.id).toBeDefined();
      expect(feeder.panel_code).toBe('GBL-FP-02');

      // Duplicate panelCode should be rejected
      expect(() => assetsService.createFeeder(dto, ganderbalOperator)).toThrow(ConflictException);

      // Audit log should be recorded
      const audit = dbService.memoryStore.auditLogs.find((a) => a.entity_id === feeder.id);
      expect(audit).toBeDefined();
      expect(audit?.action).toBe('FEEDER_CREATED');
      expect(audit?.actor_email).toBe(ganderbalOperator.email);
    });

    it('rejects cross-ULB feeder creation when operator lacks target ULB scope', () => {
      const dto: CreateFeederDto = {
        ulbId: '22222222-2222-2222-2222-222222222222', // Katra ULB
        name: 'Unauthorized Katra Feeder',
        panelCode: 'KTR-FP-99',
        capacityKw: 20.0,
      };

      // Ganderbal operator attempting to create asset in Katra
      expect(() => assetsService.createFeeder(dto, ganderbalOperator)).toThrow(ForbiddenException);
    });

    it('provisions a pole with attached luminaire and virtual device', () => {
      const dto: CreatePoleDto = {
        ulbId: '11111111-1111-1111-1111-111111111111',
        externalCode: 'GBL-POLE-NEW-01',
        heightMeters: 8.5,
        wattage: 70,
        location: { latitude: 34.218, longitude: 74.774 },
      };

      const pole = assetsService.createPole(dto, adminUser);
      expect(pole.external_code).toBe('GBL-POLE-NEW-01');
      expect(pole.luminaire).toBeDefined();
      expect(pole.luminaire?.wattage).toBe(70);
      expect(pole.device).toBeDefined();
      expect(pole.device?.external_id).toBe('SIM-GBL-POLE-NEW-01');

      // Duplicate pole externalCode should be rejected
      expect(() => assetsService.createPole(dto, adminUser)).toThrow(ConflictException);
    });
  });

  describe('Bulk Asset Import Engine', () => {
    it('successfully imports batch of valid poles, creating luminaires and devices', () => {
      const importDto: BulkImportDto = {
        ulbId: '11111111-1111-1111-1111-111111111111',
        items: [
          {
            externalCode: 'GBL-BATCH-001',
            wattage: 70,
            latitude: 34.2185,
            longitude: 74.7735,
            heightMeters: 9.0,
            lampType: 'LED',
          },
          {
            externalCode: 'GBL-BATCH-002',
            wattage: 110,
            latitude: 34.2190,
            longitude: 74.7740,
            heightMeters: 9.0,
            lampType: 'LED',
          },
        ],
      };

      const result = assetsService.importPoles(importDto, adminUser);
      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(2);
      expect(result.failedCount).toBe(0);

      // Verify poles in memory
      const p1 = assetsService.getPoleById('GBL-BATCH-001');
      expect(p1.external_code).toBe('GBL-BATCH-001');
      expect(p1.luminaire?.wattage).toBe(70);
    });

    it('validates wattage and coordinates, reporting row errors without failing whole process', () => {
      const invalidBatch: BulkImportDto = {
        ulbId: '11111111-1111-1111-1111-111111111111',
        items: [
          {
            externalCode: 'GBL-ERR-001',
            wattage: -10, // Invalid negative wattage
            latitude: 34.2185,
            longitude: 74.7735,
          },
          {
            externalCode: 'GBL-ERR-002',
            wattage: 70,
            latitude: 150.0, // Invalid latitude (> 90)
            longitude: 74.7735,
          },
          {
            externalCode: 'GBL-ERR-003',
            wattage: 35,
            latitude: 34.2185,
            longitude: 74.7735,
          },
        ],
      };

      const result = assetsService.importPoles(invalidBatch, adminUser);
      expect(result.success).toBe(false);
      expect(result.importedCount).toBe(1); // GBL-ERR-003 succeeded
      expect(result.failedCount).toBe(2);
      expect(result.errors[0].row).toBe(1);
      expect(result.errors[0].message).toContain('Wattage rating must be a positive number');
      expect(result.errors[1].row).toBe(2);
      expect(result.errors[1].message).toContain('Invalid WGS-84 coordinates');
    });

    it('rejects empty import batch with BadRequestException', () => {
      expect(() =>
        assetsService.importPoles({ ulbId: '11111111-1111-1111-1111-111111111111', items: [] }, adminUser),
      ).toThrow(BadRequestException);
    });

    it('rejects cross-ULB bulk import attempt when operator lacks target ULB scope', () => {
      const katraImport: BulkImportDto = {
        ulbId: '22222222-2222-2222-2222-222222222222',
        items: [
          {
            externalCode: 'KTR-IMP-001',
            wattage: 70,
            latitude: 32.993,
            longitude: 74.932,
          },
        ],
      };

      // Ganderbal operator attempting Katra import
      expect(() => assetsService.importPoles(katraImport, ganderbalOperator)).toThrow(ForbiddenException);
    });
  });
});
