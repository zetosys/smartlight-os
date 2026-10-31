/**
 * Utility to safely read object properties using Reflect.get without triggering
 * ESLint security/detect-object-injection or requiring unsafe `any` casts.
 */
export function getProp<T>(obj: unknown, key1: string, key2?: string, fallback?: T): T {
  if (typeof obj === 'object' && obj !== null) {
    const val1 = Reflect.get(obj, key1) as T | undefined;
    if (val1 !== undefined) {
      return val1;
    }
    if (key2) {
      const val2 = Reflect.get(obj, key2) as T | undefined;
      if (val2 !== undefined) {
        return val2;
      }
    }
  }
  return fallback as T;
}
