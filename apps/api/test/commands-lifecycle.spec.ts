import { describe, it, expect, beforeEach } from 'vitest';
import { CommandsService } from '../src/modules/commands/commands.service';
import { DatabaseService } from '../src/database/database.service';
import { SimulatorServiceModule } from '../src/modules/simulator/simulator.service';
import { AuthContextUser } from '@smartlight/shared-types';

describe('Command Lifecycle, Idempotency & ULB Scoping', () => {
  let commandsService: CommandsService;
  let dbService: DatabaseService;
  let simModule: SimulatorServiceModule;

  const adminUser: AuthContextUser = {
    id: 'user-admin',
    email: 'admin@smartlight.os',
    name: 'Admin',
    roles: [{ roleCode: 'PLATFORM_ADMIN', ulbId: null }],
    permissions: ['devices.command'],
    allowedUlbIds: ['*'],
    isGlobalAdmin: true,
  };

  const katraOperator: AuthContextUser = {
    id: 'user-katra',
    email: 'operator.katra@smartlight.os',
    name: 'Katra Ops',
    roles: [{ roleCode: 'CONTROL_OPERATOR', ulbId: '22222222-2222-2222-2222-222222222222' }],
    permissions: ['devices.command'],
    allowedUlbIds: ['22222222-2222-2222-2222-222222222222'],
    isGlobalAdmin: false,
  };

  beforeEach(() => {
    dbService = new DatabaseService();
    simModule = new SimulatorServiceModule(dbService);
    simModule.onModuleInit(); // registers simulator adapter
    commandsService = new CommandsService(dbService);
  });

  it('submits and transitions command through lifecycle: QUEUED -> SENT -> ACKNOWLEDGED -> CONFIRMED', async () => {
    const result = await commandsService.submitCommand(
      {
        deviceId: 'b0000000-0000-0000-0000-000000000001', // Ganderbal lamp
        type: 'TURN_ON',
        idempotencyKey: 'idem-test-lifecycle-1',
      },
      adminUser,
    );

    expect(result.commandId).toBeDefined();
    expect(result.status).toBe('CONFIRMED');
    expect(result.isIdempotentReplay).toBe(false);

    // Verify command attempt history is stored
    const cmdRecord = commandsService.getCommandById(result.commandId);
    expect(cmdRecord.attempts.length).toBeGreaterThan(0);
    expect(cmdRecord.attempts[0].result).toBe('ACCEPTED');

    // Verify audit log exists
    const auditLogs = dbService.memoryStore.auditLogs;
    expect(auditLogs.some((l) => l.entity_id === result.commandId)).toBe(true);
  });

  it('enforces idempotency: duplicate submission returns existing command without re-dispatching', async () => {
    const key = 'idem-duplicate-key-42';

    const first = await commandsService.submitCommand(
      {
        deviceId: 'b0000000-0000-0000-0000-000000000001',
        type: 'TURN_OFF',
        idempotencyKey: key,
      },
      adminUser,
    );

    expect(first.isIdempotentReplay).toBe(false);

    const second = await commandsService.submitCommand(
      {
        deviceId: 'b0000000-0000-0000-0000-000000000001',
        type: 'TURN_OFF',
        idempotencyKey: key,
      },
      adminUser,
    );

    expect(second.isIdempotentReplay).toBe(true);
    expect(second.commandId).toBe(first.commandId);
  });

  it('rejects cross-ULB command when operator lacks scope for device ULB', async () => {
    // Device b0000000-0000-0000-0000-000000000001 belongs to Ganderbal (11111111-...)
    // katraOperator is only scoped to Katra (22222222-...)
    await expect(
      commandsService.submitCommand(
        {
          deviceId: 'b0000000-0000-0000-0000-000000000001',
          type: 'TURN_ON',
          idempotencyKey: 'idem-cross-ulb-fail',
        },
        katraOperator,
      ),
    ).rejects.toThrow(/not authorized/);
  });
});
