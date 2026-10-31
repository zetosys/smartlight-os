import { AdapterRegistry, SimulatorAdapter, DeviceCommand } from '@smartlight/device-contracts';
import { DeterministicRng } from './deterministic-dataset';
import { generateFleet, generateDeviceTelemetry, GeneratedFleet } from './fleet-generator';
import {
  TelemetryReading,
  SimulatorFleetStatus,
  FaultInjectionDto,
} from '@smartlight/shared-types';

export class SimulatorService {
  private readonly adapter: SimulatorAdapter;
  private readonly rng: DeterministicRng;
  private isRunning: boolean = false;
  private intervalTimer?: NodeJS.Timeout;
  private fleet: GeneratedFleet;
  private activeFaults: Map<string, { faultCode: string; injectedAt: string }> = new Map();
  private emissionIntervalMs: number = 10000;
  private lastTickAt?: string;

  constructor(seed: number = 365) {
    this.adapter = new SimulatorAdapter();
    this.rng = new DeterministicRng(seed);
    this.fleet = generateFleet(seed);
    this.bootstrapDevices();
  }

  private bootstrapDevices(): void {
    for (const dev of this.fleet.devices) {
      this.adapter.initDevice(dev.id, dev.nominal_wattage, dev.reported_on);
      this.adapter.initDevice(dev.external_id, dev.nominal_wattage, dev.reported_on);
    }
    // Register adapter in the global hardware abstraction registry
    AdapterRegistry.getInstance().register(this.adapter);
  }

  public getAdapter(): SimulatorAdapter {
    return this.adapter;
  }

  public getFleet(): GeneratedFleet {
    return this.fleet;
  }

  public async executeCommand(command: DeviceCommand) {
    return this.adapter.sendCommand(command);
  }

  public async getDeviceTelemetry(deviceId: string) {
    return this.adapter.getStatus(deviceId);
  }

  public getStatus(): SimulatorFleetStatus {
    const activeFaultsList = Array.from(this.activeFaults.entries()).map(([deviceId, info]) => ({
      deviceId,
      faultCode: info.faultCode,
      injectedAt: info.injectedAt,
    }));

    return {
      adapterId: this.adapter.id,
      scenarioName: '4,608 Fleet Municipal Control Room Simulation',
      seed: this.fleet.seed,
      activeDevices: this.fleet.devices.length,
      isRunning: this.isRunning,
      emissionIntervalMs: this.emissionIntervalMs,
      ulbBreakdown: {
        ganderbal: {
          total: this.fleet.breakdown.ganderbal.total,
          '35W': this.fleet.breakdown.ganderbal['35W'],
          '70W': this.fleet.breakdown.ganderbal['70W'],
          '110W': this.fleet.breakdown.ganderbal['110W'],
        },
        katra: {
          total: this.fleet.breakdown.katra.total,
          '35W': this.fleet.breakdown.katra['35W'],
          '70W': this.fleet.breakdown.katra['70W'],
          '110W': this.fleet.breakdown.katra['110W'],
        },
      },
      fleetBreakdown: {
        '35W': this.fleet.breakdown.ganderbal['35W'] + this.fleet.breakdown.katra['35W'],
        '70W': this.fleet.breakdown.ganderbal['70W'] + this.fleet.breakdown.katra['70W'],
        '110W': this.fleet.breakdown.ganderbal['110W'] + this.fleet.breakdown.katra['110W'],
      },
      activeFaults: activeFaultsList,
      lastTickAt: this.lastTickAt,
    };
  }

  public injectFault(dto: FaultInjectionDto): { affectedCount: number; faultCode: string } {
    let affectedCount = 0;
    const nowIso = new Date().toISOString();

    if (dto.deviceId) {
      this.activeFaults.set(dto.deviceId, { faultCode: dto.faultCode, injectedAt: nowIso });
      this.adapter.injectFault(dto.deviceId, dto.faultCode);
      affectedCount = 1;
    } else {
      // Filter candidates by ULB if specified
      let candidates = this.fleet.devices;
      if (dto.ulbId) {
        candidates = candidates.filter((d) => d.ulb_id === dto.ulbId);
      }

      const percent = dto.percentage ? Math.min(Math.max(dto.percentage, 1), 100) : 5;
      const countToAffect = Math.max(1, Math.floor((candidates.length * percent) / 100));

      for (let i = 0; i < countToAffect; i++) {
        const randIdx = Math.floor(this.rng.next() * candidates.length);
        const dev = candidates.at(randIdx);
        if (dev) {
          this.activeFaults.set(dev.external_id, { faultCode: dto.faultCode, injectedAt: nowIso });
          this.adapter.injectFault(dev.external_id, dto.faultCode);
          affectedCount++;
        }
      }
    }

    return { affectedCount, faultCode: dto.faultCode };
  }

  public clearFaults(deviceId?: string): void {
    if (deviceId) {
      this.activeFaults.delete(deviceId);
      this.adapter.clearFaults(deviceId);
    } else {
      for (const devId of this.activeFaults.keys()) {
        this.adapter.clearFaults(devId);
      }
      this.activeFaults.clear();
    }
  }

  public generateAllCurrentTelemetry(sampleLimit?: number): TelemetryReading[] {
    const readings: TelemetryReading[] = [];
    const devicesToSample = sampleLimit
      ? this.fleet.devices.slice(0, sampleLimit)
      : this.fleet.devices;

    for (const dev of devicesToSample) {
      const faultInfo = this.activeFaults.get(dev.external_id) || this.activeFaults.get(dev.id);
      const faults = faultInfo ? [faultInfo.faultCode] : [];

      readings.push(
        generateDeviceTelemetry(
          dev.external_id,
          dev.nominal_wattage,
          dev.reported_on,
          dev.is_online,
          this.rng,
          faults,
        ),
      );
    }

    this.lastTickAt = new Date().toISOString();
    return readings;
  }

  public startPeriodicEmissions(
    intervalMs: number = 10000,
    onTelemetry?: (readings: TelemetryReading[]) => void,
  ): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.emissionIntervalMs = intervalMs;

    this.intervalTimer = setInterval(() => {
      // In periodic loop, emit a random sample batch of 50 devices per tick to avoid CPU thrashing
      const batchSample = this.generateBatchSample(60);
      if (onTelemetry) {
        onTelemetry(batchSample);
      }
    }, intervalMs);
  }

  public generateBatchSample(count: number = 50): TelemetryReading[] {
    const readings: TelemetryReading[] = [];
    const total = this.fleet.devices.length;

    for (let i = 0; i < count; i++) {
      const randIdx = Math.floor(this.rng.next() * total);
      const dev = this.fleet.devices.at(randIdx);
      if (!dev) continue;
      const faultInfo = this.activeFaults.get(dev.external_id) || this.activeFaults.get(dev.id);
      const faults = faultInfo ? [faultInfo.faultCode] : [];

      readings.push(
        generateDeviceTelemetry(
          dev.external_id,
          dev.nominal_wattage,
          dev.reported_on,
          dev.is_online,
          this.rng,
          faults,
        ),
      );
    }
    this.lastTickAt = new Date().toISOString();
    return readings;
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = undefined;
    }
    this.isRunning = false;
  }
}
