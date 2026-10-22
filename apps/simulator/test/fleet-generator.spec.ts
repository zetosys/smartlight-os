import { describe, it, expect } from 'vitest';
import { generateFleet, generateDeviceTelemetry, FLEET_SPEC } from '../src/fleet-generator';
import { DeterministicRng } from '../src/deterministic-dataset';

describe('IoT Fleet Generator & Electrical Physics Engine (Prompt 3)', () => {
  it('generates exactly 4,608 luminaires across Ganderbal and Katra ULBs', () => {
    const fleet = generateFleet(365);
    expect(fleet.totalLuminaires).toBe(4608);
    expect(fleet.luminaires.length).toBe(4608);
    expect(fleet.poles.length).toBe(4608);
    expect(fleet.devices.length).toBe(4608);

    const gblDevices = fleet.devices.filter((d) => d.ulb_id === FLEET_SPEC.ganderbal.id);
    const ktrDevices = fleet.devices.filter((d) => d.ulb_id === FLEET_SPEC.katra.id);

    expect(gblDevices.length).toBe(2740);
    expect(ktrDevices.length).toBe(1868);
  });

  it('strictly adheres to Ganderbal luminaire wattage breakdown: 859x35W, 1542x70W, 339x110W', () => {
    const fleet = generateFleet(365);
    const gblLuminaires = fleet.luminaires.filter((l) => l.ulbId === FLEET_SPEC.ganderbal.id);

    const count35W = gblLuminaires.filter((l) => l.wattage === 35).length;
    const count70W = gblLuminaires.filter((l) => l.wattage === 70).length;
    const count110W = gblLuminaires.filter((l) => l.wattage === 110).length;

    expect(count35W).toBe(859);
    expect(count70W).toBe(1542);
    expect(count110W).toBe(339);
    expect(count35W + count70W + count110W).toBe(2740);
  });

  it('strictly adheres to Katra luminaire wattage breakdown: 1364x35W, 381x70W, 123x110W', () => {
    const fleet = generateFleet(365);
    const ktrLuminaires = fleet.luminaires.filter((l) => l.ulbId === FLEET_SPEC.katra.id);

    const count35W = ktrLuminaires.filter((l) => l.wattage === 35).length;
    const count70W = ktrLuminaires.filter((l) => l.wattage === 70).length;
    const count110W = ktrLuminaires.filter((l) => l.wattage === 110).length;

    expect(count35W).toBe(1364);
    expect(count70W).toBe(381);
    expect(count110W).toBe(123);
    expect(count35W + count70W + count110W).toBe(1868);
  });

  it('is strictly deterministic: identical seed produces identical fleet and coordinates', () => {
    const run1 = generateFleet(365);
    const run2 = generateFleet(365);

    expect(run1.poles[0].id).toBe(run2.poles[0].id);
    expect(run1.poles[0].externalCode).toBe(run2.poles[0].externalCode);
    expect(run1.poles[0].location?.latitude).toBe(run2.poles[0].location?.latitude);
    expect(run1.poles[0].location?.longitude).toBe(run2.poles[0].location?.longitude);
    expect(run1.poles[2739].externalCode).toBe(run2.poles[2739].externalCode);
    expect(run1.devices[4607].external_id).toBe(run2.devices[4607].external_id);
  });

  it('allocates feeder panels and balances 3-phase electrical topology', () => {
    const fleet = generateFleet(365);
    expect(fleet.feeders.length).toBe(60); // 35 Ganderbal + 25 Katra

    const gblFeeders = fleet.feeders.filter((f) => f.ulbId === FLEET_SPEC.ganderbal.id);
    const ktrFeeders = fleet.feeders.filter((f) => f.ulbId === FLEET_SPEC.katra.id);
    expect(gblFeeders.length).toBe(35);
    expect(ktrFeeders.length).toBe(25);

    // Verify 3-phase distribution across luminaires
    const phaseR = fleet.luminaires.filter((l) => l.phaseConnection === 'R').length;
    const phaseY = fleet.luminaires.filter((l) => l.phaseConnection === 'Y').length;
    const phaseB = fleet.luminaires.filter((l) => l.phaseConnection === 'B').length;

    expect(Math.abs(phaseR - phaseY)).toBeLessThanOrEqual(2);
    expect(Math.abs(phaseY - phaseB)).toBeLessThanOrEqual(2);
  });

  describe('Electrical Physics & Fault Telemetry Generation', () => {
    const rng = new DeterministicRng(100);

    it('generates nominal electrical telemetry when luminaire is ON', () => {
      const telemetry = generateDeviceTelemetry('SIM-GBL-0001', 110, true, true, rng);
      expect(telemetry.voltage).toBeGreaterThanOrEqual(220);
      expect(telemetry.voltage).toBeLessThanOrEqual(240);
      expect(telemetry.powerWatts).toBeGreaterThan(100);
      expect(telemetry.powerWatts).toBeLessThan(120);
      expect(telemetry.powerFactor).toBeGreaterThan(0.95);
      expect(telemetry.currentAmp).toBeGreaterThan(0.4);
      expect(telemetry.currentAmp).toBeLessThan(0.6);
      expect(telemetry.online).toBe(true);
      expect(telemetry.faultCodes.length).toBe(0);
    });

    it('generates standby leakage and zero current when luminaire is OFF', () => {
      const telemetry = generateDeviceTelemetry('SIM-GBL-0002', 70, false, true, rng);
      expect(telemetry.powerWatts).toBeLessThan(2.0); // Standby leakage
      expect(telemetry.currentAmp).toBeLessThanOrEqual(0.02);
      expect(telemetry.online).toBe(true);
    });

    it('simulates LAMP_FAILURE burnout: power drops to near zero despite reported ON', () => {
      const telemetry = generateDeviceTelemetry('SIM-GBL-0003', 70, true, true, rng, ['LAMP_FAILURE']);
      expect(telemetry.powerWatts).toBeLessThan(5.0); // Burnout symptom
      expect(telemetry.faultCodes).toContain('LAMP_FAILURE');
    });

    it('simulates VOLTAGE_SAG anomaly: voltage drops below 180V', () => {
      const telemetry = generateDeviceTelemetry('SIM-GBL-0004', 35, true, true, rng, ['VOLTAGE_SAG']);
      expect(telemetry.voltage).toBeLessThan(180);
      expect(telemetry.faultCodes).toContain('VOLTAGE_SAG');
    });

    it('simulates COMMUNICATION_LOSS: device is marked offline with 0V and 0W', () => {
      const telemetry = generateDeviceTelemetry('SIM-GBL-0005', 70, false, false, rng);
      expect(telemetry.online).toBe(false);
      expect(telemetry.voltage).toBe(0);
      expect(telemetry.powerWatts).toBe(0);
      expect(telemetry.faultCodes).toContain('COMMUNICATION_LOSS');
    });
  });
});
