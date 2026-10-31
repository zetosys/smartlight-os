import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { generateSecureId } from '../../common/crypto-id.util';
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
      feeders = feeders.filter((f) => (f.ulb_id || f.ulbId) === ulbId);
    }
    return feeders;
  }

  public getGateways(ulbId?: string) {
    let gateways = this.db.memoryStore.gateways;
    if (ulbId) {
      gateways = gateways.filter((g) => (g.ulb_id || g.ulbId) === ulbId);
    }
    return gateways;
  }

  public getZones(ulbId?: string) {
    let zones = this.db.memoryStore.zones;
    if (ulbId) {
      zones = zones.filter((z) => (z.ulb_id || z.ulbId) === ulbId);
    }
    return zones;
  }

  public getPoles(ulbId?: string) {
    let poles = this.db.memoryStore.poles;
    if (ulbId) {
      poles = poles.filter((p) => (p.ulb_id || p.ulbId) === ulbId);
    }

    return poles.map((p) => {
      const luminaire = this.db.memoryStore.luminaires.find(
        (l) => (l.pole_id || l.poleId) === p.id,
      );
      const feeder = luminaire
        ? this.db.memoryStore.feeders.find(
            (f) => f.id === (luminaire.feeder_id || luminaire.feederId),
          )
        : null;
      const device = luminaire
        ? this.db.memoryStore.devices.find(
            (d) => (d.luminaire_id || d.luminaireId) === luminaire.id,
          )
        : null;
      const gateway = device
        ? this.db.memoryStore.gateways.find(
            (g) => g.id === (device.gateway_id || device.gatewayId),
          )
        : null;
      const street = (p.street_id || p.streetId)
        ? this.db.memoryStore.streets.find((s) => s.id === (p.street_id || p.streetId))
        : null;

      const pUlbId = p.ulb_id || p.ulbId;
      const isKtr = pUlbId === '22222222-2222-2222-2222-222222222222';
      const lat = p.latitude || p.location?.latitude || (isKtr ? 32.9925 : 34.2165);
      const lng = p.longitude || p.location?.longitude || (isKtr ? 74.9318 : 74.7725);

      return {
        ...p,
        ulb_id: pUlbId,
        external_code: p.external_code || p.externalCode,
        height_meters: p.height_meters || p.heightMeters || 8.5,
        location: {
          latitude: lat,
          longitude: lng,
        },
        streetName: street?.name || p.streetName || 'Main Route',
        feederId: feeder?.id || (luminaire ? (luminaire.feeder_id || luminaire.feederId) : p.feederId) || null,
        feederName: feeder?.name || p.feederName || 'Feeder Panel',
        feederPanelCode: feeder?.panel_code || feeder?.panelCode || p.feederPanelCode || 'N/A',
        gatewayId: gateway?.id || null,
        gatewayExternalCode: gateway?.external_code || gateway?.externalCode || null,
        luminaireWattage: luminaire?.wattage ?? p.luminaireWattage ?? 70,
        lampType: luminaire?.lamp_type ?? luminaire?.lampType ?? 'LED',
        phaseConnection: luminaire?.phase_connection ?? luminaire?.phaseConnection ?? 'R',
        deviceExternalId: device?.external_id || p.deviceExternalId || 'N/A',
        isOnline: device ? (device.is_online ?? device.isOnline ?? true) : (p.isOnline ?? true),
        reportedOn: device ? (device.reported_on ?? device.reportedOn ?? false) : (p.reportedOn ?? false),
        desiredOn: device ? (device.desired_on ?? device.desiredOn ?? false) : (p.desiredOn ?? false),
      };
    });
  }

  public getPoleById(id: string) {
    const p = this.db.memoryStore.poles.find((pole) => pole.id === id || (pole.external_code || pole.externalCode) === id);
    if (!p) {
      throw new NotFoundException(`Pole with identifier '${id}' not found`);
    }
    const luminaire = this.db.memoryStore.luminaires.find((l) => (l.pole_id || l.poleId) === p.id);
    const feeder = luminaire ? this.db.memoryStore.feeders.find((f) => f.id === (luminaire.feeder_id || luminaire.feederId)) : null;
    const device = luminaire ? this.db.memoryStore.devices.find((d) => (d.luminaire_id || d.luminaireId) === luminaire.id) : null;

    const pUlbId = p.ulb_id || p.ulbId;
    const isKtr = pUlbId === '22222222-2222-2222-2222-222222222222';
    const lat = p.latitude || p.location?.latitude || (isKtr ? 32.9925 : 34.2165);
    const lng = p.longitude || p.location?.longitude || (isKtr ? 74.9318 : 74.7725);

    return {
      ...p,
      ulb_id: pUlbId,
      external_code: p.external_code || p.externalCode,
      location: {
        latitude: lat,
        longitude: lng,
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

    const targetType = (type || 'all').toLowerCase();
    const matchesLayer = (layerName: string) => {
      if (layerName === 'zones') {
        // Only include zones if explicitly requested via 'zones' or 'all_with_zones' to ensure Point compatibility for 'all'
        return targetType.includes('zone');
      }
      if (targetType === 'all') return true;
      const parts = targetType.split(',').map((s) => s.trim().toLowerCase());
      if (layerName === 'poles' || layerName === 'luminaires') {
        return parts.includes('poles') || parts.includes('luminaires');
      }
      return parts.includes(layerName);
    };

    // 1. Poles / Luminaires Features
    if (matchesLayer('poles')) {
      const poles = this.getPoles(ulbId);
      for (const p of poles) {
        const lng = p.location.longitude;
        const lat = p.location.latitude;
        if (inBbox(lng, lat)) {
          // Check for active alerts on this luminaire/device
          const activeAlerts = this.db.memoryStore.alerts.filter(
            (a) =>
              (a.status === 'OPEN' || a.status === 'ACKNOWLEDGED') &&
              (a.device_id === p.id ||
                a.device_id === p.deviceExternalId ||
                p.device_id === a.device_id),
          );

          let status: 'online_on' | 'online_off' | 'critical_fault' | 'major_fault' | 'warning' | 'comm_loss' = 'online_off';
          const crit = activeAlerts.find((a) => a.severity === 'CRITICAL');
          const maj = activeAlerts.find((a) => a.severity === 'MAJOR');
          const warn = activeAlerts.find((a) => a.severity === 'WARNING');

          if (crit) {
            status = 'critical_fault';
          } else if (maj) {
            status = 'major_fault';
          } else if (warn) {
            status = 'warning';
          } else if (!p.isOnline) {
            status = 'comm_loss';
          } else if (p.reportedOn) {
            status = 'online_on';
          } else {
            status = 'online_off';
          }

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
              lampType: p.lampType,
              feederId: p.feederId,
              feederName: p.feederName,
              feederPanelCode: p.feederPanelCode,
              phaseConnection: p.phaseConnection,
              deviceExternalId: p.deviceExternalId,
              gatewayId: p.gatewayId,
              gatewayExternalCode: p.gatewayExternalCode,
              isOnline: p.isOnline,
              reportedOn: p.reportedOn,
              desiredOn: p.desiredOn,
              status,
              activeAlertCount: activeAlerts.length,
              activeAlertSeverity: activeAlerts[0]?.severity || null,
              activeAlertCode: activeAlerts[0]?.code || null,
              voltage: p.reportedOn ? 228.4 : 230.1,
              currentAmps: p.reportedOn ? +(p.luminaireWattage / (228.4 * 0.98)).toFixed(2) : 0,
              powerFactor: p.reportedOn ? 0.98 : 0,
              temperatureC: 38.2,
            },
          });
        }
      }
    }

    // 2. Feeders Features
    if (matchesLayer('feeders')) {
      const feeders = this.getFeeders(ulbId);
      const allPoles = this.getPoles(ulbId);

      for (const f of feeders) {
        const isGbl = (f.ulb_id || f.ulbId) === '11111111-1111-1111-1111-111111111111';
        const defaultLng = isGbl ? 74.7725 : 74.9318;
        const defaultLat = isGbl ? 34.2165 : 32.9925;
        const lng = f.location?.longitude || f.longitude || defaultLng;
        const lat = f.location?.latitude || f.latitude || defaultLat;

        if (inBbox(lng, lat)) {
          const pCode = f.panel_code || f.panelCode;
          const connectedPoles = allPoles.filter(
            (p) => p.feederId === f.id || p.feederPanelCode === pCode,
          );
          const activePoles = connectedPoles.filter((p) => p.reportedOn);
          const activeLoadKw = activePoles.reduce(
            (sum, p) => sum + (p.luminaireWattage || 70) / 1000,
            0,
          );

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
              panelCode: pCode,
              capacityKw: f.capacity_kw || f.capacityKw || 30.0,
              meterNumber: f.meter_number || f.meterNumber || 'UNMETERED',
              phase: f.phase || '3-PHASE',
              connectedLuminairesCount: connectedPoles.length,
              activeLuminairesCount: activePoles.length,
              activeLoadKw: +(activeLoadKw).toFixed(2),
              status: 'healthy',
            },
          });
        }
      }
    }

    // 3. Gateways Features
    if (matchesLayer('gateways')) {
      const gateways = this.getGateways(ulbId);
      const feeders = this.getFeeders(ulbId);

      for (const g of gateways) {
        const gUlbId = g.ulb_id || g.ulbId;
        const isGbl = gUlbId === '11111111-1111-1111-1111-111111111111';
        const defaultLng = isGbl ? 74.7725 : 74.9318;
        const defaultLat = isGbl ? 34.2165 : 32.9925;

        const feeder = feeders.find(
          (f) => f.id === (g.feeder_id || g.feederId),
        );
        const lng = g.location?.longitude || feeder?.location?.longitude || defaultLng;
        const lat = g.location?.latitude || feeder?.location?.latitude || defaultLat;

        if (inBbox(lng, lat)) {
          const isOnline =
            g.is_online !== undefined
              ? g.is_online
              : (g.isOnline ?? true);

          const connectedDevices = this.db.memoryStore.devices.filter(
            (d) => (d.gateway_id || d.gatewayId) === g.id,
          );
          const connectedDevicesCount = connectedDevices.length || (isGbl ? (g.id === 'gw-gbl-61' ? 40 : 45) : (g.id === 'gw-ktr-42' ? 23 : 45));

          features.push({
            type: 'Feature',
            id: g.id,
            geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
            properties: {
              assetType: 'GATEWAY',
              id: g.id,
              name: g.name,
              externalCode: g.external_code || g.externalCode,
              ipAddress: g.ip_address || g.ipAddress,
              isOnline,
              status: isOnline ? 'online' : 'offline',
              feederId: g.feeder_id || g.feederId,
              feederName: feeder?.name,
              connectedDevicesCount,
              maxDevicesCapacity: 45,
              protocol: 'LoRaWAN Class C (865-867 MHz India)',
              backhaul: 'Industrial 4G LTE-M / Dual SIM',
              dutyCyclePct: 0.38,
              rssiAvgDbm: -74,
              snrAvgDb: 9.2,
            },
          });
        }
      }
    }

    // 4. Zones Features (Polygons)
    if (matchesLayer('zones')) {
      const zones = this.getZones(ulbId);
      for (const z of zones) {
        const zUlbId = z.ulb_id || z.ulbId;
        const isGbl = zUlbId === '11111111-1111-1111-1111-111111111111';
        const code = z.code || '';

        let polyCoords: [number, number][][];
        if (code.includes('GBL-Z1') || z.name.includes('Main Town')) {
          polyCoords = [[[74.755, 34.205], [74.790, 34.205], [74.790, 34.228], [74.755, 34.228], [74.755, 34.205]]];
        } else if (code.includes('GBL-Z2') || z.name.includes('Tullamulla')) {
          polyCoords = [[[74.730, 34.220], [74.765, 34.220], [74.765, 34.250], [74.730, 34.250], [74.730, 34.220]]];
        } else if (code.includes('GBL-Z3') || z.name.includes('Duderhama')) {
          polyCoords = [[[74.775, 34.210], [74.815, 34.210], [74.815, 34.240], [74.775, 34.240], [74.775, 34.210]]];
        } else if (code.includes('KTR-Z1') || z.name.includes('Shrine')) {
          polyCoords = [[[74.915, 32.980], [74.945, 32.980], [74.945, 33.008], [74.915, 33.008], [74.915, 32.980]]];
        } else if (code.includes('KTR-Z2') || z.name.includes('Railway')) {
          polyCoords = [[[74.920, 32.975], [74.955, 32.975], [74.955, 32.998], [74.920, 32.998], [74.920, 32.975]]];
        } else {
          const cLat = isGbl ? 34.2165 : 32.9925;
          const cLng = isGbl ? 74.7725 : 74.9318;
          polyCoords = [[[cLng - 0.02, cLat - 0.02], [cLng + 0.02, cLat - 0.02], [cLng + 0.02, cLat + 0.02], [cLng - 0.02, cLat + 0.02], [cLng - 0.02, cLat - 0.02]]];
        }

        // Check if any polygon coordinate is inside bbox
        const inPolyBbox = polyCoords[0].some(([lng, lat]) => inBbox(lng, lat));

        if (inPolyBbox) {
          features.push({
            type: 'Feature',
            id: z.id,
            geometry: {
              type: 'Polygon',
              coordinates: polyCoords,
            },
            properties: {
              assetType: 'ZONE',
              id: z.id,
              name: z.name,
              code: z.code,
              ulbId: zUlbId,
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
    const newId = generateSecureId('zone');
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

    const newId = generateSecureId('ward');
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

    const newId = generateSecureId('street');
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

    const newId = generateSecureId('fdr');
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

    const newId = generateSecureId('pole');
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
    const lumId = generateSecureId('lum');
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
    const devId = generateSecureId('dev');
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
      id: generateSecureId('audit'),
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
