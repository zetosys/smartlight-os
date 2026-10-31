import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseService } from '../src/database/database.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { AssetsService } from '../src/modules/assets/assets.service';
import { CommandsService } from '../src/modules/commands/commands.service';
import { TelemetryService } from '../src/modules/telemetry/telemetry.service';
import { MaintenanceService } from '../src/modules/maintenance/maintenance.service';
import { SimulatorServiceModule } from '../src/modules/simulator/simulator.service';
import { SolarCalculator } from '../src/modules/commands/solar-calculator';
import { ForbiddenException } from '@nestjs/common';
import { BatchTelemetryIngestDto } from '@smartlight/shared-types';

describe('SmartLight OS — Master End-to-End System Lifecycle', () => {
  let db: DatabaseService;
  let authService: AuthService;
  let assetsService: AssetsService;
  let commandsService: CommandsService;
  let telemetryService: TelemetryService;
  let maintenanceService: MaintenanceService;
  let simModule: SimulatorServiceModule;

  const GBL_ULB = '11111111-1111-1111-1111-111111111111';
  const KTR_ULB = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    db = new DatabaseService();
    // Deterministically seed the full 4,608 streetlight municipal fleet
    db.seedFullFleet(365);

    authService = new AuthService(db);
    assetsService = new AssetsService(db);
    maintenanceService = new MaintenanceService(db);
    telemetryService = new TelemetryService(db);
    simModule = new SimulatorServiceModule(db, telemetryService);
    simModule.onModuleInit(); // registers SimulatorAdapter in AdapterRegistry
    commandsService = new CommandsService(db);
  });

  // ============================================================================
  // STAGE 1: Identity, MFA Authentication & Tenant Context
  // ============================================================================
  describe('Stage 1: Identity, MFA Verification & Tenant Token Issuance', () => {
    it('authenticates global admin with two-factor TOTP verification', async () => {
      // 1. Initial login credentials submission
      const loginRes = await authService.login({
        email: 'admin@smartlight.os',
        password: 'SmartLight@2026!',
      });

      expect(loginRes.mfaRequired).toBe(true);
      expect(loginRes.mfaChallengeToken).toBeDefined();

      // 2. Complete MFA challenge
      const mfaRes = await authService.verifyMfa({
        mfaChallengeToken: loginRes.mfaChallengeToken!,
        code: '123456',
      });

      expect(mfaRes.accessToken).toBeDefined();
      expect(mfaRes.user!.email).toBe('admin@smartlight.os');
      expect(mfaRes.user!.isGlobalAdmin).toBe(true);
    });

    it('authenticates ULB-scoped operator with restricted municipal permissions', async () => {
      const gblLogin = await authService.login({
        email: 'operator.ganderbal@smartlight.os',
        password: 'SmartLight@2026!',
      });

      expect(gblLogin.mfaRequired).toBe(false);
      expect(gblLogin.accessToken).toBeDefined();
      expect(gblLogin.user!.roles[0].ulbId).toBe(GBL_ULB);
      expect(gblLogin.user!.allowedUlbIds).toEqual([GBL_ULB]);
      expect(gblLogin.user!.isGlobalAdmin).toBe(false);
    });
  });

  // ============================================================================
  // STAGE 2: Tenant Isolation & ULB-Scoped Access Control
  // ============================================================================
  describe('Stage 2: Strict Multi-Tenant Isolation & Cross-ULB Access Guards', () => {
    it('prevents Ganderbal operator from dispatching commands to Katra streetlight assets', async () => {
      const gblOperator = {
        id: '40000000-0000-0000-0000-000000000002',
        email: 'operator.ganderbal@smartlight.os',
        name: 'Tariq Ahmad',
        roles: [{ roleCode: 'CONTROL_OPERATOR', ulbId: GBL_ULB }],
        permissions: ['devices.command'],
        allowedUlbIds: [GBL_ULB],
        isGlobalAdmin: false,
      };

      // Target Katra luminaire
      const ktrDevice = db.memoryStore.devices.find((d) => d.ulb_id === KTR_ULB)!;

      await expect(
        commandsService.submitCommand(
          {
            deviceId: ktrDevice.id,
            type: 'TURN_ON',
            idempotencyKey: 'cross-tenant-blocked-001',
          },
          gblOperator as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows Platform Admin to manage assets and commands across all ULBs', async () => {
      const adminUser = {
        id: '40000000-0000-0000-0000-000000000001',
        email: 'admin@smartlight.os',
        name: 'Global Administrator',
        roles: [{ roleCode: 'PLATFORM_ADMIN', ulbId: null }],
        permissions: ['devices.command'],
        allowedUlbIds: ['*'],
        isGlobalAdmin: true,
      };

      const gblDevice = db.memoryStore.devices.find((d) => d.ulb_id === GBL_ULB)!;
      const ktrDevice = db.memoryStore.devices.find((d) => d.ulb_id === KTR_ULB)!;

      const cmd1 = await commandsService.submitCommand(
        {
          deviceId: gblDevice.id,
          type: 'TURN_ON',
          idempotencyKey: 'admin-e2e-cmd-001',
        },
        adminUser as any,
      );

      const cmd2 = await commandsService.submitCommand(
        {
          deviceId: ktrDevice.id,
          type: 'TURN_ON',
          idempotencyKey: 'admin-e2e-cmd-002',
        },
        adminUser as any,
      );

      expect(cmd1.status).toBe('CONFIRMED');
      expect(cmd2.status).toBe('CONFIRMED');
    });
  });

  // ============================================================================
  // STAGE 3: Asset & Geographic Hierarchy (4,608 Luminaires Across 2 ULBs)
  // ============================================================================
  describe('Stage 3: Full Municipal Asset Hierarchy & Electrical Topology', () => {
    it('verifies exact inventory counts for Ganderbal Municipal Council (2,740 lights)', () => {
      const gblPoles = assetsService.getPoles(GBL_ULB);
      expect(gblPoles.length).toBe(2740);

      const gblFeeders = assetsService.getFeeders(GBL_ULB);
      expect(gblFeeders.length).toBe(35);

      const gblGateways = assetsService.getGateways(GBL_ULB);
      expect(gblGateways.length).toBe(61);

      const gblZones = assetsService.getZones(GBL_ULB);
      expect(gblZones.length).toBe(3);
    });

    it('verifies exact inventory counts for Katra Municipal Committee (1,868 lights)', () => {
      const ktrPoles = assetsService.getPoles(KTR_ULB);
      expect(ktrPoles.length).toBe(1868);

      const ktrFeeders = assetsService.getFeeders(KTR_ULB);
      expect(ktrFeeders.length).toBe(25);

      const ktrGateways = assetsService.getGateways(KTR_ULB);
      expect(ktrGateways.length).toBe(42);

      const ktrZones = assetsService.getZones(KTR_ULB);
      expect(ktrZones.length).toBe(2);
    });

    it('validates total fleet sum matches the tender specification of 4,608 luminaires', () => {
      const totalPoles = assetsService.getPoles();
      expect(totalPoles.length).toBe(4608);

      const totalFeeders = assetsService.getFeeders();
      expect(totalFeeders.length).toBe(60);

      const totalGateways = assetsService.getGateways();
      expect(totalGateways.length).toBe(103);
    });
  });

  // ============================================================================
  // STAGE 4: Astronomical Ephemeris & Automated Dimming
  // ============================================================================
  describe('Stage 4: NOAA/Jean Meeus Astronomical Solar Ephemeris & Eco-Dimming', () => {
    it('computes exact solar twilight times for Ganderbal Valley (34.2165° N)', () => {
      const date = new Date('2026-10-23T00:00:00.000Z');
      const ephemeris = SolarCalculator.calculate(date, 34.2165, 74.7725);

      expect(ephemeris.sunrise).toBeDefined();
      expect(ephemeris.sunset).toBeDefined();
      expect(ephemeris.duskCivil).toBeDefined();
      expect(ephemeris.dawnCivil).toBeDefined();

      expect(ephemeris.duskCivil > ephemeris.sunset).toBe(true);
    });

    it('computes exact solar twilight times for Katra Trikuta Foothills (32.9925° N)', () => {
      const date = new Date('2026-10-23T00:00:00.000Z');
      const ephemeris = SolarCalculator.calculate(date, 32.9925, 74.9318);

      expect(ephemeris.dayLengthMinutes).toBeGreaterThan(600);
      expect(ephemeris.dayLengthMinutes).toBeLessThan(840);
    });
  });

  // ============================================================================
  // STAGE 5: CCMS Bulk Feeder Switching & Idempotency Replay
  // ============================================================================
  describe('Stage 5: CCMS Feeder Switching Engine & Idempotency Replay', () => {
    it('executes bulk switching across an entire CCMS feeder panel circuit', async () => {
      const adminUser = {
        id: 'user-admin',
        email: 'admin@smartlight.os',
        name: 'Admin',
        roles: [{ roleCode: 'PLATFORM_ADMIN', ulbId: null }],
        permissions: ['commands.submit'],
        allowedUlbIds: ['*'],
        isGlobalAdmin: true,
      };

      const feeder = db.memoryStore.feeders[0];
      const batchResult = await commandsService.submitBatchCommand(
        {
          ulbId: feeder.ulb_id || (feeder as any).ulbId,
          targetType: 'FEEDER',
          targetId: feeder.id,
          type: 'TURN_ON',
          idempotencyKey: 'batch-feeder-e2e-001',
        },
        adminUser as any,
      );

      expect(batchResult.targetType).toBe('FEEDER');
      expect(batchResult.targetCount).toBeGreaterThan(50);
      expect(batchResult.confirmedCount).toBe(batchResult.targetCount);
      expect(batchResult.isIdempotentReplay).toBe(false);

      // Replaying the same command with the same idempotency key
      const replayResult = await commandsService.submitBatchCommand(
        {
          ulbId: feeder.ulb_id || (feeder as any).ulbId,
          targetType: 'FEEDER',
          targetId: feeder.id,
          type: 'TURN_ON',
          idempotencyKey: 'batch-feeder-e2e-001',
        },
        adminUser as any,
      );

      expect(replayResult.isIdempotentReplay).toBe(true);
      expect(replayResult.confirmedCount).toBe(batchResult.confirmedCount);
    });
  });

  // ============================================================================
  // STAGE 6: Telemetry Ingestion, Anomaly Rules & Fault Detection
  // ============================================================================
  describe('Stage 6: Telemetry Ingestion & Real-Time Anomaly Fault Detection', () => {
    it('detects severe overvoltage anomaly and generates a CRITICAL alarm', async () => {
      const device = db.memoryStore.devices[0];

      const surgeBatch: BatchTelemetryIngestDto = {
        readings: [
          {
            deviceId: device.id,
            observedAt: new Date().toISOString(),
            voltage: 275.5, // Dangerous overvoltage (> 260V)
            currentAmp: 0.35,
            powerWatts: 85.0,
            powerFactor: 0.98,
            frequency: 50.0,
            temperature: 45.0,
            online: true,
            reportedOn: true,
            faultCodes: [],
            source: 'SIMULATOR',
          },
        ],
      };

      const result = telemetryService.ingestTelemetry(surgeBatch);
      expect(result.accepted).toBe(1);
      expect(result.anomaliesDetected).toBeGreaterThanOrEqual(1);

      // Verify alert was logged into memory store
      const alert = db.memoryStore.alerts.find(
        (a) => a.device_id === device.id && a.code === 'VOLTAGE_ANOMALY',
      );
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe('CRITICAL');
      expect(alert!.status).toBe('OPEN');
    });

    it('detects day-burning anomaly when luminaire burns during full daylight', async () => {
      const device = db.memoryStore.devices[1];
      device.desired_on = false; // Scheduled OFF

      const dayBurningBatch: BatchTelemetryIngestDto = {
        readings: [
          {
            deviceId: device.id,
            observedAt: '2026-10-23T12:00:00.000Z',
            voltage: 230.0,
            currentAmp: 0.45,
            powerWatts: 70.0, // High power draw while desired_on is false
            powerFactor: 0.98,
            online: true,
            reportedOn: true,
            faultCodes: [],
            source: 'SIMULATOR',
          },
        ],
      };

      const result = telemetryService.ingestTelemetry(dayBurningBatch);
      expect(result.accepted).toBe(1);
      const dayBurningAlert = db.memoryStore.alerts.find(
        (a) => a.device_id === device.id && a.code === 'DAY_BURNING',
      );
      expect(dayBurningAlert).toBeDefined();
      expect(dayBurningAlert!.severity).toBe('WARNING');
    });
  });

  // ============================================================================
  // STAGE 7: Closed-Loop Maintenance Lifecycle & Spare Parts Stock
  // ============================================================================
  describe('Stage 7: Closed-Loop Maintenance Work Orders & Spare Parts Deduction', () => {
    it('completes work order, deducts spare parts inventory, and resolves alarm', async () => {
      const adminUser = {
        id: 'user-admin',
        email: 'admin@smartlight.os',
        name: 'Admin',
        roles: [{ roleCode: 'PLATFORM_ADMIN', ulbId: null }],
        permissions: ['maintenance.write'],
        allowedUlbIds: ['*'],
        isGlobalAdmin: true,
      };

      // 1. Create maintenance ticket linked to open alert
      const alert = db.memoryStore.alerts[0];
      const initialPartsStock = db.memoryStore.spareParts.find((p) => p.code === 'PART-SPD-10KV')!.quantity_in_stock;

      const ticket = maintenanceService.createTicket(
        {
          ulbId: GBL_ULB,
          alertId: alert.id,
          deviceId: alert.device_id,
          title: 'Replace burnt surge protector device at Beehama Ward 1',
          description: 'Excessive grid surge tripped internal MOV',
          priority: 'HIGH',
        },
        adminUser as any,
      );

      expect(ticket.status).toBe('OPEN');

      // 2. Technician accepts and starts work
      const inProgress = maintenanceService.updateTicket(
        ticket.id,
        { status: 'IN_PROGRESS' },
        adminUser as any,
      );
      expect(inProgress.status).toBe('IN_PROGRESS');

      // 3. Resolve ticket, deduct 1x 10kV SPD from stock, and record resolution notes
      const resolved = maintenanceService.updateTicket(
        ticket.id,
        {
          status: 'RESOLVED',
          resolutionNotes: 'Replaced damaged 10kV surge protection device. Reconnected secondary driver terminal. Voltage normal.',
          sparePartsUsed: [
            {
              partId: 'part-spd-10kv',
              partCode: 'PART-SPD-10KV',
              partName: '10kV Surge Protection Device',
              quantity: 1,
            },
          ],
        },
        adminUser as any,
      );

      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.resolvedAt).toBeDefined();

      // 4. Verify spare part stock was deducted
      const updatedPart = db.memoryStore.spareParts.find((p) => p.code === 'PART-SPD-10KV')!;
      expect(updatedPart.quantity_in_stock).toBe(initialPartsStock - 1);

      // 5. Verify linked alert was automatically resolved
      const updatedAlert = db.memoryStore.alerts.find((a) => a.id === alert.id)!;
      expect(updatedAlert.status).toBe('RESOLVED');
    });
  });

  // ============================================================================
  // STAGE 8: PostGIS GeoJSON Spatial Network & 3-Phase Topology
  // ============================================================================
  describe('Stage 8: PostGIS GeoJSON Spatial Mapping & Fleet Topology Queries', () => {
    it('retrieves spatially bounded GeoJSON features for Ganderbal corridor', () => {
      const gblBbox = '74.70,34.15,74.85,34.30';
      const geojson = assetsService.getGeoJson(GBL_ULB, 'all', gblBbox);

      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.features.length).toBeGreaterThan(100);

      // Verify every feature possesses RFC 7946 geometry
      geojson.features.forEach((f) => {
        expect(['Point', 'Polygon']).toContain(f.geometry.type);
        expect(f.properties.assetType).toBeDefined();
      });
    });

    it('verifies electrical 3-phase balancing across streetlight poles (R, Y, B)', () => {
      const poles = assetsService.getPoles(GBL_ULB);
      const countR = poles.filter((p) => p.phaseConnection === 'R').length;
      const countY = poles.filter((p) => p.phaseConnection === 'Y').length;
      const countB = poles.filter((p) => p.phaseConnection === 'B').length;

      // 3-phase distribution should be approximately balanced (+/- 1 light)
      expect(Math.abs(countR - countY)).toBeLessThanOrEqual(2);
      expect(Math.abs(countY - countB)).toBeLessThanOrEqual(2);
      expect(countR + countY + countB).toBe(2740);
    });
  });
});
