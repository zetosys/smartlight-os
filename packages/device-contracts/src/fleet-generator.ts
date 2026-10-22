import {
  Zone,
  Ward,
  Street,
  Feeder,
  Pole,
  Luminaire,
  Gateway,
  TelemetryReading,
} from '@smartlight/shared-types';

export interface GeneratedFleet {
  seed: number;
  totalLuminaires: number;
  zones: Zone[];
  wards: Ward[];
  streets: Street[];
  feeders: Feeder[];
  gateways: Gateway[];
  poles: Pole[];
  luminaires: Luminaire[];
  devices: {
    id: string;
    ulb_id: string;
    luminaire_id: string;
    feeder_id: string;
    gateway_id: string;
    adapter_key: string;
    external_id: string;
    desired_on: boolean;
    reported_on: boolean;
    desired_brightness: number;
    reported_brightness: number;
    is_online: boolean;
    last_seen_at: string;
    simulated: boolean;
    nominal_wattage: 35 | 70 | 110;
  }[];
  breakdown: {
    ganderbal: { total: number; '35W': number; '70W': number; '110W': number };
    katra: { total: number; '35W': number; '70W': number; '110W': number };
  };
}

export const FLEET_SPEC = {
  ganderbal: {
    id: '11111111-1111-1111-1111-111111111111',
    code: 'ULB-GBL',
    name: 'Ganderbal Municipal Council',
    centerLat: 34.2165,
    centerLng: 74.7725,
    count35W: 859,
    count70W: 1542,
    count110W: 339,
    total: 2740,
    feederCount: 35,
    gatewayCount: 12,
  },
  katra: {
    id: '22222222-2222-2222-2222-222222222222',
    code: 'ULB-KTR',
    name: 'Katra Municipal Committee',
    centerLat: 32.9925,
    centerLng: 74.9318,
    count35W: 1364,
    count70W: 381,
    count110W: 123,
    total: 1868,
    feederCount: 25,
    gatewayCount: 8,
  },
};

/**
 * Deterministic Mulberry32 RNG.
 */
export class DeterministicRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/**
 * Deterministically generates the full 4,608 streetlight fleet per the system specification.
 * Reproduces the exact same IDs, codes, wattages, coordinates, and feeder associations on any run.
 */
export function generateFleet(seed: number = 365): GeneratedFleet {
  const rng = new DeterministicRng(seed);

  const zones: Zone[] = [];
  const wards: Ward[] = [];
  const streets: Street[] = [];
  const feeders: Feeder[] = [];
  const gateways: Gateway[] = [];
  const poles: Pole[] = [];
  const luminaires: Luminaire[] = [];
  const devices: GeneratedFleet['devices'] = [];

  const nowIso = new Date('2026-10-22T18:00:00.000Z').toISOString();

  // Helper to generate coordinates clustered along corridors
  const genCoord = (centerLat: number, centerLng: number, radiusLat: number, radiusLng: number) => {
    const angle = rng.next() * Math.PI * 2;
    const r = Math.sqrt(rng.next());
    const lat = +(centerLat + Math.sin(angle) * r * radiusLat).toFixed(6);
    const lng = +(centerLng + Math.cos(angle) * r * radiusLng).toFixed(6);
    return { lat, lng };
  };

  // --- 1. GANDERBAL MUNICIPAL COUNCIL (2,740 Luminaires) ---
  const gbl = FLEET_SPEC.ganderbal;

  // Zones for Ganderbal
  const gblZones = [
    { id: 'zone-gbl-01', ulbId: gbl.id, code: 'GBL-Z1', name: 'Zone 1 - Main Town & Beehama', createdAt: nowIso },
    { id: 'zone-gbl-02', ulbId: gbl.id, code: 'GBL-Z2', name: 'Zone 2 - Tullamulla & Manasbal Link', createdAt: nowIso },
    { id: 'zone-gbl-03', ulbId: gbl.id, code: 'GBL-Z3', name: 'Zone 3 - Duderhama & Kangan Highway', createdAt: nowIso },
  ];
  zones.push(...gblZones);

  // 12 Wards for Ganderbal
  const gblWards: Ward[] = [];
  for (let w = 1; w <= 12; w++) {
    const zoneIdx = (w - 1) % 3;
    const wardId = `ward-gbl-${String(w).padStart(2, '0')}`;
    const ward: Ward = {
      id: wardId,
      zoneId: gblZones[zoneIdx].id,
      ulbId: gbl.id,
      wardNumber: w,
      name: `Ward ${w} - ${['Beehama', 'Duderhama', 'Tullamulla', 'Salura', 'Fatehpora', 'Arampora', 'Wanipora', 'Gund', 'Kangan Link', 'Qamaria Park', 'Hospital Road', 'Courthouse Rd'][w - 1]}`,
      createdAt: nowIso,
    };
    gblWards.push(ward);
    wards.push(ward);
  }

  // Streets for Ganderbal
  const gblStreets: Street[] = [];
  gblWards.forEach((ward, idx) => {
    const s1: Street = {
      id: `street-gbl-${idx * 2 + 1}`,
      wardId: ward.id,
      name: idx === 0 ? 'Srinagar-Leh Highway (NH-1D)' : `${ward.name} Main Corridor`,
      type: idx === 0 ? 'HIGHWAY' : 'ARTERIAL',
      createdAt: nowIso,
    };
    const s2: Street = {
      id: `street-gbl-${idx * 2 + 2}`,
      wardId: ward.id,
      name: `${ward.name} Residential Lane`,
      type: 'LOCAL',
      createdAt: nowIso,
    };
    gblStreets.push(s1, s2);
    streets.push(s1, s2);
  });

  // Feeder Panels for Ganderbal (35 panels)
  const gblFeeders: Feeder[] = [];
  for (let f = 1; f <= gbl.feederCount; f++) {
    const fId = `fdr-gbl-${String(f).padStart(2, '0')}`;
    const fCoord = genCoord(gbl.centerLat, gbl.centerLng, 0.02, 0.025);
    const feeder: Feeder = {
      id: fId,
      ulbId: gbl.id,
      panelCode: `GBL-FP-${String(f).padStart(2, '0')}`,
      name: `CCMS Feeder Panel FP-${String(f).padStart(2, '0')} (${gblWards[(f - 1) % 12].name})`,
      capacityKw: 30.0,
      meterNumber: `JKPDD-MTR-GBL-${1000 + f}`,
      phase: '3-PHASE',
      location: { latitude: fCoord.lat, longitude: fCoord.lng },
      createdAt: nowIso,
    };
    gblFeeders.push(feeder);
    feeders.push(feeder);
  }

  // Gateways for Ganderbal (12 gateways)
  const gblGateways: Gateway[] = [];
  for (let g = 1; g <= gbl.gatewayCount; g++) {
    const gwId = `gw-gbl-${String(g).padStart(2, '0')}`;
    const fdr = gblFeeders[(g - 1) * 2];
    const gw: Gateway = {
      id: gwId,
      ulbId: gbl.id,
      feederId: fdr.id,
      externalCode: `GW-GBL-${String(g).padStart(2, '0')}`,
      name: `CCMS Gateway GW-${String(g).padStart(2, '0')}`,
      ipAddress: `10.14.20.${100 + g}`,
      isOnline: true,
      createdAt: nowIso,
    };
    gblGateways.push(gw);
    gateways.push(gw);
  }

  // Wattages array for Ganderbal: exactly 339 x 110W, 1542 x 70W, 859 x 35W = 2740
  const gblWattages: (35 | 70 | 110)[] = [
    ...Array(gbl.count110W).fill(110 as const),
    ...Array(gbl.count70W).fill(70 as const),
    ...Array(gbl.count35W).fill(35 as const),
  ];

  const phases: ('R' | 'Y' | 'B')[] = ['R', 'Y', 'B'];

  for (let i = 0; i < gbl.total; i++) {
    const indexStr = String(i + 1).padStart(4, '0');
    const poleId = `pole-gbl-${indexStr}`;
    const lumId = `lum-gbl-${indexStr}`;
    const devId = `dev-gbl-${indexStr}`;
    const wattage = gblWattages[i];

    const feeder = gblFeeders[i % gbl.feederCount];
    const gateway = gblGateways[i % gbl.gatewayCount];
    const street =
      wattage === 110
        ? gblStreets[0]
        : wattage === 70
        ? gblStreets[(i % 12) * 2]
        : gblStreets[(i % 12) * 2 + 1];

    const coord = genCoord(feeder.location!.latitude, feeder.location!.longitude, 0.006, 0.008);
    const height = wattage === 110 ? 10.0 : wattage === 70 ? 8.5 : 7.0;
    const phaseConn = phases[i % 3];

    const isOnline = rng.next() > 0.015;
    const reportedOn = isOnline ? rng.next() > 0.15 : false;

    const pole: Pole = {
      id: poleId,
      ulbId: gbl.id,
      streetId: street.id,
      externalCode: `GBL-POLE-${indexStr}`,
      location: { latitude: coord.lat, longitude: coord.lng },
      heightMeters: height,
      poleType: wattage === 110 ? 'OCTAGONAL_STEEL' : 'TUBULAR_STEEL',
      streetName: street.name,
      feederName: feeder.name,
      feederPanelCode: feeder.panelCode,
      luminaireWattage: wattage,
      deviceExternalId: `SIM-GBL-${indexStr}`,
      isOnline,
      reportedOn,
      desiredOn: reportedOn,
      createdAt: nowIso,
    };
    poles.push(pole);

    const luminaire: Luminaire = {
      id: lumId,
      ulbId: gbl.id,
      poleId: pole.id,
      feederId: feeder.id,
      wattage,
      lampType: 'LED',
      phaseConnection: phaseConn,
      createdAt: nowIso,
    };
    luminaires.push(luminaire);

    devices.push({
      id: devId,
      ulb_id: gbl.id,
      luminaire_id: lumId,
      feeder_id: feeder.id,
      gateway_id: gateway.id,
      adapter_key: 'SIMULATOR',
      external_id: `SIM-GBL-${indexStr}`,
      desired_on: reportedOn,
      reported_on: reportedOn,
      desired_brightness: 100,
      reported_brightness: reportedOn ? 100 : 0,
      is_online: isOnline,
      last_seen_at: nowIso,
      simulated: true,
      nominal_wattage: wattage,
    });
  }

  // --- 2. KATRA MUNICIPAL COMMITTEE (1,868 Luminaires) ---
  const ktr = FLEET_SPEC.katra;

  // Zones for Katra
  const ktrZones = [
    { id: 'zone-ktr-01', ulbId: ktr.id, code: 'KTR-Z1', name: 'Zone 1 - Shrine Base & Banganga Track', createdAt: nowIso },
    { id: 'zone-ktr-02', ulbId: ktr.id, code: 'KTR-Z2', name: 'Zone 2 - Railway Station & Main Bazaar', createdAt: nowIso },
  ];
  zones.push(...ktrZones);

  // 8 Wards for Katra
  const ktrWards: Ward[] = [];
  for (let w = 1; w <= 8; w++) {
    const zoneIdx = (w - 1) % 2;
    const wardId = `ward-ktr-${String(w).padStart(2, '0')}`;
    const ward: Ward = {
      id: wardId,
      zoneId: ktrZones[zoneIdx].id,
      ulbId: ktr.id,
      wardNumber: w,
      name: `Ward ${w} - ${['Banganga Road', 'Bus Stand', 'Railway Station', 'Chintamani', 'Katra Bazaar', 'Shalimar Park', 'Panthal Road', 'Helipad Road'][w - 1]}`,
      createdAt: nowIso,
    };
    ktrWards.push(ward);
    wards.push(ward);
  }

  // Streets for Katra
  const ktrStreets: Street[] = [];
  ktrWards.forEach((ward, idx) => {
    const s1: Street = {
      id: `street-ktr-${idx * 2 + 1}`,
      wardId: ward.id,
      name: idx === 0 ? 'Banganga Pilgrimage Track Road' : `${ward.name} Arterial`,
      type: idx === 0 ? 'HIGHWAY' : 'ARTERIAL',
      createdAt: nowIso,
    };
    const s2: Street = {
      id: `street-ktr-${idx * 2 + 2}`,
      wardId: ward.id,
      name: `${ward.name} Pedestrian Walkway`,
      type: 'LOCAL',
      createdAt: nowIso,
    };
    ktrStreets.push(s1, s2);
    streets.push(s1, s2);
  });

  // Feeder Panels for Katra (25 panels)
  const ktrFeeders: Feeder[] = [];
  for (let f = 1; f <= ktr.feederCount; f++) {
    const fId = `fdr-ktr-${String(f).padStart(2, '0')}`;
    const fCoord = genCoord(ktr.centerLat, ktr.centerLng, 0.015, 0.02);
    const feeder: Feeder = {
      id: fId,
      ulbId: ktr.id,
      panelCode: `KTR-FP-${String(f).padStart(2, '0')}`,
      name: `CCMS Feeder Panel FP-${String(f).padStart(2, '0')} (${ktrWards[(f - 1) % 8].name})`,
      capacityKw: 30.0,
      meterNumber: `JKPDD-MTR-KTR-${2000 + f}`,
      phase: '3-PHASE',
      location: { latitude: fCoord.lat, longitude: fCoord.lng },
      createdAt: nowIso,
    };
    ktrFeeders.push(feeder);
    feeders.push(feeder);
  }

  // Gateways for Katra (8 gateways)
  const ktrGateways: Gateway[] = [];
  for (let g = 1; g <= ktr.gatewayCount; g++) {
    const gwId = `gw-ktr-${String(g).padStart(2, '0')}`;
    const fdr = ktrFeeders[(g - 1) * 3];
    const gw: Gateway = {
      id: gwId,
      ulbId: ktr.id,
      feederId: fdr.id,
      externalCode: `GW-KTR-${String(g).padStart(2, '0')}`,
      name: `CCMS Gateway GW-${String(g).padStart(2, '0')}`,
      ipAddress: `10.14.30.${100 + g}`,
      isOnline: true,
      createdAt: nowIso,
    };
    ktrGateways.push(gw);
    gateways.push(gw);
  }

  // Wattages array for Katra: exactly 123 x 110W, 381 x 70W, 1364 x 35W = 1868
  const ktrWattages: (35 | 70 | 110)[] = [
    ...Array(ktr.count110W).fill(110 as const),
    ...Array(ktr.count70W).fill(70 as const),
    ...Array(ktr.count35W).fill(35 as const),
  ];

  for (let i = 0; i < ktr.total; i++) {
    const indexStr = String(i + 1).padStart(4, '0');
    const poleId = `pole-ktr-${indexStr}`;
    const lumId = `lum-ktr-${indexStr}`;
    const devId = `dev-ktr-${indexStr}`;
    const wattage = ktrWattages[i];

    const feeder = ktrFeeders[i % ktr.feederCount];
    const gateway = ktrGateways[i % ktr.gatewayCount];
    const street =
      wattage === 110
        ? ktrStreets[0]
        : wattage === 70
        ? ktrStreets[(i % 8) * 2]
        : ktrStreets[(i % 8) * 2 + 1];

    const coord = genCoord(feeder.location!.latitude, feeder.location!.longitude, 0.005, 0.006);
    const height = wattage === 110 ? 10.0 : wattage === 70 ? 8.5 : 7.0;
    const phaseConn = phases[i % 3];

    const isOnline = rng.next() > 0.015;
    const reportedOn = isOnline ? rng.next() > 0.15 : false;

    const pole: Pole = {
      id: poleId,
      ulbId: ktr.id,
      streetId: street.id,
      externalCode: `KTR-POLE-${indexStr}`,
      location: { latitude: coord.lat, longitude: coord.lng },
      heightMeters: height,
      poleType: wattage === 110 ? 'OCTAGONAL_STEEL' : 'TUBULAR_STEEL',
      streetName: street.name,
      feederName: feeder.name,
      feederPanelCode: feeder.panelCode,
      luminaireWattage: wattage,
      deviceExternalId: `SIM-KTR-${indexStr}`,
      isOnline,
      reportedOn,
      desiredOn: reportedOn,
      createdAt: nowIso,
    };
    poles.push(pole);

    const luminaire: Luminaire = {
      id: lumId,
      ulbId: ktr.id,
      poleId: pole.id,
      feederId: feeder.id,
      wattage,
      lampType: 'LED',
      phaseConnection: phaseConn,
      createdAt: nowIso,
    };
    luminaires.push(luminaire);

    devices.push({
      id: devId,
      ulb_id: ktr.id,
      luminaire_id: lumId,
      feeder_id: feeder.id,
      gateway_id: gateway.id,
      adapter_key: 'SIMULATOR',
      external_id: `SIM-KTR-${indexStr}`,
      desired_on: reportedOn,
      reported_on: reportedOn,
      desired_brightness: 100,
      reported_brightness: reportedOn ? 100 : 0,
      is_online: isOnline,
      last_seen_at: nowIso,
      simulated: true,
      nominal_wattage: wattage,
    });
  }

  return {
    seed,
    totalLuminaires: gbl.total + ktr.total, // 4,608
    zones,
    wards,
    streets,
    feeders,
    gateways,
    poles,
    luminaires,
    devices,
    breakdown: {
      ganderbal: {
        total: gbl.total,
        '35W': gbl.count35W,
        '70W': gbl.count70W,
        '110W': gbl.count110W,
      },
      katra: {
        total: ktr.total,
        '35W': ktr.count35W,
        '70W': ktr.count70W,
        '110W': ktr.count110W,
      },
    },
  };
}

/**
 * Generates realistic physics-based electrical telemetry for a virtual luminaire.
 */
export function generateDeviceTelemetry(
  deviceId: string,
  nominalWattage: 35 | 70 | 110,
  reportedOn: boolean,
  isOnline: boolean,
  rng: DeterministicRng,
  faults: string[] = [],
): TelemetryReading {
  const timestamp = new Date().toISOString();

  if (!isOnline || faults.includes('COMMUNICATION_LOSS')) {
    return {
      deviceId,
      observedAt: timestamp,
      online: false,
      reportedOn: false,
      powerWatts: 0,
      voltage: 0,
      currentAmp: 0,
      powerFactor: 0,
      frequency: 0,
      temperature: 18.0,
      energyKwh: 45.2,
      burningHours: 320,
      faultCodes: ['COMMUNICATION_LOSS'],
      source: 'SIMULATOR',
    };
  }

  let voltage = +(228.0 + rng.next() * 5.0).toFixed(1);
  if (faults.includes('VOLTAGE_SAG')) {
    voltage = 175.5; // Trips under-voltage alert
  } else if (faults.includes('OVERVOLTAGE')) {
    voltage = 268.0; // Trips over-voltage alert
  }

  const frequency = +(49.95 + rng.next() * 0.1).toFixed(2);

  let powerFactor = reportedOn ? +(0.96 + rng.next() * 0.025).toFixed(2) : 0.22;
  if (faults.includes('LOW_POWER_FACTOR')) {
    powerFactor = 0.72; // Trips low PF alert
  }

  let powerWatts = 0;
  if (reportedOn) {
    if (faults.includes('LAMP_FAILURE')) {
      powerWatts = 1.2;
    } else {
      const jitter = 0.98 + rng.next() * 0.04;
      powerWatts = +(nominalWattage * jitter).toFixed(1);
    }
  } else {
    powerWatts = +(0.6 + rng.next() * 0.4).toFixed(1);
  }

  const currentAmp = reportedOn
    ? +(powerWatts / (voltage * powerFactor)).toFixed(2)
    : 0.01;

  const temperature = reportedOn
    ? +(38.0 + rng.next() * 7.0).toFixed(1)
    : +(21.0 + rng.next() * 3.0).toFixed(1);

  const energyKwh = +(50.0 + (nominalWattage * 8.5) / 1000 + rng.next() * 2.0).toFixed(2);
  const burningHours = reportedOn ? 420 : 419;

  return {
    deviceId,
    observedAt: timestamp,
    online: true,
    reportedOn,
    voltage,
    currentAmp,
    powerWatts,
    powerFactor,
    frequency,
    temperature,
    energyKwh,
    burningHours,
    faultCodes: [...faults],
    source: 'SIMULATOR',
  };
}
