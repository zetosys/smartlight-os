import {
  DeviceAdapter,
  DeviceCapabilities,
  DeviceCommand,
  CommandDispatch,
  Telemetry,
} from './types';

export interface VirtualDeviceState {
  deviceId: string;
  nominalWattage: number;
  reportedOn: boolean;
  online: boolean;
  voltage: number;
  current: number;
  powerWatts: number;
  energyKwh: number;
  burningHours: number;
  faultCodes: string[];
}

/**
 * SimulatorAdapter implements the shared DeviceAdapter contract for simulated luminaires.
 * Complies with contracts/device.ts without inventing OEM protocols.
 */
export class SimulatorAdapter implements DeviceAdapter {
  public readonly id: string = 'SIMULATOR';

  private readonly deviceState: Map<string, VirtualDeviceState> = new Map();

  constructor(initialDevices?: { deviceId: string; nominalWattage?: number; initialOn?: boolean }[]) {
    if (initialDevices) {
      for (const d of initialDevices) {
        this.initDevice(d.deviceId, d.nominalWattage ?? 70, d.initialOn ?? false);
      }
    }
  }

  public initDevice(deviceId: string, nominalWattage: number = 70, initialOn: boolean = false): void {
    const voltage = 230.0;
    const powerWatts = initialOn ? nominalWattage : 0;
    const current = initialOn ? Number((powerWatts / voltage).toFixed(2)) : 0;

    this.deviceState.set(deviceId, {
      deviceId,
      nominalWattage,
      reportedOn: initialOn,
      online: true,
      voltage,
      current,
      powerWatts,
      energyKwh: 12.45,
      burningHours: 150,
      faultCodes: [],
    });
  }

  public async capabilities(deviceId: string): Promise<DeviceCapabilities> {
    return {
      switching: true,
      dimming: false, // Per PRD: actual dimming out of scope until confirmed
      scheduling: true,
      firmware: false,
      telemetryFields: [
        'voltage',
        'current',
        'powerWatts',
        'energyKwh',
        'burningHours',
        'online',
        'reportedOn',
        'faultCodes',
      ],
    };
  }

  public async sendCommand(command: DeviceCommand): Promise<CommandDispatch> {
    let state = this.deviceState.get(command.deviceId);
    if (!state) {
      // Auto-provision virtual state if absent
      this.initDevice(command.deviceId, 70, false);
      state = this.deviceState.get(command.deviceId)!;
    }

    if (!state.online) {
      return {
        accepted: false,
        error: 'Device is offline in simulator layer',
      };
    }

    const transportReference = `SIM-TX-${Date.now()}-${command.idempotencyKey.slice(0, 16)}`;

    switch (command.type) {
      case 'TURN_ON':
        state.reportedOn = true;
        state.powerWatts = Number((state.nominalWattage * 1.01).toFixed(2));
        state.current = Number((state.powerWatts / state.voltage).toFixed(2));
        break;

      case 'TURN_OFF':
        state.reportedOn = false;
        state.powerWatts = 0;
        state.current = 0;
        break;

      case 'GET_STATUS':
        // No state mutation
        break;

      case 'SET_SCHEDULE':
      case 'UPDATE_CONFIG':
        // Acknowledged configuration commands
        break;

      default:
        return {
          accepted: false,
          error: `Unsupported command type: ${(command as any).type}`,
        };
    }

    return {
      accepted: true,
      transportReference,
      reportedImmediately: true,
    };
  }

  public async getStatus(deviceId: string): Promise<Telemetry | null> {
    const state = this.deviceState.get(deviceId);
    if (!state) {
      return null;
    }

    return {
      deviceId: state.deviceId,
      timestamp: new Date().toISOString(),
      online: state.online,
      reportedOn: state.reportedOn,
      voltage: state.voltage,
      current: state.current,
      powerWatts: state.powerWatts,
      energyKwh: state.energyKwh,
      burningHours: state.burningHours,
      faultCodes: [...state.faultCodes],
      source: 'SIMULATOR',
    };
  }

  // Simulator test helpers
  public setDeviceOnline(deviceId: string, online: boolean): void {
    const state = this.deviceState.get(deviceId);
    if (state) {
      state.online = online;
    }
  }

  public injectFault(deviceId: string, faultCode: string): void {
    const state = this.deviceState.get(deviceId);
    if (state && !state.faultCodes.includes(faultCode)) {
      state.faultCodes.push(faultCode);
    }
  }

  public clearFaults(deviceId: string): void {
    const state = this.deviceState.get(deviceId);
    if (state) {
      state.faultCodes = [];
    }
  }
}
