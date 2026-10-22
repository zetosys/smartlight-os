import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UserListItem,
  AuthContextUser,
  UserRole,
  ROLE_PERMISSIONS_MAP,
} from '@smartlight/shared-types';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  public listUsers(requestingUser: AuthContextUser): UserListItem[] {
    let users = this.db.memoryStore.users;

    // ULB Scoping: Non-global admins can only view users in their assigned ULB
    if (!requestingUser.isGlobalAdmin && !requestingUser.allowedUlbIds.includes('*')) {
      users = users.filter(
        (u) => u.ulb_id && requestingUser.allowedUlbIds.includes(u.ulb_id),
      );
    }

    return users.map((u) => {
      const ulb = u.ulb_id
        ? this.db.memoryStore.ulbs.find((ulb) => ulb.id === u.ulb_id)
        : null;

      return {
        id: u.id,
        email: u.email,
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
        firstName: u.first_name || '',
        lastName: u.last_name || '',
        active: u.active,
        mfaEnabled: !!u.mfa_enabled,
        roleCode: u.role_code as UserRole,
        ulbId: u.ulb_id,
        ulbName: ulb?.name || (u.role_code === 'PLATFORM_ADMIN' || u.role_code === 'AUDITOR' ? 'All ULBs (Global)' : 'Unassigned'),
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
      };
    });
  }

  public getUserById(id: string, requestingUser: AuthContextUser): UserListItem {
    const u = this.db.memoryStore.users.find((user) => user.id === id);
    if (!u) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    // ULB Scoping check
    if (
      !requestingUser.isGlobalAdmin &&
      !requestingUser.allowedUlbIds.includes('*') &&
      (!u.ulb_id || !requestingUser.allowedUlbIds.includes(u.ulb_id))
    ) {
      throw new ForbiddenException('You are not authorized to view users outside your assigned ULB');
    }

    const ulb = u.ulb_id
      ? this.db.memoryStore.ulbs.find((ulb) => ulb.id === u.ulb_id)
      : null;

    return {
      id: u.id,
      email: u.email,
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
      firstName: u.first_name || '',
      lastName: u.last_name || '',
      active: u.active,
      mfaEnabled: !!u.mfa_enabled,
      roleCode: u.role_code as UserRole,
      ulbId: u.ulb_id,
      ulbName: ulb?.name || 'All ULBs (Global)',
      lastLoginAt: u.last_login_at,
      createdAt: u.created_at,
    };
  }

  public createUser(dto: CreateUserDto, requestingUser: AuthContextUser): UserListItem {
    const emailNorm = (dto.email || '').trim().toLowerCase();
    if (!emailNorm || !dto.firstName || !dto.lastName || !dto.roleCode) {
      throw new BadRequestException('Email, first name, last name, and roleCode are required');
    }

    // Check duplicate email
    const exists = this.db.memoryStore.users.some(
      (u) => u.email.toLowerCase() === emailNorm,
    );
    if (exists) {
      throw new ConflictException(`User with email '${dto.email}' already exists`);
    }

    // Scoping check: Non-global admins cannot create global platform admins or users for other ULBs
    if (!requestingUser.isGlobalAdmin) {
      if (dto.roleCode === 'PLATFORM_ADMIN') {
        throw new ForbiddenException('Only Platform Administrators can create PLATFORM_ADMIN accounts');
      }
      if (!dto.ulbId || !requestingUser.allowedUlbIds.includes(dto.ulbId)) {
        throw new ForbiddenException(
          `Cannot create user for ULB '${dto.ulbId}'. You are only authorized for: ${requestingUser.allowedUlbIds.join(', ')}`,
        );
      }
    }

    const newId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newUser = {
      id: newId,
      email: emailNorm,
      password: dto.password || 'SmartLight@2026!',
      first_name: dto.firstName,
      last_name: dto.lastName,
      role_code: dto.roleCode,
      ulb_id: dto.roleCode === 'PLATFORM_ADMIN' || dto.roleCode === 'AUDITOR' ? null : dto.ulbId || null,
      active: true,
      mfa_enabled: dto.roleCode === 'PLATFORM_ADMIN' ? true : !!dto.mfaEnabled,
      mfa_secret: dto.mfaEnabled ? 'JBSWY3DPEHPK3PXP' : null,
      mfa_method: 'TOTP',
      last_login_at: null,
      created_at: now,
    };

    this.db.memoryStore.users.push(newUser);

    this.recordAudit(requestingUser, 'USER_CREATED', newId, {
      email: newUser.email,
      roleCode: newUser.role_code,
      ulbId: newUser.ulb_id,
      mfaEnabled: newUser.mfa_enabled,
    });

    return this.getUserById(newId, requestingUser);
  }

  public updateUser(
    id: string,
    dto: UpdateUserDto,
    requestingUser: AuthContextUser,
  ): UserListItem {
    const user = this.db.memoryStore.users.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    // Scoping check
    if (
      !requestingUser.isGlobalAdmin &&
      !requestingUser.allowedUlbIds.includes('*') &&
      (!user.ulb_id || !requestingUser.allowedUlbIds.includes(user.ulb_id))
    ) {
      throw new ForbiddenException('You cannot update users outside your assigned ULB');
    }

    if (dto.firstName !== undefined) user.first_name = dto.firstName;
    if (dto.lastName !== undefined) user.last_name = dto.lastName;
    if (dto.active !== undefined) user.active = dto.active;
    if (dto.password) user.password = dto.password;
    if (dto.mfaEnabled !== undefined) {
      user.mfa_enabled = dto.mfaEnabled;
      if (dto.mfaEnabled && !user.mfa_secret) {
        user.mfa_secret = 'JBSWY3DPEHPK3PXP';
      }
    }
    if (dto.roleCode !== undefined) {
      if (!requestingUser.isGlobalAdmin && dto.roleCode === 'PLATFORM_ADMIN') {
        throw new ForbiddenException('Cannot promote user to PLATFORM_ADMIN');
      }
      user.role_code = dto.roleCode;
    }
    if (dto.ulbId !== undefined) {
      if (!requestingUser.isGlobalAdmin && !requestingUser.allowedUlbIds.includes(dto.ulbId || '')) {
        throw new ForbiddenException('Cannot reassign user to an unauthorized ULB');
      }
      user.ulb_id = dto.ulbId;
    }

    this.recordAudit(requestingUser, 'USER_UPDATED', id, {
      updatedFields: Object.keys(dto),
    });

    return this.getUserById(id, requestingUser);
  }

  public toggleActive(id: string, requestingUser: AuthContextUser): UserListItem {
    const user = this.db.memoryStore.users.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    if (user.id === requestingUser.id) {
      throw new BadRequestException('Cannot deactivate your own active account');
    }

    user.active = !user.active;

    this.recordAudit(requestingUser, 'USER_STATUS_TOGGLED', id, {
      active: user.active,
    });

    return this.getUserById(id, requestingUser);
  }

  public toggleMfa(id: string, requestingUser: AuthContextUser): UserListItem {
    const user = this.db.memoryStore.users.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    user.mfa_enabled = !user.mfa_enabled;
    if (user.mfa_enabled && !user.mfa_secret) {
      user.mfa_secret = 'JBSWY3DPEHPK3PXP';
    }

    this.recordAudit(requestingUser, 'USER_MFA_TOGGLED', id, {
      mfaEnabled: user.mfa_enabled,
    });

    return this.getUserById(id, requestingUser);
  }

  public getRolePermissionsMatrix() {
    return Object.entries(ROLE_PERMISSIONS_MAP).map(([role, permissions]) => ({
      roleCode: role,
      permissions,
    }));
  }

  private recordAudit(
    actor: AuthContextUser,
    action: string,
    entityId: string,
    details: Record<string, unknown>,
  ) {
    this.db.memoryStore.auditLogs.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ulb_id: null,
      actor_id: actor.id,
      actor_email: actor.email,
      action,
      entity_type: 'USER',
      entity_id: entityId,
      details,
      occurred_at: new Date().toISOString(),
    });
  }
}
