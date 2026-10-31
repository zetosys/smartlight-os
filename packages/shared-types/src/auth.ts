export type UserRole =
  | 'PLATFORM_ADMIN'
  | 'ULB_ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'CONTROL_OPERATOR'
  | 'MAINTENANCE_SUPERVISOR'
  | 'TECHNICIAN'
  | 'AUDITOR'
  | 'REPORTS_VIEWER';

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

export const ROLE_PERMISSIONS_MAP: Record<UserRole, PermissionCode[]> = {
  PLATFORM_ADMIN: [
    'org.manage',
    'users.manage',
    'assets.read',
    'assets.write',
    'devices.read',
    'devices.configure',
    'devices.command',
    'schedules.manage',
    'alerts.read',
    'alerts.acknowledge',
    'tickets.read',
    'tickets.create',
    'tickets.assign',
    'tickets.resolve',
    'reports.read',
    'reports.export',
    'simulator.manage',
    'audit.read',
    'integrations.manage',
  ],
  ULB_ADMIN: [
    'users.manage',
    'assets.read',
    'assets.write',
    'devices.read',
    'devices.configure',
    'devices.command',
    'schedules.manage',
    'alerts.read',
    'alerts.acknowledge',
    'tickets.read',
    'tickets.create',
    'tickets.assign',
    'tickets.resolve',
    'reports.read',
    'reports.export',
    'audit.read',
  ],
  OPERATIONS_MANAGER: [
    'assets.read',
    'devices.read',
    'devices.configure',
    'devices.command',
    'schedules.manage',
    'alerts.read',
    'alerts.acknowledge',
    'tickets.read',
    'reports.read',
    'reports.export',
  ],
  CONTROL_OPERATOR: [
    'assets.read',
    'devices.read',
    'devices.command',
    'alerts.read',
    'alerts.acknowledge',
    'tickets.read',
    'reports.read',
  ],
  MAINTENANCE_SUPERVISOR: [
    'assets.read',
    'devices.read',
    'alerts.read',
    'alerts.acknowledge',
    'tickets.read',
    'tickets.create',
    'tickets.assign',
    'tickets.resolve',
    'reports.read',
  ],
  TECHNICIAN: [
    'assets.read',
    'devices.read',
    'tickets.read',
    'tickets.resolve',
  ],
  AUDITOR: [
    'assets.read',
    'devices.read',
    'reports.read',
    'reports.export',
    'audit.read',
  ],
  REPORTS_VIEWER: [
    'reports.read',
    'reports.export',
  ],
};

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  externalSubject: string;
  active: boolean;
  mfaEnabled?: boolean;
  mfaMethod?: 'TOTP' | 'EMAIL';
  lastLoginAt?: string;
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
  mfaVerified?: boolean;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface LoginResponse {
  mfaRequired?: boolean;
  mfaChallengeToken?: string;
  mfaMethod?: 'TOTP' | 'EMAIL';
  accessToken?: string;
  user?: AuthContextUser;
  expiresIn?: number;
}

export interface MfaVerifyRequest {
  mfaChallengeToken: string;
  code: string;
}

export interface CreateUserDto {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  roleCode: UserRole;
  ulbId?: string | null;
  mfaEnabled?: boolean;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  active?: boolean;
  roleCode?: UserRole;
  ulbId?: string | null;
  mfaEnabled?: boolean;
  password?: string;
}

export interface UserListItem {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  active: boolean;
  mfaEnabled: boolean;
  roleCode: UserRole;
  ulbId?: string | null;
  ulbName?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
}
