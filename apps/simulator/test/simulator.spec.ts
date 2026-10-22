import { describe, it, expect, beforeEach } from 'vitest';
import { SimulatorAdapter, AdapterRegistry } from '@smartlight/device-contracts';
import { SimulatorService } from '../src/runner';
import { DeterministicRng, generateSampleTelemetry } from '../src/deterministic-dataset';

describe('Simulator Foundation & DeviceAdapter Contract', () => {
  let adapter: SimulatorAdapter;

  beforeEach(() => {
    adapter = new SimulatorAdapter();
    adapter.initDevice('TEST-DEV-001', 70, false);
  });

  it('implements DeviceAdapter interface with correct ID', () => {
    expect(adapter.id).toBe('SIMULATOR');
  });

  it('registers and retrieves adapter from AdapterRegistry', () => {
    const registry = AdapterRegistry.getInstance();
    registry.register(adapter);
    expect(registry.hasAdapter('SIMULATOR')).toBe(true);
    expect(registry.getAdapter('SIMULATOR')).toBe(adapter);
  });

  it('reports capabilities without dimming or firmware in Prompt 0', async () => {
    const caps = await adapter.capabilities('TEST-DEV-001');
    expect(caps.switching).toBe(true);
    expect(caps.dimming).toBe(false);
    expect(caps.firmware).toBe(false);
    expect(caps.telemetryFields).toContain('voltage');
    expect(caps.telemetryFields).toContain('powerWatts');
  });

  it('handles TURN_ON command and updates virtual reported state', async () => {
    const initialStatus = await adapter.getStatus('TEST-DEV-001');
    expect(initialStatus?.reportedOn).toBe(false);
    expect(initialStatus?.powerWatts).toBe(0);

    const dispatch = await adapter.sendCommand({
      commandId: 'cmd-1',
      deviceId: 'TEST-DEV-001',
      type: 'TURN_ON',
      idempotencyKey: 'idem-test-1234',
    });

    expect(dispatch.accepted).toBe(true);
    expect(dispatch.transportReference).toContain('idem-test');

    const updatedStatus = await adapter.getStatus('TEST-DEV-001');
    expect(updatedStatus?.reportedOn).toBe(true);
    expect(updatedStatus?.powerWatts).toBeGreaterThan(65);
    expect(updatedStatus?.current).toBeGreaterThan(0.2);
    expect(updatedStatus?.source).toBe('SIMULATOR');
  });

  it('handles TURN_OFF command and resets power to zero', async () => {
    // First turn on
    await adapter.sendCommand({
      commandId: 'cmd-1',
      deviceId: 'TEST-DEV-001',
      type: 'TURN_ON',
      idempotencyKey: 'idem-1',
    });

    // Then turn off
    const dispatch = await adapter.sendCommand({
      commandId: 'cmd-2',
      deviceId: 'TEST-DEV-001',
      type: 'TURN_OFF',
      idempotencyKey: 'idem-2',
    });

    expect(dispatch.accepted).toBe(true);
    const updatedStatus = await adapter.getStatus('TEST-DEV-001');
    expect(updatedStatus?.reportedOn).toBe(false);
    expect(updatedStatus?.powerWatts).toBe(0);
    expect(updatedStatus?.current).toBe(0);
  });

  it('rejects commands when device is offline in simulator layer', async () => {
    adapter.setDeviceOnline('TEST-DEV-001', false);

    const dispatch = await adapter.sendCommand({
      commandId: 'cmd-3',
      deviceId: 'TEST-DEV-001',
      type: 'TURN_ON',
      idempotencyKey: 'idem-3',
    });

    expect(dispatch.accepted).toBe(false);
    expect(dispatch.error).toContain('offline');
  });

  it('produces deterministic telemetry values given fixed seed', () => {
    const rng1 = new DeterministicRng(365);
    const r1 = generateSampleTelemetry('DEV-1', 70, true, rng1);

    const rng2 = new DeterministicRng(365);
    const r2 = generateSampleTelemetry('DEV-1', 70, true, rng2);

    expect(r1.powerWatts).toBe(r2.powerWatts);
    expect(r1.voltage).toBe(r2.voltage);
    expect(r1.current).toBe(r2.current);
    expect(r1.energyKwh).toBe(r2.energyKwh);
  });
});
