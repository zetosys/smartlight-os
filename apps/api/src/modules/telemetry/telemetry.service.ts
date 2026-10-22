import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  OverviewDashboardKpi,
  TelemetryReading,
  BatchTelemetryIngestDto,
  IngestionResult,
  Alert,
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

  private evaluateAnomalies(dev: any, reading: TelemetryReading): number {
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
    const recent = this.db.memoryStore.telemetry
      .filter((t) => t.device_id === deviceId || t.external_id === deviceId)
      .slice(-1)[0];

    if (recent) return recent;

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
}
