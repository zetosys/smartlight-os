export type UserRole =
  | 'PLATFORM_ADMIN'
  | 'ULB_ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'CONTROL_OPERATOR'
  | 'MAINTENANCE_SUPERVISOR'
  | 'TECHNICIAN'
  | 'AUDITOR';

export type PermissionCode =
  | 'org.manage'
  | 'users.manage'
  | 'assets.read'
  | 'assets.write'
  | 'devices.read'
  | 'devices.configure'
  | 'devices.command'
  | 'schedules.manage'
  | 'alerts.read'
  | 'alerts.acknowledge'
  | 'tickets.read'
  | 'tickets.create'
  | 'tickets.assign'
  | 'tickets.resolve'
  | 'reports.read'
  | 'reports.export'
  | 'simulator.manage'
  | 'audit.read'
  | 'integrations.manage';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  externalSubject: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserRoleAssignment {
  userId: string;
  roleId: string;
  roleCode: UserRole;
  ulbId?: string | null;
  ulbName?: string | null;
}

export interface AuthContextUser {
  id: string;
  email: string;
  name: string;
  roles: {
    roleCode: UserRole;
    ulbId?: string | null;
  }[];
  permissions: PermissionCode[];
  allowedUlbIds: string[]; // empty or contains specific ULBs; ['*'] or PLATFORM_ADMIN means all
  isGlobalAdmin: boolean;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthContextUser;
  expiresIn: number;
}
