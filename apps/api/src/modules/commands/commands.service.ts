import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AdapterRegistry, DeviceCommand as AdapterDeviceCommand } from '@smartlight/device-contracts';
import {
  CommandStatus,
  CommandType,
  CreateCommandDto,
  AuthContextUser,
} from '@smartlight/shared-types';

@Injectable()
export class CommandsService {
  private readonly logger = new Logger(CommandsService.name);

  constructor(private readonly db: DatabaseService) {}

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
    if (!user.isGlobalAdmin && !user.allowedUlbIds.includes('*')) {
      if (!user.allowedUlbIds.includes(effectiveUlbId)) {
        throw new ConflictException(
          `User is not authorized to command devices in ULB: ${effectiveUlbId}`,
        );
      }
    }

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
    const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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

    // Transition to SENT
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

      // Record command attempt
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

        // If simulator layer reports immediate confirmation
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
    } catch (err: any) {
      commandRecord.status = 'FAILED';
      commandRecord.updated_at = new Date().toISOString();
      this.recordAudit(user, commandRecord.ulb_id, 'COMMAND_FAILED', commandRecord.id, {
        error: err.message,
      });
    }
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

  private recordAudit(
    user: AuthContextUser,
    ulbId: string,
    action: string,
    entityId: string,
    details: Record<string, unknown>,
  ) {
    this.db.memoryStore.auditLogs.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
