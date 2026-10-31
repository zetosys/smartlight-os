import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  Alert,
  AlertStatus,
  AlertSeverity,
  MaintenanceTicket,
  TicketStatus,
  TicketPriority,
  CreateTicketDto,
  UpdateTicketDto,
  SparePart,
  AuthContextUser,
} from '@smartlight/shared-types';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(private readonly db: DatabaseService) {}

  // --- Alert Operations ---

  public getAlerts(
    ulbId?: string,
    status?: string,
    severity?: string,
    code?: string,
  ): any[] {
    let list = this.db.memoryStore.alerts;

    if (ulbId) {
      list = list.filter((a) => a.ulb_id === ulbId);
    }
    if (status) {
      list = list.filter((a) => a.status === status);
    }
    if (severity) {
      list = list.filter((a) => a.severity === severity);
    }
    if (code) {
      list = list.filter((a) => a.code === code);
    }

    return list.map((a) => {
      const dev = this.db.memoryStore.devices.find((d) => d.id === a.device_id);
      return {
        ...a,
        deviceCode: dev?.external_id || a.device_id,
      };
    });
  }

  public getAlertById(id: string) {
    const alert = this.db.memoryStore.alerts.find((a) => a.id === id);
    if (!alert) {
      throw new NotFoundException(`Alert '${id}' not found`);
    }
    const dev = this.db.memoryStore.devices.find((d) => d.id === alert.device_id);
    return {
      ...alert,
      deviceCode: dev?.external_id || alert.device_id,
    };
  }

  public acknowledgeAlert(id: string, user: AuthContextUser) {
    const alert = this.db.memoryStore.alerts.find((a) => a.id === id);
    if (!alert) {
      throw new NotFoundException(`Alert '${id}' not found`);
    }

    this.assertUlbAccess(user, alert.ulb_id);

    alert.status = 'ACKNOWLEDGED';
    alert.acknowledged_at = new Date().toISOString();

    this.recordAudit(user, alert.ulb_id, 'ALERT_ACKNOWLEDGED', alert.id, {
      code: alert.code,
      severity: alert.severity,
    });

    return alert;
  }

  public resolveAlert(id: string, user: AuthContextUser, notes?: string) {
    const alert = this.db.memoryStore.alerts.find((a) => a.id === id);
    if (!alert) {
      throw new NotFoundException(`Alert '${id}' not found`);
    }

    this.assertUlbAccess(user, alert.ulb_id);

    alert.status = 'RESOLVED';
    alert.resolved_at = new Date().toISOString();
    if (notes) alert.message = `${alert.message} | Resolution Note: ${notes}`;

    this.recordAudit(user, alert.ulb_id, 'ALERT_RESOLVED', alert.id, {
      notes,
    });

    return alert;
  }

  public createTicketFromAlert(alertId: string, user: AuthContextUser): MaintenanceTicket {
    const alert = this.db.memoryStore.alerts.find((a) => a.id === alertId);
    if (!alert) {
      throw new NotFoundException(`Alert '${alertId}' not found`);
    }

    this.assertUlbAccess(user, alert.ulb_id);

    // Map Severity to Ticket Priority
    let priority: TicketPriority = 'MEDIUM';
    if (alert.severity === 'CRITICAL') priority = 'CRITICAL';
    else if (alert.severity === 'MAJOR') priority = 'HIGH';
    else if (alert.severity === 'WARNING') priority = 'MEDIUM';
    else if (alert.severity === 'MINOR') priority = 'LOW';

    // Locate device
    const dev = this.db.memoryStore.devices.find((d) => d.id === alert.device_id);
    const targetLabel = dev?.external_id || alert.device_id || 'Luminaire Fleet';

    // Auto-locate default technician for this ULB
    const tech = this.db.memoryStore.users.find(
      (u) => u.role_code === 'TECHNICIAN' && (u.ulb_id === alert.ulb_id || !u.ulb_id),
    );

    const ticketId = `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newTicket = {
      id: ticketId,
      ulb_id: alert.ulb_id,
      alert_id: alert.id,
      device_id: alert.device_id,
      assigned_to: tech?.id,
      assigned_to_name: tech ? `${tech.first_name} ${tech.last_name}` : 'Field Technician',
      title: `[${alert.code}] Repair for ${targetLabel}`,
      description: alert.message || `Automated work order tripped by ${alert.code} threshold anomaly.`,
      priority,
      status: 'OPEN' as TicketStatus,
      created_at: now,
      updated_at: now,
    };

    this.db.memoryStore.tickets.push(newTicket);

    // Acknowledge the alert automatically when work order is created
    alert.status = 'ACKNOWLEDGED';
    alert.acknowledged_at = now;

    this.recordAudit(user, alert.ulb_id, 'TICKET_CREATED_FROM_ALERT', ticketId, {
      alertId: alert.id,
      code: alert.code,
      priority,
    });

    return this.getTicketById(ticketId);
  }

  // --- Maintenance Ticket / Work Order Operations ---

  public getTickets(
    ulbId?: string,
    status?: string,
    priority?: string,
    assignedTo?: string,
  ): MaintenanceTicket[] {
    let list = this.db.memoryStore.tickets;

    if (ulbId) {
      list = list.filter((t) => t.ulb_id === ulbId);
    }
    if (status) {
      list = list.filter((t) => t.status === status);
    }
    if (priority) {
      list = list.filter((t) => t.priority === priority);
    }
    if (assignedTo) {
      list = list.filter((t) => t.assigned_to === assignedTo);
    }

    return list.map((t) => {
      const dev = this.db.memoryStore.devices.find((d) => d.id === t.device_id);
      const tech = this.db.memoryStore.users.find((u) => u.id === t.assigned_to);

      return {
        id: t.id,
        ulbId: t.ulb_id,
        alertId: t.alert_id,
        deviceId: t.device_id,
        deviceCode: dev?.external_id || t.device_id,
        assignedTo: t.assigned_to,
        assignedToName: tech ? `${tech.first_name} ${tech.last_name}` : t.assigned_to_name,
        status: (t.status || 'OPEN') as TicketStatus,
        title: t.title,
        description: t.description,
        priority: (t.priority || 'MEDIUM') as TicketPriority,
        resolutionNotes: t.resolution_notes,
        sparePartsUsed: t.spare_parts_used || [],
        createdAt: t.created_at,
        updatedAt: t.updated_at || t.created_at,
        resolvedAt: t.resolved_at,
      };
    });
  }

  public getTicketById(id: string): MaintenanceTicket {
    const t = this.db.memoryStore.tickets.find((tick) => tick.id === id);
    if (!t) {
      throw new NotFoundException(`Maintenance Ticket '${id}' not found`);
    }

    const dev = this.db.memoryStore.devices.find((d) => d.id === t.device_id);
    const tech = this.db.memoryStore.users.find((u) => u.id === t.assigned_to);

    return {
      id: t.id,
      ulbId: t.ulb_id,
      alertId: t.alert_id,
      deviceId: t.device_id,
      deviceCode: dev?.external_id || t.device_id,
      assignedTo: t.assigned_to,
      assignedToName: tech ? `${tech.first_name} ${tech.last_name}` : t.assigned_to_name,
      status: (t.status || 'OPEN') as TicketStatus,
      title: t.title,
      description: t.description,
      priority: (t.priority || 'MEDIUM') as TicketPriority,
      resolutionNotes: t.resolution_notes,
      sparePartsUsed: t.spare_parts_used || [],
      createdAt: t.created_at,
      updatedAt: t.updated_at || t.created_at,
      resolvedAt: t.resolved_at,
    };
  }

  public createTicket(dto: CreateTicketDto, user: AuthContextUser): MaintenanceTicket {
    this.assertUlbAccess(user, dto.ulbId);

    const ticketId = `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const tech = dto.assignedTo
      ? this.db.memoryStore.users.find((u) => u.id === dto.assignedTo)
      : null;

    const ticket = {
      id: ticketId,
      ulb_id: dto.ulbId,
      alert_id: dto.alertId,
      device_id: dto.deviceId,
      assigned_to: dto.assignedTo,
      assigned_to_name: tech ? `${tech.first_name} ${tech.last_name}` : undefined,
      title: dto.title,
      description: dto.description,
      priority: dto.priority || 'MEDIUM',
      status: 'OPEN' as TicketStatus,
      created_at: now,
      updated_at: now,
    };

    this.db.memoryStore.tickets.push(ticket);

    this.recordAudit(user, dto.ulbId, 'TICKET_CREATED', ticketId, {
      title: dto.title,
      priority: dto.priority,
    });

    return this.getTicketById(ticketId);
  }

  public updateTicket(id: string, dto: UpdateTicketDto, user: AuthContextUser): MaintenanceTicket {
    const t = this.db.memoryStore.tickets.find((tick) => tick.id === id);
    if (!t) {
      throw new NotFoundException(`Maintenance Ticket '${id}' not found`);
    }

    this.assertUlbAccess(user, t.ulb_id);

    const now = new Date().toISOString();

    if (dto.priority) t.priority = dto.priority;
    if (dto.assignedTo !== undefined) {
      t.assigned_to = dto.assignedTo;
      const tech = this.db.memoryStore.users.find((u) => u.id === dto.assignedTo);
      if (tech) t.assigned_to_name = `${tech.first_name} ${tech.last_name}`;
    }
    if (dto.resolutionNotes) t.resolution_notes = dto.resolutionNotes;

    // Handle Spare Parts Consumption
    if (dto.sparePartsUsed && Array.isArray(dto.sparePartsUsed)) {
      t.spare_parts_used = dto.sparePartsUsed;

      // Deduct inventory
      for (const usage of dto.sparePartsUsed) {
        const part = this.db.memoryStore.spareParts.find(
          (p) => p.id === usage.partId || p.code === usage.partCode,
        );
        if (part) {
          part.quantity_in_stock = Math.max(0, part.quantity_in_stock - usage.quantity);
        }
      }
    }

    // Status Transition & Auto-Resolving Alert
    if (dto.status) {
      t.status = dto.status;
      if (dto.status === 'RESOLVED' || dto.status === 'CLOSED') {
        t.resolved_at = now;

        // Auto-resolve associated alert if present
        if (t.alert_id) {
          const associatedAlert = this.db.memoryStore.alerts.find((a) => a.id === t.alert_id);
          if (associatedAlert && associatedAlert.status !== 'RESOLVED') {
            associatedAlert.status = 'RESOLVED';
            associatedAlert.resolved_at = now;
            associatedAlert.message = `${associatedAlert.message} (Resolved via Ticket ${t.id})`;
          }
        }
      }
    }

    t.updated_at = now;

    this.recordAudit(user, t.ulb_id, 'TICKET_UPDATED', id, { ...dto });
    return this.getTicketById(id);
  }

  public assignTicket(id: string, assignedTo: string, user: AuthContextUser): MaintenanceTicket {
    const t = this.db.memoryStore.tickets.find((tick) => tick.id === id);
    if (!t) throw new NotFoundException(`Maintenance Ticket '${id}' not found`);

    this.assertUlbAccess(user, t.ulb_id);

    const tech = this.db.memoryStore.users.find((u) => u.id === assignedTo);
    if (!tech) throw new NotFoundException(`Technician user '${assignedTo}' not found`);

    // Verify technician ULB boundary
    if (tech.ulb_id && tech.ulb_id !== t.ulb_id) {
      throw new ForbiddenException(`Technician '${tech.email}' belongs to a different ULB`);
    }

    t.assigned_to = assignedTo;
    t.assigned_to_name = `${tech.first_name} ${tech.last_name}`;
    t.updated_at = new Date().toISOString();

    if (t.status === 'OPEN') {
      t.status = 'IN_PROGRESS';
    }

    this.recordAudit(user, t.ulb_id, 'TICKET_ASSIGNED', id, {
      assignedTo,
      technicianName: t.assigned_to_name,
    });

    return this.getTicketById(id);
  }

  public getAvailableTechnicians(ulbId?: string, user?: AuthContextUser): Array<{
    id: string;
    email: string;
    name: string;
    roleCode: string;
    ulbId: string | null;
    ulbName: string;
  }> {
    let users = this.db.memoryStore.users.filter(
      (u) =>
        (u.role_code === 'TECHNICIAN' || u.role_code === 'MAINTENANCE_SUPERVISOR') &&
        u.active !== false,
    );

    if (ulbId) {
      users = users.filter((u) => !u.ulb_id || u.ulb_id === ulbId);
    }

    return users.map((u) => {
      const ulb = this.db.memoryStore.ulbs.find((item) => item.id === u.ulb_id);
      return {
        id: u.id,
        email: u.email,
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
        roleCode: u.role_code,
        ulbId: u.ulb_id,
        ulbName: ulb?.name || 'All ULBs (Roaming)',
      };
    });
  }

  // --- Spare Parts Catalog Operations ---

  public getSpareParts(): SparePart[] {
    return this.db.memoryStore.spareParts.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category,
      quantityInStock: p.quantity_in_stock,
      unitCostInr: p.unit_cost_inr,
    }));
  }

  public restockSparePart(id: string, quantity: number, user: AuthContextUser): SparePart {
    const part = this.db.memoryStore.spareParts.find((p) => p.id === id || p.code === id);
    if (!part) throw new NotFoundException(`Spare part '${id}' not found`);

    if (quantity <= 0) throw new BadRequestException('Restock quantity must be greater than zero');

    part.quantity_in_stock += quantity;

    this.recordAudit(user, null as any, 'SPARE_PART_RESTOCKED', part.id, {
      code: part.code,
      added: quantity,
      newStock: part.quantity_in_stock,
    });

    return {
      id: part.id,
      code: part.code,
      name: part.name,
      category: part.category,
      quantityInStock: part.quantity_in_stock,
      unitCostInr: part.unit_cost_inr,
    };
  }

  private assertUlbAccess(user: AuthContextUser, targetUlbId: string) {
    if (!user || user.isGlobalAdmin || user.allowedUlbIds?.includes('*')) {
      return;
    }
    if (!user.allowedUlbIds?.includes(targetUlbId)) {
      throw new ForbiddenException(
        `Cross-ULB access denied: User not authorized to operate on ULB '${targetUlbId}'`,
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
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ulb_id: ulbId,
      actor_id: user?.id,
      actor_email: user?.email,
      action,
      entity_type: 'MAINTENANCE',
      entity_id: entityId,
      details,
      occurred_at: new Date().toISOString(),
    });
  }
}
