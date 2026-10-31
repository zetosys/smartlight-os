import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import {
  AdapterRegistry,
  SimulatorAdapter,
  generateFleet,
  generateDeviceTelemetry,
  DeterministicRng,
  FLEET_SPEC,
} from '@smartlight/device-contracts';
import { DatabaseService } from '../../database/database.service';
import { TelemetryService } from '../telemetry/telemetry.service';
import {
  SimulatorFleetStatus,
  FaultInjectionDto,
  TelemetryReading,
} from '@smartlight/shared-types';

@Injectable()
export class SimulatorServiceModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SimulatorServiceModule.name);
  private adapter: SimulatorAdapter;
  private rng: DeterministicRng;
  private scenarioName: string = '4,608 Fleet Municipal Control Room Simulation';
  private seed: number = 365;
  private isRunning: boolean = false;
  private emissionIntervalMs: number = 10000;
  private intervalTimer?: NodeJS.Timeout;
  private lastTickAt?: string;
  private activeFaults: Map<string, { faultCode: string; injectedAt: string }> = new Map();

  constructor(
    private readonly db: DatabaseService,
    private readonly telemetryService: TelemetryService,
  ) {
    this.adapter = new SimulatorAdapter();
    this.rng = new DeterministicRng(this.seed);
  }

  onModuleInit() {
    this.syncDevicesToAdapter();
    AdapterRegistry.getInstance().register(this.adapter);
  }

  onModuleDestroy() {
    this.stopLoop();
  }

  public seedFleet(seed: number = 365) {
    this.seed = seed;
    this.rng = new DeterministicRng(seed);
    const fleet = this.db.seedFullFleet(seed);

    this.activeFaults.clear();
    this.syncDevicesToAdapter();

    this.logger.log(`[SimulatorServiceModule] Successfully generated full fleet of ${fleet.totalLuminaires} streetlights`);
    return this.getStatus();
  }

  private syncDevicesToAdapter(): void {
    for (const d of this.db.memoryStore.devices) {
      const lum = this.db.memoryStore.luminaires.find((l) => l.id === d.luminaire_id);
      const wattage = lum?.wattage ?? 70;
      this.adapter.initDevice(d.id, wattage, Boolean(d.reported_on));
      this.adapter.initDevice(d.external_id, wattage, Boolean(d.reported_on));
    }
  }

  public getStatus(): SimulatorFleetStatus {
    const devices = this.db.memoryStore.devices;
    const luminaires = this.db.memoryStore.luminaires;

    const gblDevs = devices.filter((d) => d.ulb_id === FLEET_SPEC.ganderbal.id);
    const ktrDevs = devices.filter((d) => d.ulb_id === FLEET_SPEC.katra.id);

    const countWatts = (ulbId: string, w: number) => {
      return luminaires.filter((l) => (l.ulb_id === ulbId || l.ulbId === ulbId) && l.wattage === w).length;
    };

    const gbl35 = countWatts(FLEET_SPEC.ganderbal.id, 35);
    const gbl70 = countWatts(FLEET_SPEC.ganderbal.id, 70);
    const gbl110 = countWatts(FLEET_SPEC.ganderbal.id, 110);

    const ktr35 = countWatts(FLEET_SPEC.katra.id, 35);
    const ktr70 = countWatts(FLEET_SPEC.katra.id, 70);
    const ktr110 = countWatts(FLEET_SPEC.katra.id, 110);

    const activeFaultsList = Array.from(this.activeFaults.entries()).map(([deviceId, info]) => ({
      deviceId,
      faultCode: info.faultCode,
      injectedAt: info.injectedAt,
    }));

    return {
      adapterId: this.adapter.id,
      scenarioName: this.scenarioName,
      seed: this.seed,
      activeDevices: devices.length,
      isRunning: this.isRunning,
      emissionIntervalMs: this.emissionIntervalMs,
      ulbBreakdown: {
        ganderbal: { total: gblDevs.length, '35W': gbl35, '70W': gbl70, '110W': gbl110 },
        katra: { total: ktrDevs.length, '35W': ktr35, '70W': ktr70, '110W': ktr110 },
      },
      fleetBreakdown: {
        '35W': gbl35 + ktr35,
        '70W': gbl70 + ktr70,
        '110W': gbl110 + ktr110,
      },
      activeFaults: activeFaultsList,
      lastTickAt: this.lastTickAt,
    };
  }

  public triggerTick(sampleCount: number = 60) {
    const devices = this.db.memoryStore.devices;
    const readings: TelemetryReading[] = [];
    const count = Math.min(sampleCount, devices.length);

    for (let i = 0; i < count; i++) {
      const idx = Math.floor(this.rng.next() * devices.length);
      const dev = devices.at(idx);
      if (!dev) continue;
      const lum = this.db.memoryStore.luminaires.find((l) => l.id === dev.luminaire_id);
      const wattage = (lum?.wattage ?? 70) as 35 | 70 | 110;

      const fault = this.activeFaults.get(dev.external_id) || this.activeFaults.get(dev.id);
      const faults = fault ? [fault.faultCode] : [];

      readings.push(
        generateDeviceTelemetry(
          dev.external_id,
          wattage,
          dev.reported_on,
          dev.is_online,
          this.rng,
          faults,
        ),
      );
    }

    this.lastTickAt = new Date().toISOString();
    const result = this.telemetryService.ingestTelemetry({ readings });

    return {
      tickedAt: this.lastTickAt,
      sampleSize: count,
      ingested: result.accepted,
      anomaliesDetected: result.anomaliesDetected,
      recentReadings: readings.slice(0, 5),
    };
  }

  public startLoop(intervalMs: number = 10000) {
    if (this.isRunning) return this.getStatus();
    this.isRunning = true;
    this.emissionIntervalMs = intervalMs;

    this.intervalTimer = setInterval(() => {
      this.triggerTick(50);
    }, intervalMs);

    this.logger.log(`[SimulatorServiceModule] Started telemetry emission background loop (${intervalMs}ms)`);
    return this.getStatus();
  }

  public stopLoop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = undefined;
    }
    this.isRunning = false;
    this.logger.log('[SimulatorServiceModule] Stopped telemetry emission loop');
    return this.getStatus();
  }

  public injectFault(dto: FaultInjectionDto) {
    let affectedCount = 0;
    const nowIso = new Date().toISOString();

    if (dto.deviceId) {
      this.activeFaults.set(dto.deviceId, { faultCode: dto.faultCode, injectedAt: nowIso });
      this.adapter.injectFault(dto.deviceId, dto.faultCode);
      affectedCount = 1;
    } else {
      let candidates = this.db.memoryStore.devices;
      if (dto.ulbId) {
        candidates = candidates.filter((d) => d.ulb_id === dto.ulbId);
      }
      const percent = dto.percentage ? Math.min(Math.max(dto.percentage, 1), 100) : 5;
      const count = Math.max(1, Math.floor((candidates.length * percent) / 100));

      const affectedSet = new Set<string>();
      let iterations = 0;
      while (affectedSet.size < count && affectedSet.size < candidates.length && iterations < count * 3) {
        iterations++;
        const randIdx = Math.floor(this.rng.next() * candidates.length);
        const dev = candidates.at(randIdx);
        if (!dev) continue;
        if (!affectedSet.has(dev.external_id)) {
          this.activeFaults.set(dev.external_id, { faultCode: dto.faultCode, injectedAt: nowIso });
          this.adapter.injectFault(dev.external_id, dto.faultCode);
          affectedSet.add(dev.external_id);
        }
      }
      affectedCount = affectedSet.size;
    }

    // Trigger an immediate tick so the anomaly reaches telemetry & alerts instantly
    this.triggerTick(30);

    return { affectedCount, faultCode: dto.faultCode };
  }

  public clearFaults(deviceId?: string) {
    if (deviceId) {
      this.activeFaults.delete(deviceId);
      this.adapter.clearFaults(deviceId);
    } else {
      for (const devId of this.activeFaults.keys()) {
        this.adapter.clearFaults(devId);
      }
      this.activeFaults.clear();
    }
    return { success: true };
  }
}
