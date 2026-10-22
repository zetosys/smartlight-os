import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../src/modules/auth/auth.service';
import { DatabaseService } from '../src/database/database.service';

describe('Prompt 1 — MFA Identity & Challenge Lifecycle', () => {
  let authService: AuthService;
  let dbService: DatabaseService;

  beforeEach(() => {
    dbService = new DatabaseService();
    authService = new AuthService(dbService);
  });

  it('triggers MFA challenge when mfa_enabled is true (e.g. Platform Admin)', async () => {
    const res = await authService.login({
      email: 'admin@smartlight.os',
      password: 'SmartLight@2026!',
    });

    expect(res.mfaRequired).toBe(true);
    expect(res.mfaChallengeToken).toBeDefined();
    expect(res.mfaMethod).toBe('TOTP');
    expect(res.accessToken).toBeUndefined();

    // Verify audit log recorded challenge
    const logs = dbService.memoryStore.auditLogs;
    expect(logs.some((l) => l.action === 'MFA_CHALLENGE_ISSUED')).toBe(true);
  });

  it('allows direct session establishment when MFA is disabled (e.g. Field Operator)', async () => {
    const res = await authService.login({
      email: 'operator.ganderbal@smartlight.os',
      password: 'SmartLight@2026!',
    });

    expect(res.mfaRequired).toBe(false);
    expect(res.accessToken).toBeDefined();
    expect(res.user?.email).toBe('operator.ganderbal@smartlight.os');
  });

  it('rejects invalid MFA verification code', async () => {
    const loginRes = await authService.login({
      email: 'admin@smartlight.os',
      password: 'SmartLight@2026!',
    });

    await expect(
      authService.verifyMfa({
        mfaChallengeToken: loginRes.mfaChallengeToken!,
        code: '000000', // Invalid OTP
      }),
    ).rejects.toThrow(/Invalid MFA verification code/);
  });

  it('completes login and issues access token upon valid MFA code (123456)', async () => {
    const loginRes = await authService.login({
      email: 'admin@smartlight.os',
      password: 'SmartLight@2026!',
    });

    const verifyRes = await authService.verifyMfa({
      mfaChallengeToken: loginRes.mfaChallengeToken!,
      code: '123456',
    });

    expect(verifyRes.accessToken).toBeDefined();
    expect(verifyRes.user?.email).toBe('admin@smartlight.os');
    expect(verifyRes.user?.mfaVerified).toBe(true);
    expect(verifyRes.user?.isGlobalAdmin).toBe(true);

    // Verify audit log recorded successful verification
    const logs = dbService.memoryStore.auditLogs;
    expect(logs.some((l) => l.action === 'MFA_VERIFIED')).toBe(true);
  });

  it('blocks login for deactivated accounts', async () => {
    // Deactivate Katra operator
    const user = dbService.memoryStore.users.find((u) => u.email === 'operator.katra@smartlight.os');
    if (user) user.active = false;

    await expect(
      authService.login({
        email: 'operator.katra@smartlight.os',
        password: 'SmartLight@2026!',
      }),
    ).rejects.toThrow(/deactivated/);
  });
});
