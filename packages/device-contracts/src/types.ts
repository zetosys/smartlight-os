export type CommandType =
  | 'TURN_ON'
  | 'TURN_OFF'
  | 'GET_STATUS'
  | 'SET_SCHEDULE'
  | 'UPDATE_CONFIG';

export type CommandStatus =
  | 'QUEUED'
  | 'SENT'
  | 'ACKNOWLEDGED'
  | 'CONFIRMED'
  | 'FAILED'
  | 'TIMED_OUT';

export interface DeviceCapabilities {
  switching: boolean;
  dimming: boolean;
  scheduling: boolean;
  firmware: boolean;
  telemetryFields: string[];
}

export interface DeviceCommand {
  commandId: string;
  deviceId: string;
  type: CommandType;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
}

export interface Telemetry {
  deviceId: string;
  timestamp: string;
  online: boolean;
  reportedOn?: boolean;
  voltage?: number;
  current?: number;
  powerWatts?: number;
  energyKwh?: number;
  burningHours?: number;
  faultCodes: string[];
  source: 'SIMULATOR' | 'OEM';
}

export interface CommandDispatch {
  accepted: boolean;
  transportReference?: string;
  error?: string;
  reportedImmediately?: boolean;
}

export interface DeviceAdapter {
  readonly id: string;
  capabilities(deviceId: string): Promise<DeviceCapabilities>;
  sendCommand(command: DeviceCommand): Promise<CommandDispatch>;
  getStatus(deviceId: string): Promise<Telemetry | null>;
}
