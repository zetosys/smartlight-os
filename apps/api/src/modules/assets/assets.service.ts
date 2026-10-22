import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class AssetsService {
  constructor(private readonly db: DatabaseService) {}

  public getHierarchy(ulbId?: string) {
    const zones = ulbId
      ? this.db.memoryStore.zones.filter((z) => z.ulb_id === ulbId)
      : this.db.memoryStore.zones;

    const wards = this.db.memoryStore.wards;
    const streets = this.db.memoryStore.streets;
    const poles = this.db.memoryStore.poles;
    const luminaires = this.db.memoryStore.luminaires;

    return zones.map((z) => {
      const zWards = wards.filter((w) => w.zone_id === z.id);
      return {
        ...z,
        wards: zWards.map((w) => {
          const wStreets = streets.filter((s) => s.ward_id === w.id);
          return {
            ...w,
            streets: wStreets.map((s) => {
              const sPoles = poles.filter((p) => p.street_id === s.id);
              return {
                ...s,
                poles: sPoles.map((p) => {
                  const pLuminaires = luminaires.filter((l) => l.pole_id === p.id);
                  return {
                    ...p,
                    luminaires: pLuminaires,
                  };
                }),
              };
            }),
          };
        }),
      };
    });
  }

  public getFeeders(ulbId?: string) {
    if (ulbId) {
      return this.db.memoryStore.feeders.filter((f) => f.ulb_id === ulbId);
    }
    return this.db.memoryStore.feeders;
  }

  public getGateways(ulbId?: string) {
    if (ulbId) {
      return this.db.memoryStore.gateways.filter((g) => g.ulb_id === ulbId);
    }
    return this.db.memoryStore.gateways;
  }

  public getPoles(ulbId?: string) {
    const poles = ulbId
      ? this.db.memoryStore.poles.filter((p) => p.ulb_id === ulbId)
      : this.db.memoryStore.poles;

    // Attach attached luminaire and device summary
    return poles.map((p) => {
      const luminaire = this.db.memoryStore.luminaires.find((l) => l.pole_id === p.id);
      const device = luminaire
        ? this.db.memoryStore.devices.find((d) => d.luminaire_id === luminaire.id)
        : null;

      return {
        ...p,
        luminaire: luminaire
          ? {
              id: luminaire.id,
              wattage: luminaire.wattage,
              lampType: luminaire.lamp_type,
            }
          : null,
        device: device
          ? {
              id: device.id,
              externalId: device.external_id,
              reportedOn: device.reported_on,
              desiredOn: device.desired_on,
              isOnline: device.is_online,
            }
          : null,
      };
    });
  }
}
