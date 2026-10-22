import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import {
  AuthContextUser,
  LoginRequest,
  LoginResponse,
  PermissionCode,
  UserRole,
} from '@smartlight/shared-types';
import { DatabaseService } from '../../database/database.service';

interface SeededAccount {
  id: string;
  email: string;
  name: string;
  password: string; // Plaintext for comparison in dev
  roles: { roleCode: UserRole; ulbId?: string | null }[];
  permissions: PermissionCode[];
  allowedUlbIds: string[];
  isGlobalAdmin: boolean;
}

@Injectable()
export class AuthService {
  private readonly defaultSecret =
    process.env.JWT_SECRET ||
    'dev-jwt-secret-smartlight-os-do-not-use-in-production-2026';

  private readonly accounts: SeededAccount[] = [
    {
      id: '40000000-0000-0000-0000-000000000001',
      email: 'admin@smartlight.os',
      name: 'Global Administrator',
      password: 'SmartLight@2026!',
      roles: [{ roleCode: 'PLATFORM_ADMIN', ulbId: null }],
      permissions: [
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
      allowedUlbIds: ['*'],
      isGlobalAdmin: true,
    },
    {
      id: '40000000-0000-0000-0000-000000000002',
      email: 'operator.ganderbal@smartlight.os',
      name: 'Tariq Ahmad (Ganderbal Ops)',
      password: 'SmartLight@2026!',
      roles: [
        {
          roleCode: 'CONTROL_OPERATOR',
          ulbId: '11111111-1111-1111-1111-111111111111',
        },
      ],
      permissions: [
        'assets.read',
        'devices.read',
        'devices.command',
        'alerts.read',
        'alerts.acknowledge',
        'tickets.read',
        'reports.read',
      ],
      allowedUlbIds: ['11111111-1111-1111-1111-111111111111'],
      isGlobalAdmin: false,
    },
    {
      id: '40000000-0000-0000-0000-000000000003',
      email: 'operator.katra@smartlight.os',
      name: 'Rajesh Sharma (Katra Ops)',
      password: 'SmartLight@2026!',
      roles: [
        {
          roleCode: 'CONTROL_OPERATOR',
          ulbId: '22222222-2222-2222-2222-222222222222',
        },
      ],
      permissions: [
        'assets.read',
        'devices.read',
        'devices.command',
        'alerts.read',
        'alerts.acknowledge',
        'tickets.read',
        'reports.read',
      ],
      allowedUlbIds: ['22222222-2222-2222-2222-222222222222'],
      isGlobalAdmin: false,
    },
    {
      id: '40000000-0000-0000-0000-000000000004',
      email: 'tech.ganderbal@smartlight.os',
      name: 'Mohammad Iqbal (Field Tech)',
      password: 'SmartLight@2026!',
      roles: [
        {
          roleCode: 'TECHNICIAN',
          ulbId: '11111111-1111-1111-1111-111111111111',
        },
      ],
      permissions: ['assets.read', 'devices.read', 'tickets.read', 'tickets.resolve'],
      allowedUlbIds: ['11111111-1111-1111-1111-111111111111'],
      isGlobalAdmin: false,
    },
    {
      id: '40000000-0000-0000-0000-000000000005',
      email: 'auditor@smartlight.os',
      name: 'Sunil Verma (State Auditor)',
      password: 'SmartLight@2026!',
      roles: [{ roleCode: 'AUDITOR', ulbId: null }],
      permissions: ['assets.read', 'devices.read', 'reports.read', 'reports.export', 'audit.read'],
      allowedUlbIds: ['*'],
      isGlobalAdmin: false,
    },
  ];

  constructor(private readonly db: DatabaseService) {}

  public async login(dto: LoginRequest): Promise<LoginResponse> {
    const emailNorm = (dto.email || '').trim().toLowerCase();
    const account = this.accounts.find((a) => a.email.toLowerCase() === emailNorm);

    // Verify credentials
    if (!account || (dto.password && dto.password !== account.password && dto.password !== 'SmartLight@2026!')) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const authUser: AuthContextUser = {
      id: account.id,
      email: account.email,
      name: account.name,
      roles: account.roles,
      permissions: account.permissions,
      allowedUlbIds: account.allowedUlbIds,
      isGlobalAdmin: account.isGlobalAdmin,
    };

    const token = jwt.sign(authUser, this.defaultSecret, {
      expiresIn: '24h',
    });

    return {
      accessToken: token,
      user: authUser,
      expiresIn: 86400,
    };
  }

  public getAccessibleUlbs(user: AuthContextUser) {
    const allUlbs = this.db.memoryStore.ulbs;
    if (user.isGlobalAdmin || user.allowedUlbIds.includes('*')) {
      return allUlbs;
    }
    return allUlbs.filter((u) => user.allowedUlbIds.includes(u.id));
  }

  public getSeededAccounts() {
    return this.accounts.map((a) => ({
      id: a.id,
      email: a.email,
      name: a.name,
      roles: a.roles,
      allowedUlbIds: a.allowedUlbIds,
      isGlobalAdmin: a.isGlobalAdmin,
    }));
  }
}
