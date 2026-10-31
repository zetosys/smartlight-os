import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { generateSecureId } from '../../common/crypto-id.util';
import { AdapterRegistry, DeviceCommand as AdapterDeviceCommand } from '@smartlight/device-contracts';
import {
  CommandStatus,
  CommandType,
  CreateCommandDto,
  CreateBatchCommandDto,
  BatchCommandResponse,
  CreateScheduleDto,
  Schedule,
  SolarTimes,
  AuthContextUser,
} from '@smartlight/shared-types';
import { SolarCalculator } from './solar-calculator';

@Injectable()
export class CommandsService {
  private readonly logger = new Logger(CommandsService.name);

  constructor(private readonly db: DatabaseService) {}

  // --- Single Device Command Submission ---

  public async submitCommand(
    dto: CreateCommandDto,
    user: AuthContextUser,
    ulbIdHeader?: string,
  ) {
    if (!dto.deviceId || !dto.type || !dto.idempotencyKey) {
      throw new BadRequestException('deviceId, type, and idempotencyKey are mandatory');
    }

    // 1. Locate Device
    const device = this.db.memoryStore.devices.find(
      (d) => d.id === dto.deviceId || d.external_id === dto.deviceId,
    );

    if (!device) {
      throw new NotFoundException(`Device '${dto.deviceId}' not found`);
    }

    const effectiveUlbId = device.ulb_id;

    // 2. Validate ULB Scoping for User
    this.assertUlbAccess(user, effectiveUlbId);

    // 3. Idempotency Check: (ulb_id, idempotency_key)
    const existing = this.db.memoryStore.commands.find(
      (c) => c.ulb_id === effectiveUlbId && c.idempotency_key === dto.idempotencyKey,
    );

    if (existing) {
      this.logger.log(
        `[CommandsService] Idempotency match for key ${dto.idempotencyKey}. Returning existing command ${existing.id}`,
      );
      return {
        commandId: existing.id,
        deviceId: existing.device_id,
        status: existing.status,
        idempotencyKey: existing.idempotency_key,
        createdAt: existing.created_at,
        isIdempotentReplay: true,
      };
    }

    // 4. Create and QUEUE the command
    const commandId = generateSecureId('cmd');
    const now = new Date().toISOString();

    const commandRecord = {
      id: commandId,
      ulb_id: effectiveUlbId,
      device_id: device.id,
      requested_by: user.id,
      command_type: dto.type,
      payload: dto.payload || {},
      idempotency_key: dto.idempotencyKey,
      status: 'QUEUED' as CommandStatus,
      created_at: now,
      updated_at: now,
    };

    this.db.memoryStore.commands.push(commandRecord);

    // 5. Update Desired State immediately upon queueing (desired != reported)
    if (dto.type === 'TURN_ON') {
      device.desired_on = true;
    } else if (dto.type === 'TURN_OFF') {
      device.desired_on = false;
    }

    // Audit command queueing
    this.recordAudit(user, effectiveUlbId, 'COMMAND_QUEUED', commandId, {
      type: dto.type,
      idempotencyKey: dto.idempotencyKey,
      targetDevice: device.external_id,
    });

    // 6. Asynchronous execution step: Dispatch to Adapter
    await this.processCommandDispatch(commandRecord, device, user);

    return {
      commandId: commandRecord.id,
      deviceId: device.id,
      status: commandRecord.status,
      idempotencyKey: commandRecord.idempotency_key,
      createdAt: commandRecord.created_at,
      isIdempotentReplay: false,
    };
  }

  // --- Bulk & Feeder-Level Command Dispatcher ---

  public async submitBatchCommand(
    dto: CreateBatchCommandDto,
    user: AuthContextUser,
  ): Promise<BatchCommandResponse> {
    if (!dto.ulbId || !dto.type || !dto.targetType || !dto.idempotencyKey) {
      throw new BadRequestException('ulbId, type, targetType, and idempotencyKey are mandatory');
    }

    this.assertUlbAccess(user, dto.ulbId);

    // Check Batch Idempotency
    const existingBatch = this.db.memoryStore.commands.find(
      (c) => c.ulb_id === dto.ulbId && c.idempotency_key === dto.idempotencyKey,
    );

    if (existingBatch) {
      this.logger.log(
        `[CommandsService] Batch idempotency match for key ${dto.idempotencyKey}. Returning existing batch ${existingBatch.id}`,
      );
      return {
        batchId: existingBatch.id,
        ulbId: dto.ulbId,
        type: dto.type,
        targetType: dto.targetType,
        targetCount: existingBatch.payload?.targetCount || 1,
        queuedCount: existingBatch.payload?.queuedCount || 1,
        confirmedCount: existingBatch.payload?.confirmedCount || 1,
        failedCount: existingBatch.payload?.failedCount || 0,
        idempotencyKey: dto.idempotencyKey,
        isIdempotentReplay: true,
        createdAt: existingBatch.created_at,
      };
    }

    // Resolve Target Devices
    const targetDevices = this.resolveBatchTargets(dto);

    if (targetDevices.length === 0) {
      throw new NotFoundException(
        `No target devices found matching criteria: targetType=${dto.targetType}, targetId=${dto.targetId}`,
      );
    }

    const batchId = generateSecureId('batch');
    const now = new Date().toISOString();

    let confirmedCount = 0;
    let failedCount = 0;

    // Execute switching across all target devices
    for (const dev of targetDevices) {
      // 1. Update desired state
      if (dto.type === 'TURN_ON') {
        dev.desired_on = true;
      } else if (dto.type === 'TURN_OFF') {
        dev.desired_on = false;
      }

      // 2. Dispatch to simulator/hardware adapter
      const singleCmdId = generateSecureId('cmd');
      const singleRecord = {
        id: singleCmdId,
        ulb_id: dev.ulb_id,
        device_id: dev.id,
        requested_by: user.id,
        command_type: dto.type,
        payload: { batchId, ...dto.payload },
        idempotency_key: `${dto.idempotencyKey}-${dev.id}`,
        status: 'QUEUED' as CommandStatus,
        created_at: now,
        updated_at: now,
      };

      this.db.memoryStore.commands.push(singleRecord);

      try {
        await this.processCommandDispatch(singleRecord, dev, user);
        if (singleRecord.status === 'CONFIRMED' || singleRecord.status === 'ACKNOWLEDGED') {
          confirmedCount++;
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }
    }

    // Save batch master command record for audit and idempotency
    const batchRecord = {
      id: batchId,
      ulb_id: dto.ulbId,
      device_id: targetDevices[0]?.id || 'BATCH',
      requested_by: user.id,
      command_type: dto.type,
      payload: {
        targetType: dto.targetType,
        targetId: dto.targetId,
        targetCount: targetDevices.length,
        queuedCount: targetDevices.length,
        confirmedCount,
        failedCount,
      },
      idempotency_key: dto.idempotencyKey,
      status: (failedCount === 0 ? 'CONFIRMED' : 'ACKNOWLEDGED') as CommandStatus,
      created_at: now,
      updated_at: now,
    };
    this.db.memoryStore.commands.push(batchRecord);

    this.recordAudit(user, dto.ulbId, 'BATCH_COMMAND_DISPATCHED', batchId, {
      type: dto.type,
      targetType: dto.targetType,
      targetId: dto.targetId,
      targetCount: targetDevices.length,
      confirmedCount,
      failedCount,
      idempotencyKey: dto.idempotencyKey,
    });

    return {
      batchId,
      ulbId: dto.ulbId,
      type: dto.type,
      targetType: dto.targetType,
      targetCount: targetDevices.length,
      queuedCount: targetDevices.length,
      confirmedCount,
      failedCount,
      idempotencyKey: dto.idempotencyKey,
      isIdempotentReplay: false,
      createdAt: now,
    };
  }

  private resolveBatchTargets(dto: CreateBatchCommandDto) {
    const allDevices = this.db.memoryStore.devices.filter((d) => d.ulb_id === dto.ulbId);

    switch (dto.targetType) {
      case 'ULB':
        return allDevices;

      case 'FEEDER':
        return allDevices.filter((d) => d.feeder_id === dto.targetId);

      case 'ZONE': {
        const wardsInZone = this.db.memoryStore.wards
          .filter((w) => w.zone_id === dto.targetId)
          .map((w) => w.id);
        const streetsInWards = this.db.memoryStore.streets
          .filter((s) => wardsInZone.includes(s.ward_id))
          .map((s) => s.id);
        const polesInStreets = this.db.memoryStore.poles
          .filter((p) => p.street_id && streetsInWards.includes(p.street_id))
          .map((p) => p.id);
        const lumsInPoles = this.db.memoryStore.luminaires
          .filter((l) => l.pole_id && polesInStreets.includes(l.pole_id))
          .map((l) => l.id);
        return allDevices.filter((d) => lumsInPoles.includes(d.luminaire_id));
      }

      case 'WARD': {
        const streetsInWard = this.db.memoryStore.streets
          .filter((s) => s.ward_id === dto.targetId)
          .map((s) => s.id);
        const polesInStreets = this.db.memoryStore.poles
          .filter((p) => p.street_id && streetsInWard.includes(p.street_id))
          .map((p) => p.id);
        const lumsInPoles = this.db.memoryStore.luminaires
          .filter((l) => l.pole_id && polesInStreets.includes(l.pole_id))
          .map((l) => l.id);
        return allDevices.filter((d) => lumsInPoles.includes(d.luminaire_id));
      }

      case 'STREET': {
        const polesInStreet = this.db.memoryStore.poles
          .filter((p) => p.street_id === dto.targetId)
          .map((p) => p.id);
        const lumsInPoles = this.db.memoryStore.luminaires
          .filter((l) => l.pole_id && polesInStreet.includes(l.pole_id))
          .map((l) => l.id);
        return allDevices.filter((d) => lumsInPoles.includes(d.luminaire_id));
      }

      case 'DEVICES':
        if (!dto.deviceIds || dto.deviceIds.length === 0) return [];
        return allDevices.filter(
          (d) => dto.deviceIds!.includes(d.id) || dto.deviceIds!.includes(d.external_id),
        );

      default:
        return [];
    }
  }

  private async processCommandDispatch(commandRecord: any, device: any, user: AuthContextUser) {
    const registry = AdapterRegistry.getInstance();

    if (!registry.hasAdapter(device.adapter_key)) {
      commandRecord.status = 'FAILED';
      commandRecord.updated_at = new Date().toISOString();
      this.recordAudit(user, commandRecord.ulb_id, 'COMMAND_FAILED', commandRecord.id, {
        reason: `Adapter '${device.adapter_key}' not registered`,
      });
      return;
    }

    const adapter = registry.getAdapter(device.adapter_key);

    commandRecord.status = 'SENT';
    commandRecord.updated_at = new Date().toISOString();

    try {
      const adapterCommand: AdapterDeviceCommand = {
        commandId: commandRecord.id,
        deviceId: device.external_id,
        type: commandRecord.command_type,
        idempotencyKey: commandRecord.idempotency_key,
        payload: commandRecord.payload,
      };

      const dispatch = await adapter.sendCommand(adapterCommand);

      this.db.memoryStore.attempts.push({
        id: `att-${Date.now()}`,
        command_id: commandRecord.id,
        attempted_at: new Date().toISOString(),
        result: dispatch.accepted ? 'ACCEPTED' : 'REJECTED',
        transport_reference: dispatch.transportReference,
      });

      if (dispatch.accepted) {
        commandRecord.status = 'ACKNOWLEDGED';
        commandRecord.updated_at = new Date().toISOString();

        if (dispatch.reportedImmediately) {
          if (commandRecord.command_type === 'TURN_ON') {
            device.reported_on = true;
          } else if (commandRecord.command_type === 'TURN_OFF') {
            device.reported_on = false;
          }
          commandRecord.status = 'CONFIRMED';
          commandRecord.updated_at = new Date().toISOString();
        }
      } else {
        commandRecord.status = 'FAILED';
        commandRecord.updated_at = new Date().toISOString();
      }

      this.recordAudit(user, commandRecord.ulb_id, `COMMAND_${commandRecord.status}`, commandRecord.id, {
        transportReference: dispatch.transportReference,
        error: dispatch.error,
      });
    } catch (err: unknown) {
      commandRecord.status = 'FAILED';
      commandRecord.updated_at = new Date().toISOString();
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.recordAudit(user, commandRecord.ulb_id, 'COMMAND_FAILED', commandRecord.id, {
        error: errorMsg,
      });
    }
  }

  // --- Automated Astronomical Scheduling Engine ---

  public getSchedules(ulbId?: string): Schedule[] {
    let list = this.db.memoryStore.schedules;
    if (ulbId) {
      list = list.filter((s) => s.ulb_id === ulbId);
    }
    return list.map((s) => {
      // Calculate target counts dynamically
      let targetCount = this.db.memoryStore.devices.filter((d) => d.ulb_id === s.ulb_id).length;
      if (s.scope === 'FEEDER') {
        targetCount = this.db.memoryStore.devices.filter(
          (d) => d.ulb_id === s.ulb_id && d.feeder_id === s.target_id,
        ).length;
      }
      return {
        id: s.id,
        ulbId: s.ulb_id,
        name: s.name,
        scope: s.scope || 'ULB',
        targetId: s.target_id,
        targetName: s.target_name,
        timezone: s.timezone || 'Asia/Kolkata',
        rule: s.rule,
        enabled: s.enabled ?? true,
        targetCount,
        lastExecutedAt: s.last_executed_at,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      };
    });
  }

  public getScheduleById(id: string): Schedule {
    const s = this.db.memoryStore.schedules.find((sched) => sched.id === id);
    if (!s) {
      throw new NotFoundException(`Schedule '${id}' not found`);
    }
    const targetCount = this.db.memoryStore.devices.filter((d) => d.ulb_id === s.ulb_id).length;
    return {
      id: s.id,
      ulbId: s.ulb_id,
      name: s.name,
      scope: s.scope || 'ULB',
      targetId: s.target_id,
      timezone: s.timezone || 'Asia/Kolkata',
      rule: s.rule,
      enabled: s.enabled ?? true,
      targetCount,
      lastExecutedAt: s.last_executed_at,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    };
  }

  public createSchedule(dto: CreateScheduleDto, user: AuthContextUser): Schedule {
    this.assertUlbAccess(user, dto.ulbId);

    const newId = generateSecureId('sched');
    const now = new Date().toISOString();

    const schedule = {
      id: newId,
      ulb_id: dto.ulbId,
      name: dto.name,
      scope: dto.scope,
      target_id: dto.targetId,
      timezone: 'Asia/Kolkata',
      enabled: dto.enabled ?? true,
      rule: dto.rule,
      created_at: now,
      updated_at: now,
    };

    this.db.memoryStore.schedules.push(schedule);
    this.recordAudit(user, dto.ulbId, 'SCHEDULE_CREATED', newId, { name: dto.name, mode: dto.rule.mode });

    return this.getScheduleById(newId);
  }

  public updateSchedule(id: string, dto: Partial<CreateScheduleDto>, user: AuthContextUser): Schedule {
    const s = this.db.memoryStore.schedules.find((sched) => sched.id === id);
    if (!s) throw new NotFoundException(`Schedule '${id}' not found`);

    this.assertUlbAccess(user, s.ulb_id);

    if (dto.name) s.name = dto.name;
    if (dto.scope) s.scope = dto.scope;
    if (dto.targetId !== undefined) s.target_id = dto.targetId;
    if (dto.enabled !== undefined) s.enabled = dto.enabled;
    if (dto.rule) s.rule = { ...s.rule, ...dto.rule };
    s.updated_at = new Date().toISOString();

    this.recordAudit(user, s.ulb_id, 'SCHEDULE_UPDATED', id, { ...dto });
    return this.getScheduleById(id);
  }

  public toggleSchedule(id: string, user: AuthContextUser): Schedule {
    const s = this.db.memoryStore.schedules.find((sched) => sched.id === id);
    if (!s) throw new NotFoundException(`Schedule '${id}' not found`);

    this.assertUlbAccess(user, s.ulb_id);

    s.enabled = !s.enabled;
    s.updated_at = new Date().toISOString();

    this.recordAudit(user, s.ulb_id, s.enabled ? 'SCHEDULE_ENABLED' : 'SCHEDULE_DISABLED', id, {
      enabled: s.enabled,
    });
    return this.getScheduleById(id);
  }

  public deleteSchedule(id: string, user: AuthContextUser) {
    const s = this.db.memoryStore.schedules.find((sched) => sched.id === id);
    if (!s) throw new NotFoundException(`Schedule '${id}' not found`);

    this.assertUlbAccess(user, s.ulb_id);

    const index = this.db.memoryStore.schedules.findIndex((sched) => sched.id === id);
    this.db.memoryStore.schedules.splice(index, 1);

    this.recordAudit(user, s.ulb_id, 'SCHEDULE_DELETED', id, { name: s.name });
    return { success: true, deletedId: id };
  }

  /**
   * Astronomical Solar Calculations for a ULB.
   */
  public getSolarTimes(ulbId: string, dateStr?: string): SolarTimes {
    const ulb = this.db.memoryStore.ulbs.find((u) => u.id === ulbId || u.code === ulbId);
    const lat = ulb?.latitude || (ulbId.includes('2222') ? 32.9925 : 34.2165);
    const lng = ulb?.longitude || (ulbId.includes('2222') ? 74.9318 : 74.7725);
    const date = dateStr ? new Date(dateStr) : new Date();

    return SolarCalculator.calculate(date, lat, lng, 5.5);
  }

  /**
   * Evaluates active schedules against solar calculations and triggers automated switching.
   */
  public async evaluateSchedules(dateStr?: string, user?: AuthContextUser) {
    const actor: AuthContextUser = user || {
      id: 'system-scheduler',
      email: 'system.scheduler@smartlight.os',
      name: 'Automated Solar Scheduler',
      roles: [{ roleCode: 'PLATFORM_ADMIN', ulbId: null }],
      permissions: ['devices.command'],
      allowedUlbIds: ['*'],
      isGlobalAdmin: true,
    };

    const activeSchedules = this.db.memoryStore.schedules.filter((s) => s.enabled);
    const evaluatedResults = [];

    const date = dateStr ? new Date(dateStr) : new Date();
    const dateKey = date.toISOString().split('T')[0];

    for (const sched of activeSchedules) {
      const solar = this.getSolarTimes(sched.ulb_id, dateKey);

      // Determine Action: Astronomical Nightfall ON vs Sunrise OFF
      const turnOnOffset = sched.rule.turnOnOffsetMinutes ?? -15;
      const turnOffOffset = sched.rule.turnOffOffsetMinutes ?? 15;

      // In evaluation mode, trigger the nightfall ON command idempotently
      const batchIdempotencyKey = `sched-auto-${sched.id}-${dateKey}-NIGHTFALL`;

      const batchDto: CreateBatchCommandDto = {
        ulbId: sched.ulb_id,
        type: 'TURN_ON',
        targetType: (sched.scope as any) || 'ULB',
        targetId: sched.target_id,
        idempotencyKey: batchIdempotencyKey,
        payload: {
          automatedBy: sched.name,
          mode: sched.rule.mode,
          solarSunset: solar.sunset,
          effectiveOnOffset: turnOnOffset,
        },
      };

      const dispatchRes = await this.submitBatchCommand(batchDto, actor);

      sched.last_executed_at = new Date().toISOString();

      evaluatedResults.push({
        scheduleId: sched.id,
        scheduleName: sched.name,
        mode: sched.rule.mode,
        solarSunset: solar.sunset,
        solarSunrise: solar.sunrise,
        batchId: dispatchRes.batchId,
        targetsSwitched: dispatchRes.confirmedCount,
        isIdempotentReplay: dispatchRes.isIdempotentReplay,
      });
    }

    return {
      evaluatedAt: new Date().toISOString(),
      schedulesEvaluated: activeSchedules.length,
      results: evaluatedResults,
    };
  }

  public getCommandById(id: string) {
    const cmd = this.db.memoryStore.commands.find((c) => c.id === id);
    if (!cmd) {
      throw new NotFoundException(`Command '${id}' not found`);
    }

    const attempts = this.db.memoryStore.attempts.filter((a) => a.command_id === id);
    return {
      ...cmd,
      attempts,
    };
  }

  public getCommands(ulbId?: string, limit: number = 20) {
    let list = this.db.memoryStore.commands;
    if (ulbId) {
      list = list.filter((c) => c.ulb_id === ulbId);
    }
    return list.slice(-limit).reverse();
  }

  private assertUlbAccess(user: AuthContextUser, targetUlbId: string) {
    if (user.isGlobalAdmin || user.allowedUlbIds.includes('*')) {
      return;
    }
    if (!user.allowedUlbIds.includes(targetUlbId)) {
      throw new ForbiddenException(
        `Cross-ULB access denied: User not authorized to command ULB '${targetUlbId}'`,
      );
    }
  }

  private recordAudit(
    user: AuthContextUser,
    ulbId: string,
    action: string,
    entityId: string,
    details: Record<string, unknown>,
  ) {
    this.db.memoryStore.auditLogs.push({
      id: generateSecureId('audit'),
      ulb_id: ulbId,
      actor_id: user?.id,
      actor_email: user?.email,
      action,
      entity_type: 'COMMAND',
      entity_id: entityId,
      details,
      occurred_at: new Date().toISOString(),
    });
  }
}
