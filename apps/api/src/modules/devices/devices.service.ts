import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AdapterRegistry } from '@smartlight/device-contracts';

@Injectable()
export class DevicesService {
  constructor(private readonly db: DatabaseService) {}

  public getDevices(ulbId?: string, page: number = 1, limit: number = 50) {
    let devices = this.db.memoryStore.devices;

    if (ulbId) {
      devices = devices.filter((d) => d.ulb_id === ulbId);
    }

    const total = devices.length;
    const startIndex = (page - 1) * limit;
    const paginated = devices.slice(startIndex, startIndex + limit);

    // Enrich with joined names
    const enriched = paginated.map((d) => {
      const luminaire = this.db.memoryStore.luminaires.find((l) => l.id === d.luminaire_id);
      const pole = luminaire ? this.db.memoryStore.poles.find((p) => p.id === luminaire.pole_id) : null;
      const feeder = this.db.memoryStore.feeders.find((f) => f.id === d.feeder_id);
      const gateway = this.db.memoryStore.gateways.find((g) => g.id === (d.gateway_id || d.gatewayId));
      const ulb = this.db.memoryStore.ulbs.find((u) => u.id === d.ulb_id);

      return {
        ...d,
        luminaireWattage: luminaire?.wattage ?? 70,
        lampType: luminaire?.lamp_type ?? 'LED',
        poleExternalCode: pole?.external_code ?? 'N/A',
        feederName: feeder?.name ?? 'N/A',
        gatewayExternalCode: gateway?.external_code || gateway?.externalCode || 'GW-N/A',
        ulbName: ulb?.name ?? 'N/A',
      };
    });

    return {
      items: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public getDeviceById(id: string) {
    const d = this.db.memoryStore.devices.find((dev) => dev.id === id || dev.external_id === id);
    if (!d) {
      throw new NotFoundException(`Device with ID '${id}' not found`);
    }

    const luminaire = this.db.memoryStore.luminaires.find((l) => l.id === d.luminaire_id);
    const pole = luminaire ? this.db.memoryStore.poles.find((p) => p.id === luminaire.pole_id) : null;
    const feeder = this.db.memoryStore.feeders.find((f) => f.id === d.feeder_id);
    const gateway = this.db.memoryStore.gateways.find((g) => g.id === (d.gateway_id || (d as any).gatewayId));
    const ulb = this.db.memoryStore.ulbs.find((u) => u.id === d.ulb_id);

    return {
      ...d,
      luminaireWattage: luminaire?.wattage ?? 70,
      lampType: luminaire?.lamp_type ?? 'LED',
      poleExternalCode: pole?.external_code ?? 'N/A',
      feederName: feeder?.name ?? 'N/A',
      gatewayExternalCode: gateway?.external_code || (gateway as any)?.externalCode || 'GW-N/A',
      ulbName: ulb?.name ?? 'N/A',
    };
  }

  public async getDeviceTelemetry(id: string) {
    const device = this.getDeviceById(id);
    const registry = AdapterRegistry.getInstance();

    if (registry.hasAdapter(device.adapter_key)) {
      const adapter = registry.getAdapter(device.adapter_key);
      const telemetry = await adapter.getStatus(device.external_id);
      if (telemetry) {
        return telemetry;
      }
    }

    // Default response if adapter not answering
    return {
      deviceId: device.external_id,
      timestamp: new Date().toISOString(),
      online: device.is_online,
      reportedOn: device.reported_on,
      voltage: 230.0,
      current: device.reported_on ? 0.31 : 0,
      powerWatts: device.reported_on ? device.luminaireWattage : 0,
      energyKwh: 45.2,
      burningHours: 640,
      faultCodes: [],
      source: 'SIMULATOR',
    };
  }
}
