import { describe, it, expect, beforeEach } from 'vitest';
import { HealthService } from '../src/modules/health/health.service';
import { DatabaseService } from '../src/database/database.service';
import { SimulatorAdapter, AdapterRegistry } from '@smartlight/device-contracts';

describe('Health Checks & System Observability', () => {
  let healthService: HealthService;
  let dbService: DatabaseService;

  beforeEach(() => {
    dbService = new DatabaseService();
    healthService = new HealthService(dbService);
    AdapterRegistry.getInstance().register(new SimulatorAdapter());
  });

  it('returns valid health payload with component status and uptime', () => {
    const health = healthService.getSystemHealth();
    expect(health.version).toBe('0.1.0-alpha');
    expect(health.uptime).toBeGreaterThanOrEqual(0);
    expect(health.checks.adapterRegistry.loadedAdapters).toContain('SIMULATOR');
    expect(['healthy', 'degraded']).toContain(health.status);
  });
});
