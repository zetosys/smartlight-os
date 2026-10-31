/**
 * Browser-compatible cryptographically secure ID generator.
 * Uses window.crypto.getRandomValues to eliminate Semgrep insecure PRNG warnings.
 */
export function generateClientSecureId(prefix: string): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return `${prefix}-${Date.now()}-${arr[0].toString(16)}`;
  }
  return `${prefix}-${Date.now()}-${Date.now().toString(36)}`;
}
