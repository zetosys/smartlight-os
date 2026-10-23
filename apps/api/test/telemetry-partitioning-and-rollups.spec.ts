import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TelemetryService } from '../src/modules/telemetry/telemetry.service';
import { DatabaseService } from '../src/database/database.service';

describe('Prompt 5: Telemetry Storage, Time-Partitioning & Aggregations', () => {
  let telemetryService: TelemetryService;
  let dbService: DatabaseService;

  beforeEach(() => {
    dbService = new DatabaseService();
    dbService.seedFullFleet(365);
    telemetryService = new TelemetryService(dbService);
  });

  describe('PostgreSQL Time-Partitioned DDL & Migration Validation', () => {
    it('contains DDL for all 12 monthly partitions for 2026', () => {
      const migrationPath = path.join(__dirname, '../src/database/migrations/005_telemetry_partitions.sql');
      expect(fs.existsSync(migrationPath)).toBe(true);

      const sql = fs.readFileSync(migrationPath, 'utf8');

      // Verify all 12 monthly partitions exist
      for (let m = 1; m <= 12; m++) {
        const monthStr = String(m).padStart(2, '0');
        expect(sql).toContain(`telemetry_y2026m${monthStr}`);
      }

      // Verify continuous rollups tables
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS telemetry_hourly_rollups');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS telemetry_daily_rollups');

      // Verify retention pruning function
      expect(sql).toContain('prune_telemetry_partitions');
    });
  });

  describe('Time-Series Downsampling & Resolution Bucketing', () => {
    it('retrieves daily rollups with resolution: 1d', () => {
      const dailyPoints = telemetryService.getTelemetryTimeSeries({
        ulbId: '11111111-1111-1111-1111-111111111111',
        resolution: '1d',
        limit: 7,
      });

      expect(dailyPoints.length).toBeGreaterThan(0);
      expect(dailyPoints[0].energyKwh).toBeGreaterThan(1000);
      expect(dailyPoints[0].burningHours).toBeGreaterThan(10);
      expect(dailyPoints[0].powerFactor).toBeGreaterThanOrEqual(0.95);
    });

    it('retrieves hourly rollups with resolution: 1h', () => {
      const hourlyPoints = telemetryService.getTelemetryTimeSeries({
        ulbId: '11111111-1111-1111-1111-111111111111',
        resolution: '1h',
        limit: 24,
      });

      expect(hourlyPoints.length).toBeGreaterThan(0);
      expect(hourlyPoints[0].voltage).toBeGreaterThan(220);
      expect(hourlyPoints[0].powerWatts).toBeGreaterThan(0);
    });

    it('aggregates raw readings into 5m buckets with resolution: 5m', () => {
      // Ingest test batch readings with specific timestamps
      const baseTime = new Date('2026-10-23T20:00:00Z').getTime();
      dbService.memoryStore.telemetry.push(
        {
          device_id: 'dev-1',
          ulb_id: '11111111-1111-1111-1111-111111111111',
          observed_at: new Date(baseTime + 10000).toISOString(),
          voltage: 230.0,
          current_amp: 0.31,
          power_watts: 70.0,
          power_factor: 0.97,
          energy_kwh: 10.5,
        },
        {
          device_id: 'dev-2',
          ulb_id: '11111111-1111-1111-1111-111111111111',
          observed_at: new Date(baseTime + 30000).toISOString(),
          voltage: 232.0,
          current_amp: 0.32,
          power_watts: 70.0,
          power_factor: 0.97,
          energy_kwh: 10.6,
        },
      );

      const points = telemetryService.getTelemetryTimeSeries({
        ulbId: '11111111-1111-1111-1111-111111111111',
        resolution: '5m',
      });

      expect(points.length).toBeGreaterThan(0);
      const testBucket = points.find((p) => p.timestamp === '2026-10-23T20:00:00.000Z');
      expect(testBucket).toBeDefined();
      expect(testBucket?.voltage).toBe(231.0); // average of 230 and 232
      expect(testBucket?.powerWatts).toBe(140.0); // sum of 70 and 70
    });
  });

  describe('CCMS Feeder Load Profiles & 3-Phase Distribution', () => {
    it('computes feeder load profiles with active power and 3-phase balancing', () => {
      const feeders = telemetryService.getFeederLoadProfiles('11111111-1111-1111-1111-111111111111');
      expect(feeders.length).toBeGreaterThan(0);

      const firstFeeder = feeders[0];
      expect(firstFeeder.feederCode).toBeDefined();
      expect(firstFeeder.totalLuminaires).toBeGreaterThan(0);
      expect(firstFeeder.currentPowerKw).toBeGreaterThan(0);

      // Verify 3-phase split: Phase R + Phase Y + Phase B = currentPowerKw (+/- 0.05 margin)
      const sumPhases = +(
        firstFeeder.phaseDistribution.phaseR +
        firstFeeder.phaseDistribution.phaseY +
        firstFeeder.phaseDistribution.phaseB
      ).toFixed(2);
      expect(Math.abs(sumPhases - firstFeeder.currentPowerKw)).toBeLessThanOrEqual(0.05);

      // Verify 24-hour load curve
      expect(firstFeeder.hourlyLoad.length).toBe(24);
      expect(firstFeeder.hourlyLoad[0].hour).toBe('00:00');
      expect(firstFeeder.hourlyLoad[23].hour).toBe('23:00');
    });

    it('retrieves single feeder load profile by ID', () => {
      const feeders = telemetryService.getFeederLoadProfiles('11111111-1111-1111-1111-111111111111');
      const target = feeders[0];

      const single = telemetryService.getFeederLoadProfileById(target.feederId);
      expect(single.feederId).toBe(target.feederId);
      expect(single.currentPowerKw).toBe(target.currentPowerKw);
    });
  });

  describe('Municipal Energy Accounting & CO2 Reductions', () => {
    it('computes energy savings and environmental impact against baseline HPSV', () => {
      const gblEnergy = telemetryService.getEnergySummary('11111111-1111-1111-1111-111111111111', 'month');

      expect(gblEnergy.totalEnergyKwh).toBeGreaterThan(0);
      expect(gblEnergy.baselineEnergyKwh).toBeGreaterThan(gblEnergy.totalEnergyKwh);
      expect(gblEnergy.energySavingsKwh).toBeGreaterThan(0);
      // LED retrofit energy savings must exceed 70%
      expect(gblEnergy.energySavingsPercent).toBeGreaterThan(70);

      // Environmental CO2 reduction (0.82 kg/kWh)
      expect(gblEnergy.co2SavedKg).toBeCloseTo(+(gblEnergy.energySavingsKwh * 0.82).toFixed(1), 0);

      // Financial savings (Rs 7.50 / kWh)
      expect(gblEnergy.costSavingsInr).toBeGreaterThan(0);

      // Daily trend array
      expect(gblEnergy.dailyTrend.length).toBe(7);
      expect(gblEnergy.dailyTrend[0].savingsKwh).toBeGreaterThan(0);
    });

    it('calculates Katra energy summary for week period', () => {
      const ktrEnergy = telemetryService.getEnergySummary('22222222-2222-2222-2222-222222222222', 'week');
      expect(ktrEnergy.period).toBe('week');
      expect(ktrEnergy.energySavingsPercent).toBeGreaterThan(75);
    });
  });

  describe('Burning Hours & SLA Compliance Auditing', () => {
    it('computes average burning hours and SLA compliance rate', () => {
      const gblBurning = telemetryService.getBurningHoursSummary('11111111-1111-1111-1111-111111111111');

      expect(gblBurning.averageBurningHoursPerDay).toBeGreaterThan(10);
      expect(gblBurning.slaTargetHours).toBe(11.5);
      expect(gblBurning.slaComplianceRate).toBeGreaterThan(90);
      expect(gblBurning.feederBreakdown.length).toBeGreaterThan(0);
      expect(gblBurning.feederBreakdown[0].compliance).toBeGreaterThan(80);
    });
  });

  describe('Continuous Aggregation & Rollup Engine', () => {
    it('executes computeRollups() and creates hourly and daily rollup records', () => {
      const initialHourly = dbService.memoryStore.hourlyRollups.length;
      const initialDaily = dbService.memoryStore.dailyRollups.length;

      const result = telemetryService.computeRollups();

      expect(result.hourlyRollupsCreated).toBeGreaterThan(0);
      expect(result.dailyRollupsCreated).toBeGreaterThan(0);
      expect(dbService.memoryStore.hourlyRollups.length).toBe(initialHourly + result.hourlyRollupsCreated);
      expect(dbService.memoryStore.dailyRollups.length).toBe(initialDaily + result.dailyRollupsCreated);
    });
  });
});
