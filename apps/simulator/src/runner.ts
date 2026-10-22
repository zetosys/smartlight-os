import { AdapterRegistry, SimulatorAdapter, DeviceCommand } from '@smartlight/device-contracts';
import { PROMPT_0_SEED_DATA, DeterministicRng, generateSampleTelemetry } from './deterministic-dataset';

export class SimulatorService {
  private readonly adapter: SimulatorAdapter;
  private readonly rng: DeterministicRng;
  private isRunning: boolean = false;
  private intervalTimer?: NodeJS.Timeout;

  constructor() {
    this.adapter = new SimulatorAdapter();
    this.rng = new DeterministicRng(PROMPT_0_SEED_DATA.seed);
    this.bootstrapDevices();
  }

  private bootstrapDevices(): void {
    for (const ulb of PROMPT_0_SEED_DATA.ulbs) {
      for (const dev of ulb.sampleDevices) {
        this.adapter.initDevice(dev.id, dev.nominalWattage, dev.initialOn);
        // Also register externalId alias for flexible routing
        this.adapter.initDevice(dev.externalId, dev.nominalWattage, dev.initialOn);
      }
    }
    // Register adapter in the global hardware abstraction registry
    AdapterRegistry.getInstance().register(this.adapter);
  }

  public getAdapter(): SimulatorAdapter {
    return this.adapter;
  }

  public async executeCommand(command: DeviceCommand) {
    return this.adapter.sendCommand(command);
  }

  public async getDeviceTelemetry(deviceId: string) {
    return this.adapter.getStatus(deviceId);
  }

  public generateAllCurrentTelemetry() {
    const readings = [];
    for (const ulb of PROMPT_0_SEED_DATA.ulbs) {
      for (const dev of ulb.sampleDevices) {
        readings.push(
          generateSampleTelemetry(
            dev.externalId,
            dev.nominalWattage,
            dev.initialOn,
            this.rng,
          ),
        );
      }
    }
    return readings;
  }

  public startPeriodicEmissions(intervalMs: number = 10000, onTelemetry?: (telemetry: any) => void): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[SimulatorService] Started simulated telemetry loop (${intervalMs}ms interval)`);

    this.intervalTimer = setInterval(() => {
      const readings = this.generateAllCurrentTelemetry();
      if (onTelemetry) {
        for (const r of readings) {
          onTelemetry(r);
        }
      }
    }, intervalMs);
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = undefined;
    }
    this.isRunning = false;
    console.log('[SimulatorService] Stopped simulated telemetry loop');
  }
}
