import { Telemetry, DeterministicRng } from '@smartlight/device-contracts';

export interface DeterministicSeedConfig {
  seed: number;
  ulbs: {
    id: string;
    code: string;
    name: string;
    sampleDevices: {
      id: string;
      externalId: string;
      nominalWattage: 35 | 70 | 110;
      feederName: string;
      poleCode: string;
      initialOn: boolean;
    }[];
  }[];
}

/**
 * Small deterministic test dataset for Prompt 0 foundation.
 * Full 4,608 fleet generation is deferred to Prompt 3 per architectural plan.
 */
export const PROMPT_0_SEED_DATA: DeterministicSeedConfig = {
  seed: 365,
  ulbs: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      code: 'ULB-GBL',
      name: 'Ganderbal Municipal Council',
      sampleDevices: [
        {
          id: 'b0000000-0000-0000-0000-000000000001',
          externalId: 'SIM-GBL-0001',
          nominalWattage: 110,
          feederName: 'Feeder Panel FP-01 Beehama',
          poleCode: 'GBL-POLE-001',
          initialOn: true,
        },
        {
          id: 'b0000000-0000-0000-0000-000000000002',
          externalId: 'SIM-GBL-0002',
          nominalWattage: 70,
          feederName: 'Feeder Panel FP-01 Beehama',
          poleCode: 'GBL-POLE-002',
          initialOn: true,
        },
        {
          id: 'b0000000-0000-0000-0000-000000000003',
          externalId: 'SIM-GBL-0003',
          nominalWattage: 35,
          feederName: 'Feeder Panel FP-01 Beehama',
          poleCode: 'GBL-POLE-003',
          initialOn: false,
        },
      ],
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      code: 'ULB-KTR',
      name: 'Katra Municipal Committee',
      sampleDevices: [
        {
          id: 'b0000000-0000-0000-0000-000000000004',
          externalId: 'SIM-KTR-0001',
          nominalWattage: 70,
          feederName: 'Feeder Panel FP-01 Katra Banganga',
          poleCode: 'KTR-POLE-001',
          initialOn: true,
        },
        {
          id: 'b0000000-0000-0000-0000-000000000005',
          externalId: 'SIM-KTR-0002',
          nominalWattage: 35,
          feederName: 'Feeder Panel FP-01 Katra Banganga',
          poleCode: 'KTR-POLE-002',
          initialOn: false,
        },
      ],
    },
  ],
};

export { DeterministicRng } from '@smartlight/device-contracts';

/**
 * Generates sample telemetry matching smartlight_os_kit/simulator/demo.py specification.
 */
export function generateSampleTelemetry(
  externalId: string,
  nominalWattage: number,
  reportedOn: boolean,
  rng: DeterministicRng,
): Telemetry {
  const voltage = Number(rng.range(225.0, 235.0).toFixed(1));
  const powerWatts = reportedOn
    ? Number((nominalWattage * rng.range(0.97, 1.03)).toFixed(2))
    : 0.0;
  const current = reportedOn
    ? Number((powerWatts / voltage).toFixed(2))
    : 0.0;

  return {
    deviceId: externalId,
    timestamp: new Date().toISOString(),
    online: true,
    reportedOn,
    voltage,
    current,
    powerWatts,
    energyKwh: Number(rng.range(10.5, 80.2).toFixed(3)),
    burningHours: Math.round(rng.range(200, 1800)),
    faultCodes: [],
    source: 'SIMULATOR',
  };
}
