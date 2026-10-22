import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  CreateZoneDto,
  CreateWardDto,
  CreateStreetDto,
  CreateFeederDto,
  CreatePoleDto,
  BulkImportDto,
  BulkImportResult,
  GeoJsonFeatureCollection,
  GeoJsonFeature,
  AuthContextUser,
} from '@smartlight/shared-types';

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

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
    let feeders = this.db.memoryStore.feeders;
    if (ulbId) {
      feeders = feeders.filter((f) => f.ulb_id === ulbId);
    }
    return feeders;
  }

  public getGateways(ulbId?: string) {
    let gateways = this.db.memoryStore.gateways;
    if (ulbId) {
      gateways = gateways.filter((g) => g.ulb_id === ulbId);
    }
    return gateways;
  }

  public getPoles(ulbId?: string) {
    let poles = this.db.memoryStore.poles;
    if (ulbId) {
      poles = poles.filter((p) => p.ulb_id === ulbId);
    }

    return poles.map((p) => {
      const luminaire = this.db.memoryStore.luminaires.find((l) => l.pole_id === p.id);
      const feeder = luminaire
        ? this.db.memoryStore.feeders.find((f) => f.id === luminaire.feeder_id)
        : null;
      const device = luminaire
        ? this.db.memoryStore.devices.find((d) => d.luminaire_id === luminaire.id)
        : null;
      const street = p.street_id
        ? this.db.memoryStore.streets.find((s) => s.id === p.street_id)
        : null;

      return {
        ...p,
        location: {
          latitude: p.latitude || 34.2165,
          longitude: p.longitude || 74.7725,
        },
        streetName: street?.name || 'Main Route',
        feederName: feeder?.name || 'Feeder Panel',
        feederPanelCode: feeder?.panel_code || 'N/A',
        luminaireWattage: luminaire?.wattage ?? 70,
        lampType: luminaire?.lamp_type ?? 'LED',
        deviceExternalId: device?.external_id || 'N/A',
        isOnline: device?.is_online ?? true,
        reportedOn: device?.reported_on ?? false,
        desiredOn: device?.desired_on ?? false,
      };
    });
  }

  public getPoleById(id: string) {
    const p = this.db.memoryStore.poles.find((pole) => pole.id === id || pole.external_code === id);
    if (!p) {
      throw new NotFoundException(`Pole with identifier '${id}' not found`);
    }
    const luminaire = this.db.memoryStore.luminaires.find((l) => l.pole_id === p.id);
    const feeder = luminaire ? this.db.memoryStore.feeders.find((f) => f.id === luminaire.feeder_id) : null;
    const device = luminaire ? this.db.memoryStore.devices.find((d) => d.luminaire_id === luminaire.id) : null;

    return {
      ...p,
      location: {
        latitude: p.latitude || 34.2165,
        longitude: p.longitude || 74.7725,
      },
      luminaire: luminaire || null,
      feeder: feeder || null,
      device: device || null,
    };
  }

  public getGeoJson(ulbId?: string, type: string = 'all', bboxStr?: string): GeoJsonFeatureCollection {
    const features: GeoJsonFeature[] = [];

    // Parse bounding box if provided [minLng, minLat, maxLng, maxLat]
    let bbox: [number, number, number, number] | null = null;
    if (bboxStr) {
      const parts = bboxStr.split(',').map(Number);
      if (parts.length === 4 && !parts.some(isNaN)) {
        bbox = parts as [number, number, number, number];
      }
    }

    const inBbox = (lng: number, lat: number) => {
      if (!bbox) return true;
      return lng >= bbox[0] && lat >= bbox[1] && lng <= bbox[2] && lat <= bbox[3];
    };

    // 1. Poles Features
    if (type === 'all' || type === 'poles') {
      const poles = this.getPoles(ulbId);
      for (const p of poles) {
        const lng = p.location.longitude;
        const lat = p.location.latitude;
        if (inBbox(lng, lat)) {
          features.push({
            type: 'Feature',
            id: p.id,
            geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
            properties: {
              assetType: 'POLE',
              id: p.id,
              externalCode: p.external_code,
              heightMeters: p.height_meters,
              wattage: p.luminaireWattage,
              feederName: p.feederName,
              feederPanelCode: p.feederPanelCode,
              deviceExternalId: p.deviceExternalId,
              isOnline: p.isOnline,
              reportedOn: p.reportedOn,
              desiredOn: p.desiredOn,
            },
          });
        }
      }
    }

    // 2. Feeders Features
    if (type === 'all' || type === 'feeders') {
      const feeders = this.getFeeders(ulbId);
      for (const f of feeders) {
        const defaultLng = f.ulb_id === '11111111-1111-1111-1111-111111111111' ? 74.7725 : 74.9318;
        const defaultLat = f.ulb_id === '11111111-1111-1111-1111-111111111111' ? 34.2165 : 32.9925;
        const lng = f.location?.longitude || defaultLng;
        const lat = f.location?.latitude || defaultLat;

        if (inBbox(lng, lat)) {
          features.push({
            type: 'Feature',
            id: f.id,
            geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
            properties: {
              assetType: 'FEEDER',
              id: f.id,
              name: f.name,
              panelCode: f.panel_code,
              capacityKw: f.capacity_kw,
              meterNumber: f.meter_number,
              phase: f.phase || '3-PHASE',
            },
          });
        }
      }
    }

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  // --- Asset Creation Endpoints ---

  public createZone(dto: CreateZoneDto, user: AuthContextUser) {
    this.assertUlbAccess(user, dto.ulbId);
    const newId = `zone-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const zone = {
      id: newId,
      ulb_id: dto.ulbId,
      code: dto.code || `Z-${dto.name.slice(0, 3).toUpperCase()}`,
      name: dto.name,
      created_at: new Date().toISOString(),
    };
    this.db.memoryStore.zones.push(zone);
    this.recordAudit(user, dto.ulbId, 'ZONE_CREATED', newId, { name: dto.name });
    return zone;
  }

  public createWard(dto: CreateWardDto, user: AuthContextUser) {
    const zone = this.db.memoryStore.zones.find((z) => z.id === dto.zoneId);
    if (!zone) throw new NotFoundException('Zone not found');
    this.assertUlbAccess(user, zone.ulb_id);

    const newId = `ward-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const ward = {
      id: newId,
      zone_id: dto.zoneId,
      ward_number: dto.wardNumber || this.db.memoryStore.wards.length + 1,
      name: dto.name,
      created_at: new Date().toISOString(),
    };
    this.db.memoryStore.wards.push(ward);
    this.recordAudit(user, zone.ulb_id, 'WARD_CREATED', newId, { name: dto.name });
    return ward;
  }

  public createStreet(dto: CreateStreetDto, user: AuthContextUser) {
    const ward = this.db.memoryStore.wards.find((w) => w.id === dto.wardId);
    if (!ward) throw new NotFoundException('Ward not found');
    const zone = this.db.memoryStore.zones.find((z) => z.id === ward.zone_id);
    this.assertUlbAccess(user, zone?.ulb_id || '');

    const newId = `street-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const street = {
      id: newId,
      ward_id: dto.wardId,
      name: dto.name,
      street_type: dto.type || 'LOCAL',
      created_at: new Date().toISOString(),
    };
    this.db.memoryStore.streets.push(street);
    this.recordAudit(user, zone!.ulb_id, 'STREET_CREATED', newId, { name: dto.name });
    return street;
  }

  public createFeeder(dto: CreateFeederDto, user: AuthContextUser) {
    this.assertUlbAccess(user, dto.ulbId);

    const exists = this.db.memoryStore.feeders.some(
      (f) => f.ulb_id === dto.ulbId && f.panel_code === dto.panelCode,
    );
    if (exists) {
      throw new ConflictException(`Feeder panel with code '${dto.panelCode}' already exists in this ULB`);
    }

    const newId = `fdr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const feeder = {
      id: newId,
      ulb_id: dto.ulbId,
      name: dto.name,
      panel_code: dto.panelCode,
      capacity_kw: dto.capacityKw,
      meter_number: dto.meterNumber || 'UNMETERED',
      phase: dto.phase || '3-PHASE',
      location: dto.location,
      created_at: new Date().toISOString(),
    };

    this.db.memoryStore.feeders.push(feeder);
    this.recordAudit(user, dto.ulbId, 'FEEDER_CREATED', newId, { panelCode: dto.panelCode });
    return feeder;
  }

  public createPole(dto: CreatePoleDto, user: AuthContextUser) {
    this.assertUlbAccess(user, dto.ulbId);

    const exists = this.db.memoryStore.poles.some(
      (p) => p.ulb_id === dto.ulbId && p.external_code === dto.externalCode,
    );
    if (exists) {
      throw new ConflictException(`Pole with code '${dto.externalCode}' already exists in this ULB`);
    }

    const newId = `pole-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const pole = {
      id: newId,
      ulb_id: dto.ulbId,
      street_id: dto.streetId || this.db.memoryStore.streets[0]?.id,
      external_code: dto.externalCode,
      height_meters: dto.heightMeters || 8.0,
      latitude: dto.location?.latitude || 34.2165,
      longitude: dto.location?.longitude || 74.7725,
      created_at: new Date().toISOString(),
    };
    this.db.memoryStore.poles.push(pole);

    // Create attached luminaire if wattage supplied
    const lumId = `lum-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const luminaire = {
      id: lumId,
      ulb_id: dto.ulbId,
      pole_id: newId,
      feeder_id: dto.feederId || this.db.memoryStore.feeders[0]?.id,
      wattage: dto.wattage || 70,
      lamp_type: 'LED',
      created_at: new Date().toISOString(),
    };
    this.db.memoryStore.luminaires.push(luminaire);

    // Provision device
    const devId = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const device = {
      id: devId,
      ulb_id: dto.ulbId,
      luminaire_id: lumId,
      feeder_id: luminaire.feeder_id,
      gateway_id: null,
      adapter_key: 'SIMULATOR',
      external_id: `SIM-${dto.externalCode}`,
      desired_on: false,
      reported_on: false,
      desired_brightness: 100,
      reported_brightness: 0,
      is_online: true,
      last_seen_at: new Date().toISOString(),
      simulated: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.db.memoryStore.devices.push(device);

    this.recordAudit(user, dto.ulbId, 'POLE_PROVISIONED', newId, {
      externalCode: dto.externalCode,
      wattage: dto.wattage || 70,
    });

    return this.getPoleById(newId);
  }

  // --- Bulk Asset Import ---

  public importPoles(dto: BulkImportDto, user: AuthContextUser): BulkImportResult {
    this.assertUlbAccess(user, dto.ulbId);

    if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('Import batch must contain at least one pole item');
    }

    const errors: { row: number; code?: string; message: string }[] = [];
    let importedCount = 0;

    dto.items.forEach((item, index) => {
      const rowNum = index + 1;

      // 1. Validation: code
      if (!item.externalCode || item.externalCode.trim() === '') {
        errors.push({ row: rowNum, message: 'Pole externalCode is required' });
        return;
      }

      // Check unique in ULB
      const codeExists = this.db.memoryStore.poles.some(
        (p) => p.ulb_id === dto.ulbId && p.external_code === item.externalCode,
      );
      if (codeExists) {
        errors.push({
          row: rowNum,
          code: item.externalCode,
          message: `Pole code '${item.externalCode}' already exists in this ULB`,
        });
        return;
      }

      // 2. Validation: wattage
      if (!item.wattage || isNaN(item.wattage) || item.wattage <= 0) {
        errors.push({
          row: rowNum,
          code: item.externalCode,
          message: `Wattage rating must be a positive number, received: ${item.wattage}`,
        });
        return;
      }

      // 3. Validation: coordinates
      if (
        item.latitude === undefined ||
        item.longitude === undefined ||
        isNaN(item.latitude) ||
        isNaN(item.longitude) ||
        item.latitude < -90 ||
        item.latitude > 90 ||
        item.longitude < -180 ||
        item.longitude > 180
      ) {
        errors.push({
          row: rowNum,
          code: item.externalCode,
          message: `Invalid WGS-84 coordinates: [${item.latitude}, ${item.longitude}]`,
        });
        return;
      }

      // 4. Resolve Feeder if supplied
      let feederId = this.db.memoryStore.feeders.find((f) => f.ulb_id === dto.ulbId)?.id;
      if (item.feederPanelCode) {
        const matched = this.db.memoryStore.feeders.find(
          (f) => f.ulb_id === dto.ulbId && f.panel_code === item.feederPanelCode,
        );
        if (matched) {
          feederId = matched.id;
        }
      }

      // 5. Create Pole, Luminaire, and Virtual Device
      const poleId = `pole-imp-${Date.now()}-${rowNum}`;
      this.db.memoryStore.poles.push({
        id: poleId,
        ulb_id: dto.ulbId,
        street_id: this.db.memoryStore.streets[0]?.id,
        external_code: item.externalCode,
        height_meters: item.heightMeters || 8.0,
        latitude: item.latitude,
        longitude: item.longitude,
        created_at: new Date().toISOString(),
      });

      const lumId = `lum-imp-${Date.now()}-${rowNum}`;
      this.db.memoryStore.luminaires.push({
        id: lumId,
        ulb_id: dto.ulbId,
        pole_id: poleId,
        feeder_id: feederId,
        wattage: item.wattage,
        lamp_type: item.lampType || 'LED',
        created_at: new Date().toISOString(),
      });

      const devId = `dev-imp-${Date.now()}-${rowNum}`;
      this.db.memoryStore.devices.push({
        id: devId,
        ulb_id: dto.ulbId,
        luminaire_id: lumId,
        feeder_id: feederId,
        gateway_id: null,
        adapter_key: 'SIMULATOR',
        external_id: `SIM-${item.externalCode}`,
        desired_on: false,
        reported_on: false,
        desired_brightness: 100,
        reported_brightness: 0,
        is_online: true,
        last_seen_at: new Date().toISOString(),
        simulated: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      importedCount++;
    });

    this.recordAudit(user, dto.ulbId, 'ASSETS_BULK_IMPORTED', null, {
      totalRows: dto.items.length,
      importedCount,
      failedCount: errors.length,
    });

    return {
      success: errors.length === 0,
      importedCount,
      failedCount: errors.length,
      errors,
    };
  }

  private assertUlbAccess(user: AuthContextUser, targetUlbId: string) {
    if (user.isGlobalAdmin || user.allowedUlbIds.includes('*')) {
      return;
    }
    if (!user.allowedUlbIds.includes(targetUlbId)) {
      throw new ForbiddenException(
        `Cross-ULB access denied: You are not authorized for ULB '${targetUlbId}'`,
      );
    }
  }

  private recordAudit(
    actor: AuthContextUser,
    ulbId: string,
    action: string,
    entityId: string | null,
    details: Record<string, unknown>,
  ) {
    this.db.memoryStore.auditLogs.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ulb_id: ulbId,
      actor_id: actor.id,
      actor_email: actor.email,
      action,
      entity_type: 'ASSET',
      entity_id: entityId,
      details,
      occurred_at: new Date().toISOString(),
    });
  }
}
