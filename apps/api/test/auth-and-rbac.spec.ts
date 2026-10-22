import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../src/modules/auth/auth.service';
import { DatabaseService } from '../src/database/database.service';

describe('Authentication & Scoped RBAC Matrix', () => {
  let authService: AuthService;
  let dbService: DatabaseService;

  beforeEach(() => {
    dbService = new DatabaseService();
    authService = new AuthService(dbService);
  });

  it('authenticates global platform admin with MFA challenge and unrestricted access', async () => {
    const loginRes = await authService.login({
      email: 'admin@smartlight.os',
      password: 'SmartLight@2026!',
    });

    expect(loginRes.mfaRequired).toBe(true);
    expect(loginRes.mfaChallengeToken).toBeDefined();

    // Verify MFA step
    const res = await authService.verifyMfa({
      mfaChallengeToken: loginRes.mfaChallengeToken!,
      code: '123456',
    });

    expect(res.accessToken).toBeDefined();
    expect(res.user?.isGlobalAdmin).toBe(true);
    expect(res.user?.allowedUlbIds).toContain('*');
    expect(res.user?.permissions).toContain('devices.command');
    expect(res.user?.permissions).toContain('simulator.manage');
  });

  it('authenticates Ganderbal operator with ULB-scoped restrictions', async () => {
    const res = await authService.login({
      email: 'operator.ganderbal@smartlight.os',
      password: 'SmartLight@2026!',
    });

    expect(res.user?.isGlobalAdmin).toBe(false);
    expect(res.user?.allowedUlbIds).toEqual(['11111111-1111-1111-1111-111111111111']);
    expect(res.user?.allowedUlbIds).not.toContain('22222222-2222-2222-2222-222222222222');
    expect(res.user?.permissions).toContain('devices.command');
    expect(res.user?.permissions).not.toContain('simulator.manage');
  });

  it('authenticates Katra operator with Katra-only access', async () => {
    const res = await authService.login({
      email: 'operator.katra@smartlight.os',
      password: 'SmartLight@2026!',
    });

    expect(res.user?.isGlobalAdmin).toBe(false);
    expect(res.user?.allowedUlbIds).toEqual(['22222222-2222-2222-2222-222222222222']);
  });

  it('rejects invalid password', async () => {
    await expect(
      authService.login({
        email: 'admin@smartlight.os',
        password: 'wrong-password',
      }),
    ).rejects.toThrow();
  });

  it('filters accessible ULBs by user scope', async () => {
    const gblRes = await authService.login({
      email: 'operator.ganderbal@smartlight.os',
    });
    const gblUlbs = authService.getAccessibleUlbs(gblRes.user!);
    expect(gblUlbs.length).toBe(1);
    expect(gblUlbs[0].code).toBe('ULB-GBL');

    const adminLogin = await authService.login({
      email: 'admin@smartlight.os',
    });
    const adminRes = await authService.verifyMfa({
      mfaChallengeToken: adminLogin.mfaChallengeToken!,
      code: '123456',
    });
    const adminUlbs = authService.getAccessibleUlbs(adminRes.user!);
    expect(adminUlbs.length).toBe(2);
  });
});
