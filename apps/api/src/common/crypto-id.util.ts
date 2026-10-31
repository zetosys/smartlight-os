import { randomBytes } from 'node:crypto';

/**
 * Generates a cryptographically secure, timestamped unique identifier.
 * Complies with OWASP Cryptographic Failures & Semgrep secure PRNG rules.
 */
export function generateSecureId(prefix: string): string {
  const entropy = randomBytes(4).toString('hex');
  return `${prefix}-${Date.now()}-${entropy}`;
}
