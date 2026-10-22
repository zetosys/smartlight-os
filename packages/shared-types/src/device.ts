export interface DeviceCapabilities {
  switching: boolean;
  dimming: boolean;
  scheduling: boolean;
  firmware: boolean;
  telemetryFields: string[];
}

export interface DeviceModel {
  id: string;
  manufacturer: string;
  model: string;
  wattageRating?: number;
  capabilities: DeviceCapabilities;
  createdAt: string;
}

export interface Device {
  id: string;
  ulbId: string;
  luminaireId?: string;
  feederId?: string;
  gatewayId?: string;
  modelId?: string;
  adapterKey: string;
  externalId: string;
  name?: string;
  simulated: boolean;
  desiredOn?: boolean | null;
  reportedOn?: boolean | null;
  desiredBrightness?: number | null; // 0-100%
  reportedBrightness?: number | null;
  isOnline: boolean;
  lastSeenAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // joined info for display
  luminaireWattage?: number;
  poleExternalCode?: string;
  feederName?: string;
  ulbName?: string;
}
