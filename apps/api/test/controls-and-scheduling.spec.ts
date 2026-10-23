import { describe, it, expect, beforeEach } from 'vitest';
import { CommandsService } from '../src/modules/commands/commands.service';
import { DatabaseService } from '../src/database/database.service';
import { SimulatorServiceModule } from '../src/modules/simulator/simulator.service';
import { TelemetryService } from '../src/modules/telemetry/telemetry.service';
import { SolarCalculator } from '../src/modules/commands/solar-calculator';
import { AuthContextUser, CreateBatchCommandDto, CreateScheduleDto } from '@smartlight/shared-types';

describe('Prompt 4: Controls, Bulk Operations & Astronomical Scheduling', () => {
  let commandsService: CommandsService;
  let dbService: DatabaseService;
  let simModule: SimulatorServiceModule;

  const adminUser: AuthContextUser = {
    id: 'user-admin',
    email: 'admin@smartlight.os',
    name: 'Admin',
    roles: [{ roleCode: 'PLATFORM_ADMIN', ulbId: null }],
    permissions: ['devices.command', 'schedules.manage'],
    allowedUlbIds: ['*'],
    isGlobalAdmin: true,
  };

  const ganderbalOperator: AuthContextUser = {
    id: 'user-gbl',
    email: 'operator.gbl@smartlight.os',
    name: 'Ganderbal Ops',
    roles: [{ roleCode: 'CONTROL_OPERATOR', ulbId: '11111111-1111-1111-1111-111111111111' }],
    permissions: ['devices.command', 'schedules.manage'],
    allowedUlbIds: ['11111111-1111-1111-1111-111111111111'],
    isGlobalAdmin: false,
  };

  const katraOperator: AuthContextUser = {
    id: 'user-katra',
    email: 'operator.katra@smartlight.os',
    name: 'Katra Ops',
    roles: [{ roleCode: 'CONTROL_OPERATOR', ulbId: '22222222-2222-2222-2222-222222222222' }],
    permissions: ['devices.command', 'schedules.manage'],
    allowedUlbIds: ['22222222-2222-2222-2222-222222222222'],
    isGlobalAdmin: false,
  };

  beforeEach(() => {
    dbService = new DatabaseService();
    simModule = new SimulatorServiceModule(dbService, new TelemetryService(dbService));
    simModule.onModuleInit();
    commandsService = new CommandsService(dbService);
  });

  describe('Astronomical Solar Algorithm (NOAA/Meeus)', () => {
    it('calculates valid solar times for Ganderbal (lat 34.2165, lng 74.7725)', () => {
      // Spring equinox
      const solar = SolarCalculator.calculate(new Date('2026-03-21T12:00:00Z'), 34.2165, 74.7725, 5.5);

      expect(solar.sunrise).toMatch(/^\d{2}:\d{2}$/);
      expect(solar.sunset).toMatch(/^\d{2}:\d{2}$/);
      expect(solar.dawnCivil).toMatch(/^\d{2}:\d{2}$/);
      expect(solar.duskCivil).toMatch(/^\d{2}:\d{2}$/);
      expect(solar.dayLengthMinutes).toBeGreaterThan(700);
      expect(solar.dayLengthMinutes).toBeLessThan(750);
      expect(solar.solarNoon).toMatch(/^\d{2}:\d{2}$/);
    });

    it('accurately captures summer vs winter day length delta for Katra', () => {
      // Summer Solstice: June 21
      const summer = SolarCalculator.calculate(new Date('2026-06-21T12:00:00Z'), 32.9925, 74.9318, 5.5);
      // Winter Solstice: Dec 21
      const winter = SolarCalculator.calculate(new Date('2026-12-21T12:00:00Z'), 32.9925, 74.9318, 5.5);

      expect(summer.dayLengthMinutes).toBeGreaterThan(winter.dayLengthMinutes);
      // Delta should be > 240 minutes (4+ hours difference in J&K)
      expect(summer.dayLengthMinutes - winter.dayLengthMinutes).toBeGreaterThan(240);
    });
  });

  describe('Bulk & Feeder-Level Command Dispatcher', () => {
    it('executes batch switching for a CCMS feeder panel and updates states', async () => {
      const feeder = dbService.memoryStore.feeders.find(
        (f) => f.ulb_id === '11111111-1111-1111-1111-111111111111',
      );
      expect(feeder).toBeDefined();

      const batchDto: CreateBatchCommandDto = {
        ulbId: '11111111-1111-1111-1111-111111111111',
        type: 'TURN_ON',
        targetType: 'FEEDER',
        targetId: feeder!.id,
        idempotencyKey: 'batch-feeder-test-01',
      };

      const result = await commandsService.submitBatchCommand(batchDto, ganderbalOperator);

      expect(result.batchId).toBeDefined();
      expect(result.targetCount).toBeGreaterThan(0);
      expect(result.confirmedCount).toBe(result.targetCount);
      expect(result.failedCount).toBe(0);
      expect(result.isIdempotentReplay).toBe(false);

      // Verify that all devices under this feeder have desired_on = true
      const feederDevices = dbService.memoryStore.devices.filter((d) => d.feeder_id === feeder!.id);
      expect(feederDevices.length).toBe(result.targetCount);
      for (const d of feederDevices) {
        expect(d.desired_on).toBe(true);
        expect(d.reported_on).toBe(true);
      }
    });

    it('enforces batch idempotency: duplicate batch returns original response', async () => {
      const batchDto: CreateBatchCommandDto = {
        ulbId: '11111111-1111-1111-1111-111111111111',
        type: 'TURN_OFF',
        targetType: 'ULB',
        idempotencyKey: 'batch-idem-unique-key-99',
      };

      const first = await commandsService.submitBatchCommand(batchDto, adminUser);
      expect(first.isIdempotentReplay).toBe(false);

      const second = await commandsService.submitBatchCommand(batchDto, adminUser);
      expect(second.isIdempotentReplay).toBe(true);
      expect(second.batchId).toBe(first.batchId);
      expect(second.confirmedCount).toBe(first.confirmedCount);
    });

    it('rejects cross-ULB batch command when operator lacks scope', async () => {
      // Katra operator attempting to command Ganderbal ULB fleet
      const batchDto: CreateBatchCommandDto = {
        ulbId: '11111111-1111-1111-1111-111111111111',
        type: 'TURN_ON',
        targetType: 'ULB',
        idempotencyKey: 'cross-ulb-batch-fail',
      };

      await expect(
        commandsService.submitBatchCommand(batchDto, katraOperator),
      ).rejects.toThrow(/Cross-ULB access denied/);
    });
  });

  describe('Automated Astronomical Scheduling Engine', () => {
    it('retrieves seed schedules with computed target counts', () => {
      const schedules = commandsService.getSchedules();
      expect(schedules.length).toBeGreaterThanOrEqual(2);

      const gblSched = schedules.find((s) => s.ulbId === '11111111-1111-1111-1111-111111111111');
      expect(gblSched).toBeDefined();
      expect(gblSched?.rule.mode).toBe('ASTRONOMICAL');
      expect(gblSched?.targetCount).toBeGreaterThan(0);
    });

    it('creates, updates, toggles and deletes a schedule with audit logging', () => {
      const createDto: CreateScheduleDto = {
        ulbId: '11111111-1111-1111-1111-111111111111',
        name: 'Ganderbal Test Market Schedule',
        scope: 'ULB',
        rule: {
          mode: 'ASTRONOMICAL',
          turnOnOffsetMinutes: -20,
          turnOffOffsetMinutes: 10,
        },
      };

      const created = commandsService.createSchedule(createDto, ganderbalOperator);
      expect(created.id).toBeDefined();
      expect(created.name).toBe('Ganderbal Test Market Schedule');
      expect(created.enabled).toBe(true);

      // Toggle
      const toggled = commandsService.toggleSchedule(created.id, ganderbalOperator);
      expect(toggled.enabled).toBe(false);

      // Update
      const updated = commandsService.updateSchedule(
        created.id,
        { name: 'Ganderbal Updated Market Schedule' },
        ganderbalOperator,
      );
      expect(updated.name).toBe('Ganderbal Updated Market Schedule');

      // Delete
      const del = commandsService.deleteSchedule(created.id, ganderbalOperator);
      expect(del.success).toBe(true);

      expect(() => commandsService.getScheduleById(created.id)).toThrow(/not found/);
    });

    it('evaluates schedules and executes automated nightfall commands with idempotency', async () => {
      const testDate = '2026-10-23T18:30:00Z';

      const eval1 = await commandsService.evaluateSchedules(testDate, adminUser);
      expect(eval1.schedulesEvaluated).toBeGreaterThan(0);
      expect(eval1.results.length).toBeGreaterThan(0);
      expect(eval1.results[0].targetsSwitched).toBeGreaterThan(0);
      expect(eval1.results[0].isIdempotentReplay).toBe(false);

      // Re-evaluating on the same date should trigger idempotent replay
      const eval2 = await commandsService.evaluateSchedules(testDate, adminUser);
      expect(eval2.results[0].isIdempotentReplay).toBe(true);
    });
  });
});
