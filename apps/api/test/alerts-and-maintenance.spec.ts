import { describe, it, expect, beforeEach } from 'vitest';
import { MaintenanceService } from '../src/modules/maintenance/maintenance.service';
import { DatabaseService } from '../src/database/database.service';
import { AuthContextUser, CreateTicketDto, UpdateTicketDto } from '@smartlight/shared-types';

describe('Prompt 6: Fault Detection, Alerts Engine & Maintenance Workflows', () => {
  let maintenanceService: MaintenanceService;
  let dbService: DatabaseService;

  const adminUser: AuthContextUser = {
    id: 'user-admin',
    email: 'admin@smartlight.os',
    name: 'Admin',
    roles: [{ roleCode: 'PLATFORM_ADMIN', ulbId: null }],
    permissions: ['alerts.read', 'alerts.acknowledge', 'tickets.read', 'tickets.create', 'tickets.assign', 'tickets.resolve', 'org.manage'],
    allowedUlbIds: ['*'],
    isGlobalAdmin: true,
  };

  const ganderbalSupervisor: AuthContextUser = {
    id: 'user-gbl-sup',
    email: 'supervisor.gbl@smartlight.os',
    name: 'Ganderbal Maintenance Supervisor',
    roles: [{ roleCode: 'MAINTENANCE_SUPERVISOR', ulbId: '11111111-1111-1111-1111-111111111111' }],
    permissions: ['alerts.read', 'alerts.acknowledge', 'tickets.read', 'tickets.create', 'tickets.assign', 'tickets.resolve'],
    allowedUlbIds: ['11111111-1111-1111-1111-111111111111'],
    isGlobalAdmin: false,
  };

  const katraSupervisor: AuthContextUser = {
    id: 'user-ktr-sup',
    email: 'supervisor.ktr@smartlight.os',
    name: 'Katra Maintenance Supervisor',
    roles: [{ roleCode: 'MAINTENANCE_SUPERVISOR', ulbId: '22222222-2222-2222-2222-222222222222' }],
    permissions: ['alerts.read', 'alerts.acknowledge', 'tickets.read', 'tickets.create', 'tickets.assign', 'tickets.resolve'],
    allowedUlbIds: ['22222222-2222-2222-2222-222222222222'],
    isGlobalAdmin: false,
  };

  beforeEach(() => {
    dbService = new DatabaseService();
    dbService.seedFullFleet(365);
    maintenanceService = new MaintenanceService(dbService);
  });

  describe('Alert Lifecycle & State Transitions', () => {
    it('retrieves alerts filtered by ULB and severity', () => {
      // Ingest test alert in Ganderbal
      dbService.memoryStore.alerts.push({
        id: 'alt-test-01',
        ulb_id: '11111111-1111-1111-1111-111111111111',
        device_id: 'SIM-GBL-0001',
        code: 'VOLTAGE_ANOMALY',
        message: 'Grid surge detected: 268V',
        severity: 'CRITICAL',
        status: 'OPEN',
        opened_at: new Date().toISOString(),
      });

      const alerts = maintenanceService.getAlerts('11111111-1111-1111-1111-111111111111', 'OPEN', 'CRITICAL');
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some((a) => a.id === 'alt-test-01')).toBe(true);
      expect(alerts[0].severity).toBe('CRITICAL');
    });

    it('acknowledges an alert and records audit log', () => {
      const alertId = 'alt-ack-test';
      dbService.memoryStore.alerts.push({
        id: alertId,
        ulb_id: '11111111-1111-1111-1111-111111111111',
        device_id: 'SIM-GBL-0002',
        code: 'LAMP_FAILURE',
        message: 'Burnout detected: drawing 0W while desired ON',
        severity: 'MAJOR',
        status: 'OPEN',
        opened_at: new Date().toISOString(),
      });

      const acked = maintenanceService.acknowledgeAlert(alertId, ganderbalSupervisor);
      expect(acked.status).toBe('ACKNOWLEDGED');
      expect(acked.acknowledged_at).toBeDefined();

      // Verify audit log
      const log = dbService.memoryStore.auditLogs.find((l) => l.entity_id === alertId);
      expect(log).toBeDefined();
      expect(log?.action).toBe('ALERT_ACKNOWLEDGED');
    });

    it('rejects cross-ULB alert acknowledgment when user lacks scope', () => {
      const gblAlertId = 'alt-cross-ulb';
      dbService.memoryStore.alerts.push({
        id: gblAlertId,
        ulb_id: '11111111-1111-1111-1111-111111111111', // Ganderbal
        device_id: 'SIM-GBL-0003',
        code: 'DAY_BURNING',
        severity: 'WARNING',
        status: 'OPEN',
        opened_at: new Date().toISOString(),
      });

      // Katra supervisor attempts to acknowledge Ganderbal alert
      expect(() => maintenanceService.acknowledgeAlert(gblAlertId, katraSupervisor)).toThrow(
        /Cross-ULB access denied/,
      );
    });
  });

  describe('Automated Work Order Dispatch from Critical Alerts', () => {
    it('converts a CRITICAL alert into a CRITICAL maintenance ticket with auto-assignment', () => {
      const alertId = 'alt-crit-to-ticket';
      dbService.memoryStore.alerts.push({
        id: alertId,
        ulb_id: '11111111-1111-1111-1111-111111111111',
        device_id: 'b0000000-0000-0000-0000-000000000001',
        code: 'VOLTAGE_ANOMALY',
        message: 'Extreme grid overvoltage: 275V detected at Towheed Abad CCMS feeder',
        severity: 'CRITICAL',
        status: 'OPEN',
        opened_at: new Date().toISOString(),
      });

      const ticket = maintenanceService.createTicketFromAlert(alertId, ganderbalSupervisor);

      expect(ticket.id).toBeDefined();
      expect(ticket.priority).toBe('CRITICAL');
      expect(ticket.alertId).toBe(alertId);
      expect(ticket.status).toBe('OPEN');
      expect(ticket.assignedTo).toBeDefined(); // Auto-assigned Ganderbal technician

      // Verify original alert transitioned to ACKNOWLEDGED
      const originalAlert = maintenanceService.getAlertById(alertId);
      expect(originalAlert.status).toBe('ACKNOWLEDGED');
    });
  });

  describe('Maintenance Ticket Lifecycle & State Machine', () => {
    it('creates, assigns, advances status, and resolves ticket with auto-alert closure', () => {
      const alertId = 'alt-closure-test';
      dbService.memoryStore.alerts.push({
        id: alertId,
        ulb_id: '11111111-1111-1111-1111-111111111111',
        device_id: 'SIM-GBL-0005',
        code: 'LAMP_FAILURE',
        message: 'Driver output short-circuit',
        severity: 'MAJOR',
        status: 'OPEN',
        opened_at: new Date().toISOString(),
      });

      // 1. Create Ticket
      const createDto: CreateTicketDto = {
        ulbId: '11111111-1111-1111-1111-111111111111',
        alertId,
        deviceId: 'SIM-GBL-0005',
        title: 'Replace burnt 70W luminaire module',
        description: 'Pole #P-GBL-042 luminaire burnt due to lightning surge',
        priority: 'HIGH',
      };

      const ticket = maintenanceService.createTicket(createDto, ganderbalSupervisor);
      expect(ticket.id).toBeDefined();
      expect(ticket.status).toBe('OPEN');

      // 2. Assign Technician (Mohammad Iqbal, tech.ganderbal)
      const techUser = dbService.memoryStore.users.find((u) => u.email === 'tech.ganderbal@smartlight.os');
      expect(techUser).toBeDefined();

      const assigned = maintenanceService.assignTicket(ticket.id, techUser!.id, ganderbalSupervisor);
      expect(assigned.assignedTo).toBe(techUser!.id);
      expect(assigned.status).toBe('IN_PROGRESS');

      // 3. Resolve ticket and consume spare parts
      const initialSpdStock = dbService.memoryStore.spareParts.find((p) => p.code === 'PART-SPD-10KV')!.quantity_in_stock;

      const resolveDto: UpdateTicketDto = {
        status: 'RESOLVED',
        resolutionNotes: 'Replaced 10kV SPD unit and calibrated LED driver. Tested luminaire at 100% duty cycle.',
        sparePartsUsed: [
          {
            partId: 'part-4',
            partCode: 'PART-SPD-10KV',
            partName: '10kV Surge Protection Device',
            quantity: 1,
          },
        ],
      };

      const resolvedTicket = maintenanceService.updateTicket(ticket.id, resolveDto, ganderbalSupervisor);
      expect(resolvedTicket.status).toBe('RESOLVED');
      expect(resolvedTicket.resolvedAt).toBeDefined();
      expect(resolvedTicket.sparePartsUsed?.length).toBe(1);

      // Verify spare parts inventory deducted
      const updatedSpdStock = dbService.memoryStore.spareParts.find((p) => p.code === 'PART-SPD-10KV')!.quantity_in_stock;
      expect(updatedSpdStock).toBe(initialSpdStock - 1);

      // Verify associated alert automatically marked as RESOLVED
      const updatedAlert = maintenanceService.getAlertById(alertId);
      expect(updatedAlert.status).toBe('RESOLVED');
      expect(updatedAlert.resolved_at).toBeDefined();
    });

    it('prevents assigning technician belonging to another ULB', () => {
      // Create Ganderbal ticket
      const ticket = maintenanceService.createTicket(
        {
          ulbId: '11111111-1111-1111-1111-111111111111',
          title: 'Ganderbal Pole Maintenance',
          description: 'Routine inspection',
          priority: 'LOW',
        },
        adminUser,
      );

      // Add a Katra-only technician
      const katraTechId = 'user-tech-katra-only';
      dbService.memoryStore.users.push({
        id: katraTechId,
        email: 'tech.katra@smartlight.os',
        role_code: 'TECHNICIAN',
        ulb_id: '22222222-2222-2222-2222-222222222222',
        first_name: 'Vijay',
        last_name: 'Kumar',
        active: true,
      });

      // Attempt assigning Katra tech to Ganderbal ticket
      expect(() => maintenanceService.assignTicket(ticket.id, katraTechId, adminUser)).toThrow(
        /belongs to a different ULB/,
      );
    });
  });

  describe('Spare Parts Catalog & Inventory Management', () => {
    it('retrieves spare parts inventory and allows restocking', () => {
      const parts = maintenanceService.getSpareParts();
      expect(parts.length).toBeGreaterThanOrEqual(6);

      const spd = parts.find((p) => p.code === 'PART-SPD-10KV');
      expect(spd).toBeDefined();
      const prevStock = spd!.quantityInStock;

      const restocked = maintenanceService.restockSparePart(spd!.id, 50, adminUser);
      expect(restocked.quantityInStock).toBe(prevStock + 50);

      // Restock validation
      expect(() => maintenanceService.restockSparePart(spd!.id, 0, adminUser)).toThrow(
        /greater than zero/,
      );
    });
  });
});
