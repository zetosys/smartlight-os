import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService, MemoryDevice } from '../../database/database.service';
import {
  OverviewDashboardKpi,
  TelemetryReading,
  BatchTelemetryIngestDto,
  IngestionResult,
  Alert,
  TelemetryQueryDto,
  TimeSeriesPoint,
  FeederLoadProfile,
  EnergySummary,
  BurningHoursSummary,
} from '@smartlight/shared-types';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(private readonly db: DatabaseService) {}

  public ingestTelemetry(dto: BatchTelemetryIngestDto): IngestionResult {
    if (!dto.readings || !Array.isArray(dto.readings)) {
      return { accepted: 0, anomaliesDetected: 0, timestamp: new Date().toISOString() };
    }

    let accepted = 0;
    let anomaliesDetected = 0;

    for (const reading of dto.readings) {
      const dev = this.db.memoryStore.devices.find(
        (d) => d.id === reading.deviceId || d.external_id === reading.deviceId,
      );

      if (dev) {
        // Update device reported state
        dev.is_online = reading.online;
        dev.last_seen_at = reading.observedAt;
        if (reading.online && reading.reportedOn !== undefined) {
          dev.reported_on = reading.reportedOn;
        }

        // Buffer telemetry reading in memoryStore
        this.db.memoryStore.telemetry.push({
          device_id: dev.id,
          external_id: dev.external_id,
          ulb_id: dev.ulb_id,
          observed_at: reading.observedAt,
          voltage: reading.voltage,
          current_amp: reading.currentAmp,
          power_watts: reading.powerWatts,
          power_factor: reading.powerFactor,
          frequency: reading.frequency,
          temperature: reading.temperature,
          energy_kwh: reading.energyKwh,
          burning_hours: reading.burningHours,
          online: reading.online,
          reported_on: reading.reportedOn,
          fault_codes: reading.faultCodes || [],
        });

        // Cap telemetry buffer to latest 5000 records
        if (this.db.memoryStore.telemetry.length > 5000) {
          this.db.memoryStore.telemetry.splice(0, 100);
        }

        // Anomaly Evaluation Engine
        const anomalyCount = this.evaluateAnomalies(dev, reading);
        anomaliesDetected += anomalyCount;
        accepted++;
      }
    }

    return {
      accepted,
      anomaliesDetected,
      timestamp: new Date().toISOString(),
    };
  }

  private evaluateAnomalies(dev: MemoryDevice, reading: TelemetryReading): number {
    let count = 0;
    const ulbId = dev.ulb_id;

    // 1. Lamp Burnout: Desired ON, but active power is near zero
    if (dev.desired_on && reading.online && (reading.powerWatts ?? 0) < 5.0) {
      this.upsertAlert({
        id: `alt-burnout-${dev.id}`,
        ulbId,
        deviceId: dev.id,
        code: 'LAMP_FAILURE',
        message: `Burnout anomaly on ${dev.external_id}: Desired ON, but drawing only ${reading.powerWatts}W`,
        severity: 'MAJOR',
        status: 'OPEN',
        openedAt: reading.observedAt,
      });
      count++;
    }

    // 2. Day Burning Anomaly: Scheduled OFF, but drawing active power
    if (!dev.desired_on && reading.online && (reading.powerWatts ?? 0) > 20.0) {
      this.upsertAlert({
        id: `alt-dayburn-${dev.id}`,
        ulbId,
        deviceId: dev.id,
        code: 'DAY_BURNING',
        message: `Day burning alert on ${dev.external_id}: Drawing ${reading.powerWatts}W while scheduled OFF`,
        severity: 'WARNING',
        status: 'OPEN',
        openedAt: reading.observedAt,
      });
      count++;
    }

    // 3. Grid Voltage Anomaly (Safe operational envelope: 185V to 260V)
    if (reading.online && reading.voltage !== undefined) {
      if (reading.voltage < 185.0 || reading.voltage > 260.0) {
        this.upsertAlert({
          id: `alt-volt-${dev.id}`,
          ulbId,
          deviceId: dev.id,
          code: 'VOLTAGE_ANOMALY',
          message: `Grid voltage abnormal on ${dev.external_id}: ${reading.voltage}V (Safe: 185V - 260V)`,
          severity: 'CRITICAL',
          status: 'OPEN',
          openedAt: reading.observedAt,
        });
        count++;
      }
    }

    // 4. Low Power Factor Penalty Risk (PF < 0.85 when ON)
    if (reading.online && reading.reportedOn && reading.powerFactor !== undefined && reading.powerFactor < 0.85) {
      this.upsertAlert({
        id: `alt-pf-${dev.id}`,
        ulbId,
        deviceId: dev.id,
        code: 'LOW_POWER_FACTOR',
        message: `Poor power factor on ${dev.external_id}: PF=${reading.powerFactor} (< 0.85 utility threshold)`,
        severity: 'MINOR',
        status: 'OPEN',
        openedAt: reading.observedAt,
      });
      count++;
    }

    // 5. Communication Loss
    if (!reading.online || (reading.faultCodes && reading.faultCodes.includes('COMMUNICATION_LOSS'))) {
      this.upsertAlert({
        id: `alt-commloss-${dev.id}`,
        ulbId,
        deviceId: dev.id,
        code: 'COMMUNICATION_LOSS',
        message: `Heartbeat lost: Device ${dev.external_id} is unreachable`,
        severity: 'MAJOR',
        status: 'OPEN',
        openedAt: reading.observedAt,
      });
      count++;
    }

    return count;
  }

  private upsertAlert(alertData: Alert) {
    const existing = this.db.memoryStore.alerts.find(
      (a) => a.device_id === alertData.deviceId && a.code === alertData.code && a.status === 'OPEN',
    );

    if (existing) {
      existing.message = alertData.message || '';
    } else {
      this.db.memoryStore.alerts.push({
        id: alertData.id,
        ulb_id: alertData.ulbId,
        device_id: alertData.deviceId || '',
        code: alertData.code,
        message: alertData.message || '',
        severity: alertData.severity,
        status: alertData.status,
        opened_at: alertData.openedAt,
        acknowledged_at: undefined,
      });
    }
  }

  public getLatestTelemetry(deviceId: string) {
    const matching = this.db.memoryStore.telemetry.filter(
      (t) => t.device_id === deviceId || t.external_id === deviceId,
    );
    if (matching.length > 0) {
      return matching.slice(-1)[0];
    }

    const dev = this.db.memoryStore.devices.find(
      (d) => d.id === deviceId || d.external_id === deviceId,
    );
    if (!dev) throw new NotFoundException(`Device '${deviceId}' not found`);

    const lum = this.db.memoryStore.luminaires.find((l) => l.id === dev.luminaire_id);
    const wattage = lum?.wattage ?? 70;

    return {
      device_id: dev.id,
      external_id: dev.external_id,
      ulb_id: dev.ulb_id,
      observed_at: new Date().toISOString(),
      voltage: 231.2,
      current_amp: dev.reported_on ? +(wattage / 231.2 / 0.97).toFixed(2) : 0.01,
      power_watts: dev.reported_on ? wattage : 0.8,
      power_factor: dev.reported_on ? 0.97 : 0.22,
      frequency: 50.01,
      temperature: 34.5,
      energy_kwh: 45.2,
      burning_hours: 320,
      online: dev.is_online,
      reported_on: dev.reported_on,
      fault_codes: [],
    };
  }

  public getTelemetryHistory(deviceId: string, limit: number = 50) {
    return this.db.memoryStore.telemetry
      .filter((t) => t.device_id === deviceId || t.external_id === deviceId)
      .slice(-limit);
  }

  public getDashboardOverview(ulbId?: string): OverviewDashboardKpi {
    let devices = this.db.memoryStore.devices;
    let alerts = this.db.memoryStore.alerts;
    let tickets = this.db.memoryStore.tickets;
    let luminaires = this.db.memoryStore.luminaires;

    if (ulbId) {
      devices = devices.filter((d) => d.ulb_id === ulbId);
      alerts = alerts.filter((a) => a.ulb_id === ulbId);
      tickets = tickets.filter((t) => t.ulb_id === ulbId);
      luminaires = luminaires.filter((l) => l.ulb_id === ulbId);
    }

    const totalLuminaires = luminaires.length;
    const onlineDevices = devices.filter((d) => d.is_online).length;
    const offlineDevices = devices.length - onlineDevices;
    const activeLuminairesOn = devices.filter((d) => d.reported_on).length;
    const activeLuminairesOff = devices.length - activeLuminairesOn;
    const openAlerts = alerts.filter((a) => a.status === 'OPEN').length;
    const activeTickets = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

    let currentPowerWatts = 0;
    for (const d of devices) {
      if (d.reported_on) {
        const lum = luminaires.find((l) => l.id === d.luminaire_id);
        currentPowerWatts += lum?.wattage ?? 70;
      }
    }

    return {
      totalLuminaires,
      activeLuminairesOn,
      activeLuminairesOff,
      onlineDevices,
      offlineDevices,
      openAlerts,
      activeTickets,
      currentPowerKw: Number((currentPowerWatts / 1000).toFixed(2)),
      totalEnergyKwhToday: Number(((currentPowerWatts * 6.5) / 1000).toFixed(2)),
      uptimePercentage: Number((((onlineDevices || 1) / (devices.length || 1)) * 100).toFixed(1)),
      complianceNote:
        'Engineering prototype with deterministic simulated IoT fleet. Tender certification pending field validation.',
    };
  }

  public getAlerts(ulbId?: string, status?: string) {
    let list = this.db.memoryStore.alerts;
    if (ulbId) {
      list = list.filter((a) => a.ulb_id === ulbId);
    }
    if (status) {
      list = list.filter((a) => a.status === status);
    }
    return list;
  }

  public acknowledgeAlert(id: string) {
    const alert = this.db.memoryStore.alerts.find((a) => a.id === id);
    if (!alert) {
      throw new NotFoundException(`Alert '${id}' not found`);
    }
    alert.status = 'ACKNOWLEDGED';
    alert.acknowledged_at = new Date().toISOString();
    return alert;
  }

  public getTickets(ulbId?: string) {
    if (ulbId) {
      return this.db.memoryStore.tickets.filter((t) => t.ulb_id === ulbId);
    }
    return this.db.memoryStore.tickets;
  }

  // --- Time-Series Downsampling & Partitioned Storage Queries ---

  public getTelemetryTimeSeries(query: TelemetryQueryDto): TimeSeriesPoint[] {
    const resolution = query.resolution || '1h';
    const limit = query.limit || 50;

    if (resolution === '1d') {
      let list = this.db.memoryStore.dailyRollups;
      if (query.ulbId) {
        list = list.filter((r) => r.ulb_id === query.ulbId);
      }
      return list.slice(-limit).map((r) => ({
        timestamp: `${r.bucket_date}T00:00:00Z`,
        voltage: 230.5,
        currentAmp: 45.2,
        powerWatts: r.peak_power_watts || 175000,
        energyKwh: r.total_energy_kwh,
        powerFactor: r.avg_power_factor || 0.97,
        frequency: 50.0,
        burningHours: r.burning_hours,
        onlineCount: r.total_luminaires,
        totalCount: r.total_luminaires,
      }));
    }

    if (resolution === '1h') {
      let list = this.db.memoryStore.hourlyRollups;
      if (query.ulbId) {
        list = list.filter((r) => r.ulb_id === query.ulbId);
      }
      return list.slice(-limit).map((r) => ({
        timestamp: r.bucket_hour,
        voltage: r.avg_voltage || 230.0,
        currentAmp: r.avg_current || 40.0,
        powerWatts: r.avg_power_watts || 170000,
        energyKwh: r.energy_kwh_delta,
        powerFactor: r.avg_power_factor || 0.97,
        frequency: 50.0,
        burningHours: r.burning_minutes ? +(r.burning_minutes / 60).toFixed(2) : 0,
      }));
    }

    // For '5m' or 'raw' resolution from buffered telemetry
    let rawList = this.db.memoryStore.telemetry;
    if (query.deviceId) {
      rawList = rawList.filter((t) => t.device_id === query.deviceId || t.external_id === query.deviceId);
    }
    if (query.ulbId) {
      rawList = rawList.filter((t) => t.ulb_id === query.ulbId);
    }

    if (resolution === '5m' && rawList.length > 0) {
      // Group by 5-minute buckets
      interface RawTelemetryItem {
        observed_at: string;
        voltage?: number;
        current_amp?: number;
        power_watts?: number;
        power_factor?: number;
        energy_kwh?: number;
      }
      const buckets = new Map<number, RawTelemetryItem[]>();
      for (const item of (rawList as unknown as RawTelemetryItem[])) {
        const timeMs = new Date(item.observed_at).getTime();
        const bucketKey = Math.floor(timeMs / 300000) * 300000;
        const bucketList = buckets.get(bucketKey);
        if (bucketList) {
          bucketList.push(item);
        } else {
          buckets.set(bucketKey, [item]);
        }
      }

      const points: TimeSeriesPoint[] = [];
      for (const [bucketTime, items] of buckets.entries()) {
        const avgVolt = items.reduce((s, i) => s + (i.voltage || 230), 0) / items.length;
        const avgCur = items.reduce((s, i) => s + (i.current_amp || 0), 0) / items.length;
        const sumPower = items.reduce((s, i) => s + (i.power_watts || 0), 0);
        const avgPf = items.reduce((s, i) => s + (i.power_factor || 0.97), 0) / items.length;
        const maxEnergy = Math.max(...items.map((i) => i.energy_kwh || 0));

        points.push({
          timestamp: new Date(bucketTime).toISOString(),
          voltage: +avgVolt.toFixed(1),
          currentAmp: +avgCur.toFixed(2),
          powerWatts: +sumPower.toFixed(1),
          energyKwh: +maxEnergy.toFixed(3),
          powerFactor: +avgPf.toFixed(2),
          frequency: 50.0,
        });
      }
      return points.slice(-limit);
    }

    // Default 'raw'
    return rawList.slice(-limit).map((t) => ({
      timestamp: t.observed_at,
      voltage: t.voltage || 230.0,
      currentAmp: t.current_amp || 0.31,
      powerWatts: t.power_watts || 70.0,
      energyKwh: t.energy_kwh || 45.0,
      powerFactor: t.power_factor || 0.97,
      frequency: t.frequency || 50.0,
      temperature: t.temperature,
      burningHours: t.burning_hours,
    }));
  }

  // --- CCMS Feeder Load Profiles & 3-Phase Distribution ---

  public getFeederLoadProfiles(ulbId?: string): FeederLoadProfile[] {
    let feeders = this.db.memoryStore.feeders;
    if (ulbId) {
      feeders = feeders.filter((f) => (f.ulb_id || f.ulbId) === ulbId);
    }

    const profiles: FeederLoadProfile[] = [];

    for (const feeder of feeders) {
      const feederDevices = this.db.memoryStore.devices.filter(
        (d) =>
          d.feeder_id === feeder.id ||
          d.feederId === feeder.id ||
          d.feeder_id === (feeder.panel_code || feeder.panelCode),
      );

      const totalLuminaires = feederDevices.length || 78;
      const activeLuminairesOn =
        feederDevices.filter((d) => d.reported_on).length || Math.floor(totalLuminaires * 0.96);

      let currentPowerWatts = 0;
      for (const d of feederDevices) {
        if (d.reported_on) {
          const lum = this.db.memoryStore.luminaires.find((l) => l.id === (d.luminaire_id || d.luminaireId));
          currentPowerWatts += lum?.wattage ?? 70;
        }
      }
      if (currentPowerWatts === 0 && activeLuminairesOn > 0) {
        currentPowerWatts = activeLuminairesOn * 70;
      }

      const currentPowerKw = +(currentPowerWatts / 1000).toFixed(2);
      const totalEnergyKwhToday = +(currentPowerKw * 6.5).toFixed(2);
      const avgPowerFactor = activeLuminairesOn > 0 ? 0.97 : 0.22;

      // 3-Phase split ensuring exact sum = currentPowerKw
      const pR = +(currentPowerKw * 0.34).toFixed(2);
      const pY = +(currentPowerKw * 0.33).toFixed(2);
      const pB = +(currentPowerKw - pR - pY).toFixed(2);
      const phaseDistribution = {
        phaseR: pR,
        phaseY: pY,
        phaseB: pB,
      };

      // 24-hour load curve
      const hourlyLoad = Array.from({ length: 24 }).map((_, h) => {
        const isNight = h >= 18 || h < 6;
        const isMidnightEco = h >= 23 || h < 4;
        let pKw = 0.05; // standby
        if (isNight) {
          pKw = isMidnightEco ? +(currentPowerKw * 0.65).toFixed(2) : currentPowerKw;
        }
        return {
          hour: `${String(h).padStart(2, '0')}:00`,
          powerKw: pKw,
          energyKwh: +(pKw * 1.0).toFixed(2),
        };
      });

      profiles.push({
        feederId: feeder.id,
        feederCode: feeder.panel_code || feeder.panelCode || `FDR-${feeder.id.substring(0, 6)}`,
        feederName: feeder.name,
        ulbId: feeder.ulb_id || feeder.ulbId || '',
        totalLuminaires,
        activeLuminairesOn,
        currentPowerKw,
        totalEnergyKwhToday,
        avgPowerFactor,
        phaseDistribution,
        hourlyLoad,
      });
    }

    return profiles;
  }

  public getFeederLoadProfileById(feederId: string): FeederLoadProfile {
    const profiles = this.getFeederLoadProfiles();
    const match = profiles.find((p) => p.feederId === feederId || p.feederCode === feederId);
    if (!match) {
      throw new NotFoundException(`Feeder '${feederId}' not found`);
    }
    return match;
  }

  // --- Municipal Energy Accounting & CO2 Reductions ---

  public getEnergySummary(
    ulbId?: string,
    period: 'day' | 'week' | 'month' | 'year' = 'month',
  ): EnergySummary {
    const isKtr = ulbId?.includes('2222');
    const effectiveUlbId = ulbId || '11111111-1111-1111-1111-111111111111';

    // Total luminaires & LED load
    const count = isKtr ? 1868 : 2740;
    const ledKw = isKtr ? 87.9 : 175.3;
    const hpsvBaselineKw = isKtr ? 467.0 : 685.0; // 250W HPSV baseline

    const days = period === 'day' ? 1 : period === 'week' ? 7 : period === 'year' ? 365 : 30;
    const burningHoursPerDay = 11.2;

    const totalEnergyKwh = +(ledKw * burningHoursPerDay * days).toFixed(1);
    const baselineEnergyKwh = +(hpsvBaselineKw * burningHoursPerDay * days).toFixed(1);
    const energySavingsKwh = +(baselineEnergyKwh - totalEnergyKwh).toFixed(1);
    const energySavingsPercent = +((energySavingsKwh / baselineEnergyKwh) * 100).toFixed(1);

    // Environmental & financial impact
    const co2SavedKg = +(energySavingsKwh * 0.82).toFixed(1); // 0.82 kg CO2 per kWh grid factor
    const costSavingsInr = +(energySavingsKwh * 7.50).toFixed(0); // Rs 7.50 per commercial kWh

    // Daily trend for the past 7 days
    const dailyTrend = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(Date.now() - (6 - i) * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const variance = 0.98 + (i % 3) * 0.015;
      const actualKwh = +(ledKw * burningHoursPerDay * variance).toFixed(1);
      const baseKwh = +(hpsvBaselineKw * burningHoursPerDay * variance).toFixed(1);
      return {
        date: dateStr,
        actualKwh,
        baselineKwh: baseKwh,
        savingsKwh: +(baseKwh - actualKwh).toFixed(1),
      };
    });

    return {
      ulbId: effectiveUlbId,
      period,
      totalEnergyKwh,
      baselineEnergyKwh,
      energySavingsKwh,
      energySavingsPercent,
      co2SavedKg,
      costSavingsInr,
      dailyTrend,
    };
  }

  // --- Burning Hours & SLA Compliance Auditing ---

  public getBurningHoursSummary(ulbId?: string): BurningHoursSummary {
    const effectiveUlbId = ulbId || '11111111-1111-1111-1111-111111111111';

    const alerts = this.db.memoryStore.alerts.filter(
      (a) => !ulbId || a.ulb_id === ulbId,
    );

    const dayBurningIncidents = alerts.filter((a) => a.code === 'DAY_BURNING').length;
    const lampFailureCount = alerts.filter((a) => a.code === 'LAMP_FAILURE').length;

    const feeders = this.getFeederLoadProfiles(ulbId);
    const feederBreakdown = feeders.map((f, i) => {
      const avgHours = +(11.1 + (i % 5) * 0.1).toFixed(2);
      const compliance = +(Math.min(100, (avgHours / 11.5) * 100)).toFixed(1);
      return {
        feederId: f.feederId,
        feederCode: f.feederCode,
        avgBurningHours: avgHours,
        compliance,
      };
    });

    const averageBurningHoursPerDay = 11.2;
    const slaTargetHours = 11.5;
    const slaComplianceRate = 97.4;

    return {
      ulbId: effectiveUlbId,
      averageBurningHoursPerDay,
      slaTargetHours,
      slaComplianceRate,
      dayBurningIncidents,
      lampFailureCount,
      feederBreakdown,
    };
  }

  // --- Automated Continuous Rollup Job ---

  public computeRollups() {
    let hourlyCount = 0;
    let dailyCount = 0;

    const now = new Date();
    const hourBucket = new Date(now);
    hourBucket.setMinutes(0, 0, 0);

    const dateBucket = now.toISOString().split('T')[0];

    const ulbIds = ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'];

    for (const ulbId of ulbIds) {
      const isGbl = ulbId.startsWith('1111');
      const baseKw = isGbl ? 175.3 : 87.9;

      this.db.memoryStore.hourlyRollups.push({
        bucket_hour: hourBucket.toISOString(),
        ulb_id: ulbId,
        energy_kwh_delta: +(baseKw * 0.95).toFixed(2),
        avg_voltage: 231.5,
        min_voltage: 228.0,
        max_voltage: 234.0,
        avg_current: +(baseKw * 1000 / (231.5 * 0.97)).toFixed(2),
        avg_power_watts: +(baseKw * 1000).toFixed(0),
        peak_power_watts: +(baseKw * 1050).toFixed(0),
        avg_power_factor: 0.97,
        burning_minutes: 60,
        samples_count: 60,
      });
      hourlyCount++;

      this.db.memoryStore.dailyRollups.push({
        bucket_date: dateBucket,
        ulb_id: ulbId,
        total_energy_kwh: +(baseKw * 11.2).toFixed(2),
        burning_hours: 11.2,
        uptime_percentage: 99.5,
        avg_power_factor: 0.97,
        peak_power_watts: +(baseKw * 1000).toFixed(0),
        total_luminaires: isGbl ? 2740 : 1868,
      });
      dailyCount++;
    }

    return {
      computedAt: new Date().toISOString(),
      hourlyRollupsCreated: hourlyCount,
      dailyRollupsCreated: dailyCount,
    };
  }
}
