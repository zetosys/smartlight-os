import { describe, it, expect, beforeEach } from 'vitest';
import { TelemetryService } from '../src/modules/telemetry/telemetry.service';
import { SimulatorServiceModule } from '../src/modules/simulator/simulator.service';
import { DatabaseService } from '../src/database/database.service';
import { BatchTelemetryIngestDto } from '@smartlight/shared-types';

describe('Telemetry Ingestion, Anomaly Rules Engine & Fleet Scaling (Prompt 3)', () => {
  let telemetryService: TelemetryService;
  let simService: SimulatorServiceModule;
  let dbService: DatabaseService;

  beforeEach(() => {
    dbService = new DatabaseService();
    telemetryService = new TelemetryService(dbService);
    simService = new SimulatorServiceModule(dbService, telemetryService);
    simService.onModuleInit();
  });

  describe('Full 4,608 Fleet Scaling & Seeding', () => {
    it('seeds the full 4,608 fleet with precise municipal wattage allocations', () => {
      const status = simService.seedFleet(365);
      expect(status.activeDevices).toBe(4608);

      // Verify Ganderbal breakdown
      expect(status.ulbBreakdown.ganderbal.total).toBe(2740);
      expect(status.ulbBreakdown.ganderbal['35W']).toBe(859);
      expect(status.ulbBreakdown.ganderbal['70W']).toBe(1542);
      expect(status.ulbBreakdown.ganderbal['110W']).toBe(339);

      // Verify Katra breakdown
      expect(status.ulbBreakdown.katra.total).toBe(1868);
      expect(status.ulbBreakdown.katra['35W']).toBe(1364);
      expect(status.ulbBreakdown.katra['70W']).toBe(381);
      expect(status.ulbBreakdown.katra['110W']).toBe(123);

      // Verify total fleet breakdown
      expect(status.fleetBreakdown['35W']).toBe(859 + 1364);
      expect(status.fleetBreakdown['70W']).toBe(1542 + 381);
      expect(status.fleetBreakdown['110W']).toBe(339 + 123);
      expect(
        status.fleetBreakdown['35W'] + status.fleetBreakdown['70W'] + status.fleetBreakdown['110W'],
      ).toBe(4608);
    });
  });

  describe('Batch Telemetry Ingestion Pipeline', () => {
    it('ingests batch telemetry, updates device reported state, and buffers readings', () => {
      simService.seedFleet(365);

      const targetDev = dbService.memoryStore.devices[0];
      const nowIso = new Date().toISOString();

      const batchDto: BatchTelemetryIngestDto = {
        readings: [
          {
            deviceId: targetDev.external_id,
            observedAt: nowIso,
            voltage: 231.5,
            currentAmp: 0.49,
            powerWatts: 109.8,
            powerFactor: 0.97,
            frequency: 50.02,
            temperature: 36.2,
            energyKwh: 52.4,
            burningHours: 421,
            online: true,
            reportedOn: true,
            faultCodes: [],
            source: 'SIMULATOR',
          },
        ],
      };

      const result = telemetryService.ingestTelemetry(batchDto);
      expect(result.accepted).toBe(1);

      // Check device updated reported state
      expect(targetDev.reported_on).toBe(true);
      expect(targetDev.is_online).toBe(true);
      expect(targetDev.last_seen_at).toBe(nowIso);

      // Check latest telemetry query
      const latest = telemetryService.getLatestTelemetry(targetDev.external_id);
      expect(latest.voltage).toBe(231.5);
      expect(latest.power_watts).toBe(109.8);
      expect(latest.power_factor).toBe(0.97);
    });
  });

  describe('Automated Anomaly Detection & Alert Tripping', () => {
    it('trips LAMP_FAILURE (Burnout) alert when device is desired ON but power draws < 5W', () => {
      const dev = dbService.memoryStore.devices[0];
      dev.desired_on = true; // Commanded ON

      const nowIso = new Date().toISOString();
      const batch: BatchTelemetryIngestDto = {
        readings: [
          {
            deviceId: dev.id,
            observedAt: nowIso,
            voltage: 230.0,
            currentAmp: 0.01,
            powerWatts: 1.2, // Burnout symptom
            online: true,
            reportedOn: true,
            faultCodes: [],
            source: 'SIMULATOR',
          },
        ],
      };

      const result = telemetryService.ingestTelemetry(batch);
      expect(result.anomaliesDetected).toBeGreaterThanOrEqual(1);

      const alert = dbService.memoryStore.alerts.find(
        (a) => a.device_id === dev.id && a.code === 'LAMP_FAILURE',
      );
      expect(alert).toBeDefined();
      expect(alert?.status).toBe('OPEN');
      expect(alert?.severity).toBe('MAJOR');
    });

    it('trips DAY_BURNING alert when device is scheduled OFF but draws > 20W', () => {
      const dev = dbService.memoryStore.devices[1];
      dev.desired_on = false; // Scheduled OFF

      const nowIso = new Date().toISOString();
      const batch: BatchTelemetryIngestDto = {
        readings: [
          {
            deviceId: dev.id,
            observedAt: nowIso,
            voltage: 232.0,
            currentAmp: 0.31,
            powerWatts: 71.5, // Day burning
            online: true,
            reportedOn: true,
            faultCodes: [],
            source: 'SIMULATOR',
          },
        ],
      };

      telemetryService.ingestTelemetry(batch);

      const alert = dbService.memoryStore.alerts.find(
        (a) => a.device_id === dev.id && a.code === 'DAY_BURNING',
      );
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe('WARNING');
    });

    it('trips VOLTAGE_ANOMALY when grid voltage violates safety envelope (< 185V or > 260V)', () => {
      const dev = dbService.memoryStore.devices[2];

      const underVoltageBatch: BatchTelemetryIngestDto = {
        readings: [
          {
            deviceId: dev.id,
            observedAt: new Date().toISOString(),
            voltage: 172.0, // Voltage sag
            online: true,
            faultCodes: [],
            source: 'SIMULATOR',
          },
        ],
      };

      telemetryService.ingestTelemetry(underVoltageBatch);

      const alert = dbService.memoryStore.alerts.find(
        (a) => a.device_id === dev.id && a.code === 'VOLTAGE_ANOMALY',
      );
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe('CRITICAL');
    });

    it('deduplicates active alerts so multiple ticks do not create redundant alert IDs', () => {
      const dev = dbService.memoryStore.devices[0];
      dev.desired_on = true;

      const batch: BatchTelemetryIngestDto = {
        readings: [
          {
            deviceId: dev.id,
            observedAt: new Date().toISOString(),
            voltage: 230.0,
            powerWatts: 1.2,
            online: true,
            faultCodes: [],
            source: 'SIMULATOR',
          },
        ],
      };

      // Ingest twice
      telemetryService.ingestTelemetry(batch);
      telemetryService.ingestTelemetry(batch);

      const burnoutAlerts = dbService.memoryStore.alerts.filter(
        (a) => a.device_id === dev.id && a.code === 'LAMP_FAILURE' && a.status === 'OPEN',
      );
      expect(burnoutAlerts.length).toBe(1);
    });
  });

  describe('Fault Injection & Simulator Controller Actions', () => {
    it('injects fault into fleet percentage and verifies telemetry reflection', () => {
      simService.seedFleet(365);

      const injectRes = simService.injectFault({
        faultCode: 'LAMP_FAILURE',
        percentage: 2,
      });

      expect(injectRes.affectedCount).toBeGreaterThanOrEqual(1);

      const status = simService.getStatus();
      expect(status.activeFaults.length).toBe(injectRes.affectedCount);

      // Clear faults
      simService.clearFaults();
      expect(simService.getStatus().activeFaults.length).toBe(0);
    });

    it('starts and stops background telemetry emission loop', () => {
      const startStatus = simService.startLoop(5000);
      expect(startStatus.isRunning).toBe(true);

      const stopStatus = simService.stopLoop();
      expect(stopStatus.isRunning).toBe(false);
    });
  });
});
