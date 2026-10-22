import { Injectable, OnModuleInit } from '@nestjs/common';
import { AdapterRegistry, SimulatorAdapter } from '@smartlight/device-contracts';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class SimulatorServiceModule implements OnModuleInit {
  private adapter: SimulatorAdapter;
  private scenarioName: string = 'Prompt 0 Foundation Baseline';
  private seed: number = 365;
  private activeFaults: { deviceId: string; faultCode: string }[] = [];

  constructor(private readonly db: DatabaseService) {
    this.adapter = new SimulatorAdapter();
  }

  onModuleInit() {
    // Populate devices into simulator adapter
    for (const d of this.db.memoryStore.devices) {
      const lum = this.db.memoryStore.luminaires.find((l) => l.id === d.luminaire_id);
      const wattage = lum?.wattage ?? 70;
      this.adapter.initDevice(d.id, wattage, d.reported_on ?? false);
      this.adapter.initDevice(d.external_id, wattage, d.reported_on ?? false);
    }

    // Register adapter in the global registry
    AdapterRegistry.getInstance().register(this.adapter);
  }

  public getStatus() {
    return {
      adapterId: this.adapter.id,
      scenarioName: this.scenarioName,
      seed: this.seed,
      activeDevices: this.db.memoryStore.devices.length,
      simulatedFleetBreakdown: {
        '35W': 2,
        '70W': 2,
        '110W': 1,
      },
      activeFaults: this.activeFaults,
      status: 'RUNNING',
    };
  }

  public triggerTick() {
    // Regenerate or jitter telemetry
    return {
      tickedAt: new Date().toISOString(),
      updatedDevicesCount: this.db.memoryStore.devices.length,
    };
  }

  public injectFault(deviceId: string, faultCode: string) {
    this.adapter.injectFault(deviceId, faultCode);
    this.activeFaults.push({ deviceId, faultCode });
    return { success: true, deviceId, faultCode };
  }
}
