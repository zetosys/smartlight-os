import { describe, it, expect, beforeEach } from 'vitest';
import { UsersService } from '../src/modules/users/users.service';
import { DatabaseService } from '../src/database/database.service';
import { AuthContextUser } from '@smartlight/shared-types';

describe('Prompt 1 — Scoped User Administration & RBAC Enforcement', () => {
  let usersService: UsersService;
  let dbService: DatabaseService;

  const platformAdmin: AuthContextUser = {
    id: '40000000-0000-0000-0000-000000000001',
    email: 'admin@smartlight.os',
    name: 'Platform Admin',
    roles: [{ roleCode: 'PLATFORM_ADMIN', ulbId: null }],
    permissions: ['users.manage'],
    allowedUlbIds: ['*'],
    isGlobalAdmin: true,
  };

  const ganderbalAdmin: AuthContextUser = {
    id: 'user-gbl-admin',
    email: 'admin.ganderbal@smartlight.os',
    name: 'Ganderbal ULB Admin',
    roles: [{ roleCode: 'ULB_ADMIN', ulbId: '11111111-1111-1111-1111-111111111111' }],
    permissions: ['users.manage'],
    allowedUlbIds: ['11111111-1111-1111-1111-111111111111'],
    isGlobalAdmin: false,
  };

  beforeEach(() => {
    dbService = new DatabaseService();
    usersService = new UsersService(dbService);
  });

  it('allows platform admin to list all municipal users', () => {
    const list = usersService.listUsers(platformAdmin);
    expect(list.length).toBeGreaterThanOrEqual(5);
  });

  it('restricts scoped ULB admin to listing only their assigned municipal users', () => {
    const list = usersService.listUsers(ganderbalAdmin);
    // Should only see Ganderbal users, not Katra or Global
    for (const u of list) {
      expect(u.ulbId).toBe('11111111-1111-1111-1111-111111111111');
    }
  });

  it('allows scoped ULB admin to create a technician within their own ULB', () => {
    const newUser = usersService.createUser(
      {
        email: 'newtech.ganderbal@smartlight.os',
        firstName: 'Bashir',
        lastName: 'Lone',
        roleCode: 'TECHNICIAN',
        ulbId: '11111111-1111-1111-1111-111111111111',
      },
      ganderbalAdmin,
    );

    expect(newUser.id).toBeDefined();
    expect(newUser.email).toBe('newtech.ganderbal@smartlight.os');
    expect(newUser.ulbId).toBe('11111111-1111-1111-1111-111111111111');

    // Audit log check
    expect(
      dbService.memoryStore.auditLogs.some((l) => l.action === 'USER_CREATED'),
    ).toBe(true);
  });

  it('prevents scoped ULB admin from creating a user for a different ULB', () => {
    expect(() =>
      usersService.createUser(
        {
          email: 'illegal.katra@smartlight.os',
          firstName: 'Illegal',
          lastName: 'Cross',
          roleCode: 'CONTROL_OPERATOR',
          ulbId: '22222222-2222-2222-2222-222222222222', // Katra
        },
        ganderbalAdmin,
      ),
    ).toThrow(/Cannot create user for ULB/);
  });

  it('prevents scoped ULB admin from elevating a user to PLATFORM_ADMIN', () => {
    expect(() =>
      usersService.createUser(
        {
          email: 'escalation@smartlight.os',
          firstName: 'Privilege',
          lastName: 'Escalation',
          roleCode: 'PLATFORM_ADMIN',
        },
        ganderbalAdmin,
      ),
    ).toThrow(/Only Platform Administrators can create PLATFORM_ADMIN/);
  });

  it('toggles user active status and records audit trail', () => {
    const tech = dbService.memoryStore.users.find((u) => u.email === 'tech.ganderbal@smartlight.os')!;
    expect(tech.active).toBe(true);

    usersService.toggleActive(tech.id, platformAdmin);
    expect(tech.active).toBe(false);

    expect(
      dbService.memoryStore.auditLogs.some((l) => l.action === 'USER_STATUS_TOGGLED'),
    ).toBe(true);
  });

  it('returns complete role permissions matrix matching tender specifications', () => {
    const matrix = usersService.getRolePermissionsMatrix();
    expect(matrix.length).toBe(8);
    const adminRole = matrix.find((m) => m.roleCode === 'PLATFORM_ADMIN');
    expect(adminRole?.permissions).toContain('org.manage');
    expect(adminRole?.permissions).toContain('users.manage');
    expect(adminRole?.permissions).toContain('devices.command');

    const reportsViewerRole = matrix.find((m) => m.roleCode === 'REPORTS_VIEWER');
    expect(reportsViewerRole).toBeDefined();
    expect(reportsViewerRole?.permissions).toEqual(['reports.read', 'reports.export']);
    expect(reportsViewerRole?.permissions).not.toContain('devices.command');
    expect(reportsViewerRole?.permissions).not.toContain('assets.write');
    expect(reportsViewerRole?.permissions).not.toContain('users.manage');
  });
});
